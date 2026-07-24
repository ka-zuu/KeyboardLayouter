"use client";

import React from 'react';
import clsx from 'clsx';

export interface FieldProps {
    label: string;
    children: React.ReactNode;
    /** Optional trailing element rendered next to the label (e.g. a hint). */
    aside?: React.ReactNode;
    className?: string;
}

/** Label + control wrapper with the app's standard uppercase field label. */
export const Field: React.FC<FieldProps> = ({ label, children, aside, className }) => (
    <div className={className}>
        <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-medium uppercase tracking-wide text-subtle">{label}</span>
            {aside}
        </div>
        {children}
    </div>
);

export default Field;

/** A small inline label (e.g. "X", "Row") shown beside compact number inputs. */
export const InlineLabel: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <span className={clsx('text-xs text-muted', className)}>{children}</span>
);
