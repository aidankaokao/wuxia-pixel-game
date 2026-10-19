import { ReactNode, useEffect, useRef, useState } from 'react';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 分層瀏覽：一層一層往下看（分類 → 清單 → 細節），全程只用方向鍵與確認鍵。
 * 左邊是目前這一層的清單，右邊是游標所在那一項的細節；有下一層的項目按 E／→ 進去，X／← 回上一層。
 * 細節太長時，在沒有下一層的項目上按 E／→ 可以把焦點移到右邊，用 ↑↓ 捲動。
 */

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
  const crumbs: ReactNode[] = [title];
  for (const s of stack) {
    const parent = level.find((i) => i.key === s.key);
    if (!parent?.children) break;
    crumbs.push(parent.label);
    level = parent.children();
  }
  const cur = Math.min(cursor, Math.max(0, level.length - 1));
  const item = level[cur];

  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
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
    const n = level.length;
    if (!n) {
      if (isCancel(k) || isLeft(k)) back();
      return;
    }
    if (isUp(k)) setCursor((cur + n - 1) % n);
    else if (isDown(k)) setCursor((cur + 1) % n);
    else if (isConfirm(k) || isRight(k)) {
      if (item?.children) {
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
      <div className="browser-panes">
        <ul className={`browser-list ${active && !reading ? 'focus' : ''}`} ref={listRef}>
          {level.map((it, i) => (
            <li
              key={it.key}
              className={`${i === cur ? 'active' : ''} ${it.muted ? 'muted' : ''}`}
              onClick={() => (i === cur && it.children ? (setStack([...stack, { key: it.key, cursor: i }]), setCursor(0)) : setCursor(i))}
            >
              <span>
                {i === cur && active ? '▶ ' : '　'}
                {it.label}
                {it.children && <span className="muted"> ›</span>}
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
      <p className="browser-help muted small">
        {active
          ? `↑↓ 選擇　E／→ ${item?.children ? '進入' : '細看'}　X／← ${stack.length || reading ? '回上一層' : '回到分頁'}`
          : '按 E 或 → 開始瀏覽'}
      </p>
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
