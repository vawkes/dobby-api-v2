import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { inputVariants, type InputVariantProps } from '../../lib/variants';

/**
 * Enhanced Input component with consistent styling and validation states
 * 
 * Features:
 * - Multiple sizes (sm, md, lg)
 * - Validation states (default, error, success)
 * - Icon support (left-aligned)
 * - Helper text and error messages
 * - Label support
 * - Touch-friendly sizing
 * - Dark mode compatible
 * - Accessible labeling
 * 
 * @example
 * Basic usage:
 * <Input label="Email" type="email" placeholder="Enter email" />
 * 
 * With validation:
 * <Input 
 *   label="Password"
 *   type="password" 
 *   error="Password is required"
 *   variant="error"
 * />
 * 
 * With icon:
 * <Input 
 *   label="Search"
 *   icon={<SearchIcon />}
 *   placeholder="Search..."
 * />
 */
interface InputProps 
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
          Omit<InputVariantProps, 'variant'> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  variant?: 'default' | 'error' | 'success';
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className,
    label,
    error,
    helperText,
    icon,
    variant: variantProp,
    size,
    fullWidth = true,
    id,
    ...props 
  }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    
    // Determine variant based on error state
    const variant = error ? 'error' : variantProp || 'default';

    return (
      <div className={cn('space-y-2', fullWidth ? 'w-full' : '')}>
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-foreground"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && (
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <span className="text-gray-400 h-4 w-4">{icon}</span>
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ variant, size }),
              icon && 'pl-10',
              'placeholder:text-gray-400',
              'transition-colors',
              className
            )}
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={
              error 
                ? `${inputId}-error`
                : helperText 
                ? `${inputId}-helper`
                : undefined
            }
            {...props}
          />
        </div>

        {/* Error message */}
        {error && (
          <p 
            id={`${inputId}-error`}
            className="text-sm text-red-600 flex items-center gap-1"
            role="alert"
          >
            <ErrorIcon className="h-4 w-4 flex-shrink-0" />
            {error}
          </p>
        )}

        {/* Helper text (only shown if no error) */}
        {helperText && !error && (
          <p 
            id={`${inputId}-helper`}
            className="text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Error icon for validation states
 */
const ErrorIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg 
    className={className}
    fill="currentColor" 
    viewBox="0 0 20 20"
    aria-hidden="true"
  >
    <path
      fillRule="evenodd"
      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5l-4 7A1 1 0 006 16h8a1 1 0 00.867-1.5l-4-7A1 1 0 0010 7z"
      clipRule="evenodd"
    />
  </svg>
);

export default Input; 