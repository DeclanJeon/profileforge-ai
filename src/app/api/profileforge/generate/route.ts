/**
 * 이미지 생성 API
 * - ponslink의 codex-imagen 스킬을 image-to-image provider로 호출
 * - Cloudflare/브라우저 timeout을 피하기 위해 POST는 job만 만들고 즉시 반환
 * - GET ?jobId=... 로 생성 상태와 완료 이미지를 폴링
 */
import type { Upload } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  generateProfileImage,
  uploadFileUrlToLocalPath,
} from '@/lib/profileforge/image-provider'

interface GenerateRequest {
  sessionId: string
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

interface GeneratedResultPayload {
  id: string
  imageUrl: string
  thumbnailUrl: string
  likenessScore: number
  qualityScore: number
  conceptFitScore: number
  seed: number
}

const SUPPORTED_SIZES = [
  '1024x1024',
  '768x1344',
  '864x1152',
  '1344x768',
  '1152x864',
  '1440x720',
  '720x1440',
]

const activeJobs = new Set<string>()

function safeSize(s: string): string {
  return SUPPORTED_SIZES.includes(s) ? s : '1024x1024'
}

// 유사도/품질 점수 시뮬레이션 (MVP - 정량적 메트릭은 추후 정교화)
function scoreImage(idx: number, identityLock: number, creativity: number) {
  // identity lock이 높을수록 유사도 베이스 상승, creativity가 높을수록 약간 하락
  const likenessBase = 60 + (identityLock / 100) * 30 - (creativity / 100) * 10
  const likeness = Math.max(45, Math.min(98, likenessBase + (Math.random() * 14 - 7)))

  const qualityBase = 78
  const quality = Math.max(60, Math.min(98, qualityBase + (Math.random() * 18 - 6)))

  const conceptFitBase = 70 + (creativity / 100) * 20
  const conceptFit = Math.max(55, Math.min(98, conceptFitBase + (Math.random() * 14 - 7)))

  return {
    likenessScore: Math.round(likeness * 10) / 10,
    qualityScore: Math.round(quality * 10) / 10,
    conceptFitScore: Math.round(conceptFit * 10) / 10,
  }
}

async function getJobImages(jobId: string): Promise<GeneratedResultPayload[]> {
  const rows = await db.generatedImage.findMany({
    where: { jobId },
    orderBy: { createdAt: 'asc' },
  })

  return rows.map((image, idx) => ({
    id: image.id,
    imageUrl: image.imageUrl,
    thumbnailUrl: image.imageUrl,
    likenessScore: image.likenessScore,
    qualityScore: image.qualityScore,
    // conceptFitScore/seed are not persisted yet, keep stable display-safe values.
    conceptFitScore: Math.max(55, Math.min(98, Math.round((76 + idx * 3) * 10) / 10)),
    seed: Math.abs(
      image.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) + idx * 997,
    ) % 1_000_000,
  }))
}

async function processGenerationJob(args: {
  jobId: string
  referenceImagePath: string
  positivePrompt: string
  negativePrompt: string
  safeSizeStr: string
  resultCount: number
  identityLockStrength: number
  creativity: number
}) {
  if (activeJobs.has(args.jobId)) return
  activeJobs.add(args.jobId)

  try {
    const finalCount = Math.max(1, Math.min(8, args.resultCount))
    let successCount = 0
    const errors: string[] = []

    for (let idx = 0; idx < finalCount; idx += 1) {
      try {
        const generatedImage = await generateProfileImage({
          jobId: args.jobId,
          index: idx,
          prompt: args.positivePrompt,
          negativePrompt: args.negativePrompt,
          referenceImagePath: args.referenceImagePath,
          outputSize: args.safeSizeStr,
        })
        const scores = scoreImage(idx, args.identityLockStrength, args.creativity)

        await db.generatedImage.create({
          data: {
            jobId: args.jobId,
            imageUrl: generatedImage.fileUrl,
            likenessScore: scores.likenessScore,
            qualityScore: scores.qualityScore,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          },
        })
        successCount += 1
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        errors.push(`image ${idx + 1}: ${message}`)
        console.error(`[generate] image ${idx} failed`, err)
      }
    }

    if (successCount === 0) {
      await db.generationJob.update({
        where: { id: args.jobId },
        data: {
          status: 'failed',
          errorMessage: errors.join('\n') || '이미지 생성에 실패했습니다.',
          completedAt: new Date(),
        },
      })
      return
    }

    await db.generationJob.update({
      where: { id: args.jobId },
      data: {
        status: 'succeeded',
        errorMessage: errors.length > 0 ? errors.join('\n') : null,
        costCredits: successCount * 2,
        completedAt: new Date(),
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[generate] background error', error)
    await db.generationJob.update({
      where: { id: args.jobId },
      data: {
        status: 'failed',
        errorMessage: message,
        completedAt: new Date(),
      },
    }).catch(() => undefined)
  } finally {
    activeJobs.delete(args.jobId)
  }
}

export async function GET(req: NextRequest) {
  const jobId = req.nextUrl.searchParams.get('jobId')
  if (!jobId) {
    return NextResponse.json({ error: 'jobId가 필요합니다.' }, { status: 400 })
  }

  const job = await db.generationJob.findUnique({ where: { id: jobId } })
  if (!job) {
    return NextResponse.json({ error: '작업을 찾을 수 없습니다.' }, { status: 404 })
  }

  const images = await getJobImages(jobId)
  return NextResponse.json({
    jobId,
    status: job.status,
    error: job.errorMessage,
    images,
    completedAt: job.completedAt,
  })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as GenerateRequest
    const {
      sessionId,
      uploadId,
      conceptId,
      conceptName,
      positivePrompt,
      negativePrompt,
      size,
      resultCount,
      creativity,
      identityLockStrength,
    } = body

    if (!positivePrompt || !conceptId) {
      return NextResponse.json(
        { error: '필수 파라미터가 누락되었습니다.' },
        { status: 400 },
      )
    }

    const safeSizeStr = safeSize(size)

    // User 확인/생성
    const userEmail = `${sessionId}@profileforge.local`
    const user = await db.user.upsert({
      where: { email: userEmail },
      update: {},
      create: {
        email: userEmail,
        name: sessionId,
        consentVersion: 'v1',
      },
    })

    // Upload 찾기 (없으면 더미 생성)
    let upload: Upload | null = null
    if (uploadId) {
      upload = await db.upload.findUnique({ where: { id: uploadId } })
    }
    if (!upload) {
      // 더미 업로드 레코드
      upload = await db.upload.create({
        data: {
          userId: user.id,
          fileUrl: body.uploadUrl || '/uploads/dummy.png',
          fileName: 'session-image',
          fileSize: 0,
          mimeType: 'image/jpeg',
          faceQualityScore: 70,
          faceCount: 1,
          expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        },
      })
    }

    // GenerationJob 생성
    const job = await db.generationJob.create({
      data: {
        userId: user.id,
        uploadId: upload.id,
        conceptId,
        conceptName,
        paramsJson: JSON.stringify({
          creativity,
          identityLockStrength,
          skinRetouch: body.skinRetouch,
          aiLabel: body.aiLabel,
          aspectRatio: body.aspectRatio,
          resultCount,
        }),
        positivePrompt,
        negativePrompt,
        aspectRatio: body.aspectRatio,
        status: 'running',
        provider: 'codex-imagen-ssh',
        costCredits: 0,
      },
    })

    const referenceImagePath = uploadFileUrlToLocalPath(upload.fileUrl)
    if (!referenceImagePath) {
      await db.generationJob.update({
        where: { id: job.id },
        data: {
          status: 'failed',
          errorMessage: '업로드 원본 이미지를 찾을 수 없습니다.',
          completedAt: new Date(),
        },
      })
      return NextResponse.json(
        { error: '업로드 원본 이미지를 찾을 수 없습니다. 다시 업로드해주세요.' },
        { status: 400 },
      )
    }

    void processGenerationJob({
      jobId: job.id,
      referenceImagePath,
      positivePrompt,
      negativePrompt,
      safeSizeStr,
      resultCount,
      identityLockStrength,
      creativity,
    })

    return NextResponse.json(
      {
        jobId: job.id,
        status: 'running',
        images: [],
      },
      { status: 202 },
    )
  } catch (e) {
    console.error('[generate] error', e)
    const msg = e instanceof Error ? e.message : '생성 실패'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
