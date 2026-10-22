import type { Script } from '../events';
import { SMITH_SHOP } from '../gear';
import { by } from '../maps/rooms';

/**
 * 兵器的買賣：青竹村石家鐵鋪的兵器架（石岳不愛搭理人，由徒弟石小虎招呼客人）。
 * 更好的兵器在趕集的舊貨攤、當鋪的死當貨裡偶爾找得到；鳴泉劍派依身分發佩劍（見 gear.ts 的 MQ_UNIFORMS）。
 */

const hu = by('石小虎');

export const smithRack: Script = async (ctx) => {
  await ctx.say('架上掛著木劍、鐵劍、柴刀和樸刀，刀口都磨得發亮。', ...hu('要買兵器？師父不愛說話，找我就行！', '練劍法就拿劍，練刀法就拿刀；打拳的話，空手最順。'));
  await ctx.panel({ kind: 'shop', title: '石家鐵鋪・兵器', stock: SMITH_SHOP });
};
