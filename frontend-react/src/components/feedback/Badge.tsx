import React from 'react';
import { cn } from '../../lib/utils';
import { cva, type VariantProps } from 'class-variance-authority';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-200',
        warning: 'border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
        info: 'border-transparent bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
        danger: 'border-transparent bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2.5 py-0.5 text-xs',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

/**
 * Badge component for status indicators and labels
 * Features:
 * - Multiple variants (default, secondary, destructive, etc.)
 * - Size variants
 * - Consistent styling with design system
 * - Dark mode support
 * - Hover effects
 */
export const Badge: React.FC<BadgeProps> = ({ 
  className, 
  variant, 
  size, 
  ...props 
}) => {
  return (
    <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
  );
};

export default Badge;
