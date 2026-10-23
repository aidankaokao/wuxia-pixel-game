import { addFame, canHold, derive, giveItem, ITEMS, skillDef } from '../character';
import { heroUnit } from '../battle/moves';
import { setupDrill } from '../battle/enemies';
import { learningLevel } from '../books';
import { gainCraft } from '../crafts';
import { scriptCost, withCost, type EventCtx, type Script } from '../events';
import { FEST_FOOD, FestivalName } from '../festival';
import { usedToday } from '../home';
import type { Line } from '../maps/types';
import { addContrib, inSect } from '../sect';
import { clampAff, newRelation } from '../social';
import { festivalOf, inShichen, SHICHEN_INDEX } from '../time';
import { useGame } from '../../state/store';
import { exert, STAMINA, studyable, studyInsight } from './estate';

/**
 * 節慶的活動（節慶資料見 festival.ts）。每項活動用 world.daily 記「今天做過了」，節慶一年只有一天，所以就是一年一次。
 *
 * - 過年：向掌門拜年，領紅包（依身分）。
 * - 元宵：大殿猜燈謎，三題；學識 3 級起每題先刪掉一個錯的答案。
 * - 清明：到後山劍塚祭掃，對前輩的劍意有所體會（加領悟）。
 * - 端午：演武廣場比劍，連戰三位同門，贏得越多賞得越多。
 * - 中元：入夜後到洗劍池放河燈。
 * - 中秋：入夜後到聽泉亭賞月，與同門的交情都長一些。
 * - 掌門壽辰：向掌門拜壽，挑一件東西當壽禮。
 * - 卜大勺發節令點心兩份；青竹村的鍾嬸送一份。
 */

const st = () => useGame.getState();
const SECT = 'mingquan';
const member = () => inSect(st().world, SECT);
const today = () => festivalOf(st().world.day) as FestivalName | undefined;
const by =
  (speaker: string) =>
  (...texts: string[]): Line[] =>
    texts.map((text) => ({ speaker, text }));

/** 這項節慶活動今天做過了嗎；沒做過就記上（回傳 true 表示可以做） */
function once(key: string): boolean {
  const k = `fest:${key}`;
  if (usedToday(st().world, k)) return false;
  st().updateWorld((w) => (w.daily[k] = { day: w.day, n: 1 }));
  return true;
}
const doneToday = (key: string) => usedToday(st().world, `fest:${key}`) > 0;

function addAff(id: string, n: number) {
  st().updateWorld((w) => {
    w.relations[id] ??= newRelation();
    w.relations[id].aff = clampAff(w.relations[id].aff + n);
  });
}

async function contrib(ctx: EventCtx, n: number) {
  const text = st().updateWorld((w) => addContrib(w, n));
  await ctx.say(`（${text}）`);
}

const night = () => inShichen(st().world.time, SHICHEN_INDEX.酉, SHICHEN_INDEX.丑);

// ── 節令點心 ────────────────────────────────────────────

/** 卜大勺的大鍋飯：節慶當天換成節令點心兩份；回傳要發的物品與數量 */
export function festivalMeal(): { id: string; n: number; line: string } | null {
  const f = today();
  if (!f) return null;
  return { id: FEST_FOOD[f], n: 2, line: `今天${f}，大夥兒都有${ITEMS[FEST_FOOD[f]].name}，給你兩份！` };
}

/** 鍾嬸：節慶當天送一份點心（處理了回傳 true） */
export async function zhongFestival(ctx: EventCtx): Promise<boolean> {
  const f = today();
  if (!f || f === '掌門壽辰' || doneToday('zhong')) return false;
  const id = FEST_FOOD[f];
  if (!canHold(st().hero, id)) return false;
  once('zhong');
  await ctx.say(...by('鍾嬸')(`今天${f}，嬸做了些${ITEMS[id].name}，拿一個去嚐嚐！`));
  await ctx.hero((h) => giveItem(h, id));
  return true;
}

// ── 掌門：過年拜年、元宵燈謎、壽辰拜壽 ──────────────────────

const wen = by('聞松年');

/** 聞松年的節慶劇情；處理了回傳 true */
export async function wenFestival(ctx: EventCtx): Promise<boolean> {
  const f = today();
  if (!f || !member()) return false;
  if (f === '過年' && !doneToday('newyear')) return newYear(ctx);
  if (f === '元宵' && !doneToday('lantern')) return riddles(ctx);
  if (f === '掌門壽辰' && !doneToday('birthday')) return birthday(ctx);
  const hint: Partial<Record<FestivalName, string>> = {
    清明: '今天清明。到後山劍塚，替前輩們掃一掃墓吧。',
    端午: '今天端午，鳴川在演武廣場辦比劍，去試試身手。',
    中元: '中元了。入夜之後，到洗劍池放一盞河燈，念一念故人。',
    中秋: '今晚中秋，月亮一出來，大夥兒都到後山聽泉亭賞月。',
  };
  if (hint[f] && !doneToday(`hint:${f}`)) {
    once(`hint:${f}`);
    await ctx.say(...wen(hint[f]!));
    return true;
  }
  return false;
}

async function newYear(ctx: EventCtx) {
  once('newyear');
  const rank = st().world.sect!.rank;
  const silver = [10, 20, 40][rank] ?? 10;
  await ctx.say('你向聞松年跪下拜年：「祝師父新年安康！」', ...wen('起來起來。又長了一歲，劍也要長進一些。'), '聞松年從袖中取出一個紅包。');
  await ctx.hero((h) => {
    h.silver += silver;
    return `收到紅包：銀兩 ${silver}。`;
  });
  addAff('wen', 2);
  return true;
}

const RIDDLES = [
  { q: '一口咬掉牛尾巴', a: '告', wrong: ['吾', '午'] },
  { q: '一月七日', a: '脂', wrong: ['明', '胃'] },
  { q: '千里相逢', a: '重', wrong: ['逢', '遠'] },
  { q: '半部春秋', a: '秦', wrong: ['春', '秋'] },
  { q: '上不在上，下不在下', a: '卡', wrong: ['一', '中'] },
  { q: '四個山字山靠山，四個川字川連川', a: '田', wrong: ['出', '州'] },
  { q: '一人一張口，口下長隻手', a: '拿', wrong: ['拾', '合'] },
  { q: '十字對十字，太陽對月亮', a: '朝', wrong: ['明', '早'] },
  { q: '一加一，不是二', a: '王', wrong: ['十', '土'] },
  { q: '人在山邊', a: '仙', wrong: ['岸', '屾'] },
  { q: '半個月亮', a: '胖', wrong: ['朋', '腓'] },
  { q: '兩個月亮並排走', a: '朋', wrong: ['明', '胖'] },
];

/** 猜三個燈謎，回傳猜中幾個（學識 3 級起每題先刪掉一個錯的答案）；鳴泉大殿與臨江城燈會共用 */
export async function guessRiddles(ctx: EventCtx): Promise<number> {
  const pool = [...RIDDLES].sort(() => Math.random() - 0.5).slice(0, 3);
  const smart = learningLevel(st().hero) >= 3;
  let right = 0;
  for (const r of pool) {
    // 學識高的人一眼就看出一個不對的答案
    const options = [r.a, ...(smart ? [r.wrong[0]] : r.wrong)].sort(() => Math.random() - 0.5);
    const c = await ctx.ask(`燈謎：「${r.q}」（打一字）${smart ? '\n（讀過書，一眼就看出有個答案不對）' : ''}`, options);
    if (options[c] === r.a) {
      right++;
      await ctx.say(`你答「${r.a}」。——猜中了！`);
    } else await ctx.say(`你答「${options[c]}」。——不對，謎底是「${r.a}」。`);
  }
  return right;
}

async function riddles(ctx: EventCtx) {
  once('lantern');
  await ctx.say('大殿前掛滿了花燈，每一盞底下都垂著一張紙條。', ...wen('元宵猜燈謎，是本門的老規矩。猜三個，猜中有賞。'));
  const right = await guessRiddles(ctx);
  await ctx.say(...wen(right === 3 ? '三個全中！讀書果然沒白讀。' : right ? `中了 ${right} 個，不錯。` : '一個也沒中？多讀點書吧。'));
  if (right) {
    await ctx.hero((h) => {
      h.silver += right * 5;
      return [`獲得銀兩 ${right * 5}。`, gainCraft(h, 'learning', right * 10)];
    });
  }
  if (right === 3) {
    addAff('wen', 2);
    await ctx.hero((h) => giveItem(h, 'f_yuanxiao', 2));
  }
  return true;
}

async function birthday(ctx: EventCtx) {
  const h = st().hero;
  const gifts = Object.keys(h.items).filter((id) => h.items[id] > 0 && ITEMS[id].price && !ITEMS[id].bound && !ITEMS[id].manual);
  await ctx.say('大殿裡掛起了壽幛，同門們一個個上前向掌門拜壽。');
  if (!gifts.length) {
    once('birthday');
    await ctx.say('你身上沒有像樣的東西可以當壽禮，只好恭恭敬敬地磕了三個頭。', ...wen('心意到了就好。'));
    addAff('wen', 1);
    return true;
  }
  const i = await ctx.ask('要送什麼當壽禮？（東西越貴重，心意越足）', [...gifts.map((id) => `${ITEMS[id].name}（${ITEMS[id].price} 兩）`), '只磕頭']);
  once('birthday');
  if (i >= gifts.length) {
    await ctx.say('你恭恭敬敬地磕了三個頭。', ...wen('心意到了就好。'));
    addAff('wen', 1);
  } else {
    const id = gifts[i];
    const price = ITEMS[id].price!;
    await ctx.hero((c) => {
      c.items[id]--;
      if (!c.items[id]) delete c.items[id];
    });
    await ctx.say(`你雙手奉上${ITEMS[id].name}。`, ...wen(price >= 40 ? '這份禮太貴重了……好，好，我收下了。' : '有心了。'));
    addAff('wen', price >= 40 ? 5 : 2);
    await contrib(ctx, Math.min(20, Math.max(1, Math.round(price / 8))));
  }
  await ctx.say('壽宴上，卜大勺端出了一大盤壽桃。');
  await ctx.hero((c) => giveItem(c, 'f_shoutao', 2));
  return true;
}

// ── 清明：祭掃劍塚 ──────────────────────────────────────

/** 劍塚：清明當天可以祭掃；平常照舊查看 */
export const graveAt =
  (lines: Line[]): Script =>
  async (ctx) => {
    if (today() !== '清明' || doneToday('qingming')) return void (await ctx.say(...lines));
    const c = await ctx.ask('今天清明。要替劍塚的前輩們掃墓嗎？', ['掃墓', '算了']);
    if (c !== 0) return;
    once('qingming');
    ctx.pass(4);
    await ctx.say(
      '你拔去墓前的雜草，擦淨每一座劍塚的石碑，又在墓前插上幾枝新柳。',
      '一陣山風吹過，劍塚間的鏽劍輕輕作響，彷彿前輩們還在這裡練劍。\n（花了半個時辰）',
    );
    if (member()) await contrib(ctx, 5);
    const ready = studyable(st().hero);
    if (ready.length) {
      const i = await ctx.ask('看著這些劍，你想起了哪一門武功？', ready.map((s) => skillDef(s).name));
      await ctx.hero((h) => studyInsight(h, ready[i].id, 15));
    }
  };

// ── 端午：比劍 ──────────────────────────────────────────

const lu = by('陸鳴川');
const DUEL_FOES: { name: string; sprite: string }[] = [
  { name: '曹小豆', sprite: 'disciple' },
  { name: '唐秋生', sprite: 'disciple' },
  { name: '顧小滿', sprite: 'disciple_girl' },
];

/** 陸鳴川：端午比劍（處理了回傳 true） */
export async function luFestival(ctx: EventCtx): Promise<boolean> {
  if (today() !== '端午' || !member() || doneToday('duanwu')) return false;
  const c = await ctx.ask(lu('端午比劍，連戰三場，點到為止。贏得越多，賞得越多。要上場嗎？')[0], ['上場', '先不了']);
  if (c !== 0) return true;
  if (!(await exert(ctx, STAMINA.spar, '已經累得喘不過氣，這時候上場只會挨打。'))) return true;
  once('duanwu');
  let wins = 0;
  for (const foe of DUEL_FOES) {
    const h = st().hero;
    await ctx.say(`第 ${wins + 1} 場：${foe.name}上場。`);
    const o = await ctx.battle(setupDrill(heroUnit(h, derive(h)), foe, ['e_slash', 'quanyong', ...(wins >= 1 ? ['feipu'] : []), ...(wins >= 2 ? ['shiliu'] : [])]));
    if (o !== 'win') break;
    wins++;
  }
  ctx.pass(4);
  if (wins === 3) {
    await ctx.say(...lu('三場全勝！今年的端午劍魁，就是你了。'));
    await ctx.hero((h) => {
      h.silver += 30;
      return ['獲得銀兩 30。', giveItem(h, 'f_zongzi', 3), addFame(h, 5)];
    });
    await contrib(ctx, 10);
  } else if (wins === 2) {
    await ctx.say(...lu('贏了兩場，很好。'));
    await ctx.hero((h) => {
      h.silver += 15;
      return ['獲得銀兩 15。', giveItem(h, 'f_zongzi', 2)];
    });
  } else {
    await ctx.say(...lu(wins ? '贏了一場。明年再來。' : '輸了也不要緊，明年再來。'));
    await ctx.hero((h) => giveItem(h, 'f_zongzi', 1));
  }
  addAff('lu', 2);
  return true;
}

// ── 中元：洗劍池放河燈 ──────────────────────────────────

export const poolAt =
  (lines: Line[]): Script =>
  async (ctx) => {
    if (today() !== '中元' || doneToday('zhongyuan')) return void (await ctx.say(...lines));
    if (!night()) {
      await ctx.say(...lines, '（今天中元。入夜之後可以來這裡放河燈）');
      return;
    }
    const c = await ctx.ask('池邊已經有人在放河燈了。要放一盞嗎？', ['放河燈', '算了']);
    if (c !== 0) return;
    once('zhongyuan');
    ctx.pass(2);
    await ctx.say('你點亮一盞紙蓮花燈，輕輕放進池裡。', '燈影隨著水波慢慢漂遠，池面上一點點的燭光，像天上的星星落了下來。', '想起了一些人、一些事，心裡反倒平靜了。');
    await ctx.hero((h) => {
      h.qi = derive(h).maxQi;
      h.treat = { battles: 3, mult: 1.15 };
      return '（內力恢復；心情愉快：接下來 3 場戰鬥武功經驗 ×1.15）';
    });
  };

// ── 中秋：聽泉亭賞月 ────────────────────────────────────

const MOON_FRIENDS = ['wen', 'lu', 'xiaoman', 'han', 'yan', 'su'];

/** 聽泉亭：中秋入夜可以賞月；其他時候照常撫琴 */
export const moonAt =
  (otherwise: Script): Script =>
  withCost(() => scriptCost(otherwise), async (ctx) => {
    if (today() !== '中秋' || !member() || doneToday('zhongqiu') || !night()) return otherwise(ctx);
    once('zhongqiu');
    ctx.pass(4);
    await ctx.say(
      '一輪明月從山後升起，照得泉水一片銀白。',
      ...wen('一年就這麼一個晚上，大夥兒都在。'),
      '同門們圍坐在亭裡分月餅、說笑，陸鳴川難得多喝了兩杯，顧小滿吵著要比誰的劍影映得最清楚。',
      '（賞月到深夜。花了半個時辰）',
    );
    const known = MOON_FRIENDS.filter((id) => st().world.relations[id]);
    known.forEach((id) => addAff(id, 3));
    await ctx.hero((h) => {
      const d = derive(h);
      h.hp = d.maxHp;
      h.qi = d.maxQi;
      return [giveItem(h, 'f_yuebing', 2), known.length ? '（同門的熟悉度都 +3）' : null];
    });
  });
