import { attrs, Character, gainInsight, gainSkill, giveItem, isEquipped, nextMove, skillCap, skillDef, slotOf } from '../character';
import { MOVES } from './moves';
import type { Battle } from './engine';
import { ENEMIES, type EncounterDef } from './enemies';
import type { Outcome } from './types';

/**
 * 把戰鬥結果寫回角色：氣血、內力、物品，以及打贏時的獎勵與成長。
 * 戰鬥不直接加五維，而是讓武功長經驗（五維靠武功升重來成長）：
 * 用過的招式替所屬武功加經驗；裝備中的輕功依閃避次數、內功依耗用的內力加經驗。
 * 會直接修改傳入的角色（呼叫端用 updateHero 包起來）。
 */
/** 頭目戰靈光一閃（直接悟出下一招）的機率 */
const BOSS_FLASH = 0.2;

export function settle(c: Character, b: Battle, enc: EncounterDef, outcome: Outcome, rand: () => number = Math.random): string[] {
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
  // 掉落物
  const drops: Record<string, number> = {};
  for (const id of enc.enemies)
    for (const d of ENEMIES[id].drops ?? []) if (rand() < d.chance) drops[d.item] = (drops[d.item] ?? 0) + 1;
  for (const [id, n] of Object.entries(drops)) lines.push(giveItem(c, id, n));

  // 悟性越高，練得越快；睡過好床「精神飽滿」、吃了甜品「心情愉快」時再加成
  let g = (enc.growth ?? 1) * (1 + attrs(c).insight / 40);
  if (c.rested?.battles) {
    g *= c.rested.mult;
    c.rested.battles--;
    lines.push(`精神飽滿：武功經驗 ×${c.rested.mult}${c.rested.battles ? `（還有 ${c.rested.battles} 場）` : '（效果結束）'}`);
    if (!c.rested.battles) delete c.rested;
  }
  if (c.treat?.battles) {
    g *= c.treat.mult;
    c.treat.battles--;
    lines.push(`心情愉快：武功經驗 ×${c.treat.mult}${c.treat.battles ? `（還有 ${c.treat.battles} 場）` : '（效果結束）'}`);
    if (!c.treat.battles) delete c.treat;
  }
  const exp: Record<string, number> = {};
  for (const [id, n] of Object.entries(s.skillUses)) exp[id] = n * 6;
  for (const sk of c.skills) {
    if (!isEquipped(sk)) continue;
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

  // 悟招：這場用過的武功累積領悟度（輕功的閃避也算），頭目戰有機會靈光一閃
  const insightUses: Record<string, number> = { ...s.skillUses };
  for (const sk of c.skills)
    if (isEquipped(sk) && slotOf(skillDef(sk).kind) === 'light' && s.dodges) insightUses[sk.id] = (insightUses[sk.id] ?? 0) + s.dodges;
  for (const [id, uses] of Object.entries(insightUses)) {
    const sk = c.skills.find((k) => k.id === id);
    if (!sk || !nextMove(sk)) continue;
    const before = sk.level;
    const flash = !!enc.boss && rand() < BOSS_FLASH;
    const learned = gainInsight(c, id, Math.round((8 + uses * 4) * g), flash);
    const name = skillDef(sk).name;
    if (learned) {
      const after = c.skills.find((k) => k.id === id)!;
      ups.push(`靈光一閃！你從「${name}」中悟出了「${MOVES[learned].name}」！`);
      if (after.level > before) ups.push(`「${name}」隨之精進至第 ${after.level} 重！`);
    } else {
      const now = c.skills.find((k) => k.id === id)!;
      if (now.insight > 0) lines.push(`對「${name}」的下一招似有所悟（領悟 ${now.insight}%）。`);
    }
  }
  return [...lines, ...ups];
}
