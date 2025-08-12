import { z } from 'zod';
import { 
  wirelessDeviceIdSchema, 
  deviceIdSchema, 
  gpsTimestampSchema, 
  messageNumberSchema 
} from './primitives';

/**
 * Unified device data schemas for consistent handling across the stack
 * 
 * These schemas handle the data collected from devices and stored in DynamoDB.
 * The main challenge is handling bigint values consistently across different contexts.
 */

// Base device data schema (internal representation)
export const deviceDataSchema = z.object({
  device_id: wirelessDeviceIdSchema, // Always UUID for internal storage
  timestamp: gpsTimestampSchema, // GPS epoch timestamp (seconds)
  message_number: messageNumberSchema,
  
  // Energy/power values - handle bigint properly for different contexts
  instant_power: z.union([
    z.bigint(),
    z.number(),
    z.string().transform(val => BigInt(val))
  ]).transform(val => BigInt(val)).optional(),
  
  cumulative_energy: z.union([
    z.bigint(), 
    z.number(),
    z.string().transform(val => BigInt(val))
  ]).transform(val => BigInt(val)).optional(),
  
  operational_state: z.number().int().min(0).max(255).optional(), // Byte value
});

// API representation (for frontend consumption)
export const deviceDataApiSchema = z.object({
  device_id: deviceIdSchema, // 6-digit for API responses
  timestamp: gpsTimestampSchema,
  message_number: messageNumberSchema,
  
  // Convert bigint to number for JSON serialization
  instant_power: z.number().optional(),
  cumulative_energy: z.number().optional(),
  operational_state: z.number().int().min(0).max(255).optional(),
});

// DynamoDB storage schema (handles string storage of bigint values)
export const deviceDataDbSchema = z.object({
  device_id: wirelessDeviceIdSchema, // UUID for storage
  timestamp: gpsTimestampSchema,
  message_number: messageNumberSchema,
  
  // DynamoDB stores bigint as strings to avoid precision loss
  instant_power: z.union([
    z.string(), // From DynamoDB
    z.bigint().transform(val => val.toString()), // To DynamoDB
    z.number().transform(val => BigInt(val).toString()) // Conversion
  ]).optional(),
  
  cumulative_energy: z.union([
    z.string(), // From DynamoDB  
    z.bigint().transform(val => val.toString()), // To DynamoDB
    z.number().transform(val => BigInt(val).toString()) // Conversion
  ]).optional(),
  
  operational_state: z.number().int().min(0).max(255).optional(),
});

// Export inferred types
export type DeviceData = z.infer<typeof deviceDataSchema>;
export type DeviceDataApi = z.infer<typeof deviceDataApiSchema>;
export type DeviceDataDb = z.infer<typeof deviceDataDbSchema>;

/**
 * Transformation utilities for converting between contexts
 */
export class DeviceDataTransformer {
  /**
   * Convert from internal representation to API response
   */
  static toApi(data: DeviceData, deviceId: string): DeviceDataApi {
    return deviceDataApiSchema.parse({
      device_id: deviceId, // 6-digit device ID for API
      timestamp: data.timestamp,
      message_number: data.message_number,
      instant_power: data.instant_power ? Number(data.instant_power) : undefined,
      cumulative_energy: data.cumulative_energy ? Number(data.cumulative_energy) : undefined,
      operational_state: data.operational_state,
    });
  }

  /**
   * Convert from DynamoDB storage format to internal representation
   */
  static fromDb(dbData: any): DeviceData {
    return deviceDataSchema.parse({
      device_id: dbData.device_id,
      timestamp: dbData.timestamp,
      message_number: dbData.message_number,
      instant_power: dbData.instant_power ? BigInt(dbData.instant_power) : undefined,
      cumulative_energy: dbData.cumulative_energy ? BigInt(dbData.cumulative_energy) : undefined,
      operational_state: dbData.operational_state,
    });
  }

  /**
   * Convert from internal representation to DynamoDB storage format
   */
  static toDb(data: DeviceData): DeviceDataDb {
    return deviceDataDbSchema.parse({
      device_id: data.device_id,
      timestamp: data.timestamp,
      message_number: data.message_number,
      instant_power: data.instant_power?.toString(),
      cumulative_energy: data.cumulative_energy?.toString(),
      operational_state: data.operational_state,
    });
  }
}
