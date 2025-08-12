import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../../shared/database/client';
import { DeviceData, deviceDataSchema, DeviceDataTransformer } from '../../../shared/schemas/device-data';



export const writeDobbyDataToDynamo = async (
  deviceId: string,
  timestamp: number,
  messageNumber: number,
  dataType: string,
  value: bigint | number
): Promise<DeviceData> => {
  const command = new UpdateCommand({
    TableName: TABLES.DEVICE_DATA,
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
    },
    ReturnValues: 'ALL_NEW'
  });

  try {
    const response = await docClient.send(command);
    
    if (response.Attributes) {
      // Use transformer to convert from DB format to internal format
      return DeviceDataTransformer.fromDb(response.Attributes);
    } else {
      // Fallback to partial data if no attributes returned
      const fallbackData = {
        device_id: deviceId,
        timestamp,
        message_number: messageNumber,
        [dataType]: value
      };
      return deviceDataSchema.parse(fallbackData);
    }
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
    TableName: TABLES.DEVICE_INFO,
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