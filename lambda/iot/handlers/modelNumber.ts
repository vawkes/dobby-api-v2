import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { updateDeviceLastSeen } from '../utils/dynamodb';

/**
 * Handles model number data (payload type 3)
 */
export async function handleModelNumber(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing model number data');

    // Parse message number from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1

    // Extract model number as string
    const modelNumber = payload.slice(2).toString('utf8');

    // Send acknowledgment to the device with type 3
    await sendAck(deviceId, 3, msgNumber);

    console.log(`Model Number: ${modelNumber}, Message #: ${msgNumber}`);

    // Update device last seen in DynamoDB
    await updateDeviceLastSeen(dynamodb, deviceId);
} 