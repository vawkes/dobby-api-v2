import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { updateDeviceLastSeen } from '../utils/dynamodb';

/**
 * Handles Grid Cube firmware version data (payload type 8)
 */
export async function handleGridcubeFirmwareVersion(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing Grid Cube firmware version data');

    // Parse message number from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1

    // Extract firmware version as string
    const gcFirmwareVersion = payload.slice(2).toString('utf8');

    // Send acknowledgment to the device with type 8
    await sendAck(deviceId, 8, msgNumber);

    console.log(`Grid Cube Firmware Version: ${gcFirmwareVersion}, Message #: ${msgNumber}`);

    // Update device last seen in DynamoDB
    await updateDeviceLastSeen(dynamodb, deviceId);
} 