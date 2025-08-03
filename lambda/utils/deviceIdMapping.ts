import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Helper function to get wireless device ID from production line table
export async function getWirelessDeviceId(dynamodb: DynamoDB, deviceId: string): Promise<string | null> {
    try {
        const result = await dynamodb.getItem({
            TableName: "ProductionLine",
            Key: {
                'device_id': { S: deviceId }
            }
        });

        if (!result.Item) {
            return null;
        }

        const item = unmarshall(result.Item);
        return item.wireless_device_id || null;
    } catch (error) {
        console.error('Error getting wireless device ID:', error);
        return null;
    }
}

// Helper function to get device ID from wireless device ID
export async function getDeviceId(dynamodb: DynamoDB, wirelessDeviceId: string): Promise<string | null> {
    try {
        const result = await dynamodb.query({
            TableName: "ProductionLine",
            IndexName: "wireless_device_id-index", // Assuming this GSI exists
            KeyConditionExpression: "wireless_device_id = :wirelessDeviceId",
            ExpressionAttributeValues: {
                ":wirelessDeviceId": { S: wirelessDeviceId }
            }
        });

        if (!result.Items || result.Items.length === 0) {
            return null;
        }

        const item = unmarshall(result.Items[0]);
        return item.device_id || null;
    } catch (error) {
        console.error('Error getting device ID:', error);
        return null;
    }
}

// Helper function to resolve device ID for API interactions
// Returns the wireless_device_id for device communications, or the original ID if not found
export async function resolveDeviceIdForCommunication(dynamodb: DynamoDB, deviceId: string): Promise<string> {
    // If it's already a UUID (wireless device ID), return as is
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
        return deviceId;
    }

    // If it's a 6-digit device ID, look up the wireless device ID
    if (/^\d{6}$/.test(deviceId)) {
        const wirelessDeviceId = await getWirelessDeviceId(dynamodb, deviceId);
        if (wirelessDeviceId) {
            return wirelessDeviceId;
        }
    }

    // If not found or not a 6-digit ID, return the original ID
    return deviceId;
}

// Helper function to resolve device ID for API responses
// Always returns the 6-digit device_id for user-facing API responses
export async function resolveDeviceIdForResponse(dynamodb: DynamoDB, deviceId: string): Promise<string> {
    // If it's a 6-digit device ID, return as is
    if (/^\d{6}$/.test(deviceId)) {
        return deviceId;
    }

    // If it's a UUID (wireless device ID), look up the device ID
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deviceId)) {
        const deviceIdFromWireless = await getDeviceId(dynamodb, deviceId);
        if (deviceIdFromWireless) {
            return deviceIdFromWireless;
        }
    }

    // If not found, return the original ID
    return deviceId;
} 