import type { Character } from '../character';
import { registerDailyTasks } from '../daily';
import type { EventCtx } from '../events';
import type { World } from '../home';
import { lifeGroups, type Assign, type LifeState } from '../life';
import { by } from '../maps/rooms';
import { addContrib, inSect, type SectMember } from '../sect';
import { dateOf, onNewDay } from '../time';
import { useGame } from '../../state/store';
import { MINGQUAN, MQ, MQ_MEMBERS, setTeachExamHook, setWenHook } from './sect_mingquan';

/**
 * 鳴泉劍派的門派秩序（4.27）：年齡、職位與年會選舉、收徒、掌門傳位。
 *
 * - 年齡：名冊上每個人有第一年的年紀（MQ_MEMBERS 的 age），每過一年（正月初一）長一歲；你也是（hero.age，預設十八）。
 *   體力（vigor）：四十五歲以前十足，之後每年少一分，六十歲以後每年少兩分；影響長老退位、掌門傳位。
 * - 職位（POSTS）：三位長老（傳功、執法、藥堂）與三個執事（外務、巡山、典儀）。教習、知客、值殿、管書、管藥、管武器是掌門指派的職司，不用選。
 *   你當上執事月例多 8 兩、長老多 25 兩，名冊上寫你的職位。
 * - 年會：每年正月十六辰時到午時，在大殿找掌門。先議退位（七十二歲以上的長老可能退下）與傳位，再選舉：
 *   空出來的長老席、三個執事（每年改選）。投票的人是內門弟子以上（長老、掌門、真傳、內門）；你是內門以上就能投一票，
 *   也能出來競選執事（長老席要真傳弟子、功績一千二以上）。同門投誰看：實力、資歷、現任、跟候選人的交情，再加一點運氣。
 *   你沒來，年會照開（隔天半夜補算，沒有你那一票）。
 * - 收徒：內門弟子以上、入內門滿十五天、功績三百以上、鳴泉劍法第七重，找韓靖秋過授徒考驗；過了就能收徒。
 *   找沒有師父的記名、正式弟子說話就能「收為徒弟」（對方看交情或實力肯不肯）；內門最多兩個、真傳三個、長老或掌門五個。
 *   徒弟每天長得快五成；你每天可以「指點」一次（兩刻：他實力 +1.5、你貢獻 +1）；徒弟升了身分，你貢獻 +10。
 * - 傳位：掌門七十五歲（或體力衰到五成五以下）時，在年會上宣布傳位，從真傳弟子裡挑繼承人
 *   （看實力、功績、名聲、跟掌門的交情）。你是真傳弟子就有機會接任掌門；否則由陸鳴川接任。卸任的掌門成了太上長老。
 *   大門派會提前讓真傳弟子比武爭位——等有大門派時再做（SectDef.size）。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const sect = () => st().world.sect!;
export type Key = keyof typeof MQ_MEMBERS;

// ── 年齡與體力 ──────────────────────────────────────────

/** 現在是第幾年（遊戲開始那年是第 1 年） */
export const yearOf = (day: number) => dateOf(day).year;
/** 名冊上某人現在幾歲 */
export const ageNow = (age0: number | undefined, w: World) => (age0 ?? 20) + yearOf(w.day) - 1;
export const heroAge = (h: Character, w: World) => (h.age ?? 18) + yearOf(w.day) - 1;
/** 體力：45 歲以前 1，之後每年 -1%，60 歲時 0.85、之後每年 -2%（最低 0.3） */
export const vigor = (age: number) => (age <= 45 ? 1 : age <= 60 ? 1 - (age - 45) * 0.01 : Math.max(0.3, 0.85 - (age - 60) * 0.02));

// ── 職位 ────────────────────────────────────────────────

export interface PostDef {
  id: string;
  name: string;
  kind: 'elder' | 'steward';
  /** 一開始誰擔任（名冊 key；空字串表示空著） */
  holder: Key | '';
  /** 擔任時月例多幾兩 */
  bonus: number;
  desc: string;
}
export const POSTS: PostDef[] = [
  { id: 'elder_teach', name: '傳功長老', kind: 'elder', holder: 'han', bonus: 25, desc: '在練功房指點弟子，主持考核與講武。' },
  { id: 'elder_law', name: '執法長老', kind: 'elder', holder: 'yan', bonus: 25, desc: '掌門規，看守思過崖。' },
  { id: 'elder_med', name: '藥堂長老', kind: 'elder', holder: 'su', bonus: 25, desc: '掌藥堂，行醫濟世。' },
  { id: 'st_out', name: '外務執事', kind: 'steward', holder: 'wei', bonus: 8, desc: '打理下山的委託、採買與門派在山下的往來。' },
  { id: 'st_patrol', name: '巡山執事', kind: 'steward', holder: 'he', bonus: 8, desc: '排守山門、守夜的班，管山上的安危。' },
  { id: 'st_rite', name: '典儀執事', kind: 'steward', holder: '', bonus: 8, desc: '籌辦年會、比武小會、節慶與入門拜師的典禮。' },
];
export const postDef = (id: string) => POSTS.find((p) => p.id === id)!;

const lifeOf = (w: World): LifeState => (w.life ??= { members: {}, news: [] });
/** 職位現在誰擔任 */
export const holderOf = (w: World, id: string): string => w.life?.posts?.[id] ?? postDef(id).holder;
/** 某人擔任的職位 */
export const postOf = (w: World, who: string) => POSTS.find((p) => holderOf(w, p.id) === who);

/** 沒有在日常系統裡的人的實力（給選舉、對練用） */
const STATIC_POWER: Partial<Record<Key, number>> = { qi: 62, fang: 50, ke: 55, song: 45, miao: 48, meng: 58, ye: 95, yan: 160, su: 120, han: 200, wen: 300 };
/** 實力：日常系統裡記的；還沒記（剛開新檔）就用日常人物設定的底值 */
const lifePower = (k: string) => lifeGroups().find((g) => g.id === 'mingquan')?.npcs.find((n) => n.id === k)?.power;
export const powerOf = (w: World, k: string) => w.life?.members[k]?.power ?? lifePower(k) ?? STATIC_POWER[k as Key] ?? 20;
/** 你的實力（粗估：武功重數、名聲） */
const heroPower = (h: Character) => h.skills.reduce((a, s) => a + s.level, 0) * 4 + h.fame / 2;
const key = (name: string) => (Object.entries(MQ_MEMBERS).find(([, m]) => m.name === name)?.[0] ?? '') as Key | '';
export const nameOf = (k: string) => (k === 'hero' ? st().hero.name : MQ_MEMBERS[k as Key]?.name ?? k);

/** 某人現在的位階（年會上可能改了） */
export const rankNow = (w: World, k: string) => w.life?.ranks?.[k]?.rank ?? MQ_MEMBERS[k as Key]?.rank ?? '';
export const away = (w: World, k: string) => {
  const m = w.life?.members[k];
  return (!!m?.away && m.away.until >= w.day) || !!(MQ_MEMBERS[k as Key] as SectMember | undefined)?.note?.includes('下山');
};
const RANK_ORDER = ['記名弟子', '正式弟子', '內門弟子', '真傳弟子', '長老', '太上長老', '掌門'];
export const atLeast = (r: string, min: string) => RANK_ORDER.indexOf(r) >= RANK_ORDER.indexOf(min);

/** 有投票權的同門（內門以上、人在山上） */
function voters(w: World) {
  return (Object.keys(MQ_MEMBERS) as Key[]).filter((k) => atLeast(rankNow(w, k), '內門弟子') && rankNow(w, k) !== '太上長老' && !away(w, k));
}

/** 同門投票的心意：實力、資歷、現任、交情，再加一點運氣（同一天同一人固定） */
function preference(w: World, voter: string, cand: string, post: PostDef) {
  const r = ((voter.charCodeAt(0) * 131 + cand.charCodeAt(0) * 17 + w.day + post.id.length * 7) % 100) / 100;
  const incumbent = holderOf(w, post.id) === cand ? 12 : 0;
  if (cand === 'hero') {
    const h = st().hero;
    const person = (MQ_MEMBERS[voter as Key] as SectMember).person;
    const aff = person ? (w.relations[person]?.aff ?? 0) : 0;
    // 功績、名聲有上限；入門不到一年的新人，大家還信不過
    const fresh = w.day - (w.sect?.joinedDay ?? w.day) < 360 ? 10 : 0;
    // 當掌門時支用公款被查到，風評（scandal）還沒淡掉的話票會少（4.33）
    const scandal = Math.min(20, w.life?.fund?.scandal ?? 0);
    return heroPower(h) / 2 + heroAge(h, w) / 3 + Math.min(8, (w.sect?.merit ?? 0) / 100) + Math.min(10, h.fame / 8) + aff / 3 + incumbent - fresh - scandal + r * 15;
  }
  const bondish = voter === 'lu' && cand === 'he' ? 5 : 0;
  return powerOf(w, cand) / 2 + ageNow(MQ_MEMBERS[cand as Key]?.age, w) / 3 + incumbent + bondish + r * 15;
}

/** 某個職位的候選人 */
function candidates(w: World, post: PostDef, heroRuns: boolean): string[] {
  const pool = (Object.keys(MQ_MEMBERS) as Key[]).filter((k) => {
    if (away(w, k) || postOf(w, k)?.kind === 'elder' || ['wen', 'bu', 'shao'].includes(k)) return false;
    const r = rankNow(w, k);
    if (post.kind === 'elder') return (r === '真傳弟子' || r === '內門弟子') && ageNow(MQ_MEMBERS[k].age, w) >= 30;
    // 執事：正式弟子以上，已經擔任別的執事的不重複
    return atLeast(r, '正式弟子') && !['長老', '掌門', '太上長老'].includes(r) && (!postOf(w, k) || postOf(w, k)!.id === post.id);
  });
  const top = pool.sort((a, b) => powerOf(w, b) + (holderOf(w, post.id) === b ? 30 : 0) - (powerOf(w, a) + (holderOf(w, post.id) === a ? 30 : 0))).slice(0, 2);
  return heroRuns ? [...top, 'hero'] : top;
}

/** 開票：每位有投票權的人投一票（不投自己）；heroVote 是你投的人 */
function tally(w: World, post: PostDef, cands: string[], heroVote: string | null) {
  const count: Record<string, number> = Object.fromEntries(cands.map((c) => [c, 0]));
  for (const v of voters(w)) {
    const pick = cands.filter((c) => c !== v).sort((a, b) => preference(w, v, b, post) - preference(w, v, a, post))[0];
    if (pick) count[pick]++;
  }
  if (heroVote && count[heroVote] !== undefined) count[heroVote]++;
  const winner = [...cands].sort((a, b) => count[b] - count[a] || preference(w, 'wen', b, post) - preference(w, 'wen', a, post))[0];
  const tie = cands.filter((c) => count[c] === count[winner]).length > 1;
  return { winner, count, tie };
}

/** 職位交接（也改名冊上的位階、職司） */
export function seat(w: World, post: PostDef, winner: string) {
  const ls = lifeOf(w);
  ls.posts = { ...ls.posts, [post.id]: winner };
  ls.ranks ??= {};
  if (winner === 'hero') {
    if (w.sect) w.sect.post = post.id;
  } else {
    // 長老改了位階與職司；執事只記在 posts，名冊上跟原本的職司並列（memberNow）
    if (post.kind === 'elder') ls.ranks[winner] = { rank: '長老', role: post.name };
    if (w.sect?.post === post.id) delete w.sect.post;
  }
}

// ── 年會 ────────────────────────────────────────────────

/** 年會：每年正月十六 */
const isMeetingDay = (day: number) => {
  const d = dateOf(day);
  return d.month === 0 && d.date === 16;
};

/** 退位：七十二歲以上的長老，年會上一半機會退下（成了太上長老、空出長老席） */
function retirements(w: World): { who: string; post: PostDef }[] {
  const out: { who: string; post: PostDef }[] = [];
  for (const p of POSTS.filter((x) => x.kind === 'elder')) {
    const h = holderOf(w, p.id);
    if (!h || h === 'hero') continue;
    const age = ageNow(MQ_MEMBERS[h as Key]?.age, w);
    if (age >= 72 && ((age * 7 + w.day) % 10) / 10 < 0.5 + (1 - vigor(age))) out.push({ who: h, post: p });
  }
  return out;
}

/** 掌門要不要傳位：七十五歲，或體力衰到五成五以下 */
export const leaderKey = (w: World) => (Object.entries(w.life?.ranks ?? {}).find(([, r]) => r.rank === '掌門')?.[0] ?? 'wen') as Key;
const wantsToRetire = (w: World) => {
  if (w.sect?.leader) return false;
  const k = leaderKey(w);
  const age = ageNow(MQ_MEMBERS[k]?.age, w);
  return age >= 75 || vigor(age) < 0.55;
};

/** 傳位：從真傳弟子裡挑（看實力、功績、名聲、跟掌門的交情） */
function successor(w: World): string {
  const pool = (Object.keys(MQ_MEMBERS) as Key[]).filter((k) => rankNow(w, k) === '真傳弟子' && !away(w, k));
  const score = (c: string) => {
    if (c === 'hero') {
      const h = st().hero;
      return heroPower(h) / 2 + (w.sect?.merit ?? 0) / 30 + h.fame / 3 + (w.relations.wen?.aff ?? 0) / 2;
    }
    return powerOf(w, c) / 2 + (c === 'lu' ? 30 : 0) + ageNow(MQ_MEMBERS[c as Key]?.age, w) / 4;
  };
  const all = w.sect?.id === 'mingquan' && w.sect.rank >= 3 ? [...pool, 'hero'] : pool;
  return all.sort((a, b) => score(b) - score(a))[0] ?? 'lu';
}

function handOver(w: World, heir: string) {
  const ls = lifeOf(w);
  ls.ranks ??= {};
  const old = leaderKey(w);
  ls.ranks[old] = { rank: '太上長老', role: '卸任的掌門，在後山清修' };
  // 接任的人原本兼的職位空出來（年會接著改選）
  for (const p of POSTS) if (holderOf(w, p.id) === heir) ls.posts = { ...ls.posts, [p.id]: '' };
  if (heir === 'hero') {
    if (w.sect) {
      w.sect.leader = true;
      delete w.sect.post;
    }
  } else ls.ranks[heir] = { rank: '掌門', role: `鳴泉劍派第八代掌門` };
  ls.news = [...ls.news, { day: w.day, text: `${nameOf(old)}傳位給${nameOf(heir)}`, who: [] }].slice(-20);
}

/** 年會的過程（有你在場）：退位、傳位、選舉。由現任掌門主持；你是掌門就由你主持（平票由你定） */
export async function annualMeeting(ctx: EventCtx) {
  const w = st().world;
  const chair = w.sect?.leader ? 'hero' : leaderKey(w);
  // 主持人的話：你主持時寫成旁白
  const host = (...t: string[]) => (chair === 'hero' ? t.map((x) => `你說：「${x}」`) : by(nameOf(chair))(...t));
  const say = (...t: string[]) => ctx.say(...host(...t));
  await ctx.say(
    chair === 'hero' ? '大殿裡站滿了人。你在正中的座位坐下，長老們分坐兩側，弟子們齊齊行禮。' : '大殿裡站滿了人。長老們坐在兩側，內門以上的弟子站在前排，記名弟子擠在殿門口張望。',
    ...host('今年的年會，開始吧。'),
  );
  // 退位
  for (const r of retirements(w)) {
    await say(`${nameOf(r.who)}年事已高，今年起卸下${r.post.name}之職，留在山上清修。`);
    st().updateWorld((x) => {
      const ls = lifeOf(x);
      ls.posts = { ...ls.posts, [r.post.id]: '' };
      (ls.ranks ??= {})[r.who] = { rank: '太上長老', role: `前${r.post.name}` };
      ls.news = [...ls.news, { day: x.day, text: `${nameOf(r.who)}卸下${r.post.name}之職`, who: [] }].slice(-20);
    });
  }
  // 傳位
  if (chair !== 'hero' && wantsToRetire(st().world)) {
    const heir = successor(st().world);
    await say('我年紀大了，劍也提不太動了。是時候把鳴泉交給年輕人。', '這些年來，真傳弟子們的品行、武功，我都看在眼裡。');
    st().updateWorld((x) => handOver(x, heir));
    if (heir === 'hero') {
      await say(`${st().hero.name}，鳴泉劍派第八代掌門，由你來當。`);
      await ctx.say('滿殿的人齊齊向你行禮。你接過那柄刻著「鳴泉」二字的古劍，只覺得沉甸甸的。');
      await ctx.hero((h) => ((h.fame += 30), '（接任鳴泉劍派掌門。名聲 +30）'));
    } else await say(`鳴泉劍派第八代掌門，由${nameOf(heir)}接任。`);
  }
  // 選舉
  const canVote = member() && sect().rank >= 2;
  const open = POSTS.filter((p) => p.kind === 'steward' || !holderOf(st().world, p.id));
  for (const p of open) {
    const x = st().world;
    const heroCan = member() && !x.sect?.leader && !(x.sect?.post && x.sect.post !== p.id) && (p.kind === 'steward' ? sect().rank >= 2 : sect().rank >= 3 && sect().merit >= 1200);
    let runs = false;
    if (heroCan && (await ctx.ask(`改選${p.name}：${p.desc}\n要出來競選嗎？`, ['參選', '不參選'])) === 0) runs = true;
    const cands = candidates(x, p, runs);
    if (!cands.length) continue;
    let vote: string | null = null;
    if (canVote) {
      const opts = cands.filter((c) => c !== 'hero' || runs);
      const i = await ctx.ask(`${p.name}的候選人：${cands.map(nameOf).join('、')}。你投誰？`, [...opts.map((c) => (c === 'hero' ? '投自己' : nameOf(c))), '不投']);
      vote = opts[i] ?? null;
    }
    const r = tally(x, p, cands, vote);
    let winner = r.winner;
    await ctx.say(`開票：${cands.map((c) => `${nameOf(c)} ${r.count[c]} 票`).join('、')}。`);
    if (r.tie && chair === 'hero') {
      // 你是掌門：平票由你裁定
      const tied = cands.filter((c) => r.count[c] === r.count[r.winner]);
      winner = tied[await ctx.ask('票數相同，由掌門裁定。你選誰？', tied.map(nameOf))] ?? r.winner;
    } else if (r.tie) await say('票數相同，由我來定。');
    st().updateWorld((y) => seat(y, p, winner));
    await ctx.say(...host(`${p.name}由${winner === 'hero' ? (chair === 'hero' ? '我' : '你') : nameOf(winner)}擔任。`));
    if (winner !== r.winner) addAffOf(winner, 3);
    const rWinner = winner;
    if (rWinner === 'hero') await ctx.hero((h) => ((h.fame += 3), `（當選${p.name}：月例多 ${p.bonus} 兩。名聲 +3）`));
  }
  st().updateWorld((y) => {
    lifeOf(y).meetingYear = yearOf(y.day);
  });
  await say('今年的年會就到這裡。各自好好練功，好好做事。');
}

/** 你沒來，年會照開（隔天半夜補算） */
function meetingWithoutHero(w: World) {
  for (const r of retirements(w)) {
    const ls = lifeOf(w);
    ls.posts = { ...ls.posts, [r.post.id]: '' };
    (ls.ranks ??= {})[r.who] = { rank: '太上長老', role: `前${r.post.name}` };
  }
  if (!w.sect?.leader && wantsToRetire(w)) handOver(w, successor(w));
  for (const p of POSTS.filter((x) => x.kind === 'steward' || !holderOf(w, x.id))) {
    const cands = candidates(w, p, false);
    if (cands.length) seat(w, p, tally(w, p, cands, null).winner);
  }
  const ls = lifeOf(w);
  ls.meetingYear = yearOf(w.day);
  ls.news = [...ls.news, { day: w.day, text: '今年的年會開過了，各職位重新選定', who: [] }].slice(-20);
}

onNewDay((w) => {
  const y = w.day - 1;
  if (isMeetingDay(y) && w.life?.meetingYear !== yearOf(y)) meetingWithoutHero(w);
});

/** 有人物檔案的同門，交情加一點 */
function addAffOf(k: string, n: number) {
  const person = (MQ_MEMBERS[k as Key] as SectMember | undefined)?.person;
  if (!person) return;
  st().updateWorld((w) => {
    const r = w.relations[person];
    if (r) r.aff = Math.min(100, r.aff + n);
  });
}

/** 年會那天找現任掌門（不是聞松年時，例如陸鳴川接任以後）就開年會 */
const prevTalk = lifeGroups().find((g) => g.id === 'mingquan')!.hooks?.talk;
lifeGroups().find((g) => g.id === 'mingquan')!.hooks!.talk = async (ctx, id, a) => {
  const w = st().world;
  if (id !== 'wen' && id === leaderKey(w) && !w.sect?.leader && member() && isMeetingDay(w.day) && w.life?.meetingYear !== yearOf(w.day)) {
    await annualMeeting(ctx);
    return true;
  }
  return prevTalk ? prevTalk(ctx, id, a) : false;
};
export const meetingPending = (w: World) => isMeetingDay(w.day) && w.life?.meetingYear !== yearOf(w.day);

setWenHook(async (ctx) => {
  const w = st().world;
  if (!isMeetingDay(w.day) || w.life?.meetingYear === yearOf(w.day)) return false;
  // 聞松年卸任以後，年會不歸他主持
  if (!member() || leaderKey(w) !== 'wen' || w.sect?.leader) return false;
  await annualMeeting(ctx);
  return true;
});

// ── 授徒考驗、收徒、指點 ─────────────────────────────────

const han = by(MQ.han);
const TEACH_Q = [
  { q: '徒弟練了三個月還是學不會一招，你怎麼辦？', a: ['換一個徒弟', '拆成小步，一步一步帶', '罵到他會為止'], right: 1 },
  { q: '徒弟的劍法跟你的路數不同，卻打得不差，你怎麼看？', a: ['硬改成跟我一樣', '順著他的長處教', '不管他'], right: 1 },
  { q: '徒弟在外頭闖了禍，對方找上門來，你怎麼做？', a: ['先問清楚，該賠的賠、該罰的罰', '護著自己人', '把徒弟交出去了事'], right: 0 },
];
/** 能不能收徒、最多幾個 */
export const canTeach = () => !!st().flags.mq_teach;
const apprenticeCap = (w: World) => (w.sect?.leader || (w.sect?.post && postDef(w.sect.post).kind === 'elder') ? 5 : (w.sect?.rank ?? 0) >= 3 ? 3 : 2);
export const apprentices = (w: World) => Object.entries(w.life?.members ?? {}).filter(([, m]) => m.master === 'hero').map(([k]) => k);

setTeachExamHook(async (ctx) => {
  const w = st().world;
  if (canTeach()) return false;
  const level = st().hero.skills.find((s) => s.id === 'mingquan')?.level ?? 0;
  const ok = w.day - sect().rankDay >= 15 && sect().merit >= 300 && level >= 7;
  if (!ok) return false;
  if ((await ctx.ask(han('你入內門也有些時日了。想收徒的話，先過我這一關。')[0], ['請長老考我', '先不了'])) !== 0) return false;
  let right = 0;
  for (const { q, a, right: r } of TEACH_Q) if ((await ctx.ask({ speaker: MQ.han, text: q }, a)) === r) right++;
  if (right < 2) {
    await ctx.say(...han(`三問對了 ${right} 問。帶人比自己練劍難多了，再想想。`));
    return true;
  }
  ctx.pass(2);
  await ctx.say(...han('再來，帶小豆練一套劍給我看。'), `${MQ.cao}緊張兮兮地站到你面前。你一招一招拆給他看，他總算把整套劍練下來了。`, ...han('好。往後你可以收徒了。徒弟教得好不好，也算在你的功績裡。'));
  ctx.setFlag('mq_teach', 1);
  await ctx.say(`（${st().updateWorld((x) => addContrib(x, 5))}）`);
  return true;
});

const GROUP = () => lifeGroups().find((g) => g.id === 'mingquan')!;

/** 收徒：沒有師父的記名、正式弟子；有人物檔案的看交情，其他人看你的實力 */
async function takeApprentice(ctx: EventCtx, id: string) {
  const w = st().world;
  const d = GROUP().npcs.find((n) => n.id === id)!;
  if (apprentices(w).length >= apprenticeCap(w)) return void (await ctx.say(`（你已經收了 ${apprenticeCap(w)} 個徒弟，照門規不能再收）`));
  const aff = d.person ? (w.relations[d.person]?.aff ?? 0) : 0;
  const willing = d.person ? aff >= 40 : heroPower(st().hero) > (w.life?.members[id]?.power ?? 20) + 10;
  if (!willing) return void (await ctx.say({ speaker: d.name, text: d.person ? '……我們還不算太熟，這事讓我再想想。' : '師兄的好意我心領了，只是……我想再多看看。' }));
  st().updateWorld((x) => {
    const ls = lifeOf(x);
    (ls.members[id] ??= { power: d.power ?? 20, rank: d.rank ?? 0 }).master = 'hero';
    ls.news = [...ls.news, { day: x.day, text: `${d.name}拜了${st().hero.name}為師`, who: [id] }].slice(-20);
  });
  await ctx.say(`${d.name}跪下來，恭恭敬敬地磕了三個頭：「師父在上，請受徒兒一拜！」`, '（收了一個徒弟。每天可以找他「指點」一次，他會長得比別人快）');
}

/** 指點徒弟：一天一次 */
async function teach(ctx: EventCtx, id: string) {
  const d = GROUP().npcs.find((n) => n.id === id)!;
  ctx.pass(2);
  st().updateWorld((x) => {
    const m = lifeOf(x).members[id];
    m.power += 1.5;
    m.taughtDay = x.day;
  });
  await ctx.say(`你看著${d.name}練了一遍劍，指出幾處毛病，又親手示範了兩招。`, { speaker: d.name, text: '多謝師父！我明白了！' }, '（指點了兩刻）');
  await ctx.say(`（${st().updateWorld((x) => addContrib(x, 1))}）`);
}

GROUP().hooks = {
  ...GROUP().hooks,
  extra: (ctx, id, a: Assign | undefined) => {
    const w = st().world;
    if (!member() || !a || a.act === 'sleep' || a.act === 'class' || a.act === 'lead' || a.act === 'spar') return [];
    const m = w.life?.members[id];
    const d = GROUP().npcs.find((n) => n.id === id)!;
    if (m?.master === 'hero') return m.taughtDay === w.day ? [] : [['指點徒弟（兩刻）', () => teach(ctx, id)]];
    const r = m?.rank ?? d.rank ?? 0;
    if (canTeach() && r <= 1 && !m?.master && !['lu', 'han', 'wen'].includes(id)) return [['收為徒弟', () => takeApprentice(ctx, id)]];
    return [];
  },
};

// ── 名冊：年紀、職位、位階的變化 ──────────────────────────

const prevNow = MINGQUAN.memberNow;
MINGQUAN.memberNow = (m, w) => {
  const base = prevNow?.(m, w) ?? {};
  const k = key(m.name);
  if (!k) return base;
  const over = w.life?.ranks?.[k];
  const post = postOf(w, k);
  const out: Partial<SectMember> = { ...base, age: ageNow(m.age, w) };
  if (over?.rank) out.rank = over.rank;
  if (over?.role) out.role = over.role;
  else if (post && post.kind === 'steward') out.role = `${m.role ? `${m.role}・` : ''}${post.name}`;
  const mm = w.life?.members[k];
  // 標在職司欄（近況欄有字的列會變灰，那是給下山的人用的）
  if (mm?.master === 'hero') out.role = [out.role ?? m.role, '你的徒弟'].filter(Boolean).join('・');
  return out;
};

/** 名冊上你的職位與身分（SectPage 用） */
export function heroStanding(w: World): { post?: string; leader: boolean; vote: boolean; teach: boolean; heir: boolean; apprentices: string[] } {
  const s = w.sect;
  return {
    post: s?.post ? postDef(s.post).name : undefined,
    leader: !!s?.leader,
    vote: (s?.rank ?? 0) >= 2,
    teach: canTeach(),
    heir: (s?.rank ?? 0) >= 3,
    apprentices: apprentices(w).map(nameOf),
  };
}
/** 月例加給（職位） */
export const postBonus = (w: World) => (w.sect?.leader ? 60 : w.sect?.post ? postDef(w.sect.post).bonus : 0);
MINGQUAN.stipendBonus = postBonus;
/** 名冊上你排在哪一組：掌門、長老，或照身分 */
MINGQUAN.heroRankNow = (s) => (s.leader ? '掌門' : s.post && postDef(s.post).kind === 'elder' ? '長老' : undefined);
MINGQUAN.heroRoleNow = (s) => (s.leader ? '鳴泉劍派第八代掌門' : s.post ? postDef(s.post).name : undefined);

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const out: { text: string; state: 'todo' | 'done'; note?: string }[] = [];
  for (let d = 0; d <= 5; d++)
    if (!world.sect?.leader && isMeetingDay(world.day + d) && world.life?.meetingYear !== yearOf(world.day + d))
      out.push({ text: d ? `${d} 天後是門派年會（正月十六，大殿找掌門）` : '今天是門派年會（辰時到午時，大殿找掌門）', state: 'todo', note: (world.sect?.rank ?? 0) >= 2 ? '你有投票權，也能競選執事' : undefined });
  for (const k of apprentices(world)) if (world.life?.members[k]?.taughtDay !== world.day) out.push({ text: `指點徒弟${nameOf(k)}`, state: 'todo' });
  return out;
});
