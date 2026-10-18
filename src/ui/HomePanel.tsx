import { useState } from 'react';
import {
  furnitureLevel,
  furnitureOf,
  FURNITURE,
  HOME_STYLES,
  HomeStyle,
  MAX_TIER,
  RESTYLE_COST,
  STYLE_DESC,
  STYLE_NAME,
  tierDef,
} from '../game/home';
import { plotName } from '../game/story/estate';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isUp, useKeys } from './useKeys';

interface Row {
  label: string;
  cost?: number;
  /** 選到這列時下方顯示的說明 */
  info: string;
  disabled?: boolean;
  run?: () => void;
}

/** 杜木匠的房屋選單：擴建、升級家具、換擺設風格。改動在下次進屋時生效。 */
export function HomePanel() {
  const panel = useGame((s) => s.panel);
  const hero = useGame((s) => s.hero);
  const world = useGame((s) => s.world);
  const [cursor, setCursor] = useState(0);
  const open = panel?.kind === 'home';
  const plot = open ? panel.plot : '';
  const e = world.estates[plot];

  const st = useGame.getState();
  /** 付錢並改動房產 */
  const pay = (cost: number, msg: string, fn: (w: typeof world) => void) => {
    if (st.hero.silver < cost) return st.showToast('銀兩不夠。');
    st.updateHero((c) => {
      c.silver -= cost;
    });
    st.updateWorld(fn);
    st.showToast(`${msg}（−${cost} 兩）`);
  };

  const rows: Row[] = [];
  if (e) {
    if (e.tier < MAX_TIER) {
      const next = tierDef(e.tier + 1);
      const added = FURNITURE.filter((f) => f.tier === e.tier + 1).map((f) => f.name);
      rows.push({
        label: `擴建為「${next.name}」`,
        cost: next.cost,
        info: `${next.desc}${added.length ? `\n新增：${added.join('、')}` : ''}`,
        run: () =>
          pay(next.cost, `房子擴建為「${next.name}」`, (w) => {
            w.estates[plot].tier++;
          }),
      });
    } else rows.push({ label: '房子已是大宅', info: tierDef(e.tier).desc, disabled: true });

    for (const f of furnitureOf(e).filter((f) => f.maxLevel > 1)) {
      const lv = furnitureLevel(e, f.id);
      if (lv >= f.maxLevel) {
        rows.push({ label: `${f.name}　${lv} 級（已是最好）`, info: `目前：${f.effect(lv, e.style)}`, disabled: true });
        continue;
      }
      const cost = f.costs[lv - 1];
      rows.push({
        label: `${f.name}　${lv} 級 → ${lv + 1} 級`,
        cost,
        info: `目前：${f.effect(lv, e.style)}\n升級後：${f.effect(lv + 1, e.style)}`,
        run: () =>
          pay(cost, `${f.name}升到 ${lv + 1} 級`, (w) => {
            w.estates[plot].furniture[f.id] = lv + 1;
          }),
      });
    }

    for (const s of HOME_STYLES) {
      const current = s === e.style;
      rows.push({
        label: current ? `擺設風格：${STYLE_NAME[s]}（目前）` : `改為「${STYLE_NAME[s]}」風格`,
        cost: current ? undefined : RESTYLE_COST,
        info: STYLE_DESC[s],
        disabled: current,
        run: () =>
          pay(RESTYLE_COST, `擺設改為「${STYLE_NAME[s]}」風格`, (w) => {
            w.estates[plot].style = s as HomeStyle;
          }),
      });
    }
  }
  rows.push({ label: '離開', info: '改動會在下次進屋時看到。', run: () => st.closePanel() });
  const cur = Math.min(cursor, rows.length - 1);

  /** 要花錢的那一列先問一次 */
  const pick = async (r: Row) => {
    if (r.disabled) return;
    if (r.cost === undefined) return r.run?.();
    if (st.hero.silver < r.cost) return st.showToast('銀兩不夠。');
    if (await st.askConfirm(`確定要花 ${r.cost} 兩，${r.label.replace(/^改為/, '改成')}嗎？`, '確定')) r.run?.();
  };

  useKeys(open, (k) => {
    const n = rows.length;
    if (isUp(k)) setCursor((c) => (Math.min(c, n - 1) + n - 1) % n);
    else if (isDown(k)) setCursor((c) => (Math.min(c, n - 1) + 1) % n);
    else if (isConfirm(k)) pick(rows[cur]);
    else if (isCancel(k)) st.closePanel();
  });

  if (!open || !e) return null;
  return (
    <div className="menu-backdrop">
      <div className="panel pixel-frame">
        <h2>
          {plotName(e)}・{tierDef(e.tier).name}　<small>擺設：{STYLE_NAME[e.style]}　銀兩 {hero.silver}</small>
        </h2>
        <p className="muted small">
          家具：{furnitureOf(e).map((f) => (f.maxLevel > 1 ? `${f.name} ${furnitureLevel(e, f.id)} 級` : f.name)).join('、')}
        </p>
        <ul className="system-rows">
          {rows.map((r, i) => (
            <li key={r.label} className={`${i === cur ? 'active' : ''} ${r.disabled ? 'disabled' : ''}`} onClick={() => (setCursor(i), pick(r))}>
              <span>
                {i === cur ? '▶ ' : '　'}
                {r.label}
              </span>
              {r.cost !== undefined && <span className={hero.silver >= r.cost ? '' : 'muted'}>{r.cost} 兩</span>}
            </li>
          ))}
        </ul>
        <p className="panel-info small">{rows[cur].info}</p>
        <p className="muted small">↑↓ 選擇　E 確定　X 離開</p>

      </div>
    </div>
  );
}
