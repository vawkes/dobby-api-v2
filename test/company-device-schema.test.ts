import { describe, it, expect } from '@jest/globals';
import { addDeviceToCompanySchema } from '../lambda/companies/companiesSchema.ts';

describe('Company Device Schema', () => {
    describe('addDeviceToCompanySchema', () => {
        it('should accept valid 6-digit device ID', () => {
            const validData = {
                device_id: '000012',
                location: 'Building A'
            };

            const result = addDeviceToCompanySchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should accept valid 6-digit device ID without location', () => {
            const validData = {
                device_id: '123456'
            };

            const result = addDeviceToCompanySchema.safeParse(validData);
            expect(result.success).toBe(true);
        });

        it('should reject non-6-digit device ID', () => {
            const invalidData = {
                device_id: '12345', // 5 digits
                location: 'Building A'
            };

            const result = addDeviceToCompanySchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['device_id']);
                expect(result.error.issues[0].message).toBe('Device ID must be a 6-digit number');
            }
        });

        it('should reject UUID format device ID', () => {
            const invalidData = {
                device_id: '558fab41-f090-4675-a7b0-f5060297d4e9',
                location: 'Building A'
            };

            const result = addDeviceToCompanySchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['device_id']);
                expect(result.error.issues[0].message).toBe('Device ID must be a 6-digit number');
            }
        });

        it('should reject invalid device ID format', () => {
            const invalidData = {
                device_id: 'abc123',
                location: 'Building A'
            };

            const result = addDeviceToCompanySchema.safeParse(invalidData);
            expect(result.success).toBe(false);
            if (!result.success) {
                expect(result.error.issues[0].path).toEqual(['device_id']);
                expect(result.error.issues[0].message).toBe('Device ID must be a 6-digit number');
            }
        });

        it('should reject empty device ID', () => {
            const invalidData = {
                device_id: '',
                location: 'Building A'
            };

            const result = addDeviceToCompanySchema.safeParse(invalidData);
            expect(result.success).toBe(false);
        });
    });
}); 