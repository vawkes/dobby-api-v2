import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { User, LoginCredentials, RegistrationData } from '../types/auth';
import { toast } from 'react-toastify';

interface AuthContextType {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (credentials: LoginCredentials) => Promise<void>;
    register: (data: RegistrationData) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Error parsing stored user:', error);
                localStorage.removeItem('user');
            }
        }

        setIsLoading(false);
    }, []);

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

            // Create user object
            const userObj: User = {
                email: credentials.email,
                name: response.name || '', // Use name from response if available
            };

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