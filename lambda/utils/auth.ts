import { Context, Next, MiddlewareHandler } from 'hono';
import { verify, decode, JwtPayload } from 'jsonwebtoken';
import jwkToPem from 'jwk-to-pem';
import fetch from 'node-fetch';

interface JWK {
    alg: string;
    e: string;
    kid: string;
    kty: string;
    n: string;
    use: string;
}

interface JWKs {
    keys: JWK[];
}

interface DecodedToken {
    header: {
        kid: string;
        alg: string;
    };
    payload: JwtPayload;
    signature: string;
}

const JWKS_CACHE_TTL_MS = 60 * 60 * 1000;
let pems: { [key: string]: string } = {};
let pemsFetchedAt = 0;

function isLocalAuthEnabled(): boolean {
    return process.env.LOCAL_DEV_BYPASS_AUTH === 'true' || process.env.LOCAL_DEV === 'true';
}

function getLocalUser(c: Context): JwtPayload {
    return {
        sub: c.req.header('X-Dev-User-Id') || process.env.LOCAL_DEV_USER_ID || 'local-dev-admin',
        email: c.req.header('X-Dev-User-Email') || process.env.LOCAL_DEV_USER_EMAIL || 'local-dev@example.com',
        'cognito:username': c.req.header('X-Dev-User-Id') || process.env.LOCAL_DEV_USER_ID || 'local-dev-admin',
    };
}

async function fetchPemsFromCognito(): Promise<{ [key: string]: string }> {
    const userPoolId = process.env.USER_POOL_ID;
    if (!userPoolId) {
        throw new Error('Missing USER_POOL_ID environment variable');
    }

    const region = userPoolId?.split('_')[0];
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;
    const response = await fetch(jwksUrl);

    if (!response.ok) {
        throw new Error(`Failed to fetch JWKS. Status: ${response.status}`);
    }

    const jwks = await response.json() as JWKs;
    const fetchedPems: { [key: string]: string } = {};

    // Convert each JWK to PEM
    jwks.keys.forEach(key => {
        fetchedPems[key.kid] = jwkToPem(key as any);
    });

    return fetchedPems;
}

// Fetch the JWT signing keys from Cognito with in-memory cache
async function getPems(forceRefresh: boolean = false) {
    const cacheAge = Date.now() - pemsFetchedAt;
    const hasValidCache = Object.keys(pems).length > 0 && cacheAge < JWKS_CACHE_TTL_MS;
    if (!forceRefresh && hasValidCache) {
        return pems;
    }

    try {
        pems = await fetchPemsFromCognito();
        pemsFetchedAt = Date.now();
        return pems;
    } catch (error) {
        console.error('Error fetching JWKs:', error);
        throw error;
    }
}

export function __resetJwksCacheForTests(): void {
    pems = {};
    pemsFetchedAt = 0;
}

export async function __getPemsForTests(forceRefresh: boolean = false): Promise<{ [key: string]: string }> {
    return getPems(forceRefresh);
}

// Authentication middleware
export const auth: MiddlewareHandler = async (c: Context, next: Next) => {
    const startTime = Date.now();
    const path = c.req.path;
    console.log('Auth middleware - Request path:', path);

    // Skip auth check for public routes - check for both /public and /prod/public paths
    if (path.includes('/public/') || path === '/public' || path.endsWith('/public')) {
        console.log('Public route detected, skipping auth check');
        return next();
    }

    // Skip auth check for OPTIONS requests (CORS preflight)
    if (c.req.method === 'OPTIONS') {
        return next();
    }

    if (isLocalAuthEnabled()) {
        c.set('user', getLocalUser(c));
        return next();
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        console.log('No Authorization header found');
        return c.json({ message: 'Unauthorized - No token provided' }, 401);
    }

    console.log('Authorization header found, processing token');

    // Extract the JWT from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Get token payload without verification to extract kid
    try {
        const decodedToken = decode(token, { complete: true }) as DecodedToken | null;

        if (!decodedToken || !decodedToken.header.kid) {
            console.log('Invalid token format - no kid found');
            return c.json({ message: 'Unauthorized - Invalid token format' }, 401);
        }

        // Get the key id from the token
        const kid = decodedToken.header.kid;
        console.log('Token kid found:', kid);

        try {
            // Get the PEMs
            console.log('Retrieving PEMs');
            const startPemTime = Date.now();
            const pems = await getPems();
            console.log(`PEMs retrieved in ${Date.now() - startPemTime}ms`);

            let pem = pems[kid];

            if (!pem) {
                console.log('No matching PEM found in cache for kid, refreshing JWKS:', kid);
                const refreshedPems = await getPems(true);
                pem = refreshedPems[kid];

                if (!pem) {
                    console.log('No matching PEM found for kid after JWKS refresh:', kid);
                    return c.json({ message: 'Unauthorized - Invalid token' }, 401);
                }
            }

            // Verify the token
            const userPoolId = process.env.USER_POOL_ID;
            const region = userPoolId?.split('_')[0];

            try {
                console.log('Verifying token');
                const startVerifyTime = Date.now();
                const payload = await new Promise<JwtPayload>((resolve, reject) => {
                    verify(
                        token,
                        pem,
                        {
                            issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
                        },
                        (err, decoded) => {
                            if (err) {
                                reject(err);
                            } else if (decoded && typeof decoded !== 'string') {
                                resolve(decoded as JwtPayload);
                            } else {
                                reject(new Error('Invalid token payload'));
                            }
                        }
                    );
                });
                console.log(`Token verified in ${Date.now() - startVerifyTime}ms`);

                // Add user info to the context
                c.set('user', payload);
                console.log(`Auth middleware completed in ${Date.now() - startTime}ms`);
                return next();
            } catch (verifyError) {
                console.error('Token verification failed:', verifyError);
                return c.json({ message: 'Unauthorized - Invalid token' }, 401);
            }
        } catch (pemError) {
            console.error('Error retrieving PEMs:', pemError);
            return c.json({ message: 'Authentication service unavailable' }, 503);
        }
    } catch (decodeError) {
        console.error('Error decoding token:', decodeError);
        return c.json({ message: 'Unauthorized - Invalid token format' }, 401);
    }
};
