import { BUILDINGS } from '../art/props';
import { Estate, furnitureOf, furnitureWidth, LAYOUTS, parseLayout, tierDef } from '../home';
import { furnitureScript, plotSign } from '../story/estate';
import type { BuildingDef, MapDef, PlotDef, PropDef } from './types';
import { PLOT_H, PLOT_W } from './types';

/** 空地所在的地圖 id 也記下來，室內地圖的出口要走回去 */
export type PlacedPlot = PlotDef & { map: string };

export const homeMapId = (plot: string) => `home:${plot}`;

/** 房子在空地上的位置：靠下、左右置中；門在建築最下排 */
export function plotBuilding(plot: PlotDef, e: Estate) {
  const style = tierDef(e.tier).building;
  const st = BUILDINGS[style];
  const x = plot.x + Math.floor((PLOT_W - st.w) / 2);
  const y = plot.y + PLOT_H - st.h;
  return { style, x, y, door: { x: x + st.door, y: y + st.h - 1 } };
}

/** 室內地圖：照等級的配置圖鋪地形，照風格把家具擺到錨點上 */
export function buildHomeMap(plot: PlacedPlot, e: Estate): MapDef {
  const layout = LAYOUTS[e.tier - 1];
  const { tiles, anchors } = parseLayout(layout.grid);
  const place = layout.place[e.style];
  const props: PropDef[] = [];
  for (const f of furnitureOf(e)) {
    const at = anchors[place[f.id]];
    if (!at) continue;
    const { script, label } = furnitureScript(plot.id, f.id);
    const lv = f.maxLevel > 1 ? e.furniture[f.id] ?? 1 : 1;
    props.push({ id: f.id, sprite: `f_${f.id}_${e.style}_${lv}`, x: at.x, y: at.y, w: furnitureWidth(f.id, e.style), script, label });
  }
  const ey = tiles.findIndex((r) => r.includes('E'));
  const ex = tiles[ey].indexOf('E');
  const door = plotBuilding(plot, e).door;
  return {
    id: homeMapId(plot.id),
    name: tierDef(e.tier).name,
    subtitle: `${plot.name}・自宅`,
    tiles,
    spawn: { x: ex, y: ey - 1, facing: 'up' },
    buildings: [],
    props,
    npcs: [],
    exits: [{ tiles: [[ex, ey]], to: plot.map, spawn: { x: door.x, y: door.y + 1, facing: 'down' } }],
    theme: e.style,
  };
}

/** 室外地圖加上空地：有房子就放建築（可以進去），沒有就插木牌與四角木樁 */
export function withPlots(def: MapDef, estates: Record<string, Estate>): MapDef {
  if (!def.plots?.length) return def;
  const buildings: BuildingDef[] = [...def.buildings];
  const props: PropDef[] = [...def.props];
  for (const plot of def.plots) {
    const e = estates[plot.id];
    if (e) {
      const b = plotBuilding(plot, e);
      const inside = buildHomeMap({ ...plot, map: def.id }, e);
      buildings.push({ style: b.style, x: b.x, y: b.y, name: '自宅', door: [], enter: { to: inside.id, spawn: inside.spawn } });
    } else {
      props.push({ sprite: 'sign', x: plot.x + 3, y: plot.y + PLOT_H - 1, script: plotSign(plot), label: '查看空地' });
      for (const [dx, dy] of [[0, 0], [PLOT_W - 1, 0], [0, PLOT_H - 1], [PLOT_W - 1, PLOT_H - 1]])
        props.push({ sprite: 'stake', x: plot.x + dx, y: plot.y + dy, lines: [{ text: '標示地界的木樁。' }] });
    }
  }
  return { ...def, buildings, props };
}
