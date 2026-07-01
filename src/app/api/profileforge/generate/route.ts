import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { uploadFileUrlToLocalPath } from '@/lib/profileforge/image-provider'
import { CONCEPTS } from '@/lib/profileforge/concepts'
import { ALL_STYLE_CONCEPTS, StyleMode, findCameraShotPreset, findFashionPreset, findHairPreset, isStyleMode } from '@/lib/profileforge/style-presets'
import { buildPrompts, CustomizeOptions, sanitizeCustomStyleNote } from '@/lib/profileforge/prompt-builder'
import { profileForgeConfig } from '@/lib/profileforge/config'
import { authOptions, normalizeAuthEmail } from '@/lib/auth'
import { createDownloadUrl } from '@/lib/profileforge/storage'
import {
  estimateQueuePosition,
  estimateWaitSeconds,
  makeGenerationIdempotencyKey,
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
  styleMode?: string
  fashionPresetId?: string
  hairPresetId?: string
  cameraShotId?: string
  customStyleNote?: string
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
  if (status === 'succeeded') return '생성이 완료되었습니다. 결과 이미지를 이메일 첨부파일로 보냈습니다.'
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
  const session = await getServerSession(authOptions)
  const authEmail = normalizeAuthEmail(session?.user?.email)
  if (!authEmail) return NextResponse.json({ error: 'Google 로그인이 필요합니다.' }, { status: 401 })

  const job = await db.generationJob.findFirst({ where: { id: jobId, email: authEmail } })
  if (!job) return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 })

  const shouldExposePreviewImages = !job.email
  const [images, queuePosition, estimatedWaitSeconds] = await Promise.all([
    shouldExposePreviewImages ? getJobImages(jobId) : Promise.resolve([]),
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
    const session = await getServerSession(authOptions)
    const authEmail = normalizeAuthEmail(session?.user?.email)
    if (!authEmail) {
      return NextResponse.json({ error: 'Google 로그인이 필요합니다.' }, { status: 401 })
    }
    const { sessionId, uploadId, conceptId } = body

    if (!sessionId || !conceptId || !uploadId) {
      return NextResponse.json({ error: '업로드 이미지와 컨셉 선택이 필요합니다.' }, { status: 400 })
    }

    const allConcepts = [...CONCEPTS, ...ALL_STYLE_CONCEPTS]
    const concept = allConcepts.find((item) => item.id === conceptId)
    if (!concept) {
      return NextResponse.json({ error: '지원하지 않는 컨셉입니다. 컨셉을 다시 선택해주세요.' }, { status: 400 })
    }

    let styleMode: StyleMode = 'profile'
    if (body.styleMode) {
      if (!isStyleMode(body.styleMode)) {
        return NextResponse.json({ error: '지원하지 않는 스타일 모드입니다.' }, { status: 400 })
      }
      styleMode = body.styleMode
    }
    const fashionPreset = findFashionPreset(body.fashionPresetId)
    const hairPreset = findHairPreset(body.hairPresetId)
    const cameraShot = findCameraShotPreset(body.cameraShotId)
    const expectedStyleConceptId = styleMode === 'profile' ? null : `style-${styleMode}`
    if (styleMode === 'profile' && concept.id.startsWith('style-')) {
      return NextResponse.json({ error: '스타일 전용 컨셉은 스타일 모드가 필요합니다.' }, { status: 400 })
    }
    if (expectedStyleConceptId && concept.id !== expectedStyleConceptId) {
      return NextResponse.json({ error: '선택한 스타일 모드와 컨셉이 일치하지 않습니다.' }, { status: 400 })
    }
    if (styleMode === 'profile' && (body.fashionPresetId || body.hairPresetId)) {
      return NextResponse.json({ error: '프로필 컨셉에는 패션/헤어 프리셋을 함께 보낼 수 없습니다.' }, { status: 400 })
    }
    if (body.fashionPresetId && !fashionPreset) {
      return NextResponse.json({ error: '지원하지 않는 패션 스타일입니다.' }, { status: 400 })
    }
    if (body.hairPresetId && !hairPreset) {
      return NextResponse.json({ error: '지원하지 않는 헤어스타일입니다.' }, { status: 400 })
    }
    if (styleMode === 'fashion' && (!fashionPreset || body.hairPresetId)) {
      return NextResponse.json({ error: '패션 변경에는 유효한 패션 스타일만 선택할 수 있습니다.' }, { status: 400 })
    }
    if (styleMode === 'hair' && (!hairPreset || body.fashionPresetId)) {
      return NextResponse.json({ error: '헤어스타일 변경에는 유효한 헤어스타일만 선택할 수 있습니다.' }, { status: 400 })
    }
    if (styleMode === 'makeover' && (!fashionPreset || !hairPreset)) {
      return NextResponse.json({ error: '메이크오버에는 패션과 헤어스타일 선택이 모두 필요합니다.' }, { status: 400 })
    }
    if (body.cameraShotId && !cameraShot) {
      return NextResponse.json({ error: '지원하지 않는 카메라 샷입니다.' }, { status: 400 })
    }
    const normalizedEmail = authEmail
    const safeResultCount = Math.max(1, Math.min(profileForgeConfig.queue.maxResultCount, body.resultCount || profileForgeConfig.queue.defaultResultCount))
    const customizeOptions: CustomizeOptions = {
      creativity: clampNumber(body.creativity, concept.defaultCreativity, 0, 100),
      identityLockStrength: clampNumber(body.identityLockStrength, 70, 0, 100),
      aspectRatio: safeAspectRatio(body.aspectRatio, concept.defaultAspect),
      resultCount: safeResultCount,
      skinRetouch: safeSkinRetouch(body.skinRetouch),
      aiLabel: Boolean(body.aiLabel),
      styleMode,
      fashionPresetId: fashionPreset?.id,
      hairPresetId: hairPreset?.id,
      cameraShotId: cameraShot?.id,
      customStyleNote: sanitizeCustomStyleNote(body.customStyleNote),
    }
    const builtPrompts = buildPrompts(concept, customizeOptions)
    const safeSizeStr = safeSize(body.size || builtPrompts.size)
    const ip = clientIp(req)
    const bucketStart = dayBucket()
    const user = await db.user.upsert({
      where: { email: normalizedEmail },
      update: { name: session?.user?.name || normalizedEmail },
      create: { email: normalizedEmail, name: session?.user?.name || normalizedEmail, consentVersion: 'v1' },
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
      styleMode: customizeOptions.styleMode,
      fashionPresetId: customizeOptions.fashionPresetId,
      hairPresetId: customizeOptions.hairPresetId,
      cameraShotId: customizeOptions.cameraShotId,
      customStyleNote: customizeOptions.customStyleNote,
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
            styleMode: customizeOptions.styleMode,
            fashionPresetId: customizeOptions.fashionPresetId,
            hairPresetId: customizeOptions.hairPresetId,
            cameraShotId: customizeOptions.cameraShotId,
            customStyleNote: customizeOptions.customStyleNote,
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
        images: createResult.job.email ? [] : await getJobImages(createResult.job.id),
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
