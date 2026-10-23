import { ITEMS } from '../character';
import { registerDailyTasks } from '../daily';
import type { World } from '../home';
import { propertyDef, propertyOf, rentDue, TENANT_DAYS, XUN } from '../property';
import { addMorale, dropStaff, hireStaff, managerOf, SHOP_LEVELS, shopPrice, shopsOf, shopTown, STAFF, type ShopState } from '../shop';
import { guardDef, newBiz, supplierDef, TERMS, TOWN_GUARDS, townName, townOfMap, type GuardSource, type Manager } from '../shop_manage';

/**
 * 掌櫃代管（4.23）：每天半夜（結算、擲完事件以後，story/shop.ts 呼叫 manageDaily）照總號的方針替東家做事，不必東家回去：
 * - 店裡的事：加薪、偷懶、地痞（付錢／報官／請保鏢）、大主顧（架上夠就接）、老饕（端架上最好的菜）。
 * - 缺人補人、照方針的年度加薪、櫃上留周轉金，其餘交回總號帳房。
 * - 大掌櫃也管那座城租出去的房子：屋漏（方針內的錢直接修）、手頭緊（寬限／催討／免了）、每旬收租交帳房。
 * - 供應商合約快到期就照原期限續約（從帳房付簽約費）。
 * - 掌櫃自己：經驗每天加（管幾家加幾點），每 60 點才幹 +1；薪水公道忠誠慢慢長，否則慢慢掉。
 * 做了什麼都記在那家店的帳本上（「掌櫃某某：……」）。
 */

const supplierName = (id: string) => supplierDef(id).name;

const note = (s: ShopState, text: string) => {
  const last = s.ledger[s.ledger.length - 1];
  if (last) last.trouble = last.trouble ? `${last.trouble}；${text}` : text;
};

function handleEvent(w: World, s: ShopState, id: string, m: Manager) {
  const e = s.event;
  if (!e || e.day > w.day) return;
  const p = w.biz!.policy;
  const who = `${m.rank === 2 ? '大掌櫃' : '掌櫃'}${m.name}`;
  if (e.kind === 'raise') {
    if (p.raise === 'agree') {
      s.raises = { ...s.raises, [e.staff!]: (s.raises?.[e.staff!] ?? 0) + 1 };
      addMorale(s, e.staff!, 20, w.day);
      note(s, `${who}答應給${e.staff}加薪一兩`);
    } else if (Math.random() < 0.5) {
      dropStaff(s, e.staff!);
      note(s, `${who}沒答應加薪，${e.staff}辭工走了`);
    } else {
      addMorale(s, e.staff!, -15, w.day);
      note(s, `${who}沒答應給${e.staff}加薪`);
    }
  } else if (e.kind === 'slack') {
    if (p.slack === 'fire') {
      dropStaff(s, e.staff!);
      note(s, `${who}查出${e.staff}偷懶，把人辭了`);
    } else if (p.slack === 'dock') {
      s.till += 10;
      addMorale(s, e.staff!, -15, w.day);
      note(s, `${who}查出${e.staff}偷懶，扣了十兩工錢`);
    } else {
      addMorale(s, e.staff!, -5, w.day);
      note(s, `${who}把偷懶的${e.staff}訓了一頓`);
    }
  } else if (e.kind === 'ruffian') {
    const town = shopTown(id);
    const here = TOWN_GUARDS[townName(town)] ?? [];
    const want = p.ruffian as GuardSource | 'pay' | 'report';
    if (want === 'pay') {
      s.till -= 20;
      s.safeUntil = w.day + 10;
      note(s, `${who}照方針給了蔡三二十兩保護費`);
    } else if (want !== 'report' && here.includes(want) && !s.guard) {
      const g = guardDef(want);
      const used = new Set(Object.values(shopsOf(w)).map((x) => x.guard?.name));
      s.guard = { source: want, name: g.names.find((n) => !used.has(n)) ?? g.names[0], since: w.day };
      s.safeUntil = w.day + 10;
      note(s, `${who}請了${g.from}的${g.title}${s.guard.name}來坐鎮，蔡三見了就跑`);
    } else {
      s.till -= 5;
      s.safeUntil = w.day + 10;
      note(s, `${who}派人報官，捕快把蔡三趕走了`);
    }
  } else if (e.kind === 'patron') {
    const have = s.stock[e.item!] ?? 0;
    if (p.patron === 'accept' && have >= e.n!) {
      const pay = Math.round(shopPrice(s, e.item!) * 1.5) * e.n!;
      s.stock[e.item!] -= e.n!;
      if (!s.stock[e.item!]) delete s.stock[e.item!];
      s.till += pay;
      note(s, `${who}把${ITEMS[e.item!].name}×${e.n}送到周府，收了 ${pay} 兩`);
    } else if (p.patron === 'decline' || w.day > e.until!) {
      note(s, `${who}回了周府的訂單`);
    } else return; // 貨還不夠，等到期限前看看
  } else if (e.kind === 'critic') {
    const dishes = Object.keys(s.stock).filter((k) => ITEMS[k]?.dish);
    const k = dishes.sort((a, b) => (b.endsWith('_3') ? 3 : b.endsWith('_2') ? 2 : 1) - (a.endsWith('_3') ? 3 : a.endsWith('_2') ? 2 : 1))[0];
    if (k) {
      const q = k.endsWith('_3') ? 3 : k.endsWith('_2') ? 2 : 1;
      s.stock[k] -= 1;
      if (!s.stock[k]) delete s.stock[k];
      s.buzz = q === 3 ? { until: w.day + 5, mult: 1.25 } : q === 2 ? { until: w.day + 4, mult: 1.1 } : { until: w.day + 3, mult: 0.9 };
      note(s, `${who}端了${ITEMS[k].name}給老饕郝一嚐，${q === 3 ? '大受稱讚' : q === 2 ? '還算滿意' : '他搖搖頭走了'}`);
    } else note(s, `${who}沒有菜可端，老饕郝一嚐走了`);
  }
  delete s.event;
}

function hireIfShort(w: World, s: ShopState, m: Manager) {
  const max = SHOP_LEVELS[s.level - 1].staff;
  if (!w.biz!.policy.hire || s.staff.length >= max) return;
  const hired = new Set(Object.values(shopsOf(w)).flatMap((x) => x.staff));
  const pick = STAFF.find((x) => !hired.has(x.name));
  if (!pick) return;
  hireStaff(s, pick.name, w.day);
  note(s, `${m.rank === 2 ? '大掌櫃' : '掌櫃'}${m.name}從牙行雇了${pick.name}`);
}

/** 大掌櫃管的城：租出去的房子 */
function manageHouses(w: World, m: Manager) {
  const pm = propertyOf(w);
  const p = w.biz!.policy;
  for (const [id, o] of Object.entries(pm.owned)) {
    const def = propertyDef(id);
    if (!def || townOfMap(def.map) !== m.town) continue;
    const e = o.event;
    if (e?.kind === 'leak') {
      const cost = Math.max(8, Math.round(def.rent * 0.6));
      if (cost <= p.repair && w.biz!.vault >= cost) {
        w.biz!.vault -= cost;
        delete o.event;
      }
    } else if (e?.kind === 'late') {
      if (p.late === 'grace') o.event = { kind: 'gift', day: w.day };
      else if (p.late === 'forgive') {
        o.rentPaidTo = (o.rentPaidTo ?? (o.rentFrom ?? w.day) + TENANT_DAYS) + XUN;
        delete o.event;
      } else {
        w.biz!.vault += Math.round(def.rent / 2);
        delete o.event;
        if (Math.random() < 0.3) o.rentFrom = w.day;
      }
    } else if (e?.kind === 'gift') delete o.event; // 送的東西大掌櫃收下，放在帳房（不計）
    // 收租交帳房
    const d = rentDue(def, o, w.day);
    if (d.xun && def.kind !== 'business') {
      w.biz!.vault += d.silver;
      o.rentPaidTo = (o.rentPaidTo ?? o.rentFrom! + TENANT_DAYS) + d.xun * XUN;
    }
  }
}

export function manageDaily(w: World) {
  const b = (w.biz ??= newBiz());
  if (!b.managers.length) return;
  const p = b.policy;
  for (const [id, s] of Object.entries(shopsOf(w))) {
    const m = managerOf(w, id);
    if (!m) continue;
    handleEvent(w, s, id, m);
    hireIfShort(w, s, m);
    // 年度加薪照方針（shop_events 那邊照 s.yearly 加）
    s.yearly = p.yearly;
    // 櫃上留周轉金，多的交帳房，不夠由帳房補
    if (s.till > p.float) {
      b.vault += s.till - p.float;
      s.till = p.float;
    } else if (s.till < 0 && b.vault > 0) {
      const n = Math.min(b.vault, -s.till);
      b.vault -= n;
      s.till += n;
    }
  }
  for (const m of b.managers) {
    const n = Object.keys(shopsOf(w)).filter((k) => managerOf(w, k) === m).length;
    if (m.rank === 2 && m.town) manageHouses(w, m);
    if (!n && !(m.rank === 2 && m.town)) continue;
    // 經驗與才幹
    const before = Math.floor(m.exp / 60);
    m.exp += Math.max(1, n);
    if (Math.floor(m.exp / 60) > before && m.talent < 10) m.talent += 1;
    // 忠誠：薪水公道就慢慢長
    const fair = m.salary >= m.talent + 2 || m.share >= 0.1;
    m.loyalty = Math.max(0, Math.min(100, m.loyalty + (fair ? 0.2 : -0.3)));
  }
  // 合約快到期：照原期限續約，簽約費從帳房付
  if (p.renew)
    for (const c of Object.values(b.contracts)) {
      if (c.until > w.day + 1) continue;
      const t = TERMS.find((x) => x.id === c.term)!;
      if (b.vault < t.fee) continue;
      b.vault -= t.fee;
      c.until = Math.max(c.until, w.day) + t.days;
    }
}

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  const b = world.biz;
  if (!b) return [];
  const out: { text: string; state: 'todo'; note?: string }[] = [];
  if (b.vault >= 50) out.push({ text: `總號帳房有 ${b.vault} 兩可提`, state: 'todo', note: '自己的任何一家店的櫃台' });
  for (const [sup, c] of Object.entries(b.contracts)) {
    const left = c.until - world.day;
    if (left < 0 || left > 3 || (b.policy.renew && b.managers.length)) continue;
    out.push({ text: `${supplierName(sup)}的供貨合約${left ? `${left} 天後` : '今天'}到期`, state: 'todo', note: '總號帳簿的「供應商」可以續約' });
  }
  return out;
});
