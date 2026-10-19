import { ellipse, hline, makeCanvas, outline, px, vline } from './pixel';
import type { PropArt } from './props';

/** 村裡各屋的室內物件：供桌、太師椅、櫃台、茶罐架、打鐵爐、鐵砧、搖籃、水缸、上鎖的門。 */

const OUTLINE = '#1e1a24';
const done = (c: HTMLCanvasElement, ctx: CanvasRenderingContext2D): PropArt => {
  outline(ctx, 0, 0, c.width, c.height, OUTLINE);
  return { canvas: c };
};

/** 供桌：牌位、香爐、紅布 */
function altar(): PropArt {
  const [c, ctx] = makeCanvas(48, 30);
  px(ctx, 2, 14, 44, 14, '#6a2a20');
  hline(ctx, 2, 45, 14, '#8a3a2a');
  px(ctx, 6, 16, 36, 8, '#a83a2a');
  for (const x of [4, 43]) vline(ctx, x, 20, 29, '#4a1a14');
  // 牌位
  for (const [x, h] of [[12, 12], [21, 15], [30, 12]] as const) {
    px(ctx, x, 14 - h, 6, h, '#3a2a20');
    px(ctx, x + 1, 15 - h, 4, h - 3, '#c8a050');
  }
  // 香爐與香
  ellipse(ctx, 24, 15, 4, 2, '#8a7a5a');
  for (const x of [22, 24, 26]) vline(ctx, x, 6, 13, '#c43c32');
  return done(c, ctx);
}

/** 太師椅 */
function chair(): PropArt {
  const [c, ctx] = makeCanvas(16, 22);
  px(ctx, 3, 2, 10, 9, '#5a2a1e');
  px(ctx, 5, 4, 6, 5, '#7a3a2a');
  px(ctx, 2, 10, 12, 5, '#6a3020');
  for (const x of [3, 12]) vline(ctx, x, 15, 21, '#3a1810');
  return done(c, ctx);
}

/** 茶寮的櫃台：檯面上擺著茶壺茶碗 */
function counter(): PropArt {
  const [c, ctx] = makeCanvas(48, 24);
  px(ctx, 1, 9, 46, 14, '#8a5a32');
  hline(ctx, 1, 46, 9, '#b0824a');
  for (let x = 6; x < 46; x += 10) vline(ctx, x, 11, 22, '#6a4428');
  px(ctx, 6, 3, 6, 6, '#e8e0cc');
  px(ctx, 12, 5, 2, 1, '#e8e0cc');
  for (const x of [20, 26, 32]) px(ctx, x, 6, 4, 3, '#7aa88a');
  px(ctx, 39, 2, 5, 7, '#c8a050');
  return done(c, ctx);
}

/** 茶罐架 */
function jars(): PropArt {
  const [c, ctx] = makeCanvas(32, 28);
  px(ctx, 2, 1, 28, 26, '#7a5232');
  px(ctx, 4, 3, 24, 22, '#4a3220');
  for (const y of [11, 19]) hline(ctx, 4, 27, y, '#9a6a3a');
  const colors = ['#8a6a46', '#4a6a5a', '#a8584a', '#c8a050'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 4; i++) {
      const x = 6 + i * 6;
      const y = 4 + r * 8;
      px(ctx, x, y + 2, 4, 5, colors[(i + r) % 4]);
      px(ctx, x + 1, y + 1, 2, 1, '#e8dcc0');
    }
  return done(c, ctx);
}

/** 打鐵爐：磚爐裡炭火，兩個畫格交替閃爍 */
function forge(frame: number): PropArt {
  const [c, ctx] = makeCanvas(32, 30);
  px(ctx, 2, 8, 28, 20, '#6a5a52');
  for (let y = 10; y < 28; y += 4) hline(ctx, 2, 29, y, '#4a3e38');
  px(ctx, 10, 0, 12, 9, '#5a4e48');
  px(ctx, 7, 14, 18, 9, '#2a1a14');
  px(ctx, 9, 17, 14, 6, frame ? '#f8a040' : '#e8603a');
  for (let i = 0; i < 5; i++) px(ctx, 10 + i * 3, 16 - ((i + frame) % 2) * 2, 2, 2, '#f8d050');
  return done(c, ctx);
}

/** 鐵砧 */
function anvil(): PropArt {
  const [c, ctx] = makeCanvas(16, 18);
  px(ctx, 5, 12, 6, 5, '#6a5a4a');
  px(ctx, 2, 6, 13, 4, '#4a4e58');
  px(ctx, 1, 6, 3, 2, '#4a4e58');
  hline(ctx, 3, 14, 6, '#8a90a0');
  px(ctx, 5, 10, 6, 2, '#3a3e48');
  // 錘子
  px(ctx, 9, 2, 5, 3, '#2a2a30');
  vline(ctx, 11, 4, 6, '#8a6a46');
  return done(c, ctx);
}

/** 搖籃 */
function cradle(): PropArt {
  const [c, ctx] = makeCanvas(16, 18);
  ellipse(ctx, 8, 11, 7, 4, '#a8763f');
  px(ctx, 2, 7, 12, 4, '#a8763f');
  px(ctx, 4, 7, 8, 4, '#f1e7cf');
  px(ctx, 5, 6, 3, 3, '#f3c9a0');
  px(ctx, 8, 7, 4, 3, '#e86a6a');
  hline(ctx, 1, 14, 16, '#6a4428');
  return done(c, ctx);
}

/** 水缸 */
function vat(): PropArt {
  const [c, ctx] = makeCanvas(16, 18);
  ellipse(ctx, 8, 11, 6, 6, '#6a5a4a');
  ellipse(ctx, 8, 6, 6, 2, '#3a5a7a');
  hline(ctx, 3, 12, 6, '#5a7a9a');
  hline(ctx, 2, 13, 11, '#8a7a6a');
  return done(c, ctx);
}

/** 牆上關著的門（上鎖或不讓進的房間） */
function lockedDoor(): PropArt {
  const [c, ctx] = makeCanvas(16, 18);
  px(ctx, 2, 1, 12, 17, '#4a2c1a');
  vline(ctx, 8, 1, 17, '#2e1a0e');
  for (const y of [4, 9, 14]) for (const x of [4, 11]) px(ctx, x, y, 1, 1, '#d4a640');
  px(ctx, 6, 8, 5, 3, '#a8a8b0');
  return done(c, ctx);
}

/** 布莊的布架：一格格捲好的布疋 */
function clothRack(): PropArt {
  const [c, ctx] = makeCanvas(32, 28);
  px(ctx, 2, 1, 28, 26, '#7a5232');
  px(ctx, 4, 3, 24, 22, '#4a3220');
  for (const y of [11, 19]) hline(ctx, 4, 27, y, '#9a6a3a');
  const colors = ['#b0443a', '#3e6a8a', '#e8dcc0', '#4a7a4a', '#c8a050', '#8a4a7a', '#5a8aa8', '#d88a6a', '#6a5a8a'];
  for (let r = 0; r < 3; r++)
    for (let i = 0; i < 3; i++) {
      const col = colors[r * 3 + i];
      px(ctx, 5 + i * 8, 4 + r * 8, 7, 6, col);
      vline(ctx, 5 + i * 8, 4 + r * 8, 9 + r * 8, '#00000040');
      px(ctx, 10 + i * 8, 5 + r * 8, 1, 4, '#ffffff40');
    }
  return done(c, ctx);
}

/** 衣架上的成衣：木架披著一件長衫 */
function mannequin(): PropArt {
  const [c, ctx] = makeCanvas(16, 24);
  vline(ctx, 8, 1, 22, '#5a3a20');
  hline(ctx, 2, 13, 3, '#5a3a20');
  px(ctx, 4, 4, 8, 13, '#3e6a8a');
  px(ctx, 2, 4, 2, 7, '#3e6a8a');
  px(ctx, 12, 4, 2, 7, '#3e6a8a');
  for (let i = 0; i < 4; i++) px(ctx, 6 + i, 4 + i, 1, 1, '#e8dcc0');
  hline(ctx, 4, 11, 10, '#c8a050');
  px(ctx, 5, 22, 7, 2, '#5a3a20');
  return done(c, ctx);
}

export function interiorProps(): Record<string, PropArt> {
  return {
    altar: altar(),
    chair: chair(),
    counter: counter(),
    jars: jars(),
    forge: forge(0),
    forge_b: forge(1),
    anvil: anvil(),
    cradle: cradle(),
    vat: vat(),
    door_locked: lockedDoor(),
    cloth_rack: clothRack(),
    mannequin: mannequin(),
  };
}
