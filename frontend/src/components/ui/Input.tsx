'use client';

import React, { forwardRef } from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    fullWidth?: boolean;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, fullWidth = true, icon, className, ...props }, ref) => {
        return (
            <div className={clsx('mb-4', fullWidth ? 'w-full' : '')}>
                {label && (
                    <label className="block text-gray-800 text-sm font-medium mb-1">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {icon}
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={clsx(
                            'shadow-sm rounded-md border border-gray-300 focus:ring-blue-600 focus:border-blue-600 block w-full py-2 text-gray-900',
                            icon ? 'pl-10 pr-3' : 'px-3',
                            error ? 'border-red-600' : '',
                            className
                        )}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-sm text-red-700">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';

export default Input; 