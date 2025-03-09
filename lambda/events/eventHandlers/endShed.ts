import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime"
import { EventMap } from "../models/eventType"
import { sendToDobby } from "../../utils/sendToDobby"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleEndShed = async (device_id: string, startTime?: Date): Promise<EventSchemaType> => {
    // Convert start time to GPS epoch time if provided, otherwise use 0
    const gpsTimeEpoch = startTime ? convertToGpsTimeEpoch(startTime) : 0

    // Create binary payload - only need event type and start time for END_SHED
    const buffer = new ArrayBuffer(5) // 1 byte for event type + 4 bytes for time
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.END_SHED) // Event type
    view.setUint32(1, gpsTimeEpoch) // Start time in GPS epoch

    // Send to device
    const sentToDobby = await sendToDobby(device_id, view.buffer)

    // Return event data
    return {
        event_id: uuidv4(),
        event_type: EventType.END_SHED,
        event_data: {
            device_id: device_id,
            start_time: startTime ? startTime.toISOString() : "0",
            event_sent: sentToDobby
        }
    }
}

export { handleEndShed } 