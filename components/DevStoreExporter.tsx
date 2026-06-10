"use client";

import { useEffect } from 'react';
import { useStore } from '@/store/useStore';

export function DevStoreExporter() {
  useEffect(() => {
    (window as unknown as Record<string, unknown>)['__mkd_store'] = useStore;
  }, []);
  return null;
}
