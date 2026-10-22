/**
 * 生活技能訂單：卜大勺、鍾嬸要菜，魏錦娘要織品，望江樓的汪福來要魚、魚乾、湖產與湖鮮海鮮菜。不定期下單（例：三份上品以上的桂花糕、一件精良以上的長衫），
 * 期限內交貨給銀兩、熟悉度與材料。
 *
 * - 每位下單的人同時只有一張訂單，存在 world.orders；交貨、婉拒或過期之後隔幾天（world.orderNext）才會再下單。
 * - 只挑你學會的菜、樣式（卜大勺例外：他教得了的入門、中等菜，沒學過也會下單，順便叫你來學）。
 * - 腳本在 story/orders.ts：找下單的人說話時處理接單與交貨。
 */

import { ITEMS, sellPrice, type Character } from './character';
import { DISHES, dishItem, knowsDish, QUALITY } from './cooking';
import { GRADES } from './gear';
import type { World } from './home';
import { knowsPattern, PATTERNS, wovenItem } from './weaving';
import { FISH } from './fishing';

export interface Order {
  /** 菜（cooking.ts 的菜 id）、織品（weaving.ts 的樣式 id）或貨（物品 id，例如魚、魚乾） */
  kind: 'dish' | 'woven' | 'goods';
  id: string;
  /** 最低品質：菜 0 普通、1 上品、2 精品；織品是品級 0–4 */
  q: number;
  n: number;
  /** 第幾天以前交貨 */
  due: number;
  silver: number;
  /** 額外的謝禮（物品 id → 數量） */
  items: Record<string, number>;
  /** 熟悉度（有人物檔案的人才加） */
  aff: number;
}

export interface Giver {
  id: string;
  name: string;
  kind: Order['kind'];
  /** 有人物檔案（交貨加熟悉度） */
  person?: string;
  /** 沒學過也能下單的菜（卜大勺教得了的） */
  teaches?: (d: (typeof DISHES)[number]) => boolean;
  /** 謝禮挑一樣 */
  gifts: [string, number][];
}

export const GIVERS: Giver[] = [
  { id: 'bu', name: '卜大勺', kind: 'dish', person: 'bu', teaches: (d) => d.tier <= 1 && !d.spring && !d.sea && !d.lake, gifts: [['osmanthus', 3], ['almond', 3], ['sesame', 3]] },
  { id: 'zhong', name: '鍾嬸', kind: 'dish', person: 'zhong', gifts: [['yunwu', 2], ['tea', 3], ['egg', 4]] },
  { id: 'jin', name: '魏錦娘', kind: 'woven', gifts: [['fine_silk', 1], ['silk_thread', 3]] },
  // 望江樓的汪福來：收魚、魚乾、湖產，也訂湖鮮、海鮮菜（見 story/linjiang_city.ts）
  { id: 'tower', name: '汪福來', kind: 'goods', gifts: [['yunwu', 1], ['huiqi_san', 2], ['fine_silk', 1]] },
];
export const giverDef = (id: string) => GIVERS.find((g) => g.id === id)!;

/** 酬勞：比賣給商店多一些（收購價 × 份數 × 這個倍數，再加 ORDER_TIP）；賺頭主要在謝禮與交情 */
const ORDER_MULT = 1.5;
const ORDER_TIP = 5;
const pay = (item: string, n: number) => Math.round(sellPrice(item) * n * ORDER_MULT) + ORDER_TIP;

/** 交貨期限：幾天內 */
export const ORDER_DAYS = 7;
/** 交貨、婉拒或過期之後，隔幾天才再下單 */
export const ORDER_GAP = 3;

const NUM = '零一兩三四五六七八九十';
/** 貨的量詞 */
const unitOf = (id: string) => (FISH.some((f) => f.id === id) ? '條' : id === 'lotus_root' ? '節' : '份');

/** 訂單要的東西，例如「三份上品以上的桂花糕」「一件精良以上的長衫」 */
export function orderText(o: Order): string {
  if (o.kind === 'dish') {
    const name = ITEMS[dishItem(o.id)].name;
    return `${NUM[o.n] ?? o.n}份${o.q ? `${QUALITY[o.q]}以上的` : ''}${name}`;
  }
  if (o.kind === 'goods') return `${NUM[o.n] ?? o.n}${unitOf(o.id)}${ITEMS[o.id].name}`;
  const p = PATTERNS.find((x) => x.id === o.id)!;
  return `${NUM[o.n] ?? o.n}件${o.q ? `${GRADES[o.q]}以上的` : ''}${p.name}`;
}

/** 符合訂單的物品 id（品質由低到高，交貨時先交低的） */
export function orderItems(o: Order): string[] {
  if (o.kind === 'dish') return [0, 1, 2].filter((q) => q >= o.q).map((q) => dishItem(o.id, q));
  if (o.kind === 'goods') return [o.id];
  return [0, 1, 2, 3, 4].filter((g) => g >= o.q).map((g) => wovenItem(o.id, g));
}

/** 身上有幾份符合訂單的 */
export const orderHave = (h: Character, o: Order) => orderItems(o).reduce((s, id) => s + (h.items[id] ?? 0), 0);

/** 下一張訂單：挑一道會做（或下單的人教得了）的菜、一種會織的樣式；沒得挑就是 null */
export function newOrder(g: Giver, h: Character, day: number, rand = Math.random): Order | null {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const gift = pick(g.gifts);
  if (g.kind === 'dish') {
    const pool = DISHES.filter((d) => !d.spring && (knowsDish(h, d.id) || g.teaches?.(d)));
    if (!pool.length) return null;
    const d = pick(pool);
    const q = rand() < 0.5 ? 1 : 0;
    const n = 2 + Math.floor(rand() * 2);
    return { kind: 'dish', id: d.id, q, n, due: day + ORDER_DAYS, silver: pay(dishItem(d.id, q), n), items: { [gift[0]]: gift[1] }, aff: 4 };
  }
  if (g.kind === 'goods') return goodsOrder(g, h, day, rand);
  const pool = PATTERNS.filter((p) => knowsPattern(h, p.id));
  if (!pool.length) return null;
  const p = pick(pool);
  const q = rand() < 0.4 ? 2 : 1;
  return { kind: 'woven', id: p.id, q, n: 1, due: day + ORDER_DAYS, silver: pay(wovenItem(p.id, q), 1), items: { [gift[0]]: gift[1] }, aff: 0 };
}

/**
 * 望江樓的訂貨：釣過的魚（越稀罕要得越少）、魚乾、湖產；會做湖鮮、海鮮菜的話，一半機會改訂菜。
 * 只訂你弄得到的東西（釣過的魚、有晾魚架才訂魚乾、去過碧漪湖才訂湖產）。
 */
function goodsOrder(g: Giver, h: Character, day: number, rand: () => number): Order | null {
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const gift = pick(g.gifts);
  const dishes = DISHES.filter((d) => (d.lake || d.sea) && knowsDish(h, d.id));
  if (dishes.length && rand() < 0.5) {
    const d = pick(dishes);
    const n = 2 + Math.floor(rand() * 2);
    return { kind: 'dish', id: d.id, q: 0, n, due: day + ORDER_DAYS, silver: pay(dishItem(d.id), n), items: { [gift[0]]: gift[1] }, aff: 0 };
  }
  const fish = FISH.filter((f) => h.works?.[`fishing:${f.id}`] && f.id !== 'golden_carp');
  const goods = [...fish.map((f) => f.id), ...(h.works?.['fishing:crucian'] ? ['lotus_root', 'water_chestnut'] : []), ...(h.items.dried_fish || h.works?.['fishing:carp'] ? ['dried_fish'] : [])];
  if (!goods.length) return null;
  const id = pick(goods);
  const rare = FISH.find((f) => f.id === id)?.level ?? 0;
  const n = rare >= 2 ? 1 + Math.floor(rand() * 2) : 3 + Math.floor(rand() * 4);
  // 酒樓收貨照市價再加三成（比賣給魚販划算得多）
  const silver = Math.round((ITEMS[id].price ?? 0) * n * 1.3) + 8;
  return { kind: 'goods', id, q: 0, n, due: day + ORDER_DAYS, silver, items: { [gift[0]]: gift[1] }, aff: 0 };
}

export const orderOf = (w: World, giver: string) => w.orders?.[giver];
