import { handle } from 'hono/aws-lambda'
import devices from './devices/devices'
import events from './events/events'
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
    origin: ['http://localhost:3000', 'https://localhost:3000', 'https://d1dz25mfg0xsp8.cloudfront.net', '*'],
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

// Create a full app for OpenAPI documentation that includes all routes
const fullApp = new Hono()
fullApp.route('/devices', devices)
fullApp.route('/events', events)
fullApp.route('/public/auth', authRoutes)

// Add OpenAPI documentation to public routes
publicRoutes.get(
    '/openapi',
    openAPISpecs(fullApp, {
        documentation: {
            info: {
                title: 'Vawkes GridCube API',
                version: '1.0.0',
                description: 'API for interacting with Vawkes GridCube devices.'
            },
            servers: [],
            tags: [
                { name: 'Devices', description: 'Device management endpoints' },
                { name: 'Events', description: 'Event data endpoints' },
                { name: 'Authentication', description: 'User authentication endpoints' }
            ],
            components: {
                securitySchemes: {
                    bearerAuth: {
                        type: 'http',
                        scheme: 'bearer',
                        bearerFormat: 'JWT',
                        description: 'Enter JWT token for authentication'
                    }
                }
            },
            security: [
                { bearerAuth: [] }
            ]
        },
    })
)

// Add API documentation UI to public routes
publicRoutes.get(
    '/docs',
    apiReference({
        theme: 'saturn',
        spec: { url: '/prod/public/openapi' },
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

// Mount the protected routes at the root level
app.route('/', protectedRoutes);

// Export the handler
export const handler = handle(app);