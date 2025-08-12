import { EventRepository } from "../../shared/database/repositories/event-repository";
import { EventSchemaType } from "../events/eventsSchema";

// Create repository instance
const eventRepository = new EventRepository();

/**
 * Saves an event to the DynamoDB table using the unified repository
 * @param event The event to save
 * @returns Promise<boolean> True if the event was saved successfully
 */
export async function saveEventToDynamoDB(event: EventSchemaType): Promise<boolean> {
    return eventRepository.saveEvent(event);
} 