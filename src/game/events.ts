import type { Character } from './character';
import type { Dir } from './constants';
import type { Outcome } from './battle/types';
import type { Line } from './maps/types';
import type { Panel } from '../state/store';

/**
 * 劇情腳本。用 async 函式寫，讀起來就像劇本：
 *
 *   async (ctx) => {
 *     await ctx.say({ speaker: '柳承安', text: '少俠請留步。' });
 *     if (await ctx.ask('願意幫忙嗎？', ['願意', '不了']) === 0) ctx.setFlag('q_bandits', 1);
 *   }
 *
 * 腳本執行期間主角不能自由行動。
 */
export type Script = (ctx: EventCtx) => Promise<void>;

export interface EventCtx {
  /** 依序顯示幾句話；字串視為旁白 */
  say(...lines: (Line | string)[]): Promise<void>;
  /** 顯示一句話與選項，回傳選到第幾個（從 0 起算） */
  ask(line: Line | string, choices: string[]): Promise<number>;
  flag(key: string): number;
  setFlag(key: string, value?: number): void;
  /**
   * 修改主角（拿到的是複本，可直接改），回傳的提示文字會依序顯示出來，
   * 例如 `ctx.hero((c) => [giveItem(c, 'jinchuang', 3), learnSkill(c, 'qingzhu')])`。
   */
  hero(fn: (c: Character) => (string | null)[] | string | null | void): Promise<void>;
  /**
   * 開戰。輸了會自動被送回村裡、腳本中止，所以呼叫端只需處理 win / flee。
   * 切磋（遭遇戰設了 spar）輸了不會被送走，回傳 'lose'。
   */
  battle(encounter: string): Promise<Outcome>;
  /** 讓 NPC（或 'player'）照著方向一步步走 */
  walk(who: string, dirs: Dir[]): Promise<void>;
  face(who: string, dir: Dir): void;
  /** NPC 與主角轉身面對面 */
  faceEachOther(npcId: string): void;
  wait(ms: number): Promise<void>;
  /** 依目前旗標重新決定哪些 NPC、物件要出現 */
  refresh(): void;
  /** 重新載入目前的地圖（例如蓋好房子後要換上新建築），主角留在原地 */
  reload(arrive?: Line[]): void;
  /** 打開介面面板（商店、房屋），關閉後才繼續 */
  panel(p: Panel): Promise<void>;
}

/** 腳本中途被打斷（例如戰敗被送走）時拋出，由執行者接住即可 */
export class ScriptAbort extends Error {}
