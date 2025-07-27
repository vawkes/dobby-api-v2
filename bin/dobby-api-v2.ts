#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DobbyApiV2Stack } from '../lib/dobby-api-v2-stack';
import { ReactFrontendStack } from '../lib/react-frontend-stack';
import { getEnvironmentConfig } from '../deployment/config';

const app = new cdk.App();

// Get environment from context or default to develop
const environmentName = app.node.tryGetContext('environment') || 'develop';
const envConfig = getEnvironmentConfig(environmentName);

console.log(`Deploying to environment: ${environmentName}`);
console.log(`Using AWS profile: ${envConfig.awsProfile}`);

// Environment values for CDK
const env = {
  account: envConfig.account,
  region: envConfig.region,
};

// Deploy the API stack
const apiStack = new DobbyApiV2Stack(app, `DobbyApiV2Stack`, {
  env,
  description: `Dobby API V2 Stack for ${envConfig.name}`,
  // tags: envConfig.tags,  // Temporarily remove stack-level tags
  environmentConfig: envConfig,
});

// Deploy the React frontend stack with environment-specific naming
const reactFrontendStack = new ReactFrontendStack(app, `ReactFrontendStack`, {
  domainName: envConfig.domain?.name,
  subDomain: envConfig.domain?.subdomain,
  certificateArn: envConfig.domain?.certificateArn,
  // Note: API URL will be configured at runtime in the frontend deployment
  env,
  description: `Static React frontend deployment stack for ${envConfig.name}`,
  environmentConfig: envConfig,
});

// Add dependency to ensure API stack is deployed first
reactFrontendStack.addDependency(apiStack);

// Add environment-specific tags to all stacks
// TEMPORARILY COMMENTED OUT FOR IMPORT OPERATION
// for (const stack of [apiStack, reactFrontendStack]) {
//   Object.entries(envConfig.tags).forEach(([key, value]) => {
//     cdk.Tags.of(stack).add(key, value);
//   });
// }

app.synth();