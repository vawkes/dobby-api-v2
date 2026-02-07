import { describe, expect, it } from '@jest/globals'
import { sanitizeHeaders } from '../lambda/utils/logging'

describe('sanitizeHeaders', () => {
  it('redacts sensitive headers and keeps safe headers', () => {
    const result = sanitizeHeaders({
      authorization: 'Bearer secret-token',
      'x-api-key': 'api-key-value',
      'x-origin-verify': 'verify-token',
      cookie: 'session=abc',
      'content-type': 'application/json'
    })

    expect(result.authorization).toBe('[REDACTED]')
    expect(result['x-api-key']).toBe('[REDACTED]')
    expect(result['x-origin-verify']).toBe('[REDACTED]')
    expect(result.cookie).toBe('[REDACTED]')
    expect(result['content-type']).toBe('application/json')
  })

  it('handles mixed-case header names', () => {
    const result = sanitizeHeaders({
      Authorization: 'Bearer mixed-case-secret',
      Cookie: 'session=xyz'
    })

    expect(result.Authorization).toBe('[REDACTED]')
    expect(result.Cookie).toBe('[REDACTED]')
  })
})

