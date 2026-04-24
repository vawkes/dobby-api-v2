import { getApiUrl, getEnvironment, isDebugLoggingEnabled } from './config';

export interface ApiConfigurationTestResult {
    environment: string;
    apiUrl: string;
    label: 'DEV API' | 'PROD API' | 'CUSTOM API';
    matchesEnvironment: boolean;
}

const expectedApiUrls: Record<string, string> = {
    development: 'https://api.gridcube.dev.vawkes.com',
    production: 'https://api.gridcube.vawkes.com',
};

export const getApiConfigurationTestResult = (): ApiConfigurationTestResult => {
    const environment = getEnvironment();
    const apiUrl = getApiUrl();
    const expectedUrl = expectedApiUrls[environment];

    if (environment === 'development' && apiUrl === expectedApiUrls.development) {
        return {
            environment,
            apiUrl,
            label: 'DEV API',
            matchesEnvironment: true,
        };
    }

    if (environment === 'production' && apiUrl === expectedApiUrls.production) {
        return {
            environment,
            apiUrl,
            label: 'PROD API',
            matchesEnvironment: true,
        };
    }

    return {
        environment,
        apiUrl,
        label: 'CUSTOM API',
        matchesEnvironment: expectedUrl ? apiUrl === expectedUrl : true,
    };
};

// Simple test utility to verify API configuration
export const testApiConfiguration = () => {
    const result = getApiConfigurationTestResult();

    if (isDebugLoggingEnabled()) {
        console.log('Testing API Configuration:', result);
    }

    return result.apiUrl;
};

// Test function that can be called from the browser console
if (isDebugLoggingEnabled()) {
    (window as any).testApiConfig = testApiConfiguration;
}
