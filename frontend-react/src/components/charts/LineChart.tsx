import React, { useMemo } from 'react';
import {
    LineChart as RechartsLineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';
import { useTheme } from '../../hooks/use-theme';
import { useMediaQuery } from '../../hooks/use-media-query';
import { getChartTheme, getChartColors, chartStyles, chartDimensions } from './chart-theme';
import { ChartTooltip } from './ChartTooltip';

/**
 * Enhanced LineChart component with theme integration and mobile optimization
 *
 * Features:
 * - Automatic dark/light theme detection
 * - Mobile-responsive dimensions and interactions
 * - Custom tooltip with consistent styling
 * - Multiple data series support
 * - Touch-friendly interactions
 * - Smooth animations
 *
 * @example
 * <LineChart
 *   data={deviceData}
 *   lines={[
 *     { dataKey: 'power_level', name: 'Power Level', unit: 'W' },
 *     { dataKey: 'energy', name: 'Energy', unit: 'kWh' }
 *   ]}
 *   xAxisKey="timestamp"
 *   formatXAxis={formatTime}
 * />
 */
interface LineConfig {
    dataKey: string;
    name: string;
    unit?: string;
    color?: string;
    strokeWidth?: number;
    strokeDashArray?: string;
    dot?: boolean;
}

interface LineChartProps {
    data: any[];
    lines: LineConfig[];
    xAxisKey: string;
    formatXAxis?: (value: any) => string;
    formatYAxis?: (value: any) => string;
    xAxisLabel?: string;
    yAxisLabel?: string;
    showGrid?: boolean;
    showLegend?: boolean;
    showDots?: boolean;
    height?: number;
    domain?: [number | string, number | string];
    className?: string;
}

// Format x-axis tick based on time range
const formatXAxisTick = (timeMs: number, timeRangeMs: number): string => {
    const date = new Date(timeMs);
    
    // Less than an hour - show minutes and seconds (HH:mm:ss)
    if (timeRangeMs < 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
    
    // Less than a day - show hours and minutes (HH:mm)
    if (timeRangeMs < 24 * 60 * 60 * 1000) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Less than a month - show day and month (MMM DD)
    if (timeRangeMs < 30 * 24 * 60 * 60 * 1000) {
        return date.toLocaleDateString([], { month: 'short', day: '2-digit' });
    }
    
    // Greater than a month - show month and year (MMM YYYY)
    return date.toLocaleDateString([], { month: 'short', year: 'numeric' });
};

export const LineChart: React.FC<LineChartProps> = ({
    data,
    lines,
    xAxisKey,
    formatXAxis,
    formatYAxis,
    xAxisLabel,
    yAxisLabel,
    showGrid = true,
    showLegend = true,
    showDots = false,
    height,
    domain,
    className,
}) => {
    const { effectiveTheme } = useTheme();
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTablet = useMediaQuery('(max-width: 1024px)');

    const theme = getChartTheme(effectiveTheme === 'dark');
    const colors = getChartColors(effectiveTheme === 'dark');

    // Responsive dimensions
    const dimensions = useMemo(() => {
        if (isMobile) return chartDimensions.mobile;
        if (isTablet) return chartDimensions.tablet;
        return chartDimensions.desktop;
    }, [isMobile, isTablet]);

    const chartHeight = height || dimensions.height;

    // Calculate min and max time from data
    const timeDomain = useMemo(() => {
        if (!data || data.length === 0) return [0, 1]; // Default domain if no data
        
        const timeValues = data.map(d => d.timeMs).filter(t => typeof t === 'number');
        if (timeValues.length === 0) return [0, 1]; // Default domain if no valid time values
        
        const minTime = Math.min(...timeValues);
        const maxTime = Math.max(...timeValues);
        return [minTime, maxTime];
    }, [data]);

    // Calculate time range from data (for existing tickFormatter)
    const timeRange = useMemo(() => {
        const [minTime, maxTime] = timeDomain;
        return maxTime - minTime;
    }, [timeDomain]);

    // Assign colors to lines
    const linesWithColors = useMemo(() =>
        lines.map((line, index) => ({
            ...line,
            color: line.color || colors[index % colors.length],
        })),
        [lines, colors]
    );

    return (
        <div className={className} style={{ height: chartHeight }}>
            <ResponsiveContainer width="100%" height="100%">
                <RechartsLineChart
                    data={data}
                    margin={dimensions.margin}
                >
                    {/* Grid */}
                    {showGrid && (
                        <CartesianGrid
                            stroke={theme.grid}
                            {...chartStyles.cartesianGrid}
                        />
                    )}

                    {/* X Axis */}
                    <XAxis
                        type="number"
                        dataKey="timeMs"
                        domain={timeDomain}
                        stroke={theme.axis.line}
                        tick={{
                            fill: theme.axis.tick,
                            fontSize: isMobile ? 10 : chartStyles.axis.fontSize
                        }}
                        axisLine={{ stroke: theme.axis.line }}
                        tickLine={{ stroke: theme.axis.line }}
                        tickFormatter={(timeMs) => formatXAxisTick(timeMs, timeRange)}
                        label={xAxisLabel ? {
                            value: xAxisLabel,
                            position: 'insideBottom',
                            offset: -10,
                            style: {
                                textAnchor: 'middle',
                                fill: theme.axis.label,
                                fontSize: isMobile ? 10 : 12,
                            }
                        } : undefined}
                        interval="preserveStartEnd"
                    />

                    {/* Y Axis */}
                    <YAxis
                        stroke={theme.axis.line}
                        tick={{
                            fill: theme.axis.tick,
                            fontSize: isMobile ? 10 : chartStyles.axis.fontSize
                        }}
                        tickFormatter={formatYAxis}
                        axisLine={{ stroke: theme.axis.line }}
                        tickLine={{ stroke: theme.axis.line }}
                        domain={domain || ['auto', 'auto']}
                        label={yAxisLabel ? {
                            value: yAxisLabel,
                            angle: -90,
                            position: 'insideLeft',
                            style: {
                                textAnchor: 'middle',
                                fill: theme.axis.label,
                                fontSize: isMobile ? 10 : 12,
                            }
                        } : undefined}
                    />

                    {/* Tooltip */}
                    <Tooltip
                        content={<ChartTooltip />}
                        cursor={{
                            stroke: theme.primary,
                            strokeWidth: 1,
                            strokeDasharray: '5 5',
                        }}
                        contentStyle={{
                            ...chartStyles.tooltip.contentStyle,
                            backgroundColor: theme.card,
                            border: `1px solid ${theme.border}`,
                            color: theme.text.primary,
                        }}
                    />

                    {/* Legend */}
                    {showLegend && !isMobile && (
                        <Legend
                            wrapperStyle={{
                                fontSize: chartStyles.legend.fontSize,
                                fontFamily: chartStyles.legend.fontFamily,
                                color: theme.text.secondary,
                            }}
                        />
                    )}

                    {/* Lines */}
                    {linesWithColors.map((line) => (
                        <Line
                            key={line.dataKey}
                            type="stepAfter"
                            dataKey={line.dataKey}
                            name={line.name}
                            stroke={line.color}
                            strokeWidth={line.strokeWidth || 2}
                            strokeDasharray={line.strokeDashArray}
                            dot={showDots && !isMobile ? {
                                fill: line.color,
                                strokeWidth: 0,
                                r: 3
                            } : false}
                            activeDot={{
                                r: isMobile ? 4 : 6,
                                stroke: line.color,
                                strokeWidth: 2,
                                fill: theme.background,
                            }}
                            animationDuration={300}
                            animationEasing="ease-out"
                        />
                    ))}
                </RechartsLineChart>
            </ResponsiveContainer>
        </div>
    );
};

export default LineChart;
