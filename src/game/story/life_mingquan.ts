import { derive, skillDef } from '../character';
import { heroUnit } from '../battle/moves';
import { setupDrill } from '../battle/enemies';
import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import type { World } from '../home';
import { lifeGroups, lifeState, memberOf, registerLife, setOutdoorMaps, type Assign, type Bond, type LifeAct, type LifeMember, type LifeSpot, type Spot } from '../life';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { addContrib, inSect } from '../sect';
import { clampAff, newRelation } from '../social';
import { dateOf, festivalOf, isXunxiu, onNewDay, SHICHEN_INDEX, shichenStart } from '../time';
import { useGame } from '../../state/store';
import { exert, STAMINA, studyable, studyInsight } from './estate';
import { gateTalk, MINGQUAN, MQ, practice, sitDown, sweeperTalk } from './sect_mingquan';

/**
 * 鳴泉劍派的日常（life.ts）：同門自己過日子，還有交情、成長與門派活動。
 *
 * 人：陸鳴川（大師兄，帶晨課）、顧小滿、包小川、唐秋生、曹小豆、鄭大壯、侯三郎、喬木生（記名弟子）、
 *     何守一、韋季安（正式弟子）、韓靖秋（傳功長老）、聞松年（掌門）。
 * - 晨課：卯時到辰時，陸鳴川在演武廣場帶，記名弟子排兩排（旬休、下雨沒有；有人會睡過頭）。
 * - 差事：曹小豆一早掃大殿前；何守一上午、喬木生下午輪班守山門；韋季安每逢旬休前一天下山到臨江城採買；
 *   韓靖秋白天在練功房看弟子練功、未時到廣場巡視；聞松年白天在大殿，未時到後山散步（長老、掌門夜裡回自己的居所，看不到）。
 * - 交情（BONDS）：包小川和唐秋生較勁、顧小滿仰慕大師兄、鄭大壯和侯三郎是同鄉好友……要好的常湊在一起聊天，較勁的偶爾吵架（吵架那幾天不湊一起）。
 * - 成長：每天依個性慢慢變強（world.life），記名弟子實力到了會升正式弟子（不用再上晨課，名冊跟著改）；
 *   正式弟子偶爾下山歷練幾天。門派消息會在聊天、今日事裡提到。
 * - 活動：每逢旬休未時演武廣場比武小會（陸鳴川主持，找他報名，連戰三場，排出名次）；
 *   每月初五、十五、廿五申時韓靖秋在練功房講武（找他旁聽，有所領悟）；每晚輪一個人守夜（輪到你時，亥時到子時到大殿前敲更鼓巡夜）。
 * - 加入他們：找正在練樁、練劍、打坐的人可以一起練（多一成收穫、交情 +2），練劍的可以對練一場；正在聊天的可以湊過去聽八卦（story/life_talk.ts）。
 */

const st = () => useGame.getState();
const member = () => inSect(st().world, 'mingquan');
const S = 'mq_sect';
/** 看不到的地方（掌門居、長老居）：在這裡的人哪張地圖都不顯示 */
const AWAY = '_away';
const spot = (id: string, map: string, x: number, y: number, facing: Spot['facing'], acts: LifeAct[], pair?: string): LifeSpot => ({ id, map, x, y, facing, acts, pair });
const at = (map: string, x: number, y: number, facing: Spot['facing'] = 'down'): Spot => ({ map, x, y, facing });
const T = (s: keyof typeof SHICHEN_INDEX, ke = 0) => shichenStart(SHICHEN_INDEX[s]) + ke;
const inT = (t: number, a: number, b: number) => t >= a && t < b;

setOutdoorMaps([S, 'mq_back', 'mingquan', 'linjiang']);

const SPOTS: LifeSpot[] = [
  // 木樁林：站在樁前面
  ...[16, 18, 20].flatMap((x) => [spot(`stake${x}a`, S, x, 23, 'up', ['stake']), spot(`stake${x}b`, S, x, 25, 'up', ['stake'])]),
  // 演武廣場：練劍
  spot('sw1', S, 24, 15, 'down', ['sword']),
  spot('sw2', S, 29, 15, 'down', ['sword']),
  spot('sw3', S, 15, 18, 'right', ['sword']),
  spot('sw4', S, 30, 23, 'left', ['sword']),
  spot('sw5', S, 29, 26, 'up', ['sword']),
  spot('sw6', S, 14, 26, 'right', ['sword']),
  // 聊天：兩兩一組面對面
  spot('ch1a', S, 15, 16, 'right', ['chat'], 'ch1b'),
  spot('ch1b', S, 16, 16, 'left', ['chat'], 'ch1a'),
  spot('ch2a', S, 30, 19, 'right', ['chat'], 'ch2b'),
  spot('ch2b', S, 31, 19, 'left', ['chat'], 'ch2a'),
  spot('ch3a', S, 9, 28, 'right', ['chat'], 'ch3b'),
  spot('ch3b', S, 10, 28, 'left', ['chat'], 'ch3a'),
  spot('ch4a', S, 26, 29, 'right', ['chat'], 'ch4b'),
  spot('ch4b', S, 27, 29, 'left', ['chat'], 'ch4a'),
  spot('ch5a', 'mq_dorm', 10, 3, 'right', ['chat'], 'ch5b'),
  spot('ch5b', 'mq_dorm', 11, 3, 'left', ['chat'], 'ch5a'),
  spot('ch6a', S, 36, 21, 'right', ['chat'], 'ch6b'),
  spot('ch6b', S, 37, 21, 'left', ['chat'], 'ch6a'),
  // 打坐：洗劍池邊、練功房的蒲團旁
  spot('md1', S, 10, 34, 'left', ['meditate']),
  spot('md2', S, 3, 36, 'right', ['meditate']),
  spot('md3', 'mq_train', 3, 6, 'left', ['meditate']),
  spot('md4', 'mq_train', 5, 6, 'left', ['meditate']),
  spot('md5', 'mq_train', 8, 6, 'right', ['meditate']),
  // 練功房的鐵木樁（下雨天也能練）
  spot('ts1', 'mq_train', 2, 3, 'up', ['stake']),
  spot('ts2', 'mq_train', 5, 3, 'up', ['stake']),
  spot('ts3', 'mq_train', 8, 3, 'up', ['stake']),
  // 書房
  spot('rd1', 'mq_lib', 1, 2, 'up', ['read']),
  spot('rd2', 'mq_lib', 4, 2, 'up', ['read']),
  spot('rd3', 'mq_lib', 7, 2, 'up', ['read']),
  spot('rd4', 'mq_lib', 3, 5, 'up', ['read']),
  // 雜務：掃大殿前、井邊挑水、菜圃
  spot('sp1', S, 21, 11, 'down', ['sweep']),
  spot('sp2', S, 26, 12, 'down', ['sweep']),
  spot('wt1', S, 34, 30, 'up', ['water']),
  spot('wt2', S, 33, 29, 'right', ['water']),
  spot('gd1', S, 38, 32, 'down', ['garden']),
  spot('gd2', S, 42, 33, 'down', ['garden']),
  // 散步
  spot('st1', S, 12, 29, 'down', ['stroll']),
  spot('st2', S, 30, 38, 'down', ['stroll']),
  spot('st3', S, 18, 40, 'down', ['stroll']),
  spot('st4', S, 40, 29, 'down', ['stroll']),
];

const wake = (n: number) => T('卯') + n;
const bed = (n: number) => T('亥') - 4 + n;
const say = (name: string) => (...t: string[]) => [by(name)(...t)];

/** 同門之間的交情 */
const BONDS: Bond[] = [
  { a: 'bao', b: 'tang', kind: 'rival', note: '同一天入門，誰也不服誰' },
  { a: 'gu', b: 'lu', kind: 'admire', note: '顧小滿很崇拜大師兄' },
  { a: 'zheng', b: 'hou', kind: 'friend', note: '都是山下莊稼人出身，同鄉' },
  { a: 'cao', b: 'bao', kind: 'friend', note: '常一起溜去廚房偷吃' },
  { a: 'gu', b: 'tang', kind: 'friend', note: '常一起討論劍理' },
  { a: 'qiao', b: 'he', kind: 'friend', note: '一起守山門的搭檔' },
];

/** 下山歷練、回鄉的理由 */
const AWAY_WHY = ['下山歷練', '回鄉探親', '隨蘇長老下山行醫'];

// ── 比武小會、講武、守夜的時間 ──────────────────────────

const MEET = { from: T('未'), to: T('申') };
const LECTURE = { from: T('申'), to: T('酉') };
const isMeetDay = (day: number) => isXunxiu(day);
const isLectureDay = (day: number) => dateOf(day).date % 10 === 5;
/** 守夜：亥時初到子時末（過了半夜算前一天的班） */
const nightNow = (t: number) => t >= T('亥') || t < (T('子') + 8) % 96;
const watchDayOf = (w: World) => (w.time < 48 ? w.day - 1 : w.day);
/** 守夜輪值的順序；'hero' 是你（拜入門下才排進去） */
const WATCH_ORDER = ['qiao', 'zheng', 'hou', 'bao', 'tang', 'gu', 'cao', 'he', 'wei'];
export function watcherOn(day: number, w: World = st().world): string {
  const order = inSect(w, 'mingquan') ? [...WATCH_ORDER, 'hero'] : WATCH_ORDER;
  const free = order.filter((id) => {
    const m = w.life?.members[id];
    return id === 'hero' || !(m?.away && m.away.until >= day);
  });
  return free[((day % free.length) + free.length) % free.length];
}

/** 比武小會：這一個時段誰跟誰比 */
const FIGHTERS = ['gu', 'bao', 'tang', 'zheng', 'hou', 'qiao', 'he', 'wei', 'cao'];
function meetPair(day: number, time: number): [string, string] {
  const block = Math.floor((time - MEET.from) / 4);
  const order = [...FIGHTERS].sort((a, b) => ((a.charCodeAt(0) * 31 + day) % 17) - ((b.charCodeAt(0) * 31 + day) % 17));
  return [order[(block * 2) % order.length], order[(block * 2 + 1) % order.length]];
}

const MEET_SPOTS = {
  host: at(S, 23, 15, 'down'),
  a: at(S, 22, 17, 'right'),
  b: at(S, 24, 17, 'left'),
  crowd: [at(S, 19, 17, 'right'), at(S, 19, 15, 'right'), at(S, 27, 17, 'left'), at(S, 27, 18, 'left'), at(S, 21, 19, 'up'), at(S, 25, 19, 'up'), at(S, 22, 19, 'up'), at(S, 26, 15, 'left')],
};
const LECTURE_SPOTS = {
  lead: at('mq_train', 5, 4, 'down'),
  crowd: [at('mq_train', 3, 6, 'up'), at('mq_train', 5, 6, 'up'), at('mq_train', 8, 6, 'up'), at('mq_train', 2, 5, 'up'), at('mq_train', 9, 5, 'up'), at('mq_train', 4, 5, 'up')],
};

/** 特別活動的安排（覆蓋平常的事） */
/** 年會上的站位：長老在座位旁，前排內門以上，後排記名弟子；正中一列留給你走到掌門面前 */
const ANNUAL_SPOTS: [string, number, number, 'up' | 'down' | 'left' | 'right'][] = [
  ['han', 4, 4, 'right'],
  ['lu', 6, 6, 'up'], ['he', 8, 6, 'up'],
  ['wei', 5, 7, 'up'], ['qiao', 9, 7, 'up'],
  ['gu', 2, 8, 'up'], ['bao', 4, 8, 'up'], ['tang', 5, 8, 'up'], ['cao', 9, 8, 'up'], ['zheng', 10, 8, 'up'], ['hou', 12, 8, 'up'],
];

function events(w: World): Record<string, Assign> {
  const t = w.time;
  const out: Record<string, Assign> = {};
  const away = (id: string) => {
    const m = w.life?.members[id];
    return !!m?.away && m.away.until >= w.day;
  };
  if (isMeetDay(w.day) && inT(t, MEET.from, MEET.to) && w.weather !== 'rain' && w.weather !== 'snow') {
    const [a, b] = meetPair(w.day, t);
    out.lu = { act: 'lead', at: MEET_SPOTS.host };
    if (!away(a)) out[a] = { act: 'spar', at: MEET_SPOTS.a, with: b };
    if (!away(b)) out[b] = { act: 'spar', at: MEET_SPOTS.b, with: a };
    let i = 0;
    for (const id of FIGHTERS) if (!out[id] && !away(id) && i < MEET_SPOTS.crowd.length) out[id] = { act: 'watch', at: MEET_SPOTS.crowd[i++] };
  }
  if (isLectureDay(w.day) && inT(t, LECTURE.from, LECTURE.to)) {
    out.han = { act: 'lead', at: LECTURE_SPOTS.lead };
    let i = 0;
    for (const id of ['gu', 'tang', 'bao', 'zheng', 'hou', 'wei']) if (!away(id) && i < LECTURE_SPOTS.crowd.length) out[id] = { act: 'listen', at: LECTURE_SPOTS.crowd[i++] };
  }
  // 年會（正月十六辰時到午時，開過就散）：同門到大殿排班站好，掌門照常坐在殿上
  const d = dateOf(w.day);
  if (d.month === 0 && d.date === 16 && w.life?.meetingYear !== d.year && inT(t, T('辰'), T('午'))) {
    for (const [id, x, y, f] of ANNUAL_SPOTS) if (!away(id)) out[id] = { act: id === 'han' ? 'watch' : 'listen', at: at('mq_hall', x, y, f) };
  }
  // 守夜：輪到的人在廣場巡（輪到你就沒人巡）
  if (nightNow(t)) {
    const who = watcherOn(watchDayOf(w), w);
    if (who !== 'hero') out[who] = { act: 'patrol', at: at(S, 23, 14, 'down') };
  }
  return out;
}

registerLife({
  id: 'mingquan',
  maps: [S, 'mq_dorm', 'mq_train', 'mq_lib', 'mq_kitchen', 'mq_room_a', 'mq_room_b', 'mq_cell_1', 'mq_hall', 'mq_back', 'mingquan', 'linjiang'],
  spots: SPOTS,
  bonds: BONDS,
  event: (w) => events(w),
  lesson: {
    from: T('卯'),
    to: T('巳'),
    lead: 'lu',
    leadAt: at(S, 23, 21, 'down'),
    at: [at(S, 21, 23, 'up'), at(S, 23, 23, 'up'), at(S, 25, 23, 'up'), at(S, 21, 25, 'up'), at(S, 23, 25, 'up'), at(S, 25, 25, 'up')],
  },
  npcs: [
    {
      id: 'lu', name: MQ.lu, sprite: 'sect_senior', person: 'lu', power: 110, rank: 3,
      home: at('mq_cell_1', 1, 2), seat: at('mq_kitchen', 7, 2, 'left'),
      wake: T('寅', 7), sleep: bed(2),
      likes: { sword: 4, meditate: 2, read: 2, stroll: 1, chat: 1 },
    },
    {
      id: 'gu', name: MQ.gu, sprite: 'disciple_girl', person: 'xiaoman', pupil: true, power: 30,
      home: at('mq_room_b', 7, 2), seat: at('mq_kitchen', 3, 2, 'right'),
      wake: wake(1), sleep: bed(3),
      likes: { stake: 4, sword: 2, chat: 3, stroll: 1, read: 0.5 },
    },
    {
      id: 'bao', name: MQ.bao, sprite: 'disciple', pupil: true, power: 24,
      home: at('mq_dorm', 5, 2), seat: at('mq_kitchen', 3, 4, 'right'),
      wake: wake(3), sleep: bed(4),
      likes: { stake: 3, sword: 2, chat: 3, stroll: 2 },
      talks: {
        stake: say(MQ.bao)('喝！哈！……別看我，師兄說一套劍沒練滿一百遍不許停。', '秋生昨天練了一百二十遍，我今天要練一百五十遍！'),
        sword: say(MQ.bao)('看我這招「泉湧」！……咦，劍怎麼飛出去了。'),
        chat: say(MQ.bao)('我跟你說，昨天秋生打坐打到睡著，口水都流下來了，哈哈！'),
        class: say(MQ.bao)('噓——晨課呢，被師兄看見我說話就慘了。'),
        eat: [by(MQ.bao)('（嘴裡塞得滿滿的）唔……今天的菜……好吃！'), by(MQ.bao)('秋生又跟我搶最後一塊肉，你評評理！')],
        sleep: say(MQ.bao)('明天晨課一定不睡過頭……一定……'),
        spar: say(MQ.bao)('別吵！我正要贏了！'),
        watch: say(MQ.bao)('上啊！……哎呀，怎麼又輸了。'),
        listen: say(MQ.bao)('（小聲）長老講的我一句都沒聽懂……你聽懂了嗎？'),
        patrol: say(MQ.bao)('守夜好冷……你帶吃的沒有？'),
        default: [by(MQ.bao)('我叫包小川，跟秋生同一天入門的。他練得比我快……我才不服！')],
      },
    },
    {
      id: 'tang', name: MQ.tang, sprite: 'disciple', pupil: true, power: 27,
      home: at('mq_dorm', 8, 2), seat: at('mq_kitchen', 7, 4, 'left'),
      wake: wake(0), sleep: bed(1),
      likes: { meditate: 3, read: 3, stake: 2, chat: 1, sword: 1 },
      talks: {
        meditate: say(MQ.tang)('（閉著眼睛）……心靜，劍才靜。你也坐一會兒吧。'),
        read: say(MQ.tang)('這本《劍理淺說》寫得真好。「快而不亂」四個字，講了整整三十頁。'),
        stake: say(MQ.tang)('本派劍法講究「快而不亂，如泉不絕」。說起來簡單，練起來可難了。'),
        chat: say(MQ.tang)('小川老說要贏我，可他每天晨課都睡過頭。'),
        class: say(MQ.tang)('（小聲）師兄在看這邊，專心點。'),
        eat: [by(MQ.tang)('吃飯要細嚼慢嚥，師父說的。……小川，你又噎著了。'), by(MQ.tang)('下午練樁前不能吃太飽，不然一蹲馬步就想睡。')],
        sleep: say(MQ.tang)('噓，小川睡了。他說夢話會背劍訣，挺好笑的。'),
        listen: say(MQ.tang)('韓長老說的「劍隨意走」，我好像有點懂了。'),
        patrol: say(MQ.tang)('夜裡的泉聲特別清楚。守夜也不錯。'),
        default: [by(MQ.tang)('在下唐秋生。小川老說要贏我，可他每天晨課都睡過頭。')],
      },
    },
    {
      id: 'cao', name: MQ.cao, sprite: 'disciple', script: sweeperTalk, power: 12,
      home: at('mq_dorm', 11, 2), seat: at('mq_kitchen', 6, 4, 'up'),
      wake: wake(0), sleep: bed(0),
      // 一早先掃大殿前（卯時到辰時）
      duty: (t) => (inT(t, T('卯'), T('巳')) ? { act: 'sweep', at: at(S, 23, 11, 'down') } : null),
      likes: { sweep: 2, water: 2, chat: 2, stroll: 1, stake: 1 },
    },
    {
      id: 'zheng', name: MQ.zheng, sprite: 'farmer', pupil: true, power: 20,
      home: at('mq_dorm', 2, 2), seat: at('mq_kitchen', 4, 3, 'right'),
      wake: wake(0), sleep: bed(0),
      likes: { water: 3, garden: 3, stake: 2, chat: 1 },
      talks: {
        water: say(MQ.zheng)('挑水俺最在行！在家一天挑二十擔，這點算啥。'),
        garden: say(MQ.zheng)('卜師傅的菜圃，俺幫著鬆鬆土。種地跟練功一樣，急不得。'),
        stake: say(MQ.zheng)('嘿！嘿！……這木樁比俺家的牛還結實。'),
        chat: say(MQ.zheng)('大通鋪住了十幾個人，晚上打呼聲此起彼落……'),
        sleep: say(MQ.zheng)('呼……呼……（鄭大壯已經睡得打呼了）'),
        patrol: say(MQ.zheng)('俺在家也守過夜，防偷瓜的。這兒沒瓜，倒是有劍。'),
        default: [by(MQ.zheng)('俺叫鄭大壯，山下種田的。', '等俺成了正式弟子，就能住兩人一間的房了！')],
      },
    },
    {
      id: 'hou', name: MQ.hou, sprite: 'farmer', pupil: true, power: 15,
      home: at('mq_dorm', 6, 3, 'down'), seat: at('mq_kitchen', 6, 2, 'down'),
      wake: wake(2), sleep: bed(5),
      likes: { chat: 3, stroll: 2, garden: 1, stake: 1, read: 1 },
      talks: {
        chat: say(MQ.hou)('聽說二師姐葉疏桐下山快一年了，到現在都沒個消息……'),
        stroll: say(MQ.hou)('出來透透氣。大通鋪悶得很。'),
        read: say(MQ.hou)('字認得不多，看看圖也好。'),
        sleep: say(MQ.hou)('（翻了個身）……再五刻……再睡五刻就起來……'),
        default: [
          by(MQ.hou)('我是侯三郎，家裡排行老三。記名弟子都住大通鋪，一人一個床位。'),
          by(MQ.hou)('天還沒亮就要起來挑水、劈柴、掃地，練劍反倒是排在最後。'),
        ],
      },
    },
    {
      id: 'qiao', name: MQ.qiao, sprite: 'disciple', script: gateTalk('qiao'), pupil: true, power: 18,
      home: at('mq_dorm', 3, 5, 'up'), seat: at('mq_kitchen', 2, 3, 'right'),
      wake: wake(1), sleep: bed(2),
      // 下午輪他守山門
      duty: (t) => (inT(t, T('未'), T('酉')) ? { act: 'guard', at: at('mingquan', 17, 4, 'left') } : null),
      likes: { stake: 2, chat: 2, water: 1, stroll: 1 },
    },
    {
      id: 'he', name: MQ.he, sprite: 'disciple', script: gateTalk('he'), power: 45, rank: 1,
      home: at('mq_room_a', 2, 2), seat: at('mq_kitchen', 8, 3, 'left'),
      wake: wake(0), sleep: bed(1),
      // 上午輪他守山門
      duty: (t) => (inT(t, T('卯'), T('午')) ? { act: 'guard', at: at('mingquan', 10, 4, 'right') } : null),
      likes: { sword: 2, chat: 2, stake: 1, meditate: 1 },
    },
    {
      id: 'wei', name: MQ.wei, sprite: 'disciple', power: 40, rank: 1,
      home: at('mq_room_a', 4, 2), seat: at('mq_kitchen', 4, 5, 'up'),
      wake: wake(0), sleep: bed(2),
      // 旬休前一天下山到臨江城採買（辰時到申時）
      duty: (t, w) => (dateOf(w.day).date % 10 === 9 && inT(t, T('辰'), T('申')) ? { act: 'shop', at: at('linjiang', 30, 26, 'down') } : null),
      likes: { garden: 2, water: 1, chat: 2, read: 1, sword: 1 },
      talks: {
        shop: say(MQ.wei)('奉師命下山採買：米、鹽、燈油、傷藥……還有卜師傅交代的花椒。', '明天旬休，山上的師弟們也會下來趕集。'),
        garden: say(MQ.wei)('採買的差事做久了，對菜價比對劍法還熟。'),
        default: [by(MQ.wei)('在下韋季安，管採買。山上缺什麼，跟我說一聲，下山時順道帶。')],
      },
    },
    {
      id: 'han', name: MQ.han, sprite: 'sect_elder', person: 'han', power: 200, rank: 3,
      home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
      wake: T('卯'), sleep: T('戌'),
      // 辰時到酉時在練功房看弟子練功（午時吃飯不在）；未時到廣場巡視
      duty: (t) =>
        inT(t, T('未'), T('申')) ? { act: 'stroll', at: at(S, 27, 22, 'left') } : inT(t, T('辰'), T('酉')) && !inT(t, T('午'), T('未')) ? { act: 'watch', at: at('mq_train', 10, 4, 'left') } : { act: 'sleep', at: at(AWAY, 0, 0) },
      likes: {},
    },
    {
      id: 'wen', name: MQ.wen, sprite: 'sect_master', person: 'wen', power: 300, rank: 4,
      home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
      wake: T('卯'), sleep: T('戌'),
      // 辰時到酉時在大殿（午時不在）；未時到後山散步
      duty: (t) =>
        inT(t, T('未'), T('申')) ? { act: 'stroll', at: at('mq_back', 18, 11, 'up') } : inT(t, T('辰'), T('酉')) && !inT(t, T('午'), T('未')) ? { act: 'read', at: at('mq_hall', 7, 4, 'down') } : { act: 'sleep', at: at(AWAY, 0, 0) },
      likes: {},
    },
  ],
});

const GROUP = () => lifeGroups().find((g) => g.id === 'mingquan')!;
const NAME: Record<string, string> = Object.fromEntries(GROUP().npcs.map((n) => [n.id, n.name]));
const npcDef = (id: string) => GROUP().npcs.find((n) => n.id === id)!;
const mem = (w: World, id: string) => memberOf(w, id, { power: npcDef(id).power, rank: npcDef(id).rank });
const isAway = (w: World, id: string) => {
  const m = w.life?.members[id];
  return !!m?.away && m.away.until >= w.day;
};

// ── 名冊：身分、下山、比武名次跟著變 ──────────────────────

MINGQUAN.memberNow = (m, w) => {
  const id = Object.entries(NAME).find(([, n]) => n === m.name)?.[0];
  if (!id) return {};
  const lm = w.life?.members[id];
  const out: { rank?: string; note?: string } = {};
  if (lm && lm.rank === 1 && m.rank === '記名弟子') out.rank = '正式弟子';
  if (lm && lm.rank === 2 && (m.rank === '記名弟子' || m.rank === '正式弟子')) out.rank = '內門弟子';
  const notes: string[] = [];
  if (lm?.away && lm.away.until >= w.day) notes.push(lm.away.why);
  const place = w.life?.ranking?.indexOf(id) ?? -1;
  if (place >= 0) notes.push(`比武第 ${place + 1}`);
  if (notes.length) out.note = notes.join('・');
  return out;
};

// ── 每天半夜：成長、升正式弟子、下山、吵架 ────────────────

/** 每天大約長多少實力（看個性：愛練的長得快） */
const GROW: Record<string, number> = { gu: 0.3, bao: 0.25, tang: 0.28, cao: 0.15, zheng: 0.22, hou: 0.18, qiao: 0.2, he: 0.15, wei: 0.12, lu: 0.08 };
/** 記名弟子實力到這裡，就有機會升正式弟子 */
const PROMOTE_AT = 55;
/** 正式弟子實力到這裡，就有機會升內門弟子 */
const INNER_AT = 90;

function news(w: World, text: string, who: string[]) {
  w.life!.news = [...w.life!.news, { day: w.day, text, who }].slice(-20);
}
const ensure = (w: World, id: string): LifeMember => ((w.life ??= { members: {}, news: [] }).members[id] ??= { power: npcDef(id).power ?? 10, rank: npcDef(id).rank ?? 0 });

onNewDay((w) => {
  w.life ??= { members: {}, news: [] };
  for (const [id, g] of Object.entries(GROW)) {
    const m = ensure(w, id);
    // 回山
    if (m.away && m.away.until < w.day) {
      news(w, `${NAME[id]}${m.away.why}回山了`, [id]);
      delete m.away;
    }
    if (m.away) continue;
    // 你收的徒弟長得快五成
    m.power += g * (0.6 + Math.random() * 0.8) * (m.master === 'hero' ? 1.5 : 1);
    const before = m.rank;
    // 升正式弟子、內門弟子
    if (m.rank === 0 && m.power >= PROMOTE_AT && Math.random() < 0.25) {
      m.rank = 1;
      news(w, `${NAME[id]}通過了正式弟子的考核`, [id]);
    } else if (m.rank === 1 && m.power >= INNER_AT && Math.random() < 0.15) {
      m.rank = 2;
      news(w, `${NAME[id]}過了內門試劍，升為內門弟子`, [id]);
    }
    // 徒弟升了身分，師父也有面子
    if (m.rank > before && m.master === 'hero' && w.sect) {
      addContrib(w, 10);
      news(w, `你的徒弟${NAME[id]}出息了，你也得了門派貢獻 10`, [id]);
    }
    // 正式弟子偶爾下山（大師兄、守山門的何守一不走）
    if (m.rank === 1 && id !== 'he' && id !== 'lu' && Math.random() < 0.02) {
      const why = AWAY_WHY[Math.floor(Math.random() * AWAY_WHY.length)];
      m.away = { until: w.day + 5 + Math.floor(Math.random() * 6), why };
      news(w, `${NAME[id]}${why}去了`, [id]);
    }
  }
  // 較勁的人偶爾吵架
  for (const b of BONDS.filter((x) => x.kind === 'rival')) {
    const ma = ensure(w, b.a);
    if (ma.away || (ma.feud && ma.feud.until >= w.day) || Math.random() >= 0.06) continue;
    const until = w.day + 1 + Math.floor(Math.random() * 3);
    ma.feud = { with: b.b, until };
    ensure(w, b.b).feud = { with: b.a, until };
    news(w, `${NAME[b.a]}和${NAME[b.b]}吵了一架，誰也不理誰`, [b.a, b.b]);
  }
  // 比武小會那天你沒上場：名次照實力排
  if (isMeetDay(w.day - 1) && w.life.meetDay !== w.day - 1) rank(w, null);
});

/** 排名次：照實力排；heroAt 是你的位置（null 就照上次的位置，沒排過就不排進去） */
function rank(w: World, heroAt: number | null) {
  const ls = (w.life ??= { members: {}, news: [] });
  const sorted = FIGHTERS.filter((id) => !isAway(w, id)).sort((a, b) => mem(w, b).power - mem(w, a).power);
  const prev = ls.ranking?.indexOf('hero') ?? -1;
  const pos = heroAt ?? (prev >= 0 ? prev : -1);
  if (pos >= 0 && inSect(w, 'mingquan')) sorted.splice(Math.min(pos, sorted.length), 0, 'hero');
  ls.ranking = sorted;
}

// ── 聊天的八卦 ──────────────────────────────────────────

/** 兩個人在聊什麼（依交情、門派消息、時事） */
function gossip(a: string, b: string): Line[][] {
  const w = st().world;
  const f = st().flags;
  const A = (t: string) => ({ speaker: NAME[a], text: t });
  const B = (t: string) => ({ speaker: NAME[b], text: t });
  const out: Line[][] = [];
  const bond = BONDS.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a));
  if (bond?.kind === 'rival') out.push([A(`${NAME[b]}，這次比武我一定贏你。`), B('上次你也這麼說，結果呢？'), A('上次是我讓你！')]);
  if (bond?.kind === 'friend' && (a === 'zheng' || a === 'hou')) out.push([A('今年家裡的麥子不知收得怎樣……'), B('我娘捎信來說雨水好，應該不差。等旬休下山去看看？')]);
  if (bond?.kind === 'friend' && (a === 'cao' || b === 'cao')) out.push([A('卜師傅今晚燉肉，我聞到了！'), B('噓——上次偷吃被抓，掃了三天茅房，你忘啦？')]);
  if (bond?.kind === 'friend' && (a === 'qiao' || b === 'qiao')) out.push([A('今天上山應考的人又多了兩個。'), B('有一個連石階都爬不完，坐在半山腰喘氣，哈哈。')]);
  if (a === 'gu' || b === 'gu') out.push([{ speaker: MQ.gu, text: '大師兄今天那一劍你看見沒？快得我都沒看清……' }, { speaker: NAME[a === 'gu' ? b : a], text: '嘿，又在說大師兄了。' }]);
  // 門派消息
  for (const n of lifeState(w).news.filter((x) => w.day - x.day <= 5 && !x.who.includes(a) && !x.who.includes(b)).slice(-2))
    out.push([A(`聽說了沒？${n.text}。`), B('真的？……唉，我什麼時候也能這樣。')]);
  const ranking = lifeState(w).ranking;
  if (ranking?.length) out.push([A(`這一旬比武，${ranking[0] === 'hero' ? '你' : NAME[ranking[0]]}拿了頭名。`), B('下回換我！')]);
  // 時事
  if (f.bandit_boss) out.push([A('聽說斷崖寨被人挑了，祁三刀都栽了！'), B('不知道是哪路高手，真想見見。')]);
  if (st().hero.fame >= 15 && member()) out.push([A(`${st().hero.surname || st().hero.given}最近在山下名聲不小呢。`), B('可不是，聽說連縣衙都知道。')]);
  const soon = [1, 2, 3].map((d) => festivalOf(w.day + d)).find(Boolean);
  if (soon) out.push([A(`再過幾天就${soon}了，卜師傅一定會做好吃的。`), B('你就知道吃。')]);
  out.push([A('二師姐葉疏桐下山都快一年了，你說她會不會不回來了？'), B('別亂說，大師兄聽見要生氣的。')]);
  out.push([A('昨晚又聽見後山有笛聲，你聽見沒？'), B('別嚇我，我晚上還要守夜呢。')]);
  return out;
}

// ── 跟他們一起做事（story/life_talk.ts 用） ─────────────────

function addAff(person: string | undefined, n: number) {
  if (!person) return;
  st().updateWorld((w) => {
    const r = (w.relations[person] ??= newRelation());
    r.aff = clampAff(r.aff + n);
  });
  const p = GROUP().npcs.find((x) => x.person === person);
  st().showToast(`${p?.name ?? ''} 熟悉度 +${n}`);
}

/** 同門的實力換成對練時的強弱倍數 */
const powerMult = (p: number) => Math.max(0.6, Math.min(1.4, 0.55 + p / 100));
const drillMoves = (rank: number) => ['e_slash', 'quanyong', ...(rank >= 1 ? ['feipu'] : []), ...(rank >= 2 ? ['shiliu'] : [])];

/** 跟某人對練：實力照他自己練出來的（world.life） */
async function sparWith(ctx: EventCtx, id: string) {
  const d = npcDef(id);
  const m = mem(st().world, id);
  if (!(await exert(ctx, STAMINA.spar, '已經累得喘不過氣，這時候過招只會挨打。'))) return;
  const h = st().hero;
  const o = await ctx.battle(setupDrill(heroUnit(h, derive(h)), { name: d.name, sprite: d.sprite }, drillMoves(m.rank), Math.random, powerMult(m.power)));
  await ctx.say({ speaker: d.name, text: o === 'win' ? '好功夫！再來我可不讓你了。' : o === 'lose' ? '承讓了！你也進步了不少。' : '下回再分高下。' });
  addAff(d.person, 2);
  // 對方也長進一點
  st().updateWorld((w) => (ensure(w, id).power += 0.3));
}

GROUP().hooks = {
  /** 一起練樁、練劍：外功多一成收穫、交情 +2 */
  async practiceWith(ctx: EventCtx, id: string) {
    const d = npcDef(id);
    await ctx.say(`你在${d.name}旁邊站定，跟著一招一式地練。${d.name}不時出聲提點兩句。`);
    await practice(ctx, 30, STAMINA.dummy, 0.1);
    addAff(d.person, 2);
  },
  /** 一起打坐：內功多一成收穫、交情 +2 */
  async sitWith(ctx: EventCtx, id: string) {
    const d = npcDef(id);
    await ctx.say(`你在${d.name}身旁坐下。兩人一起調息，誰也沒出聲。`);
    await sitDown(ctx, 0.1);
    addAff(d.person, 2);
  },
  sparWith,
  /** 湊過去聽兩個人聊天：熟悉度各 +1 */
  async listen(ctx: EventCtx, a: string, b: string) {
    const pool = gossip(a, b);
    const lines = pool[Math.floor(Math.random() * pool.length)];
    await ctx.say(`你湊到${NAME[a]}和${NAME[b]}旁邊。`, ...lines);
    addAff(npcDef(a).person, 1);
    addAff(npcDef(b).person, 1);
  },
  talk: (ctx, id, a) => mqLifeTalkHook(ctx, id, a),
  member,
};

// ── 比武小會、講武（找主持的人） ──────────────────────────

/** 比武小會：連戰三場，從弱到強；照勝場排名次，有賞 */
async function tournament(ctx: EventCtx) {
  const lu = by(MQ.lu);
  const w = st().world;
  if (!member()) return void (await ctx.say(...lu('本門的比武小會，外人只能在旁邊看。')));
  if (lifeState(w).meetDay === w.day) return void (await ctx.say(...lu('今天你已經比過了。下一旬再來！')));
  if ((await ctx.ask(lu('比武小會開始了。要上場嗎？連戰三場，點到為止。')[0], ['上場', '在旁邊看就好'])) !== 0) return;
  if (!(await exert(ctx, STAMINA.spar, '已經累得喘不過氣，這時候上場只會挨打。'))) return;
  const pool = FIGHTERS.filter((id) => !isAway(w, id))
    .map((id) => ({ id, p: mem(w, id).power, r: mem(w, id).rank }))
    .sort((a, b) => a.p - b.p);
  // 從中段挑三個，由弱到強
  const mid = Math.max(0, Math.floor(pool.length / 2) - 1);
  const foes = pool.slice(mid, mid + 3);
  let wins = 0;
  for (const f of foes) {
    const d = npcDef(f.id);
    await ctx.say(`第 ${wins + 1} 場：${d.name}上場。`);
    const h = st().hero;
    const o = await ctx.battle(setupDrill(heroUnit(h, derive(h)), { name: d.name, sprite: d.sprite }, drillMoves(f.r), Math.random, powerMult(f.p)));
    if (o !== 'win') break;
    wins++;
  }
  ctx.pass(4);
  // 名次：排在打贏的最強那個人前面
  const ranked = FIGHTERS.filter((id) => !isAway(w, id)).sort((a, b) => mem(w, b).power - mem(w, a).power);
  const pos = wins ? ranked.indexOf(foes[wins - 1].id) : ranked.length;
  st().updateWorld((x) => {
    rank(x, pos);
    x.life!.meetDay = x.day;
  });
  const place = (st().world.life!.ranking ?? []).indexOf('hero') + 1;
  await ctx.say(...lu(wins === 3 ? '三戰全勝！' : wins ? `贏了 ${wins} 場，不錯。` : '輸了不要緊，下一旬再來。', `這一旬的名次，你排第 ${place}。`));
  if (wins)
    await ctx.hero((h) => {
      h.silver += wins * 5;
      return [`獲得銀兩 ${wins * 5}。`, wins === 3 ? ((h.fame += 2), '名聲 +2。') : null];
    });
  if (wins) await ctx.say(`（${st().updateWorld((x) => addContrib(x, wins * 3))}）`);
  addAff('lu', 1);
}

/** 長老講武：旁聽一回，挑一門武功有所領悟 */
async function lecture(ctx: EventCtx) {
  const han = by(MQ.han);
  const w = st().world;
  const key = `mq:lecture:${w.day}`;
  if (!member()) return void (await ctx.say(...han('本門講武，外人不便旁聽。')));
  if (w.daily[key]) return void (await ctx.say(...han('今天講的，回去好好琢磨。')));
  if ((await ctx.ask(han('今天講「劍隨意走」。坐下來聽吧。')[0], ['坐下旁聽（半個時辰）', '改天'])) !== 0) return;
  st().updateWorld((x) => (x.daily[key] = { day: x.day, n: 1 }));
  ctx.pass(4);
  await ctx.say(...han('劍是死的，人是活的。招式記熟了，要忘掉招式，讓劍跟著心意走。', '你們練劍時，心裡想的是下一招，還是眼前的對手？'), '（聽了半個時辰）');
  const ready = studyable(st().hero);
  if (ready.length) {
    const i = await ctx.ask('聽著聽著，你想起了哪一門武功？', ready.map((s) => skillDef(s).name));
    await ctx.hero((h) => studyInsight(h, ready[i].id, 20));
  } else await ctx.say('（你若有所思。等武功練到能悟新招的時候，這番話會更有用）');
  await ctx.say(`（${st().updateWorld((x) => addContrib(x, 2))}）`);
  addAff('han', 1);
}

/** 主持活動的人：比武小會找陸鳴川、講武找韓靖秋（處理了回傳 true） */
export async function mqLifeTalkHook(ctx: EventCtx, id: string, a: Assign | undefined): Promise<boolean> {
  const w = st().world;
  if (id === 'lu' && a?.act === 'lead' && isMeetDay(w.day) && inT(w.time, MEET.from, MEET.to)) {
    await tournament(ctx);
    return true;
  }
  if (id === 'han' && a?.act === 'lead' && isLectureDay(w.day) && inT(w.time, LECTURE.from, LECTURE.to)) {
    await lecture(ctx);
    return true;
  }
  return false;
}

// ── 守夜：輪到你時，亥時到子時到大殿前敲更鼓巡一圈 ────────────

export const nightDrum: Script = async (ctx) => {
  const w = st().world;
  const day = watchDayOf(w);
  const key = `mq:watch:${day}`;
  const who = watcherOn(day, w);
  if (!member() || who !== 'hero') {
    await ctx.say('值夜用的更鼓，鼓面磨得發亮。', `（今晚值夜的是${who === 'hero' ? '你' : NAME[who]}）`);
    return;
  }
  if (w.daily[key]) return void (await ctx.say('今晚已經巡過了。'));
  if (!nightNow(w.time)) return void (await ctx.say('今晚輪你守夜。亥時到子時再來敲更鼓巡夜。'));
  if ((await ctx.ask('今晚輪你守夜。要敲更巡一圈嗎？（一個時辰）', ['巡夜', '等一下'])) !== 0) return;
  st().updateWorld((x) => (x.daily[key] = { day: x.day, n: 1 }));
  ctx.pass(8);
  const tales: Line[][] = [
    [{ text: '你提著燈籠繞過大通鋪，看見一個人影鬼鬼祟祟地從廚房溜出來——' }, { speaker: MQ.bao, text: '……我、我只是口渴！' }, { text: '他懷裡掉出半個肉包子。' }],
    [{ text: '巡到洗劍池邊，月光照在水面上。遠處後山傳來一陣若有若無的笛聲，一會兒就聽不見了。' }],
    [{ text: '大殿後頭亮著燈。從窗縫看進去，掌門一個人在殿裡慢慢地練劍，一招一式都慢得出奇。' }, { text: '你沒有出聲，悄悄走開了。' }],
    [{ text: '一夜無事。只有風吹過木樁林，發出嗚嗚的聲音。' }],
  ];
  await ctx.say('「咚——咚！」你敲著更鼓，沿著院子巡了一圈。', ...tales[Math.floor(Math.random() * tales.length)], '（巡了一個時辰）');
  await ctx.say(`（${st().updateWorld((x) => addContrib(x, 4))}）`);
};

// ── 今日事：門派消息、活動、守夜 ────────────────────────

registerDailyTasks(({ world }) => {
  if (!inSect(world, 'mingquan')) return [];
  const out: { text: string; state: 'todo' | 'done'; note?: string }[] = [];
  for (const n of (world.life?.news ?? []).filter((x) => world.day - x.day <= 1)) out.push({ text: `門派消息：${n.text}`, state: 'done' });
  if (isMeetDay(world.day)) out.push({ text: '比武小會（未時，演武廣場找陸鳴川）', state: world.life?.meetDay === world.day ? 'done' : 'todo' });
  if (isLectureDay(world.day)) out.push({ text: '韓長老講武（申時，練功房）', state: world.daily[`mq:lecture:${world.day}`] ? 'done' : 'todo' });
  if (watcherOn(world.day, world) === 'hero') out.push({ text: '今晚輪你守夜（亥時到子時，大殿前敲更鼓）', state: world.daily[`mq:watch:${world.day}`] ? 'done' : 'todo' });
  return out;
});
