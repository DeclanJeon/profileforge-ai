const DEFAULT_APP_URL = 'https://profileforge.ponslink.com'

function intEnv(name: string, fallback: number, min = 0) {
  const raw = process.env[name]
  if (!raw) return fallback
  if (!/^-?\d+$/.test(raw.trim())) return fallback
  const parsed = Number.parseInt(raw, 10)
  if (!Number.isFinite(parsed) || parsed < min) return fallback
  return parsed
}

function strEnv(name: string, fallback = '') {
  return process.env[name]?.trim() || fallback
}
function stripTrailingSlash(value: string) {
  return value.replace(/\/$/, '')
}

function isLocalUrl(value: string) {
  try {
    const { hostname } = new URL(value)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

function publicUrlEnv(name: string, fallback: string) {
  const value = stripTrailingSlash(strEnv(name, fallback))
  if (process.env.NODE_ENV === 'production' && isLocalUrl(value)) {
    return stripTrailingSlash(fallback)
  }
  return value
}


function devOnlyFallback(value: string) {
  if (value) return value
  return process.env.NODE_ENV === 'production' ? '' : 'profileforge-local-dev-pepper'
}
const APP_URL = publicUrlEnv('NEXT_PUBLIC_APP_URL', DEFAULT_APP_URL)

export const profileForgeConfig = {
  appUrl: APP_URL,

  imageProvider: {
    host: strEnv('PROFILEFORGE_IMAGE_PROVIDER_HOST', strEnv('PROFILEFORGE_CODEX_IMAGEN_HOST', 'ponslink')),
    bin: strEnv('PROFILEFORGE_IMAGE_PROVIDER_BIN', strEnv('PROFILEFORGE_CODEX_IMAGEN_BIN', '$HOME/bin/codex-imagen')),
    timeoutSeconds: intEnv('PROFILEFORGE_IMAGE_PROVIDER_TIMEOUT_SECONDS', intEnv('PROFILEFORGE_CODEX_IMAGEN_TIMEOUT_SECONDS', 900, 30), 30),
    model: 'gpt-5.5',
  },

  queue: {
    concurrency: intEnv('PROFILEFORGE_GENERATION_CONCURRENCY', 1, 1),
    userActiveJobLimit: intEnv('PROFILEFORGE_USER_ACTIVE_JOB_LIMIT', 1, 1),
    defaultResultCount: intEnv('PROFILEFORGE_DEFAULT_RESULT_COUNT', 1, 1),
    maxResultCount: intEnv('PROFILEFORGE_MAX_RESULT_COUNT', 4, 1),
    imageTimeoutSeconds: intEnv('PROFILEFORGE_IMAGE_TIMEOUT_SECONDS', 900, 30),
    jobTimeoutSeconds: intEnv('PROFILEFORGE_JOB_TIMEOUT_SECONDS', 3600, 60),
    staleRunningSeconds: intEnv('PROFILEFORGE_QUEUE_STALE_RUNNING_SECONDS', 5400, 60),
    averageImageSeconds: intEnv('PROFILEFORGE_AVERAGE_IMAGE_SECONDS', 180, 30),
    workerSecret: strEnv('PROFILEFORGE_WORKER_SECRET'),
  },

  retention: {
    generatedImageDir: strEnv('PROFILEFORGE_GENERATED_IMAGE_DIR', '/tmp/profileforge-generated'),
    generatedImageTtlSeconds: intEnv('PROFILEFORGE_GENERATED_IMAGE_TTL_SECONDS', 600, 60),
    uploadTtlSeconds: intEnv('PROFILEFORGE_UPLOAD_TTL_SECONDS', 21600, 60),
    downloadTokenTtlHours: intEnv('PROFILEFORGE_DOWNLOAD_TOKEN_TTL_HOURS', 24, 1),
    maxDownloadsPerToken: intEnv('PROFILEFORGE_MAX_DOWNLOADS_PER_TOKEN', 10, 1),
  },

  r2: {
    enabled: strEnv('PROFILEFORGE_ENABLE_R2_STORAGE', 'false') === 'true',
    accountId: strEnv('PROFILEFORGE_R2_ACCOUNT_ID'),
    accessKeyId: strEnv('PROFILEFORGE_R2_ACCESS_KEY_ID'),
    secretAccessKey: strEnv('PROFILEFORGE_R2_SECRET_ACCESS_KEY'),
    bucket: strEnv('PROFILEFORGE_R2_BUCKET', 'profileforge-generated'),
    endpoint: strEnv('PROFILEFORGE_R2_ENDPOINT'),
    signedUrlTtlSeconds: intEnv('PROFILEFORGE_R2_SIGNED_URL_TTL_SECONDS', 300, 30),
    objectTtlHours: intEnv('PROFILEFORGE_R2_OBJECT_TTL_HOURS', 24, 1),
  },

  email: {
    provider: strEnv('PROFILEFORGE_EMAIL_PROVIDER', 'resend'),
    from: strEnv('PROFILEFORGE_EMAIL_FROM', 'ProfileForge <noreply@profileforge.ponslink.com>'),
    replyTo: strEnv('PROFILEFORGE_EMAIL_REPLY_TO', 'support@profileforge.ponslink.com'),
    apiKey: strEnv('PROFILEFORGE_EMAIL_API_KEY'),
    smtpHost: strEnv('PROFILEFORGE_SMTP_HOST'),
    smtpPort: intEnv('PROFILEFORGE_SMTP_PORT', 587, 1),
    smtpUser: strEnv('PROFILEFORGE_SMTP_USER'),
    smtpPass: strEnv('PROFILEFORGE_SMTP_PASS'),
    smtpSecure: strEnv('PROFILEFORGE_SMTP_SECURE', 'false') === 'true',
    downloadBaseUrl: publicUrlEnv('PROFILEFORGE_DOWNLOAD_BASE_URL', `${APP_URL}/download`),
    resendCooldownSeconds: intEnv('PROFILEFORGE_RESEND_EMAIL_COOLDOWN_SECONDS', 300, 30),
  },

  security: {
    tokenPepper: devOnlyFallback(strEnv('PROFILEFORGE_TOKEN_PEPPER', strEnv('NEXTAUTH_SECRET'))),
  },

  rateLimits: {
    dailyGlobalImageLimit: intEnv('PROFILEFORGE_DAILY_GLOBAL_IMAGE_LIMIT', 100, 1),
    dailyEmailImageLimit: intEnv('PROFILEFORGE_DAILY_EMAIL_IMAGE_LIMIT', 8, 1),
    dailyIpImageLimit: intEnv('PROFILEFORGE_DAILY_IP_IMAGE_LIMIT', 12, 1),
  },
}

export function isR2Configured() {
  return Boolean(
    profileForgeConfig.r2.enabled &&
    profileForgeConfig.r2.accountId &&
      profileForgeConfig.r2.accessKeyId &&
      profileForgeConfig.r2.secretAccessKey &&
      profileForgeConfig.r2.bucket &&
      profileForgeConfig.r2.endpoint,
  )
}

export function isTokenPepperConfigured() {
  return Boolean(profileForgeConfig.security.tokenPepper)
}

export function isEmailConfigured() {
  if (profileForgeConfig.email.provider === 'smtp') {
    return Boolean(profileForgeConfig.email.smtpHost && profileForgeConfig.email.smtpUser && profileForgeConfig.email.smtpPass)
  }
  return Boolean(profileForgeConfig.email.apiKey)
}
