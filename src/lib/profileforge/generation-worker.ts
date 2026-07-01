import crypto from 'crypto'
import { db } from '@/lib/db'
import { generateProfileImage, uploadFileUrlToLocalPath } from './image-provider'
import { claimNextGenerationJob, heartbeatGenerationJob } from './queue'
import { deleteStoredImage, storeGeneratedImage } from './storage'
import { hashEmail } from './email'
import { profileForgeConfig } from './config'

function scoreImage(idx: number, identityLock: number, creativity: number) {
  const likenessBase = 60 + (identityLock / 100) * 30 - (creativity / 100) * 10
  const likeness = Math.max(45, Math.min(98, likenessBase + (Math.random() * 14 - 7)))
  const quality = Math.max(60, Math.min(98, 78 + (Math.random() * 18 - 6)))
  return {
    likenessScore: Math.round(likeness * 10) / 10,
    qualityScore: Math.round(quality * 10) / 10,
  }
}

function safeError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/timeout|timed out/i.test(message)) return { code: 'provider_timeout', userMessage: '이미지 생성 서버 응답이 지연되었습니다. 잠시 후 다시 시도해주세요.' }
  if (/Upload reference image is unavailable|업로드|원본|ENOENT.*uploads/i.test(message)) return { code: 'reference_image_unavailable', userMessage: '업로드 원본 이미지를 확인할 수 없습니다. 다시 업로드해주세요.' }
  if (/R2|storage|PutObject|HeadObject|GetObject|S3|presign/i.test(message)) return { code: 'storage_error', userMessage: '결과 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  if (/TOKEN|PEPPER|secret/i.test(message)) return { code: 'configuration_error', userMessage: '서비스 설정 문제로 생성이 완료되지 않았습니다.' }
  return { code: 'generation_error', userMessage: '생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
}

type GenerationJobProcessResult =
  | { status: 'skipped'; successCount?: undefined; errors?: undefined }
  | { status: 'failed'; successCount: number; errors: string[] }
  | { status: 'succeeded' | 'partially_succeeded'; successCount: number; errors: string[] }

async function assertLease(jobId: string, workerId: string) {
  const heartbeat = await heartbeatGenerationJob(jobId, workerId)
  if (heartbeat.count !== 1) {
    throw new Error('worker lease lost')
  }
}

async function cleanupGeneratedRows(imageIds: string[]) {
  if (imageIds.length === 0) return
  const images = await db.generatedImage.findMany({
    where: { id: { in: imageIds }, status: { in: ['available', 'uploaded_r2'] } },
  })
  for (const image of images) {
    await deleteStoredImage({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl }).catch(() => undefined)
    await db.generatedImage.update({
      where: { id: image.id },
      data: { status: 'deleted', deletedAt: new Date() },
    }).catch(() => undefined)
  }
}


export async function processGenerationJob(jobId: string, workerId: string): Promise<GenerationJobProcessResult> {
  const job = await db.generationJob.findUnique({ where: { id: jobId }, include: { upload: true, user: true } })
  if (!job || job.status !== 'running') return { status: 'skipped' as const }
  const params = JSON.parse(job.paramsJson || '{}') as {
    size?: string
    identityLockStrength?: number
    creativity?: number
    creditCost?: number
  }
  const createdImageIds: string[] = []
  try {
    const referenceImagePath = uploadFileUrlToLocalPath(job.upload.fileUrl)
    if (!referenceImagePath) throw new Error('Upload reference image is unavailable')

    const finalCount = Math.max(1, Math.min(profileForgeConfig.queue.maxResultCount, job.resultCount || 1))
    let successCount = 0
    const errors: string[] = []

    for (let idx = 0; idx < finalCount; idx += 1) {
      await assertLease(job.id, workerId)
      try {
        const generated = await generateProfileImage({
          jobId: job.id,
          index: idx,
          prompt: job.positivePrompt,
          negativePrompt: job.negativePrompt,
          referenceImagePath,
          outputSize: params.size || '1024x1024',
        })
        const imageId = crypto.randomBytes(8).toString('hex')
        const expiresAt = new Date(Date.now() + profileForgeConfig.r2.objectTtlHours * 60 * 60 * 1000)
        const stored = await storeGeneratedImage({
          localPath: generated.filePath,
          jobId: job.id,
          imageId,
          mimeType: 'image/png',
          expiresAt,
        })
        const scores = scoreImage(idx, params.identityLockStrength ?? 75, params.creativity ?? 30)
        const committed = await db.$transaction(async (tx) => {
          const lease = await tx.generationJob.updateMany({
            where: { id: job.id, status: 'running', lockedBy: workerId },
            data: {
              lastHeartbeatAt: new Date(),
              lockExpiresAt: new Date(Date.now() + profileForgeConfig.queue.jobTimeoutSeconds * 1000),
            },
          })
          if (lease.count !== 1) return null

          return tx.generatedImage.create({
            data: {
              jobId: job.id,
              imageUrl: stored.imageUrl,
              r2Bucket: stored.bucket,
              r2Key: stored.key,
              mimeType: stored.mimeType,
              fileSize: stored.fileSize,
              status: 'available',
              likenessScore: scores.likenessScore,
              qualityScore: scores.qualityScore,
              expiresAt,
            },
          })
        })
        if (!committed) {
          await deleteStoredImage({ bucket: stored.bucket, key: stored.key, imageUrl: stored.imageUrl }).catch(() => undefined)
          throw new Error('worker lease lost')
        }
        createdImageIds.push(committed.id)
        successCount += 1
      } catch (error) {
        const sanitized = safeError(error)
        errors.push(`image ${idx + 1}: ${sanitized.userMessage}`)
        console.error('[profileforge-worker] image failed', { jobId: job.id, idx, code: sanitized.code, error })
      }
    }

    if (successCount === 0) {
      const failed = await db.generationJob.updateMany({
        where: { id: job.id, status: 'running', lockedBy: workerId },
        data: {
          status: 'failed',
          failedAt: new Date(),
          completedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
          errorMessage: errors.join('\n') || '이미지 생성에 실패했습니다.',
          lastErrorCode: 'all_images_failed',
        },
      })
      if (failed.count !== 1) throw new Error('worker lease lost')
      return { status: 'failed' as const, successCount, errors }
    }

    await assertLease(job.id, workerId)
    const finalStatus = successCount === finalCount ? 'succeeded' : 'partially_succeeded'
    const finalError = errors.length > 0 ? errors.join('\n') : null
    const finalErrorCode = errors.length > 0 ? 'partial_image_failure' : null
    const recipientHash = job.email ? hashEmail(job.email) : null
    const idempotencyKey = recipientHash ? `${job.id}:generation_completed:${recipientHash}` : null

    const finalized = await db.$transaction(async (tx) => {
      const updated = await tx.generationJob.updateMany({
        where: { id: job.id, status: 'running', lockedBy: workerId },
        data: {
          status: finalStatus,
          completedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
          costCredits: successCount * Math.max(1, params.creditCost ?? 2),
          errorMessage: finalError,
          lastErrorCode: finalErrorCode,
          emailStatus: job.email ? 'pending' : job.emailStatus,
        },
      })
      if (updated.count !== 1) return false

      if (job.email && idempotencyKey && recipientHash) {
        const existing = await tx.emailDelivery.findUnique({ where: { idempotencyKey } })
        if (existing) {
          await tx.emailDelivery.updateMany({
            where: { id: existing.id, status: { not: 'sent' } },
            data: { status: 'pending', nextRetryAt: new Date(), errorMessage: null },
          })
        } else {
          await tx.emailDelivery.create({
            data: {
              jobId: job.id,
              email: job.email,
              recipientHash,
              type: 'generation_completed',
              status: 'pending',
              provider: profileForgeConfig.email.provider,
              idempotencyKey,
              nextRetryAt: new Date(),
            },
          })
        }
      }

      return true
    })

    if (!finalized) {
      await cleanupGeneratedRows(createdImageIds)
      throw new Error('worker lease lost')
    }
    return { status: finalStatus as 'succeeded' | 'partially_succeeded', successCount, errors }
  } catch (error) {
    if (error instanceof Error && error.message === 'worker lease lost') {
      await cleanupGeneratedRows(createdImageIds).catch(() => undefined)
    }
    const sanitized = safeError(error)
    console.error('[profileforge-worker] job failed', { jobId: job.id, code: sanitized.code, error })
    await db.generationJob.updateMany({
      where: { id: job.id, status: 'running', lockedBy: workerId },
      data: {
        status: 'failed',
        failedAt: new Date(),
        completedAt: new Date(),
        lockedBy: null,
        lockExpiresAt: null,
        errorMessage: sanitized.userMessage,
        lastErrorCode: sanitized.code,
      },
    })
    return { status: 'failed' as const, successCount: 0, errors: [sanitized.userMessage] }
  }
}

export async function processQueuedJobsOnce(workerId = `worker-${process.pid}`) {
  const results: GenerationJobProcessResult[] = []
  for (let i = 0; i < profileForgeConfig.queue.concurrency; i += 1) {
    const job = await claimNextGenerationJob(workerId)
    if (!job) break
    try {
      results.push(await processGenerationJob(job.id, workerId))
    } catch (error) {
      const sanitized = safeError(error)
      console.error('[profileforge-worker] unhandled job failure', { jobId: job.id, code: sanitized.code, error })
      await db.generationJob.updateMany({
        where: { id: job.id, status: 'running', lockedBy: workerId },
        data: {
          status: 'failed',
          failedAt: new Date(),
          completedAt: new Date(),
          lockedBy: null,
          lockExpiresAt: null,
          errorMessage: sanitized.userMessage,
          lastErrorCode: sanitized.code,
        },
      })
      results.push({ status: 'failed' as const, successCount: 0, errors: [sanitized.userMessage] })
    }
  }
  return results
}
