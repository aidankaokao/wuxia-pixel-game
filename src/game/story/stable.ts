import type { Script } from '../events';
import { by } from '../maps/rooms';
import { mountDef, MOUNTS } from '../mounts';
import { useGame } from '../../state/store';

/** 梁老四的車馬行：大路還沒通，車不能坐，但可以買馬、賣馬。 */

const st = () => useGame.getState();
const liang = by('梁老四');
const chats = [
  liang('我是趕車的梁老四。山上的道長們下山辦事，常坐我的車。', '往別的大城的大路還沒修通，等通了，坐我的車，幾個時辰就到，比走路快多了。'),
  liang('馬兒是好馬，就是路不好。再等等吧。', '想買馬也行，騎著走山路，比走路快得多。'),
];
let chat = 0;

export const coachmanTalk: Script = async (ctx) => {
  const own = mountDef(st().hero.mount);
  const c = await ctx.ask(liang('要坐車？路還沒通哪。')[0], ['看看馬', ...(own ? [`賣掉${own.name}`] : []), '閒聊']);
  if (c === 0) {
    const i = await ctx.ask(
      liang('都是我親手餵大的好馬。')[0],
      [...MOUNTS.map((m) => `${m.name}（${m.price} 兩，快 ${Math.round((m.speed - 1) * 100)}%）`), '算了'],
    );
    if (i >= MOUNTS.length) return;
    const m = MOUNTS[i];
    if (own?.id === m.id) {
      await ctx.say(...liang(`你不是已經有一匹${m.name}了嗎？`));
      return;
    }
    // 換馬時舊的折一半價收回
    const trade = own ? Math.floor(own.price / 2) : 0;
    const cost = m.price - trade;
    await ctx.say(...liang(`${m.desc}`));
    if (!(await st().askConfirm(`買下${m.name}？要 ${m.price} 兩${own ? `（${own.name}折價 ${trade} 兩，實付 ${cost} 兩）` : ''}。`, '買下'))) return;
    if (st().hero.silver < cost) {
      await ctx.say(...liang('銀兩不夠啊，再攢攢吧。'));
      return;
    }
    st().updateHero((h) => {
      h.silver -= cost;
      h.mount = m.id;
      h.riding = true;
    });
    await ctx.say(...liang(`好好待牠。`), `你牽過${m.name}，翻身上馬。\n（在室外騎馬走得更快；選單「人物 › 坐騎」可以上馬、下馬）`);
  } else if (own && c === 1) {
    const price = Math.floor(own.price / 2);
    if (!(await st().askConfirm(`把${own.name}賣給梁老四？他出 ${price} 兩。`, '賣掉'))) return;
    st().updateHero((h) => {
      h.silver += price;
      delete h.mount;
      delete h.riding;
    });
    await ctx.say(...liang('放心，我會替你好好照顧牠。'), `（獲得銀兩 ${price}）`);
  } else await ctx.say(...chats[chat++ % chats.length]);
};
