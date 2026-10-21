/**
 * 日課表：排好一天的固定行程（例：晨課 → 領飯 → 雜務 → 練樁 → 研讀 → 睡覺），在自己的床鋪一鍵照做。
 * 每件事快轉時間、播一小段動畫，最後一次說完今天做了什麼。
 *
 * - 能排的事（Activity）由各處 registerActivity 註冊，例如鳴泉劍派的晨課、雜務、練樁（story/sect_mingquan.ts）。
 * - 日常小事（DayEvent）：照表做事、親手做事、跟人聊天時偶爾發生，依時辰、天氣、交情而不同。
 *   做事時一天最多一件、聊天時一天最多一件（見 story/schedule.ts 的 maybeDayEvent），不是每天都有。
 * - 表存在 world.schedule（活動 id 的陣列）；執行的腳本在 story/schedule.ts，排表的介面是 ui/SchedulePanel.tsx。
 */

import type { WorkKind } from './art/work';
import type { DailyView } from './daily';
import type { EventCtx } from './events';

/** 事情的種類，給隨機事件挑場合用（chat 是跟人聊天） */
export type ActivityTag = 'drill' | 'chore' | 'study' | 'meal' | 'rest' | 'chat';

export interface Activity {
  id: string;
  name: string;
  desc: string;
  tag: ActivityTag;
  /** 花幾刻 */
  ke: number;
  /** 花多少體力（照表做時由執行者先扣）；會隨天氣等變動的給函式 */
  stamina: number | ((v: DailyView) => number);
  /** 過場動畫（雜務依當天接的是哪件而不同，所以也可以給函式） */
  work: WorkKind | ((v: DailyView) => WorkKind);
  /** 能不能排進表（例如是這個門派的弟子） */
  available: (v: DailyView) => boolean;
  /** 現在做得了嗎：做得了回傳 null，否則回傳跳過的原因（例如「晨課的時辰已經過了」） */
  check: (v: DailyView) => string | null;
  /** 做這件事（不用再問、不扣體力、不過時間），回傳要記進今日總結的話 */
  run: (ctx: EventCtx) => Promise<(string | null)[]>;
  /** 一天最多排幾次 */
  max?: number;
  /** 這件做完就結束日課（例如睡覺） */
  last?: boolean;
}

const ACTIVITIES: Activity[] = [];
export const registerActivity = (a: Activity) => ACTIVITIES.push(a);
export const activityDef = (id: string) => ACTIVITIES.find((a) => a.id === id);
/** 目前能排進表的事 */
export const activities = (v: DailyView) => ACTIVITIES.filter((a) => a.available(v));
export const staminaOf = (a: Activity, v: DailyView) => (typeof a.stamina === 'function' ? a.stamina(v) : a.stamina);

/** 表最多排幾件 */
export const MAX_SLOTS = 10;

/** 沒排過表時的預設行程（有哪些就用哪些） */
const DEFAULT_SCHEDULE = ['morning', 'meal', 'chore', 'chore', 'chore', 'stake', 'stake', 'study', 'sit', 'sleep'];
export const defaultSchedule = (v: DailyView) => DEFAULT_SCHEDULE.filter((id) => activityDef(id)?.available(v));

/** 目前的表：去掉已經不能排的事 */
export const scheduleOf = (v: DailyView) => (v.world.schedule ?? defaultSchedule(v)).filter((id) => activityDef(id)?.available(v));

// ── 有人找 ──────────────────────────────────────────────

/** 照表做到一半，有人找你（例如掌門要你去大殿）：回傳要說的話就停下日課 */
type Interrupt = (v: DailyView) => string | null;
const INTERRUPTS: Interrupt[] = [];
export const registerInterrupt = (f: Interrupt) => INTERRUPTS.push(f);
export const interruptOf = (v: DailyView) => INTERRUPTS.map((f) => f(v)).find(Boolean) ?? null;

// ── 隨機事件 ────────────────────────────────────────────

export interface DayEvent {
  id: string;
  /** 在哪種事做完後可能發生 */
  after: ActivityTag[];
  weight: number;
  /** 聊天時：只跟這些人（人物 id）聊才會發生；不填就是誰都行 */
  with?: string[];
  /** 這時候合不合適（例如要跟某人熟、下雨天）；who 是聊天的對象 */
  when?: (v: DailyView, who?: string) => boolean;
  run: (ctx: EventCtx, who?: string) => Promise<void>;
}

const EVENTS: DayEvent[] = [];
export const registerDayEvent = (e: DayEvent) => EVENTS.push(e);

/** 每做完一件事、每聊一次天，發生小事的機率（各一天最多一件；一天做七八件事，大約三天碰上一次） */
export const EVENT_CHANCE: Record<'work' | 'chat', number> = { work: 0.06, chat: 0.1 };

/** 這件事做完後，挑一件可能發生的小事（沒有就是 undefined） */
export function rollDayEvent(tag: ActivityTag, v: DailyView, who?: string, rand = Math.random): DayEvent | undefined {
  if (rand() >= EVENT_CHANCE[tag === 'chat' ? 'chat' : 'work']) return undefined;
  const pool = EVENTS.filter((e) => e.after.includes(tag) && (!e.with || (who && e.with.includes(who))) && (e.when?.(v, who) ?? true));
  const total = pool.reduce((s, e) => s + e.weight, 0);
  let r = rand() * total;
  return pool.find((e) => (r -= e.weight) < 0);
}
