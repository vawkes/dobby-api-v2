// Global test setup for Jest
import { jest, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';

// Global test setup
beforeAll(() => {
  // Set up any global test configuration
  console.log('Setting up test environment...');
});

afterAll(() => {
  // Clean up any global test resources
  console.log('Cleaning up test environment...');
});

// Mock console methods to reduce noise in tests
beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

// Global test utilities
export const createMockDynamoDB = () => ({
  getItem: jest.fn(),
  query: jest.fn(),
  putItem: jest.fn(),
  deleteItem: jest.fn(),
  scan: jest.fn(),
  updateItem: jest.fn()
});

export const createMockContext = (user?: any, params?: any) => ({
  get: jest.fn().mockReturnValue(user),
  req: {
    param: jest.fn().mockImplementation((key: any) => params?.[key]),
    valid: jest.fn().mockImplementation((type: any) => {
      if (type === 'json') {
        return params?.body || {};
      }
      return params?.[type] || {};
    })
  },
  json: jest.fn(),
  status: jest.fn().mockReturnThis()
});

export const createMockNext = () => jest.fn();

// Test data factories
export const createTestCompany = (overrides = {}) => ({
  id: 'test-company-id',
  name: 'Test Company',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createTestUser = (overrides = {}) => ({
  user_id: 'test-user-id',
  role: 'DEVICE_VIEWER',
  company_id: 'test-company-id',
  added_at: '2023-01-01T00:00:00Z',
  ...overrides
});

export const createTestDevice = (overrides = {}) => ({
  device_id: 'test-device-id',
  company_id: 'test-company-id',
  assigned_at: '2023-01-01T00:00:00Z',
  ...overrides
});

// Test constants
export const TEST_CONSTANTS = {
  COMPANY_ID: 'test-company-id',
  USER_ID: 'test-user-id',
  DEVICE_ID: 'test-device-id',
  ADMIN_USER_ID: 'admin-user-id',
  MANAGER_USER_ID: 'manager-user-id',
  VIEWER_USER_ID: 'viewer-user-id'
};

// Test roles
export const TEST_ROLES = {
  COMPANY_ADMIN: 'COMPANY_ADMIN',
  DEVICE_MANAGER: 'DEVICE_MANAGER',
  DEVICE_VIEWER: 'DEVICE_VIEWER'
};

// Test actions
export const TEST_ACTIONS = {
  READ_DEVICES: 'read_devices',
  WRITE_DEVICES: 'write_devices',
  DELETE_DEVICES: 'delete_devices',
  READ_EVENTS: 'read_events',
  CREATE_EVENTS: 'create_events',
  DELETE_EVENTS: 'delete_events',
  WRITE_COMPANIES: 'write_companies',
  READ_USERS: 'read_users',
  WRITE_USERS: 'write_users',
  DELETE_USERS: 'delete_users',
  ASSIGN_DEVICES: 'assign_devices',
  UNASSIGN_DEVICES: 'unassign_devices'
}; 