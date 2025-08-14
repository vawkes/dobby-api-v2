import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  error?: boolean;
  size?: 'sm' | 'md' | 'lg';
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

/**
 * Radio group component with consistent styling
 * Features:
 * - Custom styled radio buttons
 * - Size variants
 * - Horizontal/vertical orientation
 * - Option descriptions
 * - Error states
 * - Dark mode support
 * - Touch-friendly sizing
 */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(
  (
    {
      name,
      options,
      value,
      defaultValue,
      onChange,
      error = false,
      size = 'md',
      orientation = 'vertical',
      className,
    },
    ref
  ) => {
    const sizeClasses = {
      sm: {
        radio: 'h-4 w-4',
        dot: 'h-2 w-2',
        text: 'text-sm',
      },
      md: {
        radio: 'h-5 w-5',
        dot: 'h-2.5 w-2.5',
        text: 'text-sm',
      },
      lg: {
        radio: 'h-6 w-6',
        dot: 'h-3 w-3',
        text: 'text-base',
      },
    };

    const { radio: radioSize, dot: dotSize, text: textSize } = sizeClasses[size];

    const handleChange = (optionValue: string) => {
      if (onChange) {
        onChange(optionValue);
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          'space-y-3',
          orientation === 'horizontal' && 'flex flex-wrap gap-6 space-y-0',
          className
        )}
        role="radiogroup"
      >
        {options.map((option) => {
          const isChecked = value ? value === option.value : defaultValue === option.value;
          const radioId = `${name}-${option.value}`;

          return (
            <div key={option.value} className="flex items-start gap-3">
              <div className="relative flex items-center">
                <input
                  type="radio"
                  id={radioId}
                  name={name}
                  value={option.value}
                  checked={isChecked}
                  onChange={() => handleChange(option.value)}
                  disabled={option.disabled}
                  className="sr-only peer"
                />

                {/* Custom radio button */}
                <div
                  className={cn(
                    'relative flex items-center justify-center rounded-full border-2 transition-all duration-200',
                    radioSize,
                    // Default state
                    'border-border bg-background',
                    // Checked state
                    'peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-950',
                    // Focus state
                    'peer-focus:ring-2 peer-focus:ring-blue-500 peer-focus:ring-offset-2 peer-focus:ring-offset-background',
                    // Disabled state
                    'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
                    // Error state
                    error && 'border-red-500 peer-checked:border-red-500',
                    // Hover state
                    'peer-hover:border-blue-400 peer-disabled:peer-hover:border-border',
                  )}
                >
                  {/* Radio dot */}
                  <div
                    className={cn(
                      'rounded-full bg-blue-500 transition-opacity duration-200',
                      dotSize,
                      isChecked ? 'opacity-100' : 'opacity-0',
                      error && 'bg-red-500'
                    )}
                  />
                </div>
              </div>

              {/* Label and description */}
              <div className="flex-1 min-w-0">
                <label
                  htmlFor={radioId}
                  className={cn(
                    'block font-medium cursor-pointer',
                    textSize,
                    error ? 'text-red-600 dark:text-red-400' : 'text-card-foreground',
                    option.disabled && 'cursor-not-allowed opacity-50'
                  )}
                >
                  {option.label}
                </label>
                {option.description && (
                  <p
                    className={cn(
                      'text-muted-foreground',
                      textSize === 'text-sm' ? 'text-xs' : 'text-sm',
                      option.disabled && 'opacity-50'
                    )}
                  >
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
);

RadioGroup.displayName = 'RadioGroup';

export default RadioGroup;
