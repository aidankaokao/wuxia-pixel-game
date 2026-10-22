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

/** 交節氣那天，提要多一句（節氣名 → 一句話） */
export const TERM_LINE: Record<string, string> = {
  立春: '立春了。風裡還帶著寒意，柳梢卻已經冒出一點綠。',
  雨水: '雨水。春雨細細的，田裡的人開始忙了。',
  驚蟄: '驚蟄。一聲春雷，冬眠的蟲子都醒了，山裡的野獸也多了起來。',
  春分: '春分，晝夜一樣長。燕子回來了。',
  清明: '清明。家家戶戶上山掃墓，路上的行人多了。',
  穀雨: '穀雨。雨生百穀，茶山上採新茶的人多了。',
  立夏: '立夏。天一下子熱起來，荷塘裡冒出了小小的荷葉。',
  小滿: '小滿。麥穗漸漸飽滿，還沒全熟。',
  芒種: '芒種。農家最忙的時候，搶收又搶種。',
  夏至: '夏至，一年裡白天最長的一天。',
  小暑: '小暑。蟬叫得震天響，午後常有雷陣雨。',
  大暑: '大暑，熱得連狗都趴著不動。在外頭練功要多喝水。',
  立秋: '立秋。早晚涼了些，荷塘裡的菱角快熟了。',
  處暑: '處暑，暑氣漸消。',
  白露: '白露。草葉上掛著露水，夜裡涼得要添衣。',
  秋分: '秋分，晝夜又一樣長了。桂花開了，滿城都香。',
  寒露: '寒露。山上的楓葉紅了。',
  霜降: '霜降。早上起來，瓦上結了一層白霜。蓮藕可以挖了。',
  立冬: '立冬。該醃臘肉、曬魚乾了。',
  小雪: '小雪。天陰沉沉的，像是要下雪。',
  大雪: '大雪。山道積雪難行，出遠門要多留些時候。',
  冬至: '冬至，一年裡夜最長的一天。家家吃湯圓。',
  小寒: '小寒。湖邊結了薄冰。',
  大寒: '大寒，一年最冷的時候。再熬一熬，春天就來了。',
};

/** 提要開頭的一句天氣 */
export const WEATHER_LINE: Record<Weather, string> = {
  clear: '天朗氣清，是個練功的好日子。曬藥、織布都順手。',
  cloudy: '天色陰陰的，雲層壓得很低。',
  rain: '外頭下著雨，屋簷滴滴答答。野獸少了一半，山裡的野菌倒是冒出不少；在室外練功會比較累。',
  fog: '山間起了霧，十步之外就看不清人影。聽說霧天的後山，偶爾會碰上怪事。',
  snow: '下雪了，屋簷、樹梢一片白。野獸躲回窩裡，在外頭練功、趕路都吃力些；湖邊的甲魚也不出來了。',
};
