import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { authAPI, companiesAPI } from '../services/api';
import { User, LoginCredentials, RegistrationData } from '../types/auth';
import { toast } from 'react-toastify';

interface AuthResponseUserFields {
    companyId?: string;
    company_id?: string;
    companyName?: string;
    company_name?: string;
    'custom:company_id'?: string;
    'custom:company_name'?: string;
    name?: string;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegistrationData) => Promise<void>;
    logout: () => void;
    refreshTokenIfNeeded: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const decodeBase64Url = (value: string): string => {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const paddedBase64 = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    return atob(paddedBase64);
};

const decodeJwtPayload = (token: string): AuthResponseUserFields => {
    try {
        const payload = token.replace(/^Bearer\s+/i, '').split('.')[1];
        if (!payload) {
            return {};
        }

        return JSON.parse(decodeBase64Url(payload));
    } catch (error) {
        console.error('Error parsing JWT user fields:', error);
        return {};
    }
};

const buildUserFromAuthResponse = (email: string, response: AuthResponseUserFields & { token?: string }): User => {
    const tokenFields = response.token ? decodeJwtPayload(response.token) : {};

    return {
        email,
        name: response.name || tokenFields.name || '',
        companyId:
            response.companyId ||
            response.company_id ||
            response['custom:company_id'] ||
            tokenFields.companyId ||
            tokenFields.company_id ||
            tokenFields['custom:company_id'],
        companyName:
            response.companyName ||
            response.company_name ||
            response['custom:company_name'] ||
            tokenFields.companyName ||
            tokenFields.company_name ||
            tokenFields['custom:company_name'],
    };
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const enrichUserWithCompany = useCallback(async (baseUser: User): Promise<User> => {
        if (baseUser.companyName) {
            return baseUser;
        }

        try {
            const companySummary = await companiesAPI.getMyCompanies();
            const activeCompany = companySummary.activeCompany;
            if (!activeCompany) {
                return baseUser;
            }

            return {
                ...baseUser,
                companyId: activeCompany.id,
                companyName: activeCompany.name,
            };
        } catch (error) {
            console.error('Failed to load current user company:', error);
            return baseUser;
        }
    }, []);

    // Create a memoized version of the refreshTokenIfNeeded function to avoid useEffect dependency issues
    const refreshTokenIfNeeded = useCallback(async (): Promise<boolean> => {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
            return false;
        }

        try {
            const response = await authAPI.refreshToken(refreshToken);

            if (response && response.token) {
                // Ensure token is properly formatted
                const tokenWithBearer = response.token.startsWith('Bearer ')
                    ? response.token
                    : `Bearer ${response.token}`;

                setToken(tokenWithBearer);
                localStorage.setItem('token', tokenWithBearer);

                // Update refresh token if a new one was provided
                if (response.refreshToken) {
                    localStorage.setItem('refreshToken', response.refreshToken);
                }

                return true;
            }

            return false;
        } catch (error) {
            console.error('Failed to refresh token:', error);
            return false;
        }
    }, []);

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const initializeAuth = async () => {
            const storedToken = localStorage.getItem('token');
            const storedUser = localStorage.getItem('user');
            const refreshToken = localStorage.getItem('refreshToken');

            if (storedToken && storedUser) {
                // Check if token needs to be refreshed
                let needsRefresh = false;

                try {
                    // Decode the JWT token to check expiration
                    // Token format: header.payload.signature
                    const payload = storedToken.split('.')[1];
                    if (payload) {
                        const decodedPayload = JSON.parse(decodeBase64Url(payload));
                        const expirationTime = decodedPayload.exp * 1000; // Convert to milliseconds
                        const currentTime = Date.now();

                        // Refresh if token expires in less than 15 minutes or is already expired
                        const fifteenMinutes = 15 * 60 * 1000;
                        needsRefresh = (expirationTime - currentTime) < fifteenMinutes;

                        console.log(`Token expires in ${Math.round((expirationTime - currentTime) / 1000 / 60)} minutes.`);
                    }
                } catch (error) {
                    console.error('Error parsing JWT token:', error);
                    needsRefresh = true;
                }

                if (needsRefresh && refreshToken) {
                    console.log('Token is nearing expiration or expired, attempting refresh');
                    const refreshed = await refreshTokenIfNeeded();

                    if (!refreshed) {
                        // If refresh failed, clear user state but don't redirect yet
                        // This allows components to handle auth redirection more gracefully
                        localStorage.removeItem('token');
                        localStorage.removeItem('refreshToken');
                        localStorage.removeItem('user');
                        setToken(null);
                        setUser(null);
                        setIsLoading(false);
                        return;
                    }

                    try {
                        const parsedUser = JSON.parse(storedUser);
                        const enrichedUser = await enrichUserWithCompany(parsedUser);
                        setUser(enrichedUser);
                        localStorage.setItem('user', JSON.stringify(enrichedUser));
                    } catch (error) {
                        console.error('Error parsing stored user:', error);
                        localStorage.removeItem('user');
                    }
                } else {
                    // Token is still valid
                    setToken(storedToken);
                    try {
                        const parsedUser = JSON.parse(storedUser);
                        const enrichedUser = await enrichUserWithCompany(parsedUser);
                        setUser(enrichedUser);
                        localStorage.setItem('user', JSON.stringify(enrichedUser));
                    } catch (error) {
                        console.error('Error parsing stored user:', error);
                        localStorage.removeItem('user');
                    }
                }
            }

            setIsLoading(false);
        };

        initializeAuth();
    }, [enrichUserWithCompany, refreshTokenIfNeeded]);

    const login = async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);
            const response = await authAPI.login(credentials.email, credentials.password);

            console.log('Login successful, token received, length:', response.token ? response.token.length : 'no token');

            // Save token and user info
            if (!response.token) {
                throw new Error('No token received from server');
            }

            // Ensure token is properly formatted
            const tokenWithBearer = response.token.startsWith('Bearer ')
                ? response.token
                : `Bearer ${response.token}`;

            setToken(tokenWithBearer);
            localStorage.setItem('token', tokenWithBearer);

            // Store refresh token if available
            if (response.refreshToken) {
                localStorage.setItem('refreshToken', response.refreshToken);
            }

            // Create user object
            const userObj = await enrichUserWithCompany(buildUserFromAuthResponse(credentials.email, response));

            setUser(userObj);
            localStorage.setItem('user', JSON.stringify(userObj));

            toast.success('Login successful');
            // Navigation will be handled by the calling component or React Router
        } catch (error) {
            console.error('Login error:', error);
            toast.error('Login failed. Please check your credentials.');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: RegistrationData) => {
        try {
            setIsLoading(true);
            await authAPI.register(data.email, data.password, data.name);
            toast.success('Registration successful! Please check your email for verification code.');
            // Navigation will be handled by the calling component or React Router
            return;
        } catch (error) {
            console.error('Registration error:', error);
            toast.error('Registration failed. Please try again.');
            throw error;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        // Clear auth state and localStorage
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');

        toast.info('You have been logged out');
        // Navigate to login page - will be handled by React Router
        window.location.href = '/login';
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                isAuthenticated: !!token,
                isLoading,
                login,
                register,
                logout,
                refreshTokenIfNeeded,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}; 
