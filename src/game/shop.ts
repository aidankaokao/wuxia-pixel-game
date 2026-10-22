/**
 * 經營（4.20 第三階段）：買下空店面以後登記商號開店，雇夥計顧店，每天半夜自動結算前一天的帳。
 *
 * - 開什麼店看技能：飯館（烹飪 1 級起，賣菜餚）、布莊（紡織 1 級起，賣服飾）、魚鋪（釣魚 1 級起，賣魚與湖產）、
 *   雜貨鋪（誰都能開，賣藥品、食材、雜物，進貨轉賣）。
 * - 每天的客人：店種的底數 × 店的等級 × 地段 × 季節 × 天氣 × 名聲 × 價錢 × 夥計 ×（東家親自招呼的那天多四成）× 每天的起伏。
 *   每位客人從貨架上挑一樣買走；架上空了就是「缺貨」，客人空手走。
 * - 收入扣夥計工錢、商稅，存在櫃上，去店裡收帳。沒有夥計、東家也沒來顧，那天就關門。
 * - 店的等級：小店 → 店鋪 → 老字號（客人多、貨架多、能雇的夥計多）。
 * 狀態存在 world.shops（物件 id → 店）。
 */

import { ITEMS } from './character';
import type { CraftId } from './crafts';
import { FISH } from './fishing';
import type { World } from './home';
import { seasonOf, type Season } from './time';

export type ShopType = 'restaurant' | 'cloth' | 'fish' | 'goods';

export interface ShopTypeDef {
  id: ShopType;
  name: string;
  /** 幌子上的字 */
  flag: string;
  /** 要哪門技能幾級才開得了 */
  craft?: CraftId;
  minLevel?: number;
  /** 架上可以擺什麼 */
  accepts: (id: string) => boolean;
  /** 小店一天大約幾位客人 */
  base: number;
  /** 各季生意的起伏 */
  season: Record<Season, number>;
  desc: string;
}

const LAKE_GOODS = new Set([...FISH.map((f) => f.id), 'dried_fish', 'lotus_root', 'water_chestnut', 'sea_fish', 'shrimp', 'seaweed']);

export const SHOP_TYPES: ShopTypeDef[] = [
  {
    id: 'restaurant', name: '飯館', flag: '飯', craft: 'cooking', minLevel: 1, base: 8,
    accepts: (id) => ITEMS[id]?.category === '菜餚',
    season: { spring: 1, summer: 0.95, autumn: 1.05, winter: 1.1 },
    desc: '賣自己做的菜。客人最多，菜也賣得最快。',
  },
  {
    id: 'cloth', name: '布莊', flag: '布', craft: 'weaving', minLevel: 1, base: 5,
    accepts: (id) => ITEMS[id]?.category === '服飾',
    season: { spring: 1, summer: 0.8, autumn: 1.2, winter: 1.25 },
    desc: '賣自己織的衣物與手上的服飾。客人少，但一件值錢；秋冬生意好。',
  },
  {
    id: 'fish', name: '魚鋪', flag: '魚', craft: 'fishing', minLevel: 1, base: 8,
    accepts: (id) => LAKE_GOODS.has(id),
    season: { spring: 1.05, summer: 1.1, autumn: 1, winter: 0.85 },
    desc: '賣自己釣的魚、曬的魚乾、湖產與海產。',
  },
  {
    id: 'goods', name: '雜貨鋪', flag: '雜', base: 7,
    accepts: (id) => ['藥品', '食材', '雜物'].includes(ITEMS[id]?.category ?? '') && !ITEMS[id]?.manual && !id.startsWith('stone_') && id !== 'white_carp',
    season: { spring: 1, summer: 1, autumn: 1, winter: 1 },
    desc: '誰都能開：藥品、食材、雜物都能擺。別處買進來、這裡加價賣出去。',
  },
];
export const shopTypeDef = (id: ShopType) => SHOP_TYPES.find((t) => t.id === id)!;

/** 店的等級：名稱、客人倍數、貨架能擺幾種、能雇幾個夥計、升到這一級的費用 */
export const SHOP_LEVELS = [
  { name: '小店', mult: 1, slots: 6, staff: 1, cost: 0 },
  { name: '店鋪', mult: 1.5, slots: 10, staff: 2, cost: 300 },
  { name: '老字號', mult: 2.2, slots: 16, staff: 3, cost: 900 },
];

/** 定價：賣價倍數、客人多寡的倍數 */
export const PRICE_TIERS = [
  { name: '便宜', sell: 0.9, draw: 1.25 },
  { name: '公道', sell: 1, draw: 1 },
  { name: '高價', sell: 1.25, draw: 0.75 },
];

/** 夥計：名字、每天的工錢、長處 */
export interface StaffDef {
  name: string;
  wage: number;
  trait: '勤快' | '嘴甜' | '老實' | '機靈';
  desc: string;
}
export const STAFF: StaffDef[] = [
  { name: '小六子', wage: 2, trait: '機靈', desc: '十四五歲的半大孩子，跑腿快，算帳也快。' },
  { name: '阿貴', wage: 3, trait: '老實', desc: '話不多，從不偷懶，也不會少收客人一文錢。' },
  { name: '春桃', wage: 3, trait: '嘴甜', desc: '笑起來兩個酒窩，客人見了都多買一樣。' },
  { name: '石頭', wage: 3, trait: '勤快', desc: '天沒亮就來開門，天黑了才走。' },
  { name: '蓮兒', wage: 4, trait: '嘴甜', desc: '從前在望江樓端過盤子，招呼客人很有一套。' },
  { name: '老周', wage: 4, trait: '老實', desc: '做了二十年的掌櫃，東家倒了才出來找活兒。' },
  { name: '二妞', wage: 2, trait: '勤快', desc: '鄉下來的姑娘，手腳俐落，吃得少做得多。' },
];
export const staffDef = (name: string) => STAFF.find((s) => s.name === name)!;
/** 夥計的長處：勤快客人多一成、嘴甜賣價多一成、機靈缺貨時少跑客人、老實不出錯（帳上不會短少） */
const TRAIT_DRAW = { 勤快: 0.1, 嘴甜: 0, 老實: 0, 機靈: 0.05 };
const TRAIT_SELL = { 勤快: 0, 嘴甜: 0.1, 老實: 0, 機靈: 0 };

/** 地段：物件 id → 客人倍數 */
export const LOCATION: Record<string, number> = { ljs_e11: 1.2, ljs_w18: 1, ljs_e18: 1.1 };

/** 商稅（佔收入） */
export const SHOP_TAX = 0.03;
/** 登記商號的規費 */
export const SHOP_FEE = 20;

export interface LedgerDay {
  day: number;
  /** 關門（沒夥計、東家也沒來） */
  closed?: boolean;
  customers: number;
  sold: number;
  /** 缺貨跑掉的客人 */
  short: number;
  income: number;
  wages: number;
  tax: number;
}

export interface ShopState {
  type: ShopType;
  name: string;
  level: number;
  stock: Record<string, number>;
  price: number;
  staff: string[];
  /** 櫃上的錢（可以是負的：欠夥計工錢） */
  till: number;
  ledger: LedgerDay[];
  opened: number;
  /** 東家親自招呼客人是哪一天 */
  served?: number;
}

export const shopsOf = (w: World): Record<string, ShopState> => w.shops ?? {};

/** 可以開的店（看技能） */
export const canOpen = (t: ShopTypeDef, craftLevel: (c: CraftId) => number) => !t.craft || craftLevel(t.craft) >= (t.minLevel ?? 0);

/** 每天的起伏：同一天同一家固定（0–1） */
function dayRand(seed: number, day: number, id: string) {
  let h = (seed ^ (day * 2654435761)) >>> 0;
  for (const c of id) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return (h % 10000) / 10000;
}

/** 天氣：只知道「現在」的天氣，前一天就當作差不多 */
const WEATHER_DRAW: Record<string, number> = { clear: 1.1, cloudy: 1, rain: 0.8, fog: 0.9, snow: 0.7 };

/** 賣一樣東西的價錢 */
export const shopPrice = (s: ShopState, id: string) => Math.max(1, Math.round((ITEMS[id]?.price ?? 0) * PRICE_TIERS[s.price].sell * (1 + s.staff.reduce((a, n) => a + TRAIT_SELL[staffDef(n).trait], 0))));

/** 結算一家店一天的帳（會改 s） */
export function settleDay(s: ShopState, id: string, day: number, w: World, fame: number) {
  const served = s.served === day;
  if (!s.staff.length && !served) {
    s.ledger.push({ day, closed: true, customers: 0, sold: 0, short: 0, income: 0, wages: 0, tax: 0 });
    s.ledger = s.ledger.slice(-10);
    return;
  }
  const t = shopTypeDef(s.type);
  const lv = SHOP_LEVELS[s.level - 1];
  const staffDraw = s.staff.length ? 1 + 0.25 * (s.staff.length - 1) + s.staff.reduce((a, n) => a + TRAIT_DRAW[staffDef(n).trait], 0) : 0.8;
  const r = dayRand(w.seed ?? 1, day, id);
  const customers = Math.max(
    0,
    Math.round(
      t.base * lv.mult * (LOCATION[id] ?? 1) * t.season[seasonOf(day)] * (WEATHER_DRAW[w.weather] ?? 1) * (1 + Math.min(fame, 200) / 200) *
        PRICE_TIERS[s.price].draw * staffDraw * (served ? 1.4 : 1) * (0.8 + r * 0.4),
    ),
  );
  let sold = 0;
  let short = 0;
  let income = 0;
  for (let i = 0; i < customers; i++) {
    const ids = Object.keys(s.stock).filter((k) => s.stock[k] > 0);
    const total = ids.reduce((a, k) => a + s.stock[k], 0);
    if (!total) {
      short++;
      continue;
    }
    // 照架上的數量挑：擺得多的賣得多
    let x = dayRand(w.seed ?? 1, day * 31 + i, id) * total;
    const pick = ids.find((k) => (x -= s.stock[k]) < 0) ?? ids[0];
    s.stock[pick] -= 1;
    if (!s.stock[pick]) delete s.stock[pick];
    sold++;
    income += shopPrice(s, pick);
  }
  const wages = s.staff.reduce((a, n) => a + staffDef(n).wage, 0);
  const tax = Math.round(income * SHOP_TAX);
  s.till += income - wages - tax;
  s.ledger.push({ day, customers, sold, short, income, wages, tax });
  s.ledger = s.ledger.slice(-10);
}
