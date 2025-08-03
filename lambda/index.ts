import { handle } from 'hono/aws-lambda'
import devices from './devices/devices'
import events from './events/events'
import companies from './companies/companies.ts'
import authRoutes from './utils/authRoutes'
import { Hono } from 'hono'
import { openAPISpecs } from 'hono-openapi'
import { apiReference } from '@scalar/hono-api-reference'
import { auth } from './utils/auth'
import { cors } from 'hono/cors'

// Create the main app
const app = new Hono()

// Add CORS middleware to handle cross-origin requests
app.use('*', cors({
    origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        'http://localhost:3001',  // Additional localhost port
        'https://d1dz25mfg0xsp8.cloudfront.net', // Development CloudFront
        'https://d2996moha39e78.cloudfront.net', // Production CloudFront (actual)
        'https://EY54VXLNWUWUC.cloudfront.net', // Current development CloudFront
        'https://api.gridcube.dev.vawkes.com', // Development API domain
        'https://api.gridcube.vawkes.com', // Production API domain
        'https://gridcube.dev.vawkes.com', // Specific development frontend domain
        'https://gridcube.vawkes.com', // Production frontend domain
    ],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Origin-Verify', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // 24 hours
    exposeHeaders: ['Content-Length', 'Content-Type']
}))

// Create a separate router for public routes
const publicRoutes = new Hono()

// Add auth routes to public routes (do this first so the routes are included in OpenAPI spec)
publicRoutes.route('/auth', authRoutes)

// Create a public-facing app for OpenAPI documentation (excludes internal management endpoints)
const publicApiApp = new Hono()
publicApiApp.route('/devices', devices)
publicApiApp.route('/events', events)
publicApiApp.route('/public/auth', authRoutes)

// Add OpenAPI documentation to public routes
publicRoutes.get(
    '/openapi',
    openAPISpecs(publicApiApp, {
        documentation: {
            info: {
                title: 'Vawkes GridCube API',
                version: '2.0.0',
                description: `# Vawkes GridCube API

This API provides comprehensive access to Vawkes GridCube device management and monitoring capabilities.

## Overview

The GridCube API allows you to:
- **Monitor Devices**: Get real-time status and data from your GridCube devices
- **Manage Events**: Send commands and events to control device behavior
- **Track Performance**: Access historical data and device statistics
- **Authenticate Users**: Secure user authentication and authorization

## Getting Started

1. **Authentication**: All API requests require a valid JWT token obtained through the authentication endpoints
2. **Base URL**: Use the provided API endpoint for all requests
3. **Content-Type**: All requests should use \`application/json\` content type
4. **Rate Limiting**: Please respect rate limits to ensure optimal performance

## Error Handling

The API uses standard HTTP status codes:
- \`200\`: Success
- \`201\`: Created
- \`400\`: Bad Request
- \`401\`: Unauthorized
- \`403\`: Forbidden
- \`404\`: Not Found
- \`500\`: Internal Server Error

## Support

For technical support or questions about this API, please contact our development team.

*Note: Internal management endpoints are not included in this public documentation.*`,
                contact: {
                    name: 'Vawkes Development Team',
                    email: 'dev@vawkes.com'
                },
                license: {
                    name: 'Proprietary',
                    url: 'https://vawkes.com/license'
                }
            },
            servers: [
                {
                    url: 'https://api.gridcube.vawkes.com',
                    description: 'Production API'
                },
                {
                    url: 'https://api.gridcube.dev.vawkes.com',
                    description: 'Development API'
                }
            ],
            tags: [
                { 
                    name: 'Devices', 
                    description: 'Device management and monitoring endpoints. Get device status, data, and control device operations.' 
                },
                { 
                    name: 'Events', 
                    description: 'Event management endpoints. Send commands and events to control device behavior and track device activities.' 
                },
                { 
                    name: 'Authentication', 
                    description: 'User authentication and authorization endpoints. Register, login, and manage user sessions.' 
                }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'JWT token obtained from authentication endpoints. Include in Authorization header as "Bearer <token>".'
                    }
                },
                schemas: {
                    Error: {
                        type: 'object',
                        properties: {
                            error: {
                                type: 'string',
                                description: 'Error message'
                            },
                            code: {
                                type: 'string',
                                description: 'Error code for programmatic handling'
                            },
                            details: {
                                type: 'object',
                                description: 'Additional error details'
                            }
                        },
                        required: ['error']
                    },
                    Pagination: {
                        type: 'object',
                        properties: {
                            page: {
                                type: 'integer',
                                description: 'Current page number',
                                minimum: 1
                            },
                            limit: {
                                type: 'integer',
                                description: 'Number of items per page',
                                minimum: 1,
                                maximum: 100
                            },
                            total: {
                                type: 'integer',
                                description: 'Total number of items'
                            },
                            pages: {
                                type: 'integer',
                                description: 'Total number of pages'
                            }
                        }
                    }
                },
                responses: {
                    UnauthorizedError: {
                        description: 'Authentication required',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    },
                    ForbiddenError: {
                        description: 'Insufficient permissions',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    },
                    NotFoundError: {
                        description: 'Resource not found',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    },
                    ValidationError: {
                        description: 'Invalid request data',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    },
                    ServerError: {
                        description: 'Internal server error',
                        content: {
                            'application/json': {
                                schema: {
                                    $ref: '#/components/schemas/Error'
                                }
                            }
                        }
                    }
                }
            },
            security: [
                { bearerAuth: [] }
            ],
            externalDocs: {
                description: 'Vawkes GridCube Documentation',
                url: 'https://docs.vawkes.com/gridcube'
            }
        },
    })
)

// Add API reference documentation
publicRoutes.get(
    '/docs',
    apiReference({
        theme: 'saturn',
        spec: { url: '/public/openapi' },
        configuration: {
            title: 'Vawkes GridCube API Documentation',
            description: 'Comprehensive API documentation for Vawkes GridCube device management and monitoring',
            theme: {
                primaryColor: '#2563eb',
                sidebar: {
                    backgroundColor: '#f8fafc',
                    textColor: '#1e293b'
                }
            }
        }
    })
)

// Mount the public routes at /public
app.route('/public', publicRoutes)

// Add a middleware that logs all incoming requests for debugging
app.use('*', async (c, next) => {
    console.log(`Request received: ${c.req.method} ${c.req.path}`);
    console.log('Headers:', JSON.stringify(c.req.header()));
    await next();
    console.log(`Response status: ${c.res.status}`);
})

// Add authentication middleware to protected routes
// Protected routes must be defined AFTER mounting public routes
const protectedRoutes = new Hono();
protectedRoutes.use('/*', auth);
protectedRoutes.route('/devices', devices);
protectedRoutes.route('/events', events);
protectedRoutes.route('/companies', companies);

// Mount the protected routes at the root level
app.route('/', protectedRoutes);

// Export the handler
export const handler = handle(app);