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

import { equippedLevel, type Character } from '../character';
import { mountDef } from '../mounts';

export const WORLD_W = 100;
export const WORLD_H = 64;
/** 大地圖一格幾像素 */
export const CELL = 8;

export type Terrain = 'sea' | 'shallow' | 'beach' | 'river' | 'lake' | 'plain' | 'forest' | 'hill' | 'mount' | 'peak';

export type NodeKind = 'city' | 'village' | 'sect' | 'wild' | 'port' | 'ferry' | 'inn';

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
  /** 驛站、茶亭：長路中途的歇腳點，不另做小地圖，在大地圖上按 E 就能住店、吃東西、打聽消息（見 story/waystation.ts） */
  rest?: { keeper: string; price: number; menu: string[]; talk: string[][] };
  /** 還沒開放：顯示成「？」，走不過去 */
  locked?: boolean;
}

export interface WorldEdge {
  a: string;
  b: string;
  /** 沿路經過的格子（從 a 到 b，頭尾是兩個節點） */
  path: [number, number][];
  /** 走一趟花幾刻（由里數算出；騎馬照坐騎的速度縮短） */
  ke: number;
  /** 路有多長（里） */
  li: number;
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
      mingquan: { map: 'lj_north', x: 27, y: 1, facing: 'down' },
      beiling: { map: 'lj_north', x: 27, y: 1, facing: 'down' },
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
  // ── 長路中途的歇腳點 ──
  {
    id: 'jiangpan', name: '江畔驛', kind: 'inn', x: 65, y: 37,
    desc: '沿江大道走到一半的驛站，幾間瓦房、一圈籬笆，門口拴著幾匹驛馬。',
    rest: {
      keeper: '溫守成',
      price: 4,
      menu: ['baifan', 'yangchun', 'yuzhou', 'tea'],
      talk: [
        ['往東再走一百五十里就到大埠頭了，一個多時辰的路。這條路晚上可不太平，能住下就別趕夜路。'],
        ['驛馬是給官差換的，不借人。客官要是嫌走得慢，不如去臨江城搭船。'],
        ['前幾天有個海商在這兒歇腳，說東海上的海盜越來越猖狂，連大埠頭的船都不太敢出海了。'],
      ],
    },
  },
  {
    id: 'beiling', name: '北嶺驛', kind: 'inn', x: 62, y: 24,
    desc: '北嶺官道上山前的最後一座驛站，再往北就要翻山了。',
    rest: {
      keeper: '褚老栓',
      price: 4,
      menu: ['baifan', 'yangchun', 'doufutang', 'tea'],
      talk: [
        ['再往北就是北嶺了，山路難走，入冬還會封山。', '翻過北嶺，聽說一路往北能走到京城。'],
        ['北嶺上的關口最近有官兵把守，盤查得緊，說是在抓什麼人。'],
      ],
    },
  },
  {
    id: 'guting', name: '古道茶亭', kind: 'inn', x: 37, y: 39,
    desc: '南嶺古道旁的老茶亭，往南再走就要渡大江、進雲嶺了。',
    rest: {
      keeper: '岑阿婆',
      price: 3,
      menu: ['yangchun', 'hongdou', 'tea'],
      talk: [
        ['過了大江就是雲嶺，雲霧大，山裡的路一不小心就走岔了。'],
        ['以前古道上人來人往的，自從江上的渡船停了，就冷清多啦。'],
      ],
    },
  },
  // ── 還沒開放的地方 ──
  {
    id: 'dabutou', name: '大埠頭', kind: 'port', x: 74, y: 38,
    desc: '大江入海口的港口小城。海船在東邊的碼頭靠岸，江船從大江上下來；城南有觀潮台。',
    enter: { map: 'dabutou', x: 1, y: 14, facing: 'right' },
  },
  {
    id: 'biyi', name: '碧漪湖漁村', kind: 'village', x: 42, y: 40,
    desc: '碧漪湖西岸的小漁村。棧橋伸進湖裡可以釣魚，秦老漢撐船去湖心島；湖鮮館的糖醋鯉魚遠近有名。',
    enter: { map: 'biyi', x: 1, y: 13, facing: 'right' },
  },
  { id: 'jiangnan', name: '江南渡', kind: 'ferry', x: 32, y: 45, locked: true, crossing: true, desc: '南嶺古道在這裡渡大江。聽說渡船停了好一陣子。' },
  { id: 'yunling', name: '雲嶺', kind: 'wild', x: 25, y: 51, locked: true, desc: '大江南岸連綿的群山，雲霧終年不散。' },
  { id: 'beishang', name: '北上官道', kind: 'wild', x: 58, y: 11, locked: true, desc: '翻過北嶺的官道，一路往北。' },
];

/**
 * 路程：每條路有多少里（li），一個時辰走一百二十里（江湖人腳程快；世界之後還會擴大，路程短一點，走一趟也不會老是天黑）。
 * 山路、翻山的路走得慢（slow 倍）。單段路盡量不超過三個時辰，太遠就在中間加驛站。
 * 騎馬、輕功好都走得快（travelKe）。大地圖不完全照比例：臨江縣一帶畫得比較大，縣外的地方畫得比較擠。
 */
export const LI_PER_KE = 15;

/** 輕功每一重快幾成、最多快到幾倍 */
const LIGHT_SPEED = 0.03;
const LIGHT_SPEED_MAX = 1.5;

/** 實際走一趟花幾刻：騎馬照坐騎的速度，裝備中的輕功每重快 3%（最多快五成），兩者相乘 */
export function travelKe(ke: number, h: Character): number {
  const mount = h.riding ? (mountDef(h.mount)?.speed ?? 1) : 1;
  const light = Math.min(LIGHT_SPEED_MAX, 1 + equippedLevel(h, 'light') * LIGHT_SPEED);
  return Math.max(1, Math.round(ke / (mount * light)));
}

/** 道路：via 是手畫的轉折點，之後展開成一格一格 */
const ROADS: { a: string; b: string; via: [number, number][]; li: number; slow?: number; danger: number; name: string }[] = [
  // 臨江縣內
  { a: 'qingzhu', b: 'ferry', via: [], li: 8, danger: 0.08, name: '雲水官道' },
  { a: 'ferry', b: 'linjiang', via: [[51, 36]], li: 15, danger: 0.08, name: '雲水官道' },
  { a: 'linjiang', b: 'mingquan', via: [[57, 35]], li: 10, slow: 1.5, danger: 0.05, name: '鳴泉山道' },
  { a: 'qingzhu', b: 'canglan', via: [[43, 33]], li: 10, slow: 1.5, danger: 0.12, name: '蒼嵐山道' },
  { a: 'qingzhu', b: 'biyi', via: [[42, 38]], li: 20, danger: 0.05, name: '湖畔小路' },
  // 往東：沿江大道到大埠頭（約三百里，中途江畔驛）
  { a: 'linjiang', b: 'jiangpan', via: [[63, 37]], li: 150, danger: 0.15, name: '沿江大道' },
  { a: 'jiangpan', b: 'dabutou', via: [[69, 38]], li: 150, danger: 0.15, name: '沿江大道' },
  // 往北：北嶺官道（北嶺驛之後翻山）
  { a: 'linjiang', b: 'beiling', via: [[62, 33]], li: 120, danger: 0.15, name: '北嶺官道' },
  { a: 'beiling', b: 'beishang', via: [[62, 22], [59, 15]], li: 100, slow: 1.6, danger: 0.2, name: '北嶺官道' },
  // 往南：南嶺古道（古道茶亭、渡大江，進雲嶺）
  { a: 'qingzhu', b: 'guting', via: [], li: 60, danger: 0.1, name: '南嶺古道' },
  { a: 'guting', b: 'jiangnan', via: [[34, 42]], li: 90, danger: 0.15, name: '南嶺古道' },
  { a: 'jiangnan', b: 'yunling', via: [[28, 48]], li: 90, slow: 1.4, danger: 0.2, name: '南嶺古道' },
];

/** 一條路走一趟花幾刻 */
const keOf = (li: number, slow = 1) => Math.max(1, Math.round((li / LI_PER_KE) * slow));

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
  return { a: r.a, b: r.b, path: expand([[a.x, a.y], ...r.via, [b.x, b.y]]), ke: keOf(r.li, r.slow), li: r.li, danger: r.danger, name: r.name };
});

/**
 * 從某個節點出發的道路（path 已經轉成從這個節點出發的方向）。
 * 渡口：只能往回走（from 是從哪個節點來的；不知道就都列出來）
 */
/** 渡口能不能直接走過去（例如雲水渡口蓋好橋以後）；由劇情設定（story/bridge.ts），免得這裡引用劇情 */
let crossingOpen: (id: string) => boolean = () => false;
export const setCrossingOpen = (f: (id: string) => boolean) => (crossingOpen = f);

export function edgesFrom(id: string, from?: string): { to: WorldNode; edge: WorldEdge; path: [number, number][] }[] {
  const crossing = nodeById(id).crossing && from && !crossingOpen(id);
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

export const NODE_KIND_NAME: Record<NodeKind, string> = { city: '城鎮', village: '村莊', sect: '門派', wild: '野外', port: '港口', ferry: '渡口', inn: '驛站' };

/** 進入據點時的落腳處：從哪個節點來就從哪一側進去 */
export const spawnOf = (n: WorldNode, from?: string) => (from && n.enterFrom?.[from]) || n.enter;
