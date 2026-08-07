const BLOCKED_USER_AGENT_PATTERNS = [
  /GPTBot/i,
  /ChatGPT-User/i,
  /OAI-SearchBot/i,
  /CCBot/i,
  /ClaudeBot/i,
  /Claude-SearchBot/i,
  /anthropic-ai/i,
  /Google-Extended/i,
  /PerplexityBot/i,
  /Perplexity-User/i,
  /Bytespider/i,
  /cohere-ai/i,
  /Diffbot/i,
]

const LOCAL_HOSTS = new Set([
  'localhost:3000',
  'localhost:5173',
  '127.0.0.1:3000',
  '127.0.0.1:5173',
])

const ipBuckets = new Map()

function getHeader(headers, name) {
  return headers?.[name] ?? headers?.[name.toLowerCase()] ?? headers?.[name.toUpperCase()] ?? ''
}

function getAllowedHosts(req) {
  const hosts = new Set(['dumiropay.space', ...LOCAL_HOSTS])
  const host = getHeader(req.headers, 'host')
  if (host) hosts.add(host)

  const siteUrl = process.env.SITE_URL || process.env.URL
  if (siteUrl) {
    try {
      hosts.add(new URL(siteUrl).host)
    } catch { /* ignore invalid env */ }
  }

  if (process.env.VERCEL_URL) hosts.add(process.env.VERCEL_URL)
  if (process.env.DEPLOY_PRIME_URL) {
    try {
      hosts.add(new URL(process.env.DEPLOY_PRIME_URL).host)
    } catch { /* ignore invalid env */ }
  }

  return hosts
}

function headerMatchesAllowedHost(value, allowedHosts) {
  if (!value) return false
  try {
    return allowedHosts.has(new URL(value).host)
  } catch {
    return false
  }
}

export function isBlockedUserAgent(userAgent = '') {
  return BLOCKED_USER_AGENT_PATTERNS.some((pattern) => pattern.test(userAgent))
}

export function getClientIp(req) {
  const forwarded = getHeader(req.headers, 'x-forwarded-for') || getHeader(req.headers, 'x-vercel-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return getHeader(req.headers, 'x-real-ip') || '0.0.0.0'
}

export function setNoStore(res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.setHeader('Pragma', 'no-cache')
}

export function isIpRateLimited(req, key, limit, windowMs) {
  const now = Date.now()
  const bucketKey = `${key}:${getClientIp(req)}`
  const current = ipBuckets.get(bucketKey)

  if (!current || now - current.start >= windowMs) {
    ipBuckets.set(bucketKey, { count: 1, start: now })
    return false
  }

  if (current.count >= limit) return true
  current.count += 1
  return false
}

export function rejectSuspiciousRequest(req, res, { requireClientHeader = false } = {}) {
  const userAgent = getHeader(req.headers, 'user-agent')
  if (isBlockedUserAgent(userAgent)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (requireClientHeader) {
    const clientHeader = getHeader(req.headers, 'x-dumiropay-client')
    if (clientHeader !== 'web') {
      return res.status(403).json({ error: 'Forbidden' })
    }
  }

  const allowedHosts = getAllowedHosts(req)
  const origin = getHeader(req.headers, 'origin')
  const referer = getHeader(req.headers, 'referer')
  const secFetchSite = getHeader(req.headers, 'sec-fetch-site')
  const hasBrowserSignals = Boolean(origin || referer || secFetchSite)

  if (requireClientHeader && !hasBrowserSignals) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (origin && !headerMatchesAllowedHost(origin, allowedHosts)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (referer && !headerMatchesAllowedHost(referer, allowedHosts)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (secFetchSite && !['same-origin', 'same-site', 'none'].includes(secFetchSite)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  return null
}
