export interface EnvironmentConfig {
    name: string;
    account: string;
    region: string;
    awsProfile: string;
    frontend?: {
        domain: string;
        subdomain: string;
    };
    api?: {
        domain: string;
        subdomain: string;
    };
    // DNS configuration for cross-account Route53
    dns?: {
        account: string;
        profile: string;
        roleArn: string;
    };
    apiStage: {
        stageName: string;
    };
    tags: Record<string, string>;
}

export const environments: Record<string, EnvironmentConfig> = {
    develop: {
        name: 'develop',
        account: '322327555253',
        region: 'us-east-1',
        awsProfile: 'dobby_develop',
        frontend: {
            domain: 'vawkes.com',
            subdomain: 'gridcube.dev',
        },
        api: {
            domain: 'vawkes.com',
            subdomain: 'api.gridcube.dev',
        },
        dns: {
            account: '383688137294',
            profile: 'default',
            roleArn: 'arn:aws:iam::322327555253:role/main_account_route_53' // Fixed: Use develop account role
        },
        apiStage: {
            stageName: 'v1',
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
        frontend: {
            domain: 'vawkes.com',
            subdomain: 'gridcube',
        },
        api: {
            domain: 'vawkes.com',
            subdomain: 'api.gridcube',
        },
        dns: {
            account: '383688137294',
            profile: 'default',
            roleArn: 'arn:aws:iam::530256939393:role/main_account_route_53'
        },
        apiStage: {
            stageName: 'v1',
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