/**
 * 門派系統的共用核心：門派規矩（SectDef）與玩家在門派裡的狀態（SectState，存在 world.sect）。
 * 各門派的人物、劇情與規矩的實際內容寫在 story/ 底下（例如 story/sect_mingquan.ts）。
 *
 * 規矩依門派大小而不同：越大的門派規矩越多、越嚴；小門派比較彈性。
 * - 收徒：小門派隨時通過考驗就能拜師；大門派一季或一年才辦一次收徒大典。
 * - 脫離：記名弟子通常可以自由離開；正式弟子以上依門規交罰金、闖陣，或根本不准離開（叛門會被追殺）。
 * - 兵器：依門派屬性傳授，劍派以劍為主；門派越大，能學的兵器越多樣。
 */

import type { SkillKind } from './character';
import type { World } from './home';

export type SectSize = '小' | '中' | '大';

/** 收徒的時機 */
export type RecruitRule =
  | { kind: 'anytime' } // 隨時：通過考驗就能拜師
  | { kind: 'ceremony'; every: number; name: string }; // 每隔幾天辦一次收徒大典（一季 90 天、一年 360 天）

/** 從某個身分脫離門派的方式（列出的任一種都行） */
export type LeaveRule =
  | { kind: 'free' } // 自由離開
  | { kind: 'fine'; silver: number } // 交一筆罰金
  | { kind: 'trial'; name: string; encounter: string } // 闖過門派的陣法或考驗
  | { kind: 'hunted'; survive: number } // 叛門：被追殺，撐過幾次才算真正脫離
  | { kind: 'never' }; // 不准離開

export interface RankDef {
  /** 身分名稱：記名弟子、正式弟子、真傳弟子… */
  name: string;
  /** 住在哪裡（顯示用） */
  dorm: string;
  /** 這個身分能做的事（顯示用） */
  perks: string[];
  /** 每 STIPEND_DAYS 天能領的月例 */
  stipend: { silver: number; items?: Record<string, number> };
  /** 從這個身分脫離門派的方式 */
  leave: LeaveRule[];
  /** 升到下一級的條件（最高一級不用寫） */
  promote?: Promotion;
}

export interface Promotion {
  /** 入門（或上次晉升）後至少幾天 */
  days: number;
  /** 累計功績 */
  merit: number;
  /** 武功重數門檻 */
  skills: { id: string; level: number }[];
  /** 最後還要通過的考核（顯示用；實際劇情在各門派的檔案裡） */
  test: string;
}

/** 書房能抄錄的本門武功 */
export interface SectSkill {
  id: string;
  /** 幾級身分才能學（0 是最低一級） */
  rank: number;
  /** 抄錄要花的貢獻 */
  cost: number;
}

export interface SectRule {
  name: string;
  desc: string;
}

export interface SectDef {
  id: string;
  name: string;
  size: SectSize;
  recruit: RecruitRule;
  /** 由低到高 */
  ranks: RankDef[];
  /** 門派傳授的兵器種類，排越前面越是主修 */
  weapons: SkillKind[];
  rules: SectRule[];
  skills: SectSkill[];
}

/** 玩家在門派裡的狀態（存在 world.sect） */
export interface SectState {
  id: string;
  /** 身分：RankDef 的索引 */
  rank: number;
  /** 哪一天入門 */
  joinedDay: number;
  /** 哪一天升到目前的身分 */
  rankDay: number;
  /** 貢獻：做事累積，可以花掉（抄錄武功、換東西） */
  contrib: number;
  /** 功績：累計的貢獻，只增不減，晉升看這個 */
  merit: number;
  /** 上次領月例是哪一天（0 表示還沒領過） */
  stipendDay: number;
}

/** 月例幾天領一次 */
export const STIPEND_DAYS = 7;

const SECTS: Record<string, SectDef> = {};
export const registerSect = (def: SectDef) => (SECTS[def.id] = def);
export const sectDef = (id: string): SectDef | undefined => SECTS[id];

export const newSectState = (id: string, day: number): SectState => ({
  id,
  rank: 0,
  joinedDay: day,
  rankDay: day,
  contrib: 0,
  merit: 0,
  stipendDay: 0,
});

/** 主角目前是不是這個門派的弟子 */
export const inSect = (w: World, id: string) => w.sect?.id === id;

export const rankName = (s: SectState) => SECTS[s.id]?.ranks[s.rank]?.name ?? '';

/** 增加貢獻（同時累計功績）；回傳提示文字 */
export function addContrib(w: World, n: number): string {
  if (!w.sect) return '';
  w.sect.contrib += n;
  w.sect.merit += n;
  return `門派貢獻 +${n}。`;
}

/** 下一次能領月例是第幾天 */
export const nextStipendDay = (s: SectState) => (s.stipendDay ? s.stipendDay + STIPEND_DAYS : s.joinedDay);

/** 晉升條件逐項檢查（給選單顯示，之後的晉升考核也用它判斷能不能考） */
export function promotionChecks(
  s: SectState,
  day: number,
  skillLevel: (id: string) => number,
  skillName: (id: string) => string,
): { label: string; ok: boolean }[] | null {
  const p = SECTS[s.id]?.ranks[s.rank]?.promote;
  if (!p) return null;
  const served = day - s.rankDay;
  return [
    { label: `以目前身分在門中滿 ${p.days} 天（目前 ${served} 天）`, ok: served >= p.days },
    { label: `累計功績 ${p.merit}（目前 ${s.merit}）`, ok: s.merit >= p.merit },
    ...p.skills.map((k) => ({ label: `「${skillName(k.id)}」練到第 ${k.level} 重（目前 ${skillLevel(k.id)} 重）`, ok: skillLevel(k.id) >= k.level })),
    { label: `通過${p.test}`, ok: false },
  ];
}

export function leaveRuleText(r: LeaveRule): string {
  switch (r.kind) {
    case 'free':
      return '可以自由離開';
    case 'fine':
      return `繳納罰金 ${r.silver} 兩`;
    case 'trial':
      return `闖過「${r.name}」`;
    case 'hunted':
      return `叛門會被追殺，撐過 ${r.survive} 次才算脫離`;
    case 'never':
      return '不准離開';
  }
}

export function recruitText(r: RecruitRule): string {
  return r.kind === 'anytime' ? '隨時收徒：通過入門考驗就能拜師' : `每 ${r.every} 天辦一次${r.name}`;
}
