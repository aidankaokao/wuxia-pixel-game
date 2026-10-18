import { bossFight, campChest, scoutsFight } from '../story/bandits';
import type { MapDef } from './types';

/**
 * 蒼嵐山道 —— 青竹村北邊的山路。
 * 中段有一處只容兩人並行的隘口；山頂是山賊盤據的斷崖寨。
 */
const camp: [number, number][] = [];
for (let x = 9; x <= 22; x++) camp.push([x, 10]);

export const canglan: MapDef = {
  id: 'canglan',
  name: '蒼嵐山道',
  subtitle: '野獸出沒・斷崖寨',
  battleBg: 'mountain',
  // prettier-ignore
  tiles: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^^^ffffffffffffffffffffffff^^^^',
    '^^^^f......................f^^^^',
    '^^^^f......................f^^^^',
    '^^^^f..........::..........f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f....::::::::::::::....f^^^^',
    '^^^^f..........::..........f^^^^',
    '^^^^f..........::..........f^^^^',
    '^^^^fffffffffff::fffffffffff^^^^',
    '^^^^^^^^^^T..T.::.*...^^^^^^^^^^',
    '^^^^^^^^^T..T*.::...*.o^^^^^^^^^',
    '^^^^^^^^.T..TT.::...T...^^^^^^^^',
    '^^^^^^^^.To....:::...T.T^^^^^^^^',
    '^^^^^^^^^..T*o..:::.T..T.^^^^^^^',
    '^^^^^^^^^^T.T.T..::..T....^^^^^^',
    '^^^^^^^^^^^....T.:::.....^^^^^^^',
    '^^^^^^^^^^^^^.....::....T^^^^^^^',
    '^^^^^^^^^^^^^^....:::..T^^^^^^^^',
    '^^^^^^^^^^^^^^^^...::...^^^^^^^^',
    '^^^^^^^^^^^^^^^^...::..T^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^::^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^::^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^:::^^^^^^^^^^^',
    '^^^^^^^^^^^^^T....::..T..^^^^^^^',
    '^^^^^^^^^^^^T....:::......^^^^^^',
    '^^^^^^^^^^.T....:::..T...T^^^^^^',
    '^^^^^^^^^.o..o..::..T....^^^^^^^',
    '^^^^^^^^^o.....:::..*T..T^^^^^^^',
    '^^^^^^^^......:::..o.*..^^^^^^^^',
    '^^^^^^^^o....:::......^^^^^^^^^^',
    '^^^^^^^o.T...::......^^^^^^^^^^^',
    '^^^^^^^^....:::...TT^^^^^^^^^^^^',
    '^^^^^^^^TT..::....^^^^^^^^^^^^^^',
    '^^^^^^^^.T.:::....^^^^^^^^^^^^^^',
    '^^^^^^^..*.::...T^^^^^^^^^^^^^^^',
    '^^^^^^^..T.::..o.^^^^^^^^^^^^^^^',
    '^^^^^^..T..::.T*..^^^^^^^^^^^^^^',
    '^^^^^TT..T.::..T...^^^^^^^^^^^^^',
    '^^^^.T..T..EE....T..^^^^^^^^^^^^',
  ],
  spawn: { x: 11, y: 42, facing: 'up' },
  buildings: [],

  props: [
    {
      sprite: 'sign', x: 14, y: 41,
      lines: [
        { text: '蒼嵐山道\n山腳常有野狗、山豬出沒，過往行人小心。' },
        { text: '底下又歪歪扭扭地刻了一行字：\n「再往上，有山賊。」' },
      ],
    },
    { sprite: 'tent', x: 15, y: 3, w: 2, lines: [{ text: '寨主的大帳，裡頭一股酒氣。' }] },
    { sprite: 'tent', x: 6, y: 3, w: 2, lines: [{ text: '嘍囉們睡覺的帳篷，亂七八糟。' }] },
    { sprite: 'tent', x: 24, y: 3, w: 2, lines: [{ text: '堆著搶來的糧食，袋子上還印著「青竹」二字。' }] },
    { sprite: 'flag', x: 12, y: 4, lines: [{ text: '斷崖寨的寨旗，被風吹得獵獵作響。' }] },
    { sprite: 'flag', x: 19, y: 4, lines: [{ text: '斷崖寨的寨旗，被風吹得獵獵作響。' }] },
    { sprite: 'campfire', x: 11, y: 8, lines: [{ text: '營火還燒著，架上烤著半隻山雞。' }] },
    { id: 'chest', sprite: (f) => (f.chest_camp ? 'chest_open' : 'chest'), x: 25, y: 9, script: campChest },
  ],

  npcs: [
    // 山腳的野獸：打倒後過一陣子會再出現，可以反覆練功
    { id: 'dog1', name: '野狗', sprite: 'dog', x: 13, y: 38, wander: 3, encounter: 'dog', respawn: 45 },
    { id: 'dog2', name: '野狗', sprite: 'dog', x: 11, y: 35, wander: 2, encounter: 'dog', respawn: 45 },
    { id: 'dogs', name: '野狗群', sprite: 'dog', x: 17, y: 33, wander: 3, encounter: 'dogs', respawn: 60 },
    { id: 'boar', name: '山豬', sprite: 'boar', x: 20, y: 30, wander: 2, encounter: 'boar', respawn: 75 },
    { id: 'scout1', name: '斷崖寨嘍囉', sprite: 'bandit', x: 19, y: 26, facing: 'down', script: scoutsFight, when: (f) => !f.bandit_scouts },
    { id: 'scout2', name: '斷崖寨嘍囉', sprite: 'bandit', x: 20, y: 26, facing: 'down', script: scoutsFight, when: (f) => !f.bandit_scouts },
    { id: 'qi', name: '祁三刀', sprite: 'boss', x: 15, y: 6, facing: 'down', script: bossFight, when: (f) => !f.bandit_boss },
    { id: 'guard1', name: '斷崖寨嘍囉', sprite: 'bandit', x: 13, y: 7, facing: 'down', script: bossFight, when: (f) => !f.bandit_boss },
    { id: 'guard2', name: '斷崖寨嘍囉', sprite: 'bandit', x: 18, y: 7, facing: 'down', script: bossFight, when: (f) => !f.bandit_boss },
    { id: 'shen', name: '青衫客', sprite: 'swordsman', x: 16, y: 12, facing: 'up', when: (f) => !!f.bandit_boss && !f.stranger },
  ],

  triggers: [
    { tiles: [[18, 27], [19, 27], [20, 27]], when: (f) => !f.bandit_scouts, script: scoutsFight },
    { tiles: camp, when: (f) => !f.bandit_boss, script: bossFight },
  ],

  exits: [{ tiles: [[11, 43], [12, 43]], to: 'qingzhu', spawn: { x: 26, y: 1, facing: 'down' } }],
};
