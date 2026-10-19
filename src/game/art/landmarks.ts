import { hline, makeCanvas, outline, px, vline } from './pixel';
import type { PropArt } from './props';

/** 地標：城門與山門的牌坊、江上的小船。 */

const OUTLINE = '#1e1a24';

/** 牌坊：寬 6 格，兩端是柱子，中間可以走過；頂上是屋簷與匾額 */
function paifang(pillar: string, pillarDark: string, roof: string, roofDark: string, plaque: string): PropArt {
  const W = 96;
  const H = 64;
  const [c, ctx] = makeCanvas(W, H);
  // 柱子
  for (const x of [4, W - 16]) {
    px(ctx, x, 18, 12, 44, pillar);
    vline(ctx, x, 18, 61, pillarDark);
    px(ctx, x - 2, 58, 16, 6, '#8a8478');
  }
  // 橫樑
  px(ctx, 2, 22, W - 4, 6, pillar);
  hline(ctx, 2, W - 3, 27, pillarDark);
  // 屋簷：兩端微翹
  px(ctx, 0, 10, W, 9, roof);
  hline(ctx, 0, W - 1, 18, roofDark);
  px(ctx, 6, 5, W - 12, 6, roof);
  hline(ctx, 6, W - 7, 5, roofDark);
  for (const x of [0, W - 4]) px(ctx, x, 7, 4, 4, roof);
  for (let x = 8; x < W - 8; x += 6) vline(ctx, x, 11, 17, roofDark);
  // 匾額
  px(ctx, 34, 26, 28, 12, '#c8a050');
  px(ctx, 36, 28, 24, 8, plaque);
  for (const x of [40, 47, 54]) px(ctx, x, 30, 3, 4, '#e8d8a0');
  outline(ctx, 0, 0, W, H, OUTLINE);
  return { canvas: c };
}

/** 江上的小船 */
function boat(): PropArt {
  const [c, ctx] = makeCanvas(48, 20);
  px(ctx, 4, 10, 40, 6, '#7a5232');
  px(ctx, 0, 8, 6, 4, '#7a5232');
  px(ctx, 42, 8, 6, 4, '#7a5232');
  hline(ctx, 4, 43, 10, '#9a6a3a');
  // 船篷
  px(ctx, 16, 3, 16, 8, '#5a4a32');
  hline(ctx, 16, 31, 3, '#8a7a52');
  for (let x = 18; x < 32; x += 4) vline(ctx, x, 4, 10, '#4a3a22');
  outline(ctx, 0, 0, 48, 20, OUTLINE);
  return { canvas: c };
}

const done = (c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): PropArt => {
  outline(ctx, 0, 0, c.width, c.height, OUTLINE);
  return { canvas: c };
};

/** 涼亭：四根柱子、攢尖頂 */
function pavilion(): PropArt {
  const [c, ctx] = makeCanvas(48, 52);
  px(ctx, 2, 44, 44, 7, '#a8a296');
  hline(ctx, 2, 45, 44, '#c8c2b6');
  for (const x of [6, 39]) px(ctx, x, 22, 4, 22, '#8a2e26');
  // 屋頂
  for (let i = 0; i < 16; i++) hline(ctx, Math.round(23 - i * 1.4), Math.round(24 + i * 1.4), 6 + i, i % 3 === 0 ? '#284638' : '#3e6656');
  px(ctx, 0, 21, 48, 3, '#284638');
  px(ctx, 22, 1, 4, 6, '#c8a050');
  // 石桌
  px(ctx, 18, 36, 12, 4, '#8a8478');
  vline(ctx, 23, 40, 43, '#6e695e');
  return done(c, ctx);
}

/** 銅鼎：香爐，冒著煙 */
function ding(): PropArt {
  const [c, ctx] = makeCanvas(32, 30);
  for (const x of [8, 22]) px(ctx, x, 22, 3, 7, '#6a5a3a');
  px(ctx, 4, 10, 24, 13, '#8a7a4a');
  hline(ctx, 4, 27, 10, '#b09a60');
  px(ctx, 2, 8, 28, 3, '#6a5a3a');
  for (const x of [4, 24]) px(ctx, x, 3, 4, 6, '#6a5a3a');
  for (let x = 8; x < 26; x += 5) px(ctx, x, 14, 3, 3, '#5a4a2a');
  vline(ctx, 15, 0, 6, '#d8d8e0');
  vline(ctx, 17, 1, 5, '#d8d8e0');
  return done(c, ctx);
}

/** 試劍石：一塊大石，上面滿是劍痕 */
function swordRock(): PropArt {
  const [c, ctx] = makeCanvas(32, 28);
  for (let y = 4; y < 27; y++) {
    const w = 12 + Math.round(Math.sin((y / 26) * Math.PI) * 4);
    hline(ctx, 16 - w, 15 + w, y, y < 10 ? '#9a9488' : '#8a8478');
  }
  for (const [x, y, l] of [[8, 9, 10], [12, 14, 12], [18, 8, 8], [10, 20, 14]] as const)
    for (let i = 0; i < l; i++) px(ctx, x + i, y + Math.round(i * 0.4), 1, 1, '#4a4640');
  return done(c, ctx);
}

/** 劍塚：土堆上插著一把劍 */
function swordGrave(): PropArt {
  const [c, ctx] = makeCanvas(16, 26);
  for (let y = 18; y < 25; y++) hline(ctx, 8 - (y - 17), 7 + (y - 17), y, '#7a6a52');
  vline(ctx, 8, 2, 20, '#c8ccd4');
  vline(ctx, 7, 3, 19, '#9aa0a8');
  px(ctx, 4, 8, 8, 2, '#8a6a46');
  px(ctx, 7, 0, 2, 3, '#5a4a3a');
  return done(c, ctx);
}

/** 山壁上的洞口 */
function cave(): PropArt {
  const [c, ctx] = makeCanvas(32, 30);
  px(ctx, 0, 4, 32, 26, '#7a7262');
  for (let y = 10; y < 30; y++) {
    const w = Math.round(9 * Math.sqrt(1 - ((y - 30) / 20) ** 2));
    hline(ctx, 16 - w, 15 + w, y, '#14121a');
  }
  hline(ctx, 0, 31, 4, '#5c5649');
  return done(c, ctx);
}

/** 門派旗幟：青底白邊 */
function sectFlag(): PropArt {
  const [c, ctx] = makeCanvas(16, 34);
  vline(ctx, 3, 1, 33, '#5e3b1d');
  px(ctx, 4, 3, 10, 14, '#3e6656');
  px(ctx, 4, 3, 10, 2, '#e8eef0');
  px(ctx, 8, 7, 3, 7, '#e8eef0');
  return done(c, ctx);
}

/** 蒲團 */
function cushion(): PropArt {
  const [c, ctx] = makeCanvas(16, 10);
  for (let y = 1; y < 9; y++) hline(ctx, 8 - Math.round(Math.sqrt(16 - (y - 5) ** 2) * 1.6), 7 + Math.round(Math.sqrt(16 - (y - 5) ** 2) * 1.6), y, y % 2 ? '#c8a050' : '#a8803a');
  return done(c, ctx);
}

/** 晾藥材的架子 */
function dryingRack(): PropArt {
  const [c, ctx] = makeCanvas(32, 24);
  for (const x of [2, 29]) vline(ctx, x, 2, 23, '#6a4428');
  for (const y of [5, 13]) hline(ctx, 2, 29, y, '#8a5a32');
  for (let x = 5; x < 28; x += 4) {
    px(ctx, x, 6, 2, 5, x % 8 ? '#6aaa40' : '#a8804a');
    px(ctx, x + 1, 14, 2, 4, x % 8 ? '#c8a050' : '#5a8a3a');
  }
  return done(c, ctx);
}

/** 祖師畫像（掛在牆上） */
function portrait(): PropArt {
  const [c, ctx] = makeCanvas(32, 18);
  px(ctx, 6, 0, 20, 17, '#f1e7cf');
  hline(ctx, 4, 27, 0, '#5a4a3a');
  hline(ctx, 4, 27, 16, '#5a4a3a');
  px(ctx, 13, 3, 6, 5, '#e8c8a0');
  px(ctx, 12, 2, 8, 2, '#3a3a40');
  px(ctx, 11, 8, 10, 7, '#5a6a7a');
  px(ctx, 15, 8, 2, 4, '#c8ccd4');
  return done(c, ctx);
}

/** 馬車：木造車廂、兩個車輪、往前伸出的車轅（寬兩格） */
function carriage(): PropArt {
  const [c, ctx] = makeCanvas(32, 26);
  // 車轅
  px(ctx, 24, 15, 8, 2, '#6a4428');
  // 車廂與車頂
  px(ctx, 3, 4, 22, 13, '#8a5a32');
  px(ctx, 2, 2, 24, 3, '#4a5a6a');
  hline(ctx, 2, 25, 4, '#34404c');
  px(ctx, 6, 7, 6, 5, '#e8d8b0');
  px(ctx, 15, 7, 6, 5, '#e8d8b0');
  vline(ctx, 9, 7, 11, '#8a5a32');
  vline(ctx, 18, 7, 11, '#8a5a32');
  hline(ctx, 3, 24, 16, '#5a3a20');
  // 車輪
  for (const x of [8, 20]) {
    px(ctx, x - 4, 17, 9, 9, '#3a2a1a');
    px(ctx, x - 3, 18, 7, 7, '#a07a48');
    px(ctx, x - 1, 20, 3, 3, '#3a2a1a');
  }
  outline(ctx, 0, 0, 32, 26, OUTLINE);
  return done(c, ctx);
}

/** 野生藥草：一叢葉子，頂上開著小花（後山採藥用） */
function wildHerb(): PropArt {
  const [c, ctx] = makeCanvas(16, 14);
  vline(ctx, 8, 5, 13, '#3e6a28');
  for (const [x, y, w] of [[3, 8, 5], [9, 7, 5], [5, 4, 4], [9, 3, 3], [2, 11, 4], [10, 10, 4]] as const) px(ctx, x, y, w, 2, '#5a9a38');
  px(ctx, 7, 1, 3, 2, '#e8e0f8');
  px(ctx, 8, 0, 1, 1, '#ffffff');
  return done(c, ctx);
}

export function landmarkProps(): Record<string, PropArt> {
  return {
    wild_herb: wildHerb(),
    carriage: carriage(),
    pavilion: pavilion(),
    ding: ding(),
    sword_rock: swordRock(),
    sword_grave: swordGrave(),
    cave: cave(),
    sect_flag: sectFlag(),
    cushion: cushion(),
    drying_rack: dryingRack(),
    portrait: portrait(),
    paifang_city: paifang('#8a2e26', '#5a1a14', '#3f4a5e', '#2a3242', '#2a3242'),
    paifang_sect: paifang('#b8b2a4', '#8a8478', '#3e6656', '#284638', '#284638'),
    boat: boat(),
  };
}
