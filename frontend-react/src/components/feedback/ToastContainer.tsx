import React, { createContext, useContext, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import Toast, { type ToastProps } from './Toast';
import { cn } from '../../lib/utils';

interface ToastContextType {
  addToast: (toast: Omit<ToastProps, 'id' | 'onDismiss'>) => string;
  removeToast: (id: string) => void;
  removeAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export interface ToastContainerProps {
  children: React.ReactNode;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'top-center' | 'bottom-center';
  maxToasts?: number;
  className?: string;
}

interface ToastItem extends ToastProps {
  id: string;
}

/**
 * Toast container and context provider
 * Features:
 * - Portal rendering for toasts
 * - Context API for managing toasts globally
 * - Position configuration
 * - Maximum toast limit
 * - Auto-stacking of multiple toasts
 * - Global toast management functions
 */
export const ToastProvider: React.FC<ToastContainerProps> = ({
  children,
  position = 'top-right',
  maxToasts = 5,
  className,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((toast: Omit<ToastProps, 'id' | 'onDismiss'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: ToastItem = {
      ...toast,
      id,
      onDismiss: removeToast,
    };

    setToasts(prevToasts => {
      const updatedToasts = [newToast, ...prevToasts];
      // Limit the number of toasts
      return updatedToasts.slice(0, maxToasts);
    });

    return id;
  }, [maxToasts]);

  const removeToast = useCallback((id: string) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  const removeAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2',
  };

  const contextValue: ToastContextType = {
    addToast,
    removeToast,
    removeAllToasts,
  };

  const toastPortal = toasts.length > 0 ? createPortal(
    <div
      className={cn(
        'fixed z-50 pointer-events-none',
        positionClasses[position],
        className
      )}
    >
      <div className="flex flex-col gap-2 w-96 max-w-[calc(100vw-2rem)]">
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} />
        ))}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {toastPortal}
    </ToastContext.Provider>
  );
};

// Convenience hooks for different toast types
export const useToastHelpers = () => {
  const { addToast } = useToast();

  return {
    toast: {
      success: (message: string, options?: Partial<Omit<ToastProps, 'variant' | 'description'>>) =>
        addToast({ variant: 'success', description: message, ...options }),
      
      error: (message: string, options?: Partial<Omit<ToastProps, 'variant' | 'description'>>) =>
        addToast({ variant: 'danger', description: message, ...options }),
      
      warning: (message: string, options?: Partial<Omit<ToastProps, 'variant' | 'description'>>) =>
        addToast({ variant: 'warning', description: message, ...options }),
      
      info: (message: string, options?: Partial<Omit<ToastProps, 'variant' | 'description'>>) =>
        addToast({ variant: 'info', description: message, ...options }),
    },
  };
};

export default ToastProvider;
