import { DeviceRepository } from '../../../shared/database/repositories/device-repository';
import { DeviceData } from '../../../shared/schemas/device-data';
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../../../shared/database/client';

// Create repository instance
const deviceRepository = new DeviceRepository();

// Export repository for use by other modules
export { deviceRepository };



export const writeDobbyDataToDynamo = async (
  deviceId: string,
  timestamp: number,
  messageNumber: number,
  dataType: string,
  value: bigint | number
): Promise<DeviceData> => {
  return deviceRepository.saveDeviceData(
    deviceId,
    timestamp,
    messageNumber,
    dataType,
    value
  );
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