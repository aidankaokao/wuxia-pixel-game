import { useEffect, useRef, useState } from 'react';
import { allNotices, NOTICE_TABS, NoticeTab } from '../game/notices';
import { dateText } from '../game/time';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 公告欄：一塊木板上貼著三欄告示（重要大事、懸賞公告、日常公告）。
 * ←→ 換欄，↑↓ 選一張，右邊是那張告示的全文；帶動作的告示（揭榜等）按 E 執行（面板關起來，由腳本接著做）。X 離開。
 */
export function NoticeBoard() {
  const panel = useGame((s) => s.panel);
  const hero = useGame((s) => s.hero);
  const flags = useGame((s) => s.flags);
  const world = useGame((s) => s.world);
  const open = panel?.kind === 'notices';
  const [tab, setTab] = useState<NoticeTab>('big');
  const [row, setRow] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (open && panel?.kind === 'notices') {
      setTab(panel.tab ?? 'big');
      setRow(0);
      useGame.setState({ noticePick: null });
    }
  }, [open]);
  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [row, tab]);

  const all = open ? allNotices({ hero, flags, world }) : [];
  const list = all.filter((n) => n.tab === tab);
  const cur = list[Math.min(row, list.length - 1)];

  const switchTab = (d: number) => {
    const i = NOTICE_TABS.findIndex((t) => t.id === tab);
    setTab(NOTICE_TABS[(i + d + NOTICE_TABS.length) % NOTICE_TABS.length].id);
    setRow(0);
  };
  const pick = () => {
    if (!cur?.act) return;
    useGame.setState({ noticePick: cur.id });
    useGame.getState().closePanel();
  };

  useKeys(open, (k) => {
    const n = list.length;
    if (isCancel(k)) return useGame.getState().closePanel();
    if (isLeft(k)) return switchTab(-1);
    if (isRight(k)) return switchTab(1);
    if (!n) return;
    if (isUp(k)) setRow((r) => (r + n - 1) % n);
    else if (isDown(k)) setRow((r) => (r + 1) % n);
    else if (isConfirm(k)) pick();
  });

  if (!open) return null;
  return (
    <div className="menu-backdrop">
      <div className="board">
        <div className="board-title">{(panel?.kind === 'notices' && panel.title) || '臨江縣・公告欄'}</div>
        <ul className="board-tabs">
          {NOTICE_TABS.map((t) => {
            const count = all.filter((n) => n.tab === t.id).length;
            return (
              <li key={t.id} className={`${t.id} ${t.id === tab ? 'active' : ''}`} onClick={() => (setTab(t.id), setRow(0))}>
                {t.name}
                <small>{count}</small>
              </li>
            );
          })}
        </ul>
        <div className="board-body">
          <ul className="board-list" ref={listRef}>
            {list.map((n, i) => (
              <li key={n.id} className={`${tab} ${i === row ? 'active' : ''}`} onClick={() => (i === row ? pick() : setRow(i))}>
                <span className="board-slip-title">{n.title}</span>
                {n.tag && <span className="board-slip-tag">{n.tag}</span>}
                {n.until !== undefined && <span className="board-slip-until">貼到{dateText(n.until)}</span>}
              </li>
            ))}
            {!list.length && <li className="board-empty">（這一欄目前沒有告示）</li>}
          </ul>
          <div className={`board-paper ${tab}`}>
            {cur ? (
              <>
                <h3>{cur.title}</h3>
                {cur.text.map((t, i) => (
                  <p key={i}>{t}</p>
                ))}
                {cur.by && <p className="board-by">——{cur.by}</p>}
                {cur.until !== undefined && <p className="board-until">此告示貼到{dateText(cur.until)}為止。</p>}
                {cur.act && <p className="board-act">按 E：{cur.act.label}</p>}
              </>
            ) : (
              <p className="board-empty">（空白的木板上，只剩幾個圖釘孔）</p>
            )}
          </div>
        </div>
        <p className="board-help">←→ 換欄　↑↓ 選告示　E 確定　X 離開</p>
      </div>
    </div>
  );
}
