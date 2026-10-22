import type { Script } from '../events';
import type { Line } from '../maps/types';
import { registerDailyTasks } from '../daily';
import { usedToday } from '../home';
import { isXunxiu, periodOf } from '../time';
import { useGame } from '../../state/store';

/**
 * 旬休趕集：每月初十、二十、三十，臨江城南邊擺出四個平時沒有的攤子（地圖上用條件 xunxiu）。
 * - 田記山貨（田有餘）：鳴泉廚房以外買不到的食材
 * - 江南絲行（沈綺羅）：絲線、棉線，還有只在這裡賣的上品絲線
 * - 漱石齋舊書攤（古懷石）：基礎武功的舊秘笈（買了就能突破上限）
 * - 雷家舊貨（雷振）：上品的護具與飾品，還有精良的青鋼劍、雁翎刀
 * 天黑就收攤。今天逛過任一攤，「今日」清單的趕集就打勾（daily 的 market）。
 */

const st = () => useGame.getState();
export const MARKET_KEY = 'market';

interface Stall {
  title: string;
  vendor: string;
  stock: string[];
  greet: string;
}

export const STALLS: Record<string, Stall> = {
  food: {
    title: '田記山貨',
    vendor: '田有餘',
    stock: ['chicken', 'mushroom', 'redbean', 'osmanthus', 'sesame', 'almond', 'tofu', 'egg'],
    greet: '山裡剛下來的貨！桂花、杏仁、野菌，平常城裡可買不到。',
  },
  silk: {
    title: '江南絲行',
    vendor: '沈綺羅',
    stock: ['fine_silk', 'silk_thread', 'cotton_thread'],
    greet: '這上品絲線是從江南運來的，一旬才帶這麼幾綑，摻在布裡，織出來的東西就是不一樣。',
  },
  books: {
    title: '漱石齋舊書攤',
    vendor: '古懷石',
    stock: ['manual_basic_fist', 'manual_breathing'],
    greet: '舊書舊書，別看紙黃了，裡頭的東西可不舊。',
  },
  goods: {
    title: '雷家舊貨',
    vendor: '雷振',
    stock: ['g_bamboo_hat', 'g_iron_bracer', 'g_jade_pendant', 'g_cloud_boots', 'w_steel_sword', 'w_goose_saber'],
    greet: '走江湖的家當，件件都是好東西。這把青鋼劍、這把雁翎刀，鐵匠鋪可打不出來。',
  },
};

/** 攤子：天黑收攤；秘笈已經有了就不再擺出來 */
export const stallAt =
  (id: keyof typeof STALLS): Script =>
  async (ctx) => {
    const s = STALLS[id];
    const say = (text: string): Line => ({ speaker: s.vendor, text });
    if (periodOf(st().world.time) === 'night') {
      await ctx.say(`「${s.title}」的攤子已經收了，${s.vendor}正在捆貨。`, say('天黑囉，下一旬再來吧！'));
      return;
    }
    st().updateWorld((w) => (w.daily[MARKET_KEY] = { day: w.day, n: usedToday(w, MARKET_KEY) + 1 }));
    const stock = s.stock.filter((item) => !(st().hero.items[item] && id === 'books'));
    if (!stock.length) {
      await ctx.say(say('好書都讓你挑走啦，下一旬我再收些新的來。'));
      return;
    }
    await ctx.say(say(s.greet));
    await ctx.panel({ kind: 'shop', title: s.title, stock });
  };

/** 今日事：旬休提醒趕集 */
registerDailyTasks(({ world }) =>
  isXunxiu(world.day) ? [{ text: '旬休：臨江城趕集（城南擺出了平時沒有的攤子）', state: usedToday(world, MARKET_KEY) ? 'done' : 'todo' }] : [],
);
