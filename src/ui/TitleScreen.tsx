import { useEffect, useMemo, useState } from 'react';
import { describeSave, latestSave, readSave, SLOT_NAME, SLOTS } from '../game/save';
import { loadGame, toCreate } from '../game/session';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isUp, useKeys } from './useKeys';

/** 標題畫面：繼續遊戲／讀取進度／新的遊戲 */
export function TitleScreen() {
  const screen = useGame((s) => s.screen);
  const booted = useGame((s) => s.booted);
  const [mode, setMode] = useState<'main' | 'load'>('main');
  const [cursor, setCursor] = useState(0);
  const active = screen === 'title';

  // 每次回到標題畫面都重新讀一次存檔
  const saves = useMemo(() => (active ? SLOTS.map((s) => ({ slot: s, data: readSave(s) })) : []), [active, mode]);
  const latest = useMemo(() => (active ? latestSave() : null), [active]);

  const main = [
    { label: '繼續遊戲', enabled: !!latest, run: () => latest && loadGame(latest) },
    { label: '讀取進度', enabled: saves.some((s) => s.data), run: () => (setMode('load'), setCursor(0)) },
    { label: '新的遊戲', enabled: true, run: toCreate },
  ];
  const items =
    mode === 'main'
      ? main
      : saves.map((s) => ({
          label: `${SLOT_NAME[s.slot]}　${s.data ? describeSave(s.data) : '（空）'}`,
          enabled: !!s.data,
          run: () => s.data && loadGame(s.data),
        }));

  // 回到標題時，游標停在第一個可以選的項目（沒有存檔時就是「新的遊戲」）
  useEffect(() => {
    if (!active) return;
    setMode('main');
    setCursor(latest ? 0 : 2);
  }, [active, latest]);

  useKeys(active && booted, (k, e) => {
    const n = items.length;
    if (isUp(k)) setCursor((c) => (c + n - 1) % n);
    else if (isDown(k)) setCursor((c) => (c + 1) % n);
    else if (isConfirm(k) && items[cursor]?.enabled) {
      // 不讓這次按鍵的字元打進接下來的建立角色輸入框
      e.preventDefault();
      items[cursor].run();
    }
    else if (isCancel(k) && mode === 'load') {
      setMode('main');
      setCursor(1);
    }
  });

  if (!active) return null;
  return (
    <div className="title-screen">
      <div className="title-mountains" />
      <div className="title-box">
        <h1 className="title-name">扶搖行</h1>
        <p className="title-sub">相忘江湖</p>
        <p className="title-tag">一劍一人，自在江湖</p>
        {booted ? (
          <ul className={`title-menu ${mode === 'load' ? 'wide pixel-frame' : ''}`}>
            {items.map((it, i) => (
              <li
                key={it.label}
                className={`${i === cursor ? 'active' : ''} ${it.enabled ? '' : 'disabled'}`}
                onMouseEnter={() => setCursor(i)}
                onClick={() => it.enabled && it.run()}
              >
                {i === cursor ? '▶ ' : '　'}
                {it.label}
              </li>
            ))}
          </ul>
        ) : (
          <p className="title-sub">準備中……</p>
        )}
        <p className="title-hint">↑↓ 選擇　E 確定{mode === 'load' ? '　X 返回' : ''}</p>
      </div>
    </div>
  );
}
