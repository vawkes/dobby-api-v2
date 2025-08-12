import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: "us-east-1" });
const docClient = DynamoDBDocumentClient.from(client);

/**
 * Updates an event's event_ack field to true when device acknowledges receipt
 * @param deviceId The device ID that sent the acknowledgment
 * @param eventType The type of event being acknowledged
 * @param timestamp The timestamp when the event was sent (for direct lookup)
 * @returns Promise<boolean> True if the event was updated successfully
 */
export async function updateEventAsAcknowledged(
    deviceId: string,
    eventType: number,
    timestamp: number
): Promise<boolean> {
    try {
        console.log(`Updating event acknowledgment for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);

        // Use composite key query: device_id + timestamp
        const queryCommand = new QueryCommand({
            TableName: "DobbyEvent",
            IndexName: "device_id-index",
            KeyConditionExpression: "device_id = :deviceId AND #timestamp = :timestamp",
            ExpressionAttributeNames: {
                "#timestamp": "timestamp"
            },
            ExpressionAttributeValues: {
                ":deviceId": deviceId,
                ":timestamp": timestamp
            }
        });

        const queryResult = await docClient.send(queryCommand);

        if (!queryResult.Items || queryResult.Items.length === 0) {
            console.log(`No event found for device ${deviceId} with timestamp ${timestamp}`);
            return false;
        }

        const event = queryResult.Items[0];
        console.log(`dynamodb event: ${JSON.stringify(event)}`);

        // Update the event_ack field to true
        const updateCommand = new UpdateCommand({
            TableName: "DobbyEvent",
            Key: {
                event_id: event.event_id,
                timestamp: event.timestamp
            },
            UpdateExpression: "SET event_ack = :eventAck",
            ExpressionAttributeValues: {
                ":eventAck": true
            }
        });

        await docClient.send(updateCommand);

        console.log(`Successfully updated event ${event.event_id} as acknowledged for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);
        return true;

    } catch (error) {
        console.error("Error updating event acknowledgment:", error);
        return false;
    }
}
