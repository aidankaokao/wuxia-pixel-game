import type { Script } from '../events';
import { ACTS, LIFE_BLOCK, lifeNow, type LifeGroup } from '../life';
import { useGame } from '../../state/store';
import { personScript } from './social';

/**
 * 跟自己過日子的人說話（MapScene 找 life NPC 說話時用）：
 * 1. 主持活動的人（比武小會、講武）先交給門派自己的鉤子。
 * 2. 正在練功、打坐的人：先停下來（同一時段只說一次），可以一起練／一起打坐／對練一場，或照常說話。
 * 3. 正在聊天的：可以湊過去聽他們聊什麼（八卦）。
 * 4. 其他時候照常說話：有人物檔案的走人際系統，有腳本的跑腳本，不然照正在做的事說話（talks）。
 * told 記這個時段已經說過「停了下來」，避免一直重複。
 */

const st = () => useGame.getState();

export function lifeTalk(group: LifeGroup, id: string, state: { talkIndex: number; told?: number }): Script {
  return async (ctx) => {
    const def = group.npcs.find((x) => x.id === id)!;
    const a = lifeNow(group, st().world, st().flags)[id];
    const h = group.hooks ?? {};
    if (h.talk && (await h.talk(ctx, id, a))) return;
    const act = a?.act ?? 'stroll';
    const block = Math.floor(st().world.time / LIFE_BLOCK);
    const intro = ACTS[act].busy && state.told !== block ? `（${def.name}正在${ACTS[act].name}，見你過來，停了下來。）` : null;
    state.told = block;

    const plain = async () => {
      if (def.person) return personScript(def.person, 'talk')!(ctx);
      if (def.script) return def.script(ctx);
      const pool = def.talks?.[act] ?? def.talks?.default ?? [];
      if (!pool.length) return;
      await ctx.say(...pool[state.talkIndex++ % pool.length]);
    };
    const can = h.member?.() ?? true;
    const opts: [string, () => Promise<void>][] = [];
    if ((act === 'stake' || act === 'sword') && can && h.practiceWith) opts.push(['一起練', () => h.practiceWith!(ctx, id)]);
    if (act === 'sword' && can && h.sparWith) opts.push(['對練一場', () => h.sparWith!(ctx, id)]);
    if (act === 'meditate' && can && h.sitWith) opts.push(['一起打坐', () => h.sitWith!(ctx, id)]);
    if (act === 'chat' && a?.with && h.listen) opts.push(['湊過去聽他們聊什麼', () => h.listen!(ctx, id, a.with!)]);
    opts.push(...(h.extra?.(ctx, id, a) ?? []));
    if (!opts.length) {
      if (intro) await ctx.say(intro);
      return plain();
    }
    const c = await ctx.ask(intro ?? `（${def.name}正在${ACTS[act].name}。）`, [...opts.map((o) => o[0]), '說話', '不打擾了']);
    if (c < opts.length) await opts[c][1]();
    else if (c === opts.length) await plain();
  };
}
