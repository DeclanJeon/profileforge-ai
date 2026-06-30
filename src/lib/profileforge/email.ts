import crypto from 'crypto'
import { db } from '@/lib/db'
import { isEmailConfigured, profileForgeConfig } from './config'
import { issueDownloadToken } from './download-tokens'

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'hidden email'
  return `${local[0] ?? '*'}***@${domain}`
}

export function hashEmail(email: string) {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

export function buildDownloadLink(token: string) {
  return `${profileForgeConfig.email.downloadBaseUrl}/${encodeURIComponent(token)}`
}

export async function enqueueCompletionEmail(input: {
  jobId: string
  email: string
  token: string
  conceptName: string
}) {
  const recipientHash = hashEmail(input.email)
  const idempotencyKey = `${input.jobId}:generation_completed:${recipientHash}`
  const existing = await db.emailDelivery.findUnique({ where: { idempotencyKey } })
  if (existing?.status === 'sent') return
  if (existing) {
    await db.emailDelivery.updateMany({
      where: { id: existing.id, status: { not: 'sent' } },
      data: {
        status: 'pending',
        nextRetryAt: new Date(),
        errorMessage: null,
      },
    })
  } else {
    await db.emailDelivery.create({
      data: {
        jobId: input.jobId,
        email: input.email,
        recipientHash,
        type: 'generation_completed',
        status: 'pending',
        provider: profileForgeConfig.email.provider,
        idempotencyKey,
        nextRetryAt: new Date(),
      },
    })
  }

  await db.generationJob.update({
    where: { id: input.jobId },
    data: { emailStatus: 'pending' },
  })
}

function completionEmailHtml(input: { conceptName: string; downloadLink: string }) {
  return `
    <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;line-height:1.6;color:#111827">
      <h1>ProfileForge 이미지 생성이 완료되었습니다</h1>
      <p>컨셉: <strong>${input.conceptName}</strong></p>
      <p>아래 버튼으로 결과를 다운로드하세요. 링크는 24시간 동안 유효합니다.</p>
      <p><a href="${input.downloadLink}" style="display:inline-block;background:#c026d3;color:white;padding:12px 18px;border-radius:10px;text-decoration:none">결과 다운로드</a></p>
      <p style="font-size:12px;color:#6b7280">개인정보 보호를 위해 만료된 이미지는 복구할 수 없습니다.</p>
    </div>
  `
}

export async function sendPendingEmails(limit = 10) {
  const deliveries = await db.emailDelivery.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      retryCount: { lt: 99 },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    include: {
      job: {
        include: {
          images: { where: { status: 'available' }, orderBy: { createdAt: 'asc' }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    take: limit,
  })

  let sent = 0
  let failed = 0
  for (const delivery of deliveries) {
    if (delivery.retryCount >= delivery.maxRetries) continue
    const claimed = await db.emailDelivery.updateMany({
      where: {
        id: delivery.id,
        status: { in: ['pending', 'failed'] },
        retryCount: delivery.retryCount,
      },
      data: { status: 'sending' },
    })
    if (claimed.count !== 1) continue

    let issuedTokenId: string | null = null
    try {
      const firstImage = delivery.job.images[0]
      if (!firstImage) throw new Error('No available image for email delivery')
      const { token, row } = await issueDownloadToken({
        jobId: delivery.jobId,
        generatedImageId: firstImage.id,
        email: delivery.email,
      })
      issuedTokenId = row.id
      const result = await sendCompletionEmailNow({
        jobId: delivery.jobId,
        email: delivery.email,
        token,
        conceptName: delivery.job.conceptName,
      })
      if (!result.sent) throw new Error(result.reason)
      await db.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'sent',
          sentAt: new Date(),
          errorMessage: null,
          providerResponseId: typeof result.providerResponse === 'string' ? result.providerResponse.slice(0, 200) : null,
        },
      })
      sent += 1
    } catch (error) {
      if (issuedTokenId) {
        await db.downloadToken.update({
          where: { id: issuedTokenId },
          data: { status: 'revoked', revokedAt: new Date() },
        }).catch(() => undefined)
      }
      await db.emailDelivery.update({
        where: { id: delivery.id },
        data: {
          status: 'failed',
          retryCount: { increment: 1 },
          nextRetryAt: new Date(Date.now() + profileForgeConfig.email.resendCooldownSeconds * 1000),
          errorMessage: error instanceof Error ? error.message : String(error),
        },
      })
      failed += 1
    }
  }
  return { attempted: deliveries.length, sent, failed }
}

export async function sendCompletionEmailNow(input: {
  jobId: string
  email: string
  token: string
  conceptName: string
}) {
  const downloadLink = buildDownloadLink(input.token)
  if (!isEmailConfigured()) {
    await db.generationJob.update({
      where: { id: input.jobId },
      data: { emailStatus: 'failed', emailError: 'Email provider is not configured' },
    })
    return { sent: false, reason: 'Email provider is not configured' }
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${profileForgeConfig.email.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: profileForgeConfig.email.from,
      to: input.email,
      reply_to: profileForgeConfig.email.replyTo,
      subject: 'ProfileForge 이미지 생성이 완료되었습니다',
      html: completionEmailHtml({ conceptName: input.conceptName, downloadLink }),
    }),
  })

  const body = await response.text()
  if (!response.ok) {
    await db.generationJob.update({
      where: { id: input.jobId },
      data: { emailStatus: 'failed', emailError: body.slice(0, 500) },
    })
    return { sent: false, reason: body }
  }

  await db.generationJob.update({
    where: { id: input.jobId },
    data: { emailStatus: 'sent', emailSentAt: new Date(), emailError: null },
  })
  return { sent: true, providerResponse: body }
}
