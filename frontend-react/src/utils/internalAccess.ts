const INTERNAL_GROUP_KEYWORDS = ['internal', 'ops', 'admin', 'staff'];
const CUSTOMER_GROUP_KEYWORDS = ['customer', 'external'];
const INTERNAL_ROLE_VALUES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'DEVICE_MANAGER'];
const CUSTOMER_ROLE_VALUES = ['DEVICE_VIEWER', 'CUSTOMER'];

function parseBooleanLike(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes'].includes(normalized)) return true;
  if (['false', '0', 'no'].includes(normalized)) return false;
  return null;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const rawToken = token.startsWith('Bearer ') ? token.slice(7) : token;
    const tokenParts = rawToken.split('.');
    if (tokenParts.length < 2) return null;

    const base64Url = tokenParts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = atob(padded);
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as Record<string, unknown>;
  } catch (error) {
    console.error('Failed to decode JWT payload for internal access check:', error);
    return null;
  }
}

function includesKeyword(values: string[], keywords: string[]): boolean {
  return values.some((value) => {
    const normalized = value.toLowerCase();
    return keywords.some((keyword) => normalized.includes(keyword));
  });
}

export function getInternalAccessFromTokenClaims(token: string | null | undefined): boolean | null {
  if (!token) return null;
  const claims = decodeJwtPayload(token);
  if (!claims) return null;

  const explicitInternal =
    parseBooleanLike(claims['custom:is_internal']) ??
    parseBooleanLike(claims.is_internal) ??
    parseBooleanLike(claims.internal_user);
  if (explicitInternal !== null) return explicitInternal;

  const roleClaim = claims['custom:role'] ?? claims.role;
  if (typeof roleClaim === 'string') {
    if (INTERNAL_ROLE_VALUES.includes(roleClaim.toUpperCase())) return true;
    if (CUSTOMER_ROLE_VALUES.includes(roleClaim.toUpperCase())) return false;
  }

  const groupsClaim = claims['cognito:groups'];
  if (Array.isArray(groupsClaim)) {
    const groups = groupsClaim.filter((group): group is string => typeof group === 'string');
    if (includesKeyword(groups, INTERNAL_GROUP_KEYWORDS)) return true;
    if (includesKeyword(groups, CUSTOMER_GROUP_KEYWORDS)) return false;
  }

  if (typeof groupsClaim === 'string') {
    const groups = groupsClaim.split(',').map((value) => value.trim()).filter(Boolean);
    if (includesKeyword(groups, INTERNAL_GROUP_KEYWORDS)) return true;
    if (includesKeyword(groups, CUSTOMER_GROUP_KEYWORDS)) return false;
  }

  return null;
}

