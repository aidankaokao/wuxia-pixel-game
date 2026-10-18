import { attrs, Character, gainSkill, skillCap, skillDef, slotOf } from '../character';
import type { Battle } from './engine';
import type { EncounterDef } from './enemies';
import type { Outcome } from './types';

/**
 * 把戰鬥結果寫回角色：氣血、內力、物品，以及打贏時的獎勵與成長。
 * 戰鬥不直接加五維，而是讓武功長經驗（五維靠武功升重來成長）：
 * 用過的招式替所屬武功加經驗；裝備中的輕功依閃避次數、內功依耗用的內力加經驗。
 * 會直接修改傳入的角色（呼叫端用 updateHero 包起來）。
 */
export function settle(c: Character, b: Battle, enc: EncounterDef, outcome: Outcome): string[] {
  const hero = b.unit('hero');
  c.hp = hero.hp;
  c.qi = hero.qi;
  c.items = Object.fromEntries(Object.entries(b.items).filter(([, n]) => n > 0));
  if (outcome !== 'win') return [];

  const s = b.stats;
  const lines: string[] = [];
  if (enc.silver) {
    c.silver += enc.silver;
    lines.push(`獲得銀兩 ${enc.silver}。`);
  }
  if (enc.points) {
    c.points += enc.points;
    lines.push(`獲得武學點數 ${enc.points}。`);
  }

  // 悟性越高，練得越快
  const g = (enc.growth ?? 1) * (1 + attrs(c).insight / 40);
  const exp: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.skillUses)) exp[id] = n * 6;
  for (const sk of c.skills) {
    if (!sk.equipped) continue;
    const slot = slotOf(skillDef(sk).kind);
    if (slot === 'light') exp[sk.id] = (exp[sk.id] ?? 0) + 3 + s.dodges * 5;
    if (slot === 'inner') exp[sk.id] = (exp[sk.id] ?? 0) + 2 + s.qiUsed / 4;
  }

  const ups: string[] = [];
  const shown: string[] = [];
  for (const [id, n] of Object.entries(exp)) {
    const sk = c.skills.find((k) => k.id === id);
    // 已到正常上限的武功，只能靠秘笈突破
    if (!sk || sk.level >= skillCap(sk)) continue;
    const amount = Math.max(1, Math.round(n * g));
    shown.push(`${skillDef({ id }).name} +${amount}`);
    const up = gainSkill(c, id, amount, false);
    if (up) ups.push(up);
  }
  if (shown.length) lines.push('武功熟練：' + shown.join('　'));
  return [...lines, ...ups];
}
