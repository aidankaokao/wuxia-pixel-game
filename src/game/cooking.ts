/**
 * 烹飪：食材、菜餚與做菜。
 *
 * - 菜分飯品、麵品、湯品、甜品四類，每類四道（入門、中等、進階、拿手），另有燉山豬肉。
 *   飯麵回氣血與體力，湯回內力，甜品回一點體力、接下來幾場戰鬥武功經驗加成。越難的菜效果越好。
 * - 每道菜做出來有品質：普通、上品、精品（物品 id 是 菜id、菜id_2、菜id_3），上品效果 ×1.3、精品 ×1.6。
 * - 做菜要先學會（跟卜大勺學）；學會後每道菜有熟練度 1–5（crafts.ts 的 works），熟練度越高越不會失手、越容易做出好菜。
 * - 菜餚跟藥品一樣，平時與戰鬥中都能吃（戰鬥中只算氣血、內力）。
 */

import type { ItemIcon } from './art/items';
import type { Character, ItemDef } from './character';
import { craftOf, gainCraft, gainWork, workOf } from './crafts';

export type DishKind = '飯品' | '麵品' | '湯品' | '甜品';
export const DISH_KINDS: DishKind[] = ['飯品', '麵品', '湯品', '甜品'];
export const DISH_TIERS = ['入門', '中等', '進階', '拿手'] as const;
/** 學各階的菜要的烹飪等級 */
export const TIER_LEVEL = [0, 2, 4, 6];
export const QUALITY = ['普通', '上品', '精品'] as const;
const QUALITY_MULT = [1, 1.3, 1.6];

// ── 食材 ────────────────────────────────────────────────

export const INGREDIENTS: Record<string, ItemDef> = {
  rice: { name: '米', category: '食材', icon: 'sack', desc: '一小袋白米。', price: 2 },
  flour: { name: '麵粉', category: '食材', icon: 'flour', desc: '磨得細細的麵粉，揉麵、做點心都用得上。', price: 2 },
  egg: { name: '雞蛋', category: '食材', icon: 'egg', desc: '新鮮的雞蛋。', price: 3 },
  tofu: { name: '豆腐', category: '食材', icon: 'tofu', desc: '一方嫩豆腐。', price: 2 },
  greens: { name: '青菜', category: '食材', icon: 'greens', desc: '菜圃裡剛摘的青菜。', price: 1 },
  radish: { name: '蘿蔔', category: '食材', icon: 'radish', desc: '白白胖胖的蘿蔔。', price: 1 },
  chicken: { name: '雞肉', category: '食材', icon: 'chicken', desc: '一隻宰好的雞。', price: 8 },
  mushroom: { name: '野菌', category: '食材', icon: 'mushroom', desc: '山裡採的野菌，煮湯最鮮。', price: 5 },
  redbean: { name: '紅豆', category: '食材', icon: 'beans', desc: '一把紅豆。', price: 2 },
  sugar: { name: '糖', category: '食材', icon: 'sugar', desc: '一包粗糖。', price: 3 },
  osmanthus: { name: '桂花', category: '食材', icon: 'flower', desc: '曬乾的桂花，香氣濃郁。', price: 4 },
  sesame: { name: '芝麻', category: '食材', icon: 'seeds', desc: '炒香的黑芝麻。', price: 3 },
  almond: { name: '杏仁', category: '食材', icon: 'nut', desc: '去了殼的杏仁。', price: 5 },
};

// ── 菜餚 ────────────────────────────────────────────────

export interface DishDef {
  id: string;
  name: string;
  kind: DishKind;
  /** 0 入門、1 中等、2 進階、3 拿手 */
  tier: number;
  /** 食材（id → 數量）；山豬肉用原本的 boar_meat */
  needs: Record<string, number>;
  /** 普通品質的效果 */
  hp?: number;
  qi?: number;
  stamina?: number;
  /** 甜品：接下來幾場戰鬥武功經驗加成 */
  treat?: { battles: number; mult: number };
  desc: string;
  /** 只在鳴泉廚房做得出來（要用鳴泉的泉水） */
  spring?: boolean;
}

export const DISHES: DishDef[] = [
  // 飯品：氣血與體力
  { id: 'baifan', name: '白米飯', kind: '飯品', tier: 0, needs: { rice: 1 }, hp: 40, stamina: 20, desc: '一碗熱騰騰的白飯，粒粒分明。' },
  { id: 'danchaofan', name: '蛋炒飯', kind: '飯品', tier: 1, needs: { rice: 1, egg: 1, greens: 1 }, hp: 70, stamina: 30, desc: '金黃的蛋包著每一粒飯，撒了點青菜末。' },
  { id: 'zhutongfan', name: '竹筒香飯', kind: '飯品', tier: 2, needs: { rice: 2, boar_meat: 1, mushroom: 1 }, hp: 110, stamina: 45, desc: '米和肉、菌塞進竹筒裡烤，打開滿是竹香。' },
  { id: 'laweifan', name: '臘味煲飯', kind: '飯品', tier: 3, needs: { rice: 2, boar_meat: 2, greens: 1 }, hp: 160, stamina: 60, desc: '瓦煲煮飯，臘肉的油滲進飯裡，鍋底還有一層焦香的鍋巴。' },
  // 麵品：體力為主，也回氣血
  { id: 'yangchun', name: '陽春麵', kind: '麵品', tier: 0, needs: { flour: 1, greens: 1 }, stamina: 35, hp: 20, desc: '清湯細麵，幾根青菜，簡簡單單。' },
  { id: 'rouzao', name: '肉燥麵', kind: '麵品', tier: 1, needs: { flour: 1, boar_meat: 1 }, stamina: 50, hp: 40, desc: '細切的肉末滷得油亮，拌著麵吃。' },
  { id: 'daoxiao', name: '刀削麵', kind: '麵品', tier: 2, needs: { flour: 2, boar_meat: 1, greens: 1 }, stamina: 70, hp: 60, desc: '麵片一刀一刀削進鍋裡，又厚又有嚼勁。' },
  { id: 'quanshui', name: '泉水涼麵', kind: '麵品', tier: 3, needs: { flour: 2, egg: 1, greens: 1, radish: 1 }, stamina: 100, hp: 80, spring: true, desc: '用鳴泉的泉水冰鎮過的麵，清爽彈牙，是卜大勺的拿手絕活。' },
  // 湯品：內力
  { id: 'doufutang', name: '青菜豆腐湯', kind: '湯品', tier: 0, needs: { greens: 1, tofu: 1 }, qi: 30, desc: '清清淡淡的一碗湯。' },
  { id: 'luobotang', name: '蘿蔔排骨湯', kind: '湯品', tier: 1, needs: { radish: 1, boar_meat: 1 }, qi: 50, hp: 30, desc: '排骨熬得軟爛，蘿蔔吸飽了湯汁。' },
  { id: 'jitang', name: '山菌雞湯', kind: '湯品', tier: 2, needs: { chicken: 1, mushroom: 2 }, qi: 80, hp: 50, desc: '整隻雞和野菌慢火熬了兩個時辰，湯色金黃。' },
  { id: 'qingdun', name: '鳴泉清燉', kind: '湯品', tier: 3, needs: { chicken: 1, boar_meat: 1, radish: 1, mushroom: 1 }, qi: 120, hp: 80, spring: true, desc: '泉水清燉，不加一點醬色，喝一口通體舒暢。鳴泉劍派待客的招牌湯。' },
  // 甜品：一點體力，加上接下來幾場戰鬥的經驗加成
  { id: 'hongdou', name: '紅豆湯', kind: '甜品', tier: 0, needs: { redbean: 1, sugar: 1 }, stamina: 15, treat: { battles: 2, mult: 1.1 }, desc: '紅豆煮得綿密，甜而不膩。' },
  { id: 'guihua', name: '桂花糕', kind: '甜品', tier: 1, needs: { rice: 1, osmanthus: 1, sugar: 1 }, stamina: 20, treat: { battles: 3, mult: 1.15 }, desc: '米糕上撒著桂花，咬一口滿嘴花香。' },
  { id: 'tangyuan', name: '芝麻湯圓', kind: '甜品', tier: 2, needs: { rice: 1, sesame: 1, sugar: 1 }, stamina: 25, treat: { battles: 3, mult: 1.2 }, desc: '糯米皮包著流心的芝麻餡，小心燙口。' },
  { id: 'xingren', name: '杏仁酥', kind: '甜品', tier: 3, needs: { flour: 1, almond: 1, sugar: 1, egg: 1 }, stamina: 30, treat: { battles: 4, mult: 1.25 }, desc: '酥得一碰就掉渣，杏仁香氣十足。' },
];
/** 燉山豬肉：家裡灶台本來就會燉的菜，不用學 */
export const STEW: DishDef = { id: 'stew', name: '燉山豬肉', kind: '湯品', tier: 0, needs: { boar_meat: 1 }, hp: 150, desc: '燉得軟爛的山豬肉，香氣撲鼻。' };

export const dishDef = (id: string) => (id === 'stew' ? STEW : DISHES.find((d) => d.id === id));

const ICON: Record<DishKind, ItemIcon> = { 飯品: 'rice', 麵品: 'noodle', 湯品: 'soup', 甜品: 'sweet' };

/** 某道菜某個品質的物品 id（q：0 普通、1 上品、2 精品） */
export const dishItem = (id: string, q = 0) => (q ? `${id}_${q + 1}` : id);

function effectText(d: { hp?: number; qi?: number; stamina?: number; treat?: DishDef['treat'] }) {
  const parts = [d.hp && `氣血 ${d.hp}`, d.qi && `內力 ${d.qi}`, d.stamina && `體力 ${d.stamina}`].filter(Boolean);
  return `${parts.length ? `回復${parts.join('、')}。` : ''}${d.treat ? `吃了心情好：接下來 ${d.treat.battles} 場戰鬥武功經驗 ×${d.treat.mult}。` : ''}`;
}

/** 每道菜三種品質的物品 */
function dishItems(d: DishDef): Record<string, ItemDef> {
  const out: Record<string, ItemDef> = {};
  QUALITY.forEach((qName, q) => {
    const m = QUALITY_MULT[q];
    const eff = {
      hp: d.hp && Math.round(d.hp * m),
      qi: d.qi && Math.round(d.qi * m),
      stamina: d.stamina && Math.round(d.stamina * m),
      treat: d.treat && { battles: d.treat.battles + q, mult: d.treat.mult },
    };
    const base = d.id === 'stew' ? 40 : 6 + d.tier * 8 + Object.values(d.needs).reduce((a, n) => a + n, 0) * 3;
    out[dishItem(d.id, q)] = {
      name: q ? `${d.name}（${qName}）` : d.name,
      category: '菜餚',
      icon: d.id === 'stew' ? 'stew' : ICON[d.kind],
      desc: `${d.desc}${effectText(eff)}`,
      ...eff,
      price: Math.round(base * m),
      dish: d.id,
      quality: q,
    };
  });
  return out;
}

export const FOOD_ITEMS: Record<string, ItemDef> = {
  ...INGREDIENTS,
  ...Object.assign({}, ...[STEW, ...DISHES].map(dishItems)),
};

// ── 做菜 ────────────────────────────────────────────────

export const knowsDish = (c: Character, id: string) => id === 'stew' || !!workOf(c, 'cooking', id);

/** 還缺哪些食材（名稱×數量）；全齊回傳空陣列 */
export function missing(c: Character, d: DishDef, names: (id: string) => string): string[] {
  return Object.entries(d.needs)
    .filter(([id, n]) => (c.items[id] ?? 0) < n)
    .map(([id, n]) => `${names(id)}×${n - (c.items[id] ?? 0)}`);
}

export const needsText = (d: DishDef, names: (id: string) => string) =>
  Object.entries(d.needs)
    .map(([id, n]) => `${names(id)}${n > 1 ? `×${n}` : ''}`)
    .join('、');

/**
 * 做一道菜的結果：-1 失手、0 普通、1 上品、2 精品。
 * 烹飪等級、這道菜的熟練度、灶台好壞都會加分；菜越難越容易失手。
 */
export function cookRoll(c: Character, d: DishDef, stove: number, rand: () => number = Math.random): number {
  const lv = craftOf(c, 'cooking').level;
  const work = workOf(c, 'cooking', d.id)?.level ?? 1;
  const q = rand() + lv * 0.05 + (work - 1) * 0.1 + stove * 0.05 - d.tier * 0.1;
  if (q < 0.12) return -1;
  if (q > 1.15) return 2;
  if (q > 0.85) return 1;
  return 0;
}

/** 做完一道菜後加經驗（失手也有一點）；回傳升級的提示 */
export function cookExp(c: Character, d: DishDef, failed: boolean): string[] {
  const lines: string[] = [];
  // 手藝比這道菜高出一截（高過下一階的門檻）時，經驗減半
  const easy = d.tier < 3 && craftOf(c, 'cooking').level >= TIER_LEVEL[d.tier + 1];
  const up = gainCraft(c, 'cooking', Math.round((10 + d.tier * 6) * (failed ? 0.4 : 1) * (easy ? 0.5 : 1)));
  if (d.id !== 'stew' && gainWork(c, 'cooking', d.id, failed ? 4 : 10)) {
    lines.push(`「${d.name}」越做越順手了（熟練度 ${workOf(c, 'cooking', d.id)!.level}）。`);
  }
  if (up) lines.push(up);
  return lines;
}

/** 廚房每天的大鍋飯：照日子輪流（入門與中等的菜） */
export function dailyMeal(day: number): DishDef {
  const pool = DISHES.filter((d) => d.tier <= 1);
  return pool[(day * 5 + 3) % pool.length];
}
