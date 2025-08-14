import { useState, useCallback, useRef } from 'react';
import { useMediaQuery } from './use-media-query';
import { useTouch } from './use-media-query';
import type { ExportConfig } from '../components/charts/chart-theme';

/**
 * Hook for managing chart interactions, zooming, and export functionality
 * Provides touch-optimized interactions for mobile devices
 * 
 * @example
 * const {
 *   isZoomed,
 *   zoomDomain,
 *   handleZoom,
 *   resetZoom,
 *   exportChart,
 *   isFullscreen,
 *   toggleFullscreen
 * } = useChartInteractions({
 *   data: chartData,
 *   exportConfig: { filename: 'device-performance' }
 * });
 */
interface UseChartInteractionsProps {
    data?: any[];
    exportConfig?: Partial<ExportConfig>;
    onExport?: (config: ExportConfig) => void;
}

export function useChartInteractions({
    data = [],
    exportConfig = {},
    onExport,
}: UseChartInteractionsProps = {}) {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const isTouchDevice = useTouch();

    // Zoom state
    const [zoomDomain, setZoomDomain] = useState<{
        x?: [number, number];
        y?: [number, number];
    } | null>(null);

    // Fullscreen state
    const [isFullscreen, setIsFullscreen] = useState(false);

    // Chart container ref for export functionality
    const chartRef = useRef<HTMLDivElement>(null);

    const isZoomed = zoomDomain !== null;

    // Handle zoom functionality
    const handleZoom = useCallback((domain: { x?: [number, number]; y?: [number, number] }) => {
        if (isMobile || isTouchDevice) {
            // On mobile/touch devices, zoom is less practical
            return;
        }

        setZoomDomain(domain);
    }, [isMobile, isTouchDevice]);

    // Reset zoom
    const resetZoom = useCallback(() => {
        setZoomDomain(null);
    }, []);

    // Export chart functionality
    const exportChart = useCallback(async (format: 'png' | 'jpg' | 'pdf' | 'csv' = 'png') => {
        if (!chartRef.current) {
            console.warn('Chart ref not available for export');
            return;
        }

        const config: ExportConfig = {
            filename: `chart-${Date.now()}`,
            format,
            quality: 0.95,
            width: 1200,
            height: 600,
            ...exportConfig,
        };

        try {
            if (format === 'csv' && data.length > 0) {
                // Export data as CSV
                await exportToCSV(data, config.filename);
            } else {
                // Export chart as image
                await exportToImage(chartRef.current, config);
            }

            // Call custom export handler if provided
            onExport?.(config);
        } catch (error) {
            console.error('Failed to export chart:', error);
        }
    }, [data, exportConfig, onExport]);

    // Toggle fullscreen mode
    const toggleFullscreen = useCallback(async () => {
        if (!chartRef.current) return;

        try {
            if (!document.fullscreenElement) {
                await chartRef.current.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch (error) {
            console.error('Fullscreen toggle failed:', error);
        }
    }, []);

    // Listen for fullscreen changes
    useState(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    });

    // Chart props for responsive behavior
    const chartProps = {
        // Disable certain interactions on mobile for better performance
        syncId: isMobile ? undefined : 'chart-sync',

        // Touch-friendly margins
        margin: isMobile
            ? { top: 20, right: 20, bottom: 40, left: 20 }
            : { top: 20, right: 30, bottom: 60, left: 40 },

        // Responsive animations
        isAnimationActive: !isMobile, // Disable animations on mobile for better performance
    };

    return {
        // State
        isZoomed,
        zoomDomain,
        isFullscreen,
        isMobile,
        isTouchDevice,

        // Actions
        handleZoom,
        resetZoom,
        exportChart,
        toggleFullscreen,

        // Refs and props
        chartRef,
        chartProps,
    };
}

/**
 * Export chart data to CSV format
 */
async function exportToCSV(data: any[], filename: string): Promise<void> {
    if (!data || data.length === 0) {
        throw new Error('No data to export');
    }

    // Get all unique keys from the data
    const keys = Array.from(
        new Set(data.flatMap(item => Object.keys(item)))
    );

    // Create CSV content
    const csvContent = [
        // Header row
        keys.join(','),
        // Data rows
        ...data.map(item =>
            keys.map(key => {
                const value = item[key];
                // Handle special cases for CSV formatting
                if (value === null || value === undefined) return '';
                if (typeof value === 'string' && value.includes(',')) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return String(value);
            }).join(',')
        )
    ].join('\n');

    // Download the CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
}

/**
 * Export chart as image using html2canvas
 */
async function exportToImage(element: HTMLElement, config: ExportConfig): Promise<void> {
    // For now, we'll implement a basic version
    // In a real implementation, you'd use html2canvas or similar library

    try {
        // Try to use the browser's built-in functionality
        if ('html2canvas' in window) {
            // @ts-ignore - html2canvas would be loaded dynamically
            const canvas = await window.html2canvas(element, {
                width: config.width,
                height: config.height,
                backgroundColor: null,
                scale: 2, // For retina displays
            });

            // Convert to desired format
            const dataUrl = canvas.toDataURL(
                `image/${config.format}`,
                config.quality
            );

            // Download the image
            const link = document.createElement('a');
            link.download = `${config.filename}.${config.format}`;
            link.href = dataUrl;
            link.click();
        } else {
            // Fallback: print the chart area
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(`
          <html>
            <head><title>${config.filename}</title></head>
            <body>${element.outerHTML}</body>
          </html>
        `);
                printWindow.document.close();
                printWindow.print();
                printWindow.close();
            }
        }
    } catch (error) {
        console.error('Image export failed:', error);
        throw error;
    }
}

export default useChartInteractions;
