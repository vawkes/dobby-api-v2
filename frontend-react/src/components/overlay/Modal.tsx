import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../../lib/utils';
import { useMediaQuery } from '../../hooks/use-media-query';
import { FiX } from 'react-icons/fi';
import Button from '../ui/Button';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'fullscreen';
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  overlayClassName?: string;
  title?: string;
  preventBodyScroll?: boolean;
}

/**
 * Modal component with portal rendering and focus management
 * Features:
 * - Portal rendering to document root
 * - Focus trapping
 * - Escape key handling
 * - Backdrop click to close (configurable)
 * - Multiple size variants
 * - Mobile-responsive (drawer style on small screens)
 * - Smooth animations
 * - Body scroll prevention
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  size = 'md',
  closeOnBackdrop = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  overlayClassName,
  title,
  preventBodyScroll = true,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Size variants
  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    fullscreen: 'max-w-none w-full h-full',
  };

  // Mobile drawer styling
  const mobileClasses = isMobile && size !== 'fullscreen' 
    ? 'fixed inset-x-0 bottom-0 rounded-t-lg max-h-[85vh] w-full max-w-none'
    : `relative mx-4 ${sizeClasses[size]}`;

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

      // Focus the modal after it opens
      const timer = setTimeout(() => {
        if (modalRef.current) {
          const focusableElement = modalRef.current.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          ) as HTMLElement;
          
          if (focusableElement) {
            focusableElement.focus();
          } else {
            modalRef.current.focus();
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

  // Focus trapping
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== 'Tab') return;

    const focusableElements = modalRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab
      if (document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  };

  // Handle backdrop click
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        overlayClassName
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300" 
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative z-10 flex flex-col bg-card shadow-2xl',
          size === 'fullscreen' 
            ? 'w-full h-full' 
            : 'rounded-lg overflow-hidden',
          // Animation classes
          'transform transition-all duration-300 ease-out',
          'animate-in fade-in-0 zoom-in-95',
          // Mobile specific classes
          mobileClasses,
          className
        )}
      >
        {/* Close button - only show if no title is provided or explicitly requested */}
        {showCloseButton && !title && (
          <div className="absolute right-4 top-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 hover:bg-muted"
              aria-label="Close modal"
            >
              <FiX className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Title header */}
        {title && (
          <div className="flex items-center justify-between border-b border-border p-6">
            <h2 id="modal-title" className="text-lg font-semibold text-card-foreground">
              {title}
            </h2>
            {showCloseButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0 hover:bg-muted"
                aria-label="Close modal"
              >
                <FiX className="h-4 w-4" />
              </Button>
            )}
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
  return createPortal(modalContent, document.body);
};

export default Modal;
