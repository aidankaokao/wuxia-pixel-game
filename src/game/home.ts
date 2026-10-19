/**
 * 房產系統：空地、房屋等級、家具、擺設風格。
 *
 * - 地圖上有幾塊「空地」（MapDef.plots），買下（或用地契）後蓋成房屋，記在 world.estates。
 * - 房屋等級決定面積與能放哪些家具；每件家具另有自己的等級（1–3），花錢升級後效果變好。
 * - 擺設不由玩家安排：每個等級有一張固定的房間配置圖，圖上用字元標出家具的位置（錨點），
 *   選擇的「風格」決定哪件家具放在哪個錨點、用什麼配色，並附帶一點小效果。
 * 同一套配置之後也能拿來產生 NPC 的家。
 */

import type { SectState } from './sect';
import { START_TIME, type Weather } from './time';
import type { Relation } from './social';

export type HomeStyle = 'plain' | 'scholar' | 'martial';
export const HOME_STYLES: HomeStyle[] = ['plain', 'scholar', 'martial'];
export const STYLE_NAME: Record<HomeStyle, string> = { plain: '樸素', scholar: '書香', martial: '武人' };
export const STYLE_DESC: Record<HomeStyle, string> = {
  plain: '木色調，以灶台與藥圃為重。灶台每塊肉多燉一份、藥圃每天多收一株。',
  scholar: '書架擺在正中、牆上掛著字畫。在書架研讀時，領悟度額外 +6。',
  martial: '木人樁擺在顯眼處、兵器架相伴。練木人樁時，經驗額外 +15。',
};
/** 換風格的工錢 */
export const RESTYLE_COST = 20;

export interface Estate {
  plot: string;
  /** 房屋等級 1–5 */
  tier: number;
  style: HomeStyle;
  /** 家具 id → 等級（沒寫就是 1） */
  furniture: Record<string, number>;
}

/** 世界狀態（存檔）：日子、房產、每日次數 */
export interface World {
  /** 第幾天（過了半夜就是新的一天） */
  day: number;
  /** 今天的第幾刻（0–95，一刻 15 分鐘；見 time.ts） */
  time: number;
  weather: Weather;
  estates: Record<string, Estate>;
  /** 每天限定次數的事：key → 哪一天用了幾次 */
  daily: Record<string, { day: number; n: number }>;
  /** 人際關係：人物 id → 熟悉度等（見 social.ts） */
  relations: Record<string, Relation>;
  /** 拜入的門派（只能有一個；沒拜師就沒有這個欄位，見 sect.ts） */
  sect?: SectState;
  /** 離開過的門派：不能再回去拜師 */
  leftSects?: string[];
}

export const newWorld = (): World => ({ day: 1, time: START_TIME, weather: 'clear', estates: {}, daily: {}, relations: {} });

/** 今天已經用了幾次 */
export const usedToday = (w: World, key: string) => (w.daily[key]?.day === w.day ? w.daily[key].n : 0);

// ── 房屋等級 ────────────────────────────────────────────

export interface TierDef {
  name: string;
  /** 從上一級擴建到這一級的費用 */
  cost: number;
  /** 外觀（art/props.ts 的 BUILDINGS） */
  building: string;
  desc: string;
}

/** 索引 0 是等級 1 */
export const HOME_TIERS: TierDef[] = [
  { name: '茅草屋', cost: 0, building: 'home1', desc: '一間遮風避雨的茅草屋，擺得下一張床。' },
  { name: '竹籬小屋', cost: 80, building: 'home2', desc: '屋子大了些，添上桌椅與灶台，可以自己燉肉。' },
  { name: '瓦頂小院', cost: 250, building: 'home3', desc: '換上瓦頂、圍出小院。屋裡放書架，院中立木人樁。' },
  { name: '青磚宅院', cost: 600, building: 'home4', desc: '青磚砌牆，隔出客房。添置藥爐，院裡闢一塊藥圃。' },
  { name: '大宅', cost: 1500, building: 'home5', desc: '氣派的大宅，院中鋪設演武場、挖了一方池塘。在演武場練樁，經驗再多 10。' },
];
export const MAX_TIER = HOME_TIERS.length;
export const tierDef = (tier: number) => HOME_TIERS[tier - 1];

// ── 家具 ────────────────────────────────────────────────

export interface FurnitureDef {
  id: string;
  name: string;
  /** 幾級房屋才有 */
  tier: number;
  /** 最高等級；1 表示不能升級（純擺設） */
  maxLevel: number;
  /** 升到 2 級、3 級的費用 */
  costs: number[];
  /** 這個等級、這種風格下的效果說明 */
  effect: (level: number, style: HomeStyle) => string;
}

export const BED_REST = [null, null, { battles: 3, mult: 1.2 }, { battles: 4, mult: 1.35 }] as const;
export const SHELF_INSIGHT = [0, 12, 18, 25];
export const DUMMY_EXP = [0, 30, 45, 60];
export const GARDEN_HERBS = [0, 2, 3, 4];

export const FURNITURE: FurnitureDef[] = [
  {
    id: 'bed', name: '床', tier: 1, maxLevel: 3, costs: [60, 150],
    effect: (lv) => {
      const r = BED_REST[lv];
      return `睡一覺過一天，氣血、內力、體力全滿。${r ? `起床後精神飽滿：接下來 ${r.battles} 場戰鬥武功經驗 ×${r.mult}。` : ''}`;
    },
  },
  { id: 'deco', name: '擺飾', tier: 1, maxLevel: 1, costs: [], effect: (_, st) => ({ plain: '一盆青竹盆栽。', scholar: '一幅山水字畫。', martial: '一座兵器架。' })[st] },
  { id: 'table', name: '桌椅', tier: 2, maxLevel: 1, costs: [], effect: () => '吃飯、喝茶的地方。' },
  {
    id: 'stove', name: '灶台', tier: 2, maxLevel: 3, costs: [50, 120],
    effect: (lv, st) => `做學會的菜，灶台越好越容易做出好菜；一塊山豬肉燉成 ${lv + (st === 'plain' ? 1 : 0)} 份燉山豬肉。`,
  },
  {
    id: 'shelf', name: '書架', tier: 3, maxLevel: 3, costs: [80, 180],
    effect: (lv, st) => `研讀一次（兩刻、體力 10），替一門武功的下一招增加領悟度 ${SHELF_INSIGHT[lv] + (st === 'scholar' ? 6 : 0)}%。`,
  },
  {
    id: 'dummy', name: '木人樁', tier: 3, maxLevel: 3, costs: [80, 180],
    effect: (lv, st) => `練一次（兩刻、體力 20），替一門裝備中的外功增加經驗 ${DUMMY_EXP[lv] + (st === 'martial' ? 15 : 0)}。`,
  },
  {
    id: 'furnace', name: '藥爐', tier: 4, maxLevel: 3, costs: [100, 220],
    effect: (lv) => `兩株止血草煉成 ${lv} 帖金創藥。`,
  },
  {
    id: 'garden', name: '藥圃', tier: 4, maxLevel: 3, costs: [100, 220],
    effect: (lv, st) => `每天收成 ${GARDEN_HERBS[lv] + (st === 'plain' ? 1 : 0)} 株止血草。`,
  },
  { id: 'guestbed', name: '客房', tier: 4, maxLevel: 1, costs: [], effect: () => '整理好的客房，等著將來的朋友來住。' },
];

export const furnitureDef = (id: string) => FURNITURE.find((f) => f.id === id)!;
export const furnitureLevel = (e: Estate, id: string) => e.furniture[id] ?? 1;
/** 這間房子目前有的家具 */
export const furnitureOf = (e: Estate) => FURNITURE.filter((f) => f.tier <= e.tier);

/** 家具佔幾格寬（擺飾依風格而不同：兵器架兩格） */
export function furnitureWidth(id: string, style: HomeStyle): number {
  if (id === 'deco') return style === 'martial' ? 2 : 1;
  return { bed: 2, table: 2, stove: 2, shelf: 2, dummy: 1, furnace: 1, garden: 3, guestbed: 2 }[id] ?? 1;
}

// ── 房間配置 ────────────────────────────────────────────

/**
 * 每個等級一張配置圖。字元：W 牆、_ 地板、d 屋內的門（可走）、E 出口，
 * 院子沿用野外的字元（. 草地、f 籬笆、= 石板、~ 池塘）。
 * 數字與 a b c 是錨點：家具的左端放在這一格（往右佔 w 格），錨點本身的地形取左右最近的非錨點字元（優先取不是牆的那邊）。
 * place 寫出各風格下，每件家具放在哪個錨點。
 */
export interface LayoutDef {
  grid: string[];
  place: Record<HomeStyle, Record<string, string>>;
}

export const LAYOUTS: LayoutDef[] = [
  // 1 茅草屋
  {
    grid: [
      'WW5WWWW',
      'W1__2_W',
      'W_____W',
      'W3___4W',
      'WWWEWWW',
    ],
    place: {
      plain: { bed: '1', deco: '4' },
      scholar: { bed: '2', deco: '5' },
      martial: { bed: '3', deco: '1' },
    },
  },
  // 2 竹籬小屋
  {
    grid: [
      'WW7WWW8WW',
      'W1__2_3_W',
      'W_______W',
      'W_______W',
      'W4____6_W',
      'WWWWEWWWW',
    ],
    place: {
      plain: { bed: '1', stove: '3', table: '4', deco: '6' },
      scholar: { table: '2', bed: '4', stove: '6', deco: '7' },
      martial: { bed: '4', table: '3', stove: '6', deco: '1' },
    },
  },
  // 3 瓦頂小院
  {
    grid: [
      'WW9WWWWWWWW',
      'W1__2__3__W',
      'W_________W',
      'W_________W',
      'W4______5_W',
      'WWWWWdWWWWW',
      'f.........f',
      'f.6..8..7.f',
      'f.........f',
      'fffffEfffff',
    ],
    place: {
      plain: { bed: '1', shelf: '3', table: '4', stove: '5', dummy: '7', deco: '6' },
      scholar: { shelf: '2', bed: '3', table: '4', stove: '5', dummy: '6', deco: '9' },
      martial: { bed: '1', shelf: '3', table: '4', stove: '5', dummy: '8', deco: '7' },
    },
  },
  // 4 青磚宅院（右邊隔出客房）
  {
    grid: [
      'WW9WWWWWWWWWWWW',
      'W1__2__3_W4___W',
      'W________W____W',
      'W________d____W',
      'W5__6___7W8___W',
      'WWWWWWdWWWWWWWW',
      'f.............f',
      'f.a...........f',
      'f......c..b...f',
      'f.............f',
      'ffffffEffffffff',
    ],
    place: {
      plain: { bed: '1', shelf: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'b', deco: '8' },
      scholar: { shelf: '2', bed: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'b', deco: '9' },
      martial: { bed: '1', shelf: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'c', deco: '8' },
    },
  },
  // 5 大宅（院中演武場與池塘）
  {
    grid: [
      'WW9WWWWWWWWWWWWWW',
      'W1__2__3__W4____W',
      'W_________W_____W',
      'W_________d_____W',
      'W5__6___7_W8____W',
      'WWWWWWWdWWWWWWWWW',
      'f...............f',
      'f.a.....===.....f',
      'f.......=c=..~~.f',
      'f.....b.===..~~.f',
      'f...............f',
      'fffffffEfffffffff',
    ],
    place: {
      plain: { bed: '1', shelf: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'c', deco: 'b' },
      scholar: { shelf: '2', bed: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'c', deco: '9' },
      martial: { bed: '1', shelf: '3', table: '5', stove: '6', furnace: '7', guestbed: '4', garden: 'a', dummy: 'c', deco: '8' },
    },
  },
];

export const ANCHOR = /[0-9abc]/;

/** 把配置圖的錨點換回地形字元，並找出各錨點的位置 */
export function parseLayout(grid: string[]) {
  const anchors: Record<string, { x: number; y: number }> = {};
  const tiles = grid.map((row, y) =>
    [...row]
      .map((c, x) => {
        if (!ANCHOR.test(c)) return c;
        anchors[c] = { x, y };
        const right = [...row.slice(x + 1)].find((n) => !ANCHOR.test(n));
        const left = [...row.slice(0, x)].reverse().find((n) => !ANCHOR.test(n));
        // 靠牆的錨點取另一邊，免得被當成牆
        return [right, left].find((n) => n && n !== 'W') ?? right ?? left ?? '_';
      })
      .join(''),
  );
  return { tiles, anchors };
}

