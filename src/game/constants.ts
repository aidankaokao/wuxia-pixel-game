/** 一格瓦片的原始像素尺寸。畫面會以整數倍放大，保持像素銳利。 */
export const TILE = 16;

/** 人物精靈單格尺寸：16 寬、24 高（頭部會超出所站的那一格）。 */
export const CHAR_W = 16;
export const CHAR_H = 24;

/** 走一格所需毫秒數。奔跑約為行走的兩倍速。 */
export const WALK_MS = 120;
export const RUN_MS = 60;
/** NPC 閒晃的步速，刻意比主角慢 */
export const NPC_WALK_MS = 290;

/** 希望畫面至少看得到的格數，用來決定整數放大倍率（掌機約 15×10 格）。 */
export const VIEW_TILES_W = 17;
export const VIEW_TILES_H = 11;

export type Dir = 'down' | 'left' | 'right' | 'up';

export const DIR_VEC: Record<Dir, { x: number; y: number }> = {
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  up: { x: 0, y: -1 },
};

/** 精靈表的列順序。 */
export const DIR_ROW: Record<Dir, number> = { down: 0, left: 1, right: 2, up: 3 };
