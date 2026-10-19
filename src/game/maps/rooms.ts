import type { Dir } from '../constants';
import type { ExitDef, Line } from './types';

/** 室內地圖的小工具：方形房間、出口、台詞。 */

/** w×h 的房間：四周是牆，最下排第 exitX 格是出口 */
export const room = (w: number, h: number, exitX: number): string[] => [
  'W'.repeat(w),
  ...Array.from({ length: h - 2 }, () => `W${'_'.repeat(w - 2)}W`),
  'W'.repeat(exitX) + 'E' + 'W'.repeat(w - exitX - 1),
];

/** 房間出口：回到某張地圖的門口 */
export const exitTo = (map: string, x: number, y: number, exitX: number, h: number, facing: Dir = 'down'): ExitDef => ({
  tiles: [[exitX, h - 1]],
  to: map,
  spawn: { x, y, facing },
});

/** 同一人說的幾句話 */
export const by =
  (speaker: string) =>
  (...texts: string[]): Line[] =>
    texts.map((text) => ({ speaker, text }));
