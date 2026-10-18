/**
 * 角色成長模型（初稿）。
 *
 * 沒有「人物等級」：五維與武功各自有境界，血量、內力、體力等數值都由它們推算出來。
 * 公式與數字之後會再調，這裡先把結構定下來。
 */

export type AttrKey = 'strength' | 'agility' | 'constitution' | 'energy' | 'insight';

export const ATTRS: { key: AttrKey; name: string; desc: string }[] = [
  { key: 'strength', name: '勁力', desc: '出手的力道，影響外功傷害。' },
  { key: 'agility', name: '身法', desc: '身形的靈巧，影響閃避、出手快慢與輕功。' },
  { key: 'constitution', name: '根骨', desc: '筋骨的強健，影響氣血與體力上限。' },
  { key: 'energy', name: '內息', desc: '丹田真氣的深厚，影響內力上限與內功威力。' },
  { key: 'insight', name: '悟性', desc: '領會武學的天分，影響學功、練功的快慢。' },
];

/** 境界：每一級又分若干「重」，以熟練度累積。 */
export const REALMS = ['未入門', '初窺門徑', '略有小成', '融會貫通', '爐火純青', '登峰造極'] as const;

export interface Attr {
  /** 境界（REALMS 的索引） */
  realm: number;
  /** 該境界內的熟練度 0–99 */
  exp: number;
}

export type SkillKind = '拳掌' | '劍法' | '刀法' | '內功' | '輕功' | '暗器';

export interface Skill {
  id: string;
  name: string;
  kind: SkillKind;
  realm: number;
  exp: number;
  desc: string;
}

export interface Character {
  name: string;
  title: string;
  silver: number;
  attrs: Record<AttrKey, Attr>;
  skills: Skill[];
  /** 目前值；上限由 derive() 算出 */
  hp: number;
  qi: number;
  stamina: number;
}

/** 單一屬性的「點數」：境界 × 10 + 熟練度 / 10。 */
const pts = (a: Attr) => a.realm * 10 + a.exp / 10;

export function derive(c: Character) {
  const a = c.attrs;
  const neigong = c.skills.filter((s) => s.kind === '內功').reduce((n, s) => n + s.realm, 0);
  return {
    maxHp: Math.round(60 + pts(a.constitution) * 8 + pts(a.strength) * 2 + neigong * 15),
    maxQi: Math.round(20 + pts(a.energy) * 10 + neigong * 25),
    maxStamina: Math.round(50 + pts(a.constitution) * 4 + pts(a.agility) * 4),
  };
}

export function newHero(): Character {
  const c: Character = {
    name: '無名',
    title: '初出茅廬',
    silver: 12,
    attrs: {
      strength: { realm: 1, exp: 20 },
      agility: { realm: 1, exp: 35 },
      constitution: { realm: 1, exp: 10 },
      energy: { realm: 0, exp: 60 },
      insight: { realm: 1, exp: 50 },
    },
    skills: [
      { id: 'basic-fist', name: '粗淺拳腳', kind: '拳掌', realm: 1, exp: 30, desc: '街頭巷尾都學得到的拳腳功夫，聊勝於無。' },
      { id: 'breathing', name: '吐納心法', kind: '內功', realm: 0, exp: 40, desc: '最基礎的呼吸吐納之法，是修習內功的入門。' },
    ],
    hp: 0,
    qi: 0,
    stamina: 0,
  };
  const d = derive(c);
  c.hp = d.maxHp;
  c.qi = d.maxQi;
  c.stamina = d.maxStamina;
  return c;
}
