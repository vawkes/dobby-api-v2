import { TimestreamWriteClient, WriteRecordsCommand } from '@aws-sdk/client-timestream-write';

interface TimestreamRecord {
  MeasureName: string;
  MeasureValue: string;
  MeasureValueType: string;
}

const timestreamClient = new TimestreamWriteClient({});

export const writeToTimestream = async (
  deviceId: string,
  timestamp: number,
  records: TimestreamRecord[]
): Promise<void> => {
  const command = new WriteRecordsCommand({
    DatabaseName: process.env.TIMESTREAM_DATABASE,
    TableName: process.env.TIMESTREAM_TABLE,
    Records: records.map(record => ({
      ...record,
      Time: timestamp.toString(),
      Dimensions: [
        {
          Name: 'device_id',
          Value: deviceId
        }
      ]
    }))
  });

  try {
    await timestreamClient.send(command);
  } catch (error) {
    console.error('Error writing to Timestream:', error);
    throw error;
  }
}; 