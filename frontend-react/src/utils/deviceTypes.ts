// Device type mapping based on ANSI/CTA-2045-B specification
// This utility converts hex device type codes to human-readable descriptions

export interface DeviceTypeDefinition {
  hexCode: string;
  description: string;
  category?: 'SGD' | 'UCM' | 'Manufacturer';
}

// Comprehensive mapping of device types from ANSI/CTA-2045-B specification
export const DEVICE_TYPE_MAP: Record<string, DeviceTypeDefinition> = {
  // SGD Device Types (0x0000-0x7FFF)
  '0x0000': { hexCode: '0x0000', description: 'Unspecified Type', category: 'SGD' },
  '0x0001': { hexCode: '0x0001', description: 'Water Heater - Electric', category: 'SGD' },
  '0x0002': { hexCode: '0x0002', description: 'Water Heater - Heat Pump', category: 'SGD' },
  '0x0003': { hexCode: '0x0003', description: 'Central AC - Heat Pump', category: 'SGD' },
  '0x0004': { hexCode: '0x0004', description: 'Central AC - Fossil Fuel Heat', category: 'SGD' },
  '0x0005': { hexCode: '0x0005', description: 'Central AC - Resistance Heat', category: 'SGD' },
  '0x0006': { hexCode: '0x0006', description: 'Water Heater - Gas', category: 'SGD' },
  '0x0007': { hexCode: '0x0007', description: 'Evaporative Cooler', category: 'SGD' },
  '0x0008': { hexCode: '0x0008', description: 'Baseboard Electric Heat', category: 'SGD' },
  '0x0009': { hexCode: '0x0009', description: 'Window AC', category: 'SGD' },
  '0x000A': { hexCode: '0x000A', description: 'Portable Electric Heater', category: 'SGD' },
  '0x000B': { hexCode: '0x000B', description: 'Clothes Washer', category: 'SGD' },
  '0x000C': { hexCode: '0x000C', description: 'Clothes Dryer - Gas', category: 'SGD' },
  '0x000D': { hexCode: '0x000D', description: 'Clothes Dryer - Electric', category: 'SGD' },
  '0x000E': { hexCode: '0x000E', description: 'Refrigerator/Freezer', category: 'SGD' },
  '0x000F': { hexCode: '0x000F', description: 'Freezer', category: 'SGD' },
  '0x0010': { hexCode: '0x0010', description: 'Dishwasher', category: 'SGD' },
  '0x0011': { hexCode: '0x0011', description: 'Microwave Oven', category: 'SGD' },
  '0x0012': { hexCode: '0x0012', description: 'Oven - Electric', category: 'SGD' },
  '0x0013': { hexCode: '0x0013', description: 'Oven - Gas', category: 'SGD' },
  '0x0014': { hexCode: '0x0014', description: 'Cook Top - Electric', category: 'SGD' },
  '0x0015': { hexCode: '0x0015', description: 'Cook Top - Gas', category: 'SGD' },
  '0x0016': { hexCode: '0x0016', description: 'Stove - Electric', category: 'SGD' },
  '0x0017': { hexCode: '0x0017', description: 'Stove - Gas', category: 'SGD' },
  '0x0018': { hexCode: '0x0018', description: 'Dehumidifier', category: 'SGD' },
  '0x0019': { hexCode: '0x0019', description: 'Central AC - Heat Pump Variable Capacity', category: 'SGD' },
  '0x001A': { hexCode: '0x001A', description: 'Water Heater - Heat Pump Variable Capacity/Speed', category: 'SGD' },
  '0x001B': { hexCode: '0x001B', description: 'Water Heater - Phase Change Material', category: 'SGD' },
  '0x0020': { hexCode: '0x0020', description: 'Fan', category: 'SGD' },
  '0x0030': { hexCode: '0x0030', description: 'Pool Pump - Single Speed', category: 'SGD' },
  '0x0031': { hexCode: '0x0031', description: 'Pool Pump - Variable Speed', category: 'SGD' },
  '0x0032': { hexCode: '0x0032', description: 'Electric Hot Tub', category: 'SGD' },
  '0x0040': { hexCode: '0x0040', description: 'Irrigation Pump', category: 'SGD' },
  '0x0041': { hexCode: '0x0041', description: 'Clothes Dryer - Heat Pump', category: 'SGD' },
  '0x1000': { hexCode: '0x1000', description: 'Electric Vehicle', category: 'SGD' },
  '0x1001': { hexCode: '0x1001', description: 'Hybrid Vehicle', category: 'SGD' },
  '0x1100': { hexCode: '0x1100', description: 'Electric Vehicle Supply Equipment - general (SAE J1772)', category: 'SGD' },
  '0x1101': { hexCode: '0x1101', description: 'Electric Vehicle Supply Equipment - Level 1 (SAE J1772)', category: 'SGD' },
  '0x1102': { hexCode: '0x1102', description: 'Electric Vehicle Supply Equipment - Level 2 (SAE J1772)', category: 'SGD' },
  '0x1103': { hexCode: '0x1103', description: 'Electric Vehicle Supply Equipment - Level 3 (SAE J1772)', category: 'SGD' },
  '0x2000': { hexCode: '0x2000', description: 'In Premises Display', category: 'SGD' },
  '0x5000': { hexCode: '0x5000', description: 'Energy Manager', category: 'SGD' },
  '0x6000': { hexCode: '0x6000', description: 'Gateway Device', category: 'SGD' },
  '0x7000': { hexCode: '0x7000', description: 'Distributed Energy Resources', category: 'SGD' },
  '0x7001': { hexCode: '0x7001', description: 'Solar Inverter', category: 'SGD' },
  '0x7002': { hexCode: '0x7002', description: 'Battery Storage', category: 'SGD' },
  
  // UCM Device Types (Phy/MAC) (0x4000-0x4011)
  '0x4000': { hexCode: '0x4000', description: 'Wireless (other, non-standard)', category: 'UCM' },
  '0x4001': { hexCode: '0x4001', description: 'IEEE 802.15.4 (e.g., ZigBee)', category: 'UCM' },
  '0x4002': { hexCode: '0x4002', description: 'IEEE 802.11 (e.g., Wi-Fi)', category: 'UCM' },
  '0x4003': { hexCode: '0x4003', description: 'IEEE 802.16 (e.g., WiMAX)', category: 'UCM' },
  '0x4004': { hexCode: '0x4004', description: 'VHF/UHF Pager', category: 'UCM' },
  '0x4005': { hexCode: '0x4005', description: 'PLC (other, non-standard)', category: 'UCM' },
  '0x4006': { hexCode: '0x4006', description: 'Wired (other, non-standard)', category: 'UCM' },
  '0x4007': { hexCode: '0x4007', description: 'FM (RDS / RBDS)', category: 'UCM' },
  '0x4008': { hexCode: '0x4008', description: 'Wired Ethernet', category: 'UCM' },
  '0x4009': { hexCode: '0x4009', description: 'Coaxial Networking', category: 'UCM' },
  '0x400A': { hexCode: '0x400A', description: 'Telephone Line', category: 'UCM' },
  '0x400B': { hexCode: '0x400B', description: 'IEEE 1901 (BPL)', category: 'UCM' },
  '0x400C': { hexCode: '0x400C', description: 'IEEE 1901.2 (Narrowband-PLC)', category: 'UCM' },
  '0x400D': { hexCode: '0x400D', description: 'ITU-T G.hn', category: 'UCM' },
  '0x400E': { hexCode: '0x400E', description: 'ITU-T G.hnem (Narrowband-PLC)', category: 'UCM' },
  '0x400F': { hexCode: '0x400F', description: 'Cellular (3g, 4g (LTE), Mobile, any)', category: 'UCM' },
  '0x4010': { hexCode: '0x4010', description: 'Utility AMI, Wireless', category: 'UCM' },
  '0x4011': { hexCode: '0x4011', description: 'Utility AMI, PLC', category: 'UCM' },
};

/**
 * Get device type description from hex code
 * @param deviceType - The device type string (hex code or custom string)
 * @returns Formatted device type information
 */
export function getDeviceTypeDescription(deviceType: string): { description: string; hexCode?: string } {
  // Handle undefined or empty device types
  if (!deviceType) {
    return { description: 'Unknown Device Type', hexCode: undefined };
  }
  
  // Normalize the device type to handle different formats
  const normalizedType = normalizeDeviceType(deviceType);
  
  // Check if it's a known hex code
  if (DEVICE_TYPE_MAP[normalizedType]) {
    const deviceInfo = DEVICE_TYPE_MAP[normalizedType];
    return { 
      description: deviceInfo.description, 
      hexCode: deviceInfo.hexCode 
    };
  }
  
  // Handle manufacturer-defined types (0x8000-0xFFFF)
  if (normalizedType.startsWith('0x')) {
    const codeValue = parseInt(normalizedType, 16);
    if (codeValue >= 0x8000 && codeValue <= 0xFFFF) {
      return { 
        description: 'Manufacturer Defined Device Type', 
        hexCode: normalizedType 
      };
    }
  }
  
  // For custom strings like "GridCube", return as is with no hex code
  return { description: deviceType, hexCode: undefined };
}

/**
 * Normalize device type string to standard hex format
 * @param deviceType - The device type string
 * @returns Normalized hex string or original string
 */
function normalizeDeviceType(deviceType: string): string {
  // If it's already a hex code, return as is
  if (deviceType.startsWith('0x')) {
    return deviceType.toLowerCase();
  }
  
  // Try to parse as hex number
  const num = parseInt(deviceType, 16);
  if (!isNaN(num)) {
    // Format as 4-digit hex with 0x prefix
    return `0x${num.toString(16).padStart(4, '0').toLowerCase()}`;
  }
  
  // Return original string for custom types
  return deviceType;
}

/**
 * Format device type for display with description and optional hex code
 * @param deviceType - The device type string
 * @returns Formatted display string
 */
export function formatDeviceType(deviceType: string): string {
  const { description, hexCode } = getDeviceTypeDescription(deviceType);
  
  // If we have a hex code, show both description and code
  if (hexCode) {
    return `${description} (${hexCode})`;
  }
  
  // For custom types, just show the description
  return description;
}

export default {
  DEVICE_TYPE_MAP,
  getDeviceTypeDescription,
  formatDeviceType
};