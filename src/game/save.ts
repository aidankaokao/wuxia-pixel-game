import { Character, clampVitals, newHero, SKILLS, SLOT_LIMIT, slotOf } from './character';
import type { Dir } from './constants';
import { MAPS } from './maps';
import { newWorld, World } from './home';
import { START_TIME, timeText } from './time';
import { Flags, Settings, useGame } from '../state/store';

/**
 * 存檔：存在瀏覽器的 localStorage。
 * 一個自動存檔欄位（進入地圖、劇情或戰鬥結束、關閉頁面時寫入）、一個即時存檔欄位（Ctrl/Cmd+S），
 * 以及三個手動欄位。
 */

export type SlotId = 'quick' | 'auto' | '1' | '2' | '3';
export const SLOTS: SlotId[] = ['quick', 'auto', '1', '2', '3'];
export const SLOT_NAME: Record<SlotId, string> = { quick: '即時存檔', auto: '自動存檔', 1: '檔案一', 2: '檔案二', 3: '檔案三' };
/** 可以手動存檔的欄位 */
export const MANUAL_SLOTS: SlotId[] = ['1', '2', '3'];

/** 存檔格式有不相容的改變時遞增；舊版本在 migrate() 裡轉換，無法轉換的舊檔會被忽略 */
const VERSION = 6;

export interface Position {
  mapId: string;
  mapName: string;
  x: number;
  y: number;
  facing: Dir;
}

export interface SaveData extends Position {
  version: number;
  savedAt: number;
  hero: Character;
  flags: Flags;
  settings: Settings;
  world: World;
}

/** 目前主角的位置，由地圖場景提供 */
let position: () => Position | null = () => null;
export const setPositionProvider = (fn: () => Position | null) => {
  position = fn;
};

const key = (slot: SlotId) => `wuxia.save.${slot}`;

export function readSave(slot: SlotId): SaveData | null {
  try {
    const raw = localStorage.getItem(key(slot));
    if (!raw) return null;
    const d = migrate(JSON.parse(raw));
    // 存在室內時，要那間房子還在才算數
    const inHome = d?.mapId.startsWith('home:') && d.world.estates[d.mapId.slice(5)];
    if (!d || !(MAPS[d.mapId] || inHome)) return null;
    return d;
  } catch {
    return null;
  }
}

export function writeSave(slot: SlotId): boolean {
  const pos = position();
  if (!pos) return false;
  const s = useGame.getState();
  const data: SaveData = { version: VERSION, savedAt: Date.now(), ...pos, hero: s.hero, flags: s.flags, settings: s.settings, world: s.world };
  try {
    localStorage.setItem(key(slot), JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** 最近一次的存檔（標題畫面的「繼續遊戲」） */
export function latestSave(): SaveData | null {
  return SLOTS.map(readSave).reduce<SaveData | null>((best, d) => (d && (!best || d.savedAt > best.savedAt) ? d : best), null);
}

/** 網址帶了開發用參數（從指定地圖、位置、旗標開始） */
export const devStart = () => {
  const q = new URLSearchParams(location.search);
  return q.has('map') || q.has('at') || q.has('flags');
};

/** 現在能不能存檔：對話、劇情、戰鬥進行到一半的狀態存不下來 */
export function canSave(): boolean {
  const s = useGame.getState();
  return s.screen === 'game' && !s.dialog && !s.eventRunning && !s.battle;
}

/** 自動存檔；開發測試時不存，以免蓋掉真正的進度 */
export function autosave() {
  if (devStart() || useGame.getState().screen !== 'game') return;
  writeSave('auto');
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** 把舊版本的存檔轉成目前的格式 */
function migrate(d: any): SaveData | null {
  if (d?.version === 1) {
    // v1：五維是「境界＋熟練度」，武功只有境界；沒有姓氏、裝備與武學點數
    const h = d.hero;
    const base: any = {};
    for (const [k, v] of Object.entries<any>(h.attrs ?? {})) base[k] = Math.round(v.realm * 10 + v.exp / 10);
    const skills: any[] = (h.skills ?? [])
      .filter((s: any) => SKILLS[s.id])
      .map((s: any) => ({ id: s.id, level: s.realm, exp: 0, equipped: true, fails: 0, roll: Math.random() }));
    // 秘笈是 v2 才有的，已經走過對應劇情的舊檔直接補上
    const items = { ...(h.items ?? {}) };
    if (d.flags?.stele) items.manual_zhuying = 1;
    if (d.flags?.q_bandits === 3) items.manual_qingzhu = 1;
    d = { ...d, version: 2, hero: { ...h, surname: '', given: h.name, base, skills, items, points: 0 } };
    delete d.hero.attrs;
  }
  if (d?.version === 2) {
    // v2：裝備只記「有沒有裝」；v3 改記「裝在第幾格」，依各類欄位的順序排進去
    const used: Record<string, number> = {};
    for (const s of d.hero.skills) {
      const slot = SKILLS[s.id] ? slotOf(SKILLS[s.id].kind) : 'outer';
      const n = used[slot] ?? 0;
      s.pos = s.equipped && n < SLOT_LIMIT[slot] ? n : null;
      if (s.pos !== null) used[slot] = n + 1;
      delete s.equipped;
    }
    d.version = 3;
  }
  if (d?.version === 3) {
    // v3：還沒有悟招，學會武功就會全部招式。v4 起要一招一招悟，舊檔原本會的招式保留
    const before = ['chongquan', 'tiaoxi', 'pozhu', 'fengyao'];
    for (const s of d.hero.skills) {
      const defs = SKILLS[s.id]?.moves ?? [];
      s.moves = defs.filter((m, i) => i === 0 || before.includes(m.id)).map((m) => m.id);
      s.insight = 0;
    }
    d.version = 4;
  }
  if (d?.version === 4) {
    // v4：還沒有房產與日子。已經跟村長覆命的舊檔補上地契
    d.world = newWorld();
    if (d.flags?.q_bandits === 3 && !d.flags.home_deed) d.flags.home_deed = 1;
    d.version = 5;
  }
  if (d?.version === 5) {
    // v5：還沒有人際關係與名聲。名聲依已完成的劇情補上
    const f = d.flags ?? {};
    d.hero.fame = (f.bandit_scouts ? 5 : 0) + (f.bandit_boss ? 20 : 0) + (f.q_bandits === 3 ? 15 : 0);
    delete d.hero.title;
    d.world.relations = {};
    d.version = 6;
  }
  return d?.version === VERSION ? (d as SaveData) : null;
}

/** 讀檔時補上世界狀態新加的欄位（例如時辰、天氣） */
export const restoreWorld = (w: World): World => ({ ...newWorld(), ...structuredClone(w) });

/** 讀檔時補上新版本才有的欄位，避免舊存檔少了東西 */
export function restoreHero(saved: Character): Character {
  const fresh = newHero();
  const c: Character = {
    ...fresh,
    ...saved,
    base: { ...fresh.base, ...saved.base },
    extra: { ...fresh.extra, ...saved.extra },
    fame: saved.fame ?? 0,
    items: saved.items ?? {},
  };
  c.name = c.surname + c.given;
  clampVitals(c);
  return c;
}

export function describeSave(d: SaveData): string {
  const t = new Date(d.savedAt);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.mapName}　第 ${d.world.day} 日 ${timeText(d.world.time ?? START_TIME)}　銀兩 ${d.hero.silver}　${t.getMonth() + 1}/${t.getDate()} ${pad(t.getHours())}:${pad(t.getMinutes())}`;
}
