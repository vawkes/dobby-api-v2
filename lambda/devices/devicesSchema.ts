import { z } from '@hono/zod-openapi'

const deviceSchema = z.object({
    updated_at: z.string().optional(), // ISO 8601 date-time string
    cta_version: z.string().optional(),
    firmware_date: z.string().optional(), // Assuming this is a date string
    model_number: z.string().optional(),
    device_id: z.string().uuid(), // Assuming this is a UUID
    device_type: z.string().optional(), // Assuming this is a string, adjust if it's a number
    gridcube_firmware_version: z.string().optional(),
    capability_bitmap: z.string().optional(), // Assuming this is a string, adjust if it's a number
    device_revision: z.string().optional(), // Assuming this is a string, adjust if it's a number
    firmware_version: z.string().optional(),
    serial_number: z.string().optional(),
    vendor_id: z.string().optional(), // Assuming this is a string, adjust if it's a number
    last_rx_rssi: z.number().optional(), // Signal strength in dBm
    last_link_type: z.number().optional(), // 1 for BLE, 4 for LoRA
});

const devicesSchema = z.array(deviceSchema);

// Schema for ShiftedData table
const deviceDataPoint = z.object({
    device_id: z.string().uuid(),
    timestamp: z.number(), // Timestamp as a number (seconds since epoch)
    cumulative_energy: z.number(),
    instant_power: z.number(),
    msg_number: z.number(),
    operational_state: z.number()
});

const deviceDataSchema = z.array(deviceDataPoint);

export { devicesSchema, deviceSchema, deviceDataSchema };