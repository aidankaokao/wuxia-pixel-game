import { CLOTH_SHOP } from '../gear';
import type { Script } from '../events';
import { by } from '../maps/rooms';

/**
 * 臨江城裡的店家與人物。
 * 錦繡布莊：老闆娘魏錦娘賣帽子、衣褲、鞋子與飾品（品級從粗製到精良）。
 */

const jin = by('魏錦娘');
const clothChats = [
  jin('客官好眼光，我們錦繡布莊的布料，從臨江城到下游的大埠頭都有名。', '穿得好，走到哪兒人家都高看你一眼；料子厚實，挨刀也少挨一些。'),
  jin('上品、極品的好料子，得請城外的繡娘一針一線慢慢做，這兒可不常有。'),
  jin('鳴泉山上的道長們也常來，他們的月白道袍，料子就是從我這兒買的。'),
];
let chat = 0;

export const clothShopTalk: Script = async (ctx) => {
  const c = await ctx.ask(jin('客官要看看什麼？')[0], ['看看衣物', '閒聊', '不用了']);
  if (c === 0) await ctx.panel({ kind: 'shop', title: '錦繡布莊', stock: CLOTH_SHOP });
  else if (c === 1) await ctx.say(...clothChats[chat++ % clothChats.length]);
};
