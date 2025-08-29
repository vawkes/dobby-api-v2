import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime"
import { EventMap } from "../models/eventType"
import { sendToDobby } from "../../utils/sendToDobby"
import { saveEventToDynamoDB } from "../../utils/saveEvent"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleInfoRequest = async (device_id: string, timestamp?: Date, clientEventId?: string): Promise<EventSchemaType> => {
    const gpsTimeEpoch = timestamp ? convertToGpsTimeEpoch(timestamp) : 0

    const buffer = new ArrayBuffer(5)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.INFORMATION_REQUEST)
    view.setUint32(1, gpsTimeEpoch, true)

    const sentToDobby = await sendToDobby(device_id, view.buffer)

    // Use client-provided event ID if available, otherwise generate new UUID for backward compatibility
    const eventId = clientEventId || uuidv4();
    console.log(`[DEBUG] InfoRequest handler using event_id: ${eventId} ${clientEventId ? '(client-provided)' : '(generated for backward compatibility)'}`);

    const event: EventSchemaType = {
        event_id: eventId,
        event_type: EventType.INFO_REQUEST,
        event_data: {
            device_id: device_id,
            start_time: gpsTimeEpoch, // Store GPS epoch timestamp directly as number
            event_sent: sentToDobby
        }
    }

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event)

    return event
}

export { handleInfoRequest } 