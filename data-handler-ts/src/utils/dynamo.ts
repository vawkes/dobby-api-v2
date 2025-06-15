import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface ShiftedData {
  device_id: string;
  timestamp: number;
  message_number: number;
  data_type: string;
  value: bigint;
}

interface DeviceInfo {
  device_id: string;
  info_type: string;
  value: string | number;
}

export const writeShiftedDataToDynamo = async (
  deviceId: string,
  timestamp: number,
  messageNumber: number,
  dataType: string,
  value: bigint
): Promise<ShiftedData> => {
  const item: ShiftedData = {
    device_id: deviceId,
    timestamp,
    message_number: messageNumber,
    data_type: dataType,
    value
  };

  const command = new PutCommand({
    TableName: 'TestShiftedData',
    Item: item
  });

  try {
    await docClient.send(command);
    return item;
  } catch (error) {
    console.error('Error writing to DynamoDB:', error);
    throw error;
  }
};

export const writeDeviceInfoToDynamo = async (
  deviceId: string,
  infoType: string,
  value: string | number
): Promise<void> => {
  const item: DeviceInfo = {
    device_id: deviceId,
    info_type: infoType,
    value
  };

  const command = new PutCommand({
    TableName: 'TestDobbyInfo',
    Item: item
  });

  try {
    await docClient.send(command);
  } catch (error) {
    console.error('Error writing device info to DynamoDB:', error);
    throw error;
  }
}; 