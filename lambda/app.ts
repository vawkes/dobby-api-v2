import { Hono } from 'hono'
import { openAPISpecs } from 'hono-openapi'
import { cors } from 'hono/cors'

import devices from './devices/devices'
import events from './events/events'
import companies from './companies/companies.ts'
import authRoutes from './utils/authRoutes'
import { auth } from './utils/auth'

type OpenApiContent = {
  example?: unknown
  examples?: Record<string, unknown>
  schema?: Record<string, unknown>
}

type OpenApiOperation = {
  description?: string
  requestBody?: {
    required?: boolean
    content?: Record<string, OpenApiContent>
  }
  responses?: Record<string, { content?: Record<string, OpenApiContent>; description?: string }>
  security?: Record<string, unknown>[]
}

type OpenApiSpec = Record<string, any> & {
  components?: Record<string, any>
  paths?: Record<string, { post?: OpenApiOperation }>
}

const eventRequestSchemaTitles = [
  'LoadUpEventRequest',
  'GridEmergencyEventRequest',
  'CriticalPeakEventRequest',
  'StartShedEventRequest',
  'EndShedEventRequest',
  'InfoRequestEventRequest',
  'AdvancedLoadUpEventRequest',
  'CustomerOverrideEventRequest',
  'SetUtcTimeEventRequest',
  'GetUtcTimeEventRequest',
  'SetBitmapEventRequest',
  'RequestConnectionInfoEventRequest',
  'StartDataPublishEventRequest',
]

const eventDataSchemaTitles = [
  'LoadUpEventData',
  'GridEmergencyEventData',
  'CriticalPeakEventData',
  'StartShedEventData',
  'EndShedEventData',
  'InfoRequestEventData',
  'AdvancedLoadUpEventData',
  'CustomerOverrideEventData',
  'SetUtcTimeEventData',
  'GetUtcTimeEventData',
  'SetBitmapEventData',
  'RequestConnectionInfoEventData',
  'StartDataPublishEventData',
]

const deviceIdOpenApiSchema = {
  anyOf: [
    { type: 'string', format: 'uuid' },
    { type: 'string', pattern: '^\\d{6}$' },
    {
      type: 'array',
      items: {
        anyOf: [
          { type: 'string', format: 'uuid' },
          { type: 'string', pattern: '^\\d{6}$' },
        ],
      },
    },
  ],
}

function eventDataSchema(properties: Record<string, unknown>, required: string[] = ['device_id']) {
  return {
    type: 'object',
    properties: {
      device_id: deviceIdOpenApiSchema,
      ...properties,
    },
    required,
  }
}

function makeEventRequestOpenApiSchema() {
  const variants = [
    {
      type: 'LOAD_UP',
      data: eventDataSchema(
        {
          start_time: { type: 'string', format: 'date-time' },
          duration: { type: 'number' },
        },
        ['device_id', 'start_time'],
      ),
    },
    {
      type: 'GRID_EMERGENCY',
      data: eventDataSchema({ start_time: { type: 'string', format: 'date-time' } }, ['device_id', 'start_time']),
    },
    {
      type: 'CRITICAL_PEAK',
      data: eventDataSchema({ start_time: { type: 'string', format: 'date-time' } }, ['device_id', 'start_time']),
    },
    {
      type: 'START_SHED',
      data: eventDataSchema(
        {
          start_time: { type: 'string', format: 'date-time' },
          duration: { type: 'number' },
        },
        ['device_id', 'start_time'],
      ),
    },
    {
      type: 'END_SHED',
      data: eventDataSchema({ start_time: { type: 'string', format: 'date-time' } }),
    },
    {
      type: 'INFO_REQUEST',
      data: eventDataSchema({ timestamp: { type: 'string', format: 'date-time' } }),
    },
    {
      type: 'ADVANCED_LOAD_UP',
      data: eventDataSchema(
        {
          start_time: { type: 'string', format: 'date-time' },
          duration: { type: 'integer', minimum: 0, maximum: 65535 },
          value: { type: 'integer', minimum: 0, maximum: 65535 },
          units: { type: 'integer', minimum: 0, maximum: 255 },
          suggested_load_up_efficiency: { type: 'integer', minimum: 0, maximum: 255 },
          start_randomization: { type: 'integer', minimum: 0, maximum: 255 },
          end_randomization: { type: 'integer', minimum: 0, maximum: 255 },
        },
        [
          'device_id',
          'start_time',
          'duration',
          'value',
          'units',
          'suggested_load_up_efficiency',
          'start_randomization',
          'end_randomization',
        ],
      ),
    },
    {
      type: 'CUSTOMER_OVERRIDE',
      data: eventDataSchema({ override: { type: 'boolean' } }, ['device_id', 'override']),
    },
    {
      type: 'SET_UTC_TIME',
      data: eventDataSchema(
        {
          utc_seconds: { type: 'number' },
          utc_offset: { type: 'number' },
          dst_offset: { type: 'number' },
        },
        ['device_id', 'utc_seconds', 'utc_offset', 'dst_offset'],
      ),
    },
    { type: 'GET_UTC_TIME', data: eventDataSchema({}) },
    {
      type: 'SET_BITMAP',
      data: eventDataSchema(
        {
          bit_number: { type: 'number', minimum: 0, maximum: 255 },
          set_value: { type: 'boolean' },
        },
        ['device_id', 'bit_number', 'set_value'],
      ),
    },
    { type: 'REQUEST_CONNECTION_INFO', data: eventDataSchema({}) },
    {
      type: 'START_DATA_PUBLISH',
      data: eventDataSchema({ interval_minutes: { type: 'number', minimum: 1, maximum: 65535 } }, [
        'device_id',
        'interval_minutes',
      ]),
    },
  ]

  return {
    oneOf: variants.map((variant, index) => ({
      title: eventRequestSchemaTitles[index],
      type: 'object',
      properties: {
        event_type: { type: 'string', const: variant.type },
        event_data: variant.data,
      },
      required: ['event_type', 'event_data'],
    })),
    discriminator: { propertyName: 'event_type' },
  }
}

function ensureOpenApiComponents(spec: OpenApiSpec) {
  spec.components = spec.components || {}
  spec.components.schemas = spec.components.schemas || {}
  spec.components.securitySchemes = spec.components.securitySchemes || {}

  spec.components.securitySchemes.bearerAuth = {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Send the login or refresh token as `Authorization: Bearer <token>` on protected endpoints.',
  }

  spec.components.schemas.Error = {
    type: 'object',
    properties: {
      message: { type: 'string', example: 'Unauthorized - Invalid token' },
      error: { type: 'string', example: 'Token expired' },
    },
  }
}

function annotateEventSchemas(spec: OpenApiSpec) {
  const postEvents = spec.paths?.['/events']?.post
  const appJson = postEvents?.requestBody?.content?.['application/json']
  const eventRequestSchema = appJson?.schema as Record<string, any> | undefined

  if (appJson && (!eventRequestSchema || Object.keys(eventRequestSchema).length === 0)) {
    appJson.schema = makeEventRequestOpenApiSchema()
  }

  if (Array.isArray(eventRequestSchema?.oneOf)) {
    eventRequestSchema.discriminator = { propertyName: 'event_type' }
    eventRequestSchema.oneOf.forEach((variant: Record<string, unknown>, index: number) => {
      variant.title = eventRequestSchemaTitles[index]
    })
  }

  const responseSchema = postEvents?.responses?.['200']?.content?.['application/json']?.schema as Record<string, any> | undefined
  const eventSchema = responseSchema?.properties?.successful_events?.items
  const eventId = eventSchema?.properties?.event_id
  if (eventId) {
    eventId.readOnly = true
    eventId.description = 'Canonical server-generated event identifier. Returned by the API; do not send in event requests.'
  }

  const eventData = eventSchema?.properties?.event_data
  if (eventData?.anyOf && !eventData.oneOf) {
    eventData.oneOf = eventData.anyOf
    delete eventData.anyOf
  }

  if (Array.isArray(eventData?.oneOf)) {
    eventData.oneOf.forEach((variant: Record<string, any>, index: number) => {
      variant.title = eventDataSchemaTitles[index]

      const eventSent = variant.properties?.event_sent
      if (eventSent) {
        eventSent.readOnly = true
        eventSent.description = 'Server-owned delivery status. Returned by the API; do not send in event requests.'
      }

      const ctaEventId = variant.properties?.event_id
      if (ctaEventId) {
        ctaEventId.readOnly = true
        ctaEventId.description = 'Server-owned CTA-2045 Event ID sent to the device. Returned by the API; do not send in event requests.'
      }
    })
  }
}

function addAuthExamples(spec: OpenApiSpec) {
  const authDocs: Record<
    string,
    {
      requestSchema: Record<string, unknown>
      requestExample: Record<string, unknown>
      successStatus: '200' | '201'
      successExample: Record<string, unknown>
      errorStatus: '400' | '401'
      errorExample: Record<string, unknown>
      description: string
    }
  > = {
    '/public/auth/register': {
      requestSchema: {
        type: 'object',
        required: ['email', 'password', 'name'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          name: { type: 'string' },
        },
      },
      requestExample: { email: 'newuser@example.com', password: 'SecurePass123!', name: 'Jane Doe' },
      successStatus: '201',
      successExample: {
        message: 'User registration successful. Please check your email for confirmation code.',
        userId: '12345678-1234-1234-1234-123456789012',
      },
      errorStatus: '400',
      errorExample: { message: 'Registration failed', error: 'User already exists' },
      description: 'Requires `Content-Type: application/json`. No Authorization header is required.',
    },
    '/public/auth/confirm-registration': {
      requestSchema: {
        type: 'object',
        required: ['email', 'confirmationCode'],
        properties: {
          email: { type: 'string', format: 'email' },
          confirmationCode: { type: 'string' },
        },
      },
      requestExample: { email: 'newuser@example.com', confirmationCode: '123456' },
      successStatus: '200',
      successExample: { message: 'Email confirmed successfully. You can now log in.' },
      errorStatus: '400',
      errorExample: { message: 'Confirmation failed', error: 'Invalid verification code provided' },
      description: 'Requires `Content-Type: application/json`. No Authorization header is required.',
    },
    '/public/auth/login': {
      requestSchema: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' },
        },
      },
      requestExample: { email: 'user@example.com', password: 'SecurePass123!' },
      successStatus: '200',
      successExample: {
        message: 'Login successful',
        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.example',
        refreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.example',
        expiresIn: 3600,
      },
      errorStatus: '401',
      errorExample: { message: 'Login failed', error: 'Incorrect username or password.' },
      description:
        'Requires `Content-Type: application/json`. Use the returned `token` as `Authorization: Bearer <token>` on protected endpoints.',
    },
    '/public/auth/forgot-password': {
      requestSchema: {
        type: 'object',
        required: ['email'],
        properties: { email: { type: 'string', format: 'email' } },
      },
      requestExample: { email: 'user@example.com' },
      successStatus: '200',
      successExample: { message: 'Password reset code sent to your email' },
      errorStatus: '400',
      errorExample: { message: 'Password reset request failed', error: 'User not found' },
      description: 'Requires `Content-Type: application/json`. No Authorization header is required.',
    },
    '/public/auth/reset-password': {
      requestSchema: {
        type: 'object',
        required: ['email', 'confirmationCode', 'newPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          confirmationCode: { type: 'string' },
          newPassword: { type: 'string', minLength: 8 },
        },
      },
      requestExample: { email: 'user@example.com', confirmationCode: '123456', newPassword: 'NewSecurePass123!' },
      successStatus: '200',
      successExample: { message: 'Password reset successful. You can now log in with your new password.' },
      errorStatus: '400',
      errorExample: { message: 'Password reset failed', error: 'Invalid verification code provided' },
      description: 'Requires `Content-Type: application/json`. No Authorization header is required.',
    },
    '/public/auth/refresh-token': {
      requestSchema: {
        type: 'object',
        required: ['refreshToken'],
        properties: { refreshToken: { type: 'string', description: 'Refresh token returned by login.' } },
      },
      requestExample: { refreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.example' },
      successStatus: '200',
      successExample: {
        message: 'Token refresh successful',
        token: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.example',
        refreshToken: 'eyJjdHkiOiJKV1QiLCJlbmMiOiJBMjU2R0NNIiwiYWxnIjoiUlNBLU9BRVAifQ.example',
        expiresIn: 3600,
      },
      errorStatus: '401',
      errorExample: { message: 'Token refresh failed', error: 'Refresh Token has expired' },
      description:
        'Requires `Content-Type: application/json`. Send the refresh token in the JSON body; no Authorization header is required.',
    },
  }

  for (const [path, docs] of Object.entries(authDocs)) {
    const operation = spec.paths?.[path]?.post
    if (!operation) {
      continue
    }

    operation.security = []
    operation.description = `${operation.description || ''}\n\n${docs.description}`.trim()
    operation.requestBody = {
      required: true,
      content: {
        'application/json': {
          schema: docs.requestSchema,
          examples: {
            validRequest: {
              summary: 'Valid request',
              value: docs.requestExample,
            },
          },
        },
      },
    }

    const successJson = operation.responses?.[docs.successStatus]?.content?.['application/json']
    if (successJson) {
      successJson.examples = {
        success: {
          summary: 'Successful response',
          value: docs.successExample,
        },
      }
    }

    const errorJson = operation.responses?.[docs.errorStatus]?.content?.['application/json']
    if (errorJson) {
      errorJson.examples = {
        commonError: {
          summary: 'Common error response',
          value: docs.errorExample,
        },
      }
    }
  }
}

// Main Hono app factory.
// Exported so we can run the exact same app in AWS Lambda and a local Node server.
export function createApp() {
  const app = new Hono()
  const noopNext = async () => {}

  // Add CORS middleware to handle cross-origin requests
  app.use(
    '*',
    cors({
      origin: [
        'http://localhost:3000',
        'https://localhost:3000',
        'http://localhost:3001', // Additional localhost port
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
      exposeHeaders: ['Content-Length', 'Content-Type'],
    }),
  )

  // Create a separate router for public routes
  const publicRoutes = new Hono()

  // Add auth routes to public routes (do this first so the routes are included in OpenAPI spec)
  publicRoutes.route('/auth', authRoutes)

  // Create a public-facing app for OpenAPI documentation (excludes internal management endpoints)
  const publicApiApp = new Hono()
  publicApiApp.route('/devices', devices)
  publicApiApp.route('/events', events)
  publicApiApp.route('/public/auth', authRoutes)

  // Add OpenAPI documentation to public routes.
  // We wrap hono-openapi's handler so we can post-process the generated spec (e.g., inject request examples)
  // without fighting middleware merge order (zValidator vs describeRoute).
  const openapiBaseHandler = openAPISpecs(publicApiApp, {
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
        contact: { name: 'Vawkes Development Team', email: 'dev@vawkes.com' },
        license: { name: 'Proprietary', url: 'https://vawkes.com/license' },
      },
      servers: [
        { url: 'https://api.gridcube.vawkes.com', description: 'Production API' },
        { url: 'https://api.gridcube.dev.vawkes.com', description: 'Development API' },
      ],
      tags: [
        {
          name: 'Devices',
          description: 'Device management and monitoring endpoints. Get device status, data, and control device operations.',
        },
        {
          name: 'Events',
          description: 'Event management endpoints. Send commands and events to control device behavior and track device activities.',
        },
        { name: 'Authentication', description: 'Authentication endpoints. Obtain JWT tokens and manage user access.' },
      ],
      externalDocs: {
        description: 'Vawkes GridCube Documentation',
        url: 'https://docs.vawkes.com/gridcube',
      },
    },
  })

  let cachedOpenApiSpec: OpenApiSpec | null = null
  publicRoutes.get('/openapi', async (c) => {
    if (!cachedOpenApiSpec) {
      const res = await openapiBaseHandler(c, noopNext)
      if (!res) {
        throw new Error('OpenAPI middleware did not return a response')
      }

      const spec = (await res.json()) as OpenApiSpec

      // Inject copy/paste examples for CTA-2045 Advanced Load Up.
      // Some requestBody fields are generated by zValidator docs and would otherwise drop describeRoute examples.
      try {
        ensureOpenApiComponents(spec)
        annotateEventSchemas(spec)
        addAuthExamples(spec)

        const postEvents = spec?.paths?.['/events']?.post
        const appJson = postEvents?.requestBody?.content?.['application/json']
        if (appJson && typeof appJson === 'object') {
          appJson.examples = {
            ...(appJson.examples || {}),
            advancedLoadUpKwh: {
              summary: 'CTA-2045 Advanced Load Up (example: minimum +3 kWh above normal)',
              value: {
                event_type: 'ADVANCED_LOAD_UP',
                event_data: {
                  device_id: '000012',
                  start_time: '2026-02-10T20:00:00Z',
                  duration: 120,
                  value: 3,
                  units: 3,
                  suggested_load_up_efficiency: 0,
                  start_randomization: 0,
                  end_randomization: 0,
                },
              },
            },
            advancedLoadUpNoEffect: {
              summary: 'CTA-2045 Advanced Load Up (no-effect / capability check)',
              value: {
                event_type: 'ADVANCED_LOAD_UP',
                event_data: {
                  device_id: '000012',
                  start_time: '2026-02-10T20:00:00Z',
                  duration: 15,
                  value: 0,
                  units: 255,
                  suggested_load_up_efficiency: 0,
                  start_randomization: 0,
                  end_randomization: 0,
                },
              },
            },
          }
        }
      } catch (e) {
        // If the spec shape changes, fail open (still serve base spec).
        console.warn('Failed to inject OpenAPI examples:', e)
      }

      cachedOpenApiSpec = spec
    }

    return c.json(cachedOpenApiSpec)
  })

  // Add API reference documentation
  // NOTE: @scalar/hono-api-reference is ESM-only, so we load it via dynamic import to work in CJS builds.
  publicRoutes.get('/docs', async (c) => {
    const mod = await import('@scalar/hono-api-reference')
    const handler = mod.apiReference({
      theme: 'saturn',
      spec: { url: '/public/openapi' },
      configuration: {
        title: 'Vawkes GridCube API Documentation',
        description: 'Comprehensive API documentation for Vawkes GridCube device management and monitoring',
        theme: {
          primaryColor: '#2563eb',
          sidebar: { backgroundColor: '#f8fafc', textColor: '#1e293b' },
        },
      },
    } as never)
    const res = await handler(c, noopNext)
    if (!res) {
      throw new Error('Scalar API reference middleware did not return a response')
    }

    return res
  })

  // Mount the public routes at /public
  app.route('/public', publicRoutes)

  // Add a middleware that logs all incoming requests for debugging
  app.use('*', async (c, next) => {
    console.log(`Request received: ${c.req.method} ${c.req.path}`)
    console.log('Headers:', JSON.stringify(c.req.header()))
    await next()
    console.log(`Response status: ${c.res.status}`)
  })

  // Add authentication middleware to protected routes
  // Protected routes must be defined AFTER mounting public routes
  const protectedRoutes = new Hono()
  protectedRoutes.use('/*', auth)
  protectedRoutes.route('/devices', devices)
  protectedRoutes.route('/events', events)
  protectedRoutes.route('/companies', companies)

  // Mount the protected routes at the root level
  app.route('/', protectedRoutes)

  return app
}
