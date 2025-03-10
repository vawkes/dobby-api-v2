'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '@/services/api';
import { User, AuthToken, LoginCredentials, RegistrationData } from '@/types';
import { useRouter } from 'next/navigation';
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
    const router = useRouter();

    // Initialize auth state from localStorage on mount
    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        setIsLoading(false);
    }, []);

    const login = async (credentials: LoginCredentials) => {
        try {
            setIsLoading(true);
            const response = await authAPI.login(credentials.email, credentials.password);

            console.log('Login successful, token received, length:', response.token.length);

            // Save token and user info
            if (!response.token) {
                throw new Error('No token received from server');
            }

            // Ensure token is properly formatted
            const token = response.token.startsWith('Bearer ')
                ? response.token
                : `Bearer ${response.token}`;

            setToken(token);
            localStorage.setItem('token', token);

            // Create user object
            const userObj: User = {
                email: credentials.email,
                name: '', // If backend returns user info, use that instead
            };

            setUser(userObj);
            localStorage.setItem('user', JSON.stringify(userObj));

            toast.success('Login successful');
            router.push('/dashboard');
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
            router.push(`/verify?email=${encodeURIComponent(data.email)}`);
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
        router.push('/login');
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