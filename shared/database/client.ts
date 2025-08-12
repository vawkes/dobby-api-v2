import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

/**
 * Unified DynamoDB client for consistent database access across the application
 * 
 * This replaces the various client instantiations throughout the codebase
 * with a single, shared DocumentClient instance for better performance
 * and consistency.
 */

// Create the base DynamoDB client
const client = new DynamoDBClient({ 
  region: "us-east-1" 
});

// Create the DocumentClient from the base client
// This handles marshalling/unmarshalling automatically
export const docClient = DynamoDBDocumentClient.from(client);

// Export the base client for cases where low-level access is needed
export const lowLevelClient = client;

/**
 * Table name constants to avoid magic strings and enable easy environment switching
 */
export const TABLES = {
  DEVICE_INFO: 'DobbyInfo',
  DEVICE_DATA: 'DobbyData', 
  EVENTS: 'DobbyEvent',
  PRODUCTION_LINE: 'ProductionLine',
  COMPANIES: 'Companies',
  COMPANY_USERS: 'CompanyUsers',
  COMPANY_DEVICES: 'CompanyDevices',
} as const;

/**
 * Type for table names to ensure type safety when referencing tables
 */
export type TableName = typeof TABLES[keyof typeof TABLES];
