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

import { ITEMS, type Character } from './character';
import { clampMorale, CREDIT, DAYS_KEPT, guardDef, monthKey, MORALE_REST, MORALE_START, newBiz, supplySources, townOfMap, type BizState, type DayStat, type Manager, type MonthStat, type ShopGuard, type StaffInfo, type Supply } from './shop_manage';
import { propertyDef } from './property';
import { dateOf } from './time';
import type { CraftId } from './crafts';
import { FISH } from './fishing';
import type { World } from './home';
import { festivalOf, seasonOf, type Season } from './time';
import { festivePeriod, PERIOD } from './festival';

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
  /** 客人身上大約帶多少錢（東西比這貴，客人多半嫌貴不買） */
  budget: number;
  /** 各季生意的起伏 */
  season: Record<Season, number>;
  desc: string;
}

const LAKE_GOODS = new Set([...FISH.map((f) => f.id), 'dried_fish', 'lotus_root', 'water_chestnut', 'sea_fish', 'shrimp', 'seaweed']);

export const SHOP_TYPES: ShopTypeDef[] = [
  {
    id: 'restaurant', name: '飯館', flag: '飯', craft: 'cooking', minLevel: 1, base: 8, budget: 25,
    accepts: (id) => ITEMS[id]?.category === '菜餚',
    season: { spring: 1, summer: 0.95, autumn: 1.05, winter: 1.1 },
    desc: '賣自己做的菜。客人最多，菜也賣得最快。',
  },
  {
    id: 'cloth', name: '布莊', flag: '布', craft: 'weaving', minLevel: 1, base: 5, budget: 55,
    accepts: (id) => ITEMS[id]?.category === '服飾',
    season: { spring: 1, summer: 0.8, autumn: 1.2, winter: 1.25 },
    desc: '賣自己織的衣物與手上的服飾。客人少，但一件值錢；秋冬生意好。',
  },
  {
    id: 'fish', name: '魚鋪', flag: '魚', craft: 'fishing', minLevel: 1, base: 8, budget: 12,
    accepts: (id) => LAKE_GOODS.has(id),
    season: { spring: 1.05, summer: 1.1, autumn: 1, winter: 0.85 },
    desc: '賣自己釣的魚、曬的魚乾、湖產與海產。',
  },
  {
    id: 'goods', name: '雜貨鋪', flag: '雜', base: 7, budget: 20,
    accepts: (id) => ['藥品', '食材', '雜物'].includes(ITEMS[id]?.category ?? '') && !ITEMS[id]?.manual && !id.startsWith('stone_') && id !== 'white_carp',
    season: { spring: 1, summer: 1, autumn: 1, winter: 1 },
    desc: '誰都能開：藥品、食材、雜物都能擺。別處買進來、這裡加價賣出去。',
  },
];
export const shopTypeDef = (id: ShopType) => SHOP_TYPES.find((t) => t.id === id)!;

/** 店的等級：名稱、客人倍數、貨架能擺幾種、能雇幾個夥計、升到這一級的費用 */
export const SHOP_LEVELS = [
  { name: '小店', mult: 1, slots: 6, staff: 1, cost: 0 },
  { name: '店鋪', mult: 1.4, slots: 10, staff: 2, cost: 300 },
  { name: '老字號', mult: 1.8, slots: 16, staff: 3, cost: 900 },
];

/** 定價：賣價倍數、客人多寡的倍數 */
export const PRICE_TIERS = [
  { name: '便宜', sell: 0.9, draw: 1.2 },
  { name: '公道', sell: 1, draw: 1 },
  { name: '高價', sell: 1.1, draw: 0.65 },
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
const TRAIT_SELL = { 勤快: 0, 嘴甜: 0.05, 老實: 0, 機靈: 0 };

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
  /** 嫌貴沒買的客人 */
  pricey?: number;
  /** 保鏢的錢、批貨的本錢、掌櫃的薪水與分紅 */
  guard?: number;
  supply?: number;
  mgr?: number;
  /** 節慶（生意比較好的原因） */
  fest?: string;
  /** 當天店裡出的事（鬧事、偷懶等，見 story/shop_events.ts） */
  trouble?: string;
  income: number;
  wages: number;
  tax: number;
}

/**
 * 店裡的事（story/shop_events.ts 處理）：沒處理之前會拖累生意。
 * - raise 夥計想加薪（拖著不理，那個夥計做事沒勁，客人少一成）
 * - slack 夥計偷懶、帳上短少（收入少兩成）
 * - ruffian 地痞來收保護費（客人嚇跑四成）
 * - patron 大主顧下訂：要幾件某樣貨，期限內交到櫃上，照價加五成（不理也不會怎樣）
 * - critic 老饕上門（飯館）：端一道菜給他嚐，菜好名聲傳開、幾天內客人多兩成，菜差反而少一成
 */
export type ShopEventKind = 'raise' | 'slack' | 'ruffian' | 'patron' | 'critic';
export interface ShopEvent {
  kind: ShopEventKind;
  /** 哪天發生 */
  day: number;
  /** 牽涉到的夥計 */
  staff?: string;
  /** 大主顧要的貨、件數、期限 */
  item?: string;
  n?: number;
  until?: number;
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
  /** 還沒處理的事 */
  event?: ShopEvent;
  /** 上一件事是哪天（隔一陣子才會再出事） */
  lastEvent?: number;
  /** 夥計加過的工錢：名字 → 每天多幾兩 */
  raises?: Record<string, number>;
  /** 繳了保護費、或報官以後，地痞到哪天以前不會來 */
  safeUntil?: number;
  /** 打跑過地痞：之後地痞不太敢來 */
  ruffianBeaten?: boolean;
  /** 老饕的評語：到哪天以前客人多（或少） */
  buzz?: { until: number; mult: number };
  // ── 經營管理（shop_manage.ts） ──
  /** 坐鎮的保鏢 */
  guard?: ShopGuard;
  /** 進貨方式 */
  supply?: Supply;
  /** 夥計的到職日與士氣 */
  staffInfo?: Record<string, StaffInfo>;
  /** 年度加薪：每年正月初一給每個夥計加幾兩 */
  yearly?: number;
  /** 上次發紅包是哪天 */
  bonusDay?: number;
  /** 每日帳目（最近 DAYS_KEPT 天）與每月加總 */
  days?: DayStat[];
  months?: Record<string, MonthStat>;
}

/** 夥計的士氣（沒記錄的當作剛雇來） */
export const moraleOf = (s: ShopState, name: string) => s.staffInfo?.[name]?.morale ?? MORALE_START;
export const avgMorale = (s: ShopState) => (s.staff.length ? s.staff.reduce((a, n) => a + moraleOf(s, n), 0) / s.staff.length : MORALE_START);
/** 改某個夥計的士氣 */
export function addMorale(s: ShopState, name: string, n: number, day = 0) {
  s.staffInfo ??= {};
  const x = (s.staffInfo[name] ??= { since: day, morale: MORALE_START });
  x.morale = clampMorale(x.morale + n);
}
/** 雇進一個夥計 */
export function hireStaff(s: ShopState, name: string, day: number) {
  s.staff.push(name);
  (s.staffInfo ??= {})[name] = { since: day, morale: MORALE_START };
}
/** 夥計走了（辭退、自己走）：工錢與士氣的記錄一起清掉 */
export function dropStaff(s: ShopState, name: string) {
  s.staff = s.staff.filter((n) => n !== name);
  if (s.staffInfo) delete s.staffInfo[name];
  if (s.raises) delete s.raises[name];
}

/** 一天的固定開銷（工錢＋保鏢） */
export const dailyFixed = (s: ShopState) => s.staff.reduce((a, n) => a + wageOf(s, n), 0) + (s.guard ? guardDef(s.guard.source).fee : 0);

export const bizOf = (w: World): BizState => w.biz ?? newBiz();
/** 店在哪個城（城的 id） */
export const shopTown = (id: string) => townOfMap(propertyDef(id)?.map ?? '') ?? '';
/** 管這家店的掌櫃（先找專管這家的掌櫃，再找管整座城的大掌櫃） */
export function managerOf(w: World, id: string): Manager | undefined {
  const ms = w.biz?.managers ?? [];
  return ms.find((m) => m.shop === id) ?? ms.find((m) => m.rank === 2 && m.town === shopTown(id));
}
/** 這家店現在能從哪裡進哪些貨（看合約、分號、掌櫃才幹） */
export function sourcesOf(w: World, id: string, hero: Character) {
  const s = w.shops![id];
  const t = shopTypeDef(s.type);
  const towns = [...new Set(Object.entries(w.shops ?? {}).filter(([, x]) => x.type === s.type).map(([k]) => shopTown(k)))];
  return supplySources(s.type, t.accepts, hero, w.biz, w.day, towns, managerOf(w, id)?.talent ?? 0);
}

/** 批貨：照設定補貨，回傳花的本錢（從櫃上扣，最多賒到 CREDIT）與沒送到的供應商 */
function restock(s: ShopState, id: string, w: World, hero: Character): { spent: number; missed: string[] } {
  if (s.supply?.mode !== 'order') return { spent: 0, missed: [] };
  const list = sourcesOf(w, id, hero);
  const slots = SHOP_LEVELS[s.level - 1].slots;
  const bad = w.weather === 'rain' || w.weather === 'snow';
  // 每家供應商今天送不送得到（同一天同一家固定）
  const came: Record<string, boolean> = {};
  const missed: string[] = [];
  let spent = 0;
  for (const [item, target] of Object.entries(s.supply.targets)) {
    const w2 = list.find((x) => x.id === item);
    if (!w2 || target <= 0) continue;
    came[w2.sup] ??= dayRand(w.seed ?? 1, w.day * 7, w2.sup) < w2.reliable * (bad ? w2.storm : 1);
    if (!came[w2.sup]) {
      if (!missed.includes(w2.from)) missed.push(w2.from);
      continue;
    }
    if (!s.stock[item] && Object.keys(s.stock).length >= slots) continue;
    const need = Math.max(0, target - (s.stock[item] ?? 0));
    const afford = Math.max(0, Math.floor((s.till - spent + CREDIT) / w2.cost));
    const n = Math.min(need, afford);
    if (!n) continue;
    s.stock[item] = (s.stock[item] ?? 0) + n;
    spent += n * w2.cost;
  }
  s.till -= spent;
  return { spent, missed };
}

/** 記一天的帳（每日、每月） */
function record(s: ShopState, d: DayStat) {
  s.days = [...(s.days ?? []), d].slice(-DAYS_KEPT);
  const k = monthKey(d.day);
  const { year, month } = dateOf(d.day);
  s.months ??= {};
  const m = (s.months[k] ??= { year, month, days: 0, customers: 0, income: 0, wages: 0, tax: 0, guard: 0, supply: 0 });
  m.days++;
  m.customers += d.customers;
  m.income += d.income;
  m.wages += d.wages;
  m.tax += d.tax;
  m.guard += d.guard;
  m.supply += d.supply;
  m.mgr = (m.mgr ?? 0) + (d.mgr ?? 0);
}

/** 夥計一天的工錢（加過薪的另外算） */
export const wageOf = (s: ShopState, name: string) => staffDef(name).wage + (s.raises?.[name] ?? 0);

/** 店裡的事對當天生意的影響 */
export function eventEffect(s: ShopState, day: number): { draw: number; income: number; note?: string } {
  let draw = 1;
  let income = 1;
  let note: string | undefined;
  const e = s.event;
  if (e && e.day <= day) {
    if (e.kind === 'raise') (draw = 0.9), (note = `${e.staff}做事沒勁`);
    if (e.kind === 'slack') (income = 0.8), (note = '帳上短少');
    if (e.kind === 'ruffian') (draw = 0.6), (note = '地痞在門口晃，客人不敢進來');
  }
  if (s.buzz && day <= s.buzz.until) draw *= s.buzz.mult;
  return { draw, income, note };
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

/** 節慶的生意：節日當天客人多四成（清明、中元除外）；節期裡看店種——年節買年貨、做新衣，中秋、端午上館子 */
const PERIOD_DRAW: Record<number, Partial<Record<ShopType, number>>> = {
  [PERIOD.newyear]: { goods: 1.5, cloth: 1.4, restaurant: 1.3, fish: 1.25 },
  [PERIOD.duanwu]: { restaurant: 1.2, fish: 1.1 },
  [PERIOD.zhongqiu]: { restaurant: 1.3, goods: 1.1 },
};
export function festDraw(type: ShopType, day: number): { mult: number; note?: string } {
  const f = festivalOf(day);
  const dayMult = f && f !== '清明' && f !== '中元' ? 1.4 : 1;
  const per = festivePeriod(day);
  const perMult = PERIOD_DRAW[per]?.[type] ?? 1;
  const mult = Math.max(dayMult, perMult);
  if (mult === 1) return { mult };
  return { mult, note: dayMult >= perMult ? `${f}` : ['', '年節', '端午', '中秋'][per] };
}

/** 整體客流（校準用：最好的情況一家店批貨一個月淨賺一千到一千六百兩上下） */
export const DEMAND = 0.55;

/** 天氣：只知道「現在」的天氣，前一天就當作差不多 */
const WEATHER_DRAW: Record<string, number> = { clear: 1.1, cloudy: 1, rain: 0.8, fog: 0.9, snow: 0.7 };

/** 賣一樣東西的價錢 */
// 嘴甜的夥計多賣一點（幾個嘴甜的加起來也最多五分）
export const shopPrice = (s: ShopState, id: string) => Math.max(1, Math.round((ITEMS[id]?.price ?? 0) * PRICE_TIERS[s.price].sell * (1 + Math.min(0.05, s.staff.reduce((a, n) => a + TRAIT_SELL[staffDef(n).trait], 0)))));

/** 結算一家店一天的帳（會改 s） */
export function settleDay(s: ShopState, id: string, day: number, w: World, hero: Character) {
  const fame = hero.fame;
  const served = s.served === day;
  const guardFee = s.guard ? guardDef(s.guard.source).fee : 0;
  if (!s.staff.length && !served) {
    // 關門也照付保鏢的錢
    s.till -= guardFee;
    s.ledger.push({ day, closed: true, customers: 0, sold: 0, short: 0, income: 0, wages: 0, tax: 0, guard: guardFee });
    s.ledger = s.ledger.slice(-10);
    record(s, { day, closed: true, customers: 0, sold: 0, income: 0, wages: 0, tax: 0, guard: guardFee, supply: 0 });
    return;
  }
  const rs = restock(s, id, w, hero);
  const supply = rs.spent;
  const mgr = managerOf(w, id);
  const t = shopTypeDef(s.type);
  const lv = SHOP_LEVELS[s.level - 1];
  const staffDraw = s.staff.length ? 1 + 0.15 * (s.staff.length - 1) + s.staff.reduce((a, n) => a + TRAIT_DRAW[staffDef(n).trait], 0) : 0.8;
  // 夥計士氣：平均 50 照常，100 多一成，0 少一成；保鏢讓客人安心（或發毛）
  const moraleDraw = 0.9 + avgMorale(s) / 500;
  const guardDraw = s.guard ? guardDef(s.guard.source).draw : 1;
  // 掌櫃越能幹客人越多（才幹每點 1%）
  const mgrDraw = mgr ? 1 + mgr.talent * 0.01 : 1;
  const r = dayRand(w.seed ?? 1, day, id);
  const fest = festDraw(s.type, day);
  const ev = eventEffect(s, day);
  const customers = Math.max(
    0,
    Math.round(
      t.base * lv.mult * (LOCATION[id] ?? 1) * t.season[seasonOf(day)] * (WEATHER_DRAW[w.weather] ?? 1) * (1 + Math.min(fame, 200) / 400) *
        PRICE_TIERS[s.price].draw * staffDraw * (served ? 1.4 : 1) * fest.mult * ev.draw * moraleDraw * guardDraw * mgrDraw * DEMAND * (0.8 + r * 0.4),
    ),
  );
  let sold = 0;
  let short = 0;
  let pricey = 0;
  let income = 0;
  for (let i = 0; i < customers; i++) {
    const ids = Object.keys(s.stock).filter((k) => s.stock[k] > 0);
    if (!ids.length) {
      short++;
      continue;
    }
    // 客人身上的錢有多有少：只在買得起的貨裡挑（擺得多的賣得多），都買不起就嫌貴走了
    const budget = t.budget * (0.5 + dayRand(w.seed ?? 1, day * 53 + i, id) * 1.5);
    const ok = ids.filter((k) => shopPrice(s, k) <= budget);
    if (!ok.length) {
      pricey++;
      continue;
    }
    const total = ok.reduce((a, k) => a + s.stock[k], 0);
    let x = dayRand(w.seed ?? 1, day * 31 + i, id) * total;
    const pick = ok.find((k) => (x -= s.stock[k]) < 0) ?? ok[0];
    s.stock[pick] -= 1;
    if (!s.stock[pick]) delete s.stock[pick];
    sold++;
    income += shopPrice(s, pick);
  }
  income = Math.round(income * ev.income);
  // 掌櫃不忠，偷偷吞掉一些（帳上看起來就是收入少了）
  const skim = mgr && mgr.loyalty < 40 ? Math.round((income * (40 - mgr.loyalty)) / 400) : 0;
  income -= skim;
  if (mgr) mgr.skim += skim;
  const wages = s.staff.reduce((a, n) => a + wageOf(s, n), 0);
  const tax = Math.round(income * SHOP_TAX);
  // 掌櫃的薪水與分紅（大掌櫃的薪水由他管的店平分）
  const shared = mgr ? (mgr.rank === 2 ? Object.keys(w.shops ?? {}).filter((k) => managerOf(w, k) === mgr).length : 1) : 1;
  const before = income - wages - tax - guardFee - supply;
  const mgrPay = mgr ? Math.round(mgr.salary / shared + Math.max(0, before - mgr.salary / shared) * mgr.share) : 0;
  s.till += income - wages - tax - guardFee - mgrPay;
  const missed = rs.missed.length ? `${rs.missed.join('、')}今天沒送貨來` : undefined;
  const trouble = [ev.note, missed].filter(Boolean).join('；') || undefined;
  s.ledger.push({ day, customers, sold, short, ...(pricey ? { pricey } : {}), income, wages, tax, guard: guardFee, supply, mgr: mgrPay, ...(fest.note ? { fest: fest.note } : {}), ...(trouble ? { trouble } : {}) });
  s.ledger = s.ledger.slice(-10);
  record(s, { day, customers, sold, income, wages, tax, guard: guardFee, supply, mgr: mgrPay });
  // 士氣每天慢慢回到 MORALE_REST
  for (const n of s.staff) {
    const m = moraleOf(s, n);
    if (m !== MORALE_REST) addMorale(s, n, m > MORALE_REST ? -1 : 1, day);
  }
}
