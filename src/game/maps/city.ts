import { BLOCKING, type ExitDef } from './types';

/**
 * 城區之間的接縫：大一點的城分成幾區（城南、城北，之後可能有城東、城西，皇城甚至九區以上），
 * 每一區是一張小地圖。相鄰兩區的寬（或高）一樣、城牆在同一欄（列），邊上走得過去的每一格，
 * 都接到另一區對面那條邊上同一個位置，走過去就像同一條街一路走下去。
 *
 * - side：這張地圖的哪一條邊接到另一區
 * - to：另一區的地圖 id；size：另一區的寬高（落腳在對面那條邊往內一格）
 * - range：只接這一段（例如兩道城牆之間），不給就整條邊
 * 同一個據點裡的區與區相連，不花時間（free）。
 */
export function seam(
  tiles: string[],
  side: 'top' | 'bottom' | 'left' | 'right',
  to: string,
  size: { w: number; h: number },
  range?: [number, number],
): ExitDef[] {
  const h = tiles.length;
  const w = tiles[0].length;
  const out: ExitDef[] = [];
  const inRange = (i: number) => !range || (i >= range[0] && i <= range[1]);
  const open = (x: number, y: number) => !BLOCKING.has(tiles[y][x]) && inRange(side === 'top' || side === 'bottom' ? x : y);
  if (side === 'top' || side === 'bottom') {
    const y = side === 'top' ? 0 : h - 1;
    for (let x = 0; x < w; x++)
      if (open(x, y)) out.push({ tiles: [[x, y]], to, free: true, spawn: { x, y: side === 'top' ? size.h - 2 : 1, facing: side === 'top' ? 'up' : 'down' } });
  } else {
    const x = side === 'left' ? 0 : w - 1;
    for (let y = 0; y < h; y++)
      if (open(x, y)) out.push({ tiles: [[x, y]], to, free: true, spawn: { x: side === 'left' ? size.w - 2 : 1, y, facing: side === 'left' ? 'left' : 'right' } });
  }
  return out;
}
