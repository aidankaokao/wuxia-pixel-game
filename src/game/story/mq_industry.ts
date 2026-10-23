import { registerConds } from '../conds';
import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import type { World } from '../home';
import { lifeGroups, type Assign } from '../life';
import { by } from '../maps/rooms';
import { addContrib, inSect } from '../sect';
import {
  book,
  ECONOMY,
  eventOn,
  FACILITIES,
  FAC_IDS,
  facLevel,
  facNow,
  fundMood,
  fundOf,
  MATERIAL,
  monthlyOut,
  MOOD_NAME,
  type Economy,
  type FacId,
  type IndEventKind,
  type SectFund,
} from '../sect_fund';
import { clampAff, newRelation } from '../social';
import { dateOf } from '../time';
import { useGame } from '../../state/store';
import { exert, STAMINA } from './estate';
import { crewOf, FOREMAN, setForemanTalk } from './life_mingquan';
import { onSettle, SHOP } from './mq_fund';
import { maybeDayEvent } from './schedule';
import { choreGrowth, MQ } from './sect_mingquan';

/**
 * 鳴泉劍派的產業（4.33）：資源、設施與掌門的經營決策。
 *
 * - 資源：鳴泉山有木頭（南嶺松林）、石頭（南嶺石壁）、草藥（藥圃）、山泉茶（茶園）；沒有鐵礦。
 * - 設施（sect_fund.ts 的 FACILITIES）：伐木場（開局就有一級）、採石場、藥圃擴建、茶園擴建，各兩級。
 *   營造要銀兩、木料、石料（不夠的照價買）與天數；蓋好以後每天付工錢。伐木場、採石場有工頭（樊守林、鄔石生），
 *   白天記名弟子輪流去幫工（life_mingquan.ts 的 crewOf）；你可以找工頭一起幹活（門派貢獻、外功）。
 *   產出與賣出在 mq_fund.ts 的每日結算。
 * - 掌門座位的「門派產業」：營造、拆掉、茶莊開關、月例成數、用度（節儉／照常／開源）、支用公款與歸還。
 *   公私分明：支用公款遲早會被長老查帳發現（同門的交情、功績、年會的票都會受影響）。
 * - 你不是掌門時，掌門每月初一照公庫好壞自己決定：吃緊就節儉、寬裕就營造下一座設施、茶莊收了就重開。
 * - 小事件（一次一件）：山林失火、採石場塌方、找到好石脈、茶價起落、地痞到茶莊鬧事、藥圃鬧蟲害、香客捐獻。
 *   失火、塌方找工頭處理；地痞找泉霧茶莊的梁敬亭（mq_trade.ts 呼叫 thugsTalk）；蟲害幫甘伯禾除蟲（mq_fund.ts）。
 *   沒人處理的，過幾天自己過去（損失多一些）。三處（擲事件、處理腳本、今日事）都在這個檔。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const n0 = (x: number) => Math.round(x).toLocaleString();

function news(w: World, text: string) {
  const ls = (w.life ??= { members: {}, news: [] });
  ls.news = [...ls.news, { day: w.day, text, who: [] }].slice(-20);
}

const LEVEL = ['', '一級', '二級'];
const facText = (f: SectFund, id: FacId) => (facLevel(f, id) ? `${FACILITIES[id].name}（${LEVEL[facLevel(f, id)]}）` : '');

// ── 地圖條件：設施蓋到第幾級（南嶺的木料堆、石料堆，山田多開的茶壟、藥畦） ──────────

registerConds((w) => {
  const f = w.life?.fund;
  return Object.fromEntries(FAC_IDS.map((id) => [`mq_${id}`, f ? facLevel(f, id) : id === 'lumber' ? 1 : 0]));
});

// ── 營造 ──────────────────────────────────────────────

/** 下一級要花多少：銀兩、缺的木料石料照買價折成銀兩 */
export function buildCost(f: SectFund, id: FacId) {
  const L = FACILITIES[id].levels[facLevel(f, id)];
  if (!L) return null;
  const buyWood = Math.max(0, L.wood - (f.wood ?? 0));
  const buyStone = Math.max(0, L.stone - (f.stone ?? 0));
  const silver = L.cost + Math.ceil(buyWood * MATERIAL.wood.buy + buyStone * MATERIAL.stone.buy);
  return { L, buyWood, buyStone, silver, level: facLevel(f, id) + 1 };
}

/** 開工：從公庫扣錢、用掉木料石料，記下完工的日子 */
function startBuild(w: World, id: FacId, who: string) {
  const f = fundOf(w);
  const c = buildCost(f, id)!;
  book(f, 'out', 'build', c.silver);
  f.wood = Math.max(0, (f.wood ?? 0) - c.L.wood);
  f.stone = Math.max(0, (f.stone ?? 0) - c.L.stone);
  f.build = { id, level: c.level, done: w.day + c.L.days };
  news(w, `${who}下令營造${FACILITIES[id].name}${c.level > 1 ? `（擴建到${LEVEL[c.level]}）` : ''}，${c.L.days} 天完工`);
}

/** 拆掉一級：拆下來的木料、石料收回一半 */
function demolish(w: World, id: FacId) {
  const f = fundOf(w);
  const L = facNow(f, id)!;
  f.wood = (f.wood ?? 0) + Math.floor(L.wood / 2);
  f.stone = (f.stone ?? 0) + Math.floor(L.stone / 2);
  f.fac = { ...f.fac, [id]: facLevel(f, id) - 1 };
  news(w, `掌門下令拆了${FACILITIES[id].name}${facLevel(f, id) ? '的擴建' : ''}`);
}

/** 你不是掌門時，掌門照這個順序一座座蓋 */
const NPC_ORDER: [FacId, number][] = [
  ['quarry', 1],
  ['herbs', 1],
  ['teagarden', 1],
  ['lumber', 2],
  ['herbs', 2],
  ['quarry', 2],
  ['teagarden', 2],
];

// ── 小事件 ─────────────────────────────────────────────

const EVENT_CHANCE = 1 / 30;
/** 支用公款被發現的機會：每天基本一分，多拿一千兩多半分 */
const CAUGHT = { base: 0.01, per1000: 0.005, max: 0.08 };

function rollEvent(w: World, rand: () => number) {
  const f = fundOf(w);
  if (f.event || rand() >= EVENT_CHANCE) return;
  const kinds: (IndEventKind | 'donation')[] = ['donation', 'teaprice', 'blight'];
  if (facLevel(f, 'lumber')) kinds.push('fire');
  if (facLevel(f, 'quarry')) kinds.push('collapse', 'vein');
  if (!f.shop?.closed) kinds.push('thugs');
  const k = kinds[Math.floor(rand() * kinds.length)];
  const day = w.day;
  switch (k) {
    case 'donation': {
      const n = 200 + Math.round(rand() * 200);
      book(f, 'in', 'incense', n);
      news(w, `山下一位富商來上香還願，捐了 ${n} 兩香油錢`);
      return;
    }
    case 'fire':
      f.event = { kind: 'fire', day, until: day + 8 };
      f.wood = (f.wood ?? 0) * 0.7;
      news(w, `南嶺的松林起火了，${FOREMAN.lumber}帶人在救，伐木場停工`);
      return;
    case 'collapse':
      f.event = { kind: 'collapse', day, until: day + 10 };
      news(w, `採石場的石壁塌了一角，碎石堵住了場子，${FOREMAN.quarry}說要清好幾天`);
      return;
    case 'vein':
      f.event = { kind: 'vein', day, until: day + 60, mult: 1.6 };
      news(w, `${FOREMAN.quarry}在石壁裡鑿出一道好石脈，石料又整又好打，採石場這兩個月出得多`);
      return;
    case 'teaprice': {
      const up = rand() < 0.5;
      f.event = { kind: 'teaprice', day, until: day + 30, mult: up ? 1.4 : 0.7 };
      news(w, up ? '城裡的茶價漲了，聽說是北方的茶路斷了，這個月泉霧茶好賣' : '南邊的新茶大批進城，茶價跌了，這個月茶賣不起價');
      return;
    }
    case 'thugs':
      f.event = { kind: 'thugs', day, until: day + 10 };
      news(w, '臨江城的地痞蔡三一夥在泉霧茶莊門口鬧事，客人都不敢進門');
      return;
    case 'blight':
      f.event = { kind: 'blight', day, until: day + 10 };
      news(w, `藥圃鬧了蟲害，${MQ.gan}說再不除蟲，這一季的藥材要毀了`);
      return;
  }
}

/** 沒人處理、時候到了：事情自己過去（損失多一些） */
function expireEvent(w: World) {
  const f = fundOf(w);
  const e = f.event;
  if (!e || w.day <= e.until) return;
  delete f.event;
  switch (e.kind) {
    case 'fire':
      return news(w, '南嶺的火總算撲滅了，燒掉不少松木，伐木場重新開工');
    case 'collapse':
      book(f, 'out', 'upkeep', 100);
      return news(w, `採石場的碎石清完了，雇了山下的人手，花了 100 兩`);
    case 'thugs':
      book(f, 'out', 'shopwage', 60);
      return news(w, `${'梁敬亭'}塞了 60 兩給蔡三，破財消災，茶莊重新做生意`);
    case 'blight':
      f.herb = Math.max(0, f.herb - 10);
      return news(w, '藥圃的蟲害過去了，毀了不少藥材');
    case 'vein':
      return news(w, '採石場那道好石脈鑿完了');
    case 'teaprice':
      return news(w, '茶價回到了平常的行情');
  }
}

/** 你在場處理了事情 */
function clearEvent(w: World, kind: IndEventKind) {
  const f = fundOf(w);
  if (f.event?.kind === kind) delete f.event;
}

// ── 每天結算時：完工、小事件、掌門的決策、查帳 ─────────────────

/** 你不是掌門時，掌門每月初一照公庫好壞決定 */
function npcLeaderPlan(w: World) {
  const f = fundOf(w);
  const mood = fundMood(f);
  const want: Economy = mood === 'broke' || mood === 'tight' ? 'thrift' : 'normal';
  if ((f.economy ?? 'normal') !== want) {
    f.economy = want;
    news(w, want === 'thrift' ? '公庫吃緊，掌門吩咐這陣子伙食、修繕都省著用' : '公庫緩過來了，掌門說不必再省得那麼緊');
  }
  if ((f.payScale ?? 1) !== 1 && mood !== 'broke') {
    f.payScale = 1;
    news(w, '掌門吩咐，月例照常發');
  }
  if (f.shop?.closed && (mood === 'ok' || mood === 'rich') && f.silver > REOPEN * 3) {
    book(f, 'out', 'build', REOPEN);
    f.shop.closed = false;
    news(w, `泉霧茶莊重新開張，${'梁敬亭'}又站回了櫃台`);
  }
  if (f.build) return;
  const next = NPC_ORDER.find(([id, lv]) => facLevel(f, id) === lv - 1);
  if (!next) return;
  const c = buildCost(f, next[0]);
  if (c && f.silver - c.silver > monthlyOut(f) * 4) startBuild(w, next[0], '掌門');
}

onSettle((w, rand) => {
  const f = fundOf(w);
  const d = dateOf(w.day);
  // 營造完工
  if (f.build && w.day >= f.build.done) {
    const { id, level } = f.build;
    f.fac = { ...f.fac, [id]: level };
    delete f.build;
    news(w, `${FACILITIES[id].name}${level > 1 ? `擴建到${LEVEL[level]}` : '蓋好了'}${id === 'lumber' || id === 'quarry' ? `，${FOREMAN[id]}帶著工具上了南嶺` : ''}`);
  }
  // 小事件
  expireEvent(w);
  rollEvent(w, rand);
  // 掌門的決策（你不是掌門時）
  if (d.date === 1 && !w.sect?.leader) npcLeaderPlan(w);
  // 風評每月淡一點
  if (d.date === 1 && f.scandal) f.scandal = Math.max(0, f.scandal - 2);
  // 支用的公款：長老遲早會查帳
  if (f.embezzled && rand() < Math.min(CAUGHT.max, CAUGHT.base + (f.embezzled / 1000) * CAUGHT.per1000)) caught(w);
});

/** 長老查帳，發現掌門支走的公款 */
function caught(w: World) {
  const f = fundOf(w);
  const n = f.embezzled ?? 0;
  f.scandal = Math.min(30, (f.scandal ?? 0) + Math.max(3, n / 50));
  delete f.embezzled;
  if (w.sect) w.sect.merit = Math.max(0, w.sect.merit - Math.round(n / 10));
  for (const p of ['han', 'lu', 'wen']) {
    const r = (w.relations[p] ??= newRelation());
    r.aff = clampAff(r.aff - Math.min(15, 4 + Math.round(n / 100)));
  }
  news(w, `${MQ.han}查帳時發現公庫短了 ${n0(n)} 兩，追下去是掌門支走的。門裡議論紛紛`);
}

// ── 南嶺：牌子、木料堆、石料堆 ─────────────────────────────

export const ridgeSign: Script = async (ctx) => {
  const f = fundOf(st().world);
  const has = (id: FacId) => facLevel(f, id) > 0;
  await ctx.say(
    '「南嶺」\n西坡松林・東面石壁\n本門山產，伐木採石歸公庫。',
    [
      has('lumber') ? `伐木場：${LEVEL[facLevel(f, 'lumber')]}，工頭${FOREMAN.lumber}` : '西坡的松林還沒人砍。',
      has('quarry') ? `採石場：${LEVEL[facLevel(f, 'quarry')]}，工頭${FOREMAN.quarry}` : '東面的石壁還沒開採（要掌門下令營造採石場）。',
    ].join('\n'),
  );
};

export const lumberPile: Script = async (ctx) => {
  const f = fundOf(st().world);
  await ctx.say('劈好的松木一層層堆著，切口還滲著松脂，香氣沖鼻。', `（存著木料 ${Math.floor(f.wood ?? 0)} 根；修繕自己用，多的逢九送下山賣）`);
};

export const stonePile: Script = async (ctx) => {
  const f = fundOf(st().world);
  await ctx.say('打好的青石方方正正地疊著，每一塊都鑿了鳴泉的記號。', `（存著石料 ${Math.floor(f.stone ?? 0)} 方；修繕自己用，多的逢九送下山賣）`);
};

// ── 工頭：一起幹活、處理失火與塌方 ───────────────────────────

const RIDGE_HELP = { perDay: 2, contrib: 2, wood: 2, stone: 1 };
const helpKey = (w: World) => `mq:ridge:${w.day}`;
const helped = (w: World) => (w.daily[helpKey(w)]?.day === w.day ? w.daily[helpKey(w)].n : 0);

const WORK = {
  lumber: { name: '伐木', anim: 'chop' as const, grow: { slot: 'outer' as const, exp: 10 } },
  quarry: { name: '採石', anim: 'stone' as const, grow: { slot: 'outer' as const, exp: 12 } },
};

/** 幹一回活：一個時辰，多出幾根木料／幾方石料 */
async function helpWork(ctx: EventCtx, fac: 'lumber' | 'quarry', with_?: string) {
  const w = st().world;
  const job = WORK[fac];
  const boss = by(FOREMAN[fac]);
  if (helped(w) >= RIDGE_HELP.perDay) return void (await ctx.say(...boss('今天你出的力夠多了，剩下的我們來。明天再來吧。')));
  if (w.weather === 'rain' || w.weather === 'snow') return void (await ctx.say(...boss('下雨天山上滑，斧頭、鐵錘都拿不穩，今天收工。')));
  if (!(await exert(ctx, STAMINA.chore, '累得手都抬不起來，這活兒今天是幹不動了。'))) return;
  if (with_) await ctx.say(`你在${with_}旁邊跟著${job.name}，${fac === 'lumber' ? '一人一邊拉大鋸' : '一個扶鑿、一個掄錘'}。`);
  else await ctx.say(...boss(fac === 'lumber' ? '來得好！斧頭在那兒。順著紋理劈，別跟木頭較勁。' : '鐵鑿抵穩了再掄錘，手腕放鬆，力從腰上來。'));
  await ctx.work(job.anim, `${job.name}中……`);
  ctx.pass(8);
  const got = st().updateWorld((x) => {
    x.daily[helpKey(x)] = { day: x.day, n: helped(x) + 1 };
    const f = fundOf(x);
    if (fac === 'lumber') {
      f.wood = (f.wood ?? 0) + RIDGE_HELP.wood;
      return `（多劈了 ${RIDGE_HELP.wood} 根木料）`;
    }
    f.stone = (f.stone ?? 0) + RIDGE_HELP.stone;
    return `（多打了 ${RIDGE_HELP.stone} 方石料）`;
  });
  const grow = st().updateHero((h) => choreGrowth(h, job.grow));
  await ctx.say(
    fac === 'lumber' ? '一斧一斧下去，松木應聲裂開。一個時辰下來，虎口震得發麻。' : '叮、叮、叮……石屑濺了一身。一個時辰下來，一塊青石總算方方正正。',
    '（做了一個時辰）',
  );
  await ctx.say([got, ...grow, st().updateWorld((x) => addContrib(x, RIDGE_HELP.contrib))].filter(Boolean).join('\n'));
  await maybeDayEvent(ctx, 'chore');
}

/** 救火、清理塌方：兩個時辰、體力 25，事情當場解決 */
async function fixEvent(ctx: EventCtx, fac: 'lumber' | 'quarry') {
  const boss = by(FOREMAN[fac]);
  if (!(await exert(ctx, 25, '累得站都站不穩，這時候上去只會添亂。'))) return;
  await ctx.work(fac === 'lumber' ? 'water' : 'stone', fac === 'lumber' ? '救火中……' : '清理碎石中……');
  ctx.pass(16);
  st().updateWorld((x) => clearEvent(x, fac === 'lumber' ? 'fire' : 'collapse'));
  const grow = st().updateHero((h) => choreGrowth(h, { slot: 'outer', exp: 16 }));
  await ctx.say(
    ...(fac === 'lumber'
      ? ['你跟著大家挑水、砍出防火的空帶，煙燻得眼淚直流。', '天黑前，最後一處火頭也滅了。', ...boss('好險！多虧你，不然半片林子都要燒光。明天就能開工。')]
      : ['你跟著大家把碎石一塊塊撬開、搬走，又把鬆動的石壁撐住。', ...boss('清乾淨了！省下雇人的錢。明天照常開鑿。')]),
    '（忙了兩個時辰）',
  );
  await ctx.say([...grow, st().updateWorld((x) => addContrib(x, 10))].filter(Boolean).join('\n'));
}

function ridgeReport(f: SectFund, fac: 'lumber' | 'quarry'): string[] {
  const L = facNow(f, fac)!;
  const crew = crewOf(st().world)[fac];
  const unit = fac === 'lumber' ? '根' : '方';
  const what = fac === 'lumber' ? '木料' : '石料';
  return [
    `場子現在是${LEVEL[facLevel(f, fac)]}，晴天有人幫工，一天出 ${L.out} ${unit}${what}上下；下雨天、旬休出得少。`,
    crew ? `今天門裡派了${nameOf(crew)}來幫工。` : '今天門裡沒派人來，我一個人做，出得少些。',
    `倉裡存著${what} ${Math.floor((fac === 'lumber' ? f.wood : f.stone) ?? 0)} ${unit}。門裡修房子先用，多的韋季安逢九帶下山賣。`,
    ...(fac === 'quarry' && eventOn(f, 'vein') ? ['這陣子鑿到一道好石脈，石料出得特別多。'] : []),
  ];
}

const GROUP = () => lifeGroups().find((g) => g.id === 'mingquan')!;
const nameOf = (id: string) => GROUP().npcs.find((n) => n.id === id)?.name ?? id;

setForemanTalk(async (ctx, fac) => {
  const boss = by(FOREMAN[fac]);
  if (!member()) {
    await ctx.say(...boss(fac === 'lumber' ? '我是鳴泉請來的伐木工頭，姓樊。這片松林是鳴泉的，外人別亂砍。' : '我是鳴泉請來的石匠，姓鄔。石壁上碎石亂飛，站遠點。'));
    return;
  }
  const f = fundOf(st().world);
  const trouble = eventOn(f, fac === 'lumber' ? 'fire' : 'collapse');
  const job = WORK[fac];
  const opts: [string, () => Promise<void>][] = trouble
    ? [[fac === 'lumber' ? '幫忙救火（兩個時辰・體力 25）' : '幫忙清理塌方（兩個時辰・體力 25）', () => fixEvent(ctx, fac)]]
    : [[`幫忙${job.name}（一個時辰・體力 ${STAMINA.chore}）${helped(st().world) >= RIDGE_HELP.perDay ? '（今天做夠了）' : ''}`, () => helpWork(ctx, fac)]];
  opts.push(['場子的情形', async () => void (await ctx.say(...boss(...ridgeReport(f, fac))))]);
  const greet = trouble
    ? fac === 'lumber'
      ? '火還沒滅！人手不夠，能幫就幫一把！'
      : '石壁塌了一角，碎石堵著，什麼都做不了。'
    : fac === 'lumber'
      ? '松木要趁天晴砍，有什麼事？'
      : '鑿石頭急不得，有什麼事？';
  const i = await ctx.ask(boss(greet)[0], [...opts.map((o) => o[0]), '沒事']);
  if (i < opts.length) await opts[i][1]();
});

// 在南嶺幫工的同門：可以一起做
const prevExtra = GROUP().hooks?.extra;
GROUP().hooks = {
  ...GROUP().hooks,
  extra: (ctx, id, a: Assign | undefined) => {
    const more = prevExtra?.(ctx, id, a) ?? [];
    if (!member() || !a || (a.act !== 'chop' && a.act !== 'quarry') || id === 'fan' || id === 'wu') return more;
    const fac = a.act === 'chop' ? 'lumber' : 'quarry';
    return [[`一起${WORK[fac].name}（一個時辰）`, () => helpWork(ctx, fac, nameOf(id))], ...more];
  },
};

// ── 泉霧茶莊的地痞（mq_trade.ts 的梁敬亭呼叫） ─────────────────

const CAI = by('蔡三');
/** 茶莊有地痞鬧事時，梁敬亭的選項；沒事回傳 null */
export function thugsOption(ctx: EventCtx): [string, () => Promise<void>] | null {
  if (!eventOn(fundOf(st().world), 'thugs')) return null;
  return ['趕走門口的地痞', () => thugsTalk(ctx)];
}

async function thugsTalk(ctx: EventCtx) {
  await ctx.say(...by('梁敬亭')('蔡三那夥人天天堵在門口，說這條街的茶莊都要交「茶水錢」。客人一個都不敢進來。'), '你走出門口。蔡三蹺著腳坐在茶莊的長凳上，幾個手下圍著門。');
  await ctx.say(...CAI('喲，鳴泉的人？山上的劍客也管山下的買賣？識相的，一個月二十兩，保你們平安。'));
  const o = await ctx.battle('shop_ruffians');
  if (o === 'win') {
    st().updateWorld((x) => clearEvent(x, 'thugs'));
    await ctx.say(...CAI('哎喲……鳴泉的爺，小的再也不敢了！'), '蔡三一夥連滾帶爬地跑了。對門的掌櫃探出頭來，衝你拱了拱手。');
    await ctx.hero((h) => ((h.fame += 2), '名聲 +2。'));
    await ctx.say(`（${st().updateWorld((x) => addContrib(x, 8))}）`);
    return;
  }
  await ctx.say(...CAI('鳴泉的劍也不過如此！明天再來收錢！'), '（地痞還在門口，茶莊照樣沒生意）');
}

// ── 掌門座位：門派產業（mq_posts.ts 呼叫） ──────────────────────

const REOPEN = 100;
/** 一次能支用多少公款 */
const TAKE = [100, 300, 1000];

function summary(w: World): string {
  const f = fundOf(w);
  const built = FAC_IDS.map((id) => facText(f, id)).filter(Boolean);
  const lines = [
    `公庫存銀 ${n0(f.silver)} 兩（${MOOD_NAME[fundMood(f)]}），木料 ${Math.floor(f.wood ?? 0)} 根、石料 ${Math.floor(f.stone ?? 0)} 方、藥材 ${Math.floor(f.herb)} 份。`,
    `產業：${built.join('、') || '沒有'}；泉霧茶莊${f.shop?.closed ? '收著' : '開著'}。`,
    `月例${payText(f)}，用度${ECONOMY[f.economy ?? 'normal'].name}。`,
  ];
  if (f.build) lines.push(`營造中：${FACILITIES[f.build.id].name}（${LEVEL[f.build.level]}），還要 ${Math.max(1, f.build.done - w.day)} 天。`);
  if (f.event && f.event.kind !== 'vein' && f.event.kind !== 'teaprice') lines.push(`眼下的麻煩：${EVENT_NAME[f.event.kind]}`);
  return lines.join('\n');
}
const payText = (f: SectFund) => ((f.payScale ?? 1) > 1 ? '多發兩成' : (f.payScale ?? 1) < 1 ? '少發兩成' : '照常');
const EVENT_NAME: Record<IndEventKind, string> = {
  fire: '南嶺松林失火',
  collapse: '採石場塌方',
  vein: '採石場鑿到好石脈',
  teaprice: '茶價起落',
  thugs: '地痞在茶莊鬧事',
  blight: '藥圃鬧蟲害',
};

async function buildMenu(ctx: EventCtx) {
  const f = fundOf(st().world);
  if (f.build) return void (await ctx.say(`${FACILITIES[f.build.id].name}還在營造，一次只蓋一處。`));
  const ids = FAC_IDS.filter((id) => buildCost(f, id));
  if (!ids.length) return void (await ctx.say('各處產業都已經蓋到最好了。'));
  const i = await ctx.ask(
    '要營造哪一處？（不夠的木料、石料照價向山下買）',
    [
      ...ids.map((id) => {
        const c = buildCost(f, id)!;
        return `${FACILITIES[id].name}${c.level > 1 ? '擴建' : ''}（${LEVEL[c.level]}）：${n0(c.silver)} 兩${c.L.wood ? `、木料 ${c.L.wood}` : ''}${c.L.stone ? `、石料 ${c.L.stone}` : ''}，${c.L.days} 天`;
      }),
      '算了',
    ],
  );
  if (i >= ids.length) return;
  const id = ids[i];
  const c = buildCost(f, id)!;
  await ctx.say(`${FACILITIES[id].name}：${FACILITIES[id].desc}\n在${FACILITIES[id].where}。蓋好後每天工錢 ${c.L.upkeep} 兩${c.buyWood || c.buyStone ? `；木料、石料不夠，要另外買（已算在 ${n0(c.silver)} 兩裡）` : ''}。`);
  if (f.silver < c.silver) return void (await ctx.say(`公庫只剩 ${n0(f.silver)} 兩，不夠。`));
  if ((await ctx.ask('動工嗎？', ['動工', '再想想'])) !== 0) return;
  st().updateWorld((x) => startBuild(x, id, '掌門'));
  await ctx.say(`你吩咐${MQ.ke}找人動工。${FACILITIES[id].name}${c.L.days} 天後完工。`);
}

async function demolishMenu(ctx: EventCtx) {
  const f = fundOf(st().world);
  const ids = FAC_IDS.filter((id) => facLevel(f, id) > 0);
  if (!ids.length) return void (await ctx.say('沒有可以拆的產業。'));
  const i = await ctx.ask('要拆掉哪一處？（拆一級；拆下來的木料、石料收回一半，往後不用再付工錢）', [...ids.map((id) => `${facText(f, id)}：每天工錢 ${facNow(f, id)!.upkeep} 兩`), '算了']);
  if (i >= ids.length) return;
  if ((await ctx.ask(`真的要拆${FACILITIES[ids[i]].name}？`, ['拆', '不拆了'])) !== 0) return;
  st().updateWorld((x) => demolish(x, ids[i]));
  await ctx.say(`你下令拆了${FACILITIES[ids[i]].name}${facLevel(fundOf(st().world), ids[i]) ? '的擴建' : ''}。`);
}

async function shopMenu(ctx: EventCtx) {
  const f = fundOf(st().world);
  if (f.shop?.closed) {
    if ((await ctx.ask(`泉霧茶莊收著。重新開張要 ${REOPEN} 兩（整理門面、請回夥計）。`, ['重新開張', '再等等'])) !== 0) return;
    if (f.silver < REOPEN) return void (await ctx.say('公庫不夠。'));
    st().updateWorld((x) => {
      const g = fundOf(x);
      book(g, 'out', 'build', REOPEN);
      g.shop!.closed = false;
      news(x, '掌門下令泉霧茶莊重新開張');
    });
    return void (await ctx.say('泉霧茶莊重新開張。'));
  }
  const c = await ctx.ask(`泉霧茶莊開著：零賣比整批賣給茶行多五成，夥計工錢一天 ${SHOP.wage} 兩。收起來的話，茶都整批賣給茶行。`, ['收起茶莊', '照常開著']);
  if (c !== 0) return;
  st().updateWorld((x) => {
    fundOf(x).shop!.closed = true;
    news(x, '掌門下令收了泉霧茶莊，山上的茶改成整批賣給茶行');
  });
  await ctx.say(`你吩咐${'梁敬亭'}收了茶莊。往後的茶整批賣給茶行。`);
}

async function payMenu(ctx: EventCtx) {
  const f = fundOf(st().world);
  const scales = [1.2, 1, 0.8];
  const i = await ctx.ask(`月例現在${payText(f)}。（多發，同門長進快一點；少發，公庫省一些，大家長進慢一點）`, ['多發兩成', '照常', '少發兩成', '不改']);
  if (i >= scales.length || scales[i] === (f.payScale ?? 1)) return;
  st().updateWorld((x) => {
    fundOf(x).payScale = scales[i];
    news(x, i === 0 ? '掌門吩咐，月例多發兩成' : i === 1 ? '掌門吩咐，月例照常發' : '掌門吩咐，這陣子月例少發兩成');
  });
  if (i === 2) for (const p of ['lu', 'han']) addAff(p, -2);
  await ctx.say(`你當眾宣布：「往後月例${['多發兩成', '照常發', '少發兩成'][i]}。」${i === 2 ? '底下有人低聲嘀咕。' : i === 0 ? '弟子們喜形於色。' : ''}`);
}

async function economyMenu(ctx: EventCtx) {
  const cur = fundOf(st().world).economy ?? 'normal';
  const keys = Object.keys(ECONOMY) as Economy[];
  const i = await ctx.ask(`門裡的用度現在是「${ECONOMY[cur].name}」。`, [...keys.map((k) => `${ECONOMY[k].name}：${ECONOMY[k].desc}`), '不改']);
  if (i >= keys.length || keys[i] === cur) return;
  st().updateWorld((x) => {
    fundOf(x).economy = keys[i];
    news(x, `掌門吩咐，往後門裡的用度${ECONOMY[keys[i]].name}`);
  });
  await ctx.say(`你吩咐${MQ.ke}：往後門裡的用度，${ECONOMY[keys[i]].name}。`);
}

function addAff(person: string, n: number) {
  st().updateWorld((w) => {
    const r = (w.relations[person] ??= newRelation());
    r.aff = clampAff(r.aff + n);
  });
}

/** 支用公款：錢進你的口袋，帳上記「掌門支用」，遲早會被查到 */
async function takeMenu(ctx: EventCtx) {
  const f = fundOf(st().world);
  const owed = f.embezzled ?? 0;
  if (owed > 0) {
    const c = await ctx.ask(`你先前從公庫支了 ${n0(owed)} 兩，帳上還掛著。`, [`歸還 ${n0(owed)} 兩`, '再支一些', '算了']);
    if (c === 0) {
      if (st().hero.silver < owed) return void (await ctx.say(`你身上只有 ${n0(st().hero.silver)} 兩，不夠還。`));
      await ctx.hero((h) => ((h.silver -= owed), `銀兩 -${n0(owed)}。`));
      st().updateWorld((x) => {
        const g = fundOf(x);
        book(g, 'in', 'donate', owed);
        delete g.embezzled;
      });
      return void (await ctx.say('你悄悄把錢放回公庫，帳也補平了。'));
    }
    if (c !== 1) return;
  }
  const opts = TAKE.filter((n) => f.silver - n > 0);
  const i = await ctx.ask('支用公款？（公私分明：掌門拿公庫的錢，長老查帳遲早會發現）', [...opts.map((n) => `支 ${n0(n)} 兩`), '算了']);
  if (i >= opts.length) return;
  const n = opts[i];
  st().updateWorld((x) => {
    const g = fundOf(x);
    book(g, 'out', 'leader', n);
    g.embezzled = (g.embezzled ?? 0) + n;
  });
  await ctx.hero((h) => ((h.silver += n), `銀兩 +${n0(n)}。`));
  await ctx.say('你從公庫取了錢。帳上記著「掌門支用」四個字，墨跡還沒乾。');
}

/** 掌門座位的「門派產業」 */
export async function industryMenu(ctx: EventCtx) {
  for (;;) {
    const w = st().world;
    const f = fundOf(w);
    const opts: [string, () => Promise<void>][] = [
      [f.build ? `營造（${FACILITIES[f.build.id].name}還在蓋）` : '營造', () => buildMenu(ctx)],
      ['拆掉', () => demolishMenu(ctx)],
      [f.shop?.closed ? '泉霧茶莊（收著）' : '泉霧茶莊（開著）', () => shopMenu(ctx)],
      ['月例', () => payMenu(ctx)],
      ['用度', () => economyMenu(ctx)],
      [f.embezzled ? `公款（支了 ${n0(f.embezzled)} 兩）` : '支用公款', () => takeMenu(ctx)],
    ];
    const i = await ctx.ask(summary(w), [...opts.map((o) => o[0]), '起身']);
    if (i >= opts.length) return;
    await opts[i][1]();
  }
}

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const f = world.life?.fund;
  if (!f?.event) return [];
  const left = `還有 ${f.event.until - world.day + 1} 天`;
  switch (f.event.kind) {
    case 'fire':
      return [{ text: `南嶺失火：找伐木場的${FOREMAN.lumber}幫忙救火`, state: 'todo', note: left }];
    case 'collapse':
      return [{ text: `採石場塌方：找${FOREMAN.quarry}幫忙清理`, state: 'todo', note: left }];
    case 'thugs':
      return [{ text: '地痞在泉霧茶莊鬧事：到臨江城城北找梁敬亭', state: 'todo', note: left }];
    case 'blight':
      return [{ text: `藥圃鬧蟲害：到山田找${MQ.gan}幫忙除蟲`, state: 'todo', note: left }];
    default:
      return [];
  }
});
