import axios from 'axios';
import { toast } from 'react-toastify';
import { getConfig } from '../utils/config';

// Define the base URL for the API 
// In development, leave empty to use the proxy in package.json
// In production, use the API URL from runtime config
const getBaseUrl = () => {
    if (process.env.NODE_ENV === 'production') {
        // In production, try to get from runtime config
        return getConfig('API_URL');
    }
    // In development, use empty string to leverage the proxy
    return process.env.REACT_APP_API_URL || '';
};

// Create an axios instance with default config
const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    // Add timeout to prevent hanging requests
    timeout: 15000,
});

// Update the base URL when the config is loaded
const updateBaseUrl = () => {
    const baseUrl = getBaseUrl();
    if (baseUrl) {
        api.defaults.baseURL = baseUrl;
        console.log(`API base URL set to: ${baseUrl}`);
    }
};

// Add a request interceptor to include the auth token in requests
api.interceptors.request.use(
    (config) => {
        // Get token from localStorage
        const token = localStorage.getItem('token');

        // If token exists, add it to the headers
        if (token) {
            // Check if token already has Bearer prefix
            const tokenValue = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
            config.headers.Authorization = tokenValue;

            // Debug log (avoid logging full token in production)
            const tokenPreview = tokenValue.substring(0, 15) + '...' + tokenValue.substring(tokenValue.length - 5);
            console.log(`Adding authorization token: ${tokenPreview}`);
        } else {
            console.warn('No authorization token available for request');
        }

        console.log(`Making ${config.method?.toUpperCase()} request to: ${config.baseURL}${config.url}`);
        return config;
    },
    (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
    }
);

// Add a response interceptor for better error handling
api.interceptors.response.use(
    (response) => {
        // Any status code within the range of 2xx triggers this function
        return response;
    },
    (error) => {
        // Any status codes outside the range of 2xx trigger this function
        console.error('API Error:', error);

        // Handle unauthorized errors by redirecting to login
        if (error.response && error.response.status === 401) {
            console.error('Unauthorized access - token may be expired');

            // Clear authentication data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Only redirect if we're not already on the login page
            if (!window.location.pathname.includes('/login')) {
                console.log('Redirecting to login page due to authentication error');
                // Use a slight delay to allow the console messages to be logged
                setTimeout(() => {
                    window.location.href = '/login';
                }, 100);
            }

            // Show toast with error message
            toast.error('Your session has expired. Please log in again.');
        } else if (error.response) {
            // The request was made and the server responded with a status code
            // that falls out of the range of 2xx
            console.error('Response data:', error.response.data);
            console.error('Response status:', error.response.status);

            // Show toast with error message from API if available
            const errorMessage = error.response.data?.message || error.response.data?.error || 'An error occurred';
            toast.error(errorMessage);
        } else if (error.request) {
            // The request was made but no response was received
            console.error('No response received:', error.request);
            toast.error('Network error. Please check your connection and try again.');
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error('Request setup error:', error.message);
            toast.error('An unexpected error occurred. Please try again.');
        }

        return Promise.reject(error);
    }
);

// Authentication API calls
export const authAPI = {
    login: async (email: string, password: string) => {
        try {
            const response = await api.post('/public/auth/login', { email, password });
            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    register: async (email: string, password: string, name: string) => {
        try {
            const response = await api.post('/public/auth/register', { email, password, name });
            return response.data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    },

    confirmRegistration: async (email: string, confirmationCode: string) => {
        try {
            const response = await api.post('/public/auth/confirm-registration', { email, confirmationCode });
            return response.data;
        } catch (error) {
            console.error('Confirmation error:', error);
            throw error;
        }
    },

    forgotPassword: async (email: string) => {
        try {
            const response = await api.post('/public/auth/forgot-password', { email });
            return response.data;
        } catch (error) {
            console.error('Forgot password error:', error);
            throw error;
        }
    },

    resetPassword: async (email: string, confirmationCode: string, newPassword: string) => {
        try {
            const response = await api.post('/public/auth/reset-password', {
                email,
                confirmationCode,
                newPassword
            });
            return response.data;
        } catch (error) {
            console.error('Reset password error:', error);
            throw error;
        }
    },
};

// Export updateBaseUrl to be called after config is loaded
export { updateBaseUrl };

export default api; 