import { ellipse, hline, makeCanvas, outline, px, vline } from './pixel';

/** 物品圖示：16×16，給 React 的物品欄用（轉成 data URL 放進 <img>）。 */

export type ItemIcon = 'salve' | 'tea' | 'book' | 'scroll';

const OUTLINE = '#1a1218';

const DRAW: Record<ItemIcon, (ctx: CanvasRenderingContext2D) => void> = {
  // 金創藥：圓肚瓷罐，紅色封紙
  salve(ctx) {
    ellipse(ctx, 8, 10, 5, 4, '#e8e0cc');
    px(ctx, 4, 9, 8, 4, '#e8e0cc');
    hline(ctx, 4, 11, 13, '#c8bca4');
    px(ctx, 5, 9, 1, 3, '#fffaf0');
    px(ctx, 6, 4, 4, 3, '#d8d0bc');
    px(ctx, 5, 3, 6, 2, '#b0443a');
    hline(ctx, 5, 10, 3, '#d86050');
    px(ctx, 6, 9, 4, 3, '#c4483c');
    px(ctx, 7, 10, 2, 1, '#f1e7cf');
  },
  // 茶：青瓷茶盞，冒著熱氣
  tea(ctx) {
    px(ctx, 3, 8, 10, 4, '#7aa88a');
    px(ctx, 4, 12, 8, 1, '#5a8a6a');
    px(ctx, 6, 13, 4, 1, '#4a6a52');
    hline(ctx, 3, 12, 8, '#a8d0a0');
    hline(ctx, 4, 11, 9, '#c8a050');
    px(ctx, 4, 10, 1, 1, '#b8e0b0');
    vline(ctx, 6, 3, 5, '#d8d8e0');
    vline(ctx, 7, 2, 3, '#d8d8e0');
    vline(ctx, 9, 4, 6, '#d8d8e0');
    vline(ctx, 10, 3, 4, '#d8d8e0');
  },
  // 書：線裝書，藍色封面、白色題簽
  book(ctx) {
    px(ctx, 3, 2, 10, 12, '#3a5a8a');
    px(ctx, 12, 3, 1, 11, '#e8dcc0');
    vline(ctx, 3, 2, 13, '#22406e');
    for (const y of [4, 7, 10]) px(ctx, 3, y, 2, 1, '#e8dcc0');
    px(ctx, 7, 4, 3, 7, '#f1e7cf');
    vline(ctx, 8, 5, 9, '#8a7650');
  },
  // 卷軸：拓本，攤開一截
  scroll(ctx) {
    px(ctx, 2, 4, 3, 9, '#8a5a30');
    vline(ctx, 2, 4, 12, '#5a3a20');
    px(ctx, 5, 5, 8, 7, '#e8dcc0');
    hline(ctx, 5, 12, 11, '#c8bca4');
    // 直排的劍痕字跡
    for (const x of [7, 9, 11]) {
      vline(ctx, x, 6, 7, '#3a3040');
      vline(ctx, x, 9, 10, '#3a3040');
    }
    vline(ctx, 13, 5, 11, '#b09a70');
  },
};

const cache = new Map<ItemIcon, string>();

export function itemIconUrl(icon: ItemIcon): string {
  let url = cache.get(icon);
  if (!url) {
    const [c, ctx] = makeCanvas(16, 16);
    DRAW[icon](ctx);
    outline(ctx, 0, 0, 16, 16, OUTLINE);
    url = c.toDataURL();
    cache.set(icon, url);
  }
  return url;
}
