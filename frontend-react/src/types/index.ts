export * from './auth.ts';
export * from './component-props.ts';

// Device related types
export interface Device {
    updated_at?: string;
    cta_version: string;
    firmware_date: string;
    model_number: string;
    device_id: string;
    device_type: string;
    device_type_description?: string; // Optional field for formatted device type description
    gridcube_firmware_version?: string;
    capability_bitmap: string;
    device_revision: string;
    firmware_version: string;
    serial_number: string;
    vendor_id: string;
    last_rx_rssi?: number;
    last_link_type?: number;
}

// Device data from DobbyData table
export interface DeviceDataPoint {
    device_id: string;
    timestamp: number; // Seconds since epoch
    cumulative_energy: number;
    instant_power: number;
    msg_number: number;
    operational_state: number;
}

// Event related types
export enum EventType {
    LOAD_UP = "LOAD_UP",
    GRID_EMERGENCY = "GRID_EMERGENCY",
    CRITICAL_PEAK = "CRITICAL_PEAK",
    START_SHED = "START_SHED",
    END_SHED = "END_SHED",
    INFO_REQUEST = "INFO_REQUEST",
}

export interface EventData {
    device_id: string;
    start_time?: string;      // Used by most event types
    timestamp?: string;       // Used by INFO_REQUEST events
    duration?: number;
    event_sent?: boolean;
}

export interface Event {
    event_id: string;
    event_type: EventType;
    event_data: EventData;
    event_ack?: boolean;  // Acknowledgment status from device
} 