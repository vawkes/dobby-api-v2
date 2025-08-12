import { UpdateCommand, QueryCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../client';
import { 
  DeviceData, 
  DeviceDataApi, 
  deviceDataSchema, 
  DeviceDataTransformer 
} from '../../schemas/device-data';
import { 
  GpsTimestamp, 
  WirelessDeviceId, 
  DeviceId,
  MessageNumber 
} from '../../schemas/primitives';

/**
 * Repository for device data operations
 * 
 * Centralizes all device data access patterns and provides a clean interface
 * for CRUD operations while handling data transformations consistently.
 */
export class DeviceRepository {
  
  /**
   * Save device data to DynamoDB
   * @param deviceId - Wireless device ID (UUID)
   * @param timestamp - GPS timestamp (seconds)
   * @param messageNumber - Message sequence number
   * @param dataType - Type of data being saved (instant_power, cumulative_energy, etc.)
   * @param value - The data value
   * @returns Promise<DeviceData> - The saved device data
   */
  async saveDeviceData(
    deviceId: WirelessDeviceId,
    timestamp: GpsTimestamp,
    messageNumber: MessageNumber,
    dataType: string,
    value: bigint | number
  ): Promise<DeviceData> {
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
        ':value': typeof value === 'bigint' ? value.toString() : value
      },
      ReturnValues: 'ALL_NEW'
    });

    try {
      const response = await docClient.send(command);
      
      if (response.Attributes) {
        return DeviceDataTransformer.fromDb(response.Attributes);
      } else {
        // Fallback - construct the data we expect
        const fallbackData = {
          device_id: deviceId,
          timestamp,
          message_number: messageNumber,
          [dataType]: value
        };
        return deviceDataSchema.parse(fallbackData);
      }
    } catch (error) {
      console.error('Error saving device data:', error);
      throw new DeviceDataError('Failed to save device data', error);
    }
  }

  /**
   * Get device data for a specific device and timestamp
   * @param deviceId - Wireless device ID (UUID)
   * @param timestamp - Specific GPS timestamp
   * @returns Promise<DeviceData | null> - The device data or null if not found
   */
  async getDeviceDataPoint(
    deviceId: WirelessDeviceId,
    timestamp: GpsTimestamp
  ): Promise<DeviceData | null> {
    const command = new GetCommand({
      TableName: TABLES.DEVICE_DATA,
      Key: {
        device_id: deviceId,
        timestamp: timestamp
      }
    });

    try {
      const response = await docClient.send(command);
      
      if (response.Item) {
        return DeviceDataTransformer.fromDb(response.Item);
      }
      return null;
    } catch (error) {
      console.error('Error getting device data point:', error);
      throw new DeviceDataError('Failed to get device data point', error);
    }
  }

  /**
   * Get device data range for a device within a time window
   * Uses composite key query for efficient access (device_id + timestamp range)
   * 
   * @param deviceId - Wireless device ID (UUID)
   * @param startTime - Start of time range (GPS timestamp)
   * @param endTime - End of time range (GPS timestamp)
   * @param limit - Maximum number of records to return (default: 1000)
   * @returns Promise<DeviceData[]> - Array of device data points
   */
  async getDeviceDataRange(
    deviceId: WirelessDeviceId,
    startTime: GpsTimestamp,
    endTime: GpsTimestamp,
    limit: number = 1000
  ): Promise<DeviceData[]> {
    const command = new QueryCommand({
      TableName: TABLES.DEVICE_DATA,
      KeyConditionExpression: 'device_id = :deviceId AND #timestamp BETWEEN :startTime AND :endTime',
      ExpressionAttributeNames: {
        '#timestamp': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':deviceId': deviceId,
        ':startTime': startTime,
        ':endTime': endTime
      },
      ScanIndexForward: false, // Most recent first
      Limit: limit
    });

    try {
      const response = await docClient.send(command);
      
      return (response.Items || []).map(item => 
        DeviceDataTransformer.fromDb(item)
      );
    } catch (error) {
      console.error('Error getting device data range:', error);
      throw new DeviceDataError('Failed to get device data range', error);
    }
  }

  /**
   * Get latest device data point for a device
   * @param deviceId - Wireless device ID (UUID)
   * @returns Promise<DeviceData | null> - Latest device data or null
   */
  async getLatestDeviceData(deviceId: WirelessDeviceId): Promise<DeviceData | null> {
    const command = new QueryCommand({
      TableName: TABLES.DEVICE_DATA,
      KeyConditionExpression: 'device_id = :deviceId',
      ExpressionAttributeValues: {
        ':deviceId': deviceId
      },
      ScanIndexForward: false, // Most recent first
      Limit: 1
    });

    try {
      const response = await docClient.send(command);
      
      if (response.Items && response.Items.length > 0) {
        return DeviceDataTransformer.fromDb(response.Items[0]);
      }
      return null;
    } catch (error) {
      console.error('Error getting latest device data:', error);
      throw new DeviceDataError('Failed to get latest device data', error);
    }
  }

  /**
   * Transform device data for API responses
   * @param deviceData - Internal device data
   * @param apiDeviceId - 6-digit device ID for API response
   * @returns DeviceDataApi - API-formatted device data
   */
  toApiFormat(deviceData: DeviceData, apiDeviceId: DeviceId): DeviceDataApi {
    return DeviceDataTransformer.toApi(deviceData, apiDeviceId);
  }
}

/**
 * Custom error class for device data operations
 */
export class DeviceDataError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'DeviceDataError';
  }
}
