import { z } from '@hono/zod-openapi'

/**
 * Binary message format definitions for GridCube devices
 */

// Constants for payload types
export enum PayloadType {
    INSTANT_POWER = 0,
    CUMULATIVE_ENERGY = 1,
    INFO_REQUEST = 2,
    MODEL_NUMBER = 3,
    SERIAL_NUMBER = 4,
    FIRMWARE_VERSION = 5,
    OPERATIONAL_STATE = 6,
    CONNECTION_INFO = 7,
    GRIDCUBE_FIRMWARE_VERSION = 8
}

// Operational state enum matching Python implementation
export enum OperationalState {
    IDLE_NORMAL = 0,
    RUNNING_NORMAL = 1,
    RUNNING_CURTAILED = 2,
    RUNNING_HEIGHTENED = 3,
    IDLE_CURTAILED = 4,
    SGD_ERROR = 5,
    IDLE_HEIGHTENED = 6,
    CYCLING_ON = 7,
    CYCLING_OFF = 8,
    VARIABLE_FOLLOWING = 9,
    VARIABLE_NOT_FOLLOWING = 10,
    IDLE_OPT_OUT = 11,
    RUNNING_OPT_OUT = 12,
    RUNNING_PRICE_STREAM = 13,
    IDLE_PRICE_STREAM = 14
}

// Binary data formats - these can be refined based on the exact format used in the Python code
export interface InstantPowerData {
    msgNumber: number;
    instantPower: number;
}

export interface CumulativeEnergyData {
    msgNumber: number;
    cumulativeEnergy: number;
}

export interface ModelNumberData {
    modelNumber: string;
}

export interface SerialNumberData {
    serialNumber: string;
}

export interface FirmwareVersionData {
    firmwareVersion: string;
}

export interface OperationalStateData {
    operationalState: number;
}

export interface ConnectionInfoData {
    signalStrength: number;
    linkType: number;
}

export interface GridcubeFirmwareVersionData {
    firmwareVersion: string;
}

// Interface for DynamoDB data storage
export interface DeviceDataPoint {
    device_id: string;
    timestamp: number;
    cumulative_energy?: number;
    instant_power?: number;
    msg_number?: number;
    operational_state?: number;
}

// Interface for iot event
export interface IoTEvent {
    uplink: {
        WirelessDeviceId: string;
        PayloadData: string; // Base64 encoded
    }
}

// Schema for incoming IoT data from Grid Cube devices
const gridCubeDataSchema = z.object({
    device_id: z.string().uuid(),
    timestamp: z.number().optional(), // If not provided, will be set to current time
    cumulative_energy: z.number(),
    instant_power: z.number(),
    msg_number: z.number(),
    operational_state: z.number(),
    signal_strength: z.number().optional(),
    link_type: z.number().optional(),
    battery_level: z.number().optional(),
    temperature: z.number().optional(),
    firmware_version: z.string().optional()
});

// Schema for batch of IoT data
const gridCubeBatchDataSchema = z.array(gridCubeDataSchema);

// Response schema for IoT data processing
const iotResponseSchema = z.object({
    success: z.boolean(),
    message: z.string(),
    processed_count: z.number().optional(),
    errors: z.array(z.string()).optional()
});

export {
    gridCubeDataSchema,
    gridCubeBatchDataSchema,
    iotResponseSchema
}; 