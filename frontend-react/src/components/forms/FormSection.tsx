import React from 'react';
import { cn } from '../../lib/utils';

export interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  titleClassName?: string;
  descriptionClassName?: string;
  contentClassName?: string;
  variant?: 'default' | 'card' | 'bordered';
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

/**
 * Form section component for grouping related form fields
 * Features:
 * - Section titles and descriptions
 * - Visual variants (default, card, bordered)
 * - Collapsible sections
 * - Consistent spacing and styling
 * - Dark mode support
 */
export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className,
  titleClassName,
  descriptionClassName,
  contentClassName,
  variant = 'default',
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const handleToggle = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  const variantClasses = {
    default: 'space-y-6',
    card: 'p-6 bg-card rounded-lg border border-border space-y-6',
    bordered: 'p-6 border border-border rounded-md space-y-6',
  };

  return (
    <div className={cn(variantClasses[variant], className)}>
      {/* Header */}
      {(title || description) && (
        <div
          className={cn(
            'space-y-2',
            collapsible && 'cursor-pointer select-none'
          )}
          onClick={handleToggle}
        >
          {title && (
            <div className="flex items-center justify-between">
              <h3
                className={cn(
                  'text-lg font-medium text-card-foreground',
                  titleClassName
                )}
              >
                {title}
              </h3>
              {collapsible && (
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={isCollapsed ? 'Expand section' : 'Collapse section'}
                >
                  <svg
                    className={cn(
                      'h-5 w-5 transition-transform duration-200',
                      isCollapsed && 'rotate-180'
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
          {description && (
            <p
              className={cn(
                'text-sm text-muted-foreground',
                descriptionClassName
              )}
            >
              {description}
            </p>
          )}
        </div>
      )}

      {/* Content */}
      {(!collapsible || !isCollapsed) && (
        <div className={cn('space-y-4', contentClassName)}>
          {children}
        </div>
      )}
    </div>
  );
};

export default FormSection;
