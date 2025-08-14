import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const spinnerVariants = cva(
  'animate-spin border-solid border-current border-r-transparent rounded-full',
  {
    variants: {
      size: {
        sm: 'h-4 w-4 border-2',
        md: 'h-6 w-6 border-2',
        lg: 'h-8 w-8 border-2',
        xl: 'h-12 w-12 border-4',
      },
      variant: {
        default: 'text-primary',
        muted: 'text-muted-foreground',
        white: 'text-white',
        current: 'text-current',
      },
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

export interface LoadingSpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string;
  showLabel?: boolean;
}

/**
 * Loading spinner component for indicating loading states
 * Features:
 * - Multiple size variants
 * - Color variants
 * - Optional loading label
 * - Screen reader accessible
 * - Consistent animation
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size,
  variant,
  label = 'Loading...',
  showLabel = false,
  className,
  ...props
}) => {
  return (
    <div 
      className={cn('inline-flex items-center gap-2', className)} 
      {...props}
    >
      <div
        className={spinnerVariants({ size, variant })}
        role="status"
        aria-label={label}
      >
        <span className="sr-only">{label}</span>
      </div>
      {showLabel && (
        <span className="text-sm text-muted-foreground">{label}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
