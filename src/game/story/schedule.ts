import { derive } from '../character';
import type { EventCtx } from '../events';
import { usedToday } from '../home';
import { activityDef, interruptOf, registerActivity, rollDayEvent, scheduleOf, staminaOf, type ActivityTag } from '../schedule';
import { festivalOf, shichenStart, SHICHEN, SHICHEN_INDEX, timeText } from '../time';
import { useGame } from '../../state/store';
import { sleep, type Wake } from './estate';

/**
 * 照日課表過一天（在自己的床鋪選「照日課表過今天」）：一件件快轉、播小動畫，
 * 遇到節慶、有人找、體力不夠、天太晚就停；途中偶爾發生一件小事（schedule.ts 的 DayEvent）。
 * 表上最後是「睡覺」就睡到天亮。
 */

const st = () => useGame.getState();
/** 偶發小事：做事時一天最多一件、聊天時一天最多一件（記在 daily） */
const EVENT_KEY = { work: 'event:work', chat: 'event:chat' };

/** 做完一件事（或聊完天）後，偶爾發生一件小事；發生了回傳 true。who 是聊天的對象 */
export async function maybeDayEvent(ctx: EventCtx, tag: ActivityTag, who?: string): Promise<boolean> {
  const key = EVENT_KEY[tag === 'chat' ? 'chat' : 'work'];
  if (usedToday(st().world, key)) return false;
  const e = rollDayEvent(tag, st(), who);
  if (!e) return false;
  st().updateWorld((w) => (w.daily[key] = { day: w.day, n: 1 }));
  await e.run(ctx, who);
  return true;
}
/** 總結每頁幾件事 */
const PAGE = 3;

/** 午休：誰都能排（小睡一個時辰） */
registerActivity({
  id: 'nap',
  name: '午休',
  desc: '小睡一個時辰，恢復一些氣血、內力與體力。',
  tag: 'rest',
  ke: SHICHEN,
  stamina: 0,
  work: 'sleep',
  available: () => true,
  check: () => null,
  run: async () =>
    st().updateHero((h) => {
      const d = derive(h);
      h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.25));
      h.qi = Math.min(d.maxQi, h.qi + Math.round(d.maxQi * 0.25));
      h.stamina = Math.min(d.maxStamina, h.stamina + Math.round(d.maxStamina * 0.34));
      return ['睡了個好覺，精神好多了。'];
    }),
});

/** 睡覺：放在表的最後，做完今天的事就回床睡到天亮 */
registerActivity({
  id: 'sleep',
  name: '睡覺',
  desc: '做完今天的事，回床睡到天亮。（一定排在最後）',
  tag: 'rest',
  ke: 0,
  stamina: 0,
  work: 'sleep',
  available: () => true,
  check: () => null,
  run: async () => [],
  last: true,
});

export async function editSchedule(ctx: EventCtx) {
  await ctx.panel({ kind: 'schedule' });
}

/** 照表過今天；bed 是床的等級，wake 是睡醒時的情景 */
export async function runSchedule(ctx: EventCtx, bed: number, wake?: Wake) {
  const fest = festivalOf(st().world.day);
  if (fest) {
    await ctx.say(`今天是${fest}。照著日課表悶頭練功太可惜了，四處走走吧。\n（節慶這天不照表）`);
    return;
  }
  // 已經有人在找你：先提醒，還是可以照表做（途中只有新的事才會叫停）
  const busy = interruptOf(st());
  if (busy && (await ctx.ask(busy, ['先去辦事', '還是照表過今天'])) === 0) return;
  const list = scheduleOf(st());
  if (!list.some((id) => !activityDef(id)!.last)) {
    await ctx.say('日課表上還沒排事情。\n（先選「排日課表」）');
    return;
  }

  const day = st().world.day;
  const log: string[] = [];
  let stop = '';
  let sleepAtEnd = false;
  for (const id of list) {
    const a = activityDef(id)!;
    if (a.last) {
      sleepAtEnd = true;
      break;
    }
    if (stop) continue;
    const w = st().world;
    if (w.day !== day || w.time >= shichenStart(SHICHEN_INDEX.亥)) {
      stop = '天色已晚，剩下的明天再說。';
      continue;
    }
    const who = interruptOf(st());
    if (who && who !== busy) {
      // 有人找：不睡了，去辦事
      log.push(who);
      await summary(ctx, log);
      return;
    }
    const why = a.check(st());
    if (why) {
      log.push(`${a.name}：${why}`);
      continue;
    }
    const cost = staminaOf(a, st());
    if (st().hero.stamina < cost) {
      stop = `做到「${a.name}」時已經累得不行，只好停下。`;
      continue;
    }
    st().updateHero((h) => (h.stamina -= cost));
    const at = timeText(w.time);
    await ctx.work(typeof a.work === 'function' ? a.work(st()) : a.work, `${a.name}……`, 700);
    ctx.pass(a.ke);
    const lines = (await a.run(ctx)).filter((l): l is string => !!l);
    log.push(`【${at}】${a.name}${lines.length ? `\n${lines.join('\n')}` : ''}`);
    await maybeDayEvent(ctx, a.tag);
  }
  if (stop) log.push(stop);
  await summary(ctx, log);
  if (!sleepAtEnd || st().world.day !== day) return;
  // 天還亮著就問一聲，免得大白天就睡到隔天
  if (st().world.time < shichenStart(SHICHEN_INDEX.酉)) {
    const c = await ctx.ask(`今天的事做完了，現在才${timeText(st().world.time)}，天還亮著。`, ['回床睡到天亮', '先不睡，四處走走']);
    if (c !== 0) return;
  }
  await ctx.say('你回到床鋪躺下。');
  await sleep(ctx, bed, wake);
}

/** 今天做了什麼：幾件一頁 */
async function summary(ctx: EventCtx, log: string[]) {
  if (!log.length) return;
  const pages: string[] = [];
  for (let i = 0; i < log.length; i += PAGE) pages.push(log.slice(i, i + PAGE).join('\n'));
  await ctx.say('——今天的日課——', ...pages);
}
