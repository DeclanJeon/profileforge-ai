import { CONCEPTS } from '../src/lib/profileforge/concepts'
import { buildPrompts } from '../src/lib/profileforge/prompt-builder'
import { generateProfileImage } from '../src/lib/profileforge/image-provider'
import { promises as fs } from 'fs'
import path from 'path'

const sourceImage = process.env.PROFILEFORGE_TEST_IMAGE || '/home/declan/Downloads/profile_4.png'
const manifestPath = process.env.PROFILEFORGE_TEST_MANIFEST || path.join(process.cwd(), 'public', 'uploads', 'concept-sweep-manifest.json')
const startIndex = Number(process.env.PROFILEFORGE_TEST_START || '0')
const limit = Number(process.env.PROFILEFORGE_TEST_LIMIT || String(CONCEPTS.length))
const stopIndex = Math.min(CONCEPTS.length, startIndex + Math.max(0, limit))

const baseOptions = {
  creativity: 30,
  identityLockStrength: 85,
  aspectRatio: '4:5' as const,
  resultCount: 1,
  skinRetouch: 'natural' as const,
  aiLabel: false,
}

function generationOptionsFor(concept: (typeof CONCEPTS)[number]) {
  const identityLockStrength =
    concept.category === 'ID-style'
      ? 90
      : concept.category === 'Professional'
        ? 78
        : concept.category === 'Social'
          ? 68
          : 62

  const creativityBoost =
    concept.category === 'ID-style'
      ? 0
      : concept.category === 'Professional'
        ? 5
        : concept.category === 'Social'
          ? 12
          : 20

  return {
    ...baseOptions,
    creativity: Math.min(95, concept.defaultCreativity + creativityBoost),
    identityLockStrength,
    aspectRatio: concept.defaultAspect,
  }
}

type Result = {
  index: number
  conceptId: string
  conceptName: string
  category: string
  status: 'succeeded' | 'failed'
  imageUrl?: string
  filePath?: string
  provider?: string
  model?: string
  error?: string
  startedAt: string
  completedAt: string
}

async function readExisting(): Promise<Result[]> {
  try {
    const raw = await fs.readFile(manifestPath, 'utf8')
    const parsed = JSON.parse(raw) as { results?: Result[] }
    return parsed.results || []
  } catch {
    return []
  }
}

async function writeManifest(results: Result[]) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true })
  await fs.writeFile(
    manifestPath,
    JSON.stringify(
      {
        sourceImage,
        totalConcepts: CONCEPTS.length,
        attemptedRange: [startIndex, stopIndex],
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2,
    ),
  )
}

async function main() {
  await fs.access(sourceImage)
  const existing = await readExisting()
  const byId = new Map(existing.map((result) => [result.conceptId, result]))

  for (let index = startIndex; index < stopIndex; index += 1) {
    const concept = CONCEPTS[index]
    if (!concept) continue
    if (byId.get(concept.id)?.status === 'succeeded') {
      console.log(`SKIP ${index + 1}/${CONCEPTS.length} ${concept.id}`)
      continue
    }

    const startedAt = new Date().toISOString()
    console.log(`START ${index + 1}/${CONCEPTS.length} ${concept.id} ${concept.name}`)

    try {
      const built = buildPrompts(concept, generationOptionsFor(concept))
      const output = await generateProfileImage({
        jobId: `concept_${String(index + 1).padStart(2, '0')}_${concept.id}`,
        index: 0,
        prompt: built.positive,
        negativePrompt: built.negative,
        referenceImagePath: sourceImage,
        outputSize: built.size,
      })
      byId.set(concept.id, {
        index,
        conceptId: concept.id,
        conceptName: concept.name,
        category: concept.category,
        status: 'succeeded',
        imageUrl: output.fileUrl,
        filePath: output.filePath,
        provider: output.provider,
        model: output.model,
        startedAt,
        completedAt: new Date().toISOString(),
      })
      console.log(`OK ${index + 1}/${CONCEPTS.length} ${concept.id} ${output.fileUrl}`)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      byId.set(concept.id, {
        index,
        conceptId: concept.id,
        conceptName: concept.name,
        category: concept.category,
        status: 'failed',
        error: message,
        startedAt,
        completedAt: new Date().toISOString(),
      })
      console.log(`FAIL ${index + 1}/${CONCEPTS.length} ${concept.id} ${message}`)
    }

    await writeManifest([...byId.values()].sort((a, b) => a.index - b.index))
  }

  await writeManifest([...byId.values()].sort((a, b) => a.index - b.index))
  const results = [...byId.values()]
  const succeeded = results.filter((result) => result.status === 'succeeded').length
  const failed = results.filter((result) => result.status === 'failed').length
  console.log(`DONE attempted=${results.length} succeeded=${succeeded} failed=${failed} manifest=${manifestPath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack : error)
  process.exit(1)
})
