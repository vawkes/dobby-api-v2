import { describe, it, expect, beforeEach } from '@jest/globals';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { getWirelessDeviceId, getDeviceId, resolveDeviceIdForCommunication, resolveDeviceIdForResponse } from '../lambda/utils/deviceIdMapping.ts';

// Mock DynamoDB
const mockDynamoDB = {
    getItem: jest.fn(),
    query: jest.fn()
} as unknown as DynamoDB;

describe('Device ID Mapping', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getWirelessDeviceId', () => {
        it('should return wireless device ID for valid 6-digit device ID', async () => {
            const mockItem = {
                device_id: { S: '000012' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: mockItem
            });

            const result = await getWirelessDeviceId(mockDynamoDB, '000012');
            expect(result).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
        });

        it('should return null for non-existent device ID', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const result = await getWirelessDeviceId(mockDynamoDB, '999999');
            expect(result).toBeNull();
        });
    });

    describe('getDeviceId', () => {
        it('should return device ID for valid wireless device ID', async () => {
            const mockItems = [{
                device_id: { S: '000012' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            }];

            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: mockItems
            });

            const result = await getDeviceId(mockDynamoDB, '558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(result).toBe('000012');
        });

        it('should return null for non-existent wireless device ID', async () => {
            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: []
            });

            const result = await getDeviceId(mockDynamoDB, 'non-existent-uuid');
            expect(result).toBeNull();
        });
    });

    describe('resolveDeviceIdForCommunication', () => {
        it('should return wireless device ID for 6-digit device ID', async () => {
            const mockItem = {
                device_id: { S: '000012' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: mockItem
            });

            const result = await resolveDeviceIdForCommunication(mockDynamoDB, '000012');
            expect(result).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
        });

        it('should return original ID for UUID (wireless device ID)', async () => {
            const result = await resolveDeviceIdForCommunication(mockDynamoDB, '558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(result).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
        });

        it('should return original ID for non-6-digit device ID', async () => {
            const result = await resolveDeviceIdForCommunication(mockDynamoDB, 'invalid-id');
            expect(result).toBe('invalid-id');
        });

        it('should return original ID when wireless device ID not found', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const result = await resolveDeviceIdForCommunication(mockDynamoDB, '000012');
            expect(result).toBe('000012');
        });
    });

    describe('resolveDeviceIdForResponse', () => {
        it('should return original ID for 6-digit device ID', async () => {
            const result = await resolveDeviceIdForResponse(mockDynamoDB, '000012');
            expect(result).toBe('000012');
        });

        it('should return device ID for UUID (wireless device ID)', async () => {
            const mockItems = [{
                device_id: { S: '000012' },
                wireless_device_id: { S: '558fab41-f090-4675-a7b0-f5060297d4e9' }
            }];

            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: mockItems
            });

            const result = await resolveDeviceIdForResponse(mockDynamoDB, '558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(result).toBe('000012');
        });

        it('should return original ID for non-UUID', async () => {
            const result = await resolveDeviceIdForResponse(mockDynamoDB, 'invalid-id');
            expect(result).toBe('invalid-id');
        });

        it('should return original ID when device ID not found', async () => {
            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: []
            });

            const result = await resolveDeviceIdForResponse(mockDynamoDB, '558fab41-f090-4675-a7b0-f5060297d4e9');
            expect(result).toBe('558fab41-f090-4675-a7b0-f5060297d4e9');
        });
    });
}); 