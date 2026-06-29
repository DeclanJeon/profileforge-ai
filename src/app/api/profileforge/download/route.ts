/**
 * 다운로드 API
 * - 원격/로컬 이미지를 가져와서 파일로 반환
 * - Download 레코드 저장
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import { promises as fs } from 'fs'
import { generatedImageUrlToLocalPath } from '@/lib/profileforge/image-provider'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { imageUrl, size, jobId, imageId } = body as {
      imageUrl: string
      size: string
      jobId?: string
      imageId?: string
    }

    if (!imageUrl) {
      return NextResponse.json({ error: '이미지 URL이 필요합니다.' }, { status: 400 })
    }

    let buffer: Buffer
    let mime = 'image/png'

    if (imageUrl.startsWith('/uploads/')) {
      const filePath = path.join(process.cwd(), 'public', imageUrl)
      try {
        buffer = await fs.readFile(filePath)
      } catch {
        return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
      }
    } else if (imageUrl.startsWith('/api/profileforge/image/')) {
      const filePath = generatedImageUrlToLocalPath(imageUrl)
      if (!filePath) {
        return NextResponse.json({ error: '지원하지 않는 이미지 URL' }, { status: 400 })
      }
      try {
        buffer = await fs.readFile(filePath)
      } catch {
        return NextResponse.json({ error: '파일을 찾을 수 없습니다.' }, { status: 404 })
      }
    } else if (imageUrl.startsWith('http')) {
      const res = await fetch(imageUrl)
      if (!res.ok) {
        return NextResponse.json({ error: '이미지를 가져올 수 없습니다.' }, { status: 502 })
      }
      const ab = await res.arrayBuffer()
      buffer = Buffer.from(ab)
      mime = res.headers.get('content-type') || 'image/png'
    } else if (imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split(',')[1] || ''
      buffer = Buffer.from(base64, 'base64')
      mime = imageUrl.split(';')[0].split(':')[1] || 'image/png'
    } else {
      return NextResponse.json({ error: '지원하지 않는 이미지 URL' }, { status: 400 })
    }

    if (imageId) {
      try {
        await db.download.create({
          data: {
            generatedImageId: imageId,
            format: mime.includes('jpeg') ? 'jpg' : 'png',
            resolution: size || 'original',
          },
        })
      } catch {
        // imageId가 DB에 없으면 무시
      }
    }

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mime,
        'Content-Disposition': `attachment; filename="profileforge-${size || 'original'}.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (e) {
    console.error('[download] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '다운로드 실패' },
      { status: 500 },
    )
  }
}
