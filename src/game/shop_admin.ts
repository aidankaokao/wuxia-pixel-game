/**
 * 經營管理介面（ui/ShopManager.tsx）的操作：改定價、雇人辭人、加薪、發紅包、年度加薪、進貨方式、請保鏢。
 * 每個操作直接改 store 裡的 world／hero，回傳一句給介面顯示的話（失敗時 ok 是 false）。
 */

import { useGame } from '../state/store';
import { addMorale, dropStaff, hireStaff, moraleOf, SHOP_LEVELS, shopsOf, STAFF, staffDef, wageOf, type ShopState } from './shop';
import { BONUS, guardDef, GUARDS, MANAGER_POOL, newBiz, PROMOTE, RISE, supplierDef, SUPPLY_MAX, TERMS, TIP, townOf, TOWN_GUARDS, YEARLY, type BizState, type GuardSource, type Manager, type Policy, type TermId } from './shop_manage';
import { propertyDef } from './property';

const st = () => useGame.getState();
export type Result = { ok: boolean; msg: string };
const ok = (msg: string): Result => ({ ok: true, msg });
const no = (msg: string): Result => ({ ok: false, msg });

const update = (id: string, f: (s: ShopState) => void) => st().updateWorld((w) => f(w.shops![id]));
export const shopById = (id: string) => shopsOf(st().world)[id];

// ── 定價 ────────────────────────────────────────────────

export function setPrice(id: string, tier: number): Result {
  update(id, (s) => (s.price = Math.max(0, Math.min(2, tier))));
  return ok('定價改了。');
}

// ── 人事 ────────────────────────────────────────────────

/** 城裡還能雇的夥計（別家店雇走的不算） */
export function hirePool() {
  const hired = new Set(Object.values(shopsOf(st().world)).flatMap((x) => x.staff));
  return STAFF.filter((x) => !hired.has(x.name));
}

export function hire(id: string, name: string): Result {
  const s = shopById(id);
  if (s.staff.length >= SHOP_LEVELS[s.level - 1].staff) return no(`${SHOP_LEVELS[s.level - 1].name}最多雇 ${SHOP_LEVELS[s.level - 1].staff} 個夥計。`);
  if (!hirePool().some((x) => x.name === name)) return no(`${name}已經在別處做事了。`);
  update(id, (x) => hireStaff(x, name, st().world.day));
  return ok(`雇了${name}（一天 ${staffDef(name).wage} 兩）。`);
}

export function fire(id: string, name: string): Result {
  update(id, (x) => dropStaff(x, name));
  return ok(`${name}收拾東西走了。`);
}

/** 給某個夥計加薪一兩：士氣 +20 */
export function raiseWage(id: string, name: string): Result {
  update(id, (x) => {
    x.raises = { ...x.raises, [name]: (x.raises?.[name] ?? 0) + 1 };
    addMorale(x, name, 20, st().world.day);
  });
  return ok(`${name}的工錢加到一天 ${wageOf(shopById(id), name)} 兩，高興得不得了。`);
}

/** 發紅包：每人 BONUS.silver 兩、士氣 +BONUS.morale，隔 BONUS.every 天才能再發 */
export function bonus(id: string): Result {
  const s = shopById(id);
  const day = st().world.day;
  if (!s.staff.length) return no('店裡沒有夥計。');
  if (s.bonusDay !== undefined && day - s.bonusDay < BONUS.every) return no(`前幾天才發過，${s.bonusDay + BONUS.every - day} 天後再發吧。`);
  const cost = BONUS.silver * s.staff.length;
  if (st().hero.silver < cost) return no(`要 ${cost} 兩，身上不夠。`);
  st().updateHero((h) => (h.silver -= cost));
  update(id, (x) => {
    x.bonusDay = day;
    for (const n of x.staff) addMorale(x, n, BONUS.morale, day);
  });
  return ok(`每人發了 ${BONUS.silver} 兩紅包（共 ${cost} 兩），夥計們士氣大振。`);
}

export function setYearly(id: string, n: number): Result {
  const v = YEARLY[Math.max(0, Math.min(YEARLY.length - 1, n))];
  update(id, (x) => (x.yearly = v));
  return ok(v ? `往後每年正月初一，每個夥計加薪 ${v} 兩。` : '往後新年不加薪。');
}

// ── 進貨 ────────────────────────────────────────────────

export function setSupplyMode(id: string, mode: 'self' | 'order'): Result {
  update(id, (x) => (x.supply = { mode, targets: x.supply?.targets ?? {} }));
  return ok(mode === 'order' ? '改成批貨：每天半夜照設定補貨，本錢從櫃上扣。' : '改成自己供貨：從行囊上架，不花本錢。');
}

export function setTarget(id: string, item: string, n: number): Result {
  const v = Math.max(0, Math.min(SUPPLY_MAX, n));
  update(id, (x) => {
    x.supply ??= { mode: 'order', targets: {} };
    if (v) x.supply.targets[item] = v;
    else delete x.supply.targets[item];
  });
  return ok('');
}

// ── 保鏢 ────────────────────────────────────────────────

/** 這家店所在的城請得到哪幾種保鏢 */
export function guardOptions(id: string) {
  const p = propertyDef(id);
  const town = townOf(p?.map ?? '');
  const here = TOWN_GUARDS[town] ?? [];
  return GUARDS.map((g) => ({ def: g, available: here.includes(g.id), town }));
}

export function hireGuard(id: string, source: GuardSource): Result {
  const g = guardDef(source);
  const s = shopById(id);
  if (s.guard?.source === source) return no(`已經是${g.from}的${g.title}在坐鎮了。`);
  // 同一家來源的人輪著派，別家店請走的不重複
  const used = new Set(Object.values(shopsOf(st().world)).map((x) => x.guard?.name));
  const name = g.names.find((n) => !used.has(n)) ?? g.names[0];
  update(id, (x) => (x.guard = { source, name, since: st().world.day }));
  return ok(`${g.from}派了${g.title}${name}來坐鎮（一天 ${g.fee} 兩）。`);
}

export function dismissGuard(id: string): Result {
  const s = shopById(id);
  if (!s.guard) return no('店裡沒有保鏢。');
  const name = s.guard.name;
  update(id, (x) => delete x.guard);
  return ok(`${name}拱拱手走了。`);
}

// ── 總號：供應商合約 ────────────────────────────────────


const biz = () => st().world.biz ?? newBiz();
const updateBiz = <T>(f: (b: BizState) => T): T =>
  st().updateWorld((w) => {
    w.biz ??= newBiz();
    return f(w.biz);
  });

/** 簽約或續約（續約從原本的到期日往後接）：付簽約費 */
export function signContract(sup: string, term: TermId): Result {
  const t = TERMS.find((x) => x.id === term)!;
  const d = supplierDef(sup);
  if (st().hero.silver < t.fee) return no(`簽約費 ${t.fee} 兩，身上不夠。`);
  st().updateHero((h) => (h.silver -= t.fee));
  const day = st().world.day;
  const until = updateBiz((b) => {
    const old = b.contracts[sup];
    const from = old && old.until >= day ? old.until : day;
    b.contracts[sup] = { term, since: old && old.until >= day ? old.since : day, until: from + t.days };
    if (!b.signed.includes(sup)) b.signed.push(sup);
    return from + t.days;
  });
  return ok(`跟${d.name}簽了${t.name}的約（到第 ${until} 天）${t.disc ? `，進價再讓 ${Math.round(t.disc * 100)}%` : ''}。`);
}

// ── 總號：掌櫃 ──────────────────────────────────────────

export const managerById = (id: string) => biz().managers.find((m) => m.id === id);
const updateManager = (id: string, f: (m: Manager) => void) => updateBiz((b) => f(b.managers.find((m) => m.id === id)!));

/** 牙行介紹、還沒被雇走的掌櫃 */
export const managerPool = () => MANAGER_POOL.filter((p) => !biz().managers.some((m) => m.name === p.name));

export function hireManager(name: string): Result {
  const p = MANAGER_POOL.find((x) => x.name === name);
  if (!p) return no('沒有這個人。');
  const day = st().world.day;
  updateBiz((b) => b.managers.push({ ...p, id: `m${day}_${b.managers.length}`, since: day, skim: 0, exp: p.rank === 2 ? PROMOTE.exp : 0 }));
  return ok(`雇了${p.rank === 2 ? '大掌櫃' : '掌櫃'}${name}（日薪 ${p.salary} 兩、分紅 ${Math.round(p.share * 100)}%）。到總號帳簿裡指派他管哪家店${p.rank === 2 ? '或哪座城' : ''}。`);
}

/** 夥計提拔成掌櫃的起點：看長處 */
const RISE_STATS: Record<string, { talent: number; loyalty: number }> = { 老實: { talent: 3, loyalty: 85 }, 機靈: { talent: 5, loyalty: 60 }, 嘴甜: { talent: 4, loyalty: 65 }, 勤快: { talent: 4, loyalty: 75 } };

/** 店裡夠資格提拔的夥計 */
export function risers() {
  const w = st().world;
  return Object.entries(shopsOf(w)).flatMap(([id, s]) =>
    s.staff.filter((n) => w.day - (s.staffInfo?.[n]?.since ?? s.opened) >= RISE.days && moraleOf(s, n) >= RISE.morale).map((n) => ({ shop: id, name: n })),
  );
}

export function promoteStaff(shop: string, name: string): Result {
  const d = staffDef(name);
  const base = RISE_STATS[d.trait];
  // 老周本來就做過掌櫃
  const talent = name === '老周' ? 6 : base.talent;
  const day = st().world.day;
  update(shop, (x) => dropStaff(x, name));
  updateBiz((b) =>
    b.managers.push({ id: `m${day}_${b.managers.length}`, name, talent, loyalty: base.loyalty + 5, exp: 0, rank: 1, shop, salary: d.wage + 2, share: 0.05, since: day, skim: 0, desc: `從夥計提拔上來的掌櫃。${d.desc}` }),
  );
  return ok(`${name}升做掌櫃，管這家店（日薪 ${d.wage + 2} 兩、分紅 5%）。店裡空出一個夥計的位子。`);
}

/** 指派：掌櫃管一家店，大掌櫃可以管一家店或一整座城 */
export function assignManager(id: string, to: { shop?: string; town?: string }): Result {
  const m = managerById(id)!;
  if (to.town && m.rank !== 2) return no('只有大掌櫃管得了一整座城。');
  updateBiz((b) => {
    // 原本管這家店（或這座城）的人先卸下
    for (const x of b.managers) {
      if (to.shop && x.shop === to.shop) delete x.shop;
      if (to.town && x.town === to.town) delete x.town;
    }
    const me = b.managers.find((x) => x.id === id)!;
    delete me.shop;
    delete me.town;
    Object.assign(me, to);
  });
  return ok(`${m.name}接手了。`);
}

export function unassignManager(id: string): Result {
  updateManager(id, (m) => {
    delete m.shop;
    delete m.town;
  });
  return ok('卸下了差事，先在總號候著。');
}

export function promoteManager(id: string): Result {
  const m = managerById(id)!;
  if (m.rank === 2) return no('已經是大掌櫃了。');
  if (m.talent < PROMOTE.talent || m.exp < PROMOTE.exp) return no(`才幹要 ${PROMOTE.talent}、經驗要 ${PROMOTE.exp} 才升得了大掌櫃（現在 ${m.talent}、${Math.floor(m.exp)}）。`);
  updateManager(id, (x) => {
    x.rank = 2;
    x.salary += 4;
    x.loyalty = Math.min(100, x.loyalty + 10);
  });
  return ok(`${m.name}升為大掌櫃（日薪加四兩）！可以把一整座城交給他了。`);
}

export function raiseManager(id: string): Result {
  updateManager(id, (m) => {
    m.salary += 1;
    m.loyalty = Math.min(100, m.loyalty + 6);
  });
  return ok(`${managerById(id)!.name}的日薪加到 ${managerById(id)!.salary} 兩。`);
}

export const SHARES = [0.03, 0.05, 0.08, 0.1, 0.15] as const;
export function setShare(id: string, share: number): Result {
  const m = managerById(id)!;
  const up = share > m.share;
  updateManager(id, (x) => {
    x.share = share;
    x.loyalty = Math.max(0, Math.min(100, x.loyalty + (up ? 5 : -10)));
  });
  return ok(up ? `分紅調高到 ${Math.round(share * 100)}%，${m.name}很是感激。` : `分紅降到 ${Math.round(share * 100)}%，${m.name}臉色有點難看。`);
}

export function tipManager(id: string): Result {
  const m = managerById(id)!;
  const day = st().world.day;
  if (m.tipDay !== undefined && day - m.tipDay < TIP.every) return no('前幾天才賞過。');
  if (st().hero.silver < TIP.silver) return no(`要 ${TIP.silver} 兩，身上不夠。`);
  st().updateHero((h) => (h.silver -= TIP.silver));
  updateManager(id, (x) => {
    x.tipDay = day;
    x.loyalty = Math.min(100, x.loyalty + TIP.loyalty);
  });
  return ok(`賞了${m.name} ${TIP.silver} 兩。`);
}

/** 查帳：看出這段時間吞了多少；追回一半（忠誠 -15） */
export function audit(id: string): Result {
  const m = managerById(id)!;
  if (m.skim <= 0) {
    updateManager(id, (x) => (x.loyalty = Math.min(100, x.loyalty + 3)));
    return ok(`帳目清清楚楚，${m.name}一文錢也沒短少。（被信任了，忠誠 +3）`);
  }
  const back = Math.round(m.skim / 2);
  updateManager(id, (x) => {
    x.skim = 0;
    x.loyalty = Math.max(0, x.loyalty - 15);
  });
  st().updateHero((h) => (h.silver += back));
  return ok(`帳上對不起來：${m.name}這段時間吞了約 ${back * 2} 兩！追回了 ${back} 兩。要不要留他，你自己斟酌。`);
}

export function fireManager(id: string): Result {
  const m = managerById(id)!;
  updateBiz((b) => (b.managers = b.managers.filter((x) => x.id !== id)));
  return ok(`${m.name}交出帳簿走了。`);
}

// ── 總號：方針、帳房 ────────────────────────────────────

export function setPolicy<K extends keyof Policy>(k: K, v: Policy[K]): Result {
  updateBiz((b) => (b.policy = { ...b.policy, [k]: v }));
  return ok('');
}

export function withdrawVault(): Result {
  const n = biz().vault;
  if (n <= 0) return no('帳房裡沒有錢。');
  updateBiz((b) => (b.vault = 0));
  st().updateHero((h) => (h.silver += n));
  return ok(`從總號帳房提了 ${n} 兩。`);
}

/** 補各店的虧空：把櫃上欠的錢從身上補齊（欠錢的店進不了貨） */
export function coverDebts(): Result {
  const debts = Object.entries(shopsOf(st().world)).filter(([, x]) => x.till < 0);
  const total = debts.reduce((a, [, x]) => a - x.till, 0);
  if (!total) return no('各店櫃上都沒欠錢。');
  if (st().hero.silver < total) return no(`各店共欠 ${total} 兩，身上不夠。`);
  st().updateHero((h) => (h.silver -= total));
  for (const [id] of debts) update(id, (x) => (x.till = 0));
  return ok(`補上了 ${debts.length} 家店的虧空，共 ${total} 兩。`);
}
