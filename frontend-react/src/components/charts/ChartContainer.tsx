import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { cn } from '../../lib/utils';
import { useTheme } from '../../hooks/use-theme';

/**
 * Container for all chart components with consistent styling and features
 * 
 * Features:
 * - Loading states with skeleton animation
 * - Error handling with retry functionality
 * - Export functionality (optional)
 * - Responsive sizing
 * - Dark mode integration
 * - Action buttons (export, fullscreen, etc.)
 * 
 * @example
 * <ChartContainer 
 *   title="Device Performance" 
 *   description="Power consumption over time"
 *   loading={isLoading}
 *   error={error}
 *   exportable
 * >
 *   <LineChart data={data} />
 * </ChartContainer>
 */
interface ChartContainerProps {
    title?: string;
    description?: string;
    loading?: boolean;
    error?: string | null;
    className?: string;
    children: React.ReactNode;
    exportable?: boolean;
    fullscreenEnabled?: boolean;
    onExport?: () => void;
    onFullscreen?: () => void;
    onRetry?: () => void;
    actions?: React.ReactNode;
}

export const ChartContainer: React.FC<ChartContainerProps> = ({
    title,
    description,
    loading = false,
    error,
    className,
    children,
    exportable = false,
    fullscreenEnabled = false,
    onExport,
    onFullscreen,
    onRetry,
    actions,
}) => {
    const { effectiveTheme } = useTheme();

    if (loading) {
        return (
            <Card className={cn('w-full', className)}>
                {title && (
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg font-semibold">
                                    {title}
                                </CardTitle>
                                {description && (
                                    <p className="text-sm text-gray-500 mt-1">{description}</p>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                )}
                <CardContent>
                    <ChartSkeleton />
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className={cn('w-full', className)}>
                {title && (
                    <CardHeader>
                        <CardTitle className="text-lg font-semibold">
                            {title}
                        </CardTitle>
                    </CardHeader>
                )}
                <CardContent>
                    <ChartError error={error} onRetry={onRetry} />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={cn('w-full', className)}>
            {(title || actions) && (
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            {title && (
                                <CardTitle className="text-lg font-semibold">
                                    {title}
                                </CardTitle>
                            )}
                            {description && (
                                <p className="text-sm text-gray-500 mt-1">{description}</p>
                            )}
                        </div>

                        {/* Chart Actions */}
                        <div className="flex items-center gap-2">
                            {exportable && (
                                <button
                                    onClick={onExport}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Export chart"
                                    aria-label="Export chart"
                                >
                                    <DownloadIcon className="h-4 w-4" />
                                </button>
                            )}

                            {fullscreenEnabled && (
                                <button
                                    onClick={onFullscreen}
                                    className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                    title="Fullscreen"
                                    aria-label="View fullscreen"
                                >
                                    <MaximizeIcon className="h-4 w-4" />
                                </button>
                            )}

                            {actions}
                        </div>
                    </div>
                </CardHeader>
            )}

            <CardContent className="pt-0">
                {children}
            </CardContent>
        </Card>
    );
};

/**
 * Skeleton loader for charts
 */
const ChartSkeleton: React.FC = () => (
    <div className="w-full h-80 animate-pulse">
        <div className="flex items-end justify-between h-full space-x-2">
            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    className="bg-gray-200 dark:bg-gray-700 rounded-t"
                    style={{
                        height: `${Math.random() * 60 + 20}%`,
                        width: '100%',
                    }}
                />
            ))}
        </div>

        {/* X-axis skeleton */}
        <div className="flex justify-between mt-4">
            {Array.from({ length: 5 }).map((_, i) => (
                <div
                    key={i}
                    className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-12"
                />
            ))}
        </div>
    </div>
);

/**
 * Error state for charts
 */
interface ChartErrorProps {
    error: string;
    onRetry?: () => void;
}

const ChartError: React.FC<ChartErrorProps> = ({ error, onRetry }) => (
    <div className="flex flex-col items-center justify-center h-80 text-center">
        <ErrorIcon className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to load chart
        </h3>
        <p className="text-sm text-gray-500 mb-4 max-w-sm">
            {error}
        </p>
        {onRetry && (
            <button
                onClick={onRetry}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
                Try Again
            </button>
        )}
    </div>
);

/**
 * Download icon for export functionality
 */
const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
    </svg>
);

/**
 * Maximize icon for fullscreen functionality
 */
const MaximizeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
        />
    </svg>
);

/**
 * Error icon for error states
 */
const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={className}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
    </svg>
);

export default ChartContainer;
