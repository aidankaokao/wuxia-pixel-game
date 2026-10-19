import { Character, attrs, effLevel, equippedLevel, isEquipped, skillDef, slotOf } from '../character';
import type { Move, Unit } from './types';

/** 所有招式。每門武功有哪些招式、幾重才能悟出，寫在 character.ts 的 SKILLS 裡。 */
export const MOVES: Record<string, Move> = {
  attack: {
    id: 'attack', name: '出手', desc: '平平無奇的一擊。', qi: 0, power: 1, kind: 'outer', target: 'enemy', fx: 'punch',
  },
  // 粗淺拳腳
  chongquan: {
    id: 'chongquan', name: '直搗中宮', desc: '腰馬合一，一拳直搗中宮。', qi: 4, power: 1.4, kind: 'outer', target: 'enemy', skillId: 'basic-fist', fx: 'punch',
  },
  // 吐納心法
  tiaoxi: {
    id: 'tiaoxi', name: '吐納歸元', desc: '運轉吐納心法，回復內力與些許氣血。', qi: 0, power: 1, kind: 'restore', target: 'self', skillId: 'breathing', fx: 'qi',
  },
  // 竹影劍法
  pozhu: {
    id: 'pozhu', name: '破竹直刺', desc: '一劍直進，勢如破竹。威力強大的單體劍招。', qi: 10, power: 1.9, kind: 'outer', target: 'enemy', skillId: 'zhuying', fx: 'slash',
  },
  fengyao: {
    id: 'fengyao', name: '竹影搖風', desc: '劍光如風搖竹影，籠罩所有敵人。', qi: 14, power: 0.9, kind: 'outer', target: 'allEnemies', skillId: 'zhuying', fx: 'leaves',
  },
  qingshou: {
    id: 'qingshou', name: '青篁守勢', desc: '劍隨身轉，似竹叢密密護身。出招之後格擋大增（受傷 −35%，持續 2 次出手）。',
    qi: 8, power: 1, kind: 'outer', target: 'enemy', skillId: 'zhuying', fx: 'slash', self: [{ kind: 'block', value: 0.35, turns: 2 }],
  },
  fengguo: {
    id: 'fengguo', name: '風過竹林', desc: '身隨劍走，如風穿林，連刺兩劍，之後身法更快（速度 +30%，持續 2 次出手）。',
    qi: 16, power: 0.85, hits: 2, kind: 'outer', target: 'enemy', skillId: 'zhuying', fx: 'wind', self: [{ kind: 'speed', value: 0.3, turns: 2 }],
  },
  // 青竹步
  taye: {
    id: 'taye', name: '踏葉無聲', desc: '足尖點葉，身形飄忽。閃避大增（+25%，持續 2 次出手）。',
    qi: 6, power: 0, kind: 'buff', target: 'self', skillId: 'qingzhu', fx: 'qi', self: [{ kind: 'evade', value: 0.25, turns: 2 }],
  },
  fanzhu: {
    id: 'fanzhu', name: '翻竹回身', desc: '如竹枝反彈，閃過攻擊的同時回身還擊（閃避 +15%、反擊，持續 2 次出手）。',
    qi: 10, power: 0, kind: 'buff', target: 'self', skillId: 'qingzhu', fx: 'qi',
    self: [{ kind: 'evade', value: 0.15, turns: 2 }, { kind: 'counter', value: 1, turns: 2 }],
  },
  // 鳴泉劍法
  quanyong: {
    id: 'quanyong', name: '泉湧初鳴', desc: '劍出如泉湧，一刺之後劍身回護（受傷 −15%，持續 1 次出手）。',
    qi: 9, power: 1.7, kind: 'outer', target: 'enemy', skillId: 'mingquan', fx: 'slash', self: [{ kind: 'block', value: 0.15, turns: 1 }],
  },
  feipu: {
    id: 'feipu', name: '飛瀑垂練', desc: '縱身而起，一劍如飛瀑直落。威力沉重，有機會劈出對手的破綻（防禦 −30%，持續 2 次出手）。',
    qi: 16, power: 2.2, kind: 'outer', target: 'enemy', skillId: 'mingquan', fx: 'heavy', foe: [{ kind: 'armorBreak', value: 0.3, turns: 2, chance: 0.5 }],
  },
  shiliu: {
    id: 'shiliu', name: '石上清流', desc: '劍尖貼著對手連點三下，如清流過石，綿綿不絕。',
    qi: 14, power: 0.65, hits: 3, kind: 'outer', target: 'enemy', skillId: 'mingquan', fx: 'wind',
  },
  wanhe: {
    id: 'wanhe', name: '萬壑爭鳴', desc: '劍嘯四起，如萬壑泉聲齊鳴，籠罩所有敵人，有機會震懾對手（無法出手 1 次）。',
    qi: 22, power: 1.0, kind: 'outer', target: 'allEnemies', skillId: 'mingquan', fx: 'leaves', foe: [{ kind: 'stun', value: 1, turns: 1, chance: 0.2 }],
  },
  // 澄泉心法
  quansheng: {
    id: 'quansheng', name: '泉聲貫耳', desc: '以內力催動劍嘯，如泉聲直灌對手耳中。內功招式，有機會使對手遲緩（速度 −20%，持續 2 次出手）。',
    qi: 10, power: 1.6, kind: 'inner', target: 'enemy', skillId: 'chengquan', fx: 'qi', foe: [{ kind: 'slow', value: 0.2, turns: 2, chance: 0.4 }],
  },
  chengtan: {
    id: 'chengtan', name: '澄潭映月', desc: '心如深潭，內息沉穩。格擋與勁力同時提升（受傷 −25%、攻擊 +15%，持續 2 次出手）。',
    qi: 8, power: 0, kind: 'buff', target: 'self', skillId: 'chengquan', fx: 'qi',
    self: [{ kind: 'block', value: 0.25, turns: 2 }, { kind: 'power', value: 0.15, turns: 2 }],
  },
  // 踏石步
  dianshi: {
    id: 'dianshi', name: '點石過澗', desc: '足尖點著溪石掠過，身形又輕又快（閃避 +20%、速度 +20%，持續 2 次出手）。',
    qi: 6, power: 0, kind: 'buff', target: 'self', skillId: 'tashi', fx: 'qi',
    self: [{ kind: 'evade', value: 0.2, turns: 2 }, { kind: 'speed', value: 0.2, turns: 2 }],
  },
  zhulang: {
    id: 'zhulang', name: '逐浪回身', desc: '如逐浪而行，退步讓過來招，順勢回身還擊（閃避 +15%、反擊，持續 2 次出手）。',
    qi: 10, power: 0, kind: 'buff', target: 'self', skillId: 'tashi', fx: 'wind',
    self: [{ kind: 'evade', value: 0.15, turns: 2 }, { kind: 'counter', value: 1.1, turns: 2 }],
  },
  // 敵人的招式
  e_slash: { id: 'e_slash', name: '劈砍', desc: '', qi: 0, power: 1, kind: 'outer', target: 'enemy', fx: 'slash' },
  e_rush: { id: 'e_rush', name: '猛撲', desc: '', qi: 0, power: 1.3, kind: 'outer', target: 'enemy', fx: 'punch' },
  e_heavy: { id: 'e_heavy', name: '三刀斷嶺', desc: '', qi: 0, power: 2.4, kind: 'outer', target: 'enemy', fx: 'heavy' },
  e_bite: { id: 'e_bite', name: '撕咬', desc: '', qi: 0, power: 1, kind: 'outer', target: 'enemy', fx: 'punch' },
  e_pounce: { id: 'e_pounce', name: '飛撲', desc: '', qi: 0, power: 1.3, kind: 'outer', target: 'enemy', fx: 'punch' },
  e_gore: { id: 'e_gore', name: '獠牙一頂', desc: '', qi: 0, power: 1, kind: 'outer', target: 'enemy', fx: 'punch' },
  e_ram: { id: 'e_ram', name: '低頭猛衝', desc: '', qi: 0, power: 1.5, kind: 'outer', target: 'enemy', fx: 'heavy' },
};

/**
 * 由角色資料算出主角的戰鬥數值。
 * 只有裝備中的武功能出招；「出手」不屬於任何武功，全部卸下時也還能空手打。
 */
export function heroUnit(c: Character, max: { maxHp: number; maxQi: number }): Unit {
  const a = attrs(c);
  const moves = ['attack'];
  // 裝備中、已入門的武功，悟出了哪些招式就能用哪些
  for (const s of c.skills) if (isEquipped(s) && s.level > 0) moves.push(...s.moves);
  const outer = c.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer');
  const baseSkill = outer.sort((x, y) => effLevel(y) - effLevel(x))[0]?.id;
  return {
    id: 'hero',
    name: c.name,
    side: 'hero',
    sprite: 'hero',
    maxHp: max.maxHp,
    hp: c.hp,
    maxQi: max.maxQi,
    qi: c.qi,
    atk: Math.round(10 + a.strength + equippedLevel(c, 'outer', 'max') * 4),
    ipow: Math.round(6 + a.energy * 1.2 + equippedLevel(c, 'inner') * 4),
    def: Math.round(2 + a.constitution * 0.5),
    spd: Math.round(8 + a.agility),
    eva: Math.min(0.35, 0.03 + a.agility * 0.006 + equippedLevel(c, 'light') * 0.04),
    moves,
    guard: false,
    charging: false,
    baseSkill,
    effects: [],
  };
}
