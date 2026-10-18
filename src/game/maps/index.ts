import { canglan } from './canglan';
import { qingzhu } from './qingzhu';
import type { MapDef } from './types';

/** 所有地圖。新增地圖時在這裡註冊，出入口的 `to` 填這裡的 id。 */
export const MAPS: Record<string, MapDef> = {
  [qingzhu.id]: qingzhu,
  [canglan.id]: canglan,
};
