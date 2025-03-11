#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { StaticSiteStack } from './frontend-stack';

const app = new cdk.App();

// Get environment variables or use defaults
const domainName = process.env.DOMAIN_NAME;
const subDomain = process.env.SUB_DOMAIN || 'app';
const certificateArn = process.env.CERTIFICATE_ARN;

// Create the stack with environment-specific configuration
new StaticSiteStack(app, 'ReactFrontendStack', {
    // Environment settings
    env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: process.env.CDK_DEFAULT_REGION || 'us-east-1'
    },
    // Domain settings
    domainName,
    subDomain,
    certificateArn,
    // Stack description
    description: 'Static React website with S3 and CloudFront',
    // Tags
    tags: {
        Environment: process.env.ENVIRONMENT || 'development',
        Project: 'dobby-api',
        Framework: 'React'
    }
});

app.synth(); 