import { ReactNode, useEffect, useRef, useState } from 'react';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 分層瀏覽：一層一層往下看（分類 → 清單 → 細節），全程只用方向鍵與確認鍵。
 * 左邊是目前這一層的清單，右邊是游標所在那一項的細節；有下一層的項目按 E／→ 進去，X／← 回上一層。
 * 細節太長時，在沒有下一層的項目上按 E／→ 可以把焦點移到右邊，用 ↑↓ 捲動。
 * 項目也可以是一張表（ledger，例如弟子名冊）：進去後整個畫面是一張表，一列一個，用 ↑↓ 逐列看。
 * 項目帶 action 時按 E 直接執行（例如在「裝備」裡挑一件穿上）。
 */

/** 表格：像真的名冊一樣，一列一個 */
export interface Ledger {
  title: ReactNode;
  columns: string[];
  rows: { key: string; cells: ReactNode[]; muted?: boolean; mark?: boolean }[];
  note?: ReactNode;
}

export interface BrowseItem {
  key: string;
  label: ReactNode;
  /** 清單右側的小字或標籤 */
  tag?: ReactNode;
  muted?: boolean;
  /** 右邊顯示的細節 */
  detail?: () => ReactNode;
  /** 下一層 */
  children?: () => BrowseItem[];
  /** 下一層是一張表 */
  ledger?: () => Ledger;
  /** 按 E 執行的動作（例如穿上這件衣服）；actionLabel 是說明列上的字 */
  action?: () => void;
  actionLabel?: string;
}

export function Browser({ title, items, active, onExit }: { title: string; items: BrowseItem[]; active: boolean; onExit: () => void }) {
  // 走進來的路徑：每一層記住游標位置
  const [stack, setStack] = useState<{ key: string; cursor: number }[]>([]);
  const [cursor, setCursor] = useState(0);
  const [reading, setReading] = useState(false);
  const detailRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!active) {
      setStack([]);
      setCursor(0);
      setReading(false);
    }
  }, [active]);

  // 依路徑找出目前這一層的清單（資料變了、找不到時退回上層）
  let level = items;
  let ledger: Ledger | null = null;
  const crumbs: ReactNode[] = [title];
  for (const s of stack) {
    const parent = level.find((i) => i.key === s.key);
    if (parent?.ledger) {
      crumbs.push(parent.label);
      ledger = parent.ledger();
      break;
    }
    if (!parent?.children) break;
    crumbs.push(parent.label);
    level = parent.children();
  }
  const count = ledger ? ledger.rows.length : level.length;
  const cur = Math.min(cursor, Math.max(0, count - 1));
  const item = ledger ? undefined : level[cur];

  const tableRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    tableRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
    if (!reading) detailRef.current?.scrollTo({ top: 0 });
  }, [cur, stack.length, reading]);

  const back = () => {
    if (reading) return setReading(false);
    if (!stack.length) return onExit();
    const top = stack[stack.length - 1];
    setStack(stack.slice(0, -1));
    setCursor(top.cursor);
  };

  useKeys(active, (k) => {
    if (reading) {
      const el = detailRef.current;
      if (isUp(k)) el?.scrollBy({ top: -48 });
      else if (isDown(k)) el?.scrollBy({ top: 48 });
      else if (isCancel(k) || isLeft(k)) setReading(false);
      return;
    }
    const n = count;
    if (ledger) {
      if (isUp(k)) setCursor((cur + n - 1) % n);
      else if (isDown(k)) setCursor((cur + 1) % n);
      else if (isCancel(k) || isLeft(k)) back();
      return;
    }
    if (!n) {
      if (isCancel(k) || isLeft(k)) back();
      return;
    }
    if (isUp(k)) setCursor((cur + n - 1) % n);
    else if (isDown(k)) setCursor((cur + 1) % n);
    else if (isConfirm(k) || isRight(k)) {
      if (item?.action) item.action();
      else if (item?.children || item?.ledger) {
        setStack([...stack, { key: item.key, cursor: cur }]);
        setCursor(0);
      } else if (detailRef.current && detailRef.current.scrollHeight > detailRef.current.clientHeight) setReading(true);
    } else if (isCancel(k) || isLeft(k)) back();
  });

  return (
    <div className="browser">
      <div className="browser-crumbs">
        {crumbs.map((c, i) => (
          <span key={i}>
            {i > 0 && <span className="muted"> › </span>}
            {c}
          </span>
        ))}
      </div>
      {ledger ? (
        <LedgerTable ledger={ledger} cursor={cur} active={active} innerRef={tableRef} onPick={setCursor} />
      ) : (
        <div className="browser-panes">
          <ul className={`browser-list ${active && !reading ? 'focus' : ''}`} ref={listRef}>
            {level.map((it, i) => (
              <li
                key={it.key}
                className={`${i === cur ? 'active' : ''} ${it.muted ? 'muted' : ''}`}
                onClick={() =>
                  i === cur && it.action
                    ? it.action()
                    : i === cur && (it.children || it.ledger)
                      ? (setStack([...stack, { key: it.key, cursor: i }]), setCursor(0))
                      : setCursor(i)
                }
              >
                <span>
                  {i === cur && active ? '▶ ' : '　'}
                  {it.label}
                  {(it.children || it.ledger) && <span className="muted"> ›</span>}
                </span>
                {it.tag && <span className="browser-tag">{it.tag}</span>}
              </li>
            ))}
            {!level.length && <li className="muted">（沒有內容）</li>}
          </ul>
          <div className={`browser-detail ${reading ? 'focus' : ''}`} ref={detailRef}>
            {item?.detail ? item.detail() : item?.children ? <Preview items={item.children()} /> : null}
          </div>
        </div>
      )}
      <p className="browser-help muted small">
        {active
          ? ledger
            ? '↑↓ 逐列翻看　X／← 闔上名冊'
            : `↑↓ 選擇　E／→ ${item?.action ? (item.actionLabel ?? '確定') : item?.children || item?.ledger ? '進入' : '細看'}　X／← ${stack.length || reading ? '回上一層' : '回到分頁'}`
          : '按 E 或 → 開始瀏覽'}
      </p>
    </div>
  );
}

/** 名冊式的表格：紙色底、直線分欄，游標所在的那一列標出來 */
function LedgerTable({
  ledger,
  cursor,
  active,
  innerRef,
  onPick,
}: {
  ledger: Ledger;
  cursor: number;
  active: boolean;
  innerRef: React.RefObject<HTMLDivElement>;
  onPick: (i: number) => void;
}) {
  return (
    <div className="ledger">
      <div className="ledger-title">{ledger.title}</div>
      <div className="ledger-body" ref={innerRef}>
        <table>
          <thead>
            <tr>
              {ledger.columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ledger.rows.map((r, i) => (
              <tr key={r.key} className={`${i === cursor && active ? 'active' : ''} ${r.muted ? 'muted' : ''} ${r.mark ? 'mark' : ''}`} onClick={() => onPick(i)}>
                {r.cells.map((c, j) => (
                  <td key={j}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ledger.note && <div className="ledger-note">{ledger.note}</div>}
    </div>
  );
}

/** 有下一層的項目：右邊先列出裡面有什麼 */
function Preview({ items }: { items: BrowseItem[] }) {
  if (!items.length) return <p className="muted">（沒有內容）</p>;
  return (
    <ul className="browser-preview">
      {items.map((it) => (
        <li key={it.key} className={it.muted ? 'muted' : ''}>
          {it.label}
          {it.tag && <span className="browser-tag">{it.tag}</span>}
        </li>
      ))}
    </ul>
  );
}
