import { clothShopTalk } from '../story/linjiang';
import { loomAt } from '../story/weaving';
import { exitTo, room } from './rooms';
import type { MapDef } from './types';

/** 臨江城各建築的室內。出口回到 linjiang.ts 該屋的門口。 */

export const ljCloth: MapDef = {
  id: 'lj_cloth',
  name: '錦繡布莊',
  subtitle: '臨江城・布莊',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, lines: [{ text: '櫃台上攤著一疋剛裁開的綢子，旁邊擱著剪刀與量尺。' }] },
    { sprite: 'cloth_rack', x: 5, y: 1, w: 2, lines: [{ text: '架上的布疋紅的、藍的、月白的，一捲捲擺得整整齊齊。' }] },
    { sprite: 'mannequin', x: 1, y: 4, lines: [{ text: '衣架上披著一件做好的長衫，等客人來取。' }] },
    { sprite: 'mannequin', x: 7, y: 4, lines: [{ text: '一件錦緞外袍，袖口繡著雲紋，標價九十兩。' }] },
    { sprite: 'loom', x: 5, y: 4, w: 2, script: loomAt('一架織布機，經線繃得整整齊齊。老闆娘說，學了手藝的客人可以借用。'), label: '織布' },
  ],
  npcs: [{ id: 'lj_jin', work: true, name: '魏錦娘', sprite: 'lady', x: 4, y: 3, facing: 'down', script: clothShopTalk }],
  exits: [exitTo('linjiang', 47, 8, 4, 7)],
};

export const LINJIANG_ROOMS = [ljCloth];
