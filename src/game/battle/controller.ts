import type { Battle } from './engine';
import type { BattleCommand, Unit } from './types';

/**
 * 出手順序控制器：決定下一個出手的是誰。
 * 回傳 Promise，是為了之後的半即時制：那時要等行動條隨時間跑滿，才輪到某人出手。
 */
export interface TurnController {
  next(battle: Battle): Promise<Unit>;
}

/** 回合制：每回合依速度排出手順序（帶一點隨機），全部出手完再進下一回合。 */
export class RoundController implements TurnController {
  private queue: Unit[] = [];

  async next(battle: Battle): Promise<Unit> {
    for (;;) {
      while (this.queue.length) {
        const u = this.queue.shift()!;
        if (u.hp > 0) return u;
      }
      this.queue = battle
        .alive()
        .map((u) => ({ u, k: battle.stat(u, 'spd') * (0.85 + Math.random() * 0.3) }))
        .sort((a, b) => b.k - a.k)
        .map((x) => x.u);
    }
  }
}

/** 行動條每秒累積量 = 基礎值 + 速度 × 係數（基礎值讓快慢的差距不至於太懸殊） */
export const ATB_FILL = { base: 60, perSpd: 0.8 };
export const ATB_FULL = 100;

/**
 * 半即時制：每個人有一條行動條，隨時間累積，滿了才能出手；出手後歸零重新累積。
 * 時間只在出手動畫之間流動（next() 等待時），動畫播放中不累積。
 *
 * 主角的行動條滿了會先以「待命」回傳一次（呼叫端據此打開指令選單），
 * 等呼叫端用 setCommand() 交來指令後，下一次 next() 才回傳主角去出手。
 * 待命期間：等待模式全部暫停；即時模式敵人照樣累積、照樣出手。
 */
export class ATBController implements TurnController {
  readonly gauge = new Map<string, number>();
  private started = false;
  private rand: () => number;
  /** 主角的行動條滿了、正在等指令 */
  waiting = false;
  private command: BattleCommand | null = null;

  constructor(
    /** 等一小段時間，回傳經過的毫秒數（由戰鬥場景提供，會跟著自動戰鬥加速） */
    private frame: () => Promise<number>,
    /** 主角待命時是否暫停時間（等待模式） */
    private pauseWhileChoosing: () => boolean,
    rand: () => number = Math.random,
  ) {
    this.rand = rand;
  }


  setCommand(cmd: BattleCommand) {
    this.command = cmd;
  }

  hasCommand() {
    return this.command !== null;
  }

  takeCommand(): BattleCommand | null {
    const c = this.command;
    this.command = null;
    this.waiting = false;
    return c;
  }

  /** 出手（或被震懾跳過）後，行動條歸零 */
  done(u: Unit) {
    this.gauge.set(u.id, 0);
    if (u.side === 'hero') this.waiting = false;
  }

  /** 0–1，給畫面顯示 */
  fill(u: Unit) {
    return Math.min(1, (this.gauge.get(u.id) ?? 0) / ATB_FULL);
  }

  async next(battle: Battle): Promise<Unit> {
    if (!this.started) {
      // 開場時每個人的行動條隨機起步，快的人起步也快一點
      for (const u of battle.units) this.gauge.set(u.id, this.rand() * 30 + battle.stat(u, 'spd'));
      this.started = true;
    }
    for (;;) {
      const hero = battle.alive('hero')[0];
      if (hero && this.command) return hero;
      const full = (u: Unit) => (this.gauge.get(u.id) ?? 0) >= ATB_FULL;
      const enemy = battle.alive('enemy').find(full);
      if (enemy) return enemy;
      if (hero && full(hero) && !this.waiting) {
        this.waiting = true;
        return hero;
      }
      const dt = await this.frame();
      if (this.waiting && this.pauseWhileChoosing()) continue;
      for (const u of battle.alive()) {
        if (u === hero && this.waiting) continue;
        const rate = ATB_FILL.base + battle.stat(u, 'spd') * ATB_FILL.perSpd;
        this.gauge.set(u.id, Math.min(ATB_FULL, (this.gauge.get(u.id) ?? 0) + (rate * dt) / 1000));
      }
    }
  }
}
