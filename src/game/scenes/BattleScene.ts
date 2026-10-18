import Phaser from 'phaser';
import { BATTLE_H, BATTLE_W, drawBattleBg, drawCursor, drawDigits, drawLeaf, drawSlash, drawSpark } from '../art/battle';
import { derive, ITEMS, usableInBattle } from '../character';
import { MOVES, heroUnit } from '../battle/moves';
import { ENCOUNTERS, EncounterDef, enemyUnits } from '../battle/enemies';
import { Battle } from '../battle/engine';
import { RoundController, TurnController } from '../battle/controller';
import { settle } from '../battle/rewards';
import { autoCommand } from '../battle/auto';
import { DEBUFFS, type BattleCommand, type BattleEvent, type BattleView, type Hit, type Outcome, type Unit } from '../battle/types';
import { useGame } from '../../state/store';

interface SceneData {
  encounter: string;
  background: 'mountain' | 'camp';
  onEnd: (o: Outcome) => void;
}

interface UnitSprite {
  sprite: Phaser.GameObjects.Sprite;
  home: { x: number; y: number };
  bar?: Phaser.GameObjects.Graphics;
}

const HERO_POS = { x: 244, y: 116 };
const ENEMY_POS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 84, y: 116 }],
  2: [{ x: 92, y: 104 }, { x: 68, y: 128 }],
  3: [{ x: 100, y: 114 }, { x: 66, y: 94 }, { x: 62, y: 134 }],
};

/** 為什麼不用文字顯示傷害：所有文字都交給 React，戰鬥裡的數字用自己畫的像素數字。 */
function ensureTextures(scene: Phaser.Scene) {
  const t = scene.textures;
  if (t.exists('cursor')) return;
  drawDigits().forEach((c, i) => t.addCanvas(`digit${i}`, c));
  t.addCanvas('cursor', drawCursor());
  t.addCanvas('fx_slash', drawSlash());
  t.addCanvas('fx_spark', drawSpark());
  t.addCanvas('fx_leaf', drawLeaf());
}

/** 戰鬥場景：畫面與動畫。規則在 battle/engine.ts，出手順序在 battle/controller.ts。 */
export class BattleScene extends Phaser.Scene {
  private battle!: Battle;
  private controller!: TurnController;
  private enc!: EncounterDef;
  private onEnd!: (o: Outcome) => void;
  private units = new Map<string, UnitSprite>();
  private cursor!: Phaser.GameObjects.Image;
  private message = '';
  private cursorFor: string | null = null;
  /**
   * 畫面上顯示的氣血／內力。規則層一出手就算完結果，
   * 但血條要等動畫打中的那一刻才扣，所以另外記一份，動作播完再跟實際數值對齊。
   */
  private shown = new Map<string, { hp: number; qi: number }>();

  constructor() {
    super('battle');
  }

  create(data: SceneData) {
    ensureTextures(this);
    this.units.clear();
    this.enc = ENCOUNTERS[data.encounter];
    this.onEnd = data.onEnd;

    const st = useGame.getState();
    const hero = heroUnit(st.hero, derive(st.hero));
    this.battle = new Battle([hero, ...enemyUnits(this.enc)], { ...st.hero.items }, this.enc.canFlee);
    this.reconcile();
    // 之後加入半即時制時，在這裡依 settings.battleMode 換成另一個控制器
    this.controller = new RoundController();

    const bgKey = `bg-${data.background}`;
    if (!this.textures.exists(bgKey)) this.textures.addCanvas(bgKey, drawBattleBg(data.background));
    this.add.image(0, 0, bgKey).setOrigin(0, 0);

    this.addUnit(hero, HERO_POS, 'left');
    const enemies = this.battle.alive('enemy');
    enemies.forEach((u, i) => this.addUnit(u, ENEMY_POS[enemies.length][i], 'right'));

    this.cursor = this.add.image(0, 0, 'cursor').setVisible(false).setDepth(1000);
    this.cursorFor = null;

    this.cameras.main.setBackgroundColor('#14121a');
    this.fit();
    this.scale.on('resize', this.fit, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.fit, this);
      useGame.setState({ battle: null, battleInput: null, battleTarget: null });
    });
    this.cameras.main.fadeIn(250, 255, 255, 255);

    this.sync();
    this.run();
  }

  private fit() {
    const { width, height } = this.scale.gameSize;
    const z = Math.max(1, Math.floor(Math.min(width / BATTLE_W, height / BATTLE_H)));
    const cam = this.cameras.main;
    cam.setZoom(z);
    cam.centerOn(BATTLE_W / 2, BATTLE_H / 2);
  }

  private addUnit(u: Unit, pos: { x: number; y: number }, facing: 'left' | 'right') {
    const row = facing === 'left' ? 1 : 2;
    const sprite = this.add.sprite(pos.x, pos.y, u.sprite, row * 3 + 1).setOrigin(0.5, 1).setDepth(pos.y);
    const entry: UnitSprite = { sprite, home: { ...pos } };
    if (u.side === 'enemy') entry.bar = this.add.graphics().setDepth(pos.y + 1);
    this.units.set(u.id, entry);
  }

  // ── 主流程 ───────────────────────────────────────────────

  private async run() {
    await this.say(this.enc.intro, 800);
    for (;;) {
      const actor = await this.controller.next(this.battle);
      // 狀態的持續次數在輪到他時減一；被震懾就跳過這次
      const turn = this.battle.startTurn(actor);
      for (const ev of turn.events) await this.play(ev);
      if (turn.skip) {
        this.sync();
        continue;
      }
      let cmd: BattleCommand;
      if (actor.side === 'hero') {
        cmd = await this.requestCommand(actor);
      } else {
        await this.wait(250);
        cmd = this.battle.enemyCommand(actor);
      }
      const events = this.battle.act(actor, cmd);
      let fled = false;
      for (const ev of events) {
        await this.play(ev);
        if (ev.type === 'flee' && ev.success) fled = true;
      }
      this.reconcile();
      this.sync();
      if (fled) return this.finish('flee');
      const o = this.battle.outcome();
      if (o) return this.finish(o);
    }
  }

  /** 讓畫面上的數值跟實際數值一致 */
  private reconcile() {
    for (const u of this.battle.units) this.shown.set(u.id, { hp: u.hp, qi: u.qi });
  }

  /** 把戰鬥狀態整理成介面要顯示的樣子（氣血、內力用畫面上的數值） */
  private sync(input: BattleView['input'] = null, result: BattleView['result'] = null) {
    const view: BattleView = {
      units: this.battle.units.map((u) => {
        const s = this.shown.get(u.id)!;
        return {
          id: u.id, name: u.name, side: u.side, hp: s.hp, maxHp: u.maxHp, qi: s.qi, maxQi: u.maxQi,
          alive: s.hp > 0, guard: u.guard, charging: u.charging, effects: u.effects.map((e) => ({ ...e })),
        };
      }),
      message: this.message,
      input,
      result,
    };
    useGame.setState({ battle: view });
    for (const u of this.battle.units) this.drawBar(u);
  }

  /** 輪到主角：把可用的招式、物品交給介面，等玩家選好 */
  private requestCommand(hero: Unit): Promise<BattleCommand> {
    const moves = hero.moves.map((id) => {
      const m = MOVES[id];
      return { id, name: m.name, desc: m.desc, qi: m.qi, target: m.target, usable: hero.qi >= m.qi };
    });
    const items = Object.entries(this.battle.items)
      .filter(([id, n]) => n > 0 && usableInBattle(id))
      .map(([id, count]) => ({ id, count, name: ITEMS[id].name, desc: ITEMS[id].desc }));
    const auto = () => {
      const { settings } = useGame.getState();
      return autoCommand(this.battle, hero, settings.autoTactic, settings.autoItems);
    };
    if (useGame.getState().battleAuto) return this.wait(150).then(auto);

    this.message = `${hero.name}，該你出手了。`;
    this.sync({ actorId: hero.id, moves, items, canFlee: this.battle.canFlee });
    return new Promise((resolve) => {
      const done = (cmd: BattleCommand) => {
        unsubscribe();
        useGame.setState({ battleInput: null, battleTarget: null });
        resolve(cmd);
      };
      // 等玩家下指令時切到自動，就直接由電腦接手
      const unsubscribe = useGame.subscribe((st, prev) => {
        if (st.battleAuto && !prev.battleAuto) done(auto());
      });
      this.events.once('shutdown', unsubscribe);
      useGame.setState({ battleInput: (cmd) => cmd && done(cmd) });
    });
  }

  private async finish(o: Outcome) {
    const st = useGame.getState();
    const lines = st.updateHero((c) => settle(c, this.battle, this.enc, o));
    if (o !== 'flee') {
      const result: BattleView['result'] =
        o === 'win'
          ? { outcome: o, title: '勝利', lines }
          : { outcome: o, title: '敗北', lines: ['你眼前一黑，倒了下去……'] };
      this.sync(null, result);
      await new Promise<void>((resolve) => useGame.setState({ battleInput: () => resolve() }));
    }
    useGame.setState({ battle: null, battleInput: null, battleTarget: null });
    this.onEnd(o);
  }

  // ── 播放事件 ─────────────────────────────────────────────

  private async play(ev: BattleEvent) {
    switch (ev.type) {
      case 'message':
        await this.say(ev.text, 480);
        break;
      case 'strike':
        await this.strike(ev.actor, ev.move.fx, ev.hits);
        break;
      case 'restore': {
        const s = this.units.get(ev.actor)!.sprite;
        const v = this.shown.get(ev.actor)!;
        v.hp += ev.hp;
        v.qi += ev.qi;
        this.burst(s.x, s.y - 12, 0x80c0ff, 10, -1);
        if (ev.hp) this.number(s.x - 6, s.y - 26, ev.hp, 0x80e080);
        if (ev.qi) this.number(s.x + 6, s.y - 26, ev.qi, 0x80b8ff);
        this.sync();
        await this.wait(500);
        break;
      }
      case 'effects': {
        const s = this.units.get(ev.actor)!.sprite;
        if (ev.gained?.length) {
          const bad = ev.gained.some((k) => DEBUFFS.includes(k));
          this.burst(s.x, s.y - 12, bad ? 0xb070e0 : 0xffd070, 8, -1);
          await this.wait(220);
        }
        this.sync();
        break;
      }
      case 'guard': {
        const s = this.units.get(ev.actor)!.sprite;
        s.setTintFill(0x9ac8ff);
        await this.wait(160);
        this.applyTint(ev.actor);
        break;
      }
      case 'charge': {
        const s = this.units.get(ev.actor)!.sprite;
        this.cameras.main.shake(200, 0.004);
        this.burst(s.x, s.y - 14, 0xff6040, 8, -1);
        this.applyTint(ev.actor);
        await this.wait(300);
        break;
      }
      case 'flee': {
        if (!ev.success) break;
        const s = this.units.get(ev.actor)!.sprite;
        s.play({ key: 'hero-right', frameRate: 14 });
        await this.tween({ targets: s, x: BATTLE_W + 20, duration: 450 });
        break;
      }
    }
  }

  private async strike(actorId: string, fx: string, hits: Hit[]) {
    const a = this.units.get(actorId)!;
    const s = a.sprite;
    const targets = hits.map((h) => this.units.get(h.target)!.sprite);
    const dirKey = s.x > targets[0].x ? 'left' : 'right';
    // 衝到目標面前（群攻則衝到敵陣中間）
    // 出招時才扣內力
    this.shown.get(actorId)!.qi = this.battle.unit(actorId).qi;
    this.sync();
    const tx = targets.reduce((n, t) => n + t.x, 0) / targets.length;
    const ty = targets.reduce((n, t) => n + t.y, 0) / targets.length;
    const stop = dirKey === 'left' ? tx + 22 : tx - 22;
    s.play({ key: `${s.texture.key}-${dirKey}`, frameRate: 14 });
    await this.tween({ targets: s, x: stop, y: ty, duration: 200 });
    s.stop();
    s.setFrame((dirKey === 'left' ? 1 : 2) * 3 + 1);

    if (fx === 'leaves') this.leaves(targets);
    if (fx === 'heavy') this.cameras.main.shake(260, 0.012);
    // 連擊時一下一下打，每下間隔一點時間
    const firstOf = new Map<string, number>();
    hits.forEach((h) => {
      const t = this.units.get(h.target)!.sprite;
      const nth = firstOf.get(h.target) ?? 0;
      firstOf.set(h.target, nth + 1);
      const fire = () => (this.impact(t, h, fx, actorId === 'hero'), this.sync());
      if (nth === 0) fire();
      else this.time.delayedCall(nth * 170, fire);
    });
    this.sync();
    const extra = (Math.max(...firstOf.values()) - 1) * 170;
    await this.wait((fx === 'leaves' ? 520 : 380) + extra);

    s.play({ key: `${s.texture.key}-${dirKey}`, frameRate: 14 });
    await this.tween({ targets: s, x: a.home.x, y: a.home.y, duration: 220 });
    s.stop();
    s.setFrame((s.x > BATTLE_W / 2 ? 1 : 2) * 3 + 1);
    s.setDepth(a.home.y);
    this.sync();
  }

  private impact(t: Phaser.GameObjects.Sprite, h: Hit, fx: string, byHero: boolean) {
    const head = t.y - 14;
    if (h.miss) {
      this.tweens.add({ targets: t, x: t.x + (t.x > BATTLE_W / 2 ? 8 : -8), duration: 90, yoyo: true });
      return;
    }
    if (fx === 'slash' || fx === 'heavy' || fx === 'wind') {
      const tint = fx === 'heavy' ? 0xff9070 : fx === 'wind' ? 0xa8f0c0 : 0xffffff;
      const slash = this.add.image(t.x, head, 'fx_slash').setDepth(2000).setTint(tint);
      if (t.x > BATTLE_W / 2) slash.setFlipX(true);
      this.tweens.add({ targets: slash, alpha: 0, duration: 260, onComplete: () => slash.destroy() });
    } else if (fx === 'punch') {
      this.burst(t.x, head, 0xffe8a0, 6, 0);
    }
    t.setTintFill(0xffffff);
    this.time.delayedCall(90, () => this.applyTint(h.target));
    this.tweens.add({ targets: t, x: t.x + (t.x > BATTLE_W / 2 ? 3 : -3), duration: 50, yoyo: true, repeat: 1 });
    // 打中的這一刻才扣血
    const v = this.shown.get(h.target)!;
    v.hp = Math.max(0, v.hp - h.damage);
    const color = h.crit ? 0xffe060 : byHero ? 0xffffff : 0xff7060;
    this.number(t.x, t.y - 26, h.damage, color);
    if (h.killed) this.defeat(h.target);
  }

  private defeat(id: string) {
    const u = this.units.get(id)!;
    this.time.delayedCall(250, () => {
      this.tweens.add({ targets: u.sprite, alpha: 0, duration: 120, yoyo: true, repeat: 2 });
      this.tweens.add({ targets: [u.sprite, u.bar].filter(Boolean), alpha: 0, delay: 720, duration: 200 });
    });
  }

  /** 竹影搖風：一陣竹葉掃過敵陣 */
  private leaves(targets: Phaser.GameObjects.Sprite[]) {
    for (let i = 0; i < 22; i++) {
      const t = targets[i % targets.length];
      const leaf = this.add.image(t.x + 30, t.y - 4 - Math.random() * 24, 'fx_leaf').setDepth(2000);
      this.tweens.add({
        targets: leaf,
        x: t.x - 24 - Math.random() * 10,
        y: leaf.y + (Math.random() - 0.5) * 12,
        angle: 360 * (Math.random() < 0.5 ? 1 : -1),
        alpha: 0,
        delay: i * 15,
        duration: 420,
        onComplete: () => leaf.destroy(),
      });
    }
  }

  /** 粒子：一圈小方塊向外（dir=0）或往上（dir=-1）散開 */
  private burst(x: number, y: number, color: number, n: number, dir: number) {
    for (let i = 0; i < n; i++) {
      const p = this.add.image(x, y, 'fx_spark').setTint(color).setDepth(2000).setScale(0.67);
      const ang = (i / n) * Math.PI * 2;
      this.tweens.add({
        targets: p,
        x: x + (dir === 0 ? Math.cos(ang) * 10 : (Math.random() - 0.5) * 16),
        y: y + (dir === 0 ? Math.sin(ang) * 10 : -14 - Math.random() * 10),
        alpha: 0,
        duration: 420,
        onComplete: () => p.destroy(),
      });
    }
  }

  /** 浮起的像素數字 */
  private number(x: number, y: number, value: number, color: number) {
    const digits = String(value).split('');
    const c = this.add.container(Math.round(x - (digits.length * 4) / 2), y).setDepth(3000);
    digits.forEach((d, i) => c.add(this.add.image(i * 4, 0, `digit${d}`).setOrigin(0, 0).setTint(color)));
    this.tweens.add({ targets: c, y: y - 10, duration: 320, ease: 'Quad.out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 650, duration: 200, onComplete: () => c.destroy() });
  }

  private drawBar(u: Unit) {
    const e = this.units.get(u.id);
    if (!e?.bar) return;
    const g = e.bar.clear();
    const hp = this.shown.get(u.id)!.hp;
    if (hp <= 0) return;
    const w = 18;
    const x = Math.round(e.home.x - w / 2);
    const y = e.home.y + 2;
    g.fillStyle(0x1e1a24).fillRect(x - 1, y - 1, w + 2, 4);
    g.fillStyle(0x4a2a2a).fillRect(x, y, w, 2);
    g.fillStyle(hp / u.maxHp > 0.3 ? 0xd8483c : 0xf2a03a).fillRect(x, y, Math.max(1, Math.round((w * hp) / u.maxHp)), 2);
  }

  /** 蓄勢中的敵人泛紅 */
  private applyTint(id: string) {
    const u = this.battle.unit(id);
    const s = this.units.get(id)!.sprite;
    if (u.charging) s.setTint(0xff9a8a);
    else s.clearTint();
  }

  // ── 小工具 ───────────────────────────────────────────────

  private async say(text: string, ms: number) {
    this.message = text;
    this.sync();
    await this.wait(ms);
  }

  private wait(ms: number) {
    return new Promise<void>((resolve) => this.time.delayedCall(ms, resolve));
  }

  private tween(cfg: Phaser.Types.Tweens.TweenBuilderConfig) {
    return new Promise<void>((resolve) => this.tweens.add({ ...cfg, onComplete: () => resolve() }));
  }

  update() {
    // 自動戰鬥時動畫兩倍速
    const speed = useGame.getState().battleAuto ? 2 : 1;
    this.time.timeScale = speed;
    this.tweens.timeScale = speed;
    // 選目標時，箭頭指在目標頭上
    const target = useGame.getState().battleTarget;
    if (target === this.cursorFor) return;
    this.cursorFor = target;
    this.tweens.killTweensOf(this.cursor);
    const e = target ? this.units.get(target) : null;
    if (!e) {
      this.cursor.setVisible(false);
      return;
    }
    this.cursor.setPosition(e.sprite.x, e.sprite.y - 30).setVisible(true);
    this.tweens.add({ targets: this.cursor, y: '-=2', duration: 300, yoyo: true, repeat: -1 });
  }
}
