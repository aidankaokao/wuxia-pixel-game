import type { Script } from '../events';
import { dishItem } from '../cooking';
import type { WorldNode } from '../world/geo';
import { useGame } from '../../state/store';
import { sleep } from './estate';

/**
 * 長路中途的歇腳點（驛站、茶亭）：不另做小地圖，在大地圖上按 E 打開這個選單。
 * 住一晚（一級的床）、吃點東西、跟店家打聽消息（依日子輪著說）。
 */

const st = () => useGame.getState();

export const restStop =
  (n: WorldNode): Script =>
  async (ctx) => {
    const r = n.rest!;
    const say = (...t: string[]) => t.map((text) => ({ speaker: r.keeper, text }));
    const c = await ctx.ask(say(`${n.name}，歇歇腳吧。`)[0], [`住一晚（${r.price} 兩）`, '吃點東西', '打聽消息', '繼續趕路']);
    if (c === 0) {
      if (st().hero.silver < r.price) {
        await ctx.say(...say(`客官，住一晚得 ${r.price} 兩。`));
        return;
      }
      st().updateHero((h) => (h.silver -= r.price));
      await ctx.say(...say('屋子簡陋，被褥倒是乾淨的。'));
      await sleep(ctx, 1, () => say('客官早！趁天光好，趕路去吧。'));
    } else if (c === 1) {
      await ctx.panel({ kind: 'shop', title: n.name, stock: r.menu.map((id) => (id === 'tea' ? id : dishItem(id))) });
    } else if (c === 2) {
      await ctx.say(...say(...r.talk[st().world.day % r.talk.length]));
    }
  };
