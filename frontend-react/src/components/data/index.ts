/**
 * Data components barrel exports
 * Modern responsive table system with mobile card layouts
 */

// Core table components
export { default as DataTable } from './DataTable';
export { default as MobileTable } from './MobileTable';
export { default as DataTablePagination } from './DataTablePagination';

// Column definitions
export { 
    deviceColumns, 
    deviceMobileColumns
} from './DataTableColumns';

// Re-export useful types from react-table for consumers
export type { 
    ColumnDef,
    Table,
    SortingState,
    ColumnFiltersState,
    VisibilityState,
} from '@tanstack/react-table';
