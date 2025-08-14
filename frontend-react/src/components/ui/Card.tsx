import React, { forwardRef } from 'react';
import { cn } from '../../lib/utils';
import { cardVariants, type CardVariantProps } from '../../lib/variants';

/**
 * Card component for grouping related content with consistent styling
 * 
 * Features:
 * - Multiple variants (default, outline, filled)
 * - Padding options (none, sm, md, lg)
 * - Interactive mode with hover effects
 * - Loading state support
 * - Dark mode compatible
 * - Accessible as article when interactive
 * 
 * @example
 * Basic card:
 * <Card>
 *   <h3>Card Title</h3>
 *   <p>Card content...</p>
 * </Card>
 * 
 * Interactive card:
 * <Card interactive onClick={handleClick}>
 *   <CardContent />
 * </Card>
 * 
 * Loading state:
 * <Card loading>
 *   <SkeletonContent />
 * </Card>
 */
interface CardProps 
  extends React.HTMLAttributes<HTMLDivElement>,
          CardVariantProps {
  loading?: boolean;
  children: React.ReactNode;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ 
    className,
    variant,
    padding, 
    interactive,
    loading,
    onClick,
    children,
    ...props 
  }, ref) => {
    // Use div for all cards to avoid ref typing issues
    // Interactive behavior is handled through props
    return (
      <div
        className={cn(
          cardVariants({ variant, padding, interactive }),
          // Additional styling for interactive cards
          interactive && onClick && [
            'cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
            'disabled:pointer-events-none disabled:opacity-50'
          ],
          // Loading state styling
          loading && 'animate-pulse',
          className
        )}
        ref={ref}
        onClick={onClick}
        role={interactive && onClick ? 'button' : undefined}
        tabIndex={interactive && onClick ? 0 : undefined}
        aria-disabled={loading}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

/**
 * Card Header component for consistent card headers
 */
interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex flex-col space-y-1.5', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardHeader.displayName = 'CardHeader';

/**
 * Card Title component for consistent card titles
 */
interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, children, level = 3, ...props }, ref) => {
    const Heading = `h${level}` as keyof JSX.IntrinsicElements;
    
    return (
      <Heading
        ref={ref}
        className={cn(
          'text-lg font-semibold leading-none tracking-tight text-card-foreground',
          className
        )}
        {...props}
      >
        {children}
      </Heading>
    );
  }
);

CardTitle.displayName = 'CardTitle';

/**
 * Card Description component for consistent card descriptions
 */
interface CardDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {
  children: React.ReactNode;
}

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <p
        ref={ref}
        className={cn('text-sm text-gray-500', className)}
        {...props}
      >
        {children}
      </p>
    );
  }
);

CardDescription.displayName = 'CardDescription';

/**
 * Card Content component for main card content area
 */
interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('text-card-foreground', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardContent.displayName = 'CardContent';

/**
 * Card Footer component for actions and secondary content
 */
interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn('flex items-center pt-4', className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

CardFooter.displayName = 'CardFooter';

export default Card;
