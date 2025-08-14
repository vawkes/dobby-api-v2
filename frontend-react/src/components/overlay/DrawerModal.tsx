import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { FiX } from 'react-icons/fi';
import Button from '../ui/Button';

export interface DrawerModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  position?: 'left' | 'right' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'full';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  title?: string;
  className?: string;
  overlayClassName?: string;
  preventBodyScroll?: boolean;
}

/**
 * Drawer modal component optimized for mobile interfaces
 * Slides in from the edges of the screen
 */
export const DrawerModal: React.FC<DrawerModalProps> = ({
  isOpen,
  onClose,
  children,
  position = 'bottom',
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  title,
  className,
  overlayClassName,
  preventBodyScroll = true,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Size classes based on position
  const getSizeClasses = () => {
    const sizeMap = {
      sm: position === 'bottom' ? 'max-h-[40vh]' : position === 'left' || position === 'right' ? 'max-w-xs' : 'max-h-[40vh]',
      md: position === 'bottom' ? 'max-h-[60vh]' : position === 'left' || position === 'right' ? 'max-w-sm' : 'max-h-[60vh]',
      lg: position === 'bottom' ? 'max-h-[80vh]' : position === 'left' || position === 'right' ? 'max-w-md' : 'max-h-[80vh]',
      full: position === 'bottom' ? 'h-full' : position === 'left' || position === 'right' ? 'w-full' : 'h-full',
    };
    return sizeMap[size];
  };

  // Position classes
  const getPositionClasses = () => {
    const positionMap = {
      left: 'fixed left-0 top-0 h-full',
      right: 'fixed right-0 top-0 h-full',
      bottom: 'fixed bottom-0 left-0 right-0 w-full rounded-t-lg',
    };
    return positionMap[position];
  };

  // Animation classes
  const getAnimationClasses = () => {
    const animationMap = {
      left: 'transform transition-transform duration-300 ease-out translate-x-0 data-[state=closed]:-translate-x-full',
      right: 'transform transition-transform duration-300 ease-out translate-x-0 data-[state=closed]:translate-x-full',
      bottom: 'transform transition-transform duration-300 ease-out translate-y-0 data-[state=closed]:translate-y-full',
    };
    return animationMap[position];
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (closeOnEscape && event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
    return undefined;
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll and focus management
  useEffect(() => {
    if (isOpen) {
      // Store currently focused element
      previousActiveElement.current = document.activeElement as HTMLElement;

      // Prevent body scroll
      if (preventBodyScroll) {
        document.body.style.overflow = 'hidden';
      }

      // Focus the drawer after it opens
      const timer = setTimeout(() => {
        if (drawerRef.current) {
          const focusableElement = drawerRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          if (focusableElement) {
            focusableElement.focus();
          } else {
            drawerRef.current.focus();
          }
        }
      }, 100);

      return () => {
        clearTimeout(timer);
        // Restore body scroll
        if (preventBodyScroll) {
          document.body.style.overflow = '';
        }
        // Restore focus to previously focused element
        if (previousActiveElement.current) {
          previousActiveElement.current.focus();
        }
      };
    }
    return undefined;
  }, [isOpen, preventBodyScroll]);

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const drawerContent = (
    <div
      className={cn(
        'fixed inset-0 z-50',
        overlayClassName
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
        aria-hidden="true"
      />
      
      {/* Drawer */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
        tabIndex={-1}
        className={cn(
          'flex flex-col bg-card shadow-2xl',
          getPositionClasses(),
          getSizeClasses(),
          getAnimationClasses(),
          className
        )}
        data-state={isOpen ? 'open' : 'closed'}
      >
        {/* Header with title and close button */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between border-b border-border p-4">
            {title && (
              <h2 id="drawer-title" className="text-lg font-semibold text-card-foreground">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted"
                aria-label="Close drawer"
              >
                <FiX className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        {/* Handle bar for bottom drawer */}
        {position === 'bottom' && !title && (
          <div className="flex justify-center p-2">
            <div className="h-1 w-12 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );

  // Render in portal
  return createPortal(drawerContent, document.body);
};

export default DrawerModal;
