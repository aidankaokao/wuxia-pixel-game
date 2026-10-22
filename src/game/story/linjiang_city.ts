import { orderTalk } from './orders';
import { derive, ITEMS } from '../character';
import { DISHES, dishItem } from '../cooking';
import type { EventCtx, Script } from '../events';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { dateOf } from '../time';
import { useGame } from '../../state/store';
import { sleep } from './estate';

/**
 * 臨江城開放的建築（第一批，生活機能）：
 * - 雲來客棧（賀長年）：住店睡到天亮、喝壺茶聽店小二牛小旺說傳聞（一天一則）
 * - 望江樓（汪福來）：點菜（平常吃不到的好菜）；說書人費一言每天說一段江湖舊事
 * - 回春堂（白濟仁）：買藥、看傷、收草藥（比別處給得多）
 * - 和記當鋪（和守義）：典當收得比別處高，死當貨每旬換一批
 */

const st = () => useGame.getState();
const day = () => st().world.day;

// ── 雲來客棧 ────────────────────────────────────────────

const he = by('賀長年');
const wang = by('牛小旺');
/** 住一晚、喝一壺茶的價錢 */
export const INN_PRICE = 5;
const TEA_PRICE = 2;

async function pay(ctx: EventCtx, n: number, who: (...t: string[]) => Line[]): Promise<boolean> {
  if (st().hero.silver < n) {
    await ctx.say(...who(`客官，這得 ${n} 兩……您身上好像不太夠。`));
    return false;
  }
  st().updateHero((h) => (h.silver -= n));
  return true;
}

/** 店小二說的傳聞：一天一則，依日子輪著說（有些要先發生過某些事才說） */
const RUMORS: { when?: (f: Record<string, number>) => boolean; lines: Line[] }[] = [
  { lines: wang('聽說鳴泉山的後山，起大霧的早上會有個白頭髮的老人家在泉邊站著。問他話，一轉眼人就不見了。') },
  { lines: wang('城南每逢初十、二十、三十趕集，江南來的絲線、舊書攤上的秘笈，平常可買不到。') },
  { lines: wang('漕幫的人最近跟金刀鏢局的鏢師在碼頭上推推搡搡，差點動起刀子。您往碼頭去可小心些。') },
  { lines: wang('青竹村茶攤的鍾嬸啊，最愛人家送她燉山豬肉，說是比她自己燉的還香。') },
  { lines: wang('下雨天山裡的野獸都躲起來了，獵戶說那時候採野菌最好。') },
  { lines: wang('回春堂的大還丹，一顆一百多兩，聽說吃了能把人從鬼門關拉回來。') },
  { when: (f) => !!f.bandit_boss, lines: wang('斷崖寨的祁三刀被人打跑啦！聽說是個年輕人幹的……咦，客官，該不會就是您吧？') },
  { when: (f) => !f.bandit_boss, lines: wang('蒼嵐山上的斷崖寨，寨主祁三刀，衙門懸賞五百兩都沒人敢接。') },
  { lines: wang('望江樓的說書人費一言，每天說一段江湖舊事，一天不落。客官有空去聽聽。') },
  { lines: wang('和記當鋪的和掌櫃，眼睛毒得很，什麼東西到他手上，一看就知道值幾兩。') },
  { lines: wang('鳴泉劍派的卜大勺師傅，有時候會託人做菜，給的謝禮可大方了。') },
  { lines: wang('金刀鏢局的總鏢頭，年輕時一把金刀打遍臨江，現在腰粗了，可沒人敢小看他。') },
];

/** 今天的傳聞（記在 daily，聽過了當天就換成閒話） */
const RUMOR_KEY = 'lj:rumor';

export const innTalk: Script = async (ctx) => {
  const c = await ctx.ask(he('客官，住店還是打尖？')[0], [`住店（${INN_PRICE} 兩，睡到天亮）`, `打尖（喝壺茶 ${TEA_PRICE} 兩，聽聽傳聞）`, '不用了']);
  if (c === 0) {
    if (!(await pay(ctx, INN_PRICE, he))) return;
    await ctx.say(...he('天字二號房，被褥都是今天新曬的。小旺，帶客官上去！'));
    // 客棧的床跟自家第二級的床一樣：睡飽了精神好
    await sleep(ctx, 2, () => [...wang('客官早！樓下有熱粥，要不要來一碗？')]);
  } else if (c === 1) {
    if (st().world.daily[RUMOR_KEY]?.day === day()) {
      await ctx.say(...wang('今天該說的我都說啦，客官明天再來，保準有新鮮事！'));
      return;
    }
    if (!(await pay(ctx, TEA_PRICE, he))) return;
    st().updateWorld((w) => (w.daily[RUMOR_KEY] = { day: w.day, n: 1 }));
    const f = st().flags;
    const pool = RUMORS.filter((r) => !r.when || r.when(f));
    await ctx.say('店小二牛小旺提著茶壺過來，一邊倒茶一邊壓低了聲音……', ...pool[day() % pool.length].lines);
  }
};

// ── 望江樓 ──────────────────────────────────────────────

const wangjiang = by('汪福來');
/** 望江樓的菜單：平常自己做不太出來的好菜（普通品質） */
const TOWER_MENU = ['zhutongfan', 'laweifan', 'daoxiao', 'jitang', 'tangyuan', 'xingren', 'guihua'];

export const towerTalk: Script = async (ctx) => {
  // 訂貨：魚、魚乾、湖產、湖鮮海鮮菜（orders.ts 的 tower）
  if (await orderTalk(ctx, 'tower')) return;
  const c = await ctx.ask(wangjiang('客官樓上請！望江樓的菜，臨江城頭一份。')[0], ['點菜', '不用了']);
  if (c !== 0) return;
  await ctx.panel({ kind: 'shop', title: '望江樓・菜單', stock: TOWER_MENU.filter((id) => DISHES.some((d) => d.id === id)).map((id) => dishItem(id)) });
};

const fei = by('費一言');
/** 說書：一天一段，依日子輪著說 */
const TALES: string[][] = [
  ['話說百年前，大江上有位劍客，人稱「斷江」。', '傳說他一劍劈下，江水斷流三息——', '當然啦，各位看官，說書的嘴，聽聽就好。'],
  ['今天說鳴泉劍派的祖師。', '祖師爺當年在鳴泉山上結廬，日日聽泉，悟出「快而不亂，如泉不絕」八個字。', '從此鳴泉劍派開山立派，到今天也有好幾代囉。'],
  ['今天說漕幫。', '大江上千百條船，十條有八條要跟漕幫打招呼。', '漕幫的規矩是：「船過水無痕，貨到人不問。」嘿，這話裡的意思，各位自己琢磨。'],
  ['今天說金刀鏢局。', '金刀鏢局三十年不失一鏢，直到三年前——', '那一趟鏢在城外被劫，押鏢的十一個兄弟沒一個回來。', '劫鏢的是誰？說書的不敢說，說書的不敢說……'],
  ['今天說個怪事。', '蒼嵐山的獵戶說，月圓之夜，山裡會傳來一陣笛聲，跟著笛聲走，就再也找不到回來的路。', '各位看官，夜裡別上山啊。'],
];

export const tellerTalk: Script = async (ctx) => {
  const tale = TALES[day() % TALES.length];
  await ctx.say('醒木一拍——', ...fei(...tale));
  if (st().hero.silver >= 1 && (await ctx.ask('要賞說書人幾文錢嗎？', ['賞一兩', '不賞'])) === 0) {
    st().updateHero((h) => (h.silver -= 1));
    await ctx.say(...fei('多謝客官捧場！明天請早，還有新的！'));
  }
};

// ── 回春堂 ──────────────────────────────────────────────

const bai = by('白濟仁');
const CLINIC_STOCK = ['jinchuang', 'yangqi_wan', 'huiqi_san', 'dahuan_dan', 'herb'];
/** 回春堂收的草藥（收購價是原價的八成，比別處高） */
const CLINIC_BUYS = ['herb', 'mushroom', 'boar_tusk'];
const HEAL_PRICE = 10;

export const clinicTalk: Script = async (ctx) => {
  const c = await ctx.ask(bai('哪裡不舒服？')[0], ['買藥', '賣草藥（收得比別處高）', `看傷（${HEAL_PRICE} 兩，氣血、內力回滿）`, '不用了']);
  if (c === 0) await ctx.panel({ kind: 'shop', title: '回春堂', stock: CLINIC_STOCK });
  else if (c === 1) await ctx.panel({ kind: 'shop', title: '回春堂・收草藥', stock: [], sellRate: 0.8, buys: CLINIC_BUYS, sellOnly: true });
  else if (c === 2) {
    const h = st().hero;
    const d = derive(h);
    if (h.hp >= d.maxHp && h.qi >= d.maxQi) {
      await ctx.say(...bai('你氣色好得很，不用看。'));
      return;
    }
    if (!(await pay(ctx, HEAL_PRICE, bai))) return;
    ctx.pass(2);
    st().updateHero((x) => {
      const dd = derive(x);
      x.hp = dd.maxHp;
      x.qi = dd.maxQi;
    });
    await ctx.say(...bai('躺好，別動。'), '白濟仁推拿、扎針、敷藥，一氣呵成。', '（花了兩刻。氣血、內力回滿）');
  }
};

// ── 和記當鋪 ────────────────────────────────────────────

const ho = by('和守義');
/** 死當貨：每旬（十天）換一批，從這些裡挑五樣 */
const PAWN_POOL = [
  'g_bamboo_hat', 'g_iron_bracer', 'g_jade_pendant', 'g_cloud_boots', 'g_brocade', 'g_boots', 'g_bracer', 'g_sachet',
  'yunwu', 'dahuan_dan', 'fine_silk', 'manual_basic_fist', 'manual_breathing', 'w_autumn_sword', 'w_steel_sword', 'w_goose_saber',
];
const PAWN_COUNT = 5;
/** 典當：收購價是原價的六成（比別處的一半高） */
const PAWN_RATE = 0.6;

/** 這一旬的死當貨（依旬數固定，同一旬來看都一樣） */
function pawnStock(): string[] {
  const { year, month, date } = dateOf(day());
  let seed = (year * 12 + month) * 3 + Math.floor((date - 1) / 10) + 7;
  const pool = [...PAWN_POOL];
  const out: string[] = [];
  while (out.length < PAWN_COUNT && pool.length) {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    out.push(...pool.splice(seed % pool.length, 1));
  }
  // 秘笈買過就不再擺
  return out.filter((id) => !(ITEMS[id].manual && st().hero.items[id]));
}

export const pawnTalk: Script = async (ctx) => {
  const c = await ctx.ask(ho('當東西，還是看看死當的貨？')[0], ['看看死當貨（每旬換一批）', '典當（收得比別處高）', '不用了']);
  if (c === 0) await ctx.panel({ kind: 'shop', title: '和記當鋪・死當貨', stock: pawnStock() });
  else if (c === 1) {
    await ctx.say(...ho('拿出來我瞧瞧。……嗯，就這個價，童叟無欺。'));
    await ctx.panel({ kind: 'shop', title: '和記當鋪・典當', stock: [], sellRate: PAWN_RATE, sellOnly: true });
  }
};
