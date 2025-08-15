import React from 'react';
import { cn } from '../../lib/utils';
import { FiAlertCircle } from 'react-icons/fi';

export interface FormFieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
  labelClassName?: string;
  errorClassName?: string;
  hintClassName?: string;
  htmlFor?: string;
}

/**
 * Form field wrapper component that provides consistent labeling and error handling
 * Features:
 * - Consistent label and error styling
 * - Required field indicator
 * - Hint text support
 * - Accessibility labels and descriptions
 * - Error state styling
 */
export const FormField: React.FC<FormFieldProps> = ({
  label,
  error,
  hint,
  required = false,
  children,
  className,
  labelClassName,
  errorClassName,
  hintClassName,
  htmlFor,
}) => {
  const fieldId = htmlFor || `field-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${fieldId}-error` : undefined;
  const hintId = hint ? `${fieldId}-hint` : undefined;

  return (
    <div className={cn('space-y-2', className)}>
      {/* Label */}
      {label && (
        <label
          htmlFor={fieldId}
          className={cn(
            'block text-sm font-medium text-card-foreground',
            error && 'text-red-600 dark:text-red-400',
            labelClassName
          )}
        >
          {label}
          {required && (
            <span className="ml-1 text-red-500" aria-label="required">
              *
            </span>
          )}
        </label>
      )}

      {/* Form Input */}
      <div className="relative">
        {React.Children.map(children, (child) => {
          if (React.isValidElement(child)) {
            const props: any = {
              id: fieldId,
              'aria-invalid': error ? 'true' : 'false',
              'aria-describedby': cn(
                error && errorId,
                hint && hintId
              ).trim() || undefined,
              className: cn(
                (child.props as any)?.className,
                error && 'border-red-500 focus:border-red-500 focus:ring-red-500'
              ),
            };
            return React.cloneElement(child as React.ReactElement<any>, props);
          }
          return child;
        })}
      </div>

      {/* Hint Text */}
      {hint && !error && (
        <p
          id={hintId}
          className={cn(
            'text-sm text-muted-foreground',
            hintClassName
          )}
        >
          {hint}
        </p>
      )}

      {/* Error Message */}
      {error && (
        <div
          id={errorId}
          className={cn(
            'flex items-center gap-2 text-sm text-red-600 dark:text-red-400',
            errorClassName
          )}
          role="alert"
          aria-live="polite"
        >
          <FiAlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default FormField;
