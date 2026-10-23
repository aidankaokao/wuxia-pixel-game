import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import type { World } from '../home';
import { lifeGroups, type Assign } from '../life';
import { by } from '../maps/rooms';
import { addContrib, inSect } from '../sect';
import { fundOf } from '../sect_fund';
import { clampAff, newRelation } from '../social';
import { onNewDay } from '../time';
import { useGame } from '../../state/store';
import { exert } from './estate';
import { collectRent, heroOut, SHOP, shopSell } from './mq_fund';
import { choreGrowth } from './sect_mingquan';
// 青竹村那群人要先註冊好，才能在柳承安身上掛收租的選項
import './life_towns';

/**
 * 鳴泉劍派在山下的產業（4.32）：
 * - 臨江城城北的泉霧茶莊：外門管事梁敬亭掌櫃。山上的茶由韋季安每逢初九、十九、廿九送來，
 *   或由外務執事接「送茶進城」的差事送來；茶莊每天零賣（mq_fund.ts 的 shopSell），比整批賣給茶行多五成。
 *   找梁敬亭可以買茶（本門弟子打八折）、問生意、幫忙招呼客人（一天一回，多賣幾斤）、交送來的茶。
 * - 青竹村的祖田：村西南的大田佃給阿牛、鄒老實等人，柳承安代收。夏租、冬租到期那天，
 *   你若是外務執事，要在十天內下山找柳承安收（年成不好時佃戶會求減租，照收、減一成或減兩成由你決定）；
 *   過期或你不是外務執事，就由韋季安代收。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const liang = by('梁敬亭');
const liu = by('柳承安');

function addAff(person: string, n: number) {
  st().updateWorld((w) => {
    const r = (w.relations[person] ??= newRelation());
    r.aff = clampAff(r.aff + n);
  });
}

// ── 送茶進城（外務執事的差事，mq_posts.ts 交辦） ─────────────────

/** 製茶房存的茶夠不夠送一趟 */
export const TEA_RUN_MIN = 15;
export const teaErrand = (w: World) => {
  const e = w.life?.errand;
  return e && e.kind === 'tea' && !e.done && w.day <= e.due ? e : undefined;
};

/** 接下送茶的差事：把製茶房的茶交到你手上 */
export function takeTeaRun(w: World, days: number) {
  const f = fundOf(w);
  const n = Math.floor(f.tea);
  const value = f.teaValue * (n / f.tea);
  f.tea -= n;
  f.teaValue -= value;
  w.life!.errand = { kind: 'tea', item: 'tea', n, value, day: w.day, due: w.day + days - 1 };
  return n;
}

/** 送茶的差事過期了：另外找人送去，茶照樣上架 */
onNewDay((w) => {
  const e = w.life?.errand;
  if (!e || e.kind !== 'tea' || e.done || w.day <= e.due) return;
  const shop = fundOf(w).shop!;
  shop.tea += e.n;
  shop.teaValue += e.value ?? 0;
  w.life!.errand = { ...e, done: true, day: w.day };
});

// ── 泉霧茶莊：梁敬亭 ─────────────────────────────────────

const STOCK = ['quanwu', 'yunwu', 'tea'];
const HELP_KEY = 'mq:shophelp';

async function deliverTea(ctx: EventCtx) {
  const e = teaErrand(st().world)!;
  st().updateWorld((w) => {
    const shop = fundOf(w).shop!;
    shop.tea += e.n;
    shop.teaValue += e.value ?? 0;
    w.life!.errand = { ...e, done: true, day: w.day };
  });
  await ctx.say(...liang(`${e.n} 斤，一兩不少。`, '這批茶上了架，這幾天就賣得動。辛苦你跑這一趟。'));
  await ctx.hero((h) => ((h.silver += 10), '跑腿錢：銀兩 +10。'));
  await ctx.say(`（${st().updateWorld((w) => addContrib(w, 6))}）`);
}

async function business(ctx: EventCtx) {
  const f = fundOf(st().world);
  const shop = f.shop!;
  const got = Math.round(f.month.in.shop ?? 0);
  await ctx.say(
    ...liang(
      shop.tea >= 1 ? `架上還有 ${Math.round(shop.tea)} 斤茶。` : '架上的茶賣光了，等山上送茶下來。',
      `這個月賣了 ${Math.round(shop.sold)} 斤，進帳 ${got} 兩，夥計的工錢一天 ${SHOP.wage} 兩。`,
      '旬休趕集、過節的時候生意最好。明前茶一上架，城裡的老茶客搶著要。',
    ),
  );
}

/** 幫忙招呼客人：一個時辰，多賣幾斤 */
async function helpCounter(ctx: EventCtx) {
  const w = st().world;
  if (w.daily[HELP_KEY]?.day === w.day) return void (await ctx.say(...liang('今天已經勞你站過櫃台了，剩下的我們來。')));
  if (fundOf(w).shop!.tea < 1) return void (await ctx.say(...liang('架上沒茶，站櫃台也沒得賣。等山上送茶來再說。')));
  if (!(await exert(ctx, 10, '累得站都站不穩，這時候招呼客人只會失禮。'))) return;
  ctx.pass(8);
  const sold = st().updateWorld((x) => {
    x.daily[HELP_KEY] = { day: x.day, n: 1 };
    return shopSell(fundOf(x), 3 + Math.random() * 3);
  });
  const grow = st().updateHero((h) => choreGrowth(h, { craft: 'learning', exp: 4 }));
  await ctx.say(
    '你學著梁敬亭的樣子，替客人沏一杯試茶，說說這茶是哪座山、哪股泉水澆出來的。',
    '客人喝了一口，又買了半斤。',
    '（站了一個時辰的櫃台）',
    [`（多賣了 ${sold.n.toFixed(1)} 斤，進帳 ${Math.round(sold.silver)} 兩）`, ...grow, st().updateWorld((x) => addContrib(x, 2))].filter(Boolean).join('\n'),
  );
}

export const liangTalk: Script = async (ctx) => {
  if (!member()) {
    const c = await ctx.ask(liang('客官喝茶還是買茶？本號賣的是鳴泉山上的泉霧茶，泉水澆出來的，別處買不到。')[0], ['買茶', '隨便看看']);
    if (c === 0) await ctx.panel({ kind: 'shop', title: '泉霧茶莊', stock: STOCK });
    return;
  }
  const w = st().world;
  const tea = teaErrand(w);
  const opts: [string, () => Promise<void>][] = [
    ...(tea ? ([[`交茶（${tea.n} 斤）`, () => deliverTea(ctx)]] as [string, () => Promise<void>][]) : []),
    ['買茶（本門八折）', async () => void (await ctx.panel({ kind: 'shop', title: '泉霧茶莊', stock: STOCK, discount: 0.2 }))],
    ['茶莊的生意', () => business(ctx)],
    ['幫忙招呼客人（一個時辰・體力 10）', () => helpCounter(ctx)],
  ];
  const i = await ctx.ask(liang(`是山上來的${w.sect!.post === 'st_out' ? '外務執事' : '同門'}啊。茶莊有什麼要問的？`)[0], [...opts.map((o) => o[0]), '沒事']);
  if (i < opts.length) await opts[i][1]();
};

// ── 青竹村收租：找柳承安 ───────────────────────────────────

async function rentTalk(ctx: EventCtx) {
  const f = fundOf(st().world);
  const due = f.rentDue!;
  const bad = f.crop.f < 0.9;
  if (!bad) {
    await ctx.say(...liu(`鳴泉的${due.season}租？早湊齊了，${due.amount} 兩，你點一點。`, '今年雨水順，鄉親們交得爽快。替我問你們掌門好。'));
    const got = st().updateWorld((w) => collectRent(w, 0));
    addAff('liu', 2);
    await ctx.say(`（收下${due.season}租 ${got} 兩，交進公庫）`, `（${st().updateWorld((w) => addContrib(w, 8))}）`);
    return;
  }
  await ctx.say(...liu(`${due.season}租……唉，今年年成不好，阿牛他們的田收得少。照例是 ${due.amount} 兩，鄉親們湊得很吃力。`));
  const c = await ctx.ask(liu('能不能看在幾十年的情分上，減一些？')[0], [
    `照收（${due.amount} 兩）`,
    `減一成（${Math.round(due.amount * 0.9)} 兩）`,
    `減兩成（${Math.round(due.amount * 0.8)} 兩）`,
  ]);
  const cut = [0, 0.1, 0.2][c];
  const got = st().updateWorld((w) => collectRent(w, cut));
  if (cut === 0) {
    addAff('liu', -3);
    await ctx.say(...liu('……也是，門派上下幾十口人要吃飯。我去跟鄉親們說。'), `（收下${due.season}租 ${got} 兩。柳承安的熟悉度 -3）`);
  } else {
    addAff('liu', cut === 0.2 ? 4 : 2);
    await ctx.hero((h) => ((h.fame += cut === 0.2 ? 2 : 1), `名聲 +${cut === 0.2 ? 2 : 1}。`));
    await ctx.say(...liu('多謝！我替鄉親們謝謝鳴泉。明年風調雨順，一定補上。'), `（收下${due.season}租 ${got} 兩，減了 ${Math.round(due.amount * cut)} 兩）`);
  }
  await ctx.say(`（${st().updateWorld((w) => addContrib(w, 8))}）`);
}

const QZ = () => lifeGroups().find((g) => g.id === 'qingzhu')!;
const prevExtra = QZ().hooks?.extra;
QZ().hooks = {
  ...QZ().hooks,
  extra: (ctx, id, a: Assign | undefined) => {
    const more = prevExtra?.(ctx, id, a) ?? [];
    const w = st().world;
    if (id !== 'liu' || !a || a.act === 'sleep' || !heroOut(w) || !fundOf(w).rentDue) return more;
    return [[`收鳴泉的${fundOf(w).rentDue!.season}租`, () => rentTalk(ctx)], ...more];
  },
};

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const out: { text: string; state: 'todo' | 'done'; note?: string }[] = [];
  const due = world.life?.fund?.rentDue;
  if (due && heroOut(world)) out.push({ text: `下山收${due.season}租：到青竹村找柳承安`, state: 'todo', note: `還有 ${due.due - world.day + 1} 天` });
  const tea = teaErrand(world);
  if (tea) out.push({ text: `送茶進城：${tea.n} 斤茶交給城北泉霧茶莊的梁敬亭`, state: 'todo', note: `還有 ${tea.due - world.day + 1} 天` });
  return out;
});

