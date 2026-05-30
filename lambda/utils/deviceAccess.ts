import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { AssignmentStatus } from './deviceLifecycle.ts';

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

export interface DeviceAssignment {
    company_id: string;
    device_id: string;
    status?: AssignmentStatus;
}

// Helper function to get user's accessible device assignment rows
export async function getUserAccessibleDeviceAssignments(dynamodb: DynamoDB, userId: string): Promise<DeviceAssignment[]> {
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
        const assignments: DeviceAssignment[] = [];
        const seenDeviceIds = new Set<string>();

        // Query CompanyDevices table to get all devices for these companies
        for (const companyId of companyIds) {
            const companyDevicesResult = await dynamodb.query({
                TableName: "CompanyDevices",
                KeyConditionExpression: "company_id = :companyId",
                ExpressionAttributeValues: {
                    ":companyId": { S: companyId }
                }
            });

            if (companyDevicesResult.Items) {
                for (const item of companyDevicesResult.Items) {
                    const assignment = unmarshall(item) as DeviceAssignment;
                    if (!seenDeviceIds.has(assignment.device_id)) {
                        assignments.push(assignment);
                        seenDeviceIds.add(assignment.device_id);
                    }
                }
            }
        }

        return assignments;
    } catch (error) {
        console.error('Error getting user accessible device assignments:', error);
        return [];
    }
}

// Helper function to get user's accessible device IDs
export async function getUserAccessibleDevices(dynamodb: DynamoDB, userId: string): Promise<string[]> {
    const assignments = await getUserAccessibleDeviceAssignments(dynamodb, userId);
    return assignments.map(assignment => assignment.device_id);
}

// Helper function to get a user's assignment metadata for a specific device
export async function getUserDeviceAssignment(
    dynamodb: DynamoDB,
    userId: string,
    deviceId: string
): Promise<DeviceAssignment | null> {
    const assignments = await getUserAccessibleDeviceAssignments(dynamodb, userId);
    return assignments.find(assignment => assignment.device_id === deviceId) || null;
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
