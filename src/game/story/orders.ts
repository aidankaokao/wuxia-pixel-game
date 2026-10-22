import { giveItem, ITEMS } from '../character';
import { registerDailyTasks } from '../daily';
import type { EventCtx } from '../events';
import { giverDef, GIVERS, newOrder, ORDER_GAP, orderHave, orderItems, orderOf, orderText } from '../orders';
import { dateText } from '../time';
import { useGame } from '../../state/store';

/**
 * 訂單的腳本：找下單的人說話時，先處理訂單（過期、交貨、接新單），處理了回傳 true。
 * 卜大勺、鍾嬸在人際系統的交談裡呼叫（story/social.ts），魏錦娘在布莊的選單裡呼叫，汪福來在望江樓的選單裡呼叫。
 */

const st = () => useGame.getState();
/** 沒有訂單時，說話時下新單的機率 */
const OFFER_CHANCE = 0.5;

/** affinity：交貨時加熟悉度（有人物檔案的人才給） */
export async function orderTalk(ctx: EventCtx, giver: string, affinity?: (n: number) => Promise<void>): Promise<boolean> {
  const g = giverDef(giver);
  const say = (text: string) => ({ speaker: g.name, text });
  const day = st().world.day;
  const o = orderOf(st().world, giver);
  const later = () => st().updateWorld((w) => ((w.orderNext ??= {})[giver] = w.day + ORDER_GAP));

  if (o) {
    if (day > o.due) {
      st().updateWorld((w) => delete w.orders![giver]);
      later();
      await ctx.say(say(`上回託你的${orderText(o)}，我等不及，找別人做了。`));
      return false;
    }
    if (orderHave(st().hero, o) < o.n) return false;
    const c = await ctx.ask(say(`我要的${orderText(o)}，做好啦？`), ['交貨', '還沒']);
    if (c !== 0) return true;
    st().updateHero((h) => {
      let left = o.n;
      for (const id of orderItems(o)) {
        const take = Math.min(left, h.items[id] ?? 0);
        if (!take) continue;
        h.items[id] -= take;
        if (!h.items[id]) delete h.items[id];
        left -= take;
      }
      h.silver += o.silver;
    });
    st().updateWorld((w) => delete w.orders![giver]);
    later();
    await ctx.say(say(o.kind === 'dish' ? '好手藝！這味道，夠格！' : o.kind === 'goods' ? '新鮮！客人就愛這一味，我這就送進廚房。' : '針腳細密，料子也勻，好東西。'), `（銀兩 +${o.silver}）`);
    await ctx.hero((h) => Object.entries(o.items).map(([id, n]) => giveItem(h, id, n)));
    if (o.aff && affinity) await affinity(o.aff);
    return true;
  }

  if (day < (st().world.orderNext?.[giver] ?? 0) || Math.random() >= OFFER_CHANCE) return false;
  const next = newOrder(g, st().hero, day);
  if (!next) return false;
  const gifts = Object.entries(next.items)
    .map(([id, n]) => `${ITEMS[id].name}×${n}`)
    .join('、');
  const ask =
    g.kind === 'goods'
      ? `樓裡的客人點名要${orderText(next)}，市面上不好買。${dateText(next.due)}以前送來，價錢好說！`
      : g.kind === 'dish'
        ? `想託你做${orderText(next)}，${dateText(next.due)}以前送來。`
        : `有位客人訂了${orderText(next)}，我這兒忙不過來，${dateText(next.due)}以前織好送來，成不成？`;
  const c = await ctx.ask(say(`${ask}\n（酬勞：銀兩 ${next.silver}、${gifts}）`), ['接下', '婉拒']);
  if (c !== 0) {
    later();
    await ctx.say(say('那就下回吧。'));
    return true;
  }
  st().updateWorld((w) => ((w.orders ??= {})[giver] = next));
  await ctx.say(say('那就說定了！'), `（接下訂單：${orderText(next)}。期限 ${dateText(next.due)}）`);
  return true;
}

/** 今日事：手上的訂單 */
registerDailyTasks(({ world, hero }) =>
  GIVERS.flatMap((g) => {
    const o = world.orders?.[g.id];
    if (!o || world.day > o.due) return [];
    const ready = orderHave(hero, o) >= o.n;
    return [{ text: `訂單：${g.name}要${orderText(o)}`, state: 'todo' as const, note: ready ? '東西齊了，回去交貨' : `期限 ${dateText(o.due)}` }];
  }),
);
