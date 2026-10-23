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
import type { Flags } from '../state/store';
import type { World } from './home';
import { isMealTime, isXunxiu } from './time';

export type LifeAct = 'sleep' | 'eat' | 'class' | 'lead' | 'stake' | 'sword' | 'read' | 'meditate' | 'chat' | 'sweep' | 'water' | 'garden' | 'stroll';

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
  /** 晨課：記名弟子要上（卯時到巳時，旬休沒有） */
  pupil?: boolean;
  when?: (f: Flags) => boolean;
}

export interface LifeGroup {
  id: string;
  /** 這一群人活動的地圖（不在這些地圖上就不用算） */
  maps: string[];
  npcs: LifeNpc[];
  spots: LifeSpot[];
  /** 晨課：哪段時間、帶班的人站哪、學生站哪幾格 */
  lesson?: { from: number; to: number; lead: string; leadAt: Spot; at: Spot[] };
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
  const key = `${g.id}:${w.day}:${block}:${wet ? 1 : 0}:${isMealTime(w.time) ? 1 : 0}`;
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
  for (const n of npcs) {
    const awake = w.time >= n.wake && w.time < n.sleep;
    if (!awake) out[n.id] = { act: 'sleep', at: n.home };
    else if (isMealTime(w.time)) out[n.id] = { act: 'eat', at: n.seat };
    else if (lesson && n.id === lesson.lead) out[n.id] = { act: 'lead', at: lesson.leadAt };
    else if (lesson && n.pupil && seatIdx < lesson.at.length) out[n.id] = { act: 'class', at: lesson.at[seatIdx++] };
    else {
      const d = n.duty?.(w.time, w);
      // 下雨天室外的差事就免了
      if (d && !(wet && isOutdoorMap(d.at.map))) out[n.id] = d;
      else free.push(n);
    }
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
      out[n.id] = { act: 'sleep', at: n.home };
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
      } else out[n.id] = { act: 'sleep', at: n.home };
      continue;
    }
    taken.add(s.id);
    out[n.id] = { act, at: s };
  }
  // 聊天：兩兩一組站到一對面對面的位置；落單的去散步（或在屋裡讀書）
  const pairs = g.spots.filter((s) => s.acts.includes('chat') && s.pair && s.id < s.pair && !taken.has(s.id) && (!wet || !isOutdoorMap(s.map)));
  for (let i = 0; i + 1 < chatters.length; i += 2) {
    const a = chatters[i];
    const b = chatters[i + 1];
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
    out[n.id] = alt ? { act: wet ? 'read' : 'stroll', at: alt } : { act: 'sleep', at: n.home };
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
