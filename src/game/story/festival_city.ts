import { attrs, derive, giveItem } from '../character';
import type { EventCtx, Script } from '../events';
import { FEST_FOOD, type FestivalName } from '../festival';
import { usedToday } from '../home';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import type { PersonDef } from './people';
import { clampAff, newRelation, stageOf } from '../social';
import { festivalOf, inShichen, SHICHEN_INDEX } from '../time';
import { useGame } from '../../state/store';
import { exert } from './estate';
import { guessRiddles } from './festival';

/**
 * 城裡的節慶（不必是門派弟子）：門派裡的節慶活動在 story/festival.ts。
 *
 * - 年節（臘月十五到除夕）：臨江城南廣場擺年貨攤，賣鞭炮、紅燈籠、年糕、餃子。
 * - 過年：遇到認識的人第一次交談是拜年，熟悉度多加；交情好的會塞個紅包。其他節慶當天也會互道佳節。
 * - 元宵：入夜後城南廣場燈會，祝老秀才擺燈謎攤。
 * - 端午：碼頭賽龍舟，可以下注，也可以上碧漪漁戶的船一起划。
 * - 中元：入夜後碼頭擺河燈攤，放一盞河燈。
 * - 中秋：入夜後望江樓的賞月宴。
 * - 冬至：雲來客棧請住客吃湯圓；除夕：客棧的年夜飯。
 * 每項用 world.daily 記「今天做過了」（節慶一年一天，所以一年一次）。
 */

const st = () => useGame.getState();
const today = () => festivalOf(st().world.day) as FestivalName | undefined;
const night = () => inShichen(st().world.time, SHICHEN_INDEX.酉, SHICHEN_INDEX.丑);

function once(key: string): boolean {
  const k = `cfest:${key}`;
  if (usedToday(st().world, k)) return false;
  st().updateWorld((w) => (w.daily[k] = { day: w.day, n: 1 }));
  return true;
}
const doneToday = (key: string) => usedToday(st().world, `cfest:${key}`) > 0;

async function pay(ctx: EventCtx, n: number, say: (...t: string[]) => Line[]) {
  if (st().hero.silver < n) {
    await ctx.say(...say(`要 ${n} 兩，客官身上好像不太夠。`));
    return false;
  }
  st().updateHero((h) => (h.silver -= n));
  return true;
}

// ── 年貨攤 ──────────────────────────────────────────────

export const nianhuoStall: Script = async (ctx) => {
  await ctx.say('攤子上紅通通一片：一掛掛鞭炮、成串的紅燈籠、一籠籠剛蒸好的年糕。', ...by('喬掌櫃')('年貨嘞！過年不放炮，年獸找上門！'));
  await ctx.panel({ kind: 'shop', title: '年貨攤', stock: ['firecracker', 'red_lantern', 'f_niangao', 'f_jiaozi'] });
};

// ── 拜年與互道佳節 ──────────────────────────────────────

const GREET: Partial<Record<FestivalName, [string, string]>> = {
  過年: ['新年好！給{稱}拜年了！', '恭喜恭喜，新年發財！今年也多多照應啊。'],
  元宵: ['元宵節好！', '晚上城南有燈會，{稱}要去看看嗎？'],
  端午: ['端午安康！', '吃粽子了沒？碼頭今天賽龍舟，熱鬧得很。'],
  中秋: ['中秋快樂！', '今晚月亮一定又大又圓。'],
  冬至: ['冬至大如年，{稱}吃湯圓了沒？', '吃了湯圓，又大一歲囉。'],
  除夕: ['今天除夕，忙完了就早點回家吃年夜飯吧。', '一年又過去了，明年見！'],
};

/**
 * 節慶當天第一次跟某人交談：互道佳節（處理了回傳 true）。過年熟悉度 +3，其他節慶 +2；
 * 過年時交情到「好友」以上，對方塞一個紅包。
 */
export async function festGreeting(ctx: EventCtx, p: PersonDef, fmt: (l: Line[]) => Line[]): Promise<boolean> {
  const f = today();
  const g = f && GREET[f];
  if (!g) return false;
  const day = st().world.day;
  const key = `fest:${day}`;
  const r = st().world.relations[p.id] ?? newRelation();
  if (r.events.includes(key)) return false;
  st().updateWorld((w) => {
    const x = (w.relations[p.id] ??= newRelation());
    x.events = [...x.events.filter((e) => !e.startsWith('fest:')), key];
    x.aff = clampAff(x.aff + (f === '過年' ? 3 : 2));
  });
  if (f === '過年') await ctx.say(`你向${p.name}作揖拜年。`);
  await ctx.say(...fmt(by(p.name)(...g)));
  st().showToast(`${p.name} 熟悉度 +${f === '過年' ? 3 : 2}`);
  if (f === '過年' && stageOf(r.aff) >= 3) {
    const n = 6 + Math.floor(Math.random() * 7);
    await ctx.say(`${p.name}笑著塞給你一個紅包：「拿去買糖吃！」`);
    await ctx.hero((h) => ((h.silver += n), `收到紅包：銀兩 ${n}。`));
  }
  return true;
}

// ── 元宵：燈會猜燈謎 ────────────────────────────────────

const zhu = by('祝老秀才');

export const riddleStall: Script = async (ctx) => {
  if (doneToday('riddle')) {
    await ctx.say(...zhu('今年的燈謎你都猜過了，讓讓別人吧。明年請早！'));
    return;
  }
  await ctx.say('廣場上掛滿了花燈：兔子燈、荷花燈、走馬燈，一盞盞底下都垂著紙條。', ...zhu('猜燈謎嘍！三題一輪，猜中一題五兩，全中再送一盞燈籠。'));
  if ((await ctx.ask(zhu('要猜嗎？')[0], ['猜', '先看看燈'])) !== 0) return;
  once('riddle');
  const right = await guessRiddles(ctx);
  await ctx.say(...zhu(right === 3 ? '三題全中！老朽佩服，佩服！' : right ? `中了 ${right} 題，不錯不錯。` : '一題也沒中？哈哈，明年再來。'));
  if (right) await ctx.hero((h) => ((h.silver += right * 5), `獲得銀兩 ${right * 5}。`));
  if (right === 3) await ctx.hero((h) => [giveItem(h, 'red_lantern'), giveItem(h, 'f_yuanxiao', 2), (h.fame += 1, '名聲 +1。')]);
};

// ── 端午：賽龍舟 ────────────────────────────────────────

const hong = by('洪大槳');
const TEAMS = [
  { name: '漕幫', odds: 2, chance: 0.45 },
  { name: '金刀鏢局', odds: 3, chance: 0.33 },
  { name: '碧漪漁戶', odds: 4, chance: 0.22 },
];
const BET = 10;

export const dragonBoat: Script = async (ctx) => {
  if (doneToday('boat')) {
    await ctx.say(...hong('今年的龍舟賽完啦！明年端午再來，給你留個槳位。'));
    return;
  }
  await ctx.say('江面上三條龍舟一字排開，鑼鼓震天。岸上擠滿了看熱鬧的人。', ...hong('我是今年的龍舟會首洪大槳！要下注，還是上船划？'));
  const c = await ctx.ask(hong('碧漪漁戶的船還缺一個槳手。')[0], [`下注（${BET} 兩）`, '上碧漪漁戶的船（體力 30）', '在岸上看就好']);
  if (c === 2) {
    once('boat');
    await ctx.say('鼓聲一響，三條龍舟像箭一樣竄了出去，浪花濺得岸上的人一身濕。', `最後是${pickWinner(null).name}的船先搶到了錦標，岸上一片歡呼。`);
    await ctx.hero((h) => giveItem(h, 'f_zongzi'));
    return;
  }
  if (c === 0) {
    const t = await ctx.ask(hong('押哪一隊？')[0], [...TEAMS.map((x) => `${x.name}（一賠${x.odds}）`), '算了']);
    if (t >= TEAMS.length || !(await pay(ctx, BET, hong))) return;
    once('boat');
    const win = pickWinner(null);
    await ctx.say(`你押了${TEAMS[t].name}。`, '鼓聲一響，三條龍舟破浪而出——', `${win.name}的船頭一個猛衝，先搶到了江心的錦標！`);
    if (win === TEAMS[t]) {
      const n = BET * TEAMS[t].odds;
      await ctx.say(...hong('押中了！眼光不錯！'));
      await ctx.hero((h) => ((h.silver += n), `贏得銀兩 ${n}。`));
    } else await ctx.say(...hong('押錯囉，明年再來！'));
    return;
  }
  if (!(await exert(ctx, 30, '你累得連槳都舉不起來，上了船只會拖累大家。'))) return;
  once('boat');
  ctx.pass(4);
  const a = attrs(st().hero);
  // 你一個人的力氣也算進去：膂力與體魄越高，碧漪漁戶的勝算越大
  const boost = Math.max(0, Math.min(0.35, (a.strength + a.constitution - 20) / 100));
  const win = pickWinner(boost);
  await ctx.say('你接過一支槳，跳上碧漪漁戶的船。鼓手一聲吆喝：「起——！」', '十幾支槳齊刷刷地插進水裡，船身猛地往前一竄。');
  if (win === TEAMS[2]) {
    await ctx.say('最後一段，你咬著牙越划越快，船頭硬是搶在漕幫前頭半個身子——', '錦標到手！岸上的鄉親都跳了起來。', ...hong('好樣的！今年碧漪漁戶翻身了！'));
    await ctx.hero((h) => [((h.silver += 30), '獲得銀兩 30。'), giveItem(h, 'f_zongzi', 3), ((h.fame += 3), '名聲 +3。')]);
  } else {
    await ctx.say(`拚到最後，還是${win.name}的船先到。你累得癱在船板上，漁戶們拍著你的肩：「明年再來！」`);
    await ctx.hero((h) => [giveItem(h, 'f_zongzi', 2), ((h.fame += 1), '名聲 +1。')]);
  }
  await ctx.say('（划了半個時辰）');
};

/** 擲出贏的隊伍；boost 是碧漪漁戶（你上船時）多出的勝算 */
function pickWinner(boost: number | null) {
  const w = TEAMS.map((t, i) => t.chance + (boost !== null && i === 2 ? boost : 0));
  let x = Math.random() * w.reduce((a, b) => a + b, 0);
  return TEAMS[w.findIndex((v) => (x -= v) < 0)] ?? TEAMS[0];
}

// ── 中元：放河燈 ────────────────────────────────────────

export const riverLamps: Script = async (ctx) => {
  if (!night()) {
    await ctx.say('攤子上擺著一盞盞紙糊的蓮花燈。', ...by('鄔婆婆')('河燈要等天黑了才放。入夜再來吧。'));
    return;
  }
  if (doneToday('lamp')) {
    await ctx.say('你放的那盞河燈，已經漂到江心，混在一片燈影裡了。');
    return;
  }
  if ((await ctx.ask(by('鄔婆婆')('放一盞河燈吧，替想念的人照照路。兩兩一盞。')[0], ['放一盞（2 兩）', '算了'])) !== 0) return;
  if (!(await pay(ctx, 2, by('鄔婆婆')))) return;
  once('lamp');
  ctx.pass(2);
  await ctx.say('你蹲在江邊，點亮蓮花燈，輕輕推進水裡。', '江面上已經漂著上百盞燈，一點點燭光順著水流往下游去，像一條光做的河。', '想起了一些人、一些事，心裡反倒平靜了。');
  await ctx.hero((h) => {
    h.qi = derive(h).maxQi;
    h.treat = { battles: 3, mult: 1.15 };
    return '（內力恢復；心情愉快：接下來 3 場戰鬥武功經驗 ×1.15）';
  });
};

// ── 中秋：望江樓賞月宴 ─────────────────────────────────

const BANQUET = 10;

/** 望江樓：中秋入夜的賞月宴（處理了回傳 true）。東家免費 */
export async function moonBanquet(ctx: EventCtx, owner: boolean): Promise<boolean> {
  if (today() !== '中秋' || !night() || doneToday('moon')) return false;
  const w = by('汪福來');
  const c = await ctx.ask(w(owner ? '東家！今晚的賞月宴，主位給您留著呢！' : `今晚中秋，樓上設了賞月宴，一位 ${BANQUET} 兩，酒菜管夠！`)[0], ['入席', '不了']);
  if (c !== 0) return true;
  if (!owner && !(await pay(ctx, BANQUET, w))) return true;
  once('moon');
  ctx.pass(4);
  await ctx.say(
    '望江樓頂層的窗全開了，一輪明月從江面上升起，照得滿江銀光。',
    '席間有人行酒令，有人吟詩，費一言拍著醒木說了一段「月下斷江」，滿堂叫好。',
    '鄰桌的客商、書生一個個過來敬酒，說說笑笑，不知不覺月已中天。',
  );
  await ctx.hero((h) => {
    const d = derive(h);
    h.hp = d.maxHp;
    h.qi = d.maxQi;
    h.treat = { battles: 3, mult: 1.2 };
    return [giveItem(h, 'f_yuebing', 2), ((h.fame += 2), '名聲 +2。'), '（氣血、內力全滿；接下來 3 場戰鬥武功經驗 ×1.2）'];
  });
  return true;
}

// ── 冬至湯圓、除夕年夜飯（雲來客棧） ────────────────────

const he = by('賀長年');

/** 雲來客棧的節慶（處理了回傳 true） */
export async function innFestival(ctx: EventCtx, owner: boolean): Promise<boolean> {
  const f = today();
  if (f === '冬至' && !doneToday('dongzhi')) {
    once('dongzhi');
    await ctx.say(...he('冬至了！小店請每位客官一碗湯圓，暖暖身子。'), '牛小旺端上一碗熱騰騰的湯圓，紅白各半。');
    await ctx.hero((h) => giveItem(h, FEST_FOOD.冬至));
    return true;
  }
  if (f === '除夕' && night() && !doneToday('nye')) {
    const c = await ctx.ask(he(owner ? '東家，今晚除夕，夥計們都等著您一起吃年夜飯呢！' : '客官今晚除夕還在外頭？不嫌棄的話，一起吃頓年夜飯吧，算你五兩就好。')[0], ['一起吃', '不了']);
    if (c !== 0) return true;
    if (!owner && !(await pay(ctx, 5, he))) return true;
    once('nye');
    ctx.pass(4);
    await ctx.say('大堂裡併起兩張桌子，雞鴨魚肉擺了滿滿一桌。賀長年給每個人斟上一杯屠蘇酒。', '窗外的煙火一朵接一朵地開，牛小旺搶著去放鞭炮，嚇得門口的狗直叫。', '守歲守到子時，一年就這麼過去了。');
    await ctx.hero((h) => {
      const d = derive(h);
      h.hp = d.maxHp;
      h.qi = d.maxQi;
      h.stamina = d.maxStamina;
      h.treat = { battles: 3, mult: 1.2 };
      return [giveItem(h, 'f_jiaozi', 2), '（吃得飽飽的：氣血、內力、體力全滿；接下來 3 場戰鬥武功經驗 ×1.2）'];
    });
    return true;
  }
  return false;
}

