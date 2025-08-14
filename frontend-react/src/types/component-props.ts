/**
 * Standardized component prop interfaces for consistent API design
 * These base interfaces ensure all components follow the same patterns
 */

export interface BaseComponentProps {
    className?: string;
    children?: React.ReactNode;
    'data-testid'?: string;
}

export interface LoadingState {
    loading?: boolean;
    loadingText?: string;
}

export interface VariantProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}

export interface ResponsiveProps {
    fullWidth?: boolean;
    responsive?: boolean;
}

/**
 * Standard button props combining all common patterns
 */
export interface StandardButtonProps extends
    BaseComponentProps,
    LoadingState,
    VariantProps,
    ResponsiveProps,
    React.ButtonHTMLAttributes<HTMLButtonElement> {
    // Component-specific props go here
}

/**
 * Standard input props combining all common patterns  
 */
export interface StandardInputProps extends
    BaseComponentProps,
    React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    helperText?: string;
    icon?: React.ReactElement;
}

/**
 * Standard card props for consistent card components
 */
export interface StandardCardProps extends BaseComponentProps {
    variant?: 'default' | 'outline' | 'filled';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    loading?: boolean;
}
