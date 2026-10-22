/**
 * 房產市場（先做臨江城）：城裡的民居與店面都有屋主，屋主偶爾想賣，貼到公告欄的「日常公告」。
 * 主角可以到縣衙找師爺（或請牙行的牙人）買下來，出租、修繕、開店；不要了也能登記賣掉。
 *
 * - 物件清單 `PROPERTIES`：在哪張地圖的哪棟建築、民居還是店面、屋主、基本價、每旬租金。
 * - 狀態存在 world.property（出售中的告示、自己名下的房子、自己掛出去賣的房子）。
 * - 純函式都在這裡（價錢、租金、成交與否）；會改狀態的事交給 `refreshMarket` 與 story/property.ts 的腳本。
 */

import type { World } from './home';

/** 民居、空店面、照舊經營的店（買下來當東家，見 4.20 第四階段） */
export type PropKind = 'house' | 'shop' | 'business';

export interface PropertyDef {
  id: string;
  /** 顯示的名字，例如「城北東巷民居」 */
  name: string;
  map: string;
  /** 建築佔地左上角（對到地圖上的那棟房子） */
  bx: number;
  by: number;
  kind: PropKind;
  /** 屋主（賣房子的人） */
  owner: string;
  /** 屋況一級時的行情（兩） */
  base: number;
  /** 屋況一級時每旬的租金（兩）；照舊經營的店是每旬的分紅 */
  rent: number;
  /** 房子的樣子（告示上寫的） */
  desc: string;
  /** 永遠不賣（例如員外府、熟人的家） */
  neverSell?: boolean;
}

/** 臨江城的房產：城南的空店面、城北的民居 */
export const PROPERTIES: PropertyDef[] = [
  // 城南：商街上的空店面（買下可以開店，見 4.20 第三階段）
  { id: 'ljs_e11', name: '城南東街鋪面', map: 'linjiang', bx: 45, by: 11, kind: 'shop', owner: '鄧阿福', base: 520, rent: 10, desc: '臨街的單間鋪面，後頭帶一間小庫房，人來人往。' },
  { id: 'ljs_w18', name: '城南西巷鋪面', map: 'linjiang', bx: 5, by: 18, kind: 'shop', owner: '柯老三', base: 440, rent: 8, desc: '西巷口的鋪面，離城門近，挑夫行商常經過。' },
  { id: 'ljs_e18', name: '碼頭邊鋪面', map: 'linjiang', bx: 45, by: 18, kind: 'shop', owner: '史大娘', base: 480, rent: 9, desc: '靠碼頭的鋪面，一早就有卸貨的腳夫進進出出。' },
  // 城南：照舊經營的老店（偶爾轉讓；買下來只能照原本的生意做，原班人馬留下，東家每旬分紅）
  { id: 'ljb_pawn', name: '和記當鋪', map: 'linjiang', bx: 5, by: 4, kind: 'business', owner: '和守義', base: 1600, rent: 32, desc: '城南的老當鋪，收當、死當貨都有，掌櫃和守義眼光毒。' },
  { id: 'ljb_inn', name: '雲來客棧', map: 'linjiang', bx: 15, by: 11, kind: 'business', owner: '賀長年', base: 2200, rent: 44, desc: '城南的客棧，南來北往的客人都在這兒落腳、打聽消息。' },
  { id: 'ljb_tower', name: '望江樓', map: 'linjiang', bx: 34, by: 11, kind: 'business', owner: '封老爺', base: 3000, rent: 64, desc: '臨江城頭一份的酒樓，樓上看得見大江。' },
  { id: 'ljb_cloth', name: '錦繡布莊', map: 'linjiang', bx: 45, by: 4, kind: 'business', owner: '魏錦娘', base: 1400, rent: 28, desc: '魏錦娘的布莊。', neverSell: true },
  { id: 'ljb_clinic', name: '回春堂', map: 'linjiang', bx: 5, by: 11, kind: 'business', owner: '白濟仁', base: 1800, rent: 36, desc: '白濟仁的藥鋪。', neverSell: true },
  // 城北：民居（自住、出租）
  { id: 'ljn_45_5', name: '城北東街民居', map: 'lj_north', bx: 45, by: 5, kind: 'house', owner: '孫家', base: 380, rent: 6, desc: '一進的瓦房，鄰居愛搓麻將，晚上熱鬧些。' },
  { id: 'ljn_5_11', name: '城北黃狗巷小院', map: 'lj_north', bx: 5, by: 11, kind: 'house', owner: '鮑老漢', base: 420, rent: 7, desc: '帶個小院的房子，院裡一棵棗樹。' },
  { id: 'ljn_15_11', name: '城北門神巷民居', map: 'lj_north', bx: 15, by: 11, kind: 'house', owner: '蘇寡婦', base: 360, rent: 6, desc: '一進的瓦房，門上的門神有些年頭了。' },
  { id: 'ljn_45_11', name: '城北蘭花巷民居', map: 'lj_north', bx: 45, by: 11, kind: 'house', owner: '溫秀才', base: 380, rent: 6, desc: '屋主愛養蘭花，窗台、院子都擺滿了花盆。' },
  { id: 'ljn_5_16', name: '城北書聲巷民居', map: 'lj_north', bx: 5, by: 16, kind: 'house', owner: '洪先生', base: 380, rent: 6, desc: '屋主是教書先生，屋裡傳來孩子背書的聲音。' },
  { id: 'ljn_16_16', name: '城北草鞋巷小屋', map: 'lj_north', bx: 16, by: 16, kind: 'house', owner: '丁大腳', base: 260, rent: 4, desc: '一間小屋，便宜，住一個人剛好。' },
  { id: 'ljn_32_16', name: '城北燉肉巷民居', map: 'lj_north', bx: 32, by: 16, kind: 'house', owner: '胖嬸', base: 360, rent: 6, desc: '一進的瓦房，隔壁天天燉肉，香得人發慌。' },
  { id: 'ljn_45_16', name: '城北牽牛花小院', map: 'lj_north', bx: 45, by: 16, kind: 'house', owner: '方婆婆', base: 420, rent: 7, desc: '院牆爬滿牽牛花的小院，夏天很涼快。' },
  { id: 'ljn_5_21', name: '城北花貓巷民居', map: 'lj_north', bx: 5, by: 21, kind: 'house', owner: '鍾裁縫', base: 360, rent: 6, desc: '一進的瓦房，門口常有一隻花貓打盹。' },
  { id: 'ljn_15_21', name: '城北銅環大宅', map: 'lj_north', bx: 15, by: 21, kind: 'house', owner: '杭員外', base: 640, rent: 11, desc: '三進的大宅，門環擦得發亮，前後兩個院子。' },
  { id: 'ljn_45_21', name: '城北喜字巷民居', map: 'lj_north', bx: 45, by: 21, kind: 'house', owner: '閻家', base: 380, rent: 6, desc: '剛辦過喜事的人家，新媳婦嫌屋子小，想換大的。' },
];
export const propertyDef = (id: string) => PROPERTIES.find((p) => p.id === id);
export const propertyAt = (map: string, bx: number, by: number) => PROPERTIES.find((p) => p.map === map && p.bx === bx && p.by === by);

/** 老店轉讓的理由 */
const BIZ_REASONS = ['東家年紀大了，兒孫無意接手', '東家要到州城開分號，這邊想找人接手', '東家欠了一筆大債，忍痛轉讓', '東家想回鄉下享清福'];

/** 屋主想賣的理由（告示上寫的） */
const REASONS = ['舉家搬往州城', '欠了賭債，急著周轉', '年紀大了，要回鄉下養老', '兒子在外地成了家，要過去團聚', '生意賠了本，想換點現銀', '嫌屋子小，想換大的', '分家，兄弟要把房子折成銀子分'];

/** 屋況：一級（舊）、二級（修過）、三級（翻新）；租金、行情跟著漲 */
export const CONDITION = ['', '舊屋', '修過', '翻新'] as const;
const COND_MULT = [0, 1, 1.25, 1.55];
/** 修繕到下一級的費用（佔基本價的比例） */
export const REPAIR_COST = [0, 0.25, 0.4];

export interface Listing {
  id: string;
  price: number;
  /** 告示貼到哪天 */
  until: number;
  reason: string;
  /** 自己談過價了（談崩了屋主就不肯再談） */
  haggled?: boolean;
}

export interface Owned {
  /** 買的價錢（賣的時候照這個算），修繕花的錢也算一部分進去 */
  paid: number;
  day: number;
  cond: number;
  /** 空著、出租、開店、照舊經營（老店） */
  use: 'empty' | 'rent' | 'shop' | 'business';
  /** 出租：哪天開始招租（租客幾天後住進來）、租金算到哪天 */
  rentFrom?: number;
  rentPaidTo?: number;
}

export interface Sale {
  /** 市價出售或降價求售 */
  mode: 'market' | 'quick';
  agent: boolean;
  /** 哪天成交 */
  until: number;
  /** 成交價（登記時就擲好，到期才揭曉） */
  price: number;
}

export interface PropertyState {
  listings: Listing[];
  owned: Record<string, Owned>;
  selling: Record<string, Sale>;
  /** 賣掉了、還沒領的錢：物件 id → 兩 */
  payout: Record<string, number>;
  /** 第幾天起會再有人貼出售告示 */
  next: number;
}

export const propertyOf = (w: World): PropertyState => w.property ?? { listings: [], owned: {}, selling: {}, payout: {}, next: 0 };

/** 牙人的佣金（成交價的比例） */
export const AGENT_FEE = 0.03;
/** 一次最多幾張出售告示 */
const MAX_LISTINGS = 3;
/** 一旬幾天（收租的週期） */
export const XUN = 10;
/** 招租以後，租客幾天內住進來 */
export const TENANT_DAYS = 2;

const round10 = (n: number) => Math.round(n / 10) * 10;
export const valueOf = (p: PropertyDef, cond = 1) => round10(p.base * COND_MULT[cond]);
export const rentOf = (p: PropertyDef, cond = 1) => Math.round(p.rent * COND_MULT[cond]);

/** 租客：依物件 id 挑一個名字（同一間房子的租客固定） */
const TENANTS = ['鄭秀才', '馬貨郎', '褚木匠', '蔡大嫂', '侯鏢師', '吳挑夫', '易書生', '韋寡婦', '彭小販', '桂繡娘'];
export const tenantOf = (id: string) => TENANTS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % TENANTS.length];

/** 租客住進來了沒 */
export const tenantIn = (o: Owned, day: number) => o.use === 'rent' && o.rentFrom !== undefined && day >= o.rentFrom + TENANT_DAYS;

/** 欠著沒收的房租（整旬才算一次）；老店是分紅，從買下那天算起 */
export function rentDue(p: PropertyDef, o: Owned, day: number): { silver: number; xun: number } {
  if (p.kind === 'business') {
    if (o.use !== 'business') return { silver: 0, xun: 0 };
    const xun = Math.floor((day - (o.rentPaidTo ?? o.day)) / XUN);
    return { silver: xun * rentOf(p, o.cond), xun };
  }
  if (!tenantIn(o, day)) return { silver: 0, xun: 0 };
  const from = o.rentPaidTo ?? o.rentFrom! + TENANT_DAYS;
  const xun = Math.floor((day - from) / XUN);
  return { silver: xun * rentOf(p, o.cond), xun };
}

/**
 * 掛出去賣：擲好成交天數與價錢。
 * - 市價：自己談 4–10 天、九成到一成二；牙人 3–6 天、一成到一成五（佣金另扣）。
 * - 降價：自己談 1–2 天、五成到八成；牙人 1 天、六成五到八成。
 */
export function rollSale(paid: number, mode: Sale['mode'], agent: boolean, day: number, rand = Math.random): Sale {
  const between = (a: number, b: number) => a + rand() * (b - a);
  const [d0, d1, p0, p1] = mode === 'market' ? (agent ? [3, 6, 1.0, 1.15] : [4, 10, 0.9, 1.2]) : agent ? [1, 1, 0.65, 0.8] : [1, 2, 0.5, 0.8];
  return { mode, agent, until: day + Math.round(between(d0, d1)), price: round10(paid * between(p0, p1)) };
}

/**
 * 更新市場（會改 world）：撕掉過期的告示、貼新的出售告示、把到期的買賣成交。
 * 看公告欄、找師爺或牙人時呼叫。
 */
export function refreshMarket(w: World, rand = Math.random) {
  const m = propertyOf(w);
  w.property = m;
  m.listings = m.listings.filter((l) => l.until >= w.day && !m.owned[l.id]);
  // 自己掛著賣的：到期成交
  for (const [id, s] of Object.entries(m.selling)) {
    if (w.day < s.until) continue;
    delete m.selling[id];
    delete m.owned[id];
    m.payout[id] = Math.round(s.price * (s.agent ? 1 - AGENT_FEE : 1));
  }
  if (w.day < m.next) return;
  // 頭一回看：先貼兩張，免得空空的
  const first = m.next === 0;
  m.next = w.day + 2 + Math.floor(rand() * 3);
  for (let k = 0; k < (first ? 2 : 1); k++) {
    if (m.listings.length >= MAX_LISTINGS) return;
    const pool = PROPERTIES.filter((p) => !p.neverSell && !m.owned[p.id] && !m.listings.some((l) => l.id === p.id) && !m.payout[p.id]);
    if (!pool.length || (!first && rand() < 0.25)) return;
    // 第一張一定是店面，讓人知道可以買下來開店
    const shops = pool.filter((p) => p.kind === 'shop');
    // 老店難得轉讓：抽中老店時，只有兩成真的貼出來
    let p = first && k === 0 && shops.length ? shops[Math.floor(rand() * shops.length)] : pool[Math.floor(rand() * pool.length)];
    if (p.kind === 'business' && (first || rand() >= 0.2)) p = pool.filter((x) => x.kind !== 'business')[0] ?? p;
    const biz = p.kind === 'business';
    m.listings.push({
      id: p.id,
      price: round10(valueOf(p) * (0.85 + rand() * 0.3)),
      until: w.day + (biz ? 10 : 6) + Math.floor(rand() * 7),
      reason: biz ? BIZ_REASONS[Math.floor(rand() * BIZ_REASONS.length)] : REASONS[Math.floor(rand() * REASONS.length)],
    });
  }
}
