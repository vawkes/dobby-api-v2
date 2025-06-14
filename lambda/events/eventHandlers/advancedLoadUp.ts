import { v4 as uuidv4 } from 'uuid';
import { EventMap } from '../models/eventType.ts';
import { EventSchemaType, EventType } from '../eventsSchema.ts';
import { sendToDobby } from '../../utils/sendToDobby.ts';
import { saveEventToDynamoDB } from '../../utils/saveEvent.ts';

/**
 * Units field specification:
 * 0x00 - 1 watt-hour (Wh)
 * 0x01 - 10 Wh
 * 0x02 - 100 Wh
 * 0x03 - 1000 Wh (1 kWh)
 * 0x04 to 0xFE - Reserved for future use - Do not use
 * 0xFF - Used in response to GetAdvancedLoadUp, indicates advanced load up is not active
 * 
 * Value field specification:
 * 0x0000 - No Effect on the SGD, but the SGD should respond with Response Code = Success if this
 *          Advanced Load Up command is implemented and the necessary mixing valve or other safety
 *          precautions are in place. When using this value, units must be set to 0xFF.
 * 0x0001 to 0xFFFE - This quantity of Units specifies the minimum amount of energy that the SGD
 *                    should store above the amount that would be stored during normal operation.
 * 0xFFFF - Store as much energy as possible above the normal amount, while maintaining the safety
 *          and efficiency of the SGD and any temperature limiting device.
 */
export const handleAdvancedLoadUp = async (
    deviceId: string,
    startTime: Date,
    duration: number,
    value: number,
    units: number,
    suggestedLoadUpEfficiency: number,
    eventId: string,
    startRandomization: number,
    endRandomization: number
): Promise<EventSchemaType | null> => {
    try {
        // Validate units
        if (units < 0 || units > 0xFF) {
            throw new Error('Invalid units value. Must be between 0x00 and 0xFF');
        }
        if (units >= 0x04 && units <= 0xFE) {
            throw new Error('Units value is in reserved range (0x04 to 0xFE)');
        }

        // Validate value
        if (value < 0 || value > 0xFFFF) {
            throw new Error('Invalid value. Must be between 0x0000 and 0xFFFF');
        }

        // Validate value and units combination
        if (value === 0x0000 && units !== 0xFF) {
            throw new Error('When value is 0x0000, units must be set to 0xFF');
        }

        // Convert start time to UTC seconds since 1/1/2000
        const startTimeUTC = Math.floor((startTime.getTime() - new Date('2000-01-01').getTime()) / 1000);

        // Create the message payload according to the spec
        const buffer = new ArrayBuffer(17);
        const view = new DataView(buffer);
        
        // Command Type
        view.setUint8(0, EventMap.SET_ADVANCED_LOAD_UP);
        
        // Event Duration in Minutes (2 bytes)
        view.setUint16(1, duration, true);
        
        // Value (2 bytes)
        view.setUint16(3, value, true);
        
        // Units
        view.setUint8(5, units, true);
        
        // Suggested Load Up Efficiency
        view.setUint8(6, suggestedLoadUpEfficiency);
        
        // Event ID (4 bytes)
        const eventIdNum = parseInt(eventId.replace(/-/g, '').substring(0, 8), 16);
        view.setUint32(7, eventIdNum, true);
        
        // Start Time UTC (4 bytes)
        view.setUint32(11, startTimeUTC, true);
        
        // Start Randomization
        view.setUint8(15, startRandomization);
        
        // End Randomization
        view.setUint8(16, endRandomization);

        // Send the message to Dobby
        const sentToDobby = await sendToDobby(deviceId, buffer);

        // Create the event record
        const event: EventSchemaType = {
            event_id: uuidv4(),
            event_type: EventType.ADVANCED_LOAD_UP,
            event_data: {
                device_id: deviceId,
                start_time: startTime.toISOString(),
                duration,
                value,
                units,
                suggested_load_up_efficiency: suggestedLoadUpEfficiency,
                event_id: eventId,
                start_randomization: startRandomization,
                end_randomization: endRandomization,
                message: Array.from(new Uint8Array(buffer)),
                event_sent: sentToDobby
            }
        };

        // Save the event to DynamoDB
        await saveEventToDynamoDB(event);

        return event;
    } catch (error) {
        console.error("Error handling advanced load up event:", error);
        return null;
    }
}; 