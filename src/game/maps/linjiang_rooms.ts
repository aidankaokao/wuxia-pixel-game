import { clothShopTalk } from '../story/linjiang';
import { loomAt } from '../story/weaving';
import { by, exitTo, room } from './rooms';
import { clinicTalk, innTalk, pawnTalk, tellerTalk, towerTalk } from '../story/linjiang_city';
import { clerkTalk, jailerTalk, magistrateTalk, noticeBoard } from '../story/yamen';
import { bountyBoard, diceTable, escortTalk, guildTalk } from '../story/linjiang_jianghu';
import type { MapDef } from './types';

/** 臨江城各建築的室內。出口回到 linjiang.ts 該屋的門口。 */

export const ljCloth: MapDef = {
  id: 'lj_cloth',
  name: '錦繡布莊',
  subtitle: '臨江城・布莊',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, lines: [{ text: '櫃台上攤著一疋剛裁開的綢子，旁邊擱著剪刀與量尺。' }] },
    { sprite: 'cloth_rack', x: 5, y: 1, w: 2, lines: [{ text: '架上的布疋紅的、藍的、月白的，一捲捲擺得整整齊齊。' }] },
    { sprite: 'mannequin', x: 1, y: 4, lines: [{ text: '衣架上披著一件做好的長衫，等客人來取。' }] },
    { sprite: 'mannequin', x: 7, y: 4, lines: [{ text: '一件錦緞外袍，袖口繡著雲紋，標價九十兩。' }] },
    { sprite: 'loom', x: 5, y: 4, w: 2, script: loomAt('一架織布機，經線繃得整整齊齊。老闆娘說，學了手藝的客人可以借用。'), label: '織布' },
  ],
  npcs: [{ id: 'lj_jin', work: true, name: '魏錦娘', sprite: 'lady', x: 4, y: 3, facing: 'down', script: clothShopTalk }],
  exits: [exitTo('linjiang', 47, 8, 4, 7)],
};

/** 雲來客棧：住店、喝茶聽傳聞 */
export const ljInn: MapDef = {
  id: 'lj_inn',
  name: '雲來客棧',
  subtitle: '臨江城・客棧',
  tiles: room(11, 8, 5),
  spawn: { x: 5, y: 6, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, script: innTalk, label: '住店／打尖' },
    { sprite: 'jars', x: 4, y: 1, w: 2, lines: [{ text: '一罈罈的酒，封口的紅紙寫著「臨江春」。' }] },
    { sprite: 'door_locked', x: 8, y: 0, lines: [{ text: '通往樓上客房的樓梯。住了店，小二會帶你上去。' }] },
    { sprite: 'f_table_plain_1', x: 2, y: 4, w: 2, lines: [{ text: '桌上擺著一碟花生米，一壺沒喝完的茶。' }] },
    { sprite: 'f_table_plain_1', x: 6, y: 4, w: 2, lines: [{ text: '油亮的木桌，邊角被磨得圓圓的。' }] },
    { sprite: 'f_deco_plain_1', x: 9, y: 5, lines: [{ text: '門邊一盆萬年青，葉子擦得發亮。' }] },
  ],
  npcs: [
    { id: 'lji_he', work: true, name: '賀長年', sprite: 'elder', x: 2, y: 2, facing: 'down', script: innTalk },
    {
      id: 'lji_wang', work: true, name: '牛小旺', sprite: 'servant', x: 7, y: 2, facing: 'down', wander: 1,
      talks: [by('牛小旺')('客官要聽新鮮事？跟掌櫃要壺茶，我邊倒邊說！'), by('牛小旺')('來啦來啦——哎喲，這桌的碗還沒收！')],
    },
    {
      id: 'lji_deng', name: '鄧行舟', sprite: 'peddler', x: 8, y: 5, facing: 'left',
      talks: [by('鄧行舟')('在下鄧行舟，跑江南的買賣。這一路上，就數臨江城的客棧最乾淨。'), by('鄧行舟')('下一旬的集，我要帶一批好絲線來。')],
    },
  ],
  exits: [exitTo('linjiang', 17, 15, 5, 8)],
};

/** 望江樓：點菜、聽說書 */
export const ljTower: MapDef = {
  id: 'lj_tower',
  name: '望江樓',
  subtitle: '臨江城・酒樓',
  tiles: room(13, 8, 6),
  spawn: { x: 6, y: 6, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, script: towerTalk, label: '點菜' },
    { sprite: 'f_table_scholar_1', x: 8, y: 1, w: 2, script: tellerTalk, label: '聽說書' },
    { sprite: 'f_table_scholar_1', x: 2, y: 4, w: 2, lines: [{ text: '桌上杯盤狼藉，看來剛散了一桌酒席。' }] },
    { sprite: 'f_table_scholar_1', x: 6, y: 4, w: 2, lines: [{ text: '窗邊的好位子，看得見江上的白帆。' }] },
    { sprite: 'f_table_scholar_1', x: 10, y: 4, w: 2, lines: [{ text: '一桌江湖客，刀就擱在桌上。' }] },
    { sprite: 'f_deco_scholar_1', x: 5, y: 0, lines: [{ text: '牆上題著一首詩：「江上清風無盡藏，樓頭明月有時圓」。' }] },
  ],
  npcs: [
    { id: 'ljt_wang', work: true, name: '汪福來', sprite: 'servant', x: 2, y: 2, facing: 'down', script: towerTalk },
    { id: 'ljt_fei', work: true, name: '費一言', sprite: 'storyteller', x: 8, y: 2, facing: 'down', script: tellerTalk },
    {
      id: 'ljt_fang', work: true, name: '方子期', sprite: 'scholar', x: 4, y: 5, facing: 'up',
      talks: [by('方子期')('費先生的書，我天天來聽。他說的那些江湖事，十句裡總有一兩句是真的。'), by('方子期')('在下方子期，進京趕考落了榜，在這兒等明年。')],
    },
    {
      id: 'ljt_du', name: '杜九', sprite: 'swordsman', x: 11, y: 5, facing: 'left',
      talks: [by('杜九')('……看什麼？沒見過喝酒的？'), by('杜九')('金刀鏢局要人手，可惜我只會喝酒。')],
    },
  ],
  exits: [exitTo('linjiang', 36, 15, 6, 8)],
};

/** 回春堂：買藥、看傷、收草藥 */
export const ljClinic: MapDef = {
  id: 'lj_clinic',
  name: '回春堂',
  subtitle: '臨江城・藥鋪',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'f_shelf_scholar_3', x: 1, y: 1, w: 2, lines: [{ text: '一整面牆的藥櫃，抽屜上貼滿了藥名：當歸、黃耆、川芎……' }] },
    { sprite: 'counter', x: 4, y: 1, w: 3, script: clinicTalk, label: '看診／買藥' },
    { sprite: 'drying_rack', x: 1, y: 4, w: 2, lines: [{ text: '竹篩上攤著曬乾的草藥，聞起來苦苦的。' }] },
    { sprite: 'jars', x: 6, y: 4, w: 2, lines: [{ text: '一排藥罈，罈口用油紙封著。' }] },
  ],
  npcs: [
    // 委託「回春堂送藥」進行中時，白濟仁在店門口等（見 linjiang.ts），屋裡就不在
    { id: 'ljc_bai', work: true, name: '白濟仁', sprite: 'storyteller', x: 5, y: 2, facing: 'down', script: clinicTalk, when: (f) => f.mq_c_med !== 1 },
    {
      id: 'ljc_shao', work: true, name: '白小芍', sprite: 'child', x: 3, y: 3, facing: 'down', wander: 1,
      talks: [by('白小芍')('我在幫爺爺搗藥！這是止血草，這是……這是……我忘了。'), by('白小芍')('爺爺說，止血草送來回春堂，比賣給貨郎划算多了。')],
    },
  ],
  exits: [exitTo('linjiang', 7, 15, 4, 7)],
};

/** 和記當鋪：典當、死當貨 */
export const ljPawn: MapDef = {
  id: 'lj_pawn',
  name: '和記當鋪',
  subtitle: '臨江城・當鋪',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'counter', x: 3, y: 2, w: 3, script: pawnTalk, label: '當鋪櫃台' },
    { sprite: 'f_shelf_plain_1', x: 1, y: 1, w: 2, lines: [{ text: '架上擺著一排當票，最舊的一張已經發黃了。' }] },
    { sprite: 'jars', x: 6, y: 1, w: 2, lines: [{ text: '幾個貼了封條的木箱，上頭寫著「死當」。' }] },
  ],
  npcs: [{ id: 'ljp_ho', allDay: true, name: '和守義', sprite: 'elder', x: 4, y: 1, facing: 'down', script: pawnTalk }],
  exits: [exitTo('linjiang', 7, 8, 4, 7)],
};

/** 金刀鏢局：接鏢 */
export const ljEscort: MapDef = {
  id: 'lj_escort',
  name: '金刀鏢局',
  subtitle: '臨江城・鏢局',
  tiles: room(13, 9, 6),
  spawn: { x: 6, y: 7, facing: 'up' },
  theme: 'martial',
  buildings: [],
  props: [
    { sprite: 'counter', x: 5, y: 2, w: 3, script: escortTalk, label: '接鏢' },
    { sprite: 'f_deco_martial_1', x: 1, y: 1, w: 2, lines: [{ text: '兵器架上插著刀槍，刀柄都纏著防滑的布條。' }] },
    { sprite: 'f_deco_martial_1', x: 10, y: 1, w: 2, lines: [{ text: '架上擱著一把金漆大刀，刀背上刻著「三十年不失一鏢」。' }] },
    { sprite: 'f_dummy_martial_2', x: 2, y: 5, lines: [{ text: '鏢師們練刀用的木人，身上滿是刀痕。' }] },
    { sprite: 'jars', x: 9, y: 5, w: 2, lines: [{ text: '幾口貼了封條的鏢箱，等著明天上路。' }] },
  ],
  npcs: [
    { id: 'lje_jin', allDay: true, name: '金萬山', sprite: 'sect_judge', x: 6, y: 1, facing: 'down', script: escortTalk },
    {
      id: 'lje_lv', work: true, name: '呂鐵', sprite: 'escort', x: 4, y: 5, facing: 'left', wander: 1,
      talks: [by('呂鐵')('走鏢最怕兩樣：一怕劫匪，二怕下雨。路一爛，車就走不動。'), by('呂鐵')('遠程的鏢，總鏢頭只交給有名號的人。')],
    },
  ],
  exits: [exitTo('linjiang', 35, 9, 6, 9)],
};

/**
 * 臨江縣衙・中庭：從大門進來，正前方是大堂，西廂簽押房、東廂捕快房，東北角是縣牢（獄卒守著）。
 * 城裡看到的外觀在 linjiang.ts（院牆、大門、兩廂、大堂）。
 */
export const ljYamen: MapDef = {
  id: 'lj_yamen',
  name: '臨江縣衙',
  subtitle: '臨江城・縣衙中庭',
  // prettier-ignore
  tiles: [
    'RRRRRRRRRRRRRRRRRRRRRRRRR',
    'R=======================R',
    'R=T==T==================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=======================R',
    'R=T===================T=R',
    'R=======================R',
    'RRRRRRRRRRRRERRRRRRRRRRRR',
  ],
  spawn: { x: 12, y: 15, facing: 'up' },
  buildings: [
    { style: 'yamen_main', x: 8, y: 1, name: '大堂', sign: '親民堂', door: [], enter: { to: 'lj_yamen_hall', spawn: { x: 6, y: 7, facing: 'up' } } },
    { style: 'yamen_side', x: 2, y: 7, name: '簽押房', sign: '簽押房', door: [], enter: { to: 'lj_yamen_west', spawn: { x: 4, y: 5, facing: 'up' } } },
    { style: 'yamen_side', x: 18, y: 7, name: '捕快房', sign: '捕快房', door: [], enter: { to: 'lj_yamen_east', spawn: { x: 5, y: 6, facing: 'up' } } },
    { style: 'yamen_jail', x: 18, y: 2, name: '縣牢', sign: '縣牢', door: [{ text: '鐵皮包著的牢門，上了三道鎖。' }] },
  ],
  props: [
    { sprite: 'stele', x: 12, y: 13, lines: [{ text: '戒石上刻著幾行字：「一粥一飯，皆出民力；一錢不義，天必記之。」' }, { text: '是歷任知縣立在堂前自警的。' }] },
    { sprite: 'bulletin', x: 9, y: 14, script: noticeBoard('big', '臨江縣衙・公告欄'), label: '公告欄' },
    { sprite: 'lantern_post', x: 10, y: 6, lines: [{ text: '大堂前的燈籠，夜裡升堂才點。' }] },
    { sprite: 'lantern_post', x: 14, y: 6, lines: [{ text: '燈籠上寫著一個「臨」字。' }] },
    { sprite: 'vat', x: 22, y: 12, lines: [{ text: '防火用的大水缸，缸裡浮著兩片落葉。' }] },
    { sprite: 'vat', x: 2, y: 12, lines: [{ text: '防火用的大水缸，水面映著天。' }] },
    { sprite: 'f_deco_martial_1', x: 22, y: 5, lines: [{ text: '兵器架上插著水火棍與鐵尺，衙役升堂時拿的。' }] },
  ],
  npcs: [
    { id: 'ljy_gao', work: true, name: '高升', sprite: 'guard', x: 12, y: 10, wander: 3, talks: [by('高升')('威——武——', '……咳，練習一下，晚點要升堂。'), by('高升')('公告欄每天都有人來看，要找房子、找差事的，都先看那兒。'), by('高升')('大堂是老爺問案的地方，進去別大聲嚷嚷。'), by('高升')('東北角是縣牢，鄒老七守著，那老頭脾氣怪，別去惹他。')] },
    { id: 'ljy_zou', allDay: true, name: '鄒老七', sprite: 'guard', x: 19, y: 5, facing: 'down', script: jailerTalk },
  ],
  exits: [exitTo('linjiang', 19, 8, 12, 17)],
};

/** 縣衙大堂：知縣升堂問案的地方 */
export const ljYamenHall: MapDef = {
  id: 'lj_yamen_hall',
  name: '親民堂',
  subtitle: '臨江縣衙・大堂',
  tiles: room(13, 9, 6),
  spawn: { x: 6, y: 7, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'altar', x: 5, y: 2, w: 3, lines: [{ text: '公案上擺著驚堂木與籤筒，「明鏡高懸」的匾額就在頭頂。' }] },
    { sprite: 'f_deco_scholar_1', x: 2, y: 0, lines: [{ text: '牆上掛著「肅靜」「迴避」兩面木牌。' }] },
    { sprite: 'f_deco_martial_1', x: 10, y: 0, lines: [{ text: '架上一排水火棍，漆成上紅下黑。' }] },
  ],
  npcs: [
    { id: 'ljy_lu', allDay: true, name: '盧秉文', sprite: 'scholar', x: 6, y: 1, facing: 'down', script: magistrateTalk },
    { id: 'ljy_fang', work: true, name: '方大成', sprite: 'guard', x: 3, y: 4, facing: 'right', talks: [by('方大成')('老爺問案的時候，站兩邊的就是我們。'), by('方大成')('堂下跪的那塊石板，都被膝蓋磨亮了。')] },
    { id: 'ljy_tang', work: true, name: '湯小滿', sprite: 'guard', x: 9, y: 4, facing: 'left', talks: [by('湯小滿')('站一整天，腿都麻了……噓，別跟老爺說。')] },
  ],
  exits: [exitTo('lj_yamen', 12, 6, 6, 9)],
};

/** 西廂簽押房：師爺辦公，房契地契、商號登記都在這裡 */
export const ljYamenWest: MapDef = {
  id: 'lj_yamen_west',
  name: '簽押房',
  subtitle: '臨江縣衙・西廂',
  tiles: room(9, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'f_table_scholar_1', x: 1, y: 2, w: 2, script: clerkTalk, label: '找師爺' },
    { sprite: 'f_shelf_scholar_2', x: 5, y: 0, w: 2, lines: [{ text: '架上堆滿卷宗：魚鱗冊、戶籍、房契底簿，每一卷都用麻繩捆著。' }] },
    { sprite: 'f_table_scholar_1', x: 6, y: 3, w: 2, lines: [{ text: '書辦的桌上攤著一本帳，算盤珠子撥到一半。' }] },
  ],
  npcs: [
    { id: 'ljy_miao', allDay: true, name: '苗守正', sprite: 'storyteller', x: 2, y: 1, facing: 'down', script: clerkTalk },
    { id: 'ljy_ge', work: true, name: '葛文顯', sprite: 'scholar', x: 6, y: 2, facing: 'down', talks: [by('葛文顯')('在下是戶房書辦。買屋賣屋、立契過戶，都要在這兒蓋印。', '找師爺就行，他點了頭，在下就替你寫契。'), by('葛文顯')('城北那幾間民居，好些是祖上傳下來的，屋主不住了才肯賣。')] },
  ],
  exits: [exitTo('lj_yamen', 4, 11, 4, 7)],
};

/** 東廂捕快房：捕頭領懸賞，捕快值完班在這裡歇腳 */
export const ljYamenEast: MapDef = {
  id: 'lj_yamen_east',
  name: '捕快房',
  subtitle: '臨江縣衙・東廂',
  tiles: room(11, 8, 5),
  spawn: { x: 5, y: 6, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'bulletin', x: 8, y: 1, script: noticeBoard('urgent', '捕快房・懸賞榜'), label: '懸賞榜' },
    { sprite: 'f_table_plain_1', x: 4, y: 3, w: 2, lines: [{ text: '桌上一壺涼掉的茶，幾個缺口的粗碗，還有一副骰子——被沒收的。' }] },
    { sprite: 'f_bed_plain_1', x: 1, y: 1, lines: [{ text: '值夜的捕快輪流睡的鋪，被子疊得歪歪扭扭。' }] },
    { sprite: 'f_bed_plain_1', x: 1, y: 4, lines: [{ text: '枕頭底下塞著一本翻爛的話本。' }] },
    { sprite: 'f_deco_martial_1', x: 9, y: 4, lines: [{ text: '牆上掛著鐵尺、鎖鏈與幾副枷，都擦得發亮。' }] },
  ],
  npcs: [
    { id: 'ljy_huo', work: true, name: '霍青山', sprite: 'guard', x: 6, y: 1, facing: 'down', script: bountyBoard },
    { id: 'ljy_lei_n', night: true, name: '雷小五', sprite: 'guard', x: 3, y: 4, facing: 'right', talks: [by('雷小五')('巡了一天的街，腿都快斷了。', '你也這麼晚還在外頭晃？小心點，夜裡城裡也不太平。')] },
  ],
  exits: [exitTo('lj_yamen', 20, 11, 5, 8)],
};

/** 漕幫分舵：扛貨、擲骰子 */
export const ljGuild: MapDef = {
  id: 'lj_guild',
  name: '漕幫分舵',
  subtitle: '臨江城・漕幫',
  tiles: room(11, 8, 5),
  spawn: { x: 5, y: 6, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'jars', x: 1, y: 1, w: 2, lines: [{ text: '堆成小山的米包與貨箱，上頭都蓋著漕幫的印。' }] },
    { sprite: 'jars', x: 8, y: 1, w: 2, lines: [{ text: '一排酒罈，有幾罈已經開了封。' }] },
    { sprite: 'f_table_plain_1', x: 6, y: 4, w: 2, script: diceTable, label: '擲骰子' },
    { sprite: 'vat', x: 1, y: 5, lines: [{ text: '一大缸水，幫眾扛完貨都來這兒舀水喝。' }] },
  ],
  npcs: [
    { id: 'ljg_peng', allDay: true, name: '彭大江', sprite: 'boss', x: 4, y: 2, facing: 'down', script: guildTalk },
    {
      id: 'ljg_hou', allDay: true, name: '侯三', sprite: 'bandit', x: 8, y: 4, facing: 'left',
      talks: [by('侯三')('來來來，押大押小？……喔，我們這兒是比大小，點大的贏。'), by('侯三')('舵主說了，鏢局的人進來，一律請喝茶——涼茶。')],
    },
  ],
  exits: [exitTo('linjiang', 37, 22, 5, 8)],
};

export const LINJIANG_ROOMS = [ljCloth, ljInn, ljTower, ljClinic, ljPawn, ljEscort, ljYamen, ljYamenHall, ljYamenWest, ljYamenEast, ljGuild];
