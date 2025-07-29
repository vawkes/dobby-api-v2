export interface EnvironmentConfig {
    name: string;
    account: string;
    region: string;
    awsProfile: string;
    domain?: {
        name: string;
        subdomain: string;
        certificateArn: string;
        // Add support for cross-account Route53
        dnsAccount?: string;
        dnsProfile?: string;
    };
    api: {
        stageName: string;
    };
    tags: Record<string, string>;
}

export const environments: Record<string, EnvironmentConfig> = {
    develop: {
        name: 'develop',
        account: '322327555253', // Update with your develop account
        region: 'us-east-1',
        awsProfile: 'dobby_develop',
        domain: {
            name: 'vawkes.com',
            subdomain: 'gridcube.dev',
            certificateArn: process.env.CERTIFICATE_ARN_DEV || '',
            // DNS is in main account with default profile
            dnsAccount: '383688137294',
            dnsProfile: 'default'
        },
        api: {
            stageName: 'dev',
        },
        tags: {
            Environment: 'develop',
            Project: 'dobby-api-v2',
            Owner: 'development-team',
        },
    },
    production: {
        name: 'production',
        account: '530256939393',
        region: 'us-east-1',
        awsProfile: 'dobby_production',
        domain: {
            name: 'vawkes.com',
            subdomain: 'gridcube',
            certificateArn: process.env.CERTIFICATE_ARN_PROD || '',
            // DNS is in main account with default profile
            dnsAccount: '383688137294',
            dnsProfile: 'default'
        },
        api: {
            stageName: 'prod',
        },
        tags: {
            Environment: 'production',
            Project: 'dobby-api-v2',
            Owner: 'production-team',
        },
    },
};

export function getEnvironmentConfig(envName: string): EnvironmentConfig {
    const config = environments[envName];
    if (!config) {
        throw new Error(`Environment '${envName}' not found. Available environments: ${Object.keys(environments).join(', ')}`);
    }
    return config;
} 