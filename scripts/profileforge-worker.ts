#!/usr/bin/env bun
import { db } from '../src/lib/db'
import { processQueuedJobsOnce } from '../src/lib/profileforge/generation-worker'
import { runProfileForgeMaintenance } from '../src/lib/profileforge/cleanup'
import { sendPendingEmails } from '../src/lib/profileforge/email'

const workerId = process.env.PROFILEFORGE_WORKER_ID || `profileforge-worker-${process.pid}`
const once = process.argv.includes('--once')
const intervalMs = Number(process.env.PROFILEFORGE_WORKER_INTERVAL_MS || 5000)

async function tick() {
  const maintenance = await runProfileForgeMaintenance()
  const jobs = await processQueuedJobsOnce(workerId)
  const emails = await sendPendingEmails(5)
  console.log(JSON.stringify({ ok: true, workerId, maintenance, jobs, emails, at: new Date().toISOString() }))
}

try {
  if (once) {
    await tick()
  } else {
    for (;;) {
      await tick()
      await new Promise((resolve) => setTimeout(resolve, intervalMs))
    }
  }
} finally {
  await db.$disconnect()
}
