import type { Script } from '../events';
import type { World } from '../home';
import { registerLife, setOutdoorMaps, type LifeAct, type LifeNpc, type LifeSpot, type Assign, type Spot } from '../life';
import { by } from '../maps/rooms';
import type { Line } from '../maps/types';
import { shopsOf } from '../shop';
import { clampAff, newRelation } from '../social';
import { festivalOf, isXunxiu, SHICHEN_INDEX, shichenStart } from '../time';
import { gainCraft } from '../crafts';
import { useGame } from '../../state/store';
import { playChess } from './arts';
import { ruanStall } from './biyi';
import { fisherTalk } from './dabutou';
import { northTeaTalk } from './sect_mingquan';
import { supplierTalk } from './supplier';

/**
 * 城裡、漁村、港口的人自己過日子（4.29）：跟門派同一套排程（life.ts），只是事情換成市井的——
 * 擺攤、討飯、上茶樓喝茶、樹下下棋、井邊洗衣、出船、補網、搬貨、小孩玩耍、上香。
 *
 * - 臨江城（城南 linjiang、城北 lj_north、望江樓、雲來客棧）：蕭子墨、胡來喜、何六、孫大娘、余二嫂、阿寶、
 *   黃阿順、何婆婆、何小石、杜三嫂、曲老爹。旬休趕集那天，幾位大嬸巳時到未時去逛市集。
 * - 碧漪湖漁村（biyi、湖鮮館、秦家）：秦老漢（卯時出船、午後補網、傍晚棧橋釣魚）、阮大水（清早出船、白天擺魚攤）、
 *   喬小荷（上午採蓮）、汪七（每三天挑魚去青竹村）。
 * - 大埠頭（dabutou、望潮客棧、海神祠）：龐老大（寅時出海、午後補網）、鍾小螺與龐小浪（上午顧魚攤）、
 *   譚大力（白天在東海碼頭扛貨）、殷海客（老水手，喝茶看海）、梅小貝（跟奶奶上香、玩耍）。
 * - 下雨天，室外的事就免了（在家裡，看不到）；夜裡回家（家在地圖外的寫 `_away`，何六睡在城南牆角）。
 * - 兩個人站著聊天時可以湊過去聽（townGossip）：依時事、節慶、你的名聲、你開的店、各地的傳聞。
 * 改成自己過日子的人，地圖檔裡原本的那一份已經拿掉。
 */

const st = () => useGame.getState();
const AWAY = '_away';
const T = (s: keyof typeof SHICHEN_INDEX, ke = 0) => shichenStart(SHICHEN_INDEX[s]) + ke;
const inT = (t: number, a: number, b: number) => t >= a && t < b;
const at = (map: string, x: number, y: number, facing: Spot['facing'] = 'down'): Spot => ({ map, x, y, facing });
const spot = (id: string, map: string, x: number, y: number, facing: Spot['facing'], acts: LifeAct[], pair?: string): LifeSpot => ({ id, map, x, y, facing, acts, pair });
const wet = (w: World) => w.weather === 'rain' || w.weather === 'snow';
const away = (act: LifeAct) => ({ act, at: at(AWAY, 0, 0) });

/** 有人物檔案的人，聽他們聊天也熟一點 */
function addAff(person: string | undefined, n: number) {
  if (!person) return;
  st().updateWorld((w) => {
    const r = (w.relations[person] ??= newRelation());
    r.aff = clampAff(r.aff + n);
  });
}

// ── 街頭閒聊 ────────────────────────────────────────────

type Place = 'city' | 'lake' | 'port';
function townGossip(place: Place, a: LifeNpc, b: LifeNpc): Line[][] {
  const w = st().world;
  const f = st().flags;
  const h = st().hero;
  const A = (t: string) => ({ speaker: a.name, text: t });
  const B = (t: string) => ({ speaker: b.name, text: t });
  const who = h.surname ? `${h.surname}${h.given ? h.given[0] : ''}` : h.name;
  const out: Line[][] = [];
  const soon = [1, 2, 3].map((d) => festivalOf(w.day + d)).find(Boolean);
  if (soon) out.push([A(`再過幾天就${soon}了，家裡的東西備齊了沒？`), B('還沒呢，等趕集那天一起買。')]);
  if (h.fame >= 15) out.push([A(`聽說有個叫${who}的年輕人，最近在江湖上闖出了名號。`), B('我也聽說了！好像還幫官府抓過人呢。')]);
  const shops = Object.values(shopsOf(w));
  if (shops.length) out.push([A(`「${shops[0].name}」換了東家以後，生意好像不錯。`), B(`東家姓${h.surname || '什麼來著'}？聽說人挺和氣的。`)]);
  if (f.bandit_boss) out.push([A('斷崖寨被人挑了，往青竹村那條路太平多了。'), B('是啊，我表哥總算敢挑貨進城了。')]);
  if (w.weather === 'rain') out.push([A('這雨下得，衣裳都晾不乾。'), B('明天要是還下，我就不出門了。')]);
  if (place === 'city') {
    if (isXunxiu(w.day + 1)) out.push([A('明天趕集，田家的山貨要早點去搶。'), B('我要去沈家的絲行看看，聽說來了新線。')]);
    if (f.lj_b_river === 1) out.push([A('江邊那個水匪還沒抓到，夜裡別去碼頭。'), B('縣衙不是貼了懸賞嗎？怎麼沒人去揭？')]);
    if (!f.mq_join) out.push([A('鳴泉山上又在收徒了，我家那小子吵著要去。'), B('山上苦哇，我看他吃不了那個苦。')]);
    out.push([A('望江樓的費先生今天又說《劍俠傳》，聽說說到最精彩的地方了。'), B('那我晚點也去聽！')]);
    out.push([A('漕幫跟鏢局的人前天在碼頭又差點打起來。'), B('唉，神仙打架，凡人遭殃。')]);
  }
  if (place === 'lake') {
    out.push([A('秦老爺子說，月圓那晚湖心島邊上看得見白鯉。'), B('他說了幾十年了，誰見過？')]);
    out.push([A('湖東頭那片密網又多了，誰下的？'), B('還能有誰，城裡來的魚販子唄。')]);
  }
  if (place === 'port') {
    out.push([A('黑帆的船昨天又在外海晃了一圈。'), B('船行說這個月的海船都要結伴走了。')]);
    out.push([A('今天潮水大，龐老大的船回得晚。'), B('他那條老船，也該修修了。')]);
  }
  return out;
}

const listenWith = (place: Place, npcs: LifeNpc[]) => async (ctx: Parameters<Script>[0], a: string, b: string) => {
  const na = npcs.find((n) => n.id === a)!;
  const nb = npcs.find((n) => n.id === b)!;
  const pool = townGossip(place, na, nb);
  await ctx.say(`你湊到${na.name}和${nb.name}旁邊。`, ...pool[Math.floor(Math.random() * pool.length)]);
  addAff(na.person, 1);
  addAff(nb.person, 1);
};

// ── 臨江城 ──────────────────────────────────────────────

const S = 'linjiang';
const N = 'lj_north';
const TOWER = 'lj_tower';
const INN = 'lj_inn';

const CITY_SPOTS: LifeSpot[] = [
  // 聊天（兩兩一組）
  spot('c_chat1a', S, 24, 22, 'right', ['chat'], 'c_chat1b'), spot('c_chat1b', S, 25, 22, 'left', ['chat'], 'c_chat1a'),
  spot('c_chat2a', S, 43, 22, 'right', ['chat'], 'c_chat2b'), spot('c_chat2b', S, 44, 22, 'left', ['chat'], 'c_chat2a'),
  spot('c_chat3a', S, 9, 9, 'right', ['chat'], 'c_chat3b'), spot('c_chat3b', S, 10, 9, 'left', ['chat'], 'c_chat3a'),
  spot('n_chat1a', N, 37, 9, 'right', ['chat'], 'n_chat1b'), spot('n_chat1b', N, 38, 9, 'left', ['chat'], 'n_chat1a'),
  spot('n_chat2a', N, 24, 20, 'right', ['chat'], 'n_chat2b'), spot('n_chat2b', N, 25, 20, 'left', ['chat'], 'n_chat2a'),
  // 散步、採買
  spot('c_walk1', S, 24, 20, 'down', ['stroll']), spot('c_walk2', S, 44, 24, 'down', ['stroll']), spot('c_walk3', S, 29, 9, 'down', ['stroll']),
  spot('n_walk1', N, 26, 25, 'down', ['stroll']), spot('n_walk2', N, 40, 20, 'down', ['stroll']),
  spot('c_shop1', S, 44, 9, 'right', ['shop']), spot('c_shop2', S, 10, 15, 'left', ['shop']), spot('c_shop3', S, 21, 26, 'up', ['shop']),
  // 小孩玩耍
  spot('c_play1', S, 10, 24, 'down', ['play']), spot('c_play2', S, 27, 20, 'down', ['play']), spot('n_play1', N, 22, 15, 'down', ['play']), spot('n_play2', N, 12, 20, 'down', ['play']),
  // 井邊洗衣洗菜
  spot('n_wash1', N, 37, 26, 'right', ['wash']), spot('n_wash2', N, 9, 27, 'up', ['wash']), spot('c_wash1', S, 7, 26, 'up', ['wash']),
  // 望江樓喝茶聽書、客棧喝茶
  spot('t_tea1', TOWER, 2, 5, 'up', ['tea']), spot('t_tea2', TOWER, 6, 5, 'up', ['tea']), spot('t_tea3', TOWER, 7, 3, 'down', ['tea']), spot('t_tea4', TOWER, 3, 3, 'down', ['tea']),
  spot('i_tea1', INN, 2, 5, 'up', ['tea']), spot('i_tea2', INN, 7, 5, 'up', ['tea']),
  // 讀書
  spot('n_read1', N, 21, 9, 'left', ['read']),
];

const CITY_NPCS: LifeNpc[] = [
  {
    id: 'xiao', name: '蕭子墨', sprite: 'scholar',
    // 進城趕考，住在雲來客棧
    home: at(AWAY, 0, 0), seat: at(INN, 4, 4, 'left'),
    wake: T('卯'), sleep: T('亥'),
    duty: (t) => (inT(t, T('辰'), T('午')) ? { act: 'read', at: at(N, 21, 9, 'left') } : null),
    likes: { tea: 3, stroll: 2, chat: 1, read: 1 },
    talks: {
      default: [by('蕭子墨')('小生進城趕考，盤纏卻在路上丟了大半……', '聽說望江樓的掌櫃愛才，或許能讓小生題幾句詩，換頓飯吃。')],
      read: [by('蕭子墨')('「學而不思則罔」……噢，失禮了，小生讀得太入神。'), by('蕭子墨')('書院的呂先生借了小生幾本書，真是好人。')],
      tea: [by('蕭子墨')('費先生說書，句句有典故，小生聽了都想記下來。')],
    },
  },
  {
    id: 'hu', name: '胡來喜', sprite: 'farmer',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('辰'), T('酉')) ? { act: 'stall', at: at(S, 16, 24, 'down') } : null),
    likes: { tea: 2, chat: 2, stroll: 1 },
    talks: {
      stall: [by('胡來喜')('糖人兒——又甜又好看的糖人兒——'), by('胡來喜')('要捏個什麼？猴子、老虎，還是大俠？捏大俠多一文。')],
      default: [by('胡來喜')('收攤囉，糖都賣完了。明兒請早！')],
    },
  },
  {
    id: 'he6', name: '何六', sprite: 'beggar',
    // 睡在城南牆角
    home: at(S, 4, 26, 'down'), seat: at(S, 13, 26, 'down'),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('辰'), T('午')) ? { act: 'beg', at: at(S, 13, 26, 'down') } : inT(t, T('未'), T('酉')) ? { act: 'beg', at: at(S, 40, 15, 'down') } : null),
    likes: { stroll: 1 },
    talks: {
      beg: [by('何六')('行行好，賞口飯吃吧……', '……小子，看你腳步虛浮，下盤不穩。要上鳴泉山，可得多練練。'), by('何六')('望江樓門口好，吃剩的菜比別處多。')],
      sleep: [by('何六')('（縮在牆角打呼）……呼……別吵……')],
      default: [by('何六')('天快黑了，老叫化找個不漏風的地方窩著。')],
    },
  },
  {
    id: 'sun', name: '孫大娘', sprite: 'lady',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('辰'), T('巳')) ? { act: 'shop', at: at(S, 44, 9, 'right') } : null),
    likes: { chat: 3, tea: 1, stroll: 1, shop: 1 },
    talks: {
      shop: [by('孫大娘')('布莊的料子又漲價了，這日子怎麼過喲。')],
      default: [by('孫大娘')('我家那口子在碼頭幫漕幫記帳，天天回來唉聲嘆氣。'), by('孫大娘')('布莊的料子又漲價了，這日子怎麼過喲。')],
    },
  },
  {
    id: 'yu', name: '余二嫂', sprite: 'lady',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('卯', 4), T('辰', 4)) ? { act: 'wash', at: at(S, 7, 26, 'up') } : null),
    likes: { chat: 3, shop: 2, stroll: 1 },
    talks: {
      wash: [by('余二嫂')('一大早就得來打水，晚了井邊排得跟長龍似的。')],
      shop: [by('余二嫂')('一旬才一回集，不早點來，好東西都讓人挑走了！')],
      default: [by('余二嫂')('我家小叔子在鏢局當趟子手，一出門就是半個月。')],
    },
  },
  {
    id: 'abao', name: '阿寶', sprite: 'child',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('辰'), sleep: T('酉', 4),
    likes: { play: 5, stroll: 1 },
    talks: { default: [[{ speaker: '阿寶', text: '我長大了要上鳴泉山學劍！' }, { speaker: '阿寶', text: '可是我娘說，山上的師父很兇……' }], by('阿寶')('嘿！看招！……（拿著樹枝亂揮一通）')] },
  },
  {
    id: 'huang', name: '黃阿順', sprite: 'elder',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('辰'), T('酉')) ? { act: 'stall', at: at(N, 30, 4, 'down') } : null),
    likes: { chat: 2, tea: 1, chess: 1 },
    script: northTeaTalk,
  },
  {
    id: 'hepo', name: '何婆婆', sprite: 'aunt',
    // 何家在城北，白天坐在門口曬太陽
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t, w) => (!wet(w) && inT(t, T('巳'), T('午')) ? { act: 'tea', at: at(N, 34, 15, 'down') } : null),
    likes: { chat: 3, wash: 1 },
    talks: {
      default: [by('何婆婆')('我在城北住了六十年囉。以前這兒沒這麼多房子，都是菜田。'), by('何婆婆')('城南熱鬧是熱鬧，可我還是喜歡城北，夜裡安安靜靜的，聽得見更夫打更。')],
      wash: [by('何婆婆')('老了，手腳不靈光，洗幾件衣裳就腰痠。')],
    },
  },
  {
    id: 'shi', name: '何小石', sprite: 'child',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('辰'), sleep: T('酉', 4),
    // 上午在書院唸書（旬休不用）
    duty: (t, w) => (!isXunxiu(w.day) && inT(t, T('辰'), T('午')) ? away('study') : null),
    likes: { play: 5 },
    talks: { default: [by('何小石')('奶奶說我長大要去書院念書，可我想去鏢局當鏢師！'), by('何小石')('呂先生今天打了我手心……因為我在書上畫烏龜。')] },
  },
  {
    id: 'du', name: '杜三嫂', sprite: 'lady',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('辰'), T('巳', 4)) ? { act: 'wash', at: at(N, 37, 26, 'right') } : null),
    likes: { chat: 3, stroll: 1, shop: 1 },
    talks: { default: [by('杜三嫂')('城北的井水比城南的甜，洗衣裳也乾淨。'), by('杜三嫂')('聽說漕幫跟鏢局又吵起來了，唉，城南那邊老是不太平。')] },
  },
  {
    id: 'qu', name: '曲老爹', sprite: 'elder',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('戌'),
    duty: (t, w) => (!wet(w) && inT(t, T('未'), T('酉')) ? { act: 'chess', at: at(N, 11, 24, 'right') } : null),
    likes: { tea: 3, stroll: 1, chat: 1 },
    talks: {
      chess: [by('曲老爹')('年輕人，坐下來陪老頭子下盤棋？……唉，今天手氣不好，改天吧。'), by('曲老爹')('自己跟自己下也有意思——黑棋是我，白棋也是我，總有一個贏。')],
      tea: [by('曲老爹')('望江樓的茶貴是貴，可費先生說書不收錢，算起來不虧。')],
      default: [by('曲老爹')('人老了，就喜歡曬太陽、下棋、聽書。')],
    },
  },
];

/** 旬休趕集：幾位大嬸巳時到未時去逛市集 */
function cityEvent(w: World): Record<string, Assign> {
  const out: Record<string, Assign> = {};
  if (isXunxiu(w.day) && !wet(w) && inT(w.time, T('巳'), T('未'))) {
    const at2 = [at(S, 32, 26, 'up'), at(S, 36, 26, 'up'), at(S, 40, 26, 'up')];
    ['yu', 'sun', 'du'].forEach((id, i) => (out[id] = { act: 'shop', at: at2[i] }));
  }
  return out;
}

registerLife({
  id: 'linjiang',
  maps: [S, N, TOWER, INN],
  spots: CITY_SPOTS,
  npcs: CITY_NPCS,
  event: cityEvent,
  hooks: {
    listen: listenWith('city', CITY_NPCS),
    // 曲老爹在樹下下棋時，可以陪他下一盤（一天一次）
    extra: (ctx, id, a) =>
      id === 'qu' && a?.act === 'chess' && st().world.daily['town:quchess']?.day !== st().world.day
        ? [
            [
              '陪他下一盤（半個時辰）',
              async () => {
                st().updateWorld((w) => void (w.daily['town:quchess'] = { day: w.day, n: 1 }));
                ctx.pass(4);
                const won = await playChess(ctx, '曲老爹', 3, 1);
                await ctx.say(won ? '曲老爹把棋子一推：「後生可畏！明天再來，老頭子要扳回一城。」' : '曲老爹捋著鬍子笑：「年輕人，取勢要先看穩，別急。」', '（下了半個時辰）');
                await ctx.hero((c) => gainCraft(c, 'chess', won ? 25 : 15));
              },
            ],
          ]
        : [],
  },
});

// ── 碧漪湖漁村 ──────────────────────────────────────────

const BY = 'biyi';
const TAV = 'by_tavern';

const LAKE_SPOTS: LifeSpot[] = [
  spot('l_chat1a', BY, 6, 12, 'right', ['chat'], 'l_chat1b'), spot('l_chat1b', BY, 7, 12, 'left', ['chat'], 'l_chat1a'),
  spot('l_chat2a', BY, 31, 13, 'right', ['chat'], 'l_chat2b'), spot('l_chat2b', BY, 32, 13, 'left', ['chat'], 'l_chat2a'),
  spot('l_chat3a', BY, 17, 13, 'right', ['chat'], 'l_chat3b'), spot('l_chat3b', BY, 18, 13, 'left', ['chat'], 'l_chat3a'),
  spot('l_mend1', BY, 4, 11, 'up', ['mend']), spot('l_mend2', BY, 21, 12, 'up', ['mend']),
  spot('l_fish1', BY, 36, 13, 'right', ['fish']), spot('l_fish2', BY, 29, 25, 'right', ['fish']), spot('l_fish3', BY, 35, 14, 'right', ['fish']),
  spot('l_pick1', BY, 8, 20, 'down', ['pick']), spot('l_pick2', BY, 14, 24, 'left', ['pick']),
  spot('l_play1', BY, 14, 12, 'down', ['play']), spot('l_play2', BY, 12, 20, 'down', ['play']),
  spot('l_walk1', BY, 22, 4, 'down', ['stroll']), spot('l_walk2', BY, 16, 26, 'down', ['stroll']),
  spot('l_tea1', TAV, 3, 5, 'up', ['tea']), spot('l_tea2', TAV, 7, 5, 'up', ['tea']),
];

const lakeBoat = (w: World, from: number, to: number) => !wet(w) && inT(w.time, from, to);

const LAKE_NPCS: LifeNpc[] = [
  {
    id: 'qin', name: '秦老漢', sprite: 'fisher', person: 'qinlao',
    home: at('by_qinhome', 3, 2, 'down'), seat: at(TAV, 4, 4, 'left'),
    wake: T('卯'), sleep: T('戌'),
    // 卯時出船、午後補網、傍晚在棧橋釣魚
    duty: (t, w) =>
      lakeBoat(w, T('卯'), T('午')) ? away('boat') : inT(t, T('未'), T('申')) ? { act: 'mend', at: at(BY, 4, 11, 'up') } : inT(t, T('申'), T('酉')) ? { act: 'fish', at: at(BY, 36, 13, 'right') } : null,
    likes: { tea: 2, chat: 1, fish: 1 },
  },
  {
    id: 'ruan', name: '阮大水', sprite: 'boatman',
    home: at(AWAY, 0, 0), seat: at(TAV, 6, 4, 'right'),
    wake: T('卯'), sleep: T('戌'),
    duty: (t, w) => (lakeBoat(w, T('卯'), T('辰')) ? away('boat') : inT(t, T('辰'), T('申')) ? { act: 'stall', at: at(BY, 27, 14, 'down') } : null),
    likes: { chat: 2, tea: 2, mend: 1 },
    script: supplierTalk('by_ruan', ruanStall),
  },
  {
    id: 'xiaohe', name: '喬小荷', sprite: 'girl',
    home: at(TAV, 6, 3, 'down'), seat: at(TAV, 8, 5, 'up'),
    wake: T('卯'), sleep: T('戌'),
    duty: (t, w) => (!wet(w) && inT(t, T('辰'), T('午')) ? { act: 'pick', at: at(BY, 8, 20, 'down') } : null),
    likes: { play: 4, pick: 1, chat: 1 },
    talks: {
      pick: [by('喬小荷')('荷塘裡的蓮藕可大了！你要不要下來挖？', '……褲腳要挽高一點喔。')],
      sleep: [by('喬小荷')('（打了個哈欠）明天……明天我還要去荷塘……')],
      default: [by('喬小荷')('秦爺爺說湖裡有一條白色的大鯉魚。', '我每天都在找，可是只看到白鵝。'), by('喬小荷')('娘做的菱角糕最好吃了！比城裡的桂花糕還好吃！')],
    },
  },
  {
    id: 'wang', name: '汪七', sprite: 'farmer',
    home: at(AWAY, 0, 0), seat: at(TAV, 2, 5, 'up'),
    wake: T('卯'), sleep: T('戌'),
    // 每三天挑魚去青竹村賣
    duty: (t, w) => (w.day % 3 === 0 && inT(t, T('辰'), T('申')) ? away('haul') : null),
    likes: { mend: 2, chat: 2, fish: 1 },
    talks: {
      default: [by('汪七')('往西走湖畔小路，一刻鐘就到青竹村。', '我每隔幾天就挑魚過去賣，鍾嬸那兒收得最多。'), by('汪七')('這幾年湖裡的魚少了些。秦老爺子說，是有人在湖東頭下了密網。')],
      mend: [by('汪七')('網破了不補，魚就從洞裡溜了。跟做人一樣。')],
    },
  },
];

registerLife({ id: 'biyi', maps: [BY, TAV, 'by_qinhome'], spots: LAKE_SPOTS, npcs: LAKE_NPCS, hooks: { listen: listenWith('lake', LAKE_NPCS) } });

// ── 大埠頭 ──────────────────────────────────────────────

const BP = 'dabutou';
const BPI = 'bp_inn';
const SHRINE = 'bp_shrine';

const PORT_SPOTS: LifeSpot[] = [
  spot('p_chat1a', BP, 15, 15, 'right', ['chat'], 'p_chat1b'), spot('p_chat1b', BP, 16, 15, 'left', ['chat'], 'p_chat1a'),
  spot('p_chat2a', BP, 17, 24, 'right', ['chat'], 'p_chat2b'), spot('p_chat2b', BP, 18, 24, 'left', ['chat'], 'p_chat2a'),
  spot('p_chat3a', BP, 30, 7, 'right', ['chat'], 'p_chat3b'), spot('p_chat3b', BP, 31, 7, 'left', ['chat'], 'p_chat3a'),
  spot('p_mend1', BP, 21, 27, 'down', ['mend']), spot('p_mend2', BP, 33, 24, 'up', ['mend']),
  spot('p_play1', BP, 12, 25, 'down', ['play']), spot('p_play2', BP, 14, 27, 'down', ['play']), spot('p_play3', BP, 24, 6, 'down', ['play']),
  spot('p_walk1', BP, 41, 25, 'down', ['stroll']), spot('p_walk2', BP, 40, 7, 'down', ['stroll']), spot('p_walk3', BP, 23, 28, 'down', ['stroll']),
  spot('p_tea1', BPI, 2, 5, 'up', ['tea']), spot('p_tea2', BPI, 7, 5, 'up', ['tea']), spot('p_tea3', BPI, 5, 3, 'down', ['tea']),
  spot('p_pray1', SHRINE, 3, 2, 'up', ['pray']), spot('p_pray2', SHRINE, 6, 2, 'up', ['pray']),
];

const PORT_NPCS: LifeNpc[] = [
  {
    id: 'pang', name: '龐老大', sprite: 'fisher',
    home: at(AWAY, 0, 0), seat: at(BPI, 4, 4, 'left'),
    wake: T('寅'), sleep: T('戌'),
    // 寅時出海，午前回港；午後補網
    duty: (t, w) => (!wet(w) && inT(t, T('寅', 4), T('午')) ? away('boat') : inT(t, T('未'), T('申', 4)) ? { act: 'mend', at: at(BP, 21, 27, 'down') } : null),
    likes: { tea: 3, chat: 1 },
    script: supplierTalk('bp_pang', fisherTalk),
  },
  {
    id: 'zhong', name: '鍾小螺', sprite: 'lady',
    home: at(AWAY, 0, 0), seat: at(BPI, 6, 4, 'right'),
    wake: T('卯'), sleep: T('戌'),
    duty: (t) => (inT(t, T('卯'), T('未')) ? { act: 'stall', at: at(BP, 25, 25, 'down') } : null),
    likes: { chat: 3, mend: 1, pray: 1 },
    talks: {
      stall: [by('鍾小螺')('買魚到攤子前面挑！早上的最新鮮！')],
      default: [by('鍾小螺')('魚賣完了，明天請早。'), by('鍾小螺')('龐老大那條船，比他年紀還大。')],
    },
  },
  {
    id: 'lang', name: '龐小浪', sprite: 'child',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('酉', 4),
    // 上午幫忙顧攤，傍晚到碼頭等爹回來
    duty: (t) => (inT(t, T('辰'), T('午')) ? { act: 'stall', at: at(BP, 28, 25, 'down') } : null),
    likes: { play: 4, stroll: 1 },
    talks: {
      stall: [by('龐小浪')('海帶、鮮蝦，都是我爹船上撈的！')],
      default: [by('龐小浪')('我爹說，等我長大了就帶我出海！'), by('龐小浪')('我會游泳喔！可以游到那艘大船那邊！……騙你的。')],
    },
  },
  {
    id: 'tan', name: '譚大力', sprite: 'farmer',
    home: at(AWAY, 0, 0), seat: at(BPI, 3, 5, 'up'),
    wake: T('卯'), sleep: T('戌'),
    duty: (t, w) => (!wet(w) && inT(t, T('辰'), T('申')) && !inT(t, T('午'), T('未')) ? { act: 'haul', at: at(BP, 41, 15, 'left') } : null),
    likes: { tea: 2, chat: 2 },
    talks: {
      haul: [by('譚大力')('扛了一早上的貨，海船上的箱子一個比一個重。'), by('譚大力')('漕幫的人說，碼頭上的活兒都得先跟他們打招呼。')],
      default: [by('譚大力')('收工！一身臭汗，先喝碗茶再說。')],
    },
  },
  {
    id: 'yin', name: '殷海客', sprite: 'boatman',
    home: at(AWAY, 0, 0), seat: at(BPI, 8, 5, 'up'),
    wake: T('卯'), sleep: T('亥'),
    likes: { tea: 3, stroll: 3, chat: 1 },
    talks: {
      default: [
        by('殷海客')('我跑了二十年的海，從來沒見過這麼囂張的海盜。', '他們的船快得像飛，掛的是黑帆……'),
        by('殷海客')('東海上有幾座小島，以前漁民在上頭曬網，現在都沒人敢去了。'),
      ],
      stroll: [by('殷海客')('看這雲，明天要起風。老水手的眼睛不會錯。')],
    },
  },
  {
    id: 'mei', name: '梅小貝', sprite: 'child',
    home: at(AWAY, 0, 0), seat: at(AWAY, 0, 0),
    wake: T('卯'), sleep: T('酉', 4),
    // 早上陪奶奶在海神祠上香
    duty: (t) => (inT(t, T('辰'), T('巳')) ? { act: 'pray', at: at(SHRINE, 3, 2, 'up') } : null),
    likes: { play: 5 },
    talks: { default: [by('梅小貝')('奶奶的籤很準喔！上回王伯伯求了下籤，第二天就跌了一跤。')], pray: [by('梅小貝')('海神娘娘保佑，讓龐伯伯今天多捕幾條大魚！')] },
  },
];

registerLife({ id: 'dabutou', maps: [BP, BPI, SHRINE], spots: PORT_SPOTS, npcs: PORT_NPCS, hooks: { listen: listenWith('port', PORT_NPCS) } });

setOutdoorMaps([S, N, BY, BP]);
