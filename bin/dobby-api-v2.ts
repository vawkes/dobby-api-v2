#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DobbyApiV2Stack } from '../lib/dobby-api-v2-stack';
import { ReactFrontendStack } from '../lib/react-frontend-stack';
import { CertificateStack } from '../lib/certificate-stack';
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
  environmentConfig: envConfig,
});

// Certificate and Frontend stacks (only if domain is configured)
let certificateStack: CertificateStack | undefined;
let reactFrontendStack: ReactFrontendStack;

if (envConfig.domain) {
  console.log(`Setting up custom domain: ${envConfig.domain.subdomain}.${envConfig.domain.name}`);

  // Deploy the certificate stack
  certificateStack = new CertificateStack(app, `CertificateStack`, {
    env,
    description: `SSL Certificate stack for ${envConfig.name}`,
    domainName: envConfig.domain.name,
    subdomainName: envConfig.domain.subdomain,
    environmentConfig: envConfig,
    dnsAccountId: envConfig.domain.dnsAccount || envConfig.account,
    dnsProfile: envConfig.domain.dnsProfile || envConfig.awsProfile,
  });

  // Deploy the React frontend stack with custom domain
  reactFrontendStack = new ReactFrontendStack(app, `ReactFrontendStack`, {
    domainName: envConfig.domain.name,
    subDomain: envConfig.domain.subdomain,
    certificate: certificateStack.certificate,
    env,
    description: `Static React frontend deployment stack for ${envConfig.name}`,
    environmentConfig: envConfig,
    dnsAccountId: envConfig.domain.dnsAccount,
    dnsProfile: envConfig.domain.dnsProfile,
  });

  // Add dependencies
  reactFrontendStack.addDependency(certificateStack);
  reactFrontendStack.addDependency(apiStack);
} else {
  console.log('No domain configuration found, deploying without custom domain');

  // Deploy the React frontend stack without custom domain
  reactFrontendStack = new ReactFrontendStack(app, `ReactFrontendStack`, {
    env,
    description: `Static React frontend deployment stack for ${envConfig.name}`,
    environmentConfig: envConfig,
  });

  // Add dependency to ensure API stack is deployed first
  reactFrontendStack.addDependency(apiStack);
}

// Add environment-specific tags to all stacks
const stacks = certificateStack ? [apiStack, certificateStack, reactFrontendStack] : [apiStack, reactFrontendStack];

for (const stack of stacks) {
  Object.entries(envConfig.tags).forEach(([key, value]) => {
    cdk.Tags.of(stack).add(key, value);
  });
}

app.synth();