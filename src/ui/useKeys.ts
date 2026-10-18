import { useEffect, useRef } from 'react';
import { useGame } from '../state/store';

/**
 * 介面元件的按鍵處理：只在 active 時監聽，handler 永遠拿到最新的 props/state。
 * 確認選單開著時，只有它自己（modal）收得到按鍵。
 */
export function useKeys(active: boolean, handler: (key: string, e: KeyboardEvent) => void, modal = false) {
  const ref = useRef(handler);
  ref.current = handler;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (!modal && useGame.getState().confirm) return;
      ref.current(e.key, e);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active]);
}

export const isConfirm = (k: string) => k === 'e' || k === 'E' || k === ' ' || k === 'Enter';
export const isCancel = (k: string) => k === 'x' || k === 'X' || k === 'Escape';
export const isUp = (k: string) => k === 'ArrowUp' || k === 'w' || k === 'W';
export const isDown = (k: string) => k === 'ArrowDown' || k === 's' || k === 'S';
export const isLeft = (k: string) => k === 'ArrowLeft' || k === 'a' || k === 'A';
export const isRight = (k: string) => k === 'ArrowRight' || k === 'd' || k === 'D';
