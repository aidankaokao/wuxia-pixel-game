import Phaser from 'phaser';
import { Dir, NPC_WALK_MS, RUN_MS, TILE, VIEW_TILES_H, VIEW_TILES_W, WALK_MS } from '../constants';
import { tileArt } from '../art/tiles';
import { BUILDINGS } from '../art/props';
import { hash, makeCanvas } from '../art/pixel';
import { Actor } from '../entities/Actor';
import { MAPS } from '../maps';
import { BLOCKING, Line, MapDef, NpcDef } from '../maps/types';
import { uiBlocking, useGame } from '../../state/store';

interface Npc {
  def: NpcDef;
  actor: Actor;
  talkIndex: number;
  nextWander: number;
}

interface Interactable {
  label: string;
  lines: Line[];
}

const DIRS: Dir[] = ['up', 'down', 'left', 'right'];

/** 行走地圖場景：瓦片地圖、碰撞、主角操作、NPC、互動與出入口。 */
export class MapScene extends Phaser.Scene {
  private def!: MapDef;
  private w = 0;
  private h = 0;
  private blocked!: Uint8Array;
  private interactables = new Map<number, Interactable>();
  private exits = new Map<number, Line[]>();
  private player!: Actor;
  private npcs: Npc[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private turnUntil = 0;
  private lastDir: Dir | null = null;
  /** 按下確認／選單鍵時排入的動作，等主角站定後執行 */
  private queued: 'interact' | 'menu' | null = null;

  constructor() {
    super('map');
  }

  init(data: { mapId: string }) {
    this.def = MAPS[data.mapId];
    this.npcs = [];
    this.interactables.clear();
    this.exits.clear();
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

    for (const n of def.npcs) {
      this.npcs.push({
        def: n,
        actor: new Actor(this, n.sprite, n.x, n.y, n.facing ?? 'down'),
        talkIndex: 0,
        nextWander: this.time.now + 1500 + Math.random() * 3000,
      });
    }
    for (const e of def.exits) for (const [x, y] of e.tiles) this.exits.set(this.idx(x, y), e.lines);

    this.player = new Actor(this, 'hero', def.spawn.x, def.spawn.y, def.spawn.facing);

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
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat || uiBlocking()) return;
      // 這個按鍵已經被對話框或選單用掉了（例如用來關閉對話）
      if (e.timeStamp <= useGame.getState().uiClosedAt) return;
      if (['e', 'E', ' ', 'Enter'].includes(e.key)) this.queued = 'interact';
      else if (['x', 'X', 'Escape'].includes(e.key)) this.queued = 'menu';
    });

    useGame.getState().enterMap(def.name, def.subtitle);
    this.cameras.main.fadeIn(400, 0, 0, 0);
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
          const nearMountain = y < 8 || g[y - 1]?.[x] === '^';
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
      this.interactables.set(this.idx(b.x + st.door, b.y + st.h - 1), { label: `${b.name}的門`, lines: b.door });
      if (st.chimney) this.smoke(img.x + img.width - 13, img.y - img.height + 1);
    }
  }

  private placeProps() {
    for (const p of this.def.props) {
      const bottom = (p.y + 1) * TILE;
      this.add.image(p.x * TILE + TILE / 2, bottom, p.sprite).setOrigin(0.5, 1).setDepth(bottom);
      this.blocked[this.idx(p.x, p.y)] = 1;
      this.interactables.set(this.idx(p.x, p.y), { label: '查看', lines: p.lines });
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

  private isBlocked(x: number, y: number, self?: Actor): boolean {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return true;
    if (this.blocked[this.idx(x, y)]) return true;
    if (this.player && this.player !== self && this.player.tx === x && this.player.ty === y) return true;
    return this.npcs.some((n) => n.actor !== self && n.actor.tx === x && n.actor.ty === y);
  }

  private npcAt(x: number, y: number) {
    return this.npcs.find((n) => n.actor.tx === x && n.actor.ty === y);
  }

  private interact() {
    const f = this.player.front();
    const npc = this.npcAt(f.x, f.y);
    if (npc) {
      const opposite: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
      npc.actor.face(opposite[this.player.facing]);
      const lines = npc.def.talks[npc.talkIndex % npc.def.talks.length];
      npc.talkIndex++;
      useGame.getState().say(lines);
      return;
    }
    const it = this.interactables.get(this.idx(f.x, f.y));
    if (it) useGame.getState().say(it.lines);
  }

  private updatePrompt() {
    const f = this.player.front();
    const npc = this.npcAt(f.x, f.y);
    const it = f.x >= 0 && f.y >= 0 && f.x < this.w && f.y < this.h ? this.interactables.get(this.idx(f.x, f.y)) : undefined;
    useGame.getState().setPrompt(npc ? `與 ${npc.def.name} 交談` : it ? it.label : null);
  }

  private afterPlayerStep() {
    const lines = this.exits.get(this.idx(this.player.tx, this.player.ty));
    if (lines) {
      this.player.stand();
      useGame.getState().say(lines);
    }
  }

  // ── 每幀更新 ─────────────────────────────────────────────

  update(time: number) {
    const k = this.keys;

    if (uiBlocking()) {
      this.queued = null;
      if (!this.player.moving) this.player.stand();
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
      const r = n.def.wander ?? 0;
      if (!r || n.actor.moving || time < n.nextWander) continue;
      n.nextWander = time + 1800 + Math.random() * 3200;
      const dir = DIRS[Math.floor(Math.random() * 4)];
      const t = n.actor.front(dir);
      const inRange = Math.abs(t.x - n.def.x) <= r && Math.abs(t.y - n.def.y) <= r;
      if (!inRange || this.isBlocked(t.x, t.y, n.actor) || this.exits.has(this.idx(t.x, t.y))) {
        n.actor.face(dir);
        continue;
      }
      n.actor.step(dir, NPC_WALK_MS, () => n.actor.stand());
    }
  }
}
