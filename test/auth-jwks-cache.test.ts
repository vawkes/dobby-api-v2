import { beforeEach, describe, expect, it, jest } from '@jest/globals'
import jwkToPem from 'jwk-to-pem'
import fetch from 'node-fetch'
import { __getPemsForTests, __resetJwksCacheForTests } from '../lambda/utils/auth.ts'

jest.mock('node-fetch', () => jest.fn())
jest.mock('jwk-to-pem', () => jest.fn((jwk: { kid: string }) => `pem-${jwk.kid}`))

const mockFetch = fetch as unknown as jest.Mock
const mockJwkToPem = jwkToPem as unknown as jest.Mock

const fakeJwksResponse = {
  keys: [
    {
      alg: 'RS256',
      e: 'AQAB',
      kid: 'kid-1',
      kty: 'RSA',
      n: 'n-value',
      use: 'sig'
    }
  ]
}

describe('JWKS cache behavior', () => {
  beforeEach(() => {
    __resetJwksCacheForTests()
    process.env.USER_POOL_ID = 'us-east-1_examplePool'
    mockFetch.mockReset()
    mockJwkToPem.mockClear()
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => fakeJwksResponse
    } as never)
  })

  it('uses cached PEMs between calls when not forced', async () => {
    const first = await __getPemsForTests()
    const second = await __getPemsForTests()

    expect(first['kid-1']).toBe('pem-kid-1')
    expect(second['kid-1']).toBe('pem-kid-1')
    expect(mockFetch).toHaveBeenCalledTimes(1)
    expect(mockJwkToPem).toHaveBeenCalledTimes(1)
  })

  it('forces JWKS refresh when requested', async () => {
    await __getPemsForTests()
    await __getPemsForTests(true)

    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockJwkToPem).toHaveBeenCalledTimes(2)
  })

  it('throws when USER_POOL_ID is missing', async () => {
    __resetJwksCacheForTests()
    delete process.env.USER_POOL_ID

    await expect(__getPemsForTests()).rejects.toThrow('Missing USER_POOL_ID environment variable')
  })
})
