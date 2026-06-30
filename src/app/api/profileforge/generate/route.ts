import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { uploadFileUrlToLocalPath } from '@/lib/profileforge/image-provider'
import { CONCEPTS } from '@/lib/profileforge/concepts'
import { buildPrompts, CustomizeOptions } from '@/lib/profileforge/prompt-builder'
import { profileForgeConfig } from '@/lib/profileforge/config'
import { createDownloadUrl } from '@/lib/profileforge/storage'
import {
  estimateQueuePosition,
  estimateWaitSeconds,
  makeGenerationIdempotencyKey,
  normalizeEmail,
} from '@/lib/profileforge/queue'

interface GenerateRequest {
  sessionId: string
  email?: string
  uploadId?: string
  conceptId: string
  aspectRatio?: string
  size?: string
  resultCount?: number
  creativity?: number
  identityLockStrength?: number
  skinRetouch?: string
  aiLabel?: boolean
}

const SUPPORTED_SIZES = ['1024x1024', '768x1344', '864x1152', '1344x768', '1152x864', '1440x720', '720x1440']
const SUPPORTED_ASPECTS = ['1:1', '4:5', '3:4', '16:9'] as const
const SUPPORTED_SKIN_RETOUCH = ['natural', 'medium', 'strong'] as const
const ACTIVE_JOB_STATUSES = ['pending', 'queued', 'running']

type SupportedAspect = (typeof SUPPORTED_ASPECTS)[number]
type SupportedSkinRetouch = (typeof SUPPORTED_SKIN_RETOUCH)[number]

function safeSize(size: string | undefined) {
  return size && SUPPORTED_SIZES.includes(size) ? size : '1024x1024'
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  const numberValue = typeof value === 'number' && Number.isFinite(value) ? value : fallback
  return Math.max(min, Math.min(max, numberValue))
}

function safeAspectRatio(value: unknown, fallback: SupportedAspect): SupportedAspect {
  return typeof value === 'string' && SUPPORTED_ASPECTS.includes(value as SupportedAspect)
    ? (value as SupportedAspect)
    : fallback
}

function safeSkinRetouch(value: unknown): SupportedSkinRetouch {
  return typeof value === 'string' && SUPPORTED_SKIN_RETOUCH.includes(value as SupportedSkinRetouch)
    ? (value as SupportedSkinRetouch)
    : 'natural'
}

function clientIp(req: NextRequest) {
  const forwarded = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
  return forwarded || req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || 'unknown'
}

function counterKey(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function dayBucket(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

async function ensureDailyBudget(tx: Parameters<Parameters<typeof db.$transaction>[0]>[0], input: {
  normalizedEmail: string
  ip: string
  imageCount: number
  bucketStart: Date
}) {
  const checks = [
    {
      scope: 'global',
      key: 'all',
      limit: profileForgeConfig.rateLimits.dailyGlobalImageLimit,
      reason: 'daily_global_limit',
    },
    {
      scope: 'email',
      key: counterKey(input.normalizedEmail),
      limit: profileForgeConfig.rateLimits.dailyEmailImageLimit,
      reason: 'daily_email_limit',
    },
    {
      scope: 'ip',
      key: counterKey(input.ip),
      limit: profileForgeConfig.rateLimits.dailyIpImageLimit,
      reason: 'daily_ip_limit',
    },
  ]

  for (const check of checks) {
    const current = await tx.usageCounter.findUnique({
      where: {
        scope_key_bucketStart: {
          scope: check.scope,
          key: check.key,
          bucketStart: input.bucketStart,
        },
      },
    })
    if ((current?.count ?? 0) + input.imageCount > check.limit) {
      return { ok: false as const, reason: check.reason }
    }
  }

  for (const check of checks) {
    await tx.usageCounter.upsert({
      where: {
        scope_key_bucketStart: {
          scope: check.scope,
          key: check.key,
          bucketStart: input.bucketStart,
        },
      },
      update: { count: { increment: input.imageCount } },
      create: {
        scope: check.scope,
        key: check.key,
        bucketStart: input.bucketStart,
        count: input.imageCount,
      },
    })
  }

  return { ok: true as const }
}

function publicMessage(status: string, error?: string | null) {
  if (status === 'queued') return '생성 요청이 접수되었습니다. 완료되면 이메일로 알려드립니다.'
  if (status === 'running') return '이미지를 생성하고 있습니다. 브라우저를 닫아도 작업은 계속 진행됩니다.'
  if (status === 'partially_succeeded') return '일부 이미지 생성이 완료되었습니다. 성공한 이미지만 제공됩니다.'
  if (status === 'succeeded') return '생성이 완료되었습니다. 다운로드 링크를 이메일로 보냈습니다.'
  if (status === 'failed') return sanitizePublicError(error)
  return '작업 상태를 확인하고 있습니다.'
}

function sanitizePublicError(error?: string | null) {
  if (!error) return '생성 중 오류가 발생했습니다. 차감은 발생하지 않았습니다.'
  if (error.includes('업로드') || error.includes('원본')) return '업로드 원본 이미지를 확인할 수 없습니다. 다시 업로드해주세요.'
  if (error.includes('정책')) return '선택한 컨셉 또는 이미지가 정책 제한에 걸렸습니다. 다른 컨셉으로 다시 시도해주세요.'
  if (error.includes('응답이 지연') || error.includes('timeout')) return '이미지 생성 서버 응답이 지연되었습니다. 잠시 후 다시 시도해주세요.'
  if (error.includes('저장') || error.includes('storage')) return '결과 저장 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.'
  return '생성 중 오류가 발생했습니다. 차감은 발생하지 않았습니다.'
}

async function getJobImages(jobId: string) {
  const rows = await db.generatedImage.findMany({
    where: { jobId, status: { in: ['available', 'uploaded_r2'] }, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: 'asc' },
  })

  return Promise.all(rows.map(async (image, idx) => {
    let imageUrl = image.imageUrl || ''
    if (!imageUrl) {
      try {
        imageUrl = await createDownloadUrl({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl })
      } catch {
        imageUrl = ''
      }
    }

    return {
      id: image.id,
      imageUrl,
      thumbnailUrl: imageUrl,
      downloadAvailable: Boolean(imageUrl),
      expiresAt: image.expiresAt.toISOString(),
      likenessScore: image.likenessScore ?? 0,
      qualityScore: image.qualityScore ?? 0,
      conceptFitScore: Math.max(55, Math.min(98, Math.round((76 + idx * 3) * 10) / 10)),
      seed: Math.abs(image.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + idx * 997) % 1_000_000,
    }
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
    const { sessionId, uploadId, conceptId } = body

    if (!sessionId || !conceptId || !uploadId) {
      return NextResponse.json({ error: '업로드 이미지와 컨셉 선택이 필요합니다.' }, { status: 400 })
    }
    if (!body.email || !isValidEmail(body.email)) {
      return NextResponse.json({ error: '결과를 받을 올바른 이메일 주소를 입력해주세요.' }, { status: 400 })
    }

    const concept = CONCEPTS.find((item) => item.id === conceptId)
    if (!concept) {
      return NextResponse.json({ error: '지원하지 않는 컨셉입니다. 컨셉을 다시 선택해주세요.' }, { status: 400 })
    }

    const normalizedEmail = normalizeEmail(body.email)
    const safeResultCount = Math.max(1, Math.min(profileForgeConfig.queue.maxResultCount, body.resultCount || profileForgeConfig.queue.defaultResultCount))
    const customizeOptions: CustomizeOptions = {
      creativity: clampNumber(body.creativity, concept.defaultCreativity, 0, 100),
      identityLockStrength: clampNumber(body.identityLockStrength, 70, 0, 100),
      aspectRatio: safeAspectRatio(body.aspectRatio, concept.defaultAspect),
      resultCount: safeResultCount,
      skinRetouch: safeSkinRetouch(body.skinRetouch),
      aiLabel: Boolean(body.aiLabel),
    }
    const builtPrompts = buildPrompts(concept, customizeOptions)
    const safeSizeStr = safeSize(body.size || builtPrompts.size)
    const ip = clientIp(req)
    const bucketStart = dayBucket()
    const userEmail = `${sessionId}@profileforge.local`
    const user = await db.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail, name: sessionId, consentVersion: 'v1' },
    })

    const upload = await db.upload.findFirst({
      where: {
        id: uploadId,
        userId: user.id,
        expiresAt: { gt: new Date() },
        deletedAt: null,
      },
    })
    if (!upload) {
      return NextResponse.json({ error: '업로드 원본 이미지를 확인할 수 없습니다. 다시 업로드해주세요.' }, { status: 400 })
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
      aspectRatio: customizeOptions.aspectRatio,
      creativity: customizeOptions.creativity,
      identityLockStrength: customizeOptions.identityLockStrength,
      skinRetouch: customizeOptions.skinRetouch,
      aiLabel: customizeOptions.aiLabel,
      positivePrompt: builtPrompts.positive,
      negativePrompt: builtPrompts.negative,
    })

    const createResult = await db.$transaction(async (tx) => {
      const existingJob = await tx.generationJob.findUnique({ where: { idempotencyKey } })
      if (existingJob) {
        return { kind: 'existing' as const, job: existingJob }
      }

      const [activeForUser, activeForEmail] = await Promise.all([
        tx.generationJob.count({ where: { userId: user.id, status: { in: ACTIVE_JOB_STATUSES } } }),
        tx.generationJob.count({ where: { email: normalizedEmail, status: { in: ACTIVE_JOB_STATUSES } } }),
      ])
      if (activeForUser >= profileForgeConfig.queue.userActiveJobLimit) {
        return { kind: 'limit' as const, reason: 'active_job_limit' }
      }
      if (activeForEmail >= profileForgeConfig.queue.userActiveJobLimit) {
        return { kind: 'limit' as const, reason: 'active_email_job_limit' }
      }

      const budget = await ensureDailyBudget(tx, {
        normalizedEmail,
        ip,
        imageCount: safeResultCount,
        bucketStart,
      })
      if (!budget.ok) {
        return { kind: 'limit' as const, reason: budget.reason }
      }

      const job = await tx.generationJob.create({
        data: {
          userId: user.id,
          uploadId: upload.id,
          conceptId,
          conceptName: concept.name,
          paramsJson: JSON.stringify({
            creativity: customizeOptions.creativity,
            identityLockStrength: customizeOptions.identityLockStrength,
            skinRetouch: customizeOptions.skinRetouch,
            aiLabel: customizeOptions.aiLabel,
            aspectRatio: customizeOptions.aspectRatio,
            resultCount: safeResultCount,
            size: safeSizeStr,
            creditCost: concept.creditCost,
            promptVersion: 'server-v2',
          }),
          positivePrompt: builtPrompts.positive,
          negativePrompt: builtPrompts.negative,
          aspectRatio: customizeOptions.aspectRatio,
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
      return { kind: 'created' as const, job }
    })

    if (createResult.kind === 'limit') {
      return NextResponse.json({ error: '오늘 생성 가능 횟수를 초과했거나 이미 생성 중인 작업이 있습니다. 완료되면 입력하신 이메일로 알려드립니다.', reason: createResult.reason }, { status: 429 })
    }

    if (createResult.kind === 'existing') {
      return NextResponse.json({
        jobId: createResult.job.id,
        status: createResult.job.status,
        message: publicMessage(createResult.job.status, createResult.job.errorMessage),
        queuePosition: await estimateQueuePosition(createResult.job.id),
        estimatedWaitSeconds: await estimateWaitSeconds(createResult.job.id),
        images: await getJobImages(createResult.job.id),
      }, { status: 202 })
    }

    const { job } = createResult
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
