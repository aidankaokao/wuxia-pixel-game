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
import { canglan } from '../../src/game/maps/canglan';
import { qzLiu, qzSmithy, qzTea, qzTemple, qzWang } from '../../src/game/maps/qingzhu_rooms';
import { BLOCKING, type Line, type MapDef } from '../../src/game/maps/types';
import { PEOPLE } from '../../src/game/story/people';
import { biyi, byIsle, byQinHome, byTavern } from '../../src/game/maps/biyi';
import { linjiang } from '../../src/game/maps/linjiang';
import { ljAcademy, ljNorth, ljTeashop } from '../../src/game/maps/linjiang_north';
import { LINJIANG_ROOMS } from '../../src/game/maps/linjiang_rooms';
import { mingquan } from '../../src/game/maps/mingquan';
import { mqBack, mqSect } from '../../src/game/maps/sect_mingquan';
import { SECT_MINGQUAN_ROOMS } from '../../src/game/maps/sect_mingquan_rooms';
import { mqFarm } from '../../src/game/maps/mq_farm';
import { mqRidge } from '../../src/game/maps/mq_ridge';
import { DABUTOU_MAPS, dabutou } from '../../src/game/maps/dabutou';

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

/** 地圖上的人：作息欄位照抄；腳本、出現條件是函式，寫成 "<fn>"（Godot 這邊另外接） */
function npcOf(n: MapDef['npcs'][number]) {
  return {
    id: n.id, name: n.name, sprite: n.sprite, x: n.x, y: n.y, facing: n.facing ?? 'down',
    all_day: n.allDay ?? false, work: n.work ?? false, night: n.night ?? false, wander: n.wander ?? 0, person: n.person ?? '',
    script: n.script ? '<fn>' : '', when: n.when ? '<fn>' : '',
    // 有人物檔案的照人物檔案的台詞，沒有的照地圖上寫的
    talks: n.person ? linesOf({ person: n.person, name: n.name }) : (n.talks ?? []),
  };
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
      .map((p) => ({ id: p.id ?? '', sprite: p.sprite, x: p.x, y: p.y, w: p.w ?? 1, lines: p.lines ?? [], label: p.label ?? '', script: p.script ? '<fn>' : '', when: p.when ? '<fn>' : '', passable: p.passable ?? false })),
    exits: def.exits,
    spots: spots.map((s) => ({ x: s.x, y: s.y, acts: s.acts })),
    people: (group?.npcs ?? []).map((n) => ({ id: n.id, name: n.name, sprite: n.sprite, person: n.person ?? '', lines: linesOf(n) })),
    npcs: def.npcs.map(npcOf),
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
      .map((p) => ({ sprite: p.sprite, x: p.x, y: p.y, w: p.w ?? 1, lines: p.lines ?? [], label: p.label ?? '', script: p.script ? '<fn>' : '' })),
    npcs: def.npcs.map(npcOf),
  };
}

for (const r of [qzLiu, qzTea, qzSmithy, qzWang, qzTemple]) writeFileSync(OUT + `${r.id}.json`, JSON.stringify(exportRoom(r), null, 1));
writeFileSync(OUT + 'qingzhu.json', JSON.stringify(exportMap(qingzhu, 'qingzhu'), null, 1));
writeFileSync(OUT + 'qz_north.json', JSON.stringify(exportMap(qzNorth), null, 1));
writeFileSync(OUT + 'canglan.json', JSON.stringify(exportMap(canglan), null, 1));
// 碧漪湖漁村、臨江城（城南、城北）與它們的室內
writeFileSync(OUT + 'biyi.json', JSON.stringify(exportMap(biyi, 'biyi'), null, 1));
writeFileSync(OUT + 'by_isle.json', JSON.stringify(exportMap(byIsle), null, 1));
writeFileSync(OUT + 'linjiang.json', JSON.stringify(exportMap(linjiang, 'linjiang'), null, 1));
writeFileSync(OUT + 'lj_north.json', JSON.stringify(exportMap(ljNorth, 'linjiang'), null, 1));
writeFileSync(OUT + 'lj_yamen.json', JSON.stringify(exportMap(LINJIANG_ROOMS.find((r) => r.id === 'lj_yamen')!), null, 1));
for (const r of [byTavern, byQinHome, ljTeashop, ljAcademy, ...LINJIANG_ROOMS.filter((r) => r.id !== 'lj_yamen')]) writeFileSync(OUT + `${r.id}.json`, JSON.stringify(exportRoom(r), null, 1));
// 鳴泉山道、鳴泉劍派院落、後山、山田、南嶺與門派的室內
writeFileSync(OUT + 'mingquan.json', JSON.stringify(exportMap(mingquan, 'mingquan'), null, 1));
for (const m of [mqSect, mqBack, mqFarm, mqRidge]) writeFileSync(OUT + `${m.id}.json`, JSON.stringify(exportMap(m, 'mingquan'), null, 1));
for (const r of SECT_MINGQUAN_ROOMS) writeFileSync(OUT + `${r.id}.json`, JSON.stringify(exportRoom(r), null, 1));
// 大埠頭與它的室內
writeFileSync(OUT + 'dabutou.json', JSON.stringify(exportMap(dabutou, 'dabutou'), null, 1));
for (const r of DABUTOU_MAPS.filter((m) => m.id !== 'dabutou')) writeFileSync(OUT + `${r.id}.json`, JSON.stringify(exportRoom(r), null, 1));
// 自己過日子的人（給 Godot 寫 story/life_*.gd 時參考）：地點、人物、床位座位、喜好、台詞（職責是函式，匯不出來）
writeFileSync(OUT + 'life_groups.json', JSON.stringify(lifeGroups().map((g) => ({ id: g.id, maps: g.maps, spots: g.spots, npcs: g.npcs.map((n) => ({ ...n, duty: undefined, script: undefined })) })), null, 1));
// 人物檔案（台詞、問答、事件；腳本是函式，匯不出來）
writeFileSync(OUT + 'people.json', JSON.stringify(PEOPLE, (k, v) => (typeof v === 'function' ? `<fn ${k}>` : v), 1));
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
