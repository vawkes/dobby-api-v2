import { Device } from '../types/index.ts';
import {
  getDeviceDisplayValue,
  getDeviceSearchText,
  formatOperationalState,
  formatTelemetryEnergy,
  sanitizeDeviceText,
} from './deviceDisplay.ts';

const baseDevice = (overrides: Partial<Device> = {}): Device => ({
  cta_version: '1',
  firmware_date: '2024-01-01',
  model_number: 'GridCube\u0000\u0000',
  device_id: '000416',
  device_type: '0x4001',
  capability_bitmap: '0',
  device_revision: '1',
  firmware_version: '1.0\u0000',
  serial_number: 'SN-1\u0000',
  vendor_id: 'vendor',
  ...overrides,
});

describe('device display utilities', () => {
  it('removes fixed-width null bytes and control characters', () => {
    expect(sanitizeDeviceText(' Grid\u0000Cube\u0007  ')).toBe('GridCube');
  });

  it('returns an explicit fallback for missing display values', () => {
    expect(getDeviceDisplayValue(null)).toBe('Not reported');
    expect(getDeviceDisplayValue('\u0000\u0000')).toBe('Not reported');
    expect(getDeviceDisplayValue('  firmware\u0000 ')).toBe('firmware');
  });

  it('builds searchable text from nullable runtime device fields', () => {
    const searchText = getDeviceSearchText(
      baseDevice({
        model_number: undefined as any,
        firmware_version: null as any,
        serial_number: 'SN-00416\u0000',
      }),
    );

    expect(searchText).toContain('000416');
    expect(searchText).toContain('sn-00416');
    expect(searchText).toContain('plc (other, non-standard)');
    expect(searchText).not.toContain('\u0000');
  });

  it('formats telemetry summary values for scanning', () => {
    expect(formatTelemetryEnergy(7364795)).toBe('7,364,795 kWh');
    expect(formatTelemetryEnergy(undefined)).toBe('N/A');
    expect(formatOperationalState(1)).toBe('Code 1');
    expect(formatOperationalState(undefined)).toBe('Unknown');
  });
});
