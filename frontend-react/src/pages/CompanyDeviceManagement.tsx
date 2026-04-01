import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiAlertCircle, FiLink2, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { companiesAPI } from '../services/api';
import { Button } from '../components/ui/Button';

interface Company {
  id: string;
  name: string;
}

interface CompanyDevice {
  device_id: string;
  assigned_at?: string;
  location?: string;
}

const deviceIdRegex = /^\d{6}$/;

const CompanyDeviceManagement: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [companyDevices, setCompanyDevices] = useState<CompanyDevice[]>([]);
  const [deviceId, setDeviceId] = useState('');
  const [location, setLocation] = useState('');
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCompanyName = useMemo(
    () => companies.find((company) => company.id === selectedCompanyId)?.name ?? '',
    [companies, selectedCompanyId]
  );

  const loadCompanies = useCallback(async () => {
    try {
      setIsLoadingCompanies(true);
      setError(null);
      const data = await companiesAPI.getCompanies();
      setCompanies(data ?? []);
      if (data?.length > 0) {
        setSelectedCompanyId((previous) => previous || data[0].id);
      } else {
        setSelectedCompanyId('');
      }
    } catch (loadError) {
      console.error('Failed to load companies:', loadError);
      setError('Failed to load companies.');
    } finally {
      setIsLoadingCompanies(false);
    }
  }, []);

  const loadCompanyDevices = useCallback(async (companyId: string) => {
    if (!companyId) {
      setCompanyDevices([]);
      return;
    }

    try {
      setIsLoadingDevices(true);
      setError(null);
      const data = await companiesAPI.getCompanyDevices(companyId);
      setCompanyDevices(data ?? []);
    } catch (loadError) {
      console.error('Failed to load company devices:', loadError);
      setError('Failed to load devices for selected company.');
    } finally {
      setIsLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
  }, [loadCompanies]);

  useEffect(() => {
    loadCompanyDevices(selectedCompanyId);
  }, [loadCompanyDevices, selectedCompanyId]);

  const handleAssignDevice = async () => {
    if (!selectedCompanyId) {
      setError('Select a company first.');
      return;
    }

    if (!deviceIdRegex.test(deviceId)) {
      setError('Device ID must be exactly 6 digits.');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      await companiesAPI.addDeviceToCompany(selectedCompanyId, {
        device_id: deviceId,
        location: location.trim() || undefined,
      });
      setDeviceId('');
      setLocation('');
      await loadCompanyDevices(selectedCompanyId);
    } catch (assignError) {
      console.error('Failed to assign device:', assignError);
      setError('Failed to assign device to company.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveDevice = async (targetDeviceId: string) => {
    if (!selectedCompanyId) return;

    try {
      setIsSaving(true);
      setError(null);
      await companiesAPI.removeDeviceFromCompany(selectedCompanyId, targetDeviceId);
      await loadCompanyDevices(selectedCompanyId);
    } catch (removeError) {
      console.error('Failed to remove device:', removeError);
      setError('Failed to remove device from company.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section aria-labelledby='company-device-management-heading' className='py-2'>
      <div className='mb-8'>
        <h1 id='company-device-management-heading' className='text-3xl font-bold text-foreground'>
          Company Device Management
        </h1>
        <p className='mt-2 text-muted-foreground'>Internal tools for assigning and unassigning devices by company.</p>
      </div>

      {error && (
        <div className='bg-red-50 border-l-4 border-red-600 p-4 mb-4 dark:bg-red-900/20 dark:border-red-500'>
          <div className='flex'>
            <FiAlertCircle className='h-5 w-5 text-red-600 dark:text-red-400' />
            <p className='ml-3 text-sm text-red-800 dark:text-red-200'>{error}</p>
          </div>
        </div>
      )}

      <div className='rounded-xl border border-border bg-card p-4 md:p-5 space-y-5'>
        <div className='flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
          <div className='w-full md:max-w-xl'>
            <label htmlFor='company-select' className='block text-sm font-medium text-foreground'>
              Company
            </label>
            <select
              id='company-select'
              className='mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-600 focus:ring-blue-600'
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
              disabled={isLoadingCompanies || companies.length === 0}
            >
              {companies.length === 0 ? (
                <option value=''>No companies available</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              )}
            </select>
          </div>

          <Button
            variant='outline'
            size='sm'
            onClick={() => loadCompanyDevices(selectedCompanyId)}
            icon={<FiRefreshCw className='h-4 w-4' />}
            disabled={!selectedCompanyId || isLoadingDevices}
          >
            Refresh Devices
          </Button>
        </div>

        <div className='rounded-lg border border-border p-4'>
          <h2 className='text-lg font-semibold text-foreground'>Assign Device</h2>
          <p className='mt-1 text-sm text-muted-foreground'>Assign a device to {selectedCompanyName || 'the selected company'}.</p>
          <div className='mt-4 grid grid-cols-1 md:grid-cols-3 gap-3'>
            <div>
              <label htmlFor='device-id-input' className='block text-sm font-medium text-foreground'>
                Device ID (6 digits)
              </label>
              <input
                id='device-id-input'
                type='text'
                inputMode='numeric'
                maxLength={6}
                className='mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-600 focus:ring-blue-600'
                placeholder='000123'
                value={deviceId}
                onChange={(event) => setDeviceId(event.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className='md:col-span-2'>
              <label htmlFor='device-location-input' className='block text-sm font-medium text-foreground'>
                Location (optional)
              </label>
              <input
                id='device-location-input'
                type='text'
                className='mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-blue-600 focus:ring-blue-600'
                placeholder='Building A - Room 101'
                value={location}
                onChange={(event) => setLocation(event.target.value)}
              />
            </div>
          </div>
          <div className='mt-4'>
            <Button
              variant='primary'
              onClick={handleAssignDevice}
              icon={<FiLink2 className='h-4 w-4' />}
              disabled={!selectedCompanyId || isSaving}
            >
              Assign Device
            </Button>
          </div>
        </div>

        <div className='rounded-lg border border-border p-4'>
          <h2 className='text-lg font-semibold text-foreground'>Assigned Devices</h2>
          <p className='mt-1 text-sm text-muted-foreground'>
            {selectedCompanyName ? `${selectedCompanyName} currently has ${companyDevices.length} assigned devices.` : 'Select a company to view devices.'}
          </p>

          {isLoadingDevices ? (
            <div className='mt-4 text-sm text-muted-foreground'>Loading devices...</div>
          ) : companyDevices.length === 0 ? (
            <div className='mt-4 text-sm text-muted-foreground'>No devices assigned.</div>
          ) : (
            <div className='mt-4 overflow-x-auto'>
              <table className='min-w-full divide-y divide-border'>
                <thead>
                  <tr>
                    <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Device ID</th>
                    <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Assigned At</th>
                    <th className='px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-border'>
                  {companyDevices.map((device) => (
                    <tr key={device.device_id}>
                      <td className='px-3 py-2 text-sm font-medium text-foreground'>{device.device_id}</td>
                      <td className='px-3 py-2 text-sm text-muted-foreground'>
                        {device.assigned_at ? new Date(device.assigned_at).toLocaleString() : 'N/A'}
                      </td>
                      <td className='px-3 py-2 text-sm'>
                        <Button
                          variant='danger'
                          size='sm'
                          onClick={() => handleRemoveDevice(device.device_id)}
                          icon={<FiTrash2 className='h-4 w-4' />}
                          disabled={isSaving}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default CompanyDeviceManagement;

