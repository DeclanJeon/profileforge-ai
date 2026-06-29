#!/usr/bin/env node
import { promises as fs } from 'fs'
import path from 'path'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const generatedDir = process.env.PROFILEFORGE_GENERATED_IMAGE_DIR || '/tmp/profileforge-generated'
const generatedTtlMs = Number(process.env.PROFILEFORGE_GENERATED_IMAGE_TTL_SECONDS || 600) * 1000
const uploadTtlMs = Number(process.env.PROFILEFORGE_UPLOAD_TTL_SECONDS || 1800) * 1000
const now = Date.now()

function generatedUrlToPath(imageUrl) {
  const prefix = '/api/profileforge/image/'
  if (!imageUrl?.startsWith(prefix)) return null
  const fileName = path.basename(imageUrl.slice(prefix.length))
  if (!fileName || fileName === '.' || fileName === '..') return null
  return path.join(generatedDir, fileName)
}

function uploadUrlToPath(fileUrl) {
  if (!fileUrl?.startsWith('/uploads/')) return null
  const fileName = path.basename(fileUrl)
  if (!fileName || fileName === '.' || fileName === '..') return null
  return path.join(process.cwd(), 'public', 'uploads', fileName)
}

async function unlinkQuiet(filePath) {
  if (!filePath) return false
  try {
    await fs.unlink(filePath)
    return true
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`[cleanup] unlink failed ${filePath}: ${error.message}`)
    return false
  }
}

async function cleanupGeneratedRecords() {
  const expired = await prisma.generatedImage.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true, imageUrl: true },
  })

  let files = 0
  for (const image of expired) {
    if (await unlinkQuiet(generatedUrlToPath(image.imageUrl))) files += 1
  }

  if (expired.length > 0) {
    await prisma.generatedImage.deleteMany({ where: { id: { in: expired.map((image) => image.id) } } })
  }

  return { records: expired.length, files }
}

async function cleanupGeneratedDirectory() {
  await fs.mkdir(generatedDir, { recursive: true })
  const entries = await fs.readdir(generatedDir, { withFileTypes: true })
  let files = 0
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.join(generatedDir, entry.name)
    const stat = await fs.stat(filePath).catch(() => null)
    if (stat && now - stat.mtimeMs > generatedTtlMs) {
      if (await unlinkQuiet(filePath)) files += 1
    }
  }
  return { files }
}

async function cleanupUploads() {
  const expired = await prisma.upload.findMany({
    where: { expiresAt: { lt: new Date() } },
    select: { id: true, fileUrl: true },
  })

  let files = 0
  for (const upload of expired) {
    if (await unlinkQuiet(uploadUrlToPath(upload.fileUrl))) files += 1
  }

  if (expired.length > 0) {
    await prisma.upload.deleteMany({ where: { id: { in: expired.map((upload) => upload.id) } } })
  }

  return { records: expired.length, files }
}

async function cleanupUploadDirectoryByMtime() {
  const uploadDir = path.join(process.cwd(), 'public', 'uploads')
  const entries = await fs.readdir(uploadDir, { withFileTypes: true }).catch(() => [])
  let files = 0
  for (const entry of entries) {
    if (!entry.isFile()) continue
    const filePath = path.join(uploadDir, entry.name)
    const stat = await fs.stat(filePath).catch(() => null)
    if (stat && now - stat.mtimeMs > uploadTtlMs) {
      if (await unlinkQuiet(filePath)) files += 1
    }
  }
  return { files }
}

try {
  const generatedRecords = await cleanupGeneratedRecords()
  const generatedDirectory = await cleanupGeneratedDirectory()
  const uploads = await cleanupUploads()
  const uploadDirectory = await cleanupUploadDirectoryByMtime()
  console.log(JSON.stringify({
    ok: true,
    generatedRecords,
    generatedDirectory,
    uploads,
    uploadDirectory,
    generatedDir,
    generatedTtlSeconds: generatedTtlMs / 1000,
    uploadTtlSeconds: uploadTtlMs / 1000,
  }))
} finally {
  await prisma.$disconnect()
}
