import { Hono } from 'hono';
import { marshall } from '@aws-sdk/util-dynamodb';
import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import companies from '../lambda/companies/companies.ts';
import { createDynamoDBClient } from '../shared/database/dynamodb';

jest.mock('../shared/database/dynamodb', () => ({
    createDynamoDBClient: jest.fn(),
}));

const createTestApp = () => {
    const app = new Hono();
    app.use('*', async (c, next) => {
        (c as unknown as { set: (key: string, value: unknown) => void }).set('user', { sub: 'user-1' });
        await next();
    });
    app.route('/companies', companies);
    return app;
};

describe('GET /companies/me', () => {
    const dynamodb = {
        query: jest.fn(),
        getItem: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (createDynamoDBClient as jest.Mock).mockReturnValue(dynamodb);
    });

    it('returns the current user active company without scanning all companies', async () => {
        dynamodb.query.mockResolvedValue({
            Items: [
                marshall({ company_id: 'company-viewer', user_id: 'user-1', role: 'DEVICE_VIEWER' }),
                marshall({ company_id: 'company-admin', user_id: 'user-1', role: 'COMPANY_ADMIN' }),
            ],
        } as never);

        dynamodb.getItem
            .mockResolvedValueOnce({
                Item: marshall({ id: 'company-viewer', name: 'Viewer Company' }),
            } as never)
            .mockResolvedValueOnce({
                Item: marshall({ id: 'company-admin', name: 'Admin Company' }),
            } as never);

        const response = await createTestApp().request('/companies/me');
        const body = await response.json();

        expect(response.status).toBe(200);
        expect(dynamodb.query).toHaveBeenCalledWith(expect.objectContaining({
            TableName: 'CompanyUsers',
            IndexName: 'user_id-index',
            KeyConditionExpression: 'user_id = :userId',
            ExpressionAttributeValues: {
                ':userId': { S: 'user-1' },
            },
        }));
        expect(body.activeCompany).toEqual({
            id: 'company-admin',
            name: 'Admin Company',
            role: 'COMPANY_ADMIN',
        });
        expect(body.companies).toHaveLength(2);
    });
});
