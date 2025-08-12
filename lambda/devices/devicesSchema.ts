import { z } from '@hono/zod-openapi'
import { deviceIdSchema as sharedDeviceIdSchema, wirelessDeviceIdSchema, gpsTimestampSchema, messageNumberSchema } from '../../shared/schemas/primitives'

// Custom validator for device ID that can be either UUID or 6-digit
const deviceIdSchema = z.union([
    wirelessDeviceIdSchema,
    sharedDeviceIdSchema
]);

const deviceSchema = z.object({
    updated_at: z.string().optional(), // ISO 8601 date-time string
    cta_version: z.string().optional(),
    firmware_date: z.string().optional(), // Assuming this is a date string
    model_number: z.string().optional(),
    device_id: deviceIdSchema, // Now accepts both UUID and 6-digit ID
    device_type: z.coerce.string().optional(), // Coerce numbers to strings for resilience
    gridcube_firmware_version: z.string().optional(),
    capability_bitmap: z.coerce.string().optional(), // Coerce numbers to strings for resilience
    device_revision: z.coerce.string().optional(), // Coerce numbers to strings for resilience
    firmware_version: z.string().optional(),
    serial_number: z.string().optional(),
    vendor_id: z.coerce.string().optional(), // Coerce numbers to strings for resilience
    last_rx_rssi: z.number().optional(), // Signal strength in dBm
    last_link_type: z.number().optional(), // 1 for BLE, 4 for LoRA
});

const devicesSchema = z.array(deviceSchema);

// Schema for DobbyData table
const deviceDataPoint = z.object({
    device_id: deviceIdSchema, // Now accepts both UUID and 6-digit ID
    timestamp: gpsTimestampSchema, // GPS timestamp as a number (seconds since epoch)
    cumulative_energy: z.number(),
    instant_power: z.number(),
    msg_number: messageNumberSchema,
    operational_state: z.number()
});

const deviceDataSchema = z.array(deviceDataPoint);

export { devicesSchema, deviceSchema, deviceDataSchema, deviceIdSchema };