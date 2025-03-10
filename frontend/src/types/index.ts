// Authentication related types
export interface AuthToken {
    token: string;
    refreshToken: string;
    expiresIn: number;
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

// Device related types
export interface Device {
    updated_at?: string;
    cta_version: string;
    firmware_date: string;
    model_number: string;
    device_id: string;
    device_type: string;
    gridcube_firmware_version?: string;
    capability_bitmap: string;
    device_revision: string;
    firmware_version: string;
    serial_number: string;
    vendor_id: string;
}

// User related types
export interface User {
    email: string;
    name: string;
} 