import { Hono } from 'hono';
import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { describeRoute } from 'hono-openapi';
import { resolver, validator } from 'hono-openapi/zod';
import { requirePermission, requireCompanyPermission, Action, canAssignRole, UserRole, getUserRoleInCompany, isSuperAdmin } from '../utils/permissions.ts';
import { companySchema, companiesSchema, createCompanySchema, addUserToCompanySchema, addDeviceToCompanySchema, updateUserRoleSchema, UserRole as SchemaUserRole } from './companiesSchema.ts';

const app = new Hono();

// Role hierarchy for permission checking
const ROLE_HIERARCHY: Record<SchemaUserRole, number> = {
    [SchemaUserRole.SUPER_ADMIN]: 4,
    [SchemaUserRole.COMPANY_ADMIN]: 3,
    [SchemaUserRole.DEVICE_MANAGER]: 2,
    [SchemaUserRole.DEVICE_VIEWER]: 1,
};

// Helper function to check if user has required role
async function checkUserRole(dynamodb: DynamoDB, companyId: string, userId: string, requiredRole: SchemaUserRole): Promise<boolean> {
    try {
        const result = await dynamodb.getItem({
            TableName: 'CompanyUsers',
            Key: {
                company_id: { S: companyId },
                user_id: { S: userId },
            },
        });

        if (!result.Item) {
            return false;
        }

        const user = unmarshall(result.Item);
        const userRole = user.role as SchemaUserRole;
        return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
    } catch (error) {
        console.error('Error checking user role:', error);
        return false;
    }
}

// Create a new company (admin only)
app.post('/',
    describeRoute({
        description: 'Create a new company',
        responses: {
            201: {
                description: 'Company created successfully',
                content: {
                    'application/json': {
                        schema: resolver(companySchema),
                    },
                },
            },
            400: {
                description: 'Invalid request data',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
        },
    }),
    requirePermission(Action.WRITE_COMPANIES),
    validator('json', createCompanySchema),
    async (c) => {
        try {
            const { name } = c.req.valid('json');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });
            const now = new Date().toISOString();
            const companyId = uuidv4();
            const company = {
                id: companyId,
                name,
                createdAt: now,
                updatedAt: now,
            };

            await dynamodb.putItem({
                TableName: 'Companies',
                Item: marshall(company),
            });

            return c.json(company, 201);
        } catch (error) {
            console.error('Error creating company:', error);
            return c.json({ error: 'Failed to create company' }, 500);
        }
    });

// Get all companies (admin only)
app.get('/',
    describeRoute({
        description: 'Get all companies',
        responses: {
            200: {
                description: 'List of companies',
                content: {
                    'application/json': {
                        schema: resolver(companiesSchema),
                    },
                },
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
        },
    }),
    requirePermission(Action.WRITE_COMPANIES), // Using WRITE_COMPANIES since READ_COMPANIES was removed
    async (c) => {
        try {
            const dynamodb = new DynamoDB({ region: 'us-east-1' });
            const result = await dynamodb.scan({
                TableName: 'Companies',
            });
            const companies = result.Items?.map(item => unmarshall(item)) || [];
            return c.json(companies);
        } catch (error) {
            console.error('Error fetching companies:', error);
            return c.json({ error: 'Failed to fetch companies' }, 500);
        }
    });

// Get specific company
app.get('/:companyId',
    describeRoute({
        description: 'Get a specific company',
        responses: {
            200: {
                description: 'Company details',
                content: {
                    'application/json': {
                        schema: resolver(companySchema),
                    },
                },
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company not found',
            },
        },
    }),
    requireCompanyPermission(Action.WRITE_COMPANIES), // Using WRITE_COMPANIES since READ_COMPANIES was removed
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            const result = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!result.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            return c.json(unmarshall(result.Item));
        } catch (error) {
            console.error('Error fetching company:', error);
            return c.json({ error: 'Failed to fetch company' }, 500);
        }
    });

// Add user to company (admin only)
app.post('/:companyId/users',
    describeRoute({
        description: 'Add a user to a company',
        responses: {
            201: {
                description: 'User added to company successfully',
                content: {
                    'application/json': {
                        schema: resolver(addUserToCompanySchema),
                    },
                },
            },
            400: {
                description: 'Invalid request data',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company not found',
            },
        },
    }),
    requireCompanyPermission(Action.WRITE_USERS),
    validator('json', addUserToCompanySchema),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const body = c.req.valid('json');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            // Check if the current user can assign this role
            const user = c.get('user');
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Special check for SUPER_ADMIN role assignment
            if (body.role === SchemaUserRole.SUPER_ADMIN) {
                const isUserSuperAdmin = await isSuperAdmin(dynamodb, user.sub);
                if (!isUserSuperAdmin) {
                    return c.json({ error: 'Only super admins can assign SUPER_ADMIN role' }, 403);
                }
            }

            const canAssign = await canAssignRole(dynamodb, user.sub, companyId, body.role as UserRole);
            if (!canAssign) {
                return c.json({ error: 'Insufficient permissions to assign this role' }, 403);
            }

            const userCompany = {
                company_id: companyId,
                user_id: body.user_id,
                role: body.role || SchemaUserRole.DEVICE_VIEWER,
                added_at: new Date().toISOString()
            };

            await dynamodb.putItem({
                TableName: 'CompanyUsers',
                Item: marshall(userCompany)
            });

            return c.json(userCompany, 201);
        } catch (error) {
            console.error('Error adding user to company:', error);
            return c.json({ error: 'Failed to add user to company' }, 500);
        }
    });

// Update user role in company
app.put('/:companyId/users/:userId',
    describeRoute({
        description: 'Update user role in company',
        responses: {
            200: {
                description: 'User role updated successfully',
                content: {
                    'application/json': {
                        schema: resolver(updateUserRoleSchema),
                    },
                },
            },
            400: {
                description: 'Invalid request data',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company or user not found',
            },
        },
    }),
    requireCompanyPermission(Action.WRITE_USERS),
    validator('json', updateUserRoleSchema),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const userId = c.req.param('userId');
            const body = c.req.valid('json');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            // Check if user exists in company
            const userResult = await dynamodb.getItem({
                TableName: 'CompanyUsers',
                Key: {
                    company_id: { S: companyId },
                    user_id: { S: userId }
                }
            });

            if (!userResult.Item) {
                return c.json({ error: 'User not found in company' }, 404);
            }

            // Check if the current user can assign this role
            const user = c.get('user');
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Special check for SUPER_ADMIN role assignment
            if (body.role === SchemaUserRole.SUPER_ADMIN) {
                const isUserSuperAdmin = await isSuperAdmin(dynamodb, user.sub);
                if (!isUserSuperAdmin) {
                    return c.json({ error: 'Only super admins can assign SUPER_ADMIN role' }, 403);
                }
            }

            const canAssign = await canAssignRole(dynamodb, user.sub, companyId, body.role as UserRole);
            if (!canAssign) {
                return c.json({ error: 'Insufficient permissions to assign this role' }, 403);
            }

            // Update the user's role
            const updatedUserCompany = {
                ...unmarshall(userResult.Item),
                role: body.role,
                updated_at: new Date().toISOString()
            };

            await dynamodb.putItem({
                TableName: 'CompanyUsers',
                Item: marshall(updatedUserCompany)
            });

            return c.json({ role: body.role, updated_at: updatedUserCompany.updated_at });
        } catch (error) {
            console.error('Error updating user role:', error);
            return c.json({ error: 'Failed to update user role' }, 500);
        }
    });

// Remove user from company
app.delete('/:companyId/users/:userId',
    describeRoute({
        description: 'Remove user from company',
        responses: {
            200: {
                description: 'User removed from company successfully',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company or user not found',
            },
        },
    }),
    requireCompanyPermission(Action.DELETE_USERS),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const userId = c.req.param('userId');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            // Check if user exists in company
            const userResult = await dynamodb.getItem({
                TableName: 'CompanyUsers',
                Key: {
                    company_id: { S: companyId },
                    user_id: { S: userId }
                }
            });

            if (!userResult.Item) {
                return c.json({ error: 'User not found in company' }, 404);
            }

            // Check if the current user can remove this user
            const user = c.get('user');
            if (!user || !user.sub) {
                return c.json({ error: 'User not authenticated' }, 401);
            }

            // Check if user is a super admin
            const isUserSuperAdmin = await isSuperAdmin(dynamodb, user.sub);
            if (isUserSuperAdmin) {
                console.log(`User ${user.sub} is a super admin - can remove any user`);
            } else {
                const currentUserRole = await getUserRoleInCompany(dynamodb, user.sub, companyId);
                const targetUserRole = await getUserRoleInCompany(dynamodb, userId, companyId);

                if (!currentUserRole || !targetUserRole) {
                    return c.json({ error: 'Role information not found' }, 404);
                }

                const currentUserLevel = ROLE_HIERARCHY[currentUserRole as SchemaUserRole] || 0;
                const targetUserLevel = ROLE_HIERARCHY[targetUserRole as SchemaUserRole] || 0;

                // Users can only remove users at or below their own level
                if (currentUserLevel < targetUserLevel) {
                    return c.json({ error: 'Insufficient permissions to remove this user' }, 403);
                }
            }

            // Remove the user from company
            await dynamodb.deleteItem({
                TableName: 'CompanyUsers',
                Key: {
                    company_id: { S: companyId },
                    user_id: { S: userId }
                }
            });

            return c.json({ message: 'User removed from company successfully' });
        } catch (error) {
            console.error('Error removing user from company:', error);
            return c.json({ error: 'Failed to remove user from company' }, 500);
        }
    });

// Get users for a company
app.get('/:companyId/users',
    describeRoute({
        description: 'Get all users for a company',
        responses: {
            200: {
                description: 'List of users in company',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    user_id: { type: 'string' },
                                    role: { type: 'string' },
                                    added_at: { type: 'string' }
                                }
                            }
                        }
                    }
                },
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company not found',
            },
        },
    }),
    requireCompanyPermission(Action.READ_USERS),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            const results = await dynamodb.query({
                TableName: 'CompanyUsers',
                KeyConditionExpression: 'company_id = :companyId',
                ExpressionAttributeValues: {
                    ':companyId': { S: companyId }
                }
            });

            const users = results.Items?.map(item => unmarshall(item)) || [];
            return c.json(users);
        } catch (error) {
            console.error('Error fetching company users:', error);
            return c.json({ error: 'Failed to fetch company users' }, 500);
        }
    });

// Add device to company (admin only)
app.post('/:companyId/devices',
    describeRoute({
        description: 'Add a device to a company',
        responses: {
            201: {
                description: 'Device added to company successfully',
                content: {
                    'application/json': {
                        schema: resolver(addDeviceToCompanySchema),
                    },
                },
            },
            400: {
                description: 'Invalid request data',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company not found',
            },
        },
    }),
    requireCompanyPermission(Action.ASSIGN_DEVICES),
    validator('json', addDeviceToCompanySchema),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const body = c.req.valid('json');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            const companyDevice = {
                company_id: companyId,
                device_id: body.device_id,
                assigned_at: new Date().toISOString()
            };

            await dynamodb.putItem({
                TableName: 'CompanyDevices',
                Item: marshall(companyDevice)
            });

            return c.json(companyDevice, 201);
        } catch (error) {
            console.error('Error adding device to company:', error);
            return c.json({ error: 'Failed to add device to company' }, 500);
        }
    });

// Get devices for a company
app.get('/:companyId/devices',
    describeRoute({
        description: 'Get all devices for a company',
        responses: {
            200: {
                description: 'List of devices in company',
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    device_id: { type: 'string' },
                                    assigned_at: { type: 'string' }
                                }
                            }
                        }
                    }
                },
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company not found',
            },
        },
    }),
    requireCompanyPermission(Action.READ_DEVICES),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            const results = await dynamodb.query({
                TableName: 'CompanyDevices',
                KeyConditionExpression: 'company_id = :companyId',
                ExpressionAttributeValues: {
                    ':companyId': { S: companyId }
                }
            });

            const devices = results.Items?.map(item => unmarshall(item)) || [];
            return c.json(devices);
        } catch (error) {
            console.error('Error fetching company devices:', error);
            return c.json({ error: 'Failed to fetch company devices' }, 500);
        }
    });

// Remove device from company (admin only)
app.delete('/:companyId/devices/:deviceId',
    describeRoute({
        description: 'Remove a device from a company',
        responses: {
            200: {
                description: 'Device removed from company successfully',
            },
            403: {
                description: 'Access denied - insufficient permissions',
            },
            404: {
                description: 'Company or device not found',
            },
        },
    }),
    requireCompanyPermission(Action.UNASSIGN_DEVICES),
    async (c) => {
        try {
            const companyId = c.req.param('companyId');
            const deviceId = c.req.param('deviceId');
            const dynamodb = new DynamoDB({ region: 'us-east-1' });

            // Check if company exists
            const companyResult = await dynamodb.getItem({
                TableName: 'Companies',
                Key: { id: { S: companyId } }
            });

            if (!companyResult.Item) {
                return c.json({ error: 'Company not found' }, 404);
            }

            // Check if device is assigned to company
            const deviceResult = await dynamodb.getItem({
                TableName: 'CompanyDevices',
                Key: {
                    company_id: { S: companyId },
                    device_id: { S: deviceId }
                }
            });

            if (!deviceResult.Item) {
                return c.json({ error: 'Device not found in company' }, 404);
            }

            await dynamodb.deleteItem({
                TableName: 'CompanyDevices',
                Key: {
                    company_id: { S: companyId },
                    device_id: { S: deviceId }
                }
            });

            return c.json({ message: 'Device removed from company successfully' });
        } catch (error) {
            console.error('Error removing device from company:', error);
            return c.json({ error: 'Failed to remove device from company' }, 500);
        }
    });

export default app; 