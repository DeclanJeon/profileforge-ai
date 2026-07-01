import { promises as fs } from 'fs'
import path from 'path'
import { isR2Configured, profileForgeConfig } from './config'
import { generatedImageDir } from './image-provider'

export interface StoredGeneratedImage {
  storage: 'r2' | 'local'
  bucket?: string
  key?: string
  imageUrl?: string
  fileSize: number
  mimeType: string
}

let s3Client: { send(command: unknown): Promise<any> } | null = null

async function getR2Client() {
  if (!isR2Configured()) return null
  if (!s3Client) {
    const { S3Client } = await import('@aws-sdk/client-s3')
    s3Client = new S3Client({
      region: 'auto',
      endpoint: profileForgeConfig.r2.endpoint,
      credentials: {
        accessKeyId: profileForgeConfig.r2.accessKeyId,
        secretAccessKey: profileForgeConfig.r2.secretAccessKey,
      },
    })
  }
  return s3Client
}

export function generatedObjectKey(input: { jobId: string; imageId: string; extension?: string; now?: Date }) {
  const now = input.now ?? new Date()
  const yyyy = String(now.getUTCFullYear())
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(now.getUTCDate()).padStart(2, '0')
  const extension = input.extension?.replace(/^\./, '') || 'png'
  return `generated/${yyyy}/${mm}/${dd}/${input.jobId}/${input.imageId}.${extension}`
}

export async function storeGeneratedImage(input: {
  localPath: string
  jobId: string
  imageId: string
  mimeType?: string
  expiresAt: Date
}): Promise<StoredGeneratedImage> {
  const mimeType = input.mimeType || 'image/png'
  const stat = await fs.stat(input.localPath)
  const client = await getR2Client()

  if (!client) {
    await fs.mkdir(generatedImageDir(), { recursive: true })
    const extension = path.extname(input.localPath) || '.png'
    const fileName = `${input.jobId}_${input.imageId}${extension}`
    const targetPath = path.join(generatedImageDir(), fileName)
    if (path.resolve(input.localPath) !== path.resolve(targetPath)) {
      await fs.copyFile(input.localPath, targetPath)
    }
    return {
      storage: 'local',
      bucket: 'local',
      key: fileName,
      fileSize: stat.size,
      mimeType,
    }
  }

  const key = generatedObjectKey({
    jobId: input.jobId,
    imageId: input.imageId,
    extension: path.extname(input.localPath) || '.png',
  })
  const { HeadObjectCommand, PutObjectCommand } = await import('@aws-sdk/client-s3')
  const body = await fs.readFile(input.localPath)
  await client.send(new PutObjectCommand({
    Bucket: profileForgeConfig.r2.bucket,
    Key: key,
    Body: body,
    ContentType: mimeType,
    Metadata: {
      'profileforge-job-id': input.jobId,
      'profileforge-image-id': input.imageId,
      'profileforge-expires-at': input.expiresAt.toISOString(),
    },
  }))
  const head = await client.send(new HeadObjectCommand({
    Bucket: profileForgeConfig.r2.bucket,
    Key: key,
  }))
  if (typeof head.ContentLength === 'number' && head.ContentLength !== body.byteLength) {
    throw new Error('R2 upload verification failed: content length mismatch')
  }
  if (head.ContentType && head.ContentType !== mimeType) {
    throw new Error('R2 upload verification failed: content type mismatch')
  }
  if (head.Metadata?.['profileforge-job-id'] !== input.jobId || head.Metadata?.['profileforge-image-id'] !== input.imageId) {
    throw new Error('R2 upload verification failed: metadata mismatch')
  }
  await fs.rm(input.localPath, { force: true })
  return {
    storage: 'r2',
    bucket: profileForgeConfig.r2.bucket,
    key,
    fileSize: body.byteLength,
    mimeType,
  }
}

export async function deleteStoredImage(input: { bucket?: string | null; key?: string | null; imageUrl?: string | null }) {
  const client = await getR2Client()
  if (input.bucket && input.bucket !== 'local' && input.key && client) {
    const { DeleteObjectCommand } = await import('@aws-sdk/client-s3')
    await client.send(new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }))
    return true
  }
  if (input.bucket === 'local' && input.key) {
    const fileName = path.basename(input.key)
    if (!fileName || fileName === '.' || fileName === '..') return false
    await fs.rm(path.join(generatedImageDir(), fileName), { force: true })
    return true
  }
  if (input.imageUrl?.startsWith('/api/profileforge/image/')) {
    const fileName = path.basename(input.imageUrl.slice('/api/profileforge/image/'.length))
    if (!fileName || fileName === '.' || fileName === '..') return false
    await fs.rm(path.join(generatedImageDir(), fileName), { force: true })
    return true
  }
  return false
}

export async function createDownloadUrl(input: { bucket?: string | null; key?: string | null; imageUrl?: string | null }) {
  const client = await getR2Client()
  if (input.bucket && input.bucket !== 'local' && input.key && client) {
    const { HeadObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    await client.send(new HeadObjectCommand({ Bucket: input.bucket, Key: input.key }))
    return getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        ResponseCacheControl: 'private, no-store, max-age=0',
        ResponseContentDisposition: 'attachment',
      }),
      { expiresIn: profileForgeConfig.r2.signedUrlTtlSeconds },
    )
  }
  if (input.bucket === 'local' && input.key) return `/api/profileforge/image/${encodeURIComponent(path.basename(input.key))}`
  if (input.imageUrl?.startsWith('/api/profileforge/image/')) return input.imageUrl
  throw new Error('No downloadable image storage location')
}
