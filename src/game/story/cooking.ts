import { canHold, ITEMS } from '../character';
import { cookExp, cookRoll, DISH_KINDS, DISH_TIERS, dishItem, DISHES, DishDef, knowsDish, missing, needsText, QUALITY, STEW, TIER_LEVEL } from '../cooking';
import { learnWork, workOf } from '../crafts';
import type { EventCtx, Script } from '../events';
import { useGame } from '../../state/store';
import { exert } from './estate';

/**
 * 做菜的腳本：灶台前選一道學會的菜、做幾份。鳴泉廚房的大灶與家裡的灶台共用。
 * 花體力與時間；每份各自決定品質（也可能失手），做完加烹飪經驗與這道菜的熟練度。
 */

const st = () => useGame.getState();
const name = (id: string) => ITEMS[id].name;

/** 每做一份要花的體力 */
export const COOK_STAMINA = 6;

export interface StoveOpts {
  /** 灶台好壞（0–3），越好越容易做出好菜 */
  level: number;
  /** 有鳴泉泉水（只有鳴泉廚房） */
  spring?: boolean;
  /** 燉山豬肉每塊肉燉成幾份（家裡的灶台看等級與擺設風格） */
  stewPer?: number;
  /** 灶台的描述（什麼都不會做時顯示） */
  idle: string;
}

export const cookAt =
  (opts: StoveOpts): Script =>
  async (ctx) => {
    const h = st().hero;
    const known = [STEW, ...DISHES].filter((d) => knowsDish(h, d.id));
    const kinds = DISH_KINDS.filter((k) => known.some((d) => d.kind === k));
    if (known.length === 1 && !h.items.boar_meat) {
      await ctx.say(`${opts.idle}\n（有山豬肉的話可以燉來吃；想學更多菜，去鳴泉劍派的廚房找伙房師傅卜大勺）`);
      return;
    }
    const k = await ctx.ask('要做哪一類的菜？', [...kinds, '算了']);
    if (k >= kinds.length) return;
    const list = known.filter((d) => d.kind === kinds[k]);
    const label = (d: DishDef) => {
      const lack = missing(st().hero, d, name);
      const w = workOf(st().hero, 'cooking', d.id);
      return `${d.name}${w ? `（熟練 ${w.level}）` : ''}${lack.length ? '　缺料' : ''}`;
    };
    const i = await ctx.ask('做哪一道？', [...list.map(label), '算了']);
    if (i >= list.length) return;
    await cook(ctx, list[i], opts);
  };

async function cook(ctx: EventCtx, d: DishDef, opts: StoveOpts) {
  const h = st().hero;
  if (d.spring && !opts.spring) {
    await ctx.say(`「${d.name}」要用鳴泉的泉水才做得出那個味道，只有鳴泉劍派的廚房做得了。`);
    return;
  }
  const lack = missing(h, d, name);
  if (lack.length) {
    await ctx.say(`「${d.name}」要用：${needsText(d, name)}。\n還缺：${lack.join('、')}。`);
    return;
  }
  // 最多能做幾份：看食材與體力
  const byFood = Math.min(...Object.entries(d.needs).map(([id, n]) => Math.floor((h.items[id] ?? 0) / n)));
  const byStamina = Math.floor(h.stamina / COOK_STAMINA);
  const most = Math.min(byFood, byStamina);
  const per = d.id === 'stew' ? (opts.stewPer ?? 1) : 1;
  const c = await ctx.ask(
    `「${d.name}」：${needsText(d, name)}${per > 1 ? `，一份材料燉成 ${per} 碗` : ''}。\n材料夠做 ${byFood} 份。（每份花 ${COOK_STAMINA} 點體力）`,
    ['做一份', ...(most > 1 ? [`做 ${most} 份`] : []), '算了'],
  );
  const n = c === 0 ? 1 : most > 1 && c === 1 ? most : 0;
  if (!n) return;
  if (!(await exert(ctx, COOK_STAMINA * n, '站在灶前手都抬不起來了，先歇一歇吧。'))) return;
  await ctx.work('cook', `做${d.name}中……${n > 1 ? `（${n} 份）` : ''}`);

  const made = [0, 0, 0];
  let failed = 0;
  let full = false;
  let done = 0;
  const ups: string[] = [];
  st().updateHero((c) => {
    for (; done < n; done++) {
      const q = cookRoll(c, d, opts.level);
      if (q >= 0 && !canHold(c, dishItem(d.id, q), per)) {
        full = true;
        break;
      }
      for (const [id, k] of Object.entries(d.needs)) {
        c.items[id] -= k;
        if (!c.items[id]) delete c.items[id];
      }
      if (q < 0) failed++;
      else {
        made[q] += per;
        c.items[dishItem(d.id, q)] = (c.items[dishItem(d.id, q)] ?? 0) + per;
      }
      ups.push(...cookExp(c, d, q < 0));
    }
    // 沒做的份數，體力還回去
    c.stamina += COOK_STAMINA * (n - done);
  });
  if (!done) {
    await ctx.say(`你手上東西太多，做好了也沒地方擺。（行囊滿了，先賣掉或用掉一些吧）`);
    return;
  }
  ctx.pass(done * (2 + d.tier));
  const got = made.map((m, q) => m && `${dishItem(d.id, q) === d.id ? d.name : `${d.name}（${QUALITY[q]}）`}×${m}`).filter(Boolean);
  await ctx.say(
    d.id === 'stew' ? '柴火劈啪作響，肉香慢慢飄滿了屋子……' : `你繫上圍裙，洗切、生火、下鍋……`,
    [
      got.length ? `做好了：${got.join('、')}。` : '',
      failed ? `有 ${failed} 份火候沒拿捏好，燒糊了。` : '',
      full ? '（行囊滿了，剩下的沒做）' : '',
    ]
      .filter(Boolean)
      .join('\n'),
    ...(ups.length ? [[...new Set(ups)].join('\n')] : []),
  );
}

// ── 學做菜：跟伙房師傅學 ──────────────────────────────────

/** 學各階的菜要花的門派貢獻 */
export const TIER_COST = [0, 4, 8, 15];

/**
 * 學做菜：列出還沒學的菜，烹飪等級夠了才教。
 * pay 付學費（門派貢獻），付不起回傳 false。
 */
export async function teachDishes(
  ctx: EventCtx,
  who: string,
  pay: (n: number) => Promise<boolean>,
  levelOf: () => number,
  /** 交情夠教到第幾階（0 入門 … 3 拿手）；不夠時的提示 */
  trust: { maxTier: number; hint: string } = { maxTier: 3, hint: '' },
) {
  const say = (...t: string[]) => ctx.say(...t.map((text) => ({ speaker: who, text })));
  const left = DISHES.filter((d) => !knowsDish(st().hero, d.id));
  if (!left.length) {
    await say('我會的菜都教給你了！剩下的就看你自己琢磨。');
    return;
  }
  const lv = levelOf();
  const can = left.filter((d) => lv >= tierLevel(d) && d.tier <= trust.maxTier);
  const locked = left.filter((d) => lv < tierLevel(d));
  const guarded = left.some((d) => lv >= tierLevel(d) && d.tier > trust.maxTier);
  const hint =
    (locked.length ? `\n（烹飪練到 ${Math.min(...locked.map(tierLevel))} 級，還能學更難的菜）` : '') + (guarded && trust.hint ? `\n（${trust.hint}）` : '');
  if (!can.length) {
    await say('先把會的菜做熟了再說。手藝不到家，教你也學不會。', hint.trim());
    return;
  }
  const labels = can.map((d) => `${d.name}（${d.kind}・${DISH_TIERS[d.tier]}${TIER_COST[d.tier] ? `，貢獻 ${TIER_COST[d.tier]}` : ''}）`);
  const i = await ctx.ask({ speaker: who, text: `想學哪一道？${hint}` }, [...labels, '算了']);
  if (i >= can.length) return;
  const d = can[i];
  if (!(await pay(TIER_COST[d.tier]))) return;
  ctx.pass(4);
  await ctx.say(
    { speaker: who, text: `看好了，「${d.name}」的要訣是……` },
    `${who}一邊做一邊講，你在旁邊照著做了一遍。\n（花了一個時辰）`,
    `學會了「${d.name}」！要用：${needsText(d, name)}。${d.spring ? '\n（要用鳴泉的泉水，只能在鳴泉廚房做）' : ''}`,
  );
  st().updateHero((c) => learnWork(c, 'cooking', d.id));
}

const tierLevel = (d: DishDef) => TIER_LEVEL[d.tier];
