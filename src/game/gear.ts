/**
 * 服飾與兵器：帽子、上衣、褲子、鞋子、手上與頸上的飾品，以及兵器（劍、刀）。
 *
 * 兵器：加攻擊力（依品級查表）。外功的招式要拿對兵器才能發揮全力——劍法要拿劍、刀法要拿刀、
 * 拳掌要空手（空手打拳另有一成加成）；拿錯或沒拿，外功招式只有九成威力（weaponFit）。
 *
 * - 每件有品級：粗製、普通、精良、上品、極品，品級越高防禦、閃避越好，也越值錢。
 * - 數值依部位與品級查表（GEAR_TABLE），新增服飾只要填部位與品級。
 * - 門派發的弟子服是綁定物品（不能賣、不能送），離開門派時收回（帶 sect）。
 * - 穿戴中的服飾存在角色的 gear（欄位 → 物品 id），不佔行囊。
 */

import type { ItemDef, SkillKind } from './character';

/** 服飾的種類；左右手的欄位都能戴「手」類飾品 */
export type GearKind = 'hat' | 'top' | 'bottom' | 'shoes' | 'hand' | 'neck' | 'weapon';
/** 兵器的種類 */
export type WeaponType = '劍' | '刀';
export type GearSlotId = 'hat' | 'top' | 'bottom' | 'shoes' | 'leftHand' | 'rightHand' | 'neck' | 'weapon';
export const kindOfSlot = (slot: GearSlotId): GearKind | null =>
  slot === 'leftHand' || slot === 'rightHand' ? 'hand' : slot;

export const GRADES = ['粗製', '普通', '精良', '上品', '極品'] as const;
/** 品級的顏色（介面用的 class） */
export const GRADE_CLASS = ['grade0', 'grade1', 'grade2', 'grade3', 'grade4'];

/** 各部位、各品級的防禦與閃避 */
const GEAR_TABLE: Record<GearKind, { def: number[]; eva: number[] }> = {
  hat: { def: [0, 1, 1, 2, 2], eva: [0, 0, 0, 0, 0] },
  top: { def: [1, 2, 3, 4, 5], eva: [0, 0, 0, 0, 0] },
  bottom: { def: [0, 1, 1, 2, 3], eva: [0, 0, 0, 0, 0] },
  shoes: { def: [0, 0, 1, 1, 1], eva: [0.01, 0.01, 0.015, 0.02, 0.03] },
  hand: { def: [0, 0, 1, 1, 2], eva: [0, 0.005, 0.005, 0.01, 0.01] },
  neck: { def: [0, 0, 0, 1, 1], eva: [0, 0.01, 0.01, 0.015, 0.02] },
  weapon: { def: [0, 0, 0, 0, 0], eva: [0, 0, 0, 0, 0] },
};
/** 兵器各品級加的攻擊力 */
const WEAPON_ATK = [2, 4, 7, 10, 14];

/** 外功要拿什麼兵器：劍法拿劍、刀法拿刀、拳掌空手 */
const WEAPON_FOR: Partial<Record<SkillKind, WeaponType | 'hand'>> = { 劍法: '劍', 刀法: '刀', 拳掌: 'hand' };
/** 拿錯兵器（或沒拿）時外功招式的威力；空手打拳的加成 */
export const WEAPON_MISFIT = 0.9;
export const BARE_HAND_BONUS = 1.1;

/** 用這一類武功的招式時，手上的兵器合不合：回傳威力倍數（不是外功就是 1） */
export function weaponFit(kind: SkillKind, held: WeaponType | undefined): number {
  const want = WEAPON_FOR[kind];
  if (!want) return 1;
  if (want === 'hand') return held ? WEAPON_MISFIT : BARE_HAND_BONUS;
  return held === want ? 1 : WEAPON_MISFIT;
}
export const weaponWanted = (kind: SkillKind) => WEAPON_FOR[kind];

export interface GearInfo {
  kind: GearKind;
  grade: number;
  def: number;
  eva: number;
  /** 兵器：加的攻擊力與種類 */
  atk?: number;
  weapon?: WeaponType;
  /** 門派發的：離開門派時收回 */
  sect?: string;
}

const KIND_NAME: Record<GearKind, string> = { hat: '帽子', top: '上衣', bottom: '褲子', shoes: '鞋子', hand: '手上飾品', neck: '頸上飾品', weapon: '兵器' };
export const gearKindName = (k: GearKind) => KIND_NAME[k];

export function gearEffectText(g: GearInfo) {
  const parts = [g.atk && `攻擊 +${g.atk}`, g.def && `防禦 +${g.def}`, g.eva && `閃避 +${Math.round(g.eva * 1000) / 10}%`].filter(Boolean);
  return parts.length ? parts.join('　') : '沒有加成';
}

export function gear(
  name: string,
  kind: GearKind,
  grade: number,
  desc: string,
  opts: { price?: number; sect?: string; icon?: ItemDef['icon'] } = {},
): ItemDef {
  const g: GearInfo = { kind, grade, def: GEAR_TABLE[kind].def[grade], eva: GEAR_TABLE[kind].eva[grade], ...(opts.sect ? { sect: opts.sect } : {}) };
  return {
    name,
    category: '服飾',
    icon: opts.icon ?? KIND_ICON[kind],
    desc: `${desc}（${GRADES[grade]}・${KIND_NAME[kind]}，${gearEffectText(g)}）`,
    gear: g,
    ...(opts.price ? { price: opts.price } : {}),
    ...(opts.sect ? { bound: true } : {}),
  };
}

export const KIND_ICON: Record<GearKind, ItemDef['icon']> = { hat: 'hat', top: 'robe', bottom: 'pants', shoes: 'shoes', hand: 'bracer', neck: 'pouch', weapon: 'sword' };

/** 兵器：種類與品級決定攻擊力 */
export function weapon(name: string, type: WeaponType, grade: number, desc: string, opts: { price?: number; sect?: string } = {}): ItemDef {
  const g: GearInfo = { kind: 'weapon', grade, def: 0, eva: 0, atk: WEAPON_ATK[grade], weapon: type, ...(opts.sect ? { sect: opts.sect } : {}) };
  return {
    name,
    category: '服飾',
    icon: type === '劍' ? 'sword' : 'blade',
    desc: `${desc}（${GRADES[grade]}・${type}，${gearEffectText(g)}；用${type === '劍' ? '劍法' : '刀法'}才發揮得了全力）`,
    gear: g,
    ...(opts.price ? { price: opts.price } : {}),
    ...(opts.sect ? { bound: true } : {}),
  };
}

/** 青竹村石記鐵鋪賣的兵器 */
export const SMITH_SHOP = ['w_wood_sword', 'w_iron_sword', 'w_chopper', 'w_saber'];
/** 鳴泉劍派各身分發的佩劍 */
export const MQ_SWORDS = ['mq_sword_1', 'mq_sword_2', 'mq_sword_3'];

/** 錦繡布莊賣的服飾 */
export const CLOTH_SHOP = ['g_headband', 'g_cap', 'g_shortcoat', 'g_gown', 'g_brocade', 'g_rough_pants', 'g_pants', 'g_sandals', 'g_shoes', 'g_boots', 'g_bracer', 'g_sachet'];

export const GEAR_ITEMS: Record<string, ItemDef> = {
  g_headband: gear('粗布頭巾', 'hat', 0, '一條粗布巾子，包住頭髮免得礙事。', { price: 4 }),
  g_cap: gear('青布帽', 'hat', 1, '讀書人常戴的青布小帽。', { price: 12 }),
  g_shortcoat: gear('粗布短褂', 'top', 0, '幹活穿的短褂，耐磨。', { price: 8 }),
  g_gown: gear('棉布長衫', 'top', 1, '厚實的棉布長衫，走江湖最常見的打扮。', { price: 28 }),
  g_brocade: gear('錦緞外袍', 'top', 2, '錦繡布莊的招牌貨，針腳細密，穿上去體面又擋得住刀風。', { price: 90 }),
  g_rough_pants: gear('粗布褲', 'bottom', 0, '一條粗布褲子。', { price: 6 }),
  g_pants: gear('棉布褲', 'bottom', 1, '厚棉布縫的褲子，膝蓋多襯了一層。', { price: 20 }),
  g_sandals: gear('草鞋', 'shoes', 0, '稻草編的鞋，輕便，就是不經穿。', { price: 3 }),
  g_shoes: gear('千層布鞋', 'shoes', 1, '一層層納出來的鞋底，走山路也不磨腳。', { price: 14 }),
  g_boots: gear('薄底快靴', 'shoes', 2, '鞋底薄而軟，落地無聲，輕功好手最愛。', { price: 70 }),
  // 大埠頭海商會館：海外來的飾品
  g_coral: gear('珊瑚墜', 'neck', 3, '一截紅珊瑚磨成的墜子，海商說是從南洋來的。', { price: 180 }),
  g_shark_bracer: gear('鯊皮護腕', 'hand', 3, '鯊魚皮鞣成的護腕，又韌又滑，刀鋒容易滑開。', { price: 170 }),
  g_sea_hat: gear('海藤笠', 'hat', 2, '海島上的藤編斗笠，又輕又透氣。', { price: 50 }),
  // 兵器：青竹村石記鐵鋪賣粗製、普通；趕集與當鋪偶爾有好的
  w_wood_sword: weapon('木劍', '劍', 0, '一把削得光滑的木劍，練招式剛好。', { price: 5 }),
  w_iron_sword: weapon('鐵劍', '劍', 1, '石記鐵鋪打的鐵劍，樸實耐用。', { price: 30 }),
  w_steel_sword: weapon('青鋼劍', '劍', 2, '青鋼百煉，劍身映得出人影。', { price: 120 }),
  w_autumn_sword: weapon('秋水劍', '劍', 3, '劍光如一泓秋水，不知是哪位名家的舊物。', { price: 320 }),
  w_chopper: weapon('柴刀', '刀', 0, '劈柴用的柴刀，真要拚命也砍得了人。', { price: 4 }),
  w_saber: weapon('樸刀', '刀', 1, '刀身寬厚，長柄雙手握，江湖上最常見的刀。', { price: 28 }),
  w_goose_saber: weapon('雁翎刀', '刀', 2, '刀身狹長微彎，形如雁翎，出刀極快。', { price: 110 }),
  // 鳴泉劍派依身分發的佩劍（綁定，離開門派收回）
  mq_sword_1: weapon('鳴泉練劍', '劍', 1, '鳴泉劍派記名弟子的佩劍，劍鞘上刻著小小的泉紋。', { sect: 'mingquan' }),
  mq_sword_2: weapon('鳴泉青鋒', '劍', 2, '鳴泉劍派正式弟子的佩劍，青鋒三尺。', { sect: 'mingquan' }),
  mq_sword_3: weapon('鳴泉秋泓', '劍', 3, '鳴泉劍派真傳弟子的佩劍，劍身如泓，揮動時隱隱有泉聲。', { sect: 'mingquan' }),
  // 旬休趕集時舊貨攤才有的
  g_bamboo_hat: gear('青竹笠', 'hat', 2, '細竹篾編的斗笠，遮陽擋雨，邊上還壓著一圈藤。', { price: 45 }),
  g_iron_bracer: gear('鐵護臂', 'hand', 3, '舊貨攤上淘來的鐵護臂，磨得發亮，不知擋過多少刀。', { price: 150 }),
  g_jade_pendant: gear('青玉墜', 'neck', 3, '一塊溫潤的青玉，攤主說是從前大戶人家流出來的。', { price: 160 }),
  g_cloud_boots: gear('雲紋靴', 'shoes', 3, '靴面繡著雲紋，鞋底輕軟，走起路來悄無聲息。', { price: 180 }),
  g_bracer: gear('皮護腕', 'hand', 2, '牛皮縫的護腕，擋得住刀劍擦過。', { price: 40 }),
  g_sachet: gear('繡花香囊', 'neck', 1, '繡著蘭草的香囊，戴在頸上，聞著神清氣爽。', { price: 18 }),
  // 鳴泉劍派發的弟子服（記名：灰布服；正式：月白道袍與布靴；真傳：青紋道袍）
  mq_robe_gray: gear('鳴泉灰布服', 'top', 1, '鳴泉劍派記名弟子穿的灰布衣，袖口繡著小小的泉紋。', { sect: 'mingquan', icon: 'robe_gray' }),
  mq_robe_white: gear('月白道袍', 'top', 2, '鳴泉劍派正式弟子的月白道袍，素淨挺括。', { sect: 'mingquan', icon: 'robe_white' }),
  mq_boots: gear('鳴泉布靴', 'shoes', 1, '鳴泉劍派發給正式弟子的布靴。', { sect: 'mingquan' }),
  mq_robe_blue: gear('青紋道袍', 'top', 3, '鳴泉劍派真傳弟子的道袍，衣襬繡著青色泉紋，一看就知道是師門看重的人。', { sect: 'mingquan', icon: 'robe_blue' }),
};

/** 鳴泉劍派各身分發的服飾 */
/** 鳴泉劍派各身分發的服飾與佩劍 */
export const MQ_UNIFORMS = [['mq_robe_gray', 'mq_sword_1'], ['mq_robe_white', 'mq_boots', 'mq_sword_2'], ['mq_robe_blue', 'mq_boots', 'mq_sword_3']];

/** 每個裝備欄空著時畫的淡淡圖示 */
export const GEAR_ICON: Record<GearSlotId, ItemDef['icon']> = {
  hat: 'hat', top: 'robe', bottom: 'pants', shoes: 'shoes', leftHand: 'bracer', rightHand: 'bracer', neck: 'pouch', weapon: 'sword',
};
