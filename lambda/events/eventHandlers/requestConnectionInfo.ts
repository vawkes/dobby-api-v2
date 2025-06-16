import { EventMap } from "../models/eventType.ts";
import { sendToDobby } from "../../utils/sendToDobby.ts";
import { saveEventToDynamoDB } from "../../utils/saveEvent.ts";
import { EventSchemaType } from "../eventsSchema.ts";
import { v4 as uuidv4 } from 'uuid';
import { EventType } from "../eventsSchema.ts";

interface RequestConnectionInfoData {
    device_id: string;
    event_sent?: boolean;
}

export const handleRequestConnectionInfo = async (eventData: RequestConnectionInfoData): Promise<EventSchemaType> => {
    // Create the payload using DataView
    const buffer = new ArrayBuffer(1);
    const view = new DataView(buffer);

    // Command Type
    view.setUint8(0, EventMap.REQUEST_CONNECTION_INFO);

    // Send the command to the device and get response
    const response = await sendToDobby(eventData.device_id, buffer);

    // Parse the response data
    let lastRxRssi: number | undefined;
    let lastRxSnr: number | undefined;
    let lastRxLinkType: number | undefined;

    if (response && response.length >= 7) {  // We expect at least 7 bytes in response
        const responseView = new DataView(response);

        // Check response type (should be 7)
        const responseType = responseView.getUint8(0);
        if (responseType === 7) {
            // Parse RSSI (signed int8)
            lastRxRssi = responseView.getInt8(1);

            // Parse SNR (signed int8)
            lastRxSnr = responseView.getInt8(2);

            // Parse Link Type (4 bytes)
            lastRxLinkType = responseView.getUint32(3, true);  // true for little-endian
        }
    }

    // Create the event object
    const event: EventSchemaType = {
        event_id: uuidv4(),
        event_type: EventType.REQUEST_CONNECTION_INFO,
        event_data: {
            device_id: eventData.device_id,
            event_sent: true,
            last_rx_rssi: lastRxRssi,
            last_rx_snr: lastRxSnr,
            last_rx_link_type: lastRxLinkType
        },
        event_ack: false
    };

    // Save the event to DynamoDB
    await saveEventToDynamoDB(event);

    return event;
}; 