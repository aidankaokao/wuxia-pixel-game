import { ITEMS, usableInBattle } from '../character';
import { MOVES } from './moves';
import { EFFECT_NAME, type BattleCommand, type BattleEvent, type Effect, type EffectKind, type Hit, type Move, type Outcome, type Unit } from './types';

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
  /** 不許用藥（例如門派考核）：物品照樣帶著，只是不能用 */
  noItems = false;

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

  // ── 狀態 ──────────────────────────────────────────────

  private effect(u: Unit, kind: EffectKind) {
    return u.effects.filter((e) => e.kind === kind).reduce((n, e) => n + e.value, 0);
  }

  /** 套用狀態後的數值（出手順序、命中、傷害都用這個） */
  stat(u: Unit, key: 'atk' | 'ipow' | 'def' | 'spd' | 'eva'): number {
    const e = (k: EffectKind) => this.effect(u, k);
    switch (key) {
      case 'atk':
        return u.atk * (1 + e('power') - e('weaken'));
      case 'ipow':
        return u.ipow * (1 + e('power') - e('weaken'));
      case 'def':
        return u.def * Math.max(0, 1 - e('armorBreak'));
      case 'spd':
        return u.spd * Math.max(0.3, 1 + e('speed') - e('slow'));
      case 'eva':
        return Math.min(0.6, u.eva + e('evade'));
    }
  }

  /** 給狀態；同種狀態不疊加，取比較強、比較久的 */
  addEffect(u: Unit, eff: Effect) {
    const old = u.effects.find((e) => e.kind === eff.kind);
    if (old) {
      old.value = Math.max(old.value, eff.value);
      old.turns = Math.max(old.turns, eff.turns);
    } else u.effects.push({ ...eff });
  }

  /**
   * 輪到某人出手時先呼叫：狀態的持續次數減一。
   * 被震懾的話這次不能出手（skip 為真），由呼叫端略過他的指令。
   */
  startTurn(u: Unit): { skip: boolean; events: BattleEvent[] } {
    const stunned = u.effects.some((e) => e.kind === 'stun');
    const before = u.effects.length;
    for (const e of u.effects) e.turns--;
    u.effects = u.effects.filter((e) => e.turns > 0);
    const events: BattleEvent[] = [];
    if (u.effects.length !== before) events.push({ type: 'effects', actor: u.id });
    if (stunned) events.unshift({ type: 'message', text: `${u.name}被震懾住了，一時動彈不得！` });
    return { skip: stunned, events };
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
        const enemySpd = Math.max(...this.alive('enemy').map((u) => this.stat(u, 'spd')));
        const success = this.canFlee && this.rand() < 0.45 + (this.stat(actor, 'spd') - enemySpd) * 0.04;
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
    if (this.noItems) return [{ type: 'message', text: '這一場不許用藥！' }];
    if (!this.items[itemId]) return [{ type: 'message', text: '已經沒有了。' }];
    if (!usableInBattle(itemId)) return [{ type: 'message', text: '戰鬥中用不了這個。' }];
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
      const qi = Math.min(Math.round(12 + this.stat(actor, 'ipow') * 1.2), actor.maxQi - actor.qi);
      const hp = Math.min(Math.round(actor.maxHp * 0.08), actor.maxHp - actor.hp);
      actor.qi += qi;
      actor.hp += hp;
      return [
        { type: 'message', text: `${actor.name}運起「${move.name}」，氣息漸穩。` },
        { type: 'restore', actor: actor.id, hp, qi },
      ];
    }

    if (move.kind === 'buff') {
      return [{ type: 'message', text: `${actor.name}施展「${move.name}」！` }, ...this.selfEffects(actor, move)];
    }

    const foes = this.alive(actor.side === 'hero' ? 'enemy' : 'hero');
    let targets: Unit[];
    if (move.target === 'allEnemies') targets = foes;
    else targets = [foes.find((u) => u.id === targetId) ?? foes[0]];

    // 連擊：每一下分別算命中與傷害；目標倒下就不再打
    const hits: Hit[] = [];
    for (let n = 0; n < (move.hits ?? 1); n++)
      for (const t of targets) if (t.hp > 0) hits.push(this.hit(actor, t, move.power, move.kind === 'inner'));

    const events: BattleEvent[] = [
      { type: 'message', text: `${actor.name}使出「${move.name}」！` },
      { type: 'strike', actor: actor.id, move, hits },
    ];
    const crit = hits.find((h) => h.crit && !h.miss);
    if (crit) events.push({ type: 'message', text: '會心一擊！' });
    for (const t of targets) {
      const mine = hits.filter((h) => h.target === t.id);
      if (mine.every((h) => h.miss)) {
        events.push({ type: 'message', text: `${t.name}閃身避開了。` });
        events.push(...this.counter(t, actor));
        continue;
      }
      if (t.hp === 0) {
        events.push({ type: 'message', text: t.side === 'enemy' ? `${t.name}倒地不起！` : `${t.name}支撐不住，倒了下去……` });
        continue;
      }
      // 打中後給對方的狀態
      const gained: EffectKind[] = [];
      for (const f of move.foe ?? []) {
        if (f.chance !== undefined && this.rand() >= f.chance) continue;
        this.addEffect(t, f);
        gained.push(f.kind);
      }
      if (gained.length) {
        events.push({ type: 'effects', actor: t.id, gained });
        events.push({ type: 'message', text: `${t.name}陷入${gained.map((k) => `「${EFFECT_NAME[k]}」`).join('')}！` });
      }
    }
    if (actor.hp > 0) events.push(...this.selfEffects(actor, move));
    return events;
  }

  /** 出招後給自己的狀態 */
  private selfEffects(actor: Unit, move: Move): BattleEvent[] {
    if (!move.self?.length) return [];
    // +1：這次出手結束後，到下一次出手前也都算數
    for (const e of move.self) this.addEffect(actor, { ...e, turns: e.turns + 1 });
    const names = move.self.map((e) => `「${EFFECT_NAME[e.kind]}」`).join('');
    return [
      { type: 'effects', actor: actor.id, gained: move.self.map((e) => e.kind) },
      { type: 'message', text: `${actor.name}得到${names}！` },
    ];
  }

  /** 閃過攻擊、身上有「反擊」時還手一擊（反擊不會再被反擊） */
  private counter(u: Unit, attacker: Unit): BattleEvent[] {
    const power = this.effect(u, 'counter');
    if (!power || u.hp <= 0 || attacker.hp <= 0) return [];
    const h = this.hit(u, attacker, power, false);
    const counterMove: Move = { ...MOVES.attack, name: '反擊' };
    const events: BattleEvent[] = [
      { type: 'message', text: `${u.name}順勢回身還擊！` },
      { type: 'strike', actor: u.id, move: counterMove, hits: [h] },
    ];
    if (h.killed) events.push({ type: 'message', text: attacker.side === 'enemy' ? `${attacker.name}倒地不起！` : `${attacker.name}支撐不住，倒了下去……` });
    return events;
  }

  private hit(actor: Unit, target: Unit, power: number, inner: boolean): Hit {
    if (this.rand() > 0.95 - this.stat(target, 'eva')) {
      if (target.side === 'hero') this.stats.dodges++;
      return { target: target.id, damage: 0, miss: true, crit: false, killed: false };
    }
    const crit = this.rand() < 0.08;
    const base = this.stat(actor, inner ? 'ipow' : 'atk') * power * (0.9 + this.rand() * 0.2);
    let dmg = base - this.stat(target, 'def') * 0.5;
    if (crit) dmg *= 1.5;
    if (target.guard) dmg *= 0.5;
    dmg *= Math.max(0.2, 1 - this.effect(target, 'block'));
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
    // 一般敵人：七成用主要招式，其餘隨機用其他招式（內力不夠的招式不用）
    const [main, ...others] = u.moves.filter((m) => MOVES[m].qi <= u.qi);
    if (!main) return { type: 'move', moveId: 'e_slash', targetId: hero.id };
    const moveId = others.length && this.rand() < 0.3 ? others[Math.floor(this.rand() * others.length)] : main;
    return { type: 'move', moveId, targetId: hero.id };
  }
}
