import { canHold, ITEMS } from '../character';
import { craftOf } from '../crafts';
import { dishDef } from '../cooking';
import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import { gearKindName } from '../gear';
import { usedToday } from '../home';
import { by } from '../maps/rooms';
import { propertyDef, propertyOf, refreshMarket } from '../property';
import {
  canOpen,
  PRICE_TIERS,
  settleDay,
  SHOP_FEE,
  SHOP_LEVELS,
  SHOP_TYPES,
  shopPrice,
  shopsOf,
  shopTypeDef,
  staffDef,
  STAFF,
  type ShopState,
} from '../shop';
import { dateText, onNewDay } from '../time';
import { useGame } from '../../state/store';
import { exert } from './estate';

/**
 * 經營的腳本（資料與結算在 shop.ts）：
 * - 縣衙師爺「登記商號」：名下的空店面開店（選店種、付規費）。
 * - 店裡的櫃台（東家用）：看帳本、上架、下架、定價、雇人、辭退、收帳、親自招呼客人、升級店面、歇業。
 * - 親自招呼客人：一天一次，三位客人各要一樣東西，從架上挑對的給他（給對了多收小費），那天的生意也多四成。
 * - 每天半夜結算前一天的帳（time.ts 的 onNewDay），房產市場也在這時候貼新告示。
 */

const st = () => useGame.getState();
const surname = () => [...st().hero.name][0] ?? '無';

// 每天半夜：結算昨天的帳、房產市場換告示
onNewDay((w) => {
  refreshMarket(w);
  const fame = st().hero.fame;
  for (const [id, s] of Object.entries(shopsOf(w))) settleDay(s, id, w.day - 1, w, fame);
});

// ── 開店（縣衙師爺） ────────────────────────────────────

/** 名下還沒開店的店面 */
export const openableShops = () => {
  const m = propertyOf(st().world);
  return Object.keys(m.owned).filter((id) => propertyDef(id)?.kind === 'shop' && m.owned[id].use !== 'shop' && !m.selling[id]);
};

export async function openShop(ctx: EventCtx, say: (...t: string[]) => { speaker?: string; text: string }[]) {
  const ids = openableShops();
  const i = await ctx.ask(say('要在哪間鋪面開店？')[0], [...ids.map((id) => propertyDef(id)!.name), '算了']);
  if (i >= ids.length) return;
  const id = ids[i];
  const lv = (c: Parameters<typeof craftOf>[1]) => craftOf(st().hero, c).level;
  const types = SHOP_TYPES.filter((t) => canOpen(t, lv));
  const locked = SHOP_TYPES.filter((t) => !canOpen(t, lv));
  const c = await ctx.ask(
    say(`開什麼店？${locked.length ? `\n（${locked.map((t) => `${t.name}要${t.craft === 'cooking' ? '烹飪' : t.craft === 'weaving' ? '紡織' : '釣魚'} ${t.minLevel} 級`).join('、')}）` : ''}`)[0],
    [...types.map((t) => `${t.name}：${t.desc}`), '再想想'],
  );
  if (c >= types.length) return;
  const t = types[c];
  const name = `${surname()}記${t.name}`;
  if ((await ctx.ask(say(`商號就叫「${name}」？登記規費 ${SHOP_FEE} 兩。`)[0], ['就這麼辦', '算了'])) !== 0) return;
  if (st().hero.silver < SHOP_FEE) {
    await ctx.say(...say(`規費 ${SHOP_FEE} 兩，你身上不夠。`));
    return;
  }
  st().updateHero((h) => (h.silver -= SHOP_FEE));
  st().updateWorld((w) => {
    propertyOf(w).owned[id].use = 'shop';
    (w.shops ??= {})[id] = { type: t.id, name, level: 1, stock: {}, price: 1, staff: [], till: 0, ledger: [], opened: w.day };
  });
  await ctx.say(
    ...say(`「${name}」登記好了，恭喜開張！`, '店裡要有夥計顧著才做得了生意，東家不在的時候也一樣。', '到店裡的櫃台，就能上架、雇人、看帳。'),
  );
}

// ── 店裡的櫃台 ──────────────────────────────────────────

const shopOf = (id: string): ShopState | undefined => shopsOf(st().world)[id];
const update = (id: string, f: (s: ShopState) => void) => st().updateWorld((w) => f(w.shops![id]));

export const shopCounter =
  (id: string): Script =>
  async (ctx) => {
    for (;;) {
      const s = shopOf(id);
      if (!s) return;
      const t = shopTypeDef(s.type);
      const lv = SHOP_LEVELS[s.level - 1];
      const kinds = Object.keys(s.stock).length;
      const count = Object.values(s.stock).reduce((a, n) => a + n, 0);
      const next = SHOP_LEVELS[s.level];
      const served = usedToday(st().world, `shop:${id}:serve`);
      const opts: [string, () => Promise<void | 'quit'>][] = [
        ['看帳本', () => ledger(ctx, s)],
        [`上架（架上 ${kinds}/${lv.slots} 種、${count} 件）`, () => stockUp(ctx, id)],
        ...(kinds ? [['下架', () => unstock(ctx, id)] as [string, () => Promise<void>]] : []),
        [`定價（目前：${PRICE_TIERS[s.price].name}）`, () => setPrice(ctx, id)],
        [`夥計（${s.staff.length}/${lv.staff}）`, () => staffMenu(ctx, id)],
        ...(s.till ? [[s.till > 0 ? `收帳（櫃上 ${s.till} 兩）` : `補上欠的工錢（${-s.till} 兩）`, () => collect(ctx, id)] as [string, () => Promise<void>]] : []),
        [served ? '親自招呼客人（今天招呼過了）' : '親自招呼客人（兩刻、體力 8）', () => serve(ctx, id)],
        ...(next ? [[`擴店為「${next.name}」（${next.cost} 兩）`, () => upgrade(ctx, id)] as [string, () => Promise<void>]] : []),
        ['歇業（把店收起來）', () => closeShop(ctx, id)],
      ];
      const c = await ctx.ask(`「${s.name}」${t.name}・${lv.name}\n要做什麼？`, [...opts.map((o) => o[0]), '離開櫃台']);
      if (c >= opts.length) return;
      if ((await opts[c][1]()) === 'quit') return;
    }
  };

async function ledger(ctx: EventCtx, s: ShopState) {
  const rows = s.ledger.slice(-5).reverse();
  const stock = Object.entries(s.stock).map(([k, n]) => `${ITEMS[k].name}×${n}（${shopPrice(s, k)} 兩）`).join('、');
  await ctx.say(
    rows.length
      ? rows.map((r) => (r.closed ? `${dateText(r.day)}：關門（沒人顧店）` : `${dateText(r.day)}：客人 ${r.customers}、賣出 ${r.sold}${r.short ? `、缺貨跑了 ${r.short}` : ''}；進帳 ${r.income}、工錢 ${r.wages}、稅 ${r.tax}`)).join('\n')
      : '帳本還是空的。開張以後，每天半夜結算一次。',
    `架上：${stock || '空的'}`,
  );
}

async function stockUp(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  const t = shopTypeDef(s.type);
  const lv = SHOP_LEVELS[s.level - 1];
  const bag = Object.keys(st().hero.items).filter((k) => st().hero.items[k] > 0 && t.accepts(k));
  if (!bag.length) {
    await ctx.say(`行囊裡沒有能擺上${t.name}貨架的東西。`);
    return;
  }
  const i = await ctx.ask('要擺什麼上架？', [...bag.map((k) => `${ITEMS[k].name}（身上 ${st().hero.items[k]}，${shopPrice(s, k)} 兩一件）`), '算了']);
  if (i >= bag.length) return;
  const k = bag[i];
  if (!s.stock[k] && Object.keys(s.stock).length >= lv.slots) {
    await ctx.say(`貨架擺滿了（${lv.slots} 種）。先下架別的，或是擴店。`);
    return;
  }
  const have = st().hero.items[k];
  const n = have === 1 ? 1 : [have, Math.ceil(have / 2), 1][await ctx.ask(`擺幾件？（身上 ${have}）`, [`全部 ${have} 件`, `一半 ${Math.ceil(have / 2)} 件`, '一件'])];
  st().updateHero((h) => {
    h.items[k] -= n;
    if (!h.items[k]) delete h.items[k];
  });
  update(id, (x) => (x.stock[k] = (x.stock[k] ?? 0) + n));
  await ctx.say(`${ITEMS[k].name}×${n} 擺上架了。`);
}

async function unstock(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  const ks = Object.keys(s.stock);
  const i = await ctx.ask('要收回哪一樣？', [...ks.map((k) => `${ITEMS[k].name}×${s.stock[k]}`), '算了']);
  if (i >= ks.length) return;
  const k = ks[i];
  const n = s.stock[k];
  if (!canHold(st().hero, k, n)) {
    await ctx.say('行囊放不下。');
    return;
  }
  update(id, (x) => delete x.stock[k]);
  st().updateHero((h) => (h.items[k] = (h.items[k] ?? 0) + n));
  await ctx.say(`${ITEMS[k].name}×${n} 收回行囊了。`);
}

async function setPrice(ctx: EventCtx, id: string) {
  const c = await ctx.ask('要怎麼定價？', ['便宜（賣價九成，客人多兩成五）', '公道（照行情）', '高價（賣價一成二五，客人少兩成五）', '算了']);
  if (c > 2) return;
  update(id, (x) => (x.price = c));
  await ctx.say(`定價改成「${PRICE_TIERS[c].name}」了。`);
}

async function staffMenu(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  const lv = SHOP_LEVELS[s.level - 1];
  const hired = new Set(Object.values(shopsOf(st().world)).flatMap((x) => x.staff));
  const c = await ctx.ask(
    s.staff.length ? `店裡的夥計：${s.staff.map((n) => `${n}（${staffDef(n).trait}，一天 ${staffDef(n).wage} 兩）`).join('、')}` : '店裡還沒有夥計。沒人顧店就做不了生意。',
    [...(s.staff.length < lv.staff ? ['雇人'] : []), ...(s.staff.length ? ['辭退'] : []), '算了'],
  );
  const label = [...(s.staff.length < lv.staff ? ['雇人'] : []), ...(s.staff.length ? ['辭退'] : [])][c];
  if (label === '雇人') {
    const pool = STAFF.filter((x) => !hired.has(x.name));
    if (!pool.length) {
      await ctx.say('城裡找得到的夥計都被雇走了。');
      return;
    }
    const i = await ctx.ask('牙行介紹了幾個人：', [...pool.map((x) => `${x.name}（${x.trait}，一天 ${x.wage} 兩）：${x.desc}`), '算了']);
    if (i >= pool.length) return;
    update(id, (x) => x.staff.push(pool[i].name));
    await ctx.say({ speaker: pool[i].name, text: '東家！往後就跟著您了，一定好好幹！' });
  } else if (label === '辭退') {
    const i = await ctx.ask('要辭退誰？', [...s.staff, '算了']);
    if (i >= s.staff.length) return;
    const name = s.staff[i];
    update(id, (x) => x.staff.splice(i, 1));
    await ctx.say({ speaker: name, text: '……東家保重。' }, `（${name}收拾東西走了）`);
  }
}

async function collect(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  if (s.till > 0) {
    const n = s.till;
    update(id, (x) => (x.till = 0));
    st().updateHero((h) => (h.silver += n));
    await ctx.say(`你把櫃上的 ${n} 兩收進錢袋。`);
    return;
  }
  const debt = -s.till;
  if (st().hero.silver < debt) {
    await ctx.say(`欠夥計 ${debt} 兩工錢，你身上不夠。`);
    return;
  }
  st().updateHero((h) => (h.silver -= debt));
  update(id, (x) => (x.till = 0));
  await ctx.say(`補上了 ${debt} 兩工錢，夥計們鬆了口氣。`);
}

async function upgrade(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  const next = SHOP_LEVELS[s.level];
  if ((await ctx.ask(`擴成「${next.name}」：客人多、貨架能擺 ${next.slots} 種、能雇 ${next.staff} 個夥計。要花 ${next.cost} 兩。`, ['擴店', '算了'])) !== 0) return;
  if (st().hero.silver < next.cost) {
    await ctx.say(`要 ${next.cost} 兩，你身上不夠。`);
    return;
  }
  st().updateHero((h) => (h.silver -= next.cost));
  update(id, (x) => (x.level += 1));
  await ctx.say(`工匠忙了幾天，店面打通、添了貨架與桌椅。「${s.name}」現在是「${next.name}」了！`);
}

async function closeShop(ctx: EventCtx, id: string): Promise<'quit' | void> {
  const s = shopOf(id)!;
  if ((await ctx.ask(`要把「${s.name}」收起來嗎？架上的貨會收回行囊（放不下的就送給夥計了），夥計遣散。`, ['歇業', '算了'])) !== 0) return;
  st().updateHero((h) => {
    for (const [k, n] of Object.entries(s.stock)) if (canHold(h, k, n)) h.items[k] = (h.items[k] ?? 0) + n;
    h.silver += Math.max(0, s.till);
  });
  st().updateWorld((w) => {
    delete w.shops![id];
    propertyOf(w).owned[id].use = 'empty';
  });
  await ctx.say(`「${s.name}」歇業了。鋪面還是你的，想開再到縣衙登記。`);
  return 'quit';
}

// ── 親自招呼客人 ────────────────────────────────────────

/** 客人要什麼：菜要某一類、衣服要某個部位、其他就指名 */
function wantOf(k: string): { text: string; ok: (x: string) => boolean } {
  const it = ITEMS[k];
  const d = it.dish ? dishDef(it.dish) : undefined;
  if (d) return { text: `來一份${d.kind}！`, ok: (x) => !!ITEMS[x].dish && dishDef(ITEMS[x].dish!)?.kind === d.kind };
  if (it.gear) return { text: `有沒有${gearKindName(it.gear.kind)}？`, ok: (x) => ITEMS[x].gear?.kind === it.gear!.kind };
  return { text: `要${it.name}！`, ok: (x) => x === k };
}

const GUESTS = ['挑夫', '書生', '大嬸', '老丈', '小姑娘', '跑船的', '外地客商', '鏢師'];

async function serve(ctx: EventCtx, id: string) {
  const key = `shop:${id}:serve`;
  if (usedToday(st().world, key)) {
    await ctx.say('今天已經親自招呼過一輪了，剩下的交給夥計吧。');
    return;
  }
  const s0 = shopOf(id)!;
  if (!Object.keys(s0.stock).length) {
    await ctx.say('架上是空的，拿什麼招呼客人？先上架吧。');
    return;
  }
  if (!(await exert(ctx, 8, '你累得連笑都笑不出來，這樣招呼客人只會把人嚇跑。'))) return;
  st().updateWorld((w) => (w.daily[key] = { day: w.day, n: 1 }));
  update(id, (x) => (x.served = st().world.day));
  ctx.pass(2);
  await ctx.say('你繫上圍裙站到櫃台後頭。夥計愣了一下：「東、東家？」', '門口的客人一個接一個進來了。');
  let ok = 0;
  let earned = 0;
  for (let n = 0; n < 3; n++) {
    const s = shopOf(id)!;
    const ks = Object.keys(s.stock);
    if (!ks.length) {
      await ctx.say('架上賣空了，後頭的客人只好走了。');
      break;
    }
    const k = ks[Math.floor(Math.random() * ks.length)];
    const want = wantOf(k);
    const guest = GUESTS[Math.floor(Math.random() * GUESTS.length)];
    const choices = [...ks].sort(() => Math.random() - 0.5).slice(0, 4);
    if (!choices.some(want.ok)) choices[0] = k;
    const c = await ctx.ask({ speaker: guest, text: want.text }, choices.map((x) => `${ITEMS[x].name}（架上 ${s.stock[x]}）`));
    const pick = choices[c];
    if (!want.ok(pick)) {
      await ctx.say({ speaker: guest, text: '不是這個啦……算了，我上別家去。' });
      continue;
    }
    // 給對了：照價賣，再多收兩成小費
    const price = Math.round(shopPrice(s, pick) * 1.2);
    update(id, (x) => {
      x.stock[pick] -= 1;
      if (!x.stock[pick]) delete x.stock[pick];
      x.till += price;
    });
    ok++;
    earned += price;
    await ctx.say({ speaker: guest, text: ['就是這個！東家親自招呼，果然不一樣。', '好！下回還來！', '爽快！多的不用找了。'][n % 3] }, `（賣出${ITEMS[pick].name}，收 ${price} 兩，放進櫃上）`);
  }
  if (ok === 3) await ctx.hero((h) => ((h.fame += 1), '（客人都滿意得很，名聲 +1）'));
  await ctx.say(`招呼了兩刻，收了 ${earned} 兩。`, '（東家親自顧店，今天的生意多了四成，晚上結算時就看得到）');
}

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) =>
  Object.entries(shopsOf(world)).flatMap(([id, s]) => {
    const out: { text: string; state: 'todo' | 'done'; note?: string }[] = [];
    const y = s.ledger.find((r) => r.day === world.day - 1);
    if (y) out.push({ text: y.closed ? `${s.name}：昨天沒人顧店，關門一天` : `${s.name}：昨天客人 ${y.customers}、賣出 ${y.sold}，進帳 ${y.income} 兩`, state: y.closed ? 'todo' : 'done', note: y.short ? `缺貨跑了 ${y.short} 位客人` : undefined });
    if (s.till >= 20) out.push({ text: `${s.name}：櫃上有 ${s.till} 兩可收`, state: 'todo', note: propertyDef(id)?.name });
    const count = Object.values(s.stock).reduce((a, n) => a + n, 0);
    if (count < 5) out.push({ text: `${s.name}：貨快賣光了（架上 ${count} 件）`, state: 'todo' });
    if (!s.staff.length) out.push({ text: `${s.name}：還沒雇夥計`, state: 'todo' });
    return out;
  }),
);

/** 店裡的夥計說的話 */
export const staffLines = (name: string) => by(name)('東家來啦！', staffDef(name).trait === '嘴甜' ? '今天好幾位客人都說咱們的東西好！' : '帳都記在本子上了，您過目。');
