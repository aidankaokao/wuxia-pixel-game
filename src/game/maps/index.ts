import { canglan } from './canglan';
import { worldConds } from '../conds';
import { guandao } from './guandao';
import { gdTeahouse } from './guandao_rooms';
import { DABUTOU_MAPS } from './dabutou';
import { BIYI_MAPS } from './biyi';
import { ljAcademy, ljNorth, ljTeashop } from './linjiang_north';
import { linjiang } from './linjiang';
import { LINJIANG_ROOMS } from './linjiang_rooms';
import { mingquan } from './mingquan';
import { mqBack, mqSect } from './sect_mingquan';
import { mqFarm } from './mq_farm';
import { mqRidge } from './mq_ridge';
import { SECT_MINGQUAN_ROOMS } from './sect_mingquan_rooms';
import { buildHomeMap, PlacedPlot, withPlots } from './home';
import { qingzhu } from './qingzhu';
import { qzNorth } from './qz_north';
import { qzLiu, qzSmithy, qzTea, qzTemple, qzWang } from './qingzhu_rooms';
import type { MapDef } from './types';
import { buildPropertyMap } from './property';
import { propertyDef, propertyOf, PROPERTIES } from '../property';
import { shopTypeDef } from '../shop';
import { registerPlotNames } from '../story/estate';
import { useGame } from '../../state/store';
// 城裡、漁村、港口的人自己過日子
import '../story/life_towns';

/** 所有地圖。新增地圖時在這裡註冊，出入口的 `to` 填這裡的 id。 */
export const MAPS: Record<string, MapDef> = {
  [qingzhu.id]: qingzhu,
  [qzNorth.id]: qzNorth,
  [canglan.id]: canglan,
  [guandao.id]: guandao,
  [gdTeahouse.id]: gdTeahouse,
  [linjiang.id]: linjiang,
  [mingquan.id]: mingquan,
  [mqSect.id]: mqSect,
  [mqBack.id]: mqBack,
  [mqFarm.id]: mqFarm,
  [mqRidge.id]: mqRidge,
  ...Object.fromEntries(SECT_MINGQUAN_ROOMS.map((m) => [m.id, m])),
  ...Object.fromEntries(LINJIANG_ROOMS.map((m) => [m.id, m])),
  ...Object.fromEntries(DABUTOU_MAPS.map((m) => [m.id, m])),
  ...Object.fromEntries(BIYI_MAPS.map((m) => [m.id, m])),
  [ljNorth.id]: ljNorth,
  [ljAcademy.id]: ljAcademy,
  [ljTeashop.id]: ljTeashop,
  [qzLiu.id]: qzLiu,
  [qzTea.id]: qzTea,
  [qzTemple.id]: qzTemple,
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
  if (id.startsWith('prop:')) {
    const p = propertyDef(id.slice(5));
    const b = p && MAPS[p.map]?.buildings.find((x) => x.x === p.bx && x.y === p.by);
    return p && b ? buildPropertyMap(p, b) : undefined;
  }
  const def = MAPS[id];
  return def && withProperties(withPatches(withPlots(def, estates)));
}

/** 自己名下的房子：門打得開（進到 prop:物件id），名字也改成「你的〇〇」 */
function withProperties(def: MapDef): MapDef {
  const owned = propertyOf(useGame.getState().world).owned;
  if (!Object.keys(owned).length) return def;
  let changed = false;
  const buildings = def.buildings.map((b) => {
    const p = PROPERTIES.find((x) => x.map === def.id && x.bx === b.x && x.by === b.y);
    if (!p || !owned[p.id] || p.kind === 'business') return b;
    changed = true;
    // 開了店：匾額寫商號、幌子寫店種
    const shop = useGame.getState().world.shops?.[p.id];
    const sign = shop ? { sign: shop.name, flag: shopTypeDef(shop.type).flag } : {};
    return { ...b, ...sign, name: shop?.name ?? p.name, door: [], enter: { to: `prop:${p.id}`, spawn: p.kind === 'shop' ? { x: 5, y: 6, facing: 'up' as const } : { x: 4, y: 5, facing: 'up' as const } } };
  });
  return changed ? { ...def, buildings } : def;
}

/** 套用隨劇情改變的地形（MapDef.patches） */
function withPatches(def: MapDef): MapDef {
  if (!def.patches?.length) return def;
  const { flags, world } = useGame.getState();
  const f = { ...flags, ...worldConds(world), today: world.day };
  const on = def.patches.filter((p) => p.when(f));
  if (!on.length) return def;
  const tiles = def.tiles.map((r) => [...r]);
  for (const p of on)
    p.rows.forEach((row, dy) => [...row].forEach((c, dx) => c !== ' ' && tiles[p.y + dy] && (tiles[p.y + dy][p.x + dx] = c)));
  return { ...def, tiles: tiles.map((r) => r.join('')) };
}
