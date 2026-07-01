import crypto from 'crypto'
import { promises as fs } from 'fs'
import path from 'path'
import nodemailer from 'nodemailer'
import { db } from '@/lib/db'
import { isEmailConfigured, profileForgeConfig } from './config'
import { createDownloadUrl } from './storage'
import { generatedImageDir, generatedImageUrlToLocalPath } from './image-provider'

export function maskEmail(email: string) {
  const [local, domain] = email.split('@')
  if (!local || !domain) return 'hidden email'
  return `${local[0] ?? '*'}***@${domain}`
}

export function hashEmail(email: string) {
  return crypto.createHash('sha256').update(email.trim().toLowerCase()).digest('hex')
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}


export async function enqueueCompletionEmail(input: {
  jobId: string
  email: string
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

export async function enqueueResendEmail(input: {
  jobId: string
  email: string
  conceptName: string
}) {
  const recipientHash = hashEmail(input.email)
  const bucket = Math.floor(Date.now() / (profileForgeConfig.email.resendCooldownSeconds * 1000))
  const idempotencyKey = `${input.jobId}:resend_download_link:${recipientHash}:${bucket}`
  const existing = await db.emailDelivery.findUnique({ where: { idempotencyKey } })
  if (existing) {
    return {
      status: existing.status === 'sent' ? 'cooldown' as const : 'already_pending' as const,
      retryAfterSeconds: profileForgeConfig.email.resendCooldownSeconds,
    }
  }

  await db.emailDelivery.create({
    data: {
      jobId: input.jobId,
      email: input.email,
      recipientHash,
      type: 'resend_download_link',
      status: 'pending',
      provider: profileForgeConfig.email.provider,
      idempotencyKey,
      nextRetryAt: new Date(),
    },
  })

  await db.generationJob.update({
    where: { id: input.jobId },
    data: { emailStatus: 'pending', emailError: null },
  })
  return { status: 'queued' as const, retryAfterSeconds: 0 }
}

type EmailAttachment = {
  filename: string
  content: Buffer
  contentType: string
}

function imageExtension(mimeType: string) {
  if (mimeType.includes('jpeg')) return 'jpg'
  if (mimeType.includes('webp')) return 'webp'
  return 'png'
}

async function loadImageAttachment(image: {
  id: string
  imageUrl?: string | null
  r2Bucket?: string | null
  r2Key?: string | null
  mimeType?: string | null
}, index: number): Promise<EmailAttachment> {
  const contentType = image.mimeType || 'image/png'
  const filename = `profileforge-${index + 1}.${imageExtension(contentType)}`

  let localPath: string | null = null
  if (image.r2Bucket === 'local' && image.r2Key) {
    const fileName = path.basename(image.r2Key)
    if (fileName && fileName !== '.' && fileName !== '..') {
      localPath = path.join(generatedImageDir(), fileName)
    }
  }
  if (!localPath && image.imageUrl) {
    localPath = generatedImageUrlToLocalPath(image.imageUrl)
  }

  if (localPath) {
    return { filename, content: await fs.readFile(localPath), contentType }
  }

  const downloadUrl = await createDownloadUrl({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl })
  if (downloadUrl.startsWith('/')) {
    const filePath = generatedImageUrlToLocalPath(downloadUrl)
    if (!filePath) throw new Error('Unsupported local image path for email attachment')
    return { filename, content: await fs.readFile(filePath), contentType }
  }

  const response = await fetch(downloadUrl)
  if (!response.ok) throw new Error(`Failed to fetch image attachment: ${response.status}`)
  return {
    filename,
    content: Buffer.from(await response.arrayBuffer()),
    contentType: response.headers.get('content-type') || contentType,
  }
}

async function loadImageAttachments(images: Array<{
  id: string
  imageUrl?: string | null
  r2Bucket?: string | null
  r2Key?: string | null
  mimeType?: string | null
}>) {
  return Promise.all(images.map((image, index) => loadImageAttachment(image, index)))
}

function completionEmailHtml(input: { conceptName: string; attachmentCount: number }) {
  const conceptName = escapeHtml(input.conceptName)
  const attachmentLabel = input.attachmentCount > 1 ? `${input.attachmentCount}장` : '1장'

  return `
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
        <title>ProfileForge 이미지 생성 완료</title>
      </head>
      <body style="margin:0;padding:0;background:#fff7fb;color:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Apple SD Gothic Neo','Noto Sans KR',Arial,sans-serif;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(180deg,#fff7fb 0%,#fff 52%,#f8fafc 100%);margin:0;padding:36px 16px;">
          <tr>
            <td align="center">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background:#ffffff;border-radius:28px;overflow:hidden;box-shadow:0 24px 70px rgba(15,23,42,0.14);border:1px solid #f1e7f3;">
                <tr>
                  <td style="background:linear-gradient(135deg,#c026d3 0%,#f43f5e 52%,#f97316 100%);padding:34px 40px 44px;text-align:center;">
                    <div style="display:inline-block;width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,0.94);vertical-align:middle;box-shadow:0 10px 24px rgba(0,0,0,0.16);">
                      <div style="font-weight:900;font-size:25px;line-height:42px;color:#d946ef;letter-spacing:-2px;">PF</div>
                    </div>
                    <div style="display:inline-block;margin-left:12px;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">ProfileForge AI</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:42px 40px 20px;text-align:center;">
                    <div style="display:inline-block;padding:7px 13px;border-radius:999px;background:#fdf2f8;border:1px solid #fbcfe8;color:#be185d;font-size:12px;font-weight:700;letter-spacing:-0.01em;">AI profile generation complete</div>
                    <h1 style="margin:18px 0 10px;color:#0f172a;font-size:36px;line-height:1.18;font-weight:900;letter-spacing:-0.055em;">프로필 생성이<br />완료되었습니다</h1>
                    <p style="margin:0 auto;max-width:430px;color:#64748b;font-size:15px;line-height:1.7;">요청하신 컨셉의 프로필 이미지 ${attachmentLabel}을 이 이메일에 바로 첨부했습니다. 별도 다운로드 링크나 외부 저장소를 거치지 않습니다.</p>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding:18px 40px 4px;">
                    <div style="display:inline-block;padding:10px 18px;border-radius:999px;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;font-size:14px;font-weight:800;">컨셉: ${conceptName}</div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:24px 40px 10px;">
                    <div style="display:block;text-align:center;background:linear-gradient(135deg,#c026d3 0%,#f43f5e 48%,#f97316 100%);color:#ffffff;border-radius:18px;padding:18px 22px;font-size:18px;font-weight:900;letter-spacing:-0.025em;box-shadow:0 16px 30px rgba(244,63,94,0.28);">첨부파일에서 프로필 이미지를 확인하세요</div>
                    <p style="margin:14px 0 0;text-align:center;color:#64748b;font-size:13px;line-height:1.6;">메일 앱에서 첨부파일 다운로드가 차단되어 있으면 첨부파일 표시를 허용해주세요.</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding:22px 40px 34px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;">
                      <tr>
                        <td style="padding:20px 22px;border-bottom:1px solid #eef2f7;">
                          <div style="font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px;">개인정보 보호</div>
                          <div style="font-size:13px;line-height:1.6;color:#64748b;">생성 결과는 이메일 첨부 전송에 사용되며, 운영 서버/R2 다운로드 링크 제공을 전제로 보관하지 않습니다.</div>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:20px 22px;">
                          <div style="font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px;">AI 결과 안내</div>
                          <div style="font-size:13px;line-height:1.6;color:#64748b;">AI 생성 결과는 원본과 다르게 보일 수 있으니 중요 용도에는 직접 확인 후 사용하세요.</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <div style="max-width:640px;margin:18px auto 0;text-align:center;color:#94a3b8;font-size:12px;line-height:1.7;">
                ProfileForge AI에서 발송한 생성 완료 알림입니다.<br />
                이 메일은 발신 전용입니다.
              </div>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `
}

function completionEmailText(input: { conceptName: string; attachmentCount: number }) {
  return [
    'ProfileForge 이미지 생성이 완료되었습니다.',
    '',
    `컨셉: ${input.conceptName}`,
    `생성된 프로필 이미지 ${input.attachmentCount}장을 이 이메일에 첨부했습니다.`,
    '별도 다운로드 링크나 외부 저장소를 거치지 않습니다.',
    '',
    '메일 앱에서 첨부파일 다운로드가 차단되어 있으면 첨부파일 표시를 허용해주세요.',
  ].join('\n')
}

export async function sendPendingEmails(limit = 10) {
  await db.emailDelivery.updateMany({
    where: {
      status: 'sending',
      updatedAt: { lt: new Date(Date.now() - profileForgeConfig.email.resendCooldownSeconds * 1000) },
      retryCount: { lt: 99 },
    },
    data: {
      status: 'failed',
      errorMessage: 'Email delivery worker lost its lease before completion',
      nextRetryAt: new Date(),
    },
  })
  const deliveries = await db.emailDelivery.findMany({
    where: {
      status: { in: ['pending', 'failed'] },
      retryCount: { lt: 99 },
      OR: [{ nextRetryAt: null }, { nextRetryAt: { lte: new Date() } }],
    },
    include: {
      job: {
        include: {
          images: { where: { status: { in: ['available', 'uploaded_r2'] }, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' } },
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

    try {
      if (delivery.job.images.length === 0) throw new Error('No available image for email delivery')
      const attachments = await loadImageAttachments(delivery.job.images)
      const result = await sendCompletionEmailNow({
        jobId: delivery.jobId,
        email: delivery.email,
        conceptName: delivery.job.conceptName,
        attachments,
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
  conceptName: string
  attachments: EmailAttachment[]
}) {
  if (input.attachments.length === 0) {
    return { sent: false, reason: 'No generated image attachments are available' }
  }
  const html = completionEmailHtml({ conceptName: input.conceptName, attachmentCount: input.attachments.length })
  const text = completionEmailText({ conceptName: input.conceptName, attachmentCount: input.attachments.length })
  if (!isEmailConfigured()) {
    await db.generationJob.update({
      where: { id: input.jobId },
      data: { emailStatus: 'failed', emailError: 'Email provider is not configured' },
    })
    return { sent: false, reason: 'Email provider is not configured' }
  }

  if (profileForgeConfig.email.provider === 'smtp') {
    const transporter = nodemailer.createTransport({
      host: profileForgeConfig.email.smtpHost,
      port: profileForgeConfig.email.smtpPort,
      secure: profileForgeConfig.email.smtpSecure,
      auth: {
        user: profileForgeConfig.email.smtpUser,
        pass: profileForgeConfig.email.smtpPass,
      },
    })
    const result = await transporter.sendMail({
      from: profileForgeConfig.email.from,
      to: input.email,
      replyTo: profileForgeConfig.email.replyTo,
      subject: 'ProfileForge 이미지 생성이 완료되었습니다',
      html,
      text,
      attachments: input.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    })
    await db.generationJob.update({
      where: { id: input.jobId },
      data: { emailStatus: 'sent', emailSentAt: new Date(), emailError: null },
    })
    return { sent: true, providerResponse: result.messageId || JSON.stringify(result).slice(0, 200) }
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
      html,
      text,
      attachments: input.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content.toString('base64'),
      })),
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
