import { useState } from 'react';
import { ITEMS, sellPrice } from '../game/character';
import { itemIconUrl } from '../game/art/items';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/** 貨郎賣的東西 */
const STOCK = ['jinchuang', 'tea', 'herb'];

/** 等待確認的交易 */
interface Pending {
  mode: 'buy' | 'sell';
  id: string;
  qty: number;
}

/** 商店：←→ 切換買／賣，E 選這樣東西（再確認數量），R 賣出全部，X 離開。 */
export function ShopPanel() {
  const panel = useGame((s) => s.panel);
  const hero = useGame((s) => s.hero);
  const [tab, setTab] = useState<'buy' | 'sell'>('buy');
  const [cursor, setCursor] = useState(0);
  const [pending, setPending] = useState<Pending | null>(null);
  const open = panel?.kind === 'shop';

  const st = useGame.getState();
  const list =
    tab === 'buy'
      ? STOCK
      : Object.keys(hero.items).filter((id) => hero.items[id] > 0 && sellPrice(id) > 0 && !ITEMS[id].manual);
  const cur = Math.min(cursor, Math.max(0, list.length - 1));

  /** 這筆交易最多能買／賣幾個 */
  const maxQty = (mode: Pending['mode'], id: string) =>
    mode === 'buy' ? Math.floor(st.hero.silver / ITEMS[id].price!) : st.hero.items[id] ?? 0;
  const unit = (p: Pending) => (p.mode === 'buy' ? ITEMS[p.id].price! : sellPrice(p.id));

  const choose = (mode: Pending['mode'], id: string, all = false) => {
    const max = maxQty(mode, id);
    if (max < 1) return st.showToast('銀兩不夠。');
    setPending({ mode, id, qty: all ? max : 1 });
  };
  const commit = (p: Pending) => {
    const total = unit(p) * p.qty;
    st.updateHero((c) => {
      if (p.mode === 'buy') {
        c.silver -= total;
        c.items[p.id] = (c.items[p.id] ?? 0) + p.qty;
      } else {
        c.silver += total;
        c.items[p.id] -= p.qty;
        if (!c.items[p.id]) delete c.items[p.id];
      }
    });
    st.showToast(`${p.mode === 'buy' ? '買' : '賣'}了${ITEMS[p.id].name}${p.qty > 1 ? ` ×${p.qty}` : ''}（${p.mode === 'buy' ? '−' : '+'}${total} 兩）`);
    setPending(null);
  };

  useKeys(open, (k) => {
    if (pending) {
      // 確認框：←→ 調一個、↑↓ 調十個，E 確定，X 取消
      const max = maxQty(pending.mode, pending.id);
      const adj = (d: number) => setPending({ ...pending, qty: Math.max(1, Math.min(max, pending.qty + d)) });
      if (isLeft(k)) adj(-1);
      else if (isRight(k)) adj(1);
      else if (isUp(k)) adj(10);
      else if (isDown(k)) adj(-10);
      else if (isConfirm(k)) commit(pending);
      else if (isCancel(k)) setPending(null);
      return;
    }
    const n = list.length;
    if (isLeft(k) || isRight(k)) {
      setTab((t) => (t === 'buy' ? 'sell' : 'buy'));
      setCursor(0);
    } else if (isUp(k) && n) setCursor((c) => (Math.min(c, n - 1) + n - 1) % n);
    else if (isDown(k) && n) setCursor((c) => (Math.min(c, n - 1) + 1) % n);
    else if (isConfirm(k) && list[cur]) choose(tab, list[cur]);
    else if ((k === 'r' || k === 'R') && tab === 'sell' && list[cur]) choose('sell', list[cur], true);
    else if (isCancel(k)) st.closePanel();
  });

  if (!open) return null;
  const sel = list[cur];
  return (
    <div className="menu-backdrop">
      <div className="panel pixel-frame">
        <h2>
          貨郎攤子　<small>銀兩 {hero.silver}</small>
        </h2>
        <div className="panel-tabs">
          <span className={tab === 'buy' ? 'active' : ''} onClick={() => (setTab('buy'), setCursor(0))}>
            買
          </span>
          <span className={tab === 'sell' ? 'active' : ''} onClick={() => (setTab('sell'), setCursor(0))}>
            賣
          </span>
          <span className="muted small">←→ 切換　E {tab === 'buy' ? '買' : '賣'}{tab === 'sell' ? '　R 全部賣出' : ''}　X 離開</span>
        </div>
        <ul className="system-rows shop-rows">
          {list.length === 0 && <li className="muted">沒有可以賣的東西。</li>}
          {list.map((id, i) => (
            <li key={id} className={i === cur ? 'active' : ''} onClick={() => (setCursor(i), choose(tab, id))}>
              <span>
                {i === cur ? '▶ ' : '　'}
                <img className="shop-icon" src={itemIconUrl(ITEMS[id].icon)} alt="" />
                {ITEMS[id].name}
                <small className="muted">　持有 {hero.items[id] ?? 0}</small>
              </span>
              <span>{tab === 'buy' ? ITEMS[id].price : sellPrice(id)} 兩</span>
            </li>
          ))}
        </ul>
        {sel && <p className="muted small">{ITEMS[sel].desc}</p>}
        {pending && (
          <div className="confirm-box pixel-frame">
            <p>
              {pending.mode === 'buy' ? '買下' : '賣出'}「{ITEMS[pending.id].name}」
              <span className="qty">
                ◀ {pending.qty} ▶
              </span>
              ，{pending.mode === 'buy' ? '共花' : '共得'} <b>{unit(pending) * pending.qty}</b> 兩
            </p>
            <p className="muted small">
              ←→ 數量 ±1　↑↓ ±10（最多 {maxQty(pending.mode, pending.id)}）　E 確定　X 取消
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
