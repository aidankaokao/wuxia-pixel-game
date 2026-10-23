import { useEffect, useRef, useState } from 'react';
import { managerOf, SHOP_LEVELS, shopTown, shopTypeDef, type ShopState } from '../game/shop';
import { costOf, DEFAULT_POLICY, PROMOTE, SUPPLIERS, TERMS, TOWNS, townName, type MonthStat, type Policy, type TermId } from '../game/shop_manage';
import * as admin from '../game/shop_admin';
import { dateText } from '../game/time';
import { useGame } from '../state/store';
import { Chart, RowList, type Row, type Sub } from './ShopManager';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 總號帳簿（任何一家自己的店櫃台都能打開）：管所有店、掌櫃、供應商、方針與帳房。
 * - 各店：每家店近三十天的盈虧、誰在管；E 打開那家店的帳簿。
 * - 掌櫃：指派管店／管城、升大掌櫃、加薪、分紅、打賞、查帳、辭退；提拔夠資格的夥計。找新掌櫃要親自去萬通牙行。
 * - 供應商：去過的地方有哪些供應商、合約到哪天；簽過的可以在這裡續約，沒簽過的要親自上門。
 * - 方針：交給掌櫃處理的事要怎麼辦（←→ 換選項）。
 * - 帳房：掌櫃交上來的錢（E 提領），所有店合起來的每月長條圖。
 */

const TABS = ['各店', '掌櫃', '供應商', '方針', '帳房'] as const;

/** 方針的每一列：名稱、選項（值與顯示）、說明 */
const POLICY_ROWS: { key: keyof Policy; label: string; opts: [Policy[keyof Policy], string][]; note: string }[] = [
  { key: 'ruffian', label: '地痞上門', opts: [['report', '報官（五兩）'], ['pay', '付保護費（二十兩）'], ['yamen', '請衙役坐鎮'], ['escort', '請鏢師坐鎮'], ['gang', '請漕幫坐鎮']], note: '蔡三上門收保護費時，掌櫃怎麼辦。請保鏢的話，之後每天付保鏢的錢（當地請得到才請，請不到就報官）。' },
  { key: 'raise', label: '夥計要加薪', opts: [['agree', '答應'], ['refuse', '不答應']], note: '答應：每天多一兩、士氣 +20；不答應：一半機會走人，留下的士氣 -15。' },
  { key: 'slack', label: '夥計偷懶', opts: [['scold', '訓一頓'], ['dock', '扣十兩工錢'], ['fire', '辭退']], note: '帳對不上、夥計偷懶時的處置。' },
  { key: 'patron', label: '大主顧下訂', opts: [['accept', '架上夠就接'], ['decline', '一律回絕']], note: '周府的大訂單：架上的貨夠，掌櫃就送過去，照價多收五成。' },
  { key: 'hire', label: '缺人時補人', opts: [[true, '自己去牙行補'], [false, '等東家決定']], note: '夥計走了，掌櫃自己去牙行補人（照店的規模補滿）。' },
  { key: 'renew', label: '合約到期', opts: [[true, '自動續約'], [false, '等東家決定']], note: '供應商合約快到期時，照原本的期限續約，簽約費從帳房付。' },
  { key: 'yearly', label: '年度加薪', opts: [[0, '不加'], [1, '每年加一兩'], [2, '每年加兩兩']], note: '每年正月初一給掌櫃管的店裡每個夥計加薪。' },
  { key: 'repair', label: '租客屋漏', opts: [[0, '等東家決定'], [10, '十兩內直接修'], [20, '二十兩內直接修'], [40, '四十兩內直接修']], note: '大掌櫃管的城裡，租出去的房子漏雨時，修繕費在這個數以內就從帳房付錢修。' },
  { key: 'late', label: '租客交不出租', opts: [['grace', '寬限'], ['press', '催討一半'], ['forgive', '這旬免了']], note: '大掌櫃管的城裡，租客手頭緊時怎麼辦。' },
  { key: 'float', label: '櫃上周轉金', opts: [[50, '五十兩'], [100, '一百兩'], [200, '二百兩'], [400, '四百兩']], note: '掌櫃管的店，櫃上留這麼多錢周轉（進貨、工錢），多的每天交回總號帳房；不夠時從帳房補。' },
];

export function BizHQ() {
  const panel = useGame((s) => s.panel);
  const world = useGame((s) => s.world);
  const open = panel?.kind === 'bizHQ';
  const [tab, setTab] = useState(0);
  const [row, setRow] = useState(0);
  const [sub, setSub] = useState<Sub | null>(null);
  const [subRow, setSubRow] = useState(0);
  const [bar, setBar] = useState(-1);
  const [msg, setMsg] = useState('');
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (open) {
      setTab(0);
      setRow(0);
      setSub(null);
      setMsg('');
    }
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [row, tab]);

  const say = (r: admin.Result) => r.msg && setMsg(r.msg);
  const shops = Object.entries(world.shops ?? {}) as [string, ShopState][];
  const biz = world.biz;
  const policy = biz?.policy ?? DEFAULT_POLICY;
  const rows: Row[] = [];
  const profit30 = (s: ShopState) => (s.days ?? []).slice(-30).reduce((a, d) => a + d.income - costOf(d), 0);

  if (open && tab === 0) {
    for (const [id, s] of shops) {
      const m = managerOf(world, id);
      const p = profit30(s);
      rows.push({
        key: id,
        label: `${s.name}`,
        value: (
          <span className="biz-supply">
            <span>{townName(shopTown(id))}・{shopTypeDef(s.type).name}・{SHOP_LEVELS[s.level - 1].name}</span>
            <span>{m ? `${m.rank === 2 ? '大掌櫃' : '掌櫃'}${m.name}` : '自己管'}</span>
            <b className={p < 0 ? '' : 'gain'}>{p >= 0 ? '+' : ''}{p}</b>
          </span>
        ),
        note: `近三十天盈虧 ${p} 兩，櫃上 ${s.till} 兩。\n夥計 ${s.staff.length} 人${s.guard ? `，保鏢${s.guard.name}` : ''}，${s.supply?.mode === 'order' ? '批貨' : '自己供貨'}。\n按 E 打開這家店的帳簿。`,
        // 換成那家店的帳簿（沿用同一個面板的 close，關掉時腳本照常往下走）
        act: () => useGame.setState((g) => ({ panel: g.panel && { ...g.panel, kind: 'shopManage', id } })),
      });
    }
  }
  if (open && tab === 1) {
    for (const m of biz?.managers ?? []) {
      const scope = m.shop ? (world.shops?.[m.shop]?.name ?? '（店已收）') : m.town ? `${townName(m.town)}全城` : '候著';
      rows.push({
        key: m.id,
        label: (
          <>
            {m.name}
            <small className="biz-trait">{m.rank === 2 ? '大掌櫃' : '掌櫃'}</small>
          </>
        ),
        value: (
          <span className="biz-staff">
            <span className="biz-wage">{scope}</span>
            <span className="biz-wage">才幹 {m.talent}</span>
            <span className={`biz-morale ${m.loyalty < 40 ? 'low' : m.loyalty >= 75 ? 'high' : ''}`}>
              <i style={{ width: `${m.loyalty}%` }} />
            </span>
          </span>
        ),
        note: `${m.desc}\n管：${scope}。才幹 ${m.talent}、忠誠 ${Math.round(m.loyalty)}、經驗 ${Math.floor(m.exp)}${m.rank === 1 ? `（升大掌櫃要才幹 ${PROMOTE.talent}、經驗 ${PROMOTE.exp}）` : ''}。\n日薪 ${m.salary} 兩、分紅 ${Math.round(m.share * 100)}%。${m.loyalty < 40 ? '\n（忠誠偏低……帳上會不會有問題？）' : ''}`,
        act: () =>
          setSub({
            title: m.name,
            options: [
              {
                label: '指派管一家店',
                act: () =>
                  setTimeout(() =>
                    setSub({ title: `${m.name}管哪家店？`, options: shops.map(([id, s]) => ({ label: `${s.name}（${townName(shopTown(id))}）`, act: () => say(admin.assignManager(m.id, { shop: id })) })) }),
                  ),
              },
              ...(m.rank === 2
                ? [
                    {
                      label: '指派管一整座城',
                      act: () =>
                        setTimeout(() =>
                          setSub({
                            title: `${m.name}管哪座城？`,
                            options: [...new Set(shops.map(([id]) => shopTown(id)))].map((t) => ({ label: townName(t), act: () => say(admin.assignManager(m.id, { town: t })) })),
                          }),
                        ),
                    },
                  ]
                : [{ label: `升為大掌櫃（才幹 ${PROMOTE.talent}、經驗 ${PROMOTE.exp}）`, act: () => say(admin.promoteManager(m.id)) }]),
              { label: '卸下差事', act: () => say(admin.unassignManager(m.id)) },
              { label: `加薪一兩（日薪 ${m.salary + 1}）`, act: () => say(admin.raiseManager(m.id)) },
              {
                label: `調整分紅（現在 ${Math.round(m.share * 100)}%）`,
                act: () => setTimeout(() => setSub({ title: '分紅多少？', options: admin.SHARES.map((x) => ({ label: `${Math.round(x * 100)}%`, act: () => say(admin.setShare(m.id, x)) })) })),
              },
              { label: '打賞二十兩（忠誠 +10）', act: () => say(admin.tipManager(m.id)) },
              { label: '查帳', act: () => say(admin.audit(m.id)) },
              { label: `辭退${m.name}`, act: () => say(admin.fireManager(m.id)) },
            ],
          }),
      });
    }
    const rs = admin.risers();
    rows.push({
      key: 'rise',
      label: `提拔夥計當掌櫃（${rs.length} 人夠資格）`,
      dim: !rs.length,
      note: '到職三十天以上、士氣七十以上的夥計，可以提拔成掌櫃（就管他原本那家店）。從夥計升上來的掌櫃忠誠高、才幹看長處，做久了會長。',
      act: () => rs.length && setSub({ title: '提拔誰？', options: rs.map((x) => ({ label: `${x.name}（${world.shops?.[x.shop]?.name}）`, act: () => say(admin.promoteStaff(x.shop, x.name)) })) }),
    });
    rows.push({ key: 'find', label: '找新掌櫃', dim: true, note: '要找有經驗的掌櫃，親自去臨江城北的萬通牙行找錢六。' });
  }
  if (open && tab === 2) {
    const visited = biz?.visited ?? [];
    for (const t of TOWNS.filter((x) => visited.includes(x.id))) {
      for (const sup of SUPPLIERS.filter((x) => x.town === t.id)) {
        const c = biz?.contracts[sup.id];
        const active = c && c.until >= world.day;
        const branch = shops.some(([id]) => shopTown(id) === t.id);
        const signed = biz?.signed.includes(sup.id);
        rows.push({
          key: sup.id,
          label: `${t.name}・${sup.name}`,
          value: active ? `合約到${dateText(c!.until)}` : branch ? '分號就地採辦' : signed ? '合約已到期' : '還沒談',
          dim: !active && !branch && !signed,
          note: `${sup.desc}\n找${sup.contact}（${sup.where}）。進價約行情 ${Math.round(sup.ratio * 100)}%${sup.freight ? `、每件運費 ${sup.freight} 兩` : ''}。${
            active ? '' : branch ? `\n你在${t.name}有店，由分號就地採辦，不必簽約（進價貴五分）。` : signed ? '\n簽過約，按 E 可以直接續約。' : '\n要親自上門談才簽得了約。'
          }`,
          act: () =>
            (signed || active) &&
            setSub({ title: `跟${sup.name}續約`, options: TERMS.map((x) => ({ label: `${x.name}（簽約費 ${x.fee} 兩${x.disc ? `，再讓 ${Math.round(x.disc * 100)}%` : ''}）`, act: () => say(admin.signContract(sup.id, x.id as TermId)) })) }),
        });
      }
    }
    const left = TOWNS.filter((x) => !visited.includes(x.id)).length;
    if (left) rows.push({ key: 'more', label: `還有 ${left} 個地方沒去過`, dim: true, note: '去過的地方越多，認識的供應商越多，就有機會壓低進價。' });
  }
  if (open && tab === 3) {
    for (const r of POLICY_ROWS) {
      const i = Math.max(0, r.opts.findIndex(([v]) => v === policy[r.key]));
      rows.push({
        key: r.key,
        label: r.label,
        value: r.opts[i][1],
        note: r.note,
        adjust: (d) => say(admin.setPolicy(r.key, r.opts[(i + d + r.opts.length) % r.opts.length][0] as never)),
      });
    }
  }
  if (open && tab === 4) {
    rows.push({ key: 'vault', label: `總號帳房：${biz?.vault ?? 0} 兩`, value: '提領', note: '掌櫃管的店，櫃上多的錢與收來的房租都交到這裡。按 E 提領。', act: () => say(admin.withdrawVault()) });
    const debt = shops.reduce((a, [, x]) => a + Math.max(0, -x.till), 0);
    rows.push({ key: 'debt', label: `補各店的虧空：${debt} 兩`, value: debt ? '撥款' : '沒欠', dim: !debt, note: '櫃上欠錢的店，供應商不肯再賒，就進不了貨、做不了生意。從身上撥款補齊。', act: () => say(admin.coverDebts()) });
  }
  // 帳房：所有店合起來的每月帳
  const months: MonthStat[] = [];
  for (const [, s] of shops)
    for (const m of Object.values(s.months ?? {})) {
      const x = months.find((y) => y.year === m.year && y.month === m.month);
      if (x) for (const k of ['days', 'customers', 'income', 'wages', 'tax', 'guard', 'supply', 'mgr'] as const) (x as unknown as Record<string, number>)[k] = ((x as unknown as Record<string, number>)[k] ?? 0) + (m[k] ?? 0);
      else months.push({ ...m });
    }
  months.sort((a, b) => a.year - b.year || a.month - b.month);
  const recentMonths = months.slice(-12);
  const barIdx = bar < 0 || bar >= recentMonths.length ? recentMonths.length - 1 : bar;

  const r = Math.min(row, Math.max(0, rows.length - 1));
  const cur = rows[r];
  useKeys(open, (k, e) => {
    if (sub) {
      const n = sub.options.length;
      if (isCancel(k)) return setSub(null);
      if (!n) return;
      if (isUp(k)) setSubRow((x) => (x + n - 1) % n);
      else if (isDown(k)) setSubRow((x) => (x + 1) % n);
      else if (isConfirm(k)) {
        const o = sub.options[subRow];
        setSub(null);
        setSubRow(0);
        o?.act();
      }
      return;
    }
    if (isCancel(k)) return useGame.getState().closePanel();
    if (k === 'Tab' || k === ']' || k === '[') {
      e.preventDefault();
      setTab((t) => (t + (k === '[' || (k === 'Tab' && e.shiftKey) ? -1 : 1) + TABS.length) % TABS.length);
      setRow(0);
      setMsg('');
      return;
    }
    if (/^[1-5]$/.test(k)) return (setTab(Number(k) - 1), setRow(0));
    if (tab === 4 && (isLeft(k) || isRight(k))) return setBar(Math.max(0, Math.min(recentMonths.length - 1, barIdx + (isLeft(k) ? -1 : 1))));
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

  if (!open) return null;
  const total30 = shops.reduce((a, [, s]) => a + profit30(s), 0);
  return (
    <div className="menu-backdrop">
      <div className="biz">
        <div className="biz-head">
          <span className="biz-name">總號帳簿</span>
          <span className="biz-sub">
            {shops.length} 家店・{biz?.managers.length ?? 0} 位掌櫃・{dateText(world.day)}
          </span>
          <span className="biz-till">
            帳房 {biz?.vault ?? 0} 兩・近三十天 {total30 >= 0 ? '+' : ''}
            {total30}
          </span>
        </div>
        <ul className="biz-tabs">
          {TABS.map((x, i) => (
            <li key={x} className={i === tab ? 'active' : ''} onClick={() => (setTab(i), setRow(0))}>
              {x}
            </li>
          ))}
        </ul>
        <div className="biz-page">
          {tab === 4 ? (
            <div className="biz-vault">
              <RowList rows={rows} r={r} listRef={listRef} onPick={setRow} />
              <Chart view="month" data={recentMonths} idx={barIdx} onPick={setBar} onView={() => undefined} />
            </div>
          ) : (
            <div className="biz-split">
              <RowList rows={rows} r={r} listRef={listRef} onPick={setRow} />
              <div className="biz-note">
                {tab === 3 && <p className="biz-note-head">掌櫃照這些方針處理店裡的事，不必東家回去。</p>}
                {!rows.length && <p>{tab === 0 ? '還沒有店。' : tab === 1 ? '還沒有掌櫃。' : '還沒有去過有供應商的地方。'}</p>}
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
                <li key={o.label} className={i === subRow ? 'active' : ''} onClick={() => (setSub(null), o.act())}>
                  {o.label}
                </li>
              ))}
              {!sub.options.length && <li className="dim">（沒有選項）</li>}
            </ul>
          </div>
        )}
        <p className="biz-msg">{msg}</p>
        <p className="biz-help">Tab／[ ] 換頁　↑↓ 選　←→ 調整　E 確定　X 離開</p>
      </div>
    </div>
  );
}

