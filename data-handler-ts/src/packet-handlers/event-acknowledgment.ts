import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { sendAck } from '../utils/ack';
import { updateEventAsAcknowledged } from '../../../lambda/utils/updateEvent';

const dynamodb = new DynamoDB({ region: 'us-east-1' });

export const handleEventAcknowledgment = async (payload: Buffer, deviceId: string): Promise<void> => {
    console.log(`Event acknowledgment payload:`, Array.from(payload));

    try {
        // Parse payload according to correct structure:
        // Byte 0: Message type (9)
        // Byte 1: Event type
        // Bytes 2-5: Timestamp (4 bytes)

        if (payload.length >= 6) {
            const eventType = payload[1];
            const timestamp = payload.readUInt32LE(2); // Read 4 bytes starting at byte 2

            if (timestamp > 0) {
                // The timestamp is already in GPS epoch format (seconds), same as stored in database
                console.log(`Extracted event type: ${eventType}, GPS epoch timestamp: ${timestamp}`);

                // Update the event in DynamoDB using the timestamp
                const success = await updateEventAsAcknowledged(deviceId, eventType, timestamp);
                if (success) {
                    console.log(`Successfully acknowledged event for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);
                } else {
                    console.log(`Failed to acknowledge event for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);
                }
            } else {
                console.log(`Invalid timestamp (0) in acknowledgment payload`);
            }
        } else {
            console.log(`Payload too short (${payload.length} bytes), expected at least 6 bytes`);
        }

    } catch (error) {
        console.error(`Error processing event acknowledgment for device ${deviceId}:`, error);
    }
};