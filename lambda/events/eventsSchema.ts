import { z } from '@hono/zod-openapi'

enum EventType {
    LOAD_UP = "LOAD_UP",
    GRID_EMERGENCY = "GRID_EMERGENCY",
    CRITICAL_PEAK = "CRITICAL_PEAK",
    START_SHED = "START_SHED",
    END_SHED = "END_SHED",
}

const startShedSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
});

const endShedSchema = z.object({
    device_id: z.string().uuid()
});

const loadUpSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
});

const gridEmergencySchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
});

const criticalPeakSchema = z.object({
    device_id: z.string().uuid(),
    start_time: z.string().datetime(),
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
    ])
);

const eventSchema = eventRequestSchema.and(z.object({
    event_id: z.string().uuid(),
}));

const eventsSchema = z.array(eventSchema);

export { eventsSchema, eventSchema, eventRequestSchema, EventType };