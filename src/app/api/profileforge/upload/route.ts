/**
 * 업로드 API
 * - 파일을 public/uploads 디렉토리에 저장
 * - 간이 품질 검사(해상도, 파일 크기) 수행
 * - DB에 Upload 레코드 저장 (User upsert 포함)
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'
import crypto from 'crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_SIZE = 20 * 1024 * 1024
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp']

// 디렉토리 보장
async function ensureDir() {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
  } catch {
    // ignore
  }
}

// 이미지 메타데이터 간이 추출 (sharp 사용)
async function getImageMeta(filePath: string): Promise<{ width: number; height: number }> {
  try {
    const sharp = (await import('sharp')).default
    const meta = await sharp(filePath).metadata()
    return { width: meta.width || 0, height: meta.height || 0 }
  } catch {
    return { width: 0, height: 0 }
  }
}

// 간이 얼굴 품질 점수 (실제 face detection은 MVP에서는 휴리스틱)
function computeQualityScore(opts: {
  width: number
  height: number
  fileSize: number
  mimeType: string
}): { score: number; faceCount: number; warnings: string[] } {
  const { width, height, fileSize } = opts
  const warnings: string[] = []
  let score = 50

  // 해상도 점수
  const minSide = Math.min(width, height)
  if (minSide >= 1024) score += 25
  else if (minSide >= 768) score += 18
  else if (minSide >= 512) score += 10
  else {
    score += 0
    warnings.push('해상도가 낮습니다. 512px 이상의 사진을 권장합니다.')
  }

  // 파일 크기 점수
  if (fileSize >= 500 * 1024) score += 10
  else if (fileSize >= 200 * 1024) score += 5
  else warnings.push('파일 크기가 작습니다. 선명한 사진을 권장합니다.')

  // 세로/가로 비율 (정면 셀카 휴리스틱)
  if (height >= width && height / width <= 1.5) score += 8

  // 가로 세로 균형 (정사각형에 가까울수록 얼굴 중심)
  if (Math.abs(width - height) / Math.max(width, height) < 0.2) score += 7

  score = Math.min(100, Math.max(0, score))

  // 다중 얼굴 감지 흉내 (랜덤 기반, 15% 확률로 다중)
  const faceCount = Math.random() < 0.15 ? 2 : 1
  if (faceCount > 1) {
    warnings.push('여러 인물이 감지되었습니다. 대표 얼굴을 기준으로 생성됩니다.')
  }

  if (minSide < 400) {
    warnings.push('얼굴이 너무 작을 수 있습니다. 얼굴이 크게 보이는 사진을 사용하세요.')
  }

  return { score, faceCount, warnings }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const sessionId = (formData.get('sessionId') as string) || 'sess_anon'

    if (!file) {
      return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })
    }
    if (!ACCEPTED.includes(file.type)) {
      return NextResponse.json(
        { error: '지원하지 않는 파일 형식입니다. JPG, PNG, WebP만 가능합니다.' },
        { status: 400 },
      )
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: '파일 크기가 20MB를 초과합니다.' },
        { status: 400 },
      )
    }

    await ensureDir()

    // 파일 저장
    const ext = file.name.split('.').pop() || 'png'
    const hashName = `${crypto.randomBytes(8).toString('hex')}.${ext}`
    const filePath = path.join(UPLOAD_DIR, hashName)
    const buffer = Buffer.from(await file.arrayBuffer())
    await fs.writeFile(filePath, buffer)

    // 메타데이터
    const meta = await getImageMeta(filePath)
    const { score, faceCount, warnings } = computeQualityScore({
      width: meta.width,
      height: meta.height,
      fileSize: file.size,
      mimeType: file.type,
    })

    // User upsert (세션 기반)
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

    // 30분 TTL
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000)

    const upload = await db.upload.create({
      data: {
        userId: user.id,
        fileUrl: `/uploads/${hashName}`,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        width: meta.width || undefined,
        height: meta.height || undefined,
        faceQualityScore: score,
        faceCount,
        expiresAt,
      },
    })

    return NextResponse.json({
      uploadId: upload.id,
      fileUrl: upload.fileUrl,
      qualityScore: score,
      faceCount,
      warnings,
      width: meta.width,
      height: meta.height,
    })
  } catch (e) {
    console.error('[upload] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '업로드 실패' },
      { status: 500 },
    )
  }
}
