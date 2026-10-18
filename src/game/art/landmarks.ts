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

export function landmarkProps(): Record<string, PropArt> {
  return {
    paifang_city: paifang('#8a2e26', '#5a1a14', '#3f4a5e', '#2a3242', '#2a3242'),
    paifang_sect: paifang('#b8b2a4', '#8a8478', '#3e6656', '#284638', '#284638'),
    boat: boat(),
  };
}
