import { COOK_STAMINA, cookAt } from './cooking';
import { learningBonus } from '../books';
import { Character, derive, roundsToCap, type Skill, gainInsight, gainSkill, giveItem, isEquipped, nextMove, restoreAll, skillCap, skillDef, slotOf } from '../character';
import { MOVES } from '../battle/moves';
import { withCost, type EventCtx, type Script } from '../events';
import {
  BED_REST,
  DUMMY_EXP,
  Estate,
  furnitureLevel,
  furnitureOf,
  GARDEN_HERBS,
  SHELF_INSIGHT,
  tierDef,
  usedToday,
} from '../home';
import type { Line, PlotDef } from '../maps/types';
import { keText } from '../thought';
import { editSchedule, runSchedule } from './schedule';
import { dateText, festivalOf, inShichen, keUntilDawn, SHICHEN, SHICHEN_INDEX, timeText } from '../time';
import { useGame } from '../../state/store';
import { registerDailyTasks } from '../daily';

/**
 * 房產相關的劇情：空地的木牌、杜木匠、貨郎、家裡各件家具。
 *
 * 旗標：
 *   home_deed   1 柳村長給了地契（可以免費挑一塊空地） / 2 地契已用掉
 */

const du = (text: string): Line => ({ speaker: '杜大樑', text });
const st = () => useGame.getState();

/** 今日事：自家藥圃的止血草一天收一次 */
registerDailyTasks(({ world }) =>
  Object.values(world.estates)
    .filter((e) => furnitureOf(e).some((f) => f.id === 'garden'))
    .map((e) => ({ text: `收${plotName(e)}藥圃的止血草`, state: usedToday(world, `${e.plot}:garden`) ? 'done' : 'todo' })),
);

// ── 空地 ────────────────────────────────────────────────

/** 空地上的木牌：用地契或花錢買下，蓋起茅草屋 */
export const plotSign =
  (plot: PlotDef): Script =>
  async (ctx) => {
    await ctx.say(`「${plot.name}」\n空地一塊，可以蓋屋。售價 ${plot.price} 兩，買下附贈茅草屋一間。`);
    if (ctx.flag('home_deed') === 1) {
      const c = await ctx.ask('你拿出柳村長給的地契。要在這塊地上蓋房子嗎？', ['就是這裡', '再看看']);
      if (c !== 0) return;
      ctx.setFlag('home_deed', 2);
    } else {
      const c = await ctx.ask(`要花 ${plot.price} 兩買下這塊地嗎？（目前有 ${st().hero.silver} 兩）`, ['買下', '算了']);
      if (c !== 0) return;
      if (st().hero.silver < plot.price) {
        await ctx.say('銀兩不夠……還是先去多攢一些吧。');
        return;
      }
      await ctx.hero((c) => {
        c.silver -= plot.price;
      });
    }
    st().updateWorld((w) => {
      w.estates[plot.id] = { plot: plot.id, tier: 1, style: 'plain', furniture: {} };
    });
    await ctx.say('杜木匠帶著幾個幫手扛來茅草和木料，不到半天，就在空地上搭起了一間茅草屋。');
    ctx.reload([{ text: '這是你在江湖上的第一個家。\n（找杜木匠可以擴建房子、升級家具、換擺設風格）' }]);
  };

// ── 杜木匠 ──────────────────────────────────────────────

export const carpenterTalk: Script = async (ctx) => {
  const estates = Object.values(st().world.estates);
  if (!estates.length) {
    await ctx.say(du('我是村裡的木匠杜大樑，蓋屋、打家具都找我。'), du('村東有兩塊、村西南有一塊空地，地上插著木牌。買下來，我就幫你把屋子搭起來。'));
    if (ctx.flag('home_deed') === 1) await ctx.say(du('柳村長給了你地契？那就挑一塊喜歡的，到木牌前拿出地契就成。'));
    return;
  }
  let plot = estates[0].plot;
  if (estates.length > 1) {
    const names = estates.map((e) => `${plotName(e)}（${tierDef(e.tier).name}）`);
    const i = await ctx.ask(du('要整修哪一間？'), [...names, '算了']);
    if (i >= estates.length) return;
    plot = estates[i].plot;
  }
  await ctx.say(du('擴建、換家具、改擺設，儘管開口。工錢公道。'));
  await ctx.panel({ kind: 'home', plot });
};

/** 房產所在空地的名稱 */
export const plotName = (e: Estate) => plotNames[e.plot] ?? '自宅';
const plotNames: Record<string, string> = {};
export const registerPlotNames = (plots: PlotDef[]) => plots.forEach((p) => (plotNames[p.id] = p.name));

// ── 家具 ────────────────────────────────────────────────

const estateOf = (plot: string) => st().world.estates[plot];

/** 每天限定次數（例如藥圃一天只長一次、晨課一天一回）：還能用就記一次並回傳 true */
export async function useDaily(ctx: EventCtx, key: string, perDay: number, tired: string): Promise<boolean> {
  if (usedToday(st().world, key) >= perDay) {
    await ctx.say(`${tired}\n（明天再來吧。過了半夜就是新的一天）`);
    return false;
  }
  st().updateWorld((w) => {
    const n = usedToday(w, key);
    w.daily[key] = { day: w.day, n: n + 1 };
  });
  return true;
}

/** 練功、讀書等要花的體力；體力不夠就得先休息 */
export const STAMINA = { dummy: 20, spar: 30, study: 10, sit: 10, chore: 15 };

/** 花體力：夠就扣掉並回傳 true，不夠就說累了 */
export async function exert(ctx: EventCtx, cost: number, tired: string): Promise<boolean> {
  const have = st().hero.stamina;
  if (have < cost) {
    await ctx.say(`${tired}\n（體力不足：需要 ${cost}，目前只剩 ${have}。睡一覺或小睡片刻就能恢復）`);
    return false;
  }
  st().updateHero((h) => (h.stamina -= cost));
  return true;
}

/** 連做時，體力留到剩幾成為止 */
const KEEP_STAMINA = 0.3;

/**
 * 重複的事一次做完：體力夠連做兩回以上，就問要做一回、三回，還是連做到體力剩三成（max 是最多幾回有意義，例如練到上限）。
 * 回傳回數，0 是不做。question 是本來就要問的話（例如「要坐下來撫一曲嗎？」），給了就一律問，並把回數併進選項。
 */
export async function askRounds(ctx: EventCtx, cost: number, verb: string, max = 99, question?: string): Promise<number> {
  const h = st().hero;
  const keep = Math.ceil(derive(h).maxStamina * KEEP_STAMINA);
  const n = Math.min(max, Math.floor((h.stamina - keep) / cost));
  if (n < 2) return question ? ((await ctx.ask(question, [`${verb}一回`, '算了'])) === 0 ? 1 : 0) : 1;
  // 一回、三回（回數多時，不想一口氣耗掉一整天）、做到體力剩三成
  const counts = [1, ...(n > 3 ? [3] : []), n];
  const labels = counts.map((k, i) => (k === 1 ? `${verb}一回` : i === counts.length - 1 ? `連${verb} ${k} 回（體力剩三成為止）` : `連${verb} ${k} 回`));
  const c = await ctx.ask(question ?? `要${verb}幾回？（每回體力 ${cost}）`, [...labels, '算了']);
  return counts[c] ?? 0;
}

/** 連做 n 回的說明，例如「（連練 4 回，花了兩個時辰）」 */
export const roundsNote = (verb: string, n: number, ke: number) => (n > 1 ? `（連${verb} ${n} 回，花了${keText(ke * n)}）` : '');

const bed =
  (plot: string): Script =>
  async (ctx) => {
    await rest(ctx, furnitureLevel(estateOf(plot), 'bed'));
  };

/**
 * 床：睡到天亮（全回復，床的等級 2 起精神飽滿），或小睡一到三個時辰（恢復一部分）。
 * wake 是睡醒時的情景（例如門派宿舍裡被同門叫醒），睡醒後才呼叫，所以能依隔天的日子決定（例如旬休不用叫起床）。門派宿舍的床鋪也用這個。
 */
export async function rest(ctx: EventCtx, lv: number, prompt = '要躺下休息嗎？', wake?: Wake, schedule = false) {
  const night = !inShichen(st().world.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.申);
  // 門派弟子的床鋪：也在這裡照日課表過一天、排日課表
  const extra = schedule ? ['照日課表過今天', '排日課表'] : [];
  const c = await ctx.ask(prompt, [night ? '睡到天亮' : '睡到明天早上', '小睡一個時辰', '小睡兩個時辰', '小睡三個時辰', ...extra, '算了']);
  if (c === 0) await sleep(ctx, lv, wake);
  else if (c <= 3) await nap(ctx, c);
  else if (schedule && c === 4) await runSchedule(ctx, lv, wake);
  else if (schedule && c === 5) await editSchedule(ctx);
}

/** 睡到下一個卯時（早上 5 點）、全回復 */
/** 睡醒時的情景：睡醒之後才算出來 */
export type Wake = () => (Line | string)[] | undefined;

export async function sleep(ctx: EventCtx, lv: number, wake?: Wake) {
  await ctx.work('sleep', '睡覺中……', 1000);
  ctx.pass(keUntilDawn(st().world.time));
  const { day, time } = st().world;
  const bonus = BED_REST[lv];
  await ctx.hero((h) => {
    restoreAll(h);
    if (bonus) h.rested = { battles: bonus.battles, mult: bonus.mult };
    return null;
  });
  // 提要是一天裡最早的事：先看提要，再被叫醒
  await st().showBrief();
  await ctx.say(
    `你一覺睡到天亮。\n——${dateText(day)}${festivalOf(day) ? `（${festivalOf(day)}）` : ''}　${timeText(time)}`,
    ...(wake?.() ?? []),
    `（氣血、內力、體力完全恢復）${bonus ? `\n精神飽滿！接下來 ${bonus.battles} 場戰鬥，武功經驗 ×${bonus.mult}。` : ''}`,
  );
}

/** 小睡幾個時辰：每個時辰恢復四分之一的氣血、內力，與三分之一的體力 */
async function nap(ctx: EventCtx, n: number) {
  await ctx.work('sleep', '小睡片刻……', 1000);
  ctx.pass(n * SHICHEN);
  await ctx.hero((h) => {
    const d = derive(h);
    h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.25 * n));
    h.qi = Math.min(d.maxQi, h.qi + Math.round(d.maxQi * 0.25 * n));
    h.stamina = Math.min(d.maxStamina, h.stamina + Math.round(d.maxStamina * 0.34 * n));
    return null;
  });
  await ctx.say(`你小睡了${'一兩三'[n - 1]}個時辰。\n——${timeText(st().world.time)}`, '（恢復了一些氣血、內力與體力）');
}

/** 灶台：做學會的菜；燉山豬肉每塊肉燉成幾份看灶台等級（樸素風格多一份） */
const stove =
  (plot: string): Script =>
  withCost(() => ({ stamina: COOK_STAMINA, note: '每份' }), async (ctx) => {
    const e = estateOf(plot);
    const lv = furnitureLevel(e, 'stove');
    await cookAt({ level: lv, stewPer: lv + (e.style === 'plain' ? 1 : 0), idle: '灶台收拾得乾乾淨淨。' })(ctx);
  });

const shelf =
  (plot: string): Script =>
  withCost(() => (studyable(st().hero).length ? { ke: 2, stamina: STAMINA.study } : null), async (ctx) => {
    const ready = studyable(st().hero);
    if (!ready.length) {
      await ctx.say('架上擺著幾本書。\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）');
      return;
    }
    const i = await ctx.ask('要研讀哪一門武功？', [...ready.map((s) => `${skillDef(s).name}（領悟 ${s.insight}%）`), '算了']);
    if (i >= ready.length) return;
    const e = estateOf(plot);
    const amount = SHELF_INSIGHT[furnitureLevel(e, 'shelf')] + (e.style === 'scholar' ? 6 : 0);
    const n = await askRounds(ctx, STAMINA.study, '讀', roundsToInsight(st().hero, ready[i], amount));
    if (!n) return;
    if (!(await exert(ctx, STAMINA.study * n, '讀了好一陣子，腦袋有些發脹。'))) return;
    ctx.pass(2 * n);
    const id = ready[i].id;
    const name = skillDef(ready[i]).name;
    await ctx.say(`你翻開書冊，對照著「${name}」的招式反覆推敲……${roundsNote('讀', n, 2)}`);
    await ctx.hero((h) => studyInsight(h, id, amount, n));
  });

/** 研讀幾回才悟得出下一招（每回 amount，加上學識的加成） */
export const roundsToInsight = (h: Character, s: Skill, amount: number) => Math.ceil((100 - s.insight) / (amount + learningBonus(h)));

/** 研讀、打坐等加領悟度，回傳提示文字（悟出新招時連同升重一起說） */
export function studyInsight(h: Character, id: string, amount: number, rounds = 1): (string | null)[] {
  const name = skillDef({ id }).name;
  const before = h.skills.find((s) => s.id === id)!.level;
  // 學識高，讀武功典籍也領悟得多一些
  const learned = gainInsight(h, id, (amount + learningBonus(h)) * rounds);
  const s = h.skills.find((k) => k.id === id)!;
  if (!learned) return [`對「${name}」的下一招又多了幾分體會（領悟 ${s.insight}%）。`];
  return [`靈光一閃！你從「${name}」中悟出了「${MOVES[learned].name}」！`, s.level > before ? `「${name}」隨之精進至第 ${s.level} 重！` : null];
}

/** 能參悟下一招的武功（重數夠了、還有招沒悟） */
export const studyable = (h: Character) =>
  h.skills.filter((s) => {
    const next = nextMove(s);
    return next && s.level >= next.level;
  });

/** 裝備中、還沒練到上限的外功 */
const outerTrainable = (h: Character) => h.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s));

const dummy =
  (plot: string): Script =>
  withCost(() => (outerTrainable(st().hero).length ? { ke: 2, stamina: STAMINA.dummy } : null), async (ctx) => {
    const hero = st().hero;
    const list = hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s));
    if (!list.length) {
      await ctx.say('一根結實的木人樁。\n（要裝備著還沒練到上限的外功，才能在這裡練）');
      return;
    }
    const i = await ctx.ask('要對著木人樁練哪一門？', [...list.map((s) => `${skillDef(s).name}（第 ${s.level} 重）`), '算了']);
    if (i >= list.length) return;
    const e = estateOf(plot);
    // 大宅的演武場練起來更有勁
    const amount = DUMMY_EXP[furnitureLevel(e, 'dummy')] + (e.style === 'martial' ? 15 : 0) + (e.tier >= 5 ? 10 : 0);
    const n = await askRounds(ctx, STAMINA.dummy, '練', roundsToCap(list[i], amount));
    if (!n) return;
    if (!(await exert(ctx, STAMINA.dummy * n, '手臂都快抬不起來了，筋骨痠痛得很。'))) return;
    ctx.pass(2 * n);
    const id = list[i].id;
    await ctx.say(`「啪、啪、啪——」你對著木人樁一招一式地練了起來。${roundsNote('練', n, 2)}`);
    await ctx.hero((h) => [`「${skillDef({ id }).name}」經驗 +${amount * n}。`, gainSkill(h, id, amount * n, false)]);
  });

const furnace =
  (plot: string): Script =>
  async (ctx) => {
    const herbs = st().hero.items.herb ?? 0;
    const per = furnitureLevel(estateOf(plot), 'furnace');
    if (herbs < 2) {
      await ctx.say(`一座青銅藥爐。\n（兩株止血草可以煉成 ${per} 帖金創藥。目前有 ${herbs} 株）`);
      return;
    }
    const batches = Math.floor(herbs / 2);
    const c = await ctx.ask(`有 ${herbs} 株止血草，可以煉 ${batches} 爐，每爐 ${per} 帖金創藥。`, ['煉一爐', '全部煉了', '算了']);
    if (c === 2) return;
    const n = c === 0 ? 1 : batches;
    ctx.pass(4);
    await ctx.say('爐火青青，藥香裊裊……\n（花了半個時辰）');
    await ctx.hero((h) => {
      h.items.herb -= n * 2;
      if (!h.items.herb) delete h.items.herb;
      return giveItem(h, 'jinchuang', n * per);
    });
  };

const garden =
  (plot: string): Script =>
  withCost(() => (usedToday(st().world, `${plot}:garden`) ? null : { ke: 2 }), async (ctx) => {
    if (!(await useDaily(ctx, `${plot}:garden`, 1, '今天的止血草已經收過了，新芽還沒長出來。'))) return;
    ctx.pass(2);
    const e = estateOf(plot);
    const n = GARDEN_HERBS[furnitureLevel(e, 'garden')] + (e.style === 'plain' ? 1 : 0);
    await ctx.say('你蹲下身，把長好的止血草一株株摘了下來。');
    await ctx.hero((h) => giveItem(h, 'herb', n));
  });

const look =
  (text: string): Script =>
  async (ctx) => {
    await ctx.say(text);
  };

/** 家具的互動腳本與提示文字 */
export function furnitureScript(plot: string, id: string): { script: Script; label: string } {
  const e = estateOf(plot);
  switch (id) {
    case 'bed':
      return { script: bed(plot), label: '睡覺' };
    case 'stove':
      return { script: stove(plot), label: '做菜' };
    case 'shelf':
      return { script: shelf(plot), label: '研讀' };
    case 'dummy':
      return { script: dummy(plot), label: '練樁' };
    case 'furnace':
      return { script: furnace(plot), label: '煉藥' };
    case 'garden':
      return { script: garden(plot), label: '收成' };
    case 'table':
      return { script: look('一張方桌、兩張竹凳。'), label: '查看' };
    case 'guestbed':
      return { script: look('客房的床鋪得整整齊齊，等著將來的朋友來住。'), label: '查看' };
    default:
      return {
        script: look({ plain: '一盆青竹盆栽，翠綠可愛。', scholar: '一幅淡墨山水，題著「靜觀自得」。', martial: '兵器架上插著刀槍劍棍，擦得雪亮。' }[e?.style ?? 'plain']),
        label: '查看',
      };
  }
}
