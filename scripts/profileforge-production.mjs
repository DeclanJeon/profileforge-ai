#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'

const cwd = process.cwd()
const nodeBin = process.execPath

function firstExisting(paths) {
  const found = paths.find((candidate) => existsSync(path.resolve(cwd, candidate)))
  if (!found) {
    throw new Error(`None of these paths exist from ${cwd}: ${paths.join(', ')}`)
  }
  return found
}

const serverEntry = firstExisting(['server.js', '.next/standalone/server.js'])
const workerEntry = firstExisting([
  'scripts/profileforge-worker.js',
  '.next/standalone/scripts/profileforge-worker.js',
])

if (process.env.PROFILEFORGE_PRODUCTION_CHECK === 'true' || process.argv.includes('--check')) {
  console.log(JSON.stringify({ ok: true, cwd, serverEntry, workerEntry }))
  process.exit(0)
}

const children = new Map()
let shuttingDown = false
let shutdownExitCode = 0

function start(name, command, args) {
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: 'inherit',
  })

  children.set(name, child)
  console.log(`[profileforge-production] started ${name}`, { pid: child.pid, command, args })

  child.on('error', (error) => {
    console.error(`[profileforge-production] ${name} failed to start`, error)
    shutdown(1)
  })

  child.on('exit', (code, signal) => {
    children.delete(name)
    if (shuttingDown) {
      if (children.size === 0) process.exit(shutdownExitCode)
      return
    }

    console.error(`[profileforge-production] ${name} exited`, { code, signal })
    shutdown(code && code !== 0 ? code : 1)
  })

  return child
}

function shutdown(exitCode) {
  if (shuttingDown) return
  shuttingDown = true
  shutdownExitCode = exitCode

  for (const [name, child] of children) {
    if (!child.killed) {
      console.log(`[profileforge-production] stopping ${name}`, { pid: child.pid })
      child.kill('SIGTERM')
    }
  }

  const timer = setTimeout(() => {
    for (const child of children.values()) {
      if (!child.killed) child.kill('SIGKILL')
    }
    process.exit(exitCode)
  }, 10_000)
  timer.unref()

  if (children.size === 0) process.exit(exitCode)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('SIGHUP', () => shutdown(0))

start('server', nodeBin, [serverEntry])
start('worker', nodeBin, [workerEntry])
