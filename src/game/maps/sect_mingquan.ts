import { wellUse } from '../story/bandits';
import { fogElder, greeterTalk, herbAt, mushroomAt, mushroomGrown, herbVisible, MQ, sweeperTalk, taskBoard, yardStake } from '../story/sect_mingquan';
import { practiceAt } from '../story/arts';
import { LANTERN_DAYS } from '../festival';
import { graveAt, moonAt, poolAt } from '../story/festival';
import type { MapDef } from './types';

/**
 * 鳴泉劍派 —— 門派院落。從山門進來，正中是大殿，殿前是演武廣場（銅鼎、木樁林），
 * 西側是宿舍區（記名弟子的大通鋪 → 正式弟子的弟子房 → 真傳弟子的個人房），
 * 東側是練功房、書房、武器房、藥房、廚房與菜圃；西南有洗劍池與涼亭；大殿西側小路上後山。
 * 各建築的室內在 sect_mingquan_rooms.ts；入門考驗、拜師、學藝等劇情在 story/sect_mingquan.ts。
 */
export const mqSect: MapDef = {
  id: 'mq_sect',
  name: '鳴泉劍派',
  subtitle: '鳴泉山・劍派院落',
  // prettier-ignore
  tiles: [
    '^T^^^^^^^^^^^^^^^EE^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^T^^^^^^^^^^^^^^^::^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^................::...........................T^',
    '^T..*............::....................Y.......^',
    '^T...............::...........................T^',
    '^..T.............::...........................T^',
    '^................::..................T........T^',
    '^..YY...*........::.........::::::::::........T^',
    '^...T...T.......T::.........::::::::::..*...*..^',
    '^.T..............::.........:..................^',
    '^..............==================.............T^',
    '^..............==================..............^',
    '^T.............==================.............T^',
    '^.....................SSSS....................T^',
    '^:::::::::::::====================::....:......^',
    '^...........::====================:::::::::::::^',
    '^T..........::====================::...........^',
    '^T..........::====================::...........^',
    '^...........::====================::...........^',
    '^T..........::====================::...........^',
    '^...........::====================::..:.....:.T^',
    '^:::::::::::::====================:::::::::::::^',
    '^...........::====================::..........T^',
    '^T..........::====================::...........^',
    '^...........::====================::...........^',
    '^...........::====================::...........^',
    '^..:....:...::====================::...........^',
    '^:::::::::::::====================::..:....:..T^',
    '^...........::.........::.........:::::::::::::^',
    '^.........*...*........::............*......*..^',
    '^.TT.............T.....::...........ffffffffffT^',
    '^...........Y..........::...........fnnnnnnnnf.^',
    '^T..TY........T.T......::...........fnnnnnnnnfT^',
    '^..Y~~~~~~.............::*T.........fnnnnnnnnf.^',
    '^T..~~~~~~.............::Y..........fnnnnnnnnf.^',
    '^T..~~~~~~.............::.........*Yffff.fffffT^',
    '^T..~~~~~~..Y......Y...::.........Y.......Y..*.^',
    '^...~~~~~~*............::*...Y..........**....T^',
    '^.....T.....T..........::...Y.................T^',
    '^...Y...Y...T.*..T.T.T.::...T.......TT....*...T^',
    '^....T.................::......*.........T.....^',
    '^....................T.::.................TY...^',
    '^T..T...............*..::................T...TT^',
    '^...Y..................::.*...........Y.......T^',
    '^TT..YTY...............::.....................T^',
    '^......................EE.....................T^',
  ],
  spawn: { x: 23, y: 44, facing: 'up' },
  battleBg: 'mountain',

  buildings: [
    { style: 'sect_hall', x: 19, y: 4, name: '大殿', door: [], enter: { to: 'mq_hall', spawn: { x: 7, y: 7, facing: 'up' } } },
    { style: 'sect_master', x: 31, y: 3, name: '掌門居', door: [{ text: '門上懸著「靜修」二字，門關著。' }, { text: '（掌門居所，沒有傳喚不得擅入）' }] },
    { style: 'sect_dorm', x: 2, y: 10, name: '大通鋪', door: [], enter: { to: 'mq_dorm', spawn: { x: 7, y: 5, facing: 'up' } } },
    { style: 'sect_room', x: 2, y: 17, name: '弟子房・甲', door: [], enter: { to: 'mq_room_a', spawn: { x: 4, y: 4, facing: 'up' } } },
    { style: 'sect_room', x: 7, y: 17, name: '弟子房・乙', door: [], enter: { to: 'mq_room_b', spawn: { x: 4, y: 4, facing: 'up' } } },
    { style: 'sect_cell', x: 2, y: 23, name: '真傳弟子房・一', door: [], enter: { to: 'mq_cell_1', spawn: { x: 3, y: 3, facing: 'up' } } },
    { style: 'sect_cell', x: 7, y: 23, name: '真傳弟子房・二', door: [], enter: { to: 'mq_cell_2', spawn: { x: 3, y: 3, facing: 'up' } } },
    { style: 'sect_train', x: 37, y: 9, name: '練功房', door: [], enter: { to: 'mq_train', spawn: { x: 6, y: 7, facing: 'up' } } },
    { style: 'sect_lib', x: 36, y: 16, name: '書房', door: [], enter: { to: 'mq_lib', spawn: { x: 5, y: 5, facing: 'up' } } },
    { style: 'sect_armory', x: 42, y: 16, name: '武器房', door: [], enter: { to: 'mq_armory', spawn: { x: 4, y: 4, facing: 'up' } } },
    { style: 'sect_med', x: 36, y: 23, name: '藥房', door: [], enter: { to: 'mq_med', spawn: { x: 5, y: 5, facing: 'up' } } },
    { style: 'sect_kitchen', x: 41, y: 23, name: '廚房', door: [], enter: { to: 'mq_kitchen', spawn: { x: 5, y: 5, facing: 'up' } } },
  ],

  props: [
    // 過年、元宵、中秋掛燈籠
    { sprite: 'lantern_post', x: 21, y: 10, when: (f) => LANTERN_DAYS.includes(f.festival), lines: [{ text: '大殿前掛起了紅燈籠，燈下垂著紙條。' }] },
    { sprite: 'lantern_post', x: 25, y: 10, when: (f) => LANTERN_DAYS.includes(f.festival), lines: [{ text: '紅燈籠在風裡輕輕搖晃。' }] },
    { sprite: 'ding', x: 23, y: 19, w: 2, lines: [{ text: '一座青銅大鼎，鼎中香火不斷。' }, { text: '鼎身鑄著四個字：「劍鳴如泉」。' }] },
    { sprite: 'sect_flag', x: 20, y: 16, lines: [{ text: '鳴泉劍派的旗幟，青底白紋，像一道泉水。' }] },
    { sprite: 'sect_flag', x: 27, y: 16, lines: [{ text: '鳴泉劍派的旗幟，青底白紋，像一道泉水。' }] },
    { sprite: 'f_dummy_martial_2', x: 16, y: 22, script: yardStake, label: '練樁' },
    { sprite: 'f_dummy_martial_2', x: 18, y: 22, script: yardStake, label: '練樁' },
    { sprite: 'f_dummy_martial_2', x: 20, y: 22, script: yardStake, label: '練樁' },
    { sprite: 'f_dummy_martial_1', x: 16, y: 24, script: yardStake, label: '練樁' },
    { sprite: 'f_dummy_martial_1', x: 18, y: 24, script: yardStake, label: '練樁' },
    { sprite: 'f_dummy_martial_1', x: 20, y: 24, script: yardStake, label: '練樁' },
    { sprite: 'f_deco_martial_1', x: 30, y: 24, w: 2, lines: [{ text: '廣場邊的兵器架，木劍、竹劍擺得整整齊齊。' }] },
    { sprite: 'pavilion', x: 10, y: 35, w: 3, script: practiceAt('chess', '聽劍亭。亭柱上刻著一副對聯：「洗劍池邊聽泉語，鳴泉山上看劍心」。'), label: '打譜' },
    { sprite: 'stele', x: 6, y: 31, script: poolAt([{ text: '「洗劍池」' }, { text: '相傳開派祖師每練完一套劍，便在此池中洗劍，池水因此終年清冽，不生青苔。' }]) },
    { sprite: 'sign', x: 22, y: 43, lines: [{ text: '「鳴泉劍派」\n北 ── 大殿・演武廣場\n西 ── 弟子居所\n東 ── 練功房・書房・藥房・武器房・廚房' }] },
    { sprite: 'sign', x: 14, y: 18, lines: [{ text: '弟子居所\n記名弟子住大通鋪，成了正式弟子兩人一間，真傳弟子各有一間。' }] },
    { sprite: 'bulletin', x: 26, y: 21, script: taskBoard, label: '任務榜' },
    { sprite: 'sign', x: 14, y: 21, lines: [{ text: '「木樁林」\n本門弟子每天在此練樁，一日一回，貴在不輟。' }] },
    { sprite: 'well', x: 34, y: 29, script: wellUse, label: '打水' },
    { sprite: 'sign', x: 39, y: 29, lines: [{ text: '膳房菜圃。\n（伙房師傅：「誰踩壞了我的菜，晚飯就別吃了！」）' }] },
  ],

  npcs: [
    { id: 'mqs_greeter', name: MQ.fang, sprite: 'disciple', x: 25, y: 40, facing: 'down', script: greeterTalk },
    // 陸鳴川要帶晨課，寅時末（卯時之前）就到廣場
    { id: 'mqs_lu', name: '陸鳴川', sprite: 'sect_senior', x: 22, y: 21, facing: 'down', person: 'lu', out: 19, meal: 'away' },
    { id: 'mqs_xiaoman', name: '顧小滿', sprite: 'disciple_girl', x: 18, y: 26, facing: 'up', wander: 1, person: 'xiaoman', meal: 'away', when: (f) => !f.rain },
    {
      id: 'mqs_trainee1', name: MQ.bao, sprite: 'disciple', x: 25, y: 23, facing: 'left', wander: 1, meal: 'away', when: (f) => !f.rain,
      talks: [
        [{ speaker: MQ.bao, text: '我叫包小川，跟秋生同一天入門的。他練得比我快……我才不服！' }],
        [{ speaker: MQ.bao, text: '喝！哈！……別看我，師兄說一套劍沒練滿一百遍不許停。' }],
      ],
    },
    {
      id: 'mqs_trainee2', name: MQ.tang, sprite: 'disciple', x: 28, y: 25, facing: 'up', wander: 1, meal: 'away', when: (f) => !f.rain,
      talks: [
        [{ speaker: MQ.tang, text: '在下唐秋生。小川老說要贏我，可他每天晨課都睡過頭。' }],
        [{ speaker: MQ.tang, text: '本派劍法講究「快而不亂，如泉不絕」。說起來簡單，練起來可難了。' }],
      ],
    },
    {
      id: 'mqs_sweeper', name: MQ.cao, sprite: 'disciple', x: 17, y: 12, wander: 2, script: sweeperTalk, meal: 'away',
    },
    {
      id: 'mqs_outer', name: MQ.zheng, sprite: 'farmer', x: 6, y: 15, wander: 2,
      talks: [[{ speaker: MQ.zheng, text: '俺叫鄭大壯，山下種田的。大通鋪住了十幾個人，晚上打呼聲此起彼落……' }, { speaker: MQ.zheng, text: '等俺成了正式弟子，就能住兩人一間的房了！' }]],
    },
  ],

  exits: [
    { tiles: [[23, 45], [24, 45]], to: 'mingquan', spawn: { x: 13, y: 1, facing: 'down' } },
    { tiles: [[17, 0], [18, 0]], to: 'mq_back', spawn: { x: 15, y: 26, facing: 'up' } },
  ],
};

/** 後山：鳴泉源頭、聽泉亭、試劍石、劍塚、望江台；思過崖是禁地。 */
export const mqBack: MapDef = {
  id: 'mq_back',
  name: '鳴泉後山',
  subtitle: '鳴泉劍派・後山',
  // prettier-ignore
  tiles: [
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^',
    '^^^.................T.T.Y....^^^',
    '^^^T............o...~~~~~~~..^^^',
    '^^^T............o...~~~~~~~.^^^^',
    '^^^^T.....o...Y.T...~~~~~~~..^^^',
    '^^^........T......T.~~~~~~~..^^^',
    '^^^...::T.TT........~~~~~~~..^^^',
    '^^^...::.Y.oT..:::::........^^^^',
    '^^^...::.......:::::.........^^^',
    '^^^^T.::::::::::::::::::::T..^^^',
    '^^^...::::::::::::::::::::...^^^',
    '^^^........T...::.....T.....^^^^',
    '^^^............::.........T..^^^',
    '^^^o...........::.........T..^^^',
    '^^^^......T....::............^^^',
    '^^^.T.....Y....::..T.....o..^^^^',
    '^^^............::....T.......^^^',
    '^^^...T........::.....======.^^^',
    '^^^..........T.::.....======.^^^',
    '^^^^.....T.....:::::::======^^^^',
    '^^^............::Y....======.^^^',
    '^^^......T.....::.....======.^^^',
    '^^^....Y.......::............^^^',
    '^^^...o.YT.....::...........^^^^',
    '^^^^...........::....TT.....T^^^',
    '^^^..o.........::............^^^',
    '^^^............EE.........o..^^^',
  ],
  spawn: { x: 15, y: 26, facing: 'up' },
  battleBg: 'mountain',
  buildings: [],
  props: [
    { sprite: 'cave', x: 6, y: 3, w: 2, lines: [{ text: '山壁上一個幽深的洞口，洞前立著木牌：「思過崖・禁地」。' }, { text: '洞裡吹出一陣涼風，隱約聽得見滴水聲。' }] },
    { sprite: 'sign', x: 9, y: 7, lines: [{ text: '「思過崖」\n犯了門規的弟子在此面壁思過。未經許可，不得擅入。' }] },
    { sprite: 'sword_rock', x: 12, y: 4, w: 2, lines: [{ text: '試劍石。石上縱橫交錯，全是劍痕。' }, { text: '有幾道劍痕深達寸許，不知是哪位前輩留下的。' }] },
    { sprite: 'pavilion', x: 17, y: 8, w: 3, script: moonAt(practiceAt('qin', '聽泉亭。坐在亭中，泉水聲叮咚不絕，讓人心思澄靜。')), label: '撫琴' },
    { sprite: 'stele', x: 19, y: 13, lines: [{ text: '「鳴泉」源頭' }, { text: '泉水自山石間湧出，擊石作響，聲如鳴佩。本派因此得名。' }] },
    { sprite: 'sword_grave', x: 4, y: 14, script: graveAt([{ text: '劍塚。歷代前輩的佩劍葬在這裡。' }]) },
    { sprite: 'sword_grave', x: 6, y: 14, script: graveAt([{ text: '劍柄上纏著褪色的劍穗。' }]) },
    { sprite: 'sword_grave', x: 8, y: 14, script: graveAt([{ text: '劍身已經鏽了，卻依然筆直。' }]) },
    { sprite: 'sword_grave', x: 10, y: 14, script: graveAt([{ text: '劍塚。歷代前輩的佩劍葬在這裡。' }]) },
    { sprite: 'sword_grave', x: 5, y: 16, script: graveAt([{ text: '墓前的石碑字跡模糊，只認得出一個「沈」字。' }]) },
    { sprite: 'sword_grave', x: 7, y: 16, script: graveAt([{ text: '劍塚。歷代前輩的佩劍葬在這裡。' }]) },
    { sprite: 'sword_grave', x: 9, y: 16, script: graveAt([{ text: '一把斷劍，只剩半截劍身。' }]) },
    // 蘇芷蘅的拜師試煉：要採的三味藥
    { sprite: 'wild_herb', x: 21, y: 12, script: herbAt('quanxin'), label: '採藥', when: herbVisible('quanxin') },
    { sprite: 'wild_herb', x: 12, y: 16, script: herbAt('tiegu'), label: '採藥', when: herbVisible('tiegu') },
    { sprite: 'wild_herb', x: 26, y: 16, script: herbAt('yungen'), label: '採藥', when: herbVisible('yungen') },
    // 野菌（一處一天採一次）
    { sprite: 'mushrooms', x: 4, y: 22, script: mushroomAt('west'), label: '採菌', when: mushroomGrown('west') },
    { sprite: 'mushrooms', x: 28, y: 13, script: mushroomAt('east'), label: '採菌', when: mushroomGrown('east') },
    { sprite: 'sign', x: 24, y: 17, script: practiceAt('painting', '「望江台」\n站在台上，臨江城與大江盡收眼底。江上白帆點點，遠處的雲水河像一條銀線。'), label: '寫生' },
  ],
  npcs: [
    { id: 'mqb_yan', allDay: true, name: MQ.yan, sprite: 'sect_judge', x: 8, y: 4, facing: 'down', person: 'yan' },
    {
      // 霧天的奇事：清晨起霧時才在泉源旁（見 fogElder）
      id: 'mqb_fog', allDay: true, name: '霧中老人', sprite: 'scholar', x: 18, y: 13, facing: 'right', script: fogElder,
      when: (f) => f.fog === 1 && f.mq_fog_old !== f.today,
    },
    {
      id: 'mqb_elder', allDay: true, name: '邵長庚', sprite: 'storyteller', x: 22, y: 20, facing: 'left', wander: 1,
      talks: [
        [
          { speaker: '邵長庚', text: '年輕人，爬到後山來看風景？' },
          { speaker: '邵長庚', text: '老頭子姓邵，邵長庚。在這兒守了四十年的山，看著一代代弟子上山、下山。' },
          { speaker: '邵長庚', text: '能在劍塚留下一把劍的，沒幾個。' },
        ],
      ],
    },
  ],
  exits: [{ tiles: [[15, 27], [16, 27]], to: 'mq_sect', spawn: { x: 17, y: 1, facing: 'down' } }],
};
