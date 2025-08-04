# API Testing Guide for Dobby API v2

This guide provides comprehensive recommendations for testing your backend API,
building on your existing Jest setup and adding new testing approaches.

## 🧪 Current Testing Setup

Your project already has a solid foundation:

- ✅ **Jest** with TypeScript configuration
- ✅ **Unit tests** for permissions, companies, devices, and events
- ✅ **Integration tests** for complete workflows
- ✅ **Mock utilities** for DynamoDB and Hono contexts
- ✅ **Test data factories** and constants
- ✅ **Coverage reporting**

## 🚀 Recommended Testing Enhancements

### 1. **API Endpoint Testing with Hono's Built-in Testing**

Since you're using Hono, you can test endpoints directly without external HTTP
libraries:

```typescript
// test/api-endpoints.test.ts
import { Hono } from "hono";
import { describe, expect, it, jest } from "@jest/globals";

describe("API Endpoints", () => {
    let app: Hono;

    beforeEach(() => {
        app = new Hono();
        // Add your routes here
    });

    it("should create a company", async () => {
        const response = await app.request("/companies", {
            method: "POST",
            headers: {
                "Authorization": "Bearer admin-token",
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: "Test Company",
                description: "A test company",
            }),
        });

        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toHaveProperty("id");
        expect(body.name).toBe("Test Company");
    });
});
```

### 2. **Contract Testing with OpenAPI**

Since you're using Hono with OpenAPI, you can test API contracts:

```typescript
// test/contract.test.ts
import { describe, expect, it } from "@jest/globals";
import { companies } from "../lambda/companies/companies";

describe("API Contract Tests", () => {
    it("should match OpenAPI schema for company creation", async () => {
        // Test that your API responses match the OpenAPI schema
        const response = await companies.request("/companies", {
            method: "POST",
            headers: { "Authorization": "Bearer admin-token" },
            body: JSON.stringify({ name: "Test Company" }),
        });

        expect(response.status).toBe(201);
        // Validate against your OpenAPI schema
    });
});
```

### 3. **Performance Testing**

Add performance benchmarks to your tests:

```typescript
// test/performance.test.ts
import { describe, expect, it } from "@jest/globals";

describe("Performance Tests", () => {
    it("should respond within 100ms", async () => {
        const start = Date.now();

        const response = await app.request("/companies", {
            method: "GET",
            headers: { "Authorization": "Bearer admin-token" },
        });

        const duration = Date.now() - start;
        expect(duration).toBeLessThan(100);
        expect(response.status).toBe(200);
    });

    it("should handle concurrent requests", async () => {
        const requests = Array(10).fill(null).map(() =>
            app.request("/companies", {
                method: "GET",
                headers: { "Authorization": "Bearer admin-token" },
            })
        );

        const responses = await Promise.all(requests);
        responses.forEach((response) => {
            expect(response.status).toBe(200);
        });
    });
});
```

### 4. **Load Testing with Artillery**

For more comprehensive load testing:

```bash
# Install Artillery
npm install -g artillery

# Create load test configuration
```

```yaml
# load-test.yml
config:
    target: "http://localhost:3000"
    phases:
        - duration: 60
          arrivalRate: 10
    defaults:
        headers:
            Authorization: "Bearer admin-token"

scenarios:
    - name: "Company API Load Test"
      requests:
          - get:
                url: "/companies"
          - post:
                url: "/companies"
                json:
                    name: "Load Test Company"
```

### 5. **Security Testing**

Add security-focused tests:

```typescript
// test/security.test.ts
describe("Security Tests", () => {
    it("should prevent SQL injection", async () => {
        const maliciousInput = "'; DROP TABLE companies; --";

        const response = await app.request("/companies", {
            method: "POST",
            headers: { "Authorization": "Bearer admin-token" },
            body: JSON.stringify({ name: maliciousInput }),
        });

        // Should handle gracefully, not crash
        expect(response.status).toBe(400);
    });

    it("should validate JWT tokens properly", async () => {
        const invalidTokens = [
            "invalid-token",
            "Bearer invalid",
            "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid",
        ];

        for (const token of invalidTokens) {
            const response = await app.request("/companies", {
                method: "GET",
                headers: { "Authorization": token },
            });
            expect(response.status).toBe(401);
        }
    });
});
```

### 6. **Integration Testing with Real Services**

Test with actual AWS services in a test environment:

```typescript
// test/integration-aws.test.ts
import { DynamoDB } from "@aws-sdk/client-dynamodb";

describe("AWS Integration Tests", () => {
    let dynamodb: DynamoDB;

    beforeAll(() => {
        dynamodb = new DynamoDB({
            region: "us-east-1",
            endpoint: process.env.DYNAMODB_ENDPOINT, // LocalStack for testing
        });
    });

    it("should create and retrieve company from DynamoDB", async () => {
        // Test actual DynamoDB operations
        const companyId = "test-company-" + Date.now();

        await dynamodb.putItem({
            TableName: "Companies",
            Item: {
                id: { S: companyId },
                name: { S: "Test Company" },
                createdAt: { S: new Date().toISOString() },
            },
        });

        const result = await dynamodb.getItem({
            TableName: "Companies",
            Key: { id: { S: companyId } },
        });

        expect(result.Item).toBeDefined();
        expect(result.Item?.name.S).toBe("Test Company");
    });
});
```

### 7. **API Documentation Testing**

Ensure your OpenAPI documentation matches your implementation:

```typescript
// test/documentation.test.ts
import { describe, expect, it } from "@jest/globals";

describe("API Documentation Tests", () => {
    it("should have OpenAPI documentation for all endpoints", () => {
        // Test that all your routes have proper OpenAPI documentation
        const routes = [
            "POST /companies",
            "GET /companies",
            "GET /companies/:id",
            "POST /devices",
            "GET /devices",
            "POST /events",
            "GET /events",
        ];

        routes.forEach((route) => {
            // Verify OpenAPI schema exists for each route
            expect(hasOpenAPIDocumentation(route)).toBe(true);
        });
    });
});
```

## 🛠️ Testing Tools & Libraries

### Recommended Additions:

1. **Supertest** (already installed)
   - For HTTP-level testing
   - Good for testing middleware chains

2. **Artillery**
   - Load testing and performance benchmarking
   - Real-world traffic simulation

3. **LocalStack**
   - Local AWS service emulation
   - Test with real AWS APIs locally

4. **Jest-extended**
   - Additional Jest matchers
   - Better assertion syntax

```bash
npm install --save-dev jest-extended
```

5. **Testcontainers**
   - Docker-based testing
   - Spin up real services for integration tests

## 📊 Test Categories & Coverage Goals

### Unit Tests (90%+ coverage)

- ✅ Business logic functions
- ✅ Utility functions
- ✅ Data validation
- ✅ Error handling

### Integration Tests (85%+ coverage)

- ✅ Complete API workflows
- ✅ Database operations
- ✅ Authentication flows
- ✅ Permission checks

### API Tests (95%+ coverage)

- ✅ All endpoints
- ✅ Request/response validation
- ✅ Error scenarios
- ✅ Authentication/authorization

### Performance Tests

- ✅ Response time benchmarks
- ✅ Throughput testing
- ✅ Memory usage monitoring
- ✅ Concurrent request handling

## 🚀 Running Tests

### Current Commands (Enhanced)

```bash
# Run all tests
npm test

# Run specific test categories
npm run test:unit
npm run test:integration
npm run test:api
npm run test:performance

# Run with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run load tests
npm run test:load

# Run security tests
npm run test:security
```

### Add to package.json:

```json
{
    "scripts": {
        "test:api": "jest test/api.test.ts",
        "test:performance": "jest test/performance.test.ts",
        "test:security": "jest test/security.test.ts",
        "test:load": "artillery run load-test.yml",
        "test:coverage": "jest --coverage --coverageReporters=text --coverageReporters=html"
    }
}
```

## 🔍 Test Data Management

### Test Data Factories

```typescript
// test/factories.ts
export const createTestCompany = (overrides = {}) => ({
    id: `company-${Date.now()}`,
    name: "Test Company",
    description: "A test company",
    createdAt: new Date().toISOString(),
    ...overrides,
});

export const createTestUser = (overrides = {}) => ({
    user_id: `user-${Date.now()}`,
    role: "DEVICE_VIEWER",
    company_id: "test-company-id",
    ...overrides,
});
```

### Test Database Setup

```typescript
// test/setup-db.ts
export const setupTestDatabase = async () => {
    // Create test tables
    // Seed test data
    // Return cleanup function
};

export const cleanupTestDatabase = async () => {
    // Clean up test data
    // Drop test tables
};
```

## 🎯 Best Practices

### 1. **Test Organization**

- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. **Mocking Strategy**

- Mock external dependencies (AWS services)
- Use factory functions for test data
- Reset mocks between tests

### 3. **Assertion Patterns**

```typescript
// Test success cases
expect(result).toBe(expectedValue);

// Test error cases
expect(() => functionCall()).toThrow(ErrorType);

// Test async operations
await expect(asyncFunction()).resolves.toBe(expectedValue);
```

### 4. **Performance Testing**

- Set realistic performance benchmarks
- Test under load conditions
- Monitor resource usage

### 5. **Security Testing**

- Test authentication thoroughly
- Validate input sanitization
- Test authorization boundaries

## 🔄 Continuous Integration

### GitHub Actions Example:

```yaml
name: API Tests
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v3
            - uses: actions/setup-node@v3
              with:
                  node-version: "20"
            - run: npm ci
            - run: npm run test:unit
            - run: npm run test:integration
            - run: npm run test:api
            - run: npm run test:coverage
            - run: npm run test:security
            - run: npm run lint
```

## 📈 Monitoring & Metrics

### Test Metrics to Track:

- Test execution time
- Coverage percentages
- Failed test patterns
- Performance regression detection

### Tools for Monitoring:

- Jest coverage reports
- Performance benchmarks
- Error rate tracking
- Response time monitoring

This comprehensive testing strategy will ensure your API is robust, secure, and
performant while maintaining high code quality and reliability.
