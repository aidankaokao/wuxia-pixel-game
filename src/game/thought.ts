/**
 * 主角頭上的想法泡泡：
 * - 代價：面對要花時間、體力的東西時，寫出花費（腳本用 events.ts 的 withCost 標上）。
 * - 提醒：時間走到某個點（晨課快結束、天黑、夜深）或體力見底時，冒出一句自言自語。
 *   提醒由各處 registerReminder 註冊，每一則一天最多冒一次（不存檔）。
 */

import type { Cost } from './events';
import { derive } from './character';
import type { DailyView } from './daily';
import { inShichen, SHICHEN_INDEX } from './time';

/** 一刻、兩刻、半個時辰、一個時辰、一個半時辰…… */
export function keText(ke: number): string {
  const N = '零一兩三四五六七八九';
  if (ke % 4) return `${N[ke] ?? ke}刻`;
  if (ke === 4) return '半個時辰';
  const sc = Math.floor(ke / 8);
  return `${N[sc] ?? sc}個${ke % 8 ? '半' : ''}時辰`;
}

/** 代價的文字；體力不夠時換成「累了」的想法 */
export function costText(c: Cost, v: DailyView): string {
  const parts = [c.ke ? keText(c.ke) : '', c.stamina ? `體力 ${c.stamina}` : ''].filter(Boolean);
  const head = `${parts.join('・')}${c.note ? `（${c.note}）` : ''}`;
  if (c.stamina && v.hero.stamina < c.stamina) return `體力不夠了……\n要 ${c.stamina}，只剩 ${v.hero.stamina}`;
  return head;
}

interface Reminder {
  id: string;
  check: (v: DailyView) => string | null;
}
const REMINDERS: Reminder[] = [];
/** 每則提醒上次冒出是第幾天 */
const fired: Record<string, number> = {};

export const registerReminder = (r: Reminder) => REMINDERS.push(r);

/** 檢查有沒有該冒出的提醒（冒出的那則會記下今天已提醒過） */
export function dueReminder(v: DailyView): string | null {
  for (const r of REMINDERS) {
    if (fired[r.id] === v.world.day) continue;
    const text = r.check(v);
    if (text) {
      fired[r.id] = v.world.day;
      return text;
    }
  }
  return null;
}

/** 開新遊戲、讀檔時重來 */
export const resetReminders = () => Object.keys(fired).forEach((k) => delete fired[k]);

// 天氣變了：下雨、起霧時自言自語一句
registerReminder({ id: 'rain', check: ({ world }) => (world.weather === 'rain' ? '下雨了……在外頭練功可要吃力些。' : null) });
registerReminder({ id: 'fog', check: ({ world }) => (world.weather === 'fog' ? '好大的霧……' : null) });
registerReminder({ id: 'dusk', check: ({ world }) => (inShichen(world.time, SHICHEN_INDEX.酉, SHICHEN_INDEX.酉) ? '天色暗下來了……' : null) });
registerReminder({ id: 'late', check: ({ world }) => (inShichen(world.time, SHICHEN_INDEX.亥, SHICHEN_INDEX.亥) ? '夜深了，該找地方睡了。' : null) });
registerReminder({
  id: 'tired',
  check: ({ hero }) => (hero.stamina < derive(hero).maxStamina * 0.2 ? '好累……該歇一歇了。' : null),
});
