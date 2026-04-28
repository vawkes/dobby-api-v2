import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FiAlertCircle,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiSearch,
  FiWifiOff,
} from 'react-icons/fi';
import { deviceAPI } from '../services/api.ts';
import { Device } from '../types/index.ts';
import { DataTable, deviceColumns } from '../components/data/index.ts';
import { Button } from '../components/ui/Button.tsx';
import { DeviceStatus, getDeviceStatus, hoursSince } from '../utils/deviceStatus.ts';
import { getDeviceSearchText } from '../utils/deviceDisplay.ts';

const statusPriority: Record<DeviceStatus, number> = {
  offline: 0,
  no_data: 1,
  degraded: 2,
  online: 3,
  pending_install: 4,
};

const isAttentionStatus = (status: DeviceStatus): boolean =>
  status === 'offline' || status === 'degraded' || status === 'no_data';

const Devices: React.FC = () => {
  const navigate = useNavigate();
  const [devices, setDevices] = useState<Device[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null);

  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const filterParam = searchParams.get('filter') || 'all';

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
      pending_install: 0,
      weakSignal: 0,
    };

    for (const device of devices) {
      const status = getDeviceStatus(device);
      summary[status] += 1;
      if (device.last_rx_rssi !== undefined && device.last_rx_rssi <= -85) {
        summary.weakSignal += 1;
      }
    }

    return summary;
  }, [devices]);

  const filteredDevices = useMemo(() => {
    let result = devices.filter(device => {
      const status = getDeviceStatus(device);
      if (filterParam === 'attention') return isAttentionStatus(status);
      if (filterParam === 'healthy' || filterParam === 'online') return status === 'online';
      if (filterParam === 'degraded') return status === 'degraded';
      if (filterParam === 'offline') return status === 'offline';
      if (filterParam === 'no_data') return status === 'no_data';
      if (filterParam === 'pending_install') return status === 'pending_install';
      if (filterParam === 'weak_signal') return (device.last_rx_rssi ?? 0) <= -85;
      return true;
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(device => {
        return getDeviceSearchText(device).includes(term);
      });
    }

    return result.sort((a, b) => {
      const statusA = getDeviceStatus(a);
      const statusB = getDeviceStatus(b);
      const bySeverity = statusPriority[statusA] - statusPriority[statusB];
      if (bySeverity !== 0) return bySeverity;

      const ageA = hoursSince(a.updated_at);
      const ageB = hoursSince(b.updated_at);
      if (ageA === null && ageB === null) return 0;
      if (ageA === null) return -1;
      if (ageB === null) return 1;
      return ageB - ageA;
    });
  }, [devices, filterParam, searchTerm]);

  const attentionCount = statusSummary.offline + statusSummary.degraded + statusSummary.no_data;
  const attentionPct = devices.length > 0 ? Math.round((attentionCount / devices.length) * 100) : 0;

  return (
    <section aria-labelledby='devices-heading'>
      {isLoading ? (
        <div className='flex justify-center items-center h-64' role='status' aria-live='polite'>
          <div className='animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600' />
          <span className='sr-only'>Loading devices</span>
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
        <>
          <div className='mb-8'>
            <h1 id='devices-heading' className='text-3xl font-bold text-foreground'>
              Fleet Devices
            </h1>
            <p className='mt-2 text-muted-foreground'>
              Severity-sorted device list for utility operations triage.
            </p>
          </div>

          <div className='mb-6 rounded-xl border border-border bg-card p-4 md:p-5'>
            <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
              <div className='relative rounded-md max-w-md w-full' role='search'>
                <label htmlFor='devices-search' className='sr-only'>
                  Search devices by model, serial, type, firmware, or device ID
                </label>
                <div className='absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none'>
                  <FiSearch className='h-5 w-5 text-muted-foreground' />
                </div>
                <input
                  id='devices-search'
                  type='search'
                  className='focus:ring-blue-600 focus:border-blue-600 dark:focus:ring-blue-400 dark:focus:border-blue-400 block w-full pl-10 pr-12 py-2 sm:text-sm border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground'
                  placeholder='Search device ID, serial, model, type...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  spellCheck={false}
                  autoComplete='off'
                  aria-describedby='devices-results-summary'
                />
              </div>

              <div className='flex items-center gap-3'>
                <p className='text-xs text-muted-foreground flex items-center gap-1 whitespace-nowrap'>
                  <FiClock className='h-3.5 w-3.5' />
                  Last refresh: {lastRefreshAt ? lastRefreshAt.toLocaleTimeString() : 'Pending'}
                </p>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={fetchDevices}
                  icon={<FiRefreshCw className='h-4 w-4' />}
                >
                  Refresh
                </Button>
              </div>
            </div>

            <div className='mt-4 grid grid-cols-2 md:grid-cols-6 gap-3'>
              <div className='rounded-lg border border-red-200/60 dark:border-red-900/60 p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Attention</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{attentionCount}</p>
                <p className='text-xs text-muted-foreground'>{attentionPct}% of fleet</p>
              </div>
              <div className='rounded-lg border border-emerald-200/60 dark:border-emerald-900/60 p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Online</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{statusSummary.online}</p>
              </div>
              <div className='rounded-lg border border-amber-200/60 dark:border-amber-900/60 p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Degraded</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{statusSummary.degraded}</p>
              </div>
              <div className='rounded-lg border border-red-200/60 dark:border-red-900/60 p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Offline</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{statusSummary.offline}</p>
              </div>
              <div className='rounded-lg border border-blue-200/60 dark:border-blue-900/60 p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Pending Install</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{statusSummary.pending_install}</p>
              </div>
              <div className='rounded-lg border border-border p-3'>
                <p className='text-xs uppercase tracking-wide text-muted-foreground'>Weak RSSI</p>
                <p className='mt-1 text-xl font-semibold text-foreground'>{statusSummary.weakSignal}</p>
                <p className='text-xs text-muted-foreground'>≤ -85 dBm</p>
              </div>
            </div>

            <div className='mt-4 flex flex-wrap gap-2'>
              <Button
                variant={filterParam === 'all' ? 'primary' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices')}
              >
                All
              </Button>
              <Button
                variant={filterParam === 'attention' ? 'danger' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=attention')}
                icon={<FiAlertCircle className='h-4 w-4' />}
              >
                Attention
              </Button>
              <Button
                variant={filterParam === 'online' || filterParam === 'healthy' ? 'primary' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=online')}
                icon={<FiCheckCircle className='h-4 w-4' />}
                className={
                  filterParam === 'online' || filterParam === 'healthy'
                    ? 'bg-green-600 hover:bg-green-700 focus:ring-green-600'
                    : ''
                }
              >
                Online
              </Button>
              <Button
                variant={filterParam === 'degraded' ? 'danger' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=degraded')}
              >
                Degraded
              </Button>
              <Button
                variant={filterParam === 'offline' ? 'danger' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=offline')}
                icon={<FiWifiOff className='h-4 w-4' />}
              >
                Offline
              </Button>
              <Button
                variant={filterParam === 'no_data' ? 'danger' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=no_data')}
              >
                No Data
              </Button>
              <Button
                variant={filterParam === 'pending_install' ? 'primary' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=pending_install')}
              >
                Pending Install
              </Button>
              <Button
                variant={filterParam === 'weak_signal' ? 'danger' : 'outline'}
                size='sm'
                onClick={() => navigate('/devices?filter=weak_signal')}
              >
                Weak Signal
              </Button>
            </div>

            <p
              id='devices-results-summary'
              className='mt-3 text-sm text-muted-foreground'
              aria-live='polite'
            >
              Showing {filteredDevices.length} of {devices.length} devices. Sorted by severity first.
            </p>
          </div>

          <DataTable
            data={filteredDevices}
            columns={deviceColumns}
            loading={isLoading}
            error={error || undefined}
            globalFilter={searchTerm}
            onGlobalFilterChange={setSearchTerm}
            onRowClick={device => navigate(`/devices/${device.device_id}`)}
            emptyMessage='No devices found matching your criteria.'
            pageSize={25}
          />
        </>
      )}
    </section>
  );
};

export default Devices;
