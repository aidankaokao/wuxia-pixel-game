import { gainInsight, ITEMS, nextMove, skillDef } from '../character';
import { MOVES } from '../battle/moves';
import type { EventCtx, Script } from '../events';
import type { Line } from '../maps/types';
import { clampAff, newRelation, Relation, STAGES, stageOf } from '../social';
import { useGame } from '../../state/store';
import { Convo, PEOPLE, PersonDef } from './people';

/**
 * 人際互動：交談、切磋、贈禮、請教、交易。面對有人物檔案的 NPC 時，
 * 畫面列出目前能做的事（依熟悉度逐步開放），按對應的鍵執行。
 */

export type Action = 'talk' | 'spar' | 'gift' | 'teach' | 'trade';
export const ACTIONS: Record<Action, { key: string; name: string }> = {
  talk: { key: 'E', name: '交談' },
  spar: { key: 'F', name: '切磋' },
  gift: { key: 'G', name: '贈禮' },
  teach: { key: 'R', name: '請教' },
  trade: { key: 'T', name: '交易' },
};
/** 鍵盤按鍵 → 動作（E 由「互動」處理，不在這裡） */
export const KEY_ACTION: Record<string, Action> = { f: 'spar', g: 'gift', r: 'teach', t: 'trade' };

const st = () => useGame.getState();
export const relOf = (id: string): Relation => st().world.relations[id] ?? newRelation();
const updateRel = <T>(id: string, fn: (r: Relation) => T): T =>
  st().updateWorld((w) => {
    w.relations[id] ??= newRelation();
    return fn(w.relations[id]);
  });

const gateOpen = (p: PersonDef) => !p.gate || p.gate.open(st().flags, st().hero.fame);

/** 目前能對這個人做的事 */
export function availableActions(id: string): Action[] {
  const p = PEOPLE[id];
  if (!p || !gateOpen(p)) return ['talk'];
  const s = stageOf(relOf(id).aff);
  const out: Action[] = ['talk'];
  if (p.spar && s >= p.spar.stage) out.push('spar');
  if (p.gift) out.push('gift');
  if (p.teach && s >= p.teach.stage) out.push('teach');
  if (p.trade) out.push('trade');
  return out;
}

/** 互動提示的標題：名字與目前關係 */
export function personTitle(id: string) {
  const p = PEOPLE[id];
  return `${p.name}（${STAGES[stageOf(relOf(id).aff)].name}）`;
}

/** 對方現在怎麼稱呼你（選單顯示用） */
export function addressOf(id: string): string {
  const p = PEOPLE[id];
  const hero = st().hero;
  const surname = hero.surname || hero.given;
  return p.address(stageOf(relOf(id).aff), hero.fame).replace('{姓}', surname).replace('{名}', hero.given);
}

/** 對方怎麼稱呼你，並代入台詞裡的 {稱}、{姓}、{名} */
function formatter(p: PersonDef) {
  const hero = st().hero;
  const surname = hero.surname || hero.given;
  const address = p.address(stageOf(relOf(p.id).aff), hero.fame).replace('{姓}', surname).replace('{名}', hero.given);
  const fmt = (t: string) => t.replaceAll('{稱}', address).replaceAll('{姓}', surname).replaceAll('{名}', hero.given);
  return (lines: Line[]) => lines.map((l) => ({ ...l, text: fmt(l.text) }));
}

const linesOf = (c: Convo) => (Array.isArray(c) ? c : c.lines);
const usable = (c: Convo) => Array.isArray(c) || c.when(st().flags);

/** 改變熟悉度；跨過階段時告訴玩家，並說明新開放的互動 */
async function addAffinity(ctx: EventCtx, p: PersonDef, n: number) {
  if (!n) return;
  const before = stageOf(relOf(p.id).aff);
  updateRel(p.id, (r) => {
    r.aff = clampAff(r.aff + n);
  });
  st().showToast(`${p.name} 熟悉度 ${n > 0 ? '+' : ''}${n}`);
  const after = stageOf(relOf(p.id).aff);
  if (after === before) return;
  const notes: string[] = [];
  if (after > before) {
    if (p.spar && before < p.spar.stage && after >= p.spar.stage) notes.push(`可以和${p.name}切磋了（按 F）`);
    if (p.teach && before < p.teach.stage && after >= p.teach.stage) notes.push(`可以向${p.name}請教武學了（按 R）`);
  }
  await ctx.say(`（你和${p.name}的關係變成了「${STAGES[after].name}」）${notes.length ? `\n${notes.join('\n')}` : ''}`);
}

// ── 交談 ────────────────────────────────────────────────

const talk =
  (p: PersonDef): Script =>
  async (ctx) => {
    const fmt = formatter(p);
    updateRel(p.id, () => undefined); // 記下「認識了」
    if (p.gate && !gateOpen(p)) {
      await ctx.say(...fmt(p.gate.refuse));
      return;
    }
    if (p.story && (await p.story(ctx))) return;

    // 熟悉度到了的事件，下次交談時觸發
    const aff = relOf(p.id).aff;
    const ev = p.events?.find((e) => aff >= e.at && !relOf(p.id).events.includes(e.id));
    if (ev) {
      updateRel(p.id, (r) => r.events.push(ev.id));
      await ev.script(withFormat(ctx, fmt));
      return;
    }

    const day = st().world.day;
    const r = relOf(p.id);
    const today = r.talk.day === day ? r.talk.n : 0;
    if (today < p.talk.perDay) {
      // 今天還能增進感情：說目前階段的話
      const stage = stageOf(r.aff);
      const tier = Math.max(...Object.keys(p.lines).map(Number).filter((s) => s <= stage), -1);
      const pool = (p.lines[tier] ?? []).filter(usable);
      const idx = r.lineIdx % Math.max(1, pool.length);
      updateRel(p.id, (x) => {
        x.talk = { day, n: today + 1 };
        x.lineIdx++;
      });
      if (pool.length) await ctx.say(...fmt(linesOf(pool[idx])));
      await addAffinity(ctx, p, p.talk.gain);
      return;
    }
    // 今天聊夠了：說在忙，或輪流閒聊（不再加熟悉度）
    const pool = p.talk.after === 'chat' && p.idle.length ? p.idle.filter(usable) : null;
    if (pool?.length) {
      const idx = r.chatIdx % pool.length;
      updateRel(p.id, (x) => x.chatIdx++);
      await ctx.say(...fmt(linesOf(pool[idx])));
    } else {
      const busy = [`${p.name}：「我還有事要忙，改天再聊吧。」`, `${p.name}擺擺手：「今天就先這樣吧。」`];
      updateRel(p.id, (x) => x.chatIdx++);
      await ctx.say(busy[r.chatIdx % busy.length]);
    }
  };

/** 事件腳本裡的台詞也要代入稱呼 */
function withFormat(ctx: EventCtx, fmt: (l: Line[]) => Line[]): EventCtx {
  const one = (l: Line | string): Line | string => (typeof l === 'string' ? fmt([{ text: l }])[0].text : fmt([l])[0]);
  return { ...ctx, say: (...lines) => ctx.say(...lines.map(one)), ask: (line, choices) => ctx.ask(one(line), choices) };
}

// ── 贈禮 ────────────────────────────────────────────────

const gift =
  (p: PersonDef): Script =>
  async (ctx) => {
    const fmt = formatter(p);
    if (!p.gift) {
      await ctx.say(...fmt(p.refuseGift ?? [{ text: `${p.name}搖搖頭：「無功不受祿。」` }]));
      return;
    }
    const items = Object.keys(st().hero.items).filter((id) => st().hero.items[id] > 0 && !ITEMS[id].manual && !ITEMS[id].bound);
    if (!items.length) {
      await ctx.say('身上沒有可以送的東西。');
      return;
    }
    const shown = items.slice(0, 6);
    const i = await ctx.ask(`要送什麼給${p.name}？`, [...shown.map((id) => `${ITEMS[id].name}（${st().hero.items[id]}）`), '算了']);
    if (i >= shown.length) return;
    const item = shown[i];
    // 支線要的東西不受每日限制
    if (p.onGift && (await p.onGift(withFormat(ctx, fmt), item))) {
      takeItem(item);
      updateRel(p.id, (r) => {
        if (p.gift!.likes[item] && !r.known.includes(item)) r.known.push(item);
      });
      await addAffinity(ctx, p, (p.gift.likes[item] ?? 1) + 10);
      return;
    }
    const day = st().world.day;
    if (relOf(p.id).giftDay === day) {
      await ctx.say(`${p.name}：「今天已經收過你的禮了，心意我明白。」`);
      return;
    }
    takeItem(item);
    const like = p.gift.likes[item];
    const dislike = p.gift.dislikes?.[item];
    updateRel(p.id, (r) => {
      r.giftDay = day;
      if ((like || dislike) && !r.known.includes(item)) r.known.push(item);
    });
    if (like) await ctx.say(`${p.name}眼睛一亮，看得出很喜歡這份「${ITEMS[item].name}」。`);
    else if (dislike) await ctx.say(`${p.name}皺了皺眉，勉強收下了「${ITEMS[item].name}」。`);
    else await ctx.say(`${p.name}客氣地收下了「${ITEMS[item].name}」。`);
    await addAffinity(ctx, p, like ?? (dislike ? -dislike : 1));
  };

function takeItem(id: string) {
  st().updateHero((c) => {
    c.items[id]--;
    if (!c.items[id]) delete c.items[id];
  });
}

// ── 切磋、請教、交易 ────────────────────────────────────

const spar =
  (p: PersonDef): Script =>
  async (ctx) => {
    const s = p.spar!;
    const day = st().world.day;
    if (relOf(p.id).sparDay === day) {
      await ctx.say(`${p.name}：「今天已經比過了，明天再來！」`);
      return;
    }
    const c = await ctx.ask(`要和${p.name}切磋嗎？（點到為止，輸了也不會受重傷）`, ['請賜教', '改天吧']);
    if (c !== 0) return;
    updateRel(p.id, (r) => (r.sparDay = day));
    const o = await ctx.battle(s.encounter);
    if (o === 'win') await ctx.say(`${p.name}收招抱拳：「好身手！佩服。」`);
    else if (o === 'lose') await ctx.say(`${p.name}收招一笑：「承讓了。」`);
    else await ctx.say(`你拱手認輸，${p.name}笑著點了點頭。`);
    await addAffinity(ctx, p, o === 'win' ? s.win : s.lose);
  };

const teach =
  (p: PersonDef): Script =>
  async (ctx) => {
    const day = st().world.day;
    if (relOf(p.id).teachDay === day) {
      await ctx.say(`${p.name}：「貪多嚼不爛，今天就到這裡。」`);
      return;
    }
    const ready = st().hero.skills.filter((s) => {
      const n = nextMove(s);
      return n && s.level >= n.level;
    });
    if (!ready.length) {
      await ctx.say(`${p.name}：「你眼下的功夫，還得自己多練練，才有可問的。」\n（武功要練到一定重數，才有下一招可以參悟）`);
      return;
    }
    const i = await ctx.ask(`要向${p.name}請教哪一門武功？`, [...ready.map((s) => `${skillDef(s).name}（領悟 ${s.insight}%）`), '算了']);
    if (i >= ready.length) return;
    updateRel(p.id, (r) => (r.teachDay = day));
    const id = ready[i].id;
    const name = skillDef(ready[i]).name;
    ctx.pass(2);
    await ctx.say(`${p.name}聽你說完，指點了幾處關竅……\n（請教了兩刻）`);
    await ctx.hero((h) => {
      const before = h.skills.find((s) => s.id === id)!.level;
      const learned = gainInsight(h, id, p.teach!.insight);
      const s = h.skills.find((k) => k.id === id)!;
      if (!learned) return `對「${name}」的下一招豁然開朗了一些（領悟 ${s.insight}%）。`;
      return [`靈光一閃！你從「${name}」中悟出了「${MOVES[learned].name}」！`, s.level > before ? `「${name}」隨之精進至第 ${s.level} 重！` : null];
    });
    await addAffinity(ctx, p, 1);
  };

const trade =
  (p: PersonDef): Script =>
  async (ctx) => {
    await ctx.panel({ kind: 'shop', person: p.id });
  };

/** 交易的熟悉度：花（或賺）了多少兩 */
export function tradeAffinity(id: string, silver: number): number {
  const p = PEOPLE[id];
  if (!p?.trade) return 0;
  const n = Math.floor(silver / p.trade.per);
  if (n > 0)
    updateRel(id, (r) => {
      r.aff = clampAff(r.aff + n);
    });
  return n;
}

/** 商家依熟悉度給的折扣 */
export const discountOf = (id: string) => PEOPLE[id]?.trade?.discount[stageOf(relOf(id).aff)] ?? 0;

const SCRIPTS: Record<Action, (p: PersonDef) => Script> = { talk, spar, gift, teach, trade };

/** 對某人做某件事的腳本；這件事目前還不能做就回傳 null */
export function personScript(id: string, action: Action): Script | null {
  const p = PEOPLE[id];
  if (!p || !availableActions(id).includes(action)) return null;
  return SCRIPTS[action](p);
}
