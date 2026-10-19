import { CHAR_H, CHAR_W } from '../constants';
import { Ctx, ellipse, makeCanvas, outline, px } from './pixel';

/**
 * 人物精靈表：3 欄（走路A、站立、走路B）× 4 列（下、左、右、上），單格 16×24。
 * 右向由左向水平翻轉而來。全部以 fillRect 逐像素畫出，最後自動描外框、加影子。
 */

export type HairStyle = 'topknot' | 'bun' | 'twinbuns' | 'bald' | 'long';

export interface CharStyle {
  skin: string;
  hair: string;
  robe: string;
  robeDark: string;
  inner: string;
  sash: string;
  pants: string;
  shoe: string;
  hairStyle: HairStyle;
  /** 髮帶顏色；topknot 會在髮髻綁上，bald 則是額前頭巾。 */
  band?: string;
  hat?: 'straw';
  beard?: string;
  sword?: boolean;
  /** 小孩：上半身往下移、整體較矮。 */
  short?: boolean;
}

const SKIN = '#f3c9a0';
const EYE = '#1b1b2a';
const OUTLINE = '#1e1a24';

export const CHARACTERS: Record<string, CharStyle> = {
  // 木匠杜大樑：頭綁布巾、短鬚、褐色工作服
  carpenter: {
    skin: '#d9a77c', hair: '#3a2a20', robe: '#8a6a3a', robeDark: '#6a4e28', inner: '#e8d8b0', sash: '#4a3a28',
    pants: '#4a3a2a', shoe: '#2a2018', hairStyle: 'bald', band: '#c8b890', beard: '#3a2a20',
  },
  // 柳家管家老福：花白頭髮、灰衣
  servant: {
    skin: SKIN, hair: '#a8a49c', robe: '#6a6a72', robeDark: '#4a4a52', inner: '#e0dcd0', sash: '#3a3a42',
    pants: '#3a3a42', shoe: '#22222a', hairStyle: 'topknot', band: '#3a3a42',
  },
  // 柳村長的孫女柳青禾：雙髻、淡綠衣、背著木劍
  girl: {
    skin: SKIN, hair: '#2a1f1a', robe: '#7aaa8a', robeDark: '#5a8a6a', inner: '#f4f0e0', sash: '#e8a0a0',
    pants: '#5a7a6a', shoe: '#2a2a22', hairStyle: 'twinbuns', band: '#e8a0a0', sword: true,
  },
  // 茶寮的說書人葛先生：長鬚、青灰長衫
  storyteller: {
    skin: '#e8c09a', hair: '#5a5650', robe: '#5a6a7a', robeDark: '#3e4c5a', inner: '#e8e4d8', sash: '#2a3038',
    pants: '#2a3038', shoe: '#1e1e22', hairStyle: 'topknot', beard: '#8a8680',
  },
  // 鐵鋪學徒石小虎：光頭、短褂
  apprentice: {
    skin: '#d9a77c', hair: '#3a2a20', robe: '#7a6a5a', robeDark: '#5a4a3e', inner: '#c8a070', sash: '#3a2a20',
    pants: '#3a3a40', shoe: '#1e1e22', hairStyle: 'bald', band: '#e8c070', short: true,
  },
  // 王嫂：髮髻、碎花布衣
  lady: {
    skin: SKIN, hair: '#2a1f1a', robe: '#c88a6a', robeDark: '#a86a4a', inner: '#f0e4cc', sash: '#6a8aa8',
    pants: '#6a4a3a', shoe: '#2a1a1a', hairStyle: 'bun', band: '#6a8aa8',
  },
  // 臨江城的守城兵：紅帽、號衣
  guard: {
    skin: '#e2b48a', hair: '#2a1f1a', robe: '#a83a2a', robeDark: '#7a2a1e', inner: '#e8d8b0', sash: '#2a2a30',
    pants: '#2a2a30', shoe: '#1e1e22', hairStyle: 'bald', band: '#2a2a30', sword: true,
  },
  // 鳴泉劍派弟子：月白道袍、青色髮帶、背劍
  disciple: {
    skin: SKIN, hair: '#1a1614', robe: '#d8e0e8', robeDark: '#a8b4c0', inner: '#f4f6f8', sash: '#3e6656',
    pants: '#5a6a7a', shoe: '#22262a', hairStyle: 'topknot', band: '#3e6656', sword: true,
  },
  // 鳴泉掌門聞松年：白髮長鬚、深青道袍、背劍
  sect_master: {
    skin: '#ecc8a4', hair: '#e8e6e0', robe: '#2e5a4e', robeDark: '#1e4036', inner: '#eef2ee', sash: '#c8c0a0',
    pants: '#2a3a36', shoe: '#161a1a', hairStyle: 'topknot', band: '#c8c0a0', beard: '#f2f0ea', sword: true,
  },
  // 傳功長老韓靖秋：灰髮短鬚、青灰道袍
  sect_elder: {
    skin: SKIN, hair: '#8a8680', robe: '#7a8a96', robeDark: '#5a6a76', inner: '#eef0f2', sash: '#3e6656',
    pants: '#3a4650', shoe: '#1e2226', hairStyle: 'topknot', band: '#3e6656', beard: '#8a8680', sword: true,
  },
  // 大師兄陸鳴川：月白道袍、深青腰帶與髮帶（比一般弟子顏色深）
  sect_senior: {
    skin: '#eac29a', hair: '#141210', robe: '#e8eef2', robeDark: '#b0bcc8', inner: '#ffffff', sash: '#24483c',
    pants: '#3a4a5a', shoe: '#181c20', hairStyle: 'topknot', band: '#24483c', sword: true,
  },
  // 執法長老嚴守拙：黑鬚、深灰道袍、黑腰帶，神情嚴肅
  sect_judge: {
    skin: '#e2b48a', hair: '#3a3632', robe: '#4a4a52', robeDark: '#32323a', inner: '#d8d8d8', sash: '#1a1a1e',
    pants: '#2a2a30', shoe: '#141418', hairStyle: 'topknot', band: '#1a1a1e', beard: '#2a2622', sword: true,
  },
  // 藥堂長老蘇芷蘅：髮髻、淡青長衣、藥囊色腰帶
  sect_healer: {
    skin: SKIN, hair: '#4a4440', robe: '#8ab0a0', robeDark: '#6a9080', inner: '#f4f0e6', sash: '#a8804a',
    pants: '#5a7a6a', shoe: '#2a2a22', hairStyle: 'bun', band: '#a8804a',
  },
  // 蒙面人：黑衣黑巾
  masked: {
    skin: '#d9a77c', hair: '#141414', robe: '#202024', robeDark: '#141418', inner: '#303034', sash: '#3a3a40',
    pants: '#18181c', shoe: '#0e0e10', hairStyle: 'bald', band: '#202024',
  },
  // 鳴泉女弟子（顧小滿）：雙髻、月白道袍、青色髮帶
  disciple_girl: {
    skin: SKIN, hair: '#1a1614', robe: '#d8e0e8', robeDark: '#a8b4c0', inner: '#f4f6f8', sash: '#3e6656',
    pants: '#5a6a7a', shoe: '#22262a', hairStyle: 'twinbuns', band: '#3e6656', sword: true,
  },
  // 金刀鏢局的鏢師：黑衣、金色腰帶、背刀
  escort: {
    skin: '#d9a77c', hair: '#2a1f1a', robe: '#2a2a32', robeDark: '#1a1a22', inner: '#8a7a5a', sash: '#d4a640',
    pants: '#2a2a32', shoe: '#141418', hairStyle: 'topknot', band: '#d4a640', beard: '#2a1f1a', sword: true,
  },
  // 漕幫幫眾：短打、藍頭巾
  boatman: {
    skin: '#c89a6a', hair: '#2a1f1a', robe: '#4a6a8a', robeDark: '#34506a', inner: '#c8b890', sash: '#2a3a4a',
    pants: '#3a3a40', shoe: '#1e1e22', hairStyle: 'bald', band: '#3a5a8a',
  },
  // 書生：長髮、淡青長衫
  scholar: {
    skin: SKIN, hair: '#1a1614', robe: '#a8c0c8', robeDark: '#8098a0', inner: '#f4f0e8', sash: '#5a6a7a',
    pants: '#5a6a7a', shoe: '#22262a', hairStyle: 'long', band: '#5a6a7a',
  },
  // 乞丐：灰褐破衣、亂髮
  beggar: {
    skin: '#c89a6a', hair: '#4a3a2a', robe: '#7a6a52', robeDark: '#5a4a3a', inner: '#9a8a6a', sash: '#4a3a2a',
    pants: '#5a4a3a', shoe: '#3a2a1a', hairStyle: 'long', beard: '#4a3a2a',
  },
  // 貨郎陶四：斗笠、藍布衣
  peddler: {
    skin: SKIN, hair: '#2a1f1a', robe: '#4a6a9a', robeDark: '#34507a', inner: '#e8e0c8', sash: '#c8a050',
    pants: '#3a3a4a', shoe: '#22222a', hairStyle: 'topknot', hat: 'straw',
  },
  // 主角：髮髻綁藍色髮帶，背負長劍
  hero: {
    skin: SKIN, hair: '#2a1f1a', robe: '#3d6fa8', robeDark: '#2b4f7a', inner: '#eef0f2', sash: '#e2cf9c',
    pants: '#2f3542', shoe: '#1e1e24', hairStyle: 'topknot', band: '#6fb6e8', sword: true,
  },
  // 村長：花白頭髮、長鬚
  elder: {
    skin: SKIN, hair: '#c9c6c0', robe: '#8a6a46', robeDark: '#674d31', inner: '#e8dcc4', sash: '#4a3a2a',
    pants: '#4a3a2a', shoe: '#2a2018', hairStyle: 'topknot', beard: '#ecebe6',
  },
  // 茶攤的鍾嬸
  aunt: {
    skin: SKIN, hair: '#2a1f1a', robe: '#c4534a', robeDark: '#963c35', inner: '#f0e0c0', sash: '#e8c070',
    pants: '#5a3a3a', shoe: '#2a1a1a', hairStyle: 'bun', band: '#d4a640',
  },
  // 鐵匠：光頭綁紅頭巾、短鬚
  smith: {
    skin: '#d9a77c', hair: '#3a2a20', robe: '#5c5c62', robeDark: '#3f3f45', inner: '#8a5a3a', sash: '#8a5a3a',
    pants: '#3a3a40', shoe: '#1e1e22', hairStyle: 'bald', band: '#c43c32', beard: '#3a2a20',
  },
  // 村裡的小孩
  child: {
    skin: SKIN, hair: '#2a1f1a', robe: '#e8a33d', robeDark: '#b97b22', inner: '#fff1d0', sash: '#c4534a',
    pants: '#7a4a2a', shoe: '#3a2418', hairStyle: 'twinbuns', band: '#c4534a', short: true,
  },
  // 湖邊的漁翁：斗笠、灰鬚
  fisher: {
    skin: '#e2b48a', hair: '#9a968e', robe: '#5b7a8c', robeDark: '#425b69', inner: '#d8d2c0', sash: '#3a4a52',
    pants: '#3a4a52', shoe: '#22262a', hairStyle: 'topknot', hat: 'straw', beard: '#c9c6c0',
  },
  // 農夫：斗笠
  farmer: {
    skin: '#e2b48a', hair: '#2a1f1a', robe: '#7a9a5a', robeDark: '#5a7840', inner: '#e8e0c8', sash: '#5a4a32',
    pants: '#5a4a32', shoe: '#2a2218', hairStyle: 'topknot', hat: 'straw',
  },
  // 神秘的青衫客：長髮、背劍
  swordsman: {
    skin: SKIN, hair: '#1a1614', robe: '#4f8a7a', robeDark: '#36685b', inner: '#e8eee8', sash: '#2a3a36',
    pants: '#2a3a36', shoe: '#161a1a', hairStyle: 'long', band: '#e8eee8', sword: true,
  },
  // 斷崖寨嘍囉：紅頭巾、短鬚、背刀
  bandit: {
    skin: '#d9a77c', hair: '#2a1f1a', robe: '#6a5440', robeDark: '#4a3a2c', inner: '#a89070', sash: '#a83a2a',
    pants: '#3a3028', shoe: '#1e1a16', hairStyle: 'topknot', band: '#a83a2a', beard: '#2a1f1a', sword: true,
  },
  // 斷崖寨寨主祁三刀：光頭黑巾、絡腮鬍
  boss: {
    skin: '#c99468', hair: '#1a1410', robe: '#3a3a48', robeDark: '#26262f', inner: '#8a3a2a', sash: '#b8322a',
    pants: '#2a2a30', shoe: '#141418', hairStyle: 'bald', band: '#1e1e22', beard: '#1a1410', sword: true,
  },
};

type View = 'down' | 'side' | 'up';
/** 0 = 走路A、1 = 站立、2 = 走路B */
type Step = 0 | 1 | 2;

/** 畫出整張精靈表，回傳 canvas（48×96）。 */
export function drawCharacterSheet(s: CharStyle): HTMLCanvasElement {
  const [sheet, sctx] = makeCanvas(CHAR_W * 3, CHAR_H * 4);
  const rows: [View, boolean][] = [['down', false], ['side', false], ['side', true], ['up', false]];
  rows.forEach(([view, flip], row) => {
    for (let col = 0; col < 3; col++) {
      const [f, fctx] = makeCanvas(CHAR_W, CHAR_H);
      drawFigure(fctx, s, view, col as Step);
      outline(fctx, 0, 0, CHAR_W, CHAR_H, OUTLINE);
      const ox = col * CHAR_W;
      const oy = row * CHAR_H;
      // 影子在最底下，不描邊
      sctx.globalAlpha = 0.28;
      ellipse(sctx, ox + 8, oy + 22, 5, 1, '#000000');
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

function drawFigure(ctx: Ctx, s: CharStyle, view: View, step: Step) {
  // 小孩上半身往下移 2px，下半身（腿）位置不變
  const dy = s.short ? 2 : 0;
  // 上半身像素最多畫到第 19 列，避免和腿重疊
  const body = (x: number, y: number, w: number, h: number, c: string) => {
    const yy = y + dy;
    const hh = Math.min(h, 20 - yy);
    if (hh > 0) px(ctx, x, yy, w, hh, c);
  };

  if (view === 'down') drawDown(ctx, s, step, body);
  else if (view === 'side') drawSide(ctx, s, step, body);
  else drawUp(ctx, s, step, body);
}

type BodyFn = (x: number, y: number, w: number, h: number, c: string) => void;

// ── 正面 ────────────────────────────────────────────────

function drawDown(ctx: Ctx, s: CharStyle, step: Step, b: BodyFn) {
  // 背上的劍：劍柄從右肩後探出（先畫，讓身體蓋住）
  if (s.sword) {
    b(12, 9, 1, 3, '#c9a34a');
    b(11, 11, 2, 1, '#6b4a2a');
  }
  // 腿
  legsFront(ctx, s, step);
  // 身體與下擺
  b(4, 12, 8, 8, s.robe);
  b(3, 17, 10, 3, s.robe);
  b(3, 19, 10, 1, s.robeDark);
  b(6, 12, 4, 1, s.inner);
  b(7, 13, 2, 1, s.inner);
  b(4, 16, 8, 1, s.sash);
  // 手臂隨步伐微微擺動
  const lArm = step === 0 ? 1 : 0;
  const rArm = step === 2 ? 1 : 0;
  b(3, 13, 1, 4 - lArm, s.robeDark);
  b(3, 17 - lArm, 1, 1, s.skin);
  b(12, 13, 1, 4 - rArm, s.robeDark);
  b(12, 17 - rArm, 1, 1, s.skin);
  // 頭
  b(4, 5, 8, 6, s.skin);
  b(5, 11, 6, 1, s.skin);
  drawHairFront(s, b);
  // 眼睛
  if (!s.hat) {
    b(6, 7, 1, 2, EYE);
    b(9, 7, 1, 2, EYE);
  } else {
    b(6, 8, 1, 1, EYE);
    b(9, 8, 1, 1, EYE);
  }
  b(5, 9, 1, 1, '#eaa49a');
  b(10, 9, 1, 1, '#eaa49a');
  if (s.beard) {
    b(6, 10, 4, 1, s.beard);
    b(6, 11, 4, 2, s.beard);
    b(7, 13, 2, 1, s.beard);
  }
  if (s.hat) drawStrawHat(b, 'front');
}

function drawHairFront(s: CharStyle, b: BodyFn) {
  const h = s.hair;
  switch (s.hairStyle) {
    case 'topknot':
      if (!s.hat) {
        b(7, 0, 2, 2, h);
        if (s.band) { b(6, 2, 4, 1, s.band); b(5, 2, 1, 1, s.band); }
      }
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 3, h);
      b(4, 6, 2, 1, h);
      b(10, 6, 2, 1, h);
      b(4, 7, 1, 2, h);
      b(11, 7, 1, 2, h);
      break;
    case 'long':
      b(5, 1, 6, 2, h);
      b(4, 3, 8, 3, h);
      b(4, 6, 2, 1, h);
      b(10, 6, 2, 1, h);
      b(3, 6, 1, 8, h);
      b(12, 6, 1, 8, h);
      if (s.band) b(4, 3, 8, 1, s.band);
      break;
    case 'bun':
      b(6, 0, 4, 2, h);
      if (s.band) b(10, 0, 1, 2, s.band);
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 3, h);
      b(4, 6, 1, 3, h);
      b(11, 6, 1, 3, h);
      b(7, 5, 2, 1, s.skin);
      break;
    case 'twinbuns':
      b(3, 1, 3, 3, h);
      b(10, 1, 3, 3, h);
      if (s.band) { b(5, 3, 1, 1, s.band); b(10, 3, 1, 1, s.band); }
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 3, h);
      b(4, 6, 1, 2, h);
      b(11, 6, 1, 2, h);
      break;
    case 'bald':
      b(5, 3, 6, 2, s.skin);
      b(4, 4, 8, 2, s.skin);
      if (s.band) { b(4, 4, 8, 2, s.band); b(12, 5, 1, 2, s.band); }
      b(4, 6, 1, 2, h);
      b(11, 6, 1, 2, h);
      break;
  }
}

/** 斗笠：寬而扁的圓錐，蓋住頭頂與額頭。 */
function drawStrawHat(b: BodyFn, view: 'front' | 'back' | 'side') {
  const hat = '#d6b56c';
  const dark = '#a8884a';
  b(7, 1, 2, 1, dark);
  b(6, 2, 4, 1, hat);
  b(4, 3, 8, 1, hat);
  b(2, 4, 12, 1, hat);
  b(1, 5, 14, 1, dark);
  if (view !== 'back') b(5, 6, 6, 1, 'rgba(0,0,0,0.18)');
  b(5, 3, 1, 1, dark);
  b(10, 3, 1, 1, dark);
}

function legsFront(ctx: Ctx, s: CharStyle, step: Step) {
  const leg = (x: number, lifted: boolean) => {
    px(ctx, x, 20, 2, lifted ? 1 : 2, s.pants);
    px(ctx, x, lifted ? 21 : 22, 2, 1, s.shoe);
  };
  leg(5, step === 2);
  leg(9, step === 0);
}

// ── 側面（朝左；朝右由翻轉而來）──────────────────────────────

function drawSide(ctx: Ctx, s: CharStyle, step: Step, b: BodyFn) {
  // 腿：走路時前後跨步，遠側那條腿顏色較深
  if (step === 1) {
    px(ctx, 6, 20, 3, 2, s.pants);
    px(ctx, 5, 22, 4, 1, s.shoe);
  } else {
    const near = step === 0 ? 4 : 9;
    const far = step === 0 ? 9 : 4;
    px(ctx, far, 20, 2, 2, shade(s.pants));
    px(ctx, far - (step === 0 ? 0 : 1), 22, 3, 1, s.shoe);
    px(ctx, near, 20, 2, 2, s.pants);
    px(ctx, near - (step === 0 ? 1 : 0), 22, 3, 1, s.shoe);
  }
  // 背上的劍：斜插在背後
  if (s.sword) {
    b(10, 10, 1, 2, '#c9a34a');
    b(11, 12, 1, 3, '#6b4a2a');
    b(12, 15, 1, 2, '#6b4a2a');
  }
  // 身體
  b(5, 12, 6, 8, s.robe);
  b(4, 17, 8, 3, s.robe);
  b(4, 19, 8, 1, s.robeDark);
  b(5, 12, 2, 1, s.inner);
  b(5, 16, 6, 1, s.sash);
  // 手臂：前後擺
  const armX = step === 0 ? 5 : step === 2 ? 9 : 7;
  b(armX, 13, 2, 4, s.robeDark);
  b(armX, 17, 2, 1, s.skin);
  // 頭
  b(4, 5, 7, 6, s.skin);
  b(5, 11, 4, 1, s.skin);
  b(3, 8, 1, 1, s.skin); // 鼻子
  const h = s.hair;
  switch (s.hairStyle) {
    case 'topknot':
      if (!s.hat) {
        b(8, 0, 2, 2, h);
        if (s.band) { b(8, 2, 3, 1, s.band); b(11, 2, 1, 2, s.band); }
      }
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 2, h);
      b(4, 5, 4, 1, h);
      b(8, 5, 4, 5, h);
      break;
    case 'long':
      b(5, 1, 6, 2, h);
      b(4, 3, 8, 2, h);
      b(4, 5, 4, 1, h);
      b(8, 5, 4, 6, h);
      b(9, 11, 3, 4, h);
      if (s.band) b(4, 3, 8, 1, s.band);
      break;
    case 'bun':
      b(9, 0, 4, 3, h);
      if (s.band) b(12, 0, 1, 2, s.band);
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 2, h);
      b(4, 5, 3, 1, h);
      b(8, 5, 4, 5, h);
      break;
    case 'twinbuns':
      b(9, 1, 3, 3, h);
      if (s.band) b(9, 3, 1, 1, s.band);
      b(5, 2, 6, 1, h);
      b(4, 3, 8, 2, h);
      b(4, 5, 3, 1, h);
      b(8, 5, 4, 4, h);
      break;
    case 'bald':
      b(5, 3, 6, 1, s.skin);
      b(4, 4, 8, 6, s.skin);
      b(3, 8, 1, 1, s.skin);
      if (s.band) { b(4, 4, 8, 2, s.band); b(12, 5, 1, 3, s.band); }
      b(9, 6, 3, 3, h);
      break;
  }
  b(8, 7, 1, 2, s.skin); // 耳朵
  b(5, 7, 1, 2, EYE);
  if (s.beard) {
    b(4, 10, 3, 2, s.beard);
    b(5, 12, 2, 1, s.beard);
  }
  if (s.hat) drawStrawHat(b, 'side');
}

// ── 背面 ────────────────────────────────────────────────

function drawUp(ctx: Ctx, s: CharStyle, step: Step, b: BodyFn) {
  legsFront(ctx, s, step === 0 ? 2 : step === 2 ? 0 : 1);
  b(4, 12, 8, 8, s.robe);
  b(3, 17, 10, 3, s.robe);
  b(3, 19, 10, 1, s.robeDark);
  b(4, 16, 8, 1, s.sash);
  b(3, 13, 1, 4, s.robeDark);
  b(12, 13, 1, 4, s.robeDark);
  b(3, 17, 1, 1, s.skin);
  b(12, 17, 1, 1, s.skin);
  // 頭（整顆都是頭髮）
  const h = s.hair;
  if (s.hairStyle === 'bald') {
    b(4, 3, 8, 8, s.skin);
    b(4, 7, 8, 3, h);
    if (s.band) { b(4, 4, 8, 2, s.band); b(7, 6, 2, 3, s.band); }
  } else {
    b(5, 2, 6, 1, h);
    b(4, 3, 8, 8, h);
    b(5, 11, 6, 1, h);
  }
  switch (s.hairStyle) {
    case 'topknot':
      if (!s.hat) {
        b(7, 0, 2, 2, h);
        if (s.band) { b(6, 2, 4, 1, s.band); b(8, 3, 1, 3, s.band); }
      }
      break;
    case 'long':
      b(5, 12, 6, 4, h);
      b(6, 16, 4, 1, h);
      if (s.band) b(7, 6, 2, 1, s.band);
      break;
    case 'bun':
      b(6, 0, 4, 3, h);
      if (s.band) b(10, 1, 1, 2, s.band);
      break;
    case 'twinbuns':
      b(3, 1, 3, 3, h);
      b(10, 1, 3, 3, h);
      break;
    default:
      break;
  }
  // 背上的劍：從右肩斜到左腰
  if (s.sword) {
    b(11, 9, 2, 2, '#c9a34a');
    b(10, 11, 1, 1, '#d8c27a');
    b(9, 12, 2, 1, '#6b4a2a');
    b(8, 13, 2, 1, '#6b4a2a');
    b(7, 14, 2, 1, '#6b4a2a');
    b(6, 15, 2, 1, '#6b4a2a');
    b(5, 17, 2, 1, '#6b4a2a');
  }
  if (s.hat) drawStrawHat(b, 'back');
}

function shade(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * 0.75);
  const g = Math.round(((n >> 8) & 255) * 0.75);
  const bl = Math.round((n & 255) * 0.75);
  return `rgb(${r},${g},${bl})`;
}
