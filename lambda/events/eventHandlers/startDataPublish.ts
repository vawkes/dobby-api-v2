import { sendToDobby } from "../../utils/sendToDobby"
import { saveEventToDynamoDB } from "../../utils/saveEvent"
import { EventSchemaType } from "../eventsSchema"
import { v4 as uuidv4 } from 'uuid'
import { EventType } from "../eventsSchema"

const handleStartDataPublish = async (device_id: string, interval_minutes: number): Promise<EventSchemaType> => {
    // Construct the payload: 3 bytes
    // Byte 0: Command Type = 12
    // Bytes 1-2: Publish Interval Minutes (UInt16, little endian)
    const buffer = new ArrayBuffer(3)
    const view = new DataView(buffer)
    view.setUint8(0, 12) // Command Type
    view.setUint16(1, interval_minutes, true) // Little endian

    const sentToDobby = await sendToDobby(device_id, view.buffer)

    const event: EventSchemaType = {
        event_id: uuidv4(),
        event_type: EventType.START_DATA_PUBLISH,
        event_data: {
            device_id: device_id,
            interval_minutes: interval_minutes,
            event_sent: sentToDobby
        }
    }

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event)

    return event
}

export { handleStartDataPublish }