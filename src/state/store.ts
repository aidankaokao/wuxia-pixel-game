import { create } from 'zustand';
import { Character, newHero } from '../game/character';
import { newWorld, World } from '../game/home';
import { advance } from '../game/time';
import type { Line } from '../game/maps/types';
import type { BattleCommand, BattleView } from '../game/battle/types';

/**
 * React 介面與 Phaser 場景共用的狀態。
 * Phaser 端用 useGame.getState() / setState() 讀寫，React 端用 hook 訂閱。
 */

export interface DialogState {
  lines: Line[];
  index: number;
  /** 有值時，最後一句會附帶選項 */
  choices?: string[];
  resolve: (choice: number) => void;
}

export type BattleMode = 'turn' | 'active';

export type AutoTactic = 'steady' | 'aggressive';

export interface Settings {
  /** 戰鬥模式：回合制，或之後開放的半即時制 */
  battleMode: BattleMode;
  /** 自動戰鬥的方針：穩健（會防禦、早點補血）或猛攻 */
  autoTactic: AutoTactic;
  /** 自動戰鬥時可不可以用藥 */
  autoItems: boolean;
  /** 半即時制：選指令時是否暫停時間（等待模式）；否則為即時模式，敵人照樣行動 */
  atbWait: boolean;
}

export const DEFAULT_SETTINGS: Settings = { battleMode: 'turn', autoTactic: 'steady', autoItems: false, atbWait: true };

/** 劇情旗標：任務進度、是否已拿過寶箱等，一律存成數字（0 表示沒發生過）。 */
export type Flags = Record<string, number>;

export type Prompt = string | { title: string; actions: { key: string; label: string }[] };

/** 劇情腳本打開的介面面板（商店、房屋），關閉時 resolve */
/** 面板：商店（person 是交易的對象；stock、title 不給就是貨郎攤子）、房屋 */
export type Panel = { kind: 'shop'; person?: string; stock?: string[]; title?: string } | { kind: 'home'; plot: string };

interface GameState {
  /** 標題畫面、建立角色或遊戲中 */
  screen: 'title' | 'create' | 'game';
  /** 素材已產生完畢，可以開始遊戲 */
  booted: boolean;
  /** 畫面上方短暫出現的提示（例如「已存檔」） */
  toast: { text: string; id: number } | null;
  hero: Character;
  flags: Flags;
  /** 日子、房產等世界狀態（存檔） */
  world: World;
  panel: (Panel & { close: () => void }) | null;
  /** 確認選單（例如讀檔前），選完 resolve(true/false) */
  confirm: { text: string; ok: string; resolve: (yes: boolean) => void } | null;
  settings: Settings;
  mapName: string;
  mapSubtitle?: string;
  /** 每次進入地圖遞增，讓地名橫幅重新播放 */
  bannerKey: number;
  dialog: DialogState | null;
  menuOpen: boolean;
  /** 劇情事件進行中（主角不能自由行動） */
  eventRunning: boolean;
  /** 面前可互動的東西（顯示在畫面上的提示）：一句話，或人物的互動清單 */
  prompt: Prompt | null;
  /** 對話或選單剛關閉的時間，用來避免同一次按鍵又觸發互動 */
  uiClosedAt: number;

  battle: BattleView | null;
  /** 戰鬥介面送出指令給戰鬥場景；結算畫面按確認時傳 null */
  battleInput: ((cmd: BattleCommand | null) => void) | null;
  /** 自動戰鬥開著（戰鬥中按 Q 切換；不存檔，同一次遊玩會延續到下一場） */
  battleAuto: boolean;
  /** 半即時制下主角的行動條 0–1（回合制時為 null） */
  battleGauge: number | null;
  /** 戰鬥中選目標時，游標指著誰（戰鬥場景據此畫出箭頭） */
  battleTarget: string | null;
  /** 被打倒的野獸何時重生：`地圖id:npc id` → 時間戳（不存檔） */
  respawnAt: Record<string, number>;

  enterMap: (name: string, subtitle?: string) => void;
  /** 顯示一段對話，全部看完後 resolve */
  say: (lines: Line[]) => Promise<void>;
  /** 顯示一句話與幾個選項，回傳選到第幾個 */
  ask: (line: Line, choices: string[]) => Promise<number>;
  advance: (choice?: number) => void;
  setMenu: (open: boolean) => void;
  setPrompt: (p: Prompt | null) => void;
  setFlag: (key: string, value: number) => void;
  /** 修改角色：傳入的函式拿到一份複本，可直接改 */
  updateHero: <T>(fn: (c: Character) => T) => T;
  /** 修改世界狀態：同上 */
  updateWorld: <T>(fn: (w: World) => T) => T;
  /** 讓時間往前走幾刻（見 time.ts）；回傳換了幾天 */
  passTime: (ke: number) => number;
  /** 打開面板，關閉後 resolve */
  openPanel: (p: Panel) => Promise<void>;
  closePanel: () => void;
  /** 跳出「確定／取消」選單 */
  askConfirm: (text: string, ok?: string) => Promise<boolean>;
  setSettings: (s: Partial<Settings>) => void;
  showToast: (text: string) => void;
  /** 回到全新的遊戲狀態（開新遊戲、讀檔、回標題前呼叫） */
  resetGame: () => void;
}

export const useGame = create<GameState>((set, get) => ({
  screen: 'title',
  booted: false,
  toast: null,
  hero: newHero(),
  flags: {},
  world: newWorld(),
  panel: null,
  confirm: null,
  settings: { ...DEFAULT_SETTINGS },
  mapName: '',
  bannerKey: 0,
  dialog: null,
  menuOpen: false,
  eventRunning: false,
  prompt: null,
  uiClosedAt: 0,
  battle: null,
  battleInput: null,
  battleTarget: null,
  battleAuto: false,
  battleGauge: null,
  respawnAt: {},

  enterMap: (name, subtitle) => set((s) => ({ mapName: name, mapSubtitle: subtitle, bannerKey: s.bannerKey + 1 })),

  say: (lines) =>
    new Promise((resolve) => {
      if (lines.length === 0) return resolve();
      set({ dialog: { lines, index: 0, resolve: () => resolve() } });
    }),

  ask: (line, choices) =>
    new Promise((resolve) => {
      set({ dialog: { lines: [line], index: 0, choices, resolve } });
    }),

  advance: (choice = 0) => {
    const d = get().dialog;
    if (!d) return;
    if (d.index + 1 < d.lines.length) {
      set({ dialog: { ...d, index: d.index + 1 } });
    } else {
      set({ dialog: null, uiClosedAt: performance.now() });
      d.resolve(choice);
    }
  },

  setMenu: (open) => set(open ? { menuOpen: true } : { menuOpen: false, uiClosedAt: performance.now() }),
  setPrompt: (p) => {
    if (JSON.stringify(get().prompt) !== JSON.stringify(p)) set({ prompt: p });
  },
  setFlag: (key, value) => set((s) => ({ flags: { ...s.flags, [key]: value } })),

  updateHero: (fn) => {
    const copy = structuredClone(get().hero);
    const result = fn(copy);
    set({ hero: copy });
    return result;
  },

  updateWorld: (fn) => {
    const copy = structuredClone(get().world);
    const result = fn(copy);
    set({ world: copy });
    return result;
  },

  passTime: (ke) => get().updateWorld((w) => advance(w, ke)),

  openPanel: (p) =>
    new Promise((resolve) => {
      set({ panel: { ...p, close: () => (set({ panel: null, uiClosedAt: performance.now() }), resolve()) } });
    }),
  closePanel: () => get().panel?.close(),

  askConfirm: (text, ok = '確定') =>
    new Promise((resolve) => {
      set({
        confirm: {
          text,
          ok,
          resolve: (yes) => {
            set({ confirm: null, uiClosedAt: performance.now() });
            resolve(yes);
          },
        },
      });
    }),

  setSettings: (s) => set((st) => ({ settings: { ...st.settings, ...s } })),
  showToast: (text) => set({ toast: { text, id: Date.now() } }),

  resetGame: () =>
    set({
      hero: newHero(),
      flags: {},
      world: newWorld(),
      panel: null,
      dialog: null,
      menuOpen: false,
      eventRunning: false,
      prompt: null,
      battle: null,
      battleInput: null,
      battleTarget: null,
      battleAuto: false,
      respawnAt: {},
    }),
}));

export const flag = (key: string) => useGame.getState().flags[key] ?? 0;

/** 介面是否擋住了地圖操作 */
export const uiBlocking = () => {
  const s = useGame.getState();
  return s.dialog !== null || s.menuOpen || s.eventRunning || s.battle !== null || s.panel !== null || s.confirm !== null;
};
