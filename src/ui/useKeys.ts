import { useEffect, useRef } from 'react';

/** 介面元件的按鍵處理：只在 active 時監聽，handler 永遠拿到最新的 props/state。 */
export function useKeys(active: boolean, handler: (key: string, e: KeyboardEvent) => void) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      ref.current(e.key, e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

export const isConfirm = (k: string) => k === 'e' || k === 'E' || k === ' ' || k === 'Enter';
export const isCancel = (k: string) => k === 'x' || k === 'X' || k === 'Escape';
