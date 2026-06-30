import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { claimDownloadToken } from '@/lib/profileforge/download-tokens'
import { createDownloadUrl } from '@/lib/profileforge/storage'

export async function GET(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params
    if (!token || token.length < 32) {
      return NextResponse.json({ error: '다운로드 링크를 확인할 수 없습니다.' }, { status: 404 })
    }

    const claimed = await claimDownloadToken(token)
    if (!claimed || !claimed.generatedImage) {
      return NextResponse.json({ error: '다운로드 링크가 만료되었거나 사용할 수 없습니다.' }, { status: 410 })
    }
    const image = claimed.generatedImage
    if (!['available', 'uploaded_r2'].includes(image.status) || image.expiresAt <= new Date()) {
      return NextResponse.json({ error: '이미지가 만료되었거나 삭제되었습니다.' }, { status: 410 })
    }

    await db.download.create({
      data: {
        generatedImageId: image.id,
        format: image.mimeType.includes('jpeg') ? 'jpg' : 'png',
        resolution: `${image.width || 'original'}x${image.height || 'original'}`,
      },
    }).catch(() => undefined)

    const url = await createDownloadUrl({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl })
    if (url.startsWith('/')) {
      return NextResponse.redirect(new URL(url, _req.url), {
        headers: {
          'Cache-Control': 'private, no-store, max-age=0',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      })
    }
    return NextResponse.redirect(url, {
      headers: {
        'Cache-Control': 'private, no-store, max-age=0',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    })
  } catch (error) {
    console.error('[download-token] error', error)
    return NextResponse.json({ error: '다운로드를 준비하지 못했습니다.' }, { status: 500 })
  }
}
