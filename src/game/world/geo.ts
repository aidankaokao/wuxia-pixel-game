/**
 * 大地圖（江南一帶）：地形、節點（城市、村莊、門派、據點）與道路。
 *
 * - 地形用幾何特徵生成：東邊是東海與海灣，大江由西往東注入海灣，雲水河從北邊流進碧漪湖，西邊、西南、北邊有山脈。
 *   每格是一塊地（畫成 8×8 像素），整張圖 WORLD_W × WORLD_H 格。
 * - 臨江縣（青竹村、臨江城、鳴泉山、蒼嵐山）在大江北岸、碧漪湖東北，大約是杭州一帶的位置。
 * - 每個節點是一個據點（一組小地圖，例如青竹村＋村北＋各屋室內）；據點之間一律走大地圖，小地圖之間不直接相連。
 *   節點之間沿著道路走，花時間（edge.ke）。從哪條路來，就從據點的哪一側進去（enterFrom）。
 * - 渡口（crossing）：在大地圖上只能往回走；要到對岸，得進渡口坐船過河。
 * - 還沒開放的地方（locked）顯示成「？」，走不過去，之後一個個建。
 */

export const WORLD_W = 100;
export const WORLD_H = 64;
/** 大地圖一格幾像素 */
export const CELL = 8;

export type Terrain = 'sea' | 'shallow' | 'beach' | 'river' | 'lake' | 'plain' | 'forest' | 'hill' | 'mount' | 'peak';

export type NodeKind = 'city' | 'village' | 'sect' | 'wild' | 'port' | 'ferry';

export interface Spawn {
  map: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
}

export interface WorldNode {
  id: string;
  name: string;
  kind: NodeKind;
  x: number;
  y: number;
  desc: string;
  /** 進去之後到哪張小地圖的哪裡（還沒開放的地方沒有） */
  enter?: Spawn;
  /** 從某個節點的方向來時，改從這裡進去（例如從臨江城來，就從青竹村的東邊進村） */
  enterFrom?: Record<string, Spawn>;
  /** 渡口：在大地圖上只能往回走，過河要進去坐船 */
  crossing?: boolean;
  /** 還沒開放：顯示成「？」，走不過去 */
  locked?: boolean;
}

export interface WorldEdge {
  a: string;
  b: string;
  /** 沿路經過的格子（從 a 到 b，頭尾是兩個節點） */
  path: [number, number][];
  /** 走一趟花幾刻（騎馬照坐騎的速度縮短） */
  ke: number;
  /** 路上遇到劫匪、野獸的機率 */
  danger: number;
  /** 路名（顯示用） */
  name: string;
}

export const NODES: WorldNode[] = [
  {
    id: 'qingzhu', name: '青竹村', kind: 'village', x: 43, y: 36,
    desc: '蒼嵐山腳下的小村子，竹林環繞，村口有座茶攤。',
    enter: { map: 'qingzhu', x: 26, y: 37, facing: 'up' },
    enterFrom: {
      ferry: { map: 'qingzhu', x: 54, y: 20, facing: 'left' },
      canglan: { map: 'qz_north', x: 12, y: 1, facing: 'down' },
    },
  },
  {
    id: 'ferry', name: '雲水渡口', kind: 'ferry', x: 49, y: 36, crossing: true,
    desc: '官道在這裡被雲水河截斷，南來北往的旅人都在這兒等船過河。岸邊有座茶棚。',
    enter: { map: 'guandao', x: 1, y: 7, facing: 'right' },
    enterFrom: { linjiang: { map: 'guandao', x: 38, y: 7, facing: 'left' } },
  },
  {
    id: 'linjiang', name: '臨江城', kind: 'city', x: 56, y: 37,
    desc: '大江北岸的縣城，碼頭上船來船往，城裡商號林立。',
    enter: { map: 'linjiang', x: 53, y: 16, facing: 'left' },
    enterFrom: {
      ferry: { map: 'linjiang', x: 1, y: 16, facing: 'right' },
      mingquan: { map: 'linjiang', x: 27, y: 1, facing: 'down' },
      beishang: { map: 'linjiang', x: 27, y: 1, facing: 'down' },
    },
  },
  {
    id: 'mingquan', name: '鳴泉山', kind: 'sect', x: 57, y: 32,
    desc: '臨江城北的山，山上有鳴泉劍派。',
    enter: { map: 'mingquan', x: 16, y: 34, facing: 'up' },
  },
  {
    id: 'canglan', name: '蒼嵐山', kind: 'wild', x: 42, y: 31,
    desc: '青竹村北邊的山，山路上有野狗、山豬，山頂曾是斷崖寨。',
    enter: { map: 'canglan', x: 11, y: 42, facing: 'up' },
  },
  // ── 還沒開放的地方 ──
  {
    id: 'dabutou', name: '大埠頭', kind: 'port', x: 74, y: 38,
    desc: '大江入海口的港口小城。海船在東邊的碼頭靠岸，江船從大江上下來；城南有觀潮台。',
    enter: { map: 'dabutou', x: 1, y: 14, facing: 'right' },
  },
  { id: 'biyi', name: '碧漪湖漁村', kind: 'village', x: 42, y: 40, locked: true, desc: '碧漪湖西岸的漁村。' },
  { id: 'yunling', name: '雲嶺', kind: 'wild', x: 25, y: 51, locked: true, desc: '大江南岸連綿的群山，雲霧終年不散。' },
  { id: 'beishang', name: '北上官道', kind: 'wild', x: 58, y: 11, locked: true, desc: '翻過北嶺的官道，一路往北。' },
];

/** 道路：path 是手畫的轉折點，之後展開成一格一格 */
const ROADS: { a: string; b: string; via: [number, number][]; ke: number; danger: number; name: string }[] = [
  { a: 'qingzhu', b: 'ferry', via: [], ke: 2, danger: 0.08, name: '雲水官道' },
  { a: 'ferry', b: 'linjiang', via: [[51, 36]], ke: 2, danger: 0.08, name: '雲水官道' },
  { a: 'linjiang', b: 'mingquan', via: [[57, 35]], ke: 2, danger: 0.05, name: '鳴泉山道' },
  { a: 'qingzhu', b: 'canglan', via: [[43, 33]], ke: 2, danger: 0.12, name: '蒼嵐山道' },
  { a: 'linjiang', b: 'dabutou', via: [[63, 37], [69, 38]], ke: 72, danger: 0.15, name: '沿江大道' },
  { a: 'qingzhu', b: 'biyi', via: [[42, 38]], ke: 16, danger: 0.05, name: '湖畔小路' },
  { a: 'qingzhu', b: 'yunling', via: [[37, 39], [32, 44], [28, 48]], ke: 80, danger: 0.2, name: '南嶺古道' },
  { a: 'linjiang', b: 'beishang', via: [[62, 33], [62, 22], [59, 15]], ke: 88, danger: 0.2, name: '北嶺官道' },
];

export const nodeById = (id: string) => NODES.find((n) => n.id === id)!;

/** 把轉折點展開成一格一格（直線上的每一格） */
function expand(points: [number, number][]): [number, number][] {
  const out: [number, number][] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let k = 1; k <= n; k++) out.push([Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n)]);
  }
  return out;
}

export const EDGES: WorldEdge[] = ROADS.map((r) => {
  const a = nodeById(r.a);
  const b = nodeById(r.b);
  return { a: r.a, b: r.b, path: expand([[a.x, a.y], ...r.via, [b.x, b.y]]), ke: r.ke, danger: r.danger, name: r.name };
});

/**
 * 從某個節點出發的道路（path 已經轉成從這個節點出發的方向）。
 * 渡口：只能往回走（from 是從哪個節點來的；不知道就都列出來）
 */
export function edgesFrom(id: string, from?: string): { to: WorldNode; edge: WorldEdge; path: [number, number][] }[] {
  const crossing = nodeById(id).crossing && from;
  return EDGES.filter((e) => (e.a === id || e.b === id) && (!crossing || e.a === from || e.b === from)).map((e) => ({
    to: nodeById(e.a === id ? e.b : e.a),
    edge: e,
    path: e.a === id ? e.path : [...e.path].reverse(),
  }));
}

/** 地形上的地名（畫在地圖上的字，由介面疊上去） */
export const AREA_LABELS: { text: string; x: number; y: number; kind: 'water' | 'mount' | 'region' }[] = [
  { text: '東　海', x: 92, y: 46, kind: 'water' },
  { text: '大　江', x: 30, y: 47, kind: 'water' },
  { text: '碧漪湖', x: 46, y: 39, kind: 'water' },
  { text: '雲水河', x: 46, y: 26, kind: 'water' },
  { text: '雲　嶺', x: 22, y: 57, kind: 'mount' },
  { text: '北　嶺', x: 46, y: 6, kind: 'mount' },
  { text: '西　山', x: 6, y: 28, kind: 'mount' },
  { text: '臨江縣', x: 52, y: 33, kind: 'region' },
];

// ── 地形 ────────────────────────────────────────────────

/** 點到折線的距離 */
function distToPolyline(px: number, py: number, pts: [number, number][]): number {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const dx = x1 - x0;
    const dy = y1 - y0;
    const t = Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / (dx * dx + dy * dy || 1)));
    best = Math.min(best, Math.hypot(px - (x0 + dx * t), py - (y0 + dy * t)));
  }
  return best;
}

/** 平滑的雜訊（0–1），讓森林、丘陵分布自然一點 */
function noise(x: number, y: number, scale: number, seed: number) {
  const h = (i: number, j: number) => {
    let n = (i * 374761393 + j * 668265263 + seed * 2147483647) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const fx = x / scale;
  const fy = y / scale;
  const i = Math.floor(fx);
  const j = Math.floor(fy);
  const u = fx - i;
  const v = fy - j;
  const s = (t: number) => t * t * (3 - 2 * t);
  const a = h(i, j) + (h(i + 1, j) - h(i, j)) * s(u);
  const b = h(i, j + 1) + (h(i + 1, j + 1) - h(i, j + 1)) * s(u);
  return a + (b - a) * s(v);
}

/** 海岸線：這一列往東多少格就是海（中段是大江入海的海灣） */
function coastX(y: number) {
  const base = 84 + 2.5 * Math.sin(y / 5) + 1.5 * Math.sin(y / 2.1 + 1);
  // 海灣（像杭州灣）：大江口一帶海岸往西凹進去
  const bay = Math.max(0, 1 - Math.abs(y - 41) / 7) * 9;
  return base - bay;
}

/** 大江：由西往東，在海灣入海；越往下游越寬 */
const RIVER: [number, number][] = [[0, 48], [10, 47], [22, 46], [34, 45], [44, 45.5], [52, 43], [58, 40.5], [64, 41], [70, 41], [77, 41]];
/** 雲水河：從北邊山裡流下來，在雲水渡口截斷官道，注入碧漪湖 */
const CREEK: [number, number][] = [[42, 18], [45, 24], [48, 30], [50, 34], [49, 37.5]];
/** 碧漪湖的水從東南角流進大江 */
const OUTLET: [number, number][] = [[49, 40.5], [50, 42], [51, 43.5]];
/** 山脈：折線與寬度 */
const RANGES: { pts: [number, number][]; r: number }[] = [
  { pts: [[3, 8], [7, 20], [5, 34], [8, 46], [4, 58]], r: 4.5 }, // 西山
  { pts: [[12, 52], [20, 55], [30, 57], [40, 60]], r: 4 }, // 雲嶺
  { pts: [[28, 5], [40, 8], [52, 6], [66, 9], [76, 5]], r: 3.2 }, // 北嶺
  { pts: [[57, 31], [58, 30]], r: 2.2 }, // 鳴泉山
  { pts: [[41, 30], [43, 30]], r: 2.4 }, // 蒼嵐山
];
/** 小島（東海諸島） */
const ISLANDS: [number, number, number][] = [[92, 22, 2.2], [95, 31, 1.6], [90, 54, 2.6], [96, 58, 1.4]];

function terrainAt(x: number, y: number): Terrain {
  const coast = coastX(y);
  const island = ISLANDS.some(([ix, iy, r]) => Math.hypot(x - ix, y - iy) < r + noise(x, y, 2, 9) * 0.8);
  if (x > coast + 1.5 && !island) return 'sea';
  if (x > coast && !island) return 'shallow';
  if (x > coast - 1 && !island) return 'beach';
  // 江面越往東越寬
  const riverW = 0.9 + Math.max(0, (x - 40) / 30) * 1.6;
  if (distToPolyline(x, y, RIVER) < riverW) return 'river';
  if (distToPolyline(x, y, CREEK) < 0.6 || distToPolyline(x, y, OUTLET) < 0.6) return 'river';
  // 碧漪湖（一點雜訊讓湖岸不那麼圓）
  if (Math.hypot((x - 46.5) / 3.6, (y - 39.3) / 2) < 1 + (noise(x, y, 2, 3) - 0.5) * 0.35) return 'lake';
  for (const r of RANGES) {
    const d = distToPolyline(x, y, r.pts) - (noise(x, y, 3, 5) - 0.5) * 2;
    if (d < r.r * 0.45) return 'peak';
    if (d < r.r) return 'mount';
    if (d < r.r + 1.8) return 'hill';
  }
  const n = noise(x, y, 5, 1);
  if (n > 0.66) return 'forest';
  if (n < 0.12) return 'hill';
  return 'plain';
}

let cache: Terrain[][] | null = null;
/** 整張圖的地形（第一次呼叫時算好） */
export function worldTerrain(): Terrain[][] {
  cache ??= Array.from({ length: WORLD_H }, (_, y) => Array.from({ length: WORLD_W }, (_, x) => terrainAt(x, y)));
  return cache;
}

export const NODE_KIND_NAME: Record<NodeKind, string> = { city: '城鎮', village: '村莊', sect: '門派', wild: '野外', port: '港口', ferry: '渡口' };

/** 進入據點時的落腳處：從哪個節點來就從哪一側進去 */
export const spawnOf = (n: WorldNode, from?: string) => (from && n.enterFrom?.[from]) || n.enter;
