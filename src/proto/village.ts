import * as THREE from 'three';
// 照遊戲本體的順序載入地圖與劇情（直接載入 life_towns 會碰上循環引用）
import '../game/maps/index';
import { BUILDINGS } from '../game/art/props';
import { lifeGroups } from '../game/life';
import { qingzhu } from '../game/maps/qingzhu';
import { BLOCKING, type MapDef } from '../game/maps/types';
import { building, textBoard } from './buildings';
import { figure, type Figure } from './chars';
import { ask, busy, say, shop, wallet, type Line } from './ui';
import { PEOPLE } from '../game/story/people';
import type { LifeNpc } from '../game/life';
import { snowable } from './env';
import { Batch, h01, label, type ProtoScene, type SceneCtx } from './scene';

/**
 * 試作品・村莊：直接讀遊戲裡青竹村的地圖資料（字元格子、建築、擺設），蓋成立體的模型。
 * - 山（^）依周圍有幾格山而隆起，水（~）往下凹，路、田、廣場貼在地面上。
 * - 地面是素色色塊，樹、竹、石、花、田、柵欄、房子都是低多邊形。
 * - 主角用方向鍵走（相對鏡頭方向），村民在自己的位置附近走動。
 */

const ROCK_TOP = new THREE.Color('#8e8a78');
const GROUND: Record<string, string> = { ':': '#c9a46a', E: '#c9a46a', '=': '#b9b3a4', n: '#8a6040', c: '#7a5a3a', g: '#8b5e3c', '~': '#3a5f86', '#': '#a8763f' };

/** 顧攤子的人：站哪、面向哪、賣什麼（貨郎照遊戲裡陶四的貨） */
const STALLS: Record<string, { x: number; y: number; yaw: number; title: string; stock: string[]; greet: string }> = {
  tao: { x: 32, y: 22, yaw: -Math.PI / 2, title: '陶四的貨郎攤', stock: ['jinchuang', 'tea', 'herb', 'rice', 'flour', 'egg', 'greens', 'sugar'], greet: '走過路過不要錯過！傷藥、茶葉、草藥，樣樣都有。獸皮、獸肉也收！' },
  zhong: { x: 32, y: 17, yaw: 0, title: '鍾嬸的茶攤', stock: ['tea', 'egg'], greet: '來啦！坐下喝碗茶歇歇腳？' },
};

/** 沒有寫台詞的擺設 */
const PROP_TEXT: Record<string, Line[]> = {
  well: [{ text: '一口老井，井水清涼。' }, { text: '（試作品裡還不能打水）' }],
  stele: [{ text: '路邊的石碑，字跡被風雨磨得模糊了。' }],
};

/** 村民說的話：有人物檔案的照遊戲裡「初識」那一階的台詞輪流說，沒有的照日常台詞 */
function linesOf(n: LifeNpc, i: number): Line[] {
  const fill = (t: string, call: string) => t.replace(/\{稱\}/g, call).replace(/\{姓\}/g, '無').replace(/\{名\}/g, '名');
  const p = n.person ? PEOPLE[n.person] : undefined;
  if (p) {
    const call = fill(p.address(0, 0), '');
    const pool = [...(p.lines[0] ?? Object.values(p.lines)[0] ?? []), ...p.idle].filter((c): c is Line[] => Array.isArray(c));
    if (pool.length) return pool[i % pool.length].map((l) => ({ speaker: l.speaker ?? n.name, text: fill(l.text, call) }));
  }
  const talks = n.talks?.default;
  if (talks?.length) return talks[i % talks.length];
  return [{ text: `${n.name}朝你點點頭，又忙自己的事去了。` }];
}

export function villageScene(ctx: SceneCtx, def: MapDef = qingzhu): ProtoScene {
  const { env } = ctx;
  const tiles = def.tiles;
  const H = tiles.length;
  const W = tiles[0].length;
  const ox = -W / 2;
  const oz = -H / 2;
  const at = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < W ? tiles[y][x] : '^');
  const root = new THREE.Group();

  // ── 高度 ──
  const height = (x: number, y: number): number => {
    const c = at(x, y);
    if (c === '~') return -0.4;
    if (c !== '^') return 0;
    let n = 0;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (at(x + dx, y + dy) === '^') n++;
    return 0.6 + (n / 25) * 2.2 + h01(x, y, 3) * 0.5;
  };
  const hs = Array.from({ length: H }, (_, y) => Array.from({ length: W }, (_, x) => height(x, y)));
  const hAt = (x: number, y: number) => (y >= 0 && y < H && x >= 0 && x < W ? hs[y][x] : -1);

  // ── 地面：每格一個頂面，比鄰格高就補側面 ──
  const pos: number[] = [];
  const col: number[] = [];
  const idx: number[] = [];
  const quad = (p: number[][], color: THREE.Color) => {
    const base = pos.length / 3;
    for (const v of p) pos.push(...v);
    for (let i = 0; i < 4; i++) col.push(color.r, color.g, color.b);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  };
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const c = tiles[y][x];
      const h = hs[y][x];
      const x0 = x + ox;
      const z0 = y + oz;
      const v = h01(x, y);
      let top: THREE.Color;
      if (c === '^') top = ROCK_TOP.clone().lerp(new THREE.Color('#b4ae98'), Math.min(1, h / 3)).multiplyScalar(0.92 + v * 0.12);
      else if (GROUND[c]) top = new THREE.Color(GROUND[c]).multiplyScalar(0.95 + v * 0.1);
      else top = new THREE.Color('#7cb262').lerp(new THREE.Color('#93c271'), v);
      if (c === 'n' && y % 2) top.multiplyScalar(0.85);
      // 頂面（順序：左上、右上、右下、左下）
      quad([[x0, h, z0], [x0 + 1, h, z0], [x0 + 1, h, z0 + 1], [x0, h, z0 + 1]], top);
      // 側面：四個方向比鄰格高的地方
      const side = top.clone().multiplyScalar(c === '^' ? 0.72 : 0.6);
      const dirs: [number, number, number[][]][] = [
        [0, -1, [[x0 + 1, h, z0], [x0, h, z0]]],
        [1, 0, [[x0 + 1, h, z0 + 1], [x0 + 1, h, z0]]],
        [0, 1, [[x0, h, z0 + 1], [x0 + 1, h, z0 + 1]]],
        [-1, 0, [[x0, h, z0], [x0, h, z0 + 1]]],
      ];
      for (const [dx, dy, [a, b]] of dirs) {
        const nh = hAt(x + dx, y + dy);
        if (nh >= h) continue;
        quad([[a[0], h, a[2]], [b[0], h, b[2]], [b[0], nh, b[2]], [a[0], nh, a[2]]], side);
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const groundMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 });
  const ground = new THREE.Mesh(geo, snowable(groundMat));
  ground.receiveShadow = true;
  ground.castShadow = true;
  root.add(ground);
  // 水面
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(W, H),
    new THREE.MeshStandardMaterial({ color: '#4a8cc8', transparent: true, opacity: 0.8, roughness: 0.15, metalness: 0.1 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.12;
  water.receiveShadow = true;
  root.add(water);

  // ── 擋路的格子 ──
  const blocked = new Set<number>();
  const key = (x: number, y: number) => y * W + x;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (BLOCKING.has(tiles[y][x])) blocked.add(key(x, y));

  // ── 植物、石頭、田、柵欄 ──
  const env3 = (x: number, y: number, dy = 0) => new THREE.Vector3(x + 0.5 + ox, dy, y + 0.5 + oz);
  {
    const m = (color: string) => snowable(new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }));
    const trunk = new Batch(new THREE.CylinderGeometry(0.07, 0.11, 0.6, 5).translate(0, 0.3, 0), m('#6a4a2a'));
    const pineA = new Batch(new THREE.ConeGeometry(0.5, 0.9, 7).translate(0, 0.75, 0), m('#ffffff'));
    const pineB = new Batch(new THREE.ConeGeometry(0.36, 0.7, 7).translate(0, 1.2, 0), m('#ffffff'));
    const round = new Batch(new THREE.IcosahedronGeometry(0.52, 0).translate(0, 0.95, 0), m('#ffffff'));
    const cane = new Batch(new THREE.CylinderGeometry(0.035, 0.04, 1, 5).translate(0, 0.5, 0), m('#7aa648'));
    const leaf = new Batch(new THREE.ConeGeometry(0.22, 0.4, 5), m('#5a8a32'));
    const rock = new Batch(new THREE.DodecahedronGeometry(0.34, 0), m('#8e8a80'));
    const flower = new Batch(new THREE.SphereGeometry(0.06, 5, 4), m('#ffffff'));
    const sprout = new Batch(new THREE.ConeGeometry(0.04, 0.2, 4).translate(0, 0.1, 0), m('#86c255'));
    const bush = new Batch(new THREE.SphereGeometry(0.3, 7, 5), m('#3f7a34'));
    const post = new Batch(new THREE.BoxGeometry(0.1, 0.5, 0.1).translate(0, 0.25, 0), m('#9a6a3a'));
    const railX = new Batch(new THREE.BoxGeometry(1, 0.06, 0.05), m('#9a6a3a'));
    const railZ = new Batch(new THREE.BoxGeometry(0.05, 0.06, 1), m('#9a6a3a'));
    const FLOWERS = ['#f2c230', '#ffffff', '#e86a92', '#e8603c'];
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const c = tiles[y][x];
        const r = h01(x, y, 9);
        const p = env3(x, y);
        if (c === 'T') {
          const s = 0.85 + r * 0.35;
          trunk.add(p, s);
          const nearMountain = y < 8 || at(x, y - 1) === '^';
          if (nearMountain || r < 0.25) {
            const g = new THREE.Color('#2f6a3a').multiplyScalar(0.85 + r * 0.3);
            pineA.add(p, s, r * 6, g);
            pineB.add(p, s, r * 6, g);
          } else round.add(p, s, r * 6, new THREE.Color('#4f9a48').lerp(new THREE.Color('#6aae4a'), r));
        } else if (c === 'Y') {
          for (let i = 0; i < 4; i++) {
            const q = p.clone().add(new THREE.Vector3((h01(x, y, i) - 0.5) * 0.6, 0, (h01(x, y, i + 9) - 0.5) * 0.6));
            const hh = 1.4 + h01(x, y, i + 20) * 0.7;
            cane.add(q, new THREE.Vector3(1, hh, 1));
            leaf.add(q.clone().setY(hh), 1, i);
          }
        } else if (c === 'o') rock.add(p.clone().setY(0.12), new THREE.Vector3(1, 0.7, 1), r * 6);
        else if (c === '*') for (let i = 0; i < 5; i++) flower.add(p.clone().add(new THREE.Vector3(h01(x, y, i) - 0.5, 0.08, h01(x, y, i + 5) - 0.5)), 1, 0, FLOWERS[(i + x) % 4]);
        else if (c === 'n') for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) sprout.add(p.clone().add(new THREE.Vector3(i * 0.3 - 0.3, 0, j * 0.3 - 0.3)), 0.8 + h01(x + i, y + j) * 0.5);
        else if (c === 'c') for (const dx of [-0.25, 0.25]) bush.add(p.clone().add(new THREE.Vector3(dx, 0.15, 0)), new THREE.Vector3(1, 0.7, 1.2));
        else if (c === 'f') {
          post.add(p);
          if (at(x + 1, y) === 'f') railX.add(p.clone().add(new THREE.Vector3(0.5, 0.35, 0)));
          if (at(x, y + 1) === 'f') railZ.add(p.clone().add(new THREE.Vector3(0, 0.35, 0.5)));
        }
      }
    for (const b of [trunk, pineA, pineB, round, cane, leaf, rock, flower, sprout, bush, post, railX, railZ]) {
      const mesh = b.build();
      if (mesh) root.add(mesh);
    }
  }

  // ── 房子 ──
  for (const b of def.buildings) {
    const st = BUILDINGS[b.style];
    const built = building(st, { sign: b.sign, flag: b.flag });
    built.obj.position.set(b.x + ox, 0, b.y + oz);
    root.add(built.obj);
    built.lamps.forEach((l) => env.lamps.push(l.clone().add(built.obj.position)));
    env.lampMats.push(...built.lampMats);
    for (let y = b.y; y < b.y + st.h; y++) for (let x = b.x; x < b.x + st.w; x++) blocked.add(key(x, y));
    const lb = label(b.name);
    lb.position.set(st.w / 2, 3.1, st.h / 2);
    built.obj.add(lb);
  }

  // ── 擺設：井、告示、木牌、石碑、攤子、燈籠柱 ──
  for (const p of def.props) {
    const sprite = typeof p.sprite === 'string' ? p.sprite : 'sign';
    const w = p.w ?? 1;
    for (let i = 0; i < w; i++) blocked.add(key(p.x + i, p.y));
    const at3 = new THREE.Vector3(p.x + w / 2 + ox, 0, p.y + 0.5 + oz);
    if (sprite === 'lantern_post') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.6, 5), new THREE.MeshStandardMaterial({ color: '#5a3a22' }));
      pole.position.copy(at3).setY(0.8);
      const m = new THREE.MeshStandardMaterial({ color: '#c8302a', emissive: '#ff5a2a', emissiveIntensity: 0.2 });
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), m);
      lamp.position.copy(at3).setY(1.55);
      lamp.scale.y = 1.3;
      env.lampMats.push(m);
      env.lamps.push(lamp.position.clone());
      root.add(pole, lamp);
      continue;
    }
    // 簡單的立體擺設
    const g = new THREE.Group();
    const m = (c: string) => snowable(new THREE.MeshStandardMaterial({ color: c, flatShading: true }));
    if (sprite === 'well') {
      g.add(new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 0.45, 10, 1, true), m('#8e8a80')));
      g.children[0].position.y = 0.22;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.4, 4), m('#6a4a3a'));
      roof.position.y = 1.3;
      roof.rotation.y = Math.PI / 4;
      g.add(roof);
      for (const dx of [-0.4, 0.4]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.1, 0.06), m('#6a4428'));
        post.position.set(dx, 0.6, 0);
        g.add(post);
      }
    } else if (sprite === 'stall') {
      const t = new THREE.Mesh(new THREE.BoxGeometry(w * 0.9, 0.5, 0.6), m('#8a6a42'));
      t.position.y = 0.25;
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(w, 0.06, 0.9), m('#c84a3a'));
      canopy.position.y = 1.3;
      canopy.rotation.x = 0.2;
      g.add(t, canopy);
      for (const dx of [-w / 2 + 0.1, w / 2 - 0.1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), m('#6a4428'));
        post.position.set(dx, 0.65, -0.3);
        g.add(post);
      }
    } else if (sprite === 'stele') {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.2, 0.25), m('#8a8a86'));
      s.position.y = 0.6;
      g.add(s);
    } else {
      // 木牌、告示欄
      const board = sprite === 'bulletin' ? textBoard('告示', 1.1, 0.6, false, '#d8c8a0', '#3a2418') : textBoard('', 0.7, 0.4, false, '#b08a5a', '#6a4428');
      board.position.y = sprite === 'bulletin' ? 1.0 : 0.85;
      g.add(board);
      for (const dx of sprite === 'bulletin' ? [-0.5, 0.5] : [0]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.07, sprite === 'bulletin' ? 1.3 : 0.9, 0.07), m('#6a4428'));
        post.position.set(dx, sprite === 'bulletin' ? 0.65 : 0.45, -0.02);
        g.add(post);
      }
    }
    g.traverse((c) => ((c.castShadow = true), (c.receiveShadow = true)));
    g.position.copy(at3);
    root.add(g);
  }

  // ── 人：主角與村民 ──
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && !blocked.has(key(x, y));
  const hero = figure('hero');
  const heroPos = new THREE.Vector2(def.spawn.x + 0.5, def.spawn.y + 0.5);
  root.add(hero.obj);
  interface Walker {
    f: Figure;
    npc: LifeNpc;
    home: THREE.Vector2;
    p: THREE.Vector2;
    goal: THREE.Vector2 | null;
    wait: number;
    /** 顧攤子的人站著不走 */
    fixed?: boolean;
    said: number;
  }
  const walkers: Walker[] = [];
  const group = lifeGroups().find((g) => g.id === 'qingzhu');
  const spots = (group?.spots ?? []).filter((s) => s.map === def.id && free(s.x, s.y));
  (group?.npcs ?? []).slice(0, 11).forEach((n, i) => {
    const stall = STALLS[n.id];
    const s = stall ? { x: stall.x, y: stall.y } : spots[(i * 5) % Math.max(1, spots.length)];
    if (!s) return;
    const f = figure(n.sprite);
    if (stall) f.yaw = stall.yaw;
    root.add(f.obj);
    const lb = label(n.name, 'p-name');
    lb.position.y = 1.35;
    f.obj.add(lb);
    walkers.push({ f, npc: n, home: new THREE.Vector2(s.x + 0.5, s.y + 0.5), p: new THREE.Vector2(s.x + 0.5, s.y + 0.5), goal: null, wait: Math.random() * 3, fixed: !!stall, said: 0 });
  });

  // ── 互動：E 跟面前的人說話、查看擺設 ──
  type Target = { kind: 'npc'; w: Walker; at: THREE.Vector2 } | { kind: 'prop'; p: (typeof def.props)[number]; at: THREE.Vector2 };
  const targets = (): Target[] => [
    ...walkers.map((w) => ({ kind: 'npc' as const, w, at: w.p })),
    ...def.props.filter((p) => !p.when).map((p) => ({ kind: 'prop' as const, p, at: new THREE.Vector2(p.x + (p.w ?? 1) / 2, p.y + 0.5) })),
  ];
  /** 面前最近的東西：1.5 格內、大致在前方（太近的不管方向） */
  const facing = (): Target | null => {
    const dir = new THREE.Vector2(Math.sin(hero.yaw), Math.cos(hero.yaw));
    let best: Target | null = null;
    let bd = Infinity;
    for (const t of targets()) {
      const d = t.at.clone().sub(heroPos);
      const len = d.length();
      if (len > 1.6 || (len > 0.9 && d.normalize().dot(dir) < 0.35)) continue;
      // 人比擺設優先（站在攤子旁邊時先找顧攤的人）
      const score = len + (t.kind === 'prop' ? 2 : 0);
      if (score < bd) (bd = score), (best = t);
    }
    return best;
  };
  // 給自動化測試用：把主角放到某一格、面向某個方向
  Object.assign(window, { __protoWarp: (x: number, y: number, yaw = 0) => (heroPos.set(x + 0.5, y + 0.5), (hero.yaw = yaw)) });
  const hint = label('', 'p-hint');
  root.add(hint);
  let talking = false;
  async function interact(t: Target) {
    talking = true;
    keys.clear();
    if (t.kind === 'prop') {
      const lines = t.p.lines ?? PROP_TEXT[typeof t.p.sprite === 'string' ? t.p.sprite : ''] ?? [{ text: '沒什麼特別的。' }];
      await say(...lines);
    } else {
      const w = t.w;
      const n = w.npc;
      // 轉過來面向你
      const d = heroPos.clone().sub(w.p);
      w.f.yaw = Math.atan2(d.x, d.y);
      w.goal = null;
      const stall = STALLS[n.id];
      const talk = () => say(...linesOf(n, w.said++));
      if (stall) {
        const c = await ask({ speaker: n.name, text: stall.greet }, ['聊聊', '買賣東西', '不用了']);
        if (c === 0) await talk();
        else if (c === 1) await shop(stall.title, stall.stock);
      } else await talk();
      if (stall) w.f.yaw = stall.yaw;
    }
    talking = false;
  }

  const keys = new Set<string>();
  const focus = new THREE.Vector3();
  const tmp = new THREE.Vector2();
  const can = (x: number, y: number) => free(Math.floor(x), Math.floor(y));

  return {
    root,
    focus,
    key(code, down) {
      if (talking || busy()) return true;
      if (down && (code === 'KeyE' || code === 'Space' || code === 'Enter')) {
        const t = facing();
        if (t) void interact(t);
        return true;
      }
      if (!code.startsWith('Arrow') && code !== 'ShiftLeft' && code !== 'ShiftRight') return false;
      if (down) keys.add(code);
      else keys.delete(code);
      return true;
    },
    update(dt, cam) {
      // 主角：方向鍵相對鏡頭
      const f = new THREE.Vector2(-Math.sin(cam.yaw), -Math.cos(cam.yaw));
      const r = new THREE.Vector2(Math.cos(cam.yaw), -Math.sin(cam.yaw));
      tmp.set(0, 0);
      if (keys.has('ArrowUp')) tmp.add(f);
      if (keys.has('ArrowDown')) tmp.sub(f);
      if (keys.has('ArrowRight')) tmp.add(r);
      if (keys.has('ArrowLeft')) tmp.sub(r);
      const moving = tmp.lengthSq() > 0 && !talking;
      if (moving) {
        tmp.normalize().multiplyScalar(dt * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? 7 : 3.2));
        const R = 0.28;
        const nx = heroPos.x + tmp.x;
        const ny = heroPos.y + tmp.y;
        if (can(nx + Math.sign(tmp.x) * R, heroPos.y)) heroPos.x = nx;
        if (can(heroPos.x, ny + Math.sign(tmp.y) * R)) heroPos.y = ny;
        hero.yaw = Math.atan2(tmp.x, tmp.y);
      }
      hero.obj.position.set(heroPos.x + ox, 0, heroPos.y + oz);
      hero.tick(dt, moving);
      focus.lerp(hero.obj.position.clone().setY(0.6), Math.min(1, dt * 6));
      // 面前有人或東西：頭上提示按 E
      const t = talking ? null : facing();
      hint.visible = !!t;
      (hint.element as HTMLElement).style.display = t ? '' : 'none';
      if (t) {
        hint.element.textContent = t.kind === 'npc' ? `E 交談` : 'E 查看';
        hint.position.set(t.at.x + ox, t.kind === 'npc' ? 1.75 : 1.5, t.at.y + oz);
      }
      // 村民：在自己的位置附近走走停停（顧攤子的、正在說話的不走）
      for (const w of walkers) {
        if (!w.goal && !w.fixed && !talking) {
          w.wait -= dt;
          if (w.wait <= 0) {
            const gx = Math.floor(w.home.x + (Math.random() - 0.5) * 6);
            const gy = Math.floor(w.home.y + (Math.random() - 0.5) * 6);
            if (free(gx, gy)) w.goal = new THREE.Vector2(gx + 0.5, gy + 0.5);
            w.wait = 2 + Math.random() * 4;
          }
        }
        let wm = false;
        if (w.goal) {
          const d = w.goal.clone().sub(w.p);
          if (d.length() < 0.05) w.goal = null;
          else {
            d.normalize().multiplyScalar(Math.min(d.length(), dt * 1.6));
            if (can(w.p.x + d.x, w.p.y + d.y)) {
              w.p.add(d);
              w.f.yaw = Math.atan2(d.x, d.y);
              wm = true;
            } else w.goal = null;
          }
        }
        w.f.obj.position.set(w.p.x + ox, 0, w.p.y + oz);
        w.f.tick(dt, wm);
      }
    },
    info: () => `${def.name}　方向鍵走路（Shift 跑）、E 跟面前的人說話或查看東西・陶四（村口南邊的貨郎攤）、鍾嬸（茶寮門口）可以買賣　銀兩 ${wallet.silver}`,
  };
}
