import * as THREE from 'three';
import { EDGES, LI_PER_KE, NODES, WORLD_H, WORLD_W, worldTerrain, type Terrain } from '../game/world/geo';
import { figure } from './chars';
import { snowable } from './env';
import { Batch, h01, label, type ProtoScene, type SceneCtx } from './scene';

/**
 * 試作品・大地圖（自由走動）：照遊戲裡江南的地形（worldTerrain，每格一塊地）堆成一整片連續起伏的低多邊形地面，
 * 山高、水低、平原平。原本的道路鋪成土路。主角用方向鍵在地圖上自由走（相對鏡頭方向），不必沿著路線；
 * 水和高峰過不去（有路經過的渡口、橋例外）。走過的地形決定花多少時間：路最快、山地最慢。
 * 走到據點旁邊按 E 進去（試作品只做了青竹村）。
 */

const HEIGHT: Record<Terrain, number> = { sea: -0.7, shallow: -0.5, river: -0.45, lake: -0.45, beach: 0.05, plain: 0.15, forest: 0.22, hill: 0.75, mount: 1.7, peak: 2.8 };
const COLOR: Record<Terrain, string> = {
  sea: '#2f6aa8', shallow: '#4a8cc4', river: '#4a8cc4', lake: '#4a90c8', beach: '#e0cf98',
  plain: '#8cc06a', forest: '#5e9a4a', hill: '#a8b070', mount: '#8e8a78', peak: '#e8e8ec',
};
const NAME: Record<Terrain, string> = { sea: '海', shallow: '淺灘', river: '河', lake: '湖', beach: '沙岸', plain: '平原', forest: '林地', hill: '丘陵', mount: '山地', peak: '高峰' };
/** 走一格花幾刻（null 過不去）；有路的格子另算 */
const COST: Record<Terrain, number | null> = { sea: null, shallow: null, river: null, lake: null, beach: 1, plain: 1, forest: 1.5, hill: 2, mount: 3.5, peak: null };
const ROAD_COST = 0.5;

export function worldScene(ctx: SceneCtx): ProtoScene {
  const root = new THREE.Group();
  const terr = worldTerrain();
  const ox = -WORLD_W / 2;
  const oz = -WORLD_H / 2;
  const tAt = (x: number, y: number) => terr[Math.max(0, Math.min(WORLD_H - 1, y))][Math.max(0, Math.min(WORLD_W - 1, x))];
  const road = new Set<number>();
  for (const e of EDGES) for (const [x, y] of e.path) road.add(y * WORLD_W + x);
  const isRoad = (x: number, y: number) => road.has(y * WORLD_W + x);
  const nodeAt = new Map(NODES.map((n) => [n.y * WORLD_W + n.x, n]));

  // ── 地面：每個格點的高度取周圍四格的平均，連成一片起伏的地面 ──
  const cellH = (x: number, y: number) => {
    const t = tAt(x, y);
    let h = HEIGHT[t] + (t === 'hill' || t === 'mount' || t === 'peak' ? h01(x, y) * 0.5 : 0);
    if ((isRoad(x, y) || nodeAt.has(y * WORLD_W + x)) && h < 0.1) h = 0.1;
    return h;
  };
  const vh = Array.from({ length: WORLD_H + 1 }, (_, y) =>
    Array.from({ length: WORLD_W + 1 }, (_, x) => (cellH(x - 1, y - 1) + cellH(x, y - 1) + cellH(x - 1, y) + cellH(x, y)) / 4),
  );
  /** 地圖上某一點（格子座標）的地面高度 */
  const groundAt = (x: number, y: number) => {
    const cx = Math.max(0, Math.min(WORLD_W - 0.001, x));
    const cy = Math.max(0, Math.min(WORLD_H - 0.001, y));
    const ix = Math.floor(cx);
    const iy = Math.floor(cy);
    const fx = cx - ix;
    const fy = cy - iy;
    const a = vh[iy][ix] * (1 - fx) + vh[iy][ix + 1] * fx;
    const b = vh[iy + 1][ix] * (1 - fx) + vh[iy + 1][ix + 1] * fx;
    return a * (1 - fy) + b * fy;
  };
  const pos: number[] = [];
  const col: number[] = [];
  for (let y = 0; y < WORLD_H; y++)
    for (let x = 0; x < WORLD_W; x++) {
      const t = tAt(x, y);
      const base = new THREE.Color(isRoad(x, y) && COST[t] !== null ? '#c9a46a' : COLOR[t]);
      const p = (dx: number, dy: number) => [x + dx + ox, vh[y + dy][x + dx], y + dy + oz];
      // 兩個三角形各自帶一點深淺，看起來像一塊塊切面
      for (const [tri, k] of [[[p(0, 0), p(0, 1), p(1, 1)], 0.95], [[p(0, 0), p(1, 1), p(1, 0)], 1.03]] as const) {
        const c = base.clone().multiplyScalar(k * (0.94 + h01(x, y, 7) * 0.1));
        for (const v of tri) {
          pos.push(...v);
          col.push(c.r, c.g, c.b);
        }
      }
    }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, snowable(new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 })));
  ground.receiveShadow = true;
  ground.castShadow = true;
  root.add(ground);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_W + 20, WORLD_H + 20), new THREE.MeshStandardMaterial({ color: '#4a8cc8', transparent: true, opacity: 0.6, roughness: 0.1 }));
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.2;
  water.receiveShadow = true;
  root.add(water);

  // ── 林地的樹、山上的岩石 ──
  const m = (color: string) => snowable(new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }));
  const pine = new Batch(new THREE.ConeGeometry(0.22, 0.6, 6).translate(0, 0.32, 0), m('#ffffff'));
  const round = new Batch(new THREE.IcosahedronGeometry(0.22, 0).translate(0, 0.32, 0), m('#ffffff'));
  const crag = new Batch(new THREE.DodecahedronGeometry(0.3, 0), m('#8a8676'));
  for (let y = 0; y < WORLD_H; y++)
    for (let x = 0; x < WORLD_W; x++) {
      const t = tAt(x, y);
      if (isRoad(x, y) || nodeAt.has(y * WORLD_W + x)) continue;
      const at = (i: number) => {
        const px = x + 0.2 + h01(x, y, i) * 0.6;
        const py = y + 0.2 + h01(x, y, i + 9) * 0.6;
        return new THREE.Vector3(px + ox, groundAt(px, py), py + oz);
      };
      if (t === 'forest') for (let i = 0; i < 2; i++) pine.add(at(i), 0.8 + h01(x, y, i + 3) * 0.6, 0, new THREE.Color('#2f6a3a').multiplyScalar(0.8 + h01(x, y, i) * 0.4));
      else if (t === 'plain' && h01(x, y, 4) < 0.08) round.add(at(5), 0.9, 0, new THREE.Color('#4f9a48'));
      else if ((t === 'mount' || t === 'hill') && h01(x, y, 2) < 0.18) crag.add(at(6), 0.6 + h01(x, y, 8) * 0.6, h01(x, y));
    }
  for (const b of [pine, round, crag]) {
    const mesh = b.build();
    if (mesh) root.add(mesh);
  }

  // ── 據點：小房子聚落與地名 ──
  for (const n of NODES) {
    const g = new THREE.Group();
    g.position.set(n.x + 0.5 + ox, groundAt(n.x + 0.5, n.y + 0.5), n.y + 0.5 + oz);
    const roofC = n.kind === 'sect' ? '#3e6656' : n.kind === 'city' ? '#3f4a5e' : '#8a5a3a';
    const count = n.locked ? 0 : n.kind === 'city' ? 7 : n.kind === 'port' || n.kind === 'village' ? 4 : n.kind === 'sect' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const a = (i / Math.max(1, count)) * Math.PI * 2 + 0.4;
      const rr = count > 1 ? (n.kind === 'city' ? 0.9 : 0.6) : 0;
      const house = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.32), m('#ece2cc'));
      body.position.y = 0.15;
      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.24, 4), m(roofC));
      roof.position.y = 0.42;
      roof.rotation.y = Math.PI / 4;
      house.add(body, roof);
      house.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
      house.rotation.y = -a;
      if (n.kind === 'sect' || n.kind === 'city') house.scale.setScalar(1.25);
      g.add(house);
    }
    if (n.kind === 'city') {
      const wall = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.07, 4, 8), m('#b8b0a0'));
      wall.rotation.x = Math.PI / 2;
      wall.position.y = 0.1;
      g.add(wall);
    }
    if (n.kind === 'inn' || n.kind === 'wild') {
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.8, 0.04), m('#5a3a22'));
      flag.position.set(0.35, 0.4, 0);
      const cloth = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.25, 0.18), m('#c84a3a'));
      cloth.position.set(0.35, 0.68, 0.1);
      g.add(flag, cloth);
    }
    g.traverse((c) => ((c.castShadow = true), (c.receiveShadow = true)));
    const lb = label(n.locked ? `${n.name}（未開放）` : n.name, n.locked ? 'p-label p-locked' : 'p-label');
    lb.position.y = 1.3;
    g.add(lb);
    root.add(g);
  }

  // ── 主角：方向鍵自由走 ──
  const hero = figure('hero');
  hero.obj.scale.setScalar(0.5);
  root.add(hero.obj);
  const start = NODES.find((n) => n.id === 'qingzhu')!;
  const p = new THREE.Vector2(start.x + 1.5, start.y + 0.5);
  const passable = (x: number, y: number) => {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    if (cx < 0 || cy < 0 || cx >= WORLD_W || cy >= WORLD_H) return false;
    return isRoad(cx, cy) || nodeAt.has(cy * WORLD_W + cx) || COST[tAt(cx, cy)] !== null;
  };
  const costHere = (x: number, y: number) => {
    const cx = Math.floor(x);
    const cy = Math.floor(y);
    return isRoad(cx, cy) ? ROAD_COST : (COST[tAt(cx, cy)] ?? 1);
  };
  const nearNode = () => NODES.find((n) => Math.hypot(n.x + 0.5 - p.x, n.y + 0.5 - p.y) < 1.4);
  const keys = new Set<string>();
  const focus = new THREE.Vector3();
  let spent = 0;
  let note = '';
  const v = new THREE.Vector2();

  return {
    root,
    focus,
    key(code, down) {
      if (code === 'KeyE' && down) {
        const n = nearNode();
        if (n?.id === 'qingzhu') ctx.go('village');
        else if (n) note = n.locked ? `${n.name}還沒開放` : `試作品只做了青竹村，${n.name}還進不去`;
        return true;
      }
      if (!code.startsWith('Arrow') && !code.startsWith('Shift')) return false;
      if (down) keys.add(code);
      else keys.delete(code);
      return true;
    },
    update(dt, cam) {
      const f = new THREE.Vector2(-Math.sin(cam.yaw), -Math.cos(cam.yaw));
      const r = new THREE.Vector2(Math.cos(cam.yaw), -Math.sin(cam.yaw));
      v.set(0, 0);
      if (keys.has('ArrowUp')) v.add(f);
      if (keys.has('ArrowDown')) v.sub(f);
      if (keys.has('ArrowRight')) v.add(r);
      if (keys.has('ArrowLeft')) v.sub(r);
      const moving = v.lengthSq() > 0;
      if (moving) {
        // 走得快慢照腳下的地形：路上快、山裡慢
        const speed = ((keys.has('ShiftLeft') || keys.has('ShiftRight') ? 4.5 : 2.4) / Math.sqrt(costHere(p.x, p.y))) * dt;
        v.normalize().multiplyScalar(speed);
        const before = p.clone();
        if (passable(p.x + v.x, p.y)) p.x += v.x;
        if (passable(p.x, p.y + v.y)) p.y += v.y;
        spent += before.distanceTo(p) * costHere(p.x, p.y);
        hero.yaw = Math.atan2(v.x, v.y);
        note = '';
      }
      hero.obj.position.set(p.x + ox, groundAt(p.x, p.y), p.y + oz);
      hero.tick(dt, moving);
      focus.lerp(hero.obj.position, Math.min(1, dt * 5));
    },
    info: () => {
      const cx = Math.floor(p.x);
      const cy = Math.floor(p.y);
      const n = nearNode();
      const here = n ? n.name : `${isRoad(cx, cy) ? '道路・' : ''}${NAME[tAt(cx, cy)]}`;
      return `江南大地圖・${here}　方向鍵自由走（Shift 快走），路上快、山裡慢；水和高峰過不去${n ? `　按 E 進入${n.name}` : ''}\n這一趟走了約 ${spent.toFixed(1)} 刻（${Math.round(spent * LI_PER_KE)} 里）${note ? `　${note}` : ''}`;
    },
  };
}
