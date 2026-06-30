import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { enqueueResendEmail, sendPendingEmails } from '@/lib/profileforge/email'
import { normalizeEmail } from '@/lib/profileforge/queue'

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({})) as { jobId?: string; email?: string }
    if (!body.jobId || !body.email || !isValidEmail(body.email)) {
      return NextResponse.json({ error: '작업 ID와 올바른 이메일 주소가 필요합니다.' }, { status: 400 })
    }

    const email = normalizeEmail(body.email)
    const job = await db.generationJob.findUnique({
      where: { id: body.jobId },
      include: { images: { where: { status: { in: ['available', 'uploaded_r2'] }, expiresAt: { gt: new Date() } }, take: 1 } },
    })
    if (!job || job.email !== email) {
      return NextResponse.json({ error: '재발송할 작업을 찾을 수 없습니다.' }, { status: 404 })
    }
    if (!['succeeded', 'partially_succeeded'].includes(job.status) || job.images.length === 0) {
      return NextResponse.json({ error: '아직 다운로드 가능한 결과가 없습니다.' }, { status: 409 })
    }

    const queued = await enqueueResendEmail({ jobId: job.id, email, conceptName: job.conceptName })
    if (queued.status === 'queued') {
      void sendPendingEmails(1).catch((error) => {
        console.error('[profileforge-resend] send failed', error)
      })
      return NextResponse.json({ ok: true, status: queued.status, message: '다운로드 이메일 재발송을 요청했습니다.' })
    }

    const message = queued.status === 'cooldown'
      ? `이미 재발송된 링크가 있습니다. 약 ${Math.ceil(queued.retryAfterSeconds / 60)}분 후 다시 시도해주세요.`
      : '이미 이메일 재발송이 대기 중입니다.'
    return NextResponse.json({ ok: true, status: queued.status, retryAfterSeconds: queued.retryAfterSeconds, message })
  } catch (error) {
    console.error('[profileforge-resend] error', error)
    return NextResponse.json({ error: '이메일 재발송을 준비하지 못했습니다.' }, { status: 500 })
  }
}
