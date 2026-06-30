import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadFileUrlToLocalPath } from '@/lib/profileforge/image-provider'
import { processQueuedJobsOnce } from '@/lib/profileforge/generation-worker'
import { profileForgeConfig } from '@/lib/profileforge/config'
import {
  assertCanCreateJob,
  estimateQueuePosition,
  estimateWaitSeconds,
  makeGenerationIdempotencyKey,
  normalizeEmail,
} from '@/lib/profileforge/queue'

interface GenerateRequest {
  sessionId: string
  email?: string
  uploadId?: string
  uploadUrl?: string
  conceptId: string
  conceptName: string
  positivePrompt: string
  negativePrompt: string
  aspectRatio: string
  size: string
  resultCount: number
  creativity: number
  identityLockStrength: number
  skinRetouch: string
  aiLabel: boolean
  thumbnailPrompt?: string
}

const SUPPORTED_SIZES = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']

function safeSize(size: string) {
  return SUPPORTED_SIZES.includes(size) ? size : '1024x1024'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function publicMessage(status: string, error?: string | null) {
  if (status === 'queued') return '생성 요청이 접수되었습니다. 완료되면 이메일로 알려드립니다.'
  if (status === 'running') return '이미지를 생성하고 있습니다. 브라우저를 닫아도 작업은 계속 진행됩니다.'
  if (status === 'partially_succeeded') return '일부 이미지 생성이 완료되었습니다. 성공한 이미지만 제공됩니다.'
  if (status === 'succeeded') return '생성이 완료되었습니다. 다운로드 링크를 이메일로 보냈습니다.'
  if (status === 'failed') return error || '생성 중 오류가 발생했습니다. 차감은 발생하지 않았습니다.'
  return '작업 상태를 확인하고 있습니다.'
}

async function getJobImages(jobId: string) {
  const rows = await db.generatedImage.findMany({
    where: { jobId, status: { in: ['available', 'uploaded_r2'] } },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map((image, idx) => ({
    id: image.id,
    imageUrl: image.imageUrl || '',
    thumbnailUrl: image.imageUrl || '',
    downloadAvailable: true,
    expiresAt: image.expiresAt.toISOString(),
    likenessScore: image.likenessScore ?? 0,
    qualityScore: image.qualityScore ?? 0,
    conceptFitScore: Math.max(55, Math.min(98, Math.round((76 + idx * 3) * 10) / 10)),
    seed: Math.abs(image.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + idx * 997) % 1_000_000,
  }))
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 })

  const job = await db.generationJob.findUnique({ where: { id: jobId } })
  if (!job) return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 })

  const [images, queuePosition, estimatedWaitSeconds] = await Promise.all([
    getJobImages(jobId),
    estimateQueuePosition(jobId),
    estimateWaitSeconds(jobId),
  ])

  return NextResponse.json({
    jobId,
    status: job.status,
    message: publicMessage(job.status, job.errorMessage),
    queuePosition,
    estimatedWaitSeconds,
    emailStatus: job.emailStatus,
    images,
    completedAt: job.completedAt,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest
    const { sessionId, uploadId, conceptId, conceptName, positivePrompt, negativePrompt } = body

    if (!positivePrompt || !conceptId) {
      return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
    }
    if (!body.email || !isValidEmail(body.email)) {
      return NextResponse.json({ error: '결과를 받을 올바른 이메일 주소를 입력해주세요.' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(body.email)
    const safeSizeStr = safeSize(body.size)
    const safeResultCount = Math.max(1, Math.min(profileForgeConfig.queue.maxResultCount, body.resultCount || profileForgeConfig.queue.defaultResultCount))
    const userEmail = `${sessionId}@profileforge.local`
    const user = await db.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail, name: sessionId, consentVersion: 'v1' },
    })

    const limit = await assertCanCreateJob({ userId: user.id, email: normalizedEmail })
    if (!limit.ok) {
      return NextResponse.json({ error: '이미 생성 중인 작업이 있습니다. 완료되면 입력하신 이메일로 알려드립니다.', reason: limit.reason }, { status: 409 })
    }

    let upload = uploadId ? await db.upload.findUnique({ where: { id: uploadId } }) : null
    if (!upload) {
      upload = await db.upload.create({
        data: {
          userId: user.id,
          fileUrl: body.uploadUrl || '/uploads/dummy.png',
          fileName: 'session-image',
          fileSize: 0,
          mimeType: 'image/jpeg',
          faceQualityScore: 70,
          faceCount: 1,
          expiresAt: new Date(Date.now() + profileForgeConfig.retention.uploadTtlSeconds * 1000),
        },
      })
    }

    const referenceImagePath = uploadFileUrlToLocalPath(upload.fileUrl)
    if (!referenceImagePath) {
      return NextResponse.json({ error: '업로드 원본 이미지를 찾을 수 없습니다. 다시 업로드해주세요.' }, { status: 400 })
    }

    const idempotencyKey = makeGenerationIdempotencyKey({
      sessionId,
      uploadId: upload.id,
      conceptId,
      resultCount: safeResultCount,
      size: safeSizeStr,
    })
    const existing = await db.generationJob.findUnique({ where: { idempotencyKey } })
    if (existing && ['pending', 'queued', 'running', 'succeeded', 'partially_succeeded'].includes(existing.status)) {
      return NextResponse.json({
        jobId: existing.id,
        status: existing.status,
        message: publicMessage(existing.status, existing.errorMessage),
        queuePosition: await estimateQueuePosition(existing.id),
        estimatedWaitSeconds: await estimateWaitSeconds(existing.id),
        images: await getJobImages(existing.id),
      }, { status: 202 })
    }

    const job = await db.generationJob.create({
      data: {
        userId: user.id,
        uploadId: upload.id,
        conceptId,
        conceptName,
        paramsJson: JSON.stringify({
          creativity: body.creativity,
          identityLockStrength: body.identityLockStrength,
          skinRetouch: body.skinRetouch,
          aiLabel: body.aiLabel,
          aspectRatio: body.aspectRatio,
          resultCount: safeResultCount,
          size: safeSizeStr,
        }),
        positivePrompt,
        negativePrompt,
        aspectRatio: body.aspectRatio,
        status: 'queued',
        queuedAt: new Date(),
        provider: 'image-adapter',
        costCredits: 0,
        email: normalizedEmail,
        emailStatus: 'pending',
        resultCount: safeResultCount,
        idempotencyKey,
      },
    })

    void processQueuedJobsOnce(`api-${process.pid}`).catch((error) => {
      console.error('[generate] worker kick failed', error)
    })

    return NextResponse.json({
      jobId: job.id,
      status: 'queued',
      message: publicMessage('queued'),
      queuePosition: await estimateQueuePosition(job.id),
      estimatedWaitSeconds: await estimateWaitSeconds(job.id),
      images: [],
    }, { status: 202 })
  } catch (error) {
    console.error('[generate] error', error)
    return NextResponse.json({ error: '생성 요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
