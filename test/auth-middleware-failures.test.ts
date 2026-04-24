import { Hono } from 'hono';
import { sign } from 'jsonwebtoken';
import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { auth, __resetJwksCacheForTests } from '../lambda/utils/auth.ts';

const createProtectedApp = () => {
  const app = new Hono();
  app.use('*', auth);
  app.get('/private', c => {
    const user = (c as unknown as { get: (key: string) => unknown }).get('user');
    return c.json({ user });
  });
  return app;
};

describe('auth middleware failure paths', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    __resetJwksCacheForTests();
    process.env = { ...originalEnv };
    delete process.env.LOCAL_DEV;
    delete process.env.LOCAL_DEV_BYPASS_AUTH;
    delete process.env.USER_POOL_ID;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('rejects protected requests without an Authorization header', async () => {
    const response = await createProtectedApp().request('/private');
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized - No token provided' });
  });

  it('rejects bearer tokens that cannot be decoded as Cognito JWTs', async () => {
    const response = await createProtectedApp().request('/private', {
      headers: { Authorization: 'Bearer not-a-jwt' },
    });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body).toEqual({ message: 'Unauthorized - Invalid token format' });
  });

  it('returns auth service unavailable when JWKS cannot be loaded', async () => {
    const token = sign({ sub: 'user-1' }, 'local-secret', {
      header: { alg: 'HS256', kid: 'kid-1' },
    });

    const response = await createProtectedApp().request('/private', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({ message: 'Authentication service unavailable' });
  });

  it('sets a local dev user when local auth bypass is enabled', async () => {
    process.env.LOCAL_DEV_BYPASS_AUTH = 'true';

    const response = await createProtectedApp().request('/private', {
      headers: {
        'X-Dev-User-Id': 'dev-user',
        'X-Dev-User-Email': 'dev@example.com',
      },
    });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.user).toMatchObject({
      sub: 'dev-user',
      email: 'dev@example.com',
      'cognito:username': 'dev-user',
    });
  });
});
