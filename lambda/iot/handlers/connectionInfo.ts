import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { sendAck } from '../utils/acknowledgment';
import { convertFromGpsEpoch } from '../utils/timestamp';
import { writeToTimestream } from '../utils/timestream';
import { writeShiftedDataToDynamo } from '../utils/dynamodb';

/**
 * Handles connection info data (payload type 7)
 */
export async function handleConnectionInfo(payload: Buffer, deviceId: string, dynamodb: DynamoDB): Promise<void> {
    console.log('Processing connection info data');

    // Parse connection info from payload
    const msgNumber = payload.readUInt8(1);  // 1 byte at position 1
    const networkType = payload.readUInt8(2);  // 1 byte at position 2
    const rssi = payload.readInt8(3);  // 1 byte at position 3 (signed)
    const gpsTimestamp = payload.readUInt32BE(4);  // 4 bytes at position 4

    // Convert GPS time to UTC
    const utcTimestamp = convertFromGpsEpoch(gpsTimestamp);

    // Send acknowledgment to the device with type 7
    await sendAck(deviceId, 7, msgNumber);

    console.log(`Connection Info - Network Type: ${networkType}, RSSI: ${rssi} dBm, Message #: ${msgNumber}`);
    console.log(`Timestamp: ${new Date(utcTimestamp * 1000).toISOString()}`);

    // Create Timestream records
    const timestreamRecords = [
        {
            MeasureName: "network_type",
            MeasureValue: networkType.toString(),
            MeasureValueType: "BIGINT"
        },
        {
            MeasureName: "rssi",
            MeasureValue: rssi.toString(),
            MeasureValueType: "BIGINT"
        }
    ];

    // Write to Timestream
    await writeToTimestream(deviceId, utcTimestamp, timestreamRecords);

    // Write to DynamoDB ShiftedData table
    await writeShiftedDataToDynamo(dynamodb, deviceId, utcTimestamp, msgNumber, "network_type", networkType);
    await writeShiftedDataToDynamo(dynamodb, deviceId, utcTimestamp, msgNumber, "rssi", rssi);
} 