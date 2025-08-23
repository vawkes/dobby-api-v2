import { EventMap } from "../events/models/eventType"
import { sendToDobby } from "./sendToDobby"
import { WirelessDeviceId } from "../../shared/schemas/primitives"

/**
 * Sends a connection info request to a device without logging to event table
 * Used for administrative operations like watchdog timer feeds
 * 
 * @param deviceId - The wireless device ID to send the request to
 * @returns Promise<boolean> - true if message was sent successfully, false otherwise
 */
export async function sendConnectionInfoRequestToDevice(deviceId: WirelessDeviceId): Promise<boolean> {
    // Create the connection info request payload (1-byte payload)
    const buffer = new ArrayBuffer(1)
    const view = new DataView(buffer)
    view.setUint8(0, EventMap.REQUEST_CONNECTION_INFO)

    // Send to device without logging as an event
    return await sendToDobby(deviceId, view.buffer)
}