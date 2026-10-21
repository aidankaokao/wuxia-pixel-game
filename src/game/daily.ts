/**
 * 今日事：每天早上（睡醒、讀檔、開新遊戲）跳出的提要，以及選單「江湖事」最上面的「今日」清單。
 *
 * 今天能做、該做的事由各處註冊（registerDailyTasks）：門派的晨課與雜務、自家藥圃、節慶……
 * 每個來源依目前的狀態算出清單，不另外存檔。
 */

import type { Character } from './character';
import type { World } from './home';
import type { Flags } from '../state/store';
import { festivalOf, type Weather } from './time';

export type TaskState = 'todo' | 'done' | 'missed';

export interface DayTask {
  text: string;
  state: TaskState;
  /** 補充說明（地點、進度） */
  note?: string;
}

export interface DailyView {
  hero: Character;
  flags: Flags;
  world: World;
}

type Provider = (v: DailyView) => DayTask[];
const PROVIDERS: Provider[] = [];

/** 註冊一個「今日事」的來源 */
export const registerDailyTasks = (p: Provider) => PROVIDERS.push(p);

/** 今天的事：還沒做的排前面，做完、錯過的排後面 */
export function todayTasks(v: DailyView): DayTask[] {
  const order: Record<TaskState, number> = { todo: 0, done: 1, missed: 2 };
  return PROVIDERS.flatMap((p) => p(v)).sort((a, b) => order[a.state] - order[b.state]);
}

/** 節慶當天：提醒四處走走 */
registerDailyTasks(({ world }) => {
  const f = festivalOf(world.day);
  if (!f) return [];
  const done = Object.entries(world.daily).some(([k, d]) => k.startsWith('fest:') && d.day === world.day);
  return [{ text: `今天是${f}，到處走走，看看有什麼節慶活動`, state: done ? 'done' : 'todo' }];
});

/** 提要開頭的一句天氣 */
export const WEATHER_LINE: Record<Weather, string> = {
  clear: '天朗氣清，是個練功的好日子。曬藥、織布都順手。',
  cloudy: '天色陰陰的，雲層壓得很低。',
  rain: '外頭下著雨，屋簷滴滴答答。野獸少了一半，山裡的野菌倒是冒出不少；在室外練功會比較累。',
  fog: '山間起了霧，十步之外就看不清人影。聽說霧天的後山，偶爾會碰上怪事。',
};
