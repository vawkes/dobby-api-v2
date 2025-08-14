import React from 'react';
import { cn } from '../../lib/utils';

export interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
  scrollable?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

/**
 * Modal body component with scrollable content
 * Handles the main content area of modals
 */
export const ModalBody: React.FC<ModalBodyProps> = ({
  children,
  className,
  scrollable = true,
  padding = 'md',
}) => {
  const paddingClasses = {
    none: 'p-0',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
  };

  return (
    <div 
      className={cn(
        'flex-1 text-card-foreground',
        scrollable && 'overflow-y-auto',
        paddingClasses[padding],
        className
      )}
    >
      {children}
    </div>
  );
};

export default ModalBody;
