import crypto from 'crypto'
import { db } from '@/lib/db'
import { profileForgeConfig } from './config'

export function createRawDownloadToken() {
  return crypto.randomBytes(32).toString('base64url')
}

export function hashDownloadToken(token: string) {
  if (!profileForgeConfig.security.tokenPepper) {
    throw new Error('PROFILEFORGE_TOKEN_PEPPER or NEXTAUTH_SECRET is required for download tokens')
  }
  return crypto
    .createHmac('sha256', profileForgeConfig.security.tokenPepper)
    .update(token)
    .digest('hex')
}

export function downloadTokenExpiresAt(now = new Date()) {
  return new Date(now.getTime() + profileForgeConfig.retention.downloadTokenTtlHours * 60 * 60 * 1000)
}

export async function issueDownloadToken(input: {
  jobId: string
  generatedImageId?: string
  email: string
  expiresAt?: Date
}) {
  const token = createRawDownloadToken()
  const tokenHash = hashDownloadToken(token)
  const expiresAt = input.expiresAt ?? downloadTokenExpiresAt()
  const row = await db.downloadToken.create({
    data: {
      tokenHash,
      jobId: input.jobId,
      generatedImageId: input.generatedImageId,
      email: input.email,
      expiresAt,
      maxDownloads: profileForgeConfig.retention.maxDownloadsPerToken,
    },
  })
  return { token, row }
}

export async function claimDownloadToken(token: string) {
  const tokenHash = hashDownloadToken(token)
  const now = new Date()
  const existing = await db.downloadToken.findUnique({
    where: { tokenHash },
    include: { job: true, generatedImage: true },
  })
  if (!existing || existing.status !== 'active' || existing.revokedAt || existing.expiresAt <= now) return null
  if (existing.downloadCount >= existing.maxDownloads) {
    await db.downloadToken.update({ where: { id: existing.id }, data: { status: 'used' } }).catch(() => undefined)
    return null
  }

  const nextDownloadCount = existing.downloadCount + 1
  const updated = await db.downloadToken.updateMany({
    where: {
      id: existing.id,
      status: 'active',
      revokedAt: null,
      expiresAt: { gt: now },
      downloadCount: { lt: existing.maxDownloads },
    },
    data: {
      downloadCount: { increment: 1 },
      usedAt: now,
      status: nextDownloadCount >= existing.maxDownloads ? 'used' : 'active',
    },
  })

  if (updated.count !== 1) return null

  return db.downloadToken.findUnique({
    where: { tokenHash },
    include: {
      job: true,
      generatedImage: true,
    },
  })
}

export async function peekDownloadToken(token: string) {
  const tokenHash = hashDownloadToken(token)
  return db.downloadToken.findUnique({
    where: { tokenHash },
    include: {
      job: {
        include: {
          images: { where: { status: { in: ['available', 'uploaded_r2'] } }, orderBy: { createdAt: 'asc' } },
        },
      },
      generatedImage: true,
    },
  })
}

export async function expireDownloadTokens(now = new Date()) {
  return db.downloadToken.updateMany({
    where: { status: 'active', expiresAt: { lte: now } },
    data: { status: 'expired' },
  })
}
