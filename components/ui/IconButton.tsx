"use client";

import React from 'react';
import clsx from 'clsx';

type Variant = 'ghost' | 'active';

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    /** Accessible label — also shown as the native tooltip. Required for icon-only buttons. */
    label: string;
    variant?: Variant;
}

const variants: Record<Variant, string> = {
    ghost: 'text-muted hover:text-fg hover:bg-raised',
    active: 'text-fg bg-raised',
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
    ({ label, variant = 'ghost', className, children, ...props }, ref) => (
        <button
            ref={ref}
            title={label}
            aria-label={label}
            className={clsx(
                'inline-flex items-center justify-center rounded-md p-2 transition-colors',
                'focus-visible:outline-none disabled:opacity-30 disabled:pointer-events-none',
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </button>
    )
);

IconButton.displayName = 'IconButton';

export default IconButton;
