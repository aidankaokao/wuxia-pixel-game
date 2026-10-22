import { craftOf } from '../crafts';
import { gainSkill, giveItem, isEquipped, skillCap, skillDef, slotOf } from '../character';
import { dateOf, inShichen, SHICHEN_INDEX } from '../time';
import type { EventCtx, Script } from '../events';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { dishItem } from '../cooking';
import { useGame } from '../../state/store';
import { exert, sleep, studyable, studyInsight } from './estate';
import { teachDishes } from './cooking';

/**
 * 大埠頭：大江入海口的港口小城（大地圖上的 dabutou）。
 * - 望潮客棧（掌櫃潘海生、老闆娘潘大娘）：住店；潘大娘教海鮮料理（收銀兩）
 * - 魚市：碼頭邊的攤子，白天賣海魚、鮮蝦、海帶
 * - 海商會館（駱千帆）：海外來的飾品
 * - 船行（凌萬川）：搭船走大江水路回臨江城；出海往東海諸島（還沒開放）
 * - 海神祠（梅婆婆）：求籤，一天一次
 * - 觀潮台：每月十五到十八大潮，看潮有所領悟（一個月一次）
 * - 漁家（龐老大）：幫忙收網
 * - 漕幫總舵：大門緊閉（之後的伏筆）
 *
 * 旗標：
 *   bp_tide   上次觀大潮是第幾個月（年 × 12 + 月）
 */

const st = () => useGame.getState();

async function paySilver(ctx: EventCtx, n: number, who: (...t: string[]) => Line[]): Promise<boolean> {
  if (st().hero.silver < n) {
    await ctx.say(...who(`這得 ${n} 兩，你身上不夠呢。`));
    return false;
  }
  st().updateHero((h) => (h.silver -= n));
  return true;
}

// ── 望潮客棧 ────────────────────────────────────────────

const panHai = by('潘海生');
const panMa = by('潘大娘');
const INN_PRICE = 6;
/** 潘大娘教海鮮料理的學費（入門、中等、進階） */
const SEA_DISH_COST = [10, 25, 50, 80];

export const bpInnTalk: Script = async (ctx) => {
  const c = await ctx.ask(panHai('客官，打尖還是住店？夜裡聽著潮聲睡，保準睡得香。')[0], [`住店（${INN_PRICE} 兩，睡到天亮）`, '點菜', '不用了']);
  if (c === 0) {
    if (!(await paySilver(ctx, INN_PRICE, panHai))) return;
    await ctx.say(...panHai('樓上靠海那間，推開窗就是海。'));
    await sleep(ctx, 2, () => ['窗外傳來一陣陣浪聲，海鳥在桅杆上叫個不停。']);
  } else if (c === 1) {
    await ctx.panel({ kind: 'shop', title: '望潮客棧・菜單', stock: ['haidai', 'yuzhou', 'xiahun', 'yuwan'].map((id) => dishItem(id)) });
  }
};

export const bpCookTalk: Script = async (ctx) => {
  const c = await ctx.ask(panMa('想學做海鮮？我們海邊人家的手藝，不藏私——學費照收就是了。')[0], ['學做菜', '閒聊', '不用了']);
  if (c === 1) {
    await ctx.say(...panMa('海魚要趁新鮮，早上靠岸的最好，過了中午就不鮮了。', '鮮蝦餛飩的皮要擀得透光，蝦仁要整隻包進去，咬下去才有味。'));
    return;
  }
  if (c !== 0) return;
  await teachDishes(ctx, '潘大娘', (n) => paySilver(ctx, n, panMa), () => craftOf(st().hero, 'cooking').level, undefined, {
    teaches: (d) => !!d.sea,
    unit: '兩',
    cost: SEA_DISH_COST,
  });
};

// ── 魚市 ────────────────────────────────────────────────

const FISH_STOCK = ['sea_fish', 'shrimp', 'seaweed'];

export const fishStall =
  (vendor: string, line: string): Script =>
  async (ctx) => {
    // 魚市只做白天：卯時到申時
    if (!inShichen(st().world.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.申)) {
      await ctx.say('魚市收攤了，只剩一股魚腥味。', '（魚市卯時到申時開，早上的貨最新鮮）');
      return;
    }
    await ctx.say({ speaker: vendor, text: line });
    await ctx.panel({ kind: 'shop', title: '大埠頭魚市', stock: FISH_STOCK });
  };

// ── 海商會館 ────────────────────────────────────────────

const luo = by('駱千帆');
const TRADER_STOCK = ['g_coral', 'g_shark_bracer', 'g_sea_hat', 'yunwu', 'fine_silk'];

export const traderTalk: Script = async (ctx) => {
  const c = await ctx.ask(luo('在下駱千帆，跑南洋的海商。這些都是船上帶回來的好東西，看看？')[0], ['看看', '閒聊', '不用了']);
  if (c === 0) await ctx.panel({ kind: 'shop', title: '海商會館', stock: TRADER_STOCK });
  else if (c === 1)
    await ctx.say(
      ...luo('東海上這兩年不太平，聽說有一夥海盜，專劫往來的商船。', '船行說要等官府派兵船護航才肯出海……等到那時候，我的貨都要發霉囉。'),
    );
};

// ── 船行：大江水路 ──────────────────────────────────────

const ling = by('凌萬川');
/** 搭船走大江水路：船錢、花的時間（比走大地圖的路快） */
export const RIVER_BOAT = { price: 15, ke: 32 };
/** 船到臨江城、大埠頭時，落腳在碼頭 */
export const RIVER_LANDING = {
  linjiang: { map: 'linjiang', x: 27, y: 30, facing: 'up' as const },
  dabutou: { map: 'dabutou', x: 22, y: 27, facing: 'up' as const },
};

/** 搭船走水路到另一頭（臨江城漕幫分舵與大埠頭船行共用） */
export async function riverBoat(ctx: EventCtx, to: keyof typeof RIVER_LANDING, who: (...t: string[]) => Line[]) {
  const name = to === 'linjiang' ? '臨江城' : '大埠頭';
  const c = await ctx.ask(who(`搭船走大江水路到${name}？${RIVER_BOAT.price} 兩，順風的話四個時辰就到。`)[0], ['上船', '不用了']);
  if (c !== 0) return;
  if (!(await paySilver(ctx, RIVER_BOAT.price, who))) return;
  ctx.pass(RIVER_BOAT.ke);
  const l = RIVER_LANDING[to];
  await ctx.say('帆鼓滿了風，船順著大江走。兩岸的蘆葦一叢叢往後退，江鷗在船尾盤旋。', `（坐了四個時辰的船，到了${name}的碼頭）`);
  ctx.warp(l.map, { x: l.x, y: l.y, facing: l.facing });
}

export const shipOfficeTalk: Script = async (ctx) => {
  const c = await ctx.ask(ling('船行凌萬川。走江，走海，都找我。')[0], ['搭船回臨江城（大江水路）', '出海往東海諸島', '不用了']);
  if (c === 0) await riverBoat(ctx, 'linjiang', ling);
  else if (c === 1)
    await ctx.say(
      ...ling('出海？最近不行。', '東海上鬧海盜，上個月才有一條商船回不來。船行的規矩，等官府的兵船來了，才結伴出海。'),
      '（東海諸島還沒開放）',
    );
};

// ── 海神祠：求籤 ────────────────────────────────────────

const mei = by('梅婆婆');
const SHRINE_KEY = 'bp:shrine';
const FORTUNES: { name: string; text: string; rested?: { battles: number; mult: number } }[] = [
  { name: '上上籤', text: '「潮平兩岸闊，風正一帆懸。」——諸事順遂，出手必有所得。', rested: { battles: 5, mult: 1.2 } },
  { name: '上籤', text: '「千帆過盡處，一葉自從容。」——不爭先，反而走得遠。', rested: { battles: 3, mult: 1.1 } },
  { name: '中籤', text: '「浪來莫慌張，潮退自分明。」——事情急不得，等一等就看清楚了。' },
  { name: '中籤', text: '「海闊憑魚躍。」——天地大得很，別把自己困住了。' },
  { name: '下籤', text: '「月黑風高夜，行船莫近礁。」——近日小心，別逞強。' },
];

export const shrineTalk: Script = async (ctx) => {
  const done = st().world.daily[SHRINE_KEY]?.day === st().world.day;
  const c = await ctx.ask(mei('海神娘娘保佑出海的人平平安安。要上炷香、求支籤嗎？香油錢一兩。')[0], [done ? '求籤（今天求過了）' : '上香求籤（1 兩）', '不用了']);
  if (c !== 0) return;
  if (done) {
    await ctx.say(...mei('一天求一支就夠了，求多了，娘娘也嫌煩呢。'));
    return;
  }
  if (!(await paySilver(ctx, 1, mei))) return;
  st().updateWorld((w) => (w.daily[SHRINE_KEY] = { day: w.day, n: 1 }));
  const f = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
  await ctx.say('你上了香，搖動籤筒，「喀啦」一聲掉出一支籤。', ...mei(`是${f.name}。`, f.text));
  if (f.rested) {
    st().updateHero((h) => (h.rested = { ...f.rested! }));
    await ctx.say(`（心裡踏實多了。接下來 ${f.rested.battles} 場戰鬥，武功經驗 ×${f.rested.mult}）`);
  }
};

// ── 觀潮台：每月十五到十八大潮 ──────────────────────────

const isSpringTide = (day: number) => {
  const d = dateOf(day).date;
  return d >= 15 && d <= 18;
};

export const tideWatch: Script = async (ctx) => {
  const w = st().world;
  const { year, month } = dateOf(w.day);
  const monthKey = year * 12 + month;
  const day = inShichen(w.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.酉);
  if (!isSpringTide(w.day) || !day) {
    await ctx.say('觀潮台。台邊的石碑刻著：「每月十五至十八，海潮最盛」。', '今天的潮水平平穩穩，一波接著一波。');
    return;
  }
  if (ctx.flag('bp_tide') === monthKey) {
    await ctx.say('大潮又來了，潮頭一線白，轟隆隆地壓過來。', '這個月的大潮你已經看過了，心裡的那點領悟還在慢慢沉澱。');
    return;
  }
  ctx.setFlag('bp_tide', monthKey);
  ctx.pass(4);
  await ctx.say(
    '遠處先是一條白線，接著轟隆聲越來越近——',
    '潮頭高過人頭，一層疊著一層撲上岸來，打得觀潮台都在顫。',
    '你看著潮水一波推著一波，前浪未退、後浪已至……',
  );
  // 領悟：有能參悟的招式就加領悟度，沒有就給武學點數
  const ready = studyable(st().hero);
  if (ready.length) await ctx.hero((h) => studyInsight(h, ready[0].id, 30));
  else {
    st().updateHero((h) => (h.points += 5));
    await ctx.say('（若有所悟，武學點數 +5）');
  }
};

// ── 漁家：幫忙收網 ──────────────────────────────────────

const pang = by('龐老大');
const NET_STAMINA = 20;
const NET_PAY = 5;

export const fisherTalk: Script = async (ctx) => {
  const c = await ctx.ask(pang('船剛靠岸，網裡全是魚。來幫忙收網？給你工錢，再分你幾條魚。')[0], [
    `幫忙收網（一個時辰、體力 ${NET_STAMINA}，工錢 ${NET_PAY} 兩）`,
    '不用了',
  ]);
  if (c !== 0) return;
  if (!(await exert(ctx, NET_STAMINA, '腿都站不穩了，上船只會掉下海。'))) return;
  ctx.pass(8);
  await ctx.say('你跟著龐老大跳上搖搖晃晃的漁船，一把一把把漁網拖上甲板。', '船晃得厲害，你得一直穩住腳步，才沒有一頭栽進海裡。', '（收了一個時辰的網）');
  await ctx.hero((h) => {
    h.silver += NET_PAY;
    // 在船上站穩練的是下盤：順帶練一門裝備中、還沒到上限的輕功
    const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === 'light' && k.level < skillCap(k));
    return [`工錢 ${NET_PAY} 兩。`, giveItem(h, 'sea_fish', 1 + Math.floor(Math.random() * 2)), s ? `「${skillDef(s).name}」經驗 +12。` : null, s ? gainSkill(h, s.id, 12, false) : null];
  });
};
