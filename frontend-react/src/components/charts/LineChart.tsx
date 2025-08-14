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
                        dataKey={xAxisKey}
                        stroke={theme.axis.line}
                        tick={{
                            fill: theme.axis.tick,
                            fontSize: isMobile ? 10 : chartStyles.axis.fontSize
                        }}
                        tickFormatter={formatXAxis}
                        axisLine={{ stroke: theme.axis.line }}
                        tickLine={{ stroke: theme.axis.line }}
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
                        interval={isMobile ? 'preserveStartEnd' : 0}
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
                            type="monotone"
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
