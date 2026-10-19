import { ellipse, hline, makeCanvas, outline, px, vline } from './pixel';

/** 物品圖示：16×16，給 React 的物品欄用（轉成 data URL 放進 <img>）。 */

export type ItemIcon =
  | 'salve' | 'tea' | 'book' | 'scroll' | 'stew' | 'herb' | 'meat' | 'tusk' | 'pelt' | 'token'
  // 食材
  | 'sack' | 'flour' | 'egg' | 'tofu' | 'greens' | 'radish' | 'chicken' | 'mushroom' | 'beans' | 'sugar' | 'flower' | 'seeds' | 'nut'
  // 菜餚
  | 'rice' | 'noodle' | 'soup' | 'sweet';

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
  // 燉肉：陶碗裝著肉塊，冒熱氣
  stew(ctx) {
    ellipse(ctx, 8, 10, 6, 3, '#8a5a3a');
    px(ctx, 3, 10, 11, 3, '#8a5a3a');
    px(ctx, 5, 13, 7, 1, '#6a4028');
    ellipse(ctx, 8, 9, 5, 2, '#c07040');
    px(ctx, 5, 8, 2, 2, '#e09060');
    px(ctx, 9, 8, 3, 2, '#a85a30');
    vline(ctx, 6, 3, 5, '#d8d8e0');
    vline(ctx, 10, 2, 4, '#d8d8e0');
  },
  // 止血草：一束綠葉
  herb(ctx) {
    vline(ctx, 8, 6, 13, '#4a7a30');
    for (const [x, y] of [[5, 4], [10, 5], [4, 8], [11, 8], [7, 2]] as const) ellipse(ctx, x, y, 2, 1, '#6aaa40');
    px(ctx, 7, 12, 3, 2, '#c8a050');
  },
  // 山豬肉：帶骨的肉塊
  meat(ctx) {
    ellipse(ctx, 8, 9, 5, 4, '#c0504a');
    ellipse(ctx, 7, 8, 3, 2, '#e07a6a');
    px(ctx, 11, 4, 2, 4, '#f1e7cf');
    px(ctx, 12, 3, 2, 2, '#f1e7cf');
    hline(ctx, 4, 11, 12, '#8a3a34');
  },
  // 獠牙：彎彎的白牙
  tusk(ctx) {
    for (let i = 0; i < 9; i++) px(ctx, 3 + i, 12 - Math.round(Math.sin((i / 8) * 2.4) * 7), 2, 2, '#f1e7cf');
    px(ctx, 3, 12, 3, 2, '#c8b890');
  },
  // 狗皮：攤開的毛皮
  pelt(ctx) {
    px(ctx, 4, 4, 8, 9, '#8a6a46');
    px(ctx, 2, 5, 2, 3, '#8a6a46');
    px(ctx, 12, 5, 2, 3, '#8a6a46');
    px(ctx, 2, 10, 2, 3, '#8a6a46');
    px(ctx, 12, 10, 2, 3, '#8a6a46');
    px(ctx, 6, 6, 4, 5, '#a8865a');
    px(ctx, 7, 13, 2, 2, '#8a6a46');
  },
  // 腰牌：木牌刻字，上頭繫著青色穗子
  token(ctx) {
    vline(ctx, 8, 1, 3, '#3e6656');
    px(ctx, 4, 4, 8, 10, '#b08a5a');
    px(ctx, 5, 5, 6, 8, '#c8a070');
    hline(ctx, 4, 11, 13, '#8a6a40');
    vline(ctx, 11, 4, 13, '#8a6a40');
    // 直刻的「鳴泉」
    vline(ctx, 8, 6, 7, '#5a3a20');
    px(ctx, 7, 7, 3, 1, '#5a3a20');
    vline(ctx, 8, 9, 11, '#5a3a20');
    px(ctx, 7, 10, 3, 1, '#5a3a20');
    px(ctx, 6, 14, 1, 2, '#3e6656');
    px(ctx, 9, 14, 1, 2, '#3e6656');
  },
  // ── 食材 ──
  // 米：麻布袋，袋口露出白米
  sack(ctx) {
    sackShape(ctx, '#c8a878', '#a8885a');
    ellipse(ctx, 8, 5, 3, 1, '#f4f0e4');
  },
  // 麵粉：白色布袋
  flour(ctx) {
    sackShape(ctx, '#e8e4d8', '#c4bca8');
    px(ctx, 6, 8, 4, 3, '#b0443a');
  },
  // 雞蛋：兩顆
  egg(ctx) {
    ellipse(ctx, 6, 9, 3, 4, '#f1e2c4');
    ellipse(ctx, 11, 10, 3, 3, '#e8d4b0');
    px(ctx, 5, 7, 1, 2, '#fffaf0');
  },
  // 豆腐：一方白豆腐放在竹葉上
  tofu(ctx) {
    px(ctx, 2, 12, 12, 2, '#6aaa40');
    px(ctx, 4, 6, 8, 6, '#f4f0e0');
    hline(ctx, 4, 11, 6, '#ffffff');
    vline(ctx, 11, 6, 11, '#d8d0bc');
  },
  // 青菜：一把葉菜
  greens(ctx) {
    px(ctx, 7, 10, 3, 4, '#d8e8c0');
    ellipse(ctx, 5, 6, 3, 4, '#5a9a3a');
    ellipse(ctx, 11, 6, 3, 4, '#4a8a30');
    ellipse(ctx, 8, 5, 2, 4, '#6aba48');
  },
  // 蘿蔔：白蘿蔔帶葉子
  radish(ctx) {
    ellipse(ctx, 8, 9, 3, 4, '#f4f0e4');
    px(ctx, 7, 13, 2, 2, '#e4dcc8');
    px(ctx, 6, 2, 1, 4, '#5a9a3a');
    px(ctx, 9, 1, 1, 5, '#4a8a30');
    px(ctx, 8, 3, 1, 3, '#6aba48');
  },
  // 雞肉：雞腿
  chicken(ctx) {
    ellipse(ctx, 7, 7, 4, 4, '#d8a060');
    ellipse(ctx, 6, 6, 2, 2, '#f0c080');
    px(ctx, 10, 10, 2, 3, '#f1e7cf');
    px(ctx, 11, 12, 3, 2, '#f1e7cf');
  },
  // 野菌：兩朵香菇
  mushroom(ctx) {
    px(ctx, 5, 9, 2, 5, '#e8dcc0');
    ellipse(ctx, 6, 8, 4, 2, '#8a5a3a');
    px(ctx, 11, 10, 2, 4, '#e8dcc0');
    ellipse(ctx, 11, 9, 3, 2, '#a86a40');
    px(ctx, 5, 7, 1, 1, '#c89a70');
  },
  // 紅豆：一小撮
  beans(ctx) {
    for (const [x, y] of [[5, 9], [8, 8], [11, 9], [6, 11], [9, 11], [7, 6], [10, 6]] as const) {
      ellipse(ctx, x, y, 2, 1, '#9a2a2a');
      px(ctx, x - 1, y, 1, 1, '#c84a40');
    }
  },
  // 糖：紙包，透出黃糖
  sugar(ctx) {
    px(ctx, 3, 6, 10, 7, '#d8c8a0');
    px(ctx, 5, 4, 6, 2, '#e8c870');
    hline(ctx, 3, 12, 9, '#b0443a');
    px(ctx, 6, 5, 2, 1, '#f8e8a0');
  },
  // 桂花：小黃花一串
  flower(ctx) {
    vline(ctx, 8, 4, 14, '#6a5030');
    for (const [x, y] of [[6, 4], [10, 5], [5, 8], [11, 9], [7, 11], [9, 7]] as const) px(ctx, x, y, 2, 2, '#f0b830');
  },
  // 芝麻：小碟子裝黑芝麻
  seeds(ctx) {
    ellipse(ctx, 8, 11, 6, 2, '#e8e0cc');
    for (const [x, y] of [[5, 10], [7, 9], [9, 10], [11, 9], [6, 11], [10, 11], [8, 10]] as const) px(ctx, x, y, 1, 1, '#2a2228');
  },
  // 杏仁：三顆
  nut(ctx) {
    for (const [x, y] of [[5, 8], [10, 7], [8, 11]] as const) {
      ellipse(ctx, x, y, 2, 3, '#c89060');
      px(ctx, x - 1, y - 1, 1, 2, '#e8b888');
    }
  },
  // ── 菜餚 ──
  // 飯：藍邊瓷碗盛白飯
  rice(ctx) {
    bowl(ctx);
    ellipse(ctx, 8, 7, 5, 3, '#f8f4ec');
    px(ctx, 6, 6, 2, 1, '#ffffff');
  },
  // 麵：碗裡的湯麵，上頭一雙筷子
  noodle(ctx) {
    bowl(ctx);
    ellipse(ctx, 8, 8, 5, 1, '#e8c890');
    for (const x of [5, 7, 9, 11]) vline(ctx, x, 7, 8, '#f8e8b0');
    px(ctx, 10, 6, 2, 1, '#5a9a3a');
    for (let i = 0; i < 9; i++) px(ctx, 6 + i, 5 - Math.floor(i / 2), 1, 1, '#8a5a30');
  },
  // 湯：湯碗冒熱氣
  soup(ctx) {
    bowl(ctx);
    ellipse(ctx, 8, 8, 5, 1, '#d8b060');
    px(ctx, 6, 8, 2, 1, '#f4f0e0');
    px(ctx, 10, 8, 1, 1, '#5a9a3a');
    vline(ctx, 6, 2, 5, '#d8d8e0');
    vline(ctx, 10, 3, 5, '#d8d8e0');
  },
  // 甜品：小盤子上兩塊糕點
  sweet(ctx) {
    ellipse(ctx, 8, 12, 7, 2, '#e8e0cc');
    hline(ctx, 2, 13, 13, '#b8b0a0');
    px(ctx, 3, 7, 5, 4, '#f0d890');
    px(ctx, 9, 7, 5, 4, '#e8c878');
    hline(ctx, 3, 7, 7, '#fff0b8');
    px(ctx, 5, 8, 1, 1, '#f0b830');
    px(ctx, 11, 8, 1, 1, '#b0443a');
  },
};

/** 布袋（米、麵粉） */
function sackShape(ctx: CanvasRenderingContext2D, color: string, dark: string) {
  ellipse(ctx, 8, 10, 5, 4, color);
  px(ctx, 4, 6, 8, 5, color);
  px(ctx, 5, 4, 6, 2, color);
  hline(ctx, 5, 10, 6, dark);
  hline(ctx, 4, 12, 13, dark);
}

/** 藍邊瓷碗（盛的東西另外畫在上面） */
function bowl(ctx: CanvasRenderingContext2D) {
  ellipse(ctx, 8, 10, 6, 3, '#e8e4dc');
  px(ctx, 2, 8, 13, 3, '#e8e4dc');
  hline(ctx, 2, 14, 9, '#4a6a9a');
  px(ctx, 6, 13, 5, 1, '#b8b0a0');
}

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
