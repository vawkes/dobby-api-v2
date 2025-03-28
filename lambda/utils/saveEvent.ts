import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall } from "@aws-sdk/util-dynamodb";
import { EventSchemaType, EventType } from "../events/eventsSchema";

const dynamodb = new DynamoDB({ "region": "us-east-1" });

// Interface for the flattened event structure that matches DynamoDB
interface FlattenedEvent {
    event_id: string;
    event_type: EventType;
    device_id: string;
    event_sent: boolean;
    event_ack: boolean;
    start_time?: string;
    timestamp?: string;
    duration?: number;
}

/**
 * Saves an event to the DynamoDB table
 * @param event The event to save
 * @returns Promise<boolean> True if the event was saved successfully
 */
export async function saveEventToDynamoDB(event: EventSchemaType): Promise<boolean> {
    try {
        // Flatten the event structure for DynamoDB
        const flattenedEvent: FlattenedEvent = {
            event_id: event.event_id,
            event_type: event.event_type,
            device_id: event.event_data.device_id,
            event_sent: event.event_data.event_sent || false,
            event_ack: false // Default to false
        };

        // Add appropriate fields based on event type
        if (event.event_type === EventType.INFO_REQUEST && 'timestamp' in event.event_data) {
            // For INFO_REQUEST, use timestamp field
            flattenedEvent.timestamp = event.event_data.timestamp;
        } else {
            // For all other event types, use start_time field
            if ('start_time' in event.event_data) {
                flattenedEvent.start_time = event.event_data.start_time;
            }

            // Add duration for event types that have it
            if ('duration' in event.event_data && event.event_data.duration !== undefined) {
                flattenedEvent.duration = event.event_data.duration;
            }
        }

        // Add device_id as a GSI partition key for querying by device
        flattenedEvent["device_id"] = event.event_data.device_id;

        // Transform the flattened event to the format expected by DynamoDB
        const marshalledEvent = marshall(flattenedEvent);

        // Save the event to DynamoDB
        await dynamodb.putItem({
            TableName: "DobbyEvent",
            Item: marshalledEvent
        });

        console.log(`Event ${event.event_id} saved to DynamoDB successfully`);
        return true;
    } catch (error) {
        console.error("Error saving event to DynamoDB:", error);
        return false;
    }
} 