import { ferryman } from '../story/ferry';
import { bountyTarget } from '../story/linjiang_jianghu';
import { bridgeBuilt, bridgeStele, masonTalk } from '../story/bridge';
import { by } from './rooms';
import type { MapDef } from './types';

/**
 * 雲水渡口 —— 青竹村往東、臨江城往西的官道在這裡被雲水河截斷，靠船家擺渡（見 story/ferry.ts）。
 * 西岸有座雲水茶棚給旅人歇腳；兩岸路旁偶有野狗出沒。西邊、東邊走出去都是大地圖。
 * （地圖 id 沿用 guandao，舊存檔才讀得到）
 */
export const guandao: MapDef = {
  id: 'guandao',
  name: '雲水渡口',
  subtitle: '雲水河・官道渡口',
  // prettier-ignore
  tiles: [
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'T..TTT.T.........T.~~~T....TT......T...T',
    '....................~~~T..T.....T.T.....',
    '....T.*.............~~~.T.*....T........',
    '.*....*............T~~~..o...........T..',
    '.....*.*...........~~~..................',
    'E::::::::::::::::::~~~:::::::::::::::::E',
    'E::::::::::::::::::~~~:::::::::::::::::E',
    '......*............~~~....*.............',
    '.T...........TT..To~~~..........*.......',
    '.........TT..*.o....~~~...o...*.........',
    '...........T.o.T....~~~oT...............',
    'TT...T.T..TTT...TT.~~~..TT....T......T..',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
  ],
  // 支線「雲水渡口造橋」：蓋好以後，官道過河的那兩列換成木橋（story/bridge.ts）
  patches: [{ when: bridgeBuilt, x: 19, y: 7, rows: ['###', '###'] }],
  spawn: { x: 1, y: 7, facing: 'right' },
  battleBg: 'mountain',
  buildings: [{ style: 'teahouse', x: 9, y: 2, name: '雲水茶棚', door: [], enter: { to: 'gd_teahouse', spawn: { x: 4, y: 5, facing: 'up' } } }],
  props: [
    { sprite: 'sign', x: 15, y: 6, lines: [{ text: '「雲水渡口」\n過河請找船家。\n東岸 ── 臨江城　西岸 ── 青竹村' }] },
    { sprite: 'sign', x: 25, y: 9, lines: [{ text: '「雲水渡口・東岸」\n往西過河請找船家。河水往下游流進碧漪湖。' }] },
    { sprite: 'boat', x: 19, y: 9, w: 3, lines: [{ text: '渡船繫在岸邊，船底積著一點水。' }] },
    // 蓋橋：湊石料時河邊堆著青石條；動工時搭著木架；蓋好了立一塊捐建碑
    { sprite: 'rock', x: 16, y: 5, when: (f) => (f.bridge_stone ?? 0) > 0 && !bridgeBuilt(f), lines: [{ text: '河邊堆著一堆青石條，是要拿來蓋橋的。' }] },
    { sprite: 'drying_rack', x: 23, y: 10, w: 2, when: (f) => f.bridge === 2 && !bridgeBuilt(f), lines: [{ text: '搭在河邊的木架，吊著繩索和滑輪，用來把石條吊下河。' }] },
    { sprite: 'stele', x: 16, y: 6, when: bridgeBuilt, script: bridgeStele, label: '捐建碑' },
  ],
  npcs: [
    { id: 'g_dog1', name: '野狗', sprite: 'dog', x: 8, y: 11, wander: 3, encounter: 'dog', respawn: 45 },
    // 縣衙懸賞「官道惡犬」：揭了榜才出現
    { id: 'g_b_dogs', allDay: true, name: '惡犬', sprite: 'dog', x: 28, y: 11, facing: 'left', script: bountyTarget('dogs'), when: (f) => f.lj_b_dogs === 1 },
    { id: 'g_dogs', name: '野狗群', sprite: 'dog', x: 33, y: 4, wander: 3, encounter: 'dogs', respawn: 60 },
    {
      id: 'g_traveler', name: '余福來', sprite: 'peddler', x: 14, y: 9, facing: 'right',
      talks: [
        [
          { speaker: '余福來', text: '等船啊等船，一天要等上好幾回。' },
          { speaker: '余福來', text: '過了河再走一段就是臨江城了。進城記得看緊荷包，碼頭那邊龍蛇混雜的。' },
        ],
      ],
    },
    // 蓋橋時：魯一鑿帶著徒弟在河邊動工
    {
      id: 'g_mason', allDay: true, name: '魯一鑿', sprite: 'smith', x: 18, y: 9, facing: 'right', script: masonTalk,
      when: (f) => f.bridge === 2 && !bridgeBuilt(f),
    },
    {
      id: 'g_mason_boy', allDay: true, name: '魯小錘', sprite: 'apprentice', x: 24, y: 9, facing: 'left',
      when: (f) => f.bridge === 2 && !bridgeBuilt(f),
      talks: [by('魯小錘')('師父說這座橋要撐一百年！', '我負責遞錘子……還有挨罵。')],
    },
    // 船家：西岸范老舟、東岸鄭小篙（白天在，夜裡加價也肯撐，所以一直都在）
    { id: 'g_ferry_w', allDay: true, name: '范老舟', sprite: 'boatman', x: 18, y: 6, facing: 'down', script: ferryman('范老舟', 'west') },
    { id: 'g_ferry_e', allDay: true, name: '鄭小篙', sprite: 'fisher', x: 22, y: 6, facing: 'down', script: ferryman('鄭小篙', 'east') },
  ],
  exits: [
    // 西邊出去到大地圖（青竹村那一側）、東邊出去到大地圖（臨江城那一側）
    { tiles: [[0, 7], [0, 8]], world: 'ferry', worldFrom: 'qingzhu' },
    { tiles: [[39, 7], [39, 8]], world: 'ferry', worldFrom: 'linjiang' },
  ],
};
