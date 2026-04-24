describe('API configuration test result', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    test('reports develop API for optimized development-environment builds', () => {
        process.env.NODE_ENV = 'production';
        process.env.REACT_APP_ENVIRONMENT = 'development';
        process.env.REACT_APP_API_URL = 'https://api.gridcube.dev.vawkes.com';

        const { getApiConfigurationTestResult } = require('./api-test');

        expect(getApiConfigurationTestResult()).toEqual({
            environment: 'development',
            apiUrl: 'https://api.gridcube.dev.vawkes.com',
            label: 'DEV API',
            matchesEnvironment: true,
        });
    });

    test('reports production API for production builds', () => {
        process.env.NODE_ENV = 'production';
        process.env.REACT_APP_ENVIRONMENT = 'production';
        process.env.REACT_APP_API_URL = 'https://api.gridcube.vawkes.com';

        const { getApiConfigurationTestResult } = require('./api-test');

        expect(getApiConfigurationTestResult()).toEqual({
            environment: 'production',
            apiUrl: 'https://api.gridcube.vawkes.com',
            label: 'PROD API',
            matchesEnvironment: true,
        });
    });
});
