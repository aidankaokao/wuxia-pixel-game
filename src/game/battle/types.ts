/**
 * 戰鬥的資料型別。
 *
 * 分成兩層：
 * - 規則（engine.ts）：一個招式打下去會發生什麼，跟時間無關。
 * - 出手順序（controller.ts）：誰在什麼時候出手。回合制與之後的半即時制只差在這一層。
 */

export type Side = 'hero' | 'enemy';
export type Outcome = 'win' | 'lose' | 'flee';

/** 招式的視覺效果 */
export type MoveFx = 'slash' | 'punch' | 'leaves' | 'qi' | 'heavy' | 'wind';

/**
 * 戰鬥中的狀態（增益／減益）。數值是比例，例如 block 0.35 表示受到的傷害減少 35%。
 * 持續時間以「擁有者的出手次數」計算：每次輪到他出手時減一，歸零就消失（回合制、半即時制通用）。
 */
export type EffectKind =
  | 'block' // 格擋：受到的傷害減少
  | 'speed' // 迅捷：速度提高
  | 'power' // 勁增：攻擊與內勁提高
  | 'evade' // 身輕：閃避率提高（加上去的值）
  | 'counter' // 反擊：閃過攻擊時還手一擊（數值是威力倍率）
  | 'slow' // 遲緩：速度降低
  | 'weaken' // 力竭：攻擊降低
  | 'armorBreak' // 破綻：防禦降低
  | 'stun'; // 震懾：下一次輪到時無法出手

export const EFFECT_NAME: Record<EffectKind, string> = {
  block: '格擋',
  speed: '迅捷',
  power: '勁增',
  evade: '身輕',
  counter: '反擊',
  slow: '遲緩',
  weaken: '力竭',
  armorBreak: '破綻',
  stun: '震懾',
};
export const DEBUFFS: EffectKind[] = ['slow', 'weaken', 'armorBreak', 'stun'];

export interface Effect {
  kind: EffectKind;
  value: number;
  turns: number;
}

export interface Move {
  id: string;
  name: string;
  desc: string;
  /** 消耗內力 */
  qi: number;
  /** 威力倍率；restore 類則為回復量的倍率；buff 類為 0 */
  power: number;
  /** outer：外功，看攻擊力；inner：內功，看內勁；restore：調息回復；buff：只給自己狀態 */
  kind: 'outer' | 'inner' | 'restore' | 'buff';
  target: 'enemy' | 'allEnemies' | 'self';
  /** 由哪門武功而來，使用後該武功增加熟練度與領悟度 */
  skillId?: string;
  fx: MoveFx;
  /** 連擊次數（預設 1） */
  hits?: number;
  /** 出招後給自己的狀態 */
  self?: Effect[];
  /** 打中目標時給對方的狀態；chance 為機率（預設必定） */
  foe?: (Effect & { chance?: number })[];
}

export interface Unit {
  id: string;
  name: string;
  side: Side;
  sprite: string;
  maxHp: number;
  hp: number;
  maxQi: number;
  qi: number;
  /** 外功攻擊 */
  atk: number;
  /** 內勁（內功招式的威力） */
  ipow: number;
  def: number;
  /** 速度：決定出手先後 */
  spd: number;
  /** 閃避率 0–1 */
  eva: number;
  moves: string[];
  /** 防禦中，受到的傷害減半，直到下次出手 */
  guard: boolean;
  /** 蓄勢中，下次出手會使出殺招 */
  charging: boolean;
  ai?: 'grunt' | 'boss';
  /** 主角用「出手」時，熟練度算在哪門武功（裝備中最高的外功） */
  baseSkill?: string;
  /** 主角：各招式的威力倍數（兵器合不合手，見 gear.ts 的 weaponFit）；沒列的是 1 */
  moveMult?: Record<string, number>;
  /** 身上的狀態 */
  effects: Effect[];
}

export type BattleCommand =
  | { type: 'move'; moveId: string; targetId?: string }
  | { type: 'item'; itemId: string }
  | { type: 'defend' }
  | { type: 'flee' }
  /** 敵人專用：蓄勢，下一招使出殺招 */
  | { type: 'charge' };

export interface Hit {
  target: string;
  damage: number;
  miss: boolean;
  crit: boolean;
  killed: boolean;
}

/** 規則層算出的結果，交給戰鬥場景依序播放動畫 */
export type BattleEvent =
  | { type: 'message'; text: string }
  | { type: 'strike'; actor: string; move: Move; hits: Hit[] }
  | { type: 'restore'; actor: string; hp: number; qi: number }
  /** 狀態有變化（得到、消失），畫面重新整理標籤 */
  | { type: 'effects'; actor: string; gained?: EffectKind[] }
  | { type: 'guard'; actor: string }
  | { type: 'charge'; actor: string }
  | { type: 'flee'; actor: string; success: boolean };

// ── 給介面顯示用 ──────────────────────────────────────────

export interface UnitView {
  id: string;
  name: string;
  side: Side;
  hp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  alive: boolean;
  guard: boolean;
  charging: boolean;
  effects: Effect[];
}

export interface MoveView {
  id: string;
  name: string;
  desc: string;
  qi: number;
  target: Move['target'];
  usable: boolean;
}

export interface ItemView {
  id: string;
  name: string;
  desc: string;
  count: number;
}

export interface BattleView {
  units: UnitView[];
  message: string;
  /** 輪到玩家下指令時才有值 */
  input: null | { actorId: string; moves: MoveView[]; items: ItemView[]; canFlee: boolean };
  /** 戰鬥結束的結算畫面 */
  result: null | { outcome: Outcome; title: string; lines: string[] };
}
