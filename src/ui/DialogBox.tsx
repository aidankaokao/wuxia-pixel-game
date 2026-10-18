import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import { isCancel, isConfirm, useKeys } from './useKeys';

const CHAR_MS = 32;

/** 畫面下方的對話框：逐字顯示，按確認鍵先顯示完整句子，再按一次換下一句。 */
export function DialogBox() {
  const dialog = useGame((s) => s.dialog);
  const advance = useGame((s) => s.advance);
  const line = dialog ? dialog.lines[dialog.index] : null;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    setShown(0);
    if (!line) return;
    const timer = window.setInterval(() => {
      setShown((n) => {
        if (n >= line.text.length) {
          window.clearInterval(timer);
          return n;
        }
        return n + 1;
      });
    }, CHAR_MS);
    return () => window.clearInterval(timer);
  }, [line]);

  const done = !!line && shown >= line.text.length;

  useKeys(!!line, (k) => {
    if (!line || !(isConfirm(k) || isCancel(k))) return;
    if (!done) setShown(line.text.length);
    else advance();
  });

  if (!line) return null;
  return (
    <div className="dialog pixel-frame" onClick={() => (done ? advance() : setShown(line.text.length))}>
      {line.speaker && <div className="dialog-name pixel-frame">{line.speaker}</div>}
      <div className="dialog-text">{line.text.slice(0, shown)}</div>
      {done && <div className="dialog-next">▼</div>}
    </div>
  );
}
