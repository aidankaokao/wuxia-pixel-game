import type { Season } from '../time';

/**
 * 季節換色：直接改畫好的 canvas 像素，不必每種地形、樹木各畫四份。
 * 只動「偏綠」的像素（草地、樹葉、田裡的苗），水、路、屋頂都不受影響。
 * - 春：原樣。
 * - 夏：綠得深一點、濃一點。
 * - 秋：地上的草轉成枯黃；樹葉轉成橘紅（竹子不換，竹子秋天還是綠的）。
 * - 冬：地上覆雪（淡藍白，保留一點明暗）；樹梢頂上積一層雪，其他葉子變得灰綠。
 */

type Kind = 'ground' | 'tree' | 'evergreen';

const isGreen = (r: number, g: number, b: number) => g > r + 8 && g > b + 8;

function shift(kind: Kind, season: Season, r: number, g: number, b: number, top: boolean): [number, number, number] {
  switch (season) {
    case 'summer':
      return [r * 0.85, g * 0.92, b * 0.8];
    case 'autumn':
      if (kind === 'evergreen') return [r * 0.95, g * 0.88, b * 0.8];
      if (kind === 'tree') return [Math.min(255, g * 1.15), g * 0.62, b * 0.45];
      return [Math.min(255, g * 0.98), g * 0.86, b * 0.55];
    case 'winter': {
      if (kind === 'ground') {
        const v = 205 + (g - 140) * 0.45;
        return [v, v + 6, v + 12];
      }
      if (top) return [236, 242, 248];
      const v = (r + g + b) / 3;
      return [v * 0.8 + 10, v * 0.85 + 14, v * 0.85 + 18];
    }
    default:
      return [r, g, b];
  }
}

/** 把 canvas 依季節換色（回傳新的 canvas；春天直接回傳原本的） */
export function seasonCanvas(src: HTMLCanvasElement | HTMLImageElement, season: Season, kind: Kind): HTMLCanvasElement | null {
  if (season === 'spring') return null;
  const c = document.createElement('canvas');
  c.width = src.width;
  c.height = src.height;
  const ctx = c.getContext('2d')!;
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;
  const W = c.width;
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3]) continue;
    const r = d[i];
    const g = d[i + 1];
    const b = d[i + 2];
    if (!isGreen(r, g, b)) continue;
    // 樹梢：正上方兩格內是透明的（積雪只落在上緣）
    const p = i / 4;
    const y = Math.floor(p / W);
    const top = kind !== 'ground' && (y === 0 || !d[i - W * 4 + 3] || (y > 1 && !d[i - W * 8 + 3]));
    const [nr, ng, nb] = shift(kind, season, r, g, b, top);
    d[i] = nr;
    d[i + 1] = ng;
    d[i + 2] = nb;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** 某張樹木貼圖在這個季節的版本（第一次用到時產生，之後沿用） */
export function seasonTextureKey(
  textures: { exists(k: string): boolean; get(k: string): { getSourceImage(): unknown }; addCanvas(k: string, c: HTMLCanvasElement): unknown },
  key: string,
  season: Season,
): string {
  if (season === 'spring' || !textures.exists(key)) return key;
  const out = `${key}@${season}`;
  if (textures.exists(out)) return out;
  const src = textures.get(key).getSourceImage() as HTMLCanvasElement;
  const kind: Kind = key.startsWith('bamboo') || key.startsWith('pine') ? 'evergreen' : 'tree';
  const c = seasonCanvas(src, season, kind);
  if (!c) return key;
  textures.addCanvas(out, c);
  return out;
}
