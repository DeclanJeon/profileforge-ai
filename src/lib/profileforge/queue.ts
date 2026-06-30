import crypto from 'crypto'
import { db } from '@/lib/db'
import { profileForgeConfig } from './config'
import { deleteStoredImage } from './storage'

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
  aspectRatio?: string
  creativity?: number
  identityLockStrength?: number
  skinRetouch?: string
  aiLabel?: boolean
  positivePrompt?: string
  negativePrompt?: string
}) {
  const promptHash = crypto
    .createHash('sha256')
    .update([input.positivePrompt || '', input.negativePrompt || ''].join('\n---negative---\n'))
    .digest('hex')
  return crypto
    .createHash('sha256')
    .update([
      input.sessionId,
      input.uploadId,
      input.conceptId,
      String(input.resultCount),
      input.size,
      input.aspectRatio || '',
      String(input.creativity ?? ''),
      String(input.identityLockStrength ?? ''),
      input.skinRetouch || '',
      input.aiLabel ? 'ai-label' : 'no-ai-label',
      promptHash,
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

async function deletePartialGeneratedImages(jobId: string) {
  const images = await db.generatedImage.findMany({
    where: { jobId, status: { in: ['available', 'uploaded_r2'] } },
  })
  for (const image of images) {
    const deleted = await deleteStoredImage({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl })
    if (!deleted) {
      throw new Error('partial generated image cleanup failed')
    }
    await db.generatedImage.update({
      where: { id: image.id },
      data: { status: 'deleted', deletedAt: new Date() },
    })
  }
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
      const claimed = await db.generationJob.updateMany({
        where: staleGuard,
        data: {
          status: 'recovering',
          lockedBy: `recovery-${process.pid}`,
          lockExpiresAt: new Date(Date.now() + 5 * 60_000),
          errorMessage: '작업 연결이 지연되어 재시도 준비 중입니다.',
          lastErrorCode: 'stale_worker_recovering',
        },
      })
      if (claimed.count === 1) {
        try {
          await deletePartialGeneratedImages(job.id)
          const updated = await db.generationJob.updateMany({
            where: { id: job.id, status: 'recovering', lockedBy: `recovery-${process.pid}` },
            data: {
              status: 'queued',
              lockedBy: null,
              lockExpiresAt: null,
              nextRunAt: new Date(Date.now() + Math.min(15 * 60_000, job.attemptCount * 60_000)),
              errorMessage: '작업 연결이 지연되어 대기열에 다시 등록했습니다.',
              lastErrorCode: 'stale_worker',
            },
          })
          if (updated.count === 1) requeued += 1
        } catch (error) {
          await db.generationJob.updateMany({
            where: { id: job.id, status: 'recovering', lockedBy: `recovery-${process.pid}` },
            data: {
              status: 'failed',
              failedAt: new Date(),
              completedAt: new Date(),
              lockedBy: null,
              lockExpiresAt: null,
              errorMessage: '재시도 준비 중 임시 결과 정리에 실패했습니다. 다시 시도해주세요.',
              lastErrorCode: 'recovery_cleanup_failed',
            },
          })
          failed += 1
        }
      }
    } else {
      const updated = await db.generationJob.updateMany({
        where: staleGuard,
        data: {
          status: 'failed',
          failedAt: new Date(),
          completedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
          errorMessage: '반복 처리 지연으로 생성이 완료되지 않았습니다. 다시 시도해주세요.',
          lastErrorCode: 'retry_exhausted',
        },
      })
      if (updated.count === 1) failed += 1
    }
  }
  return { scanned: stale.length, requeued, failed }
}
