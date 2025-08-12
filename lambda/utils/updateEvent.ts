import { EventRepository } from '../../shared/database/repositories/event-repository';

// Create repository instance
const eventRepository = new EventRepository();

/**
 * Updates an event's event_ack field to true when device acknowledges receipt
 * @param deviceId The device ID that sent the acknowledgment (UUID)
 * @param eventType The type of event being acknowledged
 * @param timestamp The timestamp when the event was sent (for direct lookup)
 * @returns Promise<boolean> True if the event was updated successfully
 */
export async function updateEventAsAcknowledged(
    deviceId: string,
    eventType: number,
    timestamp: number
): Promise<boolean> {
    return eventRepository.acknowledgeEvent(deviceId, eventType, timestamp);
}
