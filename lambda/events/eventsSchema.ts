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

const startShedSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    duration: z.number().optional(),
    event_sent: z.boolean().optional(),
});

const endShedSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime().optional(),
    event_sent: z.boolean().optional(),
});

const loadUpSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    duration: z.number().optional(),
    event_sent: z.boolean().optional(),
});

const gridEmergencySchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    event_sent: z.boolean().optional(),
});

const criticalPeakSchema = z.object({
    device_id: deviceIdSchema,
    start_time: z.string().datetime(),
    event_sent: z.boolean().optional(),
});

const infoRequestSchema = z.object({
    device_id: deviceIdSchema,
    timestamp: z.string().datetime().optional(),
    event_sent: z.boolean().optional(),
});

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
    event_id: z
        .string()
        .uuid()
        .openapi({
            description:
                'CTA-2045 Event ID. This is sent to the device (GridCube encodes the first 4 bytes of the UUID). Recommended: reuse the top-level event_id.',
            example: '8d0b2c2e-2b8d-4d11-9f54-6d8c5d7b2a1f',
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
    event_sent: z.boolean().optional(),
});

const customerOverrideSchema = z.object({
    device_id: deviceIdSchema,
    override: z.boolean(),
    event_sent: z.boolean().optional(),
});

const setUtcTimeSchema = z.object({
    device_id: deviceIdSchema,
    utc_seconds: z.number(),
    utc_offset: z.number(),
    dst_offset: z.number(),
    event_sent: z.boolean().optional(),
});

const getUtcTimeSchema = z.object({
    device_id: deviceIdSchema,
    event_sent: z.boolean().optional(),
});

const setBitmapSchema = z.object({
    device_id: deviceIdSchema,
    bit_number: z.number().min(0).max(255),
    set_value: z.boolean(),
    event_sent: z.boolean().optional()
});

const requestConnectionInfoSchema = z.object({
    device_id: deviceIdSchema,
    event_sent: z.boolean().optional(),
    last_rx_rssi: z.number().optional(),  // Last received signal strength indicator
    last_rx_snr: z.number().optional(),   // Last received signal-to-noise ratio
    last_rx_link_type: z.number().optional()  // Last received link type
});

const startDataPublishSchema = z.object({
    device_id: deviceIdSchema,
    interval_minutes: z.number().min(1).max(65535), // UInt16 range
    event_sent: z.boolean().optional(),
});

const eventRequestSchema = z.discriminatedUnion('event_type', [
    z.object({ event_id: z.string(), event_type: z.literal(EventType.LOAD_UP), event_data: loadUpSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.GRID_EMERGENCY), event_data: gridEmergencySchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.CRITICAL_PEAK), event_data: criticalPeakSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.START_SHED), event_data: startShedSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.END_SHED), event_data: endShedSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.INFO_REQUEST), event_data: infoRequestSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.ADVANCED_LOAD_UP), event_data: advancedLoadUpSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.CUSTOMER_OVERRIDE), event_data: customerOverrideSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.SET_UTC_TIME), event_data: setUtcTimeSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.GET_UTC_TIME), event_data: getUtcTimeSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.SET_BITMAP), event_data: setBitmapSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.REQUEST_CONNECTION_INFO), event_data: requestConnectionInfoSchema }),
    z.object({ event_id: z.string(), event_type: z.literal(EventType.START_DATA_PUBLISH), event_data: startDataPublishSchema }),
]);

const eventSchema = z.object({
    event_id: z.string(),
    event_type: z.nativeEnum(EventType),
    event_data: z.object({}).passthrough(),
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
