const REDACTED_VALUE = '[REDACTED]'

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-origin-verify',
  'proxy-authorization'
])

export function sanitizeHeaders(
  headers: Record<string, string | undefined>
): Record<string, string | undefined> {
  const sanitized: Record<string, string | undefined> = {}

  for (const [name, value] of Object.entries(headers)) {
    sanitized[name] = SENSITIVE_HEADERS.has(name.toLowerCase())
      ? REDACTED_VALUE
      : value
  }

  return sanitized
}

