import { by } from './rooms';
import { grievanceDrum, noticeBoard } from '../story/yamen';
import { seam } from './city';
import { STALLS, stallAt } from '../story/market';
import { bountyTarget, escortGuardLines } from '../story/linjiang_jianghu';
import { huichunDelivery } from '../story/sect_mingquan';
import type { MapDef } from './types';

/**
 * 臨江城 —— 縣城。雲水河在城南匯入大江，碼頭是漕幫的地盤；城中有縣衙、金刀鏢局、客棧酒樓。
 * 臨江城・城南：商號、客棧、酒樓、衙門、鏢局都在這一區，南門外是碼頭。西門、東門出城到大地圖（往雲水渡口、大埠頭）。
 * 北邊沒有城牆，直接接到城北（lj_north，民居；北門在城北，出去往鳴泉山）。
 */
export const linjiang: MapDef = {
  id: 'linjiang',
  name: '臨江城',
  subtitle: '城南・商街碼頭',
  // prettier-ignore
  tiles: [
    '..TH........::RXXXXXXXXXR.====............::........H...',
    '.T.H........::RXXXXXXXXXR.====............::........H.T.',
    'T..H......*.::RXXXXXXXXXR.====.......*....::........H...',
    '..TH........::RXXXXXXXXXR.====............::........H..T',
    '..TH........::RXXXXXXXXXR.====............::........H.T.',
    '.T.H........::RXXXXXXXXXR.====...........T::........H...',
    'TT.H........::RXXXXXXXXXR.====............::........H.TT',
    '...H........::RRRRXXXRRRR.====............::........H...',
    'T..H......T.::===========.====............::.....T..H...',
    '..TH::::::::::::::::::::::::::::::::::::::::::::::::H...',
    '..TH........::..T.........====.......T....::........HT.T',
    'T..H........::............====............::........H...',
    '..TH........::........==========..........::........HT.T',
    '...H........::........==========..........::........H.TT',
    '.T.H......*.::........==========..........::........HTTT',
    '...H........::........==========..........::........H...',
    'E::=========::============================::=========::E',
    'E::=========::============================::=========::E',
    '...H........::........==========..........::........H..T',
    '..TH........::........==========..........::........H...',
    '...H........::........==========..........::........H...',
    '.T.H........::T.......==========..........::T.......H...',
    'T..H........::..*.........====............::........H...',
    '...H::::::::::::::::::::::::::::::::::::::::::::::::H.T.',
    '...H........::............====............::........HT.T',
    '.T.H........::........T...====......T.....::........H.TT',
    '...H........::............====............::T.......H...',
    '.TTH........::....*.......====............::........H.T.',
    '...HHHHHHHHHHHHHHHHHHHHHHH====HHHHHHHHHHHHHHHHHHHHHHH...',
    '...:::::::::::::::::::============:::::::::::::::::::...',
    '...:::::::::::::::::::============:::::::::::::::::::...',
    '...:::::::::::::::::::============:::::::::::::::::::...',
    '~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~##~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
    '~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~',
  ],
  spawn: { x: 1, y: 16, facing: 'right' },
  battleBg: 'mountain',

  buildings: [
    { style: 'house', x: 5, y: 4, name: '和記當鋪', sign: '和記當鋪', flag: '當', door: [], enter: { to: 'lj_pawn', spawn: { x: 4, y: 5, facing: 'up' } } },
    // 縣衙：院牆圍起來，正面是黑漆大門，門後兩廂、最後面是大堂；從大門進去是中庭（lj_yamen）
    { style: 'yamen_hall', x: 16, y: 0, name: '縣衙大堂', sign: '親民堂', door: [{ text: '院牆擋著，得從大門進去。' }] },
    { style: 'yamen_wing', x: 15, y: 4, name: '縣衙西廂', door: [{ text: '院牆擋著，得從大門進去。' }] },
    { style: 'yamen_wing', x: 21, y: 4, name: '縣衙東廂', door: [{ text: '院牆擋著，得從大門進去。' }] },
    { style: 'yamen_gate', x: 18, y: 5, name: '臨江縣衙', sign: '臨江縣衙', door: [], enter: { to: 'lj_yamen', spawn: { x: 12, y: 15, facing: 'up' } } },
    { style: 'hall', x: 32, y: 4, name: '金刀鏢局', sign: '金刀鏢局', flag: '鏢', door: [], enter: { to: 'lj_escort', spawn: { x: 6, y: 7, facing: 'up' } } },
    { style: 'house2', x: 45, y: 4, name: '錦繡布莊', sign: '錦繡布莊', flag: '布', door: [], enter: { to: 'lj_cloth', spawn: { x: 4, y: 5, facing: 'up' } } },
    { style: 'house2', x: 5, y: 11, name: '回春堂', sign: '回春堂', flag: '藥', door: [], enter: { to: 'lj_clinic', spawn: { x: 4, y: 5, facing: 'up' } } },
    { style: 'teahouse', x: 15, y: 11, name: '雲來客棧', sign: '雲來客棧', flag: '客', door: [], enter: { to: 'lj_inn', spawn: { x: 5, y: 6, facing: 'up' } } },
    { style: 'teahouse', x: 34, y: 11, name: '望江樓', sign: '望江樓', flag: '酒', door: [], enter: { to: 'lj_tower', spawn: { x: 6, y: 6, facing: 'up' } } },
    { style: 'house', x: 45, y: 11, name: '民居', door: [{ text: '門關著。' }, { text: '（屋內尚未開放）' }] },
    { style: 'house', x: 5, y: 18, name: '民居', door: [{ text: '門關著。' }, { text: '（屋內尚未開放）' }] },
    { style: 'home3', x: 15, y: 18, name: '周員外府', sign: '周府', door: [{ text: '朱門緊閉，門房斜眼打量著你。' }, { text: '（屋內尚未開放）' }] },
    { style: 'smithy', x: 35, y: 18, name: '漕幫分舵', sign: '漕幫分舵', door: [], enter: { to: 'lj_guild', spawn: { x: 5, y: 6, facing: 'up' } } },
    { style: 'house2', x: 45, y: 18, name: '民居', door: [{ text: '門關著。' }, { text: '（屋內尚未開放）' }] },
  ],

  props: [
    { sprite: 'paifang_city', x: 25, y: 28, w: 6, passable: true },
    { sprite: 'sign', x: 1, y: 15, lines: [{ text: '「臨江城」\n西 ── 雲水渡口・青竹村' }] },
    // 縣衙門口：石獅子、鳴冤鼓與告示牌（告示牌跟縣衙裡的公告欄一樣，見 story/yamen.ts）
    { sprite: 'stone_lion', x: 17, y: 8, lines: [{ text: '一對石獅子蹲在衙門口，張著嘴，鬃毛被雨水沖得發亮。' }] },
    { sprite: 'stone_lion', x: 21, y: 8, lines: [{ text: '母獅子腳下按著一隻小獅子。' }] },
    { sprite: 'drum', x: 15, y: 8, script: grievanceDrum, label: '鳴冤鼓' },
    { sprite: 'bulletin', x: 23, y: 8, script: noticeBoard('big', '臨江縣・告示牌'), label: '看告示' },
    { sprite: 'well', x: 6, y: 25, lines: [{ text: '城裡的公井，井沿被繩子磨出了一道道溝。' }] },
    { sprite: 'stall', x: 15, y: 25, w: 2, lines: [{ text: '攤子上擺著糖人、紙鳶和各色小玩意。' }] },
    { sprite: 'stall', x: 19, y: 25, w: 2, lines: [{ text: '賣菜的攤子，青菜蘿蔔堆得像小山。' }] },
    // 旬休趕集：城南的四個攤子（見 story/market.ts）
    { sprite: 'stall', x: 31, y: 25, w: 2, script: stallAt('food'), label: '田記山貨', when: (f) => f.xunxiu === 1 },
    { sprite: 'stall', x: 34, y: 25, w: 2, script: stallAt('silk'), label: '江南絲行', when: (f) => f.xunxiu === 1 },
    { sprite: 'stall', x: 38, y: 25, w: 2, script: stallAt('books'), label: '舊書攤', when: (f) => f.xunxiu === 1 },
    { sprite: 'stall', x: 41, y: 25, w: 2, script: stallAt('goods'), label: '舊貨攤', when: (f) => f.xunxiu === 1 },
    { sprite: 'flag', x: 31, y: 7, lines: [{ text: '金刀鏢局的鏢旗，旗上一把金刀。' }] },
    { sprite: 'boat', x: 23, y: 33, w: 3, lines: [{ text: '漕幫的運糧船。' }] },
    { sprite: 'boat', x: 41, y: 34, w: 3, lines: [{ text: '一艘烏篷小船，船家正在補網。' }] },
  ],

  npcs: [
    // 捕快雷小五：白天在城南大街巡邏
    {
      id: 'lj_lei', work: true, name: '雷小五', sprite: 'guard', x: 30, y: 16, wander: 4,
      talks: [
        by('雷小五')('巡街呢！城裡有什麼不平的事，跟我說。', '……不過打架的事別找我，找捕頭。'),
        by('雷小五')('縣衙門口的告示牌記得常看，誰家要賣房子、哪裡有懸賞，都貼在那兒。'),
        by('雷小五')('最近上頭發了海捕文書，抓一個左眉帶疤的傢伙。你要是看見了，可別自己逞強。'),
      ],
    },
    // 鳴泉委託「回春堂送藥」：掌櫃在店門口等藥
    { id: 'lj_huichun', name: '白濟仁', sprite: 'storyteller', x: 8, y: 16, facing: 'down', script: huichunDelivery, when: (f) => f.mq_c_med === 1 },
    {
      id: 'lj_guard_w', allDay: true, name: '馮順', sprite: 'guard', x: 4, y: 15, facing: 'down',
      talks: [[{ speaker: '馮順', text: '臨江城到了。進城守規矩，別在城裡動刀動槍。' }]],
    },
    {
      id: 'lj_guard_w2', allDay: true, name: '魏大牛', sprite: 'guard', x: 4, y: 18, facing: 'up',
      talks: [[{ speaker: '魏大牛', text: '東門修好啦。出了東門就上大路，往東順著大江走，聽說能一直走到海邊。' }]],
    },
    {
      // 站在鏢局門口旁邊，別擋住大門
      id: 'lj_escort', name: '褚大剛', sprite: 'escort', x: 33, y: 10, facing: 'down',
      talks: escortGuardLines,
    },
    {
      id: 'lj_boatman', name: '閻水生', sprite: 'boatman', x: 26, y: 30, facing: 'up', wander: 2,
      talks: [
        [
          { speaker: '閻水生', text: '看什麼看？碼頭是漕幫的地盤，閒人別在這兒晃。' },
          { speaker: '閻水生', text: '……鏢局的人？哼，他們自己的船貨不清不楚，扣下來查查又怎樣。' },
        ],
      ],
    },
    {
      id: 'lj_ferry', name: '董阿七', sprite: 'fisher', x: 19, y: 31, facing: 'down',
      talks: [[{ speaker: '董阿七', text: '要過江？今天風大，不開船囉。（尚未開放）' }]],
    },
    {
      id: 'lj_scholar', name: '蕭子墨', sprite: 'scholar', x: 24, y: 20, wander: 2,
      talks: [
        [
          { speaker: '蕭子墨', text: '小生進城趕考，盤纏卻在路上丟了大半……' },
          { speaker: '蕭子墨', text: '聽說望江樓的掌櫃愛才，或許能讓小生題幾句詩，換頓飯吃。' },
        ],
      ],
    },
    {
      id: 'lj_vendor', name: '胡來喜', sprite: 'farmer', x: 17, y: 26, facing: 'up',
      talks: [[{ speaker: '胡來喜', text: '糖人兒——又甜又好看的糖人兒——' }]],
    },
    {
      id: 'lj_beggar', allDay: true, name: '何六', sprite: 'beggar', x: 13, y: 26, facing: 'down',
      talks: [
        [
          { speaker: '何六', text: '行行好，賞口飯吃吧……' },
          { speaker: '何六', text: '……小子，看你腳步虛浮，下盤不穩。要上鳴泉山，可得多練練。' },
        ],
      ],
    },
    {
      id: 'lj_woman', name: '孫大娘', sprite: 'lady', x: 45, y: 24, wander: 3,
      talks: [[{ speaker: '孫大娘', text: '布莊的料子又漲價了，這日子怎麼過喲。' }]],
    },
    // 旬休趕集的攤主與逛市集的人
    ...(['food', 'silk', 'books', 'goods'] as const).map((id, i) => ({
      id: `lj_market_${id}`,
      name: STALLS[id].vendor,
      sprite: (['farmer', 'lady', 'scholar', 'escort'] as const)[i],
      x: [31, 34, 38, 41][i],
      y: 24,
      facing: 'down' as const,
      when: (f: Record<string, number>) => f.xunxiu === 1,
      talks: [[{ speaker: STALLS[id].vendor, text: STALLS[id].greet }, { text: `（要買東西，走到攤子前面挑貨）` }]],
    })),
    // 縣衙懸賞「江邊水匪」：揭了榜才出現
    { id: 'lj_b_river', allDay: true, name: '江匪', sprite: 'boatman', x: 8, y: 30, facing: 'right', script: bountyTarget('river'), when: (f) => f.lj_b_river === 1 },
    {
      id: 'lj_shopper', name: '余二嫂', sprite: 'lady', x: 36, y: 27, wander: 3, when: (f) => f.xunxiu === 1,
      talks: [[{ speaker: '余二嫂', text: '一旬才一回集，不早點來，好東西都讓人挑走了！' }]],
    },
    {
      id: 'lj_kid', name: '阿寶', sprite: 'child', x: 10, y: 24, wander: 2,
      talks: [[{ speaker: '阿寶', text: '我長大了要上鳴泉山學劍！' }, { speaker: '阿寶', text: '可是我娘說，山上的師父很兇……' }]],
    },
  ],

  exits: [
    // 西門、北門、東門出城都到大地圖（各朝雲水渡口、鳴泉山、大埠頭的方向）
    { tiles: [[0, 16], [0, 17]], world: 'linjiang', worldFrom: 'ferry' },
    { tiles: [[55, 16], [55, 17]], world: 'linjiang', worldFrom: 'dabutou' },
  ],
};

// 北邊接到城北：兩區同寬、東西城牆在同一欄，走過去就像同一條街
linjiang.exits.push(...seam(linjiang.tiles, 'top', 'lj_north', { w: 56, h: 30 }, [4, 51]));
