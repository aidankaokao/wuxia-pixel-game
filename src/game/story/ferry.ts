import type { EventCtx, Script } from '../events';
import { dishItem } from '../cooking';
import { by } from '../maps/rooms';
import { inShichen, SHICHEN_INDEX } from '../time';
import { useGame } from '../../state/store';
import { sleep } from './estate';
import { bridgeBuilt, bridgeOption, bridgeTalk } from './bridge';

/**
 * 雲水渡口：官道被雲水河截斷，靠船家擺渡過河；西岸有座茶棚給南來北往的旅人歇腳。
 * - 船家：西岸范老舟、東岸鄭小篙。白天 2 兩，夜裡加價 5 兩（叫醒船家）。過河一刻。
 * - 雲水茶棚（季秋娘）：吃點東西、歇一晚（3 兩，通鋪）。
 * 支線「雲水渡口造橋」見 bridge.ts：蓋好之後河上有橋，不用坐船（船家改載人遊河）。
 *
 * 旗標：
 *   ferry_rides  坐過幾次船（之後蓋橋的支線可以參考）
 */

const st = () => useGame.getState();
/** 渡船的價錢：白天、夜裡 */
export const FERRY_PRICE = 2;
const FERRY_NIGHT = 5;

/** 兩岸的落腳處（guandao 地圖上的位置） */
const BANK = {
  west: { x: 18, y: 7, facing: 'left' as const },
  east: { x: 22, y: 7, facing: 'right' as const },
};

/** 船家：side 是船家站在哪一岸 */
export const ferryman =
  (name: string, side: 'west' | 'east'): Script =>
  async (ctx: EventCtx) => {
    const say = by(name);
    if (bridgeBuilt({ ...st().flags, today: st().world.day })) {
      await ctx.say(...say(side === 'west' ? '橋蓋好啦，過河走橋就成。' : '我爹的事……橋蓋好了，以後不會再有人翻船了。', '想坐船看看河景，再來找我。'));
      return;
    }
    const night = !inShichen(st().world.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.酉);
    const price = night ? FERRY_NIGHT : FERRY_PRICE;
    const other = side === 'west' ? '東岸，往臨江城' : '西岸，往青竹村';
    const c = await ctx.ask(
      say(night ? `……這麼晚了還要過河？加點錢，我就撐一趟。（${price} 兩）` : `過河嗎？${price} 兩，到${other}。`)[0],
      [`過河（${price} 兩）`, '不用了'],
    );
    if (c !== 0) return;
    if (st().hero.silver < price) {
      await ctx.say(...say('沒錢就別過河啦，游過去可是會淹死人的。'));
      return;
    }
    st().updateHero((h) => (h.silver -= price));
    ctx.setFlag('ferry_rides', ctx.flag('ferry_rides') + 1);
    ctx.pass(1);
    await ctx.say(`你上了船。${name}一篙點開岸邊，小船晃晃悠悠地往對岸去。`, ...say('坐穩囉——'), '（過河花了一刻）');
    const to = side === 'west' ? BANK.east : BANK.west;
    ctx.warp('guandao', to);
  };

// ── 雲水茶棚 ────────────────────────────────────────────

const ji = by('季秋娘');
/** 茶棚賣的吃食：家常的飯麵湯點與茶 */
const TEAHOUSE_MENU = [dishItem('baifan'), dishItem('yangchun'), dishItem('doufutang'), dishItem('hongdou'), 'tea'];
export const TEAHOUSE_BED = 3;

export const teahouseTalk: Script = async (ctx) => {
  const bridge = bridgeOption();
  const c = await ctx.ask(ji('客官歇歇腳？熱茶熱飯都有。')[0], ['吃點東西', `歇一晚（${TEAHOUSE_BED} 兩，後頭的通鋪）`, '閒聊', ...(bridge ? ['修橋的事'] : []), '不用了']);
  if (bridge && c === 3) return bridgeTalk(ctx);
  // 橋蓋好、喝過慶功茶以後，茶棚吃東西打八折
  if (c === 0) await ctx.panel({ kind: 'shop', title: '雲水茶棚', stock: TEAHOUSE_MENU, discount: ctx.flag('bridge_party') ? 0.2 : 0 });
  else if (c === 1) {
    if (st().hero.silver < TEAHOUSE_BED) {
      await ctx.say(...ji('客官，通鋪也得三兩銀子呢。'));
      return;
    }
    st().updateHero((h) => (h.silver -= TEAHOUSE_BED));
    await ctx.say(...ji('後頭的通鋪還有空位，被子是乾淨的。'));
    // 通鋪跟一級的床一樣：睡飽了，但沒有精神飽滿
    await sleep(ctx, 1, () => [...ji('客官早！船家天一亮就開船了。')]);
  } else if (c === 2) {
    await ctx.say(
      ...ji('這茶棚是我爹那輩搭的。南來北往的人，到這兒都得等船，等船就得喝茶，哈哈。'),
      ...ji('要是哪天這裡蓋了座橋，我這生意怕是要冷清囉……可話說回來，過河的人也能少吃點苦。'),
    );
  }
};
