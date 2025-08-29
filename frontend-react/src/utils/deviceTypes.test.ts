import { getDeviceTypeDescription, formatDeviceType, DEVICE_TYPE_MAP } from './deviceTypes.ts';

describe('Device Type Utilities', () => {
  test('should map known hex codes to descriptions', () => {
    // Test a few key device types
    expect(getDeviceTypeDescription('0x0001')).toEqual({
      description: 'Water Heater - Electric',
      hexCode: '0x0001'
    });
    
    expect(getDeviceTypeDescription('0x0002')).toEqual({
      description: 'Water Heater - Heat Pump',
      hexCode: '0x0002'
    });
    
    expect(getDeviceTypeDescription('0x1000')).toEqual({
      description: 'Electric Vehicle',
      hexCode: '0x1000'
    });
  });

  test('should handle UCM device types', () => {
    expect(getDeviceTypeDescription('0x4001')).toEqual({
      description: 'IEEE 802.15.4 (e.g., ZigBee)',
      hexCode: '0x4001'
    });
    
    expect(getDeviceTypeDescription('0x4002')).toEqual({
      description: 'IEEE 802.11 (e.g., Wi-Fi)',
      hexCode: '0x4002'
    });
  });

  test('should handle manufacturer-defined types', () => {
    expect(getDeviceTypeDescription('0x8000')).toEqual({
      description: 'Manufacturer Defined Device Type',
      hexCode: '0x8000'
    });
    
    expect(getDeviceTypeDescription('0xFFFF')).toEqual({
      description: 'Manufacturer Defined Device Type',
      hexCode: '0xffff'
    });
  });

  test('should handle custom string types', () => {
    expect(getDeviceTypeDescription('GridCube')).toEqual({
      description: 'GridCube',
      hexCode: undefined
    });
    
    expect(getDeviceTypeDescription('CustomDevice')).toEqual({
      description: 'CustomDevice',
      hexCode: undefined
    });
  });

  test('should handle edge cases', () => {
    // Empty/undefined cases
    expect(getDeviceTypeDescription('')).toEqual({
      description: 'Unknown Device Type',
      hexCode: undefined
    });
    
    expect(getDeviceTypeDescription(undefined as any)).toEqual({
      description: 'Unknown Device Type',
      hexCode: undefined
    });
  });

  test('should format device types correctly', () => {
    expect(formatDeviceType('0x0001')).toBe('Water Heater - Electric (0x0001)');
    expect(formatDeviceType('GridCube')).toBe('GridCube');
    expect(formatDeviceType('')).toBe('Unknown Device Type');
  });

  test('should have comprehensive device type coverage', () => {
    // Check we have the expected number of device types
    const sgdTypes = Object.values(DEVICE_TYPE_MAP).filter(d => d.category === 'SGD');
    const ucmTypes = Object.values(DEVICE_TYPE_MAP).filter(d => d.category === 'UCM');
    
    // Should have at least 40 SGD types and 18 UCM types based on the specification
    expect(sgdTypes.length).toBeGreaterThanOrEqual(40);
    expect(ucmTypes.length).toBeGreaterThanOrEqual(18);
  });
});