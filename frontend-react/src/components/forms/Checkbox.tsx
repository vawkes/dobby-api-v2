import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { FiCheck, FiMinus } from 'react-icons/fi';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  description?: string;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  indeterminate?: boolean;
}

/**
 * Enhanced checkbox component with consistent styling
 * Features:
 * - Custom styled checkbox with animations
 * - Size variants
 * - Label and description support
 * - Indeterminate state
 * - Error states
 * - Dark mode support
 * - Touch-friendly sizing
 */
export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      label,
      description,
      error = false,
      size = 'md',
      indeterminate = false,
      className,
      ...props
    },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        checkbox: 'h-4 w-4',
        icon: 'h-3 w-3',
        text: 'text-sm',
      },
      md: {
        checkbox: 'h-5 w-5',
        icon: 'h-3.5 w-3.5',
        text: 'text-sm',
      },
      lg: {
        checkbox: 'h-6 w-6',
        icon: 'h-4 w-4',
        text: 'text-base',
      },
    };

    const { checkbox: checkboxSize, icon: iconSize, text: textSize } = sizeClasses[size];

    const checkboxId = props.id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className={cn('flex items-start gap-3', className)}>
        <div className="relative flex items-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              // Hide default checkbox
              'sr-only peer',
            )}
            {...props}
          />

          {/* Custom checkbox */}
          <div
            className={cn(
              'relative flex items-center justify-center rounded border-2 transition-all duration-200',
              checkboxSize,
              // Default state
              'border-border bg-background',
              // Checked/indeterminate state
              'peer-checked:border-blue-500 peer-checked:bg-blue-500',
              indeterminate && 'border-blue-500 bg-blue-500',
              // Focus state
              'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-background',
              // Disabled state
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              // Error state
              error && 'border-red-500 peer-checked:border-red-500 peer-checked:bg-red-500',
              // Hover state
              'peer-hover:border-blue-400 peer-disabled:peer-hover:border-border',
            )}
          >
            {/* Check icon */}
            <FiCheck
              className={cn(
                'text-white transition-opacity duration-200',
                iconSize,
                (props.checked || indeterminate) ? 'opacity-100' : 'opacity-0'
              )}
            />

            {/* Indeterminate icon */}
            {indeterminate && (
              <FiMinus
                className={cn(
                  'absolute text-white transition-opacity duration-200',
                  iconSize,
                  'opacity-100'
                )}
              />
            )}
          </div>
        </div>

        {/* Label and description */}
        {(label || description) && (
          <div className="flex-1 min-w-0">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'block font-medium cursor-pointer',
                  textSize,
                  error ? 'text-red-600 dark:text-red-400' : 'text-card-foreground',
                  props.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <p
                className={cn(
                  'text-muted-foreground',
                  textSize === 'text-sm' ? 'text-xs' : 'text-sm',
                  props.disabled && 'opacity-50'
                )}
              >
                {description}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
