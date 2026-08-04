#!/usr/bin/env bun
/**
 * Generate missing concept thumbnails via codex-imagen and write 640x800 webp.
 *
 * Usage:
 *   bun scripts/generate-concept-thumbnails.mjs
 *   bun scripts/generate-concept-thumbnails.mjs --only editorial-neon-street,art-clay-3d
 *   bun scripts/generate-concept-thumbnails.mjs --manifest /tmp/missing-thumbs.json
 */
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import sharp from 'sharp'

const ROOT = process.cwd()
const OUT_DIR = path.join(ROOT, 'public', 'concept-thumbnails')
const CODEX_BIN = process.env.PROFILEFORGE_CODEX_IMAGEN_BIN || `${os.homedir()}/bin/codex-imagen`
const TIMEOUT_SEC = Number(process.env.THUMB_TIMEOUT_SECONDS || 900)
const WIDTH = 640
const HEIGHT = 800

function parseArgs(argv) {
  const out = { only: null, manifest: null, limit: null }
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i]
    if (a === '--only') out.only = new Set(String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean))
    else if (a === '--manifest') out.manifest = argv[++i]
    else if (a === '--limit') out.limit = Number(argv[++i])
  }
  return out
}

function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
      ...opts,
    })
    let stdout = ''
    let stderr = ''
    const timer = setTimeout(() => {
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5000).unref()
    }, (opts.timeoutSec || TIMEOUT_SEC) * 1000)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (c) => { stdout += c })
    child.stderr.on('data', (c) => { stderr += c })
    child.on('error', (err) => {
      clearTimeout(timer)
      reject(err)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (code !== 0) reject(new Error(`${cmd} exited ${code}: ${stderr || stdout}`))
      else resolve({ stdout, stderr })
    })
  })
}

function buildPrompt(item) {
  const base = item.prompt || item.name
  // Art styles should not force pure photography wording.
  const artIds = new Set(['art-clay-3d', 'art-linocut', 'art-anime-soft'])
  if (artIds.has(item.id)) {
    return [
      base,
      'Single subject portrait composition for a product concept card.',
      'Vertical 4:5 framing, clear face readability, no text, no watermark, no logo, no collage.',
      'High quality finished artwork suitable as a style thumbnail.',
    ].join(' ')
  }
  return [
    base,
    'Single adult person portrait for a profile concept thumbnail card.',
    'Vertical 4:5 framing, head-and-shoulders or upper torso, sharp eyes, natural skin texture.',
    'Photorealistic unless the style is explicitly illustrated.',
    'No text, no watermark, no logo, no border, no collage, no multiple panels.',
  ].join(' ')
}

async function generateOne(item, workRoot) {
  const workDir = path.join(workRoot, item.id)
  await fs.mkdir(workDir, { recursive: true })
  const promptPath = path.join(workDir, 'prompt.txt')
  const outPng = path.join(workDir, 'raw.png')
  const finalWebp = path.join(OUT_DIR, `${item.id}.webp`)
  await fs.writeFile(promptPath, buildPrompt(item), 'utf8')

  console.log(`[thumb] generating ${item.id} ...`)
  const { stdout } = await run(CODEX_BIN, [
    '--prompt-file', promptPath,
    '--output', outPng,
    '--model', process.env.PROFILEFORGE_IMAGE_PROVIDER_MODEL || 'gpt-5.5',
    '--timeout', String(TIMEOUT_SEC),
    '--json',
    '--quiet',
  ], { timeoutSec: TIMEOUT_SEC + 30 })

  let sourcePath = outPng
  try {
    const parsed = JSON.parse(stdout.trim() || '{}')
    const img = parsed.images?.[0]
    const reported = img?.decodedPath || img?.path
    if (reported) sourcePath = reported
  } catch {
    // keep default outPng
  }

  // Some CLI versions write elsewhere; ensure file exists.
  try {
    await fs.access(sourcePath)
  } catch {
    await fs.access(outPng)
    sourcePath = outPng
  }

  await sharp(sourcePath)
    .rotate()
    .resize(WIDTH, HEIGHT, { fit: 'cover', position: 'attention' })
    .webp({ quality: 82 })
    .toFile(finalWebp)

  const stat = await fs.stat(finalWebp)
  console.log(`[thumb] wrote ${finalWebp} (${Math.round(stat.size / 1024)}KB)`)
  return finalWebp
}

async function main() {
  const args = parseArgs(process.argv)
  const manifestPath = args.manifest || '/tmp/missing-thumbs.json'
  const raw = await fs.readFile(manifestPath, 'utf8')
  let items = JSON.parse(raw)
  if (args.only) items = items.filter((x) => args.only.has(x.id))
  if (args.limit && Number.isFinite(args.limit)) items = items.slice(0, args.limit)

  await fs.mkdir(OUT_DIR, { recursive: true })
  await fs.access(CODEX_BIN)

  const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'pf-thumbs-'))
  const ok = []
  const failed = []

  console.log(`[thumb] bin=${CODEX_BIN}`)
  console.log(`[thumb] items=${items.length}`)

  for (const item of items) {
    try {
      // skip if already exists unless forced
      try {
        await fs.access(path.join(OUT_DIR, `${item.id}.webp`))
        console.log(`[thumb] skip existing ${item.id}`)
        ok.push(item.id)
        continue
      } catch {
        // generate
      }
      await generateOne(item, workRoot)
      ok.push(item.id)
    } catch (error) {
      console.error(`[thumb] FAIL ${item.id}:`, error instanceof Error ? error.message : error)
      failed.push({ id: item.id, error: error instanceof Error ? error.message : String(error) })
    }
  }

  console.log(JSON.stringify({ ok: ok.length, failed: failed.length, failedIds: failed }, null, 2))
  if (failed.length) process.exitCode = 1
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
