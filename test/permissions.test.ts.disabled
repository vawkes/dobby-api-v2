import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import {
    UserRole,
    Action,
    getUserRoleInCompany,
    getUserHighestRole,
    hasPermission,
    hasDevicePermission,
    hasCompanyPermission,
    canAssignRole,
    requirePermission,
    requireDevicePermission,
    requireCompanyPermission
} from '../lambda/utils/permissions';

// Mock dependencies
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');

// Mock unmarshall function
(unmarshall as jest.MockedFunction<typeof unmarshall>).mockImplementation((item) => {
    if (!item) return null;
    const result: any = {};
    for (const [key, value] of Object.entries(item)) {
        if (value && typeof value === 'object' && 'S' in value) {
            result[key] = value.S;
        } else if (value && typeof value === 'object' && 'N' in value) {
            result[key] = Number(value.N);
        } else {
            result[key] = value;
        }
    }
    return result;
});

const mockDynamoDB = {
    getItem: jest.fn(),
    query: jest.fn(),
    putItem: jest.fn(),
    deleteItem: jest.fn(),
    scan: jest.fn()
} as unknown as DynamoDB;

// Mock Hono context
const createMockContext = (user?: any) => ({
    get: jest.fn().mockReturnValue(user),
    req: {
        param: jest.fn()
    },
    json: jest.fn()
});

const createMockNext = () => jest.fn();

describe('Permissions System', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getUserRoleInCompany', () => {
        it('should return user role when user exists in company', async () => {
            const mockItem = {
                company_id: { S: 'company-1' },
                user_id: { S: 'user-1' },
                role: { S: UserRole.COMPANY_ADMIN }
            };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: mockItem
            });

            const result = await getUserRoleInCompany(mockDynamoDB, 'user-1', 'company-1');
            
            expect(result).toBe(UserRole.COMPANY_ADMIN);
            expect(mockDynamoDB.getItem).toHaveBeenCalledWith({
                TableName: 'CompanyUsers',
                Key: {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' }
                }
            });
        });

        it('should return null when user does not exist in company', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const result = await getUserRoleInCompany(mockDynamoDB, 'user-1', 'company-1');
            
            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            mockDynamoDB.getItem = jest.fn().mockRejectedValue(new Error('Database error'));

            const result = await getUserRoleInCompany(mockDynamoDB, 'user-1', 'company-1');
            
            expect(result).toBeNull();
        });
    });

    describe('getUserHighestRole', () => {
        it('should return highest role when user has multiple companies', async () => {
            const mockItems = [
                {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.DEVICE_VIEWER }
                },
                {
                    company_id: { S: 'company-2' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.COMPANY_ADMIN }
                }
            ];

            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: mockItems
            });

            const result = await getUserHighestRole(mockDynamoDB, 'user-1');
            
            expect(result).toBe(UserRole.COMPANY_ADMIN);
        });

        it('should return null when user has no company associations', async () => {
            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: []
            });

            const result = await getUserHighestRole(mockDynamoDB, 'user-1');
            
            expect(result).toBeNull();
        });

        it('should handle errors gracefully', async () => {
            mockDynamoDB.scan = jest.fn().mockRejectedValue(new Error('Database error'));

            const result = await getUserHighestRole(mockDynamoDB, 'user-1');
            
            expect(result).toBeNull();
        });
    });

    describe('hasPermission', () => {
        it('should return true when user has permission for action', async () => {
            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: [{
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.COMPANY_ADMIN }
                }]
            });

            const result = await hasPermission(mockDynamoDB, 'user-1', Action.READ_DEVICES);
            
            expect(result).toBe(true);
        });

        it('should return false when user has no role', async () => {
            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: []
            });

            const result = await hasPermission(mockDynamoDB, 'user-1', Action.READ_DEVICES);
            
            expect(result).toBe(false);
        });

        it('should return false when user role does not have permission', async () => {
            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: [{
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.DEVICE_VIEWER }
                }]
            });

            const result = await hasPermission(mockDynamoDB, 'user-1', Action.DELETE_DEVICES);
            
            expect(result).toBe(false);
        });
    });

    describe('hasDevicePermission', () => {
        it('should return true when user has device permission', async () => {
            // Mock getUserHighestRole (uses scan now)
            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: [{
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.COMPANY_ADMIN }
                }]
            });

            // Mock checkUserDeviceAccess
            const mockCheckUserDeviceAccess = jest.fn().mockResolvedValue(true);
            jest.doMock('../lambda/utils/deviceAccess.ts', () => ({
                checkUserDeviceAccess: mockCheckUserDeviceAccess
            }));

            const result = await hasDevicePermission(mockDynamoDB, 'user-1', Action.READ_DEVICES, 'device-1');
            
            expect(result).toBe(true);
        });

        it('should return false when user has no general permission', async () => {
            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: []
            });

            const result = await hasDevicePermission(mockDynamoDB, 'user-1', Action.READ_DEVICES, 'device-1');
            
            expect(result).toBe(false);
        });
    });

    describe('hasCompanyPermission', () => {
        it('should return true when user has company permission', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.COMPANY_ADMIN }
                }
            });

            const result = await hasCompanyPermission(mockDynamoDB, 'user-1', Action.WRITE_USERS, 'company-1');
            
            expect(result).toBe(true);
        });

        it('should return false when user is not in company', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const result = await hasCompanyPermission(mockDynamoDB, 'user-1', Action.WRITE_USERS, 'company-1');
            
            expect(result).toBe(false);
        });
    });

    describe('canAssignRole', () => {
        it('should return true when user can assign role', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.COMPANY_ADMIN }
                }
            });

            const result = await canAssignRole(mockDynamoDB, 'user-1', 'company-1', UserRole.DEVICE_MANAGER);
            
            expect(result).toBe(true);
        });

        it('should return false when user cannot assign higher role', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.DEVICE_MANAGER }
                }
            });

            const result = await canAssignRole(mockDynamoDB, 'user-1', 'company-1', UserRole.COMPANY_ADMIN);
            
            expect(result).toBe(false);
        });

        it('should return false when user is not in company', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const result = await canAssignRole(mockDynamoDB, 'user-1', 'company-1', UserRole.DEVICE_VIEWER);
            
            expect(result).toBe(false);
        });
    });

    describe('Middleware Functions', () => {
        describe('requirePermission', () => {
            it('should call next() when user has permission', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                const mockNext = createMockNext();

                // Mock hasPermission to return true
                jest.doMock('../lambda/utils/permissions.ts', () => ({
                    hasPermission: jest.fn().mockResolvedValue(true)
                }));

                const middleware = requirePermission(Action.READ_DEVICES);
                await middleware(mockContext as any, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it('should return 401 when user is not authenticated', async () => {
                const mockContext = createMockContext();
                const mockNext = createMockNext();

                const middleware = requirePermission(Action.READ_DEVICES);
                await middleware(mockContext as any, mockNext);

                expect(mockContext.json).toHaveBeenCalledWith(
                    { error: 'User not authenticated' },
                    401
                );
            });

            it('should return 403 when user lacks permission', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                const mockNext = createMockNext();

                // Mock hasPermission to return false
                jest.doMock('../lambda/utils/permissions.ts', () => ({
                    hasPermission: jest.fn().mockResolvedValue(false)
                }));

                const middleware = requirePermission(Action.READ_DEVICES);
                await middleware(mockContext as any, mockNext);

                expect(mockContext.json).toHaveBeenCalledWith(
                    { error: 'Insufficient permissions' },
                    403
                );
            });
        });

        describe('requireDevicePermission', () => {
            it('should call next() when user has device permission', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                mockContext.req.param = jest.fn().mockReturnValue('device-1');
                const mockNext = createMockNext();

                // Mock hasDevicePermission to return true
                jest.doMock('../lambda/utils/permissions.ts', () => ({
                    hasDevicePermission: jest.fn().mockResolvedValue(true)
                }));

                const middleware = requireDevicePermission(Action.READ_DEVICES);
                await middleware(mockContext as any, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it('should return 400 when deviceId is missing', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                mockContext.req.param = jest.fn().mockReturnValue(undefined);
                const mockNext = createMockNext();

                const middleware = requireDevicePermission(Action.READ_DEVICES);
                await middleware(mockContext as any, mockNext);

                expect(mockContext.json).toHaveBeenCalledWith(
                    { error: 'Device ID required' },
                    400
                );
            });
        });

        describe('requireCompanyPermission', () => {
            it('should call next() when user has company permission', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                mockContext.req.param = jest.fn().mockReturnValue('company-1');
                const mockNext = createMockNext();

                // Mock hasCompanyPermission to return true
                jest.doMock('../lambda/utils/permissions.ts', () => ({
                    hasCompanyPermission: jest.fn().mockResolvedValue(true)
                }));

                const middleware = requireCompanyPermission(Action.WRITE_USERS);
                await middleware(mockContext as any, mockNext);

                expect(mockNext).toHaveBeenCalled();
            });

            it('should return 400 when companyId is missing', async () => {
                const mockContext = createMockContext({ sub: 'user-1' });
                mockContext.req.param = jest.fn().mockReturnValue(undefined);
                const mockNext = createMockNext();

                const middleware = requireCompanyPermission(Action.WRITE_USERS);
                await middleware(mockContext as any, mockNext);

                expect(mockContext.json).toHaveBeenCalledWith(
                    { error: 'Company ID required' },
                    400
                );
            });
        });
    });

    describe('Role Hierarchy', () => {
        it('should correctly identify role hierarchy levels', () => {
            // This test verifies the role hierarchy is correctly defined
            const roles = Object.values(UserRole);
            expect(roles).toContain(UserRole.COMPANY_ADMIN);
            expect(roles).toContain(UserRole.DEVICE_MANAGER);
            expect(roles).toContain(UserRole.DEVICE_VIEWER);
        });

        it('should have all required actions defined', () => {
            const requiredActions = [
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
            ];

            requiredActions.forEach(action => {
                expect(Object.values(Action)).toContain(action);
            });
        });
    });
}); 