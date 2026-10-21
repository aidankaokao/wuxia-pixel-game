/**
 * 服飾：帽子、上衣、褲子、鞋子、手上與頸上的飾品（兵器之後再做）。
 *
 * - 每件有品級：粗製、普通、精良、上品、極品，品級越高防禦、閃避越好，也越值錢。
 * - 數值依部位與品級查表（GEAR_TABLE），新增服飾只要填部位與品級。
 * - 門派發的弟子服是綁定物品（不能賣、不能送），離開門派時收回（帶 sect）。
 * - 穿戴中的服飾存在角色的 gear（欄位 → 物品 id），不佔行囊。
 */

import type { ItemDef } from './character';

/** 服飾的種類；左右手的欄位都能戴「手」類飾品 */
export type GearKind = 'hat' | 'top' | 'bottom' | 'shoes' | 'hand' | 'neck';
export type GearSlotId = 'hat' | 'top' | 'bottom' | 'shoes' | 'leftHand' | 'rightHand' | 'neck' | 'weapon';
export const kindOfSlot = (slot: GearSlotId): GearKind | null =>
  slot === 'leftHand' || slot === 'rightHand' ? 'hand' : slot === 'weapon' ? null : slot;

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
};

export interface GearInfo {
  kind: GearKind;
  grade: number;
  def: number;
  eva: number;
  /** 門派發的：離開門派時收回 */
  sect?: string;
}

const KIND_NAME: Record<GearKind, string> = { hat: '帽子', top: '上衣', bottom: '褲子', shoes: '鞋子', hand: '手上飾品', neck: '頸上飾品' };
export const gearKindName = (k: GearKind) => KIND_NAME[k];

export function gearEffectText(g: GearInfo) {
  const parts = [g.def && `防禦 +${g.def}`, g.eva && `閃避 +${Math.round(g.eva * 1000) / 10}%`].filter(Boolean);
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

const KIND_ICON: Record<GearKind, ItemDef['icon']> = { hat: 'hat', top: 'robe', bottom: 'pants', shoes: 'shoes', hand: 'bracer', neck: 'pouch' };

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
export const MQ_UNIFORMS = [['mq_robe_gray'], ['mq_robe_white', 'mq_boots'], ['mq_robe_blue', 'mq_boots']];
