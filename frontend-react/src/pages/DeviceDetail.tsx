import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  FiActivity,
  FiAlertCircle,
  FiArrowLeft,
  FiClock,
  FiRefreshCw,
} from 'react-icons/fi';
import { deviceAPI } from '../services/api.ts';
import { Device, DeviceDataPoint } from '../types/index.ts';
import {
  CumulativeEnergyChart,
  InstantPowerChart,
  OperationalStateChart,
} from '../components/charts/index.ts';
import DeviceEvents from '../components/DeviceEvents.tsx';
import ScheduleEvent from '../components/ScheduleEvent.tsx';
import DeviceTypeDisplay from '../components/ui/DeviceTypeDisplay.tsx';

type DeviceStatus = 'online' | 'degraded' | 'offline' | 'no_data';

const getLinkTypeName = (linkType?: number): string => {
  if (linkType === 1) return 'BLE';
  if (linkType === 4) return 'LoRA';
  return 'Unknown';
};

const formatDate = (dateString?: string): string => {
  if (!dateString) return 'Unknown';
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return dateString;
  }
};

const hoursSince = (dateString?: string): number | null => {
  if (!dateString) return null;
  try {
    const date = new Date(dateString);
    const now = new Date();
    return (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  } catch (e) {
    return null;
  }
};

const formatTimeAgo = (dateString?: string): string => {
  if (!dateString) return 'No check-ins';
  const ageHours = hoursSince(dateString);
  if (ageHours === null) return 'Unknown';
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))}m ago`;
  if (ageHours < 24) return `${Math.round(ageHours)}h ago`;
  return `${Math.round(ageHours / 24)}d ago`;
};

const getDeviceStatus = (device: Device): DeviceStatus => {
  const ageHours = hoursSince(device.updated_at);
  if (ageHours === null) return 'no_data';
  if (ageHours > 24) return 'offline';
  if (ageHours > 4) return 'degraded';
  if (device.last_rx_rssi !== undefined && device.last_rx_rssi <= -85) return 'degraded';
  return 'online';
};

const statusLabel: Record<DeviceStatus, string> = {
  online: 'Online',
  degraded: 'Degraded',
  offline: 'Offline',
  no_data: 'No Data',
};

const statusBadgeClass: Record<DeviceStatus, string> = {
  online: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  offline: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  no_data: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

const DeviceDetail: React.FC = () => {
  const { deviceId } = useParams<{ deviceId: string }>();
  const [device, setDevice] = useState<Device | null>(null);
  const [deviceData, setDeviceData] = useState<DeviceDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dataError, setDataError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<number>(1);
  const [eventsKey, setEventsKey] = useState<number>(0);
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const fetchDeviceDetails = useCallback(async () => {
    if (!deviceId) {
      setError('Device ID is missing');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await deviceAPI.getDeviceById(deviceId);
      setDevice(data);
    } catch (err) {
      console.error('Error fetching device details:', err);
      setError('Failed to fetch device details. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  }, [deviceId]);

  const fetchDeviceData = useCallback(async () => {
    if (!deviceId) return;

    try {
      setIsLoadingData(true);
      setDataError(null);
      const data = await deviceAPI.getDeviceData(deviceId, timeRange);
      setDeviceData(data);
      setLastRefreshAt(new Date());
    } catch (err) {
      console.error('Error fetching device data:', err);
      setDataError('Failed to fetch device data. Please try again later.');
    } finally {
      setIsLoadingData(false);
    }
  }, [deviceId, timeRange]);

  useEffect(() => {
    void fetchDeviceDetails();
  }, [fetchDeviceDetails]);

  useEffect(() => {
    void fetchDeviceData();
  }, [fetchDeviceData]);

  const handleEventScheduled = () => {
    setEventsKey(prevKey => prevKey + 1);
  };

  const refreshAll = async () => {
    await Promise.all([fetchDeviceDetails(), fetchDeviceData()]);
  };

  const renderData = useMemo(
    () =>
      deviceData
        .map(item => {
          const timeMs = item.timestamp * 1000;
          const date = new Date(timeMs);
          return {
            ...item,
            timeMs,
            formattedTime: date.toLocaleTimeString(),
            formattedDate: date.toLocaleDateString(),
          };
        })
        .sort((a, b) => a.timeMs - b.timeMs),
    [deviceData],
  );

  const latestDataPoint = renderData.length > 0 ? renderData[renderData.length - 1] : null;

  return (
    <section aria-labelledby='device-detail-heading'>
      <div className='py-2'>
        {isLoading ? (
          <div className='flex justify-center items-center h-64'>
            <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600'></div>
          </div>
        ) : error || !device ? (
          <div className='bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500'>
            <div className='flex'>
              <div className='flex-shrink-0'>
                <FiAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
              </div>
              <div className='ml-3'>
                <p className='text-sm text-red-800 dark:text-red-200'>{error || 'Device not found'}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
              <div>
                <Link to='/devices' className='inline-flex items-center text-blue-600 hover:text-blue-800'>
                  <FiArrowLeft className='mr-2' />
                  Back to Fleet
                </Link>
                <h1 id='device-detail-heading' className='mt-3 text-3xl font-bold text-foreground'>
                  {device.device_id}
                </h1>
                <p className='mt-1 text-sm text-muted-foreground'>
                  {device.model_number} • {device.serial_number}
                </p>
              </div>
              <div className='flex items-center gap-3'>
                <p className='text-xs text-muted-foreground flex items-center gap-1'>
                  <FiClock className='h-3.5 w-3.5' />
                  Last chart refresh: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : 'Pending'}
                </p>
                <button
                  type='button'
                  onClick={refreshAll}
                  className='inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors'
                >
                  <FiRefreshCw className='h-4 w-4' />
                  Refresh
                </button>
              </div>
            </div>

            <div className='rounded-xl border border-border bg-card p-4 md:p-5'>
              <div className='grid grid-cols-2 md:grid-cols-5 gap-3'>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Status</p>
                  <p className='mt-2'>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass[getDeviceStatus(device)]} ${
                        getDeviceStatus(device) === 'offline' ? 'status-pulse' : ''
                      }`}
                    >
                      {statusLabel[getDeviceStatus(device)]}
                    </span>
                  </p>
                </div>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Last Check-in</p>
                  <p className='mt-1 text-lg font-semibold text-foreground'>{formatTimeAgo(device.updated_at)}</p>
                  <p className='text-xs text-muted-foreground'>{formatDate(device.updated_at)}</p>
                </div>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Link</p>
                  <p className='mt-1 text-lg font-semibold text-foreground'>{getLinkTypeName(device.last_link_type)}</p>
                </div>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>RSSI</p>
                  <p className='mt-1 text-lg font-semibold text-foreground'>
                    {device.last_rx_rssi !== undefined ? `${device.last_rx_rssi} dBm` : 'No RSSI'}
                  </p>
                </div>
                <div className='rounded-lg border border-border p-3'>
                  <p className='text-xs uppercase tracking-wide text-muted-foreground'>Firmware</p>
                  <p className='mt-1 text-lg font-semibold text-foreground'>{device.firmware_version}</p>
                </div>
              </div>
            </div>

            <div className='bg-card shadow overflow-hidden sm:rounded-lg'>
              <div className='px-4 py-5 sm:px-6 flex flex-col gap-3 md:flex-row md:justify-between md:items-center'>
                <div>
                  <h3 className='text-lg leading-6 font-medium text-card-foreground'>Telemetry Trends</h3>
                  <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>
                    Power, energy, and operational state for selected window.
                  </p>
                </div>
                <div className='flex items-center gap-4'>
                  <select
                    value={timeRange}
                    onChange={e => setTimeRange(Number(e.target.value))}
                    className='block w-full pl-3 pr-10 py-2 text-base border-border bg-background text-foreground focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md'
                  >
                    <option value={1}>Last 24 Hours</option>
                    <option value={7}>Last 7 Days</option>
                    <option value={30}>Last 30 Days</option>
                  </select>
                </div>
              </div>

              {latestDataPoint && (
                <div className='px-4 pb-4'>
                  <div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
                    <div className='rounded-lg border border-border p-3'>
                      <p className='text-xs uppercase tracking-wide text-muted-foreground'>Latest Power</p>
                      <p className='mt-1 text-lg font-semibold text-foreground'>
                        {latestDataPoint.instant_power ?? 'N/A'} W
                      </p>
                    </div>
                    <div className='rounded-lg border border-border p-3'>
                      <p className='text-xs uppercase tracking-wide text-muted-foreground'>Cumulative Energy</p>
                      <p className='mt-1 text-lg font-semibold text-foreground'>
                        {latestDataPoint.cumulative_energy ?? 'N/A'} kWh
                      </p>
                    </div>
                    <div className='rounded-lg border border-border p-3'>
                      <p className='text-xs uppercase tracking-wide text-muted-foreground'>Operational State</p>
                      <p className='mt-1 text-lg font-semibold text-foreground'>
                        {latestDataPoint.operational_state ?? 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className='border-t border-border'>
                {isLoadingData ? (
                  <div className='flex justify-center items-center h-64'>
                    <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600'></div>
                  </div>
                ) : dataError ? (
                  <div className='bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500'>
                    <div className='flex'>
                      <div className='flex-shrink-0'>
                        <FiAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
                      </div>
                      <div className='ml-3'>
                        <p className='text-sm text-red-800 dark:text-red-200'>{dataError}</p>
                      </div>
                    </div>
                  </div>
                ) : deviceData.length === 0 ? (
                  <div className='p-6 text-center text-muted-foreground'>
                    <FiActivity className='h-12 w-12 mx-auto text-muted-foreground' />
                    <p className='mt-2'>No telemetry data available for this device.</p>
                  </div>
                ) : (
                  <div className='p-4'>
                    <div className='grid grid-cols-1 gap-6'>
                      <InstantPowerChart
                        data={renderData}
                        loading={isLoadingData}
                        error={dataError}
                        timeRange={`${timeRange}d`}
                        exportable={true}
                        onRetry={fetchDeviceData}
                      />

                      <CumulativeEnergyChart
                        data={renderData}
                        loading={isLoadingData}
                        error={dataError}
                        timeRange={`${timeRange}d`}
                        exportable={true}
                        onRetry={fetchDeviceData}
                      />

                      <OperationalStateChart
                        data={renderData}
                        loading={isLoadingData}
                        error={dataError}
                        timeRange={`${timeRange}d`}
                        exportable={true}
                        onRetry={fetchDeviceData}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className='grid grid-cols-1 xl:grid-cols-12 gap-6'>
              <div className='xl:col-span-5 bg-card shadow overflow-hidden sm:rounded-lg'>
                <div className='px-4 py-5 sm:px-6'>
                  <h3 className='text-lg leading-6 font-medium text-card-foreground'>Asset Profile</h3>
                  <p className='mt-1 max-w-2xl text-sm text-muted-foreground'>
                    Hardware and firmware identifiers for field operations.
                  </p>
                </div>
                <div className='border-t border-border'>
                  <dl className='divide-y divide-border'>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>Device Type</dt>
                      <dd className='text-sm text-card-foreground text-right'>
                        <DeviceTypeDisplay deviceType={device.device_type} />
                      </dd>
                    </div>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>Firmware Date</dt>
                      <dd className='text-sm text-card-foreground text-right'>{device.firmware_date}</dd>
                    </div>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>CTA Version</dt>
                      <dd className='text-sm text-card-foreground text-right'>{device.cta_version}</dd>
                    </div>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>Vendor ID</dt>
                      <dd className='text-sm text-card-foreground text-right'>{device.vendor_id}</dd>
                    </div>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>Device Revision</dt>
                      <dd className='text-sm text-card-foreground text-right'>{device.device_revision}</dd>
                    </div>
                    <div className='px-4 py-3 flex items-start justify-between gap-3'>
                      <dt className='text-sm text-muted-foreground'>Capability Bitmap</dt>
                      <dd className='text-sm text-card-foreground text-right'>{device.capability_bitmap}</dd>
                    </div>
                    {device.gridcube_firmware_version && (
                      <div className='px-4 py-3 flex items-start justify-between gap-3'>
                        <dt className='text-sm text-muted-foreground'>GridCube Firmware</dt>
                        <dd className='text-sm text-card-foreground text-right'>
                          {device.gridcube_firmware_version}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <div className='xl:col-span-7 space-y-6'>
                {deviceId && (
                  <ScheduleEvent deviceId={deviceId || ''} onEventScheduled={handleEventScheduled} />
                )}
                {deviceId && <DeviceEvents key={eventsKey} deviceId={deviceId || ''} />}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default DeviceDetail;
