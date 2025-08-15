import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { FiCalendar, FiClock } from 'react-icons/fi';

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  type?: 'date' | 'datetime-local' | 'time';
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showIcon?: boolean;
}

/**
 * Enhanced date picker component with consistent styling
 * Features:
 * - Date, datetime, and time input types
 * - Size variants
 * - Error states
 * - Optional calendar/clock icons
 * - Consistent styling with other inputs
 * - Dark mode support
 */
export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      type = 'date',
      error = false,
      size = 'md',
      fullWidth = false,
      showIcon = true,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: 'h-8 px-2 text-sm',
      md: 'h-10 px-3 text-sm',
      lg: 'h-12 px-4 text-base',
    };

    const getIcon = () => {
      switch (type) {
        case 'time':
          return <FiClock className="h-4 w-4 text-muted-foreground" />;
        case 'date':
        case 'datetime-local':
        default:
          return <FiCalendar className="h-4 w-4 text-muted-foreground" />;
      }
    };

    return (
      <div className={cn('relative', fullWidth && 'w-full')}>
        {showIcon && (
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            {getIcon()}
          </div>
        )}
        
        <input
          ref={ref}
          type={type}
          className={cn(
            // Base styles
            'rounded-md border border-border bg-background text-foreground',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            'placeholder:text-muted-foreground',
            // Size variants
            sizeClasses[size],
            // Full width
            fullWidth && 'w-full',
            // Icon padding
            showIcon && 'pl-10',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export default DatePicker;
