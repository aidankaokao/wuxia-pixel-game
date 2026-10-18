import { Character, attrs, effLevel, equippedLevel, skillDef, slotOf } from '../character';
import type { Move, Unit } from './types';

/** 所有招式。武功學到後，對應的招式就會出現在戰鬥選單裡。 */
export const MOVES: Record<string, Move> = {
  attack: {
    id: 'attack', name: '出手', desc: '平平無奇的一擊。', qi: 0, power: 1, kind: 'outer', target: 'enemy', fx: 'punch',
  },
  chongquan: {
    id: 'chongquan', name: '沖拳', desc: '腰馬合一，一拳直搗中宮。', qi: 4, power: 1.4, kind: 'outer', target: 'enemy', skillId: 'basic-fist', fx: 'punch',
  },
  tiaoxi: {
    id: 'tiaoxi', name: '調息', desc: '運轉吐納心法，回復內力與些許氣血。', qi: 0, power: 1, kind: 'restore', target: 'self', skillId: 'breathing', fx: 'qi',
  },
  pozhu: {
    id: 'pozhu', name: '破竹式', desc: '一劍直進，勢如破竹。威力強大的單體劍招。', qi: 10, power: 1.9, kind: 'outer', target: 'enemy', skillId: 'zhuying', fx: 'slash',
  },
  fengyao: {
    id: 'fengyao', name: '竹影搖風', desc: '劍光如風搖竹影，籠罩所有敵人。', qi: 14, power: 0.9, kind: 'outer', target: 'allEnemies', skillId: 'zhuying', fx: 'leaves',
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

/** 每門武功提供哪些招式 */
export const SKILL_MOVES: Record<string, string[]> = {
  'basic-fist': ['chongquan'],
  breathing: ['tiaoxi'],
  zhuying: ['pozhu', 'fengyao'],
};

/**
 * 由角色資料算出主角的戰鬥數值。
 * 只有裝備中的武功能出招；「出手」不屬於任何武功，全部卸下時也還能空手打。
 */
export function heroUnit(c: Character, max: { maxHp: number; maxQi: number }): Unit {
  const a = attrs(c);
  const moves = ['attack'];
  for (const s of c.skills) if (s.equipped && s.level > 0) moves.push(...(SKILL_MOVES[s.id] ?? []));
  const outer = c.skills.filter((s) => s.equipped && slotOf(skillDef(s).kind) === 'outer');
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
  };
}
