/**
 * 釣魚：生活技能「釣魚」（crafts.ts 的 fishing），碧漪湖一帶的玩法。
 *
 * - 要有釣竿（rod，秦老漢那裡買）。站在釣點（地圖上有漣漪浮標的水面）按 E。
 * - 兩種釣法：自己拉竿（小遊戲 `ui/FishingGame.tsx`，看準時機按 E，正中紅心多拿經驗）
 *   或慢慢等（照手藝自動判定，可以連釣幾回）。每回一刻、體力 5。
 * - 上鉤的是哪種魚看釣點、時辰、天氣與手藝：清晨銀魚多、黃昏與夜裡鱖魚多、雨天甲魚會出來，
 *   湖心島才釣得到金鯉。每種魚釣過就記進「魚譜」（works 的 `fishing:魚id`，釣得越多熟練度越高）。
 * - 魚是食材，可以拿去湖鮮館學做湖鮮菜，也可以賣給阮大水。
 */

import type { ItemIcon } from './art/items';
import type { ItemDef } from './character';
import type { Period, Weather } from './time';

export type FishSpot = 'pier' | 'reeds' | 'isle';

export interface FishDef {
  id: string;
  name: string;
  icon: ItemIcon;
  price: number;
  desc: string;
  /** 釣魚幾級起才釣得到 */
  level: number;
  /** 各釣點的基本機率權重 */
  spots: Partial<Record<FishSpot, number>>;
  /** 哪些時辰、天氣多一些（權重 ×2） */
  likes?: (Period | Weather)[];
  /** 小遊戲的難度（0 好釣 … 3 難纏）：紅區越窄、指針越快 */
  fight: number;
}

export const FISH: FishDef[] = [
  { id: 'crucian', name: '鯽魚', icon: 'f_crucian', price: 3, level: 0, fight: 0, spots: { pier: 6, reeds: 4, isle: 2 }, desc: '巴掌大的鯽魚，燉湯最鮮。' },
  { id: 'lake_shrimp', name: '青蝦', icon: 'shrimp', price: 3, level: 0, fight: 0, spots: { reeds: 6, pier: 1 }, desc: '蘆葦叢裡的青殼小蝦，煮熟了才變紅。' },
  { id: 'carp', name: '鯉魚', icon: 'f_carp', price: 5, level: 0, fight: 1, spots: { pier: 4, reeds: 2, isle: 3 }, desc: '金鱗紅尾的鯉魚，力氣不小。' },
  { id: 'silverfish', name: '銀魚', icon: 'f_silver', price: 4, level: 1, fight: 0, likes: ['dawn'], spots: { pier: 2, reeds: 2, isle: 2 }, desc: '細細的一條，通體透亮，碧漪湖的名產。' },
  { id: 'grass_carp', name: '草魚', icon: 'f_grass', price: 6, level: 1, fight: 1, spots: { pier: 3, reeds: 3, isle: 2 }, desc: '青灰色的大草魚，愛啃湖邊的水草。' },
  { id: 'mandarin', name: '鱖魚', icon: 'f_mandarin', price: 12, level: 2, fight: 2, likes: ['dusk', 'night'], spots: { pier: 1, isle: 3 }, desc: '「桃花流水鱖魚肥」。身上有黑斑，背鰭帶刺，肉嫩無細刺。' },
  { id: 'turtle', name: '甲魚', icon: 'f_turtle', price: 25, level: 4, fight: 2, likes: ['rain'], spots: { reeds: 1, isle: 1 }, desc: '縮著頭的甲魚，咬住了就不鬆口。燉湯大補。' },
  { id: 'golden_carp', name: '金鯉', icon: 'f_gold', price: 60, level: 5, fight: 3, likes: ['dawn', 'dusk'], spots: { isle: 1 }, desc: '一身金鱗的鯉魚，漁家說見了金鯉，整年都順。' },
];
export const fishDef = (id: string) => FISH.find((f) => f.id === id);

export const FISH_ITEMS: Record<string, ItemDef> = {
  ...Object.fromEntries(FISH.map((f) => [f.id, { name: f.name, category: '食材', icon: f.icon, desc: f.desc, price: f.price } as ItemDef])),
  rod: { name: '釣竿', category: '雜物', icon: 'rod', desc: '秦老漢削的竹釣竿，配著麻線與魚鉤。有了它，就能在有浮標漣漪的地方釣魚。', price: 6 },
  white_carp: { name: '白鯉', category: '雜物', icon: 'f_silver', desc: '月圓之夜在望月亭釣起的白鯉，通體雪白。牠在簍子裡一動也不動。', price: 240 },
  // 蓋橋支線用的石料（story/bridge.ts）
  stone_slab: { name: '青石條', category: '雜物', icon: 'slab', desc: '青竹村北採石場鑿下的青石條，沉甸甸的。要送去雲水渡口蓋橋。', price: 0 },
  lotus_root: { name: '蓮藕', category: '食材', icon: 'lotus_root', desc: '碧漪湖荷塘裡挖的蓮藕，一節一節白胖胖的。', price: 3 },
  water_chestnut: { name: '菱角', category: '食材', icon: 'water_chestnut', desc: '兩頭尖尖的菱角，剝開是雪白的果肉。', price: 2 },
};

/** 每回釣魚的時間（刻）與體力 */
export const CAST_KE = 1;
export const CAST_STAMINA = 5;

/** 這一回上鉤的是哪種魚（手藝不夠的魚不會上鉤） */
export function rollFish(spot: FishSpot, level: number, period: Period, weather: Weather, rand: () => number = Math.random): FishDef {
  const pool = FISH.filter((f) => f.spots[spot] && level >= f.level).map((f) => {
    let w = f.spots[spot]!;
    if (f.likes?.includes(period) || f.likes?.includes(weather)) w *= 2;
    return { f, w };
  });
  let r = rand() * pool.reduce((a, p) => a + p.w, 0);
  for (const p of pool) {
    r -= p.w;
    if (r <= 0) return p.f;
  }
  return pool[0].f;
}

/** 慢慢等的成功率：手藝越好越常釣起來；雨天魚愛咬鉤 */
export const waitChance = (level: number, fight: number, weather: Weather) =>
  Math.min(0.92, 0.5 + level * 0.05 - fight * 0.08 + (weather === 'rain' ? 0.08 : 0));

/** 小遊戲的參數：紅區寬度（0–1）與指針速度（每秒來回的比例） */
export function fightParams(level: number, fight: number) {
  return {
    zone: Math.max(0.12, 0.34 - fight * 0.06 + level * 0.015),
    speed: 0.9 + fight * 0.35 - level * 0.03,
  };
}

/** 釣起一條魚得的技能經驗 */
export const catchExp = (f: FishDef, perfect: boolean) => 4 + f.fight * 3 + f.level + (perfect ? 4 : 0);
