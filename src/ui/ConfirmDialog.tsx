import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/** 共用的確認選單：兩個按鈕（確定／取消），游標預設在「取消」以免誤按。←→ 切換，E 按下，X 取消。 */
export function ConfirmDialog() {
  const confirm = useGame((s) => s.confirm);
  const [cursor, setCursor] = useState(1);
  useEffect(() => setCursor(1), [confirm]);

  useKeys(
    !!confirm,
    (k) => {
      if (!confirm) return;
      if (isLeft(k) || isRight(k) || isUp(k) || isDown(k)) setCursor((c) => 1 - c);
    else if (isConfirm(k)) confirm.resolve(cursor === 0);
      else if (isCancel(k)) confirm.resolve(false);
    },
    true,
  );

  if (!confirm) return null;
  const buttons = [confirm.ok, '取消'];
  return (
    <div className="menu-backdrop confirm-layer">
      <div className="confirm-dialog pixel-frame">
        <p className="confirm-text">{confirm.text}</p>
        <div className="confirm-buttons">
          {buttons.map((b, i) => (
            <button key={b} type="button" className={i === cursor ? 'active' : ''} onMouseEnter={() => setCursor(i)} onClick={() => confirm.resolve(i === 0)}>
              {i === cursor ? '▶ ' : '　'}
              {b}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
