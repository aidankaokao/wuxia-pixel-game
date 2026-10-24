/**
 * 把網頁版的遊戲資料匯出成 JSON，給 Godot 版讀（godot/data/）。
 * 跑法（在專案根目錄）：npm run godot:data
 * 目前匯出：青竹村、青竹村北的地圖（建築、擺設、出入口、村民與台詞）、物品表；
 * 各屋的室內（柳家大宅、竹風茶寮、石家鐵鋪、王家、竹隱寺）；大地圖（地形、據點、道路、地名）。
 */
import { mkdirSync, writeFileSync } from 'node:fs';
// 照遊戲本體的順序載入地圖與劇情（直接載入 life_towns 會碰上循環引用）
import '../../src/game/maps/index';
import { BUILDINGS } from '../../src/game/art/props';
import { ITEMS, SKILLS, TIERS } from '../../src/game/character';
import { MOVES } from '../../src/game/battle/moves';
import { ENCOUNTERS, ENEMIES } from '../../src/game/battle/enemies';
import { lifeGroups, type LifeNpc } from '../../src/game/life';
import { qingzhu } from '../../src/game/maps/qingzhu';
import { qzNorth } from '../../src/game/maps/qz_north';
import { qzLiu, qzSmithy, qzTea, qzTemple, qzWang } from '../../src/game/maps/qingzhu_rooms';
import { BLOCKING, type Line, type MapDef } from '../../src/game/maps/types';
import { PEOPLE } from '../../src/game/story/people';

// godot/data/ 已經由 Godot 這邊維護（劇情腳本、出現條件都加在那裡），匯出的東西只放到 tools/web_export/ 當參考，要用的再手動搬過去
const OUT = `${process.cwd()}/godot/tools/web_export/`;
mkdirSync(OUT, { recursive: true });

/** 村民的台詞：有人物檔案的照「初識」那一階與閒聊台詞，沒有的照日常台詞 */
function linesOf(n: Pick<LifeNpc, 'person' | 'name'> & { talks?: { default?: Line[][] } }): Line[][] {
  const p = n.person ? PEOPLE[n.person] : undefined;
  if (p) {
    const pool = [...(p.lines[0] ?? Object.values(p.lines)[0] ?? []), ...p.idle].filter((c): c is Line[] => Array.isArray(c));
    if (pool.length) return pool.map((c) => c.map((l) => ({ speaker: l.speaker ?? n.name, text: l.text })));
  }
  return n.talks?.default?.length ? n.talks.default : [[{ text: `${n.name}朝你點點頭，又忙自己的事去了。` }]];
}

/** 室外地圖；groupId 是在這張地圖上過日子的那群人（沒有就不放人） */
function exportMap(def: MapDef, groupId?: string) {
  const group = groupId ? lifeGroups().find((g) => g.id === groupId) : undefined;
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
      .map((p) => ({ id: p.id ?? '', sprite: p.sprite, x: p.x, y: p.y, w: p.w ?? 1, lines: p.lines ?? [], label: p.label ?? '' })),
    exits: def.exits,
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
    npcs: def.npcs.map((n) => ({
      id: n.id,
      name: n.name,
      sprite: n.sprite,
      x: n.x,
      y: n.y,
      facing: n.facing ?? 'down',
      // 有人物檔案的照人物檔案的台詞，沒有的照地圖上寫的
      talks: n.person ? linesOf({ person: n.person, name: n.name }) : (n.talks ?? []),
    })),
  };
}

for (const r of [qzLiu, qzTea, qzSmithy, qzWang, qzTemple]) writeFileSync(OUT + `${r.id}.json`, JSON.stringify(exportRoom(r), null, 1));
writeFileSync(OUT + 'qingzhu.json', JSON.stringify(exportMap(qingzhu, 'qingzhu'), null, 1));
writeFileSync(OUT + 'qz_north.json', JSON.stringify(exportMap(qzNorth), null, 1));
writeFileSync(
  OUT + 'items.json',
  JSON.stringify(Object.fromEntries(Object.entries(ITEMS).map(([id, it]) => [id, { name: it.name, price: it.price ?? 0, desc: it.desc ?? '', category: it.category }])), null, 1),
);
// 武功（品階、裝備與永久加成、招式表）與招式（名稱、說明、內力、威力、效果）
writeFileSync(OUT + 'skills.json', JSON.stringify({ tiers: TIERS, skills: SKILLS, moves: MOVES }, null, 1));
// 敵人樣板與遭遇戰
writeFileSync(OUT + 'enemies.json', JSON.stringify({ enemies: ENEMIES, encounters: ENCOUNTERS }, null, 1));
// 完整的物品表（回復、秘笈、服飾、價錢…）
writeFileSync(OUT + 'items_full.json', JSON.stringify(ITEMS, null, 1));
console.log('匯出完成：', OUT);

// 大地圖不再從網頁版匯出：Godot 的州圖由天下輿圖產生（godot/data/tianxia.json、godot/data/zhou/）
