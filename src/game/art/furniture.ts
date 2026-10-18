import { ellipse, hline, makeCanvas, outline, px, vline } from './pixel';
import type { PropArt } from './props';

/**
 * 家具與房產相關的物件：每件家具依「風格 × 等級」各畫一張，key 為 f_{家具}_{風格}_{等級}。
 * 風格決定木色與布色；等級越高細節越多（花紋、金邊……）。
 */

interface Palette {
  wood: string;
  woodDark: string;
  woodLight: string;
  cloth: string;
  clothDark: string;
}

const PAL: Record<string, Palette> = {
  plain: { wood: '#9a6a3a', woodDark: '#6a4428', woodLight: '#b88a52', cloth: '#5a7a9a', clothDark: '#425b78' },
  scholar: { wood: '#7a5a3a', woodDark: '#4a3420', woodLight: '#9a7a52', cloth: '#a8c0a0', clothDark: '#7a9a78' },
  martial: { wood: '#5a2a1e', woodDark: '#3a1810', woodLight: '#7a3a2a', cloth: '#a83a2a', clothDark: '#7a2a1e' },
};
const GOLD = '#d4a640';
const OUTLINE = '#1e1a24';

const done = (c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): PropArt => {
  outline(ctx, 0, 0, c.width, c.height, OUTLINE);
  return { canvas: c };
};

function bed(p: Palette, lv: number, guest = false): PropArt {
  const [c, ctx] = makeCanvas(32, 26);
  const cloth = guest ? '#c8b890' : p.cloth;
  const clothDark = guest ? '#a89870' : p.clothDark;
  // 床架
  px(ctx, 1, 9, 30, 15, p.wood);
  hline(ctx, 1, 30, 23, p.woodDark);
  px(ctx, 1, 9, 3, 15, p.woodDark);
  // 枕頭與被子
  px(ctx, 4, 11, 6, 10, '#f1e7cf');
  px(ctx, 11, 10, 18, 12, cloth);
  hline(ctx, 11, 28, 10, clothDark);
  if (lv >= 2) for (let x = 13; x < 28; x += 4) vline(ctx, x, 12, 20, clothDark);
  if (lv >= 3) {
    // 床柱與金邊
    for (const x of [1, 29]) px(ctx, x, 1, 2, 9, p.woodDark);
    hline(ctx, 1, 30, 1, p.woodDark);
    hline(ctx, 11, 28, 21, GOLD);
    px(ctx, 14, 2, 4, 2, GOLD);
  }
  return done(c, ctx);
}

function table(p: Palette): PropArt {
  const [c, ctx] = makeCanvas(32, 22);
  // 竹凳
  for (const x of [1, 25]) {
    ellipse(ctx, x + 3, 15, 3, 2, p.woodLight);
    vline(ctx, x + 1, 16, 20, p.woodDark);
    vline(ctx, x + 5, 16, 20, p.woodDark);
  }
  // 方桌
  px(ctx, 8, 7, 16, 7, p.wood);
  hline(ctx, 8, 23, 7, p.woodLight);
  for (const x of [9, 22]) vline(ctx, x, 14, 20, p.woodDark);
  // 茶壺
  px(ctx, 14, 3, 4, 4, '#d8d0c0');
  px(ctx, 18, 4, 2, 1, '#d8d0c0');
  return done(c, ctx);
}

function stove(p: Palette, lv: number): PropArt {
  const [c, ctx] = makeCanvas(32, 26);
  // 磚砌灶台
  px(ctx, 2, 10, 28, 14, '#a8584a');
  for (let y = 12; y < 24; y += 3) hline(ctx, 2, 29, y, '#7a3a30');
  for (let y = 10; y < 24; y += 6) for (let x = 6; x < 30; x += 8) vline(ctx, x, y, y + 2, '#7a3a30');
  hline(ctx, 2, 29, 10, '#c8a090');
  // 灶口的火
  px(ctx, 6, 18, 6, 5, '#2a1a14');
  px(ctx, 7, 20, 4, 3, '#e8803a');
  px(ctx, 8, 21, 2, 2, '#f8d050');
  // 鍋
  const pots = lv >= 2 ? [10, 22] : [16];
  for (const x of pots) {
    ellipse(ctx, x, 9, 5, 2, '#2a2a30');
    px(ctx, x - 4, 6, 9, 3, '#3a3a42');
  }
  if (lv >= 3) {
    // 煙囪
    px(ctx, 26, 0, 4, 10, '#8a8a8a');
    hline(ctx, 26, 29, 0, '#aaaaaa');
    px(ctx, 2, 23, 28, 1, GOLD);
  }
  void p;
  return done(c, ctx);
}

function shelf(p: Palette, lv: number): PropArt {
  const [c, ctx] = makeCanvas(32, 30);
  px(ctx, 2, 1, 28, 28, p.wood);
  px(ctx, 4, 3, 24, 24, p.woodDark);
  const colors = ['#8a3a34', '#3a5a8a', '#c8a050', '#4a7a4a', '#e8dcc0', '#6a4a7a'];
  const rows = [3, 11, 19];
  rows.forEach((y, r) => {
    hline(ctx, 4, 27, y + 7, p.woodLight);
    const n = 4 + lv * 2;
    for (let i = 0; i < n; i++) {
      const x = 5 + Math.floor((i * 22) / n);
      px(ctx, x, y + 1 + ((i + r) % 2), 2, 6 - ((i + r) % 2), colors[(i + r * 2) % colors.length]);
    }
  });
  if (lv >= 3) {
    hline(ctx, 2, 29, 1, GOLD);
    hline(ctx, 2, 29, 28, GOLD);
  }
  return done(c, ctx);
}

function dummy(p: Palette, lv: number): PropArt {
  const [c, ctx] = makeCanvas(16, 30);
  px(ctx, 6, 2, 5, 26, p.wood);
  vline(ctx, 6, 2, 27, p.woodDark);
  ellipse(ctx, 8, 3, 3, 2, p.woodLight);
  // 樁手
  const arms = lv >= 2 ? [8, 13, 18] : [9, 15];
  arms.forEach((y, i) => px(ctx, i % 2 ? 11 : 1, y, 4, 2, p.woodLight));
  if (lv >= 3) for (const y of [6, 22]) hline(ctx, 6, 10, y, '#9aa0a8');
  px(ctx, 3, 27, 11, 3, '#6a5a4a');
  return done(c, ctx);
}

function furnace(_p: Palette, lv: number): PropArt {
  const [c, ctx] = makeCanvas(16, 22);
  const body = lv >= 3 ? '#c8a050' : lv >= 2 ? '#a8804a' : '#8a6a4a';
  for (const x of [3, 12]) vline(ctx, x, 15, 21, '#5a4a3a');
  ellipse(ctx, 8, 12, 6, 5, body);
  hline(ctx, 2, 13, 8, '#5a4a3a');
  px(ctx, 4, 6, 8, 2, body);
  px(ctx, 6, 10, 4, 3, '#e8803a');
  vline(ctx, 7, 1, 4, '#d8d8e0');
  vline(ctx, 9, 0, 3, '#d8d8e0');
  return done(c, ctx);
}

function garden(_p: Palette, lv: number): PropArt {
  const [c, ctx] = makeCanvas(48, 16);
  px(ctx, 1, 4, 46, 11, '#7a5232');
  for (let x = 3; x < 46; x += 6) hline(ctx, x, x + 3, 9, '#5a3a22');
  const n = 3 + lv * 2;
  for (let i = 0; i < n; i++) {
    const x = 4 + Math.floor((i * 40) / n);
    const y = 5 + (i % 2) * 4;
    vline(ctx, x + 1, y, y + 3, '#4a7a30');
    px(ctx, x, y, 3, 2, '#6aaa40');
  }
  return done(c, ctx);
}

function deco(p: Palette, style: string): PropArt {
  if (style === 'scholar') {
    // 牆上的字畫
    const [c, ctx] = makeCanvas(16, 16);
    px(ctx, 3, 1, 10, 14, '#f1e7cf');
    hline(ctx, 2, 13, 1, p.woodDark);
    hline(ctx, 2, 13, 14, p.woodDark);
    for (const [x, y] of [[5, 5], [6, 4], [8, 6], [9, 5], [10, 7]] as const) px(ctx, x, y, 1, 1, '#4a4a52');
    hline(ctx, 4, 11, 9, '#7a8a7a');
    px(ctx, 10, 11, 2, 2, '#c4483c');
    return done(c, ctx);
  }
  if (style === 'martial') {
    // 兵器架
    const [c, ctx] = makeCanvas(32, 28);
    px(ctx, 2, 22, 28, 3, p.wood);
    hline(ctx, 2, 29, 10, p.woodDark);
    for (const x of [3, 28]) vline(ctx, x, 8, 24, p.woodDark);
    for (const [x, col] of [[8, '#c8ccd4'], [14, '#b0b4bc'], [20, '#c8ccd4'], [25, '#8a6a46']] as const) {
      vline(ctx, x, 1, 21, col);
      px(ctx, x - 1, 1, 3, 3, col === '#8a6a46' ? '#c43c32' : '#e8ecf0');
    }
    return done(c, ctx);
  }
  // 竹子盆栽
  const [c, ctx] = makeCanvas(16, 22);
  px(ctx, 4, 15, 8, 6, '#a8584a');
  hline(ctx, 3, 12, 15, '#c87a6a');
  for (const x of [6, 9]) vline(ctx, x, 3, 14, '#5a9a3a');
  for (const [x, y] of [[3, 5], [10, 3], [3, 9], [10, 8]] as const) px(ctx, x, y, 4, 1, '#7aba5a');
  return done(c, ctx);
}

/** 空地四角的木樁 */
function stake(): PropArt {
  const [c, ctx] = makeCanvas(16, 14);
  px(ctx, 6, 2, 4, 11, '#9a6a3a');
  vline(ctx, 6, 2, 12, '#6a4428');
  px(ctx, 6, 3, 4, 2, '#c4483c');
  return done(c, ctx);
}

/** 貨郎的攤子：布篷、木櫃、擺著貨物 */
function stall(): PropArt {
  const [c, ctx] = makeCanvas(32, 30);
  for (const x of [2, 29]) vline(ctx, x, 4, 28, '#6a4428');
  px(ctx, 0, 1, 32, 6, '#c4483c');
  for (let x = 0; x < 32; x += 8) px(ctx, x, 1, 4, 6, '#e8dcc0');
  hline(ctx, 0, 31, 7, '#8a2a24');
  px(ctx, 2, 18, 28, 10, '#9a6a3a');
  hline(ctx, 2, 29, 18, '#b88a52');
  // 貨物
  px(ctx, 5, 14, 4, 4, '#e8e0cc');
  px(ctx, 11, 15, 5, 3, '#7aa88a');
  px(ctx, 18, 13, 3, 5, '#8a5a3a');
  px(ctx, 23, 15, 4, 3, '#c8a050');
  return done(c, ctx);
}

/** 所有家具與房產物件的貼圖 */
export function furnitureProps(): Record<string, PropArt> {
  const out: Record<string, PropArt> = { stake: stake(), stall: stall() };
  for (const style of Object.keys(PAL)) {
    const p = PAL[style];
    for (let lv = 1; lv <= 3; lv++) {
      out[`f_bed_${style}_${lv}`] = bed(p, lv);
      out[`f_stove_${style}_${lv}`] = stove(p, lv);
      out[`f_shelf_${style}_${lv}`] = shelf(p, lv);
      out[`f_dummy_${style}_${lv}`] = dummy(p, lv);
      out[`f_furnace_${style}_${lv}`] = furnace(p, lv);
      out[`f_garden_${style}_${lv}`] = garden(p, lv);
    }
    out[`f_table_${style}_1`] = table(p);
    out[`f_guestbed_${style}_1`] = bed(p, 1, true);
    out[`f_deco_${style}_1`] = deco(p, style);
  }
  return out;
}
