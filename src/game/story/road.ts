import { addFame, Character, derive, gainSkill, giveItem, isEquipped, skillCap, skillDef, slotOf } from '../character';
import { gainCraft } from '../crafts';
import type { EventCtx } from '../events';
import { usedToday } from '../home';
import type { Line } from '../maps/types';
import type { WorldEdge, WorldNode } from '../world/geo';
import { periodOf, Period, Season, seasonOf, Weather } from '../time';
import type { Flags } from '../../state/store';
import type { World } from '../home';
import { useGame } from '../../state/store';
import { studyable, studyInsight } from './estate';

/**
 * 大地圖路上的小事：走到半路（沒遇上劫匪野獸的時候）偶爾碰上一件。
 * - 機率看路的長短：短路少、長路多（`roadChance`）；一天最多兩件，同一件事各有冷卻天數。
 * - 新的小事用 `registerRoadEvent` 註冊：`when` 看這條路、時辰、天氣、旗標合不合適，`run` 是劇情。
 * - 目前有：行商擺攤、崴了腳的老人、路邊的包袱、旅人說傳聞、晨昏雨霧的景致、路邊的草藥野菌、
 *   北嶺官道的盤查、遊俠甘十一（各條路上碰到，切磋三次後送東西）、夜路的螢火。
 *
 * 旗標：
 *   road_gan   跟遊俠甘十一切磋贏了幾次（3 次後他送你東西，之後 = 9）
 */

const st = () => useGame.getState();

export interface RoadView {
  hero: Character;
  flags: Flags;
  world: World;
  edge: WorldEdge;
  from: WorldNode;
  to: WorldNode;
  period: Period;
  weather: Weather;
  season: Season;
}

export interface RoadEvent {
  id: string;
  weight: number;
  /** 同一件事幾天內不再碰到 */
  cooldown: number;
  when?: (v: RoadView) => boolean;
  run: (ctx: EventCtx, v: RoadView) => Promise<void>;
}

const EVENTS: RoadEvent[] = [];
export const registerRoadEvent = (e: RoadEvent) => EVENTS.push(e);

const DAY_KEY = 'road';
const MAX_PER_DAY = 2;
/** 這段路上碰到小事的機率：八里的短路一成多，一百五十里的長路五成 */
export const roadChance = (li: number) => Math.min(0.5, 0.1 + li / 300);

/** 走到半路時呼叫：擲骰挑一件小事（沒有就回傳 null） */
export function rollRoadEvent(edge: WorldEdge, from: WorldNode, to: WorldNode, rand = Math.random): { event: RoadEvent; view: RoadView } | null {
  const s = st();
  if (usedToday(s.world, DAY_KEY) >= MAX_PER_DAY) return null;
  if (rand() >= roadChance(edge.li)) return null;
  const view: RoadView = { hero: s.hero, flags: s.flags, world: s.world, edge, from, to, period: periodOf(s.world.time), weather: s.world.weather, season: seasonOf(s.world.day) };
  const pool = EVENTS.filter((e) => {
    const last = s.world.daily[`road:${e.id}`]?.day;
    return (last === undefined || s.world.day - last >= e.cooldown) && (e.when?.(view) ?? true);
  });
  let r = rand() * pool.reduce((a, e) => a + e.weight, 0);
  const event = pool.find((e) => (r -= e.weight) < 0);
  return event ? { event, view } : null;
}

/** 碰上了：記下今天第幾件、這件事哪天碰的 */
export function markRoadEvent(id: string) {
  st().updateWorld((w) => {
    w.daily[DAY_KEY] = { day: w.day, n: usedToday(w, DAY_KEY) + 1 };
    w.daily[`road:${id}`] = { day: w.day, n: 1 };
  });
}

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];
const says = (speaker: string) => (...texts: string[]): Line[] => texts.map((text) => ({ speaker, text }));
const near = (v: RoadView, id: string) => v.from.id === id || v.to.id === id;

// ── 行商擺攤 ────────────────────────────────────────────

const PEDDLERS = ['齊有福', '孫二貴', '馮春生', '邵大旺'];
const PEDDLER_GOODS = ['jinchuang', 'yangqi_wan', 'tea', 'cotton_thread', 'egg', 'sugar', 'mushroom', 'rod', 'g_bamboo_hat', 'g_sachet'];

registerRoadEvent({
  id: 'peddler',
  weight: 4,
  cooldown: 1,
  when: (v) => v.period !== 'night',
  run: async (ctx) => {
    const name = pick(PEDDLERS);
    const p = says(name);
    // 每次挑六樣擺出來
    const stock = [...PEDDLER_GOODS].sort(() => Math.random() - 0.5).slice(0, 6);
    const c = await ctx.ask(p('客官留步！走這麼遠的路，缺什麼沒有？藥、茶、針頭線腦，擔子裡都有！')[0], ['看看貨', '不用了，趕路']);
    if (c === 0) await ctx.panel({ kind: 'shop', title: `${name}的貨擔`, stock });
    else await ctx.say(...p('好走好走，下回再碰上，算你便宜！'));
  },
});

// ── 崴了腳的老人 ────────────────────────────────────────

registerRoadEvent({
  id: 'sprained',
  weight: 3,
  cooldown: 4,
  when: (v) => v.period !== 'night',
  run: async (ctx) => {
    const name = pick(['杜婆婆', '韓老丈', '葉阿公']);
    const p = says(name);
    await ctx.say(`路邊石頭上坐著一位老人家，揉著腳踝直皺眉。`, ...p('哎喲……下坡的時候踩空了，這腳一沾地就疼。'));
    const hasMed = (st().hero.items.jinchuang ?? 0) > 0;
    const c = await ctx.ask('要幫忙嗎？', ['扶老人家走一段（兩刻）', ...(hasMed ? ['給一帖金創藥'] : []), '說聲保重，繼續趕路']);
    if (c === 0) {
      ctx.pass(2);
      await ctx.say('你讓老人家搭著肩，慢慢走了一段，送到前頭的岔路口，那裡有人家。', ...p('好孩子，好孩子……這幾個銅板你拿著買碗茶喝。'));
      await ctx.hero((h) => {
        h.silver += 2;
        return ['銀兩 +2。', addFame(h, 3)];
      });
    } else if (c === 1 && hasMed) {
      await ctx.say('你取出金創藥替老人家敷上，又用布條纏緊。', ...p('涼涼的，不怎麼疼了……真是遇上好人了。'));
      await ctx.hero((h) => {
        h.items.jinchuang -= 1;
        if (!h.items.jinchuang) delete h.items.jinchuang;
        return addFame(h, 5);
      });
    } else await ctx.say(...p('去吧去吧，我歇一會兒就好。'));
  },
});

// ── 路邊的包袱 ──────────────────────────────────────────

registerRoadEvent({
  id: 'bundle',
  weight: 2,
  cooldown: 6,
  run: async (ctx) => {
    await ctx.say('路邊的草叢裡丟著一個藍布包袱，打了個死結。四下沒有人。');
    const c = await ctx.ask('……', ['打開看看', '不關我的事，走開']);
    if (c !== 0) return;
    const silver = 5 + Math.floor(Math.random() * 8);
    await ctx.say(`包袱裡是幾件換洗衣服、一封家書，還有一小包碎銀，約莫 ${silver} 兩。`, '家書的信封上寫著：「臨江城北，杜家三嫂親啟」。');
    const k = await ctx.ask('……', ['把碎銀收下', '原樣包好，帶去給杜三嫂']);
    if (k === 0) {
      await ctx.hero((h) => {
        h.silver += silver;
        h.fame = Math.max(0, h.fame - 2);
        return [`銀兩 +${silver}。`, '（心裡有點不踏實。名聲 -2）'];
      });
    } else {
      ctx.setFlag('road_bundle', (ctx.flag('road_bundle') || 0) + 1);
      await ctx.say('你把包袱重新紮好，揹在身上。到了臨江城北，順路打聽著把它送到杜家。', { speaker: '杜三嫂', text: '是我家那口子寄的！他在外頭跑船……這、這怎麼謝你才好！' });
      await ctx.hero((h) => [addFame(h, 6), giveItem(h, 'yangqi_wan', 2)]);
    }
  },
});

// ── 旅人說傳聞 ──────────────────────────────────────────

const RUMORS: { who: string; title: string; lines: string[]; when?: (v: RoadView) => boolean }[] = [
  { who: '丁老三', title: '挑夫', lines: ['臨江城碼頭上，漕幫跟金刀鏢局又槓上了。', '聽說三年前鏢局丟了一趟鏢，到現在都說是漕幫幹的。'] },
  { who: '駱青', title: '販茶的', lines: ['東海上那夥掛黑帆的海盜，連官船都敢劫。', '大埠頭的船行都不肯出海了，海商們急得跳腳。'] },
  { who: '游先生', title: '說書的', lines: ['蒼嵐山上夜裡有人吹笛子，調子悽悽慘慘的。', '有人說是斷崖寨的冤魂……我看是哪個傷心人。'] },
  { who: '柯文', title: '趕考的書生', lines: ['北嶺關口最近查得嚴，說是在抓什麼要犯。', '我的路引看了三遍才放行，嚇得我腿都軟了。'] },
  { who: '彭雄', title: '走鏢的', lines: ['南嶺古道那頭的江南渡，渡船停了好一陣子。', '船家說江心有東西，晚上會撞船——誰知道是真是假。'] },
  { who: '岑姑', title: '採藥的', lines: ['雲嶺上的雲霧茶，採下來要在當天炒好，晚一刻就不香了。', '山上有隻白猿，會偷採茶人的乾糧。'] },
  { who: '汪七', title: '漁夫', lines: ['碧漪湖東頭有人下密網，連魚苗都撈。', '秦老爺子氣得幾天沒吃飯。'], when: (v) => near(v, 'biyi') || near(v, 'qingzhu') },
];

registerRoadEvent({
  id: 'rumor',
  weight: 4,
  cooldown: 0,
  run: async (ctx, v) => {
    const pool = RUMORS.filter((r) => r.when?.(v) ?? true);
    const r = pick(pool);
    await ctx.say(`路上跟一個旅人並肩走了一段，是${r.title}${r.who}。`, ...says(r.who)(...r.lines));
  },
});

// ── 晨昏雨霧的景致 ──────────────────────────────────────

registerRoadEvent({
  id: 'sunrise',
  weight: 3,
  cooldown: 3,
  when: (v) => v.period === 'dawn' && (v.weather === 'clear' || v.weather === 'cloudy'),
  run: async (ctx) => {
    await ctx.say('東邊的天一點一點亮起來，太陽從山脊後頭跳出來，整條路都鍍上了金。', '你停下腳步，深深吸了一口氣——胸中一股清氣，緩緩沉到丹田。');
    const ready = studyable(st().hero);
    if (ready.length) await ctx.hero((h) => studyInsight(h, ready[0].id, 12));
    else {
      st().updateHero((h) => (h.points += 1));
      await ctx.say('（若有所悟，武學點數 +1）');
    }
  },
});

registerRoadEvent({
  id: 'sunset',
  weight: 3,
  cooldown: 3,
  when: (v) => v.period === 'dusk' && v.weather === 'clear',
  run: async (ctx) => {
    await ctx.say('晚霞燒紅了半邊天，歸鳥一群群往林子裡飛。', '你在路邊的石頭上坐了一會兒，腿上的痠也散了些。');
    await ctx.hero((h) => {
      h.stamina = Math.min(derive(h).maxStamina, h.stamina + 10);
      return '（體力 +10）';
    });
  },
});

registerRoadEvent({
  id: 'rain_temple',
  weight: 4,
  cooldown: 2,
  when: (v) => v.weather === 'rain',
  run: async (ctx) => {
    ctx.pass(2);
    await ctx.say('雨越下越大，你躲進路旁一座破山神廟。', '廟裡已經有個書生在烤火，見你進來，往旁邊挪了挪。');
    const p = says('書生何默');
    await ctx.say(...p('這雨一時半刻停不了。兄台不嫌棄，我念段書給你聽，打發打發時間？'), '（雨停前，書生念了半部《孫子兵法》給你聽。過了兩刻）');
    await ctx.hero((h) => {
      return ['（學識經驗 +6）', gainCraft(h, 'learning', 6)];
    });
  },
});

registerRoadEvent({
  id: 'fog_lost',
  weight: 3,
  cooldown: 2,
  when: (v) => v.weather === 'fog',
  run: async (ctx) => {
    ctx.pass(3);
    await ctx.say('霧大得看不見三步外的路，你走著走著，竟然繞回了剛才那棵歪脖子樹。', '（在霧裡多走了三刻冤枉路）');
  },
});

// ── 路邊的草藥、野菌 ────────────────────────────────────

registerRoadEvent({
  id: 'forage',
  weight: 3,
  cooldown: 1,
  when: (v) => v.period !== 'night',
  run: async (ctx, v) => {
    if (v.weather === 'rain' || v.weather === 'cloudy') {
      await ctx.say('雨後的樹根旁冒出一叢叢野菌，你順手採了一些。');
      await ctx.hero((h) => giveItem(h, 'mushroom', 1 + Math.floor(Math.random() * 2)));
    } else {
      await ctx.say('路邊的溝渠旁長著一片止血草，葉子肥厚。你採了幾株。');
      await ctx.hero((h) => giveItem(h, 'herb', 2));
    }
  },
});

// ── 北嶺官道的盤查 ──────────────────────────────────────

registerRoadEvent({
  id: 'checkpoint',
  weight: 6,
  cooldown: 2,
  when: (v) => near(v, 'beiling') && v.period !== 'night',
  run: async (ctx) => {
    const p = says('官差鄔勝');
    await ctx.say('官道上橫著一道木柵，兩個官差攔住過往的行人，一個個對著告示上的畫像看。');
    if (st().hero.fame >= 40) {
      await ctx.say(...p('咦，你不就是……失敬失敬，請過請過。'), '（名聲在外，官差揮揮手放你過去了）');
      return;
    }
    const c = await ctx.ask(p('站住！哪裡來的？往哪裡去？……身上帶了什麼？')[0], ['老老實實讓他搜', '塞一兩銀子當茶水錢']);
    if (c === 1 && st().hero.silver >= 1) {
      st().updateHero((h) => (h.silver -= 1));
      await ctx.say(...p('嗯，懂規矩。走吧走吧。'));
    } else {
      ctx.pass(1);
      await ctx.say('官差把你的行囊翻了個底朝天，又對著畫像看了半天。', ...p('……不是。走吧。'), '（告示上畫的是個瘦長臉、左眉有疤的漢子，底下寫著「欽犯」兩個大字）');
    }
  },
});

// ── 遊俠甘十一：各條路上碰到，要跟你過兩招 ──────────────

registerRoadEvent({
  id: 'wanderer',
  weight: 2,
  cooldown: 5,
  when: (v) => (v.flags.road_gan ?? 0) < 9 && v.period !== 'night',
  run: async (ctx) => {
    const p = says('甘十一');
    const wins = ctx.flag('road_gan');
    await ctx.say(
      wins ? '前頭的大樹下，又是那個揹著破劍的遊俠，正嚼著草根等人。' : '前頭的大樹下坐著一個揹著破劍的遊俠，嘴裡嚼著草根。',
      ...p(wins ? '又見面了！上回不算，再來！' : '這位朋友，走路的架勢不錯。', wins ? '' : '在下甘十一，四海為家。過兩招？點到為止。').filter((l) => l.text),
    );
    if ((await ctx.ask('……', ['過兩招', '改天吧'])) !== 0) {
      await ctx.say(...p('哈，那就改天！江湖這麼小，總會再碰上的。'));
      return;
    }
    const o = await ctx.battle('spar_wanderer');
    if (o !== 'win') {
      await ctx.say(...p(o === 'flee' ? '跑得倒快！' : '承讓承讓。你的底子不壞，就是火候差些。'));
      return;
    }
    const n = wins + 1;
    ctx.setFlag('road_gan', n);
    if (n < 3) {
      await ctx.say(...p('好！痛快！', `這是第 ${n} 回了。贏我三回，我送你樣好東西。`));
      return;
    }
    ctx.setFlag('road_gan', 9);
    await ctx.say(
      ...p('三回了……服了，服了。', '這塊護腕跟了我十年，擋過的刀比你吃過的飯還多。拿去吧。', '後會有期！'),
      '甘十一把劍往背上一甩，頭也不回地走了。',
    );
    await ctx.hero((h) => [giveItem(h, 'g_iron_bracer'), addFame(h, 5)]);
  },
});

// ── 四季的路上 ──────────────────────────────────────────

registerRoadEvent({
  id: 'blossoms',
  weight: 3,
  cooldown: 4,
  when: (v) => v.season === 'spring' && v.period !== 'night' && v.weather !== 'rain',
  run: async (ctx) => {
    await ctx.say('路旁一片桃林開得正盛，風一吹，花瓣落了你一肩。', '你伸手接住一片，忽然想起一句「桃花流水鱖魚肥」——這時節，湖裡的鱖魚該肥了。');
    await ctx.hero((h) => {
      h.stamina = Math.min(derive(h).maxStamina, h.stamina + 8);
      return '（心情大好，體力 +8）';
    });
  },
});

registerRoadEvent({
  id: 'shade',
  weight: 3,
  cooldown: 3,
  when: (v) => v.season === 'summer' && v.period === 'day' && v.weather === 'clear',
  run: async (ctx) => {
    ctx.pass(1);
    await ctx.say('日頭毒得像火，你在路邊一棵大樟樹下歇了歇腳。', '樹上的蟬叫得震天響。賣涼茶的老漢舀了一碗給你，只收一個銅板。');
    await ctx.hero((h) => {
      h.stamina = Math.min(derive(h).maxStamina, h.stamina + 15);
      return '（喝了碗涼茶，歇了一刻。體力 +15）';
    });
  },
});

registerRoadEvent({
  id: 'geese',
  weight: 3,
  cooldown: 4,
  when: (v) => v.season === 'autumn' && v.period !== 'night',
  run: async (ctx) => {
    await ctx.say('一行大雁排成人字，從頭頂往南飛去，叫聲一聲接一聲。', '你看著牠們的隊形，一隻領頭、兩翼相應，忽然覺得跟劍陣有幾分相似。');
    const ready = studyable(st().hero);
    if (ready.length) await ctx.hero((h) => studyInsight(h, ready[0].id, 8));
    else await ctx.say('（心裡隱約有點什麼，一時又說不上來）');
  },
});

registerRoadEvent({
  id: 'persimmon',
  weight: 2,
  cooldown: 5,
  when: (v) => v.season === 'autumn' && v.period !== 'night',
  run: async (ctx) => {
    const p = says('佃農包大嫂');
    await ctx.say('路邊的農家院子裡，柿子樹掛滿了紅燈籠似的果子。', ...p('過路的，拿兩個去吃！今年結得多，吃不完要爛啦。'));
    await ctx.hero((h) => {
      h.hp = Math.min(derive(h).maxHp, h.hp + 30);
      return '（甜得黏牙。氣血 +30）';
    });
  },
});

registerRoadEvent({
  id: 'snow_road',
  weight: 4,
  cooldown: 2,
  when: (v) => v.season === 'winter' && (v.weather === 'snow' || !!v.edge.slow),
  run: async (ctx, v) => {
    ctx.pass(1);
    await ctx.say(
      v.weather === 'snow' ? '雪越下越大，路上的腳印一下就被蓋住了。' : '山路上的積雪還沒化，一腳深一腳淺。',
      '你提一口氣，踩著前人的腳印往前走，竟也走出了幾分輕功的味道。',
    );
    await ctx.hero((h) => {
      const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === 'light' && k.level < skillCap(k));
      return s ? [`「${skillDef(s).name}」經驗 +12。`, gainSkill(h, s.id, 12, false)] : '（踩雪走路，腿上的勁長了些）';
    });
  },
});

registerRoadEvent({
  id: 'plum',
  weight: 2,
  cooldown: 5,
  when: (v) => v.season === 'winter' && v.period !== 'night',
  run: async (ctx) => {
    await ctx.say('雪地裡一株老梅開了，紅得耀眼，香氣冷冷的。', '你在梅樹下站了一會兒，胸中一股清氣慢慢沉了下去。');
    await ctx.hero((h) => {
      h.qi = Math.min(derive(h).maxQi, h.qi + 20);
      return '（內力 +20）';
    });
  },
});

// ── 夜路 ────────────────────────────────────────────────

registerRoadEvent({
  id: 'fireflies',
  weight: 3,
  cooldown: 3,
  // 螢火蟲只在夏天
  when: (v) => v.period === 'night' && v.weather !== 'rain' && v.season === 'summer',
  run: async (ctx) => {
    await ctx.say('夜路上，草叢裡亮起一點一點的螢火，忽明忽滅，跟著你走了好長一段。', '頭頂的星星密得像撒了一把鹽。你忽然覺得，夜路也沒那麼難走。');
    await ctx.hero((h) => {
      h.qi = Math.min(derive(h).maxQi, h.qi + 10);
      return '（內力 +10）';
    });
  },
});
