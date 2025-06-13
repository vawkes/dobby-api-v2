import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { OperationalState } from '../iotSchema';
import { sendAck } from '../utils/acknowledgment';
import { convertFromGpsEpoch } from '../utils/timestamp';
import { writeToTimestream } from '../utils/timestream';
import { writeShiftedDataToDynamo } from '../utils/dynamodb';
import { getEnumKeyByValue } from '../utils/enum';

/**
 * Handles operational state data (payload type 6)
 */
export async function handleOperationalState(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing operational state data');

    // Parse operational state from the payload
    // Equivalent to Python's struct.unpack(">BBBI", payload)
    // B = unsigned char (1 byte), I = unsigned int (4 bytes) in big-endian format
    const payloadType = payload.readUInt8(0);  // First B
    const msgNumber = payload.readUInt8(1);    // Second B
    const state = payload.readUInt8(2);        // Third B
    const gpsTimestamp = payload.readUInt32BE(3); // I (4 bytes)

    // Send acknowledgment to the device with type 0 (matching Python implementation)
    await sendAck(deviceId, 0, msgNumber);

    // Convert GPS time to UTC
    const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

    // Get the operational state name from the enum
    const stateName = getEnumKeyByValue(OperationalState, state);

    console.log(`Operational State: ${stateName || 'UNKNOWN'}`);
    console.log(`Message Number: ${msgNumber}`);
    console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

    // Create Timestream records
    const timestreamRecords = [
        {
            MeasureName: "operational_state",
            MeasureValue: state.toString(),
            MeasureValueType: "BIGINT"
        }
    ];

    // Write to Timestream
    await writeToTimestream(deviceId, utcTimestamp, timestreamRecords);

    // Write to DynamoDB ShiftedData table
    await writeShiftedDataToDynamo(dynamodb, deviceId, utcTimestamp, msgNumber, "operational_state", state);
} 