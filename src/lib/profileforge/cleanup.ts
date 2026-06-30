import { db } from '@/lib/db'
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

export async function runProfileForgeMaintenance() {
  const staleJobs = await requeueStaleRunningJobs()
  const generatedImages = await cleanupExpiredGeneratedImages()
  return { staleJobs, generatedImages }
}
