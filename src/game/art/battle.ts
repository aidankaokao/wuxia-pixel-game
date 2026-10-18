import { Ctx, ellipse, hash, hline, makeCanvas, outline, px, vline } from './pixel';

/** 戰鬥畫面的素材：背景、傷害數字、目標箭頭、招式特效。 */

export const BATTLE_W = 320;
export const BATTLE_H = 180;
/** 地面的高度，人物站在這條線附近 */
export const GROUND_Y = 104;

function sky(ctx: Ctx, bands: string[]) {
  // 先整張鋪滿最下層的天色，山脊起伏低於色帶時才不會露出透明的洞
  px(ctx, 0, 0, BATTLE_W, BATTLE_H, bands[bands.length - 1]);
  const h = Math.ceil(70 / bands.length);
  bands.forEach((col, i) => px(ctx, 0, i * h, BATTLE_W, h, col));
}

function ridge(ctx: Ctx, base: number, amp: number, freq: number, phase: number, color: string) {
  for (let x = 0; x < BATTLE_W; x++) {
    const y = Math.round(base - amp * (0.6 * Math.sin(x * freq + phase) + 0.4 * Math.sin(x * freq * 2.7 + phase * 3)));
    vline(ctx, x, y, GROUND_Y, color);
  }
}

function pine(ctx: Ctx, x: number, y: number, h: number, color: string) {
  for (let i = 0; i < h; i++) hline(ctx, x - Math.floor(i / 3), x + Math.floor(i / 3), y + i, color);
}

function ground(ctx: Ctx, base: string, dark: string, light: string, path: string) {
  px(ctx, 0, GROUND_Y - 6, BATTLE_W, BATTLE_H - GROUND_Y + 6, base);
  for (let i = 0; i < 260; i++) {
    const x = Math.floor(hash(i, 1, 5) * BATTLE_W);
    const y = GROUND_Y - 6 + Math.floor(hash(i, 2, 5) * (BATTLE_H - GROUND_Y + 6));
    px(ctx, x, y, 2, 1, i % 3 ? dark : light);
  }
  ellipse(ctx, 160, 128, 150, 22, path);
  for (let i = 0; i < 90; i++) {
    const a = hash(i, 3, 7) * Math.PI * 2;
    const r = Math.sqrt(hash(i, 4, 7));
    px(ctx, Math.round(160 + Math.cos(a) * 140 * r), Math.round(128 + Math.sin(a) * 18 * r), 2, 1, dark);
  }
}

export function drawBattleBg(kind: 'mountain' | 'camp'): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(BATTLE_W, BATTLE_H);
  if (kind === 'mountain') {
    sky(ctx, ['#86b2d8', '#98bfe0', '#acccE6', '#c2dbee', '#d6e8f3']);
    ridge(ctx, 58, 18, 0.025, 1, '#9aaec4');
    ridge(ctx, 78, 14, 0.04, 4, '#7d93a8');
    ridge(ctx, 94, 8, 0.07, 2, '#5f8a5c');
    for (let x = 6; x < BATTLE_W; x += 13 + Math.floor(hash(x, 0, 3) * 10)) pine(ctx, x, 80 + Math.floor(hash(x, 1, 3) * 10), 16, '#3f6e45');
    ground(ctx, '#7fb069', '#5f9a52', '#9cc97c', '#c9a46a');
  } else {
    // 黃昏的山寨
    sky(ctx, ['#c98a62', '#d89e72', '#e4b486', '#ecc89c', '#f2dab4']);
    ridge(ctx, 60, 16, 0.03, 2, '#8a7484');
    ridge(ctx, 82, 10, 0.05, 5, '#6a5a6a');
    // 木柵
    for (let x = 0; x < BATTLE_W; x += 6) {
      px(ctx, x, 78, 4, 22, '#7a5230');
      px(ctx, x + 1, 76, 2, 2, '#7a5230');
      vline(ctx, x + 3, 78, 99, '#5a3a1e');
    }
    hline(ctx, 0, BATTLE_W, 84, '#4a2e16');
    hline(ctx, 0, BATTLE_W, 94, '#4a2e16');
    ground(ctx, '#a88456', '#8a6a42', '#c09a68', '#b8946a');
  }
  return c;
}

/** 傷害數字 0–9：白色字身＋深色外框，播放時用 tint 上色 */
export function drawDigits(): HTMLCanvasElement[] {
  const glyphs = [
    ['111', '101', '101', '101', '111'],
    ['010', '110', '010', '010', '111'],
    ['111', '001', '111', '100', '111'],
    ['111', '001', '011', '001', '111'],
    ['101', '101', '111', '001', '001'],
    ['111', '100', '111', '001', '111'],
    ['111', '100', '111', '101', '111'],
    ['111', '001', '010', '010', '010'],
    ['111', '101', '111', '101', '111'],
    ['111', '101', '111', '001', '111'],
  ];
  return glyphs.map((g) => {
    const [c, ctx] = makeCanvas(5, 7);
    g.forEach((row, y) => [...row].forEach((b, x) => b === '1' && px(ctx, x + 1, y + 1, 1, 1, '#ffffff')));
    outline(ctx, 0, 0, 5, 7, '#1e1a24');
    return c;
  });
}

export function drawCursor(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(9, 7);
  for (let i = 0; i < 4; i++) hline(ctx, 1 + i, 7 - i, 1 + i, '#f2d04a');
  hline(ctx, 2, 4, 1, '#fff6c0');
  outline(ctx, 0, 0, 9, 7, '#1e1a24');
  return c;
}

/** 劍光：一道斜向的白色弧光 */
export function drawSlash(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(24, 24);
  for (let i = 0; i < 20; i++) {
    const x = 2 + i;
    const y = 21 - i;
    const w = i > 3 && i < 16 ? 2 : 1;
    px(ctx, x, y, w, w, '#ffffff');
    px(ctx, x + 1, y + 1, 1, 1, '#a8d8ff');
  }
  return c;
}

/** 小方塊：火花、竹葉、真氣等粒子都用它上色 */
export function drawSpark(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(3, 3);
  px(ctx, 0, 0, 3, 3, '#ffffff');
  return c;
}

export function drawLeaf(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(5, 3);
  px(ctx, 1, 0, 3, 1, '#9ad86a');
  px(ctx, 0, 1, 5, 1, '#6ab04a');
  px(ctx, 1, 2, 2, 1, '#4a8a32');
  return c;
}
