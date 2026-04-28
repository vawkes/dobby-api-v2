import { Device } from '../types/index.ts';
import { getDeviceTypeDescription } from './deviceTypes.ts';

export const NOT_REPORTED = 'Not reported';

export const sanitizeDeviceText = (value: unknown): string => {
  if (value === null || value === undefined) return '';
  return Array.from(String(value))
    .filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('')
    .trim();
};

export const getDeviceDisplayValue = (
  value: unknown,
  fallback: string = NOT_REPORTED,
): string => sanitizeDeviceText(value) || fallback;

export const getDeviceSearchText = (device: Device): string => {
  const deviceType = sanitizeDeviceText((device as any).device_type);
  const deviceTypeInfo = getDeviceTypeDescription(deviceType);
  const deviceTypeText = deviceTypeInfo.hexCode
    ? `${deviceTypeInfo.description} ${deviceTypeInfo.hexCode}`
    : deviceTypeInfo.description;

  return [
    (device as any).device_id,
    (device as any).model_number,
    (device as any).serial_number,
    (device as any).firmware_version,
    deviceTypeText,
  ]
    .map(sanitizeDeviceText)
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
};

export const formatTelemetryEnergy = (value?: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'N/A';
  return `${new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value)} kWh`;
};

export const formatOperationalState = (value?: number | null): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unknown';
  return `Code ${value}`;
};

export const formatOptionalDate = (dateString?: string | null, fallback = 'Unknown'): string => {
  const sanitized = sanitizeDeviceText(dateString);
  if (!sanitized) return fallback;

  const date = new Date(sanitized);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleString();
};
