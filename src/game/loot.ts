/**
 * 到處翻找：茶几、書架、罈子、攤子這類沒有劇情的擺設，還有花叢、石頭，偶爾藏著東西。
 *
 * - 哪裡有東西每天重新隨機（依存檔的 world.seed、日子與地圖決定），所以記不住位置；同一天讀檔重來結果也一樣。
 * - 翻到了記在 world.daily（`loot:地圖:x,y`），當天不會再有。
 * - 翻到空的：擺設照常顯示描述，花叢、石頭只冒一個「什麼也沒有」的想法泡泡——不會透露哪裡有東西。
 */

import type { MapDef, PropDef } from './maps/types';
import type { World } from './home';
import { usedToday } from './home';

/** 能翻的地塊：花叢、石頭 */
export const SEARCH_TILES: Record<string, string> = { '*': 'flower', o: 'rock' };
/** 這些擺設不能翻（告示、牌坊、船、旗子……） */
const SKIP = /^(sign|bulletin|paifang|boat|flag|stone_tablet)/;

/** 每一處藏東西的機率；一張地圖一天最多藏幾處 */
const CHANCE = 0.06;
const MAX_PER_MAP = 2;

export const searchableProp = (p: PropDef) => !p.script && !p.passable && !!p.lines && !SKIP.test(typeof p.sprite === 'string' ? p.sprite : '');

/** 一處能翻的地方：擺設以左上角那一格為準 */
export interface Spot {
  key: string;
  kind: 'prop' | 'flower' | 'rock';
}

/** 字串雜湊成種子，再用 mulberry32 產生 0–1 的亂數 */
function rng(text: string) {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface Loot {
  item?: string;
  silver?: number;
  n: number;
}

type Entry = { weight: number; item?: string; silver?: [number, number]; n?: [number, number] };

/** 室外：草藥、野菌、零錢；偶爾一個錢袋 */
const OUTDOOR: Entry[] = [
  { weight: 30, item: 'herb', n: [1, 2] },
  { weight: 14, item: 'mushroom', n: [1, 1] },
  { weight: 24, silver: [2, 8] },
  { weight: 8, item: 'cotton_thread', n: [1, 2] },
  { weight: 8, item: 'yangqi_wan', n: [1, 1] },
  { weight: 6, item: 'jinchuang', n: [1, 1] },
  { weight: 2, silver: [30, 60] },
];

/** 室內：零錢、茶葉、藥、針線 */
const INDOOR: Entry[] = [
  { weight: 34, silver: [1, 6] },
  { weight: 14, item: 'tea', n: [1, 1] },
  { weight: 10, item: 'jinchuang', n: [1, 1] },
  { weight: 10, item: 'silk_thread', n: [1, 1] },
  { weight: 10, item: 'cotton_thread', n: [1, 2] },
  { weight: 8, item: 'yangqi_wan', n: [1, 1] },
  { weight: 6, item: 'osmanthus', n: [1, 1] },
  { weight: 3, silver: [20, 50] },
];

const between = (r: () => number, [a, b]: [number, number]) => a + Math.floor(r() * (b - a + 1));

/** 這張地圖今天藏東西的地方：key → 東西 */
export function lootToday(world: World, def: MapDef, spots: Spot[]): Map<string, Loot> {
  const out = new Map<string, Loot>();
  if (def.id.startsWith('home:')) return out;
  const table = def.theme ? INDOOR : OUTDOOR;
  const total = table.reduce((s, e) => s + e.weight, 0);
  // 先把地方洗牌，免得總是地圖上方的先被選中
  const order = rng(`${world.seed ?? 0}:${world.day}:${def.id}`);
  const shuffled = spots.map((s) => ({ s, k: order() })).sort((a, b) => a.k - b.k).map((x) => x.s);
  for (const s of shuffled) {
    if (out.size >= MAX_PER_MAP) break;
    const r = rng(`${world.seed ?? 0}:${world.day}:${def.id}:${s.key}`);
    if (r() >= CHANCE) continue;
    let w = r() * total;
    const e = table.find((x) => (w -= x.weight) < 0)!;
    out.set(s.key, e.silver ? { silver: between(r, e.silver), n: 1 } : { item: e.item, n: between(r, e.n!) });
  }
  return out;
}

export const lootKey = (mapId: string, key: string) => `loot:${mapId}:${key}`;
export const looted = (world: World, mapId: string, key: string) => usedToday(world, lootKey(mapId, key)) > 0;

/** 翻找時的說法 */
export const SEARCH_TEXT: Record<Spot['kind'], string> = {
  prop: '你順手翻了翻，',
  flower: '你撥開花叢，',
  rock: '你搬開石頭，',
};
