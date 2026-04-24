/**
 * Environment configuration utility for the React app
 * This provides environment-specific configuration based on the current environment
 */

interface EnvConfig {
    API_URL: string;
    ENVIRONMENT: string;
    VERSION: string;
    ALLOW_MOCK_AUTH: boolean;
}

// Environment-specific configurations
const environmentConfigs: Record<string, EnvConfig> = {
    local: {
        API_URL: 'http://localhost:8787',
        ENVIRONMENT: 'local',
        VERSION: '1.0.0',
        ALLOW_MOCK_AUTH: true,
    },
    development: {
        API_URL: 'https://api.gridcube.dev.vawkes.com',
        ENVIRONMENT: 'development',
        VERSION: '1.0.0',
        ALLOW_MOCK_AUTH: true,
    },
    production: {
        API_URL: 'https://api.gridcube.vawkes.com',
        ENVIRONMENT: 'production',
        VERSION: '1.0.0',
        ALLOW_MOCK_AUTH: false,
    },
};

// Determine current environment
const getCurrentEnvironment = (): string => {
    const envOverride = process.env.REACT_APP_ENVIRONMENT;
    if (envOverride) {
        return envOverride;
    }

    // In development (npm start), use development config
    if (process.env.NODE_ENV === 'development') {
        return 'development';
    }

    // Default to production for built apps
    return 'production';
};

// Get the current configuration
const currentEnv = getCurrentEnvironment();
const config: EnvConfig = environmentConfigs[currentEnv] || environmentConfigs.production;
if (process.env.REACT_APP_API_URL) {
    config.API_URL = process.env.REACT_APP_API_URL;
}

export const isDebugLoggingEnabled = (): boolean => {
    return process.env.NODE_ENV === 'development' || process.env.REACT_APP_DEBUG_LOGS === 'true';
};

if (isDebugLoggingEnabled()) {
    console.log(`Using ${currentEnv} configuration:`, config);
}

// Get a configuration value
export const getConfig = (key: keyof EnvConfig): string | boolean => {
    return config[key];
};

// Get the API URL
export const getApiUrl = (): string => {
    return config.API_URL;
};

// Get the environment
export const getEnvironment = (): string => {
    return config.ENVIRONMENT;
};

// Check if mock auth is allowed
export const isMockAuthAllowed = (): boolean => {
    return config.ALLOW_MOCK_AUTH;
};

// Export the default config
export default config; 
