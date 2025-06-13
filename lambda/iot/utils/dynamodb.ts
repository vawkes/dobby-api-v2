import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { DeviceDataPoint } from '../iotSchema';

/**
 * Writes data to DynamoDB ShiftedData table
 */
export async function writeShiftedDataToDynamo(
    dynamodb: DynamoDB,
    deviceId: string,
    timestamp: number,
    msgNumber: number,
    measureName: string,
    value: number
): Promise<void> {
    console.log(`Writing to DynamoDB for device ${deviceId}, measure ${measureName}, value ${value}`);

    // Create the base item structure
    const item: DeviceDataPoint = {
        device_id: deviceId,
        timestamp: timestamp,
        msg_number: msgNumber,
        operational_state: 1, // Default value
    };

    // Add the specific measure field
    if (measureName === 'instant_power') {
        item.instant_power = value;
        item.cumulative_energy = 0; // Default
    } else if (measureName === 'cumulative_energy') {
        item.cumulative_energy = value;
        item.instant_power = 0; // Default
    } else if (measureName === 'operational_state') {
        item.operational_state = value;
        item.cumulative_energy = 0; // Default
        item.instant_power = 0; // Default
    }

    const params = {
        TableName: "ShiftedData",
        Item: marshall(item)
    };

    console.log('Storing data in DynamoDB:', JSON.stringify(item));
    await dynamodb.putItem(params);
}

/**
 * Updates the last seen timestamp for a device
 */
export async function updateDeviceLastSeen(dynamodb: DynamoDB, deviceId: string): Promise<void> {
    const updateParams = {
        TableName: "DobbyInfo",
        Key: marshall({
            device_id: deviceId
        }),
        UpdateExpression: "SET updated_at = :updated_at",
        ExpressionAttributeValues: {
            ":updated_at": { S: new Date().toISOString() }
        }
    };

    console.log('Updating device last seen timestamp');
    await dynamodb.updateItem(updateParams);
} 