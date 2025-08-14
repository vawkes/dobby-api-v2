import React from 'react';
import { Table } from '@tanstack/react-table';
import { 
    ChevronLeftIcon, 
    ChevronRightIcon,
    ChevronDoubleLeftIcon,
    ChevronDoubleRightIcon 
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

/**
 * DataTable pagination component with comprehensive controls
 * 
 * Features:
 * - First/Previous/Next/Last navigation
 * - Configurable page sizes (10, 25, 50, 100)
 * - Current page and total pages display
 * - Total rows count
 * - Keyboard navigation
 * - Responsive design
 */
interface DataTablePaginationProps<T> {
    table: Table<T>;
    className?: string;
    pageSizeOptions?: number[];
}

export function DataTablePagination<T>({
    table,
    className,
    pageSizeOptions = [10, 25, 50, 100],
}: DataTablePaginationProps<T>) {
    const currentPage = table.getState().pagination.pageIndex + 1;
    const totalPages = table.getPageCount();
    const pageSize = table.getState().pagination.pageSize;
    const totalRows = table.getFilteredRowModel().rows.length;
    
    // Calculate the range of items being shown
    const startRow = table.getState().pagination.pageIndex * pageSize + 1;
    const endRow = Math.min(startRow + pageSize - 1, totalRows);

    return (
        <div className={cn(
            'flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0',
            'px-2 py-4 border-t border-border bg-card rounded-b-lg',
            className
        )}>
            {/* Items info and page size selector */}
            <div className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:space-y-0 sm:space-x-6">
                {/* Items count */}
                <div className="text-sm text-card-foreground">
                    Showing{' '}
                    <span className="font-medium">{totalRows === 0 ? 0 : startRow}</span>
                    {totalRows > 0 && (
                        <>
                            {' '}to <span className="font-medium">{endRow}</span>
                        </>
                    )}
                    {' '}of <span className="font-medium">{totalRows}</span> results
                </div>

                {/* Page size selector */}
                <div className="flex items-center space-x-2">
                    <label htmlFor="pageSize" className="text-sm text-card-foreground">
                        Rows per page:
                    </label>
                    <select
                        id="pageSize"
                        value={pageSize}
                        onChange={(e) => {
                            table.setPageSize(Number(e.target.value));
                        }}
                        className={cn(
                            'h-8 px-2 py-1 text-sm border border-border rounded-md',
                            'bg-background text-foreground focus:outline-none focus:ring-2',
                            'focus:ring-blue-500 focus:border-blue-500'
                        )}
                    >
                        {pageSizeOptions.map((size) => (
                            <option key={size} value={size}>
                                {size}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Navigation controls */}
            <div className="flex items-center space-x-2">
                {/* Page info */}
                <span className="text-sm text-card-foreground mr-4">
                    Page {currentPage} of {totalPages}
                </span>

                {/* Navigation buttons */}
                <div className="flex items-center space-x-1">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8 p-0"
                        aria-label="Go to first page"
                    >
                        <ChevronDoubleLeftIcon className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        className="h-8 w-8 p-0"
                        aria-label="Go to previous page"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8 p-0"
                        aria-label="Go to next page"
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        className="h-8 w-8 p-0"
                        aria-label="Go to last page"
                    >
                        <ChevronDoubleRightIcon className="h-4 w-4" />
                    </Button>
                </div>

                {/* Direct page navigation (hidden on mobile) */}
                <div className="hidden sm:flex items-center space-x-2 ml-4">
                    <span className="text-sm text-card-foreground">Go to page:</span>
                    <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                            const page = e.target.value ? Number(e.target.value) - 1 : 0;
                            if (page >= 0 && page < totalPages) {
                                table.setPageIndex(page);
                            }
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.currentTarget.blur();
                            }
                        }}
                        className={cn(
                            'h-8 w-16 px-2 py-1 text-sm text-center',
                            'border border-border rounded-md bg-background text-foreground',
                            'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                        )}
                        aria-label="Page number input"
                    />
                </div>
            </div>
        </div>
    );
}

export default DataTablePagination;
