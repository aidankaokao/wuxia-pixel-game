import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { figure, type Figure } from './chars';
import { snowable } from './env';
import { h01, label, type ProtoScene, type SceneCtx } from './scene';

/**
 * 試作品・六角格戰鬥（只看畫面與手感，規則是臨時的）：9×7 的六角格戰場，三種地形——
 *   山道（有高低差、樹與石頭擋路）、平地（一片草地，幾叢花、一兩塊石頭）、河湖（一條河從中間流過，左下是湖；
 *   水過不去，中間有座木橋，下游有一處淺灘可以涉水，多花 1 步）。
 * 你和顧小滿對上三個山賊。點自己人 → 藍色是走得到的格子（每格 1 步，往上爬一層多 1 步，高差超過 1 爬不上去）→
 * 點一格走過去 → 紅色是打得到的格子（相鄰六格），點敵人出手（站得比對方高，傷害多兩成）。兩人都動過就換山賊。
 */

const COLS = 9;
const ROWS = 7;
const MOVE = 4;
/** 六角格的半徑 */
const R = 0.64;
const SQ3 = Math.sqrt(3);

interface Unit {
  name: string;
  side: 'ally' | 'foe';
  f: Figure;
  c: number;
  r: number;
  hp: number;
  max: number;
  atk: number;
  done: boolean;
  bar: HTMLDivElement;
}

/** 平頂六角、奇數欄往下錯半格（odd-q）的六個鄰格 */
const inside = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < ROWS;
const around = (c: number, r: number) => NEIGHBORS(c).map(([dc, dr]) => [c + dc, r + dr] as [number, number]).filter(([x, y]) => inside(x, y));
const NEIGHBORS = (c: number) =>
  c & 1
    ? [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1]]
    : [[0, -1], [0, 1], [-1, -1], [1, -1], [-1, 0], [1, 0]];

export type Field = 'hill' | 'plain' | 'river';
export const FIELD_NAME: Record<Field, string> = { hill: '山道', plain: '平地', river: '河湖' };

/** 戰場的格子：. 草地  * 花  t 樹  o 石頭  w 水（過不去）  f 淺灘（多 1 步）  b 木橋 */
const LAYOUT: Record<Field, string[]> = {
  hill: ['.........', '.......t.', '...t.....', '....o....', '......o..', '..t......', '.........'],
  plain: ['.....*...', '..*......', '......o..', '....*....', '.*.......', '...o...*.', '.......*.'],
  river: ['....w....', '....w..t.', '.t..b....', '....w....', '...ww..o.', '..wwf....', '.www.....'],
};
/** 雙方的起點 */
const START: Record<Field, { ally: [number, number][]; foe: [number, number][] }> = {
  hill: { ally: [[1, 5], [1, 4]], foe: [[6, 1], [7, 3], [8, 1]] },
  plain: { ally: [[1, 3], [1, 4]], foe: [[7, 2], [7, 4], [8, 3]] },
  river: { ally: [[1, 3], [2, 1]], foe: [[7, 3], [6, 0], [8, 5]] },
};

export function battleScene(_ctx: SceneCtx, field: Field = 'hill'): ProtoScene {
  const root = new THREE.Group();
  const ox = -((COLS - 1) * 1.5 * R) / 2;
  const oz = -((ROWS - 0.5) * SQ3 * R) / 2;
  const T = (c: number, r: number) => LAYOUT[field][r][c];
  // 高低：山道右上高、左下低；平地有一兩處小土坡；河湖是平的，水面低一截
  const level = Array.from({ length: ROWS }, (_, r) =>
    Array.from({ length: COLS }, (_, c) =>
      field === 'hill' ? Math.max(0, Math.min(3, Math.floor((c + (ROWS - r)) / 4 + h01(c, r, 1) * 0.9) - 1)) : field === 'plain' && ((c === 4 && r === 1) || (c === 5 && r === 1) || (c === 2 && r === 5)) ? 1 : 0,
    ),
  );
  const k = (c: number, r: number) => `${c},${r}`;
  const blocked = new Set<string>();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if ('tow'.includes(T(c, r))) blocked.add(k(c, r));
  /** 地面高度：水面低、淺灘略低、橋面平 */
  const H = (c: number, r: number) => (T(c, r) === 'w' ? -0.28 : T(c, r) === 'f' ? -0.1 : level[r][c] * 0.4);
  const top = (c: number, r: number) => new THREE.Vector3(c * 1.5 * R + ox, T(c, r) === 'b' ? 0.08 : H(c, r), (r + (c & 1) * 0.5) * SQ3 * R + oz);

  // 地塊：六角柱，高低照地形
  const tiles: THREE.Mesh[] = [];
  const side = snowable(new THREE.MeshStandardMaterial({ color: '#8a7a5a', flatShading: true }));
  const topColor = (c: number, r: number) => {
    const t = T(c, r);
    if (t === 'w' || t === 'b') return '#4a8cc8';
    if (t === 'f') return '#8fbcc8';
    return new THREE.Color((c + r) % 2 ? '#86b866' : '#7cae5e').multiplyScalar(0.95 + level[r][c] * 0.04).getStyle();
  };
  const m = (color: string) => snowable(new THREE.MeshStandardMaterial({ color, flatShading: true }));
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      const t = T(c, r);
      const h = H(c, r) + 0.6;
      const geo = new THREE.CylinderGeometry(R * 0.97, R * 0.97, h, 6);
      geo.rotateY(Math.PI / 6);
      const topMat = t === 'w' || t === 'b' ? new THREE.MeshStandardMaterial({ color: topColor(c, r), roughness: 0.15, metalness: 0.1 }) : snowable(new THREE.MeshStandardMaterial({ color: topColor(c, r), flatShading: true }));
      const tile = new THREE.Mesh(geo, [side, topMat, side]);
      tile.position.set(c * 1.5 * R + ox, H(c, r) - h / 2, (r + (c & 1) * 0.5) * SQ3 * R + oz);
      tile.castShadow = tile.receiveShadow = true;
      tile.userData = { c, r };
      root.add(tile);
      tiles.push(tile);
      const p = top(c, r);
      if (t === 't') {
        const tr = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.1, 7), m('#2f6a3a'));
        tr.position.copy(p).add(new THREE.Vector3(0, 0.8, 0));
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 0.4, 5), new THREE.MeshStandardMaterial({ color: '#6a4a2a' }));
        trunk.position.copy(p).add(new THREE.Vector3(0, 0.2, 0));
        tr.castShadow = trunk.castShadow = true;
        root.add(tr, trunk);
      } else if (t === 'o') {
        const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.36, 0), m('#8e8a80'));
        rock.position.copy(p).add(new THREE.Vector3(0, 0.22, 0));
        rock.castShadow = true;
        root.add(rock);
      } else if (t === '*') {
        // 一叢小花
        const COLORS = ['#f2c230', '#ffffff', '#e86a92', '#e8603c'];
        for (let i = 0; i < 6; i++) {
          const f = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 4), m(COLORS[(i + c) % 4]));
          f.position.copy(p).add(new THREE.Vector3((h01(c, r, i) - 0.5) * 0.7, 0.06, (h01(c, r, i + 6) - 0.5) * 0.7));
          root.add(f);
        }
      } else if (t === 'b') {
        // 木橋：橋面與兩側欄杆
        const deck = new THREE.Mesh(new THREE.BoxGeometry(R * 1.9, 0.08, 0.7), m('#a8763f'));
        deck.position.copy(p).setY(0.04);
        deck.castShadow = deck.receiveShadow = true;
        root.add(deck);
        for (const dz of [-0.36, 0.36]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(R * 1.9, 0.06, 0.05), m('#7d532a'));
          rail.position.copy(p).add(new THREE.Vector3(0, 0.3, dz));
          root.add(rail);
          for (const dx of [-R * 0.85, 0, R * 0.85]) {
            const post = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.3, 0.06), m('#7d532a'));
            post.position.copy(p).add(new THREE.Vector3(dx, 0.15, dz));
            post.castShadow = true;
            root.add(post);
          }
        }
      } else if (t === 'f') {
        // 淺灘：水裡露出幾顆石頭
        for (let i = 0; i < 4; i++) {
          const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.1, 0), m('#9a968a'));
          st.position.copy(p).add(new THREE.Vector3((h01(c, r, i) - 0.5) * 0.8, 0.02, (h01(c, r, i + 4) - 0.5) * 0.8));
          root.add(st);
        }
      }
      // 水邊長蘆葦
      if (t === '.' && field === 'river' && around(c, r).some(([x, y]) => T(x, y) === 'w') && h01(c, r, 3) < 0.6)
        for (let i = 0; i < 4; i++) {
          const reed = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.02, 0.45, 4), m('#7a9a4a'));
          reed.position.copy(p).add(new THREE.Vector3((h01(c, r, i) - 0.5) * 0.6, 0.22, (h01(c, r, i + 2) - 0.5) * 0.6));
          reed.rotation.z = (h01(c, r, i + 5) - 0.5) * 0.4;
          root.add(reed);
        }
    }

  // 範圍標記（六角形的薄片）
  const markGeo = new THREE.CircleGeometry(R * 0.86, 6);
  markGeo.rotateX(-Math.PI / 2);
  const marks = new THREE.Group();
  root.add(marks);
  const showMarks = (cells: [number, number][], color: string) => {
    marks.clear();
    for (const [c, r] of cells) {
      const m = new THREE.Mesh(markGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.45, depthWrite: false }));
      m.position.copy(top(c, r)).add(new THREE.Vector3(0, 0.02, 0));
      marks.add(m);
    }
  };

  // 人
  const units: Unit[] = [];
  const place = (u: Unit) => u.f.obj.position.copy(top(u.c, u.r));
  const setBar = (u: Unit) => ((u.bar.querySelector('i') as HTMLElement).style.width = `${(u.hp / u.max) * 100}%`);
  const add = (name: string, sprite: string, side: Unit['side'], c: number, r: number, hp: number, atk: number) => {
    const f = figure(sprite);
    f.yaw = side === 'ally' ? Math.PI * 0.75 : -Math.PI * 0.25;
    root.add(f.obj);
    const bar = document.createElement('div');
    bar.className = `p-hp ${side}`;
    bar.innerHTML = `<span>${name}</span><i></i>`;
    const lb = new CSS2DObject(bar);
    lb.position.y = 1.4;
    f.obj.add(lb);
    const u: Unit = { name, side, f, c, r, hp, max: hp, atk, done: false, bar };
    units.push(u);
    place(u);
    setBar(u);
  };
  const st = START[field];
  add('你', 'hero', 'ally', ...st.ally[0], 120, 26);
  add('顧小滿', 'disciple_girl', 'ally', ...st.ally[1], 90, 20);
  add('山賊甲', 'bandit', 'foe', ...st.foe[0], 70, 16);
  add('山賊乙', 'bandit', 'foe', ...st.foe[1], 70, 16);
  add('賊頭', 'boss', 'foe', ...st.foe[2], 110, 22);

  const occupied = (c: number, r: number, except?: Unit) => units.some((u) => u !== except && u.hp > 0 && u.c === c && u.r === r);
  /** 走得到的格子（含路徑） */
  function reach(u: Unit): Map<string, [number, number][]> {
    const out = new Map<string, [number, number][]>([[k(u.c, u.r), [[u.c, u.r]]]]);
    const cost = new Map<string, number>([[k(u.c, u.r), 0]]);
    const q: [number, number][] = [[u.c, u.r]];
    while (q.length) {
      const [c, r] = q.shift()!;
      for (const [nc, nr] of around(c, r)) {
        if (blocked.has(k(nc, nr)) || occupied(nc, nr, u)) continue;
        const climb = level[nr][nc] - level[r][c];
        if (climb > 1) continue;
        const nd = cost.get(k(c, r))! + 1 + Math.max(0, climb) + (T(nc, nr) === 'f' ? 1 : 0);
        if (nd > MOVE || nd >= (cost.get(k(nc, nr)) ?? Infinity)) continue;
        cost.set(k(nc, nr), nd);
        out.set(k(nc, nr), [...out.get(k(c, r))!, [nc, nr]]);
        q.push([nc, nr]);
      }
    }
    return out;
  }
  const adjacentFoes = (u: Unit) =>
    units.filter((o) => o.hp > 0 && o.side !== u.side && around(u.c, u.r).some(([c, r]) => c === o.c && r === o.r) && Math.abs(level[o.r][o.c] - level[u.r][u.c]) <= 1);
  /** 兩格之間隔幾步（六角距離） */
  const dist = (a: [number, number], b: [number, number]) => {
    const cube = ([c, r]: [number, number]) => {
      const z = r - (c - (c & 1)) / 2;
      return [c, z, -c - z];
    };
    const [x1, y1, z1] = cube(a);
    const [x2, y2, z2] = cube(b);
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2), Math.abs(z1 - z2));
  };

  // 動畫：沿路徑一格一格跳過去、出手時往前衝一下
  type Anim = { u: Unit; path: [number, number][]; i: number; t: number; then: () => void } | { u: Unit; lunge: Unit; t: number; then: () => void };
  let anim: Anim | null = null;
  const queue: (() => void)[] = [];
  const floaters: { o: THREE.Object3D; t: number }[] = [];
  const popup = (u: Unit, text: string) => {
    const l = label(text, 'p-dmg');
    l.position.copy(u.f.obj.position).add(new THREE.Vector3(0, 1.6, 0));
    root.add(l);
    floaters.push({ o: l, t: 0 });
  };
  const hit = (a: Unit, d: Unit) => {
    const high = level[a.r][a.c] > level[d.r][d.c];
    const dmg = Math.round(a.atk * (0.85 + Math.random() * 0.3) * (high ? 1.2 : 1));
    d.hp = Math.max(0, d.hp - dmg);
    setBar(d);
    popup(d, `-${dmg}${high ? '（居高）' : ''}`);
    if (d.hp <= 0) {
      d.f.obj.visible = false;
      d.bar.style.display = 'none';
    }
  };

  let phase: 'pick' | 'move' | 'attack' | 'busy' | 'over' = 'pick';
  let sel: Unit | null = null;
  let reachable = new Map<string, [number, number][]>();
  let msg = '點你或顧小滿，選要行動的人';
  const allies = () => units.filter((u) => u.side === 'ally' && u.hp > 0);
  const foes = () => units.filter((u) => u.side === 'foe' && u.hp > 0);

  function endAlly(u: Unit) {
    u.done = true;
    marks.clear();
    sel = null;
    phase = 'pick';
    if (!foes().length) return void ((phase = 'over'), (msg = '山賊都打倒了！（按 Tab 換場景再回來可以重打）'));
    if (allies().every((a) => a.done)) enemyTurn();
    else msg = '點另一個人行動';
  }
  function enemyTurn() {
    phase = 'busy';
    msg = '山賊的回合……';
    for (const e of foes()) {
      queue.push(() => {
        if (e.hp <= 0) return next();
        // 朝最近的自己人走，走到旁邊就出手
        const targets = allies();
        if (!targets.length) return next();
        let best: [number, number][] = [[e.c, e.r]];
        let bd = Infinity;
        for (const p of reach(e).values()) {
          const end = p[p.length - 1];
          const d = Math.min(...targets.map((t) => dist(end, [t.c, t.r])));
          if (d >= 1 && d < bd) (bd = d), (best = p);
        }
        anim = {
          u: e,
          path: best,
          i: 1,
          t: 0,
          then: () => {
            const foe = adjacentFoes(e)[0];
            if (foe) anim = { u: e, lunge: foe, t: 0, then: () => (hit(e, foe), next()) };
            else next();
          },
        };
      });
    }
    queue.push(() => {
      units.forEach((u) => (u.done = false));
      phase = allies().length ? 'pick' : 'over';
      msg = allies().length ? '你的回合：點你或顧小滿' : '全軍覆沒……（按 Tab 換場景再回來可以重打）';
    });
    next();
  }
  function next() {
    queue.shift()?.();
  }

  const focus = new THREE.Vector3(0, 0.5, 0);
  return {
    root,
    focus,
    key(code, down) {
      if (down && code === 'Space' && sel && (phase === 'move' || phase === 'attack')) {
        endAlly(sel);
        return true;
      }
      return false;
    },
    click(ray) {
      if (phase === 'busy' || phase === 'over' || anim) return;
      const hitAt = ray.intersectObjects([...tiles, ...units.filter((u) => u.hp > 0).map((u) => u.f.obj)], true)[0];
      if (!hitAt) return;
      let o: THREE.Object3D | null = hitAt.object;
      let unit: Unit | undefined;
      while (o && !unit) {
        unit = units.find((u) => u.f.obj === o);
        o = o.parent;
      }
      const cell: [number, number] = unit ? [unit.c, unit.r] : [hitAt.object.userData.c, hitAt.object.userData.r];
      if (phase === 'pick' || (phase === 'move' && unit?.side === 'ally' && unit !== sel)) {
        if (!unit || unit.side !== 'ally' || unit.done) return;
        sel = unit;
        reachable = reach(unit);
        showMarks([...reachable.values()].map((p) => p[p.length - 1]), '#4a8cff');
        phase = 'move';
        msg = `${unit.name}：點藍色的格子移動（點自己原地不動；空白鍵結束）`;
        return;
      }
      if (phase === 'move' && sel) {
        const p = reachable.get(k(cell[0], cell[1]));
        if (!p) return;
        const u = sel;
        phase = 'busy';
        marks.clear();
        anim = {
          u,
          path: p,
          i: 1,
          t: 0,
          then: () => {
            const targets = adjacentFoes(u);
            if (!targets.length) return endAlly(u);
            phase = 'attack';
            showMarks(targets.map((t) => [t.c, t.r]), '#ff4a4a');
            msg = `${u.name}：點紅色格子上的敵人出手（空白鍵不出手）`;
          },
        };
        return;
      }
      if (phase === 'attack' && sel && unit && unit.side === 'foe' && adjacentFoes(sel).includes(unit)) {
        const u = sel;
        phase = 'busy';
        marks.clear();
        anim = { u, lunge: unit, t: 0, then: () => (hit(u, unit), endAlly(u)) };
      }
    },
    update(dt) {
      if (anim) {
        const a = anim;
        a.t += dt * ('path' in a ? 4 : 3);
        if ('path' in a) {
          if (a.i >= a.path.length) {
            anim = null;
            a.then();
          } else {
            const [c0, r0] = a.path[a.i - 1];
            const [c1, r1] = a.path[a.i];
            const t = Math.min(1, a.t);
            const p0 = top(c0, r0);
            const p1 = top(c1, r1);
            a.u.f.obj.position.lerpVectors(p0, p1, t).add(new THREE.Vector3(0, Math.sin(t * Math.PI) * 0.3, 0));
            a.u.f.yaw = Math.atan2(p1.x - p0.x, p1.z - p0.z);
            if (t >= 1) {
              a.u.c = c1;
              a.u.r = r1;
              a.i++;
              a.t = 0;
            }
          }
        } else {
          const t = Math.min(1, a.t);
          const from = top(a.u.c, a.u.r);
          const to = top(a.lunge.c, a.lunge.r);
          a.u.f.yaw = Math.atan2(to.x - from.x, to.z - from.z);
          a.u.f.obj.position.lerpVectors(from, to, Math.sin(t * Math.PI) * 0.45);
          if (t >= 1) {
            place(a.u);
            anim = null;
            a.then();
          }
        }
      }
      for (const u of units) u.f.tick(dt, !!anim && anim.u === u && 'path' in anim);
      for (const fl of [...floaters]) {
        fl.t += dt;
        fl.o.position.y += dt * 0.8;
        if (fl.t > 1.2) {
          fl.o.removeFromParent();
          floaters.splice(floaters.indexOf(fl), 1);
        }
      }
    },
    info: () => `六角格戰鬥・${FIELD_NAME[field]}（臨時規則，只看畫面）${field === 'river' ? '　水過不去，走橋或淺灘（多 1 步）' : ''}　${msg}`,
  };
}
