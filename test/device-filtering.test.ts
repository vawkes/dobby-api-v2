import { describe, it, expect, beforeEach } from '@jest/globals';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { resolveDeviceIdForCommunication, resolveDeviceIdForResponse } from '../lambda/utils/deviceIdMapping.ts';

// Mock DynamoDB
const mockDynamoDB = {
    getItem: jest.fn(),
    query: jest.fn()
} as unknown as DynamoDB;

describe('Device Filtering Logic', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Device ID Resolution', () => {
        it('should resolve 6-digit device ID to wireless device ID for filtering', async () => {
            const mockItem = {
                device_id: { S: '000066' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: mockItem
            });

            const result = await resolveDeviceIdForCommunication(mockDynamoDB, '000066');
            expect(result).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
        });

        it('should resolve wireless device ID back to 6-digit device ID for response', async () => {
            const mockItems = [{
                device_id: { S: '000066' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            }];

            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: mockItems
            });

            const result = await resolveDeviceIdForResponse(mockDynamoDB, '558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(result).toBe('000066');
        });

        it('should handle multiple device ID resolutions', async () => {
            const deviceIds = ['000066', '000067', '000068'];
            const wirelessDeviceIds = [
                '558fab41-f090-4675-a7b0-f5060297d4e9',
                '558fab41-f090-4675-a7b0-f5060297d4e8',
                '558fab41-f090-4675-a7b0-f5060297d4e7'
            ];

            // Mock the getItem calls for each device ID
            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: { device_id: { S: '000066' }, wireless_device_id: { S: wirelessDeviceIds[0] } } })
                .mockResolvedValueOnce({ Item: { device_id: { S: '000067' }, wireless_device_id: { S: wirelessDeviceIds[1] } } })
                .mockResolvedValueOnce({ Item: { device_id: { S: '000068' }, wireless_device_id: { S: wirelessDeviceIds[2] } } });

            const resolvedIds = await Promise.all(
                deviceIds.map(id => resolveDeviceIdForCommunication(mockDynamoDB, id))
            );

            expect(resolvedIds).toEqual(wirelessDeviceIds);
        });
    });

    describe('Device Filtering Simulation', () => {
        it('should filter devices correctly with ID resolution', async () => {
            // Simulate the filtering logic from the devices endpoint
            const accessibleDeviceIds = ['000066', '000067']; // 6-digit IDs from CompanyDevices
            const allDevices = [
                { device_id: '558fab41-f090-4675-a7b0-f5060297d4e9', name: 'Device 1' },
                { device_id: '558fab41-f090-4675-a7b0-f5060297d4e8', name: 'Device 2' },
                { device_id: '558fab41-f090-4675-a7b0-f5060297d4e7', name: 'Device 3' }
            ];

            // Mock the resolution calls
            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: { device_id: { S: '000066' }, wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' } } })
                .mockResolvedValueOnce({ Item: { device_id: { S: '000067' }, wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e8' } } });

            // Resolve 6-digit IDs to wireless IDs
            const accessibleWirelessDeviceIds: string[] = [];
            for (const deviceId of accessibleDeviceIds) {
                const wirelessDeviceId = await resolveDeviceIdForCommunication(mockDynamoDB, deviceId);
                if (wirelessDeviceId) {
                    accessibleWirelessDeviceIds.push(wirelessDeviceId);
                }
            }

            // Filter devices
            const accessibleDevices = allDevices.filter(device =>
                accessibleWirelessDeviceIds.includes(device.device_id)
            );

            expect(accessibleDevices).toHaveLength(2);
            expect(accessibleDevices[0].device_id).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(accessibleDevices[1].device_id).toBe('558fab41-f090-4675-a7b0-f5060297d4e8');
        });
    });
}); 