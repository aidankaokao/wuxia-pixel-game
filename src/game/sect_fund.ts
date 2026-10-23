/**
 * 門派公庫（4.31）：門派自己的銀兩與存糧、茶葉、藥材，以及每個月的帳。
 * 存在 world.life.fund；每天半夜的結算（產出、開銷、賣茶、收租）在各門派的 story/*_fund.ts。
 * 這裡只放資料結構與共用的小函式，讓 sect_mingquan.ts（發月例）也能用，不會循環引用。
 */

import type { World } from './home';
import { dateOf, monthText } from './time';

export type FundMood = 'rich' | 'ok' | 'tight' | 'broke';

/** 一個月的進出：項目 → 兩 */
export interface FundMonth {
  /** 第幾年第幾月（year * 12 + month） */
  key: number;
  in: Record<string, number>;
  out: Record<string, number>;
}

export interface SectFund {
  silver: number;
  /** 存糧（石） */
  grain: number;
  /** 還沒賣掉的茶葉（斤）與照採收時的行情值多少兩 */
  tea: number;
  teaValue: number;
  /** 藥材（份）：藥房配藥、發月例的金創藥都從這裡出 */
  herb: number;
  month: FundMonth;
  /** 過去的月帳（最多 12 個月），silver 是月底的結餘 */
  books: (FundMonth & { silver: number })[];
  /** 今年的年成（0.8–1.15，正月初一擲）與有人幫忙照料田地加的成（最多 0.2） */
  crop: { year: number; f: number; care: number };
  /** 上回門派消息提到的公庫好壞（變了才再提） */
  mood?: FundMood;
  /** 臨江城泉霧茶莊架上的茶（斤）與照採收行情的價值；這個月賣了幾斤；掌門下令收起來時 closed */
  shop?: { tea: number; teaValue: number; sold: number; closed?: boolean };
  /** 該收還沒收的田租（你是外務執事時，要親自下山找柳承安收；過了 due 就由別人代收） */
  rentDue?: { season: '夏' | '冬'; amount: number; due: number };
  // ── 門派產業（4.33） ──
  /** 木料（根）、石料（方）：自己修繕、營造用，多的每逢初九、十九、廿九送下山賣 */
  wood?: number;
  stone?: number;
  /** 各設施的等級（沒有或 0 是還沒蓋） */
  fac?: Partial<Record<FacId, number>>;
  /** 正在蓋的設施：蓋到第幾級、哪天完工 */
  build?: { id: FacId; level: number; done: number };
  /** 月例的成數（掌門定：0.8、1、1.2） */
  payScale?: number;
  /** 用度：節儉、照常、開源（掌門定） */
  economy?: Economy;
  /** 產業的小事件（一次一件；捐獻這種當下就結束的不記） */
  event?: IndEvent;
  /** 掌門支走、還沒還回去的公款；被長老查到以後記成風評（scandal，每月淡一點，年會的票會少） */
  embezzled?: number;
  scandal?: number;
}

// ── 門派產業：設施、用度、小事件（4.33） ──────────────────────

export type FacId = 'lumber' | 'quarry' | 'herbs' | 'teagarden';
export type Economy = 'thrift' | 'normal' | 'enterprise';

/** 一級設施：營造要的銀兩、木料、石料、天數；每天的工錢與維持；產出（伐木場、採石場：每天幾根／幾方；藥圃：每天多幾份；茶園：採茶多幾成） */
export interface FacLevel {
  cost: number;
  wood: number;
  stone: number;
  days: number;
  upkeep: number;
  out: number;
}
export interface FacDef {
  name: string;
  where: string;
  desc: string;
  levels: FacLevel[];
}

export const FACILITIES: Record<FacId, FacDef> = {
  lumber: {
    name: '伐木場',
    where: '南嶺西邊的松林',
    desc: '砍松木、劈成木料。修屋、營造都用得上，多的送下山賣。',
    levels: [
      { cost: 0, wood: 0, stone: 0, days: 0, upkeep: 2, out: 2.5 },
      { cost: 900, wood: 0, stone: 20, days: 6, upkeep: 2.8, out: 4 },
    ],
  },
  quarry: {
    name: '採石場',
    where: '南嶺東邊的石壁',
    desc: '鑿青石、打成石料。鋪路、砌牆、營造都要，城裡的石匠也收。',
    levels: [
      { cost: 1200, wood: 40, stone: 0, days: 8, upkeep: 2.5, out: 1.5 },
      { cost: 1500, wood: 40, stone: 20, days: 10, upkeep: 3.5, out: 2.5 },
    ],
  },
  herbs: {
    name: '藥圃',
    where: '山田東南，原本的藥圃旁',
    desc: '多闢幾畦藥田。藥房自用以外，多的藥材賣給城裡的藥鋪。',
    levels: [
      { cost: 500, wood: 20, stone: 10, days: 4, upkeep: 0.6, out: 1.2 },
      { cost: 900, wood: 30, stone: 20, days: 6, upkeep: 1, out: 2.2 },
    ],
  },
  teagarden: {
    name: '茶園',
    where: '山田北坡，茶壟往下多開幾行',
    desc: '多種幾行茶。茶季採得多，茶莊賣不完的整批賣給茶行。',
    levels: [
      { cost: 1500, wood: 30, stone: 20, days: 10, upkeep: 0.8, out: 0.35 },
      { cost: 2500, wood: 40, stone: 40, days: 14, upkeep: 1.4, out: 0.7 },
    ],
  },
};
export const FAC_IDS = Object.keys(FACILITIES) as FacId[];
export const facLevel = (f: SectFund, id: FacId) => f.fac?.[id] ?? 0;
/** 這一級（level 是 1 起算）的資料；沒蓋就是 undefined */
export const facNow = (f: SectFund, id: FacId): FacLevel | undefined => FACILITIES[id].levels[facLevel(f, id) - 1];

/** 木料、石料的價錢：賣給城裡、缺了向外買 */
export const MATERIAL = { wood: { name: '木料', unit: '根', sell: 2.5, buy: 4 }, stone: { name: '石料', unit: '方', sell: 5, buy: 8 } };

export const ECONOMY: Record<Economy, { name: string; desc: string }> = {
  thrift: { name: '節儉', desc: '伙食、修繕都省著用（開銷少兩三成），同門長進稍慢' },
  normal: { name: '照常', desc: '不特別省，也不特別往外跑' },
  enterprise: { name: '開源', desc: '多接委託、產業多出力（收入多），同門練功的時間少了些' },
};

export type IndEventKind = 'fire' | 'collapse' | 'vein' | 'teaprice' | 'thugs' | 'blight';
export interface IndEvent {
  kind: IndEventKind;
  day: number;
  /** 到哪天為止（沒人處理就自己過去） */
  until: number;
  /** 茶價漲跌的倍數、石脈的加成 */
  mult?: number;
}
export const eventOn = (f: SectFund, kind: IndEventKind) => (f.event?.kind === kind ? f.event : undefined);

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
export const monthIn = (m: FundMonth) => sum(m.in);
export const monthOut = (m: FundMonth) => sum(m.out);

/** 收入、支出的項目名稱（帳本照這個順序列） */
export const FUND_IN: Record<string, string> = {
  shop: '茶莊',
  tea: '賣茶',
  wood: '賣木料',
  stone: '賣石料',
  herbsale: '賣藥材',
  rent: '田租',
  incense: '香火',
  work: '委託行醫',
  donate: '捐輸',
};
export const FUND_OUT: Record<string, string> = {
  pay: '月例',
  food: '伙食',
  grain: '買糧',
  med: '買藥材',
  upkeep: '修繕雜項',
  shopwage: '茶莊工錢',
  facility: '產業工錢',
  build: '營造',
  leader: '掌門支用',
};

/** 月帳的月份名（key 是 year * 12 + month） */
export const monthLabel = (key: number) => monthText(Math.floor(key / 12), key % 12);

export const monthKey = (day: number) => {
  const d = dateOf(day);
  return d.year * 12 + d.month;
};

/** 這一門派的公庫（還沒有就照開局的家底建一份；舊存檔補上茶莊） */
export function fundOf(w: World): SectFund {
  const ls = (w.life ??= { members: {}, news: [] });
  const f = (ls.fund ??= {
    silver: 5000,
    grain: 120,
    tea: 0,
    teaValue: 0,
    herb: 30,
    month: { key: monthKey(w.day), in: {}, out: {} },
    books: [],
    crop: { year: dateOf(w.day).year, f: 1, care: 0 },
  });
  f.shop ??= { tea: 20, teaValue: 100, sold: 0 };
  // 門派產業（4.33）：原本就有一座伐木場（砍柴的老營地）
  f.wood ??= 20;
  f.stone ??= 0;
  f.fac ??= { lumber: 1 };
  return f;
}

/** 記一筆帳：收入加進公庫、支出從公庫扣 */
export function book(f: SectFund, kind: 'in' | 'out', item: string, n: number) {
  if (n <= 0) return;
  f.silver += kind === 'in' ? n : -n;
  f.month[kind][item] = (f.month[kind][item] ?? 0) + n;
}

/** 一個月大約開銷多少（看上個月的帳；還沒有帳就用估計值） */
export const monthlyOut = (f: SectFund) => {
  const last = f.books[f.books.length - 1];
  const n = last ? monthOut(last) : 0;
  return n > 0 ? n : 1400;
};

/** 公庫的好壞：寬裕（夠撐半年）、尚可、吃緊（不到一個半月）、見底 */
export function fundMood(f: SectFund): FundMood {
  const m = monthlyOut(f);
  if (f.silver <= 0) return 'broke';
  if (f.silver < m * 1.5) return 'tight';
  if (f.silver >= m * 6) return 'rich';
  return 'ok';
}
export const MOOD_NAME: Record<FundMood, string> = { rich: '寬裕', ok: '尚可', tight: '吃緊', broke: '見底' };

/** 月例發幾成：掌門定的成數；公庫見底時再減半 */
export const payRate = (f: SectFund) => (f.silver <= 0 ? 0.5 : 1) * (f.payScale ?? 1);

/** 公庫好壞對同門長進的影響：寬裕伙食好、見底人心浮動；月例多寡、用度也有一點影響 */
export const fundGrowth = (f: SectFund | undefined) => {
  if (!f) return 1;
  const pay = 1 + ((f.payScale ?? 1) - 1) * 0.2;
  const eco = f.economy && f.economy !== 'normal' ? 0.97 : 1;
  return { rich: 1.05, ok: 1, tight: 0.97, broke: 0.9 }[fundMood(f)] * pay * eco;
};

/** 這一天是哪一季茶：一天採幾斤、一斤值幾兩 */
export function teaSeason(day: number): { name: string; per: number; price: number } | null {
  const { month, date } = dateOf(day);
  if (month === 2 && date <= 15) return { name: '明前茶', per: 5, price: 16 };
  if ((month === 2 && date > 15) || (month === 3 && date <= 15)) return { name: '雨前茶', per: 8, price: 8 };
  if (month === 4 || month === 5) return { name: '夏茶', per: 10, price: 3 };
  if (month === 7) return { name: '秋茶', per: 8, price: 3.5 };
  return null;
}
