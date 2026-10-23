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
  /** 臨江城泉霧茶莊架上的茶（斤）與照採收行情的價值；這個月賣了幾斤 */
  shop?: { tea: number; teaValue: number; sold: number };
  /** 該收還沒收的田租（你是外務執事時，要親自下山找柳承安收；過了 due 就由別人代收） */
  rentDue?: { season: '夏' | '冬'; amount: number; due: number };
}

const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
export const monthIn = (m: FundMonth) => sum(m.in);
export const monthOut = (m: FundMonth) => sum(m.out);

/** 收入、支出的項目名稱（帳本照這個順序列） */
export const FUND_IN: Record<string, string> = { shop: '茶莊', tea: '賣茶', rent: '田租', incense: '香火', work: '委託行醫', donate: '捐輸' };
export const FUND_OUT: Record<string, string> = { pay: '月例', food: '伙食', grain: '買糧', med: '買藥材', upkeep: '修繕雜項', shopwage: '茶莊工錢' };

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

/** 公庫見底時月例只發一半 */
export const payRate = (f: SectFund) => (f.silver <= 0 ? 0.5 : 1);

/** 公庫好壞對同門長進的影響：寬裕伙食好、見底人心浮動 */
export const fundGrowth = (f: SectFund | undefined) => {
  if (!f) return 1;
  return { rich: 1.05, ok: 1, tight: 0.97, broke: 0.9 }[fundMood(f)];
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
