import { z } from '@hono/zod-openapi';

// Company schema
export const companySchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

// User role enum
export const UserRole = {
    SUPER_ADMIN: 'SUPER_ADMIN',
    COMPANY_ADMIN: 'COMPANY_ADMIN',
    DEVICE_MANAGER: 'DEVICE_MANAGER',
    DEVICE_VIEWER: 'DEVICE_VIEWER',
} as const;

export type UserRole = typeof UserRole[keyof typeof UserRole];

// Company user schema
export const companyUserSchema = z.object({
    company_id: z.string().uuid(),
    user_id: z.string().uuid(),
    role: z.nativeEnum(UserRole),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

// Company device schema
export const companyDeviceSchema = z.object({
    company_id: z.string().uuid(),
    device_id: z.string().regex(/^\d{6}$/, "Device ID must be a 6-digit number"),
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']),
    location: z.string().optional(),
    installedAt: z.string().datetime().optional(),
    lastSeenAt: z.string().datetime().optional(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

// Request schemas
export const createCompanySchema = z.object({
    name: z.string().min(1),
});

export const updateCompanySchema = z.object({
    name: z.string().min(1).optional(),
});

export const addUserToCompanySchema = z.object({
    user_id: z.string().uuid(),
    role: z.nativeEnum(UserRole),
});

export const updateUserRoleSchema = z.object({
    role: z.nativeEnum(UserRole),
});

export const addDeviceToCompanySchema = z.object({
    device_id: z.string().regex(/^\d{6}$/, "Device ID must be a 6-digit number"),
    location: z.string().optional(),
});

export const updateDeviceSchema = z.object({
    status: z.enum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'OFFLINE']).optional(),
    location: z.string().optional(),
});

// Response schemas
export const companiesSchema = z.array(companySchema);
export const companyUsersSchema = z.array(companyUserSchema);
export const companyDevicesSchema = z.array(companyDeviceSchema); 