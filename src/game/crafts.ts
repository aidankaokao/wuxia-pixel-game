/**
 * 生活技能：烹飪、紡織、學識、琴棋書畫。跟武功分開，不影響五維。
 *
 * - 每項技能有等級（0–10）與經驗，等級越高做得越好、越不容易失敗。
 * - 技能底下可以有「項目」（例如每一道菜），各自有熟練度（1–5 級），練這個項目同時替技能加經驗。
 * - 存在角色的 crafts（技能）與 works（項目，key 是「技能:項目」）。
 */

import type { Character } from './character';

export type CraftId = 'cooking' | 'weaving' | 'learning' | 'qin' | 'chess' | 'calligraphy' | 'painting';

export interface CraftDef {
  id: CraftId;
  name: string;
  group: '生活' | '學問' | '雅藝';
  desc: string;
  /** 怎麼練（顯示用） */
  howTo: string;
  /** 已經開放了沒 */
  open: boolean;
}

export const CRAFTS: CraftDef[] = [
  { id: 'cooking', name: '烹飪', group: '生活', desc: '學菜、練菜，做出好吃又補身的菜餚。', howTo: '之後在廚房或家裡的灶台學菜、練菜。', open: false },
  { id: 'weaving', name: '紡織', group: '生活', desc: '紡紗織布、裁製衣物，技藝越高做出來的衣物品級越好。', howTo: '之後開放。', open: false },
  { id: 'learning', name: '學識', group: '學問', desc: '讀書明理。學識高，說話、講價、解題都更有把握。', howTo: '之後在書房讀經史子集。', open: false },
  { id: 'qin', name: '琴', group: '雅藝', desc: '撫琴怡情，也能結交同好。', howTo: '之後開放。', open: false },
  { id: 'chess', name: '棋', group: '雅藝', desc: '黑白對弈，磨練心思。', howTo: '之後開放。', open: false },
  { id: 'calligraphy', name: '書', group: '雅藝', desc: '寫得一手好字。', howTo: '之後開放。', open: false },
  { id: 'painting', name: '畫', group: '雅藝', desc: '丹青寫意。', howTo: '之後開放。', open: false },
];
export const craftDef = (id: CraftId) => CRAFTS.find((c) => c.id === id)!;

export const CRAFT_MAX = 10;
/** 升到下一級要的經驗 */
export const craftExpToNext = (level: number) => 40 + level * 40;

const TITLES: [number, string][] = [
  [0, '未習'],
  [1, '生疏'],
  [3, '入門'],
  [5, '熟手'],
  [7, '精通'],
  [9, '名家'],
  [10, '宗師'],
];
export function craftTitle(level: number): string {
  let t = TITLES[0][1];
  for (const [lv, name] of TITLES) if (level >= lv) t = name;
  return t;
}

export interface Progress {
  level: number;
  exp: number;
}

export const craftOf = (c: Character, id: CraftId): Progress => c.crafts?.[id] ?? { level: 0, exp: 0 };

/** 技能加經驗；升級時回傳提示文字（會直接修改傳入的角色） */
export function gainCraft(c: Character, id: CraftId, amount: number): string | null {
  c.crafts ??= {};
  const p = (c.crafts[id] ??= { level: 0, exp: 0 });
  if (p.level >= CRAFT_MAX) return null;
  p.exp += amount;
  const from = p.level;
  while (p.level < CRAFT_MAX && p.exp >= craftExpToNext(p.level)) {
    p.exp -= craftExpToNext(p.level);
    p.level++;
  }
  if (p.level >= CRAFT_MAX) p.exp = 0;
  return p.level > from ? `你的「${craftDef(id).name}」提升到第 ${p.level} 級（${craftTitle(p.level)}）！` : null;
}

// ── 項目的熟練度（例如每一道菜） ─────────────────────────

export const WORK_MAX = 5;
export const workExpToNext = (level: number) => 20 + level * 20;
const workKey = (craft: CraftId, id: string) => `${craft}:${id}`;

export const workOf = (c: Character, craft: CraftId, id: string): Progress | undefined => c.works?.[workKey(craft, id)];

/** 學會一個項目（從 1 級開始） */
export function learnWork(c: Character, craft: CraftId, id: string) {
  c.works ??= {};
  c.works[workKey(craft, id)] ??= { level: 1, exp: 0 };
}

/** 項目加熟練度；升級時回傳 true */
export function gainWork(c: Character, craft: CraftId, id: string, amount: number): boolean {
  const p = workOf(c, craft, id);
  if (!p || p.level >= WORK_MAX) return false;
  p.exp += amount;
  const from = p.level;
  while (p.level < WORK_MAX && p.exp >= workExpToNext(p.level)) {
    p.exp -= workExpToNext(p.level);
    p.level++;
  }
  if (p.level >= WORK_MAX) p.exp = 0;
  return p.level > from;
}
