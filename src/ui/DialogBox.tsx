import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isUp, useKeys } from './useKeys';

const CHAR_MS = 32;

/**
 * 畫面下方的對話框：逐字顯示，按確認鍵先顯示完整句子，再按一次換下一句。
 * 有選項時，最後一句顯示完後列出選項，↑↓ 選擇。
 */
export function DialogBox() {
  const dialog = useGame((s) => s.dialog);
  const advance = useGame((s) => s.advance);
  const line = dialog ? dialog.lines[dialog.index] : null;
  const [shown, setShown] = useState(0);
  const [choice, setChoice] = useState(0);

  useEffect(() => {
    setShown(0);
    setChoice(0);
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
  const choices = dialog && dialog.index === dialog.lines.length - 1 ? dialog.choices : undefined;

  useKeys(!!line, (k) => {
    if (!line) return;
    if (!done) {
      if (isConfirm(k) || isCancel(k)) setShown(line.text.length);
      return;
    }
    if (choices) {
      if (isUp(k)) setChoice((c) => (c + choices.length - 1) % choices.length);
      else if (isDown(k)) setChoice((c) => (c + 1) % choices.length);
      else if (isConfirm(k)) advance(choice);
      // 取消鍵等於選最後一個（通常是「算了」之類）
      else if (isCancel(k)) advance(choices.length - 1);
      return;
    }
    if (isConfirm(k) || isCancel(k)) advance();
  });

  if (!line) return null;
  return (
    <>
      {choices && done && (
        <ul className="choices pixel-frame">
          {choices.map((c, i) => (
            <li key={c} className={i === choice ? 'active' : ''} onClick={() => advance(i)}>
              {i === choice ? '▶ ' : '　'}
              {c}
            </li>
          ))}
        </ul>
      )}
      <div className="dialog pixel-frame" onClick={() => (!done ? setShown(line.text.length) : !choices && advance())}>
        {line.speaker && <div className="dialog-name pixel-frame">{line.speaker}</div>}
        <div className="dialog-text">{line.text.slice(0, shown)}</div>
        {done && !choices && <div className="dialog-next">▼</div>}
      </div>
    </>
  );
}
