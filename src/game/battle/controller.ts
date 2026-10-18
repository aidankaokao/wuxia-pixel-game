import type { Battle } from './engine';
import type { Unit } from './types';

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
