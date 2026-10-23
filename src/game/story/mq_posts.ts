import { ITEMS, giveItem, skillDef } from '../character';
import { registerDailyTasks } from '../daily';
import type { EventCtx } from '../events';
import type { World } from '../home';
import { lifeGroups, type LifeState } from '../life';
import { by } from '../maps/rooms';
import { addContrib, inSect, type SectMember } from '../sect';
import { festivalOf } from '../time';
import { useGame } from '../../state/store';
import { exert, studyable, studyInsight } from './estate';
import { ensure, FIGHTERS, isLectureDay, isMeetDay, LECTURE, NAME, setRiteHost, WATCH_ORDER, watcherOn } from './life_mingquan';
import { annualMeeting, atLeast, away, leaderKey, meetingPending, nameOf, postDef, POSTS, powerOf, rankNow, seat, holderOf, type Key, type PostDef } from './mq_order';
import { MINGQUAN, MQ, MQ_MEMBERS, setChairHook, setPostHook } from './sect_mingquan';
import { fundOf } from '../sect_fund';
import { takeTeaRun, TEA_RUN_MIN } from './mq_trade';

/**
 * 職位的差事（4.28）：當上執事、長老、掌門以後，每天多了自己的事。
 *
 * - 找大殿值殿的柯靜言「職位的差事」：
 *   外務執事——每五天領一次山下的差事：製茶房存了茶就送進泉霧茶莊（4.32，mq_trade.ts），不然是採買（臨江城買得到的東西），
 *   五天內交差，照價報帳再多給一成、貢獻 +6；田租到期時下山找柳承安收租。
 *   巡山執事——每天巡山一圈（一個時辰・體力 20：可能遇上山豬、撿到草藥、幫迷路的樵夫），排今晚誰守夜。
 *   典儀執事——節慶當天主持祭祖；旬休的比武小會找陸鳴川，可以由你唱名主持一場。
 *   傳功長老——逢五申時講武由你主講（到練功房找聽講的人開講），聽的人實力都長一點。
 *   執法長老——調解吵架的同門。
 *   藥堂長老——每天看診換藥（兩刻・體力 10，有止血草更好）。
 * - 掌門：大殿正中的掌門座位。任免職位、定門派方針（重武／守成／寬和，影響同門的成長、吵架、下山）、
 *   看門派近況；年會那天在這裡主持年會（平票由你裁定）。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const myPost = () => st().world.sect?.post;
const isLeader = () => !!st().world.sect?.leader;
const ke = by(MQ.ke);
const inT = (t: number, a: number, b: number) => t >= a && t < b;
const lifeOf = (w: World): LifeState => (w.life ??= { members: {}, news: [] });
const doneToday = (key: string) => st().world.daily[key]?.day === st().world.day;
const markToday = (key: string) => st().updateWorld((x) => void (x.daily[key] = { day: x.day, n: 1 }));
const contrib = (ctx: EventCtx, n: number) => ctx.say(`（${st().updateWorld((x) => addContrib(x, n))}）`);
const news = (w: World, text: string) => (lifeOf(w).news = [...lifeOf(w).news, { day: w.day, text, who: [] }].slice(-20));

/** 有人物檔案的同門，交情加減一點 */
function addAff(k: string, n: number) {
  const person = (MQ_MEMBERS[k as Key] as SectMember | undefined)?.person ?? lifeGroups().find((g) => g.id === 'mingquan')?.npcs.find((x) => x.id === k)?.person;
  if (!person) return;
  st().updateWorld((w) => {
    const r = w.relations[person];
    if (r) r.aff = Math.max(-100, Math.min(100, r.aff + n));
  });
}

// ── 外務執事：山下的採買差事 ────────────────────────────

const ERRANDS = [
  { item: 'jinchuang', n: 3, where: '回春堂', why: '藥堂的金創藥用完了' },
  { item: 'herb', n: 6, where: '回春堂', why: '蘇長老要止血草配藥' },
  { item: 'w_wood_sword', n: 3, where: '石家鐵鋪', why: '新來的記名弟子還沒有練習用的木劍' },
  { item: 'cotton_thread', n: 5, where: '錦繡布莊', why: '弟子服要補，棉線不夠了' },
];
const ERRAND_DAYS = 5;
/** 送茶進城的期限 */
const TEA_DAYS = 4;
const errandOf = (w: World) => w.life?.errand;
/** 能不能領新差事：沒領過、交過差又過了五天、或上一件過期了 */
const errandReady = (w: World) => {
  const e = errandOf(w);
  return !e || (e.done ? w.day - e.day >= ERRAND_DAYS : w.day > e.due);
};

async function outerDuty(ctx: EventCtx) {
  const w = st().world;
  const e = errandOf(w);
  if (e && !e.done && w.day <= e.due && e.kind === 'tea')
    return void (await ctx.say(...ke(`那 ${e.n} 斤茶送到城北的泉霧茶莊，交給梁敬亭就算交差。第 ${e.due - w.day + 1} 天內送到就行。`)));
  if (e && !e.done && w.day <= e.due) {
    const have = st().hero.items[e.item] ?? 0;
    const def = ITEMS[e.item];
    if (have < e.n) return void (await ctx.say(...ke(`差事還沒辦完：到臨江城${ERRANDS.find((x) => x.item === e.item)?.where ?? ''}買${def.name} ${e.n} 件（你身上有 ${have} 件）。第 ${e.due - w.day + 1} 天內交來就行。`)));
    if ((await ctx.ask(ke(`${def.name} ${e.n} 件，都買齊了？`)[0], ['交差', '再等等'])) !== 0) return;
    const pay = Math.round((def.price ?? 0) * e.n * 1.1);
    st().updateHero((h) => {
      h.items[e.item] -= e.n;
      if (h.items[e.item] <= 0) delete h.items[e.item];
      h.silver += pay;
    });
    st().updateWorld((x) => {
      x.life!.errand = { ...e, done: true, day: x.day };
    });
    await ctx.say(...ke('辛苦了！帳我記上，銀子照價還你，多的一成算跑腿錢。'), `（交了${def.name} ${e.n} 件，領回銀兩 ${pay}）`);
    return contrib(ctx, 6);
  }
  if (!errandReady(w)) return void (await ctx.say(...ke(`這幾天山下沒什麼要辦的。過 ${ERRAND_DAYS - (w.day - (e?.day ?? w.day))} 天再來問。`)));
  if (e && !e.done) await ctx.say(...ke('上回那件差事過期了，我另外找人辦了。'));
  // 製茶房存了夠多的茶：先送茶進城（4.32）
  const tea = Math.floor(fundOf(w).tea);
  if (tea >= TEA_RUN_MIN) {
    if ((await ctx.ask(ke(`製茶房存了 ${tea} 斤茶，勞煩你送進城北的泉霧茶莊，交給梁敬亭上架。${TEA_DAYS} 天內送到。`)[0], ['接下', '先不了'])) !== 0) return;
    st().updateWorld((x) => takeTeaRun(x, TEA_DAYS));
    await ctx.say(`（接下送茶的差事：${tea} 斤茶，到臨江城城北的泉霧茶莊）`);
    return;
  }
  const pick = ERRANDS[(w.day + (w.seed ?? 0)) % ERRANDS.length];
  if ((await ctx.ask(ke(`${pick.why}。勞煩你下山到臨江城${pick.where}買${ITEMS[pick.item].name} ${pick.n} 件，${ERRAND_DAYS} 天內帶回來。錢先墊著，回來照價報帳。`)[0], ['接下', '先不了'])) !== 0) return;
  st().updateWorld((x) => void (lifeOf(x).errand = { item: pick.item, n: pick.n, day: x.day, due: x.day + ERRAND_DAYS - 1 }));
  await ctx.say('（接下了外務差事）');
}

// ── 巡山執事：巡山、排守夜 ──────────────────────────────

async function patrol(ctx: EventCtx) {
  const key = 'mq:post:patrol';
  if (doneToday(key)) return void (await ctx.say('今天已經巡過山了。'));
  if (!(await exert(ctx, 20, '已經累得走不動了，巡山得等明天。'))) return;
  markToday(key);
  ctx.pass(8);
  const r = Math.random();
  await ctx.say('你沿著山門、後山、菜圃與思過崖下的小路，巡了一大圈。');
  if (r < 0.2) {
    await ctx.say('菜圃那頭一陣騷動——一頭山豬拱破了籬笆，正大嚼卜師傅的蘿蔔！');
    const o = await ctx.battle('boar');
    if (o === 'win') {
      await ctx.say('山豬負痛逃回林子裡。你把籬笆扶正，回去跟卜大勺說了一聲。');
      await contrib(ctx, 2);
    } else await ctx.say('山豬撞開你，一溜煙跑了。你揉著腰，把籬笆扶正。');
  } else if (r < 0.4) {
    await ctx.say('石縫裡長著幾株止血草，你順手採了下來。');
    await ctx.hero((h) => giveItem(h, 'herb', 2));
  } else if (r < 0.55) {
    await ctx.say('林子裡有個樵夫迷了路，天快黑了還在打轉。你把他領到山路上，他千恩萬謝地下山去了。');
    await ctx.hero((h) => ((h.fame += 1), '名聲 +1。'));
  } else await ctx.say(['山上一切太平，只有幾隻松鼠在樹上吵架。', '山門的石階有一塊鬆了，你記下來，回頭請人修。', '後山的泉水比前幾天漲了些，看來上游下過雨。'][Math.floor(Math.random() * 3)]);
  await ctx.say('（巡了一個時辰）');
  await contrib(ctx, 3);
}

async function pickWatch(ctx: EventCtx) {
  const w = st().world;
  const cur = watcherOn(w.day, w);
  if (w.life?.watchPick?.day === w.day) return void (await ctx.say(`今晚的守夜已經排好了：${cur === 'hero' ? '你自己' : NAME[cur]}。`));
  const pool = WATCH_ORDER.filter((id) => !(w.life?.members[id]?.away && w.life.members[id].away!.until >= w.day));
  const i = await ctx.ask(`今晚照輪是${cur === 'hero' ? '你' : NAME[cur]}守夜。要改排誰？`, [...pool.map((id) => NAME[id]), '我自己', '照輪就好']);
  if (i > pool.length) return;
  const who = i === pool.length ? 'hero' : pool[i];
  st().updateWorld((x) => void (lifeOf(x).watchPick = { day: x.day, who }));
  await ctx.say(who === 'hero' ? '（今晚你自己守夜。亥時到子時到大殿前敲更鼓）' : `（今晚改由${NAME[who]}守夜）`);
  // 被臨時抓去守夜的人，心裡多少有點嘀咕
  if (who !== 'hero' && who !== cur) addAff(who, -1);
}

// ── 典儀執事：主持比武、祭祖 ────────────────────────────

/** 主持一場比試：你挑兩個人上場、唱名、判勝負 */
async function hostMatch(ctx: EventCtx) {
  const w = st().world;
  const pool = FIGHTERS.filter((id) => !(w.life?.members[id]?.away && w.life.members[id].away!.until >= w.day));
  const a = pool[await ctx.ask('你站到場中。先叫誰上場？', pool.map((id) => NAME[id]))];
  const rest = pool.filter((x) => x !== a);
  const b = rest[await ctx.ask(`${NAME[a]}上場了。對手是誰？`, rest.map((id) => NAME[id]))];
  const pa = (w.life?.members[a]?.power ?? 20) * (0.8 + Math.random() * 0.4);
  const pb = (w.life?.members[b]?.power ?? 20) * (0.8 + Math.random() * 0.4);
  const [win, lose] = pa >= pb ? [a, b] : [b, a];
  const close = Math.abs(pa - pb) < 5;
  ctx.pass(4);
  await ctx.say(
    `你高聲唱名：「${NAME[a]}對${NAME[b]}——點到為止，開始！」`,
    close ? `兩人你來我往，鬥了四五十招仍分不出高下。最後${NAME[win]}搶到半步先機，劍尖點在${NAME[lose]}肩頭。` : `${NAME[win]}出手又快又穩，不到十招就逼得${NAME[lose]}收劍認輸。`,
    `你判${NAME[win]}勝。兩人互相行禮下場，圍觀的師兄弟一陣喝采。`,
  );
  st().updateWorld((x) => {
    ensure(x, win).power += 0.4;
    ensure(x, lose).power += 0.2;
    x.daily[`mq:host:${x.day}`] = { day: x.day, n: 1 };
  });
  addAff(a, 1);
  addAff(b, 1);
  await ctx.hero((h) => ((h.fame += 1), '（主持了一場比試。名聲 +1）'));
  await contrib(ctx, 4);
}

async function festivalRite(ctx: EventCtx) {
  const fest = festivalOf(st().world.day)!;
  const key = 'mq:post:rite';
  if (doneToday(key)) return void (await ctx.say('今天的祭祖已經辦過了。'));
  markToday(key);
  ctx.pass(4);
  await ctx.say(
    `${fest}。你領著全派弟子在大殿列隊，點香、獻供、讀祝文。`,
    '祖師像前香煙裊裊，殿裡靜得只聽得見衣袂聲。禮成，弟子們依序上前三拜。',
    '（主持祭祖，花了半個時辰）',
  );
  await ctx.hero((h) => ((h.fame += 2), '名聲 +2。'));
  await contrib(ctx, 5);
}

// ── 傳功長老：主講講武 ──────────────────────────────────

async function heroLecture(ctx: EventCtx) {
  const w = st().world;
  const key = `mq:lecture:${w.day}`;
  if (w.daily[key]) return void (await ctx.say('今天的講武已經講過了。'));
  const mine = st().hero.skills.filter((s) => MINGQUAN.skills.some((k) => k.id === s.id) || s.level >= 3);
  if (!mine.length) return;
  const i = await ctx.ask('弟子們都坐好了，等你開講。今天講哪一門？', [...mine.map((s) => `${skillDef(s).name}（第 ${s.level} 重）`), '改天再講']);
  if (i >= mine.length) return;
  const sk = mine[i];
  st().updateWorld((x) => {
    x.daily[key] = { day: x.day, n: 1 };
    for (const id of FIGHTERS) if (!(x.life?.members[id]?.away && x.life.members[id].away!.until >= x.day)) ensure(x, id).power += 0.6;
  });
  ctx.pass(4);
  await ctx.say(
    `你講「${skillDef(sk).name}」：從起手的步法講到收勢的呼吸，再挑了兩招拆給大家看。`,
    '底下的弟子聽得入神，有人拿著樹枝在地上比劃。講到後來，你自己也想通了一兩處從前沒留意的地方。',
    '（講了半個時辰。聽講的同門都有長進）',
  );
  if (studyable(st().hero).some((s) => s.id === sk.id)) await ctx.hero((h) => studyInsight(h, sk.id, 10));
  await contrib(ctx, 4);
}

// ── 執法長老：調解吵架 ──────────────────────────────────

const feuds = (w: World): [string, string][] => {
  const out: [string, string][] = [];
  for (const [id, m] of Object.entries(w.life?.members ?? {}))
    if (m.feud && m.feud.until >= w.day && !out.some(([a, b]) => a === m.feud!.with && b === id)) out.push([id, m.feud.with]);
  return out;
};

async function mediate(ctx: EventCtx) {
  const list = feuds(st().world);
  if (!list.length) return void (await ctx.say('這幾天同門相安無事，沒有要調解的。'));
  const i = await ctx.ask('誰跟誰鬧了彆扭？', [...list.map(([a, b]) => `${NAME[a]}和${NAME[b]}`), '算了']);
  if (i >= list.length) return;
  const [a, b] = list[i];
  ctx.pass(2);
  await ctx.say(
    `你把${NAME[a]}和${NAME[b]}叫到大殿，一個一個問清楚。原來是為了一點小事——誰占了誰的木樁、誰說了誰一句閒話。`,
    '你各打五十大板，罰兩人一起去挑十擔水。挑到第五擔，兩人已經有說有笑了。',
  );
  st().updateWorld((x) => {
    delete ensure(x, a).feud;
    delete ensure(x, b).feud;
    news(x, `${NAME[a]}和${NAME[b]}和好了`);
  });
  addAff(a, 1);
  addAff(b, 1);
  await contrib(ctx, 3);
}

// ── 藥堂長老：看診 ──────────────────────────────────────

async function clinic(ctx: EventCtx) {
  const key = 'mq:post:clinic';
  if (doneToday(key)) return void (await ctx.say('今天已經看過診了。'));
  if (!(await exert(ctx, 10, '已經累得手都在抖，這時候換藥只會幫倒忙。'))) return;
  markToday(key);
  ctx.pass(2);
  const herb = (st().hero.items.herb ?? 0) > 0;
  if (herb) st().updateHero((h) => (--h.items.herb <= 0 ? void delete h.items.herb : undefined));
  const who = FIGHTERS[Math.floor(Math.random() * FIGHTERS.length)];
  await ctx.say(
    `藥堂裡排著幾個練功扭了腳、被木劍敲腫手腕的弟子。你一個一個看過，${herb ? '搗了止血草敷上，' : ''}該推拿的推拿，該包紮的包紮。`,
    `${NAME[who]}的舊傷總算好了，直說要回去練劍。`,
    `（看診兩刻${herb ? '，用了止血草 1 件' : ''}）`,
  );
  st().updateWorld((x) => void (ensure(x, who).power += 0.3));
  await contrib(ctx, herb ? 3 : 2);
}

// ── 值殿那裡的「職位的差事」 ─────────────────────────────

const POST_NOTE: Record<string, string> = {
  st_out: '外務執事：每五天領一次山下的差事——製茶房存了茶就送進城裡的泉霧茶莊，不然就是採買，五天內買齊交來，照價報帳再多一成；夏租、冬租到期時，下山到青竹村找柳村長收租。',
  st_patrol: '巡山執事：每天巡山一圈；也可以排今晚誰守夜。',
  st_rite: '典儀執事：節慶當天主持祭祖；旬休未時的比武小會，找陸鳴川就能唱名主持一場。',
  elder_teach: '傳功長老：逢五（初五、十五、廿五）申時的講武由你主講，到練功房找聽講的弟子開講。',
  elder_law: '執法長老：同門吵架時，由你調解。',
  elder_med: '藥堂長老：每天看診換藥，有止血草更好。',
};

async function postDuty(ctx: EventCtx) {
  if (isLeader()) return void (await ctx.say(...ke('掌門的事務，請到大殿正中的掌門座位處理。')));
  const p = myPost();
  if (!p) return;
  const def = postDef(p);
  const opts: [string, () => Promise<void>][] = [];
  const w = st().world;
  if (p === 'st_out') {
    const e = errandOf(w);
    const busy = e && !e.done && w.day <= e.due;
    opts.push([busy ? (e.kind === 'tea' ? '送茶的差事' : '交差') : '領山下的差事', () => outerDuty(ctx)]);
    const due = fundOf(w).rentDue;
    if (due)
      opts.push([
        `${due.season}租的事`,
        async () => void (await ctx.say(...ke(`青竹村祖田的${due.season}租該收了，照例 ${due.amount} 兩。到村裡找柳村長收，第 ${due.due - w.day + 1} 天內收回來。`, '年成不好的話，佃戶會求減租。減不減，你看著辦——門裡要吃飯，村裡也要過日子。'))),
      ]);
  }
  if (p === 'st_patrol') opts.push(['巡山（一個時辰・體力 20）', () => patrol(ctx)], ['排今晚的守夜', () => pickWatch(ctx)]);
  if (p === 'st_rite' && festivalOf(w.day)) opts.push([`主持祭祖（${festivalOf(w.day)}，半個時辰）`, () => festivalRite(ctx)]);
  if (p === 'elder_law') opts.push([`調解吵架（${feuds(w).length} 起）`, () => mediate(ctx)]);
  if (p === 'elder_med') opts.push(['看診換藥（兩刻・體力 10）', () => clinic(ctx)]);
  const i = await ctx.ask(ke(`${def.name}有什麼吩咐？`)[0], [...opts.map((o) => o[0]), '職位說明', '沒事']);
  if (i < opts.length) await opts[i][1]();
  else if (i === opts.length) await ctx.say(POST_NOTE[p], `（擔任${def.name}，月例多 ${def.bonus} 兩；年會時${def.kind === 'steward' ? '每年改選' : '長老席一直做到退位'}）`);
}

setPostHook({ can: () => member() && (!!myPost() || isLeader()), run: postDuty });
setRiteHost(hostMatch);

// 傳功長老：講武時找聽講的人就開講
const G = () => lifeGroups().find((g) => g.id === 'mingquan')!;
const prevTalk = G().hooks?.talk;
G().hooks!.talk = async (ctx, id, a) => {
  const w = st().world;
  if (member() && myPost() === 'elder_teach' && a?.act === 'listen' && isLectureDay(w.day) && inT(w.time, LECTURE.from, LECTURE.to) && !w.daily[`mq:lecture:${w.day}`]) {
    await heroLecture(ctx);
    return true;
  }
  return prevTalk ? prevTalk(ctx, id, a) : false;
};

// ── 掌門座位：掌門事務 ──────────────────────────────────

const POLICY = {
  martial: { name: '重武', desc: '同門練功更勤，長得快兩成；但較勁的人更容易吵架。' },
  steady: { name: '守成', desc: '一切照舊。' },
  gentle: { name: '寬和', desc: '同門和氣，很少吵架，也更常下山歷練、行俠；只是練功鬆一些。' },
} as const;

/** 任免的人選：照職位資格、實力排前五 */
function appointable(w: World, post: PostDef): string[] {
  return (Object.keys(MQ_MEMBERS) as Key[])
    .filter((k) => {
      if (['wen', 'bu', 'shao'].includes(k) || away(w, k) || k === leaderKey(w)) return false;
      const r = rankNow(w, k);
      if (r === '太上長老' || r === '掌門') return false;
      const other = POSTS.find((p) => p.id !== post.id && holderOf(w, p.id) === k);
      if (other) return false;
      return post.kind === 'elder' ? atLeast(r, '內門弟子') : atLeast(r, '正式弟子') && !['長老'].includes(r);
    })
    .sort((a, b) => powerOf(w, b) - powerOf(w, a))
    .slice(0, 5);
}

/** 換人：原本的長老卸下職司（原本就是長老的仍是長老），新人上任 */
function appoint(w: World, post: PostDef, who: string) {
  const ls = lifeOf(w);
  const prev = holderOf(w, post.id);
  if (prev && prev !== 'hero' && post.kind === 'elder') {
    ls.ranks ??= {};
    if (MQ_MEMBERS[prev as Key]?.rank === '長老') ls.ranks[prev] = { rank: '長老', role: '長老（未掌職）' };
    else delete ls.ranks[prev];
  }
  if (who) seat(w, post, who);
  else ls.posts = { ...ls.posts, [post.id]: '' };
  news(w, who ? `掌門任命${nameOf(who)}為${post.name}` : `${post.name}一職暫時空著`);
}

async function appointMenu(ctx: EventCtx) {
  const w = st().world;
  const i = await ctx.ask('要任免哪個職位？', [...POSTS.map((p) => `${p.name}：${holderOf(w, p.id) ? nameOf(holderOf(w, p.id)) : '（空著）'}`), '算了']);
  if (i >= POSTS.length) return;
  const post = POSTS[i];
  const pool = appointable(w, post);
  const prev = holderOf(w, post.id);
  const j = await ctx.ask(`${post.name}：${post.desc}\n交給誰？`, [...pool.map((k) => `${nameOf(k)}（${rankNow(w, k)}）`), '空著', '算了']);
  if (j > pool.length) return;
  const who = j === pool.length ? '' : pool[j];
  if (who === prev) return void (await ctx.say(`${nameOf(prev)}本來就是${post.name}。`));
  st().updateWorld((x) => appoint(x, post, who));
  if (prev && prev !== 'hero') addAff(prev, -5);
  if (who) addAff(who, 3);
  await ctx.say(who ? `你當眾宣布：「${post.name}，由${nameOf(who)}擔任。」${nameOf(who)}上前行禮領命。` : `${post.name}一職暫時空著。`, ...(prev ? [`（${nameOf(prev)}卸下${post.name}之職${prev !== 'hero' ? '，心裡不太是滋味' : ''}）`] : []));
}

async function policyMenu(ctx: EventCtx) {
  const cur = st().world.life?.policy ?? 'steady';
  const keys = Object.keys(POLICY) as (keyof typeof POLICY)[];
  const i = await ctx.ask(`現在的方針是「${POLICY[cur].name}」。要改嗎？`, [...keys.map((k) => `${POLICY[k].name}：${POLICY[k].desc}`), '不改']);
  if (i >= keys.length || keys[i] === cur) return;
  st().updateWorld((x) => {
    lifeOf(x).policy = keys[i];
    news(x, `掌門定下門派方針「${POLICY[keys[i]].name}」`);
  });
  await ctx.say(`你召集眾弟子，宣布往後門裡以「${POLICY[keys[i]].name}」為方針。`);
}

async function sectNews(ctx: EventCtx) {
  const w = st().world;
  const n = (w.life?.news ?? []).slice(-6).reverse();
  const counts = ['記名弟子', '正式弟子', '內門弟子', '真傳弟子'].map((r) => `${r} ${MINGQUAN.members.filter((m) => rankNow(w, (Object.entries(MQ_MEMBERS).find(([, v]) => v.name === m.name)?.[0] ?? '') as string) === r).length} 人`);
  await ctx.say(`門下：${counts.join('、')}（記名弟子另有十來人）。方針：${POLICY[w.life?.policy ?? 'steady'].name}。`, n.length ? `近來的事：\n${n.map((x) => `・${x.text}`).join('\n')}` : '近來門裡沒什麼大事。');
}

setChairHook(async (ctx) => {
  if (!member() || !isLeader()) return false;
  const w = st().world;
  const opts: [string, () => Promise<void>][] = [];
  if (meetingPending(w)) opts.push(['主持年會', () => annualMeeting(ctx)]);
  opts.push(['任免職位', () => appointMenu(ctx)], ['門派方針', () => policyMenu(ctx)], ['門派近況', () => sectNews(ctx)]);
  const i = await ctx.ask('你在掌門的座位坐下。殿裡的香煙繚繞，祖師像靜靜地看著你。', [...opts.map((o) => o[0]), '起身']);
  if (i < opts.length) await opts[i][1]();
  return true;
});

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const out: { text: string; state: 'todo' | 'done'; note?: string }[] = [];
  const done = (k: string) => (world.daily[k]?.day === world.day ? 'done' : 'todo');
  const p = world.sect?.post;
  if (world.sect?.leader && meetingPending(world)) out.push({ text: '今天是年會：到大殿正中的掌門座位主持', state: 'todo' });
  if (p === 'st_out') {
    const e = world.life?.errand;
    if (e && !e.done && world.day <= e.due) {
      // 送茶進城的差事列在 mq_trade.ts
      if (e.kind !== 'tea') out.push({ text: `外務差事：買${ITEMS[e.item].name} ${e.n} 件交給${MQ.ke}`, state: 'todo', note: `還有 ${e.due - world.day + 1} 天` });
    }
    else if (errandReady(world)) out.push({ text: `外務執事：找${MQ.ke}領山下的差事`, state: 'todo' });
  }
  if (p === 'st_patrol') out.push({ text: '巡山一圈（找值殿的柯靜言）', state: done('mq:post:patrol') });
  if (p === 'st_rite' && festivalOf(world.day)) out.push({ text: `主持${festivalOf(world.day)}祭祖`, state: done('mq:post:rite') });
  if (p === 'st_rite' && isMeetDay(world.day)) out.push({ text: '比武小會可以由你唱名主持（未時，找陸鳴川）', state: world.daily[`mq:host:${world.day}`] ? 'done' : 'todo' });
  if (p === 'elder_teach' && isLectureDay(world.day)) out.push({ text: '今天輪你講武（申時，練功房）', state: world.daily[`mq:lecture:${world.day}`] ? 'done' : 'todo' });
  if (p === 'elder_law' && feuds(world).length) out.push({ text: `有 ${feuds(world).length} 起同門吵架等你調解`, state: 'todo' });
  if (p === 'elder_med') out.push({ text: '藥堂看診換藥', state: done('mq:post:clinic') });
  return out;
});
