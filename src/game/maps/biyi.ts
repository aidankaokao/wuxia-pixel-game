import { supplierTalk } from '../story/supplier';
import { fishAt, isleBack, isleBoat, lotusPond, moonPavilion, qiaoCounter, ruanStall } from '../story/biyi';
import { by, exitTo, room } from './rooms';
import type { MapDef } from './types';

/**
 * 碧漪湖漁村 —— 碧漪湖西岸的小漁村（大地圖上的 biyi）。西邊的小路出去回大地圖（往青竹村）；
 * 東邊是湖，棧橋伸進湖裡，秦老漢的小船從這裡撐去湖心島。南邊有荷塘與蘆葦蕩。
 * 玩法與人物見 story/biyi.ts，釣魚見 fishing.ts。
 */

const xiaohe = by('喬小荷');

export const biyi: MapDef = {
  id: 'biyi',
  name: '碧漪湖漁村',
  subtitle: '碧漪湖西岸・漁村',
  // prettier-ignore
  tiles: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~~~',
    'T......................T.......~~~~~~~~~~~~~~~~~',
    'T.T......T..........T...........~~~~~~~~~~~~~~~~',
    'T....T......................o...~~~~~~~~~~~~~~~~',
    'T............*..................~~~~~~~~~~~~~~~~',
    'T..............................~~~~~~~~~~~~~~~~~',
    'T..............................~~~~~~~~~~~~~~~~~',
    'T..T..........................~~~~~~~~~~~~~~~~~~',
    'T......*.............*.......~~~~~~~~~~~~~~~~~~~',
    'T...............:.........:..~~~~~~~~~~~~~~~~~~~',
    'T...............:.........:.~~~~~~~~~~~~~~~~~~~~',
    'T...............:.........:.~~~~~~~~~~~~~~~~~~~~',
    'E:::::::::::::::::::::::::::::###########~~~~~~~',
    'E:::::::::::::::::::::::::::::###########~~~~~~~',
    'T..........:..........:......~~~~~~~~~~~~~~~~~~~',
    'T..........:.......*..:.......~~~~~~~~~~~~~~~~~~',
    'T..T.......:..........:........~~~~~~~~~~~~~~~~~',
    'T........*.:..........:........~~~~~~~~~~~~~~~~~',
    'T..........:..........:.*.......~~~~~~~~~~~~~~~~',
    'T.T..............T..............~~~~~~~~~~~~~~~~',
    'T......~~~~~....................~~~~~~~~~~~~~~~~',
    'T....~~~~~~~~~.*................~~~~~~~~~~~~~~~~',
    'T...*~~~~~~~~~.................~~~~~~~~~~~~~~~~~',
    'T....~~~~~~~~~....T..........o~~~~~~~~~~~~~~~~~~',
    'T......~~~~~.............o....~~~~~~~~~~~~~~~~~~',
    'T.....T........T...........T.~~~~~~~~~~~~~~~~~~~',
    'T...........................~~~~~~~~~~~~~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~~~~~~~',
  ],
  spawn: { x: 1, y: 13, facing: 'right' },
  battleBg: 'mountain',
  buildings: [
    { style: 'teahouse', x: 14, y: 6, name: '湖鮮館', sign: '湖鮮館', flag: '鮮', door: [], enter: { to: 'by_tavern', spawn: { x: 5, y: 6, facing: 'up' } } },
    { style: 'house', x: 24, y: 6, name: '秦家', door: [], enter: { to: 'by_qinhome', spawn: { x: 3, y: 4, facing: 'up' } } },
    { style: 'house2', x: 9, y: 16, name: '阮家', door: [{ text: '門上掛著一串風乾的小魚。' }, { text: '屋裡傳出阮大娘的聲音：「大水！魚簍又忘了收！」' }] },
    { style: 'house', x: 20, y: 16, name: '漁家', door: [{ text: '門口堆著補到一半的漁網。' }] },
  ],
  props: [
    { sprite: 'sign', x: 2, y: 12, lines: [{ text: '「碧漪湖漁村」\n東 ── 碧漪湖棧橋　南 ── 荷塘　西 ── 往青竹村' }] },
    { sprite: 'well', x: 8, y: 11, lines: [{ text: '村裡的井。井水跟湖水是通的，夏天特別涼。' }] },
    { sprite: 'drying_rack', x: 20, y: 11, w: 2, lines: [{ text: '架子上曬著一排小魚乾，蒼蠅嗡嗡地繞。' }] },
    { sprite: 'drying_rack', x: 4, y: 10, w: 2, lines: [{ text: '晾著的漁網上還掛著幾片水草。' }] },
    { sprite: 'jars', x: 27, y: 15, w: 2, script: ruanStall, label: '魚簍' },
    // 棧橋盡頭的釣點
    { sprite: 'ripple', x: 41, y: 13, script: fishAt('pier', '棧橋盡頭的湖水深一些，常有魚在這裡打轉。'), label: '釣魚' },
    { sprite: 'ripple', x: 41, y: 14, script: fishAt('pier', '棧橋盡頭的湖水深一些，常有魚在這裡打轉。'), label: '釣魚' },
    { sprite: 'boat', x: 37, y: 15, w: 3, script: isleBoat, label: '搭船' },
    // 南岸蘆葦蕩
    { sprite: 'reeds', x: 31, y: 23 },
    { sprite: 'reeds', x: 30, y: 24 },
    { sprite: 'reeds', x: 30, y: 26 },
    { sprite: 'ripple', x: 30, y: 25, script: fishAt('reeds', '蘆葦叢邊，水底下青蝦一彈一彈的。'), label: '釣魚' },
    // 荷塘
    { sprite: 'lotus', x: 8, y: 21, w: 2, script: lotusPond, label: '採蓮' },
    { sprite: 'lotus', x: 12, y: 24, w: 2, lines: [{ text: '荷葉底下，幾條小魚躲著太陽。' }] },
    { sprite: 'lotus', x: 5, y: 23, w: 2, lines: [{ text: '一朵粉白的荷花，花瓣上停著一隻蜻蜓。' }] },
  ],
  npcs: [
    { id: 'by_qin', work: true, name: '秦老漢', sprite: 'fisher', x: 36, y: 13, facing: 'right', person: 'qinlao' },
    { id: 'by_ruan', work: true, name: '阮大水', sprite: 'boatman', x: 27, y: 14, facing: 'down', script: supplierTalk('by_ruan', ruanStall) },
    {
      id: 'by_xiaohe', work: true, name: '喬小荷', sprite: 'girl', x: 10, y: 20, wander: 2,
      talks: [
        xiaohe('荷塘裡的蓮藕可大了！你要不要下來挖？', '……褲腳要挽高一點喔。'),
        xiaohe('秦爺爺說湖裡有一條白色的大鯉魚。', '我每天都在找，可是只看到白鵝。'),
        xiaohe('娘做的菱角糕最好吃了！比城裡的桂花糕還好吃！'),
      ],
    },
    {
      id: 'by_wang', work: true, name: '汪七', sprite: 'farmer', x: 6, y: 14, facing: 'right', wander: 2,
      talks: [
        by('汪七')('往西走湖畔小路，一刻鐘就到青竹村。', '我每隔幾天就挑魚過去賣，鍾嬸那兒收得最多。'),
        by('汪七')('這幾年湖裡的魚少了些。秦老爺子說，是有人在湖東頭下了密網。'),
      ],
    },
  ],
  exits: [
    // 西邊的湖畔小路：走出去就到大地圖，往青竹村的方向
    { tiles: [[0, 13], [0, 14]], world: 'biyi', worldFrom: 'qingzhu' },
  ],
};

/** 湖鮮館：喬嫂的館子，點菜、學湖鮮、住一晚 */
export const byTavern: MapDef = {
  id: 'by_tavern',
  name: '湖鮮館',
  subtitle: '碧漪湖漁村・館子',
  tiles: room(11, 8, 5),
  spawn: { x: 5, y: 6, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, script: qiaoCounter, label: '點菜／學菜' },
    { sprite: 'f_stove_plain_2', x: 7, y: 1, w: 2, lines: [{ text: '大灶上燉著一鍋鯽魚湯，湯白得像奶。' }] },
    { sprite: 'f_table_plain_1', x: 2, y: 4, w: 2, lines: [{ text: '桌上一盤糖醋鯉魚，只剩一副魚骨頭，頭尾還翹著。' }] },
    { sprite: 'f_table_plain_1', x: 7, y: 4, w: 2, lines: [{ text: '窗外就是碧漪湖，風裡有水草的味道。' }] },
    { sprite: 'jars', x: 9, y: 1, lines: [{ text: '一罈罈醃好的湖魚，封口貼著紅紙。' }] },
  ],
  npcs: [
    { id: 'byt_qiao', allDay: true, name: '喬嫂', sprite: 'aunt', x: 2, y: 2, facing: 'down', person: 'qiao' },
    { id: 'byt_xiaohe', night: true, name: '喬小荷', sprite: 'girl', x: 6, y: 3, facing: 'down', talks: [xiaohe('（打了個哈欠）明天……明天我還要去荷塘……')] },
  ],
  exits: [exitTo('biyi', 16, 10, 5, 8)],
};

/** 秦家：秦老漢夜裡在家 */
export const byQinHome: MapDef = {
  id: 'by_qinhome',
  name: '秦家',
  subtitle: '碧漪湖漁村・民居',
  tiles: room(7, 6, 3),
  spawn: { x: 3, y: 4, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'f_bed_plain_1', x: 1, y: 1, w: 2, lines: [{ text: '一張硬板床，被子疊得方方正正。' }] },
    {
      sprite: 'f_shelf_plain_1', x: 4, y: 1, w: 2,
      lines: [{ text: '架上一排釣竿，最舊的那根竹節都磨亮了。' }, { text: '牆上掛著一張褪色的畫：一尾白鯉躍出湖面，旁邊題著「十七歲記」。' }],
    },
  ],
  npcs: [{ id: 'byq_qin', night: true, name: '秦老漢', sprite: 'fisher', x: 3, y: 2, facing: 'down', person: 'qinlao' }],
  exits: [exitTo('biyi', 26, 10, 3, 6)],
};

/** 湖心島：望月亭；每月十五夜裡白鯉浮上來 */
export const byIsle: MapDef = {
  id: 'by_isle',
  name: '湖心島',
  subtitle: '碧漪湖・湖心',
  // prettier-ignore
  tiles: [
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~T.......T~~~~~~~~',
    '~~~~~~~.............~~~~~~',
    '~~~~~~~.............~~~~~~',
    '~~~~###............*.~~~~~',
    '~~~~~~~.............~~~~~~',
    '~~~~~~~.T..*....*...~~~~~~',
    '~~~~~~~~~.T....T..T~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  spawn: { x: 6, y: 8, facing: 'right' },
  battleBg: 'mountain',
  buildings: [],
  props: [
    { sprite: 'pavilion', x: 12, y: 6, w: 3, script: moonPavilion, label: '望月亭' },
    { sprite: 'boat', x: 4, y: 9, w: 3, script: isleBack, label: '回漁村' },
    { sprite: 'ripple', x: 21, y: 8, script: fishAt('isle', '島東邊的水又深又靜，偶爾有大魚翻身的水聲。'), label: '釣魚' },
    { sprite: 'stele', x: 16, y: 7, lines: [{ text: '一塊長了青苔的小石碑：「月滿碧漪，白鯉朝天。」' }, { text: '底下還有一行小字，被風雨磨得看不清了。' }] },
  ],
  npcs: [],
  exits: [],
};

export const BIYI_MAPS = [biyi, byTavern, byQinHome, byIsle];
