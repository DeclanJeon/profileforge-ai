import crypto from 'crypto'
import nodemailer from 'nodemailer'
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

function completionEmailHtml(input: { conceptName: string; downloadLink: string }) {
  const conceptName = escapeHtml(input.conceptName)
  const downloadLink = escapeHtml(input.downloadLink)

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
                  <td style="padding:0;background:#ffffff;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="background:linear-gradient(135deg,#c026d3 0%,#f43f5e 52%,#f97316 100%);padding:34px 40px 54px 40px;text-align:center;border-bottom-left-radius:50% 18px;border-bottom-right-radius:50% 18px;">
                          <div style="display:inline-block;width:42px;height:42px;border-radius:14px;background:rgba(255,255,255,0.94);vertical-align:middle;box-shadow:0 10px 24px rgba(0,0,0,0.16);">
                            <div style="font-weight:900;font-size:25px;line-height:42px;color:#d946ef;letter-spacing:-2px;">PF</div>
                          </div>
                          <div style="display:inline-block;margin-left:12px;vertical-align:middle;color:#ffffff;font-size:20px;font-weight:800;letter-spacing:-0.02em;">ProfileForge AI</div>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:42px 40px 20px;text-align:center;">
                          <div style="display:inline-block;padding:7px 13px;border-radius:999px;background:#fdf2f8;border:1px solid #fbcfe8;color:#be185d;font-size:12px;font-weight:700;letter-spacing:-0.01em;">AI profile generation complete</div>
                          <h1 style="margin:18px 0 10px;color:#0f172a;font-size:36px;line-height:1.18;font-weight:900;letter-spacing:-0.055em;">프로필 생성이<br />완료되었습니다</h1>
                          <p style="margin:0 auto;max-width:430px;color:#64748b;font-size:15px;line-height:1.7;">요청하신 컨셉의 프로필 이미지가 준비되었습니다. 아래 버튼으로 안전하게 다운로드하세요.</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:12px 40px 8px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:24px;background:linear-gradient(135deg,#f8fafc 0%,#fff1f2 52%,#fff7ed 100%);border:1px solid #f1e7f3;box-shadow:0 16px 36px rgba(15,23,42,0.08);">
                            <tr>
                              <td style="padding:28px;text-align:center;">
                                <div style="width:100%;max-width:410px;margin:0 auto;border-radius:22px;background:linear-gradient(135deg,#111827 0%,#334155 48%,#f97316 100%);padding:1px;">
                                  <div style="border-radius:21px;background:#ffffff;padding:26px 22px;">
                                    <div style="width:104px;height:104px;margin:0 auto 18px;border-radius:32px;background:linear-gradient(135deg,#c026d3,#f43f5e,#f97316);box-shadow:0 16px 28px rgba(244,63,94,0.28);">
                                      <div style="font-size:42px;line-height:104px;font-weight:900;color:#ffffff;letter-spacing:-0.08em;">PF</div>
                                    </div>
                                    <div style="color:#0f172a;font-size:21px;font-weight:850;letter-spacing:-0.035em;">프리미엄 프로필 패키지</div>
                                    <div style="margin-top:10px;color:#64748b;font-size:14px;line-height:1.6;">얼굴 정체성을 유지하면서 선택한 스타일로 렌더링된 결과입니다.</div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td align="center" style="padding:18px 40px 4px;">
                          <div style="display:inline-block;padding:10px 18px;border-radius:999px;background:#faf5ff;color:#7e22ce;border:1px solid #e9d5ff;font-size:14px;font-weight:800;">컨셉: ${conceptName}</div>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:24px 40px 10px;">
                          <a href="${downloadLink}" style="display:block;text-align:center;text-decoration:none;background:linear-gradient(135deg,#c026d3 0%,#f43f5e 48%,#f97316 100%);color:#ffffff;border-radius:18px;padding:18px 22px;font-size:18px;font-weight:900;letter-spacing:-0.025em;box-shadow:0 16px 30px rgba(244,63,94,0.28);">프로필 이미지 다운로드하기</a>
                          <p style="margin:14px 0 0;text-align:center;color:#64748b;font-size:13px;line-height:1.6;">다운로드 링크는 생성 후 <strong style="color:#be123c;">24시간</strong> 동안 유효합니다.</p>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:22px 40px 4px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:20px;background:#ffffff;">
                            <tr>
                              <td style="padding:20px 22px;border-bottom:1px solid #eef2f7;">
                                <div style="font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px;">개인정보 보호</div>
                                <div style="font-size:13px;line-height:1.6;color:#64748b;">업로드 원본과 생성 결과는 보관 기간이 지나면 자동 삭제되며, 만료된 이미지는 복구할 수 없습니다.</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 22px;border-bottom:1px solid #eef2f7;">
                                <div style="font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px;">안전한 다운로드</div>
                                <div style="font-size:13px;line-height:1.6;color:#64748b;">이 링크는 수신자 전용이며 사용 가능 횟수와 만료 시간이 제한됩니다.</div>
                              </td>
                            </tr>
                            <tr>
                              <td style="padding:20px 22px;">
                                <div style="font-size:15px;font-weight:850;color:#0f172a;margin-bottom:5px;">다시 생성 가능</div>
                                <div style="font-size:13px;line-height:1.6;color:#64748b;">다른 컨셉이나 구도를 원하면 ProfileForge에서 새 작업을 요청할 수 있습니다.</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:22px 40px 34px;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:18px;background:#f8fafc;border:1px solid #e5e7eb;">
                            <tr>
                              <td style="padding:18px 20px;">
                                <div style="font-size:14px;font-weight:800;color:#0f172a;">버튼이 열리지 않나요?</div>
                                <div style="margin-top:6px;font-size:12px;line-height:1.6;color:#64748b;word-break:break-all;">아래 주소를 브라우저에 복사해 붙여넣으세요.<br /><a href="${downloadLink}" style="color:#c026d3;text-decoration:underline;">${downloadLink}</a></div>
                              </td>
                            </tr>
                          </table>
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

function completionEmailText(input: { conceptName: string; downloadLink: string }) {
  return [
    'ProfileForge 이미지 생성이 완료되었습니다.',
    '',
    `컨셉: ${input.conceptName}`,
    '다운로드 링크는 생성 후 24시간 동안 유효합니다.',
    input.downloadLink,
    '',
    '개인정보 보호를 위해 만료된 이미지는 복구할 수 없습니다.',
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
          images: { where: { status: { in: ['available', 'uploaded_r2'] }, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'asc' }, take: 1 },
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
      const latestExpiry = delivery.job.images.reduce((latest, image) => image.expiresAt > latest ? image.expiresAt : latest, firstImage.expiresAt)
      const { token, row } = await issueDownloadToken({
        jobId: delivery.jobId,
        email: delivery.email,
        expiresAt: latestExpiry,
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
  const html = completionEmailHtml({ conceptName: input.conceptName, downloadLink })
  const text = completionEmailText({ conceptName: input.conceptName, downloadLink })
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
