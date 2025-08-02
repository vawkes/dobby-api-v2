import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";

// Type declaration for user context from JWT payload
export interface UserContext {
    sub: string;
    email?: string;
    email_verified?: boolean;
    auth_time?: number;
    [key: string]: unknown;
}

// Helper function to safely get user from context
export function getUserFromContext(c: any): UserContext | null {
    const user = c.get('user');
    if (user && typeof user === 'object' && 'sub' in user) {
        return user as UserContext;
    }
    return null;
}

// Helper function to get user's accessible device IDs
export async function getUserAccessibleDevices(dynamodb: DynamoDB, userId: string): Promise<string[]> {
    try {
        // Query CompanyUsers table to get all companies the user belongs to
        const userCompaniesResult = await dynamodb.query({
            TableName: "CompanyUsers",
            IndexName: "user_id-index", // Assuming this GSI exists
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: {
                ":userId": { S: userId }
            }
        });

        if (!userCompaniesResult.Items || userCompaniesResult.Items.length === 0) {
            return [];
        }

        const companyIds = userCompaniesResult.Items.map(item => unmarshall(item).company_id);

        // Query CompanyDevices table to get all devices for these companies
        const accessibleDevices: string[] = [];
        
        for (const companyId of companyIds) {
            const companyDevicesResult = await dynamodb.query({
                TableName: "CompanyDevices",
                KeyConditionExpression: "company_id = :companyId",
                ExpressionAttributeValues: {
                    ":companyId": { S: companyId }
                }
            });

            if (companyDevicesResult.Items) {
                const deviceIds = companyDevicesResult.Items.map(item => unmarshall(item).device_id);
                accessibleDevices.push(...deviceIds);
            }
        }

        return accessibleDevices;
    } catch (error) {
        console.error('Error getting user accessible devices:', error);
        return [];
    }
}

// Helper function to check if user has access to a specific device
export async function checkUserDeviceAccess(dynamodb: DynamoDB, userId: string, deviceId: string): Promise<boolean> {
    try {
        // First check if user has any company access
        const userCompaniesResult = await dynamodb.query({
            TableName: "CompanyUsers",
            IndexName: "user_id-index", // Assuming this GSI exists
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: {
                ":userId": { S: userId }
            }
        });

        if (!userCompaniesResult.Items || userCompaniesResult.Items.length === 0) {
            return false;
        }

        const companyIds = userCompaniesResult.Items.map(item => unmarshall(item).company_id);

        // Check if any of the user's companies have access to this device
        for (const companyId of companyIds) {
            const deviceAccessResult = await dynamodb.getItem({
                TableName: "CompanyDevices",
                Key: {
                    company_id: { S: companyId },
                    device_id: { S: deviceId }
                }
            });

            if (deviceAccessResult.Item) {
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking user device access:', error);
        return false;
    }
} 