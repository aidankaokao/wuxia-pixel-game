/**
 * 把網頁版的遊戲資料匯出成 JSON，給 Godot 版讀（godot/data/）。
 * 跑法（在專案根目錄）：npm run godot:data
 * 目前匯出：青竹村的地圖、建築、擺設、村民與台詞、物品表；竹風茶寮的室內。
 */
import { writeFileSync } from 'node:fs';
// 照遊戲本體的順序載入地圖與劇情（直接載入 life_towns 會碰上循環引用）
import '../../src/game/maps/index';
import { BUILDINGS } from '../../src/game/art/props';
import { ITEMS } from '../../src/game/character';
import { lifeGroups, type LifeNpc } from '../../src/game/life';
import { qingzhu } from '../../src/game/maps/qingzhu';
import { qzTea } from '../../src/game/maps/qingzhu_rooms';
import { BLOCKING, type Line, type MapDef } from '../../src/game/maps/types';
import { PEOPLE } from '../../src/game/story/people';

const OUT = `${process.cwd()}/godot/data/`;

/** 村民的台詞：有人物檔案的照「初識」那一階與閒聊台詞，沒有的照日常台詞 */
function linesOf(n: LifeNpc): Line[][] {
  const p = n.person ? PEOPLE[n.person] : undefined;
  if (p) {
    const pool = [...(p.lines[0] ?? Object.values(p.lines)[0] ?? []), ...p.idle].filter((c): c is Line[] => Array.isArray(c));
    if (pool.length) return pool.map((c) => c.map((l) => ({ speaker: l.speaker ?? n.name, text: l.text })));
  }
  return n.talks?.default?.length ? n.talks.default : [[{ text: `${n.name}朝你點點頭，又忙自己的事去了。` }]];
}

function exportMap(def: MapDef, groupId: string) {
  const group = lifeGroups().find((g) => g.id === groupId);
  const spots = (group?.spots ?? []).filter((s) => s.map === def.id);
  return {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle ?? '',
    tiles: def.tiles,
    blocking: [...BLOCKING].join(''),
    spawn: def.spawn,
    buildings: def.buildings.map((b) => ({ ...b, st: BUILDINGS[b.style] })),
    props: def.props
      .filter((p) => typeof p.sprite === 'string')
      .map((p) => ({ sprite: p.sprite, x: p.x, y: p.y, w: p.w ?? 1, lines: p.lines ?? [], label: p.label ?? '' })),
    spots: spots.map((s) => ({ x: s.x, y: s.y, acts: s.acts })),
    people: (group?.npcs ?? []).map((n) => ({ id: n.id, name: n.name, sprite: n.sprite, person: n.person ?? '', lines: linesOf(n) })),
  };
}

/** 室內：牆（W）、地板（_）、出口（E），家具與在屋裡的人 */
function exportRoom(def: MapDef) {
  return {
    id: def.id,
    name: def.name,
    subtitle: def.subtitle ?? '',
    theme: def.theme ?? 'plain',
    tiles: def.tiles,
    spawn: def.spawn,
    exits: def.exits,
    props: def.props
      .filter((p) => typeof p.sprite === 'string')
      .map((p) => ({ sprite: p.sprite, x: p.x, y: p.y, w: p.w ?? 1, lines: p.lines ?? [], label: p.label ?? '' })),
    npcs: def.npcs.map((n) => ({ id: n.id, name: n.name, sprite: n.sprite, x: n.x, y: n.y, facing: n.facing ?? 'down', talks: n.talks ?? [] })),
  };
}

writeFileSync(OUT + 'qz_tea.json', JSON.stringify(exportRoom(qzTea), null, 1));
writeFileSync(OUT + 'qingzhu.json', JSON.stringify(exportMap(qingzhu, 'qingzhu'), null, 1));
writeFileSync(
  OUT + 'items.json',
  JSON.stringify(Object.fromEntries(Object.entries(ITEMS).map(([id, it]) => [id, { name: it.name, price: it.price ?? 0, desc: it.desc ?? '', category: it.category }])), null, 1),
);
console.log('匯出完成：', OUT);
