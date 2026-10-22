import Phaser from 'phaser';
import { derive } from '../character';
import type { Dir } from '../constants';
import { ENCOUNTERS } from '../battle/enemies';
import type { Outcome } from '../battle/types';
import { EventCtx, Script, ScriptAbort } from '../events';
import { drawNodeIcon, drawWorldHero, drawWorldMap } from '../art/worldmap';
import { CELL, edgesFrom, NODES, nodeById, spawnOf, WORLD_H, WORLD_W, type WorldNode } from '../world/geo';
import { mountDef } from '../mounts';
import { autosave, setPositionProvider } from '../save';
import type { Line } from '../maps/types';
import { uiBlocking, useGame } from '../../state/store';
import { DEFEAT } from './defeat';

/** 大地圖場景的參數：站在哪個節點；arrive 是一到就說的話 */
export interface WorldData {
  node: string;
  /** 從哪個節點的方向來（決定進據點時從哪一側進去；渡口只能往回走） */
  from?: string;
  arrive?: Line[];
}

/** 走一格要幾毫秒（畫面上的速度，跟遊戲裡花的時間無關） */
const STEP_MS = 90;
/** 方向鍵對應的方向向量 */
const DIRS: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/**
 * 大地圖：在城市、村莊、門派、據點之間移動。
 * 方向鍵選一條路走過去（小人沿路走，到了才算時間），E 進入這個地方，X 開選單。
 * 路上可能遇到劫匪或野獸（edge.danger）；還沒開放的地方走不過去。
 */
export class WorldScene extends Phaser.Scene {
  private data_!: WorldData;
  private node!: WorldNode;
  private from?: string;
  private hero!: Phaser.GameObjects.Sprite;
  private moving = false;
  private leaving = false;
  private queued: 'interact' | 'menu' | Dir | null = null;

  constructor() {
    super('world');
  }

  init(data: WorldData) {
    this.data_ = data;
    this.node = NODES.find((n) => n.id === data.node && !n.locked) ?? nodeById('linjiang');
    this.from = data.from;
    this.moving = false;
    this.leaving = false;
    this.queued = null;
  }

  create() {
    const tex = this.textures;
    if (!tex.exists('worldmap')) tex.addCanvas('worldmap', drawWorldMap());
    for (const k of ['city', 'village', 'sect', 'wild', 'port', 'ferry', 'locked'] as const)
      if (!tex.exists(`wnode_${k}`)) tex.addCanvas(`wnode_${k}`, drawNodeIcon(k));
    if (!tex.exists('world_hero')) {
      const t = tex.addCanvas('world_hero', drawWorldHero())!;
      t.add(0, 0, 0, 0, 9, 12);
      t.add(1, 0, 9, 0, 9, 12);
    }
    if (!this.anims.exists('world_hero_walk')) this.anims.create({ key: 'world_hero_walk', frames: [{ key: 'world_hero', frame: 0 }, { key: 'world_hero', frame: 1 }], frameRate: 6 });
    this.add.image(0, 0, 'worldmap').setOrigin(0);
    for (const n of NODES) this.add.image(n.x * CELL + 4, n.y * CELL + 4, `wnode_${n.locked ? 'locked' : n.kind}`).setDepth(1);
    this.hero = this.add.sprite(this.node.x * CELL + 4, this.node.y * CELL - 2, 'world_hero', 0).setDepth(2);

    const cam = this.cameras.main;
    cam.setBounds(0, 0, WORLD_W * CELL, WORLD_H * CELL);
    cam.startFollow(this.hero, true, 1, 1);
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    const kb = this.input.keyboard!;
    kb.addCapture('UP,DOWN,LEFT,RIGHT,E,X,SPACE,ENTER,ESC,W,A,S,D');
    this.events.once('shutdown', () => kb.off('keydown'));
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat || e.ctrlKey || e.metaKey || uiBlocking()) return;
      if (e.timeStamp <= useGame.getState().uiClosedAt) return;
      const k = e.key;
      if (['e', 'E', ' ', 'Enter'].includes(k)) this.queued = 'interact';
      else if (['x', 'X', 'Escape'].includes(k)) this.queued = 'menu';
      else if (k === 'ArrowUp' || k === 'w' || k === 'W') this.queued = 'up';
      else if (k === 'ArrowDown' || k === 's' || k === 'S') this.queued = 'down';
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') this.queued = 'left';
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') this.queued = 'right';
    });

    if (import.meta.env.DEV) {
      (window as unknown as { __wuxia: unknown }).__wuxia = {
        player: () => ({ map: 'world', node: this.node.id, x: this.node.x, y: this.node.y }),
        state: () => useGame.getState(),
        store: useGame,
        npcs: () => [],
        battle: (encounter: string) => this.runScript(async (ctx) => void (await ctx.battle(encounter))),
        warp: (mapId: string, x: number, y: number, facing: Dir = 'up') => this.enterMap(mapId, { x, y, facing }),
        travel: (to: string) => this.travelTo(to),
      };
    }
    setPositionProvider(() => ({ mapId: 'world', mapName: `大地圖・${this.node.name}`, x: this.node.x, y: this.node.y, facing: 'down' }));
    this.events.once('shutdown', () => {
      setPositionProvider(() => null);
      useGame.setState({ worldMap: null });
    });
    this.arrived();
    useGame.getState().enterMap('江南', '大地圖');
    this.time.delayedCall(600, autosave);
    cam.fadeIn(400, 0, 0, 0);
    const arrive = this.data_.arrive;
    if (arrive) this.time.delayedCall(450, () => this.runScript((ctx) => ctx.say(...arrive)));
  }

  /** 整數倍放大：大約看得到 50 格寬 */
  private fitZoom() {
    const { width, height } = this.scale;
    const zoom = Math.max(2, Math.min(5, Math.floor(Math.min(width / (48 * CELL), height / (30 * CELL)))));
    this.cameras.main.setZoom(zoom);
  }

  update() {
    this.placeLabels();
    if (this.leaving || this.moving) return;
    if (uiBlocking()) {
      this.queued = null;
      return;
    }
    const q = this.queued;
    this.queued = null;
    if (q === 'menu') useGame.getState().setMenu(true);
    else if (q === 'interact') this.enterNode();
    else if (q) this.chooseRoad(q);
  }

  /** 地名、節點名的位置（由介面疊上去的字，跟著鏡頭移動） */
  private placeLabels() {
    const cam = this.cameras.main;
    for (const el of Array.from(document.querySelectorAll<HTMLElement>('[data-wx]'))) {
      const x = Number(el.dataset.wx);
      const y = Number(el.dataset.wy);
      el.style.left = `${Math.round((x * CELL + 4 - cam.worldView.x) * cam.zoom)}px`;
      el.style.top = `${Math.round((y * CELL + 4 - cam.worldView.y) * cam.zoom)}px`;
    }
  }

  /** 照方向鍵挑一條路：路的頭一段方向最接近按的方向 */
  private chooseRoad(dir: Dir) {
    const [dx, dy] = DIRS[dir];
    let best: { to: WorldNode; score: number } | null = null;
    for (const r of edgesFrom(this.node.id, this.from)) {
      // 看路上第三格（或終點）的方向，比較不受起頭轉折影響
      const [px, py] = r.path[Math.min(3, r.path.length - 1)];
      const vx = px - this.node.x;
      const vy = py - this.node.y;
      const len = Math.hypot(vx, vy) || 1;
      const score = (vx * dx + vy * dy) / len;
      if (score > 0.5 && (!best || score > best.score)) best = { to: r.to, score };
    }
    if (best) this.travelTo(best.to.id);
  }

  /** 沿路走到另一個節點 */
  travelTo(id: string) {
    const r = edgesFrom(this.node.id, this.from).find((e) => e.to.id === id);
    if (!r || this.moving) return;
    if (r.to.locked) {
      this.runScript((ctx) => ctx.say(`「${r.edge.name}」通往${r.to.name}。`, r.to.desc, '（這裡還沒開放，之後再來）'));
      return;
    }
    this.moving = true;
    useGame.setState({ worldMap: { node: null, to: r.to.id } });
    this.hero.play({ key: 'world_hero_walk', repeat: -1 });
    const steps = r.path.slice(1);
    const half = Math.floor(steps.length / 2);
    const walk = (from: number, to: number) =>
      new Promise<void>((done) => {
        const pts = steps.slice(from, to);
        if (!pts.length) return done();
        this.tweens.chain({
          targets: this.hero,
          tweens: pts.map(([x, y]) => ({ x: x * CELL + 4, y: y * CELL - 2, duration: STEP_MS })),
          onComplete: () => done(),
        });
      });
    void (async () => {
      await walk(0, half);
      // 路上：偶爾遇到劫匪或野獸
      if (Math.random() < r.edge.danger) {
        this.hero.stop();
        this.moving = false;
        await this.runScript(async (ctx) => {
          const enc = Math.random() < 0.5 ? 'escort_near' : 'dogs';
          await ctx.say(enc === 'dogs' ? '路旁的草叢裡竄出幾條野狗！' : '前面的樹林裡，有人攔住了去路……');
          const o = await ctx.battle(enc);
          if (o === 'flee') await ctx.say('你繞了一段遠路，總算甩開了。');
        });
        if (this.leaving) return;
        this.moving = true;
        this.hero.play({ key: 'world_hero_walk', repeat: -1 });
      }
      await walk(half, steps.length);
      this.hero.stop();
      this.hero.setFrame(0);
      // 騎馬比較快
      const h = useGame.getState().hero;
      const speed = h.riding ? (mountDef(h.mount)?.speed ?? 1) : 1;
      useGame.getState().passTime(Math.max(1, Math.round(r.edge.ke / speed)));
      this.from = this.node.id;
      this.node = r.to;
      this.moving = false;
      this.arrived();
      autosave();
    })();
  }

  /** 站定在節點上：告訴介面，並記進存檔（讀檔時回到這裡） */
  private arrived() {
    useGame.setState({ worldMap: { node: this.node.id, from: this.from } });
    useGame.getState().updateWorld((w) => (w.wpos = { node: this.node.id, from: this.from }));
  }

  /** 進入這個節點的小地圖：從哪條路來，就從據點的哪一側進去 */
  private enterNode() {
    const e = spawnOf(this.node, this.from);
    if (e) this.enterMap(e.map, { x: e.x, y: e.y, facing: e.facing });
  }

  private enterMap(mapId: string, spawn: { x: number; y: number; facing: Dir }, arrive?: Line[]) {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('map', { mapId, spawn, arrive }));
  }

  // ── 劇情腳本（大地圖上只會說話、開戰、過時間） ──────────

  private async runScript(script: Script) {
    const st = useGame.getState();
    if (st.eventRunning || this.leaving) return;
    useGame.setState({ eventRunning: true, prompt: null });
    try {
      await script(this.makeCtx());
    } catch (e) {
      if (!(e instanceof ScriptAbort)) console.error(e);
    } finally {
      useGame.setState({ eventRunning: false, uiClosedAt: performance.now() });
      if (!this.leaving) autosave();
    }
  }

  private makeCtx(): EventCtx {
    const st = () => useGame.getState();
    const toLine = (l: Line | string): Line => (typeof l === 'string' ? { text: l } : l);
    const nothing = async () => {};
    return {
      say: (...lines) => st().say(lines.map(toLine)),
      ask: (line, choices) => st().ask(toLine(line), choices),
      flag: (key) => st().flags[key] ?? 0,
      setFlag: (key, value = 1) => st().setFlag(key, value),
      hero: async (fn) => {
        const r = st().updateHero(fn);
        const msgs = (Array.isArray(r) ? r : [r]).filter((m): m is string => typeof m === 'string' && m.length > 0);
        if (msgs.length) await st().say(msgs.map((text) => ({ text })));
      },
      battle: (encounter) => this.battle(encounter),
      walk: nothing,
      face: () => {},
      faceEachOther: () => {},
      wait: (ms) => new Promise((done) => this.time.delayedCall(ms, done)),
      pass: (ke) => void st().passTime(ke),
      work: (kind, text, ms) => st().playWork(kind, text, ms),
      refresh: () => {},
      reload: () => {},
      warp: (mapId, spawn, arrive) => this.enterMap(mapId, spawn, arrive),
      panel: (p) => st().openPanel(p),
    };
  }

  private battle(encounter: string): Promise<Outcome> {
    return new Promise<Outcome>((resolve) => {
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(320, () => {
        this.scene.launch('battle', {
          encounter,
          background: 'mountain',
          onEnd: (o: Outcome) => {
            this.scene.stop('battle');
            this.scene.resume();
            this.cameras.main.fadeIn(300, 0, 0, 0);
            resolve(o);
          },
        });
        this.scene.pause();
      });
    }).then((o) => {
      useGame.getState().passTime(1);
      if (o === 'lose' && !ENCOUNTERS[encounter]?.spar) {
        useGame.getState().updateHero((c) => {
          const d = derive(c);
          c.hp = Math.ceil(d.maxHp / 2);
          c.qi = Math.ceil(d.maxQi / 2);
        });
        this.enterMap(DEFEAT.map, DEFEAT.spawn, DEFEAT.lines);
        throw new ScriptAbort();
      }
      return o;
    });
  }
}
