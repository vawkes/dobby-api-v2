import { Device } from '../types/index.ts';

export type DeviceStatus = 'online' | 'degraded' | 'offline' | 'no_data' | 'pending_install';

const deviceStatusLabels: Record<DeviceStatus, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
  no_data: 'No Data',
  pending_install: 'Pending Install',
};

export const hoursSince = (dateString?: string): number | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  } catch (e) {
    return null;
  }
};

export const getDeviceStatus = (device: Device): DeviceStatus => {
  const pendingInstall =
    device.effective_assignment_status === 'PENDING_INSTALL' ||
    (device.assignment_status === 'PENDING_INSTALL' && !device.updated_at);

  if (pendingInstall) return 'pending_install';

  const ageHours = hoursSince(device.updated_at);

  if (ageHours === null) return 'no_data';
  if (ageHours > 24) return 'offline';
  if (ageHours > 6) return 'degraded';
  if (device.last_rx_rssi !== undefined && device.last_rx_rssi <= -100) return 'degraded';
  return 'online';
};

export const getDeviceStatusLabel = (status: DeviceStatus): string => deviceStatusLabels[status];
