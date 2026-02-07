import { v4 as uuidv4 } from 'uuid';
import { EventSchemaType, EventType } from './eventsSchema.ts';
import { handleLoadUp } from "./eventHandlers/loadUp.ts";
import { handleStartShed } from "./eventHandlers/startShed.ts";
import { handleEndShed } from "./eventHandlers/endShed.ts";
import { handleGridEmergency } from "./eventHandlers/gridEmergency.ts";
import { handleCriticalPeak } from "./eventHandlers/criticalPeak.ts";
import { handleCustomerOverride } from "./eventHandlers/customerOverride.ts";
import { handleAdvancedLoadUp } from "./eventHandlers/advancedLoadUp.ts";
import { handleInfoRequest } from "./eventHandlers/infoRequest.ts";
import { handleRequestConnectionInfo } from "./eventHandlers/requestConnectionInfo.ts";
import { handleSetBitmap } from "./eventHandlers/setBitmap.ts";
import { handleSetUtcTime } from "./eventHandlers/setUtcTime.ts";
import { handleGetUtcTime } from "./eventHandlers/getUtcTime.ts";
import { handleStartDataPublish } from "./eventHandlers/startDataPublish.ts";

export interface EventRequestData {
    device_id: string | string[];
    [key: string]: unknown;
}

export async function dispatchEventToDevice(
    eventType: EventType,
    eventData: EventRequestData,
    resolvedDeviceId: string
): Promise<EventSchemaType | null> {
    switch (eventType) {
        case EventType.LOAD_UP:
            return handleLoadUp(
                resolvedDeviceId,
                typeof eventData.start_time === 'string' ? new Date(eventData.start_time) : undefined,
                typeof eventData.duration === 'number' ? eventData.duration : undefined
            );
        case EventType.GRID_EMERGENCY:
            return handleGridEmergency(
                resolvedDeviceId,
                typeof eventData.start_time === 'string' ? new Date(eventData.start_time) : undefined
            );
        case EventType.CRITICAL_PEAK:
            return handleCriticalPeak(
                resolvedDeviceId,
                typeof eventData.start_time === 'string' ? new Date(eventData.start_time) : undefined
            );
        case EventType.START_SHED:
            return handleStartShed(
                resolvedDeviceId,
                typeof eventData.start_time === 'string' ? new Date(eventData.start_time) : undefined,
                typeof eventData.duration === 'number' ? eventData.duration : 0
            );
        case EventType.END_SHED:
            return handleEndShed(
                resolvedDeviceId,
                typeof eventData.start_time === 'string' ? new Date(eventData.start_time) : undefined
            );
        case EventType.INFO_REQUEST:
            return handleInfoRequest(
                resolvedDeviceId,
                typeof eventData.timestamp === 'string' ? new Date(eventData.timestamp) : undefined
            );
        case EventType.ADVANCED_LOAD_UP: {
            const startTime = typeof eventData.start_time === 'string'
                ? new Date(eventData.start_time)
                : new Date();
            const duration = typeof eventData.duration === 'number' ? eventData.duration : 0;
            const value = typeof eventData.value === 'number' ? eventData.value : 0;
            const units = typeof eventData.units === 'number' ? eventData.units : 0;
            const suggestedLoadUpEfficiency = typeof eventData.suggested_load_up_efficiency === 'number'
                ? eventData.suggested_load_up_efficiency
                : 0;
            const startRandomization = typeof eventData.start_randomization === 'number'
                ? eventData.start_randomization
                : 0;
            const endRandomization = typeof eventData.end_randomization === 'number'
                ? eventData.end_randomization
                : 0;
            const eventId = typeof eventData.event_id === 'string' ? eventData.event_id : uuidv4();

            return handleAdvancedLoadUp(
                resolvedDeviceId,
                startTime,
                duration,
                value,
                units,
                suggestedLoadUpEfficiency,
                eventId,
                startRandomization,
                endRandomization
            );
        }
        case EventType.CUSTOMER_OVERRIDE:
            return handleCustomerOverride(
                resolvedDeviceId,
                typeof eventData.override === 'boolean' ? eventData.override : false
            );
        case EventType.SET_UTC_TIME:
            return handleSetUtcTime({
                device_id: resolvedDeviceId,
                utc_seconds: typeof eventData.utc_seconds === 'number' ? eventData.utc_seconds : 0,
                utc_offset: typeof eventData.utc_offset === 'number' ? eventData.utc_offset : 0,
                dst_offset: typeof eventData.dst_offset === 'number' ? eventData.dst_offset : 0,
            });
        case EventType.GET_UTC_TIME:
            return handleGetUtcTime({
                device_id: resolvedDeviceId,
            });
        case EventType.SET_BITMAP:
            return handleSetBitmap({
                device_id: resolvedDeviceId,
                bit_number: typeof eventData.bit_number === 'number' ? eventData.bit_number : 0,
                set_value: typeof eventData.set_value === 'boolean' ? eventData.set_value : false,
            });
        case EventType.REQUEST_CONNECTION_INFO:
            return handleRequestConnectionInfo({
                device_id: resolvedDeviceId,
                event_sent: false
            });
        case EventType.START_DATA_PUBLISH:
            return handleStartDataPublish(
                resolvedDeviceId,
                typeof eventData.interval_minutes === 'number' ? eventData.interval_minutes : 0
            );
        default:
            return null;
    }
}

