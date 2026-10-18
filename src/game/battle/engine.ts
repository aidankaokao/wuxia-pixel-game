import { ITEMS } from '../character';
import { MOVES } from './moves';
import type { BattleCommand, BattleEvent, Hit, Outcome, Unit } from './types';

/**
 * 戰鬥規則：給定「誰、做了什麼」，算出結果並改動雙方狀態。
 * 不管出手順序、也不管動畫，回合制與半即時制共用。
 */

/** 這場戰鬥中主角的表現，戰後依此決定五維與武功的成長 */
export interface BattleStats {
  outerHits: number;
  dodges: number;
  hitsTaken: number;
  qiUsed: number;
  /** 武功 id → 使用次數 */
  skillUses: Record<string, number>;
}

export class Battle {
  stats: BattleStats = { outerHits: 0, dodges: 0, hitsTaken: 0, qiUsed: 0, skillUses: {} };

  constructor(
    public units: Unit[],
    public items: Record<string, number>,
    public canFlee: boolean,
    private rand: () => number = Math.random,
  ) {}

  unit(id: string) {
    return this.units.find((u) => u.id === id)!;
  }

  alive(side?: Unit['side']) {
    return this.units.filter((u) => u.hp > 0 && (!side || u.side === side));
  }

  outcome(): Outcome | null {
    if (this.alive('hero').length === 0) return 'lose';
    if (this.alive('enemy').length === 0) return 'win';
    return null;
  }

  /** 執行一個指令，回傳發生的事件 */
  act(actor: Unit, cmd: BattleCommand): BattleEvent[] {
    actor.guard = false;
    switch (cmd.type) {
      case 'defend':
        actor.guard = true;
        return [{ type: 'guard', actor: actor.id }, { type: 'message', text: `${actor.name}凝神守備。` }];
      case 'flee': {
        const enemySpd = Math.max(...this.alive('enemy').map((u) => u.spd));
        const success = this.canFlee && this.rand() < 0.45 + (actor.spd - enemySpd) * 0.04;
        return [
          { type: 'flee', actor: actor.id, success },
          { type: 'message', text: success ? '你施展身法，脫離了戰鬥。' : '被攔了下來，沒能脫身！' },
        ];
      }
      case 'charge':
        actor.charging = true;
        return [{ type: 'charge', actor: actor.id }, { type: 'message', text: `${actor.name}高舉大刀，殺氣騰騰——蓄勢待發！` }];
      case 'item':
        return this.useItem(actor, cmd.itemId);
      case 'move':
        return this.useMove(actor, cmd.moveId, cmd.targetId);
    }
  }

  private useItem(actor: Unit, itemId: string): BattleEvent[] {
    const def = ITEMS[itemId];
    if (!this.items[itemId]) return [{ type: 'message', text: '已經沒有了。' }];
    this.items[itemId]--;
    const hp = Math.min(def.hp ?? 0, actor.maxHp - actor.hp);
    const qi = Math.min(def.qi ?? 0, actor.maxQi - actor.qi);
    actor.hp += hp;
    actor.qi += qi;
    return [
      { type: 'message', text: `${actor.name}用了${def.name}。` },
      { type: 'restore', actor: actor.id, hp, qi },
    ];
  }

  private useMove(actor: Unit, moveId: string, targetId?: string): BattleEvent[] {
    const move = MOVES[moveId];
    if (actor.qi < move.qi) return [{ type: 'message', text: `${actor.name}內力不足！` }];
    actor.qi -= move.qi;
    if (actor.side === 'hero') {
      this.stats.qiUsed += move.qi;
      const skillId = move.skillId ?? (moveId === 'attack' ? actor.baseSkill : undefined);
      if (skillId) this.stats.skillUses[skillId] = (this.stats.skillUses[skillId] ?? 0) + 1;
    }

    if (move.kind === 'restore') {
      const qi = Math.min(Math.round(12 + actor.ipow * 1.2), actor.maxQi - actor.qi);
      const hp = Math.min(Math.round(actor.maxHp * 0.08), actor.maxHp - actor.hp);
      actor.qi += qi;
      actor.hp += hp;
      return [
        { type: 'message', text: `${actor.name}運起${move.name}，氣息漸穩。` },
        { type: 'restore', actor: actor.id, hp, qi },
      ];
    }

    const foes = this.alive(actor.side === 'hero' ? 'enemy' : 'hero');
    let targets: Unit[];
    if (move.target === 'allEnemies') targets = foes;
    else targets = [foes.find((u) => u.id === targetId) ?? foes[0]];

    const hits = targets.map((t) => this.hit(actor, t, move.power, move.kind === 'inner'));
    const events: BattleEvent[] = [
      { type: 'message', text: `${actor.name}使出「${move.name}」！` },
      { type: 'strike', actor: actor.id, move, hits },
    ];
    for (const h of hits) {
      const t = this.unit(h.target);
      if (h.miss) events.push({ type: 'message', text: `${t.name}閃身避開了。` });
      else if (h.killed) events.push({ type: 'message', text: t.side === 'enemy' ? `${t.name}倒地不起！` : `${t.name}支撐不住，倒了下去……` });
    }
    const crit = hits.find((h) => h.crit && !h.miss);
    if (crit) events.splice(2, 0, { type: 'message', text: '會心一擊！' });
    return events;
  }

  private hit(actor: Unit, target: Unit, power: number, inner: boolean): Hit {
    if (this.rand() > 0.95 - target.eva) {
      if (target.side === 'hero') this.stats.dodges++;
      return { target: target.id, damage: 0, miss: true, crit: false, killed: false };
    }
    const crit = this.rand() < 0.08;
    const base = (inner ? actor.ipow : actor.atk) * power * (0.9 + this.rand() * 0.2);
    let dmg = base - target.def * 0.5;
    if (crit) dmg *= 1.5;
    if (target.guard) dmg *= 0.5;
    const damage = Math.max(1, Math.round(dmg));
    target.hp = Math.max(0, target.hp - damage);
    if (actor.side === 'hero' && !inner) this.stats.outerHits++;
    if (target.side === 'hero') this.stats.hitsTaken++;
    return { target: target.id, damage, miss: false, crit, killed: target.hp === 0 };
  }

  /** 敵人的行動 */
  enemyCommand(u: Unit): BattleCommand {
    const hero = this.alive('hero')[0];
    if (u.ai === 'boss') {
      // 祁三刀：每隔幾招就蓄勢，下一招使出殺招（玩家可以趁機防禦）
      if (u.charging) {
        u.charging = false;
        return { type: 'move', moveId: 'e_heavy', targetId: hero.id };
      }
      if (this.rand() < 0.34) return { type: 'charge' };
      return { type: 'move', moveId: 'e_slash', targetId: hero.id };
    }
    // 一般敵人：七成用主要招式，其餘隨機用其他招式
    const [main, ...others] = u.moves;
    const moveId = others.length && this.rand() < 0.3 ? others[Math.floor(this.rand() * others.length)] : main;
    return { type: 'move', moveId, targetId: hero.id };
  }
}
