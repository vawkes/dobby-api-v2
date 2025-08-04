import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

interface DobbyData {
  device_id: string;
  timestamp: number;
  message_number: number;
  instant_power?: bigint;
  cumulative_energy?: bigint;
  operational_state?: number;
}



export const writeDobbyDataToDynamo = async (
  deviceId: string,
  timestamp: number,
  messageNumber: number,
  dataType: string,
  value: bigint | number
): Promise<DobbyData> => {
  const command = new UpdateCommand({
    TableName: 'DobbyData',
    Key: {
      device_id: deviceId,
      timestamp: timestamp
    },
    UpdateExpression: 'SET message_number = :msgNum, #dataType = :value',
    ExpressionAttributeNames: {
      '#dataType': dataType
    },
    ExpressionAttributeValues: {
      ':msgNum': messageNumber,
      ':value': value
    }
  });

  try {
    await docClient.send(command);
    return {
      device_id: deviceId,
      timestamp,
      message_number: messageNumber,
      [dataType]: value
    };
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
  const command = new UpdateCommand({
    TableName: 'DobbyInfo',
    Key: {
      device_id: deviceId
    },
    UpdateExpression: 'SET #infoType = :value, updated_at = :updatedAt',
    ExpressionAttributeNames: {
      '#infoType': infoType
    },
    ExpressionAttributeValues: {
      ':value': value,
      ':updatedAt': new Date().toISOString()
    }
  });

  try {
    await docClient.send(command);
  } catch (error) {
    console.error('Error writing device info to DynamoDB:', error);
    throw error;
  }
}; 