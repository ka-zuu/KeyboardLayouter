"use client";

import dynamic from 'next/dynamic';

const MainCanvas = dynamic(() => import('./MainCanvas'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-neutral-900 flex items-center justify-center text-gray-500">Loading Canvas...</div>,
});

export default MainCanvas;
