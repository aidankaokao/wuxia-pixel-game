import type { EventCtx, Script } from '../events';
import { by } from '../maps/rooms';
import { allNotices, registerNotices, type Notice, type NoticeTab } from '../notices';
import { dateOf, dateText, FESTIVALS, seasonOf } from '../time';
import { useGame } from '../../state/store';
import { refreshMarket } from '../property';
import { bridgeBuilt, FUND_GOAL } from './bridge';

/**
 * 臨江縣衙：知縣盧秉文、師爺苗守正、捕頭霍青山、捕快高升與雷小五、獄卒鄒老七；還有公告欄。
 * - 格局：大門（門口石獅、鳴冤鼓、告示牌）→ 中庭（戒石、公告欄）→ 大堂（知縣升堂）；
 *   西廂簽押房（師爺、書辦）、東廂捕快房（捕頭、捕快歇腳）；東北角是縣牢，獄卒守著，平時進不去。
 * - 公告欄（縣衙裡、城南街上的告示牌都看得到）：重要大事、懸賞公告、日常公告三欄（notices.ts）。
 *   選了帶動作的告示（揭榜等），面板關起來後由 `noticeBoard` 接著跑那個動作。
 * - 這裡註冊「重要大事」與幾張固定的日常告示；懸賞在 linjiang_jianghu.ts，房屋買賣在 property.ts。
 */

const st = () => useGame.getState();

/** 打開公告欄（從哪一欄開始看）；選了帶動作的告示就接著做 */
export const noticeBoard =
  (tab: NoticeTab = 'big', title?: string): Script =>
  async (ctx: EventCtx) => {
    // 先撕掉過期的、貼上新的出售告示
    useGame.getState().updateWorld((w) => refreshMarket(w));
    await ctx.panel({ kind: 'notices', tab, title });
    const id = st().noticePick;
    if (!id) return;
    useGame.setState({ noticePick: null });
    const s = st();
    const n = allNotices({ hero: s.hero, flags: s.flags, world: s.world }).find((x) => x.id === id);
    if (n?.act) await n.act.run(ctx);
  };

// ── 重要大事 ────────────────────────────────────────────

/** 離今天最近、七天內的節慶 */
function upcomingFestival(day: number) {
  for (let d = 0; d <= 7; d++) {
    const { month, date } = dateOf(day + d);
    const f = FESTIVALS.find((x) => x.month === month && x.date === date);
    if (f) return { name: f.name, day: day + d };
  }
  return null;
}

const FEST_TEXT: Record<string, string> = {
  過年: '新正將至，城中各戶灑掃門庭、張貼春聯，除夕夜子時鳴炮迎新。',
  元宵: '元宵佳節，城南商街掛燈猜謎，各家孩童可提燈遊街，戌時以後不禁夜行。',
  清明: '清明時節，出城祭掃者眾，城門提早一個時辰開啟。',
  端午: '端午將至，大江上照例賽龍舟，各船隊於碼頭報名。',
  中元: '中元普渡，碼頭西邊江灘放河燈，嚴禁在江邊燒紙引火。',
  中秋: '中秋佳節，望江樓設賞月宴，城南商街掛燈至子時。',
  掌門壽辰: '鳴泉劍派聞掌門壽辰，山上設宴，城中商戶多有往賀者。',
};

registerNotices(({ flags, world }): Notice[] => {
  const out: Notice[] = [];
  out.push({
    id: 'big:fugitive', tab: 'big', title: '海捕文書・緝拿欽犯',
    text: ['奉上憲令：有瘦長臉、左眉帶疤之男子一名，身負重案，近日恐自北嶺一帶南下。', '凡有見其行蹤者，速報本縣，查實者重賞。窩藏者同罪。'],
    by: '臨江縣正堂', tag: '朝廷要犯',
  });
  out.push(
    flags.bandit_boss
      ? { id: 'big:bandits', tab: 'big', title: '斷崖寨匪患已平', text: ['蒼嵐山斷崖寨匪首祁三刀，已為義士所敗，寨眾星散。', '山道恢復通行，往來樵採、行旅可安心上山。'], by: '臨江縣正堂' }
      : { id: 'big:bandits', tab: 'big', title: '緝拿斷崖寨寨主祁三刀', text: ['斷崖寨匪首祁三刀，盤據蒼嵐山，屢劫行旅。', '能擒斬者，賞銀五百兩。'], by: '臨江縣正堂', tag: '賞銀 500 兩' },
  );
  const today = { ...flags, today: world.day };
  if (bridgeBuilt(today)) out.push({ id: 'big:bridge', tab: 'big', title: '雲水橋落成', text: ['雲水渡口新橋落成，鄉人出錢出力，三日而成。', '自即日起，往來行旅可走橋過河，不必再候船。'], by: '臨江縣正堂' });
  else if (flags.bridge === 1)
    out.push({ id: 'big:bridge', tab: 'big', title: '募建雲水橋', text: ['雲水渡口擬建石橋，現由雲水茶棚季氏張羅。', `有心捐輸者，請至茶棚登記。目前已募得 ${Math.min(flags.bridge_fund ?? 0, FUND_GOAL)} 兩。`], by: '雲水茶棚季秋娘 謹啟' });
  if (seasonOf(world.day) === 'summer')
    out.push({ id: 'big:levee', tab: 'big', title: '整修江堤', text: ['入秋以前，本縣將整修沿江堤防，以防秋汛。', '凡年滿十六之丁壯，可至縣衙報名充作民夫，日給工錢。'], by: '臨江縣正堂' });
  const fest = upcomingFestival(world.day);
  if (fest && FEST_TEXT[fest.name])
    out.push({ id: `big:fest:${fest.name}`, tab: 'big', title: `${fest.name}將至`, text: [FEST_TEXT[fest.name], `日期：${dateText(fest.day)}。`], by: '臨江縣正堂' });
  return out;
});

// ── 固定的日常告示 ──────────────────────────────────────

registerNotices((): Notice[] => [
  {
    id: 'daily:market', tab: 'daily', title: '旬休趕集',
    text: ['每逢初十、二十、三十旬休之日，城南商街擺出外地來的攤子：山貨、絲線、舊書、舊貨，平日少見。', '天黑收攤。'],
    by: '臨江縣市司',
  },
  {
    id: 'daily:mingquan', tab: 'daily', title: '鳴泉劍派開山收徒',
    text: ['鳴泉劍派開山收徒，不拘時日。', '凡年滿十五、身家清白、有志習武者，可自行上鳴泉山應考，過得入門考驗即可拜師。'],
    by: '鳴泉劍派',
  },
]);

// ── 縣衙裡的人 ──────────────────────────────────────────

const lu = by('盧秉文');
const gao = by('高升');
const zou = by('鄒老七');

/** 衙門口的鳴冤鼓：沒有冤情亂敲要挨罵 */
export const grievanceDrum: Script = async (ctx) => {
  const i = await ctx.ask('一面大紅鼓，鼓面上落著薄薄一層灰。要敲嗎？', ['不敲', '敲一下']);
  if (i !== 1) return;
  await ctx.say('咚——！鼓聲震得門口的麻雀全飛了。');
  await ctx.say(...gao('誰？誰擊鼓？', '……你有什麼冤情？沒有？', '沒冤情別亂敲！老爺正在後頭午睡，吵醒了要挨板子的。'));
};

/** 縣牢門口的獄卒：平時不讓人進去（之後探監、劫獄等劇情接在這裡） */
export const jailerTalk: Script = async (ctx) => {
  const t = st().world.time;
  if (t % 3 === 0) await ctx.say(...zou('牢房重地，閒人免進。', '要探監？先去簽押房找師爺開條子。……不過最近沒人可探，牢裡就關著兩個偷雞的。'));
  else await ctx.say(...zou('站住。再往前一步，我就當你是來劫獄的。', '……開玩笑的。沒事別在這兒晃，裡頭的味道可不好聞。'));
};
const miao = by('苗守正');

/** 知縣：依名聲說話不同 */
export const magistrateTalk: Script = async (ctx) => {
  const fame = st().hero.fame;
  if (fame >= 80) {
    await ctx.say(...lu('原來是你。這幾年臨江縣太平，你出了不少力。', '本官上報州府的考績，也沾了你的光，哈哈。'));
  } else if (fame >= 15) {
    await ctx.say(...lu('你就是城裡說的那位少年俠客？', '江湖上的事，衙門不便插手；可地方上的事，你若肯幫忙，本官記在心上。'));
  } else {
    await ctx.say(...lu('本官盧秉文，臨江知縣。', '城裡的事，大小都歸衙門管。有事找師爺，懸賞找捕頭。'));
  }
};

/** 師爺：房契地契、過戶、商號登記（房產市場在 property.ts 接進來） */
let clerkHook: ((ctx: EventCtx) => Promise<boolean>) | null = null;
export const setClerkHook = (f: (ctx: EventCtx) => Promise<boolean>) => (clerkHook = f);

export const clerkTalk: Script = async (ctx) => {
  if (clerkHook && (await clerkHook(ctx))) return;
  await ctx.say(...miao('在下苗守正，忝為本縣刑名錢穀師爺。', '房契地契、過戶登記、商號開業，都歸在下管。有事儘管說。'));
};
