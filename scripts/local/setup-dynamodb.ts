import { DynamoDB } from '@aws-sdk/client-dynamodb';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000';

const dynamodb = new DynamoDB({
  region,
  endpoint,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

type TableInput = Parameters<DynamoDB['createTable']>[0];

const tables: TableInput[] = [
  {
    TableName: 'DobbyInfo',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'device_id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'device_id', AttributeType: 'S' }],
  },
  {
    TableName: 'DobbyData',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'device_id', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'device_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' },
    ],
  },
  {
    TableName: 'DobbyEvent',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'event_id', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'event_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' },
      { AttributeName: 'device_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'device_id-index',
        KeySchema: [
          { AttributeName: 'device_id', KeyType: 'HASH' },
          { AttributeName: 'timestamp', KeyType: 'RANGE' },
        ],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'ProductionLine',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'device_id', KeyType: 'HASH' },
      { AttributeName: 'timestamp', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'device_id', AttributeType: 'S' },
      { AttributeName: 'timestamp', AttributeType: 'N' },
      { AttributeName: 'wireless_device_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'wireless_device_id-index',
        KeySchema: [{ AttributeName: 'wireless_device_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'Companies',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [{ AttributeName: 'id', KeyType: 'HASH' }],
    AttributeDefinitions: [{ AttributeName: 'id', AttributeType: 'S' }],
  },
  {
    TableName: 'CompanyUsers',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'company_id', KeyType: 'HASH' },
      { AttributeName: 'user_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'company_id', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'user_id-index',
        KeySchema: [{ AttributeName: 'user_id', KeyType: 'HASH' }],
        Projection: { ProjectionType: 'ALL' },
      },
    ],
  },
  {
    TableName: 'CompanyDevices',
    BillingMode: 'PAY_PER_REQUEST',
    KeySchema: [
      { AttributeName: 'company_id', KeyType: 'HASH' },
      { AttributeName: 'device_id', KeyType: 'RANGE' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'company_id', AttributeType: 'S' },
      { AttributeName: 'device_id', AttributeType: 'S' },
    ],
  },
];

async function ensureTable(table: TableInput) {
  const tableName = table.TableName!;
  try {
    await dynamodb.createTable(table);
    console.log(`Created table: ${tableName}`);
  } catch (error) {
    const e = error as { name?: string };
    if (e.name === 'ResourceInUseException') {
      console.log(`Table already exists: ${tableName}`);
    } else {
      throw error;
    }
  }
}

async function main() {
  console.log(`Setting up DynamoDB tables on ${endpoint} (${region})`);
  for (const table of tables) {
    await ensureTable(table);
  }
  console.log('DynamoDB setup complete.');
}

main().catch((error) => {
  console.error('Failed to setup DynamoDB tables:', error);
  process.exit(1);
});
