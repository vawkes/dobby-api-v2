import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../../shared/database/client';

export interface SignalDataFields {
  source_packet_type?: number;
  sidewalk_rssi?: number;
  rssi?: number;
  snr?: number;
  link_type?: number;
}

const hasSignalValue = (fields: SignalDataFields): boolean => (
  fields.sidewalk_rssi !== undefined ||
  fields.rssi !== undefined ||
  fields.snr !== undefined ||
  fields.link_type !== undefined
);

export const writeSignalDataToDynamo = async (
  deviceId: string,
  fields: SignalDataFields,
  timestamp: number = Date.now()
): Promise<void> => {
  if (!hasSignalValue(fields)) {
    return;
  }

  const item: Record<string, string | number> = {
    device_id: deviceId,
    timestamp,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      item[key] = value;
    }
  }

  const command = new PutCommand({
    TableName: TABLES.DEVICE_SIGNAL_DATA,
    Item: item,
  });

  try {
    await docClient.send(command);
  } catch (error) {
    console.error('Error writing signal data to DynamoDB:', error);
    throw error;
  }
};
