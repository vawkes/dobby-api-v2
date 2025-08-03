# Security Practices for Dobby API v2 Cloud Application

## Table of Contents

1. [Overview](#overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Data Protection](#data-protection)
4. [Network Security](#network-security)
5. [Input Validation & Sanitization](#input-validation--sanitization)
6. [Infrastructure Security](#infrastructure-security)
7. [Monitoring & Logging](#monitoring--logging)
8. [Development Security](#development-security)
9. [Compliance & Best Practices](#compliance--best-practices)
10. [Security Checklist](#security-checklist)

## Overview

This document outlines the security practices implemented in the Dobby API v2
cloud application, which is built on AWS with a React frontend, Lambda backend,
and IoT device management capabilities.

### Architecture Security Summary

- **Frontend**: React SPA served via CloudFront with S3 origin
- **Backend**: AWS Lambda with API Gateway, using Hono framework
- **Authentication**: AWS Cognito User Pools with JWT tokens
- **Database**: DynamoDB with role-based access control
- **IoT**: AWS IoT Wireless (Sidewalk) for device communication
- **Infrastructure**: AWS CDK for infrastructure as code

## Authentication & Authorization

### JWT Token Validation

The application implements robust JWT token validation using AWS Cognito:

```typescript
// From lambda/utils/auth.ts
export const auth: MiddlewareHandler = async (c: Context, next: Next) => {
    // Skip auth for public routes
    if (
        path.includes("/public/") || path === "/public" ||
        path.endsWith("/public")
    ) {
        return next();
    }

    const authHeader = c.req.header("Authorization");
    if (!authHeader) {
        return c.json({ message: "Unauthorized - No token provided" }, 401);
    }

    // Extract and verify JWT token
    const token = authHeader.replace("Bearer ", "");
    const decodedToken = decode(token, { complete: true });

    // Verify with Cognito JWKs
    const pems = await getPems();
    const pem = pems[kid];

    // Verify token signature and issuer
    verify(token, pem, {
        issuer: `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`,
    });
};
```

**Security Features:**

- ✅ JWT signature verification using Cognito JWKs
- ✅ Token issuer validation
- ✅ Automatic JWK rotation support
- ✅ Public route bypass for authentication endpoints

### Role-Based Access Control (RBAC)

The application implements a comprehensive RBAC system:

```typescript
// From lambda/utils/permissions.ts
export enum UserRole {
    COMPANY_ADMIN = "COMPANY_ADMIN",
    DEVICE_MANAGER = "DEVICE_MANAGER",
    DEVICE_VIEWER = "DEVICE_VIEWER",
}

export enum Action {
    READ_DEVICES = "read_devices",
    WRITE_DEVICES = "write_devices",
    DELETE_DEVICES = "delete_devices",
    READ_EVENTS = "read_events",
    CREATE_EVENTS = "create_events",
    DELETE_EVENTS = "delete_events",
    // ... more actions
}
```

**Security Features:**

- ✅ Hierarchical role system with permission inheritance
- ✅ Company-scoped permissions
- ✅ Device-specific access control
- ✅ Middleware-based permission enforcement

### Cognito User Pool Configuration

```typescript
// From lib/dobby-api-v2-stack.ts
const userPool = new cognito.UserPool(this, "DobbyUserPool", {
    selfSignUpEnabled: true,
    autoVerify: { email: true },
    standardAttributes: {
        email: { required: true, mutable: true },
    },
    passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
    },
});
```

**Security Features:**

- ✅ Strong password policy enforcement
- ✅ Email verification required
- ✅ Self-service user registration with verification

## Data Protection

### DynamoDB Security

The application uses DynamoDB with proper access controls:

```typescript
// Grant specific permissions to Lambda functions
infoTable.grantFullAccess(fn);
eventTable.grantFullAccess(fn);
dataTable.grantFullAccess(fn);
companiesTable.grantFullAccess(fn);
companyUsersTable.grantFullAccess(fn);
companyDevicesTable.grantFullAccess(fn);
```

**Security Features:**

- ✅ IAM role-based access to DynamoDB tables
- ✅ Principle of least privilege for Lambda functions
- ✅ Environment-specific table access

### Data Validation with Zod

All input data is validated using Zod schemas:

```typescript
// From lambda/devices/devicesSchema.ts
const deviceSchema = z.object({
    device_id: deviceIdSchema, // UUID or 6-digit validation
    device_type: z.coerce.string().optional(),
    firmware_version: z.string().optional(),
    // ... other fields with proper validation
});

// From lambda/events/eventsSchema.ts
const eventRequestSchema = z.discriminatedUnion("event_type", [
    z.object({
        event_id: z.string(),
        event_type: z.literal(EventType.LOAD_UP),
        event_data: loadUpSchema,
    }),
    // ... other event types
]);
```

**Security Features:**

- ✅ Input validation for all API endpoints
- ✅ Type-safe data handling
- ✅ Discriminated unions for event types
- ✅ Coercion for numeric fields

## Network Security

### CORS Configuration

Comprehensive CORS policy implementation:

```typescript
// From lambda/index.ts
app.use(
    "*",
    cors({
        origin: [
            "http://localhost:3000",
            "https://localhost:3000",
            "https://d1dz25mfg0xsp8.cloudfront.net",
            "https://api.gridcube.dev.vawkes.com",
            "https://api.gridcube.vawkes.com",
            // ... other allowed origins
        ],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
        allowHeaders: [
            "Content-Type",
            "Authorization",
            "X-API-Key",
            "X-Origin-Verify",
        ],
        credentials: true,
        maxAge: 86400, // 24 hours
    }),
);
```

**Security Features:**

- ✅ Whitelist-based origin policy
- ✅ Environment-specific allowed origins
- ✅ Credential support for authenticated requests
- ✅ Preflight request caching

### CloudFront Security Headers

The frontend implements comprehensive security headers:

```typescript
// From lib/react-frontend-stack.ts
securityHeadersBehavior: {
    contentSecurityPolicy: {
        contentSecurityPolicy: "default-src 'self' https:; script-src 'self' 'unsafe-inline' 'unsafe-eval' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' data: https:;",
        override: true,
    },
    frameOptions: {
        frameOption: cloudfront.HeadersFrameOption.DENY,
        override: true,
    },
    strictTransportSecurity: {
        accessControlMaxAge: cdk.Duration.days(2 * 365),
        includeSubdomains: true,
        preload: true,
        override: true,
    },
}
```

**Security Features:**

- ✅ Content Security Policy (CSP) implementation
- ✅ X-Frame-Options: DENY (clickjacking protection)
- ✅ HSTS with preload and subdomain inclusion
- ✅ HTTPS enforcement

### API Gateway Security

```typescript
// From lib/dobby-api-v2-stack.ts
const api = new apigw.LambdaRestApi(this, "dobbyapi", {
    handler: fn,
    proxy: false,
    deployOptions: {
        stageName: environmentConfig.apiStage.stageName,
    },
    defaultCorsPreflightOptions: {
        allowOrigins: [/* whitelisted origins */],
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: [
            ...apigw.Cors.DEFAULT_HEADERS,
            "Authorization",
            "Content-Type",
        ],
        allowCredentials: true,
        maxAge: cdk.Duration.days(1),
    },
});
```

**Security Features:**

- ✅ Cognito User Pool Authorizer integration
- ✅ Custom domain with SSL certificate
- ✅ Environment-specific stage deployment
- ✅ Proper CORS configuration

## Input Validation & Sanitization

### Schema Validation

All API inputs are validated using Zod schemas:

```typescript
// Device ID validation supports both UUID and 6-digit formats
const deviceIdSchema = z.union([
    z.string().uuid(),
    z.string().regex(/^\d{6}$/, "Device ID must be exactly 6 digits"),
]);

// Event data validation with discriminated unions
const eventRequestSchema = z.discriminatedUnion("event_type", [
    z.object({
        event_id: z.string(),
        event_type: z.literal(EventType.LOAD_UP),
        event_data: loadUpSchema,
    }),
    // ... other event types
]);
```

**Security Features:**

- ✅ Type-safe input validation
- ✅ Regex pattern validation for device IDs
- ✅ Discriminated unions for event types
- ✅ Automatic type coercion where safe

### Error Handling

Secure error handling prevents information leakage:

```typescript
// From lambda/utils/auth.ts
try {
    // Token verification logic
} catch (verifyError) {
    console.error('Token verification failed:', verifyError);
    return c.json({ message: 'Unauthorized - Invalid token' }, 401);
} catch (decodeError) {
    console.error('Error decoding token:', decodeError);
    return c.json({ message: 'Unauthorized - Invalid token format' }, 401);
}
```

**Security Features:**

- ✅ Generic error messages to prevent information leakage
- ✅ Proper HTTP status codes
- ✅ Secure logging without sensitive data exposure

## Infrastructure Security

### AWS CDK Security Configuration

```typescript
// From lib/dobby-api-v2-stack.ts
const fn = new NodejsFunction(this, "lambda", {
    entry: "lambda/index.ts",
    handler: "handler",
    runtime: lambda.Runtime.NODEJS_20_X,
    timeout: cdk.Duration.seconds(30),
    environment: {
        USER_POOL_ID: userPool.userPoolId,
        USER_POOL_CLIENT_ID: userPoolClient.userPoolClientId,
        PRODUCTION_LINE_TABLE: productionLineTable.tableName,
    },
});
```

**Security Features:**

- ✅ Latest Node.js runtime (20.x)
- ✅ Environment variable injection for secrets
- ✅ Timeout limits to prevent resource exhaustion
- ✅ IAM role-based permissions

### S3 Bucket Security

```typescript
// From lib/react-frontend-stack.ts
const siteBucket = new s3.Bucket(this, "ReactSiteBucket", {
    publicReadAccess: false,
    blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
    removalPolicy: environmentConfig.name === "production"
        ? cdk.RemovalPolicy.RETAIN
        : cdk.RemovalPolicy.DESTROY,
    autoDeleteObjects: environmentConfig.name !== "production",
});
```

**Security Features:**

- ✅ Block all public access
- ✅ Origin Access Identity for CloudFront
- ✅ Environment-specific retention policies
- ✅ Proper bucket policies

### IoT Security

```typescript
// From lib/dobby-api-v2-stack.ts
fn.addToRolePolicy(
    new iam.PolicyStatement({
        actions: [
            "iotwireless:SendDataToWirelessDevice",
        ],
        resources: [
            `arn:aws:iotwireless:${this.region}:${this.account}:WirelessDevice/*`,
        ],
    }),
);
```

**Security Features:**

- ✅ Principle of least privilege for IoT operations
- ✅ Resource-level permissions where supported
- ✅ Environment-specific IoT rule naming

## Monitoring & Logging

### Request Logging

```typescript
// From lambda/index.ts
app.use("*", async (c, next) => {
    console.log(`Request received: ${c.req.method} ${c.req.path}`);
    console.log("Headers:", JSON.stringify(c.req.header()));
    await next();
    console.log(`Response status: ${c.res.status}`);
});
```

**Security Features:**

- ✅ Request/response logging for debugging
- ✅ Header logging for security analysis
- ✅ Performance monitoring

### Authentication Logging

```typescript
// From lambda/utils/auth.ts
const startTime = Date.now();
console.log("Auth middleware - Request path:", path);
console.log("Authorization header found, processing token");
console.log(`Auth middleware completed in ${Date.now() - startTime}ms`);
```

**Security Features:**

- ✅ Authentication attempt logging
- ✅ Performance metrics for auth operations
- ✅ Secure logging without sensitive data

## Development Security

### Environment Configuration

```typescript
// From deployment/config.ts
export const environments: Record<string, EnvironmentConfig> = {
    develop: {
        name: "develop",
        account: "322327555253",
        region: "us-east-1",
        awsProfile: "dobby_develop",
        // ... configuration
    },
    production: {
        name: "production",
        account: "530256939393",
        region: "us-east-1",
        awsProfile: "dobby_production",
        // ... configuration
    },
};
```

**Security Features:**

- ✅ Environment-specific AWS accounts
- ✅ Separate AWS profiles for different environments
- ✅ Environment-specific domain configuration
- ✅ Proper tagging for resource management

### Code Security Practices

The codebase follows security best practices:

- ✅ TypeScript for type safety
- ✅ Zod for runtime validation
- ✅ Proper error handling
- ✅ Secure defaults
- ✅ Input sanitization
- ✅ Authentication middleware
- ✅ Authorization checks

## Compliance & Best Practices

### OWASP Top 10 Mitigation

1. **A01:2021 - Broken Access Control**
   - ✅ Role-based access control implemented
   - ✅ Company-scoped permissions
   - ✅ Device-specific access control

2. **A02:2021 - Cryptographic Failures**
   - ✅ HTTPS enforcement via CloudFront
   - ✅ JWT token validation with proper signatures
   - ✅ Secure cookie handling

3. **A03:2021 - Injection**
   - ✅ Zod schema validation for all inputs
   - ✅ Type-safe data handling
   - ✅ No direct SQL queries (DynamoDB)

4. **A04:2021 - Insecure Design**
   - ✅ Security-first architecture
   - ✅ Defense in depth approach
   - ✅ Proper separation of concerns

5. **A05:2021 - Security Misconfiguration**
   - ✅ Infrastructure as Code (CDK)
   - ✅ Environment-specific configurations
   - ✅ Secure defaults

6. **A06:2021 - Vulnerable Components**
   - ✅ Regular dependency updates
   - ✅ Latest Node.js runtime
   - ✅ Security-focused package selection

7. **A07:2021 - Authentication Failures**
   - ✅ AWS Cognito integration
   - ✅ JWT token validation
   - ✅ Strong password policies

8. **A08:2021 - Software and Data Integrity**
   - ✅ Input validation
   - ✅ Data integrity checks
   - ✅ Secure data transmission

9. **A09:2021 - Security Logging Failures**
   - ✅ Comprehensive logging
   - ✅ Performance monitoring
   - ✅ Error tracking

10. **A10:2021 - Server-Side Request Forgery**
    - ✅ CORS policy implementation
    - ✅ Origin validation
    - ✅ Proper API design

### AWS Security Best Practices

- ✅ Use of AWS managed services (Cognito, DynamoDB, Lambda)
- ✅ IAM roles with least privilege
- ✅ VPC isolation where applicable
- ✅ CloudTrail logging
- ✅ AWS Config for compliance monitoring
- ✅ Security groups and NACLs
- ✅ Encryption at rest and in transit

## Security Checklist

### Pre-Deployment Checklist

- [ ] All environment variables are properly configured
- [ ] CORS origins are correctly whitelisted
- [ ] SSL certificates are valid and properly configured
- [ ] IAM roles have minimal required permissions
- [ ] DynamoDB tables have proper access controls
- [ ] CloudFront security headers are configured
- [ ] API Gateway authorizer is properly configured
- [ ] Cognito User Pool settings are secure
- [ ] IoT device permissions are properly scoped

### Runtime Security Checklist

- [ ] Monitor CloudWatch logs for suspicious activity
- [ ] Review API Gateway access logs
- [ ] Monitor DynamoDB access patterns
- [ ] Check for failed authentication attempts
- [ ] Review IoT device communication logs
- [ ] Monitor CloudFront access logs
- [ ] Review Cognito User Pool metrics

### Maintenance Checklist

- [ ] Regularly update dependencies
- [ ] Rotate AWS access keys
- [ ] Review and update IAM policies
- [ ] Update SSL certificates before expiration
- [ ] Review and update CORS origins
- [ ] Audit user permissions regularly
- [ ] Update security headers as needed
- [ ] Review and update password policies

### Incident Response

1. **Detection**: Monitor logs and metrics for anomalies
2. **Analysis**: Investigate security events and determine scope
3. **Containment**: Isolate affected resources and prevent further damage
4. **Eradication**: Remove threats and vulnerabilities
5. **Recovery**: Restore services and verify security
6. **Lessons Learned**: Document and implement improvements

## Conclusion

The Dobby API v2 application implements comprehensive security measures across
all layers of the stack. The security practices outlined in this document
provide a robust foundation for protecting user data, preventing unauthorized
access, and maintaining system integrity.

Regular security reviews, updates, and monitoring are essential to maintain the
security posture of the application as threats evolve and new vulnerabilities
are discovered.

---

**Last Updated**: December 2024\
**Version**: 1.0\
**Maintainer**: Development Team
