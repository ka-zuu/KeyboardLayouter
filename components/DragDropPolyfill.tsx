'use client';

import { useEffect } from 'react';
import { polyfill } from 'mobile-drag-drop';
import { scrollBehaviourDragImageTranslateOverride } from 'mobile-drag-drop/scroll-behaviour';

export default function DragDropPolyfill() {
  useEffect(() => {
    polyfill({
      dragImageTranslateOverride: scrollBehaviourDragImageTranslateOverride,
    });

    // Workaround for some touch issues if needed
    const handler = function(e: TouchEvent) {
        // e.preventDefault() if we want to stop scrolling globally, but be careful.
        // For now, this listener was just to ensure 'active' listeners exist if needed by polyfill or browser quirks.
    };
    window.addEventListener('touchmove', handler, { passive: false });

    return () => {
        window.removeEventListener('touchmove', handler);
    };
  }, []);

  return null;
}
