import { bridgeBuilt, masonTalk } from '../story/bridge';
import { by, exitTo, room } from './rooms';
import { readingShelf } from '../story/reading';
import { practiceAt } from '../story/arts';
import { seam } from './city';
import { MQ } from '../story/sect_mingquan';
import type { MapDef } from './types';

/**
 * 臨江城・城北：民居多，巷子裡住著尋常人家；還有臨江書院、土地祠。
 * 南邊沒有城牆，直接接到城南（linjiang，商街）；北門出城到大地圖，往鳴泉山。
 */
export const ljNorth: MapDef = {
  id: 'lj_north',
  name: '臨江城',
  subtitle: '城北・民居',
  // prettier-ignore
  tiles: [
    'T..T.T..T.T..T.T..T.T..T.T.EE.T..T.T..T.T..T.T..T.T.....',
    '....T.T..T.T..T.T..T.T..T.T::T.T..T.T..T.T..T.T..T.T..T.',
    '.....T.T..T.T..T.T..T.T..T.::.T.T..T.T..T.T..T.T..T.T...',
    '.T.HHHHHHHHHHHHHHHHHHHHHHH====HHHHHHHHHHHHHHHHHHHHHHH...',
    '...H........::........============........::........H..T',
    '...H........::........============........::........HT..',
    '..TH........::........============........::........H...',
    'T..H........::............====............::........H...',
    '...H........::............====............::........H.T.',
    '...H........::............====............::........H...',
    '.T.H::::::::::::::::::::::====::::::::::::::::::::::H...',
    '...H........::............====............::........H..T',
    '...H........::............====............::........HT..',
    '..TH........::............====............::........H...',
    'T..H........::............====............::........H...',
    '...H....*...::............====....*.......::........H.T.',
    '...H........::............====............::........H...',
    '.T.H........::............====............::........H...',
    '...H........::............====............::........H..T',
    '...H........::............====............::........HT..',
    '..TH::::::::::::::::::::::====::::::::::::::::::::::H...',
    'T..H........::............====............::........H...',
    '...H........::............====............::........H.T.',
    '...H........::............====............::........H...',
    '.T.H........::............====............::........H...',
    '...H........::............====............::........H..T',
    '...H........::............====............::........HT..',
    '..TH........::............====............::........H...',
    'T..H.T....*.::..T.........====......*...T.::.....T..H...',
    '...H........::............====............::........H.T.',
  ],
  spawn: { x: 27, y: 4, facing: 'down' },
  battleBg: 'mountain',
  buildings: [
    { style: 'hall', x: 14, y: 4, name: '臨江書院', door: [], enter: { to: 'lj_academy', spawn: { x: 6, y: 7, facing: 'up' } } },
    { style: 'sect_master', x: 34, y: 5, name: '土地祠', door: [{ text: '小小的土地祠，香爐裡插滿了香。' }, { text: '門楣上一塊匾：「保境安民」。' }] },
    { style: 'house', x: 5, y: 5, name: '民居', door: [{ text: '門口晾著一排小孩的衣裳。' }] },
    { style: 'house2', x: 45, y: 5, name: '民居', door: [{ text: '門關著，裡頭傳出搓麻將的聲音。' }] },
    { style: 'home2', x: 5, y: 11, name: '民居', door: [{ text: '院子裡一隻黃狗衝著你叫了兩聲。' }] },
    { style: 'house', x: 15, y: 11, name: '民居', door: [{ text: '門上貼著一張褪了色的門神。' }] },
    { style: 'home3', x: 31, y: 11, name: '何家', door: [{ text: '門虛掩著。何婆婆常坐在門口曬太陽。' }, { text: '（何婆婆不在家）' }] },
    { style: 'house', x: 45, y: 11, name: '民居', door: [{ text: '窗台上擺著幾盆蘭花，養得很好。' }] },
    { style: 'house2', x: 5, y: 16, name: '民居', door: [{ text: '屋裡傳出小孩背書的聲音：「人之初，性本善……」' }] },
    { style: 'home1', x: 16, y: 16, name: '民居', door: [{ text: '一間小屋，門口擺著一雙草鞋。' }] },
    { style: 'house', x: 32, y: 16, name: '民居', door: [{ text: '門關著。門縫裡飄出燉肉的香味。' }] },
    { style: 'home2', x: 45, y: 16, name: '民居', door: [{ text: '院牆上爬滿了牽牛花。' }] },
    { style: 'house', x: 5, y: 21, name: '民居', door: [{ text: '門口坐著一隻打盹的花貓。' }] },
    { style: 'home3', x: 15, y: 21, name: '民居', door: [{ text: '大門緊閉，門環擦得發亮。' }] },
    { style: 'house2', x: 32, y: 21, name: '魯家', door: [{ text: '屋簷下掛著一串串曬乾的辣椒，門口堆著幾塊鑿了一半的石頭。' }] },
    { style: 'house', x: 45, y: 21, name: '民居', door: [{ text: '門上掛著一塊「囍」字，看來剛辦過喜事。' }] },
  ],
  props: [
    { sprite: 'paifang_city', x: 25, y: 3, w: 6, passable: true },
    { sprite: 'sign', x: 29, y: 2, lines: [{ text: '北 ── 鳴泉山\n山上有鳴泉劍派。' }] },
    { sprite: 'well', x: 9, y: 26, lines: [{ text: '巷口的水井，一早就有人排隊打水。' }] },
    { sprite: 'well', x: 38, y: 26, lines: [{ text: '井邊的石板被磨得光滑，幾個大嬸邊洗菜邊聊天。' }] },
    { sprite: 'drying_rack', x: 20, y: 27, w: 2, lines: [{ text: '竹竿上晾著一排被單，被風吹得鼓鼓的。' }] },
    { sprite: 'drying_rack', x: 46, y: 27, w: 2, lines: [{ text: '架上曬著魚乾和菜乾。' }] },
  ],
  npcs: [
    {
      id: 'ljn_guard', allDay: true, name: '朱八斤', sprite: 'guard', x: 25, y: 4, facing: 'right',
      talks: [[{ speaker: '朱八斤', text: '出北門往上走就是鳴泉山。' }, { speaker: '朱八斤', text: '最近上山的年輕人特別多，都是去拜師的。' }]],
    },
    {
      id: 'ljn_disciple', name: MQ.wei, sprite: 'disciple', x: 31, y: 5, facing: 'down',
      talks: [
        [
          { speaker: MQ.wei, text: '在下鳴泉劍派弟子韋季安，奉師命下山採買。' },
          { speaker: MQ.wei, text: '本派正開山收徒，不拘時日。閣下若有意，出北門沿山道往上走，山門就在鳴泉旁。' },
        ],
        [{ speaker: MQ.wei, text: '鳴泉山上有一眼泉水，水擊山石，其聲如鳴，本派因此得名。' }],
      ],
    },
    {
      id: 'ljn_he', name: '何婆婆', sprite: 'aunt', x: 34, y: 15, facing: 'down',
      talks: [
        by('何婆婆')('我在城北住了六十年囉。以前這兒沒這麼多房子，都是菜田。'),
        by('何婆婆')('城南熱鬧是熱鬧，可我還是喜歡城北，夜裡安安靜靜的，聽得見更夫打更。'),
      ],
    },
    { id: 'ljn_kid', name: '何小石', sprite: 'child', x: 22, y: 15, wander: 3, talks: [by('何小石')('奶奶說我長大要去書院念書，可我想去鏢局當鏢師！')] },
    {
      id: 'ljn_du', name: '杜三嫂', sprite: 'lady', x: 37, y: 27, facing: 'left', wander: 1,
      talks: [by('杜三嫂')('城北的井水比城南的甜，洗衣裳也乾淨。'), by('杜三嫂')('聽說漕幫跟鏢局又吵起來了，唉，城南那邊老是不太平。')],
    },
    // 石匠魯一鑿（石岳的師兄）：蓋橋的支線要請他出馬；動工那幾天在渡口
    { id: 'ljn_lu', allDay: true, name: '魯一鑿', sprite: 'smith', x: 31, y: 25, facing: 'right', script: masonTalk, when: (f) => f.bridge !== 2 || bridgeBuilt(f) },
    { id: 'ljn_qu', name: '曲老爹', sprite: 'elder', x: 11, y: 24, facing: 'right', talks: [by('曲老爹')('年輕人，坐下來陪老頭子下盤棋？……唉，今天手氣不好，改天吧。')] },
    {
      id: 'ljn_watch', night: true, name: '邱更生', sprite: 'peddler', x: 28, y: 14, wander: 4,
      talks: [by('邱更生')('天乾物燥——小心火燭——'), by('邱更生')('我打了三十年的更，城北哪家幾點熄燈，我都知道。')],
    },
  ],
  exits: [
    // 北門外：走出去就到大地圖，往鳴泉山的方向
    { tiles: [[27, 0], [28, 0]], world: 'linjiang', worldFrom: 'mingquan' },
  ],
};

// 南邊接到城南：兩區同寬、東西城牆在同一欄
ljNorth.exits.push(...seam(ljNorth.tiles, 'bottom', 'linjiang', { w: 56, h: 38 }, [4, 51]));

/** 臨江書院：城北的書院，經史子集誰都能讀；書案可以練字 */
export const ljAcademy: MapDef = {
  id: 'lj_academy',
  name: '臨江書院',
  subtitle: '臨江城・城北',
  tiles: room(13, 9, 6),
  spawn: { x: 6, y: 7, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'f_shelf_scholar_3', x: 1, y: 1, w: 2, script: readingShelf('書院的藏書，經史子集都有。夫子說，書是給人讀的，不是給人看的。'), label: '讀書' },
    { sprite: 'f_shelf_scholar_3', x: 10, y: 1, w: 2, script: readingShelf('另一架書，多是前人的筆記與詩文集。'), label: '讀書' },
    { sprite: 'portrait', x: 5, y: 0, w: 2, lines: [{ text: '先師的畫像，兩旁寫著：「學而不厭，誨人不倦」。' }] },
    { sprite: 'f_table_scholar_1', x: 3, y: 4, w: 2, script: practiceAt('calligraphy', '學童練字的書案，硯台裡的墨還沒乾。'), label: '練字' },
    { sprite: 'f_table_scholar_1', x: 8, y: 4, w: 2, lines: [{ text: '書案上攤著一本《千字文》，旁邊壓著戒尺。' }] },
  ],
  npcs: [
    {
      id: 'lja_ye', work: true, name: '葉清和', sprite: 'scholar', x: 6, y: 2, facing: 'down',
      talks: [
        by('葉清和')('老夫葉清和，在這書院教了二十年書。', '架上的書，誰來都能讀。讀書不分貴賤，也不分你是拿筆的還是拿劍的。'),
        by('葉清和')('習武的人也該讀點書。不讀書，劍再快，也不知道該往哪裡指。'),
      ],
    },
    {
      id: 'lja_lv', work: true, name: '呂文清', sprite: 'child', x: 9, y: 6, facing: 'up',
      talks: [by('呂文清')('「天地玄黃，宇宙洪荒……」夫子說今天背不完不許回家。')],
    },
  ],
  exits: [exitTo('lj_north', 17, 9, 6, 9)],
};
