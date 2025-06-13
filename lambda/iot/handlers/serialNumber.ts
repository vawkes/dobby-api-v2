import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { updateDeviceLastSeen } from '../utils/dynamodb';

/**
 * Handles serial number data (payload type 4)
 */
export async function handleSerialNumber(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing serial number data');

    // Parse message number from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1

    // Extract serial number as string
    const serialNumber = payload.slice(2).toString('utf8');

    // Send acknowledgment to the device with type 4
    await sendAck(deviceId, 4, msgNumber);

    console.log(`Serial Number: ${serialNumber}, Message #: ${msgNumber}`);

    // Update device last seen in DynamoDB
    await updateDeviceLastSeen(dynamodb, deviceId);
} 