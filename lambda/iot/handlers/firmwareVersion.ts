import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { updateDeviceLastSeen } from '../utils/dynamodb';

/**
 * Handles firmware version data (payload type 5)
 */
export async function handleFirmwareVersion(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing firmware version data');

    // Parse message number from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1

    // Extract firmware version as string
    const firmwareVersion = payload.slice(2).toString('utf8');

    // Send acknowledgment to the device with type 5
    await sendAck(deviceId, 5, msgNumber);

    console.log(`Firmware Version: ${firmwareVersion}, Message #: ${msgNumber}`);

    // Update device last seen in DynamoDB
    await updateDeviceLastSeen(dynamodb, deviceId);
} 