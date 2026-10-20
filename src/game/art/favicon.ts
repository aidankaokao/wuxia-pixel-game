import { makeCanvas, px } from './pixel';

/**
 * 瀏覽器分頁的圖示（32×32）：深藍底上，一隻展翅的大鵬乘著盤旋而上的扶搖之風。
 * 跟其他美術一樣用程式畫，啟動時設成 <link rel="icon">。
 */

// 每個字元一格：. 透明　# 底色　W 鵬（白）　S 鵬的陰影　G 風（金）　g 風（暗金）　R 眼睛
const ART = [
  '................................',
  '..############################..',
  '.##############################.',
  '.##############################.',
  '.##W##########################W#',
  '.##WW########################WW#',
  '.###WWW####################WWW##',
  '.####WWWW################WWWW###',
  '.#####WWWWW####WW#####WWWWW#####',
  '.######SWWWWW#WWWW##WWWWWS######',
  '.#######SSWWWWWRWWWWWWWSS#######',
  '.#########SSWWWWWWWWWSS#########',
  '.###########SWWWWWWWS###########',
  '.#############WWWWW#############',
  '.##############WWW##############',
  '.##############SWS##############',
  '.###############S###############',
  '.##############################.',
  '.#####gGGGGGGGGGGGGGGGGGGGg####.',
  '.####gg##################GGg###.',
  '.#######gGGGGGGGGGGGGGGGg######.',
  '.######GG###############gg#####.',
  '.#########gGGGGGGGGGGGg########.',
  '.########gg###########GG#######.',
  '.###########gGGGGGGGg##########.',
  '.##########GG#########gg#######.',
  '.#############gGGGGg###########.',
  '.############gg#####GG#########.',
  '.###############GGg############.',
  '.################G#############.',
  '..############################..',
  '................................',
];

const COLORS: Record<string, string> = {
  '#': '#1e2a3a',
  W: '#f4f0e4',
  S: '#a8b4c4',
  G: '#f0c060',
  g: '#a8803a',
  R: '#c4483c',
};

export function faviconUrl(): string {
  const [c, ctx] = makeCanvas(32, 32);
  ART.forEach((row, y) => [...row].forEach((ch, x) => COLORS[ch] && px(ctx, x, y, 1, 1, COLORS[ch])));
  return c.toDataURL();
}

/** 把分頁圖示換成畫好的大鵬 */
export function installFavicon() {
  const link = (document.querySelector('link[rel="icon"]') as HTMLLinkElement | null) ?? document.head.appendChild(document.createElement('link'));
  link.rel = 'icon';
  link.type = 'image/png';
  link.href = faviconUrl();
}
