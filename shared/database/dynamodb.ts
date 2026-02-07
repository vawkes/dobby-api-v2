import { DynamoDB, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';

const DEFAULT_REGION = 'us-east-1';

export function getDynamoDBConfig(): DynamoDBClientConfig {
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || DEFAULT_REGION;
  const endpoint = process.env.DYNAMODB_ENDPOINT || process.env.AWS_ENDPOINT_URL_DYNAMODB;

  if (!endpoint) {
    return { region };
  }

  return {
    region,
    endpoint,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
    },
  };
}

export function createDynamoDBClient(): DynamoDB {
  return new DynamoDB(getDynamoDBConfig());
}
