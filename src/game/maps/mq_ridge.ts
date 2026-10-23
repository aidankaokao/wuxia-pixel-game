import { ridgeSign, lumberPile, stonePile } from '../story/mq_industry';
import type { MapDef } from './types';

/**
 * 鳴泉南嶺 —— 山田往南翻過一道坡：西邊是松林（伐木場），東邊是一面青石壁（採石場）。
 * 設施蓋好了才有東西（條件 mq_lumber、mq_quarry 是設施等級，見 story/mq_industry.ts 的 registerConds），
 * 工頭與輪值幫工的記名弟子自己過日子（story/life_mingquan.ts）。
 */
export const mqRidge: MapDef = {
  id: 'mq_ridge',
  name: '鳴泉南嶺',
  subtitle: '鳴泉劍派・山田南邊',
  // prettier-ignore
  tiles: [
    '^^^^^^^^^^^^^^^EE^^^^^^^^^^^^^^^^^',
    '^TTTT.T........::.......^^^^^^^^^^',
    '^TT.T.T........::.......^^^^^^^^^^',
    '^T.T...........::........^^^^^^^^^',
    '^TT............::........o^^^^^^^^',
    '^T.............::.........^^^^^^^^',
    '^TT....::::::::::::::::::.....^^^^',
    '^T.....:.......::.......:......^^^',
    '^TT....:.......::.......:.......^^',
    '^T.....:.......::.......:.......^^',
    '^TT.T..:.......::.......:.......^^',
    '^TTT...........::...............^^',
    '^TTTT.T........::.....T.....o...^^',
    '^^TTTTT.T......::...............^^',
    '^^^TTTTTTT.....::......T......^^^^',
    '^^^^TTTTTTTT...::..T........^^^^^^',
    '^^^^^^TTTTTTT..::.........^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
  ],
  spawn: { x: 15, y: 1, facing: 'down' },
  battleBg: 'mountain',
  buildings: [],
  props: [
    { sprite: 'sign', x: 17, y: 2, script: ridgeSign },
    // 伐木場
    { sprite: 'log_pile', x: 3, y: 7, w: 2, script: lumberPile, label: '查看', when: (f) => f.mq_lumber >= 1 },
    { sprite: 'stump', x: 6, y: 7, when: (f) => f.mq_lumber >= 1 },
    { sprite: 'stump', x: 5, y: 11, when: (f) => f.mq_lumber >= 1 },
    { sprite: 'log_pile', x: 8, y: 12, w: 2, script: lumberPile, label: '查看', when: (f) => f.mq_lumber >= 2 },
    { sprite: 'stump', x: 11, y: 13, when: (f) => f.mq_lumber >= 2 },
    // 採石場：石壁下堆著打好的石料
    { sprite: 'stone_pile', x: 29, y: 9, w: 2, script: stonePile, label: '查看', when: (f) => f.mq_quarry >= 1 },
    { sprite: 'rock', x: 28, y: 6, when: (f) => f.mq_quarry >= 1 },
    { sprite: 'stone_pile', x: 29, y: 11, w: 2, script: stonePile, label: '查看', when: (f) => f.mq_quarry >= 2 },
  ],
  npcs: [
    // 工頭與幫工的同門自己過日子（story/life_mingquan.ts）
  ],
  exits: [{ tiles: [[15, 0], [16, 0]], to: 'mq_farm', spawn: { x: 10, y: 22, facing: 'up' } }],
};
