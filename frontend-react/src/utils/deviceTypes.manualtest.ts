// Manual test file for device type utilities
// This file can be run manually to verify the device type mapping functionality

import { getDeviceTypeDescription, formatDeviceType } from './deviceTypes.ts';

function runTests() {
  console.log('Running Device Type Utility Tests...\n');
  
  // Test cases
  const testCases = [
    '0x0001', // Water Heater - Electric
    '0x0002', // Water Heater - Heat Pump
    '0x4001', // IEEE 802.15.4 (e.g., ZigBee)
    '0x1000', // Electric Vehicle
    '0x8000', // Manufacturer Defined
    'GridCube', // Custom string
    '0xFFFF', // Manufacturer Defined
    '', // Empty string
    '0x0010', // Dishwasher
    '0x7001', // Solar Inverter
  ];
  
  testCases.forEach((testCase) => {
    const result = getDeviceTypeDescription(testCase);
    const formatted = formatDeviceType(testCase);
    console.log(`Input: "${testCase}"`);
    console.log(`  Description: ${result.description}`);
    console.log(`  Hex Code: ${result.hexCode || 'N/A'}`);
    console.log(`  Formatted: ${formatted}`);
    console.log('---');
  });
  
  console.log('\nTests completed.');
}

// Run the tests
runTests();

export {};