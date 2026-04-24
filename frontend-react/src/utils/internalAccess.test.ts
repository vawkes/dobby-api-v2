import { getInternalAccessFromTokenClaims } from './internalAccess';

function toJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  return `${header}.${body}.`;
}

describe('getInternalAccessFromTokenClaims', () => {
  it('returns true when custom:is_internal is true', () => {
    const token = toJwt({ 'custom:is_internal': true });
    expect(getInternalAccessFromTokenClaims(token)).toBe(true);
  });

  it('returns true when cognito:groups includes internal', () => {
    const token = toJwt({ 'cognito:groups': ['customer', 'internal_ops'] });
    expect(getInternalAccessFromTokenClaims(token)).toBe(true);
  });

  it('returns false when claims indicate customer', () => {
    const token = toJwt({ 'cognito:groups': ['customer'] });
    expect(getInternalAccessFromTokenClaims(token)).toBe(false);
  });

  it('returns null for undecidable tokens', () => {
    const token = toJwt({ email: 'a@b.com' });
    expect(getInternalAccessFromTokenClaims(token)).toBeNull();
  });
});
