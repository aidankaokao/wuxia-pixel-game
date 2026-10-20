import type { MapDef } from './types';

/**
 * 雲水官道 —— 青竹村往東通往臨江城的官道，中途跨過雲水河。
 * 路旁偶有野狗出沒。
 */
export const guandao: MapDef = {
  id: 'guandao',
  name: '雲水官道',
  subtitle: '青竹村 ── 臨江城',
  // prettier-ignore
  tiles: [
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'T..TTT.T....TTT..T.~~~T....TT......T...T',
    '....................~~~T..T.....T.T.....',
    '....T.*....o........~~~.T.*....T........',
    '.*....*............T~~~..o...........T..',
    '.....*.*...........~~~..................',
    'E::::::::::::::::::###:::::::::::::::::E',
    'E::::::::::::::::::###:::::::::::::::::E',
    '......*............~~~....*.............',
    '.T...........TT..To~~~..........*.......',
    '.........TT..*.o....~~~...o...*.........',
    '...........T.o.T....~~~oT...............',
    'TT...T.T..TTT...TT.~~~..TT....T......T..',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
    'TTTTTTTTTTTTTTTTTTT~~~TTTTTTTTTTTTTTTTTT',
  ],
  spawn: { x: 1, y: 7, facing: 'right' },
  battleBg: 'mountain',
  buildings: [],
  props: [
    { sprite: 'sign', x: 10, y: 6, lines: [{ text: '「雲水官道」\n東 ── 臨江城　十五里\n西 ── 青竹村　十五里' }] },
    { sprite: 'sign', x: 25, y: 9, lines: [{ text: '「雲水橋」\n橋下就是雲水河，往下游流進碧漪湖。' }] },
  ],
  npcs: [
    { id: 'g_dog1', name: '野狗', sprite: 'dog', x: 8, y: 11, wander: 3, encounter: 'dog', respawn: 45 },
    { id: 'g_dogs', name: '野狗群', sprite: 'dog', x: 33, y: 4, wander: 3, encounter: 'dogs', respawn: 60 },
    {
      id: 'g_traveler', name: '余福來', sprite: 'peddler', x: 14, y: 9, facing: 'right',
      talks: [
        [
          { speaker: '余福來', text: '再走一段就是臨江城了。' },
          { speaker: '余福來', text: '進城記得看緊荷包，碼頭那邊龍蛇混雜的。' },
        ],
      ],
    },
  ],
  exits: [
    { tiles: [[0, 7], [0, 8]], to: 'qingzhu', spawn: { x: 54, y: 20, facing: 'left' } },
    { tiles: [[39, 7], [39, 8]], to: 'linjiang', spawn: { x: 1, y: 16, facing: 'right' } },
  ],
};
