"use client";

import React from 'react';
import TopBar from './TopBar';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';

interface EditorLayoutProps {
    children: React.ReactNode;
}

const EditorLayout: React.FC<EditorLayoutProps> = ({ children }) => {
    return (
        <div className="flex flex-col h-screen w-screen overflow-hidden bg-neutral-900">
            <TopBar />
            <div className="flex flex-1 overflow-hidden">
                <LeftSidebar />
                <main className="flex-1 relative overflow-hidden">
                    {children}
                </main>
                <RightSidebar />
            </div>
        </div>
    );
};

export default EditorLayout;
