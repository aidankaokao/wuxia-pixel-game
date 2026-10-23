import { ellipse, hline, makeCanvas, px, vline } from './pixel';

/**
 * NPC 頭上的小圖示（life.ts 的 ACTS.icon）：白底圓角的小泡泡，裡面一個 9×9 的圖。
 * 用到才產生貼圖（key 是 `li_圖示名`）。
 */
type Ctx = CanvasRenderingContext2D;
const ICONS: Record<string, (c: Ctx) => void> = {
  eye: (c) => {
    ellipse(c, 7, 6, 4, 2, '#f4f0e8');
    hline(c, 3, 11, 4, '#3a2a2a');
    hline(c, 3, 11, 8, '#3a2a2a');
    px(c, 6, 5, 3, 3, '#3a5a8a');
    px(c, 7, 6, 1, 1, '#1a1a2a');
  },
  ear: (c) => {
    px(c, 5, 2, 4, 8, '#e8b88a');
    px(c, 6, 4, 2, 4, '#b8865a');
    px(c, 9, 4, 1, 1, '#4a3a2a');
    px(c, 10, 3, 1, 1, '#4a3a2a');
    px(c, 10, 6, 1, 1, '#4a3a2a');
  },
  lantern: (c) => {
    vline(c, 7, 1, 2, '#3a2a1a');
    ellipse(c, 7, 6, 3, 3, '#e8a83a');
    px(c, 6, 5, 2, 2, '#fff0a0');
    hline(c, 5, 9, 9, '#3a2a1a');
  },
  spear: (c) => {
    vline(c, 7, 3, 10, '#7a5232');
    px(c, 6, 1, 3, 2, '#c8ccd4');
    px(c, 6, 3, 3, 1, '#c4483c');
  },
  sack: (c) => {
    ellipse(c, 7, 7, 4, 3, '#c8a868');
    px(c, 6, 2, 3, 2, '#b8985a');
    hline(c, 5, 9, 4, '#7a5a32');
  },
  zzz: (c) => {
    for (const [x, y, s] of [[3, 7, 3], [7, 4, 2]] as const) {
      hline(c, x, x + s, y, '#4a5a8a');
      for (let i = 0; i <= s; i++) px(c, x + s - i, y + i, 1, 1, '#4a5a8a');
      hline(c, x, x + s, y + s, '#4a5a8a');
    }
  },
  bowl: (c) => {
    ellipse(c, 7, 6, 4, 1, '#f4f0e8');
    px(c, 3, 6, 9, 3, '#e8e4dc');
    hline(c, 3, 11, 7, '#4a6a9a');
    vline(c, 9, 1, 5, '#7a5232');
    vline(c, 10, 1, 5, '#7a5232');
  },
  sword: (c) => {
    for (let i = 0; i < 7; i++) px(c, 3 + i, 9 - i, 1, 1, '#8a96a8');
    for (let i = 0; i < 6; i++) px(c, 4 + i, 9 - i, 1, 1, '#d8e0ea');
    hline(c, 2, 5, 8, '#6a4228');
    px(c, 2, 10, 2, 1, '#6a4228');
  },
  fist: (c) => {
    px(c, 4, 3, 6, 5, '#e8b88a');
    for (let x = 4; x < 10; x += 2) vline(c, x + 1, 3, 4, '#b8865a');
    px(c, 3, 5, 2, 3, '#e8b88a');
    hline(c, 4, 9, 8, '#b8865a');
  },
  book: (c) => {
    px(c, 2, 3, 5, 6, '#f4f0e8');
    px(c, 7, 3, 5, 6, '#f4f0e8');
    vline(c, 7, 3, 8, '#7a5232');
    for (const y of [4, 6]) (hline(c, 3, 5, y, '#8a8a9a'), hline(c, 8, 10, y, '#8a8a9a'));
    hline(c, 2, 11, 9, '#3a5a8a');
  },
  zen: (c) => {
    for (const x of [3, 6, 9]) px(c, x, 6, 2, 2, '#5a7a5a');
    hline(c, 2, 11, 9, '#8aa88a');
  },
  chat: (c) => {
    for (const x of [3, 6, 9]) px(c, x, 5, 2, 2, '#4a3a2a');
  },
  broom: (c) => {
    for (let i = 0; i < 5; i++) px(c, 8 - i, 2 + i, 1, 1, '#7a5232');
    px(c, 2, 7, 5, 3, '#c8a050');
    for (let x = 2; x < 7; x += 2) vline(c, x, 8, 9, '#8a6a30');
  },
  bucket: (c) => {
    px(c, 4, 5, 6, 5, '#8a6a42');
    hline(c, 4, 9, 6, '#3f7fc0');
    hline(c, 4, 9, 9, '#5a4228');
    hline(c, 5, 8, 2, '#5a4228');
    vline(c, 4, 3, 4, '#5a4228');
    vline(c, 9, 3, 4, '#5a4228');
  },
  sprout: (c) => {
    vline(c, 7, 4, 9, '#4a8a3a');
    px(c, 4, 3, 3, 2, '#6aaa4a');
    px(c, 8, 4, 3, 2, '#6aaa4a');
    hline(c, 3, 11, 9, '#8b5e3c');
  },
};

export function lifeIcon(scene: Phaser.Scene, name: string): string {
  const key = `li_${name}`;
  if (scene.textures.exists(key)) return key;
  const [cv, c] = makeCanvas(15, 14);
  // 泡泡
  px(c, 1, 0, 13, 12, '#2a2230');
  px(c, 0, 1, 15, 10, '#2a2230');
  px(c, 1, 1, 13, 10, '#fbf6e8');
  px(c, 6, 12, 3, 1, '#2a2230');
  px(c, 7, 13, 1, 1, '#2a2230');
  c.save();
  c.translate(1, 0);
  ICONS[name]?.(c);
  c.restore();
  scene.textures.addCanvas(key, cv);
  return key;
}
