import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { buttonVariants, type ButtonVariantProps } from '../../lib/variants';

/**
 * Enhanced Button component with consistent styling and behavior
 * 
 * Features:
 * - Multiple variants (primary, secondary, outline, ghost, danger)
 * - Size options (sm, md, lg) 
 * - Loading states with spinner
 * - Full width option
 * - Touch-friendly (44px minimum)
 * - Keyboard navigation support
 * - Dark mode compatible
 * 
 * @example
 * Basic usage:
 * <Button variant="primary" onClick={handleClick}>
 *   Click me
 * </Button>
 * 
 * Loading state:
 * <Button loading loadingText="Saving...">
 *   Save Changes
 * </Button>
 * 
 * Full width:
 * <Button fullWidth>Submit Form</Button>
 */
interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonVariantProps {
    loading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
    children: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({
        className,
        variant,
        size,
        fullWidth,
        loading = false,
        loadingText,
        icon,
        disabled,
        children,
        ...props
    }, ref) => {
        const isDisabled = loading || disabled;

        return (
            <button
                className={cn(
                    buttonVariants({ variant, size, fullWidth }),
                    // Touch-friendly minimum size
                    'touch-target',
                    // Loading and disabled states
                    loading && 'cursor-wait',
                    isDisabled && 'pointer-events-none opacity-50',
                    className
                )}
                ref={ref}
                disabled={isDisabled}
                aria-disabled={isDisabled}
                {...props}
            >
                {loading ? (
                    <>
                        <LoadingSpinner className="mr-2 h-4 w-4" />
                        {loadingText || children}
                    </>
                ) : (
                    <>
                        {icon && <span className="mr-2">{icon}</span>}
                        {children}
                    </>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

/**
 * Loading spinner component for button loading states
 */
const LoadingSpinner: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        className={cn('animate-spin', className)}
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        aria-hidden="true"
    >
        <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
        />
        <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
    </svg>
);

export default Button;