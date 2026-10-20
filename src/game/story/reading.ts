import { BookDef, bookOf, BOOKS, learningLevel, READ_STAGES, readBook, SHELVES } from '../books';
import type { EventCtx, Script } from '../events';
import { useGame } from '../../state/store';
import { exert, STAMINA } from './estate';

/**
 * 經史子集書架：挑一類、挑一本，讀一個時辰。
 * 學識不夠的書讀不懂；讀過的書會記得讀到哪裡（初讀 → 精通）。
 */

const st = () => useGame.getState();

export const readingShelf =
  (idle: string, allowed: () => boolean = () => true): Script =>
  async (ctx) => {
    if (!allowed()) {
      await ctx.say(idle);
      return;
    }
    const k = await ctx.ask(`${idle}\n要讀哪一類的書？（學識 ${learningLevel(st().hero)} 級）`, [...SHELVES, '算了']);
    if (k >= SHELVES.length) return;
    const list = BOOKS.filter((b) => b.shelf === SHELVES[k]);
    const lv = learningLevel(st().hero);
    const label = (b: BookDef) => {
      const p = bookOf(st().hero, b.id);
      return lv < b.level ? `《${b.name}》（學識 ${b.level} 級）` : `《${b.name}》${p ? `（${READ_STAGES[p.level]}）` : ''}`;
    };
    const i = await ctx.ask('讀哪一本？', [...list.map(label), '算了']);
    if (i >= list.length) return;
    await read(ctx, list[i]);
  };

async function read(ctx: EventCtx, b: BookDef) {
  if (learningLevel(st().hero) < b.level) {
    await ctx.say(`你翻開《${b.name}》，滿紙的字都認得，連起來卻不知道在說什麼。\n（學識練到 ${b.level} 級才讀得懂）`);
    return;
  }
  if (!(await exert(ctx, STAMINA.study, '讀了好一陣子，眼睛酸澀，字都在紙上跳。'))) return;
  await ctx.work('read', `讀《${b.name}》中……`);
  ctx.pass(4);
  const p = bookOf(st().hero, b.id);
  // 每讀一回換一句
  const n = p ? p.level * 5 + Math.floor(p.exp / 20) : 0;
  const line = b.lines[n % b.lines.length];
  await ctx.say(`${p ? `你接著讀《${b.name}》。` : `你取下《${b.name}》，從第一頁讀起。`}\n「${line}」\n（讀了一個時辰）`);
  const lines = st().updateHero((h) => readBook(h, b));
  if (lines.length) await ctx.say(lines.join('\n'));
}
