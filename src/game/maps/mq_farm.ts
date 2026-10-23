import { farmSign, teaRack } from '../story/mq_fund';
import type { MapDef } from './types';

/**
 * 鳴泉山田 —— 後山往東的一片山坡：北坡一行行茶壟（鳴泉的「泉霧茶」），西南是水田，東南是藥圃，
 * 路邊一間製茶房。由雜役甘伯禾照管，記名弟子輪流來幫忙；收成進門派公庫（story/mq_fund.ts）。
 */
export const mqFarm: MapDef = {
  id: 'mq_farm',
  name: '鳴泉山田',
  subtitle: '鳴泉劍派・後山東坡',
  // prettier-ignore
  tiles: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^....................................^^',
    '^^..ccccccccc..cccccccccc..cccccccccT.^^',
    '^^....................................^^',
    '^^..ccccccccc..cccccccccc..ccccccccc..^^',
    '^^....................................^^',
    '^^..ccccccccc..cccccccccc..ccccccccc..^^',
    '^^...........::.......................^^',
    '^^^..........::.......................^^',
    '^^.T.........::......................T^^',
    'E::::::::::::::::::::::::::::::.......^^',
    'E::::::::::::::::::::::::::::::.......^^',
    '^^........::...............::::::::...^^',
    '^^.fffffff..fffffff........::.......o.^^',
    '^^.fnnnnnnnnnnnnnnf.T.fffff..ffffff...^^',
    '^^.fnnnnnnnnnnnnnnf...fgggggggggggf...^^',
    '^^.fnnnnnnnnnnnnnnf...fgggggggggggf...^^',
    '^^.fnnnnnnnnnnnnnnf...fgggggggggggf...^^',
    '^^.fnnnnnnnnnnnnnnf.o.fgggggggggggf...^^',
    '^^.fnnnnnnnnnnnnnnf...fffffffffffff..T^^',
    '^^.ffffffffffffffff...................^^',
    '^^.................T..................^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  ],
  spawn: { x: 1, y: 11, facing: 'right' },
  battleBg: 'mountain',
  buildings: [
    {
      style: 'house2', x: 31, y: 9, name: '製茶房', sign: '製茶房', flag: '茶',
      door: [{ text: '屋裡支著兩口大鐵鍋，炒茶的香氣從門縫飄出來。' }, { text: '（甘伯禾不讓人亂碰他的鍋，說火候差一點，一鍋茶就廢了）' }],
    },
  ],
  props: [
    { sprite: 'sign', x: 4, y: 10, script: farmSign },
    { sprite: 'drying_rack', x: 36, y: 12, w: 2, script: teaRack, label: '查看' },
  ],
  npcs: [
    // 甘伯禾與來幫忙的同門自己過日子（story/life_mingquan.ts）
  ],
  exits: [{ tiles: [[0, 11], [0, 12]], to: 'mq_back', spawn: { x: 30, y: 11, facing: 'left' } }],
};
