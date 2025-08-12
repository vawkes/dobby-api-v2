import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { docClient, TABLES } from '../client';
import { 
  EventId,
  WirelessDeviceId, 
  GpsTimestamp,
  gpsTimestampSchema 
} from '../../schemas/primitives';
import { EventSchemaType, EventType } from '../../../lambda/events/eventsSchema';

/**
 * Repository for event operations
 * 
 * Centralizes all event storage, retrieval, and acknowledgment operations
 * while handling data transformations and flattening for DynamoDB storage.
 */
export class EventRepository {

  /**
   * Save an event to DynamoDB with proper flattening for storage
   * @param event - The event to save (from API schema)
   * @returns Promise<boolean> - True if saved successfully
   */
  async saveEvent(event: EventSchemaType): Promise<boolean> {
    try {
      // Convert start_time to GPS timestamp (validate and convert if needed)
      const timestamp = gpsTimestampSchema.parse(event.event_data.start_time);

      // Flatten event for DynamoDB storage
      const flattenedEvent = {
        event_id: event.event_id,
        event_type: event.event_type,
        device_id: event.event_data.device_id as WirelessDeviceId, // Always UUID internally
        event_sent: (event.event_data.event_sent as boolean) || false,
        event_ack: false, // Default to false
        timestamp: timestamp, // Validated GPS epoch timestamp (seconds)
        created_at: Date.now(),
        
        // Flatten all event_data fields for easy querying
        ...Object.fromEntries(
          Object.entries(event.event_data).filter(([key]) => key !== 'device_id')
        )
      };

      console.log(`Saving event ${event.event_id} with device_id: ${event.event_data.device_id}, GPS epoch timestamp: ${timestamp}`);

      const command = new PutCommand({
        TableName: TABLES.EVENTS,
        Item: flattenedEvent
      });

      await docClient.send(command);

      console.log(`Event ${event.event_id} saved successfully with device_id: ${flattenedEvent.device_id}, GPS epoch timestamp: ${timestamp}`);
      return true;
      
    } catch (error) {
      console.error("Error saving event:", error);
      throw new EventRepositoryError('Failed to save event', error);
    }
  }

  /**
   * Update an event's acknowledgment status when device confirms receipt
   * @param deviceId - Device that sent the acknowledgment (UUID)
   * @param eventType - Type of event being acknowledged  
   * @param timestamp - Timestamp when the event was sent (for direct lookup)
   * @returns Promise<boolean> - True if updated successfully
   */
  async acknowledgeEvent(
    deviceId: WirelessDeviceId,
    eventType: number,
    timestamp: GpsTimestamp
  ): Promise<boolean> {
    try {
      console.log(`Updating event acknowledgment for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);

      // Use composite key query: device_id + timestamp via GSI
      const queryCommand = new QueryCommand({
        TableName: TABLES.EVENTS,
        IndexName: "device_id-index",
        KeyConditionExpression: "device_id = :deviceId AND #timestamp = :timestamp",
        ExpressionAttributeNames: {
          "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
          ":deviceId": deviceId,
          ":timestamp": timestamp
        }
      });

      const queryResult = await docClient.send(queryCommand);

      if (!queryResult.Items || queryResult.Items.length === 0) {
        console.log(`No event found for device ${deviceId} with timestamp ${timestamp}`);
        return false;
      }

      const event = queryResult.Items[0];
      console.log(`Found event to acknowledge: ${JSON.stringify(event)}`);

      // Update the event_ack field to true
      const updateCommand = new UpdateCommand({
        TableName: TABLES.EVENTS,
        Key: {
          event_id: event.event_id,
          timestamp: event.timestamp
        },
        UpdateExpression: "SET event_ack = :eventAck",
        ExpressionAttributeValues: {
          ":eventAck": true
        }
      });

      await docClient.send(updateCommand);

      console.log(`Successfully acknowledged event ${event.event_id} for device ${deviceId}, event type ${eventType}, timestamp ${timestamp}`);
      return true;

    } catch (error) {
      console.error("Error acknowledging event:", error);
      throw new EventRepositoryError('Failed to acknowledge event', error);
    }
  }

  /**
   * Get events for a specific device within a time range
   * @param deviceId - Device ID (UUID)
   * @param startTime - Start of time range (GPS timestamp)
   * @param endTime - End of time range (GPS timestamp)
   * @param limit - Maximum number of events to return
   * @returns Promise<any[]> - Array of events
   */
  async getEventsForDevice(
    deviceId: WirelessDeviceId,
    startTime: GpsTimestamp,
    endTime: GpsTimestamp,
    limit: number = 100
  ): Promise<any[]> {
    try {
      const command = new QueryCommand({
        TableName: TABLES.EVENTS,
        IndexName: "device_id-index",
        KeyConditionExpression: "device_id = :deviceId AND #timestamp BETWEEN :startTime AND :endTime",
        ExpressionAttributeNames: {
          "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
          ":deviceId": deviceId,
          ":startTime": startTime,
          ":endTime": endTime
        },
        ScanIndexForward: false, // Most recent first
        Limit: limit
      });

      const result = await docClient.send(command);
      return result.Items || [];
      
    } catch (error) {
      console.error("Error getting events for device:", error);
      throw new EventRepositoryError('Failed to get events for device', error);
    }
  }

  /**
   * Get events by type within a time range
   * @param eventType - Type of event to filter by
   * @param startTime - Start of time range
   * @param endTime - End of time range
   * @param limit - Maximum number of events to return
   * @returns Promise<any[]> - Array of events
   */
  async getEventsByType(
    eventType: EventType,
    startTime: GpsTimestamp,
    endTime: GpsTimestamp,
    limit: number = 100
  ): Promise<any[]> {
    try {
      // Note: This would benefit from a GSI on event_type + timestamp
      // For now, we'll use a filter expression
      const command = new QueryCommand({
        TableName: TABLES.EVENTS,
        FilterExpression: "event_type = :eventType AND #timestamp BETWEEN :startTime AND :endTime",
        ExpressionAttributeNames: {
          "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
          ":eventType": eventType,
          ":startTime": startTime,
          ":endTime": endTime
        },
        ScanIndexForward: false,
        Limit: limit
      });

      const result = await docClient.send(command);
      return result.Items || [];
      
    } catch (error) {
      console.error("Error getting events by type:", error);
      throw new EventRepositoryError('Failed to get events by type', error);
    }
  }

  /**
   * Get a specific event by ID and timestamp
   * @param eventId - Event ID (UUID)
   * @param timestamp - Event timestamp
   * @returns Promise<any | null> - Event data or null if not found
   */
  async getEvent(eventId: EventId, timestamp: GpsTimestamp): Promise<any | null> {
    try {
      const command = new QueryCommand({
        TableName: TABLES.EVENTS,
        KeyConditionExpression: "event_id = :eventId AND #timestamp = :timestamp",
        ExpressionAttributeNames: {
          "#timestamp": "timestamp"
        },
        ExpressionAttributeValues: {
          ":eventId": eventId,
          ":timestamp": timestamp
        }
      });

      const result = await docClient.send(command);
      return result.Items && result.Items.length > 0 ? result.Items[0] : null;
      
    } catch (error) {
      console.error("Error getting event:", error);
      throw new EventRepositoryError('Failed to get event', error);
    }
  }
}

/**
 * Custom error class for event repository operations
 */
export class EventRepositoryError extends Error {
  constructor(message: string, public cause?: unknown) {
    super(message);
    this.name = 'EventRepositoryError';
  }
}
