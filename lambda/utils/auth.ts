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

let pems: { [key: string]: string } = {};

// Fetch the JWT signing keys from Cognito
async function getPems() {
    if (Object.keys(pems).length > 0) return pems;

    const userPoolId = process.env.USER_POOL_ID;
    const region = userPoolId?.split('_')[0];
    const jwksUrl = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}/.well-known/jwks.json`;

    try {
        const response = await fetch(jwksUrl);
        const jwks = await response.json() as JWKs;

        // Convert each JWK to PEM
        jwks.keys.forEach(key => {
            pems[key.kid] = jwkToPem(key as any);
        });

        return pems;
    } catch (error) {
        console.error('Error fetching JWKs:', error);
        throw error;
    }
}

// Authentication middleware
export const auth: MiddlewareHandler = async (c: Context, next: Next) => {
    const path = c.req.path;
    console.log('Request path:', path);

    // Skip auth check for public routes - check for both /public and /prod/public paths
    if (path.includes('/public/') || path === '/public' || path.endsWith('/public')) {
        console.log('Public route detected, skipping auth check');
        return next();
    }

    // Skip auth check for OPTIONS requests (CORS preflight)
    if (c.req.method === 'OPTIONS') {
        return next();
    }

    const authHeader = c.req.header('Authorization');

    if (!authHeader) {
        console.log('No Authorization header found');
        return c.json({ message: 'Unauthorized - No token provided' }, 401);
    }

    // Extract the JWT from the Authorization header
    const token = authHeader.replace('Bearer ', '');

    // Get token payload without verification to extract kid
    const decodedToken = decode(token, { complete: true }) as DecodedToken | null;

    if (!decodedToken || !decodedToken.header.kid) {
        return c.json({ message: 'Unauthorized - Invalid token format' }, 401);
    }

    // Get the key id from the token
    const kid = decodedToken.header.kid;

    try {
        // Get the PEMs
        const pems = await getPems();
        const pem = pems[kid];

        if (!pem) {
            return c.json({ message: 'Unauthorized - Invalid token' }, 401);
        }

        // Verify the token
        const userPoolId = process.env.USER_POOL_ID;
        const region = userPoolId?.split('_')[0];

        try {
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

            // Add user info to the context
            c.set('user', payload);
            return next();
        } catch (verifyError) {
            console.error('Token verification failed:', verifyError);
            return c.json({ message: 'Unauthorized - Invalid token' }, 401);
        }
    } catch (error) {
        console.error('Authentication error:', error);
        return c.json({ message: 'Unauthorized - Invalid token' }, 401);
    }
}; 