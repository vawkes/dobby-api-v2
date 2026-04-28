import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { FiAlertCircle, FiCheckCircle, FiWifi, FiRadio } from 'react-icons/fi';
import { Device } from '../../types/index.ts';
import { cn } from '../../lib/utils.ts';
import DeviceTypeDisplay from '../ui/DeviceTypeDisplay.tsx';
import { getDeviceStatus, getDeviceStatusLabel, DeviceStatus } from '../../utils/deviceStatus.ts';
import { formatOptionalDate, getDeviceDisplayValue, sanitizeDeviceText } from '../../utils/deviceDisplay.ts';

const statusPriority: Record<DeviceStatus, number> = {
    offline: 0,
    no_data: 1,
    degraded: 2,
    online: 3,
};

const statusBadgeClass: Record<DeviceStatus, string> = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
    degraded: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
    offline: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
    no_data: 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
};

// Helper function to get link type name and icon
const getLinkTypeInfo = (linkType?: number): { name: string; icon: React.ReactNode; color: string } => {
    if (linkType === 1) {
        return {
            name: 'BLE',
            icon: <FiRadio className="h-4 w-4" />,
            color: 'text-blue-600'
        };
    }
    if (linkType === 4) {
        return {
            name: 'LoRA',
            icon: <FiWifi className="h-4 w-4" />,
            color: 'text-green-600'
        };
    }
    return {
        name: 'Unknown',
        icon: <FiRadio className="h-4 w-4" />,
        color: 'text-gray-500'
    };
};

// Helper function to check if a date is within 1 day of now
const isWithinOneDay = (dateString?: string): boolean => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        const now = new Date();
        const oneDayMs = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        return (now.getTime() - date.getTime()) < oneDayMs;
    } catch (e) {
        return false;
    }
};

// Format date for display
const formatDate = (dateString?: string): string => {
    return formatOptionalDate(dateString, 'Never');
};

/**
 * Device DataTable column definitions
 * Configured for responsive display with proper sorting and filtering
 */
export const deviceColumns: ColumnDef<Device>[] = [
    {
        id: 'status',
        header: 'Status',
        accessorFn: (device) => device.updated_at,
        cell: ({ row }) => {
            const device = row.original;
            const status = getDeviceStatus(device);
            const isOnline = status === 'online';

            return (
                <div className="flex items-center">
                    {isOnline ? (
                        <>
                            <FiCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusBadgeClass[status])}>
                                {getDeviceStatusLabel(status)}
                            </span>
                        </>
                    ) : (
                        <>
                            <FiAlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                            <span className={cn('px-2 py-1 text-xs font-medium rounded-full', statusBadgeClass[status])}>
                                {getDeviceStatusLabel(status)}
                            </span>
                        </>
                    )}
                </div>
            );
        },
        sortingFn: (rowA, rowB) => {
            const aStatus = getDeviceStatus(rowA.original);
            const bStatus = getDeviceStatus(rowB.original);
            return statusPriority[aStatus] - statusPriority[bStatus];
        },
    },
    {
        id: 'device_id',
        header: 'Device ID',
        accessorKey: 'device_id',
        cell: ({ getValue }) => (
            <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                {getDeviceDisplayValue(getValue<string>(), 'Unknown')}
            </span>
        ),
    },
    {
        id: 'model_number',
        header: 'Model',
        accessorKey: 'model_number',
        cell: ({ getValue }) => (
            <span className="text-sm text-foreground">
                {getDeviceDisplayValue(getValue<string>())}
            </span>
        ),
    },
    {
        id: 'serial_number',
        header: 'Serial Number',
        accessorKey: 'serial_number',
        cell: ({ getValue }) => (
            <span className="font-mono text-sm text-muted-foreground">
                {getDeviceDisplayValue(getValue<string>())}
            </span>
        ),
    },
    {
        id: 'device_type',
        header: 'Type',
        accessorKey: 'device_type',
        cell: ({ getValue }) => (
            <DeviceTypeDisplay
                deviceType={sanitizeDeviceText(getValue<string>())}
                className="text-sm text-foreground"
            />
        ),
    },
    {
        id: 'firmware_version',
        header: 'Firmware',
        accessorKey: 'firmware_version',
        cell: ({ getValue }) => (
            <span className="font-mono text-xs text-muted-foreground">
                {getDeviceDisplayValue(getValue<string>())}
            </span>
        ),
    },
    {
        id: 'link_type',
        header: 'Link Type',
        accessorKey: 'last_link_type',
        cell: ({ getValue }) => {
            const linkType = getValue<number>();
            const { name, icon, color } = getLinkTypeInfo(linkType);

            return (
                <div className="flex items-center">
                    <span className={cn('mr-2', color)}>
                        {icon}
                    </span>
                    <span className="text-sm text-foreground">
                        {name}
                    </span>
                </div>
            );
        },
        sortingFn: (rowA, rowB) => {
            const aType = rowA.original.last_link_type || 0;
            const bType = rowB.original.last_link_type || 0;
            return aType - bType;
        },
    },
    {
        id: 'rssi',
        header: 'RSSI',
        accessorKey: 'last_rx_rssi',
        cell: ({ getValue }) => {
            const rssi = getValue<number>();
            if (rssi === undefined) return <span className="text-muted-foreground">-</span>;

            // Color code RSSI values (typical ranges) with dark mode support
            const getRssiColor = (value: number): string => {
                if (value >= -50) return 'text-green-600 dark:text-green-400'; // Excellent
                if (value >= -70) return 'text-yellow-600 dark:text-yellow-400'; // Good
                if (value >= -85) return 'text-orange-600 dark:text-orange-400'; // Fair
                return 'text-red-600 dark:text-red-400'; // Poor
            };

            return (
                <span className={cn('text-sm font-mono', getRssiColor(rssi))}>
                    {rssi} dBm
                </span>
            );
        },
    },
    {
        id: 'updated_at',
        header: 'Last Seen',
        accessorKey: 'updated_at',
        cell: ({ getValue }) => {
            const date = getValue<string>();
            return (
                <div className="text-sm">
                    <div className="text-foreground">{formatDate(date)}</div>
                    {date && (
                        <div className="text-xs text-muted-foreground">
                            {isWithinOneDay(date) ? 'Recently active' : 'Inactive'}
                        </div>
                    )}
                </div>
            );
        },
        sortingFn: (rowA, rowB) => {
            const aDate = rowA.original.updated_at;
            const bDate = rowB.original.updated_at;

            // Handle null/undefined dates
            if (!aDate && !bDate) return 0;
            if (!aDate) return 1; // Put nulls at the end
            if (!bDate) return -1;

            return new Date(bDate).getTime() - new Date(aDate).getTime(); // Most recent first
        },
    },
];

/**
 * Simplified mobile column definitions for card layout
 * Shows only the most essential information
 */
export const deviceMobileColumns: ColumnDef<Device>[] = [
    {
        id: 'device_id',
        header: 'Device ID',
        accessorKey: 'device_id',
    },
    {
        id: 'status',
        header: 'Status',
        accessorFn: (device) => device.updated_at,
        cell: ({ row }) => {
            const device = row.original;
            return getDeviceStatusLabel(getDeviceStatus(device));
        },
    },
    {
        id: 'model_number',
        header: 'Model',
        accessorKey: 'model_number',
    },
    {
        id: 'updated_at',
        header: 'Last Seen',
        accessorKey: 'updated_at',
        cell: ({ getValue }) => formatDate(getValue<string>()),
    },
];

