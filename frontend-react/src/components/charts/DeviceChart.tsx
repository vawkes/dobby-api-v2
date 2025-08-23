import React, { useMemo } from 'react';
import { ChartContainer } from './ChartContainer';
import { LineChart } from './LineChart';
import { useChartInteractions } from '../../hooks/use-chart-interactions';
import { useMediaQuery } from '../../hooks/use-media-query';

/**
 * Enhanced DeviceChart component for displaying device performance data
 * 
 * Features:
 * - Multiple chart types (instant_power, cumulative_energy, operational_state)
 * - Mobile-optimized interactions
 * - Export functionality
 * - Dark mode support
 * - Loading and error states
 * - Time range filtering
 * 
 * @example
 * <DeviceChart 
 *   data={deviceData}
 *   type="instant_power"
 *   timeRange="24h"
 *   title="Device Performance"
 *   exportable
 * />
 */
interface DeviceDataPoint {
    timestamp: number;
    timeMs: number;
    formattedTime: string;
    formattedDate: string;
    instant_power?: number;
    cumulative_energy?: number;
    operational_state?: number;
    isVirtual?: boolean;
}

interface DeviceChartProps {
    data: DeviceDataPoint[];
    type: 'instant_power' | 'cumulative_energy' | 'operational_state' | 'multi';
    title?: string;
    description?: string;
    timeRange?: string;
    loading?: boolean;
    error?: string | null;
    exportable?: boolean;
    className?: string;
    onRetry?: () => void;
}

export const DeviceChart: React.FC<DeviceChartProps> = ({
    data,
    type,
    title,
    description,
    timeRange = '24h',
    loading = false,
    error = null,
    exportable = true,
    className,
    onRetry,
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');

    const {
        exportChart,
        chartRef,
    } = useChartInteractions({
        data,
        exportConfig: {
            filename: `device-${type}-${timeRange}`,
        },
    });

    // Chart configuration based on type
    const chartConfig = useMemo(() => {
        switch (type) {
            case 'instant_power':
                return {
                    title: title || 'Instant Power',
                    description: description || 'Real-time power consumption',
                    lines: [
                        {
                            dataKey: 'instant_power',
                            name: 'Instant Power',
                            unit: 'W',
                        }
                    ],
                    yAxisLabel: 'Power (W)',
                    domain: [0, 'auto'] as [number, string],
                };

            case 'cumulative_energy':
                // Calculate min and max values from the data for auto-scaling
                const energyValues = data.map(d => d.cumulative_energy).filter(v => v !== undefined) as number[];
                const minEnergy = energyValues.length > 0 ? Math.min(...energyValues) : 0;
                const maxEnergy = energyValues.length > 0 ? Math.max(...energyValues) : 0;
                const padding = (maxEnergy - minEnergy) * 0.05; // 5% padding

                return {
                    title: title || 'Cumulative Energy',
                    description: description || 'Total energy consumption over time',
                    lines: [
                        {
                            dataKey: 'cumulative_energy',
                            name: 'Cumulative Energy',
                            unit: 'kWh',
                        }
                    ],
                    yAxisLabel: 'Energy (kWh)',
                    domain: [Math.max(0, minEnergy - padding), maxEnergy + padding], // Auto-scale with padding, ensuring it doesn't go below 0
                };

            case 'operational_state':
                return {
                    title: title || 'Operational State',
                    description: description || 'Device operational status over time',
                    lines: [
                        {
                            dataKey: 'operational_state',
                            name: 'Operational State',
                            unit: '',
                        }
                    ],
                    yAxisLabel: 'State',
                    domain: [0, 'auto'] as [number, string],
                };

            case 'multi':
                return {
                    title: title || 'Device Overview',
                    description: description || 'Combined device metrics',
                    lines: [
                        {
                            dataKey: 'instant_power',
                            name: 'Power',
                            unit: 'W',
                        },
                        {
                            dataKey: 'cumulative_energy',
                            name: 'Energy',
                            unit: 'kWh',
                        }
                    ],
                    yAxisLabel: 'Mixed Units',
                    domain: ['auto', 'auto'] as [string, string],
                };

            default:
                return {
                    title: title || 'Device Data',
                    description: description || 'Device performance metrics',
                    lines: [],
                    yAxisLabel: '',
                    domain: ['auto', 'auto'] as [string, string],
                };
        }
    }, [type, title, description]);

    // Format X-axis (time)
    const formatXAxis = (tickItem: number) => {
        const date = new Date(tickItem);
        const now = new Date();
        const diffInHours = Math.abs(now.getTime() - date.getTime()) / (1000 * 60 * 60);

        if (isMobile) {
            // Mobile: Show only time for recent data
            if (diffInHours < 24) {
                return date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } else {
                return date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                });
            }
        } else {
            // Desktop: More detailed formatting
            if (diffInHours < 1) {
                return date.toLocaleTimeString(undefined, {
                    minute: '2-digit',
                    second: '2-digit',
                });
            } else if (diffInHours < 24) {
                return date.toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                });
            } else {
                return date.toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                });
            }
        }
    };

    // Format Y-axis values
    const formatYAxis = (value: number) => {
        if (typeof value !== 'number') return String(value);

        // For large numbers, use K/M notation
        if (Math.abs(value) >= 1000000) {
            return `${(value / 1000000).toFixed(1)}M`;
        } else if (Math.abs(value) >= 1000) {
            return `${(value / 1000).toFixed(1)}K`;
        } else if (value % 1 === 0) {
            return value.toString();
        } else {
            return value.toFixed(2);
        }
    };

    // Handle export
    const handleExport = () => {
        exportChart('png');
    };

    return (
        <div ref={chartRef} className={className}>
            <ChartContainer
                title={chartConfig.title}
                description={chartConfig.description}
                loading={loading}
                error={error}
                exportable={exportable}
                onExport={handleExport}
                onRetry={onRetry}
            >
                <LineChart
                    data={data}
                    lines={chartConfig.lines}
                    xAxisKey="timeMs"
                    formatXAxis={formatXAxis}
                    formatYAxis={formatYAxis}
                    xAxisLabel="Time"
                    yAxisLabel={chartConfig.yAxisLabel}
                    domain={chartConfig.domain}
                    showGrid={true}
                    showLegend={!isMobile && type === 'multi'}
                    showDots={false}
                />
            </ChartContainer>
        </div>
    );
};

/**
 * Specialized chart for instant power data
 */
export const InstantPowerChart: React.FC<Omit<DeviceChartProps, 'type'>> = (props) => (
    <DeviceChart {...props} type="instant_power" />
);

/**
 * Specialized chart for cumulative energy data
 */
export const CumulativeEnergyChart: React.FC<Omit<DeviceChartProps, 'type'>> = (props) => (
    <DeviceChart {...props} type="cumulative_energy" />
);

/**
 * Specialized chart for operational state data
 */
export const OperationalStateChart: React.FC<Omit<DeviceChartProps, 'type'>> = (props) => (
    <DeviceChart {...props} type="operational_state" />
);

/**
 * Multi-metric chart showing multiple data series
 */
export const MultiMetricChart: React.FC<Omit<DeviceChartProps, 'type'>> = (props) => (
    <DeviceChart {...props} type="multi" />
);

export default DeviceChart;
