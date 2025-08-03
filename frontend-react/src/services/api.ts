import axios from 'axios';
import { toast } from 'react-toastify';
import { getApiUrl } from '../utils/config';
import { v4 as uuidv4 } from 'uuid';

// Define the base URL for the API 
const getBaseUrl = () => {
    const baseUrl = getApiUrl();
    console.log('📡 API base URL:', baseUrl);
    return baseUrl;
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

// Log the initial configuration
console.log('🔧 API Configuration:');
console.log('  - NODE_ENV:', process.env.NODE_ENV);
console.log('  - REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
console.log('  - Base URL:', api.defaults.baseURL);

// Update the base URL when the config is loaded
const updateBaseUrl = () => {
    const baseUrl = getApiUrl();
    api.defaults.baseURL = baseUrl;
    console.log('🔧 API base URL updated to:', baseUrl);
};

// Store a flag to avoid multiple concurrent refresh attempts
let isRefreshing = false;
// Store pending requests that should be retried after token refresh
let pendingRequests: Array<{
    config: any;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
}> = [];

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
    async (error) => {
        // Any status codes outside the range of 2xx trigger this function
        console.error('API Error:', error);

        // Handle unauthorized errors by attempting token refresh
        if (error.response && error.response.status === 401) {
            console.error('Unauthorized access - token may be expired');

            // Get the original request config
            const originalRequest = error.config;

            // Create an identifier for the current request
            const isAuthEndpoint = originalRequest.url?.includes('/auth/');
            const isRefreshEndpoint = originalRequest.url?.includes('/refresh-token');
            const refreshToken = localStorage.getItem('refreshToken');

            // Only proceed with token refresh if:
            // 1. Not an auth endpoint itself
            // 2. Not already trying to refresh
            // 3. Refresh token exists
            // 4. No _retryCount or _retryCount < 1 (to prevent infinite loops)
            if (!isAuthEndpoint && !isRefreshEndpoint &&
                refreshToken &&
                (!originalRequest._retryCount || originalRequest._retryCount < 1)) {

                // Mark the request as retried
                originalRequest._retryCount = originalRequest._retryCount ? originalRequest._retryCount + 1 : 1;

                // If we're already refreshing, queue this request
                if (isRefreshing) {
                    return new Promise((resolve, reject) => {
                        pendingRequests.push({
                            config: originalRequest,
                            resolve,
                            reject
                        });
                    });
                }

                // Start refreshing
                isRefreshing = true;

                try {
                    console.log('Attempting to refresh the auth token');

                    // Try to refresh the token
                    const refreshResult = await authAPI.refreshToken(refreshToken);

                    // If successful, update the tokens in localStorage
                    if (refreshResult && refreshResult.token) {
                        // Ensure token is properly formatted
                        const tokenWithBearer = refreshResult.token.startsWith('Bearer ')
                            ? refreshResult.token
                            : `Bearer ${refreshResult.token}`;

                        localStorage.setItem('token', tokenWithBearer);

                        // Store the refresh token if provided
                        if (refreshResult.refreshToken) {
                            localStorage.setItem('refreshToken', refreshResult.refreshToken);
                        }

                        console.log('Token refresh successful, retrying original request');

                        // Update the original request with the new token
                        originalRequest.headers.Authorization = tokenWithBearer;

                        // Process any pending requests with the new token
                        pendingRequests.forEach(request => {
                            request.config.headers.Authorization = tokenWithBearer;
                            request.resolve(api(request.config));
                        });

                        // Clear the pending requests
                        pendingRequests = [];

                        // Retry the original request with the new token
                        return api(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('Token refresh failed:', refreshError);

                    // Reject all pending requests
                    pendingRequests.forEach(request => {
                        request.reject(refreshError);
                    });

                    // Clear the pending requests
                    pendingRequests = [];
                } finally {
                    // Reset refreshing flag
                    isRefreshing = false;
                }
            }

            // If we get here, either token refresh failed or wasn't attempted
            // Clear authentication data from localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
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

            // Store refresh token if available
            if (response.data.refreshToken) {
                localStorage.setItem('refreshToken', response.data.refreshToken);
            }

            return response.data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    refreshToken: async (refreshToken: string) => {
        try {
            const response = await api.post('/public/auth/refresh-token', { refreshToken });
            return response.data;
        } catch (error) {
            console.error('Token refresh error:', error);
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

// Device API calls
export const deviceAPI = {
    getAllDevices: async () => {
        try {
            const response = await api.get('/devices');
            return response.data;
        } catch (error) {
            console.error('Error fetching all devices:', error);
            throw error;
        }
    },

    getDeviceById: async (deviceId: string) => {
        try {
            const response = await api.get(`/devices/${deviceId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching device with ID ${deviceId}:`, error);
            throw error;
        }
    },

    getDeviceData: async (deviceId: string, days: number = 1) => {
        try {
            const response = await api.get(`/devices/${deviceId}/data`, {
                params: { days }
            });
            return response.data;
        } catch (error) {
            console.error(`Error fetching data for device with ID ${deviceId}:`, error);
            throw error; // Simply throw the error instead of returning mock data
        }
    },
};

// Events API calls
export const eventsAPI = {
    getAllEvents: async () => {
        try {
            const response = await api.get('/events');
            return response.data;
        } catch (error) {
            console.error('Error fetching all events:', error);
            throw error;
        }
    },

    getEventById: async (eventId: string) => {
        try {
            const response = await api.get(`/events/${eventId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching event with ID ${eventId}:`, error);
            throw error;
        }
    },

    getEventsByDeviceId: async (deviceId: string) => {
        try {
            const response = await api.get(`/events/device/${deviceId}`);
            return response.data;
        } catch (error) {
            console.error(`Error fetching events for device with ID ${deviceId}:`, error);
            throw error;
        }
    },

    createBulkEvents: async (eventType: string, eventParams: any, deviceIds: string[]) => {
        try {
            // Create a payload that conforms to the unified API
            const eventData = {
                ...eventParams,
                device_id: deviceIds // Now using device_id for both single and bulk operations
            };

            const payload = {
                event_id: uuidv4(), // Generate UUID on the client for both single & bulk
                event_type: eventType,
                event_data: eventData
            };

            const response = await api.post('/events', payload);
            return response.data;
        } catch (error) {
            console.error('Error creating events:', error);
            throw error;
        }
    }
};

// Export updateBaseUrl to be called after config is loaded
export { updateBaseUrl };

export default api; 