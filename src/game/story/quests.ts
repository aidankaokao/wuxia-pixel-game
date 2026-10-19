import { banditsQuest } from './bandits';
import { xiaohuQuest } from './people';
import { COMMISSION_QUESTS, mingquanQuest } from './sect_mingquan';

/** 任務日誌（選單「江湖事」）依序列出的任務 */
export const QUESTS = [banditsQuest, xiaohuQuest, mingquanQuest, ...COMMISSION_QUESTS];
