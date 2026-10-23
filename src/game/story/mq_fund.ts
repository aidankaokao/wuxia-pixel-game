import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import type { World } from '../home';
import { lifeGroups, type Assign } from '../life';
import { by } from '../maps/rooms';
import { addContrib, inSect, roster } from '../sect';
import { book, eventOn, FAC_IDS, facNow, fundMood, fundOf, MATERIAL, monthKey, payRate, teaSeason, type FundMood, type SectFund } from '../sect_fund';
import { dateOf, festivalOf, isXunxiu, onNewDay } from '../time';
import { useGame } from '../../state/store';
import type { WorkKind } from '../art/work';
import { exert, STAMINA } from './estate';
import { maybeDayEvent } from './schedule';
import { choreGrowth, MINGQUAN, MQ } from './sect_mingquan';
import { crewOf, setFarmTalk } from './life_mingquan';
import './mq_order';

/**
 * 鳴泉劍派的公庫（4.31）：門派要養活自己。
 *
 * - 收入：後山東坡的茶園（泉霧茶，明前、雨前最值錢）——韋季安每逢初九、十九、廿九把製茶房的茶送進臨江城的
 *   泉霧茶莊（4.32），茶莊每天零賣幾斤，比整批賣給茶行多五成，架上擺不下的才整批賣；
 *   青竹村祖田的田租（六月初一夏租、十月初一冬租，看年成；你是外務執事就要親自下山找柳承安收）、
 *   香客的香火錢、同門接委託與蘇長老行醫的謝禮、你的捐輸。
 * - 支出：月例（照名冊上每個人的位階，每天攤一份；你的月例領的時候才記）、伙食、存糧不夠時買糧、
 *   藥材不夠時買藥、修繕雜項、茶莊工錢。
 * - 山田：水田五月初十夏收麥、九月初一秋收稻，藥圃每天長一點（冬天幾乎不長）；
 *   甘伯禾照管，你可以找他幫忙（採茶、下田、照料藥圃），一天兩回。下田的照料讓今年收成多一成到兩成。
 * - 公庫寬裕、吃緊、見底會影響同門長進（sect_fund.ts 的 fundGrowth）；見底時月例只發一半。
 * - 門派產業（4.33）：南嶺的伐木場、採石場每天出木料、石料（看有沒有記名弟子幫工、天氣、旬休），
 *   擴建的藥圃多長藥材、擴建的茶園多採茶；設施每天付工錢。木料、石料先拿來修繕（修繕雜項少一兩），
 *   多的跟藥材一起逢九送下山賣。掌門定的用度（節儉／開源）、月例成數、茶莊開關也在這裡生效。
 *   營造、小事件、掌門的決策在 story/mq_industry.ts（用 onSettle 掛進每天的結算）。
 * 開銷、收入的數值都在這個檔的開頭。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const gan = by(MQ.gan);

// ── 數值 ────────────────────────────────────────────────

/** 不在名冊上的記名弟子（名冊註明「另有十來人」），只吃飯、不領月例 */
const EXTRA_PUPILS = 12;
/** 每人每天吃多少糧（石）、菜肉油鹽多少錢 */
const GRAIN_PER_HEAD = 0.02;
const FOOD_PER_HEAD = 0.06;
/** 存糧、藥材不夠時的買價 */
const GRAIN_PRICE = 1.6;
const HERB_PRICE = 2;
/** 每週月例：長老、太上長老、雜役（弟子照 MINGQUAN.ranks；掌門不領） */
const PAY: Record<string, number> = { 掌門: 0, 太上長老: 20, 長老: 30, 雜役: 4 };
/** 藥圃一天長幾份（冬天少）、藥房一天用幾份 */
const HERB_GROW = 1.2;
const HERB_WINTER = 0.3;
const HERB_USE = 1;
/** 夏收麥、秋收稻（石，乘上年成） */
const HARVEST = { summer: { month: 4, date: 10, grain: 60 }, autumn: { month: 8, date: 1, grain: 200 } };
/** 田租（兩，乘上年成） */
const RENT = { summer: { month: 5, date: 1, silver: 3000 }, winter: { month: 9, date: 1, silver: 6200 } };
/** 外務執事收租的期限（天） */
const RENT_DAYS = 10;
/** 泉霧茶莊：架上最多擺幾斤、一天平均賣幾斤、零賣比整批賣多幾成、夥計與掌櫃一天的工錢 */
export const SHOP = { cap: 150, demand: 5, retail: 1.5, wage: 2 };
/** 能接委託的人一天平均帶回多少（兩）；產業做起來以後調回較低的水準（4.33） */
const WORK_PER_HEAD = 0.45;
/** 留著自己用的木料、石料、藥材，多的才賣 */
const KEEP = { wood: 30, stone: 20, herb: 40 };
/** 多的藥材賣給藥鋪的價錢 */
const HERB_SELL = 1.5;
/** 修繕用自己的木料、石料：一天用多少，修繕雜項少幾兩 */
const REPAIR = { wood: 0.3, stone: 0.08, save: 1 };
/** 用度：節儉時伙食、修繕的成數；開源時委託、產業的成數 */
const THRIFT = { food: 0.8, upkeep: 0.7 };
const ENTERPRISE = { work: 1.4, fac: 1.15 };
/** 你幫忙一回：採茶多幾斤、照料加幾成收成、藥圃多幾份；一天最多幾回 */
const HELP = { tea: 3, care: 0.01, careMax: 0.2, herb: 3, perDay: 2, contrib: 2 };

/** 四月到九月是田裡忙的時候 */
const growing = (day: number) => {
  const m = dateOf(day).month;
  return m >= 3 && m <= 8;
};
const winter = (day: number) => [10, 11, 0].includes(dateOf(day).month);

/** 名冊上的人（不含你）照位階每週領多少；久未回山的不算 */
function weeklyPay(w: World): number {
  let sum = 0;
  for (const g of roster(MINGQUAN, undefined, '', w))
    for (const m of g.members) {
      if (m.note?.includes('久未回山')) continue;
      sum += PAY[g.rank] ?? MINGQUAN.ranks.find((r) => r.name === g.rank)?.stipend.silver ?? 0;
    }
  return sum;
}
const heads = (w: World) => roster(MINGQUAN, undefined, '', w).reduce((n, g) => n + g.members.length, 0) + EXTRA_PUPILS + (inSect(w, 'mingquan') ? 1 : 0);
/** 能接委託、出去行醫的人（正式弟子以上、長老） */
const capable = (w: World) =>
  roster(MINGQUAN, undefined, '', w)
    .filter((g) => !['記名弟子', '雜役', '掌門'].includes(g.rank))
    .reduce((n, g) => n + g.members.length, 0);

function news(w: World, text: string) {
  const ls = (w.life ??= { members: {}, news: [] });
  ls.news = [...ls.news, { day: w.day, text, who: [] }].slice(-20);
}

/** 你現在是不是外務執事（收租、送茶的差事落在你身上） */
export const heroOut = (w: World) => w.sect?.id === 'mingquan' && w.sect.post === 'st_out' && !w.sect.leader;

/** 茶莊賣掉幾斤（最多賣到架上沒有）；回傳賣了幾斤、得了幾兩 */
export function shopSell(f: SectFund, want: number): { n: number; silver: number } {
  const shop = f.shop!;
  const n = Math.min(want, shop.tea);
  if (n <= 0) return { n: 0, silver: 0 };
  const v = (shop.teaValue / shop.tea) * n;
  shop.tea -= n;
  shop.teaValue -= v;
  shop.sold += n;
  const silver = v * SHOP.retail * teaPrice(f);
  book(f, 'in', 'shop', silver);
  return { n, silver };
}

/** 茶價：碰上茶價大起大落時的倍數 */
export const teaPrice = (f: SectFund) => eventOn(f, 'teaprice')?.mult ?? 1;

/** 每天結算時順帶要做的事（營造完工、小事件、掌門的決策；story/mq_industry.ts 掛進來，模擬也會跑到） */
const SETTLE_HOOKS: ((w: World, rand: () => number) => void)[] = [];
export const onSettle = (f: (w: World, rand: () => number) => void) => void SETTLE_HOOKS.push(f);

/** 收下田租（cut 是減免幾成，0–1） */
export function collectRent(w: World, cut: number): number {
  const f = fundOf(w);
  const due = f.rentDue;
  if (!due) return 0;
  const got = Math.round(due.amount * (1 - cut));
  book(f, 'in', 'rent', got);
  delete f.rentDue;
  return got;
}

const MOOD_NEWS: Partial<Record<FundMood, string>> = {
  rich: '公庫寬裕，卜大勺的伙食裡多了肉',
  tight: '公庫吃緊，柯靜言說這陣子什麼都要省著用',
  broke: '公庫見底了，這陣子月例只能發一半',
};

// ── 每天半夜結算 ─────────────────────────────────────────

/** 結算一天（給 onNewDay 與模擬用）：昨天的產出、今天的開銷與收入 */
export function settleFund(w: World, rand: () => number = Math.random) {
  const f = fundOf(w);
  const d = dateOf(w.day);
  // 換月：把上個月的帳收起來
  if (monthKey(w.day) !== f.month.key) {
    f.books = [...f.books, { ...f.month, silver: Math.round(f.silver) }].slice(-12);
    f.month = { key: monthKey(w.day), in: {}, out: {} };
    if (f.shop) f.shop.sold = 0;
  }
  // 換年：擲今年的年成
  if (f.crop.year !== d.year) f.crop = { year: d.year, f: 0.8 + rand() * 0.35, care: 0 };
  const wet = w.weather === 'rain' || w.weather === 'snow';
  const eco = f.economy ?? 'normal';
  // 昨天採的茶（下雨不採；擴建過的茶園採得多）
  const tea = teaSeason(w.day - 1);
  if (tea && !wet) {
    const n = tea.per * (0.8 + rand() * 0.4) * (1 + (facNow(f, 'teagarden')?.out ?? 0));
    f.tea += n;
    f.teaValue += n * tea.price;
  }
  // 藥圃長的（擴建的藥畦多長；鬧蟲害時不長）、藥房用的
  const herbF = winter(w.day - 1) ? HERB_WINTER / HERB_GROW : 1;
  if (!eventOn(f, 'blight')) f.herb += (HERB_GROW + (facNow(f, 'herbs')?.out ?? 0)) * herbF;
  f.herb -= HERB_USE;
  if (f.herb < 0) {
    book(f, 'out', 'med', -f.herb * HERB_PRICE);
    f.herb = 0;
  }
  // 吃飯
  const n = heads(w);
  f.grain -= n * GRAIN_PER_HEAD;
  if (f.grain < 0) {
    book(f, 'out', 'grain', -f.grain * GRAIN_PRICE);
    f.grain = 0;
  }
  book(f, 'out', 'food', n * FOOD_PER_HEAD * (eco === 'thrift' ? THRIFT.food : 1));
  // 月例（每天攤一份；照掌門定的成數，見底只發一半）
  book(f, 'out', 'pay', (weeklyPay(w) / 7) * payRate(f));
  // 修繕雜項：有自己的木料、石料就少花一些
  let upkeep = 1.5 + rand();
  if ((f.wood ?? 0) >= REPAIR.wood && (f.stone ?? 0) >= REPAIR.stone) {
    f.wood! -= REPAIR.wood;
    f.stone! -= REPAIR.stone;
    upkeep -= REPAIR.save;
  }
  book(f, 'out', 'upkeep', upkeep * (eco === 'thrift' ? THRIFT.upkeep : 1));
  // 香火（節慶多）、委託行醫（開源時多接）
  book(f, 'in', 'incense', (3 + rand() * 6) * (festivalOf(w.day) ? 4 : 1));
  book(f, 'in', 'work', capable(w) * WORK_PER_HEAD * (0.5 + rand()) * (eco === 'enterprise' ? ENTERPRISE.work : 1));
  // 南嶺的伐木場、採石場：昨天的產出（有人幫工才出得足；下雨、旬休少；失火、塌方停工），每座設施付工錢
  const crew = crewOf(w, w.day - 1);
  for (const id of FAC_IDS) {
    const lv = facNow(f, id);
    if (!lv) continue;
    book(f, 'out', 'facility', lv.upkeep);
    if (id !== 'lumber' && id !== 'quarry') continue;
    if (eventOn(f, id === 'lumber' ? 'fire' : 'collapse')) continue;
    const vein = id === 'quarry' ? (eventOn(f, 'vein')?.mult ?? 1) : 1;
    const got = lv.out * (crew[id] ? 1 : 0.7) * (wet ? 0.3 : 1) * (isXunxiu(w.day - 1) ? 0.5 : 1) * (eco === 'enterprise' ? ENTERPRISE.fac : 1) * vein * (0.85 + rand() * 0.3);
    if (id === 'lumber') f.wood = (f.wood ?? 0) + got;
    else f.stone = (f.stone ?? 0) + got;
  }
  // 收成
  const yieldOf = (g: number) => Math.round(g * (f.crop.f + f.crop.care));
  for (const [k, h] of Object.entries(HARVEST))
    if (d.month === h.month && d.date === h.date) {
      const got = yieldOf(h.grain);
      f.grain += got;
      news(w, `山田的${k === 'summer' ? '麥子' : '稻子'}收了，入倉 ${got} 石`);
    }
  // 田租：你是外務執事就等你下山收（十天內），否則照常收進來
  for (const [k, r] of Object.entries(RENT))
    if (d.month === r.month && d.date === r.date) {
      const season = k === 'summer' ? '夏' : '冬';
      const amount = Math.round(r.silver * f.crop.f);
      if (heroOut(w)) {
        f.rentDue = { season, amount, due: w.day + RENT_DAYS - 1 };
        news(w, `${season}租該收了，外務執事要下山到青竹村找柳承安收租`);
      } else {
        book(f, 'in', 'rent', amount);
        news(w, `青竹村的佃戶送來${season}租 ${amount} 兩${f.crop.f < 0.9 ? '（年成不好，少收了些）' : ''}`);
      }
    }
  if (f.rentDue && w.day > f.rentDue.due) {
    book(f, 'in', 'rent', f.rentDue.amount);
    news(w, `${f.rentDue.season}租拖著沒收，${MQ.wei}代外務執事下山收了 ${f.rentDue.amount} 兩`);
    delete f.rentDue;
  }
  // 初九、十九、廿九：韋季安下山時把製茶房的茶送進城裡的茶莊；茶莊架上擺不下的（或茶莊收了）整批賣給茶行
  // 多的木料、石料、藥材也一起帶下山賣
  const shop = f.shop!;
  if (d.date % 10 === 9) {
    if (f.tea >= 1) {
      shop.tea += f.tea;
      shop.teaValue += f.teaValue;
      news(w, shop.closed ? `${MQ.wei}把 ${Math.round(f.tea)} 斤茶整批賣給了城裡的茶行` : `${MQ.wei}把 ${Math.round(f.tea)} 斤茶送進臨江城的泉霧茶莊`);
      f.tea = 0;
      f.teaValue = 0;
    }
    for (const k of ['wood', 'stone'] as const) {
      const extra = (f[k] ?? 0) - KEEP[k];
      if (extra < 1) continue;
      book(f, 'in', k, Math.floor(extra) * MATERIAL[k].sell * (0.9 + rand() * 0.2));
      f[k] = (f[k] ?? 0) - Math.floor(extra);
    }
    if (f.herb - KEEP.herb >= 1) {
      const extra = Math.floor(f.herb - KEEP.herb);
      book(f, 'in', 'herbsale', extra * HERB_SELL * (0.9 + rand() * 0.2));
      f.herb -= extra;
    }
  }
  const cap = shop.closed ? 0 : SHOP.cap;
  if (shop.tea > cap) {
    const n = shop.tea - cap;
    const v = (shop.teaValue / shop.tea) * n;
    book(f, 'in', 'tea', v * (0.9 + rand() * 0.2) * teaPrice(f));
    shop.tea -= n;
    shop.teaValue -= v;
  }
  // 茶莊零賣：一天幾斤（旬休趕集、節慶多），比整批賣給茶行多五成；夥計工錢照付（地痞鬧事時沒生意）；收起來就不用付
  if (!shop.closed) {
    if (!eventOn(f, 'thugs')) shopSell(f, SHOP.demand * (0.6 + rand() * 0.8) * (isXunxiu(w.day) ? 1.8 : 1) * (festivalOf(w.day) ? 1.5 : 1));
    book(f, 'out', 'shopwage', SHOP.wage);
  }
  for (const h of SETTLE_HOOKS) h(w, rand);
  // 公庫好壞變了，門派裡會傳開
  const mood = fundMood(f);
  if (f.mood && mood !== f.mood) {
    const text = MOOD_NEWS[mood] ?? (f.mood === 'tight' || f.mood === 'broke' ? '公庫總算緩過來了' : '');
    if (text) news(w, text);
  }
  f.mood = mood;
}

onNewDay((w) => settleFund(w));

// ── 甘伯禾：山田的活兒 ─────────────────────────────────────

type Job = { id: 'tea' | 'field' | 'herb'; name: string; work: WorkKind };
/** 這個時節山田最缺人做什麼 */
function jobNow(day: number): Job {
  if (teaSeason(day)) return { id: 'tea', name: '採茶', work: 'herbs' };
  if (growing(day)) return { id: 'field', name: '下田', work: 'garden' };
  return { id: 'herb', name: '照料藥圃', work: 'herbs' };
}
const JOB_LINES: Record<Job['id'], (day: number) => string[]> = {
  tea: (day) => {
    const t = teaSeason(day)!;
    return t.price >= 7
      ? [`你背起竹簍，在茶壟間一芽一葉地採。${t.name}嫩得掐得出水，指尖沾滿了茶香。`, '一個時辰下來，竹簍裡鋪了薄薄一層。']
      : [`${t.name}的葉子粗些，不必挑得那麼細。你背著竹簍在茶壟間來回，手上越採越快。`, '一個時辰下來，竹簍裝了大半簍。'];
  },
  field: (day) => [
    dateOf(day).month <= 4 ? '你挽起褲管下田插秧，一株株秧苗排得筆直。' : '你在田裡拔草、疏通水溝，太陽曬得背上發燙。',
    '彎腰彎了一個時辰，起身時腰都直不起來了。',
  ],
  herb: () => ['你給藥圃鬆土、蓋上稻草擋霜，又把田埂被雨沖垮的地方補好。', '冬天的山田冷清，倒是幹活的好時候。'],
};
const JOB_GROW = {
  tea: { slot: 'light' as const, exp: 8 },
  field: { slot: 'outer' as const, exp: 10 },
  herb: { craft: 'learning' as const, exp: 4 },
};
const helpKey = (w: World) => `mq:field:${w.day}`;
const helped = (w: World) => (w.daily[helpKey(w)]?.day === w.day ? w.daily[helpKey(w)].n : 0);

/** 做一回山田的活兒：幫甘伯禾，或在正在做事的同門旁邊一起做（who 是他的名字） */
async function helpOnce(ctx: EventCtx, who?: string) {
  const w = st().world;
  const job = jobNow(w.day);
  if (helped(w) >= HELP.perDay) return void (await ctx.say(...gan('今天的活兒差不多了，剩下的我自己來。明天再來吧。')));
  if (w.weather === 'rain' || w.weather === 'snow') return void (await ctx.say(...gan('下著雨，茶菁採下來會悶壞，田裡也踩不得。改天吧。')));
  if (!(await exert(ctx, STAMINA.chore, '累得腰都直不起來，這活兒今天是幹不動了。'))) return;
  // 藥圃鬧蟲害（mq_industry.ts 的小事件）：先除蟲，事情就解決了
  if (eventOn(fundOf(w), 'blight')) {
    await ctx.say(...gan('先別管別的，藥圃的蟲要緊！拿這把草木灰，一株株撒在葉子底下。'));
    await ctx.work('herbs', '除蟲中……');
    ctx.pass(8);
    st().updateWorld((x) => {
      x.daily[helpKey(x)] = { day: x.day, n: helped(x) + 1 };
      delete fundOf(x).event;
    });
    const grow = st().updateHero((h) => choreGrowth(h, { craft: 'learning', exp: 6 }));
    await ctx.say('你蹲在藥畦間，一片片翻開葉子撒灰、捉蟲。一個時辰下來，蟲總算除乾淨了。', ...gan('好！這一季的藥材保住了。'), '（做了一個時辰）');
    await ctx.say([...grow, st().updateWorld((x) => addContrib(x, 8))].filter(Boolean).join('\n'));
    return;
  }
  if (who) await ctx.say(`你在${who}旁邊跟著${job.name}，兩人一邊做一邊閒聊。`);
  else await ctx.say(...gan(job.id === 'tea' ? '來得正好！竹簍在那兒，只採一芽一葉，老葉別碰。' : job.id === 'field' ? '田裡正缺人手。鞋脫了，跟我下來。' : '冬天沒什麼好採的，幫我把藥圃和田埂收拾收拾。'));
  await ctx.work(job.work, `${job.name}中……`);
  ctx.pass(8);
  const effect = st().updateWorld((x) => {
    x.daily[helpKey(x)] = { day: x.day, n: helped(x) + 1 };
    const f = fundOf(x);
    if (job.id === 'tea') {
      const t = teaSeason(x.day)!;
      f.tea += HELP.tea;
      f.teaValue += HELP.tea * t.price;
      return `（多採了 ${HELP.tea} 斤${t.name}，約值 ${Math.round(HELP.tea * t.price)} 兩）`;
    }
    if (job.id === 'field') {
      f.crop.care = Math.min(HELP.careMax, f.crop.care + HELP.care);
      return `（今年山田的收成多了一分指望：照料 ${Math.round(f.crop.care * 100)}/${HELP.careMax * 100}）`;
    }
    f.herb += HELP.herb;
    return `（藥圃多收了 ${HELP.herb} 份藥材）`;
  });
  const grow = st().updateHero((h) => choreGrowth(h, JOB_GROW[job.id]));
  await ctx.say(...JOB_LINES[job.id](w.day), '（做了一個時辰）');
  await ctx.say([effect, ...grow, st().updateWorld((x) => (x.sect ? ((x.sect.contrib += HELP.contrib), (x.sect.merit += HELP.contrib), `門派貢獻 +${HELP.contrib}。`) : ''))].filter(Boolean).join('\n'));
  await maybeDayEvent(ctx, 'chore');
}

/** 山田今年的情形（年成、照料、存貨） */
function farmReport(w: World): string[] {
  const f = fundOf(w);
  const d = dateOf(w.day);
  const tea = teaSeason(w.day);
  const out: string[] = [];
  if (tea) out.push(`眼下是${tea.name}的時候，晴天一天能採七、八斤到十來斤。${tea.price >= 7 ? '這茶金貴，一斤賣得到好幾兩。' : ''}`);
  else if (d.month < 2) out.push('茶樹還在歇著，到了三月初一，明前茶就能開採了。');
  else out.push('今年的茶季過了，茶樹要養著，明年才好。');
  if (d.month >= 3) out.push(f.crop.f + f.crop.care >= 1 ? '今年雨水還算順，田裡的稻子長得不錯。' : '今年雨水不調，稻子長得不如往年，只能多照料些。');
  out.push(`製茶房裡存著 ${Math.round(f.tea)} 斤茶，倉裡有糧 ${Math.round(f.grain)} 石，藥圃收的藥材 ${Math.round(f.herb)} 份。`);
  return out;
}

const ganTalk: Script = async (ctx) => {
  const w = st().world;
  if (!member()) {
    await ctx.say(...gan('這片茶園是鳴泉的祖產，泉水澆出來的茶，山下叫它「泉霧茶」。', '你是來看風景的吧？看可以，別踩了我的茶壟。'));
    return;
  }
  const job = jobNow(w.day);
  const blight = !!eventOn(fundOf(w), 'blight');
  const c = await ctx.ask(gan(blight ? '藥圃鬧蟲害了，愁死人！' : `${job.id === 'tea' ? '茶季忙得很' : job.id === 'field' ? '田裡活兒多' : '冬天山田清閒些'}。有什麼事？`)[0], [
    `${blight ? '幫忙除蟲' : `幫忙${job.name}`}（一個時辰・體力 ${STAMINA.chore}）${helped(w) >= HELP.perDay ? '（今天做夠了）' : ''}`,
    '山田的情形',
    '沒事',
  ]);
  if (c === 0) await helpOnce(ctx);
  else if (c === 1) await ctx.say(...gan(...farmReport(w)));
};

export const farmSign: Script = async (ctx) => {
  await ctx.say('「鳴泉山田」\n北坡茶園・西南水田・東南藥圃\n本門祖產，收成歸公庫。茶壟、田埂不得踐踏。');
};

export const teaRack: Script = async (ctx) => {
  const f = fundOf(st().world);
  await ctx.say(
    teaSeason(st().world.day) ? '竹匾上攤著今天採下的茶菁，等著進製茶房炒青。' : '空著的竹匾疊在架上，茶季過了。',
    `（製茶房裡存著 ${Math.round(f.tea)} 斤茶，等${MQ.wei}下山時帶去賣）`,
  );
};

setFarmTalk(ganTalk);

// ── 在山田做事的同門：可以一起做 ─────────────────────────────

const GROUP = () => lifeGroups().find((g) => g.id === 'mingquan')!;
const prevExtra = GROUP().hooks?.extra;
GROUP().hooks = {
  ...GROUP().hooks,
  extra: (ctx, id, a: Assign | undefined) => {
    const more = prevExtra?.(ctx, id, a) ?? [];
    if (!member() || !a || !['pluck', 'farm', 'tend'].includes(a.act) || id === 'gan') return more;
    const name = GROUP().npcs.find((n) => n.id === id)?.name;
    return [[`一起${jobNow(st().world.day).name}（一個時辰）`, () => helpOnce(ctx, name)], ...more];
  },
};

// ── 今日事：茶季、農忙 ─────────────────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const d = dateOf(world.day);
  const tea = teaSeason(world.day);
  const busy = tea && tea.price >= 7 ? `${tea.name}開採，山田缺人手` : (d.month === 4 && d.date >= 5 && d.date <= 12) || (d.month === 7 && d.date >= 26) || (d.month === 8 && d.date <= 3) ? '農忙，山田缺人手' : '';
  if (!busy) return [];
  return [{ text: `${busy}（後山東坡找${MQ.gan}幫忙）`, state: helped(world) >= HELP.perDay ? 'done' : 'todo' }];
});

// ── 給選單看的帳 ─────────────────────────────────────────

/** 看得到公庫細帳的人：內門弟子以上、擔任職位、掌門 */
export const canSeeBooks = (w: World) => !!w.sect && w.sect.id === 'mingquan' && (w.sect.rank >= 2 || !!w.sect.post || !!w.sect.leader);
export { fundOf, teaSeason, type SectFund };
