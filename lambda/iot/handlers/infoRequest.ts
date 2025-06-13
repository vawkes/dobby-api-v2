import { sendAck } from '../utils/acknowledgment';

/**
 * Handles info request data (payload type 2)
 */
export async function handleInfoRequest(payload: Buffer, deviceId: string): Promise<void> {
    console.log('Processing info request');

    // Parse message number from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1

    // Send acknowledgment to the device with type 2
    await sendAck(deviceId, 2, msgNumber);

    console.log(`Info request received, Message #: ${msgNumber}`);
} 