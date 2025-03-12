// Authentication related types
export interface AuthToken {
    token: string;
    refreshToken?: string;
    expiresIn?: number;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegistrationData {
    email: string;
    password: string;
    name: string;
}

export interface ConfirmRegistrationData {
    email: string;
    confirmationCode: string;
}

export interface ForgotPasswordData {
    email: string;
}

export interface ResetPasswordData {
    email: string;
    confirmationCode: string;
    newPassword: string;
}

// User related types
export interface User {
    email: string;
    name: string;
    id?: string;
} 