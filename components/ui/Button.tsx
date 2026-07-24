"use client";

import React from 'react';
import clsx from 'clsx';

type Variant = 'primary' | 'subtle' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: Variant;
    size?: Size;
}

const base =
    'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
    'focus-visible:outline-none disabled:opacity-40 disabled:pointer-events-none select-none';

const variants: Record<Variant, string> = {
    primary: 'bg-accent text-on-accent hover:bg-accent-hover shadow-sm',
    subtle: 'bg-raised text-fg border border-border hover:bg-raised-hover hover:border-border-strong',
    ghost: 'text-muted hover:text-fg hover:bg-raised',
    danger: 'bg-danger-subtle text-danger border border-transparent hover:bg-danger/25',
};

const sizes: Record<Size, string> = {
    sm: 'text-xs px-2.5 py-1.5',
    md: 'text-sm px-3 py-2',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'subtle', size = 'md', className, ...props }, ref) => (
        <button
            ref={ref}
            className={clsx(base, variants[variant], sizes[size], className)}
            {...props}
        />
    )
);

Button.displayName = 'Button';

export default Button;
