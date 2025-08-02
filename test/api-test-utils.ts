import { Hono } from 'hono';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Types for API testing
export interface TestUser {
  user_id: string;
  role: string;
  company_id: string;
}

export interface ApiResponse<T = any> {
  status: number;
  body: T;
  headers: Record<string, string>;
}

export interface TestRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
}

// Request builder for cleaner test syntax
export class ApiTestClient {
  private app: Hono;
  private baseHeaders: Record<string, string>;

  constructor(app: Hono) {
    this.app = app;
    this.baseHeaders = {
      'Content-Type': 'application/json'
    };
  }

  withAuth(token: string): ApiTestClient {
    this.baseHeaders['Authorization'] = `Bearer ${token}`;
    return this;
  }

  async request<T = any>(testRequest: TestRequest): Promise<ApiResponse<T>> {
    const { method, path, headers = {}, body, query } = testRequest;
    
    // Build query string
    const queryString = query ? 
      '?' + new URLSearchParams(query).toString() : '';
    
    const fullPath = path + queryString;
    
    const response = await this.app.request(fullPath, {
      method,
      headers: { ...this.baseHeaders, ...headers },
      body: body ? JSON.stringify(body) : undefined
    });

    const responseBody = await response.json().catch(() => ({}));
    
    return {
      status: response.status,
      body: responseBody,
      headers: Object.fromEntries(response.headers.entries())
    };
  }

  // Convenience methods
  async get<T = any>(path: string, query?: Record<string, string>): Promise<ApiResponse<T>> {
    return this.request({ method: 'GET', path, query });
  }

  async post<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request({ method: 'POST', path, body });
  }

  async put<T = any>(path: string, body?: any): Promise<ApiResponse<T>> {
    return this.request({ method: 'PUT', path, body });
  }

  async delete<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.request({ method: 'DELETE', path });
  }
}

// Response validators
export const expectSuccess = (response: ApiResponse, statusCode = 200) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).not.toHaveProperty('error');
};

export const expectError = (response: ApiResponse, statusCode: number, errorMessage?: string) => {
  expect(response.status).toBe(statusCode);
  expect(response.body).toHaveProperty('error');
  if (errorMessage) {
    expect(response.body.error).toContain(errorMessage);
  }
};

export const expectValidationError = (response: ApiResponse) => {
  expectError(response, 400);
};

export const expectUnauthorized = (response: ApiResponse) => {
  expectError(response, 401, 'Unauthorized');
};

export const expectForbidden = (response: ApiResponse) => {
  expectError(response, 403, 'Insufficient permissions');
};

export const expectNotFound = (response: ApiResponse) => {
  expectError(response, 404);
};

// Test data factories
export const createTestCompany = (overrides = {}) => ({
  name: 'Test Company',
  description: 'A test company for API testing',
  ...overrides
});

export const createTestDevice = (overrides = {}) => ({
  device_id: 'test-device-123',
  company_id: 'test-company-id',
  name: 'Test Device',
  type: 'sensor',
  ...overrides
});

export const createTestEvent = (overrides = {}) => ({
  device_id: 'test-device-123',
  event_type: 'load_up',
  timestamp: new Date().toISOString(),
  data: {
    power: 1000,
    voltage: 240
  },
  ...overrides
});

// Common test scenarios
export const testScenarios = {
  // Authentication scenarios
  authentication: {
    validAdmin: { token: 'admin-token', role: 'COMPANY_ADMIN' },
    validViewer: { token: 'viewer-token', role: 'DEVICE_VIEWER' },
    invalidToken: { token: 'invalid-token' },
    noToken: { token: null }
  },

  // Validation scenarios
  validation: {
    emptyName: { name: '' },
    missingName: {},
    invalidType: { name: 123 },
    malformedJson: 'invalid json'
  },

  // Error scenarios
  errors: {
    databaseError: new Error('Database connection failed'),
    networkError: new Error('Network timeout'),
    validationError: new Error('Validation failed')
  }
};

// Test helpers
export const runAuthTests = (
  client: ApiTestClient,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any
) => {
  describe('Authentication', () => {
    it('should require authentication', async () => {
      const response = await client.request({ method, path: endpoint, body });
      expectUnauthorized(response);
    });

    it('should accept valid admin token', async () => {
      const response = await client
        .withAuth('admin-token')
        .request({ method, path: endpoint, body });
      expect(response.status).not.toBe(401);
    });

    it('should accept valid viewer token', async () => {
      const response = await client
        .withAuth('viewer-token')
        .request({ method, path: endpoint, body });
      expect(response.status).not.toBe(401);
    });
  });
};

export const runValidationTests = (
  client: ApiTestClient,
  endpoint: string,
  validData: any,
  invalidScenarios: Record<string, any>
) => {
  describe('Validation', () => {
    it('should accept valid data', async () => {
      const response = await client
        .withAuth('admin-token')
        .post(endpoint, validData);
      expectSuccess(response, 201);
    });

    Object.entries(invalidScenarios).forEach(([scenario, invalidData]) => {
      it(`should reject ${scenario}`, async () => {
        const response = await client
          .withAuth('admin-token')
          .post(endpoint, invalidData);
        expectValidationError(response);
      });
    });
  });
};

export const runPermissionTests = (
  client: ApiTestClient,
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: any,
  requiredRole = 'COMPANY_ADMIN'
) => {
  describe('Permissions', () => {
    it(`should allow ${requiredRole}`, async () => {
      const response = await client
        .withAuth('admin-token')
        .request({ method, path: endpoint, body });
      expect(response.status).not.toBe(403);
    });

    if (requiredRole === 'COMPANY_ADMIN') {
      it('should deny DEVICE_VIEWER for admin-only endpoints', async () => {
        const response = await client
          .withAuth('viewer-token')
          .request({ method, path: endpoint, body });
        expectForbidden(response);
      });
    }
  });
};

// Performance testing helpers
export const measureResponseTime = async <T>(
  requestFn: () => Promise<ApiResponse<T>>
): Promise<{ response: ApiResponse<T>; duration: number }> {
  const start = Date.now();
  const response = await requestFn();
  const duration = Date.now() - start;
  
  return { response, duration };
};

export const expectResponseTime = (
  duration: number,
  maxTime: number = 1000
) => {
  expect(duration).toBeLessThan(maxTime);
};

// Load testing helpers
export const runConcurrentRequests = async <T>(
  requestFn: () => Promise<ApiResponse<T>>,
  concurrency: number = 10
): Promise<ApiResponse<T>[]> => {
  const promises = Array(concurrency).fill(null).map(() => requestFn());
  return Promise.all(promises);
};

export const expectAllSuccessful = (responses: ApiResponse[]) => {
  responses.forEach(response => {
    expect(response.status).toBeGreaterThanOrEqual(200);
    expect(response.status).toBeLessThan(300);
  });
};

// Mock utilities
export const createMockDynamoDB = () => ({
  getItem: jest.fn(),
  query: jest.fn(),
  putItem: jest.fn(),
  deleteItem: jest.fn(),
  scan: jest.fn(),
  updateItem: jest.fn()
});

export const createMockContext = (user?: TestUser, params?: any) => ({
  get: jest.fn().mockReturnValue(user),
  req: {
    param: jest.fn().mockImplementation((key: unknown) => params?.[key as string]),
    valid: jest.fn().mockImplementation((type: unknown) => {
      if (type === 'json') {
        return params?.body || {};
      }
      return params?.[type as string] || {};
    })
  },
  json: jest.fn(),
  status: jest.fn().mockReturnThis()
}); 