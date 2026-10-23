import { craftOf } from '../crafts';
import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { registerNotices, type Notice } from '../notices';
import {
  AGENT_FEE,
  CONDITION,
  propertyDef,
  propertyOf,
  PROPERTIES,
  refreshMarket,
  rentDue,
  rentOf,
  REPAIR_COST,
  rollSale,
  TENANT_DAYS,
  tenantIn,
  tenantOf,
  valueOf,
  XUN,
  type Listing,
  type PropertyDef,
} from '../property';
import { dateText } from '../time';
import { useGame } from '../../state/store';
import { contractTalk, hireManagerTalk } from './supplier';
import { grantBizTitle } from './shop';
import { hasBizTitle } from '../shop_manage';
import { setClerkHook } from './yamen';
import { openableShops, openShop } from './shop';

/**
 * 房產市場的腳本（資料與計算在 property.ts）：
 * - 縣衙師爺苗守正、城北萬通牙行的牙人錢六都能辦：買屋、賣屋、名下的房子（出租、修繕）、收房租、領賣屋的錢。
 * - 買屋談價：照價買、自己談（看名聲與學識，談崩了屋主會漲價、不肯再談）、請牙人（收三分佣金，保證砍一些）。
 * - 賣屋：市價出售（等幾天，九成到一成二）或降價求售（一兩天，五到八成）；自己出面或請牙人（價錢穩、賣得快，扣佣金）。
 * - 出售告示貼在公告欄的「日常公告」，有期限；自己掛出去賣的也會貼上去。
 */

const st = () => useGame.getState();
const miao = by('苗守正');
const qian = by('錢六');
type Who = 'clerk' | 'agent';
const sayer = (who: Who) => (who === 'clerk' ? miao : qian);

const market = () => propertyOf(st().world);
const refresh = () => st().updateWorld((w) => refreshMarket(w));
const day = () => st().world.day;

async function pay(ctx: EventCtx, n: number, say: (...t: string[]) => Line[]): Promise<boolean> {
  if (st().hero.silver < n) {
    await ctx.say(...say(`這要 ${n} 兩，你身上只有 ${st().hero.silver} 兩。`));
    return false;
  }
  st().updateHero((h) => (h.silver -= n));
  return true;
}

/** 賣掉的房子：領錢 */
async function collectPayouts(ctx: EventCtx, who: Who) {
  const payout = market().payout;
  for (const [id, n] of Object.entries(payout)) {
    const p = propertyDef(id)!;
    await ctx.say(...sayer(who)(`${p.name}找到買主了，成交！`, `扣掉該扣的，這是你的 ${n} 兩。`));
    st().updateHero((h) => (h.silver += n));
    st().updateWorld((w) => delete w.property!.payout[id]);
  }
}

// ── 選單 ────────────────────────────────────────────────

/** 師爺與牙人共用的選單；選了「閒聊」之類的回傳 false，讓呼叫端接著做原本的事 */
export async function propertyMenu(ctx: EventCtx, who: Who): Promise<boolean> {
  refresh();
  await collectPayouts(ctx, who);
  const m = market();
  const owned = Object.keys(m.owned);
  const due = owned.reduce((a, id) => a + rentDue(propertyDef(id)!, m.owned[id], day()).silver, 0);
  const opts: [string, () => Promise<void>][] = [
    [`買屋（出售中 ${m.listings.length} 間）`, () => buyMenu(ctx, who)],
    ...(owned.some((id) => !m.selling[id]) ? [['賣屋', () => sellMenu(ctx, who)] as [string, () => Promise<void>]] : []),
    ...(owned.length ? [[`名下的房子（${owned.length} 間）`, () => ownedMenu(ctx, who)] as [string, () => Promise<void>]] : []),
    ...(due ? [[`收房租、分紅（${due} 兩）`, () => collectRent(ctx, who)] as [string, () => Promise<void>]] : []),
    ...(who === 'clerk' && openableShops().length ? [['登記商號（在自己的鋪面開店）', () => openShop(ctx, miao)] as [string, () => Promise<void>]] : []),
  ];
  const greet = who === 'clerk' ? '房契地契、過戶登記，找在下就對了。要辦什麼？' : '萬通牙行錢六，買房賣房、租屋招租，一句話的事！';
  const c = await ctx.ask(sayer(who)(greet)[0], [...opts.map((o) => o[0]), who === 'clerk' ? '閒聊' : '問問牙行是做什麼的', '不用了']);
  if (c < opts.length) {
    await opts[c][1]();
    return true;
  }
  return c > opts.length;
}

// ── 買屋 ────────────────────────────────────────────────

async function buyMenu(ctx: EventCtx, who: Who) {
  const say = sayer(who);
  const list = market().listings;
  if (!list.length) {
    await ctx.say(...say('這幾天沒有人要賣房子。過兩天再來，公告欄上一有，我馬上知道。'));
    return;
  }
  const i = await ctx.ask(say('目前出售中的：')[0], [...list.map((l) => `${propertyDef(l.id)!.name}（要價 ${l.price} 兩，貼到${dateText(l.until)}）`), '算了']);
  if (i >= list.length) return;
  await buyOne(ctx, who, list[i]);
}

async function buyOne(ctx: EventCtx, who: Who, l: Listing) {
  const say = sayer(who);
  const p = propertyDef(l.id)!;
  await ctx.say(
    ...say(
      `${p.name}：${p.desc}`,
      p.kind === 'business'
        ? `${l.reason}。買下來照舊經營，原班人馬留下，你當東家，一旬大約分紅 ${rentOf(p)} 兩。`
        : `屋主是${p.owner}，${l.reason}。屋況：${CONDITION[1]}。${p.kind === 'shop' ? '是間店面，買下來可以開店。' : `出租的話，一旬大約收 ${rentOf(p)} 兩。`}`,
    ),
  );
  for (;;) {
    const cur = market().listings.find((x) => x.id === l.id);
    if (!cur) return;
    const fee = Math.round(cur.price * AGENT_FEE);
    const c = await ctx.ask(say(`現在的價錢是 ${cur.price} 兩。`)[0], [
      '先去看看房子',
      `照價買下（${cur.price} 兩）`,
      cur.haggled ? '自己談價（屋主不肯再談了）' : '自己跟屋主談價',
      who === 'clerk' ? `請牙人出面（佣金約 ${fee} 兩）` : `交給錢六去談（佣金約 ${fee} 兩）`,
      '算了',
    ]);
    if (c === 0) {
      if (p.kind === 'business') {
        await ctx.say(...say(`${p.name}天天開門做生意，你進去看看就知道了。`));
        continue;
      }
      await ctx.say(...say('房子就在那兒，自己去看吧。門我先替你打開了。'));
      ctx.warp(`prop:${p.id}`, interiorSpawn(p));
      return;
    }
    if (c === 1) return void (await purchase(ctx, who, p, cur.price, 0));
    if (c === 2) {
      if (cur.haggled) {
        await ctx.say(...say(`${p.owner}說了，價錢就這樣，不談了。`));
        continue;
      }
      await haggle(ctx, p, cur);
      continue;
    }
    if (c === 3) {
      // 牙人保證砍個六到一成，另收三分佣金
      const price = Math.round((cur.price * (0.9 + Math.random() * 0.04)) / 10) * 10;
      const cost = Math.round(price * AGENT_FEE);
      await ctx.say(...qian(`${p.owner}那兒我熟。`, `……談妥了！${price} 兩，另外我的佣金 ${cost} 兩。`));
      if ((await ctx.ask(`一共 ${price + cost} 兩，買下嗎？`, ['買下', '再想想'])) !== 0) return;
      return void (await purchase(ctx, who, p, price, cost));
    }
    return;
  }
}

/** 自己談價：名聲越高、學識越好越容易；大砍一刀容易談崩 */
async function haggle(ctx: EventCtx, p: PropertyDef, l: Listing) {
  const c = await ctx.ask(`你找上${p.owner}。要怎麼談？`, ['誠懇地請屋主讓一點', '挑房子的毛病，大砍一刀', '算了']);
  if (c > 1) return;
  const chance = 0.4 + Math.min(0.25, st().hero.fame / 300) + craftOf(st().hero, 'learning').level * 0.03 - (c === 1 ? 0.15 : 0);
  const owner = by(p.owner);
  if (Math.random() < chance) {
    const cut = c === 1 ? 0.1 + Math.random() * 0.05 : 0.04 + Math.random() * 0.04;
    const price = Math.round((l.price * (1 - cut)) / 10) * 10;
    st().updateWorld((w) => {
      const x = propertyOf(w).listings.find((y) => y.id === l.id)!;
      x.price = price;
      x.haggled = true;
    });
    await ctx.say(...owner(c === 1 ? '……好吧好吧，算你眼尖。' : '看你是個實在人，就讓一點吧。'), `（${p.owner}讓到 ${price} 兩）`);
  } else {
    const price = Math.round((l.price * 1.05) / 10) * 10;
    st().updateWorld((w) => {
      const x = propertyOf(w).listings.find((y) => y.id === l.id)!;
      x.price = price;
      x.haggled = true;
    });
    await ctx.say(...owner(c === 1 ? '嫌東嫌西的，那你別買啊！' : '這價錢已經很公道了。'), `（談崩了。${p.owner}不高興，價錢漲到 ${price} 兩，也不肯再談了）`);
  }
}

async function purchase(ctx: EventCtx, who: Who, p: PropertyDef, price: number, fee: number) {
  const say = sayer(who);
  if (!(await pay(ctx, price + fee, say))) return;
  st().updateWorld((w) => {
    const m = propertyOf(w);
    w.property = m;
    m.listings = m.listings.filter((x) => x.id !== p.id);
    m.owned[p.id] = { paid: price, day: w.day, cond: 1, use: p.kind === 'business' ? 'business' : 'empty' };
  });
  await ctx.say(
    ...(who === 'agent' ? qian('成交！我這就陪你去縣衙過戶。') : []),
    ...miao(
      `過戶辦好了。${p.name}從今天起歸你，這是${p.kind === 'business' ? '房契與商號的契書' : '房契'}。`,
      p.kind === 'business'
        ? `${p.name}照舊經營，${p.owner}那邊的人手都留著，你是東家，每旬來收分紅就是。這行當城裡少不得，可不能改做別的。`
        : p.kind === 'shop'
          ? '這是間店面，日後要開店，再來縣衙登記商號。'
          : '要出租的話，跟我說一聲，我替你招租。',
    ),
    `（買下了${p.name}，花了 ${price + fee} 兩）`,
  );
  // 第一次買下店面或老店：成了「東家」
  if (p.kind !== 'house') await grantBizTitle(ctx);
}

// ── 賣屋 ────────────────────────────────────────────────

async function sellMenu(ctx: EventCtx, who: Who) {
  const say = sayer(who);
  const m = market();
  const ids = Object.keys(m.owned).filter((id) => !m.selling[id]);
  const i = await ctx.ask(say('要賣哪一間？')[0], [...ids.map((id) => `${propertyDef(id)!.name}（買價 ${m.owned[id].paid} 兩）`), '算了']);
  if (i >= ids.length) return;
  const id = ids[i];
  const p = propertyDef(id)!;
  const paid = m.owned[id].paid;
  const mode = await ctx.ask(say('要怎麼賣？')[0], [
    `市價出售（要等幾天，約 ${Math.round(paid * 0.9)}～${Math.round(paid * 1.2)} 兩）`,
    `降價求售（一兩天就賣掉，約 ${Math.round(paid * 0.5)}～${Math.round(paid * 0.8)} 兩）`,
    '算了',
  ]);
  if (mode > 1) return;
  const agent =
    (await ctx.ask(say('自己出面跟買主談，還是交給牙人？')[0], ['自己出面談', `請牙人（佣金三分，價錢穩、賣得快）`])) === 1;
  const s = rollSale(paid, mode === 0 ? 'market' : 'quick', agent, day());
  st().updateWorld((w) => {
    const pm = propertyOf(w);
    pm.selling[id] = s;
    // 要賣了，租客搬走（老店照常營業，只是換東家）
    if (pm.owned[id].use !== 'business') pm.owned[id].use = 'empty';
  });
  await ctx.say(
    ...say(`好，${p.name}登記出售了，公告欄上會貼出去。`, mode === 0 ? '市價賣，得等買主慢慢上門，過些日子再來問。' : '降價賣，一兩天就有人要。'),
    `（成交了到縣衙或牙行領錢${agent ? '，牙人佣金三分從裡頭扣' : ''}）`,
  );
}

// ── 名下的房子 ──────────────────────────────────────────

async function ownedMenu(ctx: EventCtx, who: Who) {
  const say = sayer(who);
  const m = market();
  const ids = Object.keys(m.owned);
  const i = await ctx.ask(say('你名下的房子：')[0], [...ids.map((id) => `${propertyDef(id)!.name}（${statusText(id)}）`), '算了']);
  if (i >= ids.length) return;
  const id = ids[i];
  const p = propertyDef(id)!;
  const o = market().owned[id];
  const selling = market().selling[id];
  if (selling) {
    if ((await ctx.ask(say(`${p.name}正在出售。要撤回嗎？`)[0], ['撤回，不賣了', '繼續賣'])) === 0) {
      st().updateWorld((w) => delete propertyOf(w).selling[id]);
      await ctx.say(...say('撤回了。告示我叫人撕下來。'));
    }
    return;
  }
  const repair = o.cond < 3 ? Math.round((p.base * REPAIR_COST[o.cond]) / 10) * 10 : 0;
  if (p.kind === 'business') {
    await ctx.say(...say(`${p.name}：照舊經營，${['', '原樣', '擴過一次', '大擴'][o.cond]}，一旬分紅約 ${rentOf(p, o.cond)} 兩。行情約 ${valueOf(p, o.cond)} 兩。`));
    if (!repair) return;
    if ((await ctx.ask(say(`要出錢擴店嗎？${repair} 兩，之後每旬分紅變成約 ${rentOf(p, o.cond + 1)} 兩。`)[0], ['出錢擴店', '算了'])) === 0) {
      if (!(await pay(ctx, repair, say))) return;
      st().updateWorld((w) => {
        const x = propertyOf(w).owned[id];
        x.cond += 1;
        x.paid += Math.round(repair * 0.8);
      });
      await ctx.say(...say(`${p.owner}那邊收了錢，添了人手、擴了門面。${p.name}的生意更旺了。`));
    }
    return;
  }
  const opts: [string, () => Promise<void>][] = [
    ...(p.kind === 'house'
      ? o.use === 'rent'
        ? [['收回來，不租了', async () => setUse(id, 'empty')] as [string, () => Promise<void>]]
        : [[`出租（一旬約 ${rentOf(p, o.cond)} 兩）`, async () => setUse(id, 'rent')] as [string, () => Promise<void>]]
      : []),
    ...(repair ? [[`修繕（${repair} 兩，屋況升為「${CONDITION[o.cond + 1]}」）`, async () => doRepair(ctx, who, id, repair)] as [string, () => Promise<void>]] : []),
    ['進去看看', async () => ctx.warp(`prop:${id}`, interiorSpawn(p))],
  ];
  await ctx.say(...say(`${p.name}：屋況「${CONDITION[o.cond]}」，${statusText(id)}。行情約 ${valueOf(p, o.cond)} 兩。`));
  const c = await ctx.ask(say('要怎麼處置？')[0], [...opts.map((x) => x[0]), '算了']);
  if (c < opts.length) await opts[c][1]();
  if (c < opts.length && opts[c][0].startsWith('出租')) await ctx.say(...say(`好，我替你貼招租。${tenantOf(id)}正在找房子，兩三天內就會住進去，每旬收一次租。`));
}

function statusText(id: string): string {
  const m = market();
  const o = m.owned[id];
  if (m.selling[id]) return '出售中';
  if (o.use === 'shop') return '開店中';
  if (o.use === 'business') return '照舊經營・你是東家';
  if (o.use === 'rent') return tenantIn(o, day()) ? `租給${tenantOf(id)}` : '招租中';
  return '空著';
}

function setUse(id: string, use: 'empty' | 'rent') {
  st().updateWorld((w) => {
    const o = propertyOf(w).owned[id];
    o.use = use;
    if (use === 'rent') {
      o.rentFrom = w.day;
      o.rentPaidTo = undefined;
    }
  });
}

async function doRepair(ctx: EventCtx, who: Who, id: string, cost: number) {
  if (!(await pay(ctx, cost, sayer(who)))) return;
  st().updateWorld((w) => {
    const o = propertyOf(w).owned[id];
    o.cond += 1;
    // 修繕花的錢，八成算進房子的價值（之後賣的時候照這個算）
    o.paid += Math.round(cost * 0.8);
  });
  const o = market().owned[id];
  await ctx.say(...sayer(who)(`工匠來了幾天，屋頂換了瓦、樑柱上了漆，${propertyDef(id)!.name}現在是「${CONDITION[o.cond]}」了。`));
}

async function collectRent(ctx: EventCtx, who: Who) {
  let total = 0;
  const lines: string[] = [];
  st().updateWorld((w) => {
    const pm = propertyOf(w);
    for (const [id, o] of Object.entries(pm.owned)) {
      const p = propertyDef(id)!;
      if (o.event?.kind === 'late') lines.push(`${p.name}：${tenantOf(id)}說手頭緊，這旬交不出來（去房子裡找他談）`);
      const d = rentDue(p, o, w.day);
      if (!d.xun) continue;
      if (o.event?.kind === 'leak' && w.day - o.event.day > 5) lines.push(`${p.name}：屋頂漏雨一直沒修，${tenantOf(id)}只肯交一半`);
      total += d.silver;
      if (p.kind === 'business') {
        lines.push(`${p.name}：${d.xun} 旬的分紅，${d.silver} 兩`);
        o.rentPaidTo = (o.rentPaidTo ?? o.day) + d.xun * XUN;
      } else {
        lines.push(`${p.name}：${tenantOf(id)}交了 ${d.xun} 旬的租，${d.silver} 兩`);
        o.rentPaidTo = (o.rentPaidTo ?? o.rentFrom! + TENANT_DAYS) + d.xun * XUN;
      }
    }
  });
  st().updateHero((h) => (h.silver += total));
  await ctx.say(...sayer(who)('房租都收齊了。'), `${lines.join('\n')}\n（共 ${total} 兩）`);
}

// ── 看房：房子裡面（maps/property.ts 依物件產生室內地圖） ──

export const interiorSpawn = (p: PropertyDef) => (p.kind === 'shop' ? { x: 5, y: 6, facing: 'up' as const } : { x: 4, y: 5, facing: 'up' as const });

// ── 牙行 ────────────────────────────────────────────────

export const agentTalk: Script = async (ctx) => {
  // 開了店的東家：牙行也供貨、介紹掌櫃（story/supplier.ts）
  if (hasBizTitle(st().hero)) {
    const c = await ctx.ask(qian('東家今天要辦什麼事？')[0], ['房子的事', '談供貨合約', '找掌櫃', '沒事']);
    if (c === 1) return contractTalk(ctx, 'lj_agent');
    if (c === 2) return hireManagerTalk(ctx);
    if (c === 3) return;
  }
  if (await propertyMenu(ctx, 'agent')) return;
  await ctx.say(
    ...qian(
      '牙行嘛，就是替人牽線的。買房、賣房、租屋，兩頭說合，成了收個三分佣金。',
      '你自己去談也行，可屋主一不高興就漲價；我出面，價錢包你砍得下來，賣的話也賣得快、賣得穩。',
      '這城裡哪家要賣房、誰家缺錢，我錢六比縣衙還先知道！',
    ),
  );
};

// 縣衙師爺的選單掛上房產
setClerkHook(async (ctx) => {
  if (await propertyMenu(ctx, 'clerk')) return true;
  return false;
});

// ── 公告欄：出售告示 ────────────────────────────────────

registerNotices(({ world }): Notice[] => {
  const m = propertyOf(world);
  const out: Notice[] = m.listings
    .filter((l) => l.until >= world.day)
    .map((l) => {
      const p = propertyDef(l.id)!;
      return {
        id: `sale:${l.id}`, tab: 'daily', title: p.kind === 'business' ? `轉讓・${p.name}（照舊經營）` : `出售・${p.name}`,
        text:
          p.kind === 'business'
            ? [`${p.name}${l.reason}，欲將店鋪連同生意一併轉讓。`, p.desc, `接手者須照舊經營，原班人馬留用。要價 ${l.price} 兩。`, '有意者請洽縣衙師爺苗守正，或城北萬通牙行錢六。']
            : [`屋主${p.owner}${l.reason}，欲將${p.name}出售。`, p.desc, `屋況：${CONDITION[1]}。要價 ${l.price} 兩。`, '有意者請洽縣衙師爺苗守正，或城北萬通牙行錢六。'],
        by: p.owner, until: l.until, tag: `要價 ${l.price} 兩`,
      };
    });
  for (const id of Object.keys(m.selling)) {
    const p = propertyDef(id)!;
    out.push({ id: `mysale:${id}`, tab: 'daily', title: `出售・${p.name}（你的）`, text: [`${p.name}已登記出售，等候買主。`, p.desc], by: '臨江縣師爺 代貼' });
  }
  return out;
});

// ── 今日事：收租、領賣屋的錢 ────────────────────────────

registerDailyTasks(({ world }) => {
  const m = propertyOf(world);
  const out: { text: string; state: 'todo'; note?: string }[] = [];
  const sold = Object.entries(m.selling).filter(([, s]) => world.day >= s.until);
  if (sold.length || Object.keys(m.payout).length) out.push({ text: '房子賣掉了：到臨江縣衙或萬通牙行領錢', state: 'todo' });
  const due = Object.entries(m.owned).reduce((a, [id, o]) => a + rentDue(propertyDef(id)!, o, world.day).silver, 0);
  if (due) out.push({ text: `收房租、分紅（${due} 兩）`, state: 'todo', note: '臨江縣衙或萬通牙行' });
  return out;
});

/** 地圖上的房子：自己的房子門打得開 */
export const ownedProperty = (map: string, bx: number, by: number) => {
  const p = PROPERTIES.find((x) => x.map === map && x.bx === bx && x.by === by);
  return p && market().owned[p.id] ? p : undefined;
};
