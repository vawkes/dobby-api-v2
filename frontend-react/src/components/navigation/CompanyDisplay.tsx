import React from 'react';
import { cn } from '../../lib/utils';

interface CompanyDisplayProps {
    companyName?: string;
    className?: string;
}

export const CompanyDisplay: React.FC<CompanyDisplayProps> = ({
    companyName,
    className,
}) => {
    const displayName = companyName?.trim() || 'Company unavailable';

    return (
        <div className={cn('min-w-0 text-sm', className)}>
            <p className="text-xs font-medium uppercase text-muted-foreground">
                Company
            </p>
            <p className="max-w-[12rem] truncate font-medium text-foreground" title={displayName}>
                {displayName}
            </p>
        </div>
    );
};

export default CompanyDisplay;
