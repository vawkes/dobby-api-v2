import React from 'react';
import { Link } from 'react-router-dom';
import { useMediaQuery } from '../../hooks/use-media-query';
import { useTheme } from '../../hooks/use-theme';
import { cn } from '../../lib/utils';

/**
 * Responsive breadcrumb navigation component
 * 
 * Features:
 * - Mobile-responsive display (collapses on small screens)
 * - Theme-aware styling
 * - Touch-friendly links
 * - Keyboard navigation support
 * - Automatic truncation for long paths
 * 
 * @example
 * <Breadcrumbs 
 *   items={[
 *     { name: 'Dashboard', href: '/dashboard' },
 *     { name: 'Devices', href: '/devices' },
 *     { name: 'Device Detail', current: true }
 *   ]}
 * />
 */
interface BreadcrumbItem {
    name: string;
    href?: string;
    current?: boolean;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
    className?: string;
    maxItems?: number; // Maximum items to show on mobile
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
    items,
    className,
    maxItems = 2,
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { effectiveTheme } = useTheme();

    if (!items.length) return null;

    // On mobile, show only the last few items to prevent overflow
    const displayItems = isMobile && items.length > maxItems
        ? [
            { name: '...', href: undefined },
            ...items.slice(-maxItems)
        ]
        : items;

    return (
        <nav
            className={cn('flex', className)}
            aria-label="Breadcrumb"
        >
            <ol className="flex items-center space-x-2 overflow-x-auto">
                {displayItems.map((item, index) => (
                    <li key={`${item.name}-${index}`} className="flex items-center">
                        {index > 0 && (
                            <ChevronRightIcon
                                className="flex-shrink-0 h-4 w-4 text-gray-400 mx-2"
                                aria-hidden="true"
                            />
                        )}

                        {item.current || !item.href ? (
                            <span
                                className={cn(
                                    'text-sm font-medium',
                                    item.current
                                        ? 'text-gray-900 dark:text-white'
                                        : 'text-gray-500 dark:text-gray-400'
                                )}
                                aria-current={item.current ? 'page' : undefined}
                            >
                                {item.name}
                            </span>
                        ) : (
                            <Link
                                to={item.href}
                                className={cn(
                                    'text-sm font-medium text-blue-600 hover:text-blue-800',
                                    'dark:text-blue-400 dark:hover:text-blue-300',
                                    'transition-colors duration-200',
                                    'touch-target min-h-[44px] flex items-center'
                                )}
                            >
                                {item.name}
                            </Link>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
};

/**
 * Page header component with breadcrumbs and actions
 * Perfect for mobile-responsive page layouts
 * 
 * @example
 * <PageHeader
 *   title="Device Details"
 *   subtitle="Monitor and control device performance"
 *   breadcrumbs={breadcrumbItems}
 *   actions={<Button>Edit Device</Button>}
 *   showBackButton={true}
 * />
 */
interface PageHeaderProps {
    title: string;
    subtitle?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: React.ReactNode;
    showBackButton?: boolean;
    onBack?: () => void;
    className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
    title,
    subtitle,
    breadcrumbs = [],
    actions,
    showBackButton = false,
    onBack,
    className,
}) => {
    const isMobile = useMediaQuery('(max-width: 768px)');
    const { effectiveTheme } = useTheme();

    const handleBack = () => {
        if (onBack) {
            onBack();
        } else if (window.history.length > 1) {
            window.history.back();
        }
    };

    return (
        <div className={cn(
            'bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700',
            className
        )}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                    <div className="mb-4">
                        <Breadcrumbs items={breadcrumbs} />
                    </div>
                )}

                {/* Header Content */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                        {/* Back Button - Mobile Only */}
                        {showBackButton && isMobile && (
                            <button
                                onClick={handleBack}
                                className={cn(
                                    'touch-target p-2 rounded-md text-gray-400 hover:text-gray-600',
                                    'hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500',
                                    'dark:text-gray-300 dark:hover:text-gray-100 dark:hover:bg-gray-800',
                                    'transition-colors duration-200'
                                )}
                                aria-label="Go back"
                            >
                                <ArrowLeftIcon className="h-5 w-5" />
                            </button>
                        )}

                        {/* Title and Subtitle */}
                        <div className="min-w-0 flex-1">
                            <h1 className={cn(
                                'text-2xl font-bold text-gray-900 dark:text-white',
                                isMobile ? 'text-xl' : 'text-2xl'
                            )}>
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                    {subtitle}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    {actions && (
                        <div className="flex-shrink-0">
                            <div className={cn(
                                'flex gap-2',
                                isMobile ? 'flex-col' : 'flex-row'
                            )}>
                                {actions}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/**
 * Navigation icons
 */
const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
    </svg>
);

const ArrowLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
);

export default Breadcrumbs;
