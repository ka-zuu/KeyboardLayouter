"use client";

import React from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

/**
 * Styled native <select> with a consistent chevron and token colors.
 * Native options can't be fully themed cross-browser; apply `bg-raised` on
 * <option> in the caller for the best result on dark UIs.
 */
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
    ({ className, children, ...props }, ref) => (
        <div className="relative">
            <select
                ref={ref}
                className={clsx(
                    'w-full appearance-none rounded-md bg-inset text-fg border border-border',
                    'pl-2.5 pr-8 py-1.5 text-sm cursor-pointer transition-colors',
                    'focus:border-accent focus-visible:outline-none',
                    className
                )}
                {...props}
            >
                {children}
            </select>
            <ChevronDown
                size={14}
                className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle"
            />
        </div>
    )
);

Select.displayName = 'Select';

export default Select;
