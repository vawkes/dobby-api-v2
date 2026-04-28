import { describe, expect, it } from '@jest/globals';
import { buildPendingInstallDevice, resolveEffectiveAssignmentStatus } from '../lambda/utils/deviceLifecycle.ts';

describe('device lifecycle helpers', () => {
  it('keeps pending install effective while telemetry is absent', () => {
    expect(resolveEffectiveAssignmentStatus('PENDING_INSTALL')).toBe('PENDING_INSTALL');
  });

  it('treats pending install devices as active once telemetry exists', () => {
    expect(resolveEffectiveAssignmentStatus('PENDING_INSTALL', '2026-04-28T00:00:00.000Z')).toBe('ACTIVE');
  });

  it('defaults missing legacy assignment status to active', () => {
    expect(resolveEffectiveAssignmentStatus()).toBe('ACTIVE');
  });

  it('builds a minimal visible pending install device when device info is missing', () => {
    expect(buildPendingInstallDevice('000123', 'PENDING_INSTALL')).toEqual({
      device_id: '000123',
      assignment_status: 'PENDING_INSTALL',
      effective_assignment_status: 'PENDING_INSTALL',
    });
  });
});
