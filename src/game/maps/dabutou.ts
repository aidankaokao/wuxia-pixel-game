import { bpCookTalk, bpInnTalk, fisherTalk, fishStall, shipOfficeTalk, shrineTalk, tideWatch, traderTalk } from '../story/dabutou';
import { by, exitTo, room } from './rooms';
import type { MapDef } from './types';

/**
 * 大埠頭 —— 大江入海口的港口小城（大地圖上的 dabutou）。東邊是東海碼頭，南邊是大江，西邊的大路出去回大地圖。
 * 店家與玩法見 story/dabutou.ts。
 */
export const dabutou: MapDef = {
  id: 'dabutou',
  name: '大埠頭',
  subtitle: '大江入海口・港口',
  // prettier-ignore
  tiles: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTTT~~~~~~~~',
    '.T.T..T.T.TT..TT.....T..TT..T....TTT.......:~~~~~~~~',
    'T......T..T.T.............T.......T.TTT.TT.:~~~~~~~~',
    'T..........TTTT...T...::...T......T.TTTT.TT:~~~~~~~~',
    '...*............*.....::...*..o.........T..:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '.T....................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    'E:::::::::::::::::::::::::::::::::::::::::::######~~',
    'E:::::::::::::::::::::::::::::::::::::::::::######~~',
    '......................::...................:~~~~~~~~',
    '..................==========.............o.:~~~~~~~~',
    '...*..............==========...............:~~~~~~~~',
    '..................==========...............:~~~~~~~~',
    '..................==========...............:~~~~~~~~',
    '..................==========...............:~~~~~~~~',
    '..o...................::...................:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '........::::::::::::::::::::::::::::::::::::~~~~~~~~',
    '...............*......::...................:~~~~~~~~',
    '..T..T................::....*..............:~~~~~~~~',
    '......................::...................:~~~~~~~~',
    '::::::::::::::::::::::::::::::::::::::::::::~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  spawn: { x: 1, y: 14, facing: 'right' },
  battleBg: 'mountain',
  buildings: [
    { style: 'teahouse', x: 3, y: 9, name: '望潮客棧', sign: '望潮客棧', flag: '客', door: [], enter: { to: 'bp_inn', spawn: { x: 5, y: 6, facing: 'up' } } },
    { style: 'hall', x: 11, y: 8, name: '海商會館', sign: '海商會館', door: [], enter: { to: 'bp_trader', spawn: { x: 4, y: 5, facing: 'up' } } },
    { style: 'house2', x: 27, y: 9, name: '船行', sign: '船行', flag: '船', door: [], enter: { to: 'bp_ship', spawn: { x: 4, y: 5, facing: 'up' } } },
    {
      style: 'hall', x: 34, y: 8, name: '漕幫總舵', sign: '漕幫總舵',
      door: [{ text: '朱漆大門緊閉，門環上纏著粗麻繩。' }, { text: '門口兩個漢子抱著胳膊，眼睛一直盯著你。' }],
    },
    { style: 'sect_master', x: 8, y: 19, name: '海神祠', sign: '海神祠', door: [], enter: { to: 'bp_shrine', spawn: { x: 4, y: 5, facing: 'up' } } },
    { style: 'house', x: 31, y: 19, name: '漁家', door: [{ text: '門口晾著一張破了洞的漁網。' }, { text: '屋裡沒人，龐老大大概在碼頭邊。' }] },
    { style: 'house2', x: 36, y: 18, name: '民居', door: [{ text: '門關著。窗台上曬著一排魚乾。' }] },
  ],
  props: [
    { sprite: 'sign', x: 2, y: 13, lines: [{ text: '「大埠頭」\n大江在此入海。東 ── 東海碼頭　南 ── 江邊碼頭' }] },
    { sprite: 'sign', x: 42, y: 13, lines: [{ text: '「東海碼頭」\n海船在此停靠。出海請洽船行。' }] },
    { sprite: 'pavilion', x: 40, y: 26, w: 3, script: tideWatch, label: '觀潮' },
    { sprite: 'stall', x: 25, y: 26, w: 2, script: fishStall('鍾小螺', '今早剛靠岸的海魚！蝦子還在跳呢！'), label: '魚攤' },
    { sprite: 'stall', x: 28, y: 26, w: 2, script: fishStall('龐小浪', '海帶、鮮蝦，都是我爹船上撈的！'), label: '魚攤' },
    { sprite: 'well', x: 19, y: 23, lines: [{ text: '城裡的水井。海邊的井水帶著一點鹹味。' }] },
    { sprite: 'boat', x: 46, y: 11, w: 3, lines: [{ text: '一艘三桅海船，帆都收著。船身漆著「順風」兩個大字。' }] },
    { sprite: 'boat', x: 46, y: 17, w: 3, lines: [{ text: '一艘停了很久的商船，甲板上空無一人。' }] },
    { sprite: 'boat', x: 25, y: 30, w: 3, lines: [{ text: '往來大江的客船，船頭插著船行的旗子。' }] },
  ],
  npcs: [
    { id: 'bp_pang', name: '龐老大', sprite: 'fisher', x: 21, y: 27, facing: 'down', script: fisherTalk },
    { id: 'bp_luo_vendor', name: '鍾小螺', sprite: 'lady', x: 25, y: 25, facing: 'down', talks: [by('鍾小螺')('買魚到攤子前面挑！早上的最新鮮！')] },
    { id: 'bp_lang', name: '龐小浪', sprite: 'child', x: 28, y: 25, facing: 'down', talks: [by('龐小浪')('我爹說，等我長大了就帶我出海！')] },
    {
      id: 'bp_tan', name: '譚大力', sprite: 'farmer', x: 41, y: 15, facing: 'left', wander: 1,
      talks: [by('譚大力')('扛了一早上的貨，海船上的箱子一個比一個重。'), by('譚大力')('漕幫的人說，碼頭上的活兒都得先跟他們打招呼。')],
    },
    {
      id: 'bp_yin', name: '殷海客', sprite: 'boatman', x: 45, y: 15, facing: 'left',
      talks: [
        by('殷海客')('我跑了二十年的海，從來沒見過這麼囂張的海盜。', '他們的船快得像飛，掛的是黑帆……'),
        by('殷海客')('東海上有幾座小島，以前漁民在上頭曬網，現在都沒人敢去了。'),
      ],
    },
    { id: 'bp_mei_kid', name: '梅小貝', sprite: 'child', x: 12, y: 25, wander: 2, talks: [by('梅小貝')('奶奶的籤很準喔！上回王伯伯求了下籤，第二天就跌了一跤。')] },
    { id: 'bp_cao1', allDay: true, name: '樊鐵', sprite: 'bandit', x: 36, y: 13, facing: 'down', talks: [by('樊鐵')('漕幫總舵，閒人止步。')] },
    { id: 'bp_cao2', allDay: true, name: '樊石', sprite: 'bandit', x: 38, y: 13, facing: 'down', talks: [by('樊石')('看什麼看？總舵主不見外人。')] },
  ],
  exits: [
    // 西邊的大路：走出去就到大地圖，往臨江城的方向
    { tiles: [[0, 14], [0, 15]], world: 'dabutou', worldFrom: 'linjiang' },
  ],
};

/** 望潮客棧：住店、點菜；老闆娘潘大娘教海鮮料理 */
export const bpInn: MapDef = {
  id: 'bp_inn',
  name: '望潮客棧',
  subtitle: '大埠頭・客棧',
  tiles: room(11, 8, 5),
  spawn: { x: 5, y: 6, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, script: bpInnTalk, label: '住店／點菜' },
    { sprite: 'f_stove_plain_2', x: 7, y: 1, w: 2, script: bpCookTalk, label: '學做海鮮' },
    { sprite: 'f_table_plain_1', x: 2, y: 4, w: 2, lines: [{ text: '桌上一盤吃剩的魚骨頭，啃得乾乾淨淨。' }] },
    { sprite: 'f_table_plain_1', x: 7, y: 4, w: 2, lines: [{ text: '窗外就是海，浪聲一陣一陣地傳進來。' }] },
  ],
  npcs: [
    { id: 'bpi_pan', allDay: true, name: '潘海生', sprite: 'elder', x: 2, y: 2, facing: 'down', script: bpInnTalk },
    { id: 'bpi_panma', allDay: true, name: '潘大娘', sprite: 'aunt', x: 7, y: 2, facing: 'down', script: bpCookTalk },
  ],
  exits: [exitTo('dabutou', 5, 13, 5, 8)],
};

/** 海商會館：海外來的飾品 */
export const bpTrader: MapDef = {
  id: 'bp_trader',
  name: '海商會館',
  subtitle: '大埠頭・會館',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'counter', x: 3, y: 2, w: 3, script: traderTalk, label: '看貨' },
    { sprite: 'jars', x: 1, y: 1, w: 2, lines: [{ text: '木箱上烙著看不懂的外國字，裡頭飄出一股香料味。' }] },
    { sprite: 'f_shelf_scholar_2', x: 6, y: 1, w: 2, lines: [{ text: '架上擺著海圖和幾個奇形怪狀的貝殼。' }] },
  ],
  npcs: [{ id: 'bpt_luo', allDay: true, name: '駱千帆', sprite: 'scholar', x: 4, y: 1, facing: 'down', script: traderTalk }],
  exits: [exitTo('dabutou', 14, 13, 4, 7)],
};

/** 船行：大江水路、出海 */
export const bpShip: MapDef = {
  id: 'bp_ship',
  name: '船行',
  subtitle: '大埠頭・船行',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'counter', x: 3, y: 2, w: 3, script: shipOfficeTalk, label: '搭船' },
    { sprite: 'f_deco_plain_1', x: 1, y: 1, lines: [{ text: '牆上釘著一張大江水路圖，從臨江城一路畫到大埠頭。' }] },
    { sprite: 'jars', x: 6, y: 1, w: 2, lines: [{ text: '一捆捆的纜繩和船帆，堆得比人還高。' }] },
  ],
  npcs: [{ id: 'bps_ling', allDay: true, name: '凌萬川', sprite: 'boatman', x: 4, y: 1, facing: 'down', script: shipOfficeTalk }],
  exits: [exitTo('dabutou', 29, 13, 4, 7)],
};

/** 海神祠：求籤 */
export const bpShrine: MapDef = {
  id: 'bp_shrine',
  name: '海神祠',
  subtitle: '大埠頭・海神祠',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'altar', x: 3, y: 1, w: 3, script: shrineTalk, label: '上香求籤' },
    { sprite: 'portrait', x: 6, y: 0, w: 2, lines: [{ text: '海神娘娘的畫像，手持如意，腳踏浪花。' }] },
  ],
  npcs: [{ id: 'bpsh_mei', allDay: true, name: '梅婆婆', sprite: 'aunt', x: 2, y: 3, facing: 'right', script: shrineTalk }],
  exits: [exitTo('dabutou', 10, 23, 4, 7)],
};

export const DABUTOU_MAPS = [dabutou, bpInn, bpTrader, bpShip, bpShrine];
