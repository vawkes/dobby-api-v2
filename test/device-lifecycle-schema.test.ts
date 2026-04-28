import { describe, expect, it } from '@jest/globals';
import { addDeviceToCompanySchema, companyDeviceSchema } from '../lambda/companies/companiesSchema.ts';
import { deviceSchema } from '../lambda/devices/devicesSchema.ts';

describe('device lifecycle schemas', () => {
  it('defaults new company device assignments to pending install', () => {
    expect(addDeviceToCompanySchema.parse({ device_id: '000123' })).toEqual({
      device_id: '000123',
      status: 'PENDING_INSTALL',
    });
  });

  it('accepts pending install lifecycle on company device records', () => {
    expect(() =>
      companyDeviceSchema.parse({
        company_id: '11111111-1111-4111-8111-111111111111',
        device_id: '000123',
        status: 'PENDING_INSTALL',
        createdAt: '2026-04-28T00:00:00.000Z',
        updatedAt: '2026-04-28T00:00:00.000Z',
      }),
    ).not.toThrow();
  });

  it('accepts assignment lifecycle metadata on device API responses', () => {
    expect(
      deviceSchema.parse({
        device_id: '000123',
        assignment_status: 'PENDING_INSTALL',
        effective_assignment_status: 'PENDING_INSTALL',
      }),
    ).toMatchObject({
      assignment_status: 'PENDING_INSTALL',
      effective_assignment_status: 'PENDING_INSTALL',
    });
  });
});
