import { TILE } from '../constants';
import { ellipse, hline, makeCanvas, outline, px, rng, vline } from './pixel';

/**
 * 場景物件（樹、竹、石、井、告示、建築……）。
 * 每個物件是一張 canvas，以「底邊中央」對齊它所在格子的底邊中央；建築則以左下角對齊佔地範圍。
 */

export interface PropArt {
  canvas: HTMLCanvasElement;
  /** 建築用：圖片左緣相對於佔地左緣的位移（屋簷會往外凸）。 */
  offsetX?: number;
}

const OUTLINE_DARK = '#1e1a24';

// ── 植物與石頭 ──────────────────────────────────────────────

function drawTree(seed: number): PropArt {
  const [c, ctx] = makeCanvas(22, 30);
  const r = rng(seed);
  px(ctx, 9, 20, 4, 9, '#6b4423');
  px(ctx, 11, 20, 2, 9, '#4f311a');
  px(ctx, 8, 28, 6, 1, '#4f311a');
  const blobs: [number, number, number][] = [[11, 12, 8], [6, 15, 5], [16, 15, 5], [11, 7, 6], [8, 9, 4], [14, 9, 4]];
  for (const [x, y, rad] of blobs) ellipse(ctx, x, y, rad, rad - 1, '#3e7d3a');
  for (const [x, y, rad] of blobs) ellipse(ctx, x - 1, y - 1, Math.max(1, rad - 3), Math.max(1, rad - 4), '#4f9446');
  for (let i = 0; i < 9; i++) px(ctx, 4 + Math.floor(r() * 14), 3 + Math.floor(r() * 14), 2, 1, '#6db35a');
  for (let i = 0; i < 6; i++) px(ctx, 4 + Math.floor(r() * 14), 8 + Math.floor(r() * 10), 1, 1, '#2f6230');
  outline(ctx, 0, 0, 22, 30, '#1f3a20');
  return { canvas: c };
}

function drawPine(seed: number): PropArt {
  const [c, ctx] = makeCanvas(18, 32);
  const r = rng(seed);
  px(ctx, 8, 24, 3, 7, '#5e3b1d');
  const tiers = [[9, 3, 3], [9, 8, 5], [9, 13, 6], [9, 18, 7]];
  for (const [cx, y, half] of tiers) {
    for (let i = 0; i < 7; i++) {
      const w = Math.round((half * (i + 1)) / 7);
      hline(ctx, cx - w, cx + w, y + i, i % 3 === 0 ? '#2f6a3c' : '#3a7a46');
    }
  }
  for (let i = 0; i < 8; i++) px(ctx, 5 + Math.floor(r() * 8), 5 + Math.floor(r() * 18), 1, 1, '#5a9a5c');
  outline(ctx, 0, 0, 18, 32, '#173022');
  return { canvas: c };
}

function drawBamboo(seed: number): PropArt {
  const [c, ctx] = makeCanvas(16, 32);
  const r = rng(seed);
  const stalks = [2 + Math.floor(r() * 2), 7, 11 + Math.floor(r() * 2)];
  stalks.forEach((x, i) => {
    const top = 2 + Math.floor(r() * 6) + i;
    px(ctx, x, top, 2, 31 - top, '#86b84a');
    vline(ctx, x + 1, top, 30, '#5f8f2f');
    for (let y = top + 4; y < 30; y += 6) hline(ctx, x, x + 1, y, '#3f6a22');
    // 竹葉
    for (let k = 0; k < 3; k++) {
      const ly = top + 2 + Math.floor(r() * 14);
      const dir = r() < 0.5 ? -1 : 1;
      px(ctx, dir < 0 ? x - 3 : x + 2, ly, 3, 1, '#5aa03a');
      px(ctx, dir < 0 ? x - 4 : x + 4, ly + 1, 2, 1, '#4a8a2e');
    }
  });
  outline(ctx, 0, 0, 16, 32, '#1f3a14');
  return { canvas: c };
}

function drawRock(): PropArt {
  const [c, ctx] = makeCanvas(16, 12);
  ellipse(ctx, 8, 7, 6, 4, '#8a8478');
  ellipse(ctx, 7, 6, 4, 2, '#a59f92');
  px(ctx, 5, 4, 3, 1, '#c2bcb0');
  px(ctx, 9, 9, 4, 1, '#6a655b');
  outline(ctx, 0, 0, 16, 12, OUTLINE_DARK);
  return { canvas: c };
}

// ── 小型設施 ───────────────────────────────────────────────

function drawWell(): PropArt {
  const [c, ctx] = makeCanvas(18, 26);
  // 木架與小屋頂
  px(ctx, 2, 6, 2, 12, '#6b4423');
  px(ctx, 14, 6, 2, 12, '#6b4423');
  hline(ctx, 2, 15, 7, '#4f311a');
  px(ctx, 8, 7, 2, 6, '#8a6a3a'); // 吊繩
  px(ctx, 7, 12, 4, 3, '#8a5a2a'); // 水桶
  for (let i = 0; i < 4; i++) hline(ctx, 1 + i, 16 - i, 4 - i, i % 2 ? '#4a5568' : '#5c6a80');
  hline(ctx, 0, 17, 5, '#3a4252');
  // 石砌井圈
  px(ctx, 2, 16, 14, 8, '#9a958a');
  ellipse(ctx, 9, 16, 7, 2, '#b8b3a7');
  ellipse(ctx, 9, 16, 5, 1, '#20304a');
  for (let x = 3; x < 16; x += 4) vline(ctx, x, 19, 23, '#7a766c');
  hline(ctx, 2, 15, 21, '#7a766c');
  outline(ctx, 0, 0, 18, 26, OUTLINE_DARK);
  return { canvas: c };
}

function drawSign(): PropArt {
  const [c, ctx] = makeCanvas(14, 20);
  px(ctx, 6, 9, 2, 10, '#6b4423');
  px(ctx, 1, 2, 12, 8, '#b98a52');
  hline(ctx, 1, 12, 2, '#d4a86a');
  hline(ctx, 1, 12, 9, '#7d532a');
  for (const y of [4, 6]) hline(ctx, 3, 10, y, '#5e3b1d');
  outline(ctx, 0, 0, 14, 20, OUTLINE_DARK);
  return { canvas: c };
}

function drawBulletin(): PropArt {
  const [c, ctx] = makeCanvas(24, 26);
  px(ctx, 2, 6, 2, 19, '#6b4423');
  px(ctx, 20, 6, 2, 19, '#6b4423');
  for (let i = 0; i < 3; i++) hline(ctx, 1 + i, 22 - i, 4 - i, i % 2 ? '#4a5568' : '#5c6a80');
  hline(ctx, 0, 23, 5, '#3a4252');
  px(ctx, 4, 7, 16, 12, '#8a5a2a');
  // 貼著的告示
  px(ctx, 5, 8, 6, 8, '#efe6cf');
  px(ctx, 12, 9, 7, 6, '#e6dcc0');
  for (const y of [10, 12, 14]) hline(ctx, 6, 9, y, '#6a5a4a');
  for (const y of [11, 13]) hline(ctx, 13, 17, y, '#6a5a4a');
  px(ctx, 7, 8, 2, 1, '#c43c32');
  outline(ctx, 0, 0, 24, 26, OUTLINE_DARK);
  return { canvas: c };
}

function drawStele(): PropArt {
  const [c, ctx] = makeCanvas(14, 24);
  px(ctx, 1, 19, 12, 4, '#7a766c');
  px(ctx, 3, 3, 8, 17, '#9a958a');
  px(ctx, 4, 1, 6, 2, '#9a958a');
  vline(ctx, 3, 4, 19, '#b8b3a7');
  for (let y = 6; y < 18; y += 2) hline(ctx, 6, 8, y, '#5f5b53');
  px(ctx, 10, 12, 1, 6, '#6f9a55'); // 青苔
  outline(ctx, 0, 0, 14, 24, OUTLINE_DARK);
  return { canvas: c };
}

// ── 建築 ────────────────────────────────────────────────

export interface BuildingStyle {
  /** 佔地寬、高（格） */
  w: number;
  h: number;
  /** 門位於第幾格（由左起算，0 開始），門一定在最下排 */
  door: number;
  roof: string;
  roofDark: string;
  roofLight: string;
  wall?: string;
  timber?: string;
  lanterns?: boolean;
  plaque?: boolean;
  banner?: boolean;
  chimney?: boolean;
}

export const BUILDINGS: Record<string, BuildingStyle> = {
  hall: { w: 7, h: 5, door: 3, roof: '#3f4a5e', roofDark: '#2a3242', roofLight: '#5a6880', timber: '#8a2e26', lanterns: true, plaque: true },
  teahouse: { w: 6, h: 4, door: 2, roof: '#3e6656', roofDark: '#284638', roofLight: '#56826f', lanterns: true, banner: true },
  smithy: { w: 5, h: 4, door: 2, roof: '#4a4248', roofDark: '#302a2e', roofLight: '#625860', wall: '#c9bda6', chimney: true },
  house: { w: 5, h: 4, door: 2, roof: '#4a5568', roofDark: '#323a4a', roofLight: '#64708a' },
  house2: { w: 5, h: 4, door: 2, roof: '#6a4a3a', roofDark: '#4a3226', roofLight: '#86624e' },
};

const EAVE = 2; // 屋簷左右外凸的像素
const RISE = 10; // 屋頂高出佔地上緣的像素

function drawBuilding(st: BuildingStyle): PropArt {
  const W = st.w * TILE + EAVE * 2;
  const H = st.h * TILE + RISE;
  const [c, ctx] = makeCanvas(W, H);
  const wall = st.wall ?? '#e8e0cc';
  const timber = st.timber ?? '#6e3a24';
  const roofBottom = RISE + Math.round(st.h * TILE * 0.48);
  const fx0 = EAVE + 1; // 牆面左右緣
  const fx1 = W - EAVE - 2;

  // 牆
  px(ctx, fx0, roofBottom, fx1 - fx0 + 1, H - roofBottom - 3, wall);
  hline(ctx, fx0, fx1, roofBottom, timber);
  hline(ctx, fx0, fx1, roofBottom + 1, timber);
  // 石砌台基
  px(ctx, EAVE, H - 4, W - EAVE * 2, 4, '#8f8a7e');
  hline(ctx, EAVE, W - EAVE - 1, H - 4, '#aaa597');
  for (let x = EAVE + 3; x < W - EAVE; x += 6) vline(ctx, x, H - 3, H - 1, '#6f6b61');

  // 柱子：兩端與每格邊界
  const doorX0 = EAVE + st.door * TILE + 2;
  const doorX1 = doorX0 + 11;
  for (let i = 0; i <= st.w; i++) {
    const x = Math.min(fx1 - 1, Math.max(fx0, EAVE + i * TILE - 1));
    px(ctx, x, roofBottom, 2, H - roofBottom - 4, timber);
  }
  // 窗：避開門那一格
  const winY = roofBottom + Math.max(5, Math.round((H - roofBottom) * 0.22));
  for (let i = 0; i < st.w; i++) {
    if (i === st.door) continue;
    const wx = EAVE + i * TILE + 3;
    px(ctx, wx, winY, 10, 8, '#f2e6c8');
    for (let k = 0; k <= 10; k += 3) vline(ctx, wx + Math.min(k, 9), winY, winY + 7, '#6a4228');
    hline(ctx, wx, wx + 9, winY, '#6a4228');
    hline(ctx, wx, wx + 9, winY + 4, '#6a4228');
    hline(ctx, wx, wx + 9, winY + 7, '#6a4228');
  }
  // 門
  const doorTop = H - 4 - 15;
  px(ctx, doorX0 - 1, doorTop - 1, 14, 16, timber);
  px(ctx, doorX0, doorTop, 12, 15, '#4a2c1a');
  vline(ctx, doorX0 + 6, doorTop, doorTop + 14, '#2e1a0e');
  for (let y = doorTop + 3; y < doorTop + 14; y += 4) {
    px(ctx, doorX0 + 2, y, 1, 1, '#d4a640');
    px(ctx, doorX0 + 9, y, 1, 1, '#d4a640');
  }
  px(ctx, doorX0 + 4, doorTop + 7, 1, 2, '#d4a640');
  px(ctx, doorX0 + 7, doorTop + 7, 1, 2, '#d4a640');

  // 屋頂：上陡下緩的曲面，兩端翹起
  const top = 5;
  for (let y = top; y < roofBottom; y++) {
    const t = (roofBottom - y) / (roofBottom - top);
    const inset = Math.round(7 * t * t) + 1;
    hline(ctx, inset, W - 1 - inset, y, st.roof);
  }
  for (let x = 2; x < W - 2; x += 3) {
    for (let y = top + 1; y < roofBottom - 2; y++) {
      const t = (roofBottom - y) / (roofBottom - top);
      const inset = Math.round(7 * t * t) + 1;
      if (x > inset && x < W - 1 - inset) px(ctx, x, y, 1, 1, st.roofDark);
    }
  }
  for (let y = top + 3; y < roofBottom - 2; y += 4) {
    const t = (roofBottom - y) / (roofBottom - top);
    const inset = Math.round(7 * t * t) + 2;
    hline(ctx, inset, W - 1 - inset, y, st.roofLight);
  }
  // 簷口與翹角
  hline(ctx, 0, W - 1, roofBottom - 2, st.roofDark);
  hline(ctx, 1, W - 2, roofBottom - 1, st.roofDark);
  px(ctx, 0, roofBottom - 4, 1, 2, st.roofDark);
  px(ctx, W - 1, roofBottom - 4, 1, 2, st.roofDark);
  // 屋脊與鴟吻
  hline(ctx, 7, W - 8, top - 1, st.roofDark);
  hline(ctx, 7, W - 8, top, st.roofDark);
  px(ctx, 5, top - 3, 2, 4, st.roofDark);
  px(ctx, W - 7, top - 3, 2, 4, st.roofDark);
  px(ctx, 4, top - 4, 2, 1, st.roofDark);
  px(ctx, W - 6, top - 4, 2, 1, st.roofDark);

  if (st.plaque) {
    const pw = 16;
    const px0 = doorX0 + 6 - pw / 2;
    px(ctx, px0, roofBottom + 2, pw, 5, '#2a2a3a');
    hline(ctx, px0, px0 + pw - 1, roofBottom + 2, '#d4a640');
    hline(ctx, px0, px0 + pw - 1, roofBottom + 6, '#d4a640');
    for (let x = px0 + 3; x < px0 + pw - 2; x += 4) px(ctx, x, roofBottom + 4, 2, 1, '#d4a640');
  }
  if (st.lanterns) {
    for (const lx of [doorX0 - 4, doorX1 + 4]) {
      vline(ctx, lx, roofBottom, roofBottom + 2, '#3a2a1a');
      px(ctx, lx - 1, roofBottom + 3, 3, 1, '#d4a640');
      ellipse(ctx, lx, roofBottom + 6, 2, 3, '#d83a2e');
      px(ctx, lx, roofBottom + 5, 1, 2, '#ff8a6a');
      px(ctx, lx - 1, roofBottom + 9, 3, 1, '#d4a640');
    }
  }
  if (st.banner) {
    // 茶幌：一面掛在簷下的布招
    const bx = EAVE + (st.w - 1) * TILE + 4;
    vline(ctx, bx + 3, roofBottom, roofBottom + 2, '#3a2a1a');
    px(ctx, bx, roofBottom + 2, 7, 16, '#efe6cf');
    px(ctx, bx, roofBottom + 2, 7, 2, '#3b6ea5');
    px(ctx, bx, roofBottom + 16, 7, 2, '#3b6ea5');
    px(ctx, bx + 2, roofBottom + 6, 3, 1, '#2a2a3a');
    px(ctx, bx + 3, roofBottom + 5, 1, 7, '#2a2a3a');
    px(ctx, bx + 1, roofBottom + 9, 5, 1, '#2a2a3a');
    px(ctx, bx + 2, roofBottom + 12, 3, 1, '#2a2a3a');
  }
  if (st.chimney) {
    const cx = W - 16;
    px(ctx, cx, top - 3, 6, 12, '#8a4a3a');
    for (let y = top - 1; y < top + 9; y += 3) hline(ctx, cx, cx + 5, y, '#6a3428');
    px(ctx, cx - 1, top - 4, 8, 2, '#5a2a20');
    // 爐火從窗口透出
    px(ctx, EAVE + 3, winY, 10, 8, '#ff9a3a');
    px(ctx, EAVE + 5, winY + 3, 6, 5, '#ffd06a');
  }

  outline(ctx, 0, 0, W, H, OUTLINE_DARK);
  return { canvas: c, offsetX: -EAVE };
}

// ── 匯出 ────────────────────────────────────────────────

/** 所有物件素材的 key 與繪製函式，供啟動場景一次產生成貼圖。 */
export function allProps(): Record<string, PropArt> {
  const out: Record<string, PropArt> = {
    tree0: drawTree(11),
    tree1: drawTree(29),
    pine0: drawPine(5),
    pine1: drawPine(17),
    bamboo0: drawBamboo(3),
    bamboo1: drawBamboo(41),
    bamboo2: drawBamboo(77),
    rock: drawRock(),
    well: drawWell(),
    sign: drawSign(),
    bulletin: drawBulletin(),
    stele: drawStele(),
  };
  for (const [k, st] of Object.entries(BUILDINGS)) out[`b_${k}`] = drawBuilding(st);
  return out;
}
