#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { DobbyApiV2Stack } from '../lib/dobby-api-v2-stack';
import { ReactFrontendStack } from '../lib/react-frontend-stack';
import { CertificateStack } from '../lib/certificate-stack';
import { getEnvironmentConfig } from '../deployment/config';

const app = new cdk.App();

// Get environment from context or default to develop
const environment = app.node.tryGetContext('environment') || 'develop';
const environmentConfig = getEnvironmentConfig(environment);

console.log(`Deploying to environment: ${environment}`);
console.log(`Using AWS profile: ${environmentConfig.awsProfile}`);

// Create certificate stack first
const certificateStack = new CertificateStack(app, 'CertificateStack', {
  env: {
    account: environmentConfig.account,
    region: environmentConfig.region,
  },
  environmentConfig,
});

// Create API stack
const apiStack = new DobbyApiV2Stack(app, 'DobbyApiV2Stack', {
  env: {
    account: environmentConfig.account,
    region: environmentConfig.region,
  },
  environmentConfig,
  certificateArn: certificateStack.backendCertificateArn,
});

// Create frontend stack
const frontendStack = new ReactFrontendStack(app, 'ReactFrontendStack', {
  env: {
    account: environmentConfig.account,
    region: environmentConfig.region,
  },
  environmentConfig,
  domainName: environmentConfig.frontend?.domain,
  subDomain: environmentConfig.frontend?.subdomain,
  certificate: certificateStack.frontendCertificate,
  dnsAccountId: environmentConfig.dns?.account,
  dnsProfile: environmentConfig.dns?.profile || 'default',
});

// const dnsStack = new DnsStack(app, 'DnsStack', {
//   env: {
//     account: environmentConfig.dns?.account
//   },
//   environmentConfig,
//   frontendDistributionDomainName: frontendStack.url,
//   apiGatewayDomainName: apiStack.apiEndpoint,
// });

// Add dependencies
apiStack.addDependency(certificateStack);
frontendStack.addDependency(certificateStack);

// Add environment-specific tags to all stacks
const stacks = [certificateStack, apiStack, frontendStack];

for (const stack of stacks) {
  Object.entries(environmentConfig.tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
}

app.synth();