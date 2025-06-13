import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { convertFromGpsEpoch } from '../utils/timestamp';
import { writeToTimestream } from '../utils/timestream';
import { writeShiftedDataToDynamo } from '../utils/dynamodb';

/**
 * Handles instant power data (payload type 0)
 */
export async function handleInstantPower(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing instant power data');

    // Parse power data from payload - matching Python implementation
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1 (equivalent to int.from_bytes(payload_array[1:2], "big"))
    const value = payload.readUIntBE(2, 6);  // 6 bytes at position 2 (equivalent to int.from_bytes(payload_array[2:8], "big"))
    const gpsTimestamp = payload.readUInt32BE(8);  // 4 bytes at position 8 (equivalent to int.from_bytes(payload_array[8:12], "big"))

    // Convert GPS time to UTC (GPS started Jan 6, 1980 and has no leap seconds)
    const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

    // Send acknowledgment to the device with type 2 (matching Python implementation)
    await sendAck(deviceId, 2, msgNumber);

    console.log(`Instant power: ${value} W, Message #: ${msgNumber}`);
    console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

    // Create Timestream records
    const timestreamRecords = [
        {
            MeasureName: "instant_power",
            MeasureValue: value.toString(),
            MeasureValueType: "BIGINT"
        }
    ];

    // Write to Timestream
    await writeToTimestream(deviceId, utcTimestamp, timestreamRecords);

    // Write to DynamoDB ShiftedData table
    await writeShiftedDataToDynamo(dynamodb, deviceId, utcTimestamp, msgNumber, "instant_power", value);
} 