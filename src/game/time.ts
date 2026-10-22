/**
 * 時間與天氣。
 *
 * - 最小單位是「刻」（15 分鐘），一個時辰 8 刻，一天 12 時辰（96 刻）。world.time 是今天的第幾刻（0 是半夜 0 點）。
 * - 只有做事才會花時間：練功、雜務、戰鬥、睡覺、在室外地圖之間移動等；場景內走動、交談、買賣都不花時間。
 * - 過了半夜就是新的一天（world.day + 1），「每天一次」的事在這時重新計算。
 * - 天氣每天早上擲一次，時辰交替時偶爾會變。
 */

import type { World } from './home';

export const KE_PER_SHICHEN = 8;
export const KE_PER_DAY = 96;
/** 一刻、一時辰 */
export const KE = 1;
export const SHICHEN = KE_PER_SHICHEN;

const SHICHEN_NAMES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
const KE_NAMES = ['初', '一刻', '二刻', '三刻', '四刻', '五刻', '六刻', '七刻'];

/** 時辰的索引（0 子時 … 11 亥時）。子時是 23 點到 1 點，所以要先位移一個小時 */
export const shichenOf = (time: number) => Math.floor(((time + 4) % KE_PER_DAY) / KE_PER_SHICHEN);

/** 某個時辰的開始是今天的第幾刻（子時從前一天 23 點開始，這裡取 0 點之後的那一段不處理） */
export const shichenStart = (index: number) => (index * KE_PER_SHICHEN - 4 + KE_PER_DAY) % KE_PER_DAY;

/** 例如「辰時三刻」「午時初」 */
export function timeText(time: number): string {
  const ke = (time + 4) % KE_PER_SHICHEN;
  return `${SHICHEN_NAMES[shichenOf(time)]}時${KE_NAMES[ke]}`;
}

/** 早上幾點（顯示用，例如 7:30） */
export const clockText = (time: number) => `${Math.floor(time / 4)}:${String((time % 4) * 15).padStart(2, '0')}`;

export type Period = 'dawn' | 'day' | 'dusk' | 'night';
export const PERIOD_NAME: Record<Period, string> = { dawn: '清晨', day: '白天', dusk: '黃昏', night: '夜晚' };

/** 卯時清晨、辰到申時白天、酉時黃昏、戌到寅時夜晚 */
export function periodOf(time: number): Period {
  const s = shichenOf(time);
  if (s === 3) return 'dawn';
  if (s >= 4 && s <= 8) return 'day';
  if (s === 9) return 'dusk';
  return 'night';
}

/** 是不是在某段時辰之間（含頭含尾，用時辰索引；可以跨半夜，例如 戌10 到 寅2） */
export function inShichen(time: number, from: number, to: number): boolean {
  const s = shichenOf(time);
  return from <= to ? s >= from && s <= to : s >= from || s <= to;
}
export const SHICHEN_INDEX = { 子: 0, 丑: 1, 寅: 2, 卯: 3, 辰: 4, 巳: 5, 午: 6, 未: 7, 申: 8, 酉: 9, 戌: 10, 亥: 11 } as const;

// ── 天氣 ────────────────────────────────────────────────

export type Weather = 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow';
export const WEATHER_NAME: Record<Weather, string> = { clear: '晴', cloudy: '陰', rain: '雨', fog: '霧', snow: '雪' };

/** 各季的天氣機率（晴、陰、雨或雪、霧）：夏天雨多，秋天晴多，冬天下的是雪 */
const WEATHER_ODDS: Record<Season, [number, number, number, number]> = {
  spring: [0.45, 0.22, 0.23, 0.1],
  summer: [0.5, 0.15, 0.3, 0.05],
  autumn: [0.6, 0.2, 0.1, 0.1],
  winter: [0.4, 0.28, 0.22, 0.1],
};

/** 每天早上擲的天氣（依季節） */
function rollWeather(rand: () => number, season: Season): Weather {
  const [clear, cloudy, wet] = WEATHER_ODDS[season];
  const r = rand();
  if (r < clear) return 'clear';
  if (r < clear + cloudy) return 'cloudy';
  if (r < clear + cloudy + wet) return season === 'winter' ? 'snow' : 'rain';
  return 'fog';
}

// ── 季節與節氣 ──────────────────────────────────────────

/** 春（正月到三月）、夏（四到六月）、秋（七到九月）、冬（十月到臘月） */
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const SEASON_NAME: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
export const seasonOf = (day: number): Season => SEASONS[Math.floor(dateOf(day).month / 3)];

/** 二十四節氣：每月初一、十六各一個（月份 0 起算） */
const SOLAR_TERMS = [
  ['立春', '雨水'], ['驚蟄', '春分'], ['清明', '穀雨'], ['立夏', '小滿'], ['芒種', '夏至'], ['小暑', '大暑'],
  ['立秋', '處暑'], ['白露', '秋分'], ['寒露', '霜降'], ['立冬', '小雪'], ['大雪', '冬至'], ['小寒', '大寒'],
];
/** 今天交什麼節氣（不是交節氣的日子就是 undefined） */
export function solarTermOf(day: number): string | undefined {
  const { month, date } = dateOf(day);
  return date === 1 ? SOLAR_TERMS[month][0] : date === 16 ? SOLAR_TERMS[month][1] : undefined;
}
/** 現在落在哪個節氣裡（給提要、選單顯示） */
export function currentTerm(day: number): string {
  const { month, date } = dateOf(day);
  return SOLAR_TERMS[month][date >= 16 ? 1 : 0];
}

// ── 時間流逝 ────────────────────────────────────────────

/** 新遊戲從第一天辰時初（早上 7 點）開始 */
export const START_TIME = 28;

/**
 * 讓時間往前走幾刻：跨過半夜就換日，跨過時辰時天氣偶爾會變（起霧只在清晨，太陽出來就散）。
 * 回傳換了幾天。會直接修改傳入的 world。
 */
export function advance(w: World, ke: number, rand: () => number = Math.random): number {
  let days = 0;
  for (let i = 0; i < ke; i++) {
    const before = shichenOf(w.time);
    w.time++;
    if (w.time >= KE_PER_DAY) {
      w.time = 0;
      w.day++;
      days++;
    }
    const now = shichenOf(w.time);
    if (now === before) continue;
    const season = seasonOf(w.day);
    if (now === SHICHEN_INDEX.卯) w.weather = rollWeather(rand, season);
    else if (w.weather === 'fog' && now >= SHICHEN_INDEX.巳 && now <= SHICHEN_INDEX.申) w.weather = 'cloudy';
    else if (rand() < 0.12) {
      const next = rollWeather(rand, season);
      w.weather = next === 'fog' ? 'cloudy' : next;
    }
  }
  return days;
}

/** 從現在睡到下一個卯時初（早上 5 點）要幾刻 */
export function keUntilDawn(time: number): number {
  const dawn = shichenStart(SHICHEN_INDEX.卯);
  return time < dawn ? dawn - time : KE_PER_DAY - time + dawn;
}

// ── NPC 作息 ────────────────────────────────────────────

/** 依名字算出這個人幾點出門、幾點回房，讓大家陸陸續續地走（同一個人在不同地圖算出來一樣） */
function npcHours(name: string): [number, number] {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  // 卯時初到辰時初之間出門（5:00–7:00），酉時初到戌時正之間回房（17:00–20:00）
  return [20 + (h % 9), 68 + ((h >> 4) % 13)];
}

/** 用餐時段：午時、酉時（門派的人到廚房吃飯） */
export const isMealTime = (time: number) => inShichen(time, SHICHEN_INDEX.午, SHICHEN_INDEX.午) || inShichen(time, SHICHEN_INDEX.酉, SHICHEN_INDEX.酉);

/** 這個 NPC 現在在不在（outdoor：這張地圖是不是室外） */
export function npcPresent(
  n: { name: string; encounter?: string; allDay?: boolean; work?: boolean; night?: boolean; out?: number; meal?: 'eat' | 'away' },
  outdoor: boolean,
  time: number,
) {
  if (n.encounter) return true;
  // 用餐：eat 是廚房裡吃飯的那一份（只在用餐時段），away 是平常的那一份（用餐時段不在）
  if (n.meal === 'eat') return isMealTime(time);
  if (n.meal === 'away' && isMealTime(time)) return false;
  if (n.allDay) return true;
  const [hashedOut, home] = npcHours(n.name);
  const out = n.out ?? hashedOut;
  const awake = time >= out && time < home;
  if (n.night) return !awake;
  if (outdoor || n.work) return awake;
  return true;
}

// ── 曆法 ────────────────────────────────────────────────
// 一年 12 個月、每月 30 天。遊戲的第 1 日是二月初一。

const DAYS_PER_MONTH = 30;
const MONTHS_PER_YEAR = 12;
/** 第 1 日是一年中的第幾天（0 是正月初一） */
const START_OFFSET = DAYS_PER_MONTH;
const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '臘月'];
const NUM = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

/** 第幾日 → 第幾年、幾月（0 起算）、初幾（1 起算） */
export function dateOf(day: number) {
  const n = day - 1 + START_OFFSET;
  return {
    year: Math.floor(n / (DAYS_PER_MONTH * MONTHS_PER_YEAR)) + 1,
    month: Math.floor(n / DAYS_PER_MONTH) % MONTHS_PER_YEAR,
    date: (n % DAYS_PER_MONTH) + 1,
  };
}

/** 初一、初十、十五、廿三、三十 */
function dateName(d: number) {
  if (d <= 10) return `初${NUM[d]}`;
  if (d < 20) return `十${NUM[d - 10]}`;
  if (d === 20) return '二十';
  if (d < 30) return `廿${NUM[d - 20]}`;
  return '三十';
}

/** 例如「二月初三」；第二年起加上年份，例如「第二年正月十五」 */
export function dateText(day: number): string {
  const { year, month, date } = dateOf(day);
  return `${year > 1 ? `第${year <= 10 ? NUM[year] : year}年` : ''}${MONTH_NAMES[month]}${dateName(date)}`;
}

/** 節慶（月份 0 起算）。節慶當天的活動在之後的「節慶」階段加上 */
export const FESTIVALS: { name: string; month: number; date: number }[] = [
  { name: '過年', month: 0, date: 1 },
  { name: '元宵', month: 0, date: 15 },
  { name: '清明', month: 2, date: 5 },
  { name: '端午', month: 4, date: 5 },
  { name: '中元', month: 6, date: 15 },
  { name: '中秋', month: 7, date: 15 },
  { name: '掌門壽辰', month: 9, date: 12 },
];

/** 旬休：每月初十、二十、三十（每十天一次）。門派不上晨課，臨江城趕集 */
export const isXunxiu = (day: number) => dateOf(day).date % 10 === 0;

/** 今天是什麼節日（沒有就是 undefined） */
export function festivalOf(day: number) {
  const { month, date } = dateOf(day);
  return FESTIVALS.find((f) => f.month === month && f.date === date)?.name;
}
