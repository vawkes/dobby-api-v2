import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime"
import { EventMap } from "../models/eventType"
import { sendToDobby } from "../../utils/sendToDobby"
import { saveEventToDynamoDB } from "../../utils/saveEvent"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleLoadUp = async (device_id: string, startTime?: Date, eventDurationSeconds?: number, clientEventId?: string): Promise<EventSchemaType> => {

    const gpsTimeEpoch = startTime ? convertToGpsTimeEpoch(startTime) : 0
    const duration = eventDurationSeconds ? eventDurationSeconds : 0

    const convertedDuration = Math.sqrt(duration / 2)

    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.LOAD_UP)
    view.setUint32(1, gpsTimeEpoch, true)
    view.setUint8(5, convertedDuration)

    const sentToDobby = await sendToDobby(device_id, view.buffer)

    // Use client-provided event ID if available, otherwise generate new UUID for backward compatibility
    const eventId = clientEventId || uuidv4();
    console.log(`[DEBUG] LoadUp handler using event_id: ${eventId} ${clientEventId ? '(client-provided)' : '(generated for backward compatibility)'}`);

    const event: EventSchemaType = {
        event_id: eventId,
        event_type: EventType.LOAD_UP,
        event_data: {
            device_id: device_id,
            start_time: gpsTimeEpoch, // Store GPS epoch timestamp directly as number
            duration: duration,
            event_sent: sentToDobby
        }
    }

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event)

    return event
}

export { handleLoadUp }
