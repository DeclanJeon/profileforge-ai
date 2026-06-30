import crypto from 'crypto'
import { db } from '@/lib/db'
import { profileForgeConfig } from './config'

const ACTIVE_JOB_STATUSES = ['pending', 'queued', 'running']

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function makeGenerationIdempotencyKey(input: {
  sessionId: string
  uploadId: string
  conceptId: string
  resultCount: number
  size: string
}) {
  return crypto
    .createHash('sha256')
    .update([
      input.sessionId,
      input.uploadId,
      input.conceptId,
      String(input.resultCount),
      input.size,
    ].join(':'))
    .digest('hex')
}

export async function countActiveJobsForUser(userId: string) {
  return db.generationJob.count({
    where: { userId, status: { in: ACTIVE_JOB_STATUSES } },
  })
}

export async function assertCanCreateJob(input: { userId: string; email?: string }) {
  const activeForUser = await countActiveJobsForUser(input.userId)
  if (activeForUser >= profileForgeConfig.queue.userActiveJobLimit) {
    return { ok: false as const, reason: 'active_job_limit' }
  }
  if (input.email) {
    const activeForEmail = await db.generationJob.count({
      where: { email: normalizeEmail(input.email), status: { in: ACTIVE_JOB_STATUSES } },
    })
    if (activeForEmail >= profileForgeConfig.queue.userActiveJobLimit) {
      return { ok: false as const, reason: 'active_email_job_limit' }
    }
  }
  return { ok: true as const }
}

export async function estimateQueuePosition(jobId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId } })
  if (!job || job.status !== 'queued') return null
  return db.generationJob.count({
    where: {
      status: 'queued',
      queuedAt: { lte: job.queuedAt ?? job.createdAt },
    },
  })
}

export async function estimateWaitSeconds(jobId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId } })
  if (!job) return null
  if (job.status === 'running') return profileForgeConfig.queue.imageTimeoutSeconds
  if (job.status !== 'queued') return 0
  const queuedAhead = await db.generationJob.findMany({
    where: {
      status: 'queued',
      queuedAt: { lt: job.queuedAt ?? job.createdAt },
    },
    select: { resultCount: true },
  })
  const running = await db.generationJob.findMany({
    where: { status: 'running' },
    select: { startedAt: true, resultCount: true },
  })
  const averageImageSeconds = 360
  const queuedImagesAhead = queuedAhead.reduce((sum, item) => sum + Math.max(1, item.resultCount), 0)
  const runningRemaining = running.reduce((sum, item) => {
    const startedAt = item.startedAt?.getTime() ?? Date.now()
    const elapsed = Math.max(0, (Date.now() - startedAt) / 1000)
    return sum + Math.max(60, item.resultCount * averageImageSeconds - elapsed)
  }, 0)
  return Math.ceil(queuedImagesAhead * averageImageSeconds + runningRemaining)
}

export async function claimNextGenerationJob(workerId: string) {
  const now = new Date()
  const lockExpiresAt = new Date(now.getTime() + profileForgeConfig.queue.jobTimeoutSeconds * 1000)
  const candidates = await db.generationJob.findMany({
    where: {
      status: 'queued',
      OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }],
    },
    orderBy: [{ queuedAt: 'asc' }, { createdAt: 'asc' }],
    take: 10,
  })

  for (const candidate of candidates) {
    const updated = await db.generationJob.updateMany({
      where: { id: candidate.id, status: 'queued' },
      data: {
        status: 'running',
        lockedBy: workerId,
        lockExpiresAt,
        startedAt: candidate.startedAt ?? now,
        lastHeartbeatAt: now,
        attemptCount: { increment: 1 },
      },
    })
    if (updated.count === 1) {
      return db.generationJob.findUnique({ where: { id: candidate.id }, include: { upload: true, user: true } })
    }
  }
  return null
}

export async function heartbeatGenerationJob(jobId: string, workerId: string) {
  const now = new Date()
  return db.generationJob.updateMany({
    where: { id: jobId, status: 'running', lockedBy: workerId },
    data: {
      lastHeartbeatAt: now,
      lockExpiresAt: new Date(now.getTime() + profileForgeConfig.queue.jobTimeoutSeconds * 1000),
    },
  })
}

export async function requeueStaleRunningJobs() {
  const cutoff = new Date(Date.now() - profileForgeConfig.queue.staleRunningSeconds * 1000)
  const stale = await db.generationJob.findMany({
    where: {
      status: 'running',
      completedAt: null,
      OR: [
        { lockExpiresAt: { lt: new Date() } },
        { lastHeartbeatAt: { lt: cutoff } },
        { lastHeartbeatAt: null, startedAt: { lt: cutoff } },
      ],
    },
  })

  let requeued = 0
  let failed = 0
  for (const job of stale) {
    const staleGuard = {
      id: job.id,
      status: 'running',
      lockedBy: job.lockedBy,
      lockExpiresAt: job.lockExpiresAt,
      lastHeartbeatAt: job.lastHeartbeatAt,
    } as const
    if (job.attemptCount < job.maxAttempts) {
      const updated = await db.generationJob.updateMany({
        where: staleGuard,
        data: {
          status: 'queued',
          lockedBy: null,
          lockExpiresAt: null,
          nextRunAt: new Date(Date.now() + Math.min(15 * 60_000, job.attemptCount * 60_000)),
          errorMessage: 'Job recovered after stale worker heartbeat',
          lastErrorCode: 'stale_worker',
        },
      })
      if (updated.count === 1) requeued += 1
    } else {
      const updated = await db.generationJob.updateMany({
        where: staleGuard,
        data: {
          status: 'failed',
          failedAt: new Date(),
          completedAt: new Date(),
          errorMessage: 'Generation job failed after retry budget was exhausted',
          lastErrorCode: 'retry_exhausted',
        },
      })
      if (updated.count === 1) failed += 1
    }
  }
  return { scanned: stale.length, requeued, failed }
}
