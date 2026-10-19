import { addFame, attrs, Character, gainSkill, giveItem, isEquipped, ITEMS, learnSkill, restoreAll, skillCap, skillDef, SKILLS, slotOf } from '../character';
import type { EventCtx, Script } from '../events';
import { usedToday } from '../home';
import type { Line } from '../maps/types';
import { addContrib, choreKey, inSect, roster, SectMember, leaveRuleText, nextStipendDay, newSectState, rankName, registerSect, SectDef, STIPEND_DAYS } from '../sect';
import { clampAff, newRelation, STAGE } from '../social';
import { useGame } from '../../state/store';
import { sleep, studyable, studyInsight, useDaily } from './estate';
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
  yan: { name: '嚴守拙', rank: '長老', role: '執法長老', note: '坐鎮後山，看守思過崖' },
  su: { name: '蘇芷蘅', rank: '長老', role: '藥堂長老', note: '下山行醫，不在山上' },
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
      promote: { days: 30, merit: 150, skills: [{ id: 'mingquan', level: 4 }], test: '正式弟子考核' },
    },
    {
      name: '正式弟子',
      dorm: '弟子房（兩人一間）',
      perks: ['練功房的鐵木人樁', '書房抄錄「踏石步」', '更多下山委託'],
      stipend: { silver: 12, items: { jinchuang: 2 } },
      leave: [{ kind: 'fine', silver: 500 }, { kind: 'trial', name: '泉音劍陣', encounter: 'mq_array' }],
      promote: { days: 60, merit: 600, skills: [{ id: 'mingquan', level: 8 }, { id: 'chengquan', level: 5 }], test: '真傳拜師試煉' },
    },
    {
      name: '真傳弟子',
      dorm: '真傳弟子房（一人一間）',
      perks: ['拜長老為師，學上乘武功', '借閱秘笈'],
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
    { id: 'garden', name: '照顧菜圃', where: `菜圃旁找伙房的${MQ.bu}` },
  ],
  choresPerDay: 2,
  members: Object.values(MQ_MEMBERS),
};
registerSect(MINGQUAN);

const member = () => inSect(st().world, SECT);
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
  // 弟子：每天一次晨課
  if (st().world.daily['mq:morning']?.day === day()) return false;
  const c = await ctx.ask({ speaker: '陸鳴川', text: '來得正好，今天的晨課要一起練嗎？' }, ['跟著練', '晚點再說']);
  if (c !== 0) return false;
  await morningDrill(ctx);
  return true;
}

async function morningDrill(ctx: EventCtx) {
  if (!(await useDaily(ctx, 'mq:morning', 1, '今天的晨課已經練過了。'))) return;
  await ctx.say('你跟著陸鳴川和師兄弟們，在演武廣場上一招一式地練起鳴泉劍法。', '劍風與泉聲混在一起，迴盪在山間……');
  await ctx.hero((h) => (h.skills.some((s) => s.id === 'mingquan') ? gainSkillText(h, 'mingquan', 30) : null));
  await contrib(ctx, 2);
}

// ── 拜師：大殿見掌門聞松年 ────────────────────────────

async function wenStory(ctx: EventCtx): Promise<boolean> {
  if (ctx.flag('mq_left')) {
    await ctx.say(...wen('你我師徒緣分已盡，不必多言。'));
    return true;
  }
  if (member()) return false;
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
  await ctx.hero((h) => [giveItem(h, 'mq_token'), learnSkill(h, 'mingquan')]);
  await ctx.say(
    ...wen(
      '記名弟子住大通鋪。每天跟鳴川做晨課，廣場上的木樁、練功房的蒲團、書房的書，都可以用。',
      `本門的「澄泉心法」收在書房，攢夠了門派貢獻，就去找管書的${MQ.song}抄錄。`,
      '記名弟子若是覺得不合適，隨時可以離開；成了正式弟子，那就不同了。好好想清楚自己的路。',
    ),
    '（選單新增「門派」分頁：可以查看身分、貢獻、晉升條件與門規）',
  );
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
  await ctx.hero((h) => {
    delete h.items.mq_token;
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
      await ctx.say(...duty(`月例每 ${STIPEND_DAYS} 天領一次，第 ${nextStipendDay(s)} 日再來吧。`));
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
  await ctx.say(`你在書案前坐下，一筆一劃地把「${def.name}」抄了下來。\n${def.desc}`);
  await ctx.hero((h) => learnSkill(h, k.id));
};

/** 本派劍譜的書架：每天研讀一次 */
export const libShelf: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('本派的劍譜與心法抄本，按入門先後排列。', ...keeper('這位朋友，書房只給本派弟子用。'));
    return;
  }
  const tired = '今天在書房讀了好一陣子，腦袋有些發脹。';
  // 今天練過了就直接說，不必先選武功
  if (usedToday(st().world, 'mq:study')) {
    await useDaily(ctx, 'mq:study', 1, tired);
    return;
  }
  const ready = studyable(st().hero);
  if (!ready.length) {
    await ctx.say('本派的劍譜與心法抄本，按入門先後排列。\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）');
    return;
  }
  const i = await ctx.ask('要對照哪一門武功研讀？（本門武功收穫更多）', [...ready.map((s) => `${skillDef(s).name}（領悟 ${s.insight}%）`), '算了']);
  if (i >= ready.length) return;
  if (!(await useDaily(ctx, 'mq:study', 1, tired))) return;
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

/** 練樁：選一門裝備中、還沒練到上限的外功 */
async function practice(ctx: EventCtx, key: string, amount: number, tired: string) {
  // 今天練過了就直接說，不必先選武功
  if (usedToday(st().world, key)) {
    await useDaily(ctx, key, 1, tired);
    return;
  }
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'outer' && s.level < skillCap(s));
  if (!list.length) {
    await ctx.say('（要裝備著還沒練到上限的外功，才能在這裡練）');
    return;
  }
  const i = await ctx.ask('要練哪一門？（本門武功收穫更多）', [...list.map((s) => `${skillDef(s).name}（第 ${s.level} 重）`), '算了']);
  if (i >= list.length) return;
  if (!(await useDaily(ctx, key, 1, tired))) return;
  const id = list[i].id;
  await ctx.say('「啪、啪、啪——」你對著木樁一招一式地練了起來。');
  await ctx.hero((h) => gainSkillText(h, id, isSectSkill(id) ? amount + 10 : amount));
}

export const yardStake: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('木樁上滿是劍痕。\n（這是鳴泉弟子練功用的木樁，拜入門下之後才能用）');
    return;
  }
  await practice(ctx, 'mq:stake', 30, '今天已經在木樁上練過了，虎口有些發麻。');
};

export const ironStake: Script = async (ctx) => {
  if (!member() || sect().rank < 1) {
    await ctx.say('包了鐵皮的木人樁，比廣場上的木樁沉得多。', { speaker: MQ.qi, text: '鐵木樁是給正式弟子練的，記名弟子先在廣場上把基本功練紮實。' });
    return;
  }
  await practice(ctx, 'mq:iron', 55, '今天已經練過鐵木樁了，手臂都快抬不起來了。');
};

export const cushion: Script = async (ctx) => {
  if (!member()) {
    await ctx.say('打坐用的蒲團。\n（拜入鳴泉之後，可以在這裡打坐修練內功）');
    return;
  }
  const list = st().hero.skills.filter((s) => isEquipped(s) && slotOf(skillDef(s).kind) === 'inner' && s.level < skillCap(s));
  const tired = '今天已經打坐過了，再坐下去腿都麻了。';
  // 今天練過了就直接說，不必先選武功
  if (usedToday(st().world, 'mq:cushion')) {
    await useDaily(ctx, 'mq:cushion', 1, tired);
    return;
  }
  const c = await ctx.ask('要在蒲團上打坐嗎？', ['盤膝打坐', '算了']);
  if (c !== 0) return;
  if (!(await useDaily(ctx, 'mq:cushion', 1, tired))) return;
  await ctx.say('你盤膝坐下，閉目調息。泉聲從窗外隱隱傳來，心思漸漸沉靜……');
  await ctx.hero((h) => {
    restoreAll(h);
    const out: (string | null)[] = ['（氣血、內力、體力完全恢復）'];
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
  const c = await ctx.ask(mine ? '你的鋪位。要躺下休息嗎？' : '大通鋪最裡頭的空鋪，借給上山應考的人住。要躺下休息嗎？', ['睡到天亮', '算了']);
  if (c !== 0) return;
  await sleep(ctx, 1);
};

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
    lines: ['你提著水桶替菜圃澆水、拔草，還抓走了好幾條菜蟲。', { speaker: MQ.bu, text: '不錯不錯！這碗燉肉拿去，算是賞你的。' }],
    bonus: ['stew', 1],
  },
};

async function doChore(ctx: EventCtx, id: string) {
  const d = CHORE_DONE[id];
  await ctx.say(...d.lines);
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
    await ctx.say(`今天已經做了 ${per} 件雜務，剩下的留給師兄弟吧。\n（明天再來。在床上睡一覺就是新的一天）`);
    return;
  }
  const list = todaysChores(day()).filter((c) => !usedToday(st().world, `${choreKey(SECT)}:${c.id}`));
  const i = await ctx.ask(`今天的雜務（已做 ${done}/${per} 件，每件門派貢獻 +${CHORE_REWARD}）`, [...list.map((c) => `${c.name}（${c.where}）`), '算了']);
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

/** 每天每種東西收一次；交了回傳 true */
async function donate(ctx: EventCtx, who: string, item: string, n: number, reward: number, thanks: string): Promise<boolean> {
  const key = `mq:give:${item}`;
  const have = st().hero.items[item] ?? 0;
  if (usedToday(st().world, key)) {
    await ctx.say(...by(who)('今天的已經收過了，明天再說吧。'));
    return false;
  }
  if (have < n) {
    await ctx.say(...by(who)(`要 ${n} 份「${ITEMS[item].name}」才收。你身上只有 ${have} 份。`));
    return false;
  }
  st().updateWorld((w) => (w.daily[key] = { day: w.day, n: 1 }));
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

export const cookTalk = choreAt(
  'garden',
  giver(MQ.bu, 'boar_meat', 1, 4, '好大一塊山豬肉！今晚加菜！', [
    by(MQ.bu)('我是伙房的卜大勺。練武的人吃得多，一頓飯要煮三大鍋！', '後頭菜圃的菜都是我種的，誰敢踩，我拿鍋鏟敲他。'),
    by(MQ.bu)('打到山豬就拿來，我替大夥兒燉一鍋。'),
  ]),
);

export const armoryTalk = giver(MQ.meng, 'dog_pelt', 2, 3, '狗皮正好拿來做劍鞘的襯裡。', [
  by(MQ.meng)('我是管武器房的孟鐸。本門以劍為主，拳腳是根基，兩樣都得練。', '刀槍棍棒擺在這兒，是讓你們見識見識各家兵器的，不教。'),
  by(MQ.meng)('劍鞘磨破了就拿來換，野狗皮硝過之後，做襯裡最好。'),
]);

export const sweeperTalk = choreAt('sweep', [
  { speaker: MQ.cao, text: '我是記名弟子曹小豆，每天得把大殿前掃三遍。' },
  { speaker: MQ.cao, text: '師兄說，掃地也是練功……我怎麼覺得只是在掃地。' },
]);

// ── 人物 ────────────────────────────────────────────────

/** 本門弟子怎麼稱呼你 */
const fellow = (stage: number) => (inSect(st().world, SECT) ? (stage >= STAGE.CLOSE ? '{名}師弟' : '師弟') : '這位朋友');

const wenP: PersonDef = {
  id: 'wen',
  name: '聞松年',
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
};

const luP: PersonDef = {
  id: 'lu',
  name: '陸鳴川',
  address: (s) => fellow(s),
  story: luStory,
  talk: { gain: 2, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [lu('{稱}，劍要握穩，手腕要活。', '本派劍法講究「快而不亂，如泉不絕」，先求不亂，再求快。')],
    [STAGE.NOD]: [lu('{稱}的劍越來越穩了。', '再過些日子，就能去練功房試試鐵木樁。'), lu('師父年輕時一個人守過這座山門。那時候鳴泉劍派，只剩師父一個人。')],
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
  address: (s) => (inSect(st().world, SECT) ? (s >= STAGE.FAMILIAR ? '{名}師兄' : '師兄') : '這位朋友'),
  talk: { gain: 3, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      { when: (f) => !f.mq_join, lines: xm('你也是來拜師的？我上個月才入門，現在還是記名弟子。', '大師兄人很好，就是晨課起得太早了……') },
      xm('{稱}！雖然你比我晚入門，可是試劍那天我輸給你了……', '所以叫你師兄。哼，下次我一定贏回來！'),
    ],
    [STAGE.NOD]: [xm('{稱}，今天晨課你偷懶了沒？我可是一招都沒少練。'), xm('我家在臨江城開布莊的。我爹本來要我嫁人，我偷偷跑上山來的。')],
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
  address: (s) => (inSect(st().world, SECT) ? (s >= STAGE.FAMILIAR ? '{名}' : '你') : '外人'),
  gate: {
    open: (f) => !!f.mq_join,
    refuse: [{ text: '一位灰髮長者閉目養神，似乎沒看見你。' }, { speaker: MQ.qi, text: '那是傳功長老韓師叔，只指點本門弟子。' }],
  },
  talk: { gain: 2, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [han('我是傳功長老韓靖秋。本門的武功，都經我的手傳下去。', '練不懂的地方，來問我。（熟一點之後，可以向他請教武學）')],
    [STAGE.NOD]: [han('劍招是死的，人是活的。招式練熟了，就要忘掉招式。'), han('「萬壑爭鳴」這一招，記名弟子能練出來的，這些年沒幾個。')],
    [STAGE.FAMILIAR]: [han('{稱}，你的悟性不錯。好好練，將來真傳的位子，有你一個。')],
  },
  idle: [],
  teach: { stage: STAGE.NOD, insight: 20 },
};

export const SECT_PEOPLE: PersonDef[] = [wenP, luP, xiaomanP, hanP];

// ── 任務日誌 ────────────────────────────────────────────

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
