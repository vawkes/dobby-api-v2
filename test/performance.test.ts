import { Hono } from 'hono';
import { describe, it, expect, beforeEach } from '@jest/globals';

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

// Create a test app with mock routes for performance testing
const createTestApp = () => {
  const app = new Hono<AppContext>();
  
  // Add middleware for testing
  app.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const mockUser = {
        user_id: token === 'admin-token' ? 'admin-user-id' : 'test-user-id',
        role: token === 'admin-token' ? 'COMPANY_ADMIN' : 'DEVICE_VIEWER',
        company_id: 'test-company-id'
      };
      c.set('user', mockUser);
    }
    await next();
  });

  // Mock companies route for performance testing
  app.get('/companies', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    // Simulate some processing time
    await new Promise(resolve => setTimeout(resolve, 10));

    return c.json([
      { id: 'company-1', name: 'Company 1' },
      { id: 'company-2', name: 'Company 2' }
    ]);
  });

  app.post('/companies', async (c) => {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    
    if (user.role !== 'COMPANY_ADMIN') {
      return c.json({ error: 'Insufficient permissions' }, 403);
    }

    const body = await c.req.json();
    if (!body.name || body.name.trim() === '') {
      return c.json({ error: 'Name is required' }, 400);
    }

    // Simulate database write time
    await new Promise(resolve => setTimeout(resolve, 20));

    return c.json({
      id: 'test-company-id',
      name: body.name,
      description: body.description,
      createdAt: new Date().toISOString()
    }, 201);
  });

  return app;
};

describe('Performance Tests', () => {
  let app: Hono<AppContext>;

  beforeEach(() => {
    app = createTestApp();
  });

  describe('Response Time Tests', () => {
    it('should respond to GET /companies within 150ms', async () => {
      const start = Date.now();
      
      const response = await app.request('/companies', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer admin-token'
        }
      });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(150);
    });

    it('should respond to POST /companies within 100ms', async () => {
      const start = Date.now();
      
      const response = await app.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: 'Performance Test Company',
          description: 'A company for performance testing'
        })
      });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(201);
      expect(duration).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Tests', () => {
    it('should handle 10 concurrent GET requests', async () => {
      const requests = Array(10).fill(null).map(() => 
        app.request('/companies', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        })
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalDuration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Total time should be reasonable (not 10x individual time)
      expect(totalDuration).toBeLessThan(200);
    });

    it('should handle 5 concurrent POST requests', async () => {
      const requests = Array(5).fill(null).map((_, index) => 
        app.request('/companies', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer admin-token',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: `Concurrent Company ${index}`,
            description: 'A company for concurrent testing'
          })
        })
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const totalDuration = Date.now() - start;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(201);
      });

      // Total time should be reasonable
      expect(totalDuration).toBeLessThan(300);
    });
  });

  describe('Load Testing', () => {
    it('should handle 100 sequential requests', async () => {
      const start = Date.now();
      
      for (let i = 0; i < 100; i++) {
        const response = await app.request('/companies', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });
        expect(response.status).toBe(200);
      }
      
      const totalDuration = Date.now() - start;
      
      // Should complete within reasonable time
      expect(totalDuration).toBeLessThan(5000);
    });

    it('should maintain consistent response times under load', async () => {
      const responseTimes: number[] = [];
      
      for (let i = 0; i < 20; i++) {
        const start = Date.now();
        
        const response = await app.request('/companies', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });
        
        const duration = Date.now() - start;
        responseTimes.push(duration);
        
        expect(response.status).toBe(200);
      }
      
      // Calculate average response time
      const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      
      // Average should be reasonable
      expect(avgResponseTime).toBeLessThan(50);
      
      // Standard deviation should be low (consistent performance)
      const variance = responseTimes.reduce((acc, time) => acc + Math.pow(time - avgResponseTime, 2), 0) / responseTimes.length;
      const stdDev = Math.sqrt(variance);
      
      expect(stdDev).toBeLessThan(20);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should not leak memory during repeated requests', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Make many requests
      for (let i = 0; i < 100; i++) {
        const response = await app.request('/companies', {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer admin-token'
          }
        });
        expect(response.status).toBe(200);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 15MB)
      expect(memoryIncrease).toBeLessThan(15 * 1024 * 1024);
    });
  });

  describe('Error Handling Performance', () => {
    it('should handle authentication errors quickly', async () => {
      const start = Date.now();
      
      const response = await app.request('/companies', {
        method: 'GET'
        // No Authorization header
      });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(401);
      expect(duration).toBeLessThan(10); // Should fail fast
    });

    it('should handle validation errors quickly', async () => {
      const start = Date.now();
      
      const response = await app.request('/companies', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer admin-token',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Missing required 'name' field
          description: 'Invalid company data'
        })
      });
      
      const duration = Date.now() - start;
      
      expect(response.status).toBe(400);
      expect(duration).toBeLessThan(20); // Should fail fast
    });
  });
}); 