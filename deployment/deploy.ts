#!/usr/bin/env node

import { execSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { getEnvironmentConfig } from './config';

interface DeploymentOptions {
    environment: string;
    skipFrontend?: boolean;
    skipBackend?: boolean;
    profile?: string;
}

class Deployer {
    private options: DeploymentOptions;
    private envConfig: any;

    constructor(options: DeploymentOptions) {
        this.options = options;
        this.envConfig = getEnvironmentConfig(options.environment);

        // Override profile if provided
        if (options.profile) {
            this.envConfig.awsProfile = options.profile;
        }
    }

    private runCommand(command: string, cwd?: string): string {
        console.log(`Running: ${command}`);
        const options = cwd ? { cwd, stdio: 'inherit' as const } : { stdio: 'inherit' as const };

        try {
            const result = execSync(command, options);
            return result ? result.toString() : '';
        } catch (error) {
            console.error(`Command failed: ${command}`);
            throw error;
        }
    }

    private async deployBackend(): Promise<void> {
        console.log(`🚀 Deploying backend to ${this.options.environment}...`);

        // Set AWS profile for CDK
        process.env.AWS_PROFILE = this.envConfig.awsProfile;

        // Note: Skipping TypeScript build as CDK handles Lambda bundling internally
        console.log('📦 CDK will handle TypeScript compilation for Lambda functions...');

        // Deploy CDK stacks
        const cdkCommand = `npx cdk deploy --all --require-approval never --profile ${this.envConfig.awsProfile} -c environment=${this.options.environment}`;
        this.runCommand(cdkCommand);

        console.log('✅ Backend deployment completed');
    }

    private async deployFrontend(): Promise<void> {
        console.log(`🚀 Deploying frontend to ${this.options.environment}...`);

        const frontendDir = path.join(process.cwd(), 'frontend-react');

        // Install frontend dependencies
        this.runCommand('npm install', frontendDir);

        // Build the React app
        this.runCommand('npm run build', frontendDir);

        // Deploy frontend with environment-specific settings
        const deployCommand = `AWS_PROFILE=${this.envConfig.awsProfile} ENVIRONMENT=${this.options.environment} npm run deploy`;
        this.runCommand(deployCommand, frontendDir);

        console.log('✅ Frontend deployment completed');
    }

    async deploy(): Promise<void> {
        console.log(`🎯 Starting deployment to ${this.options.environment} environment`);
        console.log(`📁 AWS Profile: ${this.envConfig.awsProfile}`);
        console.log(`🌍 Region: ${this.envConfig.region}`);

        try {
            if (!this.options.skipBackend) {
                await this.deployBackend();
            }

            if (!this.options.skipFrontend) {
                await this.deployFrontend();
            }

            console.log(`🎉 Deployment to ${this.options.environment} completed successfully!`);
        } catch (error) {
            console.error(`❌ Deployment failed:`, error);
            process.exit(1);
        }
    }
}

// CLI interface
function parseArgs(): DeploymentOptions {
    const args = process.argv.slice(2);
    const options: DeploymentOptions = {
        environment: 'develop', // default to develop
    };

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];

        switch (arg) {
            case '--env':
            case '-e':
                options.environment = args[++i];
                break;
            case '--skip-frontend':
                options.skipFrontend = true;
                break;
            case '--skip-backend':
                options.skipBackend = true;
                break;
            case '--profile':
            case '-p':
                options.profile = args[++i];
                break;
            case '--help':
            case '-h':
                console.log(`
Usage: npm run deploy [options]

Options:
  -e, --env <environment>     Environment to deploy to (develop|production) [default: develop]
  -p, --profile <profile>     AWS profile to use (overrides config)
  --skip-frontend            Skip frontend deployment
  --skip-backend             Skip backend deployment
  -h, --help                 Show this help message

Examples:
  npm run deploy                          # Deploy develop environment
  npm run deploy -- --env production      # Deploy production environment
  npm run deploy -- --env develop --skip-frontend  # Deploy only backend to develop
        `);
                process.exit(0);
                break;
            default:
                if (arg.startsWith('-')) {
                    console.error(`Unknown option: ${arg}`);
                    process.exit(1);
                }
        }
    }

    return options;
}

// Main execution
if (require.main === module) {
    const options = parseArgs();
    const deployer = new Deployer(options);
    deployer.deploy();
} 