import { by } from './rooms';
import type { MapDef } from './types';

/**
 * 青竹村北 —— 村子北邊的田地與竹林，往北的小路通到大地圖（蒼嵐山方向）。
 * 南邊回青竹村，北邊走出去就是大地圖。
 */
export const qzNorth: MapDef = {
  id: 'qz_north',
  name: '青竹村北',
  subtitle: '青竹村・村北',
  // prettier-ignore
  tiles: [
    'YYYYYYYYYYYEEYYYYYYYYYYY',
    'YY..T......::......T..YY',
    'Y....*.....::...*......Y',
    'Y..o.......::.....nnnn.Y',
    'YT.........::.....nnnn.Y',
    'Y....YY....::.....nnnn.Y',
    'Y...YYYY...::..........Y',
    'Y....YY....::::::......Y',
    'Y..........::...:......Y',
    'Y.nnnn.....::...:...o..Y',
    'Y.nnnn.....::...:......Y',
    'Y.nnnn.....::...:..*...Y',
    'Y..........::.......T..Y',
    'YT...*.....::..........Y',
    'YY.........::.......o.YY',
    'YYYYYYYYYYYEEYYYYYYYYYYY',
  ],
  spawn: { x: 11, y: 14, facing: 'up' },
  battleBg: 'mountain',
  buildings: [],
  props: [
    { sprite: 'sign', x: 13, y: 1, lines: [{ text: '「青竹村北」\n北 ── 蒼嵐山\n南 ── 青竹村' }] },
    { sprite: 'stele', x: 5, y: 8, lines: [{ text: '一座小小的土地廟，供著幾個野果子，香爐裡的香還冒著煙。' }] },
    { sprite: 'well', x: 17, y: 6, lines: [{ text: '田邊的水井，打上來的水冰涼清甜。' }] },
  ],
  npcs: [
    {
      id: 'qzn_zou', name: '鄒老實', sprite: 'farmer', x: 8, y: 10, facing: 'right', wander: 2,
      talks: [
        by('鄒老實')('這幾畝地是我家的。今年雨水好，秧苗長得旺。'),
        by('鄒老實')('往北走就上蒼嵐山了。以前山上有山賊，現在聽說太平多啦。'),
      ],
    },
  ],
  exits: [
    // 北邊的小路：走出去就到大地圖，往蒼嵐山的方向
    { tiles: [[11, 0], [12, 0]], world: 'qingzhu', worldFrom: 'canglan' },
    { tiles: [[11, 15], [12, 15]], to: 'qingzhu', spawn: { x: 26, y: 1, facing: 'down' } },
  ],
};
