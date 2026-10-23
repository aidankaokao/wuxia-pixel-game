import type { WorkKind } from '../art/work';
import { addFame, attrs, canHold, roundsToCap, Character, type Slot, derive, equipGear, gainSkill, giveItem, slotsFor, takeSectGear, isEquipped, ITEMS, learnSkill, skillCap, skillDef, SKILLS, slotOf } from '../character';
import { withCost, type EventCtx, type Script } from '../events';
import { usedToday, type World } from '../home';
import type { Line } from '../maps/types';
import { book, fundMood, fundOf, MOOD_NAME, payRate } from '../sect_fund';
import { addContrib, choreKey, inSect, promote, promotionChecks, roster, SectMember, leaveRuleText, nextStipendDay, newSectState, rankName, registerSect, SectDef, STIPEND_DAYS } from '../sect';
import { clampAff, newRelation, STAGE, stageOf } from '../social';
import { useGame } from '../../state/store';
import { askRounds, exert, rest, roundsNote, roundsToInsight, STAMINA, studyable, studyInsight, useDaily } from './estate';
import { COOK_STAMINA, cookAt, teachDishes } from './cooking';
import { maybeDayEvent } from './schedule';
import { dailyMeal } from '../cooking';
import { festivalMeal, luFestival, wenFestival } from './festival';
import { craftDef, craftOf, CraftId, gainCraft } from '../crafts';
import { MQ_UNIFORMS } from '../gear';
import { heroUnit } from '../battle/moves';
import { setupDrill } from '../battle/enemies';
import { dateText, inShichen, isXunxiu, keUntilDawn, seasonOf, shichenStart, SHICHEN_INDEX, timeText } from '../time';
import type { PersonDef } from './people';
import { registerDailyTasks, type DayTask } from '../daily';
import { registerReminder } from '../thought';
import { registerActivity, registerDayEvent, registerInterrupt } from '../schedule';

/**
 * 鳴泉劍派：臨江城北、鳴泉山上的小門派。收徒不拘時日，通過入門考驗（問心、觀骨、試劍）就能拜師。
 * 身分：記名弟子 → 正式弟子 → 真傳弟子（狀態存在 world.sect，見 sect.ts）。
 *
 * 旗標：
 *   mq_seek       1 知道要找大師兄陸鳴川應考
 *   mq_trial      1 過了問心、觀骨（還差試劍） / 2 試劍也過了，可以去大殿拜師
 *   mq_trial_day  試劍輸掉是第幾天（同一天不能再考）
 *   mq_heart      問心的結果：1 守正 / 2 謙和 / 3 好勝
 *   mq_join       1 是鳴泉弟子（身分在 world.sect）
 *   mq_left       1 離開了鳴泉劍派（不能再回來拜師）
 *   mq_exam       正式弟子考核：1 考過了（等掌門升你為正式弟子） / 2 已升為正式弟子
 *   mq_exam_day   考核沒過是第幾天（隔三天才能再考）
 *   mq_true_hint  1 掌門提過可以拜師了
 *   mq_mt         真傳拜師試煉進行中：1 韓靖秋 / 2 嚴守拙 / 3 蘇芷蘅
 *   mq_mt_day     拜師試煉沒過是第幾天（隔三天才能再考）
 *   mq_herbs      蘇芷蘅的試煉採到的藥草（位元：1 泉心草、2 鐵骨藤、4 雲根芝）
 *   mq_herb_boar  1 打跑了守著雲根芝的護藥山豬
 *   mq_fog_old    霧天在後山泉源見過白髮老人是第幾天（同一天不再出現）
 *   mq_master     拜師試煉通過了誰：1 韓靖秋 / 2 嚴守拙 / 3 蘇芷蘅（等掌門升你為真傳弟子）
 *   mq_true       1 已成為真傳弟子
 *   mq_c_path     下山委託「清理山道」：1 接下 / 2 打跑了野狗群 / 3 已覆命
 *   mq_c_med      下山委託「回春堂送藥」：1 接下（身上帶著藥包） / 2 送到了 / 3 已覆命
 *   mq_mush_west / mq_mush_east  後山野菌是第幾日採的（當天不再出現）
 */

const SECT = 'mingquan';
const st = () => useGame.getState();
const by =
  (speaker: string) =>
  (...texts: string[]): Line[] =>
    texts.map((text) => ({ speaker, text }));
/** 鳴泉劍派的人：弟子名冊與各處的台詞都用這份名字 */
export const MQ_MEMBERS = {
  wen: { name: '聞松年', rank: '掌門', age: 68, role: '鳴泉劍派第七代掌門', person: 'wen' },
  han: { name: '韓靖秋', rank: '長老', age: 52, role: '傳功長老，在練功房指點弟子', person: 'han' },
  yan: { name: '嚴守拙', rank: '長老', age: 71, role: '執法長老', note: '坐鎮後山，看守思過崖', person: 'yan' },
  su: { name: '蘇芷蘅', rank: '長老', age: 45, role: '藥堂長老', note: '常下山行醫', person: 'su' },
  lu: { name: '陸鳴川', rank: '真傳弟子', age: 27, role: '大弟子，主持晨課與入門考驗', person: 'lu' },
  ye: { name: '葉疏桐', rank: '真傳弟子', age: 24, role: '二弟子', note: '下山歷練，久未回山' },
  qi: { name: '齊振遠', rank: '內門弟子', age: 31, role: '教習，在練功房教基本功' },
  fang: { name: '方硯清', rank: '內門弟子', age: 26, role: '知客，在山門內迎客' },
  ke: { name: '柯靜言', rank: '內門弟子', age: 29, role: '值殿，掌管門規與月例' },
  song: { name: '宋知微', rank: '內門弟子', age: 25, role: '管書' },
  miao: { name: '蘇青苗', rank: '內門弟子', age: 21, role: '管藥，蘇長老的姪女' },
  meng: { name: '孟鐸', rank: '內門弟子', age: 30, role: '管武器房' },
  he: { name: '何守一', rank: '正式弟子', age: 24, role: '守山門' },
  wei: { name: '韋季安', rank: '正式弟子', age: 23, role: '採買', note: '常下山到臨江城' },
  gu: { name: '顧小滿', rank: '記名弟子', age: 16, role: '上個月入門', person: 'xiaoman' },
  qiao: { name: '喬木生', rank: '記名弟子', age: 18, role: '守山門' },
  bao: { name: '包小川', rank: '記名弟子', age: 17, role: '練劍' },
  tang: { name: '唐秋生', rank: '記名弟子', age: 17, role: '練劍' },
  cao: { name: '曹小豆', rank: '記名弟子', age: 15, role: '掃殿前' },
  zheng: { name: '鄭大壯', rank: '記名弟子', age: 20 },
  hou: { name: '侯三郎', rank: '記名弟子', age: 19 },
  bu: { name: '卜大勺', rank: '雜役', age: 52, role: '伙房師傅，管廚房與菜圃', person: 'bu' },
  shao: { name: '邵長庚', rank: '雜役', age: 74, role: '守山人，在後山守了四十年' },
  gan: { name: '甘伯禾', rank: '雜役', age: 61, role: '管後山東坡的茶園、山田與藥圃' },
  liang: { name: '梁敬亭', rank: '雜役', age: 42, role: '外門管事，掌臨江城泉霧茶莊', note: '常駐臨江城' },
} satisfies Record<string, SectMember>;
/** 名字：MQ.ke → 柯靜言 */
export const MQ = Object.fromEntries(Object.entries(MQ_MEMBERS).map(([k, v]) => [k, v.name])) as Record<keyof typeof MQ_MEMBERS, string>;

const lu = by('陸鳴川');
const wen = by('聞松年');
const xm = by('顧小滿');
const han = by('韓靖秋');
const yan = by('嚴守拙');
const su = by('蘇芷蘅');
const duty = by(MQ.ke);
const keeper = by(MQ.song);

export const MINGQUAN: SectDef = {
  id: SECT,
  name: '鳴泉劍派',
  size: '小',
  recruit: { kind: 'anytime' },
  weapons: ['劍法', '拳掌'],
  ranks: [
    {
      name: '記名弟子',
      dorm: '大通鋪',
      perks: ['跟大師兄做晨課、在廣場的木樁練樁', '書房研讀、抄錄入門武功', '練功房的蒲團打坐', '任務榜的雜務與簡單的下山委託', `每 ${STIPEND_DAYS} 天到大殿領月例`],
      stipend: { silver: 5, items: { jinchuang: 1 } },
      leave: [{ kind: 'free' }],
      promote: { days: 30, merit: 150, skills: [{ id: 'mingquan', level: 4 }], test: '正式弟子考核（條件齊了就到練功房找傳功長老報考）' },
    },
    {
      name: '正式弟子',
      dorm: '弟子房（兩人一間）',
      perks: ['練功房的鐵木人樁', '書房抄錄「踏石步」', '更多下山委託'],
      stipend: { silver: 12, items: { jinchuang: 2 } },
      leave: [{ kind: 'fine', silver: 500 }, { kind: 'trial', name: '泉音劍陣', encounter: 'mq_array' }],
      promote: { days: 45, merit: 400, skills: [{ id: 'mingquan', level: 6 }], test: '內門試劍（條件齊了就到練功房找傳功長老）' },
    },
    {
      name: '內門弟子',
      dorm: '弟子房（兩人一間）',
      perks: ['門派年會上選舉長老、執事，也能出來競選執事', '通過授徒考驗後可以收徒弟', '內門弟子的泉紋護腕'],
      stipend: { silver: 18, items: { jinchuang: 2 } },
      leave: [{ kind: 'fine', silver: 800 }, { kind: 'trial', name: '泉音劍陣', encounter: 'mq_array' }],
      promote: { days: 60, merit: 600, skills: [{ id: 'mingquan', level: 8 }, { id: 'chengquan', level: 5 }], test: '真傳拜師試煉（條件齊了就去拜見掌門）' },
    },
    {
      name: '真傳弟子',
      dorm: '真傳弟子房（一人一間）',
      perks: ['拜長老為師，學上乘武功', '每天向師父請教', '真傳弟子房的床鋪（精神飽滿更久）', '內門弟子的一切權利（選舉、收徒）', '掌門傳位時有資格繼承'],
      stipend: { silver: 25, items: { jinchuang: 3 } },
      leave: [{ kind: 'trial', name: '泉音劍陣', encounter: 'mq_array' }],
    },
  ],
  rules: [
    { name: '不得擅入禁地', desc: '思過崖與掌門居所，未經許可不得擅入。' },
    { name: '同門不得私鬥', desc: '切磋點到為止，不得挾怨動手。' },
    { name: '不得恃武欺人', desc: '習武是為了護人，不得欺壓百姓、濫殺無辜。' },
    { name: '典籍不得私攜', desc: '書房的書不得帶出；借閱的秘笈須按期歸還。' },
    { name: '本門武功不得外傳', desc: '未經掌門允許，不得把本門武功傳給外人。' },
  ],
  skills: [
    { id: 'mingquan', rank: 0, cost: 0 },
    { id: 'chengquan', rank: 0, cost: 30 },
    { id: 'tashi', rank: 1, cost: 60 },
  ],
  chores: [
    { id: 'water', name: '挑水', where: '廚房的水缸' },
    { id: 'sweep', name: '掃殿前', where: `大殿前找${MQ.cao}` },
    { id: 'herbs', name: '翻曬草藥', where: '藥房的晾藥架' },
    { id: 'books', name: '整理書房', where: '書房的掌故書架' },
    { id: 'garden', name: '照顧菜圃', where: `廚房找伙房的${MQ.bu}` },
  ],
  choresPerDay: 3,
  members: Object.values(MQ_MEMBERS),
};
registerSect(MINGQUAN);

const member = () => inSect(st().world, SECT);
export const isMember = member;
const sect = () => st().world.sect!;
const day = () => st().world.day;

/** 今日事：晨課、雜務、大鍋飯、月例 */
registerDailyTasks(({ world: w }) => {
  const s = w.sect;
  if (s?.id !== SECT) return [];
  const morning = usedToday(w, 'mq:morning') > 0;
  const chores = usedToday(w, choreKey(SECT));
  const holding = s.chore ? MINGQUAN.chores.find((c) => c.id === s.chore) : undefined;
  const list: DayTask[] = [
    // 旬休沒有晨課
    ...(isXunxiu(w.day)
      ? []
      : [
          {
            text: `晨課（卯時到巳時，演武廣場找${MQ.lu}）`,
            state: (morning ? 'done' : w.time >= shichenStart(SHICHEN_INDEX.午) ? 'missed' : 'todo') as DayTask['state'],
          },
        ]),
    {
      text: `門內雜務 ${chores}/${MINGQUAN.choresPerDay}（演武廣場的任務榜）`,
      state: chores >= MINGQUAN.choresPerDay ? 'done' : 'todo',
      note: holding ? `手上：${holding.name}（${holding.where}）` : undefined,
    },
    { text: `到廚房跟${MQ.bu}領今天的飯`, state: usedToday(w, MEAL_KEY) ? 'done' : 'todo' },
  ];
  if (w.day >= nextStipendDay(s)) list.push({ text: `到大殿找${MQ.ke}領月例`, state: 'todo' });
  return list;
});

/** 想法泡泡：巳時了，晨課還沒做 */
registerReminder({
  id: 'mq:morning',
  check: ({ world: w }) =>
    w.sect?.id === SECT && !isXunxiu(w.day) && !usedToday(w, 'mq:morning') && inShichen(w.time, SHICHEN_INDEX.巳, SHICHEN_INDEX.巳) ? '晨課快結束了，得趕緊去廣場……' : null,
});

/** 想法泡泡：午時、酉時開飯，同門都到廚房吃飯 */
for (const [id, s, text] of [
  ['mq:lunch', SHICHEN_INDEX.午, '肚子咕咕叫……廚房該開飯了。'],
  ['mq:supper', SHICHEN_INDEX.酉, '飯香飄過來了，大夥兒都往廚房去了。'],
] as const)
  registerReminder({ id, check: ({ world: w }) => (w.sect?.id === SECT && inShichen(w.time, s, s) ? text : null) });

/** 本門武功：研讀、練樁時多一點收穫 */
const isSectSkill = (id: string) => MINGQUAN.skills.some((s) => s.id === id);

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

// ── 入門考驗：問心、觀骨、試劍（大師兄陸鳴川主持） ─────────

/** 問心的結果（旗標 mq_heart − 1）；每題的三個選項依序對應 */
export const MQ_HEART = ['守正', '謙和', '好勝'] as const;

const QUESTIONS: { q: string; a: string[] }[] = [
  { q: '第一問：你為何習武？', a: ['行俠仗義，鋤強扶弱', '強身健體，護得住身邊的人', '揚名立萬，做天下第一'] },
  { q: '第二問：同門師兄弟與人爭執，錯在同門，你當如何？', a: ['當面直言，勸他賠罪', '先把兩邊拉開，回頭再說', '先幫同門出頭，錯了再論'] },
  { q: '第三問：倘若師門所傳，不如你在外頭學到的功夫，你會如何？', a: ['師門武功是根本，先練紮實', '兩邊都學，融會貫通', '哪個厲害就練哪個'] },
];

const BONE: Record<string, string> = {
  strength: '臂力不弱，出劍沉得住。',
  agility: '筋骨輕靈，是練快劍的料子。',
  constitution: '骨架結實，經得起苦練。',
  energy: '氣息綿長，將來練內功會比別人快。',
  insight: '眼神清亮，是個肯想事情的人。學武，悟性最要緊。',
};

async function heartAndBone(ctx: EventCtx) {
  await ctx.say(...lu('本派收徒不拘時日，不看出身，只看三關：問心、觀骨、試劍。', '先問心。照實答就好，沒有對錯。'));
  const tally = [0, 0, 0];
  let last = 0;
  for (const { q, a } of QUESTIONS) {
    last = await ctx.ask({ speaker: '陸鳴川', text: q }, a);
    tally[last]++;
  }
  const best = Math.max(...tally);
  const heart = tally[last] === best ? last : tally.indexOf(best);
  ctx.setFlag('mq_heart', heart + 1);
  const remark = [
    '心裡有把尺，好。只是江湖上的事，不是每件都分得清是非。',
    '不爭不搶，懂得顧全大局。只是有時候，該爭的也得爭。',
    '有股不服輸的勁，練劍的人要有這個。只是別讓它變成戾氣。',
  ][heart];
  await ctx.say(...lu(remark), '陸鳴川點點頭，在手上的冊子裡記了幾筆。');

  await ctx.say(...lu('再來是觀骨。伸出手來。'), '陸鳴川捏了捏你的手腕、肩膀，又按了按你的背脊。');
  const base = st().hero.base;
  const top = (Object.keys(base) as (keyof typeof base)[]).reduce((a, b) => (base[b] > base[a] ? b : a));
  await ctx.say(...lu(BONE[top]));
  ctx.setFlag('mq_trial', 1);
}

async function swordTrial(ctx: EventCtx) {
  if (ctx.flag('mq_trial_day') === day()) {
    await ctx.say(...lu('今天就先歇著吧，明天再來比過。', '大通鋪最裡頭有張空鋪，上山應考的人可以借住一晚。'));
    return;
  }
  await ctx.say(...lu('最後一關是試劍。小滿！'), { speaker: '顧小滿', text: '來啦！大師兄，這次又要我陪誰比？' });
  await ctx.say(...lu('她是上個月入門的記名弟子。你跟她過幾招，點到為止。', '勝了，這一關就算過。'));
  const go = await ctx.ask({ speaker: '陸鳴川', text: '準備好了嗎？' }, ['請賜教', '等一下']);
  if (go !== 0) {
    await ctx.say(...lu('準備好了再來找我。'));
    return;
  }
  const o = await ctx.battle('trial_xiaoman');
  if (o === 'win') {
    ctx.setFlag('mq_trial', 2);
    await ctx.say(
      ...xm('哎呀……輸了輸了。你出手好快！'),
      ...lu('三關都過了。', '去大殿拜見掌門吧，掌門會親自收你入門。'),
    );
    await ctx.hero((c) => addFame(c, 2));
    return;
  }
  ctx.setFlag('mq_trial_day', day());
  await ctx.say(
    ...xm('承讓啦！'),
    ...lu('根基還差了些。不過能撐到這一步，不算差。', '明天再來比過吧。大通鋪最裡頭有張空鋪，可以借住。'),
  );
}

/** 陸鳴川的劇情部分：入門考驗、晨課。處理了回傳 true */
async function luStory(ctx: EventCtx): Promise<boolean> {
  if (ctx.flag('mq_left')) {
    await ctx.say(...lu('……你既已離開師門，就各自珍重吧。'));
    return true;
  }
  if (!member()) {
    const t = ctx.flag('mq_trial');
    if (t === 2) {
      await ctx.say(...lu('三關都過了，去大殿拜見掌門吧。'));
      return true;
    }
    if (t === 0) {
      await ctx.say(...lu('在下陸鳴川，鳴泉劍派大弟子。'));
      const c = await ctx.ask({ speaker: '陸鳴川', text: '閣下上山，是來拜師的？' }, ['正是', '只是來看看']);
      ctx.setFlag('mq_seek');
      if (c !== 0) {
        await ctx.say(...lu('那就隨意看看吧。想拜師的話，隨時來找我。'));
        return true;
      }
      await heartAndBone(ctx);
      const now = await ctx.ask({ speaker: '陸鳴川', text: '問心、觀骨都過了。最後一關試劍，現在就比嗎？' }, ['現在就比', '晚點再來']);
      if (now !== 0) {
        await ctx.say(...lu('好，準備好了再來找我。'));
        return true;
      }
    }
    await swordTrial(ctx);
    return true;
  }
  // 弟子：晨課在卯時到巳時之間，一天一回；旬休沒有晨課
  if (isXunxiu(day())) {
    if (!morningTime()) return false;
    await ctx.say(...lu('今天旬休，不上晨課。想下山就下山，臨江城今天趕集。'));
    return true;
  }
  if (!morningTime() || st().world.daily['mq:morning']?.day === day()) return false;
  const c = await ctx.ask({ speaker: '陸鳴川', text: '來得正好，今天的晨課要一起練嗎？' }, ['跟著練', '晚點再說']);
  if (c !== 0) return false;
  await morningDrill(ctx);
  return true;
}

/** 晨課的時間：卯時到巳時（早上 5 點到 11 點） */
const morningTime = () => inShichen(st().world.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.巳);

async function morningDrill(ctx: EventCtx) {
  if (!(await useDaily(ctx, 'mq:morning', 1, '今天的晨課已經練過了。'))) return;
  ctx.pass(8);
  await ctx.say('你跟著陸鳴川和師兄弟們，在演武廣場上一招一式地練起鳴泉劍法。', '劍風與泉聲混在一起，迴盪在山間……\n（晨課練了一個時辰）');
  await ctx.hero((h) => (h.skills.some((s) => s.id === 'mingquan') ? gainSkillText(h, 'mingquan', 30) : null));
  await contrib(ctx, 2);
  await maybeDayEvent(ctx, 'drill');
}

// ── 拜師：大殿見掌門聞松年 ────────────────────────────

/** 職位的差事（story/mq_posts.ts 掛進來）：值殿那裡多一個選項；有職位才出現 */
let postHook: { can: () => boolean; run: (ctx: EventCtx) => Promise<void> } | null = null;
export const setPostHook = (h: { can: () => boolean; run: (ctx: EventCtx) => Promise<void> }) => (postHook = h);
/** 大殿正中的掌門座位：你當了掌門，在這裡處理門派事務（story/mq_posts.ts 掛進來） */
let chairHook: ((ctx: EventCtx) => Promise<boolean>) | null = null;
export const setChairHook = (f: (ctx: EventCtx) => Promise<boolean>) => (chairHook = f);
export const leaderChair: Script = async (ctx) => {
  if (chairHook && (await chairHook(ctx))) return;
  await ctx.say('掌門的座位。座前的蒲團上，跪過一代又一代入門的弟子。');
};

/** 掌門的劇情鉤子（年會、傳位等，story/mq_order.ts 掛進來）；處理了回傳 true */
let wenHook: ((ctx: EventCtx) => Promise<boolean>) | null = null;
export const setWenHook = (f: (ctx: EventCtx) => Promise<boolean>) => (wenHook = f);

async function wenStory(ctx: EventCtx): Promise<boolean> {
  if (wenHook && (await wenHook(ctx))) return true;
  if (ctx.flag('mq_left')) {
    await ctx.say(...wen('你我師徒緣分已盡，不必多言。'));
    return true;
  }
  if (member()) {
    if (ctx.flag('mq_exam') === 1 && sect().rank === 0) {
      await promotionCeremony(ctx);
      return true;
    }
    if (sect().rank !== 2) return false;
    if (ctx.flag('mq_master')) {
      await trueCeremony(ctx);
      return true;
    }
    if (trueReady() && !ctx.flag('mq_true_hint')) {
      ctx.setFlag('mq_true_hint');
      await ctx.say(
        ...wen('你入了內門以來，功績、武功都長進了不少。是時候拜師了。'),
        ...wen(
          `本門三位長老，各有一門上乘武功：靖秋的「疊泉劍」、守拙的「斷流掌」、芷蘅的「寒潭心經」。`,
          `靖秋在練功房，守拙在後山思過崖前，芷蘅在藥房。想拜誰為師，就去找誰。`,
          '只是長老收徒，看的不只是武功，也看緣分——跟長老不夠熟，他們未必肯收。每位長老的試煉也不一樣。',
        ),
      );
      return true;
    }
    return false;
  }
  if (ctx.flag('mq_trial') !== 2) {
    await ctx.say(...wen('想入我鳴泉，先去演武廣場找鳴川，過了入門考驗再來。'));
    ctx.setFlag('mq_seek');
    return true;
  }
  if (st().world.sect) {
    await ctx.say(...wen('你已有師門，鳴泉不收身在他派之人。'));
    return true;
  }
  await initiation(ctx);
  return true;
}

async function initiation(ctx: EventCtx) {
  const heart = ctx.flag('mq_heart') - 1;
  await ctx.say(
    ...wen('你就是鳴川說的那個年輕人？'),
    ...wen(
      [
        '鳴川說你心裡有把尺。這把尺，守得住是福，守不住是禍。',
        '鳴川說你性子溫和，懂得顧全大局。劍法要穩，人也要穩，這很好。',
        '鳴川說你好勝。好勝不是壞事——只要你勝的是昨天的自己。',
      ][Math.max(0, heart)],
    ),
    ...wen('本派是小門派，規矩不多，但有五條，入門的人都得守：'),
    { text: MINGQUAN.rules.map((r, i) => `${'一二三四五'[i]}、${r.name}`).join('\n') },
  );
  const c = await ctx.ask(
    { speaker: '聞松年', text: '入了鳴泉，就不能再拜入其他門派。你可願意拜入本門，遵守門規？' },
    ['弟子願意', '容我再想想'],
  );
  if (c !== 0) {
    await ctx.say(...wen('拜師是一輩子的事，想清楚了再來。'));
    return;
  }
  await ctx.say(
    '你在祖師像前跪下，恭恭敬敬地叩了三個頭。',
    ...wen('好。從今天起，你就是鳴泉劍派的記名弟子。'),
    '聞松年從案上取過一塊木腰牌，親手交給你。',
  );
  st().updateWorld((w) => {
    w.sect = newSectState(SECT, w.day);
  });
  ctx.setFlag('mq_join');
  // 問心的結果：守正合掌門的意、謙和合大師兄的意、好勝讓顧小滿把你當對手
  addAff(['wen', 'lu', 'xiaoman'][Math.max(0, heart)], 5);
  await ctx.hero((h) => {
    const lines = [giveItem(h, 'mq_token'), learnSkill(h, 'mingquan')];
    if (!h.gear?.neck) lines.push(equipGear(h, 'mq_token', 'neck'));
    return lines;
  });
  await ctx.say(`${MQ.ke}捧來一套灰布衣：「這是記名弟子的衣服。」`);
  await issueUniform(ctx, 0);
  await ctx.say(
    ...wen(
      '記名弟子住大通鋪。每天跟鳴川做晨課，廣場上的木樁、練功房的蒲團、書房的書，都可以用。',
      `本門的「澄泉心法」收在書房，攢夠了門派貢獻，就去找管書的${MQ.song}抄錄。`,
      '記名弟子若是覺得不合適，隨時可以離開；成了正式弟子，那就不同了。好好想清楚自己的路。',
    ),
    '（選單新增「門派」分頁：可以查看身分、貢獻、晉升條件與門規）',
  );
}

// ── 正式弟子考核：傳功長老韓靖秋主持，問門規、連戰兩場（不許用藥） ──

/** 隔幾天才能再考 */
const EXAM_RETRY = 3;

const EXAM_QUESTIONS: { q: string; a: string[]; right: number }[] = [
  {
    q: '第一問：你在後山看見思過崖洞口沒人看守，心裡好奇，該當如何？',
    a: ['進去看一眼就出來', '叫上同門一起進去', '不得擅入，轉身離開'],
    right: 2,
  },
  {
    q: '第二問：同門與你口角，竟拔劍相向，你當如何？',
    a: ['退開不與他動手，稟告執法長老', '拔劍還擊，教訓他一頓', '找師兄弟來幫忙'],
    right: 0,
  },
  {
    q: '第三問：山下的朋友想學你的鳴泉劍法，你當如何？',
    a: ['交情好，教他幾招無妨', '未經掌門允許，不得外傳', '收些銀兩再教'],
    right: 1,
  },
];

/** 正式弟子的條件（考核以外）是不是都齊了 */
function examReady() {
  const hero = st().hero;
  const level = (id: string) => hero.skills.find((k) => k.id === id)?.level ?? 0;
  const checks = promotionChecks(sect(), day(), level, (id) => SKILLS[id].name) ?? [];
  return checks.slice(0, -1).every((c) => c.ok);
}

async function examFail(ctx: EventCtx, why: string) {
  ctx.setFlag('mq_exam_day', day());
  await ctx.say(...han(why, `${EXAM_RETRY} 天後再來考吧。`));
}

/** 韓靖秋的劇情部分：記名弟子條件齊了就能報考 */
async function hanStory(ctx: EventCtx): Promise<boolean> {
  if (member() && sect().rank === 1) return innerExam(ctx);
  if (member() && sect().rank >= 2 && (await teachExamHook?.(ctx))) return true;
  if (member() && sect().rank === 2) return masterStory(ctx, 0);
  if (!member() || sect().rank !== 0) return false;
  if (ctx.flag('mq_exam') === 1) {
    await ctx.say(...han('考核過了，還愣在這裡做什麼？去大殿見掌門。'));
    return true;
  }
  if (!examReady()) return false;
  const last = ctx.flag('mq_exam_day');
  if (last && day() < last + EXAM_RETRY) {
    await ctx.say(...han(`上回的考核才過去沒幾天。${dateText(last + EXAM_RETRY)}再來。`));
    return true;
  }
  const c = await ctx.ask(han('你入門也有些日子了，功績、劍法都夠了。要報考正式弟子嗎？')[0], ['弟子報考', '改天再說']);
  if (c !== 0) return true;

  await ctx.say(...han('正式弟子要下山辦事，代表的是鳴泉的臉面。先考門規，再考武功。'));
  let right = 0;
  for (const { q, a, right: r } of EXAM_QUESTIONS) if ((await ctx.ask({ speaker: '韓靖秋', text: q }, a)) === r) right++;
  if (right < 2) {
    await examFail(ctx, `三問只答對 ${right} 問。門規都記不住，怎麼放你下山？`);
    return true;
  }
  await ctx.say(
    ...han(right === 3 ? '三問全對。好。' : '答對兩問，勉強過得去。回頭把門規再念熟。'),
    ...han(`武功這一關，連戰兩場：先是教習${MQ.qi}，再來是${MQ.meng}。中間不歇，也不許用藥。`),
    '韓靖秋領著你來到演武廣場。師兄弟們聽說有人考正式弟子，紛紛圍了過來。',
  );
  if ((await ctx.battle('exam_qi')) !== 'win') {
    await examFail(ctx, '第一場就落敗了。根基還要再打紮實些。');
    return true;
  }
  await ctx.say({ speaker: MQ.qi, text: '……好劍法。這一場是我輸了。' }, ...han('不許歇，下一場。'));
  if ((await ctx.battle('exam_meng')) !== 'win') {
    await examFail(ctx, '撐過了一場，第二場力氣就跟不上了。內息與耐力，都還差一點。');
    return true;
  }
  ctx.setFlag('mq_exam', 1);
  await ctx.say(
    { speaker: MQ.meng, text: '服了。往後下山辦事，算你一份。' },
    '圍觀的師兄弟們一陣喝采。',
    ...han('門規、武功都過了。去大殿見掌門，由掌門親自升你為正式弟子。'),
  );
  await ctx.hero((h) => addFame(h, 5));
  return true;
}

/** 授徒考驗（內門弟子以上，story/mq_order.ts 掛進來） */
let teachExamHook: ((ctx: EventCtx) => Promise<boolean>) | null = null;
export const setTeachExamHook = (f: (ctx: EventCtx) => Promise<boolean>) => (teachExamHook = f);

/** 內門試劍的三問：內門弟子要管事、要帶人 */
const INNER_QUESTIONS = [
  { q: '同門師弟私下鬥毆，被你撞見了，你怎麼做？', a: ['先把兩人分開，再稟報值殿', '讓他們打完再說', '各打五十大板'], right: 0 },
  { q: '記名弟子練劍偷懶，你身為內門弟子該如何？', a: ['罵他一頓', '陪他練一回，看他卡在哪裡', '不關我的事'], right: 1 },
  { q: '門派年會選執事，你最看重候選人的什麼？', a: ['跟我交情好不好', '武功最高', '肯不肯擔事、處事公不公道'], right: 2 },
];

/** 內門試劍：正式弟子條件齊了，找韓靖秋；先跟何守一過招，再答三問 */
async function innerExam(ctx: EventCtx): Promise<boolean> {
  if (!examReady()) return false;
  const last = ctx.flag('mq_inner_day');
  if (last && day() < last + EXAM_RETRY) {
    await ctx.say(...han(`上回的試劍才過去沒幾天。${dateText(last + EXAM_RETRY)}再來。`));
    return true;
  }
  const c = await ctx.ask(han('你的功績、劍法都夠了。要試內門嗎？內門弟子能在年會上選長老、選執事，往後還能收徒。')[0], ['請長老考我', '改天再說']);
  if (c !== 0) return true;
  ctx.setFlag('mq_inner_day', day());
  await ctx.say(...han(`先試劍。${MQ.he}守了六年山門，劍法紮實，你跟他過一場。`), '何守一被叫了過來，抱拳一禮。');
  const h = st().hero;
  if ((await ctx.battle(setupDrill(heroUnit(h, derive(h)), { name: MQ.he, sprite: 'disciple' }, ['e_slash', 'quanyong', 'feipu'], Math.random, 1.05))) !== 'win') {
    await ctx.say(...han('劍還不夠穩。', `${EXAM_RETRY} 天後再來。`));
    return true;
  }
  await ctx.say({ speaker: MQ.he, text: '好劍！我服。' }, ...han('再問你三件事。內門弟子要管事、要帶人，光會打不夠。'));
  let right = 0;
  for (const { q, a, right: r } of INNER_QUESTIONS) if ((await ctx.ask({ speaker: '韓靖秋', text: q }, a)) === r) right++;
  if (right < 2) {
    await ctx.say(...han(`三問只對了 ${right} 問。心性還要再磨一磨。`, `${EXAM_RETRY} 天後再來。`));
    return true;
  }
  st().updateWorld((w) => {
    promote(w);
    w.life ??= { members: {}, news: [] };
    w.life.news = [...w.life.news, { day: w.day, text: `${st().hero.name}升為內門弟子`, who: [] }].slice(-20);
  });
  await ctx.say(...han(right === 3 ? '三問全對。好！' : '答對兩問，過了。', '從今日起，你是鳴泉的內門弟子。年會上有你一票，往後也能出來競選執事。', '想收徒的話，先過了我這裡的授徒考驗。'));
  await issueUniform(ctx, 2);
  await ctx.hero((h2) => addFame(h2, 5));
  return true;
}

async function promotionCeremony(ctx: EventCtx) {
  await ctx.say(
    ...wen('靖秋都跟我說了。三問答得好，兩場也打得漂亮。'),
    ...wen('從今日起，你就是鳴泉劍派的正式弟子。'),
    '聞松年親手在你的腰牌背面刻上「正」字。',
  );
  st().updateWorld((w) => promote(w));
  ctx.setFlag('mq_exam', 2);
  await ctx.hero((h) => giveItem(h, 'jinchuang', 2));
  await ctx.say(`${MQ.ke}捧來一件月白道袍與一雙布靴：「恭喜師兄弟，這是正式弟子的衣服。」`);
  await issueUniform(ctx, 1);
  await ctx.say(
    ...wen(
      `你搬去弟子房・甲，跟${MQ.he}同住。練功房的鐵木樁、書房的「踏石步」，往後都能用了；任務榜上的下山委託，也可以接。`,
      '只是記住：正式弟子再要離開師門，就不是說走就走了。',
    ),
    '（成為正式弟子：住處改為弟子房・甲，月例提高；練功房鐵木樁、抄錄踏石步、下山委託「回春堂送藥」開放）',
  );
}

/** 弟子房・甲：正式弟子的床 */
export const roomBed: Script = async (ctx) => {
  if (!member() || sect().rank < 1) {
    await ctx.say('正式弟子的床鋪，被褥比大通鋪的厚實多了。');
    return;
  }
  await rest(ctx, 2, '你在弟子房的床。要躺下休息嗎？', () => wakeLines('room'), true);
};

// ── 真傳拜師試煉：三位長老各有試煉，通過一位就拜他為師 ─────────

interface Master {
  /** 人物 id */
  id: string;
  name: string;
  skill: string;
  /** 試煉的說明 */
  trial: string;
}

const MASTERS: Master[] = [
  { id: 'han', name: MQ.han, skill: 'diequan', trial: '到後山試劍石前，接我一套劍。勝了，「疊泉劍」就傳給你。' },
  { id: 'yan', name: MQ.yan, skill: 'duanliu', trial: '在思過崖前守三夜，不許下崖、不許用藥。三夜都守住了，「斷流掌」就傳給你。' },
  {
    id: 'su',
    name: MQ.su,
    skill: 'hantan',
    trial: '到後山採三味藥回來：鳴泉源頭的泉心草、劍塚旁的鐵骨藤、望江台崖邊的雲根芝。採齊了，我還要考你藥性。',
  },
];
const MASTER_LINES = [han, yan, su];

/** 真傳弟子的條件（試煉以外）是不是都齊了 */
const trueReady = () => sect().rank === 2 && examReady();

async function trialFail(ctx: EventCtx, i: number, why: string) {
  ctx.setFlag('mq_mt', 0);
  ctx.setFlag('mq_mt_day', day());
  ctx.setFlag('mq_herbs', 0);
  await ctx.say(...MASTER_LINES[i](why, `${EXAM_RETRY} 天後再來吧。`));
}

async function trialPass(ctx: EventCtx, i: number) {
  ctx.setFlag('mq_mt', 0);
  ctx.setFlag('mq_master', i + 1);
  await ctx.say(...MASTER_LINES[i]('好。從今往後，你就是我的徒弟了。', '去大殿稟告掌門，由掌門升你為真傳弟子。'));
  await ctx.hero((h) => addFame(h, 8));
}

/** 三位長老共用的劇情：條件齊了、熟悉度夠了就能接受拜師試煉 */
async function masterStory(ctx: EventCtx, i: number): Promise<boolean> {
  const m = MASTERS[i];
  const say = MASTER_LINES[i];
  if (!member() || sect().rank !== 2) return false;
  const passed = ctx.flag('mq_master');
  if (passed) {
    if (passed !== i + 1) return false;
    await ctx.say(...say('還不去大殿見掌門？'));
    return true;
  }
  if (!trueReady()) return false;
  const doing = ctx.flag('mq_mt');
  if (doing && doing !== i + 1) {
    await ctx.say(...say(`你正在接受${MASTERS[doing - 1].name}的試煉，先把那邊的事辦完。`));
    return false;
  }
  if (doing === i + 1) return trialProgress(ctx, i);
  const last = ctx.flag('mq_mt_day');
  if (last && day() < last + EXAM_RETRY) {
    await ctx.say(...say(`你上回的試煉才過去沒幾天。${dateText(last + EXAM_RETRY)}再來。`));
    return true;
  }
  const aff = st().world.relations[m.id]?.aff ?? 0;
  if (aff < 30) {
    await ctx.say(...say('聽說你想拜師？你我還談不上熟，我不收不熟的徒弟。'), '（熟悉度要到「熟識」，長老才肯收你）');
    return false;
  }
  const c = await ctx.ask(say(`想拜我為師？${m.trial}`)[0], ['接受試煉', '容我再想想']);
  if (c !== 0) return true;
  ctx.setFlag('mq_mt', i + 1);
  await TRIALS[i](ctx);
  return true;
}

/** 進行中的試煉（目前只有蘇芷蘅的採藥是分段的） */
async function trialProgress(ctx: EventCtx, i: number): Promise<boolean> {
  if (i !== 2) return false;
  const got = ctx.flag('mq_herbs');
  if (got !== 7) {
    const left = HERBS.filter((h) => !(got & h.bit)).map((h) => `${h.name}（${h.where}）`);
    await ctx.say(...su(`還差${left.join('、')}。`));
    return true;
  }
  await ctx.say('你把三味藥一一攤在蘇芷蘅面前。', ...su('採得不錯，根鬚都完好。', '最後一問。'));
  const c = await ctx.ask(su('寒潭心經最忌燥熱。用這三味藥配「寒潭散」，哪一味只能放一點，還要最後才下？')[0], HERBS.map((h) => h.name));
  if (HERBS[c].id !== 'tiegu') {
    await trialFail(ctx, i, `錯了。${HERBS[c].name}${HERBS[c].nature}，不是它。藥性不熟，這門心法練了會傷身。`);
    return true;
  }
  await ctx.say(...su('不錯。鐵骨藤性溫，續筋接骨是好藥，可放多了，寒潭散就成了燥藥。'));
  await trialPass(ctx, i);
  return true;
}

const TRIALS: ((ctx: EventCtx) => Promise<void>)[] = [
  // 韓靖秋：試劍石前接他一套劍
  async (ctx) => {
    await ctx.say('韓靖秋領著你上了後山，在試劍石前站定。', ...han('石上這些劍痕，是歷代真傳留下的。你若勝了，也能在上頭留一道。'));
    if ((await ctx.battle('trial_han')) !== 'win') return trialFail(ctx, 0, '劍是快了，可還不夠穩。');
    await ctx.say('韓靖秋收劍入鞘，看著試劍石上你剛留下的那道劍痕，點了點頭。');
    await trialPass(ctx, 0);
  },
  // 嚴守拙：思過崖前守三夜
  async (ctx) => {
    await ctx.say(...yan('崖上夜裡不太平。守住了，才知道你的心定不定。'), '你在思過崖前盤膝坐下。天色漸漸暗了……');
    // 從現在坐到子時，夜裡有東西摸上崖來；打完坐到天亮，白天也不許下崖，再等到下一個子時
    const untilMidnight = () => (shichenStart(SHICHEN_INDEX.子) - st().world.time + 96) % 96 || 96;
    for (const n of [1, 2, 3]) {
      ctx.pass(untilMidnight());
      if ((await ctx.battle(`trial_night${n}`)) !== 'win') return trialFail(ctx, 1, `第 ${n} 夜就撐不住了。心不定，掌就不穩。`);
      ctx.pass(keUntilDawn(st().world.time));
      if (n < 3) await ctx.say(n === 1 ? '天亮了。你揉了揉發僵的腿，又坐回原處。' : '又一個天亮。你的手臂已經抬不太起來了。');
    }
    await ctx.say('蒙面人退開幾步，扯下面巾——竟是嚴守拙。', ...yan('三夜都守住了，最後一夜還接得住我的掌。'), `——${dateText(day())}　${timeText(st().world.time)}`);
    await trialPass(ctx, 1);
  },
  // 蘇芷蘅：採三味藥（藥草在後山，見 herbAt）
  async (ctx) => {
    ctx.setFlag('mq_herbs', 0);
    await ctx.say(...su('藥草要親手採，連根帶土，別弄斷了根鬚。採齊了再來找我。'), '（到後山採三味藥：鳴泉源頭的泉心草、劍塚旁的鐵骨藤、望江台崖邊的雲根芝）');
  },
];

const HERBS = [
  { id: 'quanxin', bit: 1, name: '泉心草', where: '鳴泉源頭', nature: '性寒，生在泉眼的石縫裡' },
  { id: 'tiegu', bit: 2, name: '鐵骨藤', where: '劍塚旁', nature: '性溫，能續筋接骨' },
  { id: 'yungen', bit: 4, name: '雲根芝', where: '望江台崖邊', nature: '性平，長在崖邊的雲氣裡' },
];

/** 後山的藥草：蘇芷蘅的試煉進行中、還沒採到時才出現 */
export const herbVisible = (id: string) => (f: Record<string, number>) => f.mq_mt === 3 && !(f.mq_herbs & HERBS.find((h) => h.id === id)!.bit);

export const herbAt =
  (id: string): Script =>
  async (ctx) => {
    const h = HERBS.find((x) => x.id === id)!;
    if (id === 'yungen' && !ctx.flag('mq_herb_boar')) {
      if ((await ctx.battle('trial_boar')) !== 'win') return;
      ctx.setFlag('mq_herb_boar');
      await ctx.say('護藥山豬哼哼兩聲，鑽進林子裡去了。');
    }
    ctx.setFlag('mq_herbs', ctx.flag('mq_herbs') | h.bit);
    ctx.refresh();
    await ctx.say(`你小心地連根帶土，採下了一株${h.name}。\n（${h.name}${h.nature}）`);
  };

async function trueCeremony(ctx: EventCtx) {
  const m = MASTERS[ctx.flag('mq_master') - 1];
  await ctx.say(
    ...wen(`${m.name}都跟我說了。好，好。`),
    '大殿裡點起了香。你在祖師像前叩首，又轉身向師父行了拜師禮。',
    ...wen(`從今日起，你是鳴泉劍派的真傳弟子，${m.name}的親傳徒弟。`),
  );
  st().updateWorld((w) => {
    promote(w);
    w.sect!.master = m.id;
  });
  ctx.setFlag('mq_master', 0);
  ctx.setFlag('mq_true');
  await ctx.hero((h) => [learnSkill(h, m.skill), giveItem(h, 'jinchuang', 3)]);
  await ctx.say('師父親手替你披上一件青紋道袍。');
  await issueUniform(ctx, 3);
  await ctx.say(
    ...MASTER_LINES[MASTERS.indexOf(m)](`這門「${SKILLS[m.skill].name}」，往後每天來找我請教。`),
    ...wen('疏桐下山多年，她的房間空著，你先搬進真傳弟子房・二吧。'),
    '（成為真傳弟子：住處改為真傳弟子房・二，月例提高；離開師門只能闖「泉音劍陣」）',
  );
}

/** 真傳弟子房・二的床 */
export const cellBed: Script = async (ctx) => {
  if (!member() || sect().rank < 3) {
    await ctx.say('真傳弟子的床鋪，被褥是上好的棉布。');
    return;
  }
  await rest(ctx, 3, '你在真傳弟子房的床。要躺下休息嗎？', () => wakeLines('cell'), true);
};

// ── 弟子服 ──────────────────────────────────────────────

/** 現在的身分該有的弟子服都在身上或行囊裡了嗎 */
const hasUniform = (h: Character, rank: number) => MQ_UNIFORMS[rank].every((id) => h.items[id] || Object.values(h.gear ?? {}).includes(id));

/**
 * 發這個身分的弟子服：收回舊的（腰牌留著），發新的。
 * 欄位空著、或身上那件品級比較差，就直接換上；不然放進行囊。
 */
async function issueUniform(ctx: EventCtx, rank: number) {
  const ids = MQ_UNIFORMS[rank];
  await ctx.hero((h) => {
    takeSectGear(h, SECT, MQ_UNIFORMS.flat().filter((id) => !ids.includes(id)));
    const lines: string[] = [];
    for (const id of ids) {
      const worn = Object.values(h.gear ?? {}).includes(id);
      if (worn) continue;
      if (!h.items[id]) h.items[id] = 1;
      const slot = slotsFor(id)[0];
      const cur = h.gear?.[slot];
      if (h.items[id] && (!cur || ITEMS[cur].gear!.grade < ITEMS[id].gear!.grade)) {
        equipGear(h, id, slot);
        lines.push(`領到了「${ITEMS[id].name}」，當場換上。`);
      } else if (h.items[id]) lines.push(`領到了「${ITEMS[id].name}」。（放在行囊裡，到選單「人物 › 裝備」換上）`);
    }
    // 腰牌也繫上
    if (h.items.mq_token && !h.gear?.neck) {
      equipGear(h, 'mq_token', 'neck');
      lines.push('順手把鳴泉腰牌繫在頸上。');
    }
    return lines;
  });
}

// ── 離開師門 ────────────────────────────────────────────

async function leaveSect(ctx: EventCtx) {
  const s = sect();
  const rules = MINGQUAN.ranks[s.rank].leave;
  await ctx.say(...duty(`這事得稟告掌門……以你${rankName(s)}的身分，按門規：${rules.map(leaveRuleText).join('，或')}。`));
  const free = rules.find((r) => r.kind === 'free');
  const fine = rules.find((r) => r.kind === 'fine');
  if (free) {
    const c = await ctx.ask(duty('真的要離開鳴泉劍派嗎？離開之後，就不能再回來拜師了。')[0], ['我意已決', '再想想']);
    if (c !== 0) return;
  } else if (fine && fine.kind === 'fine') {
    const c = await ctx.ask(duty(`要繳 ${fine.silver} 兩罰金離開師門嗎？離開之後，就不能再回來了。（目前有 ${st().hero.silver} 兩）`)[0], ['繳罰金離開', '再想想']);
    if (c !== 0) return;
    if (st().hero.silver < fine.silver) {
      await ctx.say(...duty('銀兩不夠。'));
      return;
    }
    await ctx.hero((h) => {
      h.silver -= fine.silver;
    });
  } else {
    await ctx.say(...duty('泉音劍陣還沒佈好，這事改天再說吧。'), '（闖陣脫離之後開放）');
    return;
  }
  await ctx.say(
    `${MQ.ke}進了內堂，過了好一會兒，聞松年走了出來。`,
    ...wen('人各有志，我不強留。', '本門的武功你可以留著，但記住第五條門規：不得外傳。', '下山去吧。'),
    '你把鳴泉腰牌放在供桌上，向祖師像拜了一拜，轉身離開了大殿。',
  );
  st().updateWorld((w) => {
    w.leftSects = [...(w.leftSects ?? []), SECT];
    delete w.sect;
  });
  ctx.setFlag('mq_join', 0);
  ctx.setFlag('mq_left');
  // 腰牌與弟子服都留下
  await ctx.hero((h) => {
    takeSectGear(h, SECT);
  });
}

// ── 大殿：值殿弟子柯靜言（門規、月例、弟子名冊、離開師門） ───

/** 弟子名冊：一個位階一頁 */
async function readRoster(ctx: EventCtx) {
  const hero = st().hero;
  await ctx.say(
    ...duty('弟子名冊在這兒，本門上下都記在上頭。'),
    ...roster(MINGQUAN, st().world.sect, hero.name, st().world).map((g) => ({
      text: `【${g.rank}】\n${g.members.map((m) => `${m.name}${m.role && !m.me ? `　${m.role}` : ''}${m.me ? '（你）' : ''}${m.note ? `（${m.note}）` : ''}`).join('\n')}`,
    })),
    ...duty('記名弟子還有十來個，名冊上就不一一列了。'),
  );
}

export const dutyTalk: Script = async (ctx) => {
  if (!member()) {
    await ctx.say(...duty(`在下${MQ.ke}，在大殿值守。`, '這裡是大殿，掌門與長老議事、收徒入門都在這裡。'));
    if (!ctx.flag('mq_left')) await ctx.say(...duty('想拜入本門，先去演武廣場找大師兄，過了入門考驗再來拜見掌門。'));
    if ((await ctx.ask(duty('想看看本門的弟子名冊嗎？')[0], ['看看', '不必了'])) === 0) await readRoster(ctx);
    return;
  }
  const s = sect();
  // 舊存檔或弄丟了：補發這個身分的弟子服
  if (!hasUniform(st().hero, s.rank)) {
    await ctx.say(...duty('你的弟子服還沒領吧？拿去，在門裡要穿得整整齊齊。'));
    await issueUniform(ctx, s.rank);
  }
  const ready = day() >= nextStipendDay(s);
  const posts = postHook?.can() ? ['職位的差事'] : [];
  const c0 = await ctx.ask(duty('師兄弟有什麼事？')[0], [...posts, '請教門規', ready ? '領月例' : '領月例（還沒到日子）', '弟子名冊', '捐銀給公庫', '離開師門', '沒事']);
  if (posts.length && c0 === 0) return postHook!.run(ctx);
  const c = c0 - posts.length;
  if (c === 2) await readRoster(ctx);
  else if (c === 3) await donateSilver(ctx);
  else if (c === 4) await leaveSect(ctx);
  else if (c === 0) {
    await ctx.say(
      ...duty('門規就掛在祖師像旁，一共五條：'),
      ...MINGQUAN.rules.map((r, i) => ({ text: `${'一二三四五'[i]}、${r.name}\n${r.desc}` })),
      ...duty('犯了門規，輕則罰掃地，重則上思過崖面壁。'),
    );
  } else if (c === 1) {
    if (!ready) {
      await ctx.say(...duty(`月例每 ${STIPEND_DAYS} 天領一次，${dateText(nextStipendDay(s))}再來吧。`));
      return;
    }
    const pay = MINGQUAN.ranks[s.rank].stipend;
    // 擔任職位（執事、長老、掌門）另有加給；月例從公庫出，公庫見底只發一半
    const bonus = MINGQUAN.stipendBonus?.(st().world) ?? 0;
    const rate = payRate(fundOf(st().world));
    const silver = Math.ceil((pay.silver + bonus) * rate);
    st().updateWorld((w) => {
      w.sect!.stipendDay = w.day;
      book(fundOf(w), 'out', 'pay', silver);
    });
    await ctx.say(
      ...duty(
        fundOf(st().world).silver <= 0
          ? `公庫見底了，這回的月例${bonus ? '連同加給' : ''}只能先發一半，委屈你了。`
          : `這是${rankName(s)}的月例${bonus ? '，連同職位的加給' : ''}，收好。${
              (fundOf(st().world).payScale ?? 1) > 1 ? '掌門吩咐，這陣子月例多發兩成。' : (fundOf(st().world).payScale ?? 1) < 1 ? '掌門吩咐，這陣子月例先少發兩成。' : ''
            }`,
      ),
    );
    await ctx.hero((h) => {
      h.silver += silver;
      return [`獲得銀兩 ${silver} 兩。`, ...Object.entries(pay.items ?? {}).map(([id, n]) => giveItem(h, id, n))];
    });
  }
};

/** 捐銀給公庫：每 20 兩換 1 點門派貢獻（只加貢獻，不算功績） */
async function donateSilver(ctx: EventCtx) {
  const f = fundOf(st().world);
  const have = st().hero.silver;
  const amounts = [50, 200, 1000].filter((n) => n <= have);
  if (!amounts.length) return void (await ctx.say(...duty('心意領了。你身上的銀子還是留著自己用吧。')));
  const i = await ctx.ask(duty(`公庫眼下${MOOD_NAME[fundMood(f)]}。要捐多少？（每 20 兩記 1 點門派貢獻）`)[0], [...amounts.map((n) => `${n} 兩`), '算了']);
  if (i >= amounts.length) return;
  const n = amounts[i];
  st().updateHero((h) => (h.silver -= n));
  st().updateWorld((w) => {
    book(fundOf(w), 'in', 'donate', n);
    w.sect!.contrib += Math.floor(n / 20);
  });
  await ctx.say(...duty(`${n} 兩，我記在帳上了。`), `（門派貢獻 +${Math.floor(n / 20)}；捐輸只算貢獻，不算功績）`);
}

// ── 書房 ────────────────────────────────────────────────

export const keeperTalk: Script = async (ctx) => {
  if (!member()) {
    await ctx.say(...keeper(`在下${MQ.song}，管著書房。`, '書房只給本派弟子用。大門派有藏經閣，咱們鳴泉劍派小，一間書房就夠了。'));
    return;
  }
  const c = await ctx.ask(keeper('要找什麼書？')[0], ['抄錄本門武功', '書房的規矩', '沒事']);
  if (c === 1) {
    await ctx.say(
      ...keeper('書架上的書都可以讀，每天讀一陣子，對參悟招式大有好處。讀本門的劍譜心法，收穫更多。', '本門武功要抄錄才能帶回去練，抄錄要用門派貢獻換。', '書不能帶出書房——這是第四條門規。'),
    );
    return;
  }
  if (c !== 0) return;
  const hero = st().hero;
  const list = MINGQUAN.skills.filter((k) => !hero.skills.some((s) => s.id === k.id));
  if (!list.length) {
    await ctx.say(...keeper('本門的武功你都抄過了。往後的上乘武功，要真傳弟子拜了師才學得到。'));
    return;
  }
  const s = sect();
  const i = await ctx.ask(
    keeper(`你目前有 ${s.contrib} 點門派貢獻。要抄錄哪一門？`)[0],
    [...list.map((k) => `${SKILLS[k.id].name}（${SKILLS[k.id].kind}・${MINGQUAN.ranks[k.rank].name}・${k.cost} 貢獻）`), '算了'],
  );
  if (i >= list.length) return;
  const k = list[i];
  const def = SKILLS[k.id];
  if (s.rank < k.rank) {
    await ctx.say(...keeper(`「${def.name}」要${MINGQUAN.ranks[k.rank].name}才能抄錄。`));
    return;
  }
  if (s.contrib < k.cost) {
    await ctx.say(...keeper(`貢獻不夠，還差 ${k.cost - s.contrib} 點。`, '跟大師兄做晨課、替門裡做事，都能攢貢獻。'));
    return;
  }
  const ok = await st().askConfirm(`花 ${k.cost} 點門派貢獻抄錄「${def.name}」？`, '抄錄');
  if (!ok) return;
  st().updateWorld((w) => (w.sect!.contrib -= k.cost));
  ctx.pass(8);
  await ctx.say(`你在書案前坐下，一筆一劃地把「${def.name}」抄了下來，花了一個時辰。\n${def.desc}`);
  await ctx.hero((h) => learnSkill(h, k.id));
};

/** 本派劍譜的書架：研讀一次兩刻、體力 10 */
export const libShelf: Script = withCost(() => (member() && studyable(st().hero).length ? { ke: 2, stamina: STAMINA.study } : null), async (ctx) => {
  if (!member()) {
    await ctx.say('本派的劍譜與心法抄本，按入門先後排列。', ...keeper('這位朋友，書房只給本派弟子用。'));
    return;
  }
  const ready = studyable(st().hero);
  if (!ready.length) {
    await ctx.say('本派的劍譜與心法抄本，按入門先後排列。\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）');
    return;
  }
  const i = await ctx.ask('要對照哪一門武功研讀？（本門武功收穫更多）', [...ready.map((s) => `${skillDef(s).name}（領悟 ${s.insight}%）`), '算了']);
  if (i >= ready.length) return;
  const id = ready[i].id;
  const amount = isSectSkill(id) ? 24 : 15;
  const n = await askRounds(ctx, STAMINA.study, '讀', roundsToInsight(st().hero, ready[i], amount));
  if (!n) return;
  if (!(await exert(ctx, STAMINA.study * n, '在書房讀了好一陣子，腦袋有些發脹。'))) return;
  ctx.pass(2 * n);
  await ctx.say(`你從架上取下抄本，對照著「${skillDef(ready[i]).name}」的招式反覆推敲……${roundsNote('讀', n, 2)}`);
  await ctx.hero((h) => studyInsight(h, id, amount, n));
  await maybeDayEvent(ctx, 'study');
});

// ── 練功：廣場木樁、練功房的鐵木人樁與蒲團 ─────────────────

/** 練功加經驗（悟性越高加越多），回傳提示文字 */
function gainSkillText(h: Character, id: string, amount: number): (string | null)[] {
  const s = h.skills.find((k) => k.id === id)!;
  const name = skillDef(s).name;
  if (s.level >= skillCap(s)) return [`「${name}」已經練到上限，要突破才能再進一步。`];
  const gained = Math.round(amount * (1 + attrs(h).insight / 40));
  return [`「${name}」經驗 +${gained}。`, gainSkill(h, id, gained, false)];
}

/** 練樁：選一門裝備中、還沒練到上限的外功；一次兩刻 */
/** 練外功（木樁、鐵木樁、跟同門一起練都用這個）：bonus 是另外多的成長比例 */
export async function practice(ctx: EventCtx, amount: number, stamina: number, bonus = 0) {
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s));
  if (!list.length) {
    await ctx.say('（要裝備著還沒練到上限的外功，才能在這裡練）');
    return;
  }
  const i = await ctx.ask('要練哪一門？（本門武功收穫更多）', [...list.map((s) => `${skillDef(s).name}（第 ${s.level} 重）`), '算了']);
  if (i >= list.length) return;
  const id = list[i].id;
  const per = Math.round((isSectSkill(id) ? amount + 10 : amount) * (1 + bonus));
  const n = await askRounds(ctx, stamina, '練', roundsToCap(list[i], Math.round(per * (1 + attrs(st().hero).insight / 40))));
  if (!n) return;
  if (!(await exert(ctx, stamina * n, '手臂都快抬不起來了，虎口也震得發麻。'))) return;
  ctx.pass(2 * n);
  await ctx.say(`「啪、啪、啪——」你對著木樁一招一式地練了起來。${roundsNote('練', n, 2)}`);
  await ctx.hero((h) => gainSkillText(h, id, per * n));
  await maybeDayEvent(ctx, 'drill');
}

/** 廣場的木樁在室外：下雨、下雪天練起來更累 */
const RAIN_EXTRA = 5;
const wet = (w: World) => w.weather === 'rain' || w.weather === 'snow';
const yardStamina = (w: World = st().world) => STAMINA.dummy + (wet(w) ? RAIN_EXTRA : 0);

export const yardStake: Script = withCost(() => (member() ? { ke: 2, stamina: yardStamina(), note: wet(st().world) ? (st().world.weather === 'snow' ? '下雪，比平常累' : '下雨，比平常累') : undefined } : null), async (ctx) => {
  if (!member()) {
    await ctx.say('木樁上滿是劍痕。\n（這是鳴泉弟子練功用的木樁，拜入門下之後才能用）');
    return;
  }
  const rain = wet(st().world);
  const c = await ctx.ask(rain ? (st().world.weather === 'snow' ? '廣場上的木樁林積了一層雪，踩上去又冷又滑。' : '廣場上的木樁林。雨打在身上，練起來格外吃力。') : '廣場上的木樁林。', [`練樁（兩刻・體力 ${yardStamina()}）`, `找同門過招（一刻・體力 ${STAMINA.spar}）`, '算了']);
  if (c === 0) await practice(ctx, 30, yardStamina());
  else if (c === 1) await drill(ctx);
});

/** 找同門過招：從名冊上挑一位同級或高一級的師兄弟，強弱跟你差不多 */
async function drill(ctx: EventCtx) {
  const myRank = sect().rank;
  const rankOf = (r: string) => MINGQUAN.ranks.findIndex((x) => x.name === r);
  const pool = Object.entries(MQ_MEMBERS).filter(([, m]) => {
    const r = rankOf(m.rank);
    return r >= 0 && r <= myRank + 1 && !('note' in m);
  });
  const [id, m] = pool[Math.floor(Math.random() * pool.length)];
  if (!(await exert(ctx, STAMINA.spar, '已經累得喘不過氣，這時候過招只會挨打。'))) return;
  const sprite = { gu: 'disciple_girl', miao: 'lady', lu: 'sect_senior', zheng: 'farmer' }[id] ?? 'disciple';
  // 身分越高的同門會的招式越多
  const moves = ['e_slash', 'quanyong', ...(rankOf(m.rank) >= 1 ? ['feipu'] : []), ...(rankOf(m.rank) >= 2 ? ['shiliu'] : [])];
  const h = st().hero;
  await ctx.say(`${m.name}正好在一旁練劍，看見你走過來，收了劍勢。`);
  const o = await ctx.battle(setupDrill(heroUnit(h, derive(h)), { name: m.name, sprite }, moves));
  if (o === 'win') await ctx.say({ speaker: m.name, text: '好功夫！改天再來討教。' });
  else if (o === 'lose') await ctx.say({ speaker: m.name, text: '承讓了。你的劍再穩一點就好。' });
  else await ctx.say(`你收劍認輸，${m.name}笑著點了點頭。`);
  const person = 'person' in m ? m.person : undefined;
  if (person) addAff(person, o === 'win' ? 2 : 1);
}

export const ironStake: Script = withCost(() => (member() && sect().rank >= 1 ? { ke: 2, stamina: 25 } : null), async (ctx) => {
  if (!member() || sect().rank < 1) {
    await ctx.say('包了鐵皮的木人樁，比廣場上的木樁沉得多。', { speaker: MQ.qi, text: '鐵木樁是給正式弟子練的，記名弟子先在廣場上把基本功練紮實。' });
    return;
  }
  await practice(ctx, 55, 25);
});

export const cushion: Script = withCost(() => (member() ? { ke: 2, stamina: STAMINA.sit } : null), async (ctx) => {
  if (!member()) {
    await ctx.say('打坐用的蒲團。\n（拜入鳴泉之後，可以在這裡打坐修練內功）');
    return;
  }
  await sitDown(ctx);
});

/** 打坐（蒲團、跟同門一起打坐都用這個）：bonus 是另外多的成長比例 */
export async function sitDown(ctx: EventCtx, bonus = 0) {
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'inner' && s.level < skillCap(s));
  const per = (id: string) => Math.round((isSectSkill(id) ? 30 : 20) * (1 + bonus));
  const gain = (s: (typeof list)[number]) => Math.round(per(s.id) * (1 + attrs(st().hero).insight / 40));
  // 內功都練到上限了，打坐只為回內力：一回就夠
  const max = list.length ? Math.max(...list.map((s) => roundsToCap(s, gain(s)))) : 1;
  const n = await askRounds(ctx, STAMINA.sit, '坐', max);
  if (!n) return;
  if (!(await exert(ctx, STAMINA.sit * n, '坐得腿都麻了，心也靜不下來。'))) return;
  ctx.pass(2 * n);
  await ctx.say(`你盤膝坐下，閉目調息。泉聲從窗外隱隱傳來，心思漸漸沉靜……${roundsNote('坐', n, 2)}`);
  await ctx.hero((h) => {
    const d = derive(h);
    h.qi = d.maxQi;
    h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.2 * n));
    const out: (string | null)[] = ['（內力完全恢復，氣血也恢復了一些）'];
    for (const s of list) out.push(...gainSkillText(h, s.id, per(s.id) * n));
    if (!list.length) out.push('（裝備著還沒練到上限的內功，打坐時才會精進）');
    return out;
  });
  await maybeDayEvent(ctx, 'rest');
}

// ── 宿舍 ────────────────────────────────────────────────

export const dormBed: Script = async (ctx) => {
  if (ctx.flag('mq_left')) {
    await ctx.say('一張空床鋪。你已經不是鳴泉弟子了。');
    return;
  }
  const mine = member() && sect().rank === 0;
  if (member() && !mine) {
    await ctx.say('一張空床鋪，已經不是你的鋪位了。');
    return;
  }
  await rest(ctx, 1, mine ? '你的鋪位。要躺下休息嗎？' : '大通鋪最裡頭的空鋪，借給上山應考的人住。要躺下休息嗎？', mine ? () => wakeLines('dorm') : undefined, mine);
};

/** 在門派宿舍睡到天亮：卯時被同門叫醒去晨課（跟顧小滿熟了，她會跑來叫你） */
function wakeLines(where: 'dorm' | 'room' | 'cell'): (Line | string)[] | undefined {
  if (!member()) return undefined;
  if (isXunxiu(day())) return ['今天旬休，不用上晨課。你翻了個身，又賴了一會兒床。'];
  const name = st().hero.given;
  if (where !== 'cell' && (st().world.relations.xiaoman?.aff ?? 0) >= 30)
    return ['門外傳來砰砰的敲門聲。', { speaker: MQ.gu, text: `${name}師兄！再不起來，晨課就要遲到啦！` }];
  if (where === 'dorm') return [`${MQ.tang}把你搖醒。`, { speaker: MQ.tang, text: '該起了，大師兄已經在廣場上等著晨課了。' }];
  if (where === 'room') return [`${MQ.he}一邊打哈欠，一邊踢了踢你的床腳。`, { speaker: MQ.he, text: '起了起了，晨課別遲到。' }];
  return ['隔壁傳來陸鳴川的聲音。', { speaker: MQ.lu, text: '師弟，晨課了。' }];
}

/** 知客弟子方硯清：迎客、指路 */
export const greeterTalk: Script = async (ctx) => {
  const g = by(MQ.fang);
  if (member()) {
    await ctx.say(...g(isXunxiu(day()) ? '今天旬休，不少師兄弟都下山趕集去了。' : '師兄弟早。大師兄在演武廣場帶晨課，去晚了可要挨罵。'));
    return;
  }
  if (ctx.flag('mq_left')) {
    await ctx.say(...g('……你回來看看？四處走走無妨，只是別亂闖禁地。'));
    return;
  }
  ctx.setFlag('mq_seek');
  await ctx.say(
    ...g(`在下${MQ.fang}，在此知客。`, '這位朋友是來拜師的吧？本派收徒不拘時日，過得了入門考驗就行。'),
    ...g('大師兄陸鳴川在演武廣場，找他應考就是。', '掌門居與後山的思過崖不可擅入，其他地方可以四處看看。'),
  );
};

// ── 任務榜：門內雜務、下山委託 ───────────────────────────

const CHORE_REWARD = 3;
const choreDef = (id: string) => MINGQUAN.chores.find((c) => c.id === id)!;

/** 今天任務榜上貼出的雜務：每天輪換三件 */
export const todaysChores = (d: number) => [0, 2, 4].map((i) => MINGQUAN.chores[(d + i) % MINGQUAN.chores.length]);

/** 做雜務時的情景與額外的小獎勵 */
/**
 * 做雜務時的情景：intro 是動畫之前說的話（例如交辦的人先打招呼），lines 是做完之後的情景；
 * grow 是順帶練到的東西——武功（裝備中的哪一類）或生活技能，加得不多。
 */
const CHORE_DONE: Record<
  string,
  { intro?: Line[]; lines: (Line | string)[]; bonus?: [string, number]; grow: { slot: Slot; exp: number } | { craft: CraftId; exp: number } }
> = {
  water: {
    lines: ['你挑起扁擔，在山泉與廚房之間來回了十幾趟，總算把水缸挑滿了。', '肩膀火辣辣地疼，腳步倒是越走越穩。'],
    grow: { slot: 'light', exp: 10 },
  },
  sweep: {
    intro: [{ speaker: MQ.cao, text: '太好了！今天換你掃！' }, { text: '曹小豆把掃帚塞進你手裡，一溜煙跑了。' }],
    lines: ['你把大殿前的平台從東掃到西，連石縫裡的落葉都掃乾淨了。', '掃帚揮久了，手腕倒是越來越活。'],
    grow: { slot: 'outer', exp: 10 },
  },
  herbs: {
    lines: ['你把晾藥架上的草藥一一翻面、攤開曬勻，順便記住了好幾味藥的名字。', { speaker: MQ.miao, text: '辛苦了，這株止血草你拿去。' }],
    bonus: ['herb', 1],
    grow: { craft: 'learning', exp: 6 },
  },
  books: {
    lines: ['你把散亂的書冊照年代排好，順手翻了幾頁江湖掌故。', '書上說，百年前江湖上有個劍客，一劍斷江……多半是說書人的誇張。'],
    grow: { craft: 'learning', exp: 8 },
  },
  garden: {
    lines: ['你提著水桶到後頭菜圃澆水、拔草，還抓走了好幾條菜蟲。', '哪些菜該摘、哪些還得等，你也看出了一點門道。', { speaker: MQ.bu, text: '不錯不錯！這幾把青菜拿去，算是賞你的。' }],
    bonus: ['greens', 3],
    grow: { craft: 'cooking', exp: 6 },
  },
};

/** 雜務順帶的成長：武功挑裝備中、還沒到上限的那一門；生活技能直接加經驗 */
export function choreGrowth(h: Character, g: (typeof CHORE_DONE)[string]['grow']): (string | null)[] {
  if ('craft' in g) {
    const up = gainCraft(h, g.craft, g.exp);
    return [`（${craftDef(g.craft).name}經驗 +${g.exp}）`, up];
  }
  const s = h.skills.find((k) => isEquipped(k) && slotOf(skillDef(k).kind) === g.slot && k.level < skillCap(k));
  const kind = { outer: '外功', inner: '內功', light: '輕功' }[g.slot];
  return s ? gainSkillText(h, s.id, g.exp) : [`（裝備著還沒練到上限的${kind}，做這件雜務也能順便練一練）`];
}

async function doChore(ctx: EventCtx, id: string) {
  const d = CHORE_DONE[id];
  if (!(await exert(ctx, STAMINA.chore, '累得手腳發軟，這活兒今天是幹不動了。'))) return;
  if (d.intro) await ctx.say(...d.intro);
  await ctx.work(id as WorkKind, `${choreDef(id).name}中……`);
  ctx.pass(8);
  await ctx.say(...d.lines, '（做了一個時辰）');
  await ctx.say(finishChore(id).filter(Boolean).join('\n'));
  await maybeDayEvent(ctx, 'chore');
}

/** 雜務做完的結算（成長、記下今天做過、小獎勵、貢獻）；日課表照做時也用這個。回傳提示文字 */
function finishChore(id: string): (string | null)[] {
  const d = CHORE_DONE[id];
  // 晴天曬藥曬得好，蘇青苗多給一株
  const sunny = id === 'herbs' && st().world.weather === 'clear' ? 1 : 0;
  const out = st().updateHero((h) => [
    ...choreGrowth(h, d.grow),
    d.bonus ? giveItem(h, d.bonus[0], d.bonus[1] + sunny) : null,
    sunny ? '（大晴天，藥曬得又快又好）' : null,
  ]);
  st().updateWorld((w) => {
    delete w.sect!.chore;
    for (const key of [choreKey(SECT), `${choreKey(SECT)}:${id}`]) w.daily[key] = { day: w.day, n: usedToday(w, key) + 1 };
  });
  return [...out, st().updateWorld((w) => addContrib(w, CHORE_REWARD))];
}

/** 雜務的地點：手上有這件雜務就去做，否則照常查看或交談 */
export const choreAt =
  (id: string, otherwise: Line[] | Script): Script =>
    withCost(
      () => (member() && sect().chore === id ? { ke: 8, stamina: STAMINA.chore, note: choreDef(id).name } : null),
      async (ctx) => {
        if (member() && sect().chore === id) return doChore(ctx, id);
        if (typeof otherwise === 'function') return otherwise(ctx);
        await ctx.say(...otherwise);
      },
    );

async function choreBoard(ctx: EventCtx) {
  const s = sect();
  const per = MINGQUAN.choresPerDay;
  if (s.chore) {
    const d = choreDef(s.chore);
    const c = await ctx.ask(`你手上還有「${d.name}」沒做完（${d.where}）。`, ['這就去', '放棄這件']);
    if (c === 1) {
      st().updateWorld((w) => delete w.sect!.chore);
      await ctx.say(`你把「${d.name}」的籤條掛回任務榜上。`);
    }
    return;
  }
  const done = usedToday(st().world, choreKey(SECT));
  if (done >= per) {
    await ctx.say(`今天貼出來的 ${per} 件雜務都做完了。\n（明天再來。過了半夜就是新的一天）`);
    return;
  }
  const list = todaysChores(day()).filter((c) => !usedToday(st().world, `${choreKey(SECT)}:${c.id}`));
  const i = await ctx.ask(`今天的雜務（已做 ${done}/${per} 件，每件一個時辰、體力 ${STAMINA.chore}，門派貢獻 +${CHORE_REWARD}）`, [...list.map((c) => `${c.name}（${c.where}）`), '算了']);
  if (i >= list.length) return;
  st().updateWorld((w) => (w.sect!.chore = list[i].id));
  await ctx.say(`你揭下「${list[i].name}」的籤條。\n（地點：${list[i].where}）`);
}

interface Commission {
  flag: string;
  title: string;
  /** 幾級身分才能接 */
  rank: number;
  brief: string;
  /** 進行中時的提示 */
  hint: string;
  reward: { contrib: number; fame: number };
  onAccept?: (ctx: EventCtx) => Promise<void>;
}

const COMMISSIONS: Commission[] = [
  {
    flag: 'mq_c_path',
    title: '清理山道',
    rank: 0,
    brief: '鳴泉山道上來了一群野狗，驚擾上山的香客與樵夫。下山把牠們趕走。',
    hint: '野狗群在鳴泉山道的半山腰。',
    reward: { contrib: 10, fame: 3 },
  },
  {
    flag: 'mq_c_med',
    title: '回春堂送藥',
    rank: 1,
    brief: '藥房配好了一包金創藥，要送到臨江城的回春堂。回春堂的掌櫃會在店門口等。',
    hint: '把藥包送到臨江城的回春堂。',
    reward: { contrib: 15, fame: 2 },
    onAccept: async (ctx) => {
      await ctx.say({ speaker: MQ.miao, text: '藥包在這兒，路上小心，別淋濕了。' });
      await ctx.hero((h) => giveItem(h, 'mq_medpack'));
    },
  },
];

async function commissionBoard(ctx: EventCtx) {
  const list = COMMISSIONS.filter((c) => ctx.flag(c.flag) < 3);
  if (!list.length) {
    await ctx.say('目前沒有新的下山委託。');
    return;
  }
  const status = (c: Commission) =>
    sect().rank < c.rank ? `${MINGQUAN.ranks[c.rank].name}起` : ['可接', '進行中', '可覆命'][ctx.flag(c.flag)];
  const i = await ctx.ask('下山委託', [...list.map((c) => `${c.title}（${status(c)}）`), '算了']);
  if (i >= list.length) return;
  const c = list[i];
  const f = ctx.flag(c.flag);
  if (sect().rank < c.rank) {
    await ctx.say(`「${c.title}」：${c.brief}\n（${MINGQUAN.ranks[c.rank].name}才能接）`);
    return;
  }
  if (f === 1) {
    await ctx.say(`「${c.title}」還沒辦完。\n（${c.hint}）`);
    return;
  }
  if (f === 2) {
    ctx.setFlag(c.flag, 3);
    await ctx.say(`你在任務榜上記下「${c.title}」已經辦妥。`);
    await ctx.hero((h) => addFame(h, c.reward.fame));
    await contrib(ctx, c.reward.contrib);
    return;
  }
  const ok = await ctx.ask(`「${c.title}」：${c.brief}\n（門派貢獻 +${c.reward.contrib}、名聲 +${c.reward.fame}）`, ['接下', '算了']);
  if (ok !== 0) return;
  ctx.setFlag(c.flag, 1);
  await ctx.say(`你揭下「${c.title}」的籤條。`);
  await c.onAccept?.(ctx);
}

/** 演武廣場的任務榜 */
export const taskBoard: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('鳴泉劍派的任務榜，貼著門內的雜務與下山委託。\n（本門弟子才能接）');
    return;
  }
  const c = await ctx.ask('鳴泉劍派任務榜。做雜務、辦委託都能攢門派貢獻。', ['門內雜務', '下山委託', '算了']);
  if (c === 0) await choreBoard(ctx);
  else if (c === 1) await commissionBoard(ctx);
};

/** 委託「清理山道」：山道上的野狗群 */
export const pathDogs: Script = async (ctx) => {
  const o = await ctx.battle('mq_path_dogs');
  if (o !== 'win') return;
  ctx.setFlag('mq_c_path', 2);
  ctx.refresh();
  await ctx.say('野狗群夾著尾巴逃下山去了。', { speaker: '樵夫', text: '多謝鳴泉的少俠！這下總算能安心砍柴了。' }, '（回門派的任務榜覆命）');
};

/** 委託「回春堂送藥」：回春堂掌櫃在店門口等藥 */
export const huichunDelivery: Script = async (ctx) => {
  const g = by('白濟仁');
  await ctx.say(...g('可把鳴泉的藥盼來了！最近城裡跌打損傷的人多，金創藥一下就賣光了。'), '你把藥包交給掌櫃。');
  await ctx.hero((h) => {
    delete h.items.mq_medpack;
    h.silver += 10;
    return '掌櫃塞給你 10 兩跑腿錢。';
  });
  ctx.setFlag('mq_c_med', 2);
  ctx.refresh();
  await ctx.say(...g('替我向聞掌門問好。'), '（回門派的任務榜覆命）');
};

const commissionQuest = (c: Commission) => ({
  id: c.flag,
  title: `鳴泉委託・${c.title}`,
  status(f: Record<string, number>): { text: string; done: boolean } | null {
    if (f[c.flag] === 3) return { text: `${c.brief}——已經辦妥。`, done: true };
    if (f[c.flag] === 2) return { text: '事情辦完了。回鳴泉劍派的任務榜覆命。', done: false };
    if (f[c.flag] === 1) return { text: `${c.brief}\n${c.hint}`, done: false };
    return null;
  },
});
export const COMMISSION_QUESTS = COMMISSIONS.map(commissionQuest);

// ── 繳納：把打獵、採藥得來的東西交給門裡 ─────────────────

/** 繳納：有東西就收，交了回傳 true */
async function donate(ctx: EventCtx, who: string, item: string, n: number, reward: number, thanks: string): Promise<boolean> {
  const have = st().hero.items[item] ?? 0;
  if (have < n) {
    await ctx.say(...by(who)(`要 ${n} 份「${ITEMS[item].name}」才收。你身上只有 ${have} 份。`));
    return false;
  }
  await ctx.hero((h) => {
    h.items[item] -= n;
    if (!h.items[item]) delete h.items[item];
  });
  await ctx.say(...by(who)(thanks));
  await contrib(ctx, reward);
  return true;
}

/** 有繳納可做的人：弟子可以選繳納或閒聊；其他人只閒聊 */
const giver =
  (who: string, item: string, n: number, reward: number, thanks: string, talks: Line[][]): Script => {
    let k = 0;
    return async (ctx) => {
      const chat = () => ctx.say(...talks[k++ % talks.length]);
      if (!member()) return chat();
      const c = await ctx.ask(by(who)('有什麼事？')[0], [`繳納${ITEMS[item].name}（${n} 份，貢獻 +${reward}）`, '閒聊']);
      if (c === 0) await donate(ctx, who, item, n, reward, thanks);
      else await chat();
    };
  };

export const herbalistTalk = giver(MQ.miao, 'herb', 3, 4, '止血草收下了，正好拿來配金創藥。', [
  by(MQ.miao)('我是管藥的蘇青苗。練武難免受傷，傷了就來藥房，別硬撐。', '後山有不少草藥，有空可以幫忙採一些。'),
  by(MQ.miao)('我姑姑蘇長老下山行醫去了，藥房暫時由我照看。', '我們的金創藥，可比山下回春堂的還好用。'),
]);

// ── 廚房：卜大勺發飯、教做菜、賣食材 ─────────────────────

/** 廚房賣的食材（野菌要自己上後山採） */
export const KITCHEN_STOCK = ['rice', 'flour', 'egg', 'tofu', 'greens', 'radish', 'chicken', 'redbean', 'sugar', 'osmanthus', 'sesame', 'almond'];
const MEAL_KEY = 'mq_meal';


/** 每天的大鍋飯：弟子一天領一份，行囊滿了領不了 */
async function dailyMealAt(ctx: EventCtx) {
  const b = by(MQ.bu);
  const d = dailyMeal(st().world.day);
  const fest = festivalMeal();
  if (usedToday(st().world, MEAL_KEY)) {
    await ctx.say(...b('今天的份你領過啦！明天再來，明天換別的菜。'));
    return;
  }
  if (!canHold(st().hero, d.id)) {
    await ctx.say(...b(`今天是${d.name}——欸，你身上塞得滿滿的，碗往哪兒擺？騰出點地方再來。`), '（行囊滿了，先賣掉或用掉一些吧）');
    return;
  }
  st().updateWorld((w) => (w.daily[MEAL_KEY] = { day: w.day, n: 1 }));
  if (fest) {
    await ctx.say(...b(fest.line));
    await ctx.hero((h) => giveItem(h, fest.id, fest.n));
    return;
  }
  await ctx.say(...b(`今天是${d.name}！趁熱吃。`));
  await ctx.hero((h) => giveItem(h, d.id));
}

/** 學做菜的學費：門派貢獻 */
async function payContrib(ctx: EventCtx, n: number): Promise<boolean> {
  if (!n) return true;
  if (sect().contrib < n) {
    await ctx.say(...by(MQ.bu)(`這道菜得花 ${n} 點門派貢獻，你現在只有 ${sect().contrib} 點。多做點雜務再來。`));
    return false;
  }
  st().updateWorld((w) => (w.sect!.contrib -= n));
  return true;
}

/** 跟卜大勺的交情：點頭之交起能用大灶、學入門與中等的菜，熟識學進階，知交學拿手菜 */
const buStage = () => stageOf(st().world.relations.bu?.aff ?? 0);
const BU_TIER = (s: number) => (s >= STAGE.CLOSE ? 3 : s >= STAGE.FAMILIAR ? 2 : s >= STAGE.NOD ? 1 : -1);

/** 卜大勺的劇情：菜圃雜務、弟子的選單；選「聊聊」就回 false，照一般交談（加熟悉度） */
async function buStory(ctx: EventCtx): Promise<boolean> {
  if (member() && sect().chore === 'garden') {
    await doChore(ctx, 'garden');
    return true;
  }
  if (!member()) return false;
  const meal = festivalMeal() ? ITEMS[festivalMeal()!.id] : dailyMeal(st().world.day);
  const c = await ctx.ask(by(MQ.bu)('餓了吧？')[0], [`領今天的飯（${meal.name}）`, '學做菜', '買食材', '繳納山豬肉（1 份，貢獻 +4）', '聊聊']);
  if (c === 0) await dailyMealAt(ctx);
  else if (c === 1) {
    const max = BU_TIER(buStage());
    if (max < 0) {
      await ctx.say(...by(MQ.bu)('學做菜？嘿，我的手藝可不是隨便教人的。', '先常來陪我聊聊，讓我看看你是不是那塊料。'), '（跟卜大勺熟到「點頭之交」才肯教菜）');
      return true;
    }
    const hint = max < 3 ? `跟卜大勺再熟一些（${max < 2 ? '熟識' : '知交'}），他才肯教更拿手的菜` : '';
    await teachDishes(ctx, MQ.bu, (n) => payContrib(ctx, n), () => craftOf(st().hero, 'cooking').level, { maxTier: max, hint }, { teaches: (d) => !d.sea && !d.lake });
  } else if (c === 2) await ctx.panel({ kind: 'shop', title: '伙房的食材', stock: KITCHEN_STOCK });
  else if (c === 3) {
    if (await donate(ctx, MQ.bu, 'boar_meat', 1, 4, '好大一塊山豬肉！今晚加菜！')) addAff('bu', 2);
  } else return false;
  return true;
}

/** 後山的野菌：採了就沒了，隔天才長出來（旗標 mq_mush_地點 記採的那一天）；誰都能採 */
export const mushroomGrown = (spot: string) => (f: Record<string, number>) => f[`mq_mush_${spot}`] !== f.today;
export const mushroomAt =
  (spot: string): Script =>
  async (ctx) => {
    ctx.setFlag(`mq_mush_${spot}`, st().world.day);
    ctx.refresh();
    ctx.pass(1);
    // 下雨天野菌冒得特別多；秋天也多一朵，冬天少一些
    const rain = st().world.weather === 'rain';
    const season = seasonOf(st().world.day);
    const n = Math.max(1, 1 + Math.floor(Math.random() * 3) + (rain ? 2 : 0) + (season === 'autumn' ? 1 : season === 'winter' ? -1 : 0));
    await ctx.say(rain ? '雨後的落葉底下冒出一大片野菌，你摘得手都滿了。' : '你撥開落葉，把肥嫩的野菌一朵朵摘了下來。');
    await ctx.hero((h) => giveItem(h, 'mushroom', n));
  };

/**
 * 霧天的奇事：清晨起霧時，後山泉源旁站著一位白髮老人（身分不明，刻意不寫名字），問你一個問題就走。
 * 旗標 mq_fog_old：見過老人是第幾天（同一天不再出現）
 */
export const fogElder: Script = async (ctx) => {
  const old = by('霧中老人');
  await ctx.say('濃霧裡，一位白髮老人背著手，靜靜看著泉水從石縫裡湧出來。', ...old('……年輕人，你也是來聽泉的？'));
  const c = await ctx.ask(old('你說這泉水，是快的好，還是不斷的好？')[0], ['快的好', '不斷的好', '泉水就是泉水']);
  const [line, pts] = (
    [
      ['快？快了，就斷了。', 1],
      ['「如泉不絕」……嗯，你是鳴泉的娃兒。記住了，不斷，比快難。', 3],
      ['哈哈哈！說得好。泉水就是泉水，劍也就是劍。', 5],
    ] as const
  )[c];
  await ctx.say(...old(line));
  ctx.setFlag('mq_fog_old', day());
  st().updateHero((h) => (h.points += pts));
  await ctx.say('一陣山風吹過，霧散了一些——', '泉邊空蕩蕩的，老人已經不見了。', `（武學點數 +${pts}）`);
  ctx.refresh();
};

/** 廚房的大灶：有鳴泉的泉水，做得了泉水涼麵、鳴泉清燉；要跟卜大勺有點交情才讓用 */
export const kitchenStove: Script = withCost(() => (member() && buStage() >= STAGE.NOD ? { stamina: COOK_STAMINA, note: '每份' } : null), async (ctx) => {
  if (!member()) {
    await ctx.say('大灶上的鍋子比人還寬，正冒著熱氣。');
    return;
  }
  if (buStage() < STAGE.NOD) {
    await ctx.say('大灶上的鍋子比人還寬，正冒著熱氣。', ...by(MQ.bu)('欸欸欸，別亂碰！我的灶可不是誰都能用的。', '跟我熟一點再說。'), '（跟卜大勺熟到「點頭之交」才能用大灶）');
    return;
  }
  await cookAt({ level: 3, spring: true, idle: '大灶上的鍋子比人還寬，正冒著熱氣。' })(ctx);
});

export const armoryTalk = giver(MQ.meng, 'dog_pelt', 2, 3, '狗皮正好拿來做劍鞘的襯裡。', [
  by(MQ.meng)('我是管武器房的孟鐸。本門以劍為主，拳腳是根基，兩樣都得練。', '刀槍棍棒擺在這兒，是讓你們見識見識各家兵器的，不教。'),
  by(MQ.meng)('劍鞘磨破了就拿來換，野狗皮硝過之後，做襯裡最好。'),
]);

/** 守山門的何守一、喬木生：外人問來意，弟子打招呼，離開過的冷淡些 */
const GATE_LINES: Record<'he' | 'qiao', { outsider: Line[][]; member: Line[][]; left: Line[] }> = {
  he: {
    outsider: [
      by(MQ.he)('此處是鳴泉劍派山門，在下何守一。來者何人？', '……來拜師的？本派收徒不拘時日，進去找知客的方師兄就是。只是別亂闖禁地。'),
      by(MQ.he)('山門內是本派重地，閒逛可以，別在院子裡動刀動劍。'),
    ],
    member: [
      by(MQ.he)('{稱}回來了。山道上最近有野狗出沒，下山的時候小心些。'),
      by(MQ.he)('要下山？臨江城北門的守城兵認得本派的腰牌，進出方便。'),
      by(MQ.he)('守山門最要緊的是眼睛。誰上山、誰下山，我都記著。'),
      by(MQ.he)('木生那小子又在打瞌睡了吧？{稱}幫我看著點。'),
    ],
    left: by(MQ.he)('……是你啊。進去看看無妨，只是別忘了，你已經不是本門弟子了。'),
  },
  qiao: {
    outsider: [by(MQ.qiao)('我是喬木生，才入門半年，跟何師兄學守山門。', '山門重地，進去之後請守規矩。'), by(MQ.qiao)('站一整天，腿都直了……')],
    member: [
      by(MQ.qiao)('{稱}！今天的晨課你去了沒？我又睡過頭了……'),
      by(MQ.qiao)('何師兄說守門也是修行。修了半年，我只修出一雙站不累的腿。'),
      by(MQ.qiao)('{稱}下山的話，幫我從臨江城帶串糖葫蘆好不好？'),
      by(MQ.qiao)('聽說卜師傅今天燉了好東西，換班了我第一個去！'),
    ],
    left: by(MQ.qiao)('啊……{稱}。何師兄說不能跟你多說話……你自己保重。'),
  },
};
const gateIdx = { he: 0, qiao: 0 };
export const gateTalk =
  (who: 'he' | 'qiao'): Script =>
  async (ctx) => {
    const g = GATE_LINES[who];
    // 同門之間叫師兄弟；稱呼依姓氏
    const fill = (ls: Line[]) => ls.map((l) => ({ ...l, text: l.text.replace(/\{稱\}/g, `${st().hero.surname || st().hero.given}師${sect()?.rank ? '兄' : '弟'}`) }));
    if (member()) return void (await ctx.say(...fill(g.member[gateIdx[who]++ % g.member.length])));
    if (ctx.flag('mq_left')) return void (await ctx.say(...fill(g.left)));
    await ctx.say(...g.outsider[gateIdx[who]++ % g.outsider.length]);
  };

/** 臨江城北門口賣涼茶的黃阿順：問他才說山上的鳴泉劍派在收徒（以前在這裡的是下山採買的韋季安） */
export const northTeaTalk: Script = async (ctx) => {
  const huang = by('黃阿順');
  const c = await ctx.ask(huang('客官，來碗涼茶？一兩銀子一大碗，解渴又消暑。')[0], ['打聽北邊的事', '來一碗（1 兩）', '不用了']);
  if (c === 1) {
    if (st().hero.silver < 1) return void (await ctx.say(...huang('……沒帶錢？那就算啦，下回再來。')));
    st().updateHero((h) => {
      h.silver -= 1;
      h.stamina = Math.min(derive(h).maxStamina, h.stamina + 10);
    });
    return void (await ctx.say('一碗涼茶下肚，暑氣全消。（體力 +10）'));
  }
  if (c !== 0) return;
  if (member()) return void (await ctx.say(...huang('客官是鳴泉山上的？難怪看著精神。', `前兩天${MQ.wei}還下山來喝茶，說山上的晨課一天都不能少。`)));
  if (ctx.flag('mq_left')) return void (await ctx.say(...huang('鳴泉劍派？……客官不是從山上下來的嗎？老漢就不多嘴了。')));
  await ctx.say(
    ...huang(
      '北邊？出了北門往北走，就是鳴泉山。',
      '山上有個鳴泉劍派，這陣子正在收徒弟，不拘時日。上個月隔壁老顧家的閨女就上山去了，聽說考過了，現在是記名弟子囉。',
      '想去的話，出城往北走一段山路就到。山門口有知客的弟子接待，說你是來應考的就成。',
    ),
  );
};

export const sweeperTalk = choreAt('sweep', [
  { speaker: MQ.cao, text: '我是記名弟子曹小豆，每天得把大殿前掃三遍。' },
  { speaker: MQ.cao, text: '師兄說，掃地也是練功……我怎麼覺得只是在掃地。' },
]);

// ── 人物 ────────────────────────────────────────────────

/** 長老怎麼稱呼你：拜了他為師就叫徒兒 */
const elderAddress = (id: string) => (stage: number) => {
  const w = st().world;
  if (!inSect(w, SECT)) return '外人';
  if (w.sect!.master === id) return '徒兒';
  return stage >= STAGE.FAMILIAR ? '{名}' : '你';
};

/** 本門弟子怎麼稱呼你 */
const fellow = (stage: number) => (inSect(st().world, SECT) ? (stage >= STAGE.CLOSE ? '{名}師弟' : '師弟') : '這位朋友');

const wenP: PersonDef = {
  id: 'wen',
  name: '聞松年',
  place: '鳴泉劍派',
  role: '掌門',
  address: () => (inSect(st().world, SECT) ? '{名}' : '年輕人'),
  story: async (ctx) => (await wenFestival(ctx)) || wenStory(ctx),
  talk: { gain: 2, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      wen('山上的松樹，最老的一棵比本派還老。'),
      wen('練劍先練心。心不靜，劍就亂。'),
      wen('鳴泉這座山上，泉水流了幾千年，從來沒停過。', '練功也是這樣，貴在不停。'),
    ],
    [STAGE.FAMILIAR]: [
      wen('{稱}，劍法的招式是死的，人是活的。別讓招式綁住了。'),wen('{稱}，這些日子的晨課，鳴川都跟我說了。不錯。'), wen('本門人少，可每個人我都記得。祖師說過：「劍在人在，人在派在。」')],
    [STAGE.CLOSE]: [wen('{稱}，你來得正好。陪我站一會兒，聽聽泉聲。')],
  },
  idle: [],
  teach: { stage: STAGE.CLOSE, insight: 30 },
  // 掌門寫得一手好字
  hobby: { art: 'calligraphy', level: 7, stage: STAGE.NOD },
  asks: [
    {
      id: 'wen_why',
      q: '{稱}，你為什麼想學劍？',
      answers: [
        { say: '想保護身邊的人。', reply: '好。記住這個念頭，劍才不會走偏。', aff: 3 },
        { say: '想成為天下第一。', reply: '天下第一……鳴泉七代掌門，沒有一個是天下第一。', aff: 0 },
        { say: '還沒想清楚。', reply: '想不清楚也無妨，練著練著就清楚了。', aff: 2 },
      ],
    },
    {
      id: 'wen_rule', stage: STAGE.NOD,
      q: '本門門規第一條，你還記得是什麼嗎？',
      answers: [
        { say: '不得擅入禁地。', reply: '嗯，記得就好。後山的思過崖，沒有許可別去。', aff: 3 },
        { say: '不得恃武欺人。', reply: '那是第三條。回去再讀一遍。', aff: 0 },
        { say: '不記得了……', reply: '……去大殿找靜言，抄三遍。', aff: -1 },
      ],
    },
  ],
};

const luP: PersonDef = {
  id: 'lu',
  name: '陸鳴川',
  place: '鳴泉劍派',
  role: '大師兄，主持晨課',
  address: (s) => fellow(s),
  story: async (ctx) => (await luFestival(ctx)) || luStory(ctx),
  talk: { gain: 2, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      lu('晨課的時候專心點。劍招可以慢，心不能散。'),lu('{稱}，劍要握穩，手腕要活。', '本派劍法講究「快而不亂，如泉不絕」，先求不亂，再求快。')],
    [STAGE.NOD]: [
      lu('二師妹疏桐下山很久了……她的劍比我的好。'),
      { when: (f) => f.mq_exam === 2, lines: lu('{稱}，恭喜你成了正式弟子。', '往後下山辦事，記得你代表的是鳴泉。') },
      lu('{稱}的劍越來越穩了。', '再過些日子，就能去練功房試試鐵木樁。'),
      lu('師父年輕時一個人守過這座山門。那時候鳴泉劍派，只剩師父一個人。'),
    ],
    [STAGE.FAMILIAR]: [lu('{稱}，有空陪我過幾招？光帶晨課，我自己的劍都要鈍了。'), lu('小滿那丫頭嘴上不說，其實很佩服你。')],
    [STAGE.CLOSE]: [lu('{稱}，你若成了正式弟子，就能搬去弟子房。我當年在那兒住了三年，跟何守一一間，他打呼比雷還響。')],
  },
  idle: [lu('晨課明天照常，別遲到。'), lu('記名弟子要入正式，得過考核。我當年考了兩次才過。'), lu('後山的試劍石，你去看過嗎？上頭的劍痕，有一道是師父留的。')],
  meal: [
    lu('吃飯就好好吃飯，別邊吃邊比劃劍招——小川，說的就是你。'),
    lu('我剛入門那年，卜師傅的手藝還沒這麼好。那時候天天喝稀粥，練劍都沒力氣。'),
    lu('{稱}，多吃點。下午的樁可不輕鬆。'),
  ],
  spar: { stage: STAGE.FAMILIAR, encounter: 'spar_lu', win: 6, lose: 3 },
  teach: { stage: STAGE.NOD, insight: 15 },
  asks: [
    {
      id: 'lu_morning',
      q: '{稱}，今天的晨課，你覺得哪一招最難？',
      answers: [
        { say: '起手式，最簡單也最難練好。', reply: '你看得出這一點，比很多人強。', aff: 3 },
        { say: '收劍那一下，總是收不穩。', reply: '收得住，才放得開。多練。', aff: 2 },
        { say: '都不難。', reply: '……那明天你來帶晨課。', aff: -1 },
      ],
    },
    {
      id: 'lu_xiaoman', stage: STAGE.NOD,
      q: '小滿那丫頭老是想找你比劍，你嫌煩嗎？',
      answers: [
        { say: '不會，跟她過招也能長進。', reply: '你這麼想就好。她其實很佩服你。', aff: 3 },
        { say: '有一點，她太好勝了。', reply: '她入門晚，急著證明自己。多擔待。', aff: 1 },
      ],
    },
  ],
};

const xiaomanP: PersonDef = {
  id: 'xiaoman',
  name: '顧小滿',
  place: '鳴泉劍派',
  role: '記名弟子，上個月入門',
  address: (s) => (inSect(st().world, SECT) ? (s >= STAGE.FAMILIAR ? '{名}師兄' : '師兄') : '這位朋友'),
  talk: { gain: 3, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      xm('我才不怕晨課！……只是起不來而已。'),
      { when: (f) => !f.mq_join, lines: xm('你也是來拜師的？我上個月才入門，現在還是記名弟子。', '大師兄人很好，就是晨課起得太早了……') },
      xm('{稱}！雖然你比我晚入門，可是試劍那天我輸給你了……', '所以叫你師兄。哼，下次我一定贏回來！'),
    ],
    [STAGE.NOD]: [
      xm('我爹開的布莊在臨江城，錦繡布莊旁邊那家小鋪子……不要跟他說你看見我！'),
      { when: (f) => f.mq_exam === 2, lines: xm('{稱}已經是正式弟子了……明明比我晚入門！', '哼，等著，我很快就追上你。') },
      xm('{稱}，今天晨課你偷懶了沒？我可是一招都沒少練。'),
      xm('我家在臨江城開布莊的。我爹本來要我嫁人，我偷偷跑上山來的。'),
    ],
    [STAGE.FAMILIAR]: [xm('{稱}，等我們都成了正式弟子，就能一起下山辦事了！'), xm('聽說後山的思過崖洞裡，石壁上刻滿了字……你說，我們偷偷去看一眼好不好？', '……開玩笑的啦！被嚴師叔抓到就慘了。')],
  },
  idle: [xm('卜師傅今天燉了肉湯，好香！'), xm('木樁好硬，我的手都震麻了。'), xm('{稱}，你在看什麼？'), xm('大師兄說我的劍太急。可是不急怎麼贏？')],
  meal: [
    xm('{稱}，你的青菜不吃的話給我！……開玩笑的啦。', '……真的不吃嗎？'),
    xm('我跟你說，大師兄吃飯的時候最好說話了，平常想問他什麼，等吃飯時問就對了。'),
    xm('卜師傅說我太瘦，每次都多給我半勺。嘻嘻。'),
  ],
  gift: { likes: { tea: 4, yunwu: 6, stew: 5 }, dislikes: { dog_pelt: 3 } },
  spar: { stage: STAGE.NOD, encounter: 'spar_xiaoman', win: 5, lose: 3 },
  events: [
    {
      id: 'xiaoman_30',
      at: 30,
      script: async (ctx) => {
        await ctx.say(
          ...xm('{稱}，這個給你。', '我娘偷偷托人捎上山的金創藥，我一個人也用不完。', '……才不是特地留給你的！'),
        );
        await ctx.hero((h) => giveItem(h, 'jinchuang', 2));
      },
    },
  ],
  asks: [
    {
      id: 'xm_win',
      q: '{稱}！你覺得我們兩個誰的劍比較快？',
      answers: [
        { say: '妳快，可是我比較穩。', reply: '哼，穩有什麼用，打不到人！……不過你說得也有點道理。', aff: 3 },
        { say: '當然是我。', reply: '哼！明天木樁林見，不來是小狗！', aff: 1 },
        { say: '妳快。', reply: '嘿嘿，我就知道！', aff: 2 },
      ],
    },
    {
      id: 'xm_home', stage: STAGE.NOD,
      q: '你說……我偷跑上山，我爹會不會很生氣？',
      answers: [
        { say: '一定很擔心，寫封信回家吧。', reply: '……嗯，好吧，我寫就是了。', aff: 3 },
        { say: '等妳學成了，他就會以妳為傲。', reply: '對！我要讓他看看！', aff: 2 },
        { say: '妳都跑了，現在才擔心？', reply: '你、你很討厭耶！', aff: -1 },
      ],
    },
  ],
};

const hanP: PersonDef = {
  id: 'han',
  name: '韓靖秋',
  place: '鳴泉劍派',
  role: '傳功長老',
  address: elderAddress('han'),
  story: hanStory,
  gate: {
    open: (f) => !!f.mq_join,
    refuse: [{ text: '一位灰髮長者閉目養神，似乎沒看見你。' }, { speaker: MQ.qi, text: '那是傳功長老韓師叔，只指點本門弟子。' }],
  },
  talk: { gain: 2, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      han('出劍要狠，收劍要穩。兩樣都做不到，就別說你會劍。'),han('我是傳功長老韓靖秋。本門的武功，都經我的手傳下去。', '練不懂的地方，來問我。（熟一點之後，可以向他請教武學）')],
    [STAGE.NOD]: [
      han('你的步子太碎了。腳下不穩，劍再快也沒用。'),han('劍招是死的，人是活的。招式練熟了，就要忘掉招式。'), han('「萬壑爭鳴」這一招，記名弟子能練出來的，這些年沒幾個。')],
    [STAGE.FAMILIAR]: [
      { when: (f) => !f.mq_true, lines: han('{稱}，你的悟性不錯。好好練，將來真傳的位子，有你一個。') },
      { when: (f) => !!f.mq_true, lines: han('{稱}，成了真傳也別鬆懈。劍法這條路，越往上越窄。') },
    ],
  },
  idle: [],
  teach: { stage: STAGE.NOD, insight: 20 },
  // 韓靖秋下棋跟出劍一樣凌厲
  hobby: { art: 'chess', level: 6, stage: STAGE.NOD, style: 2 },
  asks: [
    {
      id: 'han_fight',
      q: '{稱}，跟人動手的時候，你先想的是攻，還是守？',
      answers: [
        { say: '先守住，再找破綻。', reply: '嗯，穩是穩了，只是太被動。', aff: 1 },
        { say: '先攻，逼對方露出破綻。', reply: '好！劍就該這樣用。', aff: 3 },
        { say: '看對手是誰。', reply: '說得滑頭。不過……也對。', aff: 2 },
      ],
    },
    {
      id: 'han_spicy', stage: STAGE.NOD,
      q: '卜大勺的辣子雞，你吃得慣嗎？',
      answers: [
        { say: '越辣越好！', reply: '哈哈！總算有個能吃辣的！', aff: 3 },
        { say: '有點太辣了……', reply: '練劍的人，連這點辣都受不了？', aff: 0 },
      ],
    },
  ],
};

const yanP: PersonDef = {
  id: 'yan',
  name: MQ.yan,
  place: '鳴泉劍派',
  role: '執法長老',
  address: elderAddress('yan'),
  story: (ctx) => masterStory(ctx, 1),
  gate: {
    open: (f) => !!f.mq_join,
    refuse: [{ text: '一位黑鬚長者盤坐在思過崖前，目光冷冷地掃過你，一言不發。' }, { text: '（他只理會本門弟子）' }],
  },
  talk: { gain: 2, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      yan('思過崖的石壁，每一道刻痕都是一個犯過錯的人留下的。'),yan('我是執法長老嚴守拙。門規是我在管。', '思過崖就在我身後。沒事別往這兒跑。')],
    [STAGE.NOD]: [
      yan('門規不是用來嚇人的，是用來護著你們的。'),yan('{稱}，最近沒犯規矩吧？'), yan('練掌先練站。站不穩，掌就是空的。')],
    [STAGE.FAMILIAR]: [yan('{稱}，你比剛入門的時候穩重多了。', '我這一門斷流掌，傳得慢，因為肯在崖上熬的人少。')],
    [STAGE.CLOSE]: [yan('{稱}，掌門年輕的時候，也在這崖前守過三夜。這事他沒跟人說過吧？')],
  },
  idle: [],
  gift: { likes: { tea: 3, yunwu: 6 }, dislikes: { stew: 2 } },
  teach: { stage: STAGE.NOD, insight: 20 },
  asks: [
    {
      id: 'yan_rule',
      q: '{稱}，若是同門犯了門規，你會替他瞞著，還是報給執法？',
      answers: [
        { say: '勸他自己去認錯。', reply: '……嗯，這樣最好。', aff: 3 },
        { say: '報給執法，門規就是門規。', reply: '公正。只是別忘了，人情也是門規護著的。', aff: 2 },
        { say: '替他瞞著，同門要講義氣。', reply: '義氣用錯了地方，就是害他。', aff: -1 },
      ],
    },
  ],
};

const suP: PersonDef = {
  id: 'su',
  name: MQ.su,
  place: '鳴泉劍派',
  role: '藥堂長老',
  address: elderAddress('su'),
  story: (ctx) => masterStory(ctx, 2),
  gate: {
    open: (f) => !!f.mq_join,
    refuse: [{ text: '一位青衣女子低頭配藥，頭也沒抬：「不是本門弟子，看病請下山去回春堂。」' }],
  },
  talk: { gain: 3, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [su('我是藥堂的蘇芷蘅。青苗是我姪女，平常藥房都是她在照看。', '我常下山行醫，這回總算能在山上待一陣子了。')],
    [STAGE.NOD]: [
      su('藥能救人，也能害人，差別只在分量。'),su('{稱}，練功受了傷別硬撐，來藥房讓我看看。'), su('止血草要是有多的，拿來給青苗，她正缺。')],
    [STAGE.FAMILIAR]: [su('{稱}，你的內息比以前綿長了。', '寒潭心經講究的是「靜」——心靜，氣才沉得下去。')],
    [STAGE.CLOSE]: [su('{稱}，疏桐下山前來找過我，要了幾帖藥……她說要去找一個人。')],
  },
  idle: [su('這幾味藥要曬足三天，急不得。'), su('臨江城這陣子跌打損傷的人特別多，不知道是不是漕幫又鬧事了。')],
  gift: { likes: { herb: 3, yunwu: 5, painting_2: 6, painting_3: 12 }, dislikes: { dog_pelt: 2 } },
  teach: { stage: STAGE.NOD, insight: 20 },
  // 蘇芷蘅行醫各地，也愛畫山水
  hobby: { art: 'painting', level: 5, stage: STAGE.NOD },
  asks: [
    {
      id: 'su_wound',
      q: '{稱}，上回練功受的傷，好了沒有？',
      answers: [
        { say: '好多了，多謝長老關心。', reply: '好了就好。下回別硬撐。', aff: 2 },
        { say: '小傷而已，不礙事。', reply: '小傷不治，就成了大傷。', aff: 0 },
        { say: '……其實還有點疼。', reply: '過來，我看看。……嗯，敷兩天藥就好。', aff: 3 },
      ],
    },
    {
      id: 'su_travel', stage: STAGE.NOD,
      q: '我下山行醫，走過不少地方。你最想去哪裡看看？',
      answers: [
        { say: '南方的大城，聽說很繁華。', reply: '繁華是繁華，病人也多。', aff: 1 },
        { say: '有名山大川的地方。', reply: '那你一定要去看看大江的源頭，那才叫壯闊。', aff: 3 },
        { say: '哪裡都好，只要能見識。', reply: '這份心最難得。', aff: 2 },
      ],
    },
  ],
};

const bu = by(MQ.bu);
const buP: PersonDef = {
  id: 'bu',
  name: MQ.bu,
  place: '鳴泉劍派',
  role: '伙房師傅',
  address: (s) => (s >= STAGE.FAMILIAR ? '小{姓}' : inSect(st().world, SECT) ? '{姓}小兄弟' : '這位朋友'),
  story: buStory,
  talk: { gain: 3, perDay: 2, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      bu('今天的米是新碾的，香得很。'),
      bu('我是伙房的卜大勺。練武的人吃得多，一頓飯要煮三大鍋！', '後頭菜圃的菜都是我種的，誰敢踩，我拿鍋鏟敲他。'),
      bu('打到山豬就拿來，我替大夥兒燉一鍋。'),
    ],
    [STAGE.NOD]: [
      bu('韋季安下山採買，又忘了買花椒！韓長老今天要沒辣子吃了。'),
      bu('{稱}，又來啦？鍋裡還有半碗湯，喝了再走。'),
      bu('做菜跟練劍一樣，火候到了，味道自然就出來了。', '想學就跟我說，先從白米飯煮起。'),
      bu('掌門吃得清淡，韓長老愛吃辣，顧小滿那丫頭什麼都吃——就是不吃蘿蔔。'),
    ],
    [STAGE.FAMILIAR]: [
      bu('{稱}，跟你說個秘密：鳴泉清燉的湯頭，關鍵在泉水要現打的。', '隔了夜的水，就差那麼一口鮮。'),
      bu('我年輕時也想學劍，祖師爺那一輩的老掌門看了我一眼，說：「你拿鍋鏟比拿劍穩。」', '哈哈，他說得沒錯。'),
    ],
    [STAGE.CLOSE]: [bu('{稱}，往後我老了，這廚房就交給你啦——開玩笑的，你是要當大俠的人。')],
  },
  idle: [bu('灶上燉著東西，我得顧著火。'), bu('去去去，別擋著我切菜。'), bu('菜圃的蘿蔔又被兔子啃了，氣死我了。')],
  meal: [
    bu('吃！吃完了碗自己洗！'),
    bu('今天這鍋湯燉了兩個時辰，誰敢剩下我跟誰急。'),
    bu('看你們吃得香，我這一早上就沒白忙。'),
  ],
  gift: { likes: { boar_meat: 5, mushroom: 4, chicken: 3, osmanthus: 3 }, dislikes: { dog_pelt: 4 } },
  asks: [
    {
      id: 'bu_taste',
      q: '{稱}，今天的飯菜，鹹淡怎麼樣？',
      answers: [
        { say: '剛剛好，卜師傅手藝真好。', reply: '哈哈！就愛聽這句！', aff: 3 },
        { say: '稍微鹹了一點。', reply: '嗯……是嗎？我嚐嚐……還真是。你舌頭挺靈的。', aff: 2 },
        { say: '不太好吃。', reply: '……下回你自己煮！', aff: -2 },
      ],
    },
    {
      id: 'bu_fav', stage: STAGE.NOD,
      q: '你最愛吃什麼菜？下回我給你多盛一勺。',
      answers: [
        { say: '燉山豬肉。', reply: '好！打到山豬記得拿來。', aff: 2 },
        { say: '桂花糕，甜的。', reply: '練武的人還愛吃甜的？行，我記下了。', aff: 2 },
        { say: '只要是卜師傅煮的都愛吃。', reply: '你這張嘴喔，比糖還甜。', aff: 3 },
      ],
    },
  ],
};

export const SECT_PEOPLE: PersonDef[] = [wenP, luP, xiaomanP, hanP, yanP, suP, buP];

// ── 日課表：照表做的事、有人找、偶發的小事（見 schedule.ts）──────────
// 照表做時不再問話；體力與時間由日課表統一扣，這裡只結算成長並回傳總結的話。

const isDisciple = (v: { world: { sect?: { id: string } } }) => v.world.sect?.id === SECT;
/** 本門武功優先 */
const sectFirst = <T extends { id: string }>(list: T[]) => [...list].sort((a, b) => Number(isSectSkill(b.id)) - Number(isSectSkill(a.id)));
const trainableOuter = (h: Character) =>
  sectFirst(h.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s)));
const contribText = (n: number) => st().updateWorld((w) => addContrib(w, n));

registerActivity({
  id: 'morning',
  name: '晨課',
  desc: `卯時到巳時，跟著${MQ.lu}在演武廣場練鳴泉劍法（一個時辰，門派貢獻 +2）。`,
  tag: 'drill',
  ke: 8,
  stamina: 0,
  work: 'drill',
  available: isDisciple,
  check: ({ world: w }) =>
    isXunxiu(w.day) ? '今天旬休，沒有晨課。' : usedToday(w, 'mq:morning') ? '今天已經練過了。' : inShichen(w.time, SHICHEN_INDEX.卯, SHICHEN_INDEX.巳) ? null : '不是晨課的時辰（卯時到巳時），沒練到。',
  run: async () => {
    st().updateWorld((w) => (w.daily['mq:morning'] = { day: w.day, n: 1 }));
    const lines = st().updateHero((h) => (h.skills.some((s) => s.id === 'mingquan') ? gainSkillText(h, 'mingquan', 30) : []));
    return [...lines, contribText(2)];
  },
});

registerActivity({
  id: 'meal',
  name: '領飯',
  desc: `到廚房跟${MQ.bu}領今天的大鍋飯（兩刻，一天一份）。`,
  tag: 'meal',
  ke: 2,
  stamina: 0,
  work: 'eat',
  max: 1,
  available: isDisciple,
  check: (v) => (usedToday(v.world, MEAL_KEY) ? '今天的飯領過了。' : !canHold(v.hero, dailyMeal(v.world.day).id) ? '行囊滿了，領不了飯。' : null),
  run: async () => {
    st().updateWorld((w) => (w.daily[MEAL_KEY] = { day: w.day, n: 1 }));
    return [st().updateHero((h) => giveItem(h, dailyMeal(st().world.day).id))];
  },
});

/** 照表做雜務：手上有接的就做那件，否則從任務榜挑今天還沒做的 */
const nextChore = (v: { world: World }) => {
  const s = v.world.sect;
  if (s?.chore) return s.chore;
  return todaysChores(v.world.day).find((c) => !usedToday(v.world, `${choreKey(SECT)}:${c.id}`))?.id;
};

registerActivity({
  id: 'chore',
  name: '雜務',
  desc: `做任務榜上的一件雜務（一個時辰、體力 ${STAMINA.chore}，門派貢獻 +${CHORE_REWARD}；一天最多 ${MINGQUAN.choresPerDay} 件）。`,
  tag: 'chore',
  ke: 8,
  stamina: STAMINA.chore,
  work: (v) => (nextChore(v) ?? 'sweep') as WorkKind,
  max: MINGQUAN.choresPerDay,
  available: isDisciple,
  check: (v) => (usedToday(v.world, choreKey(SECT)) >= MINGQUAN.choresPerDay || !nextChore(v) ? '今天的雜務都做完了。' : null),
  run: async () => {
    const id = nextChore(st())!;
    return [`（${choreDef(id).name}）`, ...finishChore(id)];
  },
});

registerActivity({
  id: 'stake',
  name: '練樁',
  desc: `在演武廣場的木樁練一門外功，本門武功收穫更多（兩刻、體力 ${STAMINA.dummy}；下雨天多 ${RAIN_EXTRA}）。`,
  tag: 'drill',
  ke: 2,
  stamina: (v) => yardStamina(v.world),
  work: 'drill',
  available: isDisciple,
  check: (v) => (trainableOuter(v.hero).length ? null : '沒有裝備著、還沒練到上限的外功。'),
  run: async () => {
    const s = trainableOuter(st().hero)[0];
    return st().updateHero((h) => gainSkillText(h, s.id, isSectSkill(s.id) ? 40 : 30));
  },
});

registerActivity({
  id: 'sit',
  name: '打坐',
  desc: `在練功房的蒲團打坐：內力回滿、氣血回一些，裝備中的內功也會精進（兩刻、體力 ${STAMINA.sit}）。`,
  tag: 'rest',
  ke: 2,
  stamina: STAMINA.sit,
  work: 'sit',
  available: isDisciple,
  check: () => null,
  run: async () =>
    st().updateHero((h) => {
      const d = derive(h);
      h.qi = d.maxQi;
      h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.2));
      const inner = h.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'inner' && s.level < skillCap(s));
      return ['內力回滿。', ...inner.flatMap((s) => gainSkillText(h, s.id, isSectSkill(s.id) ? 30 : 20))];
    }),
});

registerActivity({
  id: 'study',
  name: '研讀',
  desc: `到書房對照劍譜參悟下一招，本門武功收穫更多（兩刻、體力 ${STAMINA.study}）。`,
  tag: 'study',
  ke: 2,
  stamina: STAMINA.study,
  work: 'read',
  available: isDisciple,
  check: (v) => (studyable(v.hero).length ? null : '目前沒有能參悟的招式。'),
  run: async () => {
    const s = sectFirst(studyable(st().hero))[0];
    return st().updateHero((h) => studyInsight(h, s.id, isSectSkill(s.id) ? 24 : 15));
  },
});

/** 掌門要升你的身分時，日課表做到一半會被叫去大殿 */
registerInterrupt((v) => {
  if (!isDisciple(v)) return null;
  const s = v.world.sect!;
  const call = (what: string) => `${MQ.ke}匆匆跑來：「掌門在大殿等你，${what}。快去吧！」\n（日課先停下，到大殿見掌門）`;
  if (v.flags.mq_exam === 1 && s.rank === 0) return call('要升你為正式弟子');
  if (v.flags.mq_master && s.rank === 1) return call('要升你為真傳弟子');
  return null;
});

registerDayEvent({
  id: 'praise',
  after: ['chore'],
  weight: 3,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say(`${MQ.lu}路過，停下來看了一會兒。`, ...lu('做得仔細。這種小事做得好，練劍也錯不了。'));
    addAff('lu', 1);
    await ctx.say(`（${MQ.lu}的熟悉度 +1。${contribText(2)}）`);
  },
});

registerDayEvent({
  id: 'slack',
  after: ['chore'],
  weight: 2,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say('做到一半，你靠著柱子打了個盹——', `${MQ.ke}正好撞見。`, ...by(MQ.ke)('偷懶？罰你多做半個時辰。'));
    ctx.pass(4);
    st().updateHero((h) => (h.stamina = Math.max(0, h.stamina - 10)));
    await ctx.say('（多花了半個時辰，體力 −10）');
  },
});

registerDayEvent({
  id: 'distracted',
  after: ['drill'],
  weight: 3,
  when: isDisciple,
  run: async (ctx) => {
    const hurt = st().updateHero((h) => {
      const n = Math.min(h.hp - 1, Math.round(derive(h).maxHp * 0.1));
      h.hp -= n;
      return n;
    });
    await ctx.say('練著練著，心思飄到了山下的臨江城……', '一個沒留神，彈回來的木樁結結實實撞在你肩上。', `（氣血 −${hurt}）`);
  },
});

registerDayEvent({
  id: 'pointer',
  after: ['drill'],
  weight: 2,
  when: (v) => isDisciple(v) && (v.world.relations.han?.aff ?? 0) >= 10,
  run: async (ctx) => {
    await ctx.say(`${MQ.han}不知什麼時候站在一旁，看了半晌。`, ...han('手肘再沉一點。劍是從腰上發的，不是從手上。'), '你照著一試，果然順了許多。');
    st().updateHero((h) => (h.points += 2));
    await ctx.say('（武學點數 +2）');
  },
});

registerDayEvent({
  id: 'pill',
  after: ['drill', 'chore', 'study'],
  weight: 2,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say(`${MQ.miao}經過，看你滿頭大汗。`, ...by(MQ.miao)('藥房新搓的，拿去，提提神。'));
    await ctx.hero((h) => giveItem(h, 'yangqi_wan'));
  },
});

registerDayEvent({
  id: 'doze',
  after: ['study'],
  weight: 2,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say('讀著讀著，字越來越模糊……', '你猛然驚醒，口水差點滴在劍譜上。抬頭一看，窗外的日影已經挪了一大截。');
    ctx.pass(2);
    st().updateHero((h) => (h.stamina = Math.min(derive(h).maxStamina, h.stamina + 10)));
    await ctx.say('（多花了兩刻，不過睡了一下，體力 +10）');
  },
});

registerDayEvent({
  id: 'extra_meal',
  after: ['meal'],
  weight: 2,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say(...by(MQ.bu)('長身體的，多吃點！'), `${MQ.bu}又往你手裡多塞了一份。`);
    await ctx.hero((h) => giveItem(h, dailyMeal(st().world.day).id));
  },
});

// ── 日常小事：依時辰、天氣、交情而不同（做事或聊天時偶爾發生）──────────

const isNight = (v: { world: World }) => inShichen(v.world.time, SHICHEN_INDEX.戌, SHICHEN_INDEX.丑);
const isDaytime = (v: { world: World }) => inShichen(v.world.time, SHICHEN_INDEX.辰, SHICHEN_INDEX.申);
const affOf = (v: { world: World }, id: string) => v.world.relations[id]?.aff ?? 0;
const affNote = (id: string, name: string, n: number) => (addAff(id, n), `（${name}的熟悉度 +${n}）`);

registerDayEvent({
  id: 'rain_herbs',
  after: ['chore', 'drill', 'study'],
  weight: 4,
  when: (v) => isDisciple(v) && v.world.weather === 'rain' && isDaytime(v),
  run: async (ctx) => {
    await ctx.say('雨點忽然密了起來。', ...by(MQ.miao)('藥！架上的藥還曬著——誰來幫把手！'), '你跟著幾個師兄弟衝過去，七手八腳地把一篩篩草藥搶進屋簷下。');
    st().updateHero((h) => (h.stamina = Math.max(0, h.stamina - 5)));
    await ctx.say(`（體力 −5。${contribText(2)}）`);
  },
});

registerDayEvent({
  id: 'cao_bucket',
  after: ['chore', 'drill'],
  weight: 3,
  when: (v) => isDisciple(v) && isDaytime(v),
  run: async (ctx) => {
    const sunny = st().world.weather === 'clear';
    await ctx.say(`${MQ.cao}提著水桶跑過，腳下一絆——`, '嘩啦！半桶水全潑在你身上。', ...by(MQ.cao)('對、對不起！這桶是要挑去廚房的……'));
    const c = await ctx.ask(sunny ? '（還好太陽大，一曬就乾了）' : '（衣服濕透了，風一吹有點冷）', [`幫${MQ.cao}再挑一桶`, `擺擺手，叫${MQ.cao}小心點`]);
    if (c === 0) {
      ctx.pass(2);
      st().updateHero((h) => (h.stamina = Math.max(0, h.stamina - 8)));
      await ctx.say(...by(MQ.cao)('謝謝師兄！我下次一定看路！'), `（多花了兩刻，體力 −8。${contribText(1)}）`);
    } else await ctx.say(...by(MQ.cao)('是！是！'), `${MQ.cao}提著空桶，一溜煙又跑了。`);
  },
});

registerDayEvent({
  id: 'lost_tassel',
  after: ['drill', 'chore', 'rest'],
  weight: 3,
  when: isDisciple,
  run: async (ctx) => {
    await ctx.say('你在地上撿到一條紅色的劍穗，穗結上繡著一個小小的「滿」字。');
    const c = await ctx.ask('這是誰的，一看就知道了。', [`拿去還給${MQ.gu}`, `交給知客的${MQ.fang}`]);
    if (c === 0) {
      await ctx.say(...by(MQ.gu)('我的劍穗！找了一早上……謝謝你！', '這是我娘編的，丟了我得哭死。'), affNote('xiaoman', MQ.gu, 3));
    } else await ctx.say(...by(MQ.fang)('我會貼張字條，失主自會來領。'), `（${contribText(1)}）`);
  },
});

registerDayEvent({
  id: 'lu_tip',
  after: ['drill'],
  weight: 3,
  when: (v) => isDisciple(v) && affOf(v, 'lu') >= 30,
  run: async (ctx) => {
    await ctx.say(`${MQ.lu}在一旁看你練了一陣，走過來把你的劍尖往下壓了半寸。`, ...lu('「泉湧」這一式，劍尖太高，力就散了。再來一次。'));
    const lines = st().updateHero((h) => (h.skills.some((s) => s.id === 'mingquan') ? gainSkillText(h, 'mingquan', 40) : ((h.points += 2), ['武學點數 +2。'])));
    await ctx.say(lines.filter(Boolean).join('\n'), affNote('lu', MQ.lu, 1));
  },
});

registerDayEvent({
  id: 'night_sword',
  after: ['rest', 'chat', 'study'],
  weight: 4,
  when: (v) => isDisciple(v) && isNight(v),
  run: async (ctx) => {
    await ctx.say('夜深人靜，後山的方向隱隱傳來一陣劍聲。', '「錚——」一聲清響，接著又沒了動靜。');
    const c = await ctx.ask('要去看看嗎？', ['摸黑上後山看看', '蒙頭睡覺']);
    if (c !== 0) {
      await ctx.say('你翻了個身。隔天問起，師兄弟都說什麼也沒聽見。');
      return;
    }
    ctx.pass(4);
    st().updateHero((h) => {
      h.stamina = Math.max(0, h.stamina - 10);
      h.points += 3;
    });
    await ctx.say(
      '你循著聲音摸到劍塚附近，月光下只見一道人影一閃，就沒入了林子。',
      '地上留著幾道新鮮的劍痕，深淺如一。你蹲下來比劃了半天，似乎悟到了一點什麼。',
      '（多花了半個時辰，體力 −10，武學點數 +3）',
    );
  },
});

// 聊天時：跟某些人聊才會碰上的事
registerDayEvent({
  id: 'xiaoman_snack',
  after: ['chat'],
  with: ['xiaoman'],
  weight: 3,
  when: isDaytime,
  run: async (ctx) => {
    await ctx.say(...by(MQ.gu)('欸，我跟你說，卜大勺今天蒸了桂花糕，就擱在廚房的蒸籠裡……', '我們去「嘗」一塊，好不好？'));
    const c = await ctx.ask(by(MQ.gu)('去不去嘛？')[0], ['一起去', '勸她別去']);
    if (c !== 0) {
      await ctx.say(...by(MQ.gu)('……好啦好啦，不去就不去。你真像大師兄。'), affNote('xiaoman', MQ.gu, 1));
      return;
    }
    if (Math.random() < 0.6) {
      await ctx.say('你們躡手躡腳溜進廚房，一人摸了一塊就跑。', ...by(MQ.gu)('嘻嘻，好吃吧？'));
      await ctx.hero((h) => giveItem(h, 'guihua'));
    } else {
      ctx.pass(4);
      await ctx.say('手才剛碰到蒸籠——', ...by(MQ.bu)('好哇！兩個小賊！洗碗去，洗完再走！'), '你和顧小滿在水缸邊洗了半個時辰的碗。', '（多花了半個時辰）');
    }
    await ctx.say(affNote('xiaoman', MQ.gu, 3));
  },
});

registerDayEvent({
  id: 'lu_notes',
  after: ['chat'],
  with: ['lu'],
  weight: 3,
  when: (v) => affOf(v, 'lu') >= 30,
  run: async (ctx) => {
    await ctx.say(...lu('對了，這個給你。', '我剛入門時記的練功筆記，字醜，將就著看。'), '薄薄一冊，密密麻麻寫滿了每一式的心得，還有好幾處被劃掉重寫。');
    st().updateHero((h) => (h.points += 2));
    await ctx.say('（武學點數 +2）', affNote('lu', MQ.lu, 1));
  },
});

// ── 任務日誌 ────────────────────────────────────────────

export const masterQuest = {
  id: 'mq_master',
  title: '鳴泉・真傳拜師',
  status(f: Record<string, number>): { text: string; done: boolean } | null {
    if (f.mq_true) return { text: '通過拜師試煉，成為鳴泉劍派的真傳弟子。', done: true };
    if (f.mq_master) return { text: `通過了${MASTERS[f.mq_master - 1].name}的試煉。到大殿見掌門聞松年。`, done: false };
    if (f.mq_mt === 3) {
      const left = HERBS.filter((h) => !(f.mq_herbs & h.bit)).map((h) => `${h.name}（${h.where}）`);
      return { text: left.length ? `蘇芷蘅的試煉：到後山採藥，還差${left.join('、')}。` : '三味藥都採齊了，回藥房找蘇芷蘅。', done: false };
    }
    if (f.mq_mt_day) return { text: `拜師試煉沒過。${dateText(f.mq_mt_day + EXAM_RETRY)}起可以再去找長老。`, done: false };
    if (f.mq_true_hint)
      return { text: '掌門說可以拜師了：韓靖秋（練功房，疊泉劍）、嚴守拙（後山，斷流掌）、蘇芷蘅（藥房，寒潭心經）。要先跟長老熟識，長老才肯收徒。', done: false };
    return null;
  },
};

export const examQuest = {
  id: 'mq_exam',
  title: '鳴泉・正式弟子考核',
  status(f: Record<string, number>): { text: string; done: boolean } | null {
    if (f.mq_exam === 2) return { text: '通過考核，成為鳴泉劍派的正式弟子。', done: true };
    if (f.mq_exam === 1) return { text: '通過了正式弟子考核。到大殿見掌門聞松年。', done: false };
    if (f.mq_exam_day) return { text: `考核沒過。${dateText(f.mq_exam_day + EXAM_RETRY)}起可以再到練功房找傳功長老韓靖秋報考。`, done: false };
    return null;
  },
};

export const mingquanQuest = {
  id: 'mingquan',
  title: '拜入鳴泉',
  status(f: Record<string, number>): { text: string; done: boolean } | null {
    if (f.mq_left) return { text: '離開了鳴泉劍派。', done: true };
    if (f.mq_join) return { text: '拜入了鳴泉劍派。身分、貢獻與晉升條件可以在選單「門派」裡查看；任務榜在演武廣場。', done: true };
    if (f.mq_trial === 2) return { text: '通過了入門考驗。到鳴泉劍派的大殿拜見掌門聞松年。', done: false };
    if (f.mq_trial === 1) return { text: '過了問心、觀骨兩關，還差試劍：再去演武廣場找大師兄陸鳴川，與顧小滿比試。', done: false };
    if (f.mq_seek) return { text: '鳴泉劍派收徒不拘時日。到演武廣場找大師兄陸鳴川，接受入門考驗。', done: false };
    return null;
  },
};
