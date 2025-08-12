import { convertToGpsTimeEpoch } from "./convertGpsTime"
import { EventMap } from "../events/models/eventType"
import { sendToDobby } from "./sendToDobby"
import { WirelessDeviceId } from "../../shared/schemas/primitives"

/**
 * Sends an info request to a device without logging to event table
 * Used for administrative operations like watchdog timer feeds
 * 
 * @param deviceId - The wireless device ID to send the request to
 * @param timestamp - Optional timestamp for the request (defaults to current time)
 * @returns Promise<boolean> - true if message was sent successfully, false otherwise
 */
export async function sendInfoRequestToDevice(deviceId: WirelessDeviceId, timestamp?: Date): Promise<boolean> {
    const gpsTimeEpoch = timestamp ? convertToGpsTimeEpoch(timestamp) : 0

    // Create the info request payload
    const buffer = new ArrayBuffer(5)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.INFORMATION_REQUEST)
    view.setUint32(1, gpsTimeEpoch, true)

    // Send to device without logging as an event
    return await sendToDobby(deviceId, view.buffer)
}
