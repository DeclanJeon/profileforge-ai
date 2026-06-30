import crypto from 'crypto'
import { db } from '@/lib/db'
import { generateProfileImage, uploadFileUrlToLocalPath } from './image-provider'
import { claimNextGenerationJob, heartbeatGenerationJob } from './queue'
import { storeGeneratedImage } from './storage'
import { issueDownloadToken } from './download-tokens'
import { enqueueCompletionEmail, sendCompletionEmailNow } from './email'
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
  if (/timeout/i.test(message)) return { code: 'provider_timeout', userMessage: '이미지 생성 서버 응답이 지연되었습니다. 잠시 후 다시 시도해주세요.' }
  if (/R2|upload/i.test(message)) return { code: 'storage_error', userMessage: '결과 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.' }
  if (/TOKEN|PEPPER|secret/i.test(message)) return { code: 'configuration_error', userMessage: '서비스 설정 문제로 생성이 완료되지 않았습니다.' }
  return { code: 'generation_error', userMessage: '생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }
}

export async function processGenerationJob(jobId: string, workerId: string) {
  const job = await db.generationJob.findUnique({ where: { id: jobId }, include: { upload: true, user: true } })
  if (!job || job.status !== 'running') return { status: 'skipped' as const }
  const params = JSON.parse(job.paramsJson || '{}') as {
    size?: string
    identityLockStrength?: number
    creativity?: number
  }
  const referenceImagePath = uploadFileUrlToLocalPath(job.upload.fileUrl)
  if (!referenceImagePath) throw new Error('Upload reference image is unavailable')

  const finalCount = Math.max(1, Math.min(profileForgeConfig.queue.maxResultCount, job.resultCount || 1))
  let successCount = 0
  const errors: string[] = []

  for (let idx = 0; idx < finalCount; idx += 1) {
    await heartbeatGenerationJob(job.id, workerId)
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
      const image = await db.generatedImage.create({
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
      if (job.email) {
        const { token } = await issueDownloadToken({ jobId: job.id, generatedImageId: image.id, email: job.email, expiresAt })
        await enqueueCompletionEmail({ jobId: job.id, email: job.email, token, conceptName: job.conceptName })
        await sendCompletionEmailNow({ jobId: job.id, email: job.email, token, conceptName: job.conceptName })
      }
      successCount += 1
    } catch (error) {
      const sanitized = safeError(error)
      errors.push(`image ${idx + 1}: ${sanitized.userMessage}`)
      console.error('[profileforge-worker] image failed', { jobId: job.id, idx, code: sanitized.code, error })
    }
  }

  if (successCount === 0) {
    await db.generationJob.update({
      where: { id: job.id },
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
    return { status: 'failed' as const, successCount, errors }
  }

  await db.generationJob.update({
    where: { id: job.id },
    data: {
      status: successCount === finalCount ? 'succeeded' : 'partially_succeeded',
      completedAt: new Date(),
      lockedBy: null,
      lockExpiresAt: null,
      costCredits: successCount * 2,
      errorMessage: errors.length > 0 ? errors.join('\n') : null,
      lastErrorCode: errors.length > 0 ? 'partial_image_failure' : null,
    },
  })
  return { status: successCount === finalCount ? 'succeeded' as const : 'partially_succeeded' as const, successCount, errors }
}

export async function processQueuedJobsOnce(workerId = `worker-${process.pid}`) {
  const results = []
  for (let i = 0; i < profileForgeConfig.queue.concurrency; i += 1) {
    const job = await claimNextGenerationJob(workerId)
    if (!job) break
    results.push(await processGenerationJob(job.id, workerId))
  }
  return results
}
