import { addFame, gainSkill, isEquipped, skillCap, skillDef, slotOf } from '../character';
import { registerDailyTasks } from '../daily';
import { registerNotices, type Notice } from '../notices';
import { noticeBoard } from './yamen';
import type { EventCtx, Script } from '../events';
import { usedToday } from '../home';
import { by } from '../maps/rooms';
import { keText } from '../thought';
import { useGame } from '../../state/store';
import { exert } from './estate';
import { riverBoat } from './dabutou';

/**
 * 臨江城的江湖差事（第二批）：
 * - 金刀鏢局（總鏢頭金萬山）：護鏢。每天兩趟可挑，一天接一趟；路上可能遇劫，打跑劫匪才拿得到酬勞。遠程的要有點名聲。
 * - 臨江縣衙（捕頭霍青山）：懸賞。揭榜後到指定地點收拾目標，回來領賞；同一張懸賞過幾天才會再貼。
 *   斷崖寨寨主祁三刀的懸賞也貼著，但揭不下來（留給之後的主線）。
 * - 漕幫分舵（舵主彭大江）：扛貨換工錢（順便練外功）、擲骰子比大小、搭船走大江水路往大埠頭。
 *
 * 旗標：
 *   lj_b_<懸賞id>      1 揭了榜 / 2 目標收拾掉了，回縣衙領賞
 *   lj_b_<懸賞id>_day  上次領賞是第幾天（隔 BOUNTY_GAP 天才會再貼）
 */

const st = () => useGame.getState();
const day = () => st().world.day;

// ── 金刀鏢局：護鏢 ──────────────────────────────────────

const jin = by('金萬山');

interface Route {
  id: string;
  to: string;
  cargo: string;
  /** 來回花幾刻 */
  ke: number;
  /** 遇劫的機率 */
  risk: number;
  encounter: string;
  pay: number;
  /** 要多少名聲才肯交給你 */
  fameReq: number;
  fame: number;
}

const ROUTES: Route[] = [
  { id: 'mingquan', to: '鳴泉山腳', cargo: '幾箱藥材', ke: 12, risk: 0.3, encounter: 'escort_near', pay: 20, fameReq: 0, fame: 1 },
  { id: 'qingzhu', to: '青竹村', cargo: '一車布疋', ke: 16, risk: 0.35, encounter: 'escort_near', pay: 25, fameReq: 0, fame: 1 },
  { id: 'post', to: '雲水官道驛站', cargo: '一箱官銀', ke: 24, risk: 0.6, encounter: 'escort_far', pay: 55, fameReq: 15, fame: 3 },
  { id: 'lake', to: '碧漪湖畔的漁村', cargo: '兩擔鹽', ke: 20, risk: 0.5, encounter: 'escort_far', pay: 45, fameReq: 10, fame: 2 },
];
const ESCORT_KEY = 'lj:escort';
const ESCORT_STAMINA = 20;

/** 今天的兩趟鏢（依日子輪換） */
const todaysRoutes = () => [ROUTES[day() % ROUTES.length], ROUTES[(day() + 1) % ROUTES.length]];

async function escort(ctx: EventCtx, r: Route) {
  if (!(await exert(ctx, ESCORT_STAMINA, '你累得腳步虛浮，這樣上路只會誤事。'))) return;
  st().updateWorld((w) => (w.daily[ESCORT_KEY] = { day: w.day, n: 1 }));
  await ctx.say(`你跟著鏢車出了城，押著${r.cargo}往${r.to}去。`, '車輪轆轆，鏢旗在風裡獵獵作響……');
  ctx.pass(r.ke / 2);
  if (Math.random() < r.risk) {
    const o = await ctx.battle(r.encounter);
    if (o !== 'win') {
      ctx.pass(r.ke / 2);
      await ctx.say('劫匪搶了貨，一溜煙鑽進了林子。', ...jin('人沒事就好。貨丟了，酬勞自然是沒有了。下回小心。'), '（護鏢失敗）');
      return;
    }
    await ctx.say('劫匪抱頭鼠竄，鏢車繼續上路。');
  }
  ctx.pass(r.ke / 2);
  await ctx.say(`${r.cargo}平平安安地送到了${r.to}。`, ...jin('辦得漂亮！這是你的。'));
  await ctx.hero((h) => {
    h.silver += r.pay;
    return [`銀兩 +${r.pay}。`, addFame(h, r.fame)];
  });
}

export const escortTalk: Script = async (ctx) => {
  const c = await ctx.ask(jin('金刀鏢局，三十年的招牌。要接鏢？')[0], ['接鏢', '閒聊', '不用了']);
  if (c === 1) {
    await ctx.say(
      ...jin('漕幫那幫人，仗著碼頭是他們的，三天兩頭扣我們的鏢船。', '要不是三年前那趟鏢折了十一個兄弟，鏢局元氣大傷，我早就跟他們理論去了。'),
    );
    return;
  }
  if (c !== 0) return;
  if (usedToday(st().world, ESCORT_KEY)) {
    await ctx.say(...jin('今天的鏢已經走過一趟了，明天再來。'));
    return;
  }
  const list = todaysRoutes();
  const fame = st().hero.fame;
  const label = (r: Route) =>
    `${r.to}（${r.cargo}，來回${keText(r.ke)}，酬勞 ${r.pay} 兩${r.risk >= 0.5 ? '，常有劫匪' : ''}）${fame < r.fameReq ? `　名聲 ${r.fameReq} 起` : ''}`;
  const i = await ctx.ask(jin(`今天有兩趟鏢。路上花體力 ${ESCORT_STAMINA}，遇上劫匪就得動手。`)[0], [...list.map(label), '算了']);
  if (i >= list.length) return;
  const r = list[i];
  if (fame < r.fameReq) {
    await ctx.say(...jin('這趟鏢不輕，我得找個有名號的人押。你再闖蕩闖蕩吧。'), `（名聲要 ${r.fameReq}，目前 ${fame}）`);
    return;
  }
  await escort(ctx, r);
};

// ── 臨江縣衙：懸賞 ──────────────────────────────────────

const huo = by('霍青山');

interface Bounty {
  id: string;
  title: string;
  where: string;
  brief: string;
  pay: number;
  fame: number;
  fameReq: number;
}

export const BOUNTIES: Bounty[] = [
  { id: 'dogs', title: '官道惡犬', where: '雲水渡口東岸的林子', brief: '一頭惡犬領著野狗群，在渡口邊咬傷了好幾個等船的人。', pay: 30, fame: 3, fameReq: 0 },
  { id: 'bandits', title: '山道毛賊', where: '鳴泉山道的半山腰', brief: '幾個毛賊在鳴泉山道上打劫上山的香客。', pay: 40, fame: 3, fameReq: 0 },
  { id: 'river', title: '江邊水匪', where: '臨江城南，碼頭西邊的江灘', brief: '一夥水匪夜裡摸上碼頭偷貨，漕幫也拿他們沒辦法。', pay: 60, fame: 5, fameReq: 10 },
];
/** 領賞後隔幾天，同一張懸賞才會再貼 */
const BOUNTY_GAP = 5;
const bflag = (id: string) => `lj_b_${id}`;

/** 這張懸賞現在貼著嗎（沒揭、也不在冷卻中） */
const posted = (f: Record<string, number>, b: Bounty) => !f[bflag(b.id)] && (!f[`${bflag(b.id)}_day`] || day() >= f[`${bflag(b.id)}_day`] + BOUNTY_GAP);

/** 領賞：辦妥的懸賞（旗標是 2）一一領了 */
export async function claimBounties(ctx: EventCtx) {
  const f = st().flags;
  for (const b of BOUNTIES.filter((x) => f[bflag(x.id)] === 2)) {
    await ctx.say(...huo(`「${b.title}」辦妥了？好！這是賞銀。`));
    ctx.setFlag(bflag(b.id), 0);
    ctx.setFlag(`${bflag(b.id)}_day`, day());
    await ctx.hero((h) => {
      h.silver += b.pay;
      return [`銀兩 +${b.pay}。`, addFame(h, b.fame)];
    });
  }
}

/** 揭一張懸賞 */
async function takeBounty(ctx: EventCtx, b: Bounty) {
  const fame = st().hero.fame;
  if (fame < b.fameReq) {
    await ctx.say(...huo('這張懸賞兇險，衙門不放心交給沒名沒姓的人。'), `（名聲要 ${b.fameReq}，目前 ${fame}）`);
    return;
  }
  ctx.setFlag(bflag(b.id), 1);
  ctx.refresh();
  await ctx.say(`你揭下「${b.title}」的榜文。`, ...huo(b.brief, `地點在${b.where}。辦妥了回來領賞。`));
}

/** 懸賞貼在公告欄的「懸賞公告」：還沒揭的可以揭，揭了的寫著進度 */
registerNotices(({ flags, hero }) =>
  BOUNTIES.flatMap((b): Notice[] => {
    const state = flags[bflag(b.id)];
    if (state === 1 || state === 2)
      return [{ id: `bounty:${b.id}`, tab: 'urgent', title: `懸賞・${b.title}（已揭）`, text: [b.brief, `地點：${b.where}。`, state === 2 ? '你已經辦妥了，找捕頭霍青山領賞。' : '榜已經被你揭了，辦妥了回縣衙領賞。'], by: '臨江縣捕廳', tag: `賞銀 ${b.pay} 兩` }];
    if (!posted(flags, b)) return [];
    return [
      {
        id: `bounty:${b.id}`, tab: 'urgent', title: `懸賞・${b.title}`,
        text: [b.brief, `地點：${b.where}。`, `能為地方除害者，賞銀 ${b.pay} 兩。${b.fameReq ? `（此案兇險，名聲 ${b.fameReq} 以上者方可揭榜）` : ''}`],
        by: '臨江縣捕廳', tag: `賞銀 ${b.pay} 兩${hero.fame < b.fameReq ? `・名聲 ${b.fameReq} 起` : ''}`,
        act: { label: '揭榜', run: (ctx) => takeBounty(ctx, b) },
      },
    ];
  }),
);

/** 捕頭霍青山：先領賞，再看公告欄的懸賞公告 */
export const bountyBoard: Script = async (ctx) => {
  await claimBounties(ctx);
  await noticeBoard('urgent')(ctx);
};

/** 懸賞目標：在地圖上等你（旗標 lj_b_<id> 是 1 時才出現） */
export const bountyTarget =
  (id: string): Script =>
  async (ctx) => {
    const b = BOUNTIES.find((x) => x.id === id)!;
    const o = await ctx.battle(`bounty_${id}`);
    if (o !== 'win') return;
    ctx.setFlag(bflag(id), 2);
    ctx.refresh();
    await ctx.say(`「${b.title}」收拾掉了。`, '（回臨江縣衙領賞）');
  };

/** 任務日誌與今日清單：揭了的懸賞 */
export const bountyQuest = {
  id: 'lj_bounty',
  title: '臨江縣衙・懸賞',
  status(f: Record<string, number>): { text: string; done: boolean } | null {
    const open = BOUNTIES.filter((b) => f[bflag(b.id)]);
    if (!open.length) return null;
    return {
      text: open.map((b) => (f[bflag(b.id)] === 2 ? `「${b.title}」辦妥了，回縣衙領賞。` : `「${b.title}」：${b.brief}地點在${b.where}。`)).join('\n'),
      done: false,
    };
  },
};

registerDailyTasks(({ flags }) =>
  BOUNTIES.filter((b) => flags[bflag(b.id)]).map((b) => ({
    text: flags[bflag(b.id)] === 2 ? `懸賞「${b.title}」：回臨江縣衙領賞` : `懸賞「${b.title}」`,
    state: 'todo' as const,
    note: flags[bflag(b.id)] === 2 ? undefined : b.where,
  })),
);

// ── 漕幫分舵：扛貨、擲骰子 ──────────────────────────────

const peng = by('彭大江');
const CARRY_STAMINA = 25;
const CARRY_PAY = 8;
const CARRY_EXP = 12;

async function carry(ctx: EventCtx) {
  if (!(await exert(ctx, CARRY_STAMINA, '腰都快斷了，再扛下去要出人命。'))) return;
  await ctx.work('water', '扛貨中……');
  ctx.pass(8);
  await ctx.say('你跟著一群赤膊漢子，把船上的米包一袋袋扛上岸。', '汗水流進眼睛裡，肩膀磨得通紅。', '（扛了一個時辰）');
  await ctx.hero((h) => {
    h.silver += CARRY_PAY;
    // 扛貨練的是筋骨：順帶練一門裝備中、還沒到上限的外功
    const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === 'outer' && k.level < skillCap(k));
    return [`工錢 ${CARRY_PAY} 兩。`, s ? `「${skillDef(s).name}」經驗 +${CARRY_EXP}。` : null, s ? gainSkill(h, s.id, CARRY_EXP, false) : null];
  });
}

/** 擲骰子比大小：各擲兩顆，點大的贏；平手算莊家的 */
async function dice(ctx: EventCtx) {
  const roll = () => 2 + Math.floor(Math.random() * 6) + Math.floor(Math.random() * 6);
  for (;;) {
    const bets = [1, 5, 10].filter((n) => st().hero.silver >= n);
    if (!bets.length) {
      await ctx.say(...peng('沒錢了還賭？回去吧！'));
      return;
    }
    const i = await ctx.ask(peng('押多少？兩顆骰子比大小，點大的贏，平手算莊家的。')[0], [...bets.map((n) => `押 ${n} 兩`), '不玩了']);
    if (i >= bets.length) return;
    const bet = bets[i];
    const me = roll();
    const house = roll();
    const win = me > house;
    st().updateHero((h) => (h.silver += win ? bet : -bet));
    await ctx.say(`骰盅一掀——你擲出 ${me} 點，莊家 ${house} 點。`, win ? `你贏了 ${bet} 兩！` : `你輸了 ${bet} 兩。`);
  }
}

export const guildTalk: Script = async (ctx) => {
  const c = await ctx.ask(peng('漕幫臨江分舵。有事說事。')[0], [
    `扛貨（一個時辰、體力 ${CARRY_STAMINA}，工錢 ${CARRY_PAY} 兩）`,
    '擲骰子',
    '搭漕幫的船往大埠頭（大江水路）',
    '閒聊',
    '不用了',
  ]);
  if (c === 0) await carry(ctx);
  else if (c === 1) await dice(ctx);
  else if (c === 2) await riverBoat(ctx, 'dabutou', peng);
  else if (c === 3)
    await ctx.say(
      ...peng('金刀鏢局？哼，他們的鏢船夾帶私貨，我們扣下來查，有什麼不對？', '碼頭是漕幫的碼頭，規矩是漕幫的規矩。'),
      ...peng('……三年前那趟鏢的事，跟我們漕幫沒關係。外頭傳的那些話，你別信。'),
    );
};

export const diceTable: Script = dice;

/** 外面的鏢師褚大剛 */
export const escortGuardLines = [
  by('褚大剛')('金刀鏢局，褚大剛。', '漕幫那幫水耗子，仗著碼頭是他們的，連我們的鏢船都敢扣！', '總鏢頭忍得住，我可忍不住。'),
  by('褚大剛')('你身手看著不錯。鏢局最近缺人手，進去找總鏢頭金萬山，有鏢可以接。'),
];
