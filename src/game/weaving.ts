/**
 * 紡織：用棉線、絲線、皮料織出帽子、衣褲、鞋子與飾品。
 *
 * - 樣式（pattern）要先跟錦繡布莊的魏錦娘學，紡織等級夠了才教。
 * - 每件織出來的品級隨機：粗製、普通、精良、上品、極品；紡織等級、這個樣式的熟練度越高，越容易織出好東西。
 * - 織出來的服飾是 w_樣式_品級（0–4）這樣的物品，數值照 gear.ts 的部位與品級查表。
 */

import type { Character, ItemDef } from './character';
import { craftOf, gainCraft, gainWork, workOf } from './crafts';
import { gear, GearKind, GRADES } from './gear';

export interface PatternDef {
  id: string;
  name: string;
  kind: GearKind;
  /** 紡織幾級才學得會 */
  level: number;
  /** 學費（銀兩） */
  cost: number;
  /** 材料（物品 id → 數量） */
  needs: Record<string, number>;
  /** 普通品級的價錢 */
  price: number;
  desc: string;
}

export const WEAVE_MATERIALS: Record<string, ItemDef> = {
  cotton_thread: { name: '棉線', category: '雜物', icon: 'thread', desc: '一綑紡好的棉線，織布、縫衣都用得上。', price: 2 },
  silk_thread: { name: '絲線', category: '雜物', icon: 'silk', desc: '光滑柔亮的絲線，做香囊、繡花用。', price: 8 },
};
export const WEAVE_SHOP = ['cotton_thread', 'silk_thread'];

export const PATTERNS: PatternDef[] = [
  { id: 'cap', name: '布帽', kind: 'hat', level: 0, cost: 0, needs: { cotton_thread: 2 }, price: 10, desc: '自己縫的布帽。' },
  { id: 'shoes', name: '布鞋', kind: 'shoes', level: 0, cost: 0, needs: { cotton_thread: 2 }, price: 12, desc: '一針一線納出來的布鞋。' },
  { id: 'pants', name: '布褲', kind: 'bottom', level: 1, cost: 10, needs: { cotton_thread: 3 }, price: 18, desc: '親手織布、裁縫的褲子。' },
  { id: 'gown', name: '長衫', kind: 'top', level: 2, cost: 20, needs: { cotton_thread: 4 }, price: 28, desc: '親手織的布做成的長衫。' },
  { id: 'bracer', name: '皮護腕', kind: 'hand', level: 3, cost: 30, needs: { dog_pelt: 1, cotton_thread: 1 }, price: 24, desc: '用硝好的野狗皮縫成的護腕。' },
  { id: 'sachet', name: '香囊', kind: 'neck', level: 3, cost: 30, needs: { silk_thread: 2, cotton_thread: 1 }, price: 20, desc: '絲線繡花的香囊。' },
];
export const patternDef = (id: string) => PATTERNS.find((p) => p.id === id)!;

/** 織出來的服飾的物品 id */
export const wovenItem = (pattern: string, grade: number) => `w_${pattern}_${grade}`;
const GRADE_PRICE = [0.5, 1, 2, 4, 8];

export const WOVEN_ITEMS: Record<string, ItemDef> = Object.fromEntries(
  PATTERNS.flatMap((p) =>
    // 普通品級就叫本名，其他品級在前面加上品級
    GRADES.map((g, i) => [wovenItem(p.id, i), gear(i === 1 ? p.name : `${g}${p.name}`, p.kind, i, p.desc, { price: Math.round(p.price * GRADE_PRICE[i]) })]),
  ),
);

export const knowsPattern = (c: Character, id: string) => !!workOf(c, 'weaving', id);

/** 織一件：回傳品級 0–4（紡織等級、樣式熟練度越高越好，越難的樣式越難織好） */
export function weaveRoll(c: Character, p: PatternDef, rand: () => number = Math.random): number {
  const lv = craftOf(c, 'weaving').level;
  const work = workOf(c, 'weaving', p.id)?.level ?? 1;
  const q = rand() + lv * 0.09 + (work - 1) * 0.08 - p.level * 0.06;
  return q < 0.35 ? 0 : q < 0.85 ? 1 : q < 1.15 ? 2 : q < 1.45 ? 3 : 4;
}

/** 織完一件加經驗；回傳升級的提示 */
export function weaveExp(c: Character, p: PatternDef): string[] {
  const lines: string[] = [];
  if (gainWork(c, 'weaving', p.id, 10)) lines.push(`「${p.name}」越織越順手了（熟練度 ${workOf(c, 'weaving', p.id)!.level}）。`);
  const up = gainCraft(c, 'weaving', 12 + p.level * 5);
  if (up) lines.push(up);
  return lines;
}
