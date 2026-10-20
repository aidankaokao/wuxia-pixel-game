/**
 * 人際關係的核心資料：熟悉度、階段、名聲。
 * 每個人的個性（怎麼提升熟悉度、說什麼話、怎麼稱呼你）寫在 story/people.ts；互動流程在 story/social.ts。
 */

export interface Relation {
  /** 熟悉度 -100–100 */
  aff: number;
  /** 哪一天聊過幾次（每天前幾次才加熟悉度） */
  talk: { day: number; n: number };
  /** 交談、閒聊各輪到第幾句 */
  lineIdx: number;
  chatIdx: number;
  giftDay: number;
  sparDay: number;
  teachDay: number;
  /** 哪一天一起玩過琴棋書畫（舊存檔沒有） */
  hobbyDay?: number;
  /** 已經知道的喜好（送過才知道） */
  known: string[];
  /** 已經觸發過的熟悉度事件 */
  events: string[];
}

export const newRelation = (): Relation => ({
  aff: 0,
  talk: { day: 0, n: 0 },
  lineIdx: 0,
  chatIdx: 0,
  giftDay: 0,
  sparDay: 0,
  teachDay: 0,
  known: [],
  events: [],
});

/** 熟悉度的階段（索引越大越熟） */
export const STAGES = [
  { min: -100, name: '反感' },
  { min: 0, name: '陌生' },
  { min: 10, name: '點頭之交' },
  { min: 30, name: '熟識' },
  { min: 60, name: '知交' },
  { min: 90, name: '莫逆之交' },
] as const;
export const STAGE = { DISLIKE: 0, STRANGER: 1, NOD: 2, FAMILIAR: 3, CLOSE: 4, BOND: 5 } as const;

export function stageOf(aff: number): number {
  let s = 0;
  STAGES.forEach((st, i) => {
    if (aff >= st.min) s = i;
  });
  return s;
}

export const clampAff = (n: number) => Math.max(-100, Math.min(100, n));

// ── 名聲 ────────────────────────────────────────────────

/** 名聲決定稱號，也影響別人怎麼稱呼你、理不理你 */
export const FAME_TITLES = [
  { min: 0, name: '初出茅廬' },
  { min: 15, name: '小有名氣' },
  { min: 40, name: '嶄露頭角' },
  { min: 80, name: '名動一方' },
  { min: 150, name: '威震江湖' },
] as const;

export function fameTitle(fame: number): string {
  let t: string = FAME_TITLES[0].name;
  for (const f of FAME_TITLES) if (fame >= f.min) t = f.name;
  return t;
}
