import { useEffect, useRef, useState } from 'react';
import { itemIconUrl } from '../game/art/items';
import { ITEMS } from '../game/character';
import { LOCATION, managerOf, sourcesOf, PRICE_TIERS, SHOP_LEVELS, shopTypeDef, staffDef, wageOf, avgMorale, moraleOf, dailyFixed, shopPrice, type ShopState } from '../game/shop';
import { BONUS, costOf, guardDef, SUPPLY_MAX, YEARLY, type DayStat, type MonthStat } from '../game/shop_manage';
import * as admin from '../game/shop_admin';
import { dateOf, dateText } from '../game/time';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 經營管理（店裡櫃台的「經營管理」）：一本帳簿，上緣五個書籤——
 * 總覽（櫃上、近三十天盈虧、定價）、帳目（每日／每月長條圖，←→ 看某一天）、人事（士氣、加薪、雇人、紅包、年度加薪）、
 * 進貨（自己供貨或批貨，每樣補到幾件）、保鏢（當地的官府、鏢局、幫會、武館）。
 * Tab／[ ] 換書籤，↑↓ 選列，←→ 調數值，E 確定，X 返回（小選單開著時先關小選單）。
 */

const TABS = ['總覽', '帳目', '人事', '進貨', '保鏢'] as const;

export type Row = { key: string; label: React.ReactNode; value?: React.ReactNode; adjust?: (d: number) => void; act?: () => void; dim?: boolean; note?: string };
export type Sub = { title: string; options: { label: string; note?: string; act: () => void; dim?: boolean }[] };

const sum = (xs: DayStat[], f: (d: DayStat) => number) => xs.reduce((a, d) => a + f(d), 0);
const MONTH_NAMES = ['正月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '臘月'];

export function ShopManager() {
  const panel = useGame((s) => s.panel);
  const world = useGame((s) => s.world);
  const hero = useGame((s) => s.hero);
  const open = panel?.kind === 'shopManage';
  const id = open ? panel.id : '';
  const s: ShopState | undefined = open ? world.shops?.[id] : undefined;
  const [tab, setTab] = useState(0);
  const [row, setRow] = useState(0);
  const [sub, setSub] = useState<Sub | null>(null);
  const [subRow, setSubRow] = useState(0);
  const [view, setView] = useState<'day' | 'month'>('day');
  const [bar, setBar] = useState(-1);
  const [msg, setMsg] = useState('');
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open) {
      setTab(0);
      setRow(0);
      setSub(null);
      setMsg('');
      setBar(-1);
    }
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [row, tab]);

  const say = (r: admin.Result) => r.msg && setMsg(r.msg);

  // ── 每一頁的列 ──
  const rows: Row[] = [];
  const days = s?.days ?? [];
  const recent = days.slice(-30);
  const months: MonthStat[] = s ? Object.entries(s.months ?? {}).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([, m]) => m) : [];
  if (s && tab === 0) {
    rows.push({ key: 'price', label: '定價', value: PRICE_TIERS[s.price].name, adjust: (d) => say(admin.setPrice(id, s.price + d)), note: '便宜：賣價九成、客人多兩成；高價：賣價一成一、客人少三成五。客人身上的錢有限，太貴的東西會嫌貴不買。' });
  }
  if (s && tab === 2) {
    const max = SHOP_LEVELS[s.level - 1].staff;
    for (const n of s.staff) {
      const m = moraleOf(s, n);
      rows.push({
        key: `staff:${n}`,
        label: (
          <>
            {n}
            <small className="biz-trait">{staffDef(n).trait}</small>
          </>
        ),
        value: (
          <span className="biz-staff">
            <span className="biz-wage">一天 {wageOf(s, n)} 兩</span>
            <span className={`biz-morale ${m < 30 ? 'low' : m >= 75 ? 'high' : ''}`}>
              <i style={{ width: `${m}%` }} />
            </span>
          </span>
        ),
        note: `${staffDef(n).desc}\n到職 ${world.day - (s.staffInfo?.[n]?.since ?? s.opened)} 天，士氣 ${m}。${m < 30 ? '（士氣太低，常鬧事，低於 20 隨時會走）' : m >= 75 ? '（幹勁十足）' : ''}`,
        act: () =>
          setSub({
            title: n,
            options: [
              { label: `加薪一兩（一天 ${wageOf(s, n) + 1} 兩，士氣 +20）`, act: () => say(admin.raiseWage(id, n)) },
              { label: `辭退${n}`, act: () => say(admin.fire(id, n)) },
            ],
          }),
      });
    }
    const pool = admin.hirePool();
    rows.push({
      key: 'hire',
      label: `雇人（${s.staff.length}/${max}）`,
      dim: s.staff.length >= max,
      note: s.staff.length >= max ? `${SHOP_LEVELS[s.level - 1].name}最多雇 ${max} 個；擴店才能多雇。` : `牙行介紹的人：${pool.length ? pool.map((x) => x.name).join('、') : '都被雇走了'}。`,
      act: () =>
        s.staff.length < max &&
        setSub({ title: '牙行介紹的人', options: pool.map((x) => ({ label: `${x.name}（${x.trait}，一天 ${x.wage} 兩）`, note: x.desc, act: () => say(admin.hire(id, x.name)) })) }),
    });
    rows.push({
      key: 'bonus',
      label: '發紅包',
      value: `每人 ${BONUS.silver} 兩`,
      note: `每人發 ${BONUS.silver} 兩，士氣 +${BONUS.morale}。隔 ${BONUS.every} 天才能再發。${s.bonusDay !== undefined ? `上次是${dateText(s.bonusDay)}。` : ''}`,
      act: () => say(admin.bonus(id)),
    });
    rows.push({
      key: 'yearly',
      label: '年度加薪',
      value: s.yearly ? `每年 +${s.yearly} 兩` : '不加',
      adjust: (d) => say(admin.setYearly(id, YEARLY.indexOf((s.yearly ?? 0) as 0 | 1 | 2) + d)),
      note: '每年正月初一給每個夥計加薪：加一兩士氣 +10、兩兩 +20；不加的話士氣 -5。',
    });
  }
  const supplyList = s ? sourcesOf(world, id, hero) : [];
  if (s && tab === 3) {
    const order = s.supply?.mode === 'order';
    rows.push({
      key: 'mode',
      label: '進貨方式',
      value: order ? '批貨' : '自己供貨',
      adjust: () => say(admin.setSupplyMode(id, order ? 'self' : 'order')),
      act: () => say(admin.setSupplyMode(id, order ? 'self' : 'order')),
      note: order
        ? supplyList.length
          ? '每天半夜照「補到」的數量，向簽了約的供應商進貨（每樣自動挑最便宜的那家），本錢從櫃上扣（櫃上沒錢最多賒到一百兩）。'
          : '還沒有供應商。要親自去找供應商談合約：臨江城的萬通牙行（錢六）、錦繡布莊、回春堂，或去過的其他地方。總號帳簿的「供應商」頁看得到各家。'
        : '自己做的菜、釣的魚、織的衣服，從行囊擺上架（櫃台的「上架」），不花本錢，但要常來補。',
    });
    for (const w of supplyList) {
      const t = s.supply?.targets[w.id] ?? 0;
      rows.push({
        key: `t:${w.id}`,
        label: (
          <>
            <img className="biz-icon" src={itemIconUrl(ITEMS[w.id].icon)} alt="" />
            {ITEMS[w.id].name}
          </>
        ),
        value: (
          <span className="biz-supply">
            <span>{w.from}</span>
            <span>批 {w.cost}</span>
            <span>賣 {shopPrice(s, w.id)}</span>
            <span>架上 {s.stock[w.id] ?? 0}</span>
            <b>補到 ◀ {t} ▶</b>
          </span>
        ),
        dim: !order,
        adjust: (d) => order && say(admin.setTarget(id, w.id, t + d * 2)),
        note: `${ITEMS[w.id].desc}\n${w.from === '自家廚房' ? '自家廚房照食譜做（食材向簽約的供應商進）' : `向${w.from}進貨`}，一件 ${w.cost} 兩、賣 ${shopPrice(s, w.id)} 兩。每天補到 ${t} 件（最多 ${SUPPLY_MAX}）。`,
      });
    }
  }
  const guards = s ? admin.guardOptions(id) : [];
  if (s && tab === 4) {
    for (const { def: g, available, town } of guards) {
      const here = s.guard?.source === g.id;
      rows.push({
        key: `g:${g.id}`,
        label: `${g.from}的${g.title}`,
        value: available ? (here ? `坐鎮中・一天 ${g.fee} 兩` : `一天 ${g.fee} 兩`) : `${town}沒有${g.from}`,
        dim: !available,
        note: `${g.desc}\n${guardEffect(g)}`,
        act: () => available && say(admin.hireGuard(id, g.id)),
      });
    }
    if (s.guard) rows.push({ key: 'dismiss', label: `辭退保鏢（${s.guard.name}）`, act: () => say(admin.dismissGuard(id)) });
  }

  const r = Math.min(row, Math.max(0, rows.length - 1));
  const cur = rows[r];
  const chart = view === 'day' ? recent : months;
  const barIdx = bar < 0 || bar >= chart.length ? chart.length - 1 : bar;

  const switchTab = (d: number) => {
    setTab((t) => (t + d + TABS.length) % TABS.length);
    setRow(0);
    setMsg('');
  };

  useKeys(open, (k, e) => {
    if (sub) {
      const n = sub.options.length;
      if (isCancel(k)) return setSub(null);
      if (!n) return;
      if (isUp(k)) setSubRow((x) => (x + n - 1) % n);
      else if (isDown(k)) setSubRow((x) => (x + 1) % n);
      else if (isConfirm(k)) {
        sub.options[subRow]?.act();
        setSub(null);
        setSubRow(0);
      }
      return;
    }
    if (isCancel(k)) return useGame.getState().closePanel();
    if (k === 'Tab' || k === ']' || k === '[') {
      e.preventDefault();
      return switchTab(k === '[' || (k === 'Tab' && e.shiftKey) ? -1 : 1);
    }
    if (/^[1-5]$/.test(k)) return (setTab(Number(k) - 1), setRow(0));
    if (tab === 1) {
      if (isUp(k) || isDown(k)) return (setView((v) => (v === 'day' ? 'month' : 'day')), setBar(-1));
      if (isLeft(k)) return setBar(Math.max(0, barIdx - 1));
      if (isRight(k)) return setBar(Math.min(chart.length - 1, barIdx + 1));
      return;
    }
    const n = rows.length;
    if (!n) return;
    if (isUp(k)) setRow((x) => (Math.min(x, n - 1) + n - 1) % n);
    else if (isDown(k)) setRow((x) => (Math.min(x, n - 1) + 1) % n);
    else if ((isLeft(k) || isRight(k)) && cur?.adjust) cur.adjust(isLeft(k) ? -1 : 1);
    else if (isConfirm(k) && cur?.act && !cur.dim) {
      setSubRow(0);
      cur.act();
    }
  });

  if (!open || !s) return null;
  const t = shopTypeDef(s.type);
  const lv = SHOP_LEVELS[s.level - 1];
  const income30 = sum(recent, (d) => d.income);
  const cost30 = sum(recent, costOf);
  const goods = Object.values(s.stock).reduce((a, n) => a + n, 0);

  return (
    <div className="menu-backdrop">
      <div className="biz">
        <div className="biz-head">
          <span className="biz-name">{s.name}</span>
          <span className="biz-sub">
            {t.name}・{lv.name}・{dateText(world.day)}
          </span>
          <span className="biz-till">櫃上 {s.till} 兩</span>
        </div>
        <ul className="biz-tabs">
          {TABS.map((x, i) => (
            <li key={x} className={i === tab ? 'active' : ''} onClick={() => (setTab(i), setRow(0))}>
              {x}
            </li>
          ))}
        </ul>
        <div className="biz-page">
          {tab === 0 && (
            <div className="biz-overview">
              <div className="biz-cards">
                <Card label="近三十天進帳" value={income30} unit="兩" />
                <Card label="近三十天開銷" value={cost30} unit="兩" red />
                <Card label="近三十天盈餘" value={income30 - cost30} unit="兩" red={income30 - cost30 < 0} big />
                <Card label="平均每天客人" value={recent.length ? Math.round(sum(recent, (d) => d.customers) / recent.length) : 0} unit="位" />
                <Card label="每天固定開銷" value={dailyFixed(s)} unit="兩" note="工錢＋保鏢" />
                <Card label="架上的貨" value={goods} unit="件" note={`${Object.keys(s.stock).length}/${lv.slots} 種`} />
              </div>
              <div className="biz-facts">
                <p>夥計 {s.staff.length}/{lv.staff} 人，平均士氣 {Math.round(avgMorale(s))}</p>
                <p>保鏢：{s.guard ? `${guardDef(s.guard.source).from}的${guardDef(s.guard.source).title}${s.guard.name}` : '沒請'}</p>
                <p>進貨：{s.supply?.mode === 'order' ? `批貨（${Object.keys(s.supply.targets).length} 樣）` : '自己供貨'}</p>
                <p>掌櫃：{managerOf(world, id) ? `${managerOf(world, id)!.rank === 2 ? '大掌櫃' : '掌櫃'}${managerOf(world, id)!.name}代管` : '東家自己管'}</p>
                <p>地段：{(LOCATION[id] ?? 1) >= 1.15 ? '熱鬧' : (LOCATION[id] ?? 1) >= 1.05 ? '不錯' : '普通'}（客人 ×{LOCATION[id] ?? 1}）</p>
                {s.buzz && s.buzz.until >= world.day && <p>口碑：{s.buzz.mult > 1 ? '老饕誇過，客人變多' : '老饕嫌過，客人變少'}（到{dateText(s.buzz.until)}）</p>}
              </div>
              <RowList rows={rows} r={r} listRef={listRef} onPick={setRow} />
            </div>
          )}
          {tab === 1 && <Chart view={view} data={chart} idx={barIdx} onPick={setBar} onView={setView} />}
          {tab >= 2 && (
            <div className="biz-split">
              <RowList rows={rows} r={r} listRef={listRef} onPick={setRow} />
              <div className="biz-note">
                {tab === 2 && <p className="biz-note-head">平均士氣 {Math.round(avgMorale(s))}・工錢一天共 {s.staff.reduce((a, n) => a + wageOf(s, n), 0)} 兩</p>}
                {tab === 3 && s.supply?.mode === 'order' && (
                  <p className="biz-note-head">
                    每天最多花 {supplyList.reduce((a, w) => a + w.cost * (s.supply?.targets[w.id] ?? 0), 0)} 兩補貨（實際看賣掉多少）
                  </p>
                )}
                {tab === 4 && <p className="biz-note-head">{s.guard ? `坐鎮：${guardDef(s.guard.source).title}${s.guard.name}（${dateText(s.guard.since)}起）` : '目前沒有保鏢坐鎮。'}</p>}
                {cur?.note?.split('\n').map((x, i) => <p key={i}>{x}</p>)}
              </div>
            </div>
          )}
        </div>
        {sub && (
          <div className="biz-sub-menu">
            <div className="biz-sub-title">{sub.title}</div>
            <ul>
              {sub.options.map((o, i) => (
                <li key={o.label} className={i === subRow ? 'active' : ''} onClick={() => (o.act(), setSub(null))}>
                  {o.label}
                  {o.note && i === subRow && <small>{o.note}</small>}
                </li>
              ))}
              {!sub.options.length && <li className="dim">（沒有人選）</li>}
            </ul>
          </div>
        )}
        <p className="biz-msg">{msg}</p>
        <p className="biz-help">{tab === 1 ? '↑↓ 切換每日／每月　←→ 看某一天　Tab 換頁　X 離開' : 'Tab／[ ] 換頁　↑↓ 選　←→ 調整　E 確定　X 離開'}</p>
      </div>
    </div>
  );
}

/** 保鏢的本事，用白話說 */
function guardEffect(g: { ruffian: number; thief: number; draw: number }) {
  const r = g.ruffian === 0 ? '地痞不敢上門' : g.ruffian <= 0.3 ? '地痞很少上門，來了也當場打發' : '地痞少來一些';
  const t = g.thief <= 0.1 ? '小偷不敢打主意' : g.thief <= 0.3 ? '小偷少來七成' : '小偷少來一半';
  const d = g.draw > 1 ? `客人安心，多${Math.round((g.draw - 1) * 100)}%` : g.draw < 1 ? `有些客人看了發毛，少${Math.round((1 - g.draw) * 100)}%` : '客人照常';
  return `${r}；${t}；${d}。`;
}

export function Card({ label, value, unit, note, red, big }: { label: string; value: number; unit: string; note?: string; red?: boolean; big?: boolean }) {
  return (
    <div className={`biz-card ${red ? 'red' : ''} ${big ? 'big' : ''}`}>
      <span className="biz-card-label">{label}</span>
      <b>
        {value}
        <small>{unit}</small>
      </b>
      {note && <span className="biz-card-note">{note}</span>}
    </div>
  );
}

export function RowList({ rows, r, listRef, onPick }: { rows: Row[]; r: number; listRef: React.RefObject<HTMLUListElement>; onPick: (i: number) => void }) {
  return (
    <ul className="biz-rows" ref={listRef}>
      {rows.map((x, i) => (
        <li key={x.key} className={`${i === r ? 'active' : ''} ${x.dim ? 'dim' : ''}`} onClick={() => (i === r ? x.act?.() : onPick(i))}>
          <span className="biz-row-label">{x.label}</span>
          {x.value !== undefined && <span className="biz-row-value">{x.adjust && typeof x.value === 'string' ? `◀ ${x.value} ▶` : x.value}</span>}
        </li>
      ))}
    </ul>
  );
}

/** 長條圖：每天（近三十天）或每月（近十二個月）的進帳（金）與開銷（紅），選中的那根下面列細目 */
export function Chart({ view, data, idx, onPick, onView }: { view: 'day' | 'month'; data: (DayStat | MonthStat)[]; idx: number; onPick: (i: number) => void; onView: (v: 'day' | 'month') => void }) {
  const max = Math.max(10, ...data.map((d) => Math.max(d.income, costOf(d))));
  const pmax = Math.max(5, ...data.map((d) => Math.abs(d.income - costOf(d))));
  const cur = data[idx];
  const label = (d: DayStat | MonthStat) => ('day' in d ? dateText(d.day) : `${MONTH_NAMES[d.month]}`);
  const short = (d: DayStat | MonthStat, i: number) => ('day' in d ? (i % 5 === 0 || i === data.length - 1 ? `${dateOf(d.day).date}` : '') : MONTH_NAMES[d.month].replace('月', ''));
  return (
    <div className="biz-chart-wrap">
      <div className="biz-chart-tabs">
        <span className={view === 'day' ? 'active' : ''} onClick={() => onView('day')}>
          每日（近三十天）
        </span>
        <span className={view === 'month' ? 'active' : ''} onClick={() => onView('month')}>
          每月（近十二個月）
        </span>
        <span className="biz-legend">
          <i className="inc" />進帳 <i className="out" />開銷
        </span>
      </div>
      {data.length ? (
        <>
          <div className="biz-chart">
            {data.map((d, i) => (
              <div key={i} className={`biz-bar ${i === idx ? 'active' : ''} ${'closed' in d && d.closed ? 'closed' : ''}`} onClick={() => onPick(i)}>
                <div className="biz-bar-pair">
                  <i className="inc" style={{ height: `${(d.income / max) * 100}%` }} />
                  <i className="out" style={{ height: `${(costOf(d) / max) * 100}%` }} />
                </div>
                <span>{short(d, i)}</span>
              </div>
            ))}
          </div>
          {/* 盈虧：中線以上賺、以下賠 */}
          <div className="biz-profit">
            <span className="biz-profit-label">盈虧</span>
            {data.map((d, i) => {
              const p = d.income - costOf(d);
              const h = (Math.abs(p) / pmax) * 50;
              return (
                <div key={i} className={`biz-pbar ${i === idx ? 'active' : ''}`} onClick={() => onPick(i)}>
                  <i className={p >= 0 ? 'gain' : 'loss'} style={p >= 0 ? { bottom: '50%', height: `${h}%` } : { top: '50%', height: `${h}%` }} />
                </div>
              );
            })}
          </div>
          {cur && (
            <div className="biz-detail">
              <b>{label(cur)}</b>
              {'closed' in cur && cur.closed ? (
                <span>關門（沒人顧店）</span>
              ) : (
                <>
                  <span>客人 {cur.customers}</span>
                  {'sold' in cur && <span>賣出 {cur.sold}</span>}
                  <span>進帳 {cur.income}</span>
                </>
              )}
              <span className="red">工錢 {cur.wages}</span>
              <span className="red">稅 {cur.tax}</span>
              <span className="red">保鏢 {cur.guard}</span>
              <span className="red">進貨 {cur.supply}</span>
              <span className={cur.income - costOf(cur) < 0 ? 'red' : 'gain'}>盈餘 {cur.income - costOf(cur)}</span>
            </div>
          )}
        </>
      ) : (
        <p className="biz-empty">帳簿還是空的。開張以後每天半夜記一次帳。</p>
      )}
    </div>
  );
}
