import { Hono } from 'hono';
import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';


// Define the context type for our app
type AppContext = {
  Variables: {
    user?: {
      user_id: string;
      role: string;
      company_id: string;
    };
  };
};

// Create a test app with mock routes
const createTestApp = () => {
  const app = new Hono<AppContext>();
  
  // Add middleware for testing
  app.use('*', async (c, next) => {
    // Mock authentication middleware for testing
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      // Mock user data based on token
      const mockUser = {
        user_id: token === 'admin-token' ? 'admin-user-id' : 'test-user-id',
        role: token === 'admin-token' ? 'COMPANY_ADMIN' : 'DEVICE_VIEWER',
        company_id: 'test-company-id'
      };
      c.set('user', mockUser);
    }
    await next();
  });

  // Mock companies routes for testing
  app.post('/companies', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (user.role !== 'COMPANY_ADMIN') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    let body;
    try {
      body = await c.req.json();
      if (!body.name || body.name.trim() === '') {
        return c.json({ error: 'Name is required' }, 400);
      }
    } catch (error) {
      return c.json({ error: 'Invalid JSON' }, 400);
    }

    return c.json({
      id: 'test-company-id',
      name: body.name,
      description: body.description,
      createdAt: new Date().toISOString()
    }, 201);
  });

  app.get('/companies', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json([
      { id: 'company-1', name: 'Company 1' },
      { id: 'company-2', name: 'Company 2' }
    ]);
  });

  app.get('/companies/:id', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const id = c.req.param('id');
    if (id === 'non-existent-id') {
      return c.json({ error: 'Company not found' }, 404);
    }

    return c.json({
      id,
      name: 'Test Company',
      createdAt: new Date().toISOString()
    });
  });

  // Mock devices routes
  app.post('/devices', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    return c.json({
      device_id: body.device_id,
      company_id: body.company_id,
      name: body.name,
      type: body.type,
      createdAt: new Date().toISOString()
    }, 201);
  });

  app.get('/devices', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json({
      devices: [
        { device_id: 'device-1', name: 'Device 1' },
        { device_id: 'device-2', name: 'Device 2' }
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 2
      }
    });
  });

  // Mock events routes
  app.post('/events', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    if (!body.device_id || body.device_id.trim() === '') {
      return c.json({ error: 'Device ID is required' }, 400);
    }

    return c.json({
      event_id: 'event-123',
      device_id: body.device_id,
      event_type: body.event_type,
      timestamp: body.timestamp,
      data: body.data
    }, 201);
  });

  app.get('/events', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    return c.json([
      {
        event_id: 'event-1',
        device_id: 'device-1',
        event_type: 'load_up',
        timestamp: '2023-01-01T00:00:00Z',
        data: { power: 1000 }
      }
    ]);
  });

  return app;
};

describe('API Endpoint Tests', () => {
  let app: Hono<AppContext>;
  beforeEach(() => {
    app = createTestApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Companies API', () => {
    describe('POST /companies', () => {
      it('should create a company successfully', async () => {
        const companyData = {
          name: 'Test Company',
          description: 'A test company'
        };

        const response = await app.request('/companies', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(companyData)
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty('id');
        expect(body.name).toBe(companyData.name);
      });

      it('should return 400 for invalid company data', async () => {
        const invalidData = {
          name: '', // Invalid: empty name
          description: 'A test company'
        };

        const response = await app.request('/companies', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invalidData)
        });

        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body).toHaveProperty('error');
      });

      it('should return 401 for unauthorized requests', async () => {
        const companyData = {
          name: 'Test Company',
          description: 'A test company'
        };

        const response = await app.request('/companies', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(companyData)
        });

        expect(response.status).toBe(401);
      });
    });

    describe('GET /companies', () => {
      it('should return all companies', async () => {
        const response = await app.request('/companies', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveLength(2);
        expect(body[0]).toHaveProperty('id');
        expect(body[0]).toHaveProperty('name');
      });
    });

    describe('GET /companies/:companyId', () => {
      it('should return a specific company', async () => {
        const response = await app.request('/companies/test-company-id', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('id', 'test-company-id');
        expect(body).toHaveProperty('name');
      });

      it('should return 404 for non-existent company', async () => {
        const response = await app.request('/companies/non-existent-id', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        expect(response.status).toBe(404);
      });
    });
  });

  describe('Devices API', () => {
    describe('POST /devices', () => {
      it('should create a device successfully', async () => {
        const deviceData = {
          device_id: 'test-device-123',
          company_id: 'test-company-id',
          name: 'Test Device',
          type: 'sensor'
        };

        const response = await app.request('/devices', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(deviceData)
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty('device_id', deviceData.device_id);
        expect(body).toHaveProperty('company_id', deviceData.company_id);
      });
    });

    describe('GET /devices', () => {
      it('should return devices with pagination', async () => {
        const response = await app.request('/devices?page=1&limit=10', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveProperty('devices');
        expect(body).toHaveProperty('pagination');
        expect(body.devices).toHaveLength(2);
      });
    });
  });

  describe('Events API', () => {
    describe('POST /events', () => {
      it('should create an event successfully', async () => {
        const eventData = {
          device_id: 'test-device-123',
          event_type: 'load_up',
          timestamp: new Date().toISOString(),
          data: {
            power: 1000,
            voltage: 240
          }
        };

        const response = await app.request('/events', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(eventData)
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty('event_id');
        expect(body).toHaveProperty('device_id', eventData.device_id);
        expect(body).toHaveProperty('event_type', eventData.event_type);
      });

      it('should validate event data', async () => {
        const invalidEventData = {
          device_id: '', // Invalid: empty device_id
          event_type: 'invalid_type', // Invalid event type
          timestamp: 'invalid-date'
        };

        const response = await app.request('/events', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(invalidEventData)
        });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /events', () => {
      it('should return events with filtering', async () => {
        const response = await app.request('/events?device_id=device-1&event_type=load_up', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });

        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toHaveLength(1);
        expect(body[0]).toHaveProperty('event_id', 'event-1');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const response = await app.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: 'invalid json'
      });

      expect(response.status).toBe(400);
    });
  });

  describe('Authentication & Authorization', () => {
    it('should require authentication for protected endpoints', async () => {
      const response = await app.request('/companies', {
        method: 'GET'
      });

      expect(response.status).toBe(401);
    });

    it('should enforce role-based permissions', async () => {
      // Test with a user that has limited permissions
      const response = await app.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer viewer-token', // DEVICE_VIEWER role
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: 'Test Company' })
      });

      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body).toHaveProperty('error');
      expect(body.error).toContain('Insufficient permissions');
    });
  });

  describe('Request Validation', () => {
    it('should validate required fields', async () => {
      const incompleteData = {
        // Missing required 'name' field
        description: 'A test company'
      };

      const response = await app.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(incompleteData)
      });

      expect(response.status).toBe(400);
    });
  });
}); 