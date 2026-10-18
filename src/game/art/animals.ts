import { CHAR_H, CHAR_W } from '../constants';
import { Ctx, ellipse, makeCanvas, outline, px } from './pixel';

/**
 * 野獸的精靈表，格式與人物相同：3 欄（走路A、站立、走路B）× 4 列（下、左、右、上），單格 16×24。
 * 野獸比人矮，身體畫在格子下半部。
 */

interface AnimalStyle {
  fur: string;
  dark: string;
  light: string;
  /** 口鼻 */
  snout: string;
  eye: string;
  kind: 'dog' | 'boar';
}

export const ANIMALS: Record<string, AnimalStyle> = {
  dog: { fur: '#8a6a48', dark: '#5e4630', light: '#b08a5e', snout: '#3a2a20', eye: '#1b1b2a', kind: 'dog' },
  boar: { fur: '#5a463a', dark: '#3a2c24', light: '#7a6252', snout: '#c8907e', eye: '#7a1e1e', kind: 'boar' },
};

type Step = 0 | 1 | 2;

export function drawAnimalSheet(a: AnimalStyle): HTMLCanvasElement {
  const [sheet, sctx] = makeCanvas(CHAR_W * 3, CHAR_H * 4);
  const rows: ['down' | 'side' | 'up', boolean][] = [['down', false], ['side', false], ['side', true], ['up', false]];
  rows.forEach(([view, flip], row) => {
    for (let col = 0; col < 3; col++) {
      const [f, fctx] = makeCanvas(CHAR_W, CHAR_H);
      if (view === 'side') drawSide(fctx, a, col as Step);
      else if (view === 'down') drawFront(fctx, a, col as Step);
      else drawBack(fctx, a, col as Step);
      outline(fctx, 0, 0, CHAR_W, CHAR_H, '#1e1a24');
      const ox = col * CHAR_W;
      const oy = row * CHAR_H;
      sctx.globalAlpha = 0.28;
      ellipse(sctx, ox + 8, oy + 22, 6, 1, '#000000');
      sctx.globalAlpha = 1;
      if (flip) {
        sctx.save();
        sctx.translate(ox + CHAR_W, oy);
        sctx.scale(-1, 1);
        sctx.drawImage(f, 0, 0);
        sctx.restore();
      } else {
        sctx.drawImage(f, ox, oy);
      }
    }
  });
  return sheet;
}

/** 側面（朝左） */
function drawSide(ctx: Ctx, a: AnimalStyle, step: Step) {
  const boar = a.kind === 'boar';
  // 四條腿：前後腿交錯
  const legs = step === 1 ? [3, 5, 10, 12] : step === 0 ? [2, 6, 9, 13] : [4, 4, 11, 11];
  legs.forEach((x, i) => px(ctx, x, 19, 1, i % 2 ? 3 : 4, i % 2 ? a.dark : a.fur));
  if (boar) {
    px(ctx, 3, 11, 11, 8, a.fur);
    px(ctx, 4, 10, 9, 1, a.fur);
    px(ctx, 4, 9, 8, 2, a.dark); // 背上的鬃毛
    px(ctx, 5, 8, 2, 1, a.dark);
    px(ctx, 9, 8, 2, 1, a.dark);
    px(ctx, 4, 17, 9, 2, a.light);
    px(ctx, 0, 12, 4, 6, a.fur); // 頭
    px(ctx, 0, 15, 2, 3, a.snout);
    px(ctx, 1, 14, 1, 1, '#f2ead8'); // 獠牙
    px(ctx, 2, 13, 1, 1, a.eye);
    px(ctx, 3, 11, 2, 2, a.dark); // 耳
    px(ctx, 14, 12, 1, 3, a.dark); // 尾
  } else {
    px(ctx, 4, 13, 9, 6, a.fur);
    px(ctx, 5, 17, 7, 2, a.light);
    px(ctx, 5, 13, 7, 1, a.dark);
    px(ctx, 1, 10, 5, 5, a.fur); // 頭
    px(ctx, 0, 12, 2, 3, a.light);
    px(ctx, 0, 12, 1, 1, a.snout);
    px(ctx, 2, 11, 1, 1, a.eye);
    px(ctx, 3, 8, 2, 3, a.dark); // 耳
    px(ctx, 13, step === 1 ? 10 : 11, 1, 4, a.dark); // 尾巴上翹
    px(ctx, 14, step === 1 ? 9 : 10, 1, 2, a.dark);
  }
}

/** 正面（朝下） */
function drawFront(ctx: Ctx, a: AnimalStyle, step: Step) {
  const boar = a.kind === 'boar';
  const l = step === 0 ? 1 : 0;
  const r = step === 2 ? 1 : 0;
  px(ctx, 4, 19, 2, 3 - l, a.dark);
  px(ctx, 10, 19, 2, 3 - r, a.dark);
  if (boar) {
    px(ctx, 3, 12, 10, 8, a.fur);
    px(ctx, 4, 10, 8, 2, a.dark);
    px(ctx, 4, 13, 8, 6, a.fur);
    px(ctx, 6, 16, 4, 3, a.snout);
    px(ctx, 7, 17, 1, 1, '#5a2a2a');
    px(ctx, 8, 17, 1, 1, '#5a2a2a');
    px(ctx, 5, 17, 1, 2, '#f2ead8');
    px(ctx, 10, 17, 1, 2, '#f2ead8');
    px(ctx, 5, 14, 1, 1, a.eye);
    px(ctx, 10, 14, 1, 1, a.eye);
    px(ctx, 3, 11, 2, 2, a.dark);
    px(ctx, 11, 11, 2, 2, a.dark);
  } else {
    px(ctx, 4, 15, 8, 5, a.fur);
    px(ctx, 5, 9, 6, 7, a.fur);
    px(ctx, 6, 13, 4, 3, a.light);
    px(ctx, 7, 13, 2, 1, a.snout);
    px(ctx, 6, 11, 1, 1, a.eye);
    px(ctx, 9, 11, 1, 1, a.eye);
    px(ctx, 4, 7, 2, 3, a.dark);
    px(ctx, 10, 7, 2, 3, a.dark);
    px(ctx, 6, 17, 4, 2, a.light);
  }
}

/** 背面（朝上） */
function drawBack(ctx: Ctx, a: AnimalStyle, step: Step) {
  const boar = a.kind === 'boar';
  const l = step === 2 ? 1 : 0;
  const r = step === 0 ? 1 : 0;
  px(ctx, 4, 19, 2, 3 - l, a.dark);
  px(ctx, 10, 19, 2, 3 - r, a.dark);
  if (boar) {
    px(ctx, 3, 10, 10, 10, a.fur);
    px(ctx, 7, 9, 2, 10, a.dark);
    px(ctx, 4, 9, 2, 2, a.dark);
    px(ctx, 10, 9, 2, 2, a.dark);
    px(ctx, 7, 19, 2, 2, a.dark);
  } else {
    px(ctx, 4, 13, 8, 7, a.fur);
    px(ctx, 5, 9, 6, 5, a.fur);
    px(ctx, 4, 7, 2, 3, a.dark);
    px(ctx, 10, 7, 2, 3, a.dark);
    px(ctx, 7, step === 1 ? 15 : 16, 2, 4, a.dark); // 尾巴
  }
}
