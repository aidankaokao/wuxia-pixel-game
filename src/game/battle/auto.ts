import { ITEMS } from '../character';
import type { AutoTactic } from '../../state/store';
import type { Battle } from './engine';
import { MOVES } from './moves';
import type { BattleCommand, EffectKind, Unit } from './types';

/**
 * 自動戰鬥：替主角挑指令。跟玩家從介面下的指令一樣交給規則層執行。
 * - 穩健：敵人蓄勢就防禦；氣血低於三成補血；內力不夠時調息或喝茶；會用輔助招給自己增益。
 * - 猛攻：只管出招；氣血低於兩成才補血。
 */
export function autoCommand(b: Battle, hero: Unit, tactic: AutoTactic, useItems: boolean): BattleCommand {
  const foes = b.alive('enemy');
  const steady = tactic === 'steady';
  const has = (kind: 'hp' | 'qi') => (b.noItems ? undefined : Object.keys(b.items).find((id) => b.items[id] > 0 && ITEMS[id]?.[kind]));

  // 補血
  const healAt = steady ? 0.35 : 0.2;
  const hpItem = useItems && has('hp');
  if (hero.hp < hero.maxHp * healAt && hpItem) return { type: 'item', itemId: hpItem };

  // 看到敵人蓄勢，先防禦
  if (steady && foes.some((f) => f.charging)) return { type: 'defend' };

  // 挑分數最高的招式：威力 × 連擊 × 目標數，再加上「身上還沒有的增益」的價值；同分時挑省內力的。
  // 猛攻不用純輔助招，增益也看得比較輕。
  const attacks = hero.moves.map((id) => MOVES[id]).filter((m) => m.kind !== 'restore' && (steady || m.kind !== 'buff'));
  const BUFF_VALUE: Partial<Record<EffectKind, number>> = { block: 1.2, evade: 1.2, counter: 0.9, speed: 0.6, power: 0.9 };
  const score = (id: string) => {
    const m = MOVES[id];
    const dmg = m.power * (m.hits ?? 1) * (m.target === 'allEnemies' ? foes.length : 1);
    const buff = (m.self ?? [])
      .filter((e) => !hero.effects.some((h) => h.kind === e.kind))
      .reduce((n, e) => n + (BUFF_VALUE[e.kind] ?? 0.3), 0);
    return dmg + buff * (steady ? 1 : 0.5);
  };
  const usable = attacks.filter((m) => m.qi <= hero.qi).sort((x, y) => score(y.id) - score(x.id) || x.qi - y.qi);
  const best = usable[0];
  const skillMoves = attacks.filter((m) => m.qi > 0 && m.kind !== 'buff');

  // 只剩「出手」可用，但其實有武功招式：穩健時先回內力
  if (steady && best?.qi === 0 && skillMoves.length) {
    const qiItem = useItems && has('qi');
    if (qiItem) return { type: 'item', itemId: qiItem };
    const restore = hero.moves.find((id) => MOVES[id].kind === 'restore');
    if (restore && hero.qi < Math.min(...skillMoves.map((m) => m.qi))) return { type: 'move', moveId: restore };
  }

  const target = foes.reduce((a, c) => (c.hp < a.hp ? c : a));
  const id = best?.id ?? 'attack';
  return MOVES[id].target === 'enemy' ? { type: 'move', moveId: id, targetId: target.id } : { type: 'move', moveId: id };
}
