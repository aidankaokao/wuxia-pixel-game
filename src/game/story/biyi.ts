import { addFame, Character, gainSkill, giveItem, isEquipped, skillCap, skillDef, slotOf } from '../character';
import { craftOf, gainCraft, gainWork, learnWork, workOf } from '../crafts';
import { dishItem } from '../cooking';
import { registerDailyTasks } from '../daily';
import { withCost, type EventCtx, type Script } from '../events';
import { CAST_KE, CAST_STAMINA, catchExp, FishDef, fightParams, FishSpot, rollFish, waitChance, FISH } from '../fishing';
import { usedToday } from '../home';
import { by } from '../maps/rooms';
import { STAGE, stageOf } from '../social';
import { dateOf, periodOf, seasonOf, type Season } from '../time';
import { useGame } from '../../state/store';
import { teachDishes } from './cooking';
import { askRounds, exert, roundsNote, sleep } from './estate';
import { maybeDayEvent } from './schedule';
import { registerDayEvent } from '../schedule';
import { relOf } from './social';

/**
 * 碧漪湖漁村（大地圖上的 biyi）：碧漪湖西岸的小漁村，從青竹村走湖畔小路過來。
 * - 釣魚：棧橋盡頭、南岸蘆葦蕩、湖心島各有釣點（`fishAt`）；釣竿跟秦老漢買
 * - 秦老漢：老漁夫（人際），賣釣竿、撐船送人去湖心島；熟了會講白鯉的傳說
 * - 喬嫂：湖鮮館老闆娘（人際），點菜、教湖鮮菜（收銀兩）、賣菱角蓮藕、住一晚
 * - 阮大水：年輕漁夫，魚簍邊收魚、賣魚
 * - 荷塘：一天採一次蓮藕與菱角（喬小荷在旁邊幫忙）
 * - 湖心島望月亭：每月十五的夜裡，傳說中的白鯉會浮上來（`moonPavilion`）
 *
 * 人物檔案與任務日誌在 biyi_people.ts（避免跟 people.ts 互相引用）。
 *
 * 旗標：
 *   by_legend  聽過白鯉的傳說（或親眼見過）= 1
 *   by_carp    白鯉：1 放生了、2 帶回去了
 */

const st = () => useGame.getState();
const qin = by('秦老漢');
const qiao = by('喬嫂');
const ruan = by('阮大水');

const fishLevel = (h: Character = st().hero) => craftOf(h, 'fishing').level;

async function paySilver(ctx: EventCtx, n: number, who: (...t: string[]) => ReturnType<typeof qin>): Promise<boolean> {
  if (st().hero.silver < n) {
    await ctx.say(...who(`這得 ${n} 兩，你身上不夠呢。`));
    return false;
  }
  st().updateHero((h) => (h.silver -= n));
  return true;
}

// ── 釣魚 ────────────────────────────────────────────────

/** 釣起一條魚：放進行囊、記進魚譜、加技能經驗；回傳要顯示的話 */
function landFish(h: Character, f: FishDef, perfect: boolean, expMult = 1): (string | null)[] {
  const isNew = !workOf(h, 'fishing', f.id);
  learnWork(h, 'fishing', f.id);
  gainWork(h, 'fishing', f.id, perfect ? 2 : 1);
  return [
    giveItem(h, f.id),
    isNew ? `魚譜新添一筆：「${f.name}」！` : null,
    gainCraft(h, 'fishing', Math.round(catchExp(f, perfect) * expMult)),
  ];
}

/** 自己拉竿：一竿一竿釣，每竿玩一次小遊戲 */
async function castByHand(ctx: EventCtx, spot: FishSpot) {
  for (;;) {
    if (!(await exert(ctx, CAST_STAMINA, '手臂痠得握不住竿了。'))) return;
    ctx.pass(CAST_KE);
    const w = st().world;
    const lv = fishLevel();
    const f = rollFish(spot, lv, periodOf(w.time), w.weather, seasonOf(w.day));
    const r = await st().playFishing(fightParams(lv, f.fight));
    if (r === 'miss') st().updateHero((h) => void gainCraft(h, 'fishing', 1));
    else await ctx.hero((h) => [`釣起一條${f.name}！${r === 'perfect' ? '（漂亮）' : ''}`, ...landFish(h, f, r === 'perfect')]);
    if ((await ctx.ask(r === 'miss' ? '魚跑了。再甩一竿？' : '再釣一竿？', ['再釣一竿', '收竿'])) !== 0) break;
  }
  await maybeDayEvent(ctx, 'lake');
}

/** 慢慢等：照手藝判定，可以連釣幾回 */
async function castWaiting(ctx: EventCtx, spot: FishSpot) {
  const n = await askRounds(ctx, CAST_STAMINA, '釣');
  if (!n) return;
  if (!(await exert(ctx, CAST_STAMINA * n, '手臂痠得握不住竿了。'))) return;
  ctx.pass(CAST_KE * n);
  const net = (st().hero.items.fish_net ?? 0) > 0;
  await ctx.work('fish', net ? '撒網垂釣中……' : '垂釣中……');
  const w = st().world;
  let lost = 0;
  const caught: FishDef[] = [];
  for (let i = 0; i < n; i++) {
    const f = rollFish(spot, fishLevel(), periodOf(w.time), w.weather, seasonOf(w.day));
    if (Math.random() < waitChance(fishLevel(), f.fight, w.weather, net)) {
      caught.push(f);
      // 下了漁網：偶爾一次撈上兩條
      if (net && Math.random() < NET_DOUBLE) caught.push(f);
    }
    else lost++;
  }
  await ctx.hero((h) => {
    const out: (string | null)[] = [];
    const tally = new Map<string, number>();
    for (const f of caught) {
      tally.set(f.name, (tally.get(f.name) ?? 0) + 1);
      // 一條條的「獲得」不重複列，總結寫在最前面
      out.push(...landFish(h, f, false, 0.75).filter((t) => t && !t.startsWith('獲得')));
    }
    if (lost) gainCraft(h, 'fishing', lost);
    const got = [...tally].map(([name, k]) => `${name}×${k}`).join('、');
    return [caught.length ? `釣起：${got}。` : '一條也沒釣著……', lost && caught.length ? `（另外跑了 ${lost} 條）` : null, ...out];
  });
  const note = roundsNote('釣', n, CAST_KE);
  if (note) await ctx.say(note);
  await maybeDayEvent(ctx, 'lake');
}

/** 釣點：水面上有浮標漣漪的地方 */
export const fishAt = (spot: FishSpot, look: string): Script =>
  withCost(
    () => (st().hero.items.rod ? { ke: CAST_KE, stamina: CAST_STAMINA } : null),
    async (ctx) => {
      if (!st().hero.items.rod) {
        await ctx.say(look, '（沒有釣竿。碧漪湖漁村的秦老漢有賣）');
        return;
      }
      const c = await ctx.ask(`${look}\n要怎麼釣？（每竿一刻、體力 ${CAST_STAMINA}）`, ['自己拉竿（看準時機按 E）', '慢慢等（照手藝，可以連釣幾回）', '算了']);
      if (c === 0) await castByHand(ctx, spot);
      else if (c === 1) await castWaiting(ctx, spot);
    },
  );

// ── 湖心島 ──────────────────────────────────────────────

const ISLE_FARE = 2;
const isMoonNight = (date: number) => date >= 14 && date <= 16;

/** 棧橋邊秦老漢的小船：白天撐船送人去湖心島；夜裡只有月圓前後才肯出船 */
export const isleBoat: Script = async (ctx) => {
  const w = st().world;
  const night = periodOf(w.time) === 'night';
  if (night && !isMoonNight(dateOf(w.day).date)) {
    await ctx.say('秦老漢的小船拴在棧橋邊，隨著水波輕輕晃。', ...qin('天黑了不行船，湖心有暗流。明兒早上再來吧。'));
    return;
  }
  const friend = stageOf(relOf('qinlao').aff) >= STAGE.NOD;
  const fare = friend ? 0 : ISLE_FARE;
  const line = night
    ? '月亮這麼亮，湖面跟白天一樣。走吧，老漢送你過去。'
    : `要去湖心島？${fare ? `船錢 ${fare} 兩，來回都算上。` : '自己人，不收錢。'}`;
  if ((await ctx.ask(qin(line)[0], ['上船', '不用了'])) !== 0) return;
  if (fare && !(await paySilver(ctx, fare, qin))) return;
  ctx.pass(2);
  await ctx.say('秦老漢一篙一篙撐著船，小船慢慢離了岸。', '湖水清得見底，水草在船底下搖。', '（過了兩刻，到了湖心島）');
  ctx.warp('by_isle', { x: 6, y: 8, facing: 'right' });
};

export const isleBack: Script = async (ctx) => {
  if ((await ctx.ask(qin('回漁村去？')[0], ['回去', '再待一會兒'])) !== 0) return;
  ctx.pass(2);
  ctx.warp('biyi', { x: 38, y: 14, facing: 'up' }, [{ text: '小船靠上了棧橋。' }]);
};

/**
 * 望月亭：每月十五的夜裡，白鯉會浮上來。釣魚 3 級以上、帶著釣竿才能跟牠周旋（一次很難的小遊戲）。
 * 釣起來以後放生或帶回去，只會發生一次。
 */
export const moonPavilion: Script = async (ctx) => {
  const w = st().world;
  const night = periodOf(w.time) === 'night';
  const date = dateOf(w.day).date;
  const carp = ctx.flag('by_carp');
  if (carp === 1) {
    await ctx.say('望月亭。月光下的湖面平靜無波。', '你摸了摸頸上的鱗墜——那尾白鯉，大概正在湖底某處睡著吧。');
    return;
  }
  if (carp === 2) {
    await ctx.say('望月亭。亭柱上「月滿碧漪，白鯉朝天」八個字，看起來有點寂寞。');
    return;
  }
  if (!night) {
    await ctx.say('一座小小的石亭，亭柱上刻著兩行字：「月滿碧漪，白鯉朝天」。', '亭裡的石桌上，有人用小刀刻了一條魚。');
    return;
  }
  if (date !== 15) {
    await ctx.say('夜裡的湖面黑沉沉的，只有風吹蘆葦的聲音。', date >= 12 && date < 15 ? '月亮還差一點才圓。' : '月亮缺了一角，湖上什麼也沒有。');
    return;
  }
  await ctx.say(
    '月亮又大又圓，碧漪湖平得像一面鏡子，亭子的影子倒映在水裡。',
    '忽然，湖心泛起一圈銀白的漣漪——',
    '一尾通體雪白的大鯉魚浮上水面，鱗片映著月光，像是自己會發光。',
  );
  if (!ctx.flag('by_legend')) ctx.setFlag('by_legend', 1);
  if (!st().hero.items.rod) {
    await ctx.say('（手邊沒有釣竿，只能看著牠緩緩沉回湖底）');
    return;
  }
  if (fishLevel() < 3) {
    await ctx.say('你甩出釣線，白鯉連看都不看一眼，尾巴一擺就沉下去了。', '（釣魚 3 級以上，才有本事跟白鯉周旋）');
    return;
  }
  if ((await ctx.ask('白鯉繞著亭子慢慢游，好像在等什麼。', ['甩竿', '靜靜看著就好'])) !== 0) {
    await ctx.say('白鯉在月光下繞著亭子游了一圈，緩緩沉回湖底。', '你在亭裡坐了很久，心裡一片寧靜。');
    st().updateHero((h) => (h.rested = { battles: 3, mult: 1.1 }));
    await ctx.say('（心神澄明。接下來 3 場戰鬥，武功經驗 ×1.1）');
    return;
  }
  if (!(await exert(ctx, 15, '你連握竿的力氣都沒有了。'))) return;
  ctx.pass(2);
  const r = await st().playFishing({ zone: 0.14, speed: 1.9 });
  if (r === 'miss') {
    await ctx.say('釣線「啪」地一聲斷了。白鯉翻了個身，沉入湖底。', '（下個月十五再來吧）');
    return;
  }
  await ctx.say('你和白鯉在月光下拉扯了好一陣，終於把牠拉到亭邊——', '白鯉不再掙扎了，一雙眼睛靜靜地看著你。');
  const c = await ctx.ask('……', ['解下魚鉤，放牠回湖裡', '把牠帶回去']);
  if (c === 0) {
    ctx.setFlag('by_carp', 1);
    await ctx.say(
      '你解下魚鉤，雙手捧著白鯉送回水裡。',
      '白鯉在亭邊停了一會兒，甩了甩尾巴，濺起的水珠落在你掌心——',
      '掌心裡多了一片銀白的鱗，在月光下微微發亮。',
    );
    await ctx.hero((h) => {
      h.points += 5;
      return [giveItem(h, 'g_carp_scale'), addFame(h, 10), '武學點數 +5。', gainCraft(h, 'fishing', 30)];
    });
  } else {
    ctx.setFlag('by_carp', 2);
    await ctx.say('你把白鯉裝進魚簍。牠在簍裡一動也不動，月亮好像暗了一點。');
    await ctx.hero((h) => [giveItem(h, 'white_carp'), gainCraft(h, 'fishing', 30)]);
  }
};

// ── 荷塘 ────────────────────────────────────────────────

const LOTUS_KEY = 'by:lotus';
/** 帶著漁網慢慢等：每釣起一條，有這個機率多撈一條 */
const NET_DOUBLE = 0.25;
const LOTUS_STAMINA = 10;

/** 荷塘各季能採什麼：春天荷葉才冒尖；夏天菱角剛結；秋天菱角、蓮藕都有；冬天只剩挖藕（比較冷、比較累） */
const LOTUS_SEASON: Record<Season, { roots: [number, number]; chestnuts: [number, number]; stamina: number } | null> = {
  spring: null,
  summer: { roots: [0, 0], chestnuts: [1, 2], stamina: LOTUS_STAMINA },
  autumn: { roots: [1, 2], chestnuts: [2, 3], stamina: LOTUS_STAMINA },
  winter: { roots: [1, 3], chestnuts: [0, 0], stamina: LOTUS_STAMINA + 8 },
};
const roll = ([a, b]: [number, number]) => a + Math.floor(Math.random() * (b - a + 1));

export const lotusPond: Script = withCost(
  () => {
    const s = LOTUS_SEASON[seasonOf(st().world.day)];
    return usedToday(st().world, LOTUS_KEY) || !s ? null : { ke: 2, stamina: s.stamina };
  },
  async (ctx) => {
    const season = seasonOf(st().world.day);
    const s = LOTUS_SEASON[season];
    if (!s) {
      await ctx.say('荷塘裡的荷葉才剛冒尖，捲得像一支支小筆。', '（菱角夏天才結，蓮藕要等到秋冬）');
      return;
    }
    if (usedToday(st().world, LOTUS_KEY)) {
      await ctx.say('荷塘今天已經採過了，留一些明天再長吧。');
      return;
    }
    const what = season === 'summer' ? '水面漂著剛結的嫩菱角。' : season === 'autumn' ? '荷葉底下有蓮藕，水面漂著菱角。' : '荷葉都枯了，塘泥底下還埋著蓮藕。';
    if ((await ctx.ask(`${what}要下塘採一些嗎？（兩刻、體力 ${s.stamina}）`, [season === 'winter' ? '咬咬牙，下塘挖藕' : '挽起褲腳下塘', '算了'])) !== 0) return;
    if (!(await exert(ctx, s.stamina, '腿軟得站不穩，掉進塘裡就不好笑了。'))) return;
    ctx.pass(2);
    st().updateWorld((w) => (w.daily[LOTUS_KEY] = { day: w.day, n: 1 }));
    await ctx.work('garden', season === 'winter' ? '挖藕中……' : '採蓮中……');
    await ctx.say(
      season === 'winter' ? '塘水冰得刺骨，你咬著牙順著枯荷梗往下摸，拔出一節沾滿泥的白藕。' : '塘泥軟軟的，一腳踩下去沒到小腿。',
      { speaker: '喬小荷', text: season === 'winter' ? '冬天的藕最粉！娘說燉肉最好吃！' : '菱角要從底下翻過來摘，才不會扎手！' },
    );
    const roots = roll(s.roots);
    const nuts = roll(s.chestnuts);
    await ctx.hero((h) => [roots ? giveItem(h, 'lotus_root', roots) : null, nuts ? giveItem(h, 'water_chestnut', nuts) : null]);
    await maybeDayEvent(ctx, 'lake');
  },
);

// ── 阮大水的魚簍 ────────────────────────────────────────

const FISH_IDS = FISH.map((f) => f.id);

export const ruanStall: Script = async (ctx) => {
  const c = await ctx.ask(ruan('今天的魚都在簍子裡。你要是自己釣了魚，我也收——價錢公道！')[0], ['買魚／賣魚', '聊聊', '不用了']);
  if (c === 0) {
    await ctx.panel({ kind: 'shop', title: '阮大水的魚簍', stock: ['crucian', 'carp', 'lake_shrimp'], buys: [...FISH_IDS, 'lotus_root', 'water_chestnut', 'white_carp'], sellRate: 0.7 });
  } else if (c === 1) {
    const lines = [
      ruan('秦老爺子釣了一輩子魚，連白鯉都見過。', '我？我只見過我家的白貓。'),
      ruan('下雨天別躲屋裡，雨天的魚最貪嘴。', '蘆葦蕩那邊青蝦多，甲魚也愛躲在那兒。'),
      ruan('鱖魚要等太陽下山才肯咬鉤，脾氣大得很。'),
    ];
    await ctx.say(...lines[Math.floor(Math.random() * lines.length)]);
  }
};

// ── 湖鮮館 ──────────────────────────────────────────────

const INN_PRICE = 3;
/** 喬嫂教湖鮮菜的學費（入門、中等、進階、拿手） */
const LAKE_DISH_COST = [8, 20, 45, 80];
const MENU = ['jiyu', 'tangcu', 'yinyu', 'qingxia', 'lingjiao'];

/** 喬嫂的櫃台：點菜、學做湖鮮、買湖產、住一晚 */
export async function qiaoMenu(ctx: EventCtx): Promise<boolean> {
  const c = await ctx.ask(qiao('來啦！要吃點什麼？')[0], ['聊聊', '點菜', '學做湖鮮', '買菱角、蓮藕', `住一晚（${INN_PRICE} 兩）`]);
  if (c === 0) return false;
  if (c === 1) await ctx.panel({ kind: 'shop', title: '湖鮮館・菜單', stock: MENU.map((id) => dishItem(id)) });
  else if (c === 2)
    await teachDishes(ctx, '喬嫂', (n) => paySilver(ctx, n, qiao), () => craftOf(st().hero, 'cooking').level, undefined, {
      teaches: (d) => !!d.lake,
      unit: '兩',
      cost: LAKE_DISH_COST,
    });
  else if (c === 3) await ctx.panel({ kind: 'shop', title: '湖鮮館・湖產', stock: ['lotus_root', 'water_chestnut'] });
  else if (c === 4) {
    if (!(await paySilver(ctx, INN_PRICE, qiao))) return true;
    await ctx.say(...qiao('後頭那間小房，窗子開著就聽得見湖水。被子我才曬過的。'));
    await sleep(ctx, 1, () => ['窗外的湖面霧濛濛的，遠遠傳來秦老漢撐船的水聲。']);
  }
  return true;
}

export const qiaoCounter: Script = async (ctx) => {
  await qiaoMenu(ctx);
};

// ── 湖邊的小事（釣魚、採蓮之後偶爾碰上） ──────────────

registerDayEvent({
  id: 'lake_otter',
  after: ['lake'],
  weight: 2,
  when: (v) => (v.hero.items.crucian ?? 0) > 0,
  run: async (ctx) => {
    await ctx.say('蘆葦叢裡「嘩」地鑽出一隻水獺，叼起你簍子裡的一條鯽魚就跑。', '牠跑到幾步外，還回頭看了你一眼，好像在說謝謝。');
    st().updateHero((h) => {
      h.items.crucian -= 1;
      if (h.items.crucian <= 0) delete h.items.crucian;
    });
    await ctx.say('（少了一條鯽魚）');
  },
});

registerDayEvent({
  id: 'lake_heron',
  after: ['lake'],
  weight: 2,
  run: async (ctx) => {
    await ctx.say('一隻白鷺單腳立在淺水裡，半天一動不動；魚一游近，牠脖子一伸就叼住了。', '你看著牠那份靜，忽然覺得腳底下也穩了些。');
    await ctx.hero((h) => {
      const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === 'light' && k.level < skillCap(k));
      return s ? [`「${skillDef(s).name}」經驗 +10。`, gainSkill(h, s.id, 10, false)] : '（心裡靜了下來）';
    });
  },
});

registerDayEvent({
  id: 'lake_xiaohe',
  after: ['lake'],
  weight: 2,
  when: (v) => periodOf(v.world.time) !== 'night',
  run: async (ctx) => {
    await ctx.say({ speaker: '喬小荷', text: '給你！我剛剝的菱角，娘說不能白吃人家的，你上回幫我拉過船。' }, '……你不記得幫她拉過船。不過菱角很甜。');
    await ctx.hero((h) => giveItem(h, 'water_chestnut', 2));
  },
});

// ── 任務日誌與今日事 ────────────────────────────────────

registerDailyTasks(({ world, flags }) =>
  flags.by_legend && !flags.by_carp && dateOf(world.day).date === 15 ? [{ text: '月圓之夜：湖心島望月亭的白鯉', state: 'todo', note: '夜裡、帶著釣竿' }] : [],
);
