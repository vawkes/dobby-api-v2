import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { docClient, TABLES } from "../../shared/database/client";
import { EventSchemaType, EventType } from "../events/eventsSchema";
import { gpsTimestampSchema } from "../../shared/schemas/primitives";

// Interface for the flattened event structure that matches DynamoDB
interface FlattenedEvent {
    event_id: string;
    event_type: EventType;
    device_id: string;
    event_sent: boolean;
    event_ack: boolean;
    timestamp: number; // Always required as sort key
    [key: string]: any; // Allow any additional fields from event_data
}

/**
 * Saves an event to the DynamoDB table
 * @param event The event to save
 * @returns Promise<boolean> True if the event was saved successfully
 */
export async function saveEventToDynamoDB(event: EventSchemaType): Promise<boolean> {
    try {
        // Convert start_time to GPS timestamp (validate and convert if needed)
        const timestamp = gpsTimestampSchema.parse(event.event_data.start_time);

        // Start with the base flattened event structure
        const flattenedEvent: FlattenedEvent = {
            event_id: event.event_id,
            event_type: event.event_type,
            device_id: event.event_data.device_id as string, // This is the wireless device ID (UUID)
            event_sent: (event.event_data.event_sent as boolean) || false,
            event_ack: false, // Default to false
            timestamp: timestamp, // Validated GPS epoch timestamp (seconds)
            created_at: Date.now()
        };

        console.log(`Saving event ${event.event_id} with device_id: ${event.event_data.device_id}, GPS epoch timestamp: ${event.event_data.start_time}`);

        // Copy ALL fields from event_data to preserve complete event information
        Object.entries(event.event_data).forEach(([key, value]) => {
            // Skip device_id since we already have it at the top level
            if (key !== 'device_id') {
                flattenedEvent[key] = value;
            }
        });

        // Save the event to DynamoDB using DocumentClient (no manual marshalling needed)
        const command = new PutCommand({
            TableName: TABLES.EVENTS,
            Item: flattenedEvent
        });

        await docClient.send(command);

        console.log(`Event ${event.event_id} saved to DynamoDB successfully with device_id: ${flattenedEvent.device_id}, GPS epoch timestamp: ${event.event_data.start_time}`);
        return true;
    } catch (error) {
        console.error("Error saving event to DynamoDB:", error);
        return false;
    }
} 