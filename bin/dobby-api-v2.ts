#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DobbyApiV2Stack } from '../lib/dobby-api-v2-stack';
import { ReactFrontendStack } from '../lib/react-frontend-stack';

const app = new cdk.App();

// Environment values
const env = {
  account: '530256939393',  // Production AWS account ID
  region: 'us-east-1'       // Explicitly set the region
};

// Deploy the API stack
const apiStack = new DobbyApiV2Stack(app, 'DobbyApiV2Stack', {
  /* If you don't specify 'env', this stack will be environment-agnostic.
   * Account/Region-dependent features and context lookups will not work,
   * but a single synthesized template can be deployed anywhere. */

  /* Uncomment the next line to specialize this stack for the AWS Account
   * and Region that are implied by the current CLI configuration. */
  env,

  /* Uncomment the next line if you know exactly what Account and Region you
   * want to deploy the stack to. */
  // env: { account: '123456789012', region: 'us-east-1' },

  /* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
  description: 'Dobby API V2 Stack for Production',
  tags: {
    Environment: 'production',
    Project: 'dobby-api-v2'
  }
});

// Deploy the new React frontend stack
const reactFrontendStack = new ReactFrontendStack(app, 'ReactFrontendStack', {
  // Domain configuration
  domainName: process.env.DOMAIN_NAME,
  subDomain: process.env.SUB_DOMAIN || 'app',
  certificateArn: process.env.CERTIFICATE_ARN,

  // API URL - use the output from the API stack if available
  // This can be accessed later in the frontend code
  // apiUrl: apiStack.apiEndpoint, // Uncomment if apiEndpoint is exported from the API stack

  env,
  description: 'Static React frontend deployment stack with S3 and CloudFront',
});

// Add tags to all stacks
for (const stack of [apiStack, reactFrontendStack]) {
  cdk.Tags.of(stack).add('Project', 'dobby-api-v2');
  cdk.Tags.of(stack).add('Environment', process.env.ENVIRONMENT || 'development');
}

app.synth();