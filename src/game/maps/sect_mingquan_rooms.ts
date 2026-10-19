import { by, exitTo, room } from './rooms';
import type { MapDef, PropDef } from './types';

/**
 * 鳴泉劍派各建築的室內：大殿、宿舍（大通鋪、內門弟子房、親傳弟子房）、練功房、書房、武器房、藥房、廚房。
 * 出口回到 sect_mingquan.ts 院落裡該屋的門口。
 */

const back = (x: number, y: number, exitX: number, h: number) => exitTo('mq_sect', x, y, exitX, h);
const bed = (x: number, y: number, style = 'plain', lv = 1, text = '一張床鋪，被褥疊得方方正正。'): PropDef => ({
  sprite: `f_bed_${style}_${lv}`, x, y, w: 2, lines: [{ text }],
});

// ── 大殿 ────────────────────────────────────────────────

export const mqHall: MapDef = {
  id: 'mq_hall',
  name: '大殿',
  subtitle: '鳴泉劍派',
  tiles: room(15, 9, 7),
  spawn: { x: 7, y: 7, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'portrait', x: 6, y: 0, w: 2, lines: [{ text: '開派祖師的畫像。畫中人青衫背劍，立於泉邊，神情淡然。' }] },
    { sprite: 'altar', x: 6, y: 1, w: 3, lines: [{ text: '供桌上供著祖師的牌位與一柄古劍。劍鞘上刻著「鳴泉」二字。' }] },
    { sprite: 'chair', x: 7, y: 3, lines: [{ text: '掌門的座位。平時空著，議事時掌門才會坐在這裡。' }] },
    { sprite: 'chair', x: 3, y: 4, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 11, y: 4, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 3, y: 6, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 11, y: 6, lines: [{ text: '長老的座位。' }] },
    { sprite: 'f_deco_scholar_1', x: 2, y: 0, lines: [{ text: '一幅字：「劍心如泉，清而不息」。' }] },
    { sprite: 'f_deco_scholar_1', x: 12, y: 0, lines: [{ text: '一幅字：「守正」。' }] },
    { sprite: 'sect_flag', x: 1, y: 1, lines: [{ text: '殿內的門派旗幟。' }] },
    { sprite: 'sect_flag', x: 13, y: 1, lines: [{ text: '殿內的門派旗幟。' }] },
  ],
  npcs: [
    {
      id: 'mqh_duty', name: '值殿弟子', sprite: 'disciple', x: 10, y: 2, facing: 'down',
      talks: [
        by('值殿弟子')('這裡是大殿，掌門與長老議事、收徒大典都在這裡舉行。', '大典那天，新弟子要在祖師像前叩首，才算正式入門。'),
        by('值殿弟子')('祖師爺當年在鳴泉邊悟劍，一坐就是三年。', '本派的劍法，就是從泉水聲裡悟出來的。'),
      ],
    },
  ],
  exits: [back(23, 10, 7, 9)],
};

// ── 宿舍 ────────────────────────────────────────────────

/** 外門大通鋪：一長排床位 */
export const mqDorm: MapDef = {
  id: 'mq_dorm',
  name: '外門大通鋪',
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(15, 7, 7),
  spawn: { x: 7, y: 5, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    bed(1, 1), bed(4, 1), bed(7, 1, 'plain', 1, '這張床鋪亂糟糟的，枕頭底下塞著一本翻爛的拳譜。'), bed(10, 1), bed(12, 1),
    bed(1, 4), bed(4, 4), bed(9, 4), bed(12, 4),
    { sprite: 'vat', x: 13, y: 3, lines: [{ text: '一缸清水，弟子們早上在這裡洗臉。' }] },
  ],
  npcs: [
    {
      id: 'mqd_outer', name: '外門弟子', sprite: 'farmer', x: 6, y: 3, wander: 2,
      talks: [
        by('外門弟子')('外門弟子都住這裡，一人一個床位。', '想搬去內門的房間，得先通過內門考核。'),
        by('外門弟子')('天還沒亮就要起來挑水、劈柴、掃地，練劍反倒是排在最後。'),
      ],
    },
  ],
  exits: [back(6, 14, 7, 7)],
};

/** 內門弟子房：兩人一間 */
const innerRoom = (id: string, name: string, door: [number, number], extra: string): MapDef => ({
  id,
  name,
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(9, 6, 4),
  spawn: { x: 4, y: 4, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    bed(1, 1, 'plain', 2),
    bed(6, 1, 'plain', 2),
    { sprite: 'f_table_plain_1', x: 1, y: 3, w: 2, lines: [{ text: extra }] },
    { sprite: 'f_shelf_plain_1', x: 6, y: 3, w: 2, lines: [{ text: '架上擺著幾本劍譜抄本，邊上寫滿了批註。' }] },
  ],
  npcs: [],
  exits: [back(door[0], door[1], 4, 6)],
});
export const mqRoomA = innerRoom('mq_room_a', '內門弟子房・甲', [4, 21], '桌上擺著兩副碗筷，還有一盤沒下完的棋。');
export const mqRoomB = innerRoom('mq_room_b', '內門弟子房・乙', [9, 21], '桌上攤著一封家書，寫到一半。');

/** 親傳弟子房：一人一間 */
const cell = (id: string, name: string, door: [number, number], desk: string): MapDef => ({
  id,
  name,
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(7, 5, 3),
  spawn: { x: 3, y: 3, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    bed(1, 1, 'scholar', 3, '親傳弟子的床鋪，被褥是上好的棉布。'),
    { sprite: 'f_table_scholar_1', x: 4, y: 2, w: 2, lines: [{ text: desk }] },
    { sprite: 'f_deco_scholar_1', x: 4, y: 0, lines: [{ text: '牆上掛著師父親筆寫的字：「勤」。' }] },
  ],
  npcs: [],
  exits: [back(door[0], door[1], 3, 5)],
});
export const mqCell1 = cell('mq_cell_1', '親傳弟子房・一', [3, 26], '書案上擺著筆墨與一卷劍譜，譜上的字跡工整秀麗。');
export const mqCell2 = cell('mq_cell_2', '親傳弟子房・二', [8, 26], '書案上空空的，主人似乎很久沒回來了。');

// ── 練功、書房、武器、藥房、廚房 ─────────────────────────

export const mqTrain: MapDef = {
  id: 'mq_train',
  name: '練功房',
  subtitle: '鳴泉劍派',
  tiles: room(13, 9, 6),
  spawn: { x: 6, y: 7, facing: 'up' },
  theme: 'martial',
  buildings: [],
  props: [
    { sprite: 'f_dummy_martial_3', x: 2, y: 2, lines: [{ text: '包了鐵皮的木人樁，給內門弟子練習用。' }] },
    { sprite: 'f_dummy_martial_3', x: 5, y: 2, lines: [{ text: '包了鐵皮的木人樁，給內門弟子練習用。' }] },
    { sprite: 'f_dummy_martial_3', x: 8, y: 2, lines: [{ text: '包了鐵皮的木人樁，給內門弟子練習用。' }] },
    { sprite: 'f_deco_martial_1', x: 10, y: 1, w: 2, lines: [{ text: '兵器架上是練習用的鐵劍，比真劍重了一倍。' }] },
    { sprite: 'cushion', x: 2, y: 6, lines: [{ text: '打坐用的蒲團。' }] },
    { sprite: 'cushion', x: 4, y: 6, lines: [{ text: '打坐用的蒲團。' }] },
    { sprite: 'cushion', x: 9, y: 6, lines: [{ text: '打坐用的蒲團。' }] },
    { sprite: 'f_deco_scholar_1', x: 6, y: 0, lines: [{ text: '牆上寫著：「一日不練手生，三日不練功荒」。' }] },
  ],
  npcs: [
    {
      id: 'mqt_coach', name: '教習師兄', sprite: 'disciple', x: 7, y: 4, facing: 'down',
      talks: [
        by('教習師兄')('我負責教外門弟子的基本功。', '劍法再精妙，馬步不穩、手腕不活，一樣是花架子。'),
        by('教習師兄')('練功房裡的木人樁是包了鐵皮的，別用真劍砍，會捲刃。'),
      ],
    },
  ],
  exits: [back(40, 14, 6, 9)],
};

export const mqLib: MapDef = {
  id: 'mq_lib',
  name: '書房',
  subtitle: '鳴泉劍派',
  tiles: room(11, 7, 5),
  spawn: { x: 5, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'f_shelf_scholar_3', x: 1, y: 1, w: 2, lines: [{ text: '經史子集。練劍之餘也要讀書，這是祖師定下的規矩。' }] },
    { sprite: 'f_shelf_scholar_3', x: 4, y: 1, w: 2, lines: [{ text: '本派的劍譜與心法抄本，按入門先後排列。' }] },
    { sprite: 'f_shelf_scholar_3', x: 7, y: 1, w: 2, lines: [{ text: '各門各派的掌故與江湖見聞。' }] },
    { sprite: 'f_table_scholar_1', x: 3, y: 4, w: 2, lines: [{ text: '書案上攤著一本《鳴泉劍譜》的抄本，墨跡還沒乾。' }] },
    { sprite: 'f_deco_plain_1', x: 9, y: 5, lines: [{ text: '一盆文竹。' }] },
  ],
  npcs: [
    {
      id: 'mql_keeper', name: '管書弟子', sprite: 'scholar', x: 8, y: 4, facing: 'left',
      talks: [
        by('管書弟子')('書房裡的書可以看，不能帶走。', '真正的武學秘本收在掌門那裡，要立了功才能借閱。'),
        by('管書弟子')('大門派有藏經閣，咱們鳴泉劍派小，一間書房就夠了。'),
      ],
    },
  ],
  exits: [back(38, 20, 5, 7)],
};

export const mqArmory: MapDef = {
  id: 'mq_armory',
  name: '武器房',
  subtitle: '鳴泉劍派',
  tiles: room(9, 6, 4),
  spawn: { x: 4, y: 4, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'f_deco_martial_1', x: 1, y: 1, w: 2, lines: [{ text: '一排長劍，劍鞘上都刻著弟子的名字。' }] },
    { sprite: 'f_deco_martial_1', x: 4, y: 1, w: 2, lines: [{ text: '刀、槍、棍也有幾把，給弟子們見識各家兵器用的。' }] },
    { sprite: 'f_deco_martial_1', x: 6, y: 1, w: 2, lines: [{ text: '幾把未開鋒的新劍，等著分給新入門的弟子。' }] },
    { sprite: 'anvil', x: 1, y: 3, lines: [{ text: '磨劍、修劍用的鐵砧。' }] },
    { sprite: 'chest', x: 7, y: 3, lines: [{ text: '上了鎖的木箱，裡頭似乎是貴重的兵器。' }] },
  ],
  npcs: [],
  exits: [back(44, 20, 4, 6)],
};

export const mqMed: MapDef = {
  id: 'mq_med',
  name: '藥房',
  subtitle: '鳴泉劍派',
  tiles: room(11, 7, 5),
  spawn: { x: 5, y: 5, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'jars', x: 1, y: 1, w: 2, lines: [{ text: '藥櫃，一格格寫著藥名：當歸、川芎、三七、止血草……' }] },
    { sprite: 'jars', x: 4, y: 1, w: 2, lines: [{ text: '藥櫃最上層幾格貼著紅紙，寫著「非師命不得取用」。' }] },
    { sprite: 'f_furnace_plain_2', x: 8, y: 1, lines: [{ text: '藥爐正熬著藥，苦味瀰漫了整個屋子。' }] },
    { sprite: 'drying_rack', x: 1, y: 4, w: 2, lines: [{ text: '架上晾著剛採回來的草藥。' }] },
    { sprite: 'drying_rack', x: 8, y: 4, w: 2, lines: [{ text: '架上晾著剛採回來的草藥。' }] },
  ],
  npcs: [
    {
      id: 'mqm_herbalist', name: '管藥弟子', sprite: 'lady', x: 6, y: 3, facing: 'down', wander: 1,
      talks: [
        by('管藥弟子')('練武難免受傷，傷了就來藥房，別硬撐。', '後山有不少草藥，有空可以幫忙採一些。'),
        by('管藥弟子')('我們的金創藥，可比山下回春堂的還好用。'),
      ],
    },
  ],
  exits: [back(38, 27, 5, 7)],
};

export const mqKitchen: MapDef = {
  id: 'mq_kitchen',
  name: '廚房',
  subtitle: '鳴泉劍派',
  tiles: room(11, 7, 5),
  spawn: { x: 5, y: 5, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'f_stove_plain_3', x: 1, y: 1, w: 2, lines: [{ text: '大灶上的鍋子比人還寬，正冒著熱氣。' }] },
    { sprite: 'f_stove_plain_2', x: 4, y: 1, w: 2, lines: [{ text: '另一口灶，燉著一鍋肉湯。' }] },
    { sprite: 'vat', x: 8, y: 1, lines: [{ text: '水缸。每天早上外門弟子要把它挑滿。' }] },
    { sprite: 'jars', x: 8, y: 4, w: 2, lines: [{ text: '架上是醃菜、米糧和油鹽醬醋。' }] },
    { sprite: 'f_table_plain_1', x: 1, y: 4, w: 2, lines: [{ text: '案板上切了一半的蘿蔔。' }] },
  ],
  npcs: [],
  exits: [back(43, 27, 5, 7)],
};

export const SECT_MINGQUAN_ROOMS = [mqHall, mqDorm, mqRoomA, mqRoomB, mqCell1, mqCell2, mqTrain, mqLib, mqArmory, mqMed, mqKitchen];
