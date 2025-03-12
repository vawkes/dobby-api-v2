export * from './auth';

// Device related types
export interface Device {
    updated_at?: string;
    cta_version: string;
    firmware_date: string;
    model_number: string;
    device_id: string;
    device_type: string;
    gridcube_firmware_version?: string;
    capability_bitmap: string;
    device_revision: string;
    firmware_version: string;
    serial_number: string;
    vendor_id: string;
    last_rx_rssi?: number;
    last_link_type?: number;
} 