import React, { useEffect, useState } from 'react';
import { cn } from '../../lib/utils';
import { FiInfo, FiCheckCircle, FiAlertTriangle, FiAlertCircle, FiX } from 'react-icons/fi';

export interface ToastProps {
  id: string;
  variant?: 'info' | 'success' | 'warning' | 'danger';
  title?: string;
  description: string;
  duration?: number;
  dismissible?: boolean;
  onDismiss?: (id: string) => void;
  showIcon?: boolean;
  className?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Toast notification component
 * Features:
 * - Multiple variants with appropriate colors
 * - Auto-dismiss with configurable duration
 * - Manual dismiss functionality
 * - Action button support
 * - Icon display
 * - Smooth animations
 * - Dark mode support
 * - Accessible with proper ARIA attributes
 */
export const Toast: React.FC<ToastProps> = ({
  id,
  variant = 'info',
  title,
  description,
  duration = 5000,
  dismissible = true,
  onDismiss,
  showIcon = true,
  className,
  action,
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isLeaving, setIsLeaving] = useState(false);

  const variantConfig = {
    info: {
      icon: FiInfo,
      containerClass: 'bg-card border-blue-200 dark:border-blue-800',
      iconClass: 'text-blue-600 dark:text-blue-400',
      titleClass: 'text-card-foreground',
      descriptionClass: 'text-muted-foreground',
    },
    success: {
      icon: FiCheckCircle,
      containerClass: 'bg-card border-green-200 dark:border-green-800',
      iconClass: 'text-green-600 dark:text-green-400',
      titleClass: 'text-card-foreground',
      descriptionClass: 'text-muted-foreground',
    },
    warning: {
      icon: FiAlertTriangle,
      containerClass: 'bg-card border-amber-200 dark:border-amber-800',
      iconClass: 'text-amber-600 dark:text-amber-400',
      titleClass: 'text-card-foreground',
      descriptionClass: 'text-muted-foreground',
    },
    danger: {
      icon: FiAlertCircle,
      containerClass: 'bg-card border-red-200 dark:border-red-800',
      iconClass: 'text-red-600 dark:text-red-400',
      titleClass: 'text-card-foreground',
      descriptionClass: 'text-muted-foreground',
    },
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  const handleDismiss = () => {
    setIsLeaving(true);
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      if (onDismiss) {
        onDismiss(id);
      }
    }, 200);
  };

  // Auto-dismiss functionality
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    }
    return undefined;
  }, [duration]);

  const handleActionClick = () => {
    if (action?.onClick) {
      action.onClick();
    }
    handleDismiss();
  };

  if (!isVisible) return null;

  return (
    <div
      className={cn(
        'pointer-events-auto w-full max-w-sm rounded-lg border shadow-lg transition-all duration-200',
        config.containerClass,
        'transform-gpu',
        isLeaving 
          ? 'animate-out slide-out-to-right-full fade-out duration-200' 
          : 'animate-in slide-in-from-right-full fade-in duration-300',
        className
      )}
      role="alert"
      aria-live={variant === 'danger' ? 'assertive' : 'polite'}
    >
      <div className="flex p-4">
        {/* Icon */}
        {showIcon && (
          <div className="flex-shrink-0">
            <IconComponent 
              className={cn('h-5 w-5', config.iconClass)} 
              aria-hidden="true" 
            />
          </div>
        )}

        {/* Content */}
        <div className={cn('flex-1', showIcon && 'ml-3')}>
          {title && (
            <p className={cn('text-sm font-medium', config.titleClass)}>
              {title}
            </p>
          )}
          <p className={cn(
            'text-sm',
            config.descriptionClass,
            title && 'mt-1'
          )}>
            {description}
          </p>

          {/* Action button */}
          {action && (
            <div className="mt-3">
              <button
                type="button"
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
                  variant === 'info' && 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600',
                  variant === 'success' && 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-600',
                  variant === 'warning' && 'bg-amber-600 text-white hover:bg-amber-700 focus:ring-amber-600',
                  variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600'
                )}
                onClick={handleActionClick}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <div className="flex-shrink-0 ml-4">
            <button
              type="button"
              className={cn(
                'inline-flex rounded-md p-1.5 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors',
                config.iconClass,
                variant === 'info' && 'focus:ring-blue-600',
                variant === 'success' && 'focus:ring-green-600',
                variant === 'warning' && 'focus:ring-amber-600',
                variant === 'danger' && 'focus:ring-red-600'
              )}
              onClick={handleDismiss}
              aria-label="Dismiss notification"
            >
              <FiX className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toast;
