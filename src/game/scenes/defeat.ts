import type { Line } from '../maps/types';
import type { Dir } from '../constants';

/** 戰敗：被人救回青竹村的老井旁，恢復一半氣血（地圖場景與大地圖共用） */
export const DEFEAT: { map: string; spawn: { x: number; y: number; facing: Dir }; lines: Line[] } = {
  map: 'qingzhu',
  spawn: { x: 23, y: 20, facing: 'up' },
  lines: [
    { text: '……' },
    { text: '你醒來時，已經躺在青竹村的老井旁。' },
    { speaker: '鍾嬸', text: '總算醒啦！是路過的好心人把你背回來的。年輕人，別逞強啊。' },
  ],
};
