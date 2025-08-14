/**
 * Enhanced Charts Module
 * 
 * A comprehensive charting system built on top of recharts with:
 * - Theme integration (light/dark mode)
 * - Mobile-responsive design
 * - Touch-friendly interactions
 * - Export functionality
 * - Loading and error states
 * - Consistent styling across all charts
 */

// Core chart components
export { ChartContainer } from './ChartContainer';
export { LineChart } from './LineChart';
export { ChartTooltip, SimpleTooltip } from './ChartTooltip';

// Specialized device charts
export {
  DeviceChart,
  InstantPowerChart,
  CumulativeEnergyChart,
  OperationalStateChart,
  MultiMetricChart,
} from './DeviceChart';

// Theme and configuration
export {
  chartThemes,
  getChartTheme,
  getChartColors,
  chartStyles,
  chartDimensions,
  chartAnimations,
  defaultExportConfig,
} from './chart-theme';
export type { ChartTheme, ExportConfig } from './chart-theme';

// Hooks
export { useChartInteractions } from '../../hooks/use-chart-interactions';
