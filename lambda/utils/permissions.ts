import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { UserContext } from "./deviceAccess";
import { Context, Next } from "hono";

// User roles from the schema
export enum UserRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    COMPANY_ADMIN = 'COMPANY_ADMIN',
    DEVICE_MANAGER = 'DEVICE_MANAGER',
    DEVICE_VIEWER = 'DEVICE_VIEWER'
}

// Permission levels (simplified for now, but can be expanded)
export enum PermissionLevel {
    ADMIN = 'admin',
    COMPANY_USER = 'company_user'
}

// Action types
export enum Action {
    // Device actions
    READ_DEVICES = 'read_devices',
    WRITE_DEVICES = 'write_devices',
    DELETE_DEVICES = 'delete_devices',
    
    // Event actions
    READ_EVENTS = 'read_events',
    CREATE_EVENTS = 'create_events',
    DELETE_EVENTS = 'delete_events',
    
    // Company management
    WRITE_COMPANIES = 'write_companies',
    DELETE_COMPANIES = 'delete_companies',
    
    // User management
    READ_USERS = 'read_users',
    WRITE_USERS = 'write_users',
    DELETE_USERS = 'delete_users',
    
    // Device assignment
    ASSIGN_DEVICES = 'assign_devices',
    UNASSIGN_DEVICES = 'unassign_devices'
}

// Extended context type that includes user
interface ExtendedContext extends Context {
    get(key: 'user'): UserContext | undefined;
}

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
    [UserRole.SUPER_ADMIN]: 4,
    [UserRole.COMPANY_ADMIN]: 3,
    [UserRole.DEVICE_MANAGER]: 2,
    [UserRole.DEVICE_VIEWER]: 1,
};

// Permission matrix - defines what each role can do
const ROLE_PERMISSION_MATRIX = {
    [UserRole.SUPER_ADMIN]: [
        // Super admins can do everything across all companies
        Action.READ_DEVICES,
        Action.WRITE_DEVICES,
        Action.DELETE_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS,
        Action.DELETE_EVENTS,
        Action.WRITE_COMPANIES,
        Action.DELETE_COMPANIES,
        Action.READ_USERS,
        Action.WRITE_USERS,
        Action.DELETE_USERS,
        Action.ASSIGN_DEVICES,
        Action.UNASSIGN_DEVICES
    ],
    [UserRole.COMPANY_ADMIN]: [
        // Company admins can do everything within their company
        Action.READ_DEVICES,
        Action.WRITE_DEVICES,
        Action.DELETE_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS,
        Action.DELETE_EVENTS,
        Action.WRITE_COMPANIES,
        Action.READ_USERS,
        Action.WRITE_USERS,
        Action.DELETE_USERS,
        Action.ASSIGN_DEVICES,
        Action.UNASSIGN_DEVICES
    ],
    [UserRole.DEVICE_MANAGER]: [
        // Device managers can manage devices and events
        Action.READ_DEVICES,
        Action.WRITE_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS,
        Action.DELETE_EVENTS,
        Action.ASSIGN_DEVICES,
        Action.UNASSIGN_DEVICES
    ],
    [UserRole.DEVICE_VIEWER]: [
        // Device viewers can only read and create events
        Action.READ_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS
    ]
};

// Legacy permission matrix for backward compatibility
const PERMISSION_MATRIX = {
    [PermissionLevel.ADMIN]: [
        // Admins can do everything
        Action.READ_DEVICES,
        Action.WRITE_DEVICES,
        Action.DELETE_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS,
        Action.DELETE_EVENTS,
        Action.WRITE_COMPANIES,
        Action.DELETE_COMPANIES,
        Action.READ_USERS,
        Action.WRITE_USERS,
        Action.DELETE_USERS,
        Action.ASSIGN_DEVICES,
        Action.UNASSIGN_DEVICES
    ],
    [PermissionLevel.COMPANY_USER]: [
        // Company users can only read and create events for their devices
        Action.READ_DEVICES,
        Action.READ_EVENTS,
        Action.CREATE_EVENTS
    ]
};

// Helper function to get user's role in a specific company
export async function getUserRoleInCompany(
    dynamodb: DynamoDB, 
    userId: string, 
    companyId: string
): Promise<UserRole | null> {
    try {
        const result = await dynamodb.getItem({
            TableName: "CompanyUsers",
            Key: {
                company_id: { S: companyId },
                user_id: { S: userId }
            }
        });

        if (!result.Item) {
            return null;
        }

        const userCompany = unmarshall(result.Item);
        return userCompany.role as UserRole;
    } catch (error) {
        console.error('Error getting user role in company:', error);
        return null;
    }
}

// Helper function to get user's highest role across all companies
export async function getUserHighestRole(dynamodb: DynamoDB, userId: string): Promise<UserRole | null> {
    try {
        // Use the user_id-index GSI instead of scan for better performance
        const userCompaniesResult = await dynamodb.query({
            TableName: "CompanyUsers",
            IndexName: "user_id-index",
            KeyConditionExpression: "user_id = :userId",
            ExpressionAttributeValues: {
                ":userId": { S: userId }
            }
        });

        if (!userCompaniesResult.Items || userCompaniesResult.Items.length === 0) {
            console.log(`No companies found for user ${userId}`);
            return null;
        }

        let highestRole: UserRole | null = null;
        let highestLevel = 0;

        for (const item of userCompaniesResult.Items) {
            const userCompany = unmarshall(item);
            const role = userCompany.role as UserRole;
            const level = ROLE_HIERARCHY[role] || 0;

            console.log(`User ${userId} has role ${role} in company ${userCompany.company_id} with level ${level}`);

            if (level > highestLevel) {
                highestLevel = level;
                highestRole = role;
            }
        }

        console.log(`User ${userId} highest role: ${highestRole} with level ${highestLevel}`);
        return highestRole;
    } catch (error) {
        console.error('Error getting user highest role:', error);
        return null;
    }
}

// Helper function to check if user has permission for a specific action
export async function hasPermission(
    dynamodb: DynamoDB, 
    userId: string, 
    action: Action
): Promise<boolean> {
    try {
        console.log(`hasPermission called for user ${userId} and action ${action}`);
        
        const highestRole = await getUserHighestRole(dynamodb, userId);
        console.log(`User ${userId} highest role: ${highestRole}`);
        
        if (!highestRole) {
            console.log(`User ${userId} has no role found`);
            return false;
        }

        // Super admins have access to everything
        if (highestRole === UserRole.SUPER_ADMIN) {
            console.log(`User ${userId} is a super admin - granting all permissions`);
            return true;
        }

        const permissions = ROLE_PERMISSION_MATRIX[highestRole];
        console.log(`Role ${highestRole} permissions:`, permissions);
        
        const hasPermission = permissions?.includes(action) || false;
        console.log(`User ${userId} has permission ${action}: ${hasPermission}`);
        
        return hasPermission;
    } catch (error) {
        console.error('Error checking permission:', error);
        return false;
    }
}

// Helper function to check if user is a super admin
export async function isSuperAdmin(dynamodb: DynamoDB, userId: string): Promise<boolean> {
    try {
        const highestRole = await getUserHighestRole(dynamodb, userId);
        return highestRole === UserRole.SUPER_ADMIN;
    } catch (error) {
        console.error('Error checking if user is super admin:', error);
        return false;
    }
}

// Helper function to check if user has permission for a specific action on a specific device
export async function hasDevicePermission(
    dynamodb: DynamoDB,
    userId: string,
    action: Action,
    deviceId: string
): Promise<boolean> {
    try {
        // First check if user has the general permission
        const hasGeneralPermission = await hasPermission(dynamodb, userId, action);
        if (!hasGeneralPermission) {
            return false;
        }

        // Get user's highest role
        const highestRole = await getUserHighestRole(dynamodb, userId);
        if (!highestRole) {
            return false;
        }

        // Super admins have access to all devices
        if (highestRole === UserRole.SUPER_ADMIN) {
            console.log(`User ${userId} is a super admin - granting access to device ${deviceId}`);
            return true;
        }

        // Check if user has access to this specific device
        const { checkUserDeviceAccess } = await import('./deviceAccess.ts');
        return await checkUserDeviceAccess(dynamodb, userId, deviceId);
    } catch (error) {
        console.error('Error checking device permission:', error);
        return false;
    }
}

// Helper function to check if user has permission for a specific action on a specific company
export async function hasCompanyPermission(
    dynamodb: DynamoDB,
    userId: string,
    action: Action,
    companyId: string
): Promise<boolean> {
    try {
        // First check if user has the general permission
        const hasGeneralPermission = await hasPermission(dynamodb, userId, action);
        if (!hasGeneralPermission) {
            return false;
        }

        // Get user's highest role
        const highestRole = await getUserHighestRole(dynamodb, userId);
        if (!highestRole) {
            return false;
        }

        // Super admins have access to all companies
        if (highestRole === UserRole.SUPER_ADMIN) {
            console.log(`User ${userId} is a super admin - granting access to company ${companyId}`);
            return true;
        }

        // Get user's role in this specific company
        const userRole = await getUserRoleInCompany(dynamodb, userId, companyId);
        if (!userRole) {
            return false;
        }

        // Check if the role has the required permission
        return ROLE_PERMISSION_MATRIX[userRole]?.includes(action) || false;
    } catch (error) {
        console.error('Error checking company permission:', error);
        return false;
    }
}

// Helper function to check if user can assign roles
export async function canAssignRole(
    dynamodb: DynamoDB,
    assignerUserId: string,
    targetCompanyId: string,
    targetRole: UserRole
): Promise<boolean> {
    try {
        // Check if assigner is a super admin
        const isAssignerSuperAdmin = await isSuperAdmin(dynamodb, assignerUserId);
        if (isAssignerSuperAdmin) {
            console.log(`User ${assignerUserId} is a super admin - can assign any role`);
            return true;
        }

        const assignerRole = await getUserRoleInCompany(dynamodb, assignerUserId, targetCompanyId);
        if (!assignerRole) {
            return false;
        }

        const assignerLevel = ROLE_HIERARCHY[assignerRole] || 0;
        const targetLevel = ROLE_HIERARCHY[targetRole] || 0;

        // Users can only assign roles at or below their own level
        return assignerLevel >= targetLevel;
    } catch (error) {
        console.error('Error checking role assignment permission:', error);
        return false;
    }
}

// Middleware function for Hono to check permissions
export function requirePermission(action: Action) {
    return async (c: ExtendedContext, next: Next) => {
        try {
            const user = c.get('user');
            if (!user || !user.sub) {
                console.log('Permission check failed: User not authenticated');
                return c.json({ error: 'User not authenticated' }, 401);
            }

            console.log(`Permission check for user ${user.sub} and action ${action}`);
            
            const dynamodb = new DynamoDB({ region: "us-east-1" });
            
            // Get user's highest role for debugging
            const highestRole = await getUserHighestRole(dynamodb, user.sub);
            console.log(`User ${user.sub} highest role: ${highestRole}`);
            
            const hasAccess = await hasPermission(dynamodb, user.sub, action);
            console.log(`User ${user.sub} has permission ${action}: ${hasAccess}`);
            
            if (!hasAccess) {
                console.log(`Permission denied for user ${user.sub} on action ${action}`);
                return c.json({ error: 'Insufficient permissions' }, 403);
            }

            console.log(`Permission granted for user ${user.sub} on action ${action}`);
            await next();
            return;
        } catch (error) {
            console.error('Error in permission middleware:', error);
            return c.json({ error: 'Permission check failed' }, 500);
        }
    };
}

// Middleware function for Hono to check device-specific permissions
export function requireDevicePermission(action: Action) {
    return async (c: ExtendedContext, next: Next) => {
        try {
            const user = c.get('user');
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            const deviceId = c.req.param('deviceId');
            if (!deviceId) {
                return c.json({ error: 'Device ID required' }, 400);
            }

            const dynamodb = new DynamoDB({ region: "us-east-1" });
            const hasAccess = await hasDevicePermission(dynamodb, user.sub, action, deviceId);
            
            if (!hasAccess) {
                return c.json({ error: 'Access denied to this device' }, 403);
            }

            await next();
            return;
        } catch (error) {
            console.error('Error in device permission middleware:', error);
            return c.json({ error: 'Permission check failed' }, 500);
        }
    };
}

// Middleware function for Hono to check company-specific permissions
export function requireCompanyPermission(action: Action) {
    return async (c: ExtendedContext, next: Next) => {
        try {
            const user = c.get('user');
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            const companyId = c.req.param('companyId');
            if (!companyId) {
                return c.json({ error: 'Company ID required' }, 400);
            }

            const dynamodb = new DynamoDB({ region: "us-east-1" });
            const hasAccess = await hasCompanyPermission(dynamodb, user.sub, action, companyId);
            
            if (!hasAccess) {
                return c.json({ error: 'Access denied to this company' }, 403);
            }

            await next();
            return;
        } catch (error) {
            console.error('Error in company permission middleware:', error);
            return c.json({ error: 'Permission check failed' }, 500);
        }
    };
} 