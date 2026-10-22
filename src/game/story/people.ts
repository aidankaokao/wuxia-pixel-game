import { addFame, giveItem } from '../character';
import type { ArtId } from '../arts';
import { zhongFestival } from './festival';
import type { EventCtx, Script } from '../events';
import type { Line } from '../maps/types';
import { STAGE } from '../social';
import type { Flags } from '../../state/store';
import { liuStory, zhongStory } from './bandits';
import { SECT_PEOPLE } from './sect_mingquan';
import { BIYI_PEOPLE } from './biyi_people';
import { bridgeDonation } from './bridge';

/**
 * 人物檔案：每個人怎麼提升熟悉度、在各階段說什麼、怎麼稱呼你、什麼時候不理你。
 *
 * 台詞裡可以寫 {稱}（對方怎麼稱呼你，依熟悉度與名聲而變）、{姓}、{名}。
 *
 * 旗標：
 *   qinghe_dream   柳青禾說出想闖蕩江湖的心願（之後可發展成同伴）
 *   rumor_guishi   從鍾嬸那裡聽說了南嶺鬼市
 *   tao_stock      陶四願意賣雲霧茶
 *   smith_promise  石岳答應之後替你打兵器
 *   smith_intro    石小虎替你在石岳面前說了好話（名聲不夠也肯理你）
 *   xiaohu_tusk    1 石小虎想要山豬獠牙 / 2 已經送給他
 */

/** 一段對話；可以加條件（依旗標決定會不會出現） */
export type Convo = Line[] | { when: (f: Flags) => boolean; lines: Line[] };

/** 對方問你的問題 */
export interface Ask {
  id: string;
  stage?: number;
  q: string;
  /** 選項：你怎麼回答、對方的回應、熟悉度增減 */
  answers: { say: string; reply: string; aff: number }[];
}

export interface PersonDef {
  id: string;
  name: string;
  /** 在哪裡認識的（選單「交遊」依這個分類） */
  place: string;
  /** 身分（選單顯示用） */
  role: string;
  /** 對方怎麼稱呼你 */
  address: (stage: number, fame: number) => string;
  /** 不理人：條件不成立就只回這幾句 */
  gate?: { open: (f: Flags, fame: number) => boolean; refuse: Line[] };
  /** 劇情優先：處理了（例如接委託、覆命）就回傳 true，不再走一般交談 */
  story?: (ctx: EventCtx) => Promise<boolean>;
  /**
   * 交談：每天前 perDay 次加 gain 熟悉度，說「目前階段」的台詞；
   * 之後不再加，after 決定怎麼應付：'busy' 說在忙，'chat' 輪流閒聊。
   */
  talk: { gain: number; perDay: number; after: 'busy' | 'chat' };
  /** 各階段的台詞（取不超過目前階段的最高那組），輪流說 */
  lines: Partial<Record<number, Convo[]>>;
  /** 今天聊夠了之後輪流說的話 */
  idle: Convo[];
  /** 用餐時段在飯廳聊天說的話（同桌吃飯，熟悉度多加 1） */
  meal?: Convo[];
  /** 收禮：喜歡的加多少、討厭的扣多少；沒寫 gift 表示不收禮 */
  gift?: { likes: Record<string, number>; dislikes?: Record<string, number> };
  refuseGift?: Line[];
  /** 送禮時的特殊處理（例如支線要的東西），處理了回傳 true */
  onGift?: (ctx: EventCtx, item: string) => Promise<boolean>;
  /** 商家：每花／賺幾兩加 1 熟悉度；各階段的折扣 */
  trade?: { per: number; discount: number[] };
  spar?: { stage: number; encounter: string; win: number; lose: number };
  /** 請教：每天一次，替一門武功的下一招加領悟度 */
  teach?: { stage: number; insight: number };
  /**
   * 嗜好（琴棋書畫）：熟到 stage 起可以一起玩，每天一次。level 是對方的造詣（0–10）；
   * 下棋的人有棋風 style（0 穩守、1 取勢、2 強攻）。
   */
  hobby?: { art: ArtId; level: number; stage: number; style?: number };
  /**
   * 對方問你的問題：交談時偶爾（四成）會問一個還沒問過的；每個選項有回應與熟悉度增減（另外加上平常交談的熟悉度）。
   * stage 是熟到哪一階才會問。
   */
  asks?: Ask[];
  /** 熟悉度到了某個值，下次交談時觸發 */
  events?: { id: string; at: number; script: Script }[];
}

const by = (speaker: string) => (...texts: string[]): Line[] => texts.map((text) => ({ speaker, text }));

// ── 柳承安：村長。委託型，聊天不嫌煩，熟了願意指點武學 ──────

const liu = by('柳承安');
const liuP: PersonDef = {
  id: 'liu',
  name: '柳承安',
  place: '青竹村',
  role: '青竹村村長',
  address: (s, fame) => (fame >= 80 ? '{姓}大俠' : s >= STAGE.CLOSE ? '{姓}賢侄' : s >= STAGE.FAMILIAR ? '{姓}少俠' : s >= STAGE.NOD ? '少俠' : '年輕人'),
  story: async (ctx) => (await bridgeDonation(ctx, 'liu')) || liuStory(ctx),
  talk: { gain: 3, perDay: 2, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      liu('今年雨水多，竹筍長得特別好。', '{稱}要是不嫌棄，改天讓青禾給你送一籃。'),
      { when: (f) => f.q_bandits === 1, lines: liu('斷崖寨就在蒼嵐山道的盡頭，從村北的山口上去便是。', '若是受了傷，就回村裡的老井喝口水歇歇。') },
      liu('{稱}，在青竹村還住得慣嗎？', '這裡雖然偏僻，人情倒是厚的。'),
    ],
    [STAGE.NOD]: [
      liu('村東的空地荒著可惜。{稱}要是想在這兒安家，老夫替你作主。'),
      liu('蒼嵐山道上的野獸，入秋以後會多起來。出門記得帶藥。'),
      { when: (f) => f.q_bandits === 1, lines: liu('祁三刀蓄勢的時候，記得先守住。老夫等你的好消息。') },
      liu('{稱}，村裡的人都在說你的事呢。', '小石頭逢人就說，你一個人能打十個山賊。'),
      liu('青竹村的竹子，是老夫的祖父那一輩種下的。', '竹子這東西，看著柔，其實最韌。'),
    ],
    [STAGE.FAMILIAR]: [
      liu('老夫這一生，最得意的不是武功，是把這個村子守了下來。'),
      liu('老夫年輕時，也在臨江城的武館待過幾年。', '那時候年少氣盛，總覺得天下沒有過不去的坎……'),
      liu('{稱}，青禾那丫頭整天嚷著要學劍。', '老夫不讓她學，是怕她跟她爹一樣……唉，你替老夫多看著她點。'),
    ],
    [STAGE.CLOSE]: [
      liu('{稱}，老夫書房裡有一本舊拳譜，是先父留下的。', '譜上的武功，柳家三代沒有一個人練成。也許……等時候到了，再給你看看。'),
      liu('人在江湖，最難的不是武功，是知道什麼時候該收手。', '這句話，老夫到了這把年紀才懂。'),
    ],
  },
  idle: [
    liu('今年的竹筍長得特別好，回頭讓鍾嬸給你燉一鍋。'),
    liu('村東那座木橋該修修了，下雨天走著打滑。'),
    liu('老井的水喝了幾十年，還是那麼甜。'),
    liu('{稱}有空多去茶寮坐坐，葛先生的書說得好。'),
  ],
  refuseGift: liu('老夫什麼都不缺，{稱}的心意領了。'),
  teach: { stage: STAGE.CLOSE, insight: 15 },
  // 村長愛下棋，棋風沉穩
  hobby: { art: 'chess', level: 5, stage: STAGE.NOD, style: 0 },
  events: [
    {
      id: 'liu_30',
      at: 30,
      script: async (ctx) => {
        await ctx.say(...liu('{稱}，這些日子多虧有你。', '這幾帖金創藥是老夫珍藏的，你帶在身上。'));
        await ctx.hero((c) => giveItem(c, 'jinchuang', 3));
      },
    },
    {
      id: 'liu_60',
      at: 60,
      script: async (ctx) => {
        await ctx.say(
          ...liu('{稱}，老夫看你練功，有幾處關竅似乎還沒想通。', '老夫雖然武功平平，眼力倒還有幾分。往後有武學上的疑難，儘管來問。'),
          '（現在可以向柳承安「請教」：面對他按 R）',
        );
      },
    },
  ],
  asks: [
    {
      id: 'liu_why',
      q: '{稱}，老夫一直想問：你孤身一人來到青竹村，是為了什麼？',
      answers: [
        { say: '想在江湖上闖出名堂。', reply: '有志氣。只是名堂這東西，來得快，去得也快。', aff: 1 },
        { say: '只是四處走走，看看天下。', reply: '好。年輕時多看看，老了才有東西可想。', aff: 2 },
        { say: '……不太想提。', reply: '人各有難言之處，老夫不問了。', aff: 1 },
      ],
    },
    {
      id: 'liu_bandit',
      q: '斷崖寨那幫人，你覺得該趕盡殺絕，還是給條活路？',
      answers: [
        { say: '首惡必除，脅從不問。', reply: '說得好。老夫也是這麼想的。', aff: 3 },
        { say: '全部抓起來，送官府。', reply: '官府……唉，臨江城的官府管不到這山溝裡。', aff: 1 },
        { say: '他們也是被逼的，能放就放。', reply: '心善是好事，只怕放虎歸山。', aff: 0 },
      ],
    },
    {
      id: 'liu_qinghe', stage: STAGE.NOD,
      q: '青禾那丫頭求了老夫好幾回，想學劍。你說，老夫該讓她學嗎？',
      answers: [
        { say: '讓她學吧，會武功才能保護自己。', reply: '……你說得也有道理。老夫再想想。', aff: 2 },
        { say: '您擔心的話，還是別讓她學。', reply: '是啊……她爹就是學了武，才……唉。', aff: 1 },
        { say: '不如問問她自己的心意。', reply: '哈，你倒是比老夫看得開。', aff: 3 },
      ],
    },
  ],
};

// ── 柳青禾：村長孫女。愛練劍，聊一下就跑去練功；熟了可以切磋 ──

const he = by('柳青禾');
const qingheP: PersonDef = {
  id: 'qinghe',
  name: '柳青禾',
  place: '青竹村',
  role: '柳村長的孫女',
  address: (s, fame) => (s >= STAGE.CLOSE ? '{姓}大哥' : s >= STAGE.FAMILIAR || fame >= 40 ? '{姓}少俠' : s >= STAGE.NOD ? '喂，外地來的' : '你'),
  talk: { gain: 4, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      he('爺爺又在書房看那本舊拳譜了……他以為我不知道。'),he('你就是那個從外地來的人？', '我叫柳青禾，村長是我爺爺。')],
    [STAGE.NOD]: [
      he('{稱}，你看我這招是不是有點像樣了？……不要笑！'),
      he('竹林裡那塊石碑，我小時候常去那兒玩，那時候還看不懂上面的劍痕。'),
      he('噓——別跟爺爺說，我偷偷在後院拿木劍練功。', '總有一天，我也要去臨江城看看真正的江湖！'),
      he('爺爺書房裡有一本舊拳譜，他從來不讓我碰。', '你說，裡面是不是藏著什麼了不起的武功？'),
    ],
    [STAGE.FAMILIAR]: [
      he('我想學琴，也想學劍。爺爺說女孩子學一樣就夠了，我偏不。'),
      he('{稱}，你的劍法是跟誰學的？', '竹林裡的石碑？我天天去看，怎麼什麼都看不出來……'),
      he('今天我自己練了一百劍！手都酸了。', '{稱}，你練功的時候會不會覺得悶？'),
    ],
    [STAGE.CLOSE]: [
      he('{稱}，我爹……是在臨江城被人害死的。', '爺爺不肯說是誰。可我總有一天會查清楚。'),
      he('等我再厲害一點，你帶我一起去臨江城好不好？', '我保證不拖你後腿！'),
    ],
  },
  idle: [],
  gift: { likes: { tea: 8, stew: 6, painting_2: 8, painting_3: 15 }, dislikes: { dog_pelt: 5, boar_meat: 3 } },
  spar: { stage: STAGE.FAMILIAR, encounter: 'spar_qinghe', win: 5, lose: 3 },
  events: [
    {
      id: 'qinghe_spar',
      at: 30,
      script: async (ctx) => {
        await ctx.say(
          ...he('{稱}！你陪我過幾招好不好？', '我自己練了好久，可是沒人跟我對打，根本不知道練得怎麼樣。', '我保證不告訴爺爺！'),
          '（現在可以和柳青禾「切磋」：面對她按 F）',
        );
      },
    },
    {
      id: 'qinghe_dream',
      at: 60,
      script: async (ctx) => {
        await ctx.say(...he('{稱}……我想好了。', '總有一天，我要離開青竹村，去外面看看。', '到時候……你會帶上我嗎？'));
        ctx.setFlag('qinghe_dream');
      },
    },
  ],
  // 柳青禾在家裡學琴
  hobby: { art: 'qin', level: 4, stage: STAGE.NOD },
  asks: [
    {
      id: 'qh_sword',
      q: '{稱}，你覺得女孩子學劍很奇怪嗎？',
      answers: [
        { say: '一點也不奇怪，劍又不挑人。', reply: '嘻，我就知道你跟爺爺不一樣！', aff: 3 },
        { say: '有點危險，但妳喜歡就好。', reply: '嗯……我會小心的。', aff: 1 },
        { say: '學琴比較適合妳吧。', reply: '……連你也這麼說。', aff: -1 },
      ],
    },
    {
      id: 'qh_city', stage: STAGE.NOD,
      q: '臨江城好玩嗎？爺爺從來不帶我去。',
      answers: [
        { say: '很熱鬧，有布莊、酒樓，還有賣糖人的。', reply: '糖人！我好想看看！', aff: 2 },
        { say: '人太多了，還是村裡清靜。', reply: '可是村裡每天都一樣……', aff: 0 },
        { say: '下次我帶妳去。', reply: '真的？說好了喔！不可以騙我！', aff: 3 },
      ],
    },
  ],
};

// ── 鍾嬸：茶寮老闆娘。愛聊天，收禮，知道很多傳聞 ──────────

const zhong = by('鍾嬸');
const zhongP: PersonDef = {
  id: 'zhong',
  name: '鍾嬸',
  place: '青竹村',
  role: '村口茶攤的老闆娘',
  address: (s, fame) => (fame >= 80 ? '{姓}大俠' : s >= STAGE.FAMILIAR ? '小{姓}' : s >= STAGE.NOD ? '小哥' : '客官'),
  story: async (ctx) => (await zhongFestival(ctx)) || (await bridgeDonation(ctx, 'zhong')) || zhongStory(ctx),
  talk: { gain: 3, perDay: 2, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      zhong('這茶攤擺了二十年囉，從小芸還在吃奶的時候就開始了。'),zhong('我家這茶，用的是雲水河上游的水，別處喝不到的。')],
    [STAGE.NOD]: [
      zhong('{稱}，最近臉色不太好，是不是又沒好好吃飯？'),
      zhong('葛先生那張嘴喔，死的都能說成活的。你可別全信。'),
      zhong('{稱}，又來啦？坐坐坐，嬸給你倒茶。'),
      zhong('聽說臨江城的漕幫，最近跟金刀鏢局鬧得很僵，來往的商客都繞道走呢。'),
    ],
    [STAGE.FAMILIAR]: [
      zhong('小芸她爹走得早，嬸一個人把她拉拔大，就盼著她嫁個好人家。'),
      zhong('{稱}啊，你一個人在外頭，吃得飽嗎？', '有空就來嬸這兒，別的沒有，熱茶管夠。'),
      zhong('我家小芸啊，整天捧著書不肯學泡茶，真是愁人。'),
    ],
    [STAGE.CLOSE]: [zhong('{稱}，嬸跟你說句心裡話——', '你這孩子心眼好，可江湖險惡，凡事多留個心眼。')],
  },
  idle: [
    zhong('今天的茶葉是新炒的，香吧？'),
    zhong('剛才有個貨郎說，南邊的路上又看到狼了。'),
    zhong('秦老漢昨天釣了一條這麼大的魚！我看八成是吹的。'),
    zhong('天要轉涼了，{稱}記得添件衣裳。'),
  ],
  gift: { likes: { herb: 6, boar_meat: 8, stew: 10 }, dislikes: { dog_pelt: 4 } },
  events: [
    {
      id: 'zhong_30',
      at: 30,
      script: async (ctx) => {
        await ctx.say(...zhong('{稱}，這幾包茶葉你拿著，路上喝。', '跟嬸客氣什麼！'));
        await ctx.hero((c) => giveItem(c, 'tea', 3));
      },
    },
    {
      id: 'zhong_60',
      at: 60,
      script: async (ctx) => {
        await ctx.say(
          ...zhong(
            '{稱}，嬸跟你說件怪事，別跟旁人講。',
            '前些年，我家那口子半夜走南嶺古道回來，說在林子裡看見一片燈火，像是個市集。',
            '可第二天再去找，什麼都沒有……他打那以後就病了，沒多久就走了。',
            '葛先生說那叫「鬼市」。{稱}，你要是哪天去南嶺，千萬小心。',
          ),
        );
        ctx.setFlag('rumor_guishi');
      },
    },
  ],
  asks: [
    {
      id: 'zh_tea',
      q: '{稱}，嬸這茶，你喝得出是哪兒的水嗎？',
      answers: [
        { say: '雲水河上游的水，入口特別甘。', reply: '哎喲，你還真記得嬸說過的話！', aff: 3 },
        { say: '井水吧？', reply: '井水哪有這麼甜，是雲水河上游的！', aff: 0 },
        { say: '喝不出來，但很好喝。', reply: '好喝就好，好喝就好。', aff: 1 },
      ],
    },
    {
      id: 'zh_yun', stage: STAGE.NOD,
      q: '你覺得我家小芸怎麼樣？',
      answers: [
        { say: '勤快又懂事，誰娶到誰有福氣。', reply: '哈哈，那可得讓她聽聽！', aff: 3 },
        { say: '挺好的，就是有點害羞。', reply: '她呀，對熟人話可多了。', aff: 1 },
        { say: '我還沒跟她說過幾句話。', reply: '那你多來坐坐嘛。', aff: 0 },
      ],
    },
  ],
};

// ── 陶四：貨郎。買賣越多越熟，熟了打折、拿出好貨 ───────────

const tao = by('陶四');
const taoP: PersonDef = {
  id: 'tao',
  name: '陶四',
  place: '青竹村',
  role: '走村串鄉的貨郎',
  address: (s, fame) => (s >= STAGE.FAMILIAR ? '{姓}老弟' : fame >= 40 ? '{姓}少俠' : '客官'),
  story: (ctx) => bridgeDonation(ctx, 'tao'),
  talk: { gain: 1, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      tao('我陶四走過的路，比你吃過的米還多——這話不是吹的。'),tao('走過路過不要錯過！傷藥、茶葉、草藥，樣樣都有。', '打到的獸皮、獸肉也可以賣給我，價錢公道！（按 T 交易）')],
    [STAGE.NOD]: [
      tao('臨江城的布又漲了，下回進貨，價錢恐怕得往上提一提。'),tao('{稱}又來照顧生意啦！', '最近山貨好賣，有皮子儘管拿來。')],
    [STAGE.FAMILIAR]: [tao('{稱}是老主顧了，價錢上我一定給你算便宜點。'), tao('我陶四走南闖北十幾年，什麼人沒見過？{稱}這樣的，將來準有出息。')],
  },
  idle: [tao('今天想買點什麼？'), tao('臨江城的布價又漲了，這生意越來越難做。'), tao('下個月我要往南邊走一趟，有什麼要捎的儘管說。')],
  gift: { likes: { boar_tusk: 6 } },
  trade: { per: 15, discount: [0, 0, 0, 0.1, 0.2, 0.25] },
  events: [
    {
      id: 'tao_stock',
      at: 30,
      script: async (ctx) => {
        await ctx.say(...tao('{稱}，咱們也算老交情了。', '我這兒還有幾包上好的雲霧茶，平常不拿出來賣的——以後你要，儘管開口。'), '（陶四的攤子開始賣「雲霧茶」）');
        ctx.setFlag('tao_stock');
      },
    },
  ],
  asks: [
    {
      id: 'tao_price',
      q: '{稱}，你說做買賣，最要緊的是什麼？',
      answers: [
        { say: '誠信。', reply: '說得好！我陶四做生意，從來不缺斤少兩。', aff: 3 },
        { say: '眼光，知道什麼東西好賣。', reply: '有見地，有見地。', aff: 2 },
        { say: '能賺錢就好。', reply: '嘿，那你跟漕幫那幫人倒是合得來。', aff: -1 },
      ],
    },
    {
      id: 'tao_road', stage: STAGE.NOD,
      q: '要是有一條大路通到南邊的大城，你想不想跟我一起去走走貨？',
      answers: [
        { say: '好啊，有機會一起去。', reply: '一言為定！到時候你負責打架，我負責算帳。', aff: 2 },
        { say: '我還有自己的事要辦。', reply: '也是，人各有志。', aff: 0 },
      ],
    },
  ],
};

// ── 石岳：鐵匠。名聲不夠不理人；熟了可以切磋、答應打兵器 ────

const shi = by('石岳');
const shiP: PersonDef = {
  id: 'shi',
  name: '石岳',
  place: '青竹村',
  role: '石家鐵鋪的鐵匠',
  address: (s, fame) => (fame >= 80 ? '{姓}大俠' : s >= STAGE.FAMILIAR ? '{姓}兄弟' : '小子'),
  gate: {
    open: (f, fame) => fame >= 15 || !!f.smith_intro,
    refuse: [{ speaker: '石岳', text: '叮——噹——！' }, { text: '石岳頭也不抬，像是根本沒看見你。\n（名聲再大一點，他或許會理你）' }],
  },
  story: (ctx) => bridgeDonation(ctx, 'shi'),
  talk: { gain: 3, perDay: 1, after: 'busy' },
  lines: {
    [STAGE.STRANGER]: [
      shi('打鐵講究的是火候和耐性，急不得。'),
      { when: (f) => !!f.bandit_boss, lines: shi('……你就是打跑斷崖寨的那個？', '哼，看著也不怎麼樣。') },
      shi('要打一把好刀，得看鐵，也得看人。'),
    ],
    [STAGE.NOD]: [
      shi('小虎那孩子，打鐵沒天分，耍木劍倒是有模有樣。'),
      shi('好鋼要千錘百鍊。人也一樣。'),shi('要打一把好刀，得看鐵，也得看人。', '等你攢夠了銀兩，再來找我吧。'), shi('看你握劍的樣子，手腕太僵。多練。')],
    [STAGE.FAMILIAR]: [
      shi('祁三刀那把大刀，是我年輕時打的。', '那時候他還是個鏢師，誰知道後來落草為寇……刀是好刀，可惜跟錯了人。'),
      shi('{稱}，有空來比劃比劃。光打鐵，筋骨都生鏽了。'),
    ],
    [STAGE.CLOSE]: [shi('{稱}，我這輩子打過三把好刀。', '第四把，我想給你打。')],
  },
  idle: [],
  gift: { likes: { boar_tusk: 8 } },
  spar: { stage: STAGE.FAMILIAR, encounter: 'spar_shiyue', win: 6, lose: 3 },
  events: [
    {
      id: 'shi_30',
      at: 30,
      script: async (ctx) => {
        await ctx.say(...shi('{稱}，等我的鐵料齊了，給你打一把像樣的劍。', '別急，好東西都要等。'), '（打造兵器之後開放）');
        ctx.setFlag('smith_promise');
      },
    },
  ],
  asks: [
    {
      id: 'shi_blade',
      q: '{稱}，你用兵器，看重的是什麼？',
      answers: [
        { say: '趁手，用起來順。', reply: '對！再好的兵器，不趁手就是廢鐵。', aff: 3 },
        { say: '鋒利，削鐵如泥最好。', reply: '太鋒利的刀容易崩口，得懂得養。', aff: 1 },
        { say: '好看，有氣派。', reply: '……那你去臨江城買把裝飾的吧。', aff: -1 },
      ],
    },
    {
      id: 'shi_hu', stage: STAGE.NOD,
      q: '你看小虎，往後是該打鐵，還是讓他去學武？',
      answers: [
        { say: '讓他學武吧，他喜歡。', reply: '……也罷，強扭的瓜不甜。', aff: 2 },
        { say: '打鐵是門好手藝，不會餓肚子。', reply: '是啊，學武的有幾個能吃飽飯。', aff: 1 },
        { say: '兩樣都學，會打鐵的武人也不錯。', reply: '哈！你這想法倒是新鮮。', aff: 3 },
      ],
    },
  ],
};

// ── 石小虎：鐵匠學徒。小孩子，要山豬獠牙做木劍（小支線） ────

const hu = by('石小虎');
const xiaohuP: PersonDef = {
  id: 'xiaohu',
  name: '石小虎',
  place: '青竹村',
  role: '鐵鋪學徒，石岳的兒子',
  address: (_s, fame) => (fame >= 40 ? '{姓}大俠' : '大哥哥'),
  talk: { gain: 4, perDay: 1, after: 'chat' },
  lines: {
    [STAGE.STRANGER]: [
      hu('我爹說我打鐵的時候心不在焉……可我就是想練劍嘛。'),hu('我爹在外頭打鐵，我負責拉風箱。', '等我長大了，要打一把比我爹的還好的刀！')],
    [STAGE.NOD]: [
      hu('{稱}，你教我一招好不好？就一招！'),
      { when: (f) => f.xiaohu_tusk === 1, lines: hu('{稱}，山豬獠牙找到了嗎？', '山道上的山豬，有時候會掉獠牙喔！') },
      hu('{稱}！我今天自己拉了一整天的風箱，厲害吧？'),
    ],
    [STAGE.FAMILIAR]: [hu('{稱}，你教我一招好不好？就一招！'), hu('我爹說，你是他見過最有天分的人。', '……其實他沒這樣說，是我覺得的。')],
  },
  idle: [hu('呼……拉風箱好累喔。'), hu('{稱}，你看我的手，都磨出繭了！'), hu('我爹又在罵我偷懶了……')],
  gift: { likes: { boar_tusk: 12, dog_pelt: 5, stew: 6 } },
  onGift: async (ctx, item) => {
    if (item !== 'boar_tusk' || ctx.flag('xiaohu_tusk') !== 1) return false;
    ctx.setFlag('xiaohu_tusk', 2);
    ctx.setFlag('smith_intro');
    await ctx.say(
      ...hu('哇！是山豬獠牙！謝謝{稱}！', '我要拿它磨一把匕首……不對，先做木劍的劍柄！'),
      '石小虎抱著獠牙衝出門，過了一會兒，外頭傳來石岳的聲音。',
      { speaker: '石岳', text: '……這獠牙成色不錯。是那個外地小子給的？' },
      { speaker: '石岳', text: '哼。下回讓他來鋪子裡坐坐。' },
    );
    await ctx.hero((c) => addFame(c, 3));
    return true;
  },
  events: [
    {
      id: 'xiaohu_tusk',
      at: 10,
      script: async (ctx) => {
        await ctx.say(
          ...hu('{稱}，我跟你說個秘密……', '我想自己做一把木劍，可是劍柄要用很硬的東西才好看。', '聽說山豬的獠牙又硬又亮！{稱}，你幫我弄一根好不好？'),
          '（接下委託「小虎的木劍」：把山豬獠牙送給石小虎）',
        );
        ctx.setFlag('xiaohu_tusk', 1);
      },
    },
  ],
  asks: [
    {
      id: 'hu_hero',
      q: '{稱}，你是大俠嗎？',
      answers: [
        { say: '還不是，正在努力。', reply: '那我們一起努力！', aff: 2 },
        { say: '當然是！', reply: '哇——那你能一個人打一百個山賊嗎？', aff: 1 },
        { say: '大俠不是自己說了算的。', reply: '……聽起來好深奧。', aff: 2 },
      ],
    },
    {
      id: 'hu_sword',
      q: '你覺得我的木劍好看嗎？是我自己削的！',
      answers: [
        { say: '削得很好，劍身很直。', reply: '嘿嘿，我削了三天呢！', aff: 3 },
        { say: '劍柄可以再磨光一點。', reply: '對喔！我等下就去磨。', aff: 2 },
        { say: '還是真劍比較好。', reply: '……我爹不讓我碰真劍。', aff: 0 },
      ],
    },
  ],
};

export const PEOPLE: Record<string, PersonDef> = Object.fromEntries(
  [liuP, qingheP, zhongP, taoP, shiP, xiaohuP, ...SECT_PEOPLE, ...BIYI_PEOPLE].map((p) => [p.id, p]),
);

/** 任務日誌：小虎的木劍 */
export const xiaohuQuest = {
  id: 'xiaohu',
  title: '小虎的木劍',
  status(f: Flags): { text: string; done: boolean } | null {
    if (f.xiaohu_tusk === 2) return { text: '把山豬獠牙送給了石小虎。石岳似乎對你另眼相看了。', done: true };
    if (f.xiaohu_tusk === 1) return { text: '石小虎想要一根山豬獠牙做木劍。山道上的山豬有時會掉獠牙，拿到後送給他（面對他按 G）。', done: false };
    return null;
  },
};
