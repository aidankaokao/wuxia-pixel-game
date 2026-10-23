import { BUILDINGS } from '../art/props';
import { propertyOf, tenantIn, tenantOf, type PropertyDef } from '../property';
import { useGame } from '../../state/store';
import { by, exitTo, room } from './rooms';
import { shopsOf, shopTypeDef, SHOP_LEVELS } from '../shop';
import { shopCounter, staffLines } from '../story/shop';
import { shopEventNpc, tenantTalk } from '../story/shop_events';
import { guardDef } from '../shop_manage';
import type { BuildingDef, MapDef } from './types';

/**
 * 房產的室內地圖（`prop:物件id`）：看房、自己名下的房子都走這裡。
 * 民居：床、桌、櫃；租出去了，租客在屋裡。店面：櫃台、貨架（開店以後由經營的部分接手）。
 * 出口回到那棟房子的門口。
 */
export function buildPropertyMap(p: PropertyDef, b: BuildingDef): MapDef {
  const st = BUILDINGS[b.style];
  const out = exitTo(p.map, b.x + st.door, b.y + st.h, 0, 0);
  const w = useGame.getState().world;
  const o = propertyOf(w).owned[p.id];
  const mine = !!o;
  const shop = shopsOf(w)[p.id];
  if (p.kind === 'shop' && shop) {
    // 開了店：櫃台是東家的，夥計在店裡；有人顧的時候白天有客人
    const t = shopTypeDef(shop.type);
    const open = shop.staff.length > 0;
    const goods = Object.keys(shop.stock).length;
    return {
      id: `prop:${p.id}`,
      name: shop.name,
      subtitle: `臨江城・${t.name}・${SHOP_LEVELS[shop.level - 1].name}`,
      tiles: room(11, 8, 5),
      spawn: { x: 5, y: 6, facing: 'up' },
      theme: shop.type === 'restaurant' ? 'plain' : 'scholar',
      buildings: [],
      props: [
        { sprite: 'counter', x: 1, y: 1, w: 3, script: shopCounter(p.id), label: '東家的櫃台' },
        { sprite: 'jars', x: 6, y: 1, w: 2, lines: [{ text: goods ? `貨架上擺著 ${goods} 樣貨。` : '貨架空著，該上貨了。' }] },
        { sprite: 'jars', x: 8, y: 1, w: 2, lines: [{ text: goods ? '客人在架前挑挑揀揀。' : '空貨架。' }] },
        { sprite: 'f_table_plain_1', x: 2, y: 4, w: 2, lines: [{ text: '給客人坐的方桌。' }] },
        { sprite: 'f_table_plain_1', x: 7, y: 4, w: 2, lines: [{ text: '桌上留著客人喝剩的半碗茶。' }] },
      ],
      npcs: [
        // 店裡出的事：地痞堵在門口、老饕坐在角落（跟他說話就是處理這件事，見 story/shop_events.ts）
        ...(shop.event?.kind === 'ruffian' && shop.event.day <= w.day
          ? [
              { id: `ruffian_${p.id}`, allDay: true, name: '蔡三', sprite: 'bandit', x: 6, y: 4, facing: 'down' as const, script: shopEventNpc(p.id) },
              { id: `ruffian_${p.id}_2`, allDay: true, name: '跟班', sprite: 'beggar', x: 4, y: 6, facing: 'right' as const, script: shopEventNpc(p.id) },
            ]
          : []),
        ...(shop.event?.kind === 'critic' && shop.event.day <= w.day
          ? [{ id: `critic_${p.id}`, allDay: true, name: '郝一嚐', sprite: 'elder', x: 9, y: 4, facing: 'left' as const, script: shopEventNpc(p.id) }]
          : []),
        // 專管這家店的掌櫃站在櫃台旁（大掌櫃管整座城，不常在店裡）
        ...((w.biz?.managers ?? []).filter((m) => m.shop === p.id).map((m) => ({ id: `mgr_${p.id}`, allDay: true, name: m.name, sprite: 'storyteller', x: 2, y: 3, facing: 'down' as const, talks: [by(m.name)('東家來了！店裡一切照方針辦，帳都記在總號帳簿上，您過目。')] }))),
        // 坐鎮的保鏢（shop_manage.ts 的 GUARDS）
        ...(shop.guard
          ? [{ id: `guard_${p.id}`, allDay: true, name: shop.guard.name, sprite: guardDef(shop.guard.source).sprite, x: 9, y: 6, facing: 'left' as const, talks: [by(shop.guard.name)(`東家放心，有我${guardDef(shop.guard.source).title}${shop.guard.name}在，誰也別想在這兒撒野。`)] }]
          : []),
        ...shop.staff.map((name, i) => ({ id: `staff_${p.id}_${i}`, allDay: true, name, sprite: i % 2 ? 'girl' : 'servant', x: 4 + i * 2, y: 2, facing: 'down' as const, talks: [staffLines(name)] })),
        ...(open && goods
          ? [
              { id: `guest_${p.id}_1`, work: true, name: '客人', sprite: 'peddler', x: 3, y: 5, facing: 'up' as const, talks: [by('客人')('這家東西實在，價錢也公道。')] },
              { id: `guest_${p.id}_2`, work: true, name: '客人', sprite: 'farmer', x: 8, y: 5, facing: 'up' as const, talks: [by('客人')('東家？久仰久仰！')] },
            ]
          : []),
      ],
      exits: [{ ...out, tiles: [[5, 7]] }],
    };
  }
  if (p.kind === 'shop') {
    return {
      id: `prop:${p.id}`,
      name: p.name,
      subtitle: mine ? '臨江城・你的鋪面' : '臨江城・看房',
      tiles: room(11, 8, 5),
      spawn: { x: 5, y: 6, facing: 'up' },
      theme: 'plain',
      buildings: [],
      props: [
        { sprite: 'counter', x: 1, y: 1, w: 3, lines: [{ text: mine ? '空蕩蕩的櫃台，擦乾淨了就能做生意。' : '前一家留下的櫃台，漆掉了一半。' }] },
        { sprite: 'jars', x: 6, y: 1, w: 2, lines: [{ text: '前一家留下的幾個空罈子。' }] },
        { sprite: 'jars', x: 8, y: 1, w: 2, lines: [{ text: '空罈子，角落結了蜘蛛網。' }] },
        { sprite: 'f_table_plain_1', x: 2, y: 4, w: 2, lines: [{ text: '給客人坐的方桌。' }] },
      ],
      npcs: [],
      exits: [{ ...out, tiles: [[5, 7]] }],
    };
  }
  const tenant = o && tenantIn(o, w.day) ? tenantOf(p.id) : null;
  return {
    id: `prop:${p.id}`,
    name: p.name,
    subtitle: mine ? (tenant ? `你的房子・租給${tenant}` : '你的房子') : '看房',
    tiles: room(9, 7, 4),
    spawn: { x: 4, y: 5, facing: 'up' },
    theme: 'plain',
    buildings: [],
    props: [
      { sprite: 'f_bed_plain_1', x: 1, y: 1, w: 2, lines: [{ text: tenant ? `${tenant}的床鋪，被子疊得整整齊齊。` : '一張舊床板。' }] },
      { sprite: 'f_table_plain_1', x: 5, y: 3, w: 2, lines: [{ text: '一張方桌，桌腳墊了塊瓦片。' }] },
      { sprite: 'f_shelf_plain_1', x: 5, y: 1, w: 2, lines: [{ text: tenant ? '櫃子裡擺著租客的家當。' : '空櫃子。' }] },
    ],
    npcs: tenant
      ? [
          {
            id: `tenant_${p.id}`, allDay: true, name: tenant, sprite: 'lady', x: 3, y: 3, facing: 'down',
            script: tenantTalk(p.id),
          },
        ]
      : [],
    exits: [{ ...out, tiles: [[4, 6]] }],
  };
}
