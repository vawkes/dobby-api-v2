import React, { forwardRef, useMemo } from 'react';
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    ColumnDef,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
    flexRender,
} from '@tanstack/react-table';
import { ChevronUpIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/use-media-query';
import { BaseComponentProps } from '../../types/component-props';
import { MobileTable } from './MobileTable';
import { DataTablePagination } from './DataTablePagination';

/**
 * Modern responsive DataTable component with sorting, filtering, and pagination
 * 
 * Features:
 * - Responsive design (desktop table → mobile card layout)
 * - Sorting with visual indicators
 * - Global search and column filtering
 * - Pagination with configurable page sizes
 * - Loading states and error handling
 * - Keyboard navigation
 * - Accessibility compliant (ARIA labels, roles)
 * 
 * @example
 * <DataTable
 *   data={devices}
 *   columns={deviceColumns}
 *   loading={isLoading}
 *   onRowClick={(device) => navigate(`/devices/${device.device_id}`)}
 * />
 */
interface DataTableProps<T> extends BaseComponentProps {
    data: T[];
    columns: ColumnDef<T>[];
    loading?: boolean;
    error?: string;
    globalFilter?: string;
    onGlobalFilterChange?: (value: string) => void;
    onRowClick?: (row: T) => void;
    pageSize?: number;
    mobileBreakpoint?: string;
    emptyMessage?: string;
}

export const DataTable = forwardRef<HTMLDivElement, DataTableProps<any>>(
    ({
        className,
        data,
        columns,
        loading = false,
        error,
        globalFilter = '',
        onGlobalFilterChange,
        onRowClick,
        pageSize = 10,
        mobileBreakpoint = '(max-width: 768px)',
        emptyMessage = 'No data available',
        children,
        ...props
    }, ref) => {
        const isMobile = useMediaQuery(mobileBreakpoint);

        const [sorting, setSorting] = React.useState<SortingState>([]);
        const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
        const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
        const [rowSelection, setRowSelection] = React.useState({});
        const [pagination, setPagination] = React.useState({
            pageIndex: 0,
            pageSize: pageSize,
        });

        const table = useReactTable({
            data,
            columns,
            onSortingChange: setSorting,
            onColumnFiltersChange: setColumnFilters,
            getCoreRowModel: getCoreRowModel(),
            getSortedRowModel: getSortedRowModel(),
            getFilteredRowModel: getFilteredRowModel(),
            getPaginationRowModel: getPaginationRowModel(),
            onColumnVisibilityChange: setColumnVisibility,
            onRowSelectionChange: setRowSelection,
            onPaginationChange: setPagination,
            onGlobalFilterChange,
            state: {
                sorting,
                columnFilters,
                columnVisibility,
                rowSelection,
                pagination,
                globalFilter,
            },
        });

        // Mobile view
        if (isMobile) {
            return (
                <MobileTable
                    ref={ref}
                    className={className}
                    data={data}
                    columns={columns}
                    loading={loading}
                    error={error}
                    onRowClick={onRowClick}
                    emptyMessage={emptyMessage}
                    table={table}
                    {...props}
                />
            );
        }

        // Desktop table view
        return (
            <div
                ref={ref}
                className={cn('w-full space-y-4', className)}
                {...props}
            >
                {/* Loading state */}
                {loading && (
                    <div className="flex items-center justify-center py-8">
                        <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
                            <span className="text-sm text-gray-600">Loading...</span>
                        </div>
                    </div>
                )}

                {/* Error state */}
                {error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                        <p className="text-sm text-red-800">{error}</p>
                    </div>
                )}

                {/* Table */}
                {!loading && !error && (
                    <>
                        <div className="rounded-lg border border-border shadow-sm bg-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full divide-y divide-border">
                                    <thead className="bg-muted">
                                        {table.getHeaderGroups().map((headerGroup) => (
                                            <tr key={headerGroup.id}>
                                                {headerGroup.headers.map((header) => (
                                                    <th
                                                        key={header.id}
                                                        className={cn(
                                                            'px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
                                                            header.column.getCanSort() && 'cursor-pointer select-none hover:bg-muted/80'
                                                        )}
                                                        onClick={header.column.getToggleSortingHandler()}
                                                        role={header.column.getCanSort() ? 'button' : undefined}
                                                        tabIndex={header.column.getCanSort() ? 0 : undefined}
                                                        onKeyDown={(e) => {
                                                            if (header.column.getCanSort() && (e.key === 'Enter' || e.key === ' ')) {
                                                                e.preventDefault();
                                                                header.column.toggleSorting();
                                                            }
                                                        }}
                                                        aria-sort={
                                                            header.column.getIsSorted() === 'asc' ? 'ascending' :
                                                            header.column.getIsSorted() === 'desc' ? 'descending' :
                                                            'none'
                                                        }
                                                    >
                                                        <div className="flex items-center space-x-1">
                                                            <span>
                                                                {header.isPlaceholder
                                                                    ? null
                                                                    : flexRender(
                                                                        header.column.columnDef.header,
                                                                        header.getContext()
                                                                    )}
                                                            </span>
                                                            {header.column.getCanSort() && (
                                                                <span className="ml-1">
                                                                    {header.column.getIsSorted() === 'asc' ? (
                                                                        <ChevronUpIcon className="h-4 w-4" />
                                                                    ) : header.column.getIsSorted() === 'desc' ? (
                                                                        <ChevronDownIcon className="h-4 w-4" />
                                                                    ) : (
                                                                        <ChevronUpIcon className="h-4 w-4 opacity-50" />
                                                                    )}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </th>
                                                ))}
                                            </tr>
                                        ))}
                                    </thead>
                                    <tbody className="bg-card divide-y divide-border">
                                        {table.getRowModel().rows.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={columns.length}
                                                    className="px-6 py-8 text-center text-muted-foreground"
                                                >
                                                    {emptyMessage}
                                                </td>
                                            </tr>
                                        ) : (
                                            table.getRowModel().rows.map((row) => (
                                                <tr
                                                    key={row.id}
                                                    className={cn(
                                                        'hover:bg-muted/50 transition-colors',
                                                        onRowClick && 'cursor-pointer'
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
                                                    {row.getVisibleCells().map((cell) => (
                                                        <td
                                                            key={cell.id}
                                                            className="px-6 py-4 whitespace-nowrap text-sm text-card-foreground"
                                                        >
                                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Pagination */}
                        <DataTablePagination table={table} />
                    </>
                )}
            </div>
        );
    }
);

DataTable.displayName = 'DataTable';

export default DataTable;
