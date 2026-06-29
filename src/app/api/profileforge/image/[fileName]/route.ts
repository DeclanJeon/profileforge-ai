import { promises as fs } from 'fs'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { generatedImageDir } from '@/lib/profileforge/image-provider'

export const runtime = 'nodejs'

function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase()
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'image/png'
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fileName: string }> },
) {
  const { fileName: rawFileName } = await params
  const fileName = path.basename(rawFileName || '')

  if (!fileName || fileName !== rawFileName || !/^pf_[a-zA-Z0-9_-]+\.png$/.test(fileName)) {
    return NextResponse.json({ error: '잘못된 이미지 경로입니다.' }, { status: 400 })
  }

  const filePath = path.join(generatedImageDir(), fileName)

  try {
    const buffer = await fs.readFile(filePath)
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': contentTypeFor(fileName),
        'Cache-Control': 'private, no-store, max-age=0',
        'Content-Length': String(buffer.byteLength),
      },
    })
  } catch {
    return NextResponse.json({ error: '이미지를 찾을 수 없습니다.' }, { status: 404 })
  }
}
