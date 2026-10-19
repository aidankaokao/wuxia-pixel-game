import { addFame, attrs, canHold, Character, derive, equipGear, gainSkill, giveItem, slotsFor, takeSectGear, isEquipped, ITEMS, learnSkill, skillCap, skillDef, SKILLS, slotOf } from '../character';
import type { EventCtx, Script } from '../events';
import { usedToday } from '../home';
import type { Line } from '../maps/types';
import { addContrib, choreKey, inSect, promote, promotionChecks, roster, SectMember, leaveRuleText, nextStipendDay, newSectState, rankName, registerSect, SectDef, STIPEND_DAYS } from '../sect';
import { clampAff, newRelation, STAGE } from '../social';
import { useGame } from '../../state/store';
import { exert, rest, STAMINA, studyable, studyInsight, useDaily } from './estate';
import { cookAt, teachDishes } from './cooking';
import { dailyMeal } from '../cooking';
import { craftOf } from '../crafts';
import { MQ_UNIFORMS } from '../gear';
import { heroUnit } from '../battle/moves';
import { setupDrill } from '../battle/enemies';
import { dateText, inShichen, keUntilDawn, shichenStart, SHICHEN_INDEX, timeText } from '../time';
import type { PersonDef } from './people';

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
 *   mq_master     拜師試煉通過了誰：1 韓靖秋 / 2 嚴守拙 / 3 蘇芷蘅（等掌門升你為真傳弟子）
 *   mq_true       1 已成為真傳弟子
 *   mq_c_path     下山委託「清理山道」：1 接下 / 2 打跑了野狗群 / 3 已覆命
 *   mq_c_med      下山委託「回春堂送藥」：1 接下（身上帶著藥包） / 2 送到了 / 3 已覆命
 */

const SECT = 'mingquan';
const st = () => useGame.getState();
const by =
  (speaker: string) =>
  (...texts: string[]): Line[] =>
    texts.map((text) => ({ speaker, text }));
/** 鳴泉劍派的人：弟子名冊與各處的台詞都用這份名字 */
export const MQ_MEMBERS = {
  wen: { name: '聞松年', rank: '掌門', role: '鳴泉劍派第七代掌門', person: 'wen' },
  han: { name: '韓靖秋', rank: '長老', role: '傳功長老，在練功房指點弟子', person: 'han' },
  yan: { name: '嚴守拙', rank: '長老', role: '執法長老', note: '坐鎮後山，看守思過崖', person: 'yan' },
  su: { name: '蘇芷蘅', rank: '長老', role: '藥堂長老', note: '常下山行醫', person: 'su' },
  lu: { name: '陸鳴川', rank: '真傳弟子', role: '大弟子，主持晨課與入門考驗', person: 'lu' },
  ye: { name: '葉疏桐', rank: '真傳弟子', role: '二弟子', note: '下山歷練，久未回山' },
  qi: { name: '齊振遠', rank: '正式弟子', role: '教習，在練功房教基本功' },
  fang: { name: '方硯清', rank: '正式弟子', role: '知客，在山門內迎客' },
  ke: { name: '柯靜言', rank: '正式弟子', role: '值殿，掌管門規與月例' },
  song: { name: '宋知微', rank: '正式弟子', role: '管書' },
  miao: { name: '蘇青苗', rank: '正式弟子', role: '管藥，蘇長老的姪女' },
  meng: { name: '孟鐸', rank: '正式弟子', role: '管武器房' },
  he: { name: '何守一', rank: '正式弟子', role: '守山門' },
  wei: { name: '韋季安', rank: '正式弟子', role: '採買', note: '常下山到臨江城' },
  gu: { name: '顧小滿', rank: '記名弟子', role: '上個月入門', person: 'xiaoman' },
  qiao: { name: '喬木生', rank: '記名弟子', role: '守山門' },
  bao: { name: '包小川', rank: '記名弟子', role: '練劍' },
  tang: { name: '唐秋生', rank: '記名弟子', role: '練劍' },
  cao: { name: '曹小豆', rank: '記名弟子', role: '掃殿前' },
  zheng: { name: '鄭大壯', rank: '記名弟子' },
  hou: { name: '侯三郎', rank: '記名弟子' },
  bu: { name: '卜大勺', rank: '雜役', role: '伙房師傅，管廚房與菜圃' },
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
      promote: { days: 60, merit: 600, skills: [{ id: 'mingquan', level: 8 }, { id: 'chengquan', level: 5 }], test: '真傳拜師試煉（條件齊了就去拜見掌門）' },
    },
    {
      name: '真傳弟子',
      dorm: '真傳弟子房（一人一間）',
      perks: ['拜長老為師，學上乘武功', '每天向師父請教', '真傳弟子房的床鋪（精神飽滿更久）'],
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
  // 弟子：晨課在卯時到巳時之間，一天一回
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
}

// ── 拜師：大殿見掌門聞松年 ────────────────────────────

async function wenStory(ctx: EventCtx): Promise<boolean> {
  if (ctx.flag('mq_left')) {
    await ctx.say(...wen('你我師徒緣分已盡，不必多言。'));
    return true;
  }
  if (member()) {
    if (ctx.flag('mq_exam') === 1 && sect().rank === 0) {
      await promotionCeremony(ctx);
      return true;
    }
    if (sect().rank !== 1) return false;
    if (ctx.flag('mq_master')) {
      await trueCeremony(ctx);
      return true;
    }
    if (trueReady() && !ctx.flag('mq_true_hint')) {
      ctx.setFlag('mq_true_hint');
      await ctx.say(
        ...wen('你成了正式弟子以來，功績、武功都長進了不少。是時候拜師了。'),
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
  if (member() && sect().rank === 1) return masterStory(ctx, 0);
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
  await rest(ctx, 2, '你在弟子房的床。要躺下休息嗎？', wakeLines('room'));
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
const trueReady = () => sect().rank === 1 && examReady();

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
  if (!member() || sect().rank !== 1) return false;
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
  await issueUniform(ctx, 2);
  await ctx.say(
    ...MASTER_LINES[MASTERS.indexOf(m)](`這門「${SKILLS[m.skill].name}」，往後每天來找我請教。`),
    ...wen('疏桐下山多年，她的房間空著，你先搬進真傳弟子房・二吧。'),
    '（成為真傳弟子：住處改為真傳弟子房・二，月例提高；離開師門只能闖「泉音劍陣」）',
  );
}

/** 真傳弟子房・二的床 */
export const cellBed: Script = async (ctx) => {
  if (!member() || sect().rank < 2) {
    await ctx.say('真傳弟子的床鋪，被褥是上好的棉布。');
    return;
  }
  await rest(ctx, 3, '你在真傳弟子房的床。要躺下休息嗎？', wakeLines('cell'));
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
    ...roster(MINGQUAN, st().world.sect, hero.name).map((g) => ({
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
  const c = await ctx.ask(duty('師兄弟有什麼事？')[0], ['請教門規', ready ? '領月例' : '領月例（還沒到日子）', '弟子名冊', '離開師門', '沒事']);
  if (c === 2) await readRoster(ctx);
  else if (c === 3) await leaveSect(ctx);
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
    st().updateWorld((w) => (w.sect!.stipendDay = w.day));
    await ctx.say(...duty(`這是${rankName(s)}的月例，收好。`));
    await ctx.hero((h) => {
      h.silver += pay.silver;
      return [`獲得銀兩 ${pay.silver} 兩。`, ...Object.entries(pay.items ?? {}).map(([id, n]) => giveItem(h, id, n))];
    });
  }
};

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
export const libShelf: Script = async (ctx) => {
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
  if (!(await exert(ctx, STAMINA.study, '在書房讀了好一陣子，腦袋有些發脹。'))) return;
  ctx.pass(2);
  const id = ready[i].id;
  const amount = isSectSkill(id) ? 24 : 15;
  await ctx.say(`你從架上取下抄本，對照著「${skillDef(ready[i]).name}」的招式反覆推敲……`);
  await ctx.hero((h) => studyInsight(h, id, amount));
};

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
async function practice(ctx: EventCtx, amount: number, stamina: number) {
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s));
  if (!list.length) {
    await ctx.say('（要裝備著還沒練到上限的外功，才能在這裡練）');
    return;
  }
  const i = await ctx.ask('要練哪一門？（本門武功收穫更多）', [...list.map((s) => `${skillDef(s).name}（第 ${s.level} 重）`), '算了']);
  if (i >= list.length) return;
  if (!(await exert(ctx, stamina, '手臂都快抬不起來了，虎口也震得發麻。'))) return;
  ctx.pass(2);
  const id = list[i].id;
  await ctx.say('「啪、啪、啪——」你對著木樁一招一式地練了起來。'); 
  await ctx.hero((h) => gainSkillText(h, id, isSectSkill(id) ? amount + 10 : amount));
}

export const yardStake: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('木樁上滿是劍痕。\n（這是鳴泉弟子練功用的木樁，拜入門下之後才能用）');
    return;
  }
  const c = await ctx.ask('廣場上的木樁林。', [`練樁（兩刻・體力 ${STAMINA.dummy}）`, `找同門過招（一刻・體力 ${STAMINA.spar}）`, '算了']);
  if (c === 0) await practice(ctx, 30, STAMINA.dummy);
  else if (c === 1) await drill(ctx);
};

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

export const ironStake: Script = async (ctx) => {
  if (!member() || sect().rank < 1) {
    await ctx.say('包了鐵皮的木人樁，比廣場上的木樁沉得多。', { speaker: MQ.qi, text: '鐵木樁是給正式弟子練的，記名弟子先在廣場上把基本功練紮實。' });
    return;
  }
  await practice(ctx, 55, 25);
};

export const cushion: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('打坐用的蒲團。\n（拜入鳴泉之後，可以在這裡打坐修練內功）');
    return;
  }
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'inner' && s.level < skillCap(s));
  const c = await ctx.ask(`要在蒲團上打坐嗎？（兩刻・體力 ${STAMINA.sit}）`, ['盤膝打坐', '算了']);
  if (c !== 0) return;
  if (!(await exert(ctx, STAMINA.sit, '坐得腿都麻了，心也靜不下來。'))) return;
  ctx.pass(2);
  await ctx.say('你盤膝坐下，閉目調息。泉聲從窗外隱隱傳來，心思漸漸沉靜……');
  await ctx.hero((h) => {
    const d = derive(h);
    h.qi = d.maxQi;
    h.hp = Math.min(d.maxHp, h.hp + Math.round(d.maxHp * 0.2));
    const out: (string | null)[] = ['（內力完全恢復，氣血也恢復了一些）'];
    for (const s of list) out.push(...gainSkillText(h, s.id, isSectSkill(s.id) ? 30 : 20));
    if (!list.length) out.push('（裝備著還沒練到上限的內功，打坐時才會精進）');
    return out;
  });
};

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
  await rest(ctx, 1, mine ? '你的鋪位。要躺下休息嗎？' : '大通鋪最裡頭的空鋪，借給上山應考的人住。要躺下休息嗎？', mine ? wakeLines('dorm') : undefined);
};

/** 在門派宿舍睡到天亮：卯時被同門叫醒去晨課（跟顧小滿熟了，她會跑來叫你） */
function wakeLines(where: 'dorm' | 'room' | 'cell'): (Line | string)[] | undefined {
  if (!member()) return undefined;
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
    await ctx.say(...g('師兄弟早。大師兄在演武廣場帶晨課，去晚了可要挨罵。'));
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
const CHORE_DONE: Record<string, { lines: (Line | string)[]; bonus?: [string, number] }> = {
  water: { lines: ['你挑起扁擔，在山泉與廚房之間來回了十幾趟，總算把水缸挑滿了。', '肩膀火辣辣地疼，腳步倒是越走越穩。'] },
  sweep: {
    lines: [{ speaker: MQ.cao, text: '太好了！今天換你掃！' }, '你接過掃帚，把大殿前的平台從東掃到西，連石縫裡的落葉都掃乾淨了。'],
  },
  herbs: { lines: ['你把晾藥架上的草藥一一翻面、攤開曬勻。', { speaker: MQ.miao, text: '辛苦了，這株止血草你拿去。' }], bonus: ['herb', 1] },
  books: { lines: ['你把散亂的書冊照年代排好，順手翻了幾頁江湖掌故。', '書上說，百年前江湖上有個劍客，一劍斷江……多半是說書人的誇張。'] },
  garden: {
    lines: ['你提著水桶到後頭菜圃澆水、拔草，還抓走了好幾條菜蟲。', { speaker: MQ.bu, text: '不錯不錯！這幾把青菜拿去，算是賞你的。' }],
    bonus: ['greens', 3],
  },
};

async function doChore(ctx: EventCtx, id: string) {
  const d = CHORE_DONE[id];
  if (!(await exert(ctx, STAMINA.chore, '累得手腳發軟，這活兒今天是幹不動了。'))) return;
  ctx.pass(8);
  await ctx.say(...d.lines, '（做了一個時辰）');
  st().updateWorld((w) => {
    delete w.sect!.chore;
    for (const key of [choreKey(SECT), `${choreKey(SECT)}:${id}`]) w.daily[key] = { day: w.day, n: usedToday(w, key) + 1 };
  });
  if (d.bonus) await ctx.hero((h) => giveItem(h, d.bonus![0], d.bonus![1]));
  await contrib(ctx, CHORE_REWARD);
}

/** 雜務的地點：手上有這件雜務就去做，否則照常查看或交談 */
export const choreAt =
  (id: string, otherwise: Line[] | Script): Script =>
  async (ctx) => {
    if (member() && sect().chore === id) return doChore(ctx, id);
    if (typeof otherwise === 'function') return otherwise(ctx);
    await ctx.say(...otherwise);
  };

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
  const g = by('回春堂掌櫃');
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

const cookChats = [
  by(MQ.bu)('我是伙房的卜大勺。練武的人吃得多，一頓飯要煮三大鍋！', '後頭菜圃的菜都是我種的，誰敢踩，我拿鍋鏟敲他。'),
  by(MQ.bu)('打到山豬就拿來，我替大夥兒燉一鍋。'),
  by(MQ.bu)('做菜跟練劍一樣，火候到了，味道自然就出來了。', '想學就跟我說，先從白米飯煮起。'),
];
let cookChat = 0;

/** 每天的大鍋飯：弟子一天領一份，行囊滿了領不了 */
async function dailyMealAt(ctx: EventCtx) {
  const b = by(MQ.bu);
  const d = dailyMeal(st().world.day);
  if (usedToday(st().world, MEAL_KEY)) {
    await ctx.say(...b('今天的份你領過啦！明天再來，明天換別的菜。'));
    return;
  }
  if (!canHold(st().hero, d.id)) {
    await ctx.say(...b(`今天是${d.name}——欸，你身上塞得滿滿的，碗往哪兒擺？騰出點地方再來。`), '（行囊滿了，先賣掉或用掉一些吧）');
    return;
  }
  st().updateWorld((w) => (w.daily[MEAL_KEY] = { day: w.day, n: 1 }));
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

export const cookTalk = choreAt('garden', async (ctx) => {
  const chat = () => ctx.say(...cookChats[cookChat++ % cookChats.length]);
  if (!member()) return chat();
  const meal = dailyMeal(st().world.day);
  const c = await ctx.ask(by(MQ.bu)('餓了吧？')[0], [
    `領今天的飯（${meal.name}）`,
    '學做菜',
    '買食材',
    '繳納山豬肉（1 份，貢獻 +4）',
    '閒聊',
  ]);
  if (c === 0) await dailyMealAt(ctx);
  else if (c === 1) await teachDishes(ctx, MQ.bu, (n) => payContrib(ctx, n), () => craftOf(st().hero, 'cooking').level);
  else if (c === 2) await ctx.panel({ kind: 'shop', title: '伙房的食材', stock: KITCHEN_STOCK });
  else if (c === 3) await donate(ctx, MQ.bu, 'boar_meat', 1, 4, '好大一塊山豬肉！今晚加菜！');
  else await chat();
});

/** 後山的野菌：一處一天採一次，誰都能採 */
export const mushroomAt =
  (spot: string): Script =>
  async (ctx) => {
    if (!(await useDaily(ctx, `mq_mush:${spot}`, 1, '這一叢野菌已經採過了，新的還沒冒出來。'))) return;
    ctx.pass(1);
    const n = 1 + Math.floor(Math.random() * 3);
    await ctx.say('你撥開落葉，把肥嫩的野菌一朵朵摘了下來。');
    await ctx.hero((h) => giveItem(h, 'mushroom', n));
  };

/** 廚房的大灶：有鳴泉的泉水，做得了泉水涼麵、鳴泉清燉 */
export const kitchenStove: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('大灶上的鍋子比人還寬，正冒著熱氣。');
    return;
  }
  await cookAt({ level: 3, spring: true, idle: '大灶上的鍋子比人還寬，正冒著熱氣。' })(ctx);
};

export const armoryTalk = giver(MQ.meng, 'dog_pelt', 2, 3, '狗皮正好拿來做劍鞘的襯裡。', [
  by(MQ.meng)('我是管武器房的孟鐸。本門以劍為主，拳腳是根基，兩樣都得練。', '刀槍棍棒擺在這兒，是讓你們見識見識各家兵器的，不教。'),
  by(MQ.meng)('劍鞘磨破了就拿來換，野狗皮硝過之後，做襯裡最好。'),
]);

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
  story: wenStory,
  talk: { gain: 2, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      wen('練劍先練心。心不靜，劍就亂。'),
      wen('鳴泉這座山上，泉水流了幾千年，從來沒停過。', '練功也是這樣，貴在不停。'),
    ],
    [STAGE.FAMILIAR]: [wen('{稱}，這些日子的晨課，鳴川都跟我說了。不錯。'), wen('本門人少，可每個人我都記得。祖師說過：「劍在人在，人在派在。」')],
    [STAGE.CLOSE]: [wen('{稱}，你來得正好。陪我站一會兒，聽聽泉聲。')],
  },
  idle: [],
  teach: { stage: STAGE.CLOSE, insight: 30 },
  // 掌門寫得一手好字
  hobby: { art: 'calligraphy', level: 7, stage: STAGE.NOD },
};

const luP: PersonDef = {
  id: 'lu',
  name: '陸鳴川',
  place: '鳴泉劍派',
  role: '大師兄，主持晨課',
  address: (s) => fellow(s),
  story: luStory,
  talk: { gain: 2, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [lu('{稱}，劍要握穩，手腕要活。', '本派劍法講究「快而不亂，如泉不絕」，先求不亂，再求快。')],
    [STAGE.NOD]: [
      { when: (f) => f.mq_exam === 2, lines: lu('{稱}，恭喜你成了正式弟子。', '往後下山辦事，記得你代表的是鳴泉。') },
      lu('{稱}的劍越來越穩了。', '再過些日子，就能去練功房試試鐵木樁。'),
      lu('師父年輕時一個人守過這座山門。那時候鳴泉劍派，只剩師父一個人。'),
    ],
    [STAGE.FAMILIAR]: [lu('{稱}，有空陪我過幾招？光帶晨課，我自己的劍都要鈍了。'), lu('小滿那丫頭嘴上不說，其實很佩服你。')],
    [STAGE.CLOSE]: [lu('{稱}，你若成了正式弟子，就能搬去弟子房。我當年在那兒住了三年，跟何守一一間，他打呼比雷還響。')],
  },
  idle: [lu('晨課明天照常，別遲到。'), lu('記名弟子要入正式，得過考核。我當年考了兩次才過。'), lu('後山的試劍石，你去看過嗎？上頭的劍痕，有一道是師父留的。')],
  spar: { stage: STAGE.FAMILIAR, encounter: 'spar_lu', win: 6, lose: 3 },
  teach: { stage: STAGE.NOD, insight: 15 },
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
      { when: (f) => !f.mq_join, lines: xm('你也是來拜師的？我上個月才入門，現在還是記名弟子。', '大師兄人很好，就是晨課起得太早了……') },
      xm('{稱}！雖然你比我晚入門，可是試劍那天我輸給你了……', '所以叫你師兄。哼，下次我一定贏回來！'),
    ],
    [STAGE.NOD]: [
      { when: (f) => f.mq_exam === 2, lines: xm('{稱}已經是正式弟子了……明明比我晚入門！', '哼，等著，我很快就追上你。') },
      xm('{稱}，今天晨課你偷懶了沒？我可是一招都沒少練。'),
      xm('我家在臨江城開布莊的。我爹本來要我嫁人，我偷偷跑上山來的。'),
    ],
    [STAGE.FAMILIAR]: [xm('{稱}，等我們都成了正式弟子，就能一起下山辦事了！'), xm('聽說後山的思過崖洞裡，石壁上刻滿了字……你說，我們偷偷去看一眼好不好？', '……開玩笑的啦！被嚴師叔抓到就慘了。')],
  },
  idle: [xm('卜師傅今天燉了肉湯，好香！'), xm('木樁好硬，我的手都震麻了。'), xm('{稱}，你在看什麼？'), xm('大師兄說我的劍太急。可是不急怎麼贏？')],
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
    [STAGE.STRANGER]: [han('我是傳功長老韓靖秋。本門的武功，都經我的手傳下去。', '練不懂的地方，來問我。（熟一點之後，可以向他請教武學）')],
    [STAGE.NOD]: [han('劍招是死的，人是活的。招式練熟了，就要忘掉招式。'), han('「萬壑爭鳴」這一招，記名弟子能練出來的，這些年沒幾個。')],
    [STAGE.FAMILIAR]: [
      { when: (f) => !f.mq_true, lines: han('{稱}，你的悟性不錯。好好練，將來真傳的位子，有你一個。') },
      { when: (f) => !!f.mq_true, lines: han('{稱}，成了真傳也別鬆懈。劍法這條路，越往上越窄。') },
    ],
  },
  idle: [],
  teach: { stage: STAGE.NOD, insight: 20 },
  // 韓靖秋下棋跟出劍一樣凌厲
  hobby: { art: 'chess', level: 6, stage: STAGE.NOD, style: 2 },
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
    [STAGE.STRANGER]: [yan('我是執法長老嚴守拙。門規是我在管。', '思過崖就在我身後。沒事別往這兒跑。')],
    [STAGE.NOD]: [yan('{稱}，最近沒犯規矩吧？'), yan('練掌先練站。站不穩，掌就是空的。')],
    [STAGE.FAMILIAR]: [yan('{稱}，你比剛入門的時候穩重多了。', '我這一門斷流掌，傳得慢，因為肯在崖上熬的人少。')],
    [STAGE.CLOSE]: [yan('{稱}，掌門年輕的時候，也在這崖前守過三夜。這事他沒跟人說過吧？')],
  },
  idle: [],
  gift: { likes: { tea: 3, yunwu: 6 }, dislikes: { stew: 2 } },
  teach: { stage: STAGE.NOD, insight: 20 },
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
    [STAGE.NOD]: [su('{稱}，練功受了傷別硬撐，來藥房讓我看看。'), su('止血草要是有多的，拿來給青苗，她正缺。')],
    [STAGE.FAMILIAR]: [su('{稱}，你的內息比以前綿長了。', '寒潭心經講究的是「靜」——心靜，氣才沉得下去。')],
    [STAGE.CLOSE]: [su('{稱}，疏桐下山前來找過我，要了幾帖藥……她說要去找一個人。')],
  },
  idle: [su('這幾味藥要曬足三天，急不得。'), su('臨江城這陣子跌打損傷的人特別多，不知道是不是漕幫又鬧事了。')],
  gift: { likes: { herb: 3, yunwu: 5, painting_2: 6, painting_3: 12 }, dislikes: { dog_pelt: 2 } },
  teach: { stage: STAGE.NOD, insight: 20 },
  // 蘇芷蘅行醫各地，也愛畫山水
  hobby: { art: 'painting', level: 5, stage: STAGE.NOD },
};

export const SECT_PEOPLE: PersonDef[] = [wenP, luP, xiaomanP, hanP, yanP, suP];

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
