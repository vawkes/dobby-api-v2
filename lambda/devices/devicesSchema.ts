import { z } from '@hono/zod-openapi'

const deviceSchema = z.object({
    updated_at: z.string().optional(), // ISO 8601 date-time string
    cta_version: z.string(),
    firmware_date: z.string(), // Assuming this is a date string
    model_number: z.string(),
    device_id: z.string().uuid(), // Assuming this is a UUID
    device_type: z.string(), // Assuming this is a string, adjust if it's a number
    gridcube_firmware_version: z.string().optional(),
    capability_bitmap: z.string(), // Assuming this is a string, adjust if it's a number
    device_revision: z.string(), // Assuming this is a string, adjust if it's a number
    firmware_version: z.string(),
    serial_number: z.string(),
    vendor_id: z.string(), // Assuming this is a string, adjust if it's a number
});

const devicesSchema = z.array(deviceSchema);

export { devicesSchema, deviceSchema };