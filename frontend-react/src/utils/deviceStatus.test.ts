import { Device } from '../types/index.ts';
import { getDeviceStatus } from './deviceStatus.ts';

const baseDevice = (overrides: Partial<Device> = {}): Device => ({
  cta_version: '1',
  firmware_date: '2024-01-01',
  model_number: 'model',
  device_id: 'device-1',
  device_type: 'type',
  capability_bitmap: '0',
  device_revision: '1',
  firmware_version: '1',
  serial_number: 'serial',
  vendor_id: 'vendor',
  ...overrides,
});

const hoursAgo = (hours: number): string => new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

describe('getDeviceStatus', () => {
  it('marks devices degraded after 6 hours without updates', () => {
    expect(getDeviceStatus(baseDevice({ updated_at: hoursAgo(5.9) }))).toBe('online');
    expect(getDeviceStatus(baseDevice({ updated_at: hoursAgo(6.1) }))).toBe('degraded');
  });

  it('marks devices degraded when RSSI is -100 dBm or weaker', () => {
    expect(getDeviceStatus(baseDevice({ updated_at: hoursAgo(1), last_rx_rssi: -99 }))).toBe('online');
    expect(getDeviceStatus(baseDevice({ updated_at: hoursAgo(1), last_rx_rssi: -100 }))).toBe('degraded');
  });
});
