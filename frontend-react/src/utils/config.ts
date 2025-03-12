/**
 * Environment configuration utility for the React app
 * This allows the app to access environment variables at runtime
 * by fetching them from the env-config.json file that is generated
 * during deployment.
 */

interface EnvConfig {
    API_URL: string;
    ENVIRONMENT: string;
    VERSION: string;
    [key: string]: string;
}

// Default config for development
let config: EnvConfig = {
    API_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
    ENVIRONMENT: process.env.REACT_APP_ENVIRONMENT || 'development',
    VERSION: process.env.REACT_APP_VERSION || '0.1.0',
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