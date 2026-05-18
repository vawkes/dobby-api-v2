import { Hono } from 'hono';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import devices from '../lambda/devices/devices.ts';
import { createDynamoDBClient } from '../shared/database/dynamodb';

jest.mock('../shared/database/dynamodb', () => ({
    createDynamoDBClient: jest.fn(),
}));

jest.mock('../lambda/utils/permissions.ts', () => ({
    Action: {
        READ_DEVICES: 'read_devices',
    },
    requirePermission: () => async (_c: unknown, next: () => Promise<void>) => next(),
    requireDevicePermission: () => async (_c: unknown, next: () => Promise<void>) => next(),
}));

jest.mock('../lambda/utils/deviceIdMapping.ts', () => ({
    resolveDeviceIdForCommunication: jest.fn(async () => 'wireless-device-id'),
    resolveDeviceIdForResponse: jest.fn(async (_dynamodb: unknown, deviceId: string) => deviceId),
}));

const createTestApp = () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
        (c as unknown as { set: (key: string, value: unknown) => void }).set('user', { sub: 'user-1' });
        await next();
    });
    app.route('/devices', devices);
    return app;
};

describe('GET /devices/:deviceId/data', () => {
    const dynamodb = {
        query: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);
        dynamodb.query.mockResolvedValue({
            Items: [
                marshall({
                    device_id: 'wireless-device-id',
                    timestamp: 1700000000,
                    instant_power: '1200',
                    cumulative_energy: '44.5',
                    msg_number: 7,
                    operational_state: 2,
                }),
            ],
        } as never);
    });

    it('queries an explicit timestamp range with limit and descending order', async () => {
        const response = await createTestApp().request(
            '/devices/000012/data?start_time=1700000000&end_time=1700003600&limit=25&order=desc',
        );

        expect(response.status).toBe(200);
        expect(dynamodb.query).toHaveBeenCalledWith({
            TableName: 'DobbyData',
            KeyConditionExpression: 'device_id = :deviceId AND #ts BETWEEN :startTime AND :endTime',
            ExpressionAttributeValues: {
                ':deviceId': { S: 'wireless-device-id' },
                ':startTime': { N: '1700000000' },
                ':endTime': { N: '1700003600' },
            },
            ExpressionAttributeNames: {
                '#ts': 'timestamp',
            },
            ScanIndexForward: false,
            Limit: 25,
        });
    });

    it('can return only requested telemetry fields without inventing missing values', async () => {
        dynamodb.query.mockResolvedValueOnce({
            Items: [
                marshall({
                    device_id: 'wireless-device-id',
                    timestamp: 1700000000,
                    instant_power: '1200',
                }),
            ],
        } as never);

        const response = await createTestApp().request(
            '/devices/000012/data?start_time=1700000000&end_time=1700003600&fields=instant_power,operational_state',
        );
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual([
            {
                device_id: '000012',
                timestamp: 1700000000,
                instant_power: 1200,
            },
        ]);
    });

    it('rejects invalid ranges before querying DynamoDB', async () => {
        const response = await createTestApp().request(
            '/devices/000012/data?start_time=1700003600&end_time=1700000000',
        );
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body).toEqual({ error: 'start_time must be less than or equal to end_time' });
        expect(dynamodb.query).not.toHaveBeenCalled();
    });
});
