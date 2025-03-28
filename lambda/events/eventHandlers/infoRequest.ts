import { convertToGpsTimeEpoch } from "../../utils/convertGpsTime"
import { EventMap } from "../models/eventType"
import { sendToDobby } from "../../utils/sendToDobby"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleInfoRequest = (device_id: string, timestamp?: Date): EventSchemaType => {
    const gpsTimeEpoch = timestamp ? convertToGpsTimeEpoch(timestamp) : 0

    const buffer = new ArrayBuffer(5)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.INFORMATION_REQUEST)
    view.setUint32(1, gpsTimeEpoch)

    const sentToDobby = sendToDobby(device_id, view.buffer)

    return {
        event_id: uuidv4(),
        event_type: EventType.INFO_REQUEST,
        event_data: {
            device_id: device_id,
            timestamp: timestamp ? timestamp.toISOString() : new Date().toISOString(),
        }
    }
}

export { handleInfoRequest } 