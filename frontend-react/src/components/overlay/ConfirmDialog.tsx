import React from 'react';
import { FiAlertTriangle, FiInfo, FiX, FiCheck } from 'react-icons/fi';
import Modal from './Modal';
import ModalHeader from './ModalHeader';
import ModalBody from './ModalBody';
import ModalFooter from './ModalFooter';
import Button from '../ui/Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onCancel?: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  loading?: boolean;
  size?: 'sm' | 'md';
}

/**
 * Confirmation dialog component
 * Used for confirming destructive actions or important decisions
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false,
  size = 'sm',
}) => {
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
  };

  // Icon and styling based on variant
  const variantConfig = {
    danger: {
      icon: FiAlertTriangle,
      iconColor: 'text-red-500',
      confirmVariant: 'danger' as const,
    },
    warning: {
      icon: FiAlertTriangle,
      iconColor: 'text-amber-500',
      confirmVariant: 'primary' as const,
    },
    info: {
      icon: FiInfo,
      iconColor: 'text-blue-500',
      confirmVariant: 'primary' as const,
    },
    success: {
      icon: FiCheck,
      iconColor: 'text-green-500',
      confirmVariant: 'primary' as const,
    },
  };

  const config = variantConfig[variant];
  const IconComponent = config.icon;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
      showCloseButton={false}
    >
      {title && (
        <ModalHeader onClose={!loading ? onClose : undefined} showCloseButton={!loading}>
          {title}
        </ModalHeader>
      )}

      <ModalBody className="text-center">
        <div className="flex flex-col items-center">
          {/* Icon */}
          <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-${variant === 'danger' ? 'red' : variant === 'warning' ? 'amber' : variant === 'success' ? 'green' : 'blue'}-100 dark:bg-${variant === 'danger' ? 'red' : variant === 'warning' ? 'amber' : variant === 'success' ? 'green' : 'blue'}-900/20 sm:mx-0 sm:h-10 sm:w-10`}>
            <IconComponent className={`h-6 w-6 ${config.iconColor}`} aria-hidden="true" />
          </div>

          {/* Message */}
          <div className="mt-4 text-center">
            <p className="text-sm text-muted-foreground">
              {message}
            </p>
          </div>
        </div>
      </ModalBody>

      <ModalFooter justify="center">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={loading}
          className="min-w-[80px]"
        >
          {cancelText}
        </Button>
        <Button
          variant={config.confirmVariant}
          onClick={handleConfirm}
          loading={loading}
          className="min-w-[80px]"
        >
          {confirmText}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ConfirmDialog;
