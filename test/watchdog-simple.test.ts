import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { sendInfoRequestToDevice } from '../lambda/utils/sendInfoRequest';

// Mock dependencies
jest.mock('../lambda/utils/sendToDobby', () => ({
    sendToDobby: jest.fn()
}));

jest.mock('../lambda/utils/convertGpsTime', () => ({
    convertToGpsTimeEpoch: jest.fn()
}));

import { sendToDobby } from '../lambda/utils/sendToDobby';
import { convertToGpsTimeEpoch } from '../lambda/utils/convertGpsTime';

const mockSendToDobby = sendToDobby as jest.MockedFunction<typeof sendToDobby>;
const mockConvertToGpsTimeEpoch = convertToGpsTimeEpoch as jest.MockedFunction<typeof convertToGpsTimeEpoch>;

describe('Watchdog Timer Utilities', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('sendInfoRequestToDevice', () => {
        it('should create and send info request payload successfully', async () => {
            mockConvertToGpsTimeEpoch.mockReturnValue(1234567890);
            mockSendToDobby.mockResolvedValue(true);

            const deviceId = 'test-wireless-device-id';
            const timestamp = new Date('2024-01-01T00:00:00Z');

            const result = await sendInfoRequestToDevice(deviceId, timestamp);

            expect(result).toBe(true);
            expect(mockConvertToGpsTimeEpoch).toHaveBeenCalledWith(timestamp);
            expect(mockSendToDobby).toHaveBeenCalledWith(deviceId, expect.any(ArrayBuffer));
            
            // Verify the payload was created correctly
            const callArgs = mockSendToDobby.mock.calls[0];
            const buffer = callArgs[1] as ArrayBuffer;
            const view = new DataView(buffer);
            
            // Check that the payload contains the correct command (8 = INFORMATION_REQUEST)
            expect(view.getUint8(0)).toBe(8);
            expect(view.getUint32(1, true)).toBe(1234567890);
        });

        it('should use current time when no timestamp provided', async () => {
            mockSendToDobby.mockResolvedValue(true);

            const deviceId = 'test-wireless-device-id';

            const result = await sendInfoRequestToDevice(deviceId);

            expect(result).toBe(true);
            expect(mockConvertToGpsTimeEpoch).not.toHaveBeenCalled();
            expect(mockSendToDobby).toHaveBeenCalledWith(deviceId, expect.any(ArrayBuffer));
            
            // Verify the payload was created with epoch 0
            const callArgs = mockSendToDobby.mock.calls[0];
            const buffer = callArgs[1] as ArrayBuffer;
            const view = new DataView(buffer);
            
            expect(view.getUint8(0)).toBe(8); // INFORMATION_REQUEST
            expect(view.getUint32(1, true)).toBe(0); // Default epoch time
        });

        it('should return false when sendToDobby fails', async () => {
            mockSendToDobby.mockResolvedValue(false);

            const deviceId = 'test-wireless-device-id';

            const result = await sendInfoRequestToDevice(deviceId);

            expect(result).toBe(false);
        });

        it('should propagate errors from sendToDobby', async () => {
            const error = new Error('Network error');
            mockSendToDobby.mockRejectedValue(error);

            const deviceId = 'test-wireless-device-id';

            await expect(sendInfoRequestToDevice(deviceId)).rejects.toThrow('Network error');
        });

        it('should create correct payload size and structure', async () => {
            mockSendToDobby.mockResolvedValue(true);
            mockConvertToGpsTimeEpoch.mockReturnValue(987654321);

            const deviceId = 'test-device';
            const timestamp = new Date();

            await sendInfoRequestToDevice(deviceId, timestamp);

            const callArgs = mockSendToDobby.mock.calls[0];
            const buffer = callArgs[1] as ArrayBuffer;
            
            // Verify payload structure
            expect(buffer.byteLength).toBe(5); // 1 byte command + 4 bytes timestamp
            
            const view = new DataView(buffer);
            expect(view.getUint8(0)).toBe(8); // EventMap.INFORMATION_REQUEST
            expect(view.getUint32(1, true)).toBe(987654321); // Little endian timestamp
        });

        it('should handle different device ID formats', async () => {
            mockSendToDobby.mockResolvedValue(true);

            const testCases = [
                'short-id',
                'very-long-wireless-device-id-with-many-characters',
                '123e4567-e89b-12d3-a456-426614174000', // UUID format
                'device_with_underscores',
                'device-with-hyphens'
            ];

            for (const deviceId of testCases) {
                await sendInfoRequestToDevice(deviceId);
                expect(mockSendToDobby).toHaveBeenLastCalledWith(deviceId, expect.any(ArrayBuffer));
            }

            expect(mockSendToDobby).toHaveBeenCalledTimes(testCases.length);
        });
    });
});
