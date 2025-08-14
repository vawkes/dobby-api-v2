import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { FiChevronDown } from 'react-icons/fi';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  options: SelectOption[];
  placeholder?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

/**
 * Enhanced select component with consistent styling and behavior
 * Features:
 * - Consistent styling with other form inputs
 * - Size variants
 * - Error states
 * - Placeholder support
 * - Disabled options
 * - Dark mode support
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      options,
      placeholder,
      error = false,
      size = 'md',
      fullWidth = false,
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

    return (
      <div className={cn('relative', fullWidth && 'w-full', className)}>
        <select
          ref={ref}
          className={cn(
            // Base styles
            'appearance-none rounded-md border border-border bg-background text-foreground',
            'focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-colors duration-200',
            // Size variants
            sizeClasses[size],
            // Full width
            fullWidth && 'w-full',
            // Error state
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500',
            // Padding for icon
            'pr-10'
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {/* Dropdown icon */}
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
          <FiChevronDown className="h-4 w-4 text-muted-foreground" />
        </div>
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
