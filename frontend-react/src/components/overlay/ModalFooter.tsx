import React from 'react';
import { cn } from '../../lib/utils';

export interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
  justify?: 'start' | 'center' | 'end' | 'between';
  spacing?: 'sm' | 'md' | 'lg';
}

/**
 * Modal footer component for action buttons
 * Provides consistent spacing and alignment for modal actions
 */
export const ModalFooter: React.FC<ModalFooterProps> = ({
  children,
  className,
  justify = 'end',
  spacing = 'md',
}) => {
  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
  };

  const spacingClasses = {
    sm: 'gap-2',
    md: 'gap-3',
    lg: 'gap-4',
  };

  return (
    <div className={cn(
      'flex items-center border-t border-border bg-muted/25 px-6 py-4',
      justifyClasses[justify],
      spacingClasses[spacing],
      className
    )}>
      {children}
    </div>
  );
};

export default ModalFooter;
