import { z } from 'zod';

/**
 * Core primitive schemas for the unified data model
 * These are the atomic building blocks that other schemas compose
 */

// Device ID types with strict validation
export const deviceIdSchema = z.string().regex(/^\d{6}$/, 'Device ID must be exactly 6 digits');
export const wirelessDeviceIdSchema = z.string().uuid('Invalid wireless device ID format');

// Other ID types
export const eventIdSchema = z.string().uuid('Invalid event ID format');
export const companyIdSchema = z.string().uuid('Invalid company ID format');
export const userIdSchema = z.string().uuid('Invalid user ID format');

// Timestamp schemas with proper validation
export const gpsTimestampSchema = z.number().int().positive('GPS timestamp must be a positive integer');
export const jsTimestampSchema = z.number().int().positive('JS timestamp must be a positive integer');
export const isoDatetimeSchema = z.string().datetime('Invalid ISO datetime format');

// Message number validation
export const messageNumberSchema = z.number().int().min(0, 'Message number must be non-negative');

// Export inferred types for use across the codebase
export type DeviceId = z.infer<typeof deviceIdSchema>;
export type WirelessDeviceId = z.infer<typeof wirelessDeviceIdSchema>;
export type EventId = z.infer<typeof eventIdSchema>;
export type CompanyId = z.infer<typeof companyIdSchema>;
export type UserId = z.infer<typeof userIdSchema>;
export type GpsTimestamp = z.infer<typeof gpsTimestampSchema>;
export type JsTimestamp = z.infer<typeof jsTimestampSchema>;
export type MessageNumber = z.infer<typeof messageNumberSchema>;
