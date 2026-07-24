"use client";

import React from 'react';
import clsx from 'clsx';

const inputBase =
    'w-full rounded-md bg-inset text-fg border border-border px-2.5 py-1.5 text-sm ' +
    'placeholder:text-subtle transition-colors focus:border-accent focus-visible:outline-none';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
    ({ className, ...props }, ref) => (
        <input ref={ref} className={clsx(inputBase, className)} {...props} />
    )
);

Input.displayName = 'Input';

export interface NumberFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
    /** Optional trailing unit adornment (e.g. "U", "°"). */
    unit?: string;
}

export const NumberField = React.forwardRef<HTMLInputElement, NumberFieldProps>(
    ({ unit, className, ...props }, ref) => (
        <div className="relative">
            <input
                ref={ref}
                type="number"
                className={clsx(inputBase, 'tabular-nums', unit && 'pr-7', className)}
                {...props}
            />
            {unit && (
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-subtle">
                    {unit}
                </span>
            )}
        </div>
    )
);

NumberField.displayName = 'NumberField';

export default Input;
