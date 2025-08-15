import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  showLabel?: boolean;
  label?: string;
  showPercentage?: boolean;
  className?: string;
  animated?: boolean;
  indeterminate?: boolean;
}

/**
 * Progress bar component for showing completion status
 * Features:
 * - Progress value display
 * - Multiple size variants
 * - Color variants for different states
 * - Optional labels and percentage
 * - Animated progress
 * - Indeterminate state
 * - Accessible with ARIA attributes
 */
export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  size = 'md',
  variant = 'default',
  showLabel = false,
  label,
  showPercentage = false,
  className,
  animated = false,
  indeterminate = false,
}) => {
  const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
  
  const sizeClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  const variantClasses = {
    default: 'bg-blue-600',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    danger: 'bg-red-600',
  };

  return (
    <div className={cn('w-full', className)}>
      {/* Label and percentage */}
      {(showLabel || showPercentage) && (
        <div className="mb-1 flex justify-between text-sm">
          {showLabel && label && (
            <span className="text-card-foreground">{label}</span>
          )}
          {showPercentage && (
            <span className="text-muted-foreground">
              {Math.round(percentage)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar track */}
      <div
        className={cn(
          'relative overflow-hidden rounded-full bg-muted',
          sizeClasses[size]
        )}
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || `Progress: ${Math.round(percentage)}%`}
      >
        {/* Progress bar fill */}
        <div
          className={cn(
            'h-full transition-all duration-300 ease-out',
            variantClasses[variant],
            animated && 'transition-all duration-500 ease-out',
            indeterminate && 'progress-indeterminate'
          )}
          style={{
            width: indeterminate ? '30%' : `${percentage}%`,
          }}
        />

        {/* Animated stripe overlay */}
        {animated && !indeterminate && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
            style={{
              backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
              backgroundSize: '200% 100%',
              animation: '2s infinite linear',
              animationName: 'shimmer',
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ProgressBar;
