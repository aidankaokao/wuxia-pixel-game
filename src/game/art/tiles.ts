import { TILE } from '../constants';
import { Ctx, hash, hline, px, vline } from './pixel';

/**
 * 地形瓦片。每一格依「自己的字元 + 上下左右鄰居」決定外觀，
 * 回傳一個 key（相同外觀共用同一張瓦片）與實際的繪製函式。
 * 地圖場景收集所有用到的 key 後，才把它們排進一張 tileset 圖。
 */

export interface TileArt {
  key: string;
  draw: (ctx: Ctx) => void;
}

const C = {
  grass: '#7fb069',
  grassDark: '#5f9a52',
  grassLight: '#9cc97c',
  dirt: '#c9a46a',
  dirtDark: '#ac864f',
  dirtLight: '#dcbd86',
  stone: '#b9b3a4',
  stoneDark: '#958f80',
  stoneLight: '#d3cec1',
  water: '#3f7fc0',
  waterDeep: '#346ea9',
  waterLight: '#6aa6dc',
  foam: '#cfe6f7',
  bank: '#8d7a4f',
  plank: '#a8763f',
  plankDark: '#7d532a',
  plankLight: '#c08d52',
  rail: '#5e3b1d',
  rock: '#8e8676',
  rockDark: '#6e675a',
  rockLight: '#aaa292',
  cliff: '#7a7262',
  cliffDark: '#5c5649',
  cliffShadow: '#4a453b',
  moss: '#6f9a55',
  soil: '#8b5e3c',
  soilDark: '#6c4729',
  sprout: '#86c255',
  sproutDark: '#5f9b3a',
  fence: '#9a6a3a',
  fenceDark: '#5f3d1e',
} as const;

// ── 字元分類 ───────────────────────────────────────────────
const ROADLIKE = new Set([':', 'E', '=', '#']);
const WATERLIKE = new Set(['~', '#']);

type Grid = readonly string[];
const at = (g: Grid, x: number, y: number): string | null =>
  y >= 0 && y < g.length && x >= 0 && x < g[y].length ? g[y][x] : null;

/** 四方向鄰居遮罩：N=1, E=2, S=4, W=8。地圖外視為「同類」，避免邊界畫出一圈邊。 */
function mask(g: Grid, x: number, y: number, same: (c: string) => boolean): number {
  const t = (c: string | null) => c === null || same(c);
  return (t(at(g, x, y - 1)) ? 1 : 0) | (t(at(g, x + 1, y)) ? 2 : 0) | (t(at(g, x, y + 1)) ? 4 : 0) | (t(at(g, x - 1, y)) ? 8 : 0);
}

/** 室內配色（依房屋風格） */
const INDOOR: Record<string, { floor: string; floorDark: string; floorLight: string; wall: string; beam: string; top: string }> = {
  plain: { floor: '#b08458', floorDark: '#8a6038', floorLight: '#c89a6a', wall: '#c8b08a', beam: '#6a4428', top: '#4a3220' },
  scholar: { floor: '#cdb48c', floorDark: '#a88c66', floorLight: '#e0caa2', wall: '#e8e0cc', beam: '#5a4a3a', top: '#3a3a40' },
  martial: { floor: '#8a5a3a', floorDark: '#6a4028', floorLight: '#a06a46', wall: '#9a4a34', beam: '#4a2018', top: '#2a1a14' },
  // 鐵鋪：灰撲撲的地面與煙燻的牆
  stone: { floor: '#8a8478', floorDark: '#6e695e', floorLight: '#a49e92', wall: '#7a7068', beam: '#3e3630', top: '#2a2420' },
};
const INDOOR_FLOOR = new Set(['_', 'd']);

/** 取得 (x, y) 這格的地形外觀。frame 用於水面動畫（0 或 1）；theme 是室內配色。 */
export function tileArt(g: Grid, x: number, y: number, frame = 0, theme?: string): TileArt {
  const c = at(g, x, y) ?? '.';
  const v = Math.floor(hash(x, y) * 4);
  const pal = INDOOR[theme ?? 'plain'];
  switch (c) {
    case '_':
    case 'd':
      return { key: `floor_${theme}_${v % 2}`, draw: (ctx) => drawFloor(ctx, pal, v % 2) };
    case 'W': {
      // 下面是地板的牆畫成牆面，其餘畫成牆頂
      const below = at(g, x, y + 1);
      const face = below !== null && (INDOOR_FLOOR.has(below) || below === 'E');
      return { key: `wall_${theme}_${face ? 1 : 0}`, draw: (ctx) => drawWall(ctx, pal, face) };
    }
    case 'E':
    case ':': {
      // 室內牆上的出口畫成門檻踏墊
      if (c === 'E' && theme && (at(g, x - 1, y) === 'W' || at(g, x + 1, y) === 'W'))
        return { key: `mat_${theme}`, draw: (ctx) => (drawFloor(ctx, pal, 0), drawMat(ctx)) };
      const m = mask(g, x, y, (n) => ROADLIKE.has(n));
      return { key: `road${m}_${v % 2}`, draw: (ctx) => drawRoad(ctx, m, v % 2) };
    }
    case '=': {
      const m = mask(g, x, y, (n) => n === '=');
      return { key: `plaza${m}`, draw: (ctx) => drawPlaza(ctx, m) };
    }
    case '~': {
      const m = mask(g, x, y, (n) => WATERLIKE.has(n));
      return { key: `water${m}_${frame}`, draw: (ctx) => drawWater(ctx, m, frame) };
    }
    case '#': {
      const m = mask(g, x, y, (n) => n === '#');
      return { key: `bridge${m & 5}`, draw: (ctx) => drawBridge(ctx, m) };
    }
    case '^': {
      const m = mask(g, x, y, (n) => n === '^');
      if (!(m & 4)) return { key: `cliff${m & 10}_${v % 2}`, draw: (ctx) => drawCliffFace(ctx, m, v % 2) };
      return { key: `mount${m}_${v}`, draw: (ctx) => drawMountainTop(ctx, m, v) };
    }
    case 'n':
      return { key: `field${v % 2}`, draw: (ctx) => drawField(ctx, v % 2) };
    case 'f': {
      const m = mask(g, x, y, (n) => n === 'f');
      return { key: `fence${m}`, draw: (ctx) => drawFence(ctx, m, v) };
    }
    case '*':
      return { key: `flower${v}`, draw: (ctx) => drawFlowers(ctx, v) };
    default:
      // '.'、以及樹木竹石等物件底下，都是草地
      return { key: `grass${v}`, draw: (ctx) => drawGrass(ctx, v) };
  }
}

// ── 各種地形 ───────────────────────────────────────────────

type Indoor = (typeof INDOOR)[string];

/** 木地板：直向長木板，偶爾一道接縫與木紋 */
function drawFloor(ctx: Ctx, p: Indoor, v: number) {
  px(ctx, 0, 0, TILE, TILE, p.floor);
  for (let x = 0; x < TILE; x += 8) {
    vline(ctx, x + 7, 0, TILE - 1, p.floorDark);
    vline(ctx, x, 0, TILE - 1, p.floorLight);
  }
  // 兩塊木板的接縫錯開
  hline(ctx, 1, 6, v ? 4 : 11, p.floorDark);
  hline(ctx, 9, 14, v ? 12 : 3, p.floorDark);
  px(ctx, v ? 3 : 11, 7, 1, 2, p.floorDark);
}

/** 牆：牆面（看得到的那一面）畫木板與橫樑；牆頂畫成深色厚邊 */
function drawWall(ctx: Ctx, p: Indoor, face: boolean) {
  if (!face) {
    px(ctx, 0, 0, TILE, TILE, p.top);
    hline(ctx, 0, TILE - 1, TILE - 1, p.beam);
    return;
  }
  px(ctx, 0, 0, TILE, TILE, p.wall);
  px(ctx, 0, 0, TILE, 3, p.top);
  hline(ctx, 0, TILE - 1, 3, p.beam);
  hline(ctx, 0, TILE - 1, 9, p.beam);
  px(ctx, 0, TILE - 2, TILE, 2, p.beam);
  vline(ctx, 0, 3, TILE - 1, p.beam);
}

/** 門口的踏墊 */
function drawMat(ctx: Ctx) {
  px(ctx, 2, 4, 12, 9, '#8a3a34');
  px(ctx, 3, 5, 10, 7, '#a84a40');
  hline(ctx, 4, 11, 8, '#c86a5a');
}

function drawGrass(ctx: Ctx, v: number) {
  px(ctx, 0, 0, TILE, TILE, C.grass);
  // 幾簇小草：一個 v 字形
  const n = 2 + (v % 2);
  for (let i = 0; i < n; i++) {
    const gx = Math.floor(hash(v, i, 3) * 13) + 1;
    const gy = Math.floor(hash(v, i, 7) * 12) + 2;
    px(ctx, gx, gy, 1, 2, C.grassDark);
    px(ctx, gx + 2, gy, 1, 2, C.grassDark);
    px(ctx, gx + 1, gy + 1, 1, 1, C.grassDark);
  }
  for (let i = 0; i < 3; i++) {
    px(ctx, Math.floor(hash(v, i, 11) * 16), Math.floor(hash(v, i, 13) * 16), 1, 1, C.grassLight);
  }
}

function drawFlowers(ctx: Ctx, v: number) {
  drawGrass(ctx, v);
  const colors = ['#f2c230', '#ffffff', '#e86a92', '#e8603c'];
  for (let i = 0; i < 3; i++) {
    const fx = Math.floor(hash(v, i, 21) * 12) + 2;
    const fy = Math.floor(hash(v, i, 23) * 11) + 2;
    const col = colors[(v + i) % colors.length];
    px(ctx, fx, fy + 2, 1, 2, C.grassDark);
    px(ctx, fx - 1, fy, 3, 1, col);
    px(ctx, fx, fy - 1, 1, 3, col);
    px(ctx, fx, fy, 1, 1, '#f7e7a0');
  }
}

/** 泥土路：不與路相連的那一側，草會長進來一點。 */
function drawRoad(ctx: Ctx, m: number, v: number) {
  px(ctx, 0, 0, TILE, TILE, C.dirt);
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(hash(v, i, 31) * 15);
    const y = Math.floor(hash(v, i, 37) * 15);
    px(ctx, x, y, i % 2 ? 1 : 2, 1, i % 3 ? C.dirtDark : C.dirtLight);
  }
  const edge = (i: number) => 2 + (hash(i, v, 41) < 0.5 ? 0 : 1);
  for (let i = 0; i < TILE; i++) {
    if (!(m & 1)) { px(ctx, i, 0, 1, edge(i), C.grass); px(ctx, i, edge(i), 1, 1, C.dirtDark); }
    if (!(m & 4)) { px(ctx, i, TILE - edge(i + 5), 1, edge(i + 5), C.grass); px(ctx, i, TILE - edge(i + 5) - 1, 1, 1, C.dirtDark); }
    if (!(m & 8)) { px(ctx, 0, i, edge(i + 9), 1, C.grass); px(ctx, edge(i + 9), i, 1, 1, C.dirtDark); }
    if (!(m & 2)) { px(ctx, TILE - edge(i + 13), i, edge(i + 13), 1, C.grass); px(ctx, TILE - edge(i + 13) - 1, i, 1, 1, C.dirtDark); }
  }
  // 外側轉角補草
  if (!(m & 1) && !(m & 8)) px(ctx, 0, 0, 4, 4, C.grass);
  if (!(m & 1) && !(m & 2)) px(ctx, TILE - 4, 0, 4, 4, C.grass);
  if (!(m & 4) && !(m & 8)) px(ctx, 0, TILE - 4, 4, 4, C.grass);
  if (!(m & 4) && !(m & 2)) px(ctx, TILE - 4, TILE - 4, 4, 4, C.grass);
}

/** 石板廣場：錯縫石板，外緣一圈較深的石沿。 */
function drawPlaza(ctx: Ctx, m: number) {
  px(ctx, 0, 0, TILE, TILE, C.stone);
  for (let row = 0; row < 2; row++) {
    const y = row * 8;
    hline(ctx, 0, 15, y, C.stoneDark);
    const off = row % 2 ? 4 : 0;
    for (let x = off; x < TILE; x += 8) vline(ctx, x, y, y + 7, C.stoneDark);
    for (let x = off + 1; x < TILE; x += 8) hline(ctx, x, Math.min(x + 5, 15), y + 1, C.stoneLight);
  }
  if (!(m & 1)) { px(ctx, 0, 0, TILE, 2, C.stoneDark); hline(ctx, 0, 15, 2, C.stoneLight); }
  if (!(m & 4)) { px(ctx, 0, TILE - 2, TILE, 2, C.stoneDark); }
  if (!(m & 8)) { px(ctx, 0, 0, 2, TILE, C.stoneDark); }
  if (!(m & 2)) { px(ctx, TILE - 2, 0, 2, TILE, C.stoneDark); }
}

/** 水面：與陸地相接的一側畫出土岸與白色浪花；frame 決定波紋位置。 */
function drawWater(ctx: Ctx, m: number, frame: number) {
  px(ctx, 0, 0, TILE, TILE, C.water);
  px(ctx, 0, 10, TILE, 6, C.waterDeep);
  const waves = frame === 0 ? [[2, 4], [9, 9], [5, 13]] : [[4, 5], [11, 10], [1, 12]];
  for (const [x, y] of waves) {
    hline(ctx, x, x + 3, y, C.waterLight);
    px(ctx, x + 1, y - 1, 2, 1, C.waterLight);
  }
  const f = frame;
  if (!(m & 1)) { px(ctx, 0, 0, TILE, 3, C.bank); hline(ctx, 0, 15, 3, C.foam); for (let i = f; i < TILE; i += 3) px(ctx, i, 4, 1, 1, C.foam); }
  if (!(m & 4)) { px(ctx, 0, TILE - 2, TILE, 2, C.bank); hline(ctx, 0, 15, TILE - 3, C.foam); }
  if (!(m & 8)) { px(ctx, 0, 0, 2, TILE, C.bank); vline(ctx, 2, 0, 15, C.foam); for (let i = f; i < TILE; i += 3) px(ctx, 3, i, 1, 1, C.foam); }
  if (!(m & 2)) { px(ctx, TILE - 2, 0, 2, TILE, C.bank); vline(ctx, TILE - 3, 0, 15, C.foam); for (let i = f; i < TILE; i += 3) px(ctx, TILE - 4, i, 1, 1, C.foam); }
}

/** 東西向木橋：直向木板，沒有接續橋面的那一側（上/下）有欄杆。 */
function drawBridge(ctx: Ctx, m: number) {
  px(ctx, 0, 0, TILE, TILE, C.plank);
  for (let x = 0; x < TILE; x += 4) {
    vline(ctx, x, 0, 15, C.plankDark);
    vline(ctx, x + 1, 0, 15, C.plankLight);
  }
  if (!(m & 1)) {
    px(ctx, 0, 0, TILE, 3, C.water);
    px(ctx, 0, 1, TILE, 2, C.rail);
    hline(ctx, 0, 15, 1, C.plankLight);
    px(ctx, 1, 0, 2, 5, C.rail);
    px(ctx, 9, 0, 2, 5, C.rail);
  }
  if (!(m & 4)) {
    px(ctx, 0, TILE - 3, TILE, 3, C.rail);
    hline(ctx, 0, 15, TILE - 3, C.plankLight);
    px(ctx, 1, TILE - 5, 2, 5, C.rail);
    px(ctx, 9, TILE - 5, 2, 5, C.rail);
  }
}

/** 山頂：岩面加青苔，與非山地相接的一側描出岩緣。 */
function drawMountainTop(ctx: Ctx, m: number, v: number) {
  px(ctx, 0, 0, TILE, TILE, C.rock);
  for (let i = 0; i < 5; i++) {
    const x = Math.floor(hash(v, i, 51) * 13);
    const y = Math.floor(hash(v, i, 53) * 13);
    px(ctx, x, y, 3, 1, C.rockDark);
    px(ctx, x, y - 1, 2, 1, C.rockLight);
  }
  if (v % 2 === 0) {
    const x = Math.floor(hash(v, 9, 55) * 10) + 2;
    px(ctx, x, 6, 3, 2, C.moss);
    px(ctx, x + 1, 5, 1, 1, C.moss);
  }
  if (!(m & 1)) { hline(ctx, 0, 15, 0, C.rockDark); hline(ctx, 0, 15, 1, C.rockLight); }
  if (!(m & 8)) { vline(ctx, 0, 0, 15, C.cliffShadow); vline(ctx, 1, 0, 15, C.rockDark); }
  if (!(m & 2)) { vline(ctx, 15, 0, 15, C.cliffShadow); vline(ctx, 14, 0, 15, C.rockDark); }
}

/** 山壁正面：山的最下緣，直向岩紋，底部落一道陰影。 */
function drawCliffFace(ctx: Ctx, m: number, v: number) {
  px(ctx, 0, 0, TILE, TILE, C.cliff);
  px(ctx, 0, 0, TILE, 3, C.rock);
  hline(ctx, 0, 15, 3, C.rockLight);
  for (let x = v; x < TILE; x += 5) {
    vline(ctx, x, 5, 13, C.cliffDark);
    vline(ctx, x + 2, 7, 11, C.cliffDark);
  }
  px(ctx, 0, 13, TILE, 3, C.cliffShadow);
  if (!(m & 8)) vline(ctx, 0, 0, 15, C.cliffShadow);
  if (!(m & 2)) vline(ctx, 15, 0, 15, C.cliffShadow);
}

/** 農田：一畦畦的土壟，上面長著秧苗。 */
function drawField(ctx: Ctx, v: number) {
  px(ctx, 0, 0, TILE, TILE, C.soil);
  for (let y = 0; y < TILE; y += 4) {
    hline(ctx, 0, 15, y + 3, C.soilDark);
    for (let x = 1 + (v + y / 4) % 2; x < TILE; x += 3) {
      px(ctx, x, y + 1, 1, 2, C.sproutDark);
      px(ctx, x, y, 1, 1, C.sprout);
    }
  }
}

/** 木籬：橫欄連到左右鄰居，直柱連到上下鄰居。 */
function drawFence(ctx: Ctx, m: number, v: number) {
  drawGrass(ctx, v);
  const post = (x: number, y: number, h: number) => {
    px(ctx, x, y, 3, h, C.fence);
    vline(ctx, x + 2, y, y + h - 1, C.fenceDark);
    hline(ctx, x, x + 2, y + h - 1, C.fenceDark);
  };
  const horiz = m & 10;
  const vert = m & 5;
  if (horiz || !vert) {
    const x0 = m & 8 ? 0 : 6;
    const x1 = m & 2 ? 15 : 9;
    for (const y of [5, 10]) { hline(ctx, x0, x1, y, C.fence); hline(ctx, x0, x1, y + 1, C.fenceDark); }
  }
  if (vert) {
    const y0 = m & 1 ? 0 : 4;
    const y1 = m & 4 ? 15 : 12;
    px(ctx, 6, y0, 2, y1 - y0 + 1, C.fence);
    vline(ctx, 8, y0, y1, C.fenceDark);
  }
  post(6, 3, 11);
}
