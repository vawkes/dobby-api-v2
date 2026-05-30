import { Hono } from 'hono';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import devices from '../lambda/devices/devices.ts';
import { createDynamoDBClient } from '../shared/database/dynamodb';

jest.mock('../shared/database/dynamodb', () => ({
    createDynamoDBClient: jest.fn(),
}));

const user = { sub: 'user-1' };
const wirelessDeviceId = '558fab41-f090-4675-a7b0-f5060297d4e9';

const createTestApp = () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
        (c as unknown as { set: (key: string, value: unknown) => void }).set('user', user);
        await next();
    });
    app.route('/devices', devices);
    return app;
};

const createDynamo = (assignments: Array<Record<string, unknown>>, dobbyInfo: Array<Record<string, unknown>>) => {
    const dobbyById = new Map(dobbyInfo.map(item => [item.device_id, item]));
    return {
        query: jest.fn(async (params: any) => {
            if (params.TableName === 'CompanyUsers') {
                return {
                    Items: [
                        marshall({
                            company_id: 'company-1',
                            user_id: user.sub,
                            role: 'DEVICE_MANAGER',
                        }),
                    ],
                };
            }

            if (params.TableName === 'CompanyDevices') {
                return {
                    Items: assignments.map(item => marshall({ company_id: 'company-1', ...item })),
                };
            }

            if (params.TableName === 'ProductionLine') {
                return {
                    Items: [
                        marshall({
                            device_id: '000123',
                            wireless_device_id: wirelessDeviceId,
                        }),
                    ],
                };
            }

            return { Items: [] };
        }),
        getItem: jest.fn(async (params: any) => {
            if (params.TableName === 'CompanyDevices') {
                const assignment = assignments.find(item => item.device_id === params.Key.device_id.S);
                return { Item: assignment ? marshall({ company_id: 'company-1', ...assignment }) : undefined };
            }

            if (params.TableName === 'DobbyInfo') {
                const item = dobbyById.get(params.Key.device_id.S);
                return { Item: item ? marshall(item) : undefined };
            }

            return { Item: undefined };
        }),
        batchGetItem: jest.fn(async (params: any) => {
            const keys = params.RequestItems.DobbyInfo.Keys.map((key: any) => key.device_id.S);
            return {
                Responses: {
                    DobbyInfo: keys
                        .map((key: string) => dobbyById.get(key))
                        .filter(Boolean)
                        .map((item: Record<string, unknown>) => marshall(item)),
                },
            };
        }),
    };
};

describe('device lifecycle route enrichment', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('keeps pending install assignments visible when DobbyInfo is missing', async () => {
        const dynamodb = createDynamo([{ device_id: '000123', status: 'PENDING_INSTALL' }], []);
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);

        const response = await createTestApp().request('/devices');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toEqual([
            {
                device_id: '000123',
                assignment_status: 'PENDING_INSTALL',
                effective_assignment_status: 'PENDING_INSTALL',
            },
        ]);
    });

    it('treats pending install assignments with telemetry as effectively active', async () => {
        const dynamodb = createDynamo(
            [{ device_id: '000123', status: 'PENDING_INSTALL' }],
            [{
                device_id: wirelessDeviceId,
                updated_at: '2026-04-28T00:00:00.000Z',
                model_number: 'GC-1000',
            }],
        );
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);

        const response = await createTestApp().request('/devices');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject([
            {
                device_id: '000123',
                assignment_status: 'PENDING_INSTALL',
                effective_assignment_status: 'ACTIVE',
                updated_at: '2026-04-28T00:00:00.000Z',
            },
        ]);
    });

    it('keeps legacy assignments without status on the active/no-data path', async () => {
        const dynamodb = createDynamo(
            [{ device_id: '000123' }],
            [{
                device_id: wirelessDeviceId,
                model_number: 'GC-1000',
            }],
        );
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);

        const response = await createTestApp().request('/devices');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(body).toMatchObject([
            {
                device_id: '000123',
                effective_assignment_status: 'ACTIVE',
            },
        ]);
    });

    it('does not return minimal inventory for inaccessible detail requests', async () => {
        const dynamodb = createDynamo([], []);
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);

        const response = await createTestApp().request('/devices/000123');
        const body = await response.json();

        expect(response.status).toBe(403);
        expect(body).toEqual({ error: 'Access denied to this device' });
    });
});
