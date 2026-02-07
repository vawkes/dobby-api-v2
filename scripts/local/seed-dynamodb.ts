import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { getDynamoDBConfig } from '../../shared/database/dynamodb';

const localUserId = process.env.LOCAL_DEV_USER_ID || 'local-dev-admin';
const localUserEmail = process.env.LOCAL_DEV_USER_EMAIL || 'local-dev@example.com';
const companyId = process.env.LOCAL_DEV_COMPANY_ID || 'local-company';
const deviceId = process.env.LOCAL_DEV_DEVICE_ID || '000001';
const wirelessDeviceId = process.env.LOCAL_DEV_WIRELESS_DEVICE_ID || '11111111-1111-1111-1111-111111111111';

const nowEpoch = Math.floor(Date.now() / 1000);
const nowIso = new Date().toISOString();

const client = new DynamoDBClient(getDynamoDBConfig());
const docClient = DynamoDBDocumentClient.from(client);

async function put(tableName: string, item: Record<string, unknown>) {
  await docClient.send(new PutCommand({
    TableName: tableName,
    Item: item,
  }));
}

async function main() {
  console.log('Seeding local DynamoDB with baseline development data...');

  await put('Companies', {
    id: companyId,
    name: 'Local Development Company',
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await put('CompanyUsers', {
    company_id: companyId,
    user_id: localUserId,
    role: 'SUPER_ADMIN',
    added_at: nowIso,
    email: localUserEmail,
  });

  await put('CompanyDevices', {
    company_id: companyId,
    device_id: deviceId,
    assigned_at: nowIso,
  });

  await put('ProductionLine', {
    device_id: deviceId,
    timestamp: nowEpoch,
    wireless_device_id: wirelessDeviceId,
  });

  await put('DobbyInfo', {
    device_id: wirelessDeviceId,
    updated_at: nowIso,
    cta_version: '1.0.0',
    firmware_date: '2026-01-01',
    model_number: 'GC-LOCAL',
    device_type: 'GridCube',
    gridcube_firmware_version: '2.0.0',
    capability_bitmap: '0011',
    device_revision: 'A',
    firmware_version: '1.0.0',
    serial_number: 'LOCAL-SN-0001',
    vendor_id: 'LOCAL',
    rssi: -65,
    link_type: 4,
  });

  await put('DobbyData', {
    device_id: wirelessDeviceId,
    timestamp: nowEpoch - 300,
    cumulative_energy: 1234.56,
    instant_power: 2450,
    msg_number: 100,
    operational_state: 1,
  });

  await put('DobbyData', {
    device_id: wirelessDeviceId,
    timestamp: nowEpoch,
    cumulative_energy: 1236.12,
    instant_power: 2480,
    msg_number: 101,
    operational_state: 1,
  });

  await put('DobbyEvent', {
    event_id: '00000000-0000-0000-0000-000000000001',
    timestamp: nowEpoch,
    device_id: wirelessDeviceId,
    event_type: 'INFO_REQUEST',
    event_ack: false,
    event_sent: false,
    created_at: Date.now(),
    event_data: {
      device_id: wirelessDeviceId,
      timestamp: nowEpoch,
    },
  });

  console.log('Local DynamoDB seed complete.');
  console.log(`User: ${localUserId}`);
  console.log(`Company: ${companyId}`);
  console.log(`Device: ${deviceId} -> ${wirelessDeviceId}`);
}

main().catch((error) => {
  console.error('Failed to seed local DynamoDB:', error);
  process.exit(1);
});
