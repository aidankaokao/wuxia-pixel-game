import { armoryTalk, cellBed, choreAt, cookTalk, MQ, roomBed, cushion, dormBed, dutyTalk, herbalistTalk, ironStake, keeperTalk, kitchenStove, libShelf } from '../story/sect_mingquan';
import { by, exitTo, room } from './rooms';
import type { MapDef, PropDef } from './types';

/**
 * 鳴泉劍派各建築的室內：大殿、宿舍（大通鋪、弟子房、真傳弟子房）、練功房、書房、武器房、藥房、廚房。
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
    { sprite: 'chair', x: 7, y: 3, lines: [{ text: '掌門的座位。座前的蒲團上，跪過一代又一代入門的弟子。' }] },
    { sprite: 'chair', x: 3, y: 4, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 11, y: 4, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 3, y: 6, lines: [{ text: '長老的座位。' }] },
    { sprite: 'chair', x: 11, y: 6, lines: [{ text: '長老的座位。' }] },
    { sprite: 'f_deco_scholar_1', x: 2, y: 0, lines: [{ text: '一幅字：「劍心如泉，清而不息」。' }] },
    { sprite: 'f_deco_scholar_1', x: 12, y: 0, lines: [{ text: '一幅字：「守正」。' }, { text: '旁邊掛著《鳴泉門規》：\n一、不得擅入禁地　二、同門不得私鬥\n三、不得恃武欺人　四、典籍不得私攜\n五、本門武功不得外傳' }] },
    { sprite: 'sect_flag', x: 1, y: 1, lines: [{ text: '殿內的門派旗幟。' }] },
    { sprite: 'sect_flag', x: 13, y: 1, lines: [{ text: '殿內的門派旗幟。' }] },
  ],
  npcs: [
    { id: 'mqh_wen', work: true, name: '聞松年', sprite: 'sect_master', x: 7, y: 4, facing: 'down', person: 'wen' },
    { id: 'mqh_duty', work: true, name: MQ.ke, sprite: 'disciple', x: 10, y: 2, facing: 'down', script: dutyTalk },
  ],
  exits: [back(23, 10, 7, 9)],
};

// ── 宿舍 ────────────────────────────────────────────────

/** 大通鋪：記名弟子一人一個床位；最裡頭的空鋪借給上山應考的人 */
export const mqDorm: MapDef = {
  id: 'mq_dorm',
  name: '大通鋪',
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(15, 7, 7),
  spawn: { x: 7, y: 5, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    bed(1, 1), bed(4, 1), bed(7, 1, 'plain', 1, '這張床鋪亂糟糟的，枕頭底下塞著一本翻爛的拳譜。'), bed(10, 1), bed(12, 1),
    bed(1, 4), bed(4, 4), bed(9, 4),
    { ...bed(12, 4), lines: undefined, script: dormBed, label: '睡覺' },
    { sprite: 'vat', x: 13, y: 3, lines: [{ text: '一缸清水，弟子們早上在這裡洗臉。' }] },
  ],
  npcs: [
    // 天黑後回來睡覺的記名弟子
    { id: 'mqd_zheng', name: MQ.zheng, sprite: 'farmer', x: 2, y: 2, facing: 'down', night: true, talks: [by(MQ.zheng)('呼……呼……（鄭大壯已經睡得打呼了）')] },
    { id: 'mqd_bao', name: MQ.bao, sprite: 'disciple', x: 5, y: 2, facing: 'down', night: true, talks: [by(MQ.bao)('明天晨課一定不睡過頭……一定……')] },
    { id: 'mqd_tang', name: MQ.tang, sprite: 'disciple', x: 8, y: 2, facing: 'down', night: true, talks: [by(MQ.tang)('噓，小川睡了。他說夢話會背劍訣，挺好笑的。')] },
    { id: 'mqd_cao', name: MQ.cao, sprite: 'disciple', x: 11, y: 2, facing: 'down', night: true, talks: [by(MQ.cao)('掃了一整天的地，腰都直不起來了……')] },
    { id: 'mqd_qiao', name: MQ.qiao, sprite: 'disciple', x: 3, y: 5, facing: 'up', night: true, talks: [by(MQ.qiao)('站了一天山門，腿都是腫的。')] },
    {
      id: 'mqd_outer', name: MQ.hou, sprite: 'farmer', x: 6, y: 3, wander: 2,
      talks: [
        by(MQ.hou)('我是侯三郎，家裡排行老三。記名弟子都住這裡，一人一個床位。', '最裡頭那張空鋪，是留給上山應考的人借住的。想搬去弟子房，得先通過正式弟子的考核。'),
        by(MQ.hou)('天還沒亮就要起來挑水、劈柴、掃地，練劍反倒是排在最後。'),
      ],
    },
  ],
  exits: [back(6, 14, 7, 7)],
};

/** 弟子房：正式弟子兩人一間。beds 是兩張床（左、右）的內容，不給就只是擺設 */
const innerRoom = (id: string, name: string, door: [number, number], extra: string, beds: [Partial<PropDef>, Partial<PropDef>] = [{}, {}]): MapDef => ({
  id,
  name,
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(9, 6, 4),
  spawn: { x: 4, y: 4, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { ...bed(1, 1, 'plain', 2), ...beds[0] },
    { ...bed(6, 1, 'plain', 2), ...beds[1] },
    { sprite: 'f_table_plain_1', x: 1, y: 3, w: 2, lines: [{ text: extra }] },
    { sprite: 'f_shelf_plain_1', x: 6, y: 3, w: 2, lines: [{ text: '架上擺著幾本劍譜抄本，邊上寫滿了批註。' }] },
  ],
  npcs: [],
  exits: [back(door[0], door[1], 4, 6)],
});
export const mqRoomA = innerRoom('mq_room_a', '弟子房・甲', [4, 21], '桌上擺著兩副碗筷，還有一盤沒下完的棋。', [
  { lines: [{ text: `${MQ.he}的床鋪，被子胡亂捲成一團。聽說他打呼比雷還響。` }] },
  { lines: undefined, script: roomBed, label: '睡覺' },
]);
export const mqRoomB = innerRoom('mq_room_b', '弟子房・乙', [9, 21], '桌上攤著一封家書，字跡歪歪扭扭：「爹，女兒在山上很好……」寫到一半。');
// 夜裡回房的人：何守一住甲房；乙房住著蘇青苗，記名女弟子少，顧小滿暫住這裡
mqRoomA.npcs.push({ id: 'mqra_he', name: MQ.he, sprite: 'disciple', x: 2, y: 2, facing: 'down', night: true, talks: [by(MQ.he)('守了一天山門，總算能躺一下了。', '先說好，我打呼你別嫌吵。')] });
mqRoomB.npcs.push(
  { id: 'mqrb_miao', name: MQ.miao, sprite: 'lady', x: 2, y: 2, facing: 'down', night: true, talks: [by(MQ.miao)('這麼晚了還沒睡？明天還要早起呢。')] },
  { id: 'mqrb_gu', name: MQ.gu, sprite: 'disciple_girl', x: 7, y: 2, facing: 'down', night: true, person: 'xiaoman' },
);

/** 真傳弟子房：一人一間 */
const cell = (id: string, name: string, door: [number, number], desk: string, mine = false): MapDef => ({
  id,
  name,
  subtitle: '鳴泉劍派・弟子居所',
  tiles: room(7, 5, 3),
  spawn: { x: 3, y: 3, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    mine ? { ...bed(1, 1, 'scholar', 3), lines: undefined, script: cellBed, label: '睡覺' } : bed(1, 1, 'scholar', 3, '真傳弟子的床鋪，被褥是上好的棉布。'),
    { sprite: 'f_table_scholar_1', x: 4, y: 2, w: 2, lines: [{ text: desk }] },
    { sprite: 'f_deco_scholar_1', x: 4, y: 0, lines: [{ text: '牆上掛著師父親筆寫的字：「勤」。' }] },
  ],
  npcs: [],
  exits: [back(door[0], door[1], 3, 5)],
});
export const mqCell1 = cell('mq_cell_1', '真傳弟子房・一', [3, 26], '陸鳴川的書案。案上擺著筆墨與一卷劍譜，譜上的字跡工整，邊角寫滿了晨課要教的重點。');
// 陸鳴川夜裡回到自己的房間
mqCell1.npcs.push({ id: 'mqc_lu', name: MQ.lu, sprite: 'sect_senior', x: 1, y: 2, facing: 'down', night: true, person: 'lu', out: 19 });
export const mqCell2 = cell('mq_cell_2', '真傳弟子房・二', [8, 26], '葉疏桐的書案。案上空空的，只壓著一張字條：「下山一趟，勿念。」看來主人很久沒回來了。', true);

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
    { sprite: 'f_dummy_martial_3', x: 2, y: 2, script: ironStake, label: '練樁' },
    { sprite: 'f_dummy_martial_3', x: 5, y: 2, script: ironStake, label: '練樁' },
    { sprite: 'f_dummy_martial_3', x: 8, y: 2, script: ironStake, label: '練樁' },
    { sprite: 'f_deco_martial_1', x: 10, y: 1, w: 2, lines: [{ text: '兵器架上是練習用的鐵劍，比真劍重了一倍。' }] },
    { sprite: 'cushion', x: 2, y: 6, script: cushion, label: '打坐' },
    { sprite: 'cushion', x: 4, y: 6, script: cushion, label: '打坐' },
    { sprite: 'cushion', x: 9, y: 6, script: cushion, label: '打坐' },
    { sprite: 'f_deco_scholar_1', x: 6, y: 0, lines: [{ text: '牆上寫著：「一日不練手生，三日不練功荒」。' }] },
  ],
  npcs: [
    {
      id: 'mqt_coach', work: true, name: MQ.qi, sprite: 'disciple', x: 7, y: 4, facing: 'down',
      talks: [
        by(MQ.qi)('我是齊振遠，負責教記名弟子的基本功。', '劍法再精妙，馬步不穩、手腕不活，一樣是花架子。'),
        by(MQ.qi)('練功房裡的木人樁是包了鐵皮的，給正式弟子練。記名弟子可以用蒲團打坐。'),
      ],
    },
    { id: 'mqt_han', work: true, name: '韓靖秋', sprite: 'sect_elder', x: 10, y: 4, facing: 'left', person: 'han' },
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
    { sprite: 'f_shelf_scholar_3', x: 4, y: 1, w: 2, script: libShelf, label: '研讀' },
    { sprite: 'f_shelf_scholar_3', x: 7, y: 1, w: 2, script: choreAt('books', [{ text: '各門各派的掌故與江湖見聞。' }]) },
    { sprite: 'f_table_scholar_1', x: 3, y: 4, w: 2, lines: [{ text: '書案上攤著一本《鳴泉劍譜》的抄本，墨跡還沒乾。' }] },
    { sprite: 'f_deco_plain_1', x: 9, y: 5, lines: [{ text: '一盆文竹。' }] },
  ],
  npcs: [
    { id: 'mql_keeper', work: true, name: MQ.song, sprite: 'scholar', x: 8, y: 4, facing: 'left', script: keeperTalk },
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
  npcs: [{ id: 'mqa_keeper', work: true, name: MQ.meng, sprite: 'disciple', x: 4, y: 3, facing: 'down', script: armoryTalk }],
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
    { sprite: 'drying_rack', x: 1, y: 4, w: 2, script: choreAt('herbs', [{ text: '架上晾著剛採回來的草藥。' }]) },
    { sprite: 'drying_rack', x: 8, y: 4, w: 2, script: choreAt('herbs', [{ text: '架上晾著剛採回來的草藥。' }]) },
  ],
  npcs: [
    // 蘇長老在正式弟子考核之後回山
    { id: 'mqm_su', work: true, name: MQ.su, sprite: 'sect_healer', x: 3, y: 3, facing: 'down', person: 'su', when: (f) => f.mq_exam === 2 },
    { id: 'mqm_herbalist', work: true, name: MQ.miao, sprite: 'lady', x: 6, y: 3, facing: 'down', wander: 1, script: herbalistTalk },
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
    { sprite: 'f_stove_plain_3', x: 1, y: 1, w: 2, script: kitchenStove, label: '做菜' },
    { sprite: 'f_stove_plain_2', x: 4, y: 1, w: 2, lines: [{ text: '另一口灶，燉著一鍋肉湯。' }] },
    { sprite: 'vat', x: 8, y: 1, script: choreAt('water', [{ text: '水缸。每天早上記名弟子要把它挑滿。' }]) },
    { sprite: 'jars', x: 8, y: 4, w: 2, lines: [{ text: '架上是醃菜、米糧和油鹽醬醋。' }] },
    { sprite: 'f_table_plain_1', x: 1, y: 4, w: 2, lines: [{ text: '案板上切了一半的蘿蔔。' }] },
  ],
  npcs: [
    // 伙房師傅起得早，卯時就在廚房
    { id: 'mqk_cook', work: true, out: 18, name: MQ.bu, sprite: 'smith', x: 5, y: 3, facing: 'down', script: cookTalk },
  ],
  exits: [back(43, 27, 5, 7)],
};

export const SECT_MINGQUAN_ROOMS = [mqHall, mqDorm, mqRoomA, mqRoomB, mqCell1, mqCell2, mqTrain, mqLib, mqArmory, mqMed, mqKitchen];
