import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { CONCEPTS } from '../src/lib/profileforge/concepts'

const HOST = process.env.PROFILEFORGE_CODEX_IMAGEN_HOST || 'ponslink'
const BIN = process.env.PROFILEFORGE_CODEX_IMAGEN_BIN || '$HOME/bin/codex-imagen'
const MODEL = 'gpt-5.5'
const TIMEOUT_SECONDS = Number(process.env.PROFILEFORGE_CODEX_IMAGEN_TIMEOUT_SECONDS || 900)
const START = Number(process.env.PROFILEFORGE_THUMBNAIL_START || 0)
const LIMIT = Number(process.env.PROFILEFORGE_THUMBNAIL_LIMIT || CONCEPTS.length)
const FORCE = process.env.PROFILEFORGE_THUMBNAIL_FORCE === '1'
const OUT_DIR = path.join(process.cwd(), 'public', 'concept-thumbnails')
const MANIFEST_PATH = path.join(OUT_DIR, 'manifest-gpt-5.5.json')

type ManifestEntry = {
  conceptId: string
  name: string
  category: string
  outputPath?: string
  fileUrl?: string
  status: 'ok' | 'failed' | 'skipped'
  model: string
  error?: string
  startedAt: string
  completedAt: string
}

type Manifest = {
  model: string
  generatedAt: string
  entries: ManifestEntry[]
}

function shellQuote(value: string) {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function run(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref()
    }, timeoutMs)
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk) => { stdout += chunk })
    child.stderr.on('data', (chunk) => { stderr += chunk })
    child.on('error', (error) => {
      clearTimeout(timer)
      reject(error)
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      if (timedOut) {
        reject(new Error(`${command} timed out after ${timeoutMs}ms`))
        return
      }
      if (code !== 0) {
        reject(new Error(`${command} exited with ${code}: ${stderr.trim() || stdout.trim()}`))
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function isLocalHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

async function runShell(host: string, script: string, timeoutMs: number) {
  if (isLocalHost(host)) return run('bash', ['-lc', script], timeoutMs)
  return run('ssh', [host, `bash -lc ${shellQuote(script)}`], timeoutMs)
}

async function copyRemoteToLocal(host: string, remotePath: string, localPath: string, timeoutMs: number) {
  await fs.mkdir(path.dirname(localPath), { recursive: true })
  if (isLocalHost(host)) {
    await fs.copyFile(remotePath, localPath)
    return
  }
  await run('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', `${host}:${remotePath}`, localPath], timeoutMs)
}

async function readManifest(): Promise<Manifest> {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf8')) as Manifest
  } catch {
    return { model: MODEL, generatedAt: new Date().toISOString(), entries: [] }
  }
}

async function writeManifest(manifest: Manifest) {
  manifest.generatedAt = new Date().toISOString()
  await fs.mkdir(path.dirname(MANIFEST_PATH), { recursive: true })
  await fs.writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
}

function thumbnailPrompt(concept: (typeof CONCEPTS)[number]) {
  return [
    concept.thumbnailPrompt,
    '',
    `Concept category: ${concept.category}. Concept name: ${concept.name}.`,
    `Wardrobe: ${concept.outfit}. Background: ${concept.background}. Lighting: ${concept.lighting}. Expression: ${concept.expression}.`,
    'Create a generic example thumbnail for a profile-generation concept gallery, not a real user result.',
    'Use a fictional adult model with no resemblance to any uploaded user, no celebrity likeness, no text, no watermark, no logo.',
    'Portrait-oriented 4:5 composition, clear face, visually communicates the concept at a glance, polished commercial quality.',
  ].join('\n')
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true })
  const manifest = await readManifest()
  const selected = CONCEPTS.slice(START, START + LIMIT)
  let succeeded = 0
  let failed = 0
  let skipped = 0

  for (let offset = 0; offset < selected.length; offset += 1) {
    const concept = selected[offset]
    const index = START + offset + 1
    const outputPath = path.join(OUT_DIR, `${concept.id}.png`)
    const startedAt = new Date().toISOString()

    if (!FORCE) {
      try {
        await fs.access(outputPath)
        console.log(`SKIP ${index}/${CONCEPTS.length} ${concept.id}`)
        skipped += 1
        manifest.entries = manifest.entries.filter((entry) => entry.conceptId !== concept.id)
        manifest.entries.push({
          conceptId: concept.id,
          name: concept.name,
          category: concept.category,
          outputPath,
          fileUrl: `/concept-thumbnails/${concept.id}.png`,
          status: 'skipped',
          model: MODEL,
          startedAt,
          completedAt: new Date().toISOString(),
        })
        await writeManifest(manifest)
        continue
      } catch {}
    }

    console.log(`START ${index}/${CONCEPTS.length} ${concept.id} ${concept.name}`)
    const remoteDir = `/tmp/profileforge-thumbnail-${Date.now()}-${concept.id}`
    const remotePrompt = `${remoteDir}/prompt.txt`
    const remoteOutput = `${remoteDir}/${concept.id}.png`
    const timeoutMs = Math.max(30, TIMEOUT_SECONDS) * 1000
    try {
      const prompt = thumbnailPrompt(concept)
      const remoteScript = [
        `mkdir -p ${shellQuote(remoteDir)}`,
        `cat > ${shellQuote(remotePrompt)} <<'PROMPT_EOF'\n${prompt}\nPROMPT_EOF`,
        `${BIN} --prompt-file ${shellQuote(remotePrompt)} --output ${shellQuote(remoteOutput)} --model ${shellQuote(MODEL)} --timeout ${TIMEOUT_SECONDS} --json --quiet`,
      ].join('\n')
      await runShell(HOST, remoteScript, timeoutMs + 15_000)
      await copyRemoteToLocal(HOST, remoteOutput, outputPath, timeoutMs)
      succeeded += 1
      manifest.entries = manifest.entries.filter((entry) => entry.conceptId !== concept.id)
      manifest.entries.push({
        conceptId: concept.id,
        name: concept.name,
        category: concept.category,
        outputPath,
        fileUrl: `/concept-thumbnails/${concept.id}.png`,
        status: 'ok',
        model: MODEL,
        startedAt,
        completedAt: new Date().toISOString(),
      })
      await writeManifest(manifest)
      console.log(`OK ${index}/${CONCEPTS.length} ${concept.id} /concept-thumbnails/${concept.id}.png`)
    } catch (error) {
      failed += 1
      const message = error instanceof Error ? error.message : String(error)
      manifest.entries = manifest.entries.filter((entry) => entry.conceptId !== concept.id)
      manifest.entries.push({
        conceptId: concept.id,
        name: concept.name,
        category: concept.category,
        status: 'failed',
        model: MODEL,
        error: message,
        startedAt,
        completedAt: new Date().toISOString(),
      })
      await writeManifest(manifest)
      console.log(`FAIL ${index}/${CONCEPTS.length} ${concept.id} ${message}`)
    } finally {
      await runShell(HOST, `rm -rf ${shellQuote(remoteDir)}`, 15_000).catch(() => undefined)
    }
  }

  console.log(`DONE attempted=${selected.length} succeeded=${succeeded} skipped=${skipped} failed=${failed} manifest=${MANIFEST_PATH}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack || error.message : String(error))
  process.exit(1)
})
