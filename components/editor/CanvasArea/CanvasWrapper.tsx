"use client";

import dynamic from 'next/dynamic';

const MainCanvas = dynamic(() => import('./MainCanvas'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-canvas flex items-center justify-center text-subtle">Loading Canvas...</div>,
});

export default MainCanvas;
