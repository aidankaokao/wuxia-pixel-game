import { useEffect, useState, type ReactNode } from 'react';
import { itemIconUrl, type ItemIcon } from '../game/art/items';
import { BIZ_TITLE } from '../game/shop_manage';
import { useGame } from '../state/store';
import { LEAF_STRIPS, LeafStrip } from './GameMenu';
import { PageHead, Spread } from './Paper';
import { isCancel, isLeft, isRight, useKeys } from './useKeys';

/**
 * 經營手冊：第一次成為「東家」時翻開，之後隨時能從選單「系統」或店裡的櫃台翻閱。
 * 跟系統選單同一本書的樣子：上緣書籤是章節，←→ 翻頁（同樣的翻頁動畫），X 闔上。
 * 每一章左頁是步驟，右頁是要訣（小圖示＋一句話）。內容改了經營規則時要一起改。
 */

type Step = { t: string; d: string };
type Tip = { icon: ItemIcon; t: string };
interface Chapter {
  tab: string;
  title: string;
  sub: string;
  steps: Step[];
  tips: Tip[];
}

const CHAPTERS: Chapter[] = [
  {
    tab: '序',
    title: '東家須知',
    sub: `得到稱號「${BIZ_TITLE}」`,
    steps: [
      { t: '置產', d: '看公告欄的出售告示，找縣衙師爺或萬通牙行買下房子、店面。' },
      { t: '開店', d: '在自己的店面登記商號，雇夥計、擺貨，每天半夜自動結算。' },
      { t: '管帳', d: '店裡櫃台的「經營管理」看帳目、人事、進貨、保鏢。' },
      { t: '進貨', d: '自己供貨，或跟各地供應商簽約批貨。' },
      { t: '代管', d: '店多了請掌櫃、大掌櫃，照你定的方針替你打理。' },
    ],
    tips: [
      { icon: 'token', t: `有了「${BIZ_TITLE}」的稱號，才能跟供應商談合約、請掌櫃。` },
      { icon: 'book', t: '這本手冊隨時可以從選單「系統」或店裡的櫃台翻開。' },
      { icon: 'scroll', t: '←→ 翻頁，上緣的書籤直接翻到那一章，X 闔上。' },
    ],
  },
  {
    tab: '置產',
    title: '一、買屋與出租',
    sub: '縣衙師爺・萬通牙行',
    steps: [
      { t: '看告示', d: '公告欄「日常公告」貼著誰家要賣房子、店面，有期限。' },
      { t: '看房', d: '找師爺苗守正或牙人錢六，可以先進去看看。' },
      { t: '談價', d: '自己談（談崩了屋主會漲價），或付三分佣金請牙人出面。' },
      { t: '出租', d: '民居可以招租，每旬收租；修繕過的房子租金高。' },
      { t: '賣屋', d: '市價慢慢賣（九成到一成二），或降價快賣（五到八成）。' },
    ],
    tips: [
      { icon: 'scroll', t: '老店（當鋪、客棧、望江樓）偶爾轉讓，買下照舊經營、每旬分紅。' },
      { icon: 'pouch', t: '民居、店面都可以修繕，房價跟著漲。' },
    ],
  },
  {
    tab: '開店',
    title: '二、登記商號開店',
    sub: '縣衙師爺',
    steps: [
      { t: '登記', d: '到縣衙找師爺，在自己的店面登記商號（規費二十兩）。' },
      { t: '選店種', d: '飯館要烹飪、布莊要紡織、魚鋪要釣魚；雜貨鋪誰都能開。' },
      { t: '雇夥計', d: '店裡要有人顧才做得了生意；夥計各有長處。' },
      { t: '擺貨', d: '把自己做的菜、釣的魚、織的衣服從行囊擺上架。' },
      { t: '收帳', d: '每天半夜結算，收入存在櫃上，回店裡收。' },
    ],
    tips: [
      { icon: 'rice', t: '自己做的東西不花本錢，賺得最多。' },
      { icon: 'pouch', t: '東家偶爾親自站櫃台，那天生意多四成。' },
      { icon: 'token', t: '店可以擴成店鋪、老字號：客人多、貨架多、能雇的人多。' },
    ],
  },
  {
    tab: '帳簿',
    title: '三、經營管理',
    sub: '店裡櫃台的帳簿',
    steps: [
      { t: '總覽', d: '櫃上的錢、近三十天盈虧、定價（便宜／公道／高價）。' },
      { t: '帳目', d: '每日、每月的長條圖：進帳、開銷、盈虧一目了然。' },
      { t: '人事', d: '夥計的工錢與士氣，加薪、發紅包、年度加薪。' },
      { t: '進貨', d: '自己供貨或批貨，每樣補到幾件。' },
      { t: '保鏢', d: '從縣衙、鏢局、漕幫請人坐鎮。' },
    ],
    tips: [
      { icon: 'scroll', t: 'Tab 換頁，←→ 調數值、看某一天的帳。' },
      { icon: 'pouch', t: '客人身上的錢有限，太貴的東西會嫌貴不買。' },
    ],
  },
  {
    tab: '進貨',
    title: '四、供應商與合約',
    sub: '去過的地方才找得到',
    steps: [
      { t: '走動', d: '去過的城鎮，總號帳簿才列得出那裡的供應商。' },
      { t: '上門', d: '要親自找那家的人談，才簽得了約。' },
      { t: '簽約', d: '一個月、一季、一年；簽得越久，進價讓得越多。' },
      { t: '批貨', d: '進貨頁改成批貨，設定每樣補到幾件，每天半夜送來。' },
      { t: '續約', d: '簽過的可以在總號帳簿續約，不必再跑一趟。' },
    ],
    tips: [
      { icon: 'fish', t: '產地價低，可是要運費、雨雪天常斷貨。' },
      { icon: 'sack', t: '在那座城有同一種自己的店，由分號就地採辦，不必簽約（貴五分）。' },
      { icon: 'scroll', t: '每樣貨會自動挑最便宜的那家。' },
    ],
  },
  {
    tab: '夥計',
    title: '五、夥計與士氣',
    sub: '人和才能生財',
    steps: [
      { t: '士氣', d: '剛雇來六十，每天慢慢回到五十五上下。' },
      { t: '加薪', d: '加一兩，士氣大漲；拒絕，有人會走。' },
      { t: '紅包', d: '每人三兩，士氣上來；隔十天才能再發。' },
      { t: '年度加薪', d: '每年正月初一照設定給每個人加薪。' },
    ],
    tips: [
      { icon: 'token', t: '士氣高客人多；太低常鬧事，低於二十隨時會走。' },
      { icon: 'pouch', t: '夥計待久、士氣高，可以提拔成掌櫃。' },
    ],
  },
  {
    tab: '店事',
    title: '六、店裡的大小事',
    sub: '櫃台第一項「有事」',
    steps: [
      { t: '地痞', d: '蔡三來收保護費：給錢、動手、報官，或請保鏢坐鎮。' },
      { t: '夥計', d: '想加薪、偷懶帳對不上，要東家拿主意。' },
      { t: '大主顧', d: '周府下訂，期限內交貨照價多收五成。' },
      { t: '老饕', d: '飯館來了郝一嚐：端出好菜，口碑傳開。' },
      { t: '租客', d: '屋漏、手頭緊、送東西來，去屋裡找他。' },
    ],
    tips: [
      { icon: 'sword', t: '鏢師坐鎮，地痞不敢上門、小偷不敢打主意。' },
      { icon: 'pouch', t: '夜裡遭小偷不用處理，帳上會記下來。' },
    ],
  },
  {
    tab: '掌櫃',
    title: '七、掌櫃與總號',
    sub: '店多了就交給專業的人',
    steps: [
      { t: '找人', d: '萬通牙行的錢六介紹掌櫃，或提拔自家夥計。' },
      { t: '指派', d: '掌櫃管一家店；大掌櫃管一整座城，連房子一起。' },
      { t: '方針', d: '在總號帳簿定好方針，掌櫃照著辦，不必你回去。' },
      { t: '帳房', d: '多的錢交回總號帳房，到任何一家店都能提。' },
      { t: '查帳', d: '忠誠低的會中飽私囊，記得偶爾查帳。' },
    ],
    tips: [
      { icon: 'book', t: '掌櫃做久了才幹會長，才幹六、經驗九十能升大掌櫃。' },
      { icon: 'pouch', t: '薪水、分紅給得公道，忠誠才會漲。' },
    ],
  },
  {
    tab: '心得',
    title: '八、生意經',
    sub: '老東家的幾句話',
    steps: [
      { t: '看節令', d: '節慶當天客人多；年節賣年貨、新衣，中秋端午上館子。' },
      { t: '看天氣', d: '下雨下雪客人少，遠地的貨也常斷。' },
      { t: '看名聲', d: '名聲越大，慕名而來的客人越多。' },
      { t: '別欠帳', d: '櫃上欠超過一百兩，供應商就不肯再賒，生意會停。' },
      { t: '別貪大', d: '店少時請大掌櫃、鏢師不划算，先把一家店做起來。' },
    ],
    tips: [
      { icon: 'tea', t: '批貨省事但利薄；自己做的東西才是真本錢。' },
      { icon: 'token', t: '最好的店，一個月也不過淨賺一千多兩。細水長流。' },
    ],
  },
];

export function Handbook() {
  const panel = useGame((s) => s.panel);
  const open = panel?.kind === 'handbook';
  const [ch, setCh] = useState(0);
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; n: number } | null>(null);
  useEffect(() => {
    if (open) (setCh(0), setTurn(null));
  }, [open]);
  const flip = (to: number) => {
    if (to === ch || to < 0 || to >= CHAPTERS.length) return;
    setTurn((t) => ({ dir: to > ch ? 'next' : 'prev', n: (t?.n ?? 0) + 1 }));
    setCh(to);
  };
  useKeys(open, (k, e) => {
    if (isCancel(k)) return useGame.getState().closePanel();
    if (isLeft(k) || k === '[' || k === 'PageUp') flip(ch - 1);
    else if (isRight(k) || k === ']' || k === 'PageDown' || k === 'Tab' || k === 'Enter' || k === ' ' || k === 'e' || k === 'E') {
      e.preventDefault();
      flip(ch + 1);
    }
  });
  if (!open) return null;
  const c = CHAPTERS[ch];
  const left: ReactNode = (
    <>
      <PageHead title={c.title} sub={c.sub} />
      <ol className="hb-steps">
        {c.steps.map((s, i) => (
          <li key={s.t}>
            <span className="hb-num">{i + 1}</span>
            <div>
              <b>{s.t}</b>
              <p>{s.d}</p>
            </div>
          </li>
        ))}
      </ol>
    </>
  );
  const right: ReactNode = (
    <>
      <PageHead title="要訣" sub={ch === 0 ? '經營手冊' : `第 ${ch} 章`} />
      <ul className="hb-tips">
        {c.tips.map((t) => (
          <li key={t.t}>
            <img src={itemIconUrl(t.icon)} alt="" />
            <p>{t.t}</p>
          </li>
        ))}
      </ul>
      {ch === 0 && <p className="hb-seal">東家 印</p>}
      {ch < CHAPTERS.length - 1 && <p className="hb-next">翻到下一頁：{CHAPTERS[ch + 1].title} →</p>}
    </>
  );
  return (
    <div className="menu-backdrop" onClick={() => useGame.getState().closePanel()}>
      <div className="tome hb" onClick={(e) => e.stopPropagation()}>
        <ul className="tome-tabs">
          {CHAPTERS.map((x, i) => (
            <li key={x.tab} className={i === ch ? 'active' : ''} onClick={() => flip(i)}>
              {x.tab}
            </li>
          ))}
        </ul>
        <div className="tome-cover">
          <div className="tome-spread" key={`page${ch}`}>
            <Spread left={left} right={right} folio={ch} />
          </div>
          {turn && (
            <div key={`turn${turn.n}`} className={`tome-turn ${turn.dir}`} onAnimationEnd={(e) => e.animationName.startsWith('turn-') && setTurn(null)}>
              <LeafStrip n={LEAF_STRIPS} />
              <div className="turn-shadow" />
            </div>
          )}
        </div>
        <p className="tome-help">《經營手冊》　←→ 翻頁　點書籤直接翻到那一章　X 闔上</p>
      </div>
    </div>
  );
}
