import { aniuTalk, kidTalk, liuTalk, steleRead, strangerTalk, wellUse, zhongTalk } from '../story/bandits';
import type { MapDef } from './types';

/**
 * 青竹村 —— 遊戲起點。
 * 坐落蒼嵐山腳，雲水河自山中流下，注入村東南的碧漪湖。
 * 北上山口通往蒼嵐山，東過木橋通往臨江城，南接南嶺古道。
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
    'TYYY..Y:Y.Y...............::.............~~~.....T..*.TT',
    'TY.YY..::Y................::.............~~~..........TT',
    'T.Y.YY..:YY...............::...........T~~~..T.........T',
    'TTY.Y.YY:YY...............::............~~~*..........TT',
    'TTYYYY.Y:YY...............::...........~~~........T..*TT',
    'TYYY.YY.:YY.........:.....::...:......o~~~..*.........TT',
    'TY..YYY.:.........T..============.....~~~...T.........TT',
    'TY.*.Y.Y:............============.T..*~~~......T.......T',
    'TTY..YY::YY..:.......============.....~~~..............T',
    'TYY..Y:::::::::::::::============:::::###::::::::::::::E',
    'TY..Y.Y.Y.:..........============:::::###::::::::::::::E',
    'TTY..YYYY.:.T...TT.T.============.....~~~..............T',
    'T..YYYYYY.:....*T....============.....~~~......o.......T',
    'TTY..To.YY:..........============......~~~.....**.....TT',
    'TTT..YYY.Y:...............::...........~~~....T.......TT',
    'TYYYYYYY..:....*..........::............~~~~~~~~~~....TT',
    'T...YY..YY:.....TT........::...........~~~~~~~~~~~~...TT',
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
      style: 'hall', x: 17, y: 11, name: '柳家大宅',
      door: [{ text: '朱漆大門上懸著一塊匾額，寫著「柳宅」二字。' }, { text: '（屋內場景尚未開放）' }],
    },
    {
      style: 'teahouse', x: 29, y: 12, name: '竹風茶寮',
      door: [{ text: '門口的布招隨風輕擺，茶香從門縫裡飄出來。' }, { text: '（屋內場景尚未開放）' }],
    },
    {
      style: 'smithy', x: 11, y: 15, name: '石家鐵鋪',
      door: [{ text: '屋裡傳出「叮——噹——」的打鐵聲，熱氣撲面。' }, { text: '（屋內場景尚未開放）' }],
    },
    {
      style: 'house', x: 19, y: 26, name: '民居',
      door: [{ text: '門關著，裡頭似乎沒有人。' }],
    },
    {
      style: 'house2', x: 30, y: 26, name: '民居',
      door: [{ text: '門上貼著褪了色的門神，屋裡傳來嬰孩的哭聲。' }],
    },
  ],

  props: [
    { sprite: 'well', x: 23, y: 19, script: wellUse },
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
    { sprite: 'stele', x: 5, y: 9, script: steleRead },
  ],

  npcs: [
    {
      id: 'liu', name: '柳承安', sprite: 'elder', x: 20, y: 17, facing: 'down', script: liuTalk,
    },
    {
      id: 'zhong', name: '鍾嬸', sprite: 'aunt', x: 32, y: 17, facing: 'down', script: zhongTalk,
    },
    {
      id: 'shi', name: '石岳', sprite: 'smith', x: 14, y: 19, facing: 'down', wander: 1,
      talks: [
        [
          { speaker: '石岳', text: '叮——噹——！' },
          { speaker: '石岳', text: '要打一把好刀，得看鐵，也得看人。' },
          { speaker: '石岳', text: '等你攢夠了銀兩，再來找我吧。' },
        ],
      ],
    },
    {
      id: 'kid', name: '小石頭', sprite: 'child', x: 25, y: 23, wander: 4, script: kidTalk,
    },
    {
      id: 'qin', name: '秦老漢', sprite: 'fisher', x: 37, y: 31, facing: 'right',
      talks: [
        [
          { speaker: '秦老漢', text: '噓——別驚了魚。' },
          { speaker: '秦老漢', text: '碧漪湖的魚，要心靜才釣得到。練武，其實也是同一個道理。' },
        ],
      ],
    },
    {
      id: 'aniu', name: '阿牛', sprite: 'farmer', x: 9, y: 33, wander: 3, script: aniuTalk,
    },
    {
      id: 'stranger', name: '青衫客', sprite: 'swordsman', x: 27, y: 12, facing: 'up', script: strangerTalk,
      when: (f) => !f.stranger,
    },
  ],

  exits: [
    { tiles: [[26, 0], [27, 0]], to: 'canglan', spawn: { x: 11, y: 42, facing: 'up' } },
    { tiles: [[55, 20], [55, 21]], lines: [{ text: '前方是通往臨江城的官道。\n（地圖尚未開放）' }] },
    { tiles: [[26, 39], [27, 39]], lines: [{ text: '南嶺古道荒草蔓生，不知通往何處。\n（地圖尚未開放）' }] },
  ],
};
