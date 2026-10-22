import type { Flags } from '../../state/store';
import { by } from '../maps/rooms';
import { STAGE } from '../social';
import type { PersonDef } from './people';

/**
 * 碧漪湖漁村的人物檔案（秦老漢、喬嫂）與任務日誌「碧漪湖的白鯉」。
 * 玩法腳本在 biyi.ts；這裡只放資料，交談選單用到的腳本動態載入，免得 people.ts 與 biyi.ts 互相引用。
 */

const qin = by('秦老漢');
const qiao = by('喬嫂');

// ── 人物 ────────────────────────────────────────────────

const qinlaoP: PersonDef = {
  id: 'qinlao',
  name: '秦老漢',
  place: '碧漪湖',
  role: '碧漪湖的老漁夫',
  address: (s) => (s >= STAGE.FAMILIAR ? '{姓}小友' : '後生'),
  story: async (ctx) => {
    const c = await ctx.ask(qin('嗯？')[0], ['聊聊', '買釣竿', '撐船去湖心島']);
    if (c === 0) return false;
    if (c === 1) await ctx.panel({ kind: 'shop', title: '秦老漢的漁具', stock: ['rod'] });
    else await (await import('./biyi')).isleBoat(ctx);
    return true;
  },
  talk: { gain: 3, perDay: 2, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      qin('釣魚？急不得。', '浮標沒沉下去就提竿，魚全讓你嚇跑了。'),
      qin('這湖叫碧漪，晴天的時候，水是綠的，一圈一圈的漣漪也是綠的。'),
      qin('{稱}從青竹村來的？柳村長還好吧？我們年輕時一起在湖上撐過船。'),
    ],
    [STAGE.NOD]: [
      qin('清早銀魚多，黃昏鱖魚多，下雨天甲魚出來透氣。', '湖裡的魚，跟人一樣，各有各的時辰。'),
      qin('湖心島上有座望月亭，老漢年輕時常在那兒過夜。'),
      qin('{稱}的手腕穩了些。釣魚跟練武差不多，靠的是耐性。'),
    ],
    [STAGE.FAMILIAR]: [
      qin('老漢這輩子，釣過的魚比吃過的米還多。', '可最忘不了的，是一條沒釣上來的。'),
      qin('白鯉的事，你別到處說。說多了，來的人一多，牠就不出來了。'),
    ],
    [STAGE.CLOSE]: [qin('{稱}，等老漢撐不動船了，這條船就給你。', '……說笑的。這船比老漢還老。')],
  },
  idle: [qin('……噓，魚要咬鉤了。'), qin('今天的風向不對，魚都躲到深水去了。'), qin('（秦老漢瞇著眼，盯著浮標一動也不動）')],
  gift: { likes: { yunwu: 8, tea: 5, jiyu: 6, jiyu_2: 7, stew: 5 } },
  asks: [
    {
      id: 'qin_patience',
      q: '{稱}，你說，釣魚釣的是什麼？',
      answers: [
        { say: '當然是魚。', reply: '哈，實在。可惜釣了一輩子，老漢也只釣到魚。', aff: 0 },
        { say: '釣的是耐性。', reply: '說得好。心急的人，釣不到大魚。', aff: 2 },
        { say: '釣的是一份清閒。', reply: '……嗯。清閒難得啊。', aff: 1 },
      ],
    },
    {
      id: 'qin_lake',
      stage: STAGE.NOD,
      q: '要是有人出大錢，要把這碧漪湖的魚一網打盡，你看怎麼樣？',
      answers: [
        { say: '有錢不賺是傻子。', reply: '哼，網撒完了，明年吃什麼？', aff: -1 },
        { say: '不行，竭澤而漁，湖就死了。', reply: '對嘍。湖是活的，要留一口氣給它。', aff: 3 },
        { say: '湖又不是我的，我管不著。', reply: '……也是。年輕人有年輕人的事。', aff: 0 },
      ],
    },
  ],
  events: [
    {
      id: 'qin_legend',
      at: 10,
      script: async (ctx) => {
        await ctx.say(
          ...qin(
            '{稱}，跟你說個事——你別笑。',
            '這湖裡有一尾白鯉。老漢十七歲那年，在湖心島的望月亭見過牠。',
            '只在月圓那晚，也就是每月十五的夜裡，牠才浮上來看月亮。',
            '那時候老漢的手藝不夠，釣線一下就斷了。',
            '你要是手藝練到了家，帶著釣竿，十五那晚去望月亭等等看。',
            '釣不釣得到，看緣分。釣到了……怎麼辦，你自己拿主意。',
          ),
          '（接下委託「碧漪湖的白鯉」：每月十五夜裡到湖心島的望月亭。釣魚 3 級以上才有本事跟牠周旋）',
        );
        if (!ctx.flag('by_legend')) ctx.setFlag('by_legend', 1);
      },
    },
  ],
};

const qiaoP: PersonDef = {
  id: 'qiao',
  name: '喬嫂',
  place: '碧漪湖',
  role: '湖鮮館的老闆娘',
  address: (s) => (s >= STAGE.FAMILIAR ? '{姓}少俠' : '客官'),
  story: async (ctx) => (await import('./biyi')).qiaoMenu(ctx),
  talk: { gain: 3, perDay: 2, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      qiao('糖醋鯉魚是我們家的招牌，魚要現殺的，醬汁要熬一個時辰。'),
      qiao('{稱}要是自己釣了魚，拿來我教你怎麼做，學費算你便宜……才怪，照收！'),
    ],
    [STAGE.NOD]: [
      qiao('小荷那丫頭，一天到晚泡在荷塘裡，曬得跟小黑炭似的。'),
      qiao('我家那口子三年前撐船去臨江城賣魚，就沒再回來。', '……說是遇上了江上的水匪。唉，不提了，菜要涼了。'),
    ],
    [STAGE.FAMILIAR]: [qiao('{稱}，你常來，館子裡都熱鬧些。', '小荷說你採菱角的樣子笨手笨腳的，笑了一整晚。')],
  },
  idle: [qiao('鍋裡的湯快滾了！'), qiao('今天的鱖魚被訂光囉。'), qiao('客官慢用。')],
  gift: { likes: { osmanthus: 5, silk_thread: 6, mandarin: 6, golden_carp: 10, fine_silk: 10 } },
  asks: [
    {
      id: 'qiao_taste',
      q: '{稱}，你吃魚愛吃哪兒？',
      answers: [
        { say: '魚肚子，沒刺。', reply: '懂吃！下回給你留魚肚。', aff: 2 },
        { say: '魚頭，燉湯最香。', reply: '哎喲，老饕。', aff: 2 },
        { say: '我怕刺，不太吃魚。', reply: '……在湖鮮館說這話，膽子不小。', aff: -1 },
      ],
    },
  ],
};

export const BIYI_PEOPLE: PersonDef[] = [qinlaoP, qiaoP];

export const carpQuest = {
  id: 'by_carp',
  title: '碧漪湖的白鯉',
  status(f: Flags): { text: string; done: boolean } | null {
    if (f.by_carp === 1) return { text: '月圓之夜，你在望月亭釣起了白鯉，又把牠放回湖裡。掌心留下一片銀白的鱗。', done: true };
    if (f.by_carp === 2) return { text: '月圓之夜，你在望月亭釣起了白鯉，把牠帶走了。', done: true };
    if (f.by_legend) return { text: '傳說每月十五的夜裡，白鯉會浮上湖心島的望月亭邊。帶著釣竿去等等看（釣魚 3 級以上才有本事跟牠周旋）。秦老漢可以撐船送你過去。', done: false };
    return null;
  },
};

