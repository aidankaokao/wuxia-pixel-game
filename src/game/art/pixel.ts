/** 程式化像素繪圖的共用工具。所有素材都在遊戲啟動時畫到 canvas 上，不需要外部圖檔。 */

export type Ctx = CanvasRenderingContext2D;

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  return [c, ctx];
}

/** 畫一塊實心矩形（座標、寬高皆為整數像素）。 */
export function px(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** 畫一條水平線段 x0..x1（含）。 */
export function hline(ctx: Ctx, x0: number, x1: number, y: number, color: string) {
  px(ctx, Math.min(x0, x1), y, Math.abs(x1 - x0) + 1, 1, color);
}

/** 畫一條垂直線段 y0..y1（含）。 */
export function vline(ctx: Ctx, x: number, y0: number, y1: number, color: string) {
  px(ctx, x, Math.min(y0, y1), 1, Math.abs(y1 - y0) + 1, color);
}

/** 以像素逐列填滿的橢圓，邊緣不做反鋸齒。 */
export function ellipse(ctx: Ctx, cx: number, cy: number, rx: number, ry: number, color: string) {
  for (let y = -ry; y <= ry; y++) {
    const w = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry || 1))));
    if (w > 0) px(ctx, Math.round(cx - w), Math.round(cy + y), w * 2, 1, color);
  }
}

/** 由座標決定的穩定雜湊，讓同一格每次畫出的細節都一樣。 */
export function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** 可重現的亂數產生器（mulberry32）。 */
export function rng(seed: number) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * 替畫好的圖加上一圈外框：凡是透明、且上下左右鄰接不透明像素的位置，都塗上外框色。
 * 只描 (x, y, w, h) 範圍內，避免精靈表的相鄰格子互相影響。
 */
export function outline(ctx: Ctx, x: number, y: number, w: number, h: number, color: string) {
  const img = ctx.getImageData(x, y, w, h);
  const d = img.data;
  const solid = (i: number, j: number) => i >= 0 && j >= 0 && i < w && j < h && d[(j * w + i) * 4 + 3] > 100;
  const marks: number[] = [];
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      if (solid(i, j)) continue;
      if (solid(i - 1, j) || solid(i + 1, j) || solid(i, j - 1) || solid(i, j + 1)) marks.push(i, j);
    }
  ctx.fillStyle = color;
  for (let k = 0; k < marks.length; k += 2) ctx.fillRect(x + marks[k], y + marks[k + 1], 1, 1);
}
