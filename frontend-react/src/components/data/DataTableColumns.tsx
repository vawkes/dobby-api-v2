import React from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { FiAlertCircle, FiCheckCircle, FiWifi, FiRadio } from 'react-icons/fi';
import { Device } from '../../types/index.ts';
import { cn } from '../../lib/utils.ts';
import DeviceTypeDisplay from '../ui/DeviceTypeDisplay.tsx';

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
    if (!dateString) return 'Never';
    try {
        return new Date(dateString).toLocaleString();
    } catch (e) {
        return 'Invalid Date';
    }
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
            const isHealthy = device.updated_at ? isWithinOneDay(device.updated_at) : false;

            return (
                <div className="flex items-center">
                    {isHealthy ? (
                        <>
                            <FiCheckCircle className="h-4 w-4 text-green-600 dark:text-green-400 mr-2" />
                            <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200'
                            )}>
                                Healthy
                            </span>
                        </>
                    ) : (
                        <>
                            <FiAlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 mr-2" />
                            <span className={cn(
                                'px-2 py-1 text-xs font-medium rounded-full',
                                'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
                            )}>
                                Needs Attention
                            </span>
                        </>
                    )}
                </div>
            );
        },
        sortingFn: (rowA, rowB) => {
            const aHealthy = rowA.original.updated_at ? isWithinOneDay(rowA.original.updated_at) : false;
            const bHealthy = rowB.original.updated_at ? isWithinOneDay(rowB.original.updated_at) : false;

            if (aHealthy === bHealthy) return 0;
            return aHealthy ? 1 : -1; // Healthy devices first
        },
    },
    {
        id: 'device_id',
        header: 'Device ID',
        accessorKey: 'device_id',
        cell: ({ getValue }) => (
            <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
                {getValue<string>()}
            </span>
        ),
    },
    {
        id: 'model_number',
        header: 'Model',
        accessorKey: 'model_number',
        cell: ({ getValue }) => (
            <span className="text-sm text-foreground">
                {getValue<string>()}
            </span>
        ),
    },
    {
        id: 'serial_number',
        header: 'Serial Number',
        accessorKey: 'serial_number',
        cell: ({ getValue }) => (
            <span className="font-mono text-sm text-muted-foreground">
                {getValue<string>()}
            </span>
        ),
    },
    {
        id: 'device_type',
        header: 'Type',
        accessorKey: 'device_type',
        cell: ({ getValue }) => (
            <DeviceTypeDisplay
                deviceType={getValue<string>()}
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
                {getValue<string>()}
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
            const isHealthy = device.updated_at ? isWithinOneDay(device.updated_at) : false;
            return isHealthy ? 'Healthy' : 'Needs Attention';
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


