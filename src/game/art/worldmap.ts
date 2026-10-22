import { CELL, EDGES, NodeKind, Terrain, WORLD_H, WORLD_W, worldTerrain } from '../world/geo';
import { ellipse, hash, hline, makeCanvas, outline, px, vline, type Ctx } from './pixel';

/**
 * 大地圖的像素美術：整張地形畫成一張圖（每格 8×8），道路畫在上面；
 * 節點圖示（城、村、門派、野外、港口、未開放的「？」）與大地圖上的小人另外畫成小圖。
 */

const WATER = { sea: '#2c5788', seaWave: '#46739f', shallow: '#4a82b4', shallowWave: '#6a9ccc', fresh: '#4a8ac4', freshLight: '#8cc2e6' };
const LAND = {
  plain: '#8eb86a', plainDot: '#7aa65a', plainLight: '#a6c87e',
  forest: '#3e7a42', forestDark: '#2a5a32', trunk: '#5a3a20',
  hill: '#9cb070', hillDark: '#7a9050',
  mount: '#8c7c6a', mountDark: '#6a5a4c', mountLight: '#b0a08c', snow: '#eef0f4',
  beach: '#e6d6a0', beachDot: '#cdbb84',
};

/** 一格地形 */
function drawCell(ctx: Ctx, t: Terrain, x: number, y: number, near: (dx: number, dy: number) => Terrain) {
  const X = x * CELL;
  const Y = y * CELL;
  const r = hash(x, y, 7);
  switch (t) {
    case 'sea':
    case 'shallow': {
      px(ctx, X, Y, CELL, CELL, t === 'sea' ? WATER.sea : WATER.shallow);
      if (r < 0.35) hline(ctx, X + 1 + Math.floor(r * 8), X + 3 + Math.floor(r * 8), Y + 2 + Math.floor(r * 10) % 5, t === 'sea' ? WATER.seaWave : WATER.shallowWave);
      break;
    }
    case 'river':
    case 'lake': {
      px(ctx, X, Y, CELL, CELL, WATER.fresh);
      if (r < 0.3) hline(ctx, X + 2, X + 4, Y + 3 + Math.floor(r * 10) % 3, WATER.freshLight);
      break;
    }
    case 'beach': {
      px(ctx, X, Y, CELL, CELL, LAND.beach);
      if (r < 0.5) px(ctx, X + Math.floor(r * 14) % 7, Y + Math.floor(r * 30) % 7, 1, 1, LAND.beachDot);
      break;
    }
    case 'plain': {
      px(ctx, X, Y, CELL, CELL, LAND.plain);
      if (r < 0.4) px(ctx, X + Math.floor(r * 17) % 7, Y + Math.floor(r * 23) % 7, 1, 1, LAND.plainDot);
      if (r > 0.85) px(ctx, X + 3, Y + 4, 1, 1, LAND.plainLight);
      break;
    }
    case 'forest': {
      px(ctx, X, Y, CELL, CELL, LAND.plain);
      // 兩棵小樹，位置依雜湊錯開
      for (const [ox, oy] of [[1 + Math.floor(r * 2), 1], [4 - Math.floor(r * 2), 4]] as const) {
        ellipse(ctx, X + ox + 1.5, Y + oy + 1.5, 2, 2, LAND.forestDark);
        ellipse(ctx, X + ox + 1.5, Y + oy + 1, 1.5, 1.5, LAND.forest);
        px(ctx, X + ox + 1, Y + oy + 3, 1, 1, LAND.trunk);
      }
      break;
    }
    case 'hill': {
      px(ctx, X, Y, CELL, CELL, LAND.hill);
      if (r < 0.6) {
        hline(ctx, X + 1, X + 5, Y + 5, LAND.hillDark);
        hline(ctx, X + 2, X + 4, Y + 4, LAND.hillDark);
      }
      break;
    }
    case 'mount':
    case 'peak': {
      px(ctx, X, Y, CELL, CELL, near(0, 1) === 'plain' || near(0, 1) === 'forest' ? LAND.hill : LAND.hill);
      // 山峰：三角形，左亮右暗；高山頂上積雪
      for (let i = 0; i < 4; i++) {
        hline(ctx, X + 3 - i, X + 3, Y + 2 + i, LAND.mountLight);
        hline(ctx, X + 4, X + 4 + i, Y + 2 + i, LAND.mountDark);
      }
      hline(ctx, X, X + 7, Y + 6, LAND.mountDark);
      if (t === 'peak') {
        px(ctx, X + 3, Y + 2, 2, 1, LAND.snow);
        px(ctx, X + 2, Y + 3, 1, 1, LAND.snow);
      }
      vline(ctx, X + 3, Y + 1, Y + 1, LAND.mountLight);
      break;
    }
  }
  // 水岸：陸地挨著水的一邊描一條淺色
  if (t !== 'sea' && t !== 'shallow' && t !== 'river' && t !== 'lake') {
    const wet = (n: Terrain) => n === 'river' || n === 'lake' || n === 'shallow' || n === 'sea';
    if (wet(near(0, -1))) hline(ctx, X, X + 7, Y, '#d8cc96');
    if (wet(near(0, 1))) hline(ctx, X, X + 7, Y + 7, '#d8cc96');
    if (wet(near(-1, 0))) vline(ctx, X, Y, Y + 7, '#d8cc96');
    if (wet(near(1, 0))) vline(ctx, X + 7, Y, Y + 7, '#d8cc96');
  }
}

/** 道路：沿著路經過的格子中心畫一條土黃色的路；過水的地方沒有橋（靠渡船），不畫 */
function drawRoads(ctx: Ctx, terrain: Terrain[][]) {
  for (const e of EDGES) {
    for (let i = 1; i < e.path.length; i++) {
      const [x0, y0] = e.path[i - 1];
      const [x1, y1] = e.path[i];
      const steps = 8;
      for (let k = 0; k <= steps; k++) {
        const fx = (x0 + (x1 - x0) * (k / steps)) * CELL + 3;
        const fy = (y0 + (y1 - y0) * (k / steps)) * CELL + 3;
        const t = terrain[Math.round(fy / CELL - 0.4)]?.[Math.round(fx / CELL - 0.4)];
        if (t === 'river' || t === 'lake') continue;
        px(ctx, Math.round(fx), Math.round(fy), 2, 2, '#c8a46a');
        if (k % 4 === 0) px(ctx, Math.round(fx), Math.round(fy) + 1, 1, 1, '#a8844a');
      }
    }
  }
}

/** 整張大地圖 */
export function drawWorldMap(): HTMLCanvasElement {
  const terrain = worldTerrain();
  const [c, ctx] = makeCanvas(WORLD_W * CELL, WORLD_H * CELL);
  const at = (x: number, y: number): Terrain => terrain[Math.max(0, Math.min(WORLD_H - 1, y))][Math.max(0, Math.min(WORLD_W - 1, x))];
  for (let y = 0; y < WORLD_H; y++) for (let x = 0; x < WORLD_W; x++) drawCell(ctx, terrain[y][x], x, y, (dx, dy) => at(x + dx, y + dy));
  drawRoads(ctx, terrain);
  return c;
}

/** 節點圖示（12×12） */
export function drawNodeIcon(kind: NodeKind | 'locked'): HTMLCanvasElement {
  const [layer, l] = makeCanvas(12, 12);
  switch (kind) {
    case 'city':
      // 城牆與城樓
      px(l, 1, 6, 10, 5, '#b8b0a0');
      for (const x of [1, 4, 7, 10]) px(l, x, 5, 1, 1, '#b8b0a0');
      px(l, 5, 8, 2, 3, '#4a3a2a');
      px(l, 3, 2, 6, 3, '#8a2e26');
      hline(l, 2, 9, 2, '#3f4a5e');
      hline(l, 3, 8, 1, '#3f4a5e');
      break;
    case 'village':
      // 兩間小屋
      for (const [x, y] of [[1, 5], [6, 3]] as const) {
        px(l, x, y + 2, 5, 4, '#d0c098');
        hline(l, x - 1, x + 5, y + 1, '#a88a48');
        hline(l, x, x + 4, y, '#a88a48');
        px(l, x + 2, y + 4, 1, 2, '#5a3a20');
      }
      break;
    case 'sect':
      // 山門：兩層飛簷
      px(l, 3, 6, 6, 5, '#e8e0cc');
      px(l, 5, 8, 2, 3, '#5a3a20');
      hline(l, 1, 10, 5, '#3e6656');
      hline(l, 2, 9, 4, '#3e6656');
      hline(l, 3, 8, 2, '#3e6656');
      hline(l, 4, 7, 1, '#3e6656');
      px(l, 1, 4, 1, 1, '#3e6656');
      px(l, 10, 4, 1, 1, '#3e6656');
      break;
    case 'wild':
      // 一面插在地上的旗子
      vline(l, 4, 1, 10, '#6a4428');
      px(l, 5, 1, 5, 4, '#c4483c');
      px(l, 2, 10, 6, 1, '#7a9050');
      break;
    case 'port':
      // 帆船
      px(l, 1, 8, 10, 2, '#7a5232');
      vline(l, 6, 1, 8, '#5a3a20');
      for (let i = 0; i < 5; i++) hline(l, 7, 7 + 4 - i, 2 + i, '#f1e7cf');
      for (let i = 0; i < 4; i++) hline(l, 6 - (3 - i), 5, 3 + i, '#e0d4b8');
      break;
    case 'inn':
      // 驛站：小瓦房，門口一根掛燈籠的竿子
      px(l, 2, 6, 7, 5, '#d0c098');
      hline(l, 1, 9, 5, '#5a6070');
      hline(l, 2, 8, 4, '#5a6070');
      px(l, 4, 8, 2, 3, '#5a3a20');
      vline(l, 10, 2, 10, '#6a4428');
      px(l, 9, 3, 2, 2, '#e8603a');
      break;
    case 'ferry':
      // 渡船：小船與撐篙
      px(l, 2, 7, 8, 2, '#7a5232');
      hline(l, 1, 10, 7, '#9a6a3a');
      px(l, 4, 5, 3, 2, '#d8c8a0');
      vline(l, 8, 1, 7, '#5a3a20');
      hline(l, 0, 11, 10, '#4a8ac4');
      break;
    case 'locked':
      // 問號
      ellipse(l, 6, 6, 5, 5, '#e8dcc0');
      px(l, 4, 3, 4, 1, '#5a4a3a');
      px(l, 7, 4, 1, 2, '#5a4a3a');
      px(l, 6, 6, 1, 1, '#5a4a3a');
      px(l, 6, 8, 1, 1, '#5a4a3a');
      break;
  }
  outline(l, 0, 0, 12, 12, '#1a1218');
  return layer;
}

/** 大地圖上的小人：兩格走路動畫（各 7×10），橫排在一張圖上 */
export function drawWorldHero(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(18, 12);
  for (const f of [0, 1]) {
    const [l, g] = makeCanvas(9, 12);
    px(g, 3, 1, 3, 3, '#f0c8a0');
    px(g, 3, 0, 3, 2, '#2a2228');
    px(g, 2, 4, 5, 4, '#3e6a9a');
    px(g, 3, 3, 3, 1, '#2a2228');
    hline(g, 2, 6, 7, '#c8a050');
    px(g, f ? 2 : 3, 8, 2, 3, '#4a4048');
    px(g, f ? 5 : 4, 8, 2, 3, '#4a4048');
    outline(g, 0, 0, 9, 12, '#1a1218');
    ctx.drawImage(l, f * 9, 0);
  }
  return c;
}
