import { create } from 'zustand';
import { Character, newHero } from '../game/character';
import type { Line } from '../game/maps/types';

/**
 * React 介面與 Phaser 場景共用的狀態。
 * Phaser 端用 useGame.getState() / setState() 讀寫，React 端用 hook 訂閱。
 */

export interface DialogState {
  lines: Line[];
  index: number;
  onClose?: () => void;
}

interface GameState {
  hero: Character;
  mapName: string;
  mapSubtitle?: string;
  /** 每次進入地圖遞增，讓地名橫幅重新播放 */
  bannerKey: number;
  dialog: DialogState | null;
  menuOpen: boolean;
  /** 面前可互動的東西（顯示在畫面上的提示） */
  prompt: string | null;
  /** 對話或選單剛關閉的時間，用來避免同一次按鍵又觸發互動 */
  uiClosedAt: number;

  enterMap: (name: string, subtitle?: string) => void;
  say: (lines: Line[], onClose?: () => void) => void;
  advance: () => void;
  setMenu: (open: boolean) => void;
  setPrompt: (p: string | null) => void;
}

export const useGame = create<GameState>((set, get) => ({
  hero: newHero(),
  mapName: '',
  bannerKey: 0,
  dialog: null,
  menuOpen: false,
  prompt: null,
  uiClosedAt: 0,

  enterMap: (name, subtitle) => set((s) => ({ mapName: name, mapSubtitle: subtitle, bannerKey: s.bannerKey + 1 })),

  say: (lines, onClose) => {
    if (lines.length === 0) return;
    set({ dialog: { lines, index: 0, onClose } });
  },

  advance: () => {
    const d = get().dialog;
    if (!d) return;
    if (d.index + 1 < d.lines.length) {
      set({ dialog: { ...d, index: d.index + 1 } });
    } else {
      set({ dialog: null, uiClosedAt: performance.now() });
      d.onClose?.();
    }
  },

  setMenu: (open) => set(open ? { menuOpen: true } : { menuOpen: false, uiClosedAt: performance.now() }),
  setPrompt: (p) => {
    if (get().prompt !== p) set({ prompt: p });
  },
}));

/** 介面是否擋住了地圖操作 */
export const uiBlocking = () => {
  const s = useGame.getState();
  return s.dialog !== null || s.menuOpen;
};
