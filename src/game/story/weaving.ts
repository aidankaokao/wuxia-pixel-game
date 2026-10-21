import { canHold, ITEMS } from '../character';
import { craftOf, learnWork, workOf } from '../crafts';
import { withCost, type EventCtx, type Script } from '../events';
import { GRADES } from '../gear';
import { by } from '../maps/rooms';
import { FINE_SILK_GRADE, SUNNY_WEAVE, knowsPattern, patternDef, PatternDef, PATTERNS, weaveExp, weaveRoll, wovenItem } from '../weaving';
import { useGame } from '../../state/store';
import { askRounds, exert, roundsNote } from './estate';

/**
 * 紡織的腳本：跟魏錦娘學樣式（teachPatterns），在布莊後頭的織機織衣物（loomAt）。
 * 每織一件花體力 10、半個時辰；品級隨機（見 weaving.ts 的 weaveRoll）。
 */

const st = () => useGame.getState();
const name = (id: string) => ITEMS[id].name;
const needsText = (p: PatternDef) => Object.entries(p.needs).map(([id, n]) => `${name(id)}×${n}`).join('、');
export const WEAVE_STAMINA = 10;

export async function teachPatterns(ctx: EventCtx, who: string) {
  const say = by(who);
  const lv = craftOf(st().hero, 'weaving').level;
  const left = PATTERNS.filter((p) => !knowsPattern(st().hero, p.id));
  if (!left.length) {
    await ctx.say(...say('我會的都教給你了，往後就看你自己的手藝。'));
    return;
  }
  const can = left.filter((p) => lv >= p.level);
  const locked = left.filter((p) => lv < p.level);
  const hint = locked.length ? `\n（紡織練到 ${Math.min(...locked.map((p) => p.level))} 級，還能學更難的樣式）` : '';
  if (!can.length) {
    await ctx.say(...say('先把會的織熟了再說。'), hint.trim());
    return;
  }
  const i = await ctx.ask({ speaker: who, text: `想學哪個樣式？${hint}` }, [...can.map((p) => `${p.name}（${p.cost ? `${p.cost} 兩` : '不收錢'}）`), '算了']);
  if (i >= can.length) return;
  const p = can[i];
  if (st().hero.silver < p.cost) {
    await ctx.say(...say(`學「${p.name}」要 ${p.cost} 兩，你的銀兩不夠。`));
    return;
  }
  ctx.pass(4);
  await ctx.say(...say(`看好了，「${p.name}」是這樣起針的……`), `${who}一邊織一邊講，你在旁邊跟著織了一遍。\n（花了半個時辰）`, `學會了「${p.name}」！要用：${needsText(p)}。`);
  st().updateHero((c) => {
    c.silver -= p.cost;
    learnWork(c, 'weaving', p.id);
  });
}

export const loomAt =
  (idle: string): Script =>
  withCost(() => (PATTERNS.some((p) => knowsPattern(st().hero, p.id)) ? { ke: 4, stamina: WEAVE_STAMINA } : null), async (ctx) => {
    const known = PATTERNS.filter((p) => knowsPattern(st().hero, p.id));
    if (!known.length) {
      await ctx.say(`${idle}\n（還不會紡織。跟老闆娘魏錦娘學個樣式再來）`);
      return;
    }
    const label = (p: PatternDef) => `${p.name}（熟練 ${workOf(st().hero, 'weaving', p.id)!.level}）${missing(p).length ? '　缺料' : ''}`;
    const i = await ctx.ask(`${idle}\n要織什麼？`, [...known.map(label), '算了']);
    if (i >= known.length) return;
    await weave(ctx, known[i]);
  });

const missing = (p: PatternDef) =>
  Object.entries(p.needs)
    .filter(([id, n]) => (st().hero.items[id] ?? 0) < n)
    .map(([id, n]) => `${name(id)}×${n - (st().hero.items[id] ?? 0)}`);

async function weave(ctx: EventCtx, p: PatternDef) {
  const lack = missing(p);
  if (lack.length) {
    await ctx.say(`「${p.name}」要用：${needsText(p)}。\n還缺：${lack.join('、')}。`);
    return;
  }
  if (!canHold(st().hero, wovenItem(p.id, 0))) {
    await ctx.say('你手上東西太多，織好了也沒地方放。（行囊滿了，先賣掉或用掉一些吧）');
    return;
  }
  // 有上品絲線（旬休趕集買的）可以摻進去：每件一綑，品級至少精良
  const fine = st().hero.items.fine_silk ?? 0;
  const useFine = fine > 0 && (await ctx.ask(`要摻上品絲線嗎？每件一綑，織出來至少是「${GRADES[FINE_SILK_GRADE]}」。（還有 ${fine} 綑）`, ['摻上品絲線', '不用'])) === 0;
  // 材料夠織幾件，就最多連織幾件
  const byMaterial = Math.min(...Object.entries(p.needs).map(([m, n]) => Math.floor((st().hero.items[m] ?? 0) / n)), useFine ? fine : 99);
  const rounds = await askRounds(ctx, WEAVE_STAMINA, '織', byMaterial);
  if (!rounds) return;
  if (!(await exert(ctx, WEAVE_STAMINA * rounds, '手指都僵了，再織下去只會織錯。'))) return;
  await ctx.work('weave', `織${p.name}中……${rounds > 1 ? `（${rounds} 件）` : ''}`);
  // 每件各擲品級；行囊滿了就停，沒織的那幾件體力退回。晴天織得比較好
  const sunny = st().world.weather === 'clear';
  const made: string[] = [];
  const ups = st().updateHero((c) => {
    const out: string[] = [];
    for (let k = 0; k < rounds; k++) {
      const rolled = weaveRoll(c, patternDef(p.id), Math.random, sunny ? SUNNY_WEAVE : 0);
      const grade = useFine ? Math.max(rolled, FINE_SILK_GRADE) : rolled;
      const id = wovenItem(p.id, grade);
      if (!canHold(c, id)) break;
      for (const [m, n] of Object.entries({ ...p.needs, ...(useFine ? { fine_silk: 1 } : {}) })) {
        c.items[m] -= n;
        if (!c.items[m]) delete c.items[m];
      }
      c.items[id] = (c.items[id] ?? 0) + 1;
      made.push(`「${name(id)}」（${GRADES[grade]}）`);
      out.push(...weaveExp(c, p));
    }
    c.stamina += WEAVE_STAMINA * (rounds - made.length);
    return out;
  });
  if (!made.length) {
    await ctx.say('你手上東西太多，織好了也沒地方放。（行囊滿了，先賣掉或用掉一些吧）');
    return;
  }
  ctx.pass(4 * made.length);
  await ctx.say(
    `梭子在經線間來回穿梭，喀噠、喀噠……${sunny ? '\n（大晴天，光線好，絲線也乾爽，織起來格外順手）' : ''}`,
    made.length > 1
      ? `織好了 ${made.length} 件：\n${made.join('、')}\n${roundsNote('織', made.length, 4)}${made.length < rounds ? '\n（行囊滿了，剩下的沒織）' : ''}`
      : `織好了一件${made[0]}！\n（花了半個時辰）`,
    ...(ups.length ? [ups.join('\n')] : []),
  );
}
