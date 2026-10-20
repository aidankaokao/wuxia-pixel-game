import { mountDef } from '../mounts';
import { festivalIndex } from '../festival';
import Phaser from 'phaser';
import { Dir, NPC_WALK_MS, RUN_MS, TILE, VIEW_TILES_H, VIEW_TILES_W, WALK_MS } from '../constants';
import { tileArt } from '../art/tiles';
import { BUILDINGS } from '../art/props';
import { hash, makeCanvas } from '../art/pixel';
import { Actor } from '../entities/Actor';
import { getMap } from '../maps';
import { BLOCKING, BuildingDef, Line, MapDef, NpcDef, PropDef } from '../maps/types';
import { EventCtx, Script, ScriptAbort } from '../events';
import { Action, actionName, ACTIONS, availableActions, KEY_ACTION, personScript, personTitle } from '../story/social';
import { derive } from '../character';
import { ENCOUNTERS } from '../battle/enemies';
import type { Outcome } from '../battle/types';
import { autosave, setPositionProvider } from '../save';
import { npcPresent, periodOf, shichenStart, SHICHEN_INDEX, type Period } from '../time';
import { flag, uiBlocking, useGame } from '../../state/store';

interface Npc {
  def: NpcDef;
  actor: Actor | null;
  talkIndex: number;
  nextWander: number;
  /** 照作息出門或回來：一格一格走的路線 */
  path?: { x: number; y: number }[];
  /** 正在走去門口，走到就消失 */
  leaving?: boolean;
  /** 路被擋住時等了幾次 */
  waited?: number;
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
  private doors = new Map<number, { label: string; lines: Line[]; enter?: BuildingDef['enter'] }>();
  private props: Prop[] = [];
  private player!: Actor;
  private npcs: Npc[] = [];
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private turnUntil = 0;
  private lastDir: Dir | null = null;
  /** 按下確認／選單鍵時排入的動作，等主角站定後執行 */
  private queued: 'interact' | 'menu' | Action | null = null;
  /** 正在離開這張地圖（淡出中），不再處理任何操作 */
  private leaving = false;
  /** 日夜的染色、霧、雨 */
  private shade!: Phaser.GameObjects.Rectangle;
  private fog!: Phaser.GameObjects.Rectangle;
  private rain: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super('map');
  }

  init(data: SceneData) {
    this.data_ = data;
    // 找不到（例如房子已不存在）就回到村裡
    this.def = getMap(data.mapId) ?? getMap('qingzhu')!;
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
    this.refresh(true);

    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 1, 1, 0, TILE / 2);
    cam.setRoundPixels(true);
    this.fitZoom();
    this.buildAtmosphere();
    // 時辰、天氣一變：NPC 陸續出門或回房，畫面跟著換顏色
    const unsub = useGame.subscribe((s, prev) => {
      if (this.leaving || (s.world.time === prev.world.time && s.world.weather === prev.world.weather)) return;
      this.refresh();
      this.updateAtmosphere(true);
    });
    this.events.once('shutdown', unsub);
    this.scale.on('resize', this.fitZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.fitZoom, this));

    const kb = this.input.keyboard!;
    this.keys = kb.addKeys({
      up: 'UP', down: 'DOWN', left: 'LEFT', right: 'RIGHT',
      w: 'W', s: 'S', a: 'A', d: 'D', shift: 'SHIFT',
    }) as Record<string, Phaser.Input.Keyboard.Key>;
    kb.addCapture('E,X,SPACE,ENTER,ESC,F,G,R,T,H');
    // 用按鍵事件而非 JustDown：按下與放開落在同一幀時 JustDown 會漏掉
    this.events.once('shutdown', () => kb.off('keydown'));
    kb.on('keydown', (e: KeyboardEvent) => {
      // Ctrl/Cmd 組合鍵是快捷鍵（例如即時存檔），不當成遊戲操作
      if (e.repeat || e.ctrlKey || e.metaKey || uiBlocking()) return;
      // 這個按鍵已經被對話框或選單用掉了（例如用來關閉對話）
      if (e.timeStamp <= useGame.getState().uiClosedAt) return;
      if (['e', 'E', ' ', 'Enter'].includes(e.key)) this.queued = 'interact';
      else if (['x', 'X', 'Escape'].includes(e.key)) this.queued = 'menu';
      else if (KEY_ACTION[e.key.toLowerCase()]) this.queued = KEY_ACTION[e.key.toLowerCase()];
    });

    // 開發模式下讓自動化測試讀得到主角位置
    if (import.meta.env.DEV) {
      (window as unknown as { __wuxia: unknown }).__wuxia = {
        player: () => ({ map: this.def.id, x: this.player.tx, y: this.player.ty, facing: this.player.facing }),
        state: () => useGame.getState(),
        store: useGame,
        npcs: () => this.npcs.filter((n) => n.actor).map((n) => ({ id: n.def.id, x: n.actor!.tx, y: n.actor!.ty })),
        // 直接開打指定的遭遇戰（例如 'dog'、'camp'）
        battle: (encounter: string) => this.runScript(async (ctx) => void (await ctx.battle(encounter))),
        // 瞬間移動到指定地圖與位置（例如 'home:qz_east'）
        warp: (mapId: string, x: number, y: number, facing: Dir = 'up') => this.warp(mapId, { x, y, facing }),
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
        const i0 = use(tileArt(g, x, y, 0, this.def.theme));
        row.push(i0);
        if (g[y][x] === '~') water.push({ x, y, f: [i0, use(tileArt(g, x, y, 1, this.def.theme))] });
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
      this.doors.set(this.idx(b.x + st.door, b.y + st.h - 1), {
        label: b.enter ? `進入${b.name}` : `${b.name}的門`,
        lines: b.door,
        enter: b.enter,
      });
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

  /**
   * 依目前的劇情旗標與時辰，決定哪些 NPC、物件存在，以及物件的外觀。
   * 照作息出門、回房的人（不是剛進場景時）會從門口走進來、走到門口才消失，而不是突然出現或不見。
   */
  private refresh(initial = false) {
    const { flags, respawnAt, world } = useGame.getState();
    // 節慶擺設看的條件旗標：今天是第幾個節慶
    const f = { ...flags, festival: festivalIndex(world.day) };
    const now = Date.now();
    const outdoor = !this.def.theme;
    for (const n of this.npcs) {
      const down = (respawnAt[`${this.def.id}:${n.def.id}`] ?? 0) > now;
      const allowed = (!n.def.when || n.def.when(f)) && !down;
      const here = npcPresent(n.def, outdoor, world.time);
      // 出現時若主角剛好站在那一格，等下次再說
      const occupied = !n.actor && this.player && this.player.tx === n.def.x && this.player.ty === n.def.y;
      const show = allowed && here && !occupied;
      if (show && !n.actor) {
        const walkIn = !initial && !n.def.encounter ? this.pathFromGate(n.def.x, n.def.y) : null;
        const start = walkIn?.[0] ?? { x: n.def.x, y: n.def.y };
        n.actor = new Actor(this, n.def.sprite, start.x, start.y, n.def.facing ?? 'down');
        n.path = walkIn?.slice(1);
        n.leaving = false;
        n.nextWander = this.time.now + 1500 + Math.random() * 3000;
      } else if (show && n.actor && n.leaving) {
        // 正要出門又不用走了（例如時間倒回去）：走回原位
        n.leaving = false;
        n.path = this.findPath(n.actor.tx, n.actor.ty, (x, y) => x === n.def.x && y === n.def.y) ?? undefined;
      } else if (!show && n.actor && !n.leaving) {
        // 照作息出門：走到最近的門口或出口才消失；劇情旗標讓人消失的就直接不見
        const path = allowed && !initial && !n.def.encounter ? this.pathToGate(n.actor.tx, n.actor.ty) : null;
        if (path) {
          n.leaving = true;
          n.path = path;
          n.waited = 0;
        } else {
          n.actor.destroy();
          n.actor = null;
        }
      }
    }
    for (const p of this.props) {
      p.visible = !p.def.when || p.def.when(f);
      p.image.setVisible(p.visible);
      if (typeof p.def.sprite === 'function') p.image.setTexture(p.def.sprite(f));
    }
  }

  // ── 照作息走動 ───────────────────────────────────────────

  /** 沿著路線走一格；走完了，要出門的人就消失 */
  private followPath(n: Npc) {
    const a = n.actor!;
    const next = n.path!.shift();
    if (!next) {
      n.path = undefined;
      if (n.leaving) {
        a.destroy();
        n.actor = null;
        n.leaving = false;
      } else a.face(n.def.facing ?? 'down');
      return;
    }
    const dir: Dir = next.x > a.tx ? 'right' : next.x < a.tx ? 'left' : next.y > a.ty ? 'down' : 'up';
    if (this.isBlocked(next.x, next.y, a)) {
      // 被人擋住：等一下再走，等太久就直接到位（或直接離開）
      n.path!.unshift(next);
      a.face(dir);
      n.waited = (n.waited ?? 0) + 1;
      if (n.waited > 6) {
        n.path = [];
        if (!n.leaving) {
          a.destroy();
          n.actor = new Actor(this, n.def.sprite, n.def.x, n.def.y, n.def.facing ?? 'down');
        }
      }
      n.nextWander = this.time.now + 400;
      return;
    }
    n.waited = 0;
    a.step(dir, NPC_WALK_MS, () => a.stand());
  }

  /** 門口：出入口的格子，還有室外建築門前的那一格 */
  private gates(): { x: number; y: number }[] {
    const out = this.def.exits.flatMap((e) => e.tiles.map(([x, y]) => ({ x, y })));
    for (const key of this.doors.keys()) out.push({ x: key % this.w, y: Math.floor(key / this.w) + 1 });
    return out.filter((g) => this.inBounds(g.x, g.y) && !this.blocked[this.idx(g.x, g.y)]);
  }

  /** 從某格走到最近的門口的路線（不含起點）；走不到回傳 null */
  private pathToGate(x: number, y: number) {
    const gates = new Set(this.gates().map((g) => this.idx(g.x, g.y)));
    if (!gates.size) return null;
    return this.findPath(x, y, (gx, gy) => gates.has(this.idx(gx, gy)));
  }

  /** 從最近的門口走到某格的路線（第一格是門口） */
  private pathFromGate(x: number, y: number) {
    const back = this.pathToGate(x, y);
    if (!back?.length) return null;
    return [...back].reverse().concat({ x, y });
  }

  /** 廣度優先找路：只看地形與物件，不管其他人（走的時候遇到人再等） */
  private findPath(sx: number, sy: number, goal: (x: number, y: number) => boolean) {
    if (goal(sx, sy)) return [];
    const prev = new Map<number, number>();
    const start = this.idx(sx, sy);
    prev.set(start, -1);
    const queue = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const cx = cur % this.w;
      const cy = Math.floor(cur / this.w);
      for (const d of DIRS) {
        const nx = cx + (d === 'right' ? 1 : d === 'left' ? -1 : 0);
        const ny = cy + (d === 'down' ? 1 : d === 'up' ? -1 : 0);
        if (!this.inBounds(nx, ny)) continue;
        const ni = this.idx(nx, ny);
        if (prev.has(ni) || this.blocked[ni] || this.propAt(nx, ny)) continue;
        prev.set(ni, cur);
        if (goal(nx, ny)) {
          const path: { x: number; y: number }[] = [];
          for (let i = ni; i !== start; i = prev.get(i)!) path.unshift({ x: i % this.w, y: Math.floor(i / this.w) });
          return path;
        }
        queue.push(ni);
      }
    }
    return null;
  }

  // ── 日夜與天氣 ───────────────────────────────────────────

  /** 蓋在整個畫面上的染色層與霧，還有雨絲（只在室外） */
  private buildAtmosphere() {
    const cam = this.cameras.main;
    const big = 8000;
    this.shade = this.add.rectangle(cam.width / 2, cam.height / 2, big, big, 0x000000, 0).setScrollFactor(0).setDepth(900000);
    this.fog = this.add.rectangle(cam.width / 2, cam.height / 2, big, big, 0xd8dee6, 0).setScrollFactor(0).setDepth(900002);
    if (!this.textures.exists('raindrop')) {
      const [c, ctx] = makeCanvas(1, 5);
      ctx.fillStyle = '#c8d8f0';
      ctx.fillRect(0, 0, 1, 5);
      this.textures.addCanvas('raindrop', c);
    }
    this.rain = null;
    this.updateAtmosphere(false);
  }

  private updateAtmosphere(animate: boolean) {
    const { time, weather } = useGame.getState().world;
    const outdoor = !this.def.theme;
    // 室內點了燈，夜裡沒有室外那麼暗
    const SHADE: Record<Period, [number, number, number]> = {
      // 早晨就是白天的樣子（起霧是天氣，不是時段）
      dawn: [0x000000, 0, 0],
      day: [0x000000, 0, 0],
      dusk: [0xd06a28, 0.3, 0.12],
      night: [0x0a1238, 0.6, 0.25],
    };
    const [color, outAlpha, inAlpha] = SHADE[periodOf(time)];
    let alpha = outdoor ? outAlpha : inAlpha;
    let tint = color;
    // 陰天、雨天：室外再暗一點、偏灰
    if (outdoor && (weather === 'cloudy' || weather === 'rain') && alpha < 0.2) {
      tint = alpha ? color : 0x505a68;
      alpha = Math.max(alpha, weather === 'rain' ? 0.2 : 0.12);
    }
    // setFillStyle 不給透明度會變成不透明，要帶上目前的值
    this.shade.setFillStyle(tint, this.shade.fillAlpha);
    const fogAlpha = outdoor && weather === 'fog' ? 0.24 : 0;
    if (animate) {
      this.tweens.add({ targets: this.shade, fillAlpha: alpha, duration: 600 });
      this.tweens.add({ targets: this.fog, fillAlpha: fogAlpha, duration: 600 });
    } else {
      this.shade.fillAlpha = alpha;
      this.fog.fillAlpha = fogAlpha;
    }
    const raining = outdoor && weather === 'rain';
    if (raining && !this.rain) this.rain = this.makeRain();
    else if (!raining && this.rain) {
      this.rain.stop();
      const r = this.rain;
      this.time.delayedCall(1500, () => r.destroy());
      this.rain = null;
    }
  }

  /** 雨絲：在鏡頭看得到的範圍上方生成，斜斜落下（用地圖座標，每幀跟著鏡頭移動生成的位置） */
  private makeRain() {
    // 剛建好場景時鏡頭的 worldView 還沒算出來，可視範圍改用畫面尺寸 ÷ 縮放倍率
    const cam = this.cameras.main;
    const vw = cam.width / cam.zoom;
    const vh = cam.height / cam.zoom;
    return this.add
      .particles(cam.worldView.x, cam.worldView.y, 'raindrop', {
        x: { min: -30, max: vw + 30 },
        y: { min: -12, max: vh * 0.6 },
        speedY: { min: 200, max: 260 },
        speedX: { min: -40, max: -25 },
        lifespan: { min: 400, max: 900 },
        quantity: 3,
        frequency: 16,
        alpha: { start: 0.75, end: 0.25 },
      })
      .setDepth(900001);
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
    const { width, height } = this.scale.gameSize;
    const z = Math.floor(Math.min(width / (VIEW_TILES_W * TILE), height / (VIEW_TILES_H * TILE)));
    const cam = this.cameras.main;
    cam.setZoom(forced > 0 ? forced : Phaser.Math.Clamp(z, 2, 6));
    // 地圖比畫面小（例如室內）時，把邊界往外撐，讓地圖置中
    const vw = width / cam.zoom;
    const vh = height / cam.zoom;
    const mw = this.w * TILE;
    const mh = this.h * TILE;
    cam.setBounds(mw < vw ? (mw - vw) / 2 : 0, mh < vh ? (mh - vh) / 2 : 0, Math.max(mw, vw), Math.max(mh, vh));
  }

  // ── 碰撞與互動 ───────────────────────────────────────────

  private inBounds(x: number, y: number) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  private propAt(x: number, y: number) {
    return this.props.find((p) => p.visible && !p.def.passable && y === p.def.y && x >= p.def.x && x < p.def.x + (p.def.w ?? 1));
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
      } else if (npc.def.person) {
        this.runScript(personScript(npc.def.person, 'talk')!);
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
    if (door?.enter) this.warp(door.enter.to, door.enter.spawn);
    else if (door) this.runScript((ctx) => ctx.say(...door.lines));
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
    if (npc?.def.person) {
      const id = npc.def.person;
      useGame.getState().setPrompt({
        title: personTitle(id),
        actions: availableActions(id).map((a) => ({ key: ACTIONS[a].key, label: actionName(id, a) })),
      });
      return;
    }
    useGame
      .getState()
      .setPrompt(
        npc?.def.encounter
          ? `與 ${npc.def.name} 交手`
          : talkable
            ? `與 ${npc.def.name} 交談`
            : prop
              ? (prop.def.label ?? '查看')
              : door
                ? door.label
                : null,
      );
  }

  private afterPlayerStep() {
    const { tx, ty } = this.player;
    const exit = this.def.exits.find((e) => e.tiles.some(([x, y]) => x === tx && y === ty));
    if (exit) {
      this.player.stand();
      // 在室外地圖之間移動花一刻；進出屋子不花時間（室內地圖都有 theme）
      if (exit.to && !this.def.theme && !getMap(exit.to)?.theme) useGame.getState().passTime(1);
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
      pass: (ke) => void st().passTime(ke),
      refresh: () => this.refresh(),
      reload: (arrive) => this.warp(this.def.id, { x: this.player.tx, y: this.player.ty, facing: this.player.facing }, arrive),
      panel: (p) => st().openPanel(p),
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
      // 打一場花一刻
      useGame.getState().passTime(1);
      if (o === 'lose' && ENCOUNTERS[encounter]?.spar) {
        // 切磋輸了：點到為止，留一成氣血
        useGame.getState().updateHero((c) => {
          c.hp = Math.max(c.hp, Math.ceil(derive(c).maxHp * 0.1));
        });
        return o;
      }
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
    if (this.rain) this.rain.setPosition(this.cameras.main.worldView.x, this.cameras.main.worldView.y);

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
    if (action) {
      // 切磋、贈禮、請教、交易：面對的人有開放這件事才執行
      const npc = this.npcAt(this.player.front().x, this.player.front().y);
      const script = npc?.actor && npc.def.person ? personScript(npc.def.person, action) : null;
      if (script) {
        npc!.actor!.face(OPPOSITE[this.player.facing]);
        this.runScript(script);
        return;
      }
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
      // 往可以進去的門走，就直接進屋
      const door = this.inBounds(t.x, t.y) ? this.doors.get(this.idx(t.x, t.y)) : undefined;
      if (door?.enter && dir === 'up') {
        this.warp(door.enter.to, door.enter.spawn);
        return;
      }
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
    // 騎著馬在室外走得比較快（室內照樣步行）
    const hero = useGame.getState().hero;
    const horse = !this.def.theme && hero.riding ? mountDef(hero.mount) : undefined;
    const ms = (k.shift.isDown ? RUN_MS : WALK_MS) / (horse?.speed ?? 1);
    this.player.step(dir, ms, () => this.afterPlayerStep());
  }

  private heldDir(): Dir | null {
    const k = this.keys;
    // 按著 Ctrl/Cmd 時（例如 Ctrl+S 即時存檔）不移動
    const on = (key: Phaser.Input.Keyboard.Key) => key.isDown && !key.ctrlKey && !key.metaKey;
    if (on(k.up) || on(k.w)) return 'up';
    if (on(k.down) || on(k.s)) return 'down';
    if (on(k.left) || on(k.a)) return 'left';
    if (on(k.right) || on(k.d)) return 'right';
    return null;
  }

  private updateNpcs(time: number) {
    // 主角正面對著的人停下來，不會聊到一半走開
    const f = this.player.front();
    const clock = useGame.getState().world.time;
    // 夜裡回房的人，卯時起床後到出門前會在房裡走動
    const morning = clock >= shichenStart(SHICHEN_INDEX.卯) && clock < shichenStart(SHICHEN_INDEX.午);
    for (const n of this.npcs) {
      const a = n.actor;
      if (a && n.path) {
        if (!a.moving && time >= n.nextWander) this.followPath(n);
        continue;
      }
      const r = n.def.wander ?? (n.def.night && morning ? 1 : 0);
      if (!a || !r || a.moving || time < n.nextWander) continue;
      if (a.tx === f.x && a.ty === f.y) continue;
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
