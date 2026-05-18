import { z } from '@hono/zod-openapi'

enum EventType {
    LOAD_UP = "LOAD_UP",
    GRID_EMERGENCY = "GRID_EMERGENCY",
    CRITICAL_PEAK = "CRITICAL_PEAK",
    START_SHED = "START_SHED",
    END_SHED = "END_SHED",
    INFO_REQUEST = "INFO_REQUEST",
    ADVANCED_LOAD_UP = "ADVANCED_LOAD_UP",
    CUSTOMER_OVERRIDE = "CUSTOMER_OVERRIDE",
    SET_UTC_TIME = "SET_UTC_TIME",
    GET_UTC_TIME = "GET_UTC_TIME",
    SET_BITMAP = 'SET_BITMAP',
    REQUEST_CONNECTION_INFO = 'REQUEST_CONNECTION_INFO',
    START_DATA_PUBLISH = 'START_DATA_PUBLISH',
}

// Custom validator for 6-digit device ID
const sixDigitDeviceId = z.string().regex(/^\d{6}$/, 'Device ID must be exactly 6 digits');

// Define device ID schema that accepts either a single UUID/6-digit ID or an array of UUIDs/6-digit IDs
const deviceIdSchema = z.union([
    z.string().uuid(),
    sixDigitDeviceId,
    z.array(z.union([z.string().uuid(), sixDigitDeviceId]))
]);

const responseTimestampSchema = z.union([z.string().datetime(), z.number().int()]);

const eventSentResponseSchema = z
    .boolean()
    .optional()
    .openapi({
        description: 'Server-owned delivery status. Returned by the API; do not send in event requests.',
        readOnly: true,
    });

const startShedSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    duration: z.number().optional(),
}).passthrough();

const endShedSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime().optional(),
}).passthrough();

const loadUpSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    duration: z.number().optional(),
}).passthrough();

const gridEmergencySchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
}).passthrough();

const criticalPeakSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
}).passthrough();

const infoRequestSchema = z.object({
    device_id: deviceIdSchema,
    timestamp: z.string().datetime().optional(),
}).passthrough();

const advancedLoadUpSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    duration: z
        .number()
        .int()
        .min(0)
        .max(65535)
        .openapi({
            description: 'Event duration in minutes (UInt16). Note: LOAD_UP uses seconds; ADVANCED_LOAD_UP uses minutes.',
            example: 120,
        }),
    value: z
        .number()
        .int()
        .min(0)
        .max(65535)
        .openapi({
            description:
                'CTA-2045 Advanced Load Up Value (UInt16). 0=no-effect (requires units=0xFF). 1..65534=minimum extra energy above normal in Units. 65535=store as much as possible above normal.',
            example: 3,
        }),
    units: z
        .number()
        .int()
        .min(0)
        .max(255)
        .refine((u) => u === 0x00 || u === 0x01 || u === 0x02 || u === 0x03 || u === 0xff, {
            message: 'Invalid units. Allowed: 0,1,2,3,255 (0xFF). Values 0x04..0xFE are reserved.',
        })
        .openapi({
            description:
                'CTA-2045 Units (UInt8). 0=1Wh, 1=10Wh, 2=100Wh, 3=1000Wh(1kWh), 0xFF=special (no-effect only; also used by GetAdvancedLoadUp to indicate inactive).',
            example: 3,
        }),
    suggested_load_up_efficiency: z
        .number()
        .int()
        .min(0)
        .max(255)
        .openapi({
            description: 'Suggested load up efficiency (UInt8). Set to 0 if unused.',
            example: 0,
        }),
    start_randomization: z
        .number()
        .int()
        .min(0)
        .max(255)
        .openapi({ description: 'Start randomization in minutes (UInt8).', example: 0 }),
    end_randomization: z
        .number()
        .int()
        .min(0)
        .max(255)
        .openapi({ description: 'End randomization in minutes (UInt8).', example: 0 }),
}).passthrough();

const customerOverrideSchema = z.object({
    device_id: deviceIdSchema,
    override: z.boolean(),
}).passthrough();

const setUtcTimeSchema = z.object({
    device_id: deviceIdSchema,
    utc_seconds: z.number(),
    utc_offset: z.number(),
    dst_offset: z.number(),
}).passthrough();

const getUtcTimeSchema = z.object({
    device_id: deviceIdSchema,
}).passthrough();

const setBitmapSchema = z.object({
    device_id: deviceIdSchema,
    bit_number: z.number().min(0).max(255),
    set_value: z.boolean(),
}).passthrough();

const requestConnectionInfoSchema = z.object({
    device_id: deviceIdSchema,
}).passthrough();

const startDataPublishSchema = z.object({
    device_id: deviceIdSchema,
    interval_minutes: z.number().min(1).max(65535), // UInt16 range
}).passthrough();

const loadUpResponseSchema = loadUpSchema.extend({
    start_time: responseTimestampSchema,
    event_sent: eventSentResponseSchema,
}).passthrough();

const gridEmergencyResponseSchema = gridEmergencySchema.extend({
    start_time: responseTimestampSchema,
    event_sent: eventSentResponseSchema,
}).passthrough();

const criticalPeakResponseSchema = criticalPeakSchema.extend({
    start_time: responseTimestampSchema,
    event_sent: eventSentResponseSchema,
}).passthrough();

const startShedResponseSchema = startShedSchema.extend({
    start_time: responseTimestampSchema,
    event_sent: eventSentResponseSchema,
}).passthrough();

const endShedResponseSchema = endShedSchema.extend({
    start_time: responseTimestampSchema.optional(),
    event_sent: eventSentResponseSchema,
}).passthrough();

const infoRequestResponseSchema = infoRequestSchema.extend({
    timestamp: responseTimestampSchema.optional(),
    start_time: responseTimestampSchema.optional(),
    event_sent: eventSentResponseSchema,
}).passthrough();

const advancedLoadUpResponseSchema = advancedLoadUpSchema.extend({
    start_time: responseTimestampSchema,
    event_id: z
        .string()
        .uuid()
        .optional()
        .openapi({
            description: 'Server-owned CTA-2045 Event ID sent to the device. Returned by the API; do not send in event requests.',
            example: '8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f',
            readOnly: true,
        }),
    event_sent: eventSentResponseSchema,
}).passthrough();

const customerOverrideResponseSchema = customerOverrideSchema.extend({
    event_sent: eventSentResponseSchema,
}).passthrough();

const setUtcTimeResponseSchema = setUtcTimeSchema.extend({
    event_sent: eventSentResponseSchema,
}).passthrough();

const getUtcTimeResponseSchema = getUtcTimeSchema.extend({
    event_sent: eventSentResponseSchema,
}).passthrough();

const setBitmapResponseSchema = setBitmapSchema.extend({
    event_sent: eventSentResponseSchema,
}).passthrough();

const requestConnectionInfoResponseSchema = requestConnectionInfoSchema.extend({
    event_sent: eventSentResponseSchema,
    last_rx_rssi: z.number().optional().openapi({ description: 'Server-owned last received signal strength indicator.', readOnly: true }),
    last_rx_snr: z.number().optional().openapi({ description: 'Server-owned last received signal-to-noise ratio.', readOnly: true }),
    last_rx_link_type: z.number().optional().openapi({ description: 'Server-owned last received link type.', readOnly: true }),
}).passthrough();

const startDataPublishResponseSchema = startDataPublishSchema.extend({
    event_sent: eventSentResponseSchema,
}).passthrough();

function eventRequestVariant<T extends z.ZodTypeAny>(eventType: EventType, eventData: T, title: string) {
    return z
        .object({
            event_type: z.literal(eventType),
            event_data: eventData,
        })
        .passthrough()
        .openapi({ title });
}

const eventRequestSchema = z.discriminatedUnion('event_type', [
    eventRequestVariant(EventType.LOAD_UP, loadUpSchema, 'LoadUpEventRequest'),
    eventRequestVariant(EventType.GRID_EMERGENCY, gridEmergencySchema, 'GridEmergencyEventRequest'),
    eventRequestVariant(EventType.CRITICAL_PEAK, criticalPeakSchema, 'CriticalPeakEventRequest'),
    eventRequestVariant(EventType.START_SHED, startShedSchema, 'StartShedEventRequest'),
    eventRequestVariant(EventType.END_SHED, endShedSchema, 'EndShedEventRequest'),
    eventRequestVariant(EventType.INFO_REQUEST, infoRequestSchema, 'InfoRequestEventRequest'),
    eventRequestVariant(EventType.ADVANCED_LOAD_UP, advancedLoadUpSchema, 'AdvancedLoadUpEventRequest'),
    eventRequestVariant(EventType.CUSTOMER_OVERRIDE, customerOverrideSchema, 'CustomerOverrideEventRequest'),
    eventRequestVariant(EventType.SET_UTC_TIME, setUtcTimeSchema, 'SetUtcTimeEventRequest'),
    eventRequestVariant(EventType.GET_UTC_TIME, getUtcTimeSchema, 'GetUtcTimeEventRequest'),
    eventRequestVariant(EventType.SET_BITMAP, setBitmapSchema, 'SetBitmapEventRequest'),
    eventRequestVariant(EventType.REQUEST_CONNECTION_INFO, requestConnectionInfoSchema, 'RequestConnectionInfoEventRequest'),
    eventRequestVariant(EventType.START_DATA_PUBLISH, startDataPublishSchema, 'StartDataPublishEventRequest'),
]);

const eventDataResponseSchema = z.union([
    loadUpResponseSchema.openapi({ title: 'LoadUpEventData' }),
    gridEmergencyResponseSchema.openapi({ title: 'GridEmergencyEventData' }),
    criticalPeakResponseSchema.openapi({ title: 'CriticalPeakEventData' }),
    startShedResponseSchema.openapi({ title: 'StartShedEventData' }),
    endShedResponseSchema.openapi({ title: 'EndShedEventData' }),
    infoRequestResponseSchema.openapi({ title: 'InfoRequestEventData' }),
    advancedLoadUpResponseSchema.openapi({ title: 'AdvancedLoadUpEventData' }),
    customerOverrideResponseSchema.openapi({ title: 'CustomerOverrideEventData' }),
    setUtcTimeResponseSchema.openapi({ title: 'SetUtcTimeEventData' }),
    getUtcTimeResponseSchema.openapi({ title: 'GetUtcTimeEventData' }),
    setBitmapResponseSchema.openapi({ title: 'SetBitmapEventData' }),
    requestConnectionInfoResponseSchema.openapi({ title: 'RequestConnectionInfoEventData' }),
    startDataPublishResponseSchema.openapi({ title: 'StartDataPublishEventData' }),
]).openapi({ title: 'EventData', unionOneOf: true } as never);

const eventSchema = z.object({
    event_id: z
        .string()
        .openapi({
            description: 'Canonical server-generated event identifier. Returned by the API; do not send in event requests.',
            example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
            readOnly: true,
        }),
    event_type: z.nativeEnum(EventType),
    event_data: eventDataResponseSchema,
    event_ack: z.boolean().optional().nullable(),
});

const eventsSchema = z.array(eventSchema);

// Schema for bulk operation response
const bulkResponseSchema = z.object({
    successful_events: z.array(eventSchema),
    failed_events: z.array(z.object({
        device_id: deviceIdSchema,
        error: z.string()
    })).optional()
});

type EventSchemaType = z.infer<typeof eventSchema>;

export type { EventSchemaType };
export { eventsSchema, eventSchema, eventRequestSchema, bulkResponseSchema, EventType };
