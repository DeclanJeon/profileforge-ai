import crypto from 'crypto'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { profileForgeConfig } from './config'

const DEFAULT_IMAGE_PROVIDER_HOST = profileForgeConfig.imageProvider.host
const DEFAULT_IMAGE_PROVIDER_BIN = profileForgeConfig.imageProvider.bin
const DEFAULT_IMAGE_PROVIDER_MODEL = profileForgeConfig.imageProvider.model
const DEFAULT_TIMEOUT_SECONDS = profileForgeConfig.imageProvider.timeoutSeconds

export interface ImageGenerationInput {
  jobId: string
  index: number
  prompt: string
  negativePrompt: string
  /** @deprecated prefer referenceImagePaths */
  referenceImagePath?: string
  referenceImagePaths?: string[]
  outputSize: string
}

export interface ImageGenerationOutput {
  fileUrl: string
  filePath: string
  provider: string
  model: string
  remoteSha256?: string
  revisedPrompt?: string | null
}

interface CodexImagenJsonImage {
  path?: string
  decodedPath?: string
  sha256?: string
  revised_prompt?: string | null
}

interface CodexImagenJsonResult {
  model?: string
  images?: CodexImagenJsonImage[]
}

interface CommandResult {
  stdout: string
  stderr: string
}

function publicUploadDir() {
  return path.join(process.cwd(), 'public', 'uploads')
}

export function generatedImageDir() {
  return profileForgeConfig.retention.generatedImageDir
}

export function generatedImageUrlToLocalPath(fileUrl: string): string | null {
  const prefix = '/api/profileforge/image/'
  if (!fileUrl.startsWith(prefix)) return null

  const fileName = path.basename(fileUrl.slice(prefix.length))
  if (!fileName || fileName === '.' || fileName === '..') return null

  return path.join(generatedImageDir(), fileName)
}


export function uploadFileUrlToLocalPath(fileUrl: string): string | null {
  if (!fileUrl.startsWith('/uploads/')) return null

  const fileName = path.basename(fileUrl)
  if (!fileName || fileName === '.' || fileName === '..') return null

  return path.join(publicUploadDir(), fileName)
}

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'"'"'`)}'`
}

function runCommand(
  command: string,
  args: string[],
  timeoutMs: number,
): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: process.env,
    })

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
    child.stdout.on('data', (chunk) => {
      stdout += chunk
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk
    })
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
        reject(
          new Error(
            `${command} exited with ${code}: ${stderr.trim() || stdout.trim()}`,
          ),
        )
        return
      }
      resolve({ stdout, stderr })
    })
  })
}

function parseCodexImagenJson(stdout: string): CodexImagenJsonResult {
  const trimmed = stdout.trim()
  if (!trimmed) throw new Error('codex-imagen returned an empty response')

  try {
    return JSON.parse(trimmed) as CodexImagenJsonResult
  } catch (error) {
    throw new Error(
      `codex-imagen returned invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

function isLocalCodexImagenHost(host: string) {
  return host === 'localhost' || host === '127.0.0.1' || host === '::1'
}

async function copyLocalToRemote(
  host: string,
  localPath: string,
  remotePath: string,
  timeoutMs: number,
) {
  if (isLocalCodexImagenHost(host)) {
    await fs.mkdir(path.dirname(remotePath), { recursive: true })
    await fs.copyFile(localPath, remotePath)
    return
  }

  await runCommand('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', localPath, `${host}:${remotePath}`], timeoutMs)
}

async function copyRemoteToLocal(
  host: string,
  remotePath: string,
  localPath: string,
  timeoutMs: number,
) {
  if (isLocalCodexImagenHost(host)) {
    await fs.mkdir(path.dirname(localPath), { recursive: true })
    await fs.copyFile(remotePath, localPath)
    return
  }

  await runCommand('scp', ['-q', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=30', `${host}:${remotePath}`, localPath], timeoutMs)
}

async function runRemoteShell(host: string, script: string, timeoutMs: number) {
  if (isLocalCodexImagenHost(host)) {
    return runCommand('bash', ['-lc', script], timeoutMs)
  }

  return runCommand('ssh', [host, `bash -lc ${shellQuote(script)}`], timeoutMs)
}

function buildCodexImagenCommand(opts: {
  bin: string
  promptPath: string
  inputPaths: string[]
  outputPath: string
  model: string
  timeoutSeconds: number
}) {
  const imageFlags = opts.inputPaths.flatMap((inputPath) => [
    '--image',
    shellQuote(inputPath),
  ])

  return [
    opts.bin,
    '--prompt-file',
    shellQuote(opts.promptPath),
    ...imageFlags,
    '--image-detail',
    'high',
    '--output',
    shellQuote(opts.outputPath),
    '--model',
    shellQuote(opts.model),
    '--timeout',
    String(opts.timeoutSeconds),
    '--json',
    '--quiet',
  ].join(' ')
}

async function runCodexImagen(opts: {
  host: string
  bin: string
  remotePrompt: string
  remoteInputs: string[]
  remoteOutput: string
  timeoutSeconds: number
  model: string
  timeoutMs: number
}) {
  const command = buildCodexImagenCommand({
    bin: opts.bin,
    promptPath: opts.remotePrompt,
    inputPaths: opts.remoteInputs,
    outputPath: opts.remoteOutput,
    model: opts.model,
    timeoutSeconds: opts.timeoutSeconds,
  })

  return runRemoteShell(opts.host, command, opts.timeoutMs + 10_000)
}

function normalizeReferenceImagePaths(input: ImageGenerationInput): string[] {
  const fromList = Array.isArray(input.referenceImagePaths)
    ? input.referenceImagePaths.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : []
  if (fromList.length > 0) return [...new Set(fromList)]
  if (input.referenceImagePath) return [input.referenceImagePath]
  return []
}

export async function generateProfileImage(
  input: ImageGenerationInput,
): Promise<ImageGenerationOutput> {
  const host = process.env.PROFILEFORGE_IMAGE_PROVIDER_HOST || process.env.PROFILEFORGE_CODEX_IMAGEN_HOST || DEFAULT_IMAGE_PROVIDER_HOST
  const bin = process.env.PROFILEFORGE_IMAGE_PROVIDER_BIN || process.env.PROFILEFORGE_CODEX_IMAGEN_BIN || DEFAULT_IMAGE_PROVIDER_BIN
  const model = DEFAULT_IMAGE_PROVIDER_MODEL
  const timeoutSeconds = Number(
    process.env.PROFILEFORGE_IMAGE_PROVIDER_TIMEOUT_SECONDS
      || process.env.PROFILEFORGE_CODEX_IMAGEN_TIMEOUT_SECONDS
      || DEFAULT_TIMEOUT_SECONDS,
  )
  const timeoutMs = Math.max(30, timeoutSeconds) * 1000
  const referenceImagePaths = normalizeReferenceImagePaths(input)
  if (referenceImagePaths.length === 0) {
    throw new Error('Upload reference image is unavailable')
  }

  await Promise.all(referenceImagePaths.map((referencePath) => fs.access(referencePath)))
  await fs.mkdir(generatedImageDir(), { recursive: true })

  const runId = `${input.jobId}-${input.index}-${crypto.randomBytes(4).toString('hex')}`
  const remoteDir = `/tmp/profileforge-codex-imagen/${runId}`
  const remoteInputs = referenceImagePaths.map((referencePath, index) => {
    const ext = path.extname(referencePath) || '.png'
    return `${remoteDir}/reference-${String(index + 1).padStart(2, '0')}${ext}`
  })
  const remotePrompt = `${remoteDir}/prompt.txt`
  const remoteOutput = `${remoteDir}/output.png`
  const localOutputName = `pf_${input.jobId}_${input.index}_${crypto.randomBytes(6).toString('hex')}.png`
  const localOutputPath = path.join(generatedImageDir(), localOutputName)

  const identityInstruction = referenceImagePaths.length > 1
    ? `Use all ${referenceImagePaths.length} attached images as identity references of the same person. Fuse facial structure cues across angles and poses (front, three-quarter, side, expression variants) while preserving one consistent identity: face shape, age range, skin tone, hairline, glasses if present, and distinctive features. Do not blend multiple people and do not copy any source pose, crop, wardrobe, or background unless explicitly requested.`
    : 'Use the attached image as the only identity reference. Preserve the same person, facial structure, age range, skin tone, hairline, and distinctive features.'

  const fullPrompt = [
    input.prompt,
    '',
    `Negative prompt: ${input.negativePrompt}`,
    `Output size target: ${input.outputSize}.`,
    identityInstruction,
  ].join('\n')

  try {
    await runRemoteShell(host, `mkdir -p ${shellQuote(remoteDir)}`, timeoutMs)

    const promptTmp = path.join(
      process.cwd(),
      '.next',
      'cache',
      `profileforge-prompt-${runId}.txt`,
    )
    await fs.mkdir(path.dirname(promptTmp), { recursive: true })
    await fs.writeFile(promptTmp, fullPrompt, 'utf8')

    try {
      await Promise.all(
        referenceImagePaths.map((localPath, index) =>
          copyLocalToRemote(host, localPath, remoteInputs[index], timeoutMs),
        ),
      )
      await copyLocalToRemote(host, promptTmp, remotePrompt, timeoutMs)
    } finally {
      await fs.rm(promptTmp, { force: true })
    }

    const { stdout } = await runCodexImagen({
      host,
      bin,
      remotePrompt,
      remoteInputs,
      remoteOutput,
      timeoutSeconds,
      model,
      timeoutMs,
    })
    const parsed = parseCodexImagenJson(stdout)
    const remoteImage = parsed.images?.[0]
    const remoteImagePath = remoteImage?.decodedPath || remoteImage?.path || remoteOutput

    if (!remoteImagePath) {
      throw new Error('codex-imagen did not report an output image path')
    }

    await copyRemoteToLocal(host, remoteImagePath, localOutputPath, timeoutMs)

    return {
      fileUrl: `/api/profileforge/image/${localOutputName}`,
      filePath: localOutputPath,
      provider: 'image-adapter',
      model: parsed.model || model,
      remoteSha256: remoteImage?.sha256,
      revisedPrompt: remoteImage?.revised_prompt ?? null,
    }
  } finally {
    await runRemoteShell(host, `rm -rf ${shellQuote(remoteDir)}`, 15_000).catch(() => undefined)
  }
}
