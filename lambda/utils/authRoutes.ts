import { Hono } from 'hono';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { describeRoute } from 'hono-openapi';
import {resolver} from "hono-openapi/zod"


const cognitoClient = new CognitoIdentityProvider({
    region: process.env.USER_POOL_ID?.split('_')[0] || 'us-east-1',
});

const app = new Hono();

// Define validation schemas
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    name: z.string().min(1),
});

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string(),
});

const confirmRegistrationSchema = z.object({
    email: z.string().email(),
    confirmationCode: z.string(),
});

const forgotPasswordSchema = z.object({
    email: z.string().email(),
});

const resetPasswordSchema = z.object({
    email: z.string().email(),
    confirmationCode: z.string(),
    newPassword: z.string().min(8),
});

// Define refresh token schema
const refreshTokenSchema = z.object({
    refreshToken: z.string()
});

// Register a new user
app.post(
    '/register',
    describeRoute({
        tags: ['Authentication'],
        summary: 'User registration',
        description: 'Register a new user account.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(registerSchema),
                    example: {
                        email: "newuser@example.com",
                        password: "SecurePass123!",
                        name: "John Doe"
                    }
                }
            }
        },
        responses: {
            201: {
                description: 'Registration successful - confirmation email sent',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'User registration successful. Please check your email for confirmation code.' },
                                userId: { type: 'string', example: 'us-east-1:12345678-1234-1234-1234-123456789012' }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Registration failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: []
    }),
    zValidator('json', registerSchema),
    async (c) => {
        const { email, password, name } = c.req.valid('json');

        try {
            const result = await cognitoClient.signUp({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                Username: email,
                Password: password,
                UserAttributes: [
                    {
                        Name: 'email',
                        Value: email,
                    },
                    {
                        Name: 'name',
                        Value: name,
                    },
                ],
            });

            return c.json({
                message: 'User registration successful. Please check your email for confirmation code.',
                userId: result.UserSub,
            }, 201);
        } catch (error) {
            console.error('Registration error:', error);
            return c.json({ message: 'Registration failed', error: (error as Error).message }, 400);
        }
    }
)

// Confirm user registration
app.post(
    '/confirm-registration',
    describeRoute({
        tags: ['Authentication'],
        summary: 'Confirm user registration',
        description: 'Confirm a user\'s registration using the code sent to their email.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(confirmRegistrationSchema),
                    example: {
                        email: "newuser@example.com",
                        confirmationCode: "123456"
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Email confirmed successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Email confirmed successfully. You can now log in.' }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Confirmation failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: []
    }),
    zValidator('json', confirmRegistrationSchema),
    async (c) => {
        const { email, confirmationCode } = c.req.valid('json');

        try {
            await cognitoClient.confirmSignUp({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                Username: email,
                ConfirmationCode: confirmationCode,
            });

            return c.json({ message: 'Email confirmed successfully. You can now log in.' }, 200);
        } catch (error) {
            console.error('Confirmation error:', error);
            return c.json({ message: 'Confirmation failed', error: (error as Error).message }, 400);
        }
    }
);

// Login user
app.post(
    '/login',
    describeRoute({
        tags: ['Authentication'],
        summary: 'User login',
        description: 'Authenticate a user and return a JWT token',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(loginSchema),
                    example: {
                        email: "user@example.com",
                        password: "SecurePass123!"
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Login successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Login successful' },
                                token: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                refreshToken: { type: 'string', example: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...' },
                                expiresIn: { type: 'number', example: 3600 }
                                // Add user details if returned by the API
                            },
                            required: ['message', 'token', 'refreshToken', 'expiresIn']
                        }
                    }
                }
            },
            400: {
                description: 'Invalid request data',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            401: {
                description: 'Authentication failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: [] // Override global security - this endpoint doesn't require auth
    }),
    zValidator('json', loginSchema),
    async (c) => {
        const { email, password } = c.req.valid('json');

        try {
            const result = await cognitoClient.initiateAuth({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                AuthFlow: 'USER_PASSWORD_AUTH',
                AuthParameters: {
                    USERNAME: email,
                    PASSWORD: password,
                },
            });

            if (!result.AuthenticationResult) {
                return c.json({ message: 'Login failed - Missing authentication result' }, 400);
            }

            return c.json({
                message: 'Login successful',
                token: result.AuthenticationResult.IdToken,
                refreshToken: result.AuthenticationResult.RefreshToken,
                expiresIn: result.AuthenticationResult.ExpiresIn,
            }, 200);
        } catch (error) {
            console.error('Login error:', error);
            return c.json({ message: 'Login failed', error: (error as Error).message }, 401);
        }
    }
);

// Forgot password
app.post(
    '/forgot-password',
    describeRoute({
        tags: ['Authentication'],
        summary: 'Forgot password',
        description: 'Request a password reset code for a user via email.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(forgotPasswordSchema),
                    example: {
                        email: "user@example.com"
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Password reset code sent successfully',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Password reset code sent to your email' }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Password reset request failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: []
    }),
    zValidator('json', forgotPasswordSchema),
    async (c) => {
        const { email } = c.req.valid('json');

        try {
            await cognitoClient.forgotPassword({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                Username: email,
            });

            return c.json({ message: 'Password reset code sent to your email' }, 200);
        } catch (error) {
            console.error('Forgot password error:', error);
            return c.json({ message: 'Password reset request failed', error: (error as Error).message }, 400);
        }
    }
);

// Reset password
app.post(
    '/reset-password',
    describeRoute({
        tags: ['Authentication'],
        summary: 'Reset user password',
        description: 'Reset a user\'s password using a confirmation code received via email.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(resetPasswordSchema),
                    example: {
                        email: "user@example.com",
                        confirmationCode: "123456",
                        newPassword: "NewSecurePass123!"
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Password reset successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Password reset successful. You can now log in with your new password.' }
                            }
                        }
                    }
                }
            },
            400: {
                description: 'Password reset failed',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: []
    }),
    zValidator('json', resetPasswordSchema),
    async (c) => {
        const { email, confirmationCode, newPassword } = c.req.valid('json');

        try {
            await cognitoClient.confirmForgotPassword({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                Username: email,
                ConfirmationCode: confirmationCode,
                Password: newPassword,
            });

            return c.json({ message: 'Password reset successful. You can now log in with your new password.' }, 200);
        } catch (error) {
            console.error('Reset password error:', error);
            return c.json({ message: 'Password reset failed', error: (error as Error).message }, 400);
        }
    }
);

// Refresh token
app.post(
    '/refresh-token',
    describeRoute({
        tags: ['Authentication'],
        summary: 'Refresh auth token',
        description: 'Obtain a new JWT token using a valid refresh token.',
        requestBody: {
            required: true,
            content: {
                'application/json': {
                    schema: resolver(refreshTokenSchema),
                    example: {
                        refreshToken: "eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ..."
                    }
                }
            }
        },
        responses: {
            200: {
                description: 'Token refresh successful',
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                message: { type: 'string', example: 'Token refresh successful' },
                                token: { type: 'string', example: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...' },
                                refreshToken: { type: 'string', example: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ...' },
                                expiresIn: { type: 'number', example: 3600 }
                            },
                            required: ['message', 'token', 'refreshToken', 'expiresIn']
                        }
                    }
                }
            },
            400: {
                description: 'Token refresh failed - Missing authentication result',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            },
            401: {
                description: 'Token refresh failed - Invalid refresh token',
                content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } }
            }
        },
        security: []
    }),
    zValidator('json', refreshTokenSchema),
    async (c) => {
        const { refreshToken } = c.req.valid('json');

        try {
            const result = await cognitoClient.initiateAuth({
                ClientId: process.env.USER_POOL_CLIENT_ID,
                AuthFlow: 'REFRESH_TOKEN_AUTH',
                AuthParameters: {
                    REFRESH_TOKEN: refreshToken,
                },
            });

            if (!result.AuthenticationResult) {
                return c.json({ message: 'Token refresh failed - Missing authentication result' }, 400);
            }

            return c.json({
                message: 'Token refresh successful',
                token: result.AuthenticationResult.IdToken,
                refreshToken: result.AuthenticationResult.RefreshToken || refreshToken, // Use new refresh token if provided, otherwise keep the old one
                expiresIn: result.AuthenticationResult.ExpiresIn,
            }, 200);
        } catch (error) {
            console.error('Token refresh error:', error);
            return c.json({ message: 'Token refresh failed', error: (error as Error).message }, 401);
        }
    }
);

export default app; 