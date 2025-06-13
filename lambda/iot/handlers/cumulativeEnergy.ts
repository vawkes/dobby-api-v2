import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { convertFromGpsEpoch } from '../utils/timestamp';
import { writeToTimestream } from '../utils/timestream';
import { writeShiftedDataToDynamo } from '../utils/dynamodb';

/**
 * Handles cumulative energy data (payload type 1)
 */
export async function handleCumulativeEnergy(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing cumulative energy data');

    // Parse energy data from payload - matching Python implementation
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1 (equivalent to int.from_bytes(payload_array[1:2], "big"))
    const value = payload.readUIntBE(2, 6);  // 6 bytes at position 2 (equivalent to int.from_bytes(payload_array[2:8], "big"))
    const gpsTimestamp = payload.readUInt32BE(8);  // 4 bytes at position 8 (equivalent to int.from_bytes(payload_array[8:12], "big"))

    // Convert GPS time to UTC
    const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

    // Send acknowledgment to the device with type 1 (matching Python implementation)
    await sendAck(deviceId, 1, msgNumber);

    console.log(`Cumulative energy: ${value} Wh, Message #: ${msgNumber}`);
    console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

    // Create Timestream records
    const timestreamRecords = [
        {
            MeasureName: "cumulative_energy",
            MeasureValue: value.toString(),
            MeasureValueType: "BIGINT"
        }
    ];

    // Write to Timestream
    await writeToTimestream(deviceId, utcTimestamp, timestreamRecords);

    // Write to DynamoDB ShiftedData table
    await writeShiftedDataToDynamo(dynamodb, deviceId, utcTimestamp, msgNumber, "cumulative_energy", value);
} 