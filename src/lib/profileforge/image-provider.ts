import crypto from 'crypto'
import { spawn } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'

const DEFAULT_CODEX_IMAGEN_HOST = 'ponslink'
const DEFAULT_CODEX_IMAGEN_BIN = '$HOME/bin/codex-imagen'
const DEFAULT_CODEX_IMAGEN_MODEL = 'gpt-5.5'
const DEFAULT_TIMEOUT_SECONDS = 900

export interface ImageGenerationInput {
  jobId: string
  index: number
  prompt: string
  negativePrompt: string
  referenceImagePath: string
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
  return process.env.PROFILEFORGE_GENERATED_IMAGE_DIR || '/tmp/profileforge-generated'
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
  inputPath: string
  outputPath: string
  model: string
  timeoutSeconds: number
}) {
  return [
    opts.bin,
    '--prompt-file',
    shellQuote(opts.promptPath),
    '--image',
    shellQuote(opts.inputPath),
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
  remoteInput: string
  remoteOutput: string
  timeoutSeconds: number
  timeoutMs: number
}) {
  const command = buildCodexImagenCommand({
    bin: opts.bin,
    promptPath: opts.remotePrompt,
    inputPath: opts.remoteInput,
    outputPath: opts.remoteOutput,
    model: DEFAULT_CODEX_IMAGEN_MODEL,
    timeoutSeconds: opts.timeoutSeconds,
  })

  return runRemoteShell(opts.host, command, opts.timeoutMs + 10_000)
}

export async function generateProfileImage(
  input: ImageGenerationInput,
): Promise<ImageGenerationOutput> {
  const host = process.env.PROFILEFORGE_CODEX_IMAGEN_HOST || DEFAULT_CODEX_IMAGEN_HOST
  const bin = process.env.PROFILEFORGE_CODEX_IMAGEN_BIN || DEFAULT_CODEX_IMAGEN_BIN
  const model = DEFAULT_CODEX_IMAGEN_MODEL
  const timeoutSeconds = Number(
    process.env.PROFILEFORGE_CODEX_IMAGEN_TIMEOUT_SECONDS || DEFAULT_TIMEOUT_SECONDS,
  )
  const timeoutMs = Math.max(30, timeoutSeconds) * 1000

  await fs.access(input.referenceImagePath)
  await fs.mkdir(generatedImageDir(), { recursive: true })

  const runId = `${input.jobId}-${input.index}-${crypto.randomBytes(4).toString('hex')}`
  const remoteDir = `/tmp/profileforge-codex-imagen/${runId}`
  const remoteInput = `${remoteDir}/reference${path.extname(input.referenceImagePath) || '.png'}`
  const remotePrompt = `${remoteDir}/prompt.txt`
  const remoteOutput = `${remoteDir}/output.png`
  const localOutputName = `pf_${input.jobId}_${input.index}_${crypto.randomBytes(6).toString('hex')}.png`
  const localOutputPath = path.join(generatedImageDir(), localOutputName)

  const fullPrompt = [
    input.prompt,
    '',
    `Negative prompt: ${input.negativePrompt}`,
    `Output size target: ${input.outputSize}.`,
    'Use the attached image as the only identity reference. Preserve the same person, facial structure, age range, skin tone, hairline, and distinctive features.',
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
      await copyLocalToRemote(host, input.referenceImagePath, remoteInput, timeoutMs)
      await copyLocalToRemote(host, promptTmp, remotePrompt, timeoutMs)
    } finally {
      await fs.rm(promptTmp, { force: true })
    }

    const { stdout } = await runCodexImagen({
      host,
      bin,
      remotePrompt,
      remoteInput,
      remoteOutput,
      timeoutSeconds,
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
      provider: 'codex-imagen-ssh',
      model: parsed.model || model,
      remoteSha256: remoteImage?.sha256,
      revisedPrompt: remoteImage?.revised_prompt ?? null,
    }
  } finally {
    await runRemoteShell(host, `rm -rf ${shellQuote(remoteDir)}`, 15_000).catch(() => undefined)
  }
}
