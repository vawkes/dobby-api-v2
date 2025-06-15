import { z } from '@hono/zod-openapi'

// Custom validator for 6-digit device ID
const sixDigitDeviceId = z.string().regex(/^\d{6}$/, 'Device ID must be exactly 6 digits');

// Custom validator for device ID that can be either UUID or 6-digit
const deviceIdSchema = z.union([
    z.string().uuid(),
    sixDigitDeviceId
]);

const deviceSchema = z.object({
    updated_at: z.string().optional(), // ISO 8601 date-time string
    cta_version: z.string().optional(),
    firmware_date: z.string().optional(), // Assuming this is a date string
    model_number: z.string().optional(),
    device_id: deviceIdSchema, // Now accepts both UUID and 6-digit ID
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

// Schema for DobbyData table
const deviceDataPoint = z.object({
    device_id: deviceIdSchema, // Now accepts both UUID and 6-digit ID
    timestamp: z.number(), // Timestamp as a number (seconds since epoch)
    cumulative_energy: z.number(),
    instant_power: z.number(),
    msg_number: z.number(),
    operational_state: z.number()
});

const deviceDataSchema = z.array(deviceDataPoint);

export { devicesSchema, deviceSchema, deviceDataSchema, deviceIdSchema };