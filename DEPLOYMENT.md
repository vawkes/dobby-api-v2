# Dobby API v2 - Deployment Guide

This guide explains how to deploy the Dobby API v2 application using the refactored deployment system that supports both develop and production environments.

## Prerequisites

1. **AWS CLI** configured with your AWS profiles:
   - `dobby_develop` - for development environment
   - `dobby_production` - for production environment

2. **Node.js** 16+ and npm installed

3. **AWS CDK** installed globally (optional but recommended):
   ```bash
   npm install -g aws-cdk
   ```

## Environment Configuration

The deployment system uses environment-specific configurations defined in `deployment/config.ts`:

- **Develop Environment**: Uses `dobby_develop` AWS profile
- **Production Environment**: Uses `dobby_production` AWS profile

### Updating Environment Settings

Edit `deployment/config.ts` to customize:
- AWS account IDs
- Domain configurations
- Resource naming conventions
- Environment-specific tags

## Quick Start

### Deploy Development Environment
```bash
npm run deploy:develop
```

### Deploy Production Environment
```bash
npm run deploy:production
```

## Detailed Deployment Commands

### Full Deployment (Backend + Frontend)
```bash
# Deploy to develop (default)
npm run deploy

# Deploy to specific environment
npm run deploy -- --env production
npm run deploy -- --env develop
```

### Backend Only Deployment
```bash
# Deploy only backend infrastructure
npm run deploy:backend

# Deploy backend to specific environment
npm run deploy -- --env production --skip-frontend
```

### Frontend Only Deployment
```bash
# Deploy only frontend
npm run deploy:frontend

# Deploy frontend to specific environment
npm run deploy -- --env develop --skip-backend
```

### Using Custom AWS Profile
```bash
# Override the default AWS profile
npm run deploy -- --env production --profile my-custom-profile
```

## Environment Differences

### Resource Naming
- **Production**: Resources use standard names (e.g., `DobbyInfo`, `dobby-frontend`)
- **Develop**: Resources get `-develop` suffix (e.g., `DobbyInfo-develop`, `dobby-frontend-develop`)

### Retention Policies
- **Production**: Resources are retained when stacks are destroyed
- **Develop**: Resources are destroyed with stacks for easier cleanup

### Stack Names
- **Production**: `DobbyApiV2Stack-production`, `ReactFrontendStack-production`
- **Develop**: `DobbyApiV2Stack`, `ReactFrontendStack`

## What Gets Deployed

### Backend (CDK Stacks)
- **API Gateway** with Lambda integration
- **DynamoDB tables** for data storage
- **Cognito User Pool** for authentication
- **Lambda functions** for API logic and data handling
- **IoT Wireless** resources for device management

### Frontend (React App)
- **S3 bucket** for static website hosting
- **CloudFront distribution** for global content delivery
- **Route53 DNS** (if domain is configured)
- **ACM certificate** (if custom domain is used)

## Monitoring Deployments

### View Stack Status
```bash
# List all stacks
npx cdk list --profile dobby_develop

# View specific stack status
aws cloudformation describe-stacks --stack-name DobbyApiV2Stack --profile dobby_develop
```

### View Outputs
```bash
# Get stack outputs (API endpoints, bucket names, etc.)
aws cloudformation describe-stacks --stack-name DobbyApiV2Stack --query 'Stacks[0].Outputs' --profile dobby_develop
```

## Cleanup / Destruction

### Destroy Development Environment
```bash
npm run destroy:develop
```

### Destroy Production Environment
```bash
npm run destroy:production
```

### Manual Cleanup
```bash
# Destroy specific environment
npx cdk destroy --all --profile dobby_develop -c environment=develop
```

## Troubleshooting

### Common Issues

1. **AWS Profile Not Found**
   ```
   Error: Profile dobby_develop not found
   ```
   Solution: Configure your AWS profile using `aws configure --profile dobby_develop`

2. **CDK Bootstrap Required**
   ```
   Error: This stack uses assets, so the toolkit stack must be deployed
   ```
   Solution: Bootstrap CDK for your account/region:
   ```bash
   npx cdk bootstrap --profile dobby_develop
   ```

3. **Permission Denied**
   ```
   Error: User is not authorized to perform operation
   ```
   Solution: Ensure your AWS profile has sufficient permissions for CDK deployment

4. **Stack Already Exists**
   ```
   Error: Stack already exists
   ```
   Solution: Use `--force` flag or destroy the existing stack first

### Getting Help

```bash
# View deployment options
npm run deploy -- --help

# View CDK help
npx cdk --help
```

## Advanced Configuration

### Environment Variables

You can override configurations using environment variables:

```bash
# Custom domain for production
DOMAIN_NAME=yourdomain.com SUB_DOMAIN=app CERTIFICATE_ARN=arn:aws:acm:... npm run deploy:production

# Custom AWS account for develop
DEVELOP_AWS_ACCOUNT=123456789012 npm run deploy:develop
```

### Custom Deployment Scripts

For more complex deployment scenarios, you can extend the deployment system:

1. Modify `deployment/config.ts` to add new environments
2. Update `deployment/deploy.ts` to add custom deployment logic
3. Add new npm scripts in `package.json`

## Best Practices

1. **Always deploy to develop first** before production
2. **Test thoroughly** in the develop environment
3. **Use version tags** for production deployments
4. **Monitor CloudWatch logs** after deployment
5. **Keep environment configurations** separate and secure
6. **Backup important data** before major deployments

## Support

If you encounter issues with the deployment system:

1. Check the AWS CloudFormation console for detailed error messages
2. Review CloudWatch logs for Lambda function errors
3. Verify your AWS profile permissions
4. Ensure all prerequisites are installed and configured correctly 