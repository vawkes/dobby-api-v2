import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  Action,
  UserRole,
  canAssignRole,
  hasCompanyPermission,
  hasPermission,
} from '../lambda/utils/permissions.ts';

const createMockDynamoDB = () => ({
  getItem: jest.fn(),
  query: jest.fn(),
}) as unknown as DynamoDB & {
  getItem: jest.Mock;
  query: jest.Mock;
};

describe('permission boundary helpers', () => {
  let dynamodb: ReturnType<typeof createMockDynamoDB>;

  beforeEach(() => {
    dynamodb = createMockDynamoDB();
  });

  it('denies destructive device permission to a device viewer', async () => {
    dynamodb.query.mockResolvedValue({
      Items: [
        marshall({
          company_id: 'company-1',
          user_id: 'viewer-1',
          role: UserRole.DEVICE_VIEWER,
        }),
      ],
    } as never);

    await expect(hasPermission(dynamodb, 'viewer-1', Action.DELETE_DEVICES)).resolves.toBe(false);
  });

  it('grants all permissions to a super admin regardless of action matrix', async () => {
    dynamodb.query.mockResolvedValue({
      Items: [
        marshall({
          company_id: 'company-1',
          user_id: 'admin-1',
          role: UserRole.SUPER_ADMIN,
        }),
      ],
    } as never);

    await expect(hasPermission(dynamodb, 'admin-1', Action.DELETE_COMPANIES)).resolves.toBe(true);
  });

  it('denies company access when a user has general permission but no role in that company', async () => {
    dynamodb.query.mockResolvedValue({
      Items: [
        marshall({
          company_id: 'company-1',
          user_id: 'manager-1',
          role: UserRole.DEVICE_MANAGER,
        }),
      ],
    } as never);
    dynamodb.getItem.mockResolvedValue({ Item: undefined } as never);

    await expect(
      hasCompanyPermission(dynamodb, 'manager-1', Action.READ_EVENTS, 'company-2')
    ).resolves.toBe(false);
  });

  it('prevents a company admin from assigning a higher super-admin role', async () => {
    dynamodb.query.mockResolvedValue({
      Items: [
        marshall({
          company_id: 'company-1',
          user_id: 'company-admin-1',
          role: UserRole.COMPANY_ADMIN,
        }),
      ],
    } as never);
    dynamodb.getItem.mockResolvedValue({
      Item: marshall({
        company_id: 'company-1',
        user_id: 'company-admin-1',
        role: UserRole.COMPANY_ADMIN,
      }),
    } as never);

    await expect(
      canAssignRole(dynamodb, 'company-admin-1', 'company-1', UserRole.SUPER_ADMIN)
    ).resolves.toBe(false);
  });
});
