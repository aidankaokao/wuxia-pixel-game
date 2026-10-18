import { canglan } from './canglan';
import { buildHomeMap, PlacedPlot, withPlots } from './home';
import { qingzhu } from './qingzhu';
import { qzLiu, qzSmithy, qzTea, qzWang } from './qingzhu_rooms';
import type { MapDef } from './types';
import { registerPlotNames } from '../story/estate';
import { useGame } from '../../state/store';

/** 所有地圖。新增地圖時在這裡註冊，出入口的 `to` 填這裡的 id。 */
export const MAPS: Record<string, MapDef> = {
  [qingzhu.id]: qingzhu,
  [canglan.id]: canglan,
  [qzLiu.id]: qzLiu,
  [qzTea.id]: qzTea,
  [qzSmithy.id]: qzSmithy,
  [qzWang.id]: qzWang,
};

/** 所有空地（含所在地圖） */
export const PLOTS: Record<string, PlacedPlot> = Object.fromEntries(
  Object.values(MAPS).flatMap((m) => (m.plots ?? []).map((p) => [p.id, { ...p, map: m.id }])),
);
registerPlotNames(Object.values(PLOTS));

/**
 * 取得地圖：室外地圖依目前的房產加上房子或空地木牌；`home:空地id` 是依房產產生的室內地圖。
 * 地圖場景每次載入都呼叫一次，所以房子擴建、換風格後重新進場就會更新。
 */
export function getMap(id: string): MapDef | undefined {
  const { estates } = useGame.getState().world;
  if (id.startsWith('home:')) {
    const plot = PLOTS[id.slice(5)];
    const e = plot && estates[plot.id];
    return e ? buildHomeMap(plot, e) : undefined;
  }
  const def = MAPS[id];
  return def && withPlots(def, estates);
}
