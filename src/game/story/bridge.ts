import { addFame, gainSkill, giveItem, isEquipped, skillCap, skillDef, slotOf } from '../character';
import { withCost, type EventCtx, type Script } from '../events';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { setCrossingOpen } from '../world/geo';
import type { Flags } from '../../state/store';
import { useGame } from '../../state/store';
import { exert } from './estate';

/**
 * 支線「雲水渡口造橋」：南來北往的人過雲水河都得等船，季秋娘想在渡口蓋一座橋。
 * 1. 坐過兩次船以後，在雲水茶棚跟季秋娘聊「修橋的事」，答應幫忙張羅（bridge = 1）。
 * 2. 要湊齊三樣：銀兩 300（自己捐，或找柳村長、鍾嬸、陶四、石岳化緣）、青石條 10 塊
 *    （青竹村北的採石場鑿，一塊半個時辰、體力 25，順帶練外功）、石匠（石岳的師兄魯一鑿，住臨江城北）。
 * 3. 銀兩、石料都齊了，去找魯一鑿，他帶人動工（bridge = 2，記下動工那天）；三天後橋就蓋好了。
 * 4. 橋蓋好以後：渡口的河上換成木橋（地圖 patches），大地圖上雲水渡口不再擋路；
 *    渡口立了捐建碑，季秋娘請大家喝慶功茶（名聲 +30，之後茶棚吃東西打八折）。
 *
 * 旗標：
 *   bridge        0 還沒提、1 張羅中、2 動工了
 *   bridge_fund   湊到的銀兩
 *   bridge_stone  交了幾塊青石條
 *   bridge_day    動工那天
 *   bridge_d_<人>  已經跟誰化過緣（liu、zhong、tao、shi）
 *   bridge_party  慶功茶喝過了 = 1
 */

const st = () => useGame.getState();
export const FUND_GOAL = 300;
export const STONE_GOAL = 10;
export const BUILD_DAYS = 3;

const ji = by('季秋娘');
const lu = by('魯一鑿');

/** 橋蓋好了沒（旗標要帶 today） */
export const bridgeBuilt = (f: Flags & { today?: number }) => f.bridge === 2 && (f.today ?? 0) >= (f.bridge_day ?? 0) + BUILD_DAYS;
const builtNow = () => bridgeBuilt({ ...st().flags, today: st().world.day });

// 大地圖：橋蓋好以後，雲水渡口不再是非坐船不可的渡口
setCrossingOpen((id) => id === 'ferry' && builtNow());

const progressText = (f: Flags) =>
  `銀兩 ${Math.min(f.bridge_fund ?? 0, FUND_GOAL)}/${FUND_GOAL}　青石條 ${Math.min(f.bridge_stone ?? 0, STONE_GOAL)}/${STONE_GOAL}`;

// ── 季秋娘：提起、捐錢、交石料 ──────────────────────────

/** 茶棚裡多一個「修橋的事」選項（坐過兩次船，或已經在張羅了） */
export const bridgeOption = () => (st().flags.ferry_rides ?? 0) >= 2 || (st().flags.bridge ?? 0) > 0;

export async function bridgeTalk(ctx: EventCtx) {
  const f = st().flags;
  if (!f.bridge) {
    await ctx.say(
      ...ji('客官也是常過河的人吧？', '去年秋天，一條渡船在河心翻了，船上五個人，只撈回來三個。', '鄭小篙他爹……就是那回沒的。'),
      ...ji('大夥兒都說這裡該有座橋。縣太爺說了三年，一文錢也沒撥下來。', '我想，與其等官府，不如我們自己蓋。'),
    );
    if ((await ctx.ask(ji('客官……肯幫這個忙嗎？')[0], ['我來張羅', '再說吧'])) !== 0) {
      await ctx.say(...ji('也是，這事不小。客官哪天改了主意，再跟我說。'));
      return;
    }
    ctx.setFlag('bridge', 1);
    await ctx.say(
      ...ji('好！有你這句話，我心裡就踏實了。'),
      ...ji(
        `蓋橋要三樣東西：`,
        `一是銀兩，少說也要 ${FUND_GOAL} 兩。青竹村的柳村長、鍾嬸、陶四都是熱心人，你去說說，他們多少會出一點；剩下的……就得靠大家湊了。`,
        `二是石料。青竹村北邊有片採石場，那兒的青石最結實，要 ${STONE_GOAL} 塊青石條。`,
        '三是石匠。聽說青竹村打鐵的石岳有個師兄叫魯一鑿，在臨江城北住，修過好幾座橋。',
        '銀兩、石料湊齊了，送來我這兒；再去請魯師傅出馬。',
      ),
      '（接下支線「雲水渡口造橋」）',
    );
    return;
  }
  if (f.bridge === 2) {
    if (builtNow()) return bridgeParty(ctx);
    const left = (f.bridge_day ?? 0) + BUILD_DAYS - st().world.day;
    await ctx.say(...ji(`魯師傅帶著人在河邊忙著呢，叮叮噹噹敲了一整天。`, `他說再 ${left} 天就成了。`));
    return;
  }
  const c = await ctx.ask(ji(`修橋的事，現在湊到這樣：\n${progressText(f)}`)[0], ['捐銀兩', '交青石條', '還差什麼？', '算了']);
  if (c === 0) await donate(ctx);
  else if (c === 1) await deliverStone(ctx);
  else if (c === 2) await ctx.say(...ji(...missing()));
}

function missing(): string[] {
  const f = st().flags;
  const out: string[] = [];
  const fund = FUND_GOAL - (f.bridge_fund ?? 0);
  const stone = STONE_GOAL - (f.bridge_stone ?? 0);
  if (fund > 0) {
    const asked = (['liu', 'zhong', 'tao', 'shi'] as const).filter((k) => !f[`bridge_d_${k}`]).map((k) => DONORS[k].name);
    out.push(`銀兩還差 ${fund} 兩。${asked.length ? `${asked.join('、')}那兒還沒去說呢。` : ''}`);
  }
  if (stone > 0) out.push(`青石條還差 ${stone} 塊，青竹村北的採石場鑿得到。`);
  if (fund <= 0 && stone <= 0) out.push('東西都齊了！快去臨江城北請魯一鑿魯師傅吧。');
  return out;
}

async function donate(ctx: EventCtx) {
  const f = st().flags;
  const need = FUND_GOAL - (f.bridge_fund ?? 0);
  if (need <= 0) {
    await ctx.say(...ji('銀兩已經夠了，客官的心意我收到了。'));
    return;
  }
  const have = st().hero.silver;
  const options = [10, 50].filter((n) => n < need && n <= have);
  const labels = [...options.map((n) => `${n} 兩`), ...(have >= need ? [`補足剩下的 ${need} 兩`] : []), '算了'];
  const c = await ctx.ask(ji(`還差 ${need} 兩。客官要捐多少？（身上有 ${have} 兩）`)[0], labels);
  const n = c < options.length ? options[c] : c === options.length && have >= need ? need : 0;
  if (!n) return;
  st().updateHero((h) => (h.silver -= n));
  ctx.setFlag('bridge_fund', (f.bridge_fund ?? 0) + n);
  await ctx.say(...ji(`${n} 兩，我記在簿子上了。`, '等橋蓋好，要把每個人的名字都刻在碑上。'));
  if (FUND_GOAL - (st().flags.bridge_fund ?? 0) <= 0) await ctx.say(...ji('銀兩湊齊了！'));
}

async function deliverStone(ctx: EventCtx) {
  const have = st().hero.items.stone_slab ?? 0;
  const need = STONE_GOAL - (st().flags.bridge_stone ?? 0);
  if (need <= 0) {
    await ctx.say(...ji('石料已經夠了，堆在河邊呢。'));
    return;
  }
  if (!have) {
    await ctx.say(...ji('青石條？青竹村北的採石場鑿得到。一塊可沉了，扛的時候小心腰。'));
    return;
  }
  const n = Math.min(have, need);
  st().updateHero((h) => {
    h.items.stone_slab -= n;
    if (h.items.stone_slab <= 0) delete h.items.stone_slab;
  });
  ctx.setFlag('bridge_stone', (st().flags.bridge_stone ?? 0) + n);
  await ctx.say(`你把 ${n} 塊青石條卸在河邊的石堆上。`, ...ji(`${progressText(st().flags)}`));
}

/** 橋蓋好以後第一次跟季秋娘說話：慶功茶 */
async function bridgeParty(ctx: EventCtx) {
  if (ctx.flag('bridge_party')) {
    await ctx.say(...ji('橋蓋好以後，來喝茶的人反倒多了。', '大家走過橋，總要進來坐坐，說一說當年等船的苦。'));
    return;
  }
  ctx.setFlag('bridge_party');
  await ctx.say(
    ...ji('客官！橋蓋好了！你去看了嗎？'),
    '茶棚裡擠滿了人：挑夫蔣大川、船家范老舟、鄭小篙，還有兩岸的鄉親，人人手上一碗熱茶。',
    { speaker: '鄭小篙', text: '我爹要是知道……' },
    { speaker: '范老舟', text: '好啦好啦，大喜的日子。往後我們爺兒倆就撐船載人遊河，也是一門生意！' },
    ...ji('這碗慶功茶，敬你！往後你來茶棚吃東西，一律八折。'),
  );
  await ctx.hero((h) => addFame(h, 30));
}

// ── 化緣：柳村長、鍾嬸、陶四、石岳（掛在人物檔案的 story 前面） ──

const DONORS: Record<'liu' | 'zhong' | 'tao' | 'shi', { name: string; amount: number; lines: Line[] }> = {
  liu: {
    name: '柳村長',
    amount: 60,
    lines: by('柳承安')('修橋？好事，好事！', '老夫年輕時也在那渡口等過船，一等就是半天。', '這六十兩，是村裡公中的錢，算青竹村一份。'),
  },
  zhong: {
    name: '鍾嬸',
    amount: 20,
    lines: by('鍾嬸')('哎呀，修橋鋪路是積德的事！', '我這茶寮小本生意，二十兩，別嫌少。'),
  },
  tao: {
    name: '陶四',
    amount: 30,
    lines: by('陶四')('橋蓋好了，我挑貨去臨江城就不用等船了——這是生意，不是善事。', '三十兩。記得在碑上把我的名字刻大一點。'),
  },
  shi: {
    name: '石岳',
    amount: 20,
    lines: by('石岳')('魯一鑿？那是我師兄。脾氣臭，手藝是真好。', '你去找他，就說是我說的。這二十兩，給工人買酒。'),
  },
};

/** 張羅修橋時，第一次跟這些人說話就是化緣；處理了回傳 true */
export async function bridgeDonation(ctx: EventCtx, who: keyof typeof DONORS): Promise<boolean> {
  const key = `bridge_d_${who}`;
  if (ctx.flag('bridge') !== 1 || ctx.flag(key)) return false;
  const d = DONORS[who];
  if ((await ctx.ask(`要跟${d.name}說說修橋的事嗎？`, ['說說修橋的事', '先聊別的'])) !== 0) return false;
  ctx.setFlag(key);
  ctx.setFlag('bridge_fund', ctx.flag('bridge_fund') + d.amount);
  await ctx.say(...d.lines, `（${d.name}捐了 ${d.amount} 兩修橋。${progressText(st().flags)}）`);
  return true;
}

// ── 青竹村北的採石場 ────────────────────────────────────

const QUARRY_STAMINA = 25;
const QUARRY_KE = 4;

export const quarry: Script = withCost(
  () => (st().flags.bridge === 1 ? { ke: QUARRY_KE, stamina: QUARRY_STAMINA } : null),
  async (ctx) => {
    if (ctx.flag('bridge') !== 1) {
      await ctx.say('一片青灰色的石壁，上頭留著一道道鑿痕，旁邊散著幾把生鏽的鐵鑿。', '（以前有人在這裡採石）');
      return;
    }
    const carried = st().hero.items.stone_slab ?? 0;
    if ((ctx.flag('bridge_stone') ?? 0) + carried >= STONE_GOAL) {
      await ctx.say('手上的青石條加上交了的，已經夠蓋橋了。');
      return;
    }
    if ((await ctx.ask(`鑿一塊青石條？（半個時辰、體力 ${QUARRY_STAMINA}）`, ['掄起鐵鑿', '算了'])) !== 0) return;
    if (!(await exert(ctx, QUARRY_STAMINA, '手臂抖得連鑿子都握不住了。'))) return;
    ctx.pass(QUARRY_KE);
    await ctx.say('你照著石壁上的紋路下鑿，一錘一錘，石屑亂飛。', '好不容易撬下一整塊青石條，扛起來沉得腰都直不起來。');
    await ctx.hero((h) => {
      // 掄錘、扛石頭練的是手上的勁：順帶練一門裝備中、還沒到上限的外功
      const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === 'outer' && k.level < skillCap(k));
      return [giveItem(h, 'stone_slab'), s ? `「${skillDef(s).name}」經驗 +10。` : null, s ? gainSkill(h, s.id, 10, false) : null];
    });
  },
);

// ── 魯一鑿：石匠 ────────────────────────────────────────

export const masonTalk: Script = async (ctx) => {
  const f = st().flags;
  if (!f.bridge) {
    await ctx.say(...lu('看什麼？沒見過人鑿石頭？', '……石頭不會騙人。你下錯一鑿，它就裂給你看。'));
    return;
  }
  if (f.bridge === 2) {
    await ctx.say(...lu(builtNow() ? '那座橋，再撐一百年沒問題。' : '別在這兒礙事。過兩天再來看。'));
    return;
  }
  const fund = (f.bridge_fund ?? 0) >= FUND_GOAL;
  const stone = (f.bridge_stone ?? 0) >= STONE_GOAL;
  if (!fund || !stone) {
    await ctx.say(
      ...lu('雲水渡口要蓋橋？……石岳那小子跟你提的吧。', '蓋橋不是兒戲。錢不夠、石料不夠，我一錘都不會下。'),
      `（${progressText(f)}）`,
    );
    return;
  }
  await ctx.say(
    ...lu('錢夠了，石料也夠了？', '……行。我帶三個徒弟過去，三天。', '三天以後，你自己走過去看。'),
    '（魯一鑿動工了。三天後橋就蓋好）',
  );
  ctx.setFlag('bridge', 2);
  ctx.setFlag('bridge_day', st().world.day);
};

// ── 渡口：捐建碑 ────────────────────────────────────────

export const bridgeStele: Script = async (ctx) => {
  const donors = (['liu', 'zhong', 'tao', 'shi'] as const).filter((k) => ctx.flag(`bridge_d_${k}`)).map((k) => DONORS[k].name.replace('柳村長', '柳承安').replace('鍾嬸', '鍾氏'));
  await ctx.say(
    '一塊新立的青石碑，字刻得端端正正：',
    `「雲水橋」\n鄉人苦渡久矣。今眾人出錢出力，石匠魯一鑿督造，三日而成。\n捐建者：${[st().hero.name, ...donors, '季秋娘', '兩岸鄉親'].join('、')}`,
  );
};

// ── 任務日誌 ────────────────────────────────────────────

export const bridgeQuest = {
  id: 'bridge',
  title: '雲水渡口造橋',
  status(f: Flags): { text: string; done: boolean } | null {
    if (!f.bridge) return null;
    const today = useGame.getState().world.day;
    if (bridgeBuilt({ ...f, today })) return { text: '雲水渡口的橋蓋好了。南來北往的人，再也不用等船了。', done: true };
    if (f.bridge === 2) return { text: `魯一鑿帶著徒弟在渡口動工了，${BUILD_DAYS} 天後完工。`, done: false };
    return {
      text: `幫季秋娘張羅蓋橋：${progressText(f)}。銀兩可以自己捐，也可以找柳村長、鍾嬸、陶四、石岳化緣；青石條在青竹村北的採石場鑿；都齊了再去臨江城北請石匠魯一鑿。`,
      done: false,
    };
  },
};
