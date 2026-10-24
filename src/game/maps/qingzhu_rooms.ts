import { smithRack } from '../story/weapons';
import { practiceAt } from '../story/arts';
import { by, exitTo, room } from './rooms';
import type { MapDef } from './types';

/**
 * 青竹村各屋的室內：柳家大宅、竹風茶寮、石家鐵鋪、王家。
 * 出口回到村裡該屋的門口（qingzhu.ts 的 buildings 用 enter 連過來）。
 */

// ── 柳家大宅 ────────────────────────────────────────────

const fu = by('老福');

export const qzLiu: MapDef = {
  id: 'qz_liu',
  name: '柳家大宅',
  subtitle: '青竹村・村長家',
  tiles: room(11, 7, 5),
  spawn: { x: 5, y: 5, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'altar', x: 4, y: 1, w: 3, lines: [{ text: '供桌上擺著柳家歷代先人的牌位，香爐裡的三炷香才剛點上。' }] },
    { sprite: 'f_deco_scholar_1', x: 2, y: 0, lines: [{ text: '一幅字：「耕讀傳家」。墨色已有些淡了。' }] },
    { sprite: 'f_deco_scholar_1', x: 8, y: 0, lines: [{ text: '一幅山水，題款是「蒼嵐春色」。' }] },
    { sprite: 'chair', x: 3, y: 2, lines: [{ text: '一張太師椅，扶手磨得發亮。' }] },
    { sprite: 'chair', x: 7, y: 2, lines: [{ text: '一張太師椅，扶手磨得發亮。' }] },
    { sprite: 'f_shelf_scholar_2', x: 1, y: 4, w: 2, lines: [{ text: '架上多是農書與帳冊，也有幾本泛黃的拳譜。' }] },
    { sprite: 'f_deco_plain_1', x: 9, y: 5, lines: [{ text: '一盆修剪整齊的文竹。' }] },
    {
      sprite: 'door_locked', x: 10, y: 3,
      lines: [{ text: '東廂房的門關著。' }, { speaker: '老福', text: '那是老爺的書房，沒有老爺吩咐，誰也不能進。' }],
    },
  ],
  npcs: [
    {
      id: 'fu', name: '老福', sprite: 'servant', x: 7, y: 4, facing: 'left', wander: 1,
      talks: [
        fu('客人請坐。老爺平時都在外頭廣場上跟鄉親們說話，難得回屋。'),
        fu('柳家在青竹村住了五代人了。老太爺那一輩，還出過一位在臨江城開武館的。', '可惜後來……唉，不提了。'),
      ],
    },
  ],
  exits: [exitTo('qingzhu', 20, 16, 5, 7)],
};

// ── 竹風茶寮 ────────────────────────────────────────────

const ge = by('葛先生');
const yun = by('鍾小芸');

export const qzTea: MapDef = {
  id: 'qz_tea',
  name: '竹風茶寮',
  subtitle: '青竹村・茶館',
  tiles: room(11, 7, 4),
  spawn: { x: 4, y: 5, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'counter', x: 1, y: 1, w: 3, lines: [{ text: '櫃台上擺著茶壺、茶碗，還有一罐鍾嬸醃的梅子。' }] },
    { sprite: 'jars', x: 8, y: 1, w: 2, lines: [{ text: '一格格的茶罐，寫著「竹葉」「雲霧」「老梅」。' }] },
    { sprite: 'f_table_plain_1', x: 2, y: 3, w: 2, lines: [{ text: '桌上還留著半碗沒喝完的茶。' }] },
    { sprite: 'f_table_plain_1', x: 7, y: 3, w: 2, script: practiceAt('chess', '桌上擱著一副棋，一盤殘局還沒下完。'), label: '打譜' },
    { sprite: 'f_deco_plain_1', x: 9, y: 5, lines: [{ text: '一盆青竹，跟茶寮的名字很相配。' }] },
  ],
  npcs: [
    {
      id: 'ge', work: true, name: '葛先生', sprite: 'storyteller', x: 5, y: 2, facing: 'down',
      talks: [
        ge(
          '（醒木一拍）話說四十年前，雲水河上游有座「聽濤閣」，',
          '閣主一手「觀瀾掌」，掌力如江潮層層疊疊，一掌接一掌，最後一掌能把河水拍得倒流三尺！',
          '後來聽濤閣一夜之間人去樓空，至今沒人說得清是怎麼回事……欲知後事，明日請早！',
        ),
        ge(
          '今日說一段「碧漪湖的白鯉」。',
          '相傳湖底住著一尾千年白鯉，月圓之夜才浮上水面。見過牠的漁人，第二年必定豐收。',
          '秦老漢說他年輕時見過一回——信不信，就由各位了。',
        ),
        ge(
          '南嶺古道荒廢多年，你道為何？',
          '據說古道深處有個「鬼市」，子時開市、雞鳴即散，賣的全是世上找不到的東西。',
          '只是去過的人，回來都不肯多說一個字……',
        ),
      ],
    },
    {
      id: 'yun', name: '鍾小芸', sprite: 'lady', x: 4, y: 1, facing: 'down',
      talks: [
        yun('客官好！我娘在外頭攤子上，屋裡由我照看。', '想聽書的話，葛先生每天都在，他的故事可多了。'),
        yun('臨江城的茶比我們的貴十倍，可我還是覺得我們的竹葉茶最好喝。'),
      ],
    },
    {
      id: 'teaguest1', work: true, name: '包老三', sprite: 'peddler', x: 2, y: 4, facing: 'up',
      talks: [
        [
          { speaker: '包老三', text: '我是從臨江城過來收山貨的。' },
          { speaker: '包老三', text: '城裡最近可不太平：漕幫跟金刀鏢局為了碼頭的事，已經打了好幾架。' },
          { speaker: '包老三', text: '聽說鏢局正在招人，有點身手的，去了不愁沒飯吃。' },
        ],
      ],
    },
    {
      id: 'teaguest2', work: true, name: '牛二根', sprite: 'farmer', x: 8, y: 4, facing: 'up',
      talks: [
        [
          { speaker: '牛二根', text: '斷崖寨的山賊被打跑了？那可好，我明兒就上山砍柴去。' },
          { speaker: '牛二根', text: '不過山道上的野狗、山豬還是多，得帶根棍子才行。' },
        ],
      ],
    },
  ],
  exits: [exitTo('qingzhu', 31, 16, 4, 7)],
};

// ── 竹隱寺（青竹村北） ─────────────────────────────────────

const zhiyuan = by('智遠');

export const qzTemple: MapDef = {
  id: 'qz_temple',
  name: '竹隱寺',
  subtitle: '青竹村北・小廟',
  tiles: room(9, 6, 4),
  spawn: { x: 4, y: 4, facing: 'up' },
  theme: 'scholar',
  buildings: [],
  props: [
    { sprite: 'altar', x: 3, y: 1, w: 3, lines: [{ text: '供桌後面坐著一尊木雕的佛像，眉眼低垂，金漆斑駁。' }, { text: '桌上供著清水、鮮花和村裡人送來的果子。' }] },
    { sprite: 'cushion', x: 3, y: 3, lines: [{ text: '一個磨舊了的蒲團。' }] },
    { sprite: 'cushion', x: 5, y: 3, lines: [{ text: '一個磨舊了的蒲團。' }] },
    { sprite: 'f_deco_plain_1', x: 1, y: 1, lines: [{ text: '一盆修竹，葉子擦得乾乾淨淨。' }] },
    { sprite: 'f_deco_plain_1', x: 7, y: 1, lines: [{ text: '一盆修竹，葉子擦得乾乾淨淨。' }] },
  ],
  npcs: [
    {
      id: 'zhiyuan', name: '智遠', sprite: 'elder', x: 6, y: 2, facing: 'down',
      talks: [
        zhiyuan('阿彌陀佛。施主是從村裡上來的吧？', '這座寺小，就老衲一個人守著。村裡人逢年過節來上炷香，平日清靜得很。'),
        zhiyuan('竹隱寺建了快一百年了。當年有位雲遊的師父路過，見這片竹林清幽，就留了下來。', '老衲是他的第三代弟子。'),
        zhiyuan('施主身上帶著兵器，是練武之人。', '練武也好，修心也好，都急不得。'),
      ],
    },
  ],
  exits: [exitTo('qz_north', 19, 12, 4, 6)],
};

// ── 石家鐵鋪 ────────────────────────────────────────────


export const qzSmithy: MapDef = {
  id: 'qz_smithy',
  name: '石家鐵鋪',
  subtitle: '青竹村・鐵匠鋪',
  tiles: room(9, 7, 2),
  spawn: { x: 2, y: 5, facing: 'up' },
  theme: 'stone',
  buildings: [],
  props: [
    { sprite: 'forge', x: 1, y: 1, w: 2, lines: [{ text: '爐裡的炭火燒得正旺，熱氣烤得人臉發燙。' }] },
    { sprite: 'f_deco_martial_1', x: 5, y: 1, w: 2, script: smithRack, label: '兵器架' },
    { sprite: 'anvil', x: 3, y: 3, lines: [{ text: '一座鐵砧，表面坑坑窪窪，不知打過多少把刀。' }] },
    { sprite: 'vat', x: 7, y: 5, lines: [{ text: '淬火用的水缸，水面上浮著一層鐵灰。' }] },
  ],
  npcs: [
    {
      id: 'xiaohu', name: '石小虎', sprite: 'apprentice', x: 5, y: 3, facing: 'down', wander: 1, person: 'xiaohu',
    },
  ],
  exits: [exitTo('qingzhu', 13, 19, 2, 7)],
};

// ── 王家 ────────────────────────────────────────────────

export const qzWang: MapDef = {
  id: 'qz_wang',
  name: '王家',
  subtitle: '青竹村・民居',
  tiles: room(9, 6, 2),
  spawn: { x: 2, y: 4, facing: 'up' },
  theme: 'plain',
  buildings: [],
  props: [
    { sprite: 'f_bed_plain_1', x: 1, y: 1, w: 2, lines: [{ text: '收拾得整整齊齊的床鋪。' }] },
    { sprite: 'cradle', x: 4, y: 1, lines: [{ text: '搖籃裡的娃娃睡得正香，小手攥成了拳頭。' }] },
    { sprite: 'f_stove_plain_1', x: 5, y: 1, w: 2, lines: [{ text: '灶上溫著一鍋粥，米香陣陣。' }] },
    { sprite: 'f_table_plain_1', x: 5, y: 3, w: 2, lines: [{ text: '桌上擺著幾件縫到一半的小衣裳。' }] },
  ],
  npcs: [
  ],
  exits: [exitTo('qingzhu', 32, 30, 2, 6)],
};
