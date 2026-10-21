import { gainInsight, giveItem, ITEMS, nextMove, skillDef } from '../character';
import { ART_ACTION } from '../arts';
import { craftOf, gainCraft } from '../crafts';
import { playChess } from './arts';
import { MOVES } from '../battle/moves';
import type { EventCtx, Script } from '../events';
import type { Line } from '../maps/types';
import { clampAff, newRelation, Relation, STAGES, stageOf } from '../social';
import { maybeDayEvent } from './schedule';
import { orderTalk } from './orders';
import { GIVERS } from '../orders';
import { isMealTime } from '../time';
import { currentMapId } from '../save';
import { registerDayEvent } from '../schedule';
import { useGame } from '../../state/store';
import { Convo, PEOPLE, PersonDef } from './people';

/**
 * 人際互動：交談、切磋、贈禮、請教、交易。面對有人物檔案的 NPC 時，
 * 畫面列出目前能做的事（依熟悉度逐步開放），按對應的鍵執行。
 */

export type Action = 'talk' | 'spar' | 'gift' | 'teach' | 'trade' | 'hobby';
export const ACTIONS: Record<Action, { key: string; name: string }> = {
  talk: { key: 'E', name: '交談' },
  spar: { key: 'F', name: '切磋' },
  gift: { key: 'G', name: '贈禮' },
  teach: { key: 'R', name: '請教' },
  trade: { key: 'T', name: '交易' },
  // 琴棋書畫：顯示的名稱依對方的嗜好（見 actionName）
  hobby: { key: 'H', name: '雅趣' },
};

/** 動作在畫面上的名稱：雅趣依對方的嗜好叫論琴、對弈、品字、賞畫 */
export const actionName = (id: string, a: Action) => (a === 'hobby' && PEOPLE[id]?.hobby ? ART_ACTION[PEOPLE[id].hobby!.art] : ACTIONS[a].name);
/** 鍵盤按鍵 → 動作（E 由「互動」處理，不在這裡） */
export const KEY_ACTION: Record<string, Action> = { f: 'spar', g: 'gift', r: 'teach', t: 'trade', h: 'hobby' };

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
  if (p.hobby && s >= p.hobby.stage) out.push('hobby');
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
    if (p.hobby && before < p.hobby.stage && after >= p.hobby.stage) notes.push(`可以和${p.name}${ART_ACTION[p.hobby.art]}了（按 H）`);
  }
  await ctx.say(`（你和${p.name}的關係變成了「${STAGES[after].name}」）${notes.length ? `\n${notes.join('\n')}` : ''}`);
}

// ── 交談 ────────────────────────────────────────────────

/** 有人在這裡一起吃飯的地圖（飯廳、廚房） */
const DINING = new Set(['mq_kitchen']);
/** 同桌吃飯時聊天，熟悉度多加這麼多 */
const MEAL_BONUS = 1;
const atMeal = () => isMealTime(st().world.time) && DINING.has(currentMapId() ?? '');

const talk =
  (p: PersonDef): Script =>
  async (ctx) => {
    const fmt = formatter(p);
    updateRel(p.id, () => undefined); // 記下「認識了」
    if (p.gate && !gateOpen(p)) {
      await ctx.say(...fmt(p.gate.refuse));
      return;
    }
    // 生活技能訂單：過期、交貨、接新單（見 orders.ts）
    if (GIVERS.some((g) => g.person === p.id) && (await orderTalk(withFormat(ctx, fmt), p.id, (n) => addAffinity(ctx, p, n)))) return;
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
      const stage = stageOf(r.aff);
      updateRel(p.id, (x) => {
        x.talk = { day, n: today + 1 };
        x.lineIdx++;
      });
      // 用餐時段在飯廳同桌吃飯：聊吃飯時的話題，熟悉度多加 1
      if (atMeal()) {
        const meal = (p.meal ?? []).filter(usable);
        if (meal.length) await ctx.say(...fmt(linesOf(meal[Math.floor(Math.random() * meal.length)])));
        else await ctx.say(`你端著碗坐到${p.name}旁邊，邊吃邊聊了幾句。`);
        await addAffinity(ctx, p, p.talk.gain + MEAL_BONUS);
        await maybeDayEvent(withFormat(ctx, fmt), 'chat', p.id);
        return;
      }
      // 偶爾換對方問你問題
      const ask = (p.asks ?? []).find((a) => (a.stage ?? 0) <= stage && !(r.asked ?? []).includes(a.id));
      if (ask && Math.random() < 0.4) {
        updateRel(p.id, (x) => (x.asked = [...(x.asked ?? []), ask.id]));
        const [q] = fmt([{ speaker: p.name, text: ask.q }]);
        const c = await ctx.ask(q, ask.answers.map((a) => fmt([{ text: a.say }])[0].text));
        const a = ask.answers[c];
        await ctx.say(...fmt([{ speaker: p.name, text: a.reply }]));
        await addAffinity(ctx, p, p.talk.gain + a.aff);
        await maybeDayEvent(withFormat(ctx, fmt), 'chat', p.id);
        return;
      }
      // 說目前這一階（以及之前各階）的話，隨機挑一句，不跟上一次重複；這一階的話機會比較大
      const tiers = Object.keys(p.lines).map(Number).filter((s) => s <= stage).sort((a, b) => b - a);
      const pool = tiers.flatMap((t, i) => (p.lines[t] ?? []).filter(usable).flatMap((_, j) => Array(i === 0 ? 2 : 1).fill(`${t}:${j}`)));
      const fresh = pool.filter((k) => k !== r.lastLine);
      const key = (fresh.length ? fresh : pool)[Math.floor(Math.random() * Math.max(1, (fresh.length ? fresh : pool).length))];
      if (key) {
        const [t, j] = key.split(':').map(Number);
        updateRel(p.id, (x) => (x.lastLine = key));
        await ctx.say(...fmt(linesOf((p.lines[t] ?? []).filter(usable)[j])));
      }
      await addAffinity(ctx, p, p.talk.gain);
      // 聊著聊著，偶爾發生一件小事（見 schedule.ts 的 DayEvent）
      await maybeDayEvent(withFormat(ctx, fmt), 'chat', p.id);
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

// ── 聊天時的小事（誰都可能碰上；跟特定的人才有的寫在各自的劇情檔）──────

/** 加熟悉度（小事用，不跳階段提示） */
function bump(id: string, n: number) {
  updateRel(id, (r) => {
    r.aff = clampAff(r.aff + n);
  });
  return `（${PEOPLE[id].name}的熟悉度 +${n}）`;
}

registerDayEvent({
  id: 'rain_shelter',
  after: ['chat'],
  weight: 3,
  when: (v) => v.world.weather === 'rain',
  run: async (ctx, who) => {
    if (!who) return;
    ctx.pass(2);
    await ctx.say(`雨越下越大，你和${PEOPLE[who].name}躲在屋簷下，一句接一句，不知不覺又聊了兩刻。`, bump(who, 2));
  },
});

registerDayEvent({
  id: 'small_gift',
  after: ['chat'],
  weight: 2,
  when: (v, who) => !!who && (v.world.relations[who]?.aff ?? 0) >= 30,
  run: async (ctx, who) => {
    if (!who) return;
    await ctx.say(`臨走前，${PEOPLE[who].name}往你手裡塞了一包東西：「自家的，別客氣。」`);
    await ctx.hero((h) => giveItem(h, Math.random() < 0.5 ? 'tea' : 'jinchuang'));
  },
});

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

// ── 雅趣：琴棋書畫的同好 ─────────────────────────────────

const hobby =
  (p: PersonDef): Script =>
  async (ctx) => {
    const h = p.hobby!;
    const art = h.art;
    const day = st().world.day;
    if (relOf(p.id).hobbyDay === day) {
      await ctx.say(`${p.name}：「今天盡興了，改日再來。」`);
      return;
    }
    const mine = craftOf(st().hero, art).level;
    updateRel(p.id, (r) => (r.hobbyDay = day));
    ctx.pass(4);
    if (art === 'chess') {
      const won = await playChess(ctx, p.name, h.level, h.style ?? 0);
      await ctx.say(won ? `${p.name}投子認輸，哈哈一笑：「好棋！」` : `${p.name}收起棋子：「棋力還欠些火候，多下幾盤就好了。」`, '（下了半個時辰）');
      await ctx.hero((c) => gainCraft(c, 'chess', won ? 25 : 15));
      await addAffinity(ctx, p, won ? 4 : 2);
      return;
    }
    // 琴、書、畫：造詣差不多就談得投機；還不會的話，對方教你入門
    const verb = { qin: '撫琴論曲', calligraphy: '品評字帖', painting: '一同賞畫' }[art];
    if (mine === 0) {
      const skill = { qin: '琴', calligraphy: '書法', painting: '作畫' }[art];
      await ctx.say(`${p.name}見你不懂${skill}，倒也不嫌，手把手教了你一些入門的功夫。
（花了半個時辰）`);
      await ctx.hero((c) => gainCraft(c, art, 40));
      await addAffinity(ctx, p, 1);
      return;
    }
    const close = mine >= h.level - 2;
    await ctx.say(
      `你和${p.name}${verb}，${close ? '談得十分投機，不知不覺半個時辰就過去了。' : '大多時候是你在聽，對方說的你只懂一半。'}
（花了半個時辰）`,
    );
    await ctx.hero((c) => gainCraft(c, art, 15 + h.level * 2));
    await addAffinity(ctx, p, close ? 3 : 1);
  };

const SCRIPTS: Record<Action, (p: PersonDef) => Script> = { talk, spar, gift, teach, trade, hobby };

/** 對某人做某件事的腳本；這件事目前還不能做就回傳 null */
export function personScript(id: string, action: Action): Script | null {
  const p = PEOPLE[id];
  if (!p || !availableActions(id).includes(action)) return null;
  return SCRIPTS[action](p);
}
