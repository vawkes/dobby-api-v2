import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import companiesApp from '../lambda/companies/companies';
import { UserRole } from '../lambda/utils/permissions';

// Mock dependencies
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/util-dynamodb');
jest.mock('uuid');
jest.mock('../lambda/utils/permissions', () => ({
    requirePermission: jest.fn(() => jest.fn()),
    requireCompanyPermission: jest.fn(() => jest.fn()),
    Action: {
        WRITE_COMPANIES: 'write_companies',
        READ_USERS: 'read_users',
        WRITE_USERS: 'write_users',
        DELETE_USERS: 'delete_users',
        READ_DEVICES: 'read_devices',
        ASSIGN_DEVICES: 'assign_devices',
        UNASSIGN_DEVICES: 'unassign_devices'
    },
    canAssignRole: jest.fn(),
    getUserRoleInCompany: jest.fn(),
    UserRole: {
        COMPANY_ADMIN: 'COMPANY_ADMIN',
        DEVICE_MANAGER: 'DEVICE_MANAGER',
        DEVICE_VIEWER: 'DEVICE_VIEWER'
    }
}));

const mockDynamoDB = {
    getItem: jest.fn(),
    query: jest.fn(),
    putItem: jest.fn(),
    deleteItem: jest.fn(),
    scan: jest.fn()
} as unknown as DynamoDB;

// Mock Hono app
const createMockRequest = (method: string, path: string, body?: any, params?: any) => ({
    method,
    path,
    body,
    param: jest.fn().mockImplementation((key: string) => params?.[key])
});

const createMockContext = (user?: any, request?: any) => ({
    get: jest.fn().mockReturnValue(user),
    req: request || createMockRequest('GET', '/'),
    json: jest.fn(),
    status: jest.fn().mockReturnThis()
});

describe('Companies API', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Mock DynamoDB constructor
        (DynamoDB as jest.MockedClass<typeof DynamoDB>).mockImplementation(() => mockDynamoDB as any);
        // Mock uuid
        (uuidv4 as jest.MockedFunction<typeof uuidv4>).mockReturnValue('test-uuid');
    });

    describe('POST / - Create Company', () => {
        it('should create a company successfully', async () => {
            const mockContext = createMockContext(
                { sub: 'admin-user' },
                createMockRequest('POST', '/', { name: 'Test Company' })
            );

            mockDynamoDB.putItem = jest.fn().mockResolvedValue({});

            // Mock the middleware to pass through
            const { requirePermission } = await import('../lambda/utils/permissions');
            (requirePermission as jest.MockedFunction<typeof requirePermission>).mockReturnValue(jest.fn());

            const response = await companiesApp.request('/', {
                method: 'POST',
                body: JSON.stringify({ name: 'Test Company' })
            });

            expect(mockDynamoDB.putItem).toHaveBeenCalledWith({
                TableName: 'Companies',
                Item: expect.objectContaining({
                    id: { S: 'test-uuid' },
                    name: { S: 'Test Company' }
                })
            });
        });

        it('should return 400 for invalid request data', async () => {
            const response = await companiesApp.request('/', {
                method: 'POST',
                body: JSON.stringify({ invalidField: 'value' })
            });

            expect(response.status).toBe(400);
        });
    });

    describe('GET / - Get All Companies', () => {
        it('should return all companies', async () => {
            const mockCompanies = [
                { id: 'company-1', name: 'Company 1' },
                { id: 'company-2', name: 'Company 2' }
            ];

            mockDynamoDB.scan = jest.fn().mockResolvedValue({
                Items: mockCompanies.map(company => marshall(company))
            });

            const response = await companiesApp.request('/', {
                method: 'GET'
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual(mockCompanies);
        });
    });

    describe('GET /:companyId - Get Specific Company', () => {
        it('should return company when it exists', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: marshall(mockCompany)
            });

            const response = await companiesApp.request('/company-1', {
                method: 'GET'
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual(mockCompany);
        });

        it('should return 404 when company does not exist', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const response = await companiesApp.request('/nonexistent-company', {
                method: 'GET'
            });

            expect(response.status).toBe(404);
        });
    });

    describe('POST /:companyId/users - Add User to Company', () => {
        it('should add user to company successfully', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockUser = { user_id: 'user-1', role: UserRole.DEVICE_MANAGER };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }); // Company exists

            mockDynamoDB.putItem = jest.fn().mockResolvedValue({});

            // Mock canAssignRole to return true
            const { canAssignRole } = await import('../lambda/utils/permissions');
            (canAssignRole as jest.MockedFunction<typeof canAssignRole>).mockResolvedValue(true);

            const response = await companiesApp.request('/company-1/users', {
                method: 'POST',
                body: JSON.stringify(mockUser)
            });

            expect(response.status).toBe(201);
            expect(mockDynamoDB.putItem).toHaveBeenCalledWith({
                TableName: 'CompanyUsers',
                Item: expect.objectContaining({
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' },
                    role: { S: UserRole.DEVICE_MANAGER }
                })
            });
        });

        it('should return 404 when company does not exist', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const response = await companiesApp.request('/nonexistent-company/users', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'user-1', role: UserRole.DEVICE_MANAGER })
            });

            expect(response.status).toBe(404);
        });

        it('should return 403 when user cannot assign role', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) });

            // Mock canAssignRole to return false
            const { canAssignRole } = await import('../lambda/utils/permissions');
            (canAssignRole as jest.MockedFunction<typeof canAssignRole>).mockResolvedValue(false);

            const response = await companiesApp.request('/company-1/users', {
                method: 'POST',
                body: JSON.stringify({ user_id: 'user-1', role: UserRole.COMPANY_ADMIN })
            });

            expect(response.status).toBe(403);
        });
    });

    describe('PUT /:companyId/users/:userId - Update User Role', () => {
        it('should update user role successfully', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockUserCompany = {
                company_id: 'company-1',
                user_id: 'user-1',
                role: UserRole.DEVICE_VIEWER,
                added_at: '2023-01-01T00:00:00Z'
            };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }) // Company exists
                .mockResolvedValueOnce({ Item: marshall(mockUserCompany) }); // User exists

            mockDynamoDB.putItem = jest.fn().mockResolvedValue({});

            // Mock canAssignRole to return true
            const { canAssignRole } = await import('../lambda/utils/permissions');
            (canAssignRole as jest.MockedFunction<typeof canAssignRole>).mockResolvedValue(true);

            const response = await companiesApp.request('/company-1/users/user-1', {
                method: 'PUT',
                body: JSON.stringify({ role: UserRole.DEVICE_MANAGER })
            });

            expect(response.status).toBe(200);
            expect(mockDynamoDB.putItem).toHaveBeenCalledWith({
                TableName: 'CompanyUsers',
                Item: expect.objectContaining({
                    role: { S: UserRole.DEVICE_MANAGER }
                })
            });
        });

        it('should return 404 when company does not exist', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const response = await companiesApp.request('/nonexistent-company/users/user-1', {
                method: 'PUT',
                body: JSON.stringify({ role: UserRole.DEVICE_MANAGER })
            });

            expect(response.status).toBe(404);
        });

        it('should return 404 when user does not exist in company', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }) // Company exists
                .mockResolvedValueOnce({ Item: undefined }); // User doesn't exist

            const response = await companiesApp.request('/company-1/users/nonexistent-user', {
                method: 'PUT',
                body: JSON.stringify({ role: UserRole.DEVICE_MANAGER })
            });

            expect(response.status).toBe(404);
        });
    });

    describe('DELETE /:companyId/users/:userId - Remove User from Company', () => {
        it('should remove user from company successfully', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockUserCompany = {
                company_id: 'company-1',
                user_id: 'user-1',
                role: UserRole.DEVICE_VIEWER
            };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }) // Company exists
                .mockResolvedValueOnce({ Item: marshall(mockUserCompany) }); // User exists

            mockDynamoDB.deleteItem = jest.fn().mockResolvedValue({});

            // Mock getUserRoleInCompany to return appropriate roles
            const { getUserRoleInCompany } = await import('../lambda/utils/permissions');
            (getUserRoleInCompany as jest.MockedFunction<typeof getUserRoleInCompany>)
                .mockResolvedValueOnce(UserRole.COMPANY_ADMIN) // Current user role
                .mockResolvedValueOnce(UserRole.DEVICE_VIEWER); // Target user role

            const response = await companiesApp.request('/company-1/users/user-1', {
                method: 'DELETE'
            });

            expect(response.status).toBe(200);
            expect(mockDynamoDB.deleteItem).toHaveBeenCalledWith({
                TableName: 'CompanyUsers',
                Key: {
                    company_id: { S: 'company-1' },
                    user_id: { S: 'user-1' }
                }
            });
        });

        it('should return 403 when user cannot remove target user', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockUserCompany = {
                company_id: 'company-1',
                user_id: 'user-1',
                role: UserRole.COMPANY_ADMIN
            };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) })
                .mockResolvedValueOnce({ Item: marshall(mockUserCompany) });

            // Mock getUserRoleInCompany to return roles where current user cannot remove target
            const { getUserRoleInCompany } = await import('../lambda/utils/permissions');
            (getUserRoleInCompany as jest.MockedFunction<typeof getUserRoleInCompany>)
                .mockResolvedValueOnce(UserRole.DEVICE_MANAGER) // Current user role (lower)
                .mockResolvedValueOnce(UserRole.COMPANY_ADMIN); // Target user role (higher)

            const response = await companiesApp.request('/company-1/users/user-1', {
                method: 'DELETE'
            });

            expect(response.status).toBe(403);
        });
    });

    describe('GET /:companyId/users - Get Company Users', () => {
        it('should return all users for a company', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockUsers = [
                { company_id: 'company-1', user_id: 'user-1', role: UserRole.COMPANY_ADMIN },
                { company_id: 'company-1', user_id: 'user-2', role: UserRole.DEVICE_MANAGER }
            ];

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: marshall(mockCompany)
            });

            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: mockUsers.map(user => marshall(user))
            });

            const response = await companiesApp.request('/company-1/users', {
                method: 'GET'
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual(mockUsers);
        });

        it('should return 404 when company does not exist', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const response = await companiesApp.request('/nonexistent-company/users', {
                method: 'GET'
            });

            expect(response.status).toBe(404);
        });
    });

    describe('POST /:companyId/devices - Add Device to Company', () => {
        it('should add device to company successfully', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: marshall(mockCompany)
            });

            mockDynamoDB.putItem = jest.fn().mockResolvedValue({});

            const response = await companiesApp.request('/company-1/devices', {
                method: 'POST',
                body: JSON.stringify({ device_id: 'device-1' })
            });

            expect(response.status).toBe(201);
            expect(mockDynamoDB.putItem).toHaveBeenCalledWith({
                TableName: 'CompanyDevices',
                Item: expect.objectContaining({
                    company_id: { S: 'company-1' },
                    device_id: { S: 'device-1' }
                })
            });
        });

        it('should return 404 when company does not exist', async () => {
            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: undefined
            });

            const response = await companiesApp.request('/nonexistent-company/devices', {
                method: 'POST',
                body: JSON.stringify({ device_id: 'device-1' })
            });

            expect(response.status).toBe(404);
        });
    });

    describe('GET /:companyId/devices - Get Company Devices', () => {
        it('should return all devices for a company', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockDevices = [
                { company_id: 'company-1', device_id: 'device-1' },
                { company_id: 'company-1', device_id: 'device-2' }
            ];

            mockDynamoDB.getItem = jest.fn().mockResolvedValue({
                Item: marshall(mockCompany)
            });

            mockDynamoDB.query = jest.fn().mockResolvedValue({
                Items: mockDevices.map(device => marshall(device))
            });

            const response = await companiesApp.request('/company-1/devices', {
                method: 'GET'
            });

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data).toEqual(mockDevices);
        });
    });

    describe('DELETE /:companyId/devices/:deviceId - Remove Device from Company', () => {
        it('should remove device from company successfully', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };
            const mockDevice = { company_id: 'company-1', device_id: 'device-1' };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }) // Company exists
                .mockResolvedValueOnce({ Item: marshall(mockDevice) }); // Device exists

            mockDynamoDB.deleteItem = jest.fn().mockResolvedValue({});

            const response = await companiesApp.request('/company-1/devices/device-1', {
                method: 'DELETE'
            });

            expect(response.status).toBe(200);
            expect(mockDynamoDB.deleteItem).toHaveBeenCalledWith({
                TableName: 'CompanyDevices',
                Key: {
                    company_id: { S: 'company-1' },
                    device_id: { S: 'device-1' }
                }
            });
        });

        it('should return 404 when device is not assigned to company', async () => {
            const mockCompany = { id: 'company-1', name: 'Test Company' };

            mockDynamoDB.getItem = jest.fn()
                .mockResolvedValueOnce({ Item: marshall(mockCompany) }) // Company exists
                .mockResolvedValueOnce({ Item: undefined }); // Device doesn't exist

            const response = await companiesApp.request('/company-1/devices/nonexistent-device', {
                method: 'DELETE'
            });

            expect(response.status).toBe(404);
        });
    });

    describe('Error Handling', () => {
        it('should handle database errors gracefully', async () => {
            mockDynamoDB.getItem = jest.fn().mockRejectedValue(new Error('Database error'));

            const response = await companiesApp.request('/company-1', {
                method: 'GET'
            });

            expect(response.status).toBe(500);
        });

        it('should handle validation errors', async () => {
            const response = await companiesApp.request('/', {
                method: 'POST',
                body: JSON.stringify({ invalidField: 'value' })
            });

            expect(response.status).toBe(400);
        });
    });
}); 