import { lanternTime } from '../festival';
import { steleRead, strangerTalk, wellUse } from '../story/bandits';
import type { MapDef } from './types';

/**
 * 青竹村 —— 遊戲起點。
 * 坐落蒼嵐山腳，雲水河自山中流下，注入村東南的碧漪湖。
 * 北上山口通往蒼嵐山，東過木橋通往臨江城，南接南嶺古道。
 * 村裡的人自己過日子（story/life_towns.ts），這裡只留青衫客。
 */
export const qingzhu: MapDef = {
  id: 'qingzhu',
  name: '青竹村',
  subtitle: '蒼嵐山腳・雲水河畔',
  // prettier-ignore
  tiles: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^EE^^^^^^^^^^^^~~~^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^::^*..^^^^^^^^^~~~^^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^::^.....^^^^^^^~~~^..*^^^^^^^^',
    '^^^^^^^^^^^^...^^^^^^^^^^^::^....T..^^^^^~~~....T.^^^^^^',
    '^^^^^^^^^^o.T.....^^^^^^.^::^........T...*~~~.......^^^^',
    'T^^^^^^^^............T...^::^.T.....T....*~~~........^^^',
    'TT.^^^^...T.....*......T..::...........T.T~~~.........TT',
    'T..YYY.YYYY............*..::........T.....~~~..TT....TTT',
    'TTY....:YYY.*T........o...::.....T........~~~T..T.....TT',
    'TYY*...:YYYo.....**.......::.............T~~~.........*T',
    'TYY....:Y.................::.............~~~..........TT',
    'TYYY..Y:Y.Y...............::.............~~~........*.TT',
    'TY.YY..::Y................::.............~~~..........TT',
    'T.Y.YY..:YY...............::...........T~~~..T.........T',
    'TTY.Y.YY:YY...............::............~~~*..........TT',
    'TTYYYY.Y:YY...............::...........~~~...........*TT',
    'TYYY.YY.:YY.........:.....::...:......o~~~..*.........TT',
    'TY..YYY.:.........T..============.....~~~...T.........TT',
    'TY.*.Y.Y:............============.T..*~~~..............T',
    'TTY..YY::YY..:.......============.....~~~..............T',
    'TYY..Y:::::::::::::::============:::::###::::::::::::::E',
    'TY..Y.Y.Y.:..........============:::::###::::::::::::::E',
    'TTY..YYYY.:.T...TT.T.============.....~~~..............T',
    'T..YYYYYY.:....*.....============.....~~~......o.......T',
    'TTY..To.YY:..........============......~~~.....**.....TT',
    'TTT..YYY.Y:...............::...........~~~....T.......TT',
    'TYYYYYYY..:....*..........::............~~~~~~~~~~....TT',
    'T...YY..YY:...............::...........~~~~~~~~~~~~...TT',
    'TYY...*.YY:...............::..........~~~~~~~~~~~~~~~..T',
    'T.*.......:.....o.........::.........~~~~~~~~~~~~~~~~.TT',
    'T...ffffff:ffffff*...::::::::::::....~~~~~~~~~~~~~~~~.TT',
    'T...fnnnnnnnnnnnf.........::......o...~~~~~~~~~~~~~~~..T',
    'TT..fnnnnnnnnnnnf..T......::..T.......~~~~~~~~~~~~~~~~.T',
    'T...fnnnnnnnnnnnf.....T...::..........~~~~~~~~~~~~~~~~TT',
    'TTT.fnnnnnnnnnnnf.........::.........o~~~~~~~~~~~~~~~..T',
    'TT..fnnnnnnnnnnnf.....T...::....T.....T.~~~~~~~~~~~~.TTT',
    'TTo.fffffffffffff......o..::.......T..*..~~~~~~~......TT',
    'T..........T.*T.*......T..::...........................T',
    'T.T.T.TTT.TTTTT*TT.TTTT.T.::.TT.TTTTT.TT.TT.TTTTT.TT.TTT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTTEETTTTTTTTTTTTTTTTTTTTTTTTTTTT',
  ],
  spawn: { x: 26, y: 22, facing: 'down' },

  buildings: [
    {
      style: 'hall', x: 17, y: 11, name: '柳家大宅', sign: '柳宅', door: [],
      enter: { to: 'qz_liu', spawn: { x: 5, y: 5, facing: 'up' } },
    },
    {
      style: 'teahouse', x: 29, y: 12, name: '竹風茶寮', sign: '竹風茶寮', flag: '茶', door: [],
      enter: { to: 'qz_tea', spawn: { x: 4, y: 5, facing: 'up' } },
    },
    {
      style: 'smithy', x: 11, y: 15, name: '石家鐵鋪', sign: '石家鐵鋪', flag: '鐵', door: [],
      enter: { to: 'qz_smithy', spawn: { x: 2, y: 5, facing: 'up' } },
    },
    {
      style: 'house', x: 19, y: 26, name: '趙家',
      door: [{ text: '門上掛著一把大鎖。' }, { text: '聽說屋主趙家到臨江城做買賣去了，大半年沒回來。' }],
    },
    {
      style: 'house2', x: 30, y: 26, name: '王家', door: [],
      enter: { to: 'qz_wang', spawn: { x: 2, y: 4, facing: 'up' } },
    },
  ],

  props: [
    // 過年、元宵、中秋掛燈籠
    { sprite: 'lantern_post', x: 21, y: 16, when: lanternTime, lines: [{ text: '村裡掛起了紅燈籠，孩子們提著小燈跑來跑去。' }] },
    { sprite: 'lantern_post', x: 33, y: 16, when: lanternTime, lines: [{ text: '燈籠紙上畫著福字。' }] },
    { sprite: 'well', x: 23, y: 19, script: wellUse, label: '打水' },
    {
      sprite: 'bulletin', x: 29, y: 17,
      lines: [
        { text: '【告示】' },
        { text: '近日蒼嵐山一帶有山賊出沒，村民切勿獨自上山。\n凡有能人願為本村除害者，請找村長柳承安一敘。' },
        { text: '──青竹村 村長 柳承安' },
      ],
    },
    { sprite: 'sign', x: 28, y: 33, lines: [{ text: '「青竹村」\n北通蒼嵐山・東往臨江城・南接南嶺古道' }] },
    { sprite: 'sign', x: 28, y: 9, lines: [{ text: '北 ── 蒼嵐山\n山路險峻，日落後勿行。' }] },
    { sprite: 'sign', x: 36, y: 19, lines: [{ text: '東 ── 臨江城　三十里' }] },
    // 村口的土地公祠（Godot 版用 id 認出來，蓋成一座小祠）
    {
      id: 'tudi', sprite: 'stele', x: 52, y: 18,
      lines: [{ text: '村口一座小小的土地公祠，供著一尊石雕的土地公，香爐裡插著幾炷香。' }, { text: '出遠門的人都會在這裡拜一拜，求一路平安。' }],
    },
    { sprite: 'stele', x: 5, y: 9, script: steleRead },
    // 村西南的大田是鳴泉劍派的祖田，佃給村裡人種（story/mq_trade.ts）
    { sprite: 'sign', x: 17, y: 31, lines: [{ text: '「鳴泉劍派祖田」\n佃戶：阿牛、鄒老實等\n夏租六月初一、冬租十月初一，交柳村長代收。' }] },
    { sprite: 'stall', x: 30, y: 22, w: 2, lines: [{ text: '貨郎的攤子，擺滿了傷藥、茶葉和雜貨。' }] },
  ],

  // 可以買下來蓋房子的空地（佔地 7×5）
  plots: [
    { id: 'qz_east', name: '東坡空地', x: 46, y: 9, price: 200 },
    { id: 'qz_creek', name: '東溪空地', x: 46, y: 15, price: 200 },
    { id: 'qz_west', name: '西竹空地', x: 11, y: 23, price: 200 },
  ],

  npcs: [
    {
      id: 'stranger', allDay: true, name: '青衫客', sprite: 'swordsman', x: 27, y: 12, facing: 'up', script: strangerTalk,
      when: (f) => !f.stranger,
    },
  ],

  exits: [
    // 北邊到村北（再往北出大地圖往蒼嵐山）
    { tiles: [[26, 0], [27, 0]], to: 'qz_north', spawn: { x: 11, y: 14, facing: 'up' } },
    // 東邊出村到大地圖，往雲水渡口、臨江城的方向
    { tiles: [[55, 20], [55, 21]], world: 'qingzhu', worldFrom: 'ferry' },
    // 村南的古道：走出去就到大地圖
    { tiles: [[26, 39], [27, 39]], world: 'qingzhu' },
  ],
};
