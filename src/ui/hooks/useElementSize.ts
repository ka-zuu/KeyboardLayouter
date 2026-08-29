/** `ResizeObserver` で要素の実ピクセルサイズを取得する。 */
import { useEffect, useRef, useState } from 'react';

export interface ElementSizePx {
  width: number;
  height: number;
}

export function useElementSize<T extends HTMLElement>(): [React.RefObject<T | null>, ElementSizePx] {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<ElementSizePx>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (): void => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, size];
}
