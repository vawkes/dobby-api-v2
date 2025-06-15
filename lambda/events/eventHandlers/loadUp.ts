import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime"
import { EventMap } from "../models/eventType"
import { sendToDobby } from "../../utils/sendToDobby"
import { saveEventToDynamoDB } from "../../utils/saveEvent"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleLoadUp = async (device_id: string, startTime?: Date, eventDurationSeconds?: number): Promise<EventSchemaType> => {

    const gpsTimeEpoch = startTime ? convertToGpsTimeEpoch(startTime) : 0
    const duration = eventDurationSeconds ? eventDurationSeconds : 0

    const convertedDuration = Math.sqrt(duration / 2)

    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.LOAD_UP)
    view.setUint32(1, gpsTimeEpoch, true)
    view.setUint8(5, convertedDuration)

    const sentToDobby = await sendToDobby(device_id, view.buffer)

    const event: EventSchemaType = {
        event_id: uuidv4(),
        event_type: EventType.LOAD_UP,
        event_data: {
            device_id: device_id,
            start_time: startTime ? startTime.toISOString() : "0",
            duration: duration,
            event_sent: sentToDobby
        }
    }

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event)

    return event
}

export { handleLoadUp }
