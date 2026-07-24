"use client";

import React from 'react';
import clsx from 'clsx';

export interface PanelProps {
    side: 'left' | 'right';
    children: React.ReactNode;
    className?: string;
}

/** A 256px-wide docked side panel with a divider toward the canvas. */
export const Panel: React.FC<PanelProps> = ({ side, children, className }) => (
    <aside
        className={clsx(
            'flex w-64 flex-col bg-surface text-fg',
            side === 'left' ? 'border-r' : 'border-l',
            'border-border',
            className
        )}
    >
        {children}
    </aside>
);

export interface SectionHeaderProps {
    title: string;
    /** Optional trailing action (e.g. an add button). */
    action?: React.ReactNode;
    className?: string;
}

export const SectionHeader: React.FC<SectionHeaderProps> = ({ title, action, className }) => (
    <div className={clsx('flex items-center justify-between', className)}>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {action}
    </div>
);

/** A grouped container used to visually separate sections within a panel. */
export const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
    <div className={clsx('rounded-lg border border-border bg-raised/40 p-3', className)}>{children}</div>
);

export default Panel;
