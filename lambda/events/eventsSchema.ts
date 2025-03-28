import { z } from '@hono/zod-openapi'

enum EventType {
    LOAD_UP = "LOAD_UP",
    GRID_EMERGENCY = "GRID_EMERGENCY",
    CRITICAL_PEAK = "CRITICAL_PEAK",
    START_SHED = "START_SHED",
    END_SHED = "END_SHED",
    INFO_REQUEST = "INFO_REQUEST",
}

const startShedSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
    duration: z.number().optional(),
    event_sent: z.boolean().optional(),
});

const endShedSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime().optional(),
    event_sent: z.boolean().optional(),
});

const loadUpSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
    duration: z.number().optional(),
    event_sent: z.boolean().optional(),
});

const gridEmergencySchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
    event_sent: z.boolean().optional(),
});

const criticalPeakSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
    event_sent: z.boolean().optional(),
});

const infoRequestSchema = z.object({
    device_id: z.string().uuid(),
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

const eventSchema = eventRequestSchema.and(z.object({
    event_id: z.string().uuid(),
}));
type EventSchemaType = z.infer<typeof eventSchema>;

const eventsSchema = z.array(eventSchema);

export { eventsSchema, eventSchema, eventRequestSchema, EventType, EventSchemaType };