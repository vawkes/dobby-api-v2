import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { deviceAPI } from '../services/api';
import { Device } from '../types';
import { DeviceStatus, getDeviceStatus, getDeviceStatusLabel, hoursSince } from '../utils/deviceStatus.ts';
import { getDeviceDisplayValue } from '../utils/deviceDisplay.ts';
import {
  FiActivity,
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRadio,
  FiRefreshCw,
  FiWifi,
  FiXCircle,
} from 'react-icons/fi';

const getLinkTypeName = (linkType?: number): string => {
  if (linkType === 1) return 'BLE';
  if (linkType === 4) return 'LoRA';
  return 'Unknown';
};

const statusBadgeClass: Record<DeviceStatus, string> = {
  online: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  no_data: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const statusPriority: Record<DeviceStatus, number> = {
  offline: 0,
  no_data: 1,
  degraded: 2,
  online: 3,
};

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'No check-ins';
  const ageHours = hoursSince(dateString);
  if (ageHours === null) return 'Unknown';
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m ago`;
  if (ageHours < 24) return `${Math.round(ageHours)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const fetchDevices = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await deviceAPI.getAllDevices();
      setDevices(data);
      setLastRefreshAt(new Date());
    } catch (err) {
      console.error('Error fetching devices:', err);
      setError('Failed to fetch devices. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevices();
  }, [fetchDevices]);

  const statusSummary = useMemo(() => {
    const summary = {
      online: 0,
      degraded: 0,
      offline: 0,
      no_data: 0,
      weakSignal: 0,
      lora: 0,
      ble: 0,
      unknownLink: 0,
    };

    for (const device of devices) {
      const status = getDeviceStatus(device);
      summary[status] += 1;

      if (device.last_rx_rssi !== undefined && device.last_rx_rssi <= -85) {
        summary.weakSignal += 1;
      }

      if (device.last_link_type === 4) summary.lora += 1;
      else if (device.last_link_type === 1) summary.ble += 1;
      else summary.unknownLink += 1;
    }

    return summary;
  }, [devices]);

  const attentionQueue = useMemo(
    () =>
      devices
        .map(device => ({
          ...device,
          status: getDeviceStatus(device),
          ageHours: hoursSince(device.updated_at),
        }))
        .filter(device => device.status !== 'online')
        .sort((a, b) => {
          const byStatus = statusPriority[a.status] - statusPriority[b.status];
          if (byStatus !== 0) return byStatus;
          return (b.ageHours ?? 0) - (a.ageHours ?? 0);
        }),
    [devices],
  );

  const onlinePercent =
    devices.length > 0 ? Math.round((statusSummary.online / devices.length) * 100) : 0;
  const attentionPercent =
    devices.length > 0
      ? Math.round(((statusSummary.offline + statusSummary.degraded + statusSummary.no_data) / devices.length) * 100)
      : 0;

  return (
    <section aria-labelledby='dashboard-heading'>
      <div className='py-2 space-y-6'>
        {isLoading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600'></div>
          </div>
        ) : error ? (
          <div className='bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <FiAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-red-800 dark:text-red-200'>{error}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
              <div>
                <h1 id='dashboard-heading' className='text-3xl font-bold text-foreground tracking-tight'>
                  Fleet Operations
                </h1>
                <p className='mt-1 text-sm text-muted-foreground'>
                  Utility device status, connectivity, and intervention queue
                  {user?.name ? ` for ${user.name}` : ''}.
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <FiClock className='h-3.5 w-3.5' />
                  Last refresh: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : 'Pending'}
                </p>
                <button
                  type='button'
                  onClick={fetchDevices}
                  className='inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors'
                >
                  <FiRefreshCw className='h-4 w-4' />
                  Refresh
                </button>
              </div>
            </div>

            <div className='rounded-xl border border-border bg-card p-4 md:p-6'>
              <div className='grid grid-cols-2 gap-3 md:grid-cols-5'>
                <div className='rounded-lg border border-emerald-200/60 dark:border-emerald-900/60 p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Online</p>
                  <p className='mt-1 text-2xl font-semibold text-foreground'>{statusSummary.online}</p>
                  <p className='text-xs text-muted-foreground'>{onlinePercent}% of fleet</p>
                </div>
                <div className='rounded-lg border border-amber-200/60 dark:border-amber-900/60 p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Degraded</p>
                  <p className='mt-1 text-2xl font-semibold text-foreground'>{statusSummary.degraded}</p>
                  <p className='text-xs text-muted-foreground'>Intermittent health</p>
                </div>
                <div className='rounded-lg border border-red-200/60 dark:border-red-900/60 p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Offline</p>
                  <p className='mt-1 text-2xl font-semibold text-foreground'>{statusSummary.offline}</p>
                  <p className='text-xs text-muted-foreground'>No check-in {'>'} 24h</p>
                </div>
                <div className='rounded-lg border border-slate-300/70 dark:border-slate-600 p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>No Data</p>
                  <p className='mt-1 text-2xl font-semibold text-foreground'>{statusSummary.no_data}</p>
                  <p className='text-xs text-muted-foreground'>Never reported</p>
                </div>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Attention Load</p>
                  <p className='mt-1 text-2xl font-semibold text-foreground'>{attentionPercent}%</p>
                  <p className='text-xs text-muted-foreground'>
                    {statusSummary.offline + statusSummary.degraded + statusSummary.no_data} devices
                  </p>
                </div>
              </div>
            </div>

            <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
              <div className='xl:col-span-8 rounded-xl border border-border bg-card overflow-hidden'>
                <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
                  <h2 className='text-base font-semibold text-foreground'>Attention Queue</h2>
                  <Link
                    to='/devices?filter=attention'
                    className='text-sm font-medium text-blue-700 hover:text-blue-800'
                  >
                    Open full triage
                  </Link>
                </div>
                {attentionQueue.length === 0 ? (
                  <div className='p-8 text-center text-muted-foreground'>
                    <FiCheckCircle className='mx-auto h-8 w-8 text-emerald-600' />
                    <p className='mt-2'>No active attention items.</p>
                  </div>
                ) : (
                  <ul className='divide-y divide-border'>
                    {attentionQueue.slice(0, 8).map(device => (
                      <li key={device.device_id}>
                        <Link
                          to={`/devices/${device.device_id}`}
                          className='grid grid-cols-[1.2fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-muted/50 transition-colors'
                        >
                          <div>
                            <p className='text-sm font-semibold text-foreground'>{device.device_id}</p>
                            <p className='text-xs text-muted-foreground'>
                              {getDeviceDisplayValue(device.model_number)} • {getDeviceDisplayValue(device.serial_number)}
                            </p>
                          </div>
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                              statusBadgeClass[device.status]
                            } ${device.status === 'offline' ? 'status-pulse' : ''}`}
                          >
                            {getDeviceStatusLabel(device.status)}
                          </span>
                          <span className='text-xs text-muted-foreground whitespace-nowrap'>
                            {formatTimeAgo(device.updated_at)}
                          </span>
                          <span className='text-xs text-muted-foreground whitespace-nowrap'>
                            {device.last_rx_rssi !== undefined ? `${device.last_rx_rssi} dBm` : 'No RSSI'}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className='xl:col-span-4 space-y-6'>
                <div className='rounded-xl border border-border bg-card p-4'>
                  <h2 className='text-base font-semibold text-foreground'>Connectivity Mix</h2>
                  <div className='mt-4 space-y-3'>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='inline-flex items-center gap-2 text-muted-foreground'>
                        <FiWifi className='h-4 w-4 text-emerald-600' />
                        LoRA
                      </span>
                      <span className='font-semibold text-foreground'>{statusSummary.lora}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='inline-flex items-center gap-2 text-muted-foreground'>
                        <FiRadio className='h-4 w-4 text-blue-600' />
                        BLE
                      </span>
                      <span className='font-semibold text-foreground'>{statusSummary.ble}</span>
                    </div>
                    <div className='flex items-center justify-between text-sm'>
                      <span className='inline-flex items-center gap-2 text-muted-foreground'>
                        <FiAlertCircle className='h-4 w-4 text-slate-500' />
                        Unknown
                      </span>
                      <span className='font-semibold text-foreground'>{statusSummary.unknownLink}</span>
                    </div>
                  </div>
                </div>

                <div className='rounded-xl border border-border bg-card p-4'>
                  <h2 className='text-base font-semibold text-foreground'>Signal Health</h2>
                  <div className='mt-3 flex items-center justify-between text-sm'>
                    <span className='inline-flex items-center gap-2 text-muted-foreground'>
                      <FiXCircle className='h-4 w-4 text-amber-600' />
                      Weak RSSI (≤ -85 dBm)
                    </span>
                    <span className='font-semibold text-foreground'>{statusSummary.weakSignal}</span>
                  </div>
                  <p className='mt-2 text-xs text-muted-foreground'>
                    Use this to prioritize on-site investigation and communication channel shifts.
                  </p>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-border bg-card overflow-hidden'>
              <div className='flex items-center justify-between px-4 py-3 border-b border-border'>
                <h2 className='text-base font-semibold text-foreground'>Recent Check-ins</h2>
                <Link to='/devices' className='text-sm font-medium text-blue-700 hover:text-blue-800'>
                  View fleet
                </Link>
              </div>
              <ul className='divide-y divide-border'>
                {devices.slice(0, 6).map(device => {
                  const status = getDeviceStatus(device);
                  return (
                    <li key={device.device_id}>
                      <Link
                        to={`/devices/${device.device_id}`}
                        className='grid grid-cols-[1.2fr_auto_auto_auto] gap-3 items-center px-4 py-3 hover:bg-muted/50 transition-colors'
                      >
                        <div>
                          <p className='text-sm font-semibold text-foreground'>{device.device_id}</p>
                          <p className='text-xs text-muted-foreground'>
                            {getDeviceDisplayValue(device.model_number)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[status]}`}
                        >
                          {getDeviceStatusLabel(status)}
                        </span>
                        <span className='text-xs text-muted-foreground whitespace-nowrap'>
                          {formatTimeAgo(device.updated_at)}
                        </span>
                        <span className='text-xs text-muted-foreground whitespace-nowrap flex items-center gap-1'>
                          <FiActivity className='h-3.5 w-3.5' />
                          {getLinkTypeName(device.last_link_type)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default Dashboard;
