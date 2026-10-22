import { ReactNode, useEffect, useRef, useState } from 'react';
import { BrowseItem, Browser, Ledger, LedgerTable } from './Browser';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 書本選單的共用零件：
 * - `Spread`：攤開的左右兩頁（頁首標題、頁腳頁碼）。
 * - `Paper`：從摺好的小方塊展開成一張紙的彈窗，細節與動作都放在這裡（武功、物品、人物……）。
 *   紙上可以是一段說明加一排動作（`actions`）、一個小型的分層瀏覽（`browse`），或一張名冊（`ledger`）。
 * - `RowList`：一列一列能用方向鍵選的選項。
 */

/** 可以用鍵盤選的一列；run 回傳 'close' 時順便把紙收起來 */
export interface Row {
  key?: string;
  label: ReactNode;
  detail?: ReactNode;
  disabled?: boolean;
  run: () => void | 'close' | Promise<void>;
}

export function RowList({ rows, cursor, onPick, className = '' }: { rows: Row[]; cursor: number; onPick: (i: number) => void; className?: string }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    ref.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);
  return (
    <ul className={`row-list ${className}`} ref={ref}>
      {rows.map((r, i) => (
        <li key={r.key ?? i} className={`${i === cursor ? 'active' : ''} ${r.disabled ? 'disabled' : ''}`} onClick={() => onPick(i)}>
          <span>
            {i === cursor ? '▸ ' : '　'}
            {r.label}
          </span>
          {r.detail && <span className="row-note">{r.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

/** 一頁的頁首：大字標題、右邊小字 */
export function PageHead({ title, sub }: { title: ReactNode; sub?: ReactNode }) {
  return (
    <header className="page-head">
      <h2>{title}</h2>
      {sub && <span className="page-sub">{sub}</span>}
    </header>
  );
}

const DIGITS = '〇一二三四五六七八九';
/** 頁碼用國字：十一、二十三 */
const num = (n: number) => (n < 10 ? DIGITS[n] : `${n >= 20 ? DIGITS[Math.floor(n / 10)] : ''}十${n % 10 ? DIGITS[n % 10] : ''}`);

/** 攤開的兩頁 */
export function Spread({ left, right, folio }: { left: ReactNode; right: ReactNode; folio?: number }) {
  return (
    <>
      <section className="tome-page left">
        <div className="page-inner">{left}</div>
        {folio !== undefined && <span className="folio">{num(folio * 2 + 1)}</span>}
      </section>
      <section className="tome-page right">
        <div className="page-inner">{right}</div>
        {folio !== undefined && <span className="folio">{num(folio * 2 + 2)}</span>}
      </section>
    </>
  );
}

/** 圖示格子裡的一格：學會的菜、讀過的書、會織的樣式…… */
export interface IconCell {
  key: string;
  /** 圖示的 data URL */
  icon: string;
  label: string;
  /** 同一組的排在一起，組名寫在上面 */
  group?: string;
  /** 右下角的小數字（熟練度等） */
  badge?: ReactNode;
  /** 還沒學會、還沒讀過：圖示變暗 */
  dim?: boolean;
  detail: () => ReactNode;
}

/** 一格圖示：圖、右下角的數字，還沒有的變暗 */
export function IconTile({ icon, badge, dim, active, label, onClick, size = 'm' }: { icon: string; badge?: ReactNode; dim?: boolean; active?: boolean; label?: string; onClick?: () => void; size?: 's' | 'm' | 'l' }) {
  return (
    <div className={`icon-tile ${size} ${dim ? 'dim' : ''} ${active ? 'active' : ''}`} onClick={onClick} title={label}>
      <img src={icon} alt={label ?? ''} />
      {badge !== undefined && badge !== null && badge !== '' && <span className="icon-badge">{badge}</span>}
    </div>
  );
}

/** 紙上寫什麼 */
export interface Sheet {
  title: ReactNode;
  sub?: ReactNode;
  body?: ReactNode;
  actions?: Row[];
  browse?: BrowseItem[];
  ledger?: Ledger;
  /** 圖示格子：左邊一格一格，右邊是游標那一格的細節 */
  grid?: IconCell[];
  wide?: boolean;
}

/** 把格子依組別排成一列一列（每列最多 cols 個），回傳每列的索引 */
function gridRows(cells: IconCell[], cols: number): number[][] {
  const rows: number[][] = [];
  let group: string | undefined = '\0';
  cells.forEach((c, i) => {
    const last = rows[rows.length - 1];
    if (c.group !== group || !last || last.length >= cols) rows.push([i]);
    else last.push(i);
    group = c.group;
  });
  return rows;
}

const GRID_COLS = 5;

const FOLD_MS = 180;

/**
 * 展開的紙：sheet 從 null 變成內容時，紙從摺成一小塊的樣子先橫向、再縱向攤開；
 * 變回 null 時再摺回去才消失。X 收起，↑↓ 選動作（沒有動作時捲動），E 執行。
 */
export function Paper({ sheet, onClose }: { sheet: Sheet | null; onClose: () => void }) {
  const [last, setLast] = useState<Sheet | null>(sheet);
  const [closing, setClosing] = useState(false);
  const [cursor, setCursor] = useState(0);
  const [ledgerRow, setLedgerRow] = useState(0);
  const [gridAt, setGridAt] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const openKey = useRef(0);

  useEffect(() => {
    if (sheet) {
      if (!last || closing) {
        openKey.current++;
        setCursor(firstEnabled(sheet.actions));
        setLedgerRow(0);
        setGridAt(0);
      }
      setLast(sheet);
      setClosing(false);
    } else if (last && !closing) {
      setClosing(true);
      const t = setTimeout(() => (setLast(null), setClosing(false)), FOLD_MS);
      return () => clearTimeout(t);
    }
    // 只看 sheet 有沒有，內容每次重畫都是新的
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!sheet]);

  const shown = sheet ?? last;
  const actions = shown?.actions ?? [];
  const cur = Math.min(cursor, Math.max(0, actions.length - 1));
  const live = !!sheet && !closing;

  useEffect(() => {
    tableRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [ledgerRow]);
  useEffect(() => {
    gridRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [gridAt]);

  const grid = shown?.grid;
  const rows = grid ? gridRows(grid, GRID_COLS) : [];
  const at = Math.min(gridAt, Math.max(0, (grid?.length ?? 1) - 1));
  /** 格子裡上下左右：上下換列時盡量停在同一欄 */
  const moveGrid = (k: string) => {
    if (!grid?.length) return;
    const r = rows.findIndex((row) => row.includes(at));
    const c = rows[r].indexOf(at);
    if (isLeft(k)) setGridAt((at + grid.length - 1) % grid.length);
    else if (isRight(k)) setGridAt((at + 1) % grid.length);
    else if (isUp(k) || isDown(k)) {
      const row = rows[(r + (isUp(k) ? rows.length - 1 : 1)) % rows.length];
      setGridAt(row[Math.min(c, row.length - 1)]);
    }
  };

  useKeys(live && !shown?.browse, async (k) => {
    if (isCancel(k)) return onClose();
    if (grid) return moveGrid(k);
    if (shown?.ledger) {
      const n = shown.ledger.rows.length;
      if (isUp(k)) setLedgerRow((r) => (r + n - 1) % n);
      else if (isDown(k)) setLedgerRow((r) => (r + 1) % n);
      return;
    }
    if (!actions.length) {
      if (isUp(k)) bodyRef.current?.scrollBy({ top: -48 });
      else if (isDown(k)) bodyRef.current?.scrollBy({ top: 48 });
      else if (isConfirm(k)) onClose();
      return;
    }
    if (isUp(k)) setCursor(step(actions, cur, -1));
    else if (isDown(k)) setCursor(step(actions, cur, 1));
    else if (isLeft(k) || isRight(k)) return;
    else if (isConfirm(k)) {
      const r = actions[cur];
      if (!r || r.disabled) return;
      if ((await r.run()) === 'close') onClose();
    }
  });

  if (!shown) return null;
  return (
    <div className="paper-backdrop" onClick={onClose}>
      <div
        key={openKey.current}
        className={`paper ${shown.wide || shown.browse || shown.ledger || shown.grid ? 'wide' : ''} ${closing ? 'folding' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="paper-content">
          <header className="paper-head">
            <h3>{shown.title}</h3>
            {shown.sub && <span className="paper-sub">{shown.sub}</span>}
          </header>
          {shown.browse ? (
            <div className="paper-browse">
              <Browser layout="pane" title="" items={shown.browse} active={live} onExit={onClose} />
            </div>
          ) : grid ? (
            <>
              {shown.body && <div className="paper-top">{shown.body}</div>}
              <div className="icon-pane">
                <div className="icon-grid" ref={gridRef}>
                  {rows.map((row, r) => (
                    <div key={r} className="icon-row-wrap">
                      {grid[row[0]].group && (r === 0 || grid[rows[r - 1][0]].group !== grid[row[0]].group) && <div className="icon-group">{grid[row[0]].group}</div>}
                      <div className="icon-row">
                        {row.map((i) => (
                          <IconTile key={grid[i].key} icon={grid[i].icon} badge={grid[i].badge} dim={grid[i].dim} label={grid[i].label} active={i === at} onClick={() => setGridAt(i)} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="icon-detail">{grid[at]?.detail()}</div>
              </div>
            </>
          ) : shown.ledger ? (
            <LedgerTable ledger={shown.ledger} cursor={ledgerRow} active={live} innerRef={tableRef} onPick={setLedgerRow} />
          ) : (
            <>
              {shown.body && (
                <div className="paper-body" ref={bodyRef}>
                  {shown.body}
                </div>
              )}
              {actions.length > 0 && (
                <RowList
                  className="paper-actions"
                  rows={actions}
                  cursor={cur}
                  onPick={async (i) => {
                    setCursor(i);
                    if (!actions[i].disabled && (await actions[i].run()) === 'close') onClose();
                  }}
                />
              )}
            </>
          )}
          <p className="paper-help">
            {shown.browse
              ? ''
              : grid
                ? '方向鍵選一格　X 摺起'
                : shown.ledger
                ? '↑↓ 逐列翻看　X 摺起'
                : actions.length
                  ? '↑↓ 選擇　E 確定　X 摺起'
                  : '↑↓ 捲動　E／X 摺起'}
          </p>
        </div>
      </div>
    </div>
  );
}

const firstEnabled = (rows?: Row[]) => Math.max(0, rows?.findIndex((r) => !r.disabled) ?? 0);

/** 往上下找下一個能選的列（全都不能選就停在原地） */
function step(rows: Row[], from: number, d: 1 | -1): number {
  const n = rows.length;
  for (let i = 1; i <= n; i++) {
    const j = (from + d * i + n * n) % n;
    if (!rows[j].disabled) return j;
  }
  return from;
}
