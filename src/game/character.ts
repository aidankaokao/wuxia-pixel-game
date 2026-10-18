/**
 * 角色成長模型。
 *
 * 沒有「人物等級」。五維 ＝ 擲骰底值 ＋ 永久成長 ＋ 已裝備武功的加成：
 * - 永久成長：每門學過的武功依等級（重數）永久提升五維與氣血／內力／體力上限，卸下也不會消失。
 * - 裝備加成：只有裝備在身上的武功才有，等級越高加成越多。
 * 武功有品階，品階決定正常上限；到了上限後，有秘笈就能花「武學點數」嘗試突破，最高到隱藏上限。
 */

import type { ItemIcon } from './art/items';

export type AttrKey = 'strength' | 'agility' | 'constitution' | 'energy' | 'insight';
export type Attrs = Record<AttrKey, number>;

export const ATTRS: { key: AttrKey; name: string; desc: string }[] = [
  { key: 'strength', name: '勁力', desc: '出手的力道，影響外功傷害。' },
  { key: 'agility', name: '身法', desc: '身形的靈巧，影響閃避、出手快慢與輕功。' },
  { key: 'constitution', name: '根骨', desc: '筋骨的強健，影響氣血與體力上限。' },
  { key: 'energy', name: '內息', desc: '丹田真氣的深厚，影響內力上限與內功威力。' },
  { key: 'insight', name: '悟性', desc: '領會武學的天分，影響練功的快慢。' },
];

export const attrName = (k: AttrKey) => ATTRS.find((a) => a.key === k)!.name;
export const zeroAttrs = (): Attrs => ({ strength: 0, agility: 0, constitution: 0, energy: 0, insight: 0 });

// ── 擲骰 ────────────────────────────────────────────────

/** 每項五維底值的範圍，與五項總和的範圍（避免擲出太強或太弱的角色） */
export const ROLL = { min: 5, max: 18, totalMin: 52, totalMax: 62 };

export function rollAttrs(rand: () => number = Math.random): Attrs {
  for (;;) {
    const a = zeroAttrs();
    for (const { key } of ATTRS) a[key] = ROLL.min + Math.floor(rand() * (ROLL.max - ROLL.min + 1));
    const total = sumAttrs(a);
    if (total >= ROLL.totalMin && total <= ROLL.totalMax) return a;
  }
}

export const sumAttrs = (a: Attrs) => ATTRS.reduce((n, { key }) => n + a[key], 0);

const SURNAMES = '蕭葉沈陸顧韓秦柳江白溫穆凌裴燕楚岳謝杜方雲龍石嚴蘇司馬歐陽上官南宮東方慕容'.match(/司馬|歐陽|上官|南宮|東方|慕容|./g)!;
const NAME_CHARS = '子雲風行遠朔寒舟川岳辰逸塵青嵐霜昭明峻然弈之衡鈞驍若謙澄翊非白羽鳴';

/** 隨機產生姓與名（名一或兩個字） */
export function rollName(rand: () => number = Math.random): { surname: string; given: string } {
  const pick = (s: string | string[]) => s[Math.floor(rand() * s.length)];
  const given = rand() < 0.3 ? pick(NAME_CHARS) : pick(NAME_CHARS) + pick(NAME_CHARS);
  return { surname: pick(SURNAMES), given: given[0] === given[1] ? given[0] : given };
}

// ── 物品 ────────────────────────────────────────────────

export type ItemCategory = '藥品' | '秘笈' | '雜物';
/** 物品欄的分類（也是「重新整理」排序的先後） */
export const ITEM_CATEGORIES: ItemCategory[] = ['藥品', '秘笈', '雜物'];

export interface ItemDef {
  name: string;
  desc: string;
  category: ItemCategory;
  icon: ItemIcon;
  hp?: number;
  qi?: number;
  /** 秘笈：對應的武功 id。持有時才能突破該武功的等級上限（不會消耗） */
  manual?: string;
  /** 價錢（銀兩）：商店照這個價賣，收購時給一半；沒有就是不能買賣 */
  price?: number;
}

/** 商店收購價 */
export const sellPrice = (id: string) => Math.floor((ITEMS[id]?.price ?? 0) / 2);

export const ITEMS: Record<string, ItemDef> = {
  jinchuang: { name: '金創藥', category: '藥品', icon: 'salve', desc: '江湖常備的外傷藥，敷上可止血生肌。回復氣血 80。', hp: 80, price: 30 },
  tea: { name: '竹葉清茶', category: '藥品', icon: 'tea', desc: '鍾嬸親手泡的茶，清心寧神。回復內力 30。', qi: 30, price: 12 },
  stew: { name: '燉山豬肉', category: '藥品', icon: 'stew', desc: '自家灶台燉的山豬肉，香氣撲鼻。回復氣血 150。', hp: 150, price: 40 },
  herb: { name: '止血草', category: '雜物', icon: 'herb', desc: '常見的草藥，可以拿到藥爐煉成金創藥。', price: 6 },
  boar_meat: { name: '山豬肉', category: '雜物', icon: 'meat', desc: '一大塊山豬肉。可以賣錢，也可以在自家灶台燉來吃。', price: 16 },
  boar_tusk: { name: '山豬獠牙', category: '雜物', icon: 'tusk', desc: '又長又硬的獠牙，貨郎說城裡有人收。', price: 30 },
  dog_pelt: { name: '野狗皮', category: '雜物', icon: 'pelt', desc: '粗硬的狗皮，硝過之後能做些皮件。', price: 12 },
  manual_zhuying: {
    name: '竹影劍痕拓本', category: '秘笈', icon: 'scroll', manual: 'zhuying',
    desc: '從竹林石碑拓下的劍痕。持有時可突破「竹影劍法」的等級上限。',
  },
  manual_qingzhu: {
    name: '青竹步手札', category: '秘笈', icon: 'book', manual: 'qingzhu',
    desc: '柳承安年輕時寫下的步法心得。持有時可突破「青竹步」的等級上限。',
  },
};

// 物品欄的順序就是 items 物件的鍵順序（存檔時 JSON 會保留），新拿到的物品排在最後。

/** 重新整理：依分類、再依物品表的順序排好 */
export function sortItems(c: Character) {
  const ids = Object.keys(ITEMS);
  const rank = (id: string) => ITEM_CATEGORIES.indexOf(ITEMS[id].category) * 1000 + ids.indexOf(id);
  const keys = Object.keys(c.items).filter((id) => c.items[id] > 0 && ITEMS[id]);
  c.items = Object.fromEntries(keys.sort((a, b) => rank(a) - rank(b)).map((id) => [id, c.items[id]]));
}

/** 對調兩個物品在物品欄裡的位置 */
export function swapItems(c: Character, a: string, b: string) {
  const keys = Object.keys(c.items);
  const i = keys.indexOf(a);
  const j = keys.indexOf(b);
  if (i < 0 || j < 0) return;
  [keys[i], keys[j]] = [keys[j], keys[i]];
  c.items = Object.fromEntries(keys.map((id) => [id, c.items[id]]));
}

/** 在地圖上使用回復類物品；回傳提示文字 */
export function consumeItem(c: Character, id: string): string {
  const def = ITEMS[id];
  if (!c.items[id] || !(def.hp || def.qi)) return '這樣東西現在用不上。';
  const d = derive(c);
  const hp = Math.min(def.hp ?? 0, d.maxHp - c.hp);
  const qi = Math.min(def.qi ?? 0, d.maxQi - c.qi);
  if (hp <= 0 && qi <= 0) return '現在用不著。';
  c.hp += hp;
  c.qi += qi;
  c.items[id]--;
  if (!c.items[id]) delete c.items[id];
  return `用了${def.name}。${hp ? `氣血 +${hp}` : ''}${hp && qi ? '　' : ''}${qi ? `內力 +${qi}` : ''}`;
}

/** 戰鬥中可以使用的物品（有回復效果的） */
export const usableInBattle = (id: string) => !!(ITEMS[id]?.hp || ITEMS[id]?.qi);

// ── 武功 ────────────────────────────────────────────────

export type SkillKind = '拳掌' | '劍法' | '刀法' | '內功' | '輕功' | '暗器';
export type Slot = 'outer' | 'inner' | 'light';
export const SKILL_SLOT_NAME: Record<Slot, string> = { outer: '外功', inner: '內功', light: '輕功' };
/** 每種欄位最多能同時裝備幾門 */
export const SLOT_LIMIT: Record<Slot, number> = { outer: 5, inner: 2, light: 1 };
export const slotOf = (kind: SkillKind): Slot => (kind === '內功' ? 'inner' : kind === '輕功' ? 'light' : 'outer');

export type Tier = '入門' | '中品' | '上乘' | '絕學';
/** 品階：正常上限（重數）與效果倍率 */
export const TIERS: Record<Tier, { cap: number; mult: number }> = {
  入門: { cap: 5, mult: 0.6 },
  中品: { cap: 8, mult: 1 },
  上乘: { cap: 12, mult: 1.4 },
  絕學: { cap: 20, mult: 1.8 },
};
/** 世界隱藏的等級上限（只能靠突破達到） */
export const HIDDEN_CAP = 99;

export interface SkillDef {
  id: string;
  name: string;
  kind: SkillKind;
  tier: Tier;
  desc: string;
  /** 裝備時，每一重（有效等級）提供的五維加成 */
  equip: Partial<Attrs>;
  /** 每一重永久提升的五維（學會就算，不必裝備） */
  grow: Partial<Attrs>;
  /** 每一重永久提升的氣血／內力／體力上限 */
  vital: { hp?: number; qi?: number; stamina?: number };
  /**
   * 招式（招式本身的效果見 battle/moves.ts）。第一招學會武功時就會，其餘要在戰鬥中悟出：
   * level 是悟招需要的重數，bonus 是悟出這招後永久增加的五維。
   */
  moves: { id: string; level: number; bonus?: Partial<Attrs> }[];
}

/** 可以學到的武功 */
export const SKILLS: Record<string, SkillDef> = {
  'basic-fist': {
    id: 'basic-fist', name: '粗淺拳腳', kind: '拳掌', tier: '入門',
    desc: '街頭巷尾都學得到的拳腳功夫，聊勝於無。',
    equip: { strength: 1 }, grow: { strength: 0.5, constitution: 0.3 }, vital: { hp: 3 },
    moves: [{ id: 'chongquan', level: 0 }],
  },
  breathing: {
    id: 'breathing', name: '吐納心法', kind: '內功', tier: '入門',
    desc: '最基礎的呼吸吐納之法，是修習內功的入門。',
    equip: { energy: 1 }, grow: { energy: 0.5, constitution: 0.2 }, vital: { qi: 3 },
    moves: [{ id: 'tiaoxi', level: 0 }],
  },
  zhuying: {
    id: 'zhuying', name: '竹影劍法', kind: '劍法', tier: '中品',
    desc: '自竹林石碑上的劍痕悟出的劍法，劍勢如風過竹林，虛實難測。',
    equip: { strength: 0.6, agility: 0.8 }, grow: { agility: 0.5, strength: 0.3, insight: 0.2 }, vital: { hp: 2, stamina: 2 },
    moves: [
      { id: 'pozhu', level: 0 },
      { id: 'fengyao', level: 1, bonus: { agility: 1 } },
      { id: 'qingshou', level: 3, bonus: { constitution: 1 } },
      { id: 'fengguo', level: 5, bonus: { agility: 1, strength: 0.5 } },
    ],
  },
  qingzhu: {
    id: 'qingzhu', name: '青竹步', kind: '輕功', tier: '中品',
    desc: '柳承安年輕時行走江湖的輕身功夫，步法輕靈，善於閃避。',
    equip: { agility: 1.2 }, grow: { agility: 0.6, constitution: 0.2 }, vital: { stamina: 4 },
    moves: [
      { id: 'taye', level: 0 },
      { id: 'fanzhu', level: 3, bonus: { agility: 1 } },
    ],
  },
};

export interface Skill {
  id: string;
  /** 等級（重數），0 表示未入門 */
  level: number;
  /** 這一重內累積的經驗 */
  exp: number;
  /** 裝在該類欄位的第幾格（0 起算）；null 表示沒有裝備 */
  pos: number | null;
  /** 連續突破失敗的次數（每次失敗，下一次成功率提高） */
  fails: number;
  /** 下一次突破事先擲好的結果 0–1，存進存檔，讀檔重試也不會改變結果 */
  roll: number;
  /** 已悟出的招式 id */
  moves: string[];
  /** 下一招的領悟度 0–100 */
  insight: number;
}

export const skillDef = (s: { id: string }) => SKILLS[s.id];
export const skillCap = (s: { id: string }) => TIERS[SKILLS[s.id].tier].cap;

/** 升到下一重需要的經驗 */
export const expToNext = (level: number) => 60 + level * 30;

/** 有效等級：正常上限以內照算，突破的部分效果遞減（開根號），避免數值失控 */
export function effLevel(s: Skill): number {
  const cap = skillCap(s);
  return s.level <= cap ? s.level : cap + 3 * Math.sqrt(s.level - cap);
}

/** 突破第 k 重（已超出上限 k 重）的成功率與花費 */
export function breakthrough(s: Skill) {
  const k = s.level - skillCap(s);
  const chance = Math.min(1, Math.max(0.03, 0.6 * 0.95 ** k) + s.fails * 0.05);
  const cost = Math.round(20 * 1.08 ** k);
  return { chance, cost };
}

// ── 角色 ────────────────────────────────────────────────

export interface Character {
  surname: string;
  given: string;
  /** 全名（姓＋名），顯示用 */
  name: string;
  title: string;
  silver: number;
  /** 擲骰決定的五維底值 */
  base: Attrs;
  /** 武功以外的永久成長（丹藥、奇遇等，之後加入） */
  extra: Attrs;
  skills: Skill[];
  /** 武學點數：戰鬥獲得，可以修練武功或突破 */
  points: number;
  /** 物品 id → 數量 */
  items: Record<string, number>;
  /** 睡過好床後「精神飽滿」：接下來幾場戰鬥武功經驗加成 */
  rested?: { battles: number; mult: number };
  /** 目前值；上限由 derive() 算出 */
  hp: number;
  qi: number;
  stamina: number;
}

/** 五維的組成：底值、永久成長（武功＋其他）、裝備加成 */
export function attrParts(c: Character) {
  const grow = { ...c.extra };
  const equip = zeroAttrs();
  for (const s of c.skills) {
    const d = skillDef(s);
    const m = effLevel(s) * TIERS[d.tier].mult;
    for (const [k, v] of Object.entries(d.grow) as [AttrKey, number][]) grow[k] += v * m;
    // 每悟出一招的永久加成
    for (const mv of d.moves)
      if (s.moves.includes(mv.id)) for (const [k, v] of Object.entries(mv.bonus ?? {}) as [AttrKey, number][]) grow[k] += v;
    if (isEquipped(s)) for (const [k, v] of Object.entries(d.equip) as [AttrKey, number][]) equip[k] += v * m;
  }
  const total = zeroAttrs();
  for (const { key } of ATTRS) total[key] = c.base[key] + grow[key] + equip[key];
  return { base: c.base, grow, equip, total };
}

export const attrs = (c: Character) => attrParts(c).total;

/** 已裝備的某類武功的有效等級總和 */
export function equippedLevel(c: Character, slot: Slot, mode: 'sum' | 'max' = 'sum'): number {
  const ls = c.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === slot).map((s) => effLevel(s) * TIERS[skillDef(s).tier].mult);
  if (!ls.length) return 0;
  return mode === 'max' ? Math.max(...ls) : ls.reduce((a, b) => a + b, 0);
}

export function derive(c: Character) {
  const a = attrs(c);
  const inner = equippedLevel(c, 'inner');
  const vital = { hp: 0, qi: 0, stamina: 0 };
  for (const s of c.skills) {
    const d = skillDef(s);
    const m = effLevel(s) * TIERS[d.tier].mult;
    vital.hp += (d.vital.hp ?? 0) * m;
    vital.qi += (d.vital.qi ?? 0) * m;
    vital.stamina += (d.vital.stamina ?? 0) * m;
  }
  return {
    maxHp: Math.round(60 + a.constitution * 8 + a.strength * 2 + inner * 15 + vital.hp),
    maxQi: Math.round(20 + a.energy * 10 + inner * 25 + vital.qi),
    maxStamina: Math.round(50 + a.constitution * 4 + a.agility * 4 + vital.stamina),
  };
}

// ── 成長 ────────────────────────────────────────────────
// 以下幾個函式都會直接修改傳入的角色，呼叫端應先複製（見 store 的 updateHero）。

/** 累積經驗（只在正常上限以內有效）；升重時回傳提示文字 */
export function gainSkill(c: Character, id: string, amount: number, useInsight = true): string | null {
  const s = c.skills.find((k) => k.id === id);
  if (!s) return null;
  const cap = skillCap(s);
  if (s.level >= cap) return null;
  // 悟性越高，練得越快
  const mult = useInsight ? 1 + attrs(c).insight / 40 : 1;
  s.exp += Math.round(amount * mult);
  const from = s.level;
  while (s.level < cap && s.exp >= expToNext(s.level)) {
    s.exp -= expToNext(s.level);
    s.level++;
  }
  if (s.level >= cap) s.exp = 0;
  return s.level > from ? `你的「${skillDef(s).name}」精進至第 ${s.level} 重！` : null;
}

/** 每點武學點數換成的經驗 */
export const POINT_EXP = 10;

/** 花武學點數修練（只能練到正常上限）；回傳實際花了幾點 */
export function trainWithPoints(c: Character, id: string, points: number): number {
  const s = c.skills.find((k) => k.id === id);
  if (!s || s.level >= skillCap(s)) return 0;
  const n = Math.min(points, c.points);
  if (n <= 0) return 0;
  c.points -= n;
  gainSkill(c, id, n * POINT_EXP, false);
  return n;
}

/** 要練到下一重還需要幾點 */
export const pointsToNext = (s: Skill) => Math.ceil((expToNext(s.level) - s.exp) / POINT_EXP);

export const hasManual = (c: Character, skillId: string) =>
  Object.entries(c.items).some(([id, n]) => n > 0 && ITEMS[id]?.manual === skillId);

export type BreakResult = { ok: true; success: boolean; text: string } | { ok: false; text: string };

/** 嘗試突破等級上限 */
export function tryBreakthrough(c: Character, id: string, rand: () => number = Math.random): BreakResult {
  const s = c.skills.find((k) => k.id === id);
  if (!s) return { ok: false, text: '沒有這門武功。' };
  const name = skillDef(s).name;
  if (s.level < skillCap(s)) return { ok: false, text: `「${name}」還沒練到正常上限，不必突破。` };
  if (s.level >= HIDDEN_CAP) return { ok: false, text: `「${name}」已臻化境，再無可進。` };
  if (!hasManual(c, id)) return { ok: false, text: `需要「${name}」的秘笈才能突破。` };
  const { chance, cost } = breakthrough(s);
  if (c.points < cost) return { ok: false, text: `武學點數不足（需要 ${cost} 點）。` };
  c.points -= cost;
  const success = s.roll < chance;
  s.roll = rand();
  if (success) {
    s.level++;
    s.fails = 0;
    return { ok: true, success, text: `突破成功！「${name}」臻至第 ${s.level} 重！` };
  }
  s.fails++;
  return { ok: true, success, text: `突破失敗……你對「${name}」又多了幾分體悟（下次成功率提高）。` };
}

/** 剛學會的武功：只會第一招 */
export function newSkill(id: string, level: number, pos: number | null): Skill {
  return { id, level, exp: 0, pos, fails: 0, roll: Math.random(), moves: [SKILLS[id].moves[0].id], insight: 0 };
}

// ── 悟招 ────────────────────────────────────────────────

/** 下一招（照順序悟，一次只看下一招）；全部悟完回傳 undefined */
export const nextMove = (s: Skill) => skillDef(s).moves.find((m) => !s.moves.includes(m.id));

/**
 * 增加領悟度；滿 100（或 flash 為真：頭目戰的靈光一閃）就悟出下一招。
 * 悟出時武功自動升一重（已在正常上限就不升）。
 * 回傳悟出的招式 id，或 null；重數不夠時不累積。
 */
export function gainInsight(c: Character, id: string, amount: number, flash = false): string | null {
  const s = c.skills.find((k) => k.id === id);
  const next = s && nextMove(s);
  if (!s || !next || s.level < next.level) return null;
  s.insight = Math.min(100, s.insight + amount);
  if (s.insight < 100 && !flash) return null;
  s.moves.push(next.id);
  s.insight = 0;
  if (s.level < skillCap(s)) {
    s.level++;
    if (s.level >= skillCap(s)) s.exp = 0;
  }
  return next.id;
}

/** 學會武功；對應欄位還有空位就自動裝備 */
export function learnSkill(c: Character, id: string, level = 1): string | null {
  if (c.skills.some((s) => s.id === id)) return null;
  const slot = slotOf(SKILLS[id].kind);
  const pos = freePos(c, slot);
  c.skills.push(newSkill(id, level, pos));
  return `你學會了「${SKILLS[id].name}」！${pos !== null ? '' : `（${SKILL_SLOT_NAME[slot]}欄位已滿，可在選單「武功」中替換）`}`;
}

export const isEquipped = (s: Skill) => s.pos !== null;

/** 某類欄位裡各格裝的武功（沒裝的格子是 undefined） */
export function slotSkills(c: Character, slot: Slot): (Skill | undefined)[] {
  return Array.from({ length: SLOT_LIMIT[slot] }, (_, i) =>
    c.skills.find((s) => s.pos === i && slotOf(skillDef(s).kind) === slot),
  );
}

export const equippedCount = (c: Character, slot: Slot) => slotSkills(c, slot).filter(Boolean).length;

/** 第一個空格；全滿時回傳 null */
export function freePos(c: Character, slot: Slot): number | null {
  const i = slotSkills(c, slot).findIndex((s) => !s);
  return i < 0 ? null : i;
}

/**
 * 把武功裝到指定的格子。這門武功若已裝在別格就換過來；
 * 這格原本的武功會被卸下。回傳提示文字。
 */
export function equipAt(c: Character, id: string, pos: number): string {
  const s = c.skills.find((k) => k.id === id)!;
  const slot = slotOf(skillDef(s).kind);
  if (pos < 0 || pos >= SLOT_LIMIT[slot]) return `${SKILL_SLOT_NAME[slot]}最多只能裝備 ${SLOT_LIMIT[slot]} 門。`;
  const old = slotSkills(c, slot)[pos];
  if (old === s) return `「${skillDef(s).name}」已經裝在這一格了。`;
  if (old) old.pos = null;
  s.pos = pos;
  return old ? `以「${skillDef(s).name}」替換了「${skillDef(old).name}」` : `裝備了「${skillDef(s).name}」`;
}

export function unequip(c: Character, id: string): string {
  const s = c.skills.find((k) => k.id === id)!;
  s.pos = null;
  return `卸下了「${skillDef(s).name}」`;
}

export function giveItem(c: Character, id: string, n = 1): string {
  c.items[id] = (c.items[id] ?? 0) + n;
  return `獲得「${ITEMS[id].name}」${ITEMS[id].manual ? '' : `×${n}`}。`;
}

/** 數值超過上限時（例如卸下內功後上限變低）修正到合理範圍。 */
export function clampVitals(c: Character) {
  const d = derive(c);
  c.hp = Math.max(0, Math.min(c.hp, d.maxHp));
  c.qi = Math.max(0, Math.min(c.qi, d.maxQi));
  c.stamina = Math.max(0, Math.min(c.stamina, d.maxStamina));
}

export function restoreAll(c: Character) {
  const d = derive(c);
  c.hp = d.maxHp;
  c.qi = d.maxQi;
  c.stamina = d.maxStamina;
}

/** 沒有擲骰時的預設底值（總和 57） */
export const DEFAULT_BASE: Attrs = { strength: 12, agility: 13, constitution: 11, energy: 6, insight: 15 };

export function newHero(opts: { surname?: string; given?: string; base?: Attrs } = {}): Character {
  const surname = opts.surname ?? '';
  const given = opts.given ?? '無名';
  const c: Character = {
    surname,
    given,
    name: surname + given,
    title: '初出茅廬',
    silver: 12,
    base: { ...(opts.base ?? DEFAULT_BASE) },
    extra: zeroAttrs(),
    skills: [
      { ...newSkill('basic-fist', 1, 0), exp: 30 },
      { ...newSkill('breathing', 0, 0), exp: 40 },
    ],
    points: 0,
    items: {},
    hp: 0,
    qi: 0,
    stamina: 0,
  };
  restoreAll(c);
  return c;
}
