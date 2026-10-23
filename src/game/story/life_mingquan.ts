import { registerLife, setOutdoorMaps, type LifeAct, type LifeSpot, type Spot } from '../life';
import { by } from '../maps/rooms';
import { SHICHEN_INDEX, shichenStart } from '../time';
import { MQ, sweeperTalk } from './sect_mingquan';

/**
 * 鳴泉劍派的日常（life.ts）：記名弟子與大師兄自己過日子。
 * - 卯時到辰時做晨課（陸鳴川在演武廣場帶，旬休沒有、下雨也停；有人會睡過頭晚到）。
 * - 午時、酉時到廚房吃飯；天黑各自回床。
 * - 其餘時間照個性：顧小滿愛練樁、愛找人聊天；唐秋生愛打坐讀書；包小川好動；曹小豆一早掃大殿前；鄭大壯、侯三郎是莊稼人，愛挑水弄菜圃。
 * 地點：廣場的木樁林、演武廣場、銅鼎旁、洗劍池、井邊、菜圃；練功房的鐵木樁與蒲團；書房的書架與書案；大通鋪。
 * 方硯清（知客）、齊振遠（教習）、韓靖秋、宋知微等有固定差事的人仍照原本的作息，不在這裡。
 */

const S = 'mq_sect';
const spot = (id: string, map: string, x: number, y: number, facing: Spot['facing'], acts: LifeAct[], pair?: string): LifeSpot => ({ id, map, x, y, facing, acts, pair });
const at = (map: string, x: number, y: number, facing: Spot['facing'] = 'down'): Spot => ({ map, x, y, facing });

setOutdoorMaps([S, 'mq_back']);

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
  // 大通鋪裡聊天（下雨天）
  spot('ch5a', 'mq_dorm', 10, 3, 'right', ['chat'], 'ch5b'),
  spot('ch5b', 'mq_dorm', 11, 3, 'left', ['chat'], 'ch5a'),
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

const wake = (n: number) => shichenStart(SHICHEN_INDEX.卯) + n;
const bed = (n: number) => shichenStart(SHICHEN_INDEX.亥) - 4 + n;
const say = (name: string) => (...t: string[]) => [by(name)(...t)];

registerLife({
  id: 'mingquan',
  maps: [S, 'mq_dorm', 'mq_train', 'mq_lib', 'mq_kitchen', 'mq_room_b', 'mq_cell_1'],
  spots: SPOTS,
  lesson: {
    from: shichenStart(SHICHEN_INDEX.卯),
    to: shichenStart(SHICHEN_INDEX.巳),
    lead: 'lu',
    leadAt: at(S, 23, 21, 'down'),
    at: [at(S, 21, 23, 'up'), at(S, 23, 23, 'up'), at(S, 25, 23, 'up'), at(S, 21, 25, 'up'), at(S, 23, 25, 'up'), at(S, 25, 25, 'up')],
  },
  npcs: [
    {
      id: 'lu', name: MQ.lu, sprite: 'sect_senior', person: 'lu',
      home: at('mq_cell_1', 1, 2), seat: at('mq_kitchen', 7, 2, 'left'),
      wake: shichenStart(SHICHEN_INDEX.寅) + 7, sleep: bed(2),
      likes: { sword: 4, meditate: 2, read: 2, stroll: 1, chat: 1 },
    },
    {
      id: 'gu', name: MQ.gu, sprite: 'disciple_girl', person: 'xiaoman', pupil: true,
      home: at('mq_room_b', 7, 2), seat: at('mq_kitchen', 3, 2, 'right'),
      wake: wake(1), sleep: bed(3),
      likes: { stake: 4, sword: 2, chat: 3, stroll: 1, read: 0.5 },
    },
    {
      id: 'bao', name: MQ.bao, sprite: 'disciple', pupil: true,
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
        default: [by(MQ.bao)('我叫包小川，跟秋生同一天入門的。他練得比我快……我才不服！')],
      },
    },
    {
      id: 'tang', name: MQ.tang, sprite: 'disciple', pupil: true,
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
        default: [by(MQ.tang)('在下唐秋生。小川老說要贏我，可他每天晨課都睡過頭。')],
      },
    },
    {
      id: 'cao', name: MQ.cao, sprite: 'disciple', script: sweeperTalk,
      home: at('mq_dorm', 11, 2), seat: at('mq_kitchen', 6, 4, 'up'),
      wake: wake(0), sleep: bed(0),
      // 一早先掃大殿前（卯時到辰時）
      duty: (t) => (t >= shichenStart(SHICHEN_INDEX.卯) && t < shichenStart(SHICHEN_INDEX.巳) ? { act: 'sweep', at: at(S, 23, 11, 'down') } : null),
      likes: { sweep: 2, water: 2, chat: 2, stroll: 1, stake: 1 },
    },
    {
      id: 'zheng', name: MQ.zheng, sprite: 'farmer', pupil: true,
      home: at('mq_dorm', 2, 2), seat: at('mq_kitchen', 4, 3, 'right'),
      wake: wake(0), sleep: bed(0),
      likes: { water: 3, garden: 3, stake: 2, chat: 1 },
      talks: {
        water: say(MQ.zheng)('挑水俺最在行！在家一天挑二十擔，這點算啥。'),
        garden: say(MQ.zheng)('卜師傅的菜圃，俺幫著鬆鬆土。種地跟練功一樣，急不得。'),
        stake: say(MQ.zheng)('嘿！嘿！……這木樁比俺家的牛還結實。'),
        chat: say(MQ.zheng)('大通鋪住了十幾個人，晚上打呼聲此起彼落……'),
        sleep: say(MQ.zheng)('呼……呼……（鄭大壯已經睡得打呼了）'),
        default: [by(MQ.zheng)('俺叫鄭大壯，山下種田的。', '等俺成了正式弟子，就能住兩人一間的房了！')],
      },
    },
    {
      id: 'hou', name: MQ.hou, sprite: 'farmer', pupil: true,
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
  ],
});
