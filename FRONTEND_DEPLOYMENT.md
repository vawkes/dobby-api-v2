# Frontend Deployment Guide

This guide explains the simplified frontend deployment process for the Dobby API v2 project.

## Overview

The frontend deployment is now fully integrated into the main CDK deployment process. When you deploy the entire stack, the frontend is automatically built and deployed as part of the process.

## Architecture

- **Integrated Build**: Frontend build process is part of the CDK deployment
- **Environment Configuration**: Managed in `deployment/config.ts`
- **Single Deployment**: One command deploys everything (API + Frontend)
- **Environment-Specific URLs**: Development connects to development API, production to production API

## Environment Configuration

### Development Environment
- **Frontend URL**: `https://gridcube.dev.vawkes.com`
- **API URL**: `https://api.gridcube.dev.vawkes.com`
- **AWS Profile**: `dobby_develop`
- **Account**: `322327555253`

### Production Environment
- **Frontend URL**: `https://gridcube.vawkes.com`
- **API URL**: `https://api.gridcube.vawkes.com`
- **AWS Profile**: `dobby_production`
- **Account**: `530256939393`

## Deployment Process

### Single Command Deployment

Deploy the entire stack (API + Frontend) using CDK:

```bash
# Deploy to development
npx cdk deploy --context environment=develop

# Deploy to production
npx cdk deploy --context environment=production
```

### What Happens During Deployment

1. **Frontend Build**: CDK automatically builds the frontend for the target environment
2. **Infrastructure Creation**: Creates S3 bucket, CloudFront distribution, and DNS configuration
3. **Frontend Deployment**: Uploads the built frontend to S3 and configures CloudFront
4. **API Deployment**: Deploys the backend API infrastructure

## Configuration Files

### Frontend Configuration (`frontend-react/src/utils/config.ts`)
- Environment-specific API URLs
- No runtime configuration loading
- Simple, predictable configuration

### CDK Configuration (`deployment/config.ts`)
- Environment-specific AWS accounts and profiles
- Domain and subdomain configurations
- DNS settings for cross-account Route53

## Key Improvements

1. **Single Command**: One `cdk deploy` command deploys everything
2. **Environment-Specific API URLs**: Development frontend connects to development API
3. **Integrated Build**: No separate build step required
4. **CDK-Only Deployment**: No standalone deployment scripts
5. **Automatic Environment Detection**: CDK determines the correct build command based on environment

## Troubleshooting

### Development Frontend Connecting to Production API
- **Problem**: Development environment using production API URLs
- **Solution**: Use `npx cdk deploy --context environment=develop` to deploy with development configuration

### Build Failures During Deployment
- **Problem**: Frontend build fails during CDK deployment
- **Solution**: Check that all frontend dependencies are properly installed and the build scripts work locally

### Environment Configuration Issues
- **Problem**: Wrong environment being used
- **Solution**: Check the `--context environment=` parameter in your CDK deploy command

## Migration from Old System

The old deployment system had multiple configuration sources:
- ❌ `frontend-react/deploy-to-aws.js` (removed)
- ❌ `frontend-react/src/utils/deployment-config.js` (removed)
- ❌ `frontend-react/public/env-config.json` (removed)
- ❌ `frontend-react/infra/` directory (removed)
- ❌ `scripts/deploy-frontend.sh` (removed)

All configuration is now centralized in:
- ✅ `deployment/config.ts` (CDK configuration)
- ✅ `frontend-react/src/utils/config.ts` (frontend configuration)

## Best Practices

1. **Use CDK for Everything**: Always use `npx cdk deploy` with proper context
2. **Check AWS Profiles**: Ensure correct AWS profile is configured for the target environment
3. **Verify DNS**: Check that custom domains are properly configured in Route53
4. **Monitor Build Process**: Watch the CDK output for any build failures
5. **Test Locally First**: Run `npm run build:develop` or `npm run build:production` locally to test builds

## Deployment Commands Summary

```bash
# Deploy entire stack to development
npx cdk deploy --context environment=develop

# Deploy entire stack to production  
npx cdk deploy --context environment=production

# Deploy specific stack only (if needed)
npx cdk deploy ReactFrontendStack --context environment=develop
``` 