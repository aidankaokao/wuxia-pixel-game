import Phaser from 'phaser';
import { Dir, NPC_WALK_MS, RUN_MS, TILE, VIEW_TILES_H, VIEW_TILES_W, WALK_MS } from '../constants';
import { tileArt } from '../art/tiles';
import { BUILDINGS } from '../art/props';
import { hash, makeCanvas } from '../art/pixel';
import { Actor } from '../entities/Actor';
import { MAPS } from '../maps';
import { BLOCKING, Line, MapDef, NpcDef, PropDef } from '../maps/types';
import { EventCtx, Script, ScriptAbort } from '../events';
import { derive } from '../character';
import type { Outcome } from '../battle/types';
import { autosave, setPositionProvider } from '../save';
import { flag, uiBlocking, useGame } from '../../state/store';

interface Npc {
  def: NpcDef;
  actor: Actor | null;
  talkIndex: number;
  nextWander: number;
}

interface Prop {
  def: PropDef;
  image: Phaser.GameObjects.Image;
  visible: boolean;
}

interface Spawn {
  x: number;
  y: number;
  facing: Dir;
}

interface SceneData {
  mapId: string;
  spawn?: Spawn;
  /** 抵達後立刻顯示的旁白（例如戰敗後醒來） */
  arrive?: Line[];
}

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

/** 行走地圖場景：瓦片地圖、碰撞、主角操作、NPC、互動、劇情腳本、出入口與進入戰鬥。 */
export class MapScene extends Phaser.Scene {
  private def!: MapDef;
  private data_!: SceneData;
  private w = 0;
  private h = 0;
  /** 地形與建築造成的阻擋（不隨劇情改變） */
  private blocked!: Uint8Array;
  /** 建築的門 */
  private doors = new Map<number, { label: string; lines: Line[] }>();
  private props: Prop[] = [];
  private player!: Actor;
  private npcs: Npc[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private turnUntil = 0;
  private lastDir: Dir | null = null;
  /** 按下確認／選單鍵時排入的動作，等主角站定後執行 */
  private queued: 'interact' | 'menu' | null = null;
  /** 正在離開這張地圖（淡出中），不再處理任何操作 */
  private leaving = false;

  constructor() {
    super('map');
  }

  init(data: SceneData) {
    this.data_ = data;
    this.def = MAPS[data.mapId];
    this.npcs = [];
    this.props = [];
    this.doors.clear();
    this.leaving = false;
    this.queued = null;
    this.lastDir = null;
  }

  create() {
    const def = this.def;
    this.h = def.tiles.length;
    this.w = def.tiles[0].length;
    def.tiles.forEach((row, y) => {
      if (row.length !== this.w) throw new Error(`地圖 ${def.id} 第 ${y} 列長度 ${row.length}，應為 ${this.w}`);
    });

    this.buildGround();
    this.buildCollision();
    this.placeDecor();
    this.placeBuildings();
    this.placeProps();

    this.npcs = def.npcs.map((n) => ({ def: n, actor: null, talkIndex: 0, nextWander: 0 }));
    if (def.npcs.some((n) => n.respawn)) {
      this.time.addEvent({ delay: 1000, loop: true, callback: () => !uiBlocking() && this.refresh() });
    }
    const spawn = this.data_.spawn ?? def.spawn;
    this.player = new Actor(this, 'hero', spawn.x, spawn.y, spawn.facing);
    this.refresh();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.w * TILE, this.h * TILE);
    cam.startFollow(this.player.sprite, true, 1, 1, 0, TILE / 2);
    cam.setRoundPixels(true);
    this.fitZoom();
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', s: 'S', a: 'A', d: 'D', shift: 'SHIFT',
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('E,X,SPACE,ENTER,ESC');
    // 用按鍵事件而非 JustDown：按下與放開落在同一幀時 JustDown 會漏掉
    this.events.once('shutdown', () => kb.off('keydown'));
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat || uiBlocking()) return;
      // 這個按鍵已經被對話框或選單用掉了（例如用來關閉對話）
      if (e.timeStamp <= useGame.getState().uiClosedAt) return;
      if (['e', 'E', ' ', 'Enter'].includes(e.key)) this.queued = 'interact';
      else if (['x', 'X', 'Escape'].includes(e.key)) this.queued = 'menu';
    });

    // 開發模式下讓自動化測試讀得到主角位置
    if (import.meta.env.DEV) {
      (window as unknown as { __wuxia: unknown }).__wuxia = {
        player: () => ({ map: this.def.id, x: this.player.tx, y: this.player.ty, facing: this.player.facing }),
        state: () => useGame.getState(),
        store: useGame,
        npcs: () => this.npcs.filter((n) => n.actor).map((n) => ({ id: n.def.id, x: n.actor!.tx, y: n.actor!.ty })),
      };
    }
    setPositionProvider(() => ({ mapId: def.id, mapName: def.name, x: this.player.tx, y: this.player.ty, facing: this.player.facing }));
    this.events.once('shutdown', () => setPositionProvider(() => null));
    this.time.delayedCall(600, autosave);
    useGame.getState().enterMap(def.name, def.subtitle);
    cam.fadeIn(400, 0, 0, 0);
    const arrive = this.data_.arrive;
    if (arrive) this.time.delayedCall(450, () => this.runScript((ctx) => ctx.say(...arrive)));
  }

  // ── 建構地圖 ─────────────────────────────────────────────

  private idx(x: number, y: number) {
    return y * this.w + x;
  }

  /** 收集這張地圖用到的所有地形外觀，排成一張 tileset，再建立瓦片圖層。 */
  private buildGround() {
    const g = this.def.tiles;
    const keyIndex = new Map<string, number>();
    const draws: ((ctx: CanvasRenderingContext2D) => void)[] = [];
    const use = (art: ReturnType<typeof tileArt>) => {
      let i = keyIndex.get(art.key);
      if (i === undefined) {
        i = draws.length;
        keyIndex.set(art.key, i);
        draws.push(art.draw);
      }
      return i;
    };

    const data: number[][] = [];
    const water: { x: number; y: number; f: [number, number] }[] = [];
    for (let y = 0; y < this.h; y++) {
      const row: number[] = [];
      for (let x = 0; x < this.w; x++) {
        const i0 = use(tileArt(g, x, y, 0));
        row.push(i0);
        if (g[y][x] === '~') water.push({ x, y, f: [i0, use(tileArt(g, x, y, 1))] });
      }
      data.push(row);
    }

    const cols = 16;
    const [canvas, ctx] = makeCanvas(cols * TILE, Math.ceil(draws.length / cols) * TILE);
    draws.forEach((draw, i) => {
      ctx.save();
      ctx.translate((i % cols) * TILE, Math.floor(i / cols) * TILE);
      ctx.beginPath();
      ctx.rect(0, 0, TILE, TILE);
      ctx.clip();
      draw(ctx);
      ctx.restore();
    });
    const texKey = `tiles-${this.def.id}`;
    if (this.textures.exists(texKey)) this.textures.remove(texKey);
    this.textures.addCanvas(texKey, canvas);

    const map = this.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = map.addTilesetImage(texKey, texKey, TILE, TILE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setDepth(-1);

    // 水面兩格交替，產生波光粼粼的效果
    if (water.length) {
      let frame = 0;
      this.time.addEvent({
        delay: 600,
        loop: true,
        callback: () => {
          frame ^= 1;
          for (const t of water) layer.putTileAt(t.f[frame], t.x, t.y);
        },
      });
    }
  }

  private buildCollision() {
    this.blocked = new Uint8Array(this.w * this.h);
    this.def.tiles.forEach((row, y) => {
      for (let x = 0; x < this.w; x++) if (BLOCKING.has(row[x])) this.blocked[this.idx(x, y)] = 1;
    });
  }

  /** 樹、竹、石：底下是草地，上面另放一張會依前後排序的圖。 */
  private placeDecor() {
    const g = this.def.tiles;
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = g[y][x];
        let key: string | null = null;
        const r = hash(x, y, 99);
        if (c === 'T') {
          // 靠山的地方多種松樹
          const nearMountain = y < 8 || g[y - 1]?.[x] === '^' || this.def.id !== 'qingzhu';
          key = nearMountain || r < 0.25 ? `pine${r < 0.5 ? 0 : 1}` : `tree${r < 0.6 ? 0 : 1}`;
        } else if (c === 'Y') key = `bamboo${Math.floor(r * 3)}`;
        else if (c === 'o') key = 'rock';
        if (!key) continue;
        const bottom = (y + 1) * TILE;
        this.add.image(x * TILE + TILE / 2, bottom + (key === 'rock' ? -2 : 0), key).setOrigin(0.5, 1).setDepth(bottom);
      }
  }

  private placeBuildings() {
    for (const b of this.def.buildings) {
      const st = BUILDINGS[b.style];
      const bottom = (b.y + st.h) * TILE;
      const img = this.add.image(b.x * TILE - 2, bottom, `b_${b.style}`).setOrigin(0, 1).setDepth(bottom);
      for (let y = b.y; y < b.y + st.h; y++)
        for (let x = b.x; x < b.x + st.w; x++) this.blocked[this.idx(x, y)] = 1;
      this.doors.set(this.idx(b.x + st.door, b.y + st.h - 1), { label: `${b.name}的門`, lines: b.door });
      if (st.chimney) this.smoke(img.x + img.width - 13, img.y - img.height + 1);
    }
  }

  private placeProps() {
    for (const def of this.def.props) {
      const w = def.w ?? 1;
      const bottom = (def.y + 1) * TILE;
      const key = typeof def.sprite === 'string' ? def.sprite : def.sprite(useGame.getState().flags);
      const image = this.add.image(def.x * TILE + (w * TILE) / 2, bottom, key).setOrigin(0.5, 1).setDepth(bottom);
      this.props.push({ def, image, visible: true });
      // 有兩個畫格的物件（例如營火）輪流切換
      if (typeof def.sprite === 'string' && this.textures.exists(`${def.sprite}_b`)) {
        const a = def.sprite;
        let on = false;
        this.time.addEvent({ delay: 180, loop: true, callback: () => image.setTexture((on = !on) ? `${a}_b` : a) });
      }
    }
  }

  /** 依目前的劇情旗標，決定哪些 NPC、物件存在，以及物件的外觀。 */
  private refresh() {
    const { flags: f, respawnAt } = useGame.getState();
    const now = Date.now();
    for (const n of this.npcs) {
      const down = (respawnAt[`${this.def.id}:${n.def.id}`] ?? 0) > now;
      // 重生時若主角剛好站在那一格，等下次再說
      const occupied = !n.actor && this.player && this.player.tx === n.def.x && this.player.ty === n.def.y;
      const show = (!n.def.when || n.def.when(f)) && !down && !(occupied && n.def.encounter);
      if (show && !n.actor) {
        n.actor = new Actor(this, n.def.sprite, n.def.x, n.def.y, n.def.facing ?? 'down');
        n.nextWander = this.time.now + 1500 + Math.random() * 3000;
      } else if (!show && n.actor) {
        n.actor.destroy();
        n.actor = null;
      }
    }
    for (const p of this.props) {
      p.visible = !p.def.when || p.def.when(f);
      p.image.setVisible(p.visible);
      if (typeof p.def.sprite === 'function') p.image.setTexture(p.def.sprite(f));
    }
  }

  /** 煙囪冒煙：小方塊往上飄、變大、淡出。 */
  private smoke(x: number, y: number) {
    this.time.addEvent({
      delay: 520,
      loop: true,
      callback: () => {
        const puff = this.add.rectangle(x + Math.random() * 2, y, 2, 2, 0xcfcfcf, 0.8).setDepth(10000);
        this.tweens.add({
          targets: puff,
          x: puff.x + 4 + Math.random() * 4,
          y: y - 14 - Math.random() * 6,
          scale: 2.2,
          alpha: 0,
          duration: 1800,
          onComplete: () => puff.destroy(),
        });
      },
    });
  }

  private fitZoom() {
    // 開發用：網址加 ?zoom=1 可以看到整張地圖
    const forced = Number(new URLSearchParams(location.search).get('zoom'));
    if (forced > 0) {
      this.cameras.main.setZoom(forced);
      return;
    }
    const { width, height } = this.scale.gameSize;
    const z = Math.floor(Math.min(width / (VIEW_TILES_W * TILE), height / (VIEW_TILES_H * TILE)));
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, 2, 6));
  }

  // ── 碰撞與互動 ───────────────────────────────────────────

  private inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  private propAt(x: number, y: number) {
    return this.props.find((p) => p.visible && y === p.def.y && x >= p.def.x && x < p.def.x + (p.def.w ?? 1));
  }

  private npcAt(x: number, y: number) {
    return this.npcs.find((n) => n.actor && n.actor.tx === x && n.actor.ty === y);
  }

  private isBlocked(x: number, y: number, self?: Actor): boolean {
    if (!this.inBounds(x, y)) return true;
    if (this.blocked[this.idx(x, y)] || this.propAt(x, y)) return true;
    if (this.player && this.player !== self && this.player.tx === x && this.player.ty === y) return true;
    return this.npcs.some((n) => n.actor && n.actor !== self && n.actor.tx === x && n.actor.ty === y);
  }

  private interact() {
    const f = this.player.front();
    const npc = this.npcAt(f.x, f.y);
    if (npc?.actor) {
      npc.actor.face(OPPOSITE[this.player.facing]);
      if (npc.def.encounter) {
        this.fightBeast(npc);
      } else if (npc.def.script) {
        this.runScript(npc.def.script);
      } else if (npc.def.talks?.length) {
        const lines = npc.def.talks[npc.talkIndex % npc.def.talks.length];
        npc.talkIndex++;
        this.runScript((ctx) => ctx.say(...lines));
      }
      return;
    }
    const prop = this.propAt(f.x, f.y);
    if (prop) {
      const { script, lines } = prop.def;
      if (script) this.runScript(script);
      else if (lines) this.runScript((ctx) => ctx.say(...lines));
      return;
    }
    const door = this.inBounds(f.x, f.y) ? this.doors.get(this.idx(f.x, f.y)) : undefined;
    if (door) this.runScript((ctx) => ctx.say(...door.lines));
  }

  /** 跟野獸開打；打贏後牠消失，過一陣子才重生 */
  private fightBeast(npc: Npc) {
    this.runScript(async (ctx) => {
      const r = await ctx.battle(npc.def.encounter!);
      // 逃走時往後退一步，免得按著方向鍵又撞上去
      if (r === 'flee') await ctx.walk('player', [OPPOSITE[this.player.facing]]);
      if (r !== 'win') return;
      const key = `${this.def.id}:${npc.def.id}`;
      useGame.setState((s) => ({ respawnAt: { ...s.respawnAt, [key]: Date.now() + (npc.def.respawn ?? 60) * 1000 } }));
    });
  }

  private updatePrompt() {
    const f = this.player.front();
    const npc = this.npcAt(f.x, f.y);
    const prop = this.propAt(f.x, f.y);
    const door = this.inBounds(f.x, f.y) ? this.doors.get(this.idx(f.x, f.y)) : undefined;
    const talkable = npc && (npc.def.script || npc.def.talks?.length);
    useGame
      .getState()
      .setPrompt(npc?.def.encounter ? `與 ${npc.def.name} 交手` : talkable ? `與 ${npc.def.name} 交談` : prop ? '查看' : door ? door.label : null);
  }

  private afterPlayerStep() {
    const { tx, ty } = this.player;
    const exit = this.def.exits.find((e) => e.tiles.some(([x, y]) => x === tx && y === ty));
    if (exit) {
      this.player.stand();
      if (exit.to) this.warp(exit.to, exit.spawn);
      else if (exit.lines) this.runScript((ctx) => ctx.say(...exit.lines!));
      return;
    }
    const f = useGame.getState().flags;
    const trigger = this.def.triggers?.find(
      (t) => (!t.when || t.when(f)) && t.tiles.some(([x, y]) => x === tx && y === ty),
    );
    if (trigger) {
      this.player.stand();
      this.runScript(trigger.script);
    }
  }

  /** 淡出後切換到另一張地圖（也可以是同一張地圖的另一個位置） */
  private warp(mapId: string, spawn?: Spawn, arrive?: Line[]) {
    if (this.leaving) return;
    this.leaving = true;
    useGame.getState().setPrompt(null);
    this.cameras.main.fadeOut(300, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.restart({ mapId, spawn, arrive }));
  }

  // ── 劇情腳本 ─────────────────────────────────────────────

  private async runScript(script: Script) {
    const st = useGame.getState();
    if (st.eventRunning || this.leaving) return;
    useGame.setState({ eventRunning: true, prompt: null });
    this.player.stand();
    try {
      await script(this.makeCtx());
    } catch (e) {
      if (!(e instanceof ScriptAbort)) console.error(e);
    } finally {
      useGame.setState({ eventRunning: false, uiClosedAt: performance.now() });
      if (!this.leaving) {
        this.refresh();
        autosave();
      }
    }
  }

  private actorOf(who: string): Actor | null {
    if (who === 'player') return this.player;
    return this.npcs.find((n) => n.def.id === who)?.actor ?? null;
  }

  private makeCtx(): EventCtx {
    const st = () => useGame.getState();
    const toLine = (l: Line | string): Line => (typeof l === 'string' ? { text: l } : l);
    return {
      say: (...lines) => st().say(lines.map(toLine)),
      ask: (line, choices) => st().ask(toLine(line), choices),
      flag: (key) => flag(key),
      setFlag: (key, value = 1) => st().setFlag(key, value),
      hero: async (fn) => {
        const r = st().updateHero(fn);
        const msgs = (Array.isArray(r) ? r : [r]).filter((m): m is string => typeof m === 'string' && m.length > 0);
        if (msgs.length) await st().say(msgs.map((text) => ({ text })));
      },
      battle: (encounter) => this.battle(encounter),
      walk: async (who, dirs) => {
        const a = this.actorOf(who);
        if (!a) return;
        for (const d of dirs) {
          const t = a.front(d);
          if (this.isBlocked(t.x, t.y, a)) {
            a.face(d);
            continue;
          }
          await new Promise<void>((done) => a.step(d, a === this.player ? WALK_MS * 1.5 : NPC_WALK_MS, done));
        }
        a.stand();
      },
      face: (who, dir) => this.actorOf(who)?.face(dir),
      faceEachOther: (id) => {
        const a = this.actorOf(id);
        if (!a) return;
        const dx = a.tx - this.player.tx;
        const dy = a.ty - this.player.ty;
        const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
        this.player.face(dir);
        a.face(OPPOSITE[dir]);
      },
      wait: (ms) => new Promise((done) => this.time.delayedCall(ms, done)),
      refresh: () => this.refresh(),
    };
  }

  // ── 戰鬥 ────────────────────────────────────────────────

  /** 閃白之後切進戰鬥場景，地圖場景暫停；戰鬥結束後回到這裡。 */
  private battle(encounter: string): Promise<Outcome> {
    return new Promise<Outcome>((resolve) => {
      this.player.stand();
      this.cameras.main.flash(300, 255, 255, 255);
      this.time.delayedCall(320, () => {
        this.scene.launch('battle', {
          encounter,
          background: this.def.battleBg ?? 'mountain',
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
      if (o === 'lose') {
        // 戰敗：被人救回村裡，恢復一半氣血
        useGame.getState().updateHero((c) => {
          const d = derive(c);
          c.hp = Math.ceil(d.maxHp / 2);
          c.qi = Math.ceil(d.maxQi / 2);
        });
        this.warp('qingzhu', { x: 23, y: 20, facing: 'up' }, [
          { text: '……' },
          { text: '你醒來時，已經躺在青竹村的老井旁。' },
          { speaker: '鍾嬸', text: '總算醒啦！是上山砍柴的樵夫把你背回來的。年輕人，別逞強啊。' },
        ]);
        throw new ScriptAbort();
      }
      return o;
    });
  }

  // ── 每幀更新 ─────────────────────────────────────────────

  update(time: number) {
    const k = this.keys;
    if (this.leaving) return;

    if (uiBlocking()) {
      this.queued = null;
      return;
    }

    this.updateNpcs(time);
    if (this.player.moving) return;

    const action = this.queued;
    this.queued = null;
    if (action === 'interact') {
      this.interact();
      return;
    }
    if (action === 'menu') {
      this.player.stand();
      useGame.getState().setMenu(true);
      return;
    }

    const dir = this.heldDir();
    if (!dir) {
      this.lastDir = null;
      this.player.stand();
      this.updatePrompt();
      return;
    }
    // 站定時輕點不同方向：只轉身不前進，按住才會走
    if (dir !== this.player.facing && this.lastDir === null) {
      this.player.face(dir);
      this.turnUntil = time + 90;
    }
    this.lastDir = dir;
    if (time < this.turnUntil) {
      this.updatePrompt();
      return;
    }
    const t = this.player.front(dir);
    if (this.isBlocked(t.x, t.y, this.player)) {
      this.player.face(dir);
      const beast = this.npcAt(t.x, t.y);
      if (beast?.def.encounter && beast.actor && !beast.actor.moving) {
        beast.actor.face(OPPOSITE[dir]);
        this.fightBeast(beast);
        return;
      }
      this.updatePrompt();
      return;
    }
    useGame.getState().setPrompt(null);
    this.player.step(dir, k.shift.isDown ? RUN_MS : WALK_MS, () => this.afterPlayerStep());
  }

  private heldDir(): Dir | null {
    const k = this.keys;
    if (k.up.isDown || k.w.isDown) return 'up';
    if (k.down.isDown || k.s.isDown) return 'down';
    if (k.left.isDown || k.a.isDown) return 'left';
    if (k.right.isDown || k.d.isDown) return 'right';
    return null;
  }

  private updateNpcs(time: number) {
    for (const n of this.npcs) {
      const a = n.actor;
      const r = n.def.wander ?? 0;
      if (!a || !r || a.moving || time < n.nextWander) continue;
      n.nextWander = time + 1800 + Math.random() * 3200;
      const dir = DIRS[Math.floor(Math.random() * 4)];
      const t = a.front(dir);
      const inRange = Math.abs(t.x - n.def.x) <= r && Math.abs(t.y - n.def.y) <= r;
      const onExit = this.def.exits.some((e) => e.tiles.some(([x, y]) => x === t.x && y === t.y));
      if (!inRange || onExit || this.isBlocked(t.x, t.y, a)) {
        a.face(dir);
        continue;
      }
      a.step(dir, NPC_WALK_MS, () => a.stand());
    }
  }
}
