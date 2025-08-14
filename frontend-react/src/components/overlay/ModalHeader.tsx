import React from 'react';
import { cn } from '../../lib/utils';
import { FiX } from 'react-icons/fi';
import Button from '../ui/Button';

export interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

/**
 * Modal header component with optional close button
 * Used for modal titles and header actions
 */
export const ModalHeader: React.FC<ModalHeaderProps> = ({
  children,
  onClose,
  showCloseButton = true,
  className,
}) => {
  return (
    <div className={cn(
      'flex items-center justify-between border-b border-border px-6 py-4',
      className
    )}>
      <div className="flex-1">
        {typeof children === 'string' ? (
          <h2 className="text-lg font-semibold text-card-foreground">
            {children}
          </h2>
        ) : (
          children
        )}
      </div>
      
      {showCloseButton && onClose && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ml-4 h-8 w-8 p-0 hover:bg-muted"
          aria-label="Close modal"
        >
          <FiX className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};

export default ModalHeader;
