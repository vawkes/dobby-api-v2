import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";

/**
 * Creates a typed mock function
 */
export function createMock<T extends (...args: any[]) => any>(): jest.MockedFunction<T> {
    return jest.fn() as unknown as jest.MockedFunction<T>;
}

/**
 * Creates a mock DynamoDB response with the given items
 * @param items - JavaScript objects to be included in the response
 * @returns A DynamoDB response object with marshalled items
 */
export function createDynamoDBResponse<T>(items: T[]): { Items: Record<string, any>[] } {
    return {
        Items: items.map(item => marshall(item)),
    };
}

/**
 * Creates a mock DynamoDB getItem response with the given item
 * @param item - JavaScript object to be included in the response
 * @returns A DynamoDB getItem response object with marshalled item
 */
export function createDynamoDBGetItemResponse<T>(item: T | null): { Item?: Record<string, any> } {
    if (!item) {
        return { Item: undefined };
    }
    return {
        Item: marshall(item),
    };
}

/**
 * Mocks the DynamoDB client for testing
 * @returns A mocked DynamoDB client
 */
export function mockDynamoDB(): {
    scan: jest.Mock;
    query: jest.Mock;
    getItem: jest.Mock;
    putItem: jest.Mock;
    deleteItem: jest.Mock;
    updateItem: jest.Mock;
} {
    return {
        scan: jest.fn(),
        query: jest.fn(),
        getItem: jest.fn(),
        putItem: jest.fn(),
        deleteItem: jest.fn(),
        updateItem: jest.fn(),
    };
}

/**
 * Helper to create a Hono-compatible Request object
 * @param path - The URL path
 * @param init - Request initialization options
 * @returns A Request object
 */
export function createRequest(path: string, init?: RequestInit): Request {
    return new Request(`https://example.com${path}`, init);
}

/**
 * Unwraps DynamoDB attribute values into plain JavaScript objects
 * @param dbItem - DynamoDB item with attribute values
 * @returns Plain JavaScript object
 */
export function unwrapDynamoDBItem(dbItem: Record<string, any>): any {
    return unmarshall(dbItem);
} 