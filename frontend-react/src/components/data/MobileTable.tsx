import React, { forwardRef } from 'react';
import { Table, ColumnDef, flexRender } from '@tanstack/react-table';
import { cn } from '../../lib/utils';
import { BaseComponentProps } from '../../types/component-props';
import { Card, CardContent } from '../ui/Card';

/**
 * Mobile-friendly card-based table display
 * Converts tabular data into accessible card layout for mobile devices
 * 
 * Features:
 * - Card-based layout optimized for touch
 * - 44px minimum touch targets
 * - Loading and empty states
 * - Keyboard navigation support
 * - Maintains data relationships in compact format
 */
interface MobileTableProps<T> extends BaseComponentProps {
    data: T[];
    columns: ColumnDef<T>[];
    loading?: boolean;
    error?: string;
    onRowClick?: (row: T) => void;
    emptyMessage?: string;
    table: Table<T>;
}

export const MobileTable = forwardRef<HTMLDivElement, MobileTableProps<any>>(
    ({
        className,
        data,
        columns,
        loading = false,
        error,
        onRowClick,
        emptyMessage = 'No data available',
        table,
        ...props
    }, ref) => {
        // Loading state
        if (loading) {
            return (
                <div
                    ref={ref}
                    className={cn('space-y-3', className)}
                    {...props}
                >
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardContent className="p-4 space-y-2">
                                <div className="h-4 bg-gray-200 rounded w-3/4" />
                                <div className="h-3 bg-gray-200 rounded w-1/2" />
                                <div className="h-3 bg-gray-200 rounded w-5/6" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            );
        }

        // Error state
        if (error) {
            return (
                <div ref={ref} className={cn('', className)} {...props}>
                    <Card variant="outline" className="border-red-200 bg-red-50">
                        <CardContent className="p-4">
                            <p className="text-sm text-red-800">{error}</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        // Empty state
        if (table.getRowModel().rows.length === 0) {
            return (
                <div ref={ref} className={cn('', className)} {...props}>
                    <Card>
                        <CardContent className="p-8 text-center">
                            <p className="text-gray-500">{emptyMessage}</p>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return (
            <div
                ref={ref}
                className={cn('space-y-3', className)}
                {...props}
            >
                {table.getRowModel().rows.map((row) => (
                    <Card
                        key={row.id}
                        interactive={!!onRowClick}
                        className={cn(
                            'transition-all duration-200',
                            onRowClick && [
                                'cursor-pointer',
                                'hover:shadow-md hover:border-blue-200',
                                'focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2'
                            ]
                        )}
                        onClick={() => onRowClick?.(row.original)}
                        role={onRowClick ? 'button' : undefined}
                        tabIndex={onRowClick ? 0 : undefined}
                        onKeyDown={(e) => {
                            if (onRowClick && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                onRowClick(row.original);
                            }
                        }}
                    >
                        <CardContent className="p-4">
                            <div className="space-y-2">
                                {row.getVisibleCells().map((cell, index) => {
                                    const header = table.getHeaderGroups()[0]?.headers[index];
                                    const headerContent = header ? 
                                        flexRender(header.column.columnDef.header, header.getContext()) :
                                        '';

                                    return (
                                        <div key={cell.id} className="flex justify-between items-start gap-2">
                                            <dt className="text-xs font-medium text-gray-500 uppercase tracking-wider flex-shrink-0 min-w-0">
                                                {typeof headerContent === 'string' ? headerContent : cell.column.id}
                                            </dt>
                                            <dd className="text-sm text-gray-900 text-right break-words min-w-0 flex-1">
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </dd>
                                        </div>
                                    );
                                })}
                            </div>
                        </CardContent>
                    </Card>
                ))}
                
                {/* Mobile pagination - simplified */}
                <div className="flex items-center justify-between px-2 py-4">
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className={cn(
                                'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                                'border border-gray-300 bg-white text-gray-700',
                                'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            Previous
                        </button>
                        <span className="text-sm text-gray-700">
                            Page {table.getState().pagination.pageIndex + 1} of{' '}
                            {table.getPageCount()}
                        </span>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className={cn(
                                'inline-flex items-center px-3 py-2 text-sm font-medium rounded-md',
                                'border border-gray-300 bg-white text-gray-700',
                                'hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                'disabled:opacity-50 disabled:cursor-not-allowed'
                            )}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        );
    }
);

MobileTable.displayName = 'MobileTable';

export default MobileTable;
