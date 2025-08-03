// Simple test utility to verify API configuration
export const testApiConfiguration = () => {
    console.log('🧪 Testing API Configuration...');
    console.log('  - NODE_ENV:', process.env.NODE_ENV);
    console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);

    // Test the getBaseUrl logic
    let baseUrl;
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
        baseUrl = 'https://api.gridcube.dev.vawkes.com';
        console.log('  - Development mode detected');
    } else {
        baseUrl = 'https://api.gridcube.vawkes.com'; // Production URL
        console.log('  - Production mode detected');
    }

    console.log('  - Expected API URL:', baseUrl);
    console.log('  - Test result:', baseUrl === 'https://api.gridcube.dev.vawkes.com' ? '✅ DEV API' : '❌ PROD API');

    return baseUrl;
};

// Test function that can be called from the browser console
(window as any).testApiConfig = testApiConfiguration; 