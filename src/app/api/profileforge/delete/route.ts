/**
 * 데이터 삭제 API
 * - 세션 기반 사용자의 모든 업로드/결과/작업 삭제
 * - 파일 시스템의 이미지도 함께 삭제
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import path from 'path'
import { promises as fs } from 'fs'
import { generatedImageUrlToLocalPath } from '@/lib/profileforge/image-provider'

export async function DELETE(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId 필요' }, { status: 400 })
    }

    const userEmail = `${sessionId}@profileforge.local`
    const user = await db.user.findUnique({
      where: { email: userEmail },
      include: {
        uploads: true,
        jobs: {
          include: {
            images: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ ok: true, deleted: 0 })
    }

    // 파일 삭제
    const allFiles: string[] = []
    user.uploads.forEach((u) => allFiles.push(u.fileUrl))
    user.jobs.forEach((j) => j.images.forEach((i) => {
      if (i.imageUrl) allFiles.push(i.imageUrl)
    }))

    for (const fileUrl of allFiles) {
      let fp: string | null = null
      if (fileUrl.startsWith('/uploads/')) {
        fp = path.join(process.cwd(), 'public', fileUrl)
      } else if (fileUrl.startsWith('/api/profileforge/image/')) {
        fp = generatedImageUrlToLocalPath(fileUrl)
      }

      if (fp) {
        try {
          await fs.unlink(fp)
        } catch {
          // ignore missing
        }
      }
    }

    // DB 삭제 (cascade)
    await db.user.delete({ where: { id: user.id } })

    return NextResponse.json({
      ok: true,
      deleted: {
        uploads: user.uploads.length,
        jobs: user.jobs.length,
        images: user.jobs.reduce((a, j) => a + j.images.length, 0),
      },
    })
  } catch (e) {
    console.error('[delete] error', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '삭제 실패' },
      { status: 500 },
    )
  }
}
