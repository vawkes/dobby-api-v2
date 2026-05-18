import { describe, expect, it } from '@jest/globals'
import { createApp } from '../lambda/app.ts'
import { eventRequestSchema } from '../lambda/events/eventsSchema.ts'

type OpenApiObject = Record<string, any>

async function loadSpec(): Promise<OpenApiObject> {
  const response = await createApp().request('/public/openapi')

  expect(response.status).toBe(200)
  return response.json()
}

function eventPost(spec: OpenApiObject): OpenApiObject {
  return spec.paths['/events'].post
}

function requestSchema(spec: OpenApiObject): OpenApiObject {
  return eventPost(spec).requestBody.content['application/json'].schema
}

function requestExamples(spec: OpenApiObject): OpenApiObject[] {
  return Object.values(eventPost(spec).requestBody.content['application/json'].examples).map((example: any) => example.value)
}

function hasKeyDeep(value: unknown, key: string): boolean {
  if (!value || typeof value !== 'object') {
    return false
  }

  if (Object.prototype.hasOwnProperty.call(value, key)) {
    return true
  }

  return Object.values(value).some((child) => hasKeyDeep(child, key))
}

describe('VAW-6 OpenAPI docs', () => {
  it('documents event request payloads without server-owned fields', async () => {
    const spec = await loadSpec()
    const variants = requestSchema(spec).oneOf

    expect(variants).toHaveLength(13)
    for (const variant of variants) {
      expect(variant.properties.event_id).toBeUndefined()
      expect(variant.properties.event_data.properties.event_id).toBeUndefined()
      expect(variant.properties.event_data.properties.event_sent).toBeUndefined()
      expect(variant.required).toEqual(['event_type', 'event_data'])
    }

    for (const example of requestExamples(spec)) {
      expect(hasKeyDeep(example, 'event_id')).toBe(false)
      expect(hasKeyDeep(example, 'event_sent')).toBe(false)
      expect(eventRequestSchema.safeParse(example).success).toBe(true)
    }
  })

  it('labels event request variants with concrete schema names', async () => {
    const spec = await loadSpec()
    const labels = requestSchema(spec).oneOf.map((variant: OpenApiObject) => {
      if (typeof variant.$ref === 'string') {
        return variant.$ref.split('/').pop()
      }
      return variant.title
    })

    expect(labels).toEqual([
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
    ])
  })

  it('documents server-owned event response fields as response-only', async () => {
    const spec = await loadSpec()
    const responseSchema = eventPost(spec).responses[200].content['application/json'].schema
    const eventSchema = responseSchema.properties.successful_events.items

    expect(eventSchema.properties.event_id.readOnly).toBe(true)
    expect(eventSchema.properties.event_id.description).toContain('server-generated')
    expect(eventSchema.properties.event_data.oneOf).toBeDefined()
    expect(JSON.stringify(eventSchema.properties.event_data)).toContain('event_sent')
  })

  it('includes auth request, success, and error examples', async () => {
    const spec = await loadSpec()
    const authPaths = [
      '/public/auth/register',
      '/public/auth/confirm-registration',
      '/public/auth/login',
      '/public/auth/forgot-password',
      '/public/auth/reset-password',
      '/public/auth/refresh-token',
    ]

    for (const path of authPaths) {
      const operation = spec.paths[path].post
      const requestJson = operation.requestBody.content['application/json']
      const successStatus = operation.responses[201] ? 201 : 200
      const successJson = operation.responses[successStatus].content['application/json']
      const errorStatus = operation.responses[401] ? 401 : 400
      const errorJson = operation.responses[errorStatus].content['application/json']

      expect(requestJson.example || requestJson.examples).toBeDefined()
      expect(successJson.example || successJson.examples).toBeDefined()
      expect(errorJson.example || errorJson.examples).toBeDefined()
    }
  })
})
