import { ellipse, hline, makeCanvas, outline, px, vline } from './pixel';

/**
 * 做事的過場動畫：掃地、挑水、翻曬草藥、整理書冊、澆菜、做菜、織布、讀書、睡覺。
 * 每種 4 格，64×40，由介面放大顯示（見 ui/WorkAnim.tsx）。
 */

export type WorkKind = 'sweep' | 'water' | 'herbs' | 'books' | 'garden' | 'cook' | 'weave' | 'read' | 'sleep';
export const WORK_W = 64;
export const WORK_H = 40;
export const WORK_FRAMES = 4;

type Ctx = CanvasRenderingContext2D;
const OUTLINE = '#1a1218';
const SKIN = '#f0c8a0';
const HAIR = '#2a2228';
const ROBE = '#8a8a90';

/** 簡單的小人：腳底在 (x, y)，lean 是身體往左右歪幾格 */
function figure(ctx: Ctx, x: number, y: number, lean = 0, robe = ROBE) {
  px(ctx, x - 2 + lean, y - 15, 5, 4, SKIN);
  px(ctx, x - 2 + lean, y - 16, 5, 2, HAIR);
  px(ctx, x - 3 + lean, y - 11, 7, 7, robe);
  hline(ctx, x - 3 + lean, x + 3 + lean, y - 7, '#5a5a62');
  px(ctx, x - 2, y - 4, 2, 4, '#4a4048');
  px(ctx, x + 1, y - 4, 2, 4, '#4a4048');
}

function ground(ctx: Ctx, color = '#6a8a4a') {
  px(ctx, 0, 34, WORK_W, 6, color);
  hline(ctx, 0, WORK_W - 1, 34, '#4a6a32');
}

const DRAW: Record<WorkKind, (ctx: Ctx, f: number) => void> = {
  // 掃地：掃帚左右揮，落葉飛起
  sweep(ctx, f) {
    ground(ctx, '#a8a090');
    const swing = [-3, 0, 3, 0][f];
    figure(ctx, 30, 34, swing > 0 ? 1 : swing < 0 ? -1 : 0);
    for (let i = 0; i < 8; i++) px(ctx, 30 + Math.round((swing * i) / 7), 22 + i, 1, 1, '#8a5a32');
    px(ctx, 27 + swing * 2, 30, 7, 3, '#c8a050');
    for (const [lx, ly] of [[14, 31], [44, 30], [50, 32]] as const) px(ctx, lx + (f % 2) * 2, ly - (f === 2 ? 3 : 0), 2, 1, '#b0703a');
  },
  // 挑水：扁擔兩頭的水桶一上一下，水花濺出
  water(ctx, f) {
    ground(ctx);
    const bob = [0, 1, 0, -1][f];
    figure(ctx, 32, 34 + Math.max(0, bob));
    hline(ctx, 18, 46, 20 + bob, '#8a5a32');
    for (const bx of [16, 44]) {
      vline(ctx, bx + 2, 20 + bob, 24 + bob, '#5a3a20');
      px(ctx, bx, 25 + bob, 6, 6, '#7a5232');
      px(ctx, bx + 1, 25 + bob, 4, 1, '#7ab0d8');
    }
    if (f === 1) px(ctx, 14, 23, 1, 1, '#a8d0f0');
    if (f === 3) px(ctx, 50, 23, 1, 1, '#a8d0f0');
  },
  // 翻曬草藥：竹篩上的草藥被翻面
  herbs(ctx, f) {
    ground(ctx, '#a8a090');
    for (const x of [10, 52]) vline(ctx, x, 18, 33, '#7a5232');
    px(ctx, 8, 22, 48, 2, '#c8a870');
    for (let i = 0; i < 9; i++) px(ctx, 11 + i * 5, 20 - ((i + f) % 3 === 0 ? 2 : 0), 3, 2, (i + f) % 2 ? '#6aaa40' : '#4a8a30');
    figure(ctx, 32, 34);
    px(ctx, 29 + (f % 2) * 4, 18, 3, 3, SKIN);
  },
  // 整理書冊：書一本本疊上去
  books(ctx, f) {
    px(ctx, 0, 34, WORK_W, 6, '#6a4428');
    const colors = ['#3a5a8a', '#8a3a3a', '#3a6a4a', '#8a6a3a'];
    for (let i = 0; i <= f; i++) {
      px(ctx, 36, 30 - i * 4, 14, 3, colors[i]);
      hline(ctx, 36, 49, 30 - i * 4, '#e8dcc0');
    }
    figure(ctx, 22, 34, 1);
    px(ctx, 26, 20, 6, 3, colors[(f + 1) % 4]);
  },
  // 澆菜：水壺傾倒，水滴落在菜上
  garden(ctx, f) {
    ground(ctx, '#7a5a3a');
    for (const x of [36, 44, 52]) {
      px(ctx, x, 29, 2, 5, '#4a8a30');
      ellipse(ctx, x + 1, 28, 3, 2, '#6aba48');
    }
    figure(ctx, 20, 34, 1);
    px(ctx, 24, 20, 7, 5, '#6a7a8a');
    hline(ctx, 31, 34, 20, '#6a7a8a');
    for (let i = 0; i < 3; i++) px(ctx, 35 + i * 3, 22 + ((f + i) % 4) * 2, 1, 2, '#a8d0f0');
  },
  // 做菜：鍋裡翻炒，火苗跳動，冒出熱氣
  cook(ctx, f) {
    px(ctx, 14, 26, 36, 12, '#8a3a2a');
    hline(ctx, 14, 49, 26, '#a84a32');
    px(ctx, 28, 31, 8, 5, '#2a1a14');
    for (let i = 0; i < 3; i++) px(ctx, 29 + i * 3, 33 - ((f + i) % 2) * 2, 2, 3, i % 2 ? '#f0b830' : '#e85a30');
    ellipse(ctx, 32, 24, 9, 2, '#3a3a40');
    const toss = f === 1 || f === 2 ? 3 : 0;
    for (const [x, c] of [[28, '#6aba48'], [32, '#e0a060'], [36, '#f0e0a0']] as const) px(ctx, x, 21 - toss - (x === 32 ? 1 : 0), 2, 2, c);
    for (const x of [24, 40]) vline(ctx, x + (f % 2), 8 + ((f + x) % 3), 14 + ((f + x) % 3), '#d8d8e0');
  },
  // 織布：梭子在經線間來回
  weave(ctx, f) {
    px(ctx, 0, 34, WORK_W, 6, '#6a4428');
    for (const x of [12, 50]) px(ctx, x, 8, 3, 26, '#7a5232');
    hline(ctx, 12, 52, 9, '#5a3a20');
    for (let x = 16; x < 50; x += 3) vline(ctx, x, 11, 24, '#e8e0cc');
    px(ctx, 15, 25, 35, 5, '#c8b898');
    for (let r = 0; r <= f; r++) hline(ctx, 15, 49, 24 - r, '#a8584a');
    const sx = [16, 28, 40, 28][f];
    px(ctx, sx, 17, 8, 3, '#c8a050');
  },
  // 讀書：書頁一頁頁翻過去
  read(ctx, f) {
    px(ctx, 0, 34, WORK_W, 6, '#6a4428');
    px(ctx, 14, 18, 36, 14, '#5a3a20');
    px(ctx, 16, 16, 15, 14, '#efe6cc');
    px(ctx, 33, 16, 15, 14, '#efe6cc');
    vline(ctx, 32, 16, 30, '#8a7650');
    for (let i = 0; i < 4; i++) {
      hline(ctx, 18, 29, 19 + i * 3, '#8a7a6a');
      hline(ctx, 35, 46, 19 + i * 3, '#8a7a6a');
    }
    // 翻起的那一頁
    const w = [0, 6, 12, 0][f];
    if (w) px(ctx, 33 - (f === 2 ? 12 : 0), 14, w, 14, '#fffaf0');
  },
  // 睡覺：蓋著被子，頭上飄著 Z，窗外一彎月亮
  sleep(ctx, f) {
    px(ctx, 0, 34, WORK_W, 6, '#4a3428');
    px(ctx, 10, 24, 44, 10, '#6a4428');
    px(ctx, 10, 21, 6, 13, '#5a3a20');
    px(ctx, 14, 22, 8, 4, '#e8e0cc');
    px(ctx, 16, 19 + (f % 2), 5, 4, SKIN);
    px(ctx, 16, 18 + (f % 2), 5, 2, HAIR);
    hline(ctx, 17, 18, 21 + (f % 2), '#5a4040');
    px(ctx, 21, 22 + (f % 2), 32, 5, '#5a7a9a');
    hline(ctx, 21, 52, 22 + (f % 2), '#7a9aba');
    // 一個個往上飄的 Z
    for (let i = 0; i < 3; i++) {
      const y = 15 - ((f + i) % 4) * 3;
      const x = 24 + i * 4 + ((f + i) % 4);
      hline(ctx, x, x + 2, y, '#f4f0e4');
      px(ctx, x + 1, y + 1, 1, 1, '#f4f0e4');
      hline(ctx, x, x + 2, y + 2, '#f4f0e4');
    }
  },
};

/** 在室外做的事（背景畫天空與遠山），其他的在室內（牆與窗） */
const OUTDOOR: WorkKind[] = ['sweep', 'water', 'herbs', 'garden'];

function backdrop(ctx: Ctx, outdoor: boolean, night = false) {
  if (outdoor) {
    px(ctx, 0, 0, WORK_W, WORK_H, '#a8cce4');
    for (let x = 0; x < WORK_W; x++) {
      const h = 6 + Math.round(4 * Math.sin(x / 7) + 2 * Math.sin(x / 3));
      vline(ctx, x, 28 - h, 34, '#7a9aa8');
    }
    px(ctx, 50, 5, 5, 5, '#f8f0c8');
  } else {
    px(ctx, 0, 0, WORK_W, WORK_H, night ? '#3a3448' : '#c9bda6');
    hline(ctx, 0, WORK_W - 1, 24, night ? '#2e2a3a' : '#a89878');
    px(ctx, 6, 5, 12, 10, night ? '#1a2238' : '#5a6a7a');
    if (night) {
      px(ctx, 13, 6, 3, 3, '#f0e0a0');
      px(ctx, 14, 6, 2, 2, '#1a2238');
    }
    vline(ctx, 12, 5, 14, night ? '#3a3448' : '#c9bda6');
    hline(ctx, 6, 17, 10, night ? '#3a3448' : '#c9bda6');
  }
}

const cache = new Map<string, string>();

/** 某種動畫的第 f 格（data URL） */
export function workFrame(kind: WorkKind, f: number): string {
  const key = `${kind}:${f}`;
  let url = cache.get(key);
  if (!url) {
    // 物件先畫在透明的一層描好邊，再疊到背景上
    const [layer, lctx] = makeCanvas(WORK_W, WORK_H);
    DRAW[kind](lctx, f);
    outline(lctx, 0, 0, WORK_W, WORK_H, OUTLINE);
    const [c, ctx] = makeCanvas(WORK_W, WORK_H);
    backdrop(ctx, OUTDOOR.includes(kind), kind === 'sleep');
    ctx.drawImage(layer, 0, 0);
    url = c.toDataURL();
    cache.set(key, url);
  }
  return url;
}
