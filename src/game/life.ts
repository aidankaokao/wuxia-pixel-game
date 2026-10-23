/**
 * NPC 的日常（門派裡的人自己過日子）：每個時辰（一個時段 4 刻）依時段、天氣、個性排一件事，
 * 每件事有地點（地圖＋格子＋朝向）。地圖只顯示「現在該在這裡」的人；換事情時他們自己走過去，
 * 要換地圖就走出門、從另一張地圖的門走進來（MapScene 的找路）。
 *
 * - 固定的事先排：睡覺（夜裡回自己的床）、吃飯（午時、酉時到飯廳）、帶班的人的職責（例如晨課）。
 * - 其餘照個性的喜好（likes）抽：練樁、練劍、讀書、打坐、聊天、下棋、掃地、挑水、菜圃、散步……
 *   聊天要兩個人：抽到聊天的人兩兩配對，站到一組面對面的位置。
 * - 下雨、下雪：室外的事換成室內的（練功房、書房、宿舍）。
 * - 同一個位置一次只站一個人；同一天同一時段的安排固定（由存檔種子、日子、時段決定），讀檔也一樣。
 * 各門派的人物、地點、台詞在 story/life_*.ts 註冊（registerLife）。
 */

import type { Line } from './maps/types';
import type { EventCtx } from './events';
import type { Flags } from '../state/store';
import type { World } from './home';
import type { SectFund } from './sect_fund';
import { isMealTime, isXunxiu } from './time';

export type LifeAct =
  | 'sleep' | 'eat' | 'class' | 'lead' | 'stake' | 'sword' | 'read' | 'meditate' | 'chat' | 'sweep' | 'water' | 'garden' | 'stroll'
  | 'watch' | 'listen' | 'patrol' | 'guard' | 'spar' | 'shop'
  | 'boat' | 'fish' | 'mend' | 'stall' | 'play' | 'haul' | 'tea' | 'chess' | 'beg' | 'pick' | 'wash' | 'study' | 'pray'
  | 'farm' | 'forge' | 'carve' | 'sew' | 'home' | 'pluck' | 'tend';

/** 每件事的名字、頭上的小圖示、在原地走動的範圍、是不是室外 */
export const ACTS: Record<LifeAct, { name: string; icon: string; wander?: number; outdoor?: boolean; busy?: boolean }> = {
  sleep: { name: '睡覺', icon: 'zzz' },
  eat: { name: '吃飯', icon: 'bowl' },
  class: { name: '做晨課', icon: 'sword', outdoor: true, busy: true },
  lead: { name: '帶晨課', icon: 'sword', outdoor: true },
  stake: { name: '練樁', icon: 'fist', busy: true },
  sword: { name: '練劍', icon: 'sword', outdoor: true, busy: true },
  read: { name: '讀書', icon: 'book' },
  meditate: { name: '打坐', icon: 'zen', busy: true },
  chat: { name: '聊天', icon: 'chat' },
  sweep: { name: '掃地', icon: 'broom', wander: 2, outdoor: true },
  water: { name: '挑水', icon: 'bucket', outdoor: true },
  garden: { name: '整理菜圃', icon: 'sprout', wander: 1, outdoor: true },
  stroll: { name: '散步', icon: '', wander: 3, outdoor: true },
  watch: { name: '看比武', icon: 'eye' },
  listen: { name: '聽長老講武', icon: 'ear', busy: true },
  patrol: { name: '守夜', icon: 'lantern', wander: 3, outdoor: true },
  guard: { name: '守山門', icon: 'spear' },
  spar: { name: '比武', icon: 'sword', busy: true },
  shop: { name: '採買', icon: 'sack', wander: 2 },
  // 城裡、漁村、港口的人（4.29）
  boat: { name: '出船', icon: 'boat' },
  fish: { name: '釣魚', icon: 'fish', outdoor: true, busy: true },
  mend: { name: '補網', icon: 'net', outdoor: true, busy: true },
  stall: { name: '擺攤', icon: 'coin', outdoor: true },
  play: { name: '玩耍', icon: 'ball', wander: 3, outdoor: true },
  haul: { name: '搬貨', icon: 'crate', wander: 2, outdoor: true, busy: true },
  tea: { name: '喝茶聽書', icon: 'cup' },
  chess: { name: '下棋', icon: 'chess', outdoor: true, busy: true },
  beg: { name: '討飯', icon: 'bowl' },
  pick: { name: '採蓮', icon: 'lotus', wander: 1, outdoor: true, busy: true },
  wash: { name: '洗衣洗菜', icon: 'bucket', outdoor: true, busy: true },
  study: { name: '唸書', icon: 'book' },
  pray: { name: '上香', icon: 'incense' },
  // 青竹村（4.30）
  farm: { name: '下田', icon: 'sprout', wander: 1, outdoor: true, busy: true },
  forge: { name: '打鐵', icon: 'hammer', busy: true },
  carve: { name: '做木工', icon: 'hammer', outdoor: true, busy: true },
  sew: { name: '做針線', icon: 'needle' },
  // 鳴泉山田（4.31）
  pluck: { name: '採茶', icon: 'leaf', wander: 1, outdoor: true, busy: true },
  tend: { name: '照料藥圃', icon: 'sprout', wander: 1, outdoor: true, busy: true },
  // 醒著、沒事做（下雨天、想做的事沒位子）：在自己的床位那裡歇著
  home: { name: '在家歇著', icon: '' },
};

export interface Spot {
  map: string;
  x: number;
  y: number;
  facing: 'up' | 'down' | 'left' | 'right';
}
/** 一個地點：在哪、能做哪幾件事；聊天的地點兩兩一組（pair 是同組另一個地點的 id） */
export interface LifeSpot extends Spot {
  id: string;
  acts: LifeAct[];
  pair?: string;
}

export interface LifeNpc {
  id: string;
  name: string;
  sprite: string;
  /** 有人物檔案的人：交談走人際系統 */
  person?: string;
  script?: import('./events').Script;
  /** 依正在做的事說的話（沒有人物檔案、也沒有腳本時用）；default 是其他時候 */
  talks?: Partial<Record<LifeAct | 'default', Line[][]>>;
  /** 床位 */
  home: Spot;
  /** 飯廳的座位 */
  seat: Spot;
  /** 喜好：各件事被抽中的比重 */
  likes: Partial<Record<LifeAct, number>>;
  /** 起床、就寢的時刻（今天的第幾刻） */
  wake: number;
  sleep: number;
  /** 固定的職責：回傳這個時刻要做的事與地點（沒有就照喜好抽） */
  duty?: (time: number, w: World) => { act: LifeAct; at: Spot } | null;
  /** 晨課：記名弟子要上（卯時到巳時，旬休沒有）；升了正式弟子就不用（看 world.life 的 rank） */
  pupil?: boolean;
  /** 一開始的實力與身分（之後存在 world.life） */
  power?: number;
  rank?: number;
  /** 不在門派裡的時候（下山歷練、下山採買）在哪；沒有就是哪裡都看不到 */
  awayAt?: Spot;
  when?: (f: Flags) => boolean;
}

/** 同門之間的交情：要好、較勁、仰慕（a 仰慕 b） */
export interface Bond {
  a: string;
  b: string;
  kind: 'friend' | 'rival' | 'admire';
  note: string;
}

/**
 * 每個人存檔的狀態（world.life[id]）：實力（每天依做的事慢慢長）、身分（0 記名、1 正式）、
 * 下山歷練到哪天、今天跟誰吵了架。
 */
export interface LifeMember {
  power: number;
  rank: number;
  away?: { until: number; why: string };
  /** 吵架：跟誰、到哪天和好 */
  feud?: { with: string; until: number };
  /** 拜了誰為師（'hero' 是你）；上次被師父指點是哪天 */
  master?: string;
  taughtDay?: number;
}
export interface LifeState {
  members: Record<string, LifeMember>;
  /** 門派消息（升了正式弟子、下山歷練、回山、吵架和好……），給聊天、今日事用 */
  news: { day: number; text: string; who: string[] }[];
  /** 比武小會的名次（life id，'hero' 是你）與上次舉辦的日子 */
  ranking?: string[];
  meetDay?: number;
  /** 門派職位：職位 id → 誰擔任（名冊 key，'hero' 是你；沒有人就空著）；沒寫的照預設 */
  posts?: Record<string, string>;
  /** 誰升了什麼位階、誰退了下來（名冊 key → 位階或職司的覆寫） */
  ranks?: Record<string, { rank?: string; role?: string }>;
  /** 上次開年會是第幾年 */
  meetingYear?: number;
  /** 外務執事的差事：買什麼、幾件、哪天前交（4.28）；送茶進城（4.32）時 item 是 'tea'、n 是斤數、value 是這批茶的行情 */
  errand?: { item: string; n: number; day: number; due: number; done?: boolean; kind?: 'buy' | 'tea'; value?: number };
  /** 巡山執事排的守夜：哪一晚、誰 */
  watchPick?: { day: number; who: string };
  /** 掌門定的門派方針：重武、守成（預設）、寬和 */
  policy?: 'martial' | 'steady' | 'gentle';
  /** 門派公庫：銀兩、存糧、茶葉、藥材、月帳（4.31，見 sect_fund.ts） */
  fund?: SectFund;
}
export const lifeState = (w: World): LifeState => w.life ?? { members: {}, news: [] };
export const memberOf = (w: World, id: string, base: Partial<LifeMember> = {}): LifeMember => w.life?.members[id] ?? { power: base.power ?? 10, rank: base.rank ?? 0 };

export interface LifeGroup {
  id: string;
  /** 這一群人活動的地圖（不在這些地圖上就不用算） */
  maps: string[];
  npcs: LifeNpc[];
  spots: LifeSpot[];
  /** 晨課：哪段時間、帶班的人站哪、學生站哪幾格 */
  lesson?: { from: number; to: number; lead: string; leadAt: Spot; at: Spot[] };
  bonds?: Bond[];
  /** 跟他們互動（story/life_talk.ts 用）：主持活動的人先處理、一起練、一起打坐、對練、湊過去聽聊天 */
  hooks?: {
    talk?: (ctx: EventCtx, id: string, a: Assign | undefined) => Promise<boolean>;
    practiceWith?: (ctx: EventCtx, id: string) => Promise<void>;
    sitWith?: (ctx: EventCtx, id: string) => Promise<void>;
    sparWith?: (ctx: EventCtx, id: string) => Promise<void>;
    listen?: (ctx: EventCtx, a: string, b: string) => Promise<void>;
    /** 能不能一起練（例如要是本門弟子） */
    member?: () => boolean;
    /** 另外的選項（例如收徒、指點徒弟）：回傳 [選項文字, 要做的事] */
    extra?: (ctx: EventCtx, id: string, a: Assign | undefined) => [string, () => Promise<void>][];
  };
  /** 特別的活動（比武小會、講武……）：這個時段要誰去哪、做什麼，回傳要覆蓋的安排 */
  event?: (w: World, flags: Flags) => Record<string, Assign> | null;
}

const GROUPS: LifeGroup[] = [];
export const registerLife = (g: LifeGroup) => GROUPS.push(g);
export const lifeGroups = () => GROUPS;

export interface Assign {
  act: LifeAct;
  at: Spot;
  /** 聊天的對象（life id） */
  with?: string;
}

/** 一個時段 4 刻（一個小時） */
export const LIFE_BLOCK = 4;

function rand(seed: number, ...keys: (number | string)[]) {
  let h = seed >>> 0 || 1;
  for (const k of keys) for (const c of String(k)) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 2654435761) >>> 0;
  return (h % 100000) / 100000;
}

const cache = new Map<string, Record<string, Assign>>();

/** 這一群人現在各自在做什麼、在哪裡 */
export function lifeNow(g: LifeGroup, w: World, flags: Flags): Record<string, Assign> {
  const block = Math.floor(w.time / LIFE_BLOCK);
  const wet = w.weather === 'rain' || w.weather === 'snow';
  const ls = lifeState(w);
  const ver = JSON.stringify([Object.entries(ls.members).map(([k, m]) => [k, m.rank, m.away?.until ?? 0, m.feud?.until ?? 0]), ls.meetingYear, ls.posts, ls.ranks, ls.watchPick, w.sect?.post, w.sect?.leader]);
  const key = `${g.id}:${w.day}:${block}:${wet ? 1 : 0}:${isMealTime(w.time) ? 1 : 0}:${ver}`;
  const hit = cache.get(key);
  if (hit) return hit;
  if (cache.size > 64) cache.clear();
  const out: Record<string, Assign> = {};
  const taken = new Set<string>();
  const seed = w.seed ?? 1;
  const npcs = g.npcs.filter((n) => !n.when || n.when(flags));
  const free: LifeNpc[] = [];
  const lesson = g.lesson && !isXunxiu(w.day) && w.time >= g.lesson.from && w.time < g.lesson.to && !wet ? g.lesson : null;
  let seatIdx = 0;
  const ev = g.event?.(w, flags) ?? {};
  for (const n of npcs) {
    const m = memberOf(w, n.id, { power: n.power, rank: n.rank });
    const awake = w.time >= n.wake && w.time < n.sleep;
    if (m.away && m.away.until >= w.day) {
      if (n.awayAt) out[n.id] = { act: 'stroll', at: n.awayAt };
      continue;
    }
    if (ev[n.id] && awake) out[n.id] = ev[n.id];
    else if (!awake) out[n.id] = { act: 'sleep', at: n.home };
    else if (isMealTime(w.time)) out[n.id] = { act: 'eat', at: n.seat };
    else if (lesson && n.id === lesson.lead) out[n.id] = { act: 'lead', at: lesson.leadAt };
    else if (lesson && n.pupil && m.rank === 0 && seatIdx < lesson.at.length) out[n.id] = { act: 'class', at: lesson.at[seatIdx++] };
    else {
      const d = n.duty?.(w.time, w);
      // 下雨天室外的差事就免了
      if (d && !(wet && isOutdoorMap(d.at.map))) out[n.id] = d;
      else free.push(n);
    }
  }
  // 先排好的（活動、晨課、差事、吃飯）佔掉的格子，抽的時候不能再用
  for (const a of Object.values(out)) {
    const hit = g.spots.find((sp) => sp.map === a.at.map && sp.x === a.at.x && sp.y === a.at.y);
    if (hit) taken.add(hit.id);
  }
  // 照喜好抽；聊天的人等一下兩兩配對
  const chatters: LifeNpc[] = [];
  const order = [...free].sort((a, b) => rand(seed, w.day, block, a.id) - rand(seed, w.day, block, b.id));
  for (const n of order) {
    const opts = (Object.entries(n.likes) as [LifeAct, number][]).filter(([act]) => !(wet && ACTS[act].outdoor) && g.spots.some((s) => s.acts.includes(act) && !taken.has(s.id)));
    const total = opts.reduce((a, [, v]) => a + v, 0);
    let r = rand(seed, w.day, block, n.id, 'act') * total;
    const act = opts.find(([, v]) => (r -= v) < 0)?.[0] ?? opts[0]?.[0];
    if (!act) {
      out[n.id] = { act: 'home', at: n.home };
      continue;
    }
    if (act === 'chat') {
      chatters.push(n);
      continue;
    }
    const spots = g.spots.filter((s) => s.acts.includes(act) && !taken.has(s.id) && (!wet || !isOutdoorMap(s.map)));
    const s = spots[Math.floor(rand(seed, w.day, block, n.id, 'spot') * spots.length)];
    if (!s) {
      // 想做的事沒位子了：找個空著的地方讀書、打坐或散步，都沒有才回房
      const alt = g.spots.find((x) => !taken.has(x.id) && (wet ? !isOutdoorMap(x.map) : true) && x.acts.some((a) => a === 'read' || a === 'meditate' || a === 'stroll'));
      if (alt) {
        taken.add(alt.id);
        out[n.id] = { act: alt.acts.find((a) => a === 'read' || a === 'meditate' || a === 'stroll')!, at: alt };
      } else out[n.id] = { act: 'home', at: n.home };
      continue;
    }
    taken.add(s.id);
    out[n.id] = { act, at: s };
  }
  // 聊天：兩兩一組站到一對面對面的位置；落單的去散步（或在屋裡讀書）
  const pairs = g.spots.filter((s) => s.acts.includes('chat') && s.pair && s.id < s.pair && !taken.has(s.id) && !taken.has(s.pair) && (!wet || !isOutdoorMap(s.map)));
  // 要好的先湊一對；吵了架的不湊在一起
  const feud = (a: string, b: string) => {
    const fa = ls.members[a]?.feud;
    return !!fa && fa.with === b && fa.until >= w.day;
  };
  const score = (a: string, b: string) => {
    if (feud(a, b) || feud(b, a)) return -1;
    const bd = g.bonds?.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
    return (bd?.kind === 'friend' ? 3 : bd ? 2 : 1) + rand(seed, w.day, block, a, b);
  };
  const sorted: LifeNpc[] = [];
  const pool = [...chatters];
  while (pool.length) {
    const a = pool.shift()!;
    let best = -1;
    let bi = -1;
    pool.forEach((b, i) => {
      const v = score(a.id, b.id);
      if (v > best) (best = v), (bi = i);
    });
    sorted.push(a);
    if (bi >= 0 && best > 0) sorted.push(...pool.splice(bi, 1));
  }
  chatters.length = 0;
  chatters.push(...sorted);
  for (let i = 0; i + 1 < chatters.length; i += 2) {
    const a = chatters[i];
    const b = chatters[i + 1];
    if (feud(a.id, b.id) || feud(b.id, a.id)) {
      chatters.push(a, b);
      break;
    }
    const p = pairs[Math.floor(rand(seed, w.day, block, a.id, b.id) * pairs.length)];
    if (!p) {
      chatters.push(a, b);
      break;
    }
    pairs.splice(pairs.indexOf(p), 1);
    const q = g.spots.find((s) => s.id === p.pair)!;
    taken.add(p.id);
    taken.add(q.id);
    out[a.id] = { act: 'chat', at: p, with: b.id };
    out[b.id] = { act: 'chat', at: q, with: a.id };
  }
  for (const n of chatters.filter((c) => !out[c.id])) {
    const alt = g.spots.find((s) => s.acts.includes(wet ? 'read' : 'stroll') && !taken.has(s.id));
    if (alt) taken.add(alt.id);
    out[n.id] = alt ? { act: wet ? 'read' : 'stroll', at: alt } : { act: 'home', at: n.home };
  }
  cache.set(key, out);
  return out;
}

/** 室外地圖（沒有 theme 的）由各群人登記；預設：名字裡沒有底線的是室外 */
let outdoorMaps = new Set<string>();
export const setOutdoorMaps = (ids: string[]) => (outdoorMaps = new Set([...outdoorMaps, ...ids]));
const isOutdoorMap = (id: string) => outdoorMaps.has(id);

/** 某個人現在在做什麼（給對話、提示用） */
export function lifeOf(id: string, w: World, flags: Flags): { npc: LifeNpc; a: Assign } | null {
  for (const g of GROUPS) {
    const n = g.npcs.find((x) => x.id === id);
    if (n) {
      const a = lifeNow(g, w, flags)[id];
      return a ? { npc: n, a } : null;
    }
  }
  return null;
}
