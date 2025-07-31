/**
 * Environment configuration utility for the React app
 * This allows the app to access environment variables at runtime
 * by fetching them from the env-config.json file that is generated
 * during deployment.
 */

import { getEnvironmentConfig } from './deployment-config.js'

interface EnvConfig {
    API_URL: string;
    ENVIRONMENT: string;
    VERSION: string;
    [key: string]: string;
}

const environmentConfig = getEnvironmentConfig(process.env.REACT_APP_ENVIRONMENT || 'develop');

// Default config for development
let config: EnvConfig = {
    API_URL: `https://${environmentConfig.api?.subdomain}.${environmentConfig.api?.domain}`,
    ENVIRONMENT: environmentConfig.name === 'production' ? 'production' : 'development',
    VERSION: '1.0.0',
};

// Async function to load the runtime configuration
export const loadConfig = async (): Promise<EnvConfig> => {
    try {
        // In production, fetch the config from the JSON file
        if (process.env.NODE_ENV === 'production') {
            const response = await fetch('/env-config.json');

            if (!response.ok) {
                console.warn('Failed to load runtime configuration, using defaults');
                return config;
            }

            const runtimeConfig = await response.json();

            // Merge the runtime config with the default config
            config = {
                ...config,
                ...runtimeConfig
            };

            console.log('Loaded runtime configuration:', config);
        } else {
            // In development, log the config being used
            console.log('Using development configuration:', config);
        }

        return config;
    } catch (error) {
        console.error('Error loading runtime configuration:', error);
        return config;
    }
};

// Get a configuration value
export const getConfig = (key: keyof EnvConfig): string => {
    return config[key] || '';
};

// Set a configuration value (useful for testing)
export const setConfig = (key: keyof EnvConfig, value: string): void => {
    config[key] = value;
};

// Export the default config
export default config; 