import { z } from '@hono/zod-openapi'

enum EventType {
    LOAD_UP = "LOAD_UP",
    GRID_EMERGENCY = "GRID_EMERGENCY",
    CRITICAL_PEAK = "CRITICAL_PEAK",
    START_SHED = "START_SHED",
    END_SHED = "END_SHED",
    INFO_REQUEST = "INFO_REQUEST",
}

// Define device ID schema that accepts either a single UUID or an array of UUIDs
const deviceIdSchema = z.union([
    z.string().uuid(),
    z.array(z.string().uuid())
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

const eventRequestSchema = z.object({
    event_id: z.string().uuid(),
    event_type: z.nativeEnum(EventType),
}).and(
    z.union([
        z.object({ event_type: z.literal(EventType.LOAD_UP), event_data: loadUpSchema }),
        z.object({ event_type: z.literal(EventType.GRID_EMERGENCY), event_data: gridEmergencySchema }),
        z.object({ event_type: z.literal(EventType.CRITICAL_PEAK), event_data: criticalPeakSchema }),
        z.object({ event_type: z.literal(EventType.START_SHED), event_data: startShedSchema }),
        z.object({ event_type: z.literal(EventType.END_SHED), event_data: endShedSchema }),
        z.object({ event_type: z.literal(EventType.INFO_REQUEST), event_data: infoRequestSchema }),
    ])
);

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
        device_id: z.string().uuid(),
        error: z.string()
    })).optional()
});

type EventSchemaType = z.infer<typeof eventSchema>;

export { eventsSchema, eventSchema, eventRequestSchema, bulkResponseSchema, EventType, EventSchemaType };