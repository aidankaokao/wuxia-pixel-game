import { canHold, ITEMS } from '../character';
import { craftOf, learnWork, workOf } from '../crafts';
import type { EventCtx, Script } from '../events';
import { GRADES } from '../gear';
import { by } from '../maps/rooms';
import { knowsPattern, patternDef, PatternDef, PATTERNS, weaveExp, weaveRoll, wovenItem } from '../weaving';
import { useGame } from '../../state/store';
import { exert } from './estate';

/**
 * 紡織的腳本：跟魏錦娘學樣式（teachPatterns），在布莊後頭的織機織衣物（loomAt）。
 * 每織一件花體力 10、一個時辰；品級隨機（見 weaving.ts 的 weaveRoll）。
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
  await ctx.say(...say(`看好了，「${p.name}」是這樣起針的……`), `${who}一邊織一邊講，你在旁邊跟著織了一遍。\n（花了一個時辰）`, `學會了「${p.name}」！要用：${needsText(p)}。`);
  st().updateHero((c) => {
    c.silver -= p.cost;
    learnWork(c, 'weaving', p.id);
  });
}

export const loomAt =
  (idle: string): Script =>
  async (ctx) => {
    const known = PATTERNS.filter((p) => knowsPattern(st().hero, p.id));
    if (!known.length) {
      await ctx.say(`${idle}\n（還不會紡織。跟老闆娘魏錦娘學個樣式再來）`);
      return;
    }
    const label = (p: PatternDef) => `${p.name}（熟練 ${workOf(st().hero, 'weaving', p.id)!.level}）${missing(p).length ? '　缺料' : ''}`;
    const i = await ctx.ask(`${idle}\n要織什麼？`, [...known.map(label), '算了']);
    if (i >= known.length) return;
    await weave(ctx, known[i]);
  };

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
  // 先擲品級，確定放得下再花料
  const grade = weaveRoll(st().hero, patternDef(p.id));
  const id = wovenItem(p.id, grade);
  if (!canHold(st().hero, id)) {
    await ctx.say('你手上東西太多，織好了也沒地方放。（行囊滿了，先賣掉或用掉一些吧）');
    return;
  }
  if (!(await exert(ctx, WEAVE_STAMINA, '手指都僵了，再織下去只會織錯。'))) return;
  ctx.pass(4);
  const ups = st().updateHero((c) => {
    for (const [m, n] of Object.entries(p.needs)) {
      c.items[m] -= n;
      if (!c.items[m]) delete c.items[m];
    }
    c.items[id] = (c.items[id] ?? 0) + 1;
    return weaveExp(c, p);
  });
  await ctx.say(
    '梭子在經線間來回穿梭，喀噠、喀噠……',
    `織好了一件「${name(id)}」！（${GRADES[grade]}）\n（花了一個時辰）`,
    ...(ups.length ? [ups.join('\n')] : []),
  );
}
