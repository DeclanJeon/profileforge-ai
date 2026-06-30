import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { promises as fs } from 'fs'
import { db } from '@/lib/db'
import { createDownloadUrl } from '@/lib/profileforge/storage'
import { generatedImageUrlToLocalPath } from '@/lib/profileforge/image-provider'
import { authOptions, normalizeAuthEmail } from '@/lib/auth'

const ALLOWED_SIZES = new Set(['original', '1024', '2048', 'square', 'web', 'print'])

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const session = await getServerSession(authOptions)
    const userEmail = normalizeAuthEmail(session?.user?.email)
    if (!userEmail) {
      return NextResponse.json({ error: 'Google 로그인이 필요합니다.' }, { status: 401 })
    }
    const { size, jobId, imageId } = body as {
      size?: string
      jobId?: string
      imageId?: string
    }

    if (!jobId || !imageId) {
      return NextResponse.json({ error: '다운로드할 이미지 정보가 필요합니다.' }, { status: 400 })
    }


    const image = await db.generatedImage.findFirst({
      where: {
        id: imageId,
        jobId,
        status: { in: ['available', 'uploaded_r2'] },
        expiresAt: { gt: new Date() },
        deletedAt: null,
        job: {
          user: {
            email: userEmail,
          },
        },
      },
    })
    if (!image) {
      return NextResponse.json({ error: '다운로드 가능한 이미지를 찾을 수 없습니다.' }, { status: 404 })
    }

    const downloadUrl = await createDownloadUrl({
      bucket: image.r2Bucket,
      key: image.r2Key,
      imageUrl: image.imageUrl,
    })
    let buffer: Buffer
    let mime = image.mimeType || 'image/png'
    if (downloadUrl.startsWith('/api/profileforge/image/')) {
      const filePath = generatedImageUrlToLocalPath(downloadUrl)
      if (!filePath) {
        return NextResponse.json({ error: '지원하지 않는 이미지 경로입니다.' }, { status: 400 })
      }
      try {
        buffer = await fs.readFile(filePath)
      } catch {
        return NextResponse.json({ error: '이미지 파일을 찾을 수 없습니다.' }, { status: 404 })
      }
    } else {
      const response = await fetch(downloadUrl)
      if (!response.ok) {
        return NextResponse.json({ error: '이미지를 가져올 수 없습니다.' }, { status: 502 })
      }
      buffer = Buffer.from(await response.arrayBuffer())
      mime = response.headers.get('content-type') || mime
    }
    const safeSize = size && ALLOWED_SIZES.has(size) ? size : 'original'
    const extension = mime.includes('jpeg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'png'

    await db.download.create({
      data: {
        generatedImageId: image.id,
        format: extension,
        resolution: safeSize,
      },
    })

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="profileforge-${safeSize}.${extension}"`,
        'Cache-Control': 'private, no-store, max-age=0',
      },
    })
  } catch (error) {
    console.error('[download] error', error)
    return NextResponse.json(
      { error: '다운로드 실패' },
      { status: 500 },
    )
  }
}
