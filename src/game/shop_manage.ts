/**
 * 經營管理（4.22）：保鏢、進貨、夥計士氣與年度加薪、每日／每月帳目。
 * 資料掛在 ShopState 上（shop.ts），這裡只放規則與數值；管理介面是 ui/ShopManager.tsx（店裡櫃台的「經營管理」）。
 *
 * - 保鏢：從當地的官府（衙役）、鏢局（鏢師）、幫會（漕幫幫眾）或武館（弟子）請人坐鎮，每天付錢。
 *   各家價錢與本事不同：地痞上門的機會、遭小偷的機會、客人看了安不安心（客人多寡）。看當地有沒有這些地方（TOWN_GUARDS）。
 *   開武館的話不必另請保鏢（店種 selfGuard，之後做武館時用）。
 * - 進貨：自己供貨（自己做的菜、釣的魚、織的衣服從行囊擺上架，不花本錢）或批貨（每天半夜照設定補到幾件，
 *   向供應商進貨，本錢從櫃上扣）。供應商分散在各城（SUPPLIERS），要親自去談才簽得了約；在那個城有同一種自己的店，
 *   就由分號就地採辦、不必簽約（進價貴五分）。飯館的菜由自家廚房照你會的菜做。
 *   數值抓在：最好的情況（老字號、熱鬧地段、名聲滿、三個夥計、簽了最便宜的約）一家店一個月淨賺一千到一千六百兩上下。
 * - 掌櫃與大掌櫃：照總號的方針代管（4.23）。
 * - 士氣：每個夥計 0–100（剛雇來 60），每天慢慢回到 55。加薪、發紅包、年度加薪會提高；不答應加薪、扣工錢會降低。
 *   士氣高客人多（平均 100 多一成、0 少一成），士氣低更常鬧加薪、偷懶，低於 20 每天一成機會走人。
 * - 年度加薪：每年正月初一照設定給每個夥計加 0／1／2 兩（加了士氣 +10／+20，不加 -5）。
 * - 帳目：每天記一筆（進帳、工錢、稅、保鏢、進貨、客人），保留 120 天；每月另外加總，一直留著。
 */

import { ITEMS } from './character';
import { DISHES } from './cooking';
import { FISH } from './fishing';
import type { Character } from './character';
import { dateOf } from './time';

// ── 稱號 ────────────────────────────────────────────────

/** 經營者的稱號：第一次買下店面（或老店）就有；簽供應商、找掌櫃、經營管理都要有這個稱號 */
export const BIZ_TITLE = '東家';
export const hasBizTitle = (hero: Character) => !!hero.titles?.includes(BIZ_TITLE);

// ── 保鏢 ────────────────────────────────────────────────

export type GuardSource = 'yamen' | 'escort' | 'gang' | 'wuguan';
export interface GuardDef {
  id: GuardSource;
  /** 哪裡請的人 */
  from: string;
  /** 稱呼（衙役、鏢師……） */
  title: string;
  /** 每天的錢 */
  fee: number;
  /** 地痞上門的機會倍數（0 就是不敢來） */
  ruffian: number;
  /** 遭小偷的機會倍數 */
  thief: number;
  /** 客人多寡的倍數 */
  draw: number;
  desc: string;
  names: string[];
  sprite: string;
}
export const GUARDS: GuardDef[] = [
  {
    id: 'yamen', from: '縣衙', title: '衙役', fee: 3, ruffian: 0.25, thief: 0.3, draw: 1,
    desc: '下了值的衙役來店裡坐坐。地痞見了官差多半繞道，真來了也會被當場打發。價錢公道。',
    names: ['魯長順', '鄭四寶'], sprite: 'guard',
  },
  {
    id: 'escort', from: '金刀鏢局', title: '鏢師', fee: 5, ruffian: 0, thief: 0.1, draw: 1.05,
    desc: '鏢局的鏢師，身手最好，小偷都不敢打主意。客人看了安心，生意還多半成。最貴。',
    names: ['樊大勇', '唐鐵臂'], sprite: 'escort',
  },
  {
    id: 'gang', from: '漕幫', title: '幫眾', fee: 2, ruffian: 0, thief: 0.5, draw: 0.95,
    desc: '漕幫的人往門口一站，蔡三那種小混混連看都不敢看。就是長相兇了點，有些客人看了發毛。最便宜。',
    names: ['熊老六', '麻三皮'], sprite: 'boatman',
  },
  {
    id: 'wuguan', from: '武館', title: '武館弟子', fee: 3, ruffian: 0.1, thief: 0.2, draw: 1.02,
    desc: '武館的弟子出來歷練，規矩好、身手也不差。',
    names: ['武館弟子'], sprite: 'disciple',
  },
];
export const guardDef = (id: GuardSource) => GUARDS.find((g) => g.id === id)!;

/** 各城請得到哪幾種保鏢（看城裡有沒有官府、鏢局、幫會、武館） */
export const TOWN_GUARDS: Record<string, GuardSource[]> = { 臨江城: ['yamen', 'escort', 'gang'] };
/** 店面在哪張地圖 → 哪個城（名稱） */
export const townOf = (map: string) => {
  const id = townOfMap(map);
  return id ? townName(id) : map;
};

export interface ShopGuard {
  source: GuardSource;
  name: string;
  since: number;
}

// ── 城與供應商 ──────────────────────────────────────────

/** 有市集、有供應商的地方（地圖 id 的開頭對到哪個城；去過才知道那裡有哪些供應商） */
export const TOWNS: { id: string; name: string; maps: string[] }[] = [
  { id: 'linjiang', name: '臨江城', maps: ['linjiang', 'lj_', 'prop:lj'] },
  { id: 'qingzhu', name: '青竹村', maps: ['qingzhu', 'qz_', 'home:qz'] },
  { id: 'biyi', name: '碧漪湖漁村', maps: ['biyi', 'by_'] },
  { id: 'dabutou', name: '大埠頭', maps: ['dabutou', 'bp_'] },
];
export const townName = (id: string) => TOWNS.find((t) => t.id === id)?.name ?? id;
/** 這張地圖在哪個城（不在城裡就是 undefined） */
export const townOfMap = (map: string) => TOWNS.find((t) => t.maps.some((m) => map === m || (/[_:]/.test(m) && map.startsWith(m))))?.id;

const price = (id: string) => ITEMS[id]?.price ?? 0;
const isFood = (id: string) => ITEMS[id]?.category === '食材' && !FISH.some((f) => f.id === id);
const LAKE = new Set([...FISH.filter((f) => f.level <= 2 && (f.spots.pier || f.spots.reeds || f.spots.isle)).map((f) => f.id), 'lotus_root', 'water_chestnut', 'dried_fish']);
const SEA = new Set(['sea_fish', 'shrimp', 'seaweed']);

/**
 * 供應商：哪個城、哪家商號、找誰談（要親自去談才簽得了約）、供什麼貨、進價（佔行情）、每件運費、每天送到的機會（雨雪天另外打折）。
 * 遠的地方產地直送比較便宜，可是要運費、比較常延誤。
 */
export interface SupplierDef {
  id: string;
  town: string;
  name: string;
  contact: string;
  where: string;
  goods: (id: string) => boolean;
  ratio: number;
  freight: number;
  reliable: number;
  /** 雨雪天送到的機會再乘這個 */
  storm: number;
  desc: string;
}
export const SUPPLIERS: SupplierDef[] = [
  {
    id: 'lj_agent', town: 'linjiang', name: '萬通牙行', contact: '錢六', where: '臨江城北・萬通牙行',
    goods: (id) => ['藥品', '雜物', '食材'].includes(ITEMS[id]?.category ?? '') && price(id) > 0 && price(id) <= 40 && !ITEMS[id].manual && !ITEMS[id].dish && !ITEMS[id].bound && !id.startsWith('stone_') && !FISH.some((f) => f.id === id) && !SEA.has(id) && !LAKE.has(id),
    ratio: 0.85, freight: 0, reliable: 0.98, storm: 1,
    desc: '城裡的牙行什麼都能張羅：藥材、雜物、米麵菜蔬。價錢不算便宜，但從不誤事。',
  },
  {
    id: 'lj_cloth', town: 'linjiang', name: '錦繡布莊', contact: '魏錦娘', where: '臨江城南・錦繡布莊',
    goods: (id) => !!ITEMS[id]?.gear && price(id) > 0 && price(id) <= 120 && !ITEMS[id].bound && !id.startsWith('w_') && !ITEMS[id].gear?.sect,
    ratio: 0.85, freight: 0, reliable: 0.97, storm: 1,
    desc: '城裡最大的布莊，成衣、鞋帽、護具都有現貨。',
  },
  {
    id: 'lj_clinic', town: 'linjiang', name: '回春堂', contact: '白濟仁', where: '臨江城南・回春堂',
    goods: (id) => ITEMS[id]?.category === '藥品' && price(id) > 0 && price(id) <= 40 && !ITEMS[id].bound,
    ratio: 0.8, freight: 0, reliable: 0.97, storm: 1,
    desc: '藥舖自己配的藥，進價比牙行低一截，只是只有藥。',
  },
  {
    id: 'qz_farm', town: 'qingzhu', name: '青竹村菜農', contact: '阿牛', where: '青竹村・田邊',
    goods: (id) => isFood(id) && price(id) > 0 && price(id) <= 3,
    ratio: 0.7, freight: 0.5, reliable: 0.95, storm: 0.85,
    desc: '村裡自家種的米菜、雞蛋、豆腐，挑擔子送進城。便宜，就是下雨天路不好走。',
  },
  {
    id: 'by_ruan', town: 'biyi', name: '阮家魚簍', contact: '阮大水', where: '碧漪湖漁村・湖邊',
    goods: (id) => LAKE.has(id) && price(id) > 0,
    ratio: 0.55, freight: 1, reliable: 0.92, storm: 0.8,
    desc: '碧漪湖每天的漁獲、蓮藕菱角、曬好的魚乾，裝簍挑進城。',
  },
  {
    id: 'bp_pang', town: 'dabutou', name: '龐家漁船', contact: '龐老大', where: '大埠頭・魚市碼頭',
    goods: (id) => SEA.has(id),
    ratio: 0.5, freight: 1.5, reliable: 0.85, storm: 0.6,
    desc: '出海打回來的海魚、鮮蝦、海帶，產地價最便宜。路遠，遇上風浪就斷貨。',
  },
  {
    id: 'bp_trader', town: 'dabutou', name: '海商會館', contact: '駱千帆', where: '大埠頭・海商會館',
    goods: (id) => (ITEMS[id]?.category === '雜物' || (isFood(id) && price(id) >= 3)) && !FISH.some((f) => f.id === id) && price(id) > 0 && price(id) <= 40 && !ITEMS[id].manual && !ITEMS[id].bound && !id.startsWith('stone_') && !SEA.has(id) && !LAKE.has(id),
    ratio: 0.76, freight: 1.5, reliable: 0.9, storm: 0.75,
    desc: '南來北往的海商帶來的糖、乾貨、香料與雜貨，量大價低，從大埠頭一路運過來。',
  },
];
export const supplierDef = (id: string) => SUPPLIERS.find((x) => x.id === id)!;

/** 合約：期限、簽約費、折扣 */
export const TERMS = [
  { id: 'month', name: '一個月', days: 30, fee: 20, disc: 0 },
  { id: 'season', name: '一季', days: 90, fee: 50, disc: 0.03 },
  { id: 'year', name: '一年', days: 360, fee: 160, disc: 0.06 },
] as const;
export type TermId = (typeof TERMS)[number]['id'];
export interface Contract {
  term: TermId;
  since: number;
  until: number;
}
/** 沒簽約、由當地的分號就地採辦：進價貴五分 */
export const BRANCH_EXTRA = 0.05;

/** 經營的整體狀態（world.biz）：去過的地方、供應商合約、掌櫃、方針、帳房 */
export interface BizState {
  visited: string[];
  contracts: Record<string, Contract>;
  /** 簽過約的供應商（之後可以在帳簿裡續約，不必再跑一趟） */
  signed: string[];
  managers: Manager[];
  policy: Policy;
  /** 掌櫃交上來的錢（總號帳房），去任何一家自己的店都能提 */
  vault: number;
  /** 帳房的每月入帳記錄 */
  vaultLog?: Record<string, number>;
}
export const newBiz = (): BizState => ({ visited: [], contracts: {}, signed: [], managers: [], policy: { ...DEFAULT_POLICY }, vault: 0 });

/**
 * 某種店能從哪裡進哪些貨（每樣挑最便宜的來源）。
 * 供應商可用的條件：簽了約（照合約打折），或在供應商那個城有同一種自己的店（分號就地採辦，不必簽約，進價貴五分）。
 * 飯館的菜是自家廚子做：本錢 ＝ 賣價 ×（廚房工錢 KITCHEN ＋ 食材比重 × 食材的進價比例），食材要每一樣都有來源。
 */
export const KITCHEN = 0.4;
const FOOD_SHARE = 0.55;

export interface Source {
  id: string;
  cost: number;
  from: string;
  sup: string;
  reliable: number;
  storm: number;
}

export function supplySources(type: string, accepts: (id: string) => boolean, hero: Character, biz: BizState | undefined, day: number, branchTowns: string[], talent = 0): Source[] {
  const active = SUPPLIERS.map((s) => {
    const c = biz?.contracts[s.id];
    if (c && c.until >= day) return { s, ratio: s.ratio * (1 - TERMS.find((t) => t.id === c.term)!.disc) };
    if (branchTowns.includes(s.town)) return { s, ratio: s.ratio + BRANCH_EXTRA };
    return null;
  }).filter(Boolean) as { s: SupplierDef; ratio: number }[];
  // 掌櫃越能幹，進價壓得越低（才幹 10 低五分）
  const cut = 1 - talent * 0.005;
  const best = (id: string): Source | null => {
    let out: Source | null = null;
    for (const { s, ratio } of active) {
      if (!s.goods(id)) continue;
      const cost = Math.max(1, Math.round((price(id) * ratio + s.freight) * cut));
      if (!out || cost < out.cost) out = { id, cost, from: s.name, sup: s.id, reliable: s.reliable, storm: s.storm };
    }
    return out;
  };
  if (type === 'restaurant')
    return DISHES.filter((d) => hero.works?.[`cooking:${d.id}`] && price(d.id) > 0).flatMap((d) => {
      const parts = Object.entries(d.needs).map(([k, n]) => ({ src: best(k), n, p: price(k) * n }));
      if (parts.some((x) => !x.src)) return [];
      const r = parts.reduce((a, x) => a + x.src!.cost * x.n, 0) / Math.max(1, parts.reduce((a, x) => a + x.p, 0));
      const worst = parts.reduce((a, x) => (x.src!.reliable * x.src!.storm < a.reliable * a.storm ? x.src! : a), parts[0].src!);
      return [{ id: d.id, cost: Math.max(1, Math.round(price(d.id) * (KITCHEN + FOOD_SHARE * Math.min(1.2, r)) * cut)), from: '自家廚房', sup: worst.sup, reliable: worst.reliable, storm: worst.storm }];
    });
  return Object.keys(ITEMS)
    .filter((id) => accepts(id))
    .map(best)
    .filter((x): x is Source => !!x);
}

// ── 進貨 ────────────────────────────────────────────────

export interface Supply {
  mode: 'self' | 'order';
  /** 批貨：每樣補到幾件 */
  targets: Record<string, number>;
}
/** 批貨的上限（每樣最多補到幾件） */
export const SUPPLY_MAX = 30;
/** 櫃上最多能欠到多少（批貨錢不夠時，賒到這裡為止） */
export const CREDIT = 100;

// ── 掌櫃（專業經理人） ──────────────────────────────────

/**
 * 掌櫃：管一家店；大掌櫃：管一整座城的店與房子。
 * - 才幹 1–10：客人多（每點 1%）、進價低（每點 0.5%）；做久了會長（每 60 點經驗 +1，每天的經驗 ＝ 管的店數）。
 * - 忠誠 0–100：薪水給得公道（日薪 ≥ 才幹＋2 或分紅 ≥ 一成）每天 +0.2，否則 -0.3；打賞 +10。
 *   低於 40 會中飽私囊（每天收入的 (40-忠誠)/400），要查帳才看得出來。
 * - 照總號的方針處理店裡的事，不必東家回去。
 */
export interface Manager {
  id: string;
  name: string;
  talent: number;
  loyalty: number;
  exp: number;
  /** 1 掌櫃（管 shop）、2 大掌櫃（管 town 整座城） */
  rank: 1 | 2;
  shop?: string;
  town?: string;
  salary: number;
  /** 分紅（佔盈餘） */
  share: number;
  since: number;
  /** 上次查帳以來吞掉的錢（東家看不到，查帳才知道） */
  skim: number;
  /** 上次打賞的日子 */
  tipDay?: number;
  desc: string;
}
/** 升大掌櫃：才幹 6 以上、經驗 90 以上 */
export const PROMOTE = { talent: 6, exp: 90 };
/** 夥計可以提拔成掌櫃：到職 30 天以上、士氣 70 以上 */
export const RISE = { days: 30, morale: 70 };
/** 牙行介紹的掌櫃人選 */
export const MANAGER_POOL: Omit<Manager, 'id' | 'since' | 'skim' | 'exp' | 'shop' | 'town'>[] = [
  { name: '晏守拙', talent: 5, loyalty: 75, rank: 1, salary: 6, share: 0.05, desc: '在當鋪做了十年二掌櫃，算盤打得精，人老實。' },
  { name: '邵通寶', talent: 8, loyalty: 45, rank: 2, salary: 12, share: 0.1, desc: '做過大商號的大掌櫃，手腕高明，就是心思活絡，得看緊點。' },
  { name: '溫如玉', talent: 6, loyalty: 60, rank: 1, salary: 8, share: 0.08, desc: '綢緞莊出身的女掌櫃，待人和氣，客人都愛跟她做生意。' },
  { name: '杭老實', talent: 3, loyalty: 90, rank: 1, salary: 4, share: 0.03, desc: '人如其名，本事普通，但一文錢都不會差。' },
];
/** 打賞掌櫃：銀兩、忠誠、隔幾天才能再賞 */
export const TIP = { silver: 20, loyalty: 10, every: 10 };

/** 總號的方針：交給掌櫃處理的事要怎麼辦 */
export interface Policy {
  /** 地痞上門：付保護費、報官、請衙役坐鎮、請鏢師坐鎮、請漕幫坐鎮 */
  ruffian: 'pay' | 'report' | 'yamen' | 'escort' | 'gang';
  /** 夥計要加薪：答應、不答應 */
  raise: 'agree' | 'refuse';
  /** 夥計偷懶：訓一頓、扣工錢、辭退 */
  slack: 'scold' | 'dock' | 'fire';
  /** 大主顧下訂：架上夠就接 */
  patron: 'accept' | 'decline';
  /** 缺人時自己去牙行補人 */
  hire: boolean;
  /** 供應商合約到期自動續約（同樣的期限） */
  renew: boolean;
  /** 年度加薪 */
  yearly: 0 | 1 | 2;
  /** 租客屋漏：多少兩以內直接修 */
  repair: number;
  /** 租客交不出租：寬限、催討、免了 */
  late: 'grace' | 'press' | 'forgive';
  /** 櫃上留多少錢周轉，其餘每天交回總號帳房 */
  float: number;
}
export const DEFAULT_POLICY: Policy = { ruffian: 'report', raise: 'agree', slack: 'scold', patron: 'accept', hire: true, renew: true, yearly: 1, repair: 20, late: 'grace', float: 100 };

// ── 士氣 ────────────────────────────────────────────────

export interface StaffInfo {
  since: number;
  morale: number;
}
export const MORALE_START = 60;
export const MORALE_REST = 55;
export const clampMorale = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

/** 年度加薪的選項（每年正月初一給每個夥計加幾兩） */
export const YEARLY = [0, 1, 2] as const;
/** 發紅包：每人幾兩、士氣加多少、隔幾天才能再發 */
export const BONUS = { silver: 3, morale: 12, every: 10 };

// ── 帳目 ────────────────────────────────────────────────

export interface DayStat {
  day: number;
  closed?: boolean;
  customers: number;
  sold: number;
  income: number;
  wages: number;
  tax: number;
  guard: number;
  supply: number;
  /** 掌櫃的薪水與分紅 */
  mgr?: number;
}
export interface MonthStat {
  /** 年、月（0 起算） */
  year: number;
  month: number;
  days: number;
  customers: number;
  income: number;
  wages: number;
  tax: number;
  guard: number;
  supply: number;
  mgr?: number;
}
export const costOf = (d: { wages: number; tax: number; guard: number; supply: number; mgr?: number }) => d.wages + d.tax + d.guard + d.supply + (d.mgr ?? 0);
/** 每日帳目留幾天 */
export const DAYS_KEPT = 120;

export const monthKey = (day: number) => {
  const { year, month } = dateOf(day);
  return `${year}-${String(month).padStart(2, '0')}`;
};
