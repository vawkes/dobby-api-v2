import React from 'react';
import { cn } from '../../lib/utils';
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiX } from 'react-icons/fi';

export interface AlertProps {
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  children: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
  showIcon?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Alert component for displaying important messages
 * Features:
 * - Multiple variants (info, success, warning, danger)
 * - Optional dismissible functionality
 * - Icon support
 * - Size variants
 * - Title and content support
 * - Dark mode support
 * - Accessible with proper ARIA attributes
 */
export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  dismissible = false,
  onDismiss,
  showIcon = true,
  className,
  size = 'md',
}) => {
  const variantConfig = {
    info: {
      icon: FiInfo,
      containerClass: 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-blue-800 dark:text-blue-200',
    },
    success: {
      icon: FiCheckCircle,
      containerClass: 'bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200',
      iconClass: 'text-green-600 dark:text-green-400',
      titleClass: 'text-green-800 dark:text-green-200',
    },
    warning: {
      icon: FiAlertTriangle,
      containerClass: 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200',
      iconClass: 'text-amber-600 dark:text-amber-400',
      titleClass: 'text-amber-800 dark:text-amber-200',
    },
    danger: {
      icon: FiAlertCircle,
      containerClass: 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200',
      iconClass: 'text-red-600 dark:text-red-400',
      titleClass: 'text-red-800 dark:text-red-200',
    },
  };

  const sizeClasses = {
    sm: 'p-3 text-sm',
    md: 'p-4 text-sm',
    lg: 'p-6 text-base',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6',
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const alertRole = variant === 'danger' || variant === 'warning' ? 'alert' : 'status';

  return (
    <div
      className={cn(
        'relative rounded-md border',
        config.containerClass,
        sizeClasses[size],
        className
      )}
      role={alertRole}
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
    >
      <div className="flex">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0">
            <IconComponent 
              className={cn(iconSizeClasses[size], config.iconClass)} 
              aria-hidden="true" 
            />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1', showIcon && 'ml-3')}>
          {title && (
            <h3 className={cn(
              'font-medium mb-1',
              config.titleClass,
              size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base'
            )}>
              {title}
            </h3>
          )}
          <div className={title ? 'text-sm' : undefined}>
            {children}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <div className="flex-shrink-0 ml-4">
            <button
              type="button"
              className={cn(
                'inline-flex rounded-md p-1.5 hover:bg-black/5 dark:hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
                config.iconClass,
                // Focus ring color matching variant
                variant === 'info' && 'focus:ring-blue-600',
                variant === 'success' && 'focus:ring-green-600',
                variant === 'warning' && 'focus:ring-amber-600',
                variant === 'danger' && 'focus:ring-red-600'
              )}
              onClick={onDismiss}
              aria-label="Dismiss alert"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;
