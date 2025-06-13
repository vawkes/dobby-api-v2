import { TimestreamWriteClient, WriteRecordsCommand } from "@aws-sdk/client-timestream-write";

/**
 * Writes data to Amazon Timestream
 */
export async function writeToTimestream(deviceId: string, timestamp: number, records: any[]): Promise<void> {
    try {
        console.log(`Writing to Timestream for device ${deviceId}`);
        console.log('Records:', JSON.stringify(records));

        const timestreamWrite = new TimestreamWriteClient({ region: "us-east-1" });

        const dimensions = [
            { Name: "device_id", Value: deviceId }
        ];

        const timestreamRecords = records.map(record => ({
            Dimensions: dimensions,
            MeasureName: record.MeasureName,
            MeasureValue: record.MeasureValue,
            MeasureValueType: record.MeasureValueType,
            Time: (timestamp * 1000).toString(),
            TimeUnit: "MILLISECONDS"
        }));

        const command = new WriteRecordsCommand({
            DatabaseName: "GridCubeData",
            TableName: "DeviceMeasurements",
            Records: timestreamRecords
        });

        await timestreamWrite.send(command);
        console.log('Data written to Timestream successfully');
    } catch (error) {
        console.error('Error writing to Timestream:', error);
    }
} 