import { Hono } from 'hono';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import events from '../lambda/events/events.ts';
import { createDynamoDBClient } from '../shared/database/dynamodb';
import { dispatchEventToDevice } from '../lambda/events/eventDispatcher.ts';

jest.mock('../shared/database/dynamodb', () => ({
    createDynamoDBClient: jest.fn(),
}));

jest.mock('../lambda/events/eventDispatcher.ts', () => ({
    dispatchEventToDevice: jest.fn(),
}));

const user = { sub: 'user-1' };
const wirelessDeviceId = '558fab41-f090-4675-a7b0-f5060297d4e9';

const createTestApp = () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
        (c as unknown as { set: (key: string, value: unknown) => void }).set('user', user);
        await next();
    });
    app.route('/events', events);
    return app;
};

const createDynamo = (assignmentStatus: string, hasTelemetry = false) => ({
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
                Items: [
                    marshall({
                        company_id: 'company-1',
                        device_id: '000123',
                        status: assignmentStatus,
                    }),
                ],
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
        if (params.TableName === 'DobbyInfo' && hasTelemetry) {
            return {
                Item: marshall({
                    device_id: wirelessDeviceId,
                    updated_at: '2026-04-28T00:00:00.000Z',
                }),
            };
        }

        return { Item: undefined };
    }),
});

describe('event dispatch lifecycle guard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('rejects pending install targets without dispatching commands', async () => {
        const dynamodb = createDynamo('PENDING_INSTALL');
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);

        const response = await createTestApp().request('/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: 'event-1',
                event_type: 'LOAD_UP',
                event_data: {
                    device_id: '000123',
                    start_time: '2026-04-28T00:00:00.000Z',
                    duration: 300,
                },
            }),
        });
        const body = await response.json();

        expect(response.status).toBe(400);
        expect(body.body.reason).toContain('pending install');
        expect(dispatchEventToDevice).not.toHaveBeenCalled();
    });

    it('allows pending install targets after telemetry exists', async () => {
        const dynamodb = createDynamo('PENDING_INSTALL', true);
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);
        (dispatchEventToDevice as jest.Mock).mockResolvedValue({
            event_id: 'event-1',
            event_type: 'LOAD_UP',
            event_data: {},
            event_ack: false,
        } as never);

        const response = await createTestApp().request('/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                event_id: 'event-1',
                event_type: 'LOAD_UP',
                event_data: {
                    device_id: '000123',
                    start_time: '2026-04-28T00:00:00.000Z',
                    duration: 300,
                },
            }),
        });

        expect(response.status).toBe(200);
        expect(dispatchEventToDevice).toHaveBeenCalledWith(
            'LOAD_UP',
            expect.objectContaining({ device_id: '000123' }),
            wirelessDeviceId,
        );
    });
});
