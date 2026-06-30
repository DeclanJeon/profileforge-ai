import { db } from '@/lib/db'
import { promises as fs } from 'fs'
import path from 'path'
import { uploadFileUrlToLocalPath } from './image-provider'
import { deleteStoredImage } from './storage'
import { expireDownloadTokens } from './download-tokens'
import { requeueStaleRunningJobs } from './queue'

export async function cleanupExpiredGeneratedImages(now = new Date()) {
  await expireDownloadTokens(now)
  const expired = await db.generatedImage.findMany({
    where: {
      expiresAt: { lte: now },
      status: { in: ['available', 'uploaded_r2', 'expired'] },
      deletedAt: null,
    },
  })
  let deleted = 0
  let failed = 0
  for (const image of expired) {
    try {
      const claimed = await db.generatedImage.updateMany({
        where: {
          id: image.id,
          status: image.status,
          expiresAt: { lte: now },
          deletedAt: null,
        },
        data: { status: 'expired' },
      })
      if (claimed.count !== 1) continue
      const storageDeleted = await deleteStoredImage({ bucket: image.r2Bucket, key: image.r2Key, imageUrl: image.imageUrl })
      if (!storageDeleted) throw new Error('No supported storage object was deleted')
      const marked = await db.generatedImage.updateMany({
        where: { id: image.id, status: 'expired', deletedAt: null },
        data: { status: 'deleted', deletedAt: new Date() },
      })
      if (marked.count === 1) deleted += 1
    } catch (error) {
      failed += 1
      console.warn(`[profileforge-cleanup] generated image cleanup failed ${image.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return { scanned: expired.length, deleted, failed }
}

export async function cleanupExpiredUploads(now = new Date()) {
  const expired = await db.upload.findMany({
    where: {
      expiresAt: { lte: now },
      deletedAt: null,
      jobs: {
        none: {
          status: { in: ['pending', 'queued', 'running', 'recovering'] },
        },
      },
    },
  })

  let deleted = 0
  let failed = 0
  for (const upload of expired) {
    try {
      const filePath = uploadFileUrlToLocalPath(upload.fileUrl)
      if (!filePath) {
        throw new Error('Unsupported upload storage path')
      }

      const uploadsRoot = path.join(process.cwd(), 'public', 'uploads')
      const resolved = path.resolve(filePath)
      if (!resolved.startsWith(path.resolve(uploadsRoot) + path.sep)) {
        throw new Error('Upload path escapes uploads directory')
      }

      await fs.rm(resolved, { force: true })
      const claimed = await db.upload.updateMany({
        where: {
          id: upload.id,
          expiresAt: { lte: now },
          deletedAt: null,
          jobs: {
            none: {
              status: { in: ['pending', 'queued', 'running', 'recovering'] },
            },
          },
        },
        data: { deletedAt: new Date() },
      })
      if (claimed.count !== 1) continue

      deleted += 1
    } catch (error) {
      failed += 1
      console.warn(`[profileforge-cleanup] upload cleanup failed ${upload.id}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  return { scanned: expired.length, deleted, failed }
}

export async function runProfileForgeMaintenance() {
  const staleJobs = await requeueStaleRunningJobs()
  const generatedImages = await cleanupExpiredGeneratedImages()
  const uploads = await cleanupExpiredUploads()
  return { staleJobs, generatedImages, uploads }
}
