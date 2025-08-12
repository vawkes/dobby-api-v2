# Testing Guide for Role Management System

This document provides comprehensive testing information for the role management
system implemented in the Dobby API v2.

## 🧪 Test Structure

### Test Files

- `test/permissions.test.ts` - Unit tests for the permissions system
- `test/companies.test.ts` - Unit tests for the companies API endpoints
- `test/integration.test.ts` - Integration tests for complete workflows
- `test/setup.ts` - Test setup and utilities

### Test Categories

#### 1. Unit Tests

- **Permissions System**: Tests for role hierarchy, permission checking, and
  middleware functions
- **Companies API**: Tests for all CRUD operations on companies, users, and
  devices
- **Error Handling**: Tests for various error scenarios and edge cases

#### 2. Integration Tests

- **Complete Workflows**: End-to-end testing of role management scenarios
- **Business Rules**: Validation of role assignment and removal rules
- **Data Consistency**: Ensuring referential integrity across operations

## 🚀 Running Tests

### Prerequisites

```bash
npm install
```

### Test Commands

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📋 Test Coverage

### Permissions System (`test/permissions.test.ts`)

#### Core Functions Tested:

- `getUserRoleInCompany()` - Get user's role in a specific company
- `getUserHighestRole()` - Get user's highest role across all companies
- `hasPermission()` - Check if user has permission for an action
- `hasDevicePermission()` - Check device-specific permissions
- `hasCompanyPermission()` - Check company-specific permissions
- `canAssignRole()` - Check if user can assign a specific role

#### Middleware Functions Tested:

- `requirePermission()` - General permission middleware
- `requireDevicePermission()` - Device-specific permission middleware
- `requireCompanyPermission()` - Company-specific permission middleware

#### Test Scenarios:

```typescript
// Role hierarchy validation
expect(roleHierarchy["COMPANY_ADMIN"]).toBeGreaterThan(
    roleHierarchy["DEVICE_MANAGER"],
);

// Permission checking
expect(hasPermission(user, Action.READ_DEVICES)).toBe(true);

// Role assignment validation
expect(canAssignRole(admin, "DEVICE_MANAGER")).toBe(true);
expect(canAssignRole(manager, "COMPANY_ADMIN")).toBe(false);
```

### Companies API (`test/companies.test.ts`)

#### Endpoints Tested:

- `POST /` - Create company
- `GET /` - Get all companies
- `GET /:companyId` - Get specific company
- `POST /:companyId/users` - Add user to company
- `PUT /:companyId/users/:userId` - Update user role
- `DELETE /:companyId/users/:userId` - Remove user from company
- `GET /:companyId/users` - Get company users
- `POST /:companyId/devices` - Add device to company
- `GET /:companyId/devices` - Get company devices
- `DELETE /:companyId/devices/:deviceId` - Remove device from company

#### Test Scenarios:

```typescript
// Company creation
expect(response.status).toBe(201);
expect(mockDynamoDB.putItem).toHaveBeenCalledWith({
    TableName: "Companies",
    Item: expect.objectContaining({
        id: { S: "test-uuid" },
        name: { S: "Test Company" },
    }),
});

// Role assignment validation
expect(canAssignRole(user, companyId, role)).toBe(true);
```

### Integration Tests (`test/integration.test.ts`)

#### Complete Workflows Tested:

1. **Company Lifecycle**: Create → Add Users → Add Devices → Manage Roles →
   Remove Users/Devices
2. **Role Management**: Role assignment → Role updates → Role removal
3. **Permission Validation**: Business rule enforcement
4. **Error Handling**: Database errors, validation errors
5. **Concurrent Operations**: Multiple simultaneous operations

#### Business Rules Validated:

```typescript
// Role assignment hierarchy
expect(validateRoleAssignment("COMPANY_ADMIN", "DEVICE_MANAGER")).toBe(true);
expect(validateRoleAssignment("DEVICE_MANAGER", "COMPANY_ADMIN")).toBe(false);

// User removal hierarchy
expect(validateUserRemoval("COMPANY_ADMIN", "DEVICE_MANAGER")).toBe(true);
expect(validateUserRemoval("DEVICE_MANAGER", "COMPANY_ADMIN")).toBe(false);
```

## 🎯 Test Utilities

### Mock Factories

```typescript
// Create mock DynamoDB instance
const mockDynamoDB = createMockDynamoDB();

// Create mock Hono context
const mockContext = createMockContext(user, params);

// Create test data
const testCompany = createTestCompany({ name: "Custom Company" });
const testUser = createTestUser({ role: "COMPANY_ADMIN" });
const testDevice = createTestDevice({ device_id: "custom-device" });
```

### Test Constants

```typescript
import { TEST_ACTIONS, TEST_CONSTANTS, TEST_ROLES } from "./setup";

// Use predefined test constants
const companyId = TEST_CONSTANTS.COMPANY_ID;
const adminRole = TEST_ROLES.COMPANY_ADMIN;
const readAction = TEST_ACTIONS.READ_DEVICES;
```

## 🔍 Test Scenarios

### 1. Role Hierarchy Testing

```typescript
describe("Role Hierarchy", () => {
    it("should enforce role hierarchy correctly", () => {
        // COMPANY_ADMIN (3) > DEVICE_MANAGER (2) > DEVICE_VIEWER (1)
        expect(roleLevels.COMPANY_ADMIN).toBeGreaterThan(
            roleLevels.DEVICE_MANAGER,
        );
        expect(roleLevels.DEVICE_MANAGER).toBeGreaterThan(
            roleLevels.DEVICE_VIEWER,
        );
    });
});
```

### 2. Permission Matrix Testing

```typescript
describe("Permission Matrix", () => {
    it("should grant correct permissions per role", () => {
        // COMPANY_ADMIN should have all permissions
        expect(permissions.COMPANY_ADMIN).toContain("delete_devices");

        // DEVICE_VIEWER should not have delete permissions
        expect(permissions.DEVICE_VIEWER).not.toContain("delete_devices");
    });
});
```

### 3. Error Handling Testing

```typescript
describe("Error Handling", () => {
    it("should handle database errors gracefully", async () => {
        mockDynamoDB.getItem.mockRejectedValue(new Error("Database error"));

        const result = await getUserRoleInCompany(dynamodb, userId, companyId);
        expect(result).toBeNull();
    });
});
```

## 📊 Coverage Goals

### Target Coverage Areas:

- **Permissions System**: 95%+ coverage
- **Companies API**: 90%+ coverage
- **Integration Workflows**: 85%+ coverage
- **Error Handling**: 100% coverage

### Coverage Report

```bash
npm run test:coverage
```

This will generate:

- Console coverage report
- HTML coverage report in `coverage/` directory
- JSON coverage data

## 🐛 Debugging Tests

### Common Issues:

1. **Mock Not Called**: Ensure mocks are properly set up before assertions
2. **Async/Await**: Make sure to await async operations in tests
3. **Context Mocking**: Verify Hono context is properly mocked

### Debug Commands:

```bash
# Run specific test file
npm test test/permissions.test.ts

# Run with verbose output
npm test -- --verbose

# Run single test
npm test -- --run test-name
```

## 🔄 Continuous Integration

### GitHub Actions Example:

```yaml
name: Tests
on: [push, pull_request]
jobs:
    test:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v2
            - uses: actions/setup-node@v2
              with:
                  node-version: "20"
            - run: npm ci
            - run: npm run test:coverage
            - run: npm run lint
```

## 📝 Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Mocking Strategy

- Mock external dependencies (DynamoDB, Hono)
- Use factory functions for test data
- Reset mocks between tests

### 3. Assertion Patterns

```typescript
// Test success cases
expect(result).toBe(expectedValue);

// Test error cases
expect(() => functionCall()).toThrow(ErrorType);

// Test async operations
await expect(asyncFunction()).resolves.toBe(expectedValue);
```

### 4. Test Data Management

- Use constants for test IDs
- Create reusable test data factories
- Avoid hardcoded values in tests

## 🚀 Performance Testing

### Load Testing Scenarios:

```typescript
describe("Performance", () => {
    it("should handle concurrent role assignments", async () => {
        const operations = Array(100).fill(null).map(() => assignRole());
        const results = await Promise.all(operations);
        expect(results.every((r) => r.success)).toBe(true);
    });
});
```

This testing framework ensures the role management system is robust, secure, and
performs well under various conditions.
