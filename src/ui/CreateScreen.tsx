import { useEffect, useRef, useState } from 'react';
import { ATTRS, Attrs, ROLL, rollAttrs, rollName, sumAttrs } from '../game/character';
import { newGame } from '../game/session';
import { useGame } from '../state/store';
import { isConfirm } from './useKeys';

/** 建立角色：填姓名（可隨機）、擲骰決定五維 */
export function CreateScreen() {
  const active = useGame((s) => s.screen === 'create');
  const [surname, setSurname] = useState('');
  const [given, setGiven] = useState('');
  const [base, setBase] = useState<Attrs>(() => rollAttrs());
  const [cursor, setCursor] = useState(0);
  const [error, setError] = useState('');
  const inputs = [useRef<HTMLInputElement>(null), useRef<HTMLInputElement>(null)];

  // 每次進入都清空姓名、重擲一次
  useEffect(() => {
    if (!active) return;
    setSurname('');
    setGiven('');
    setBase(rollAttrs());
    setCursor(0);
    setError('');
  }, [active]);

  const randomName = () => {
    const n = rollName();
    setSurname(n.surname);
    setGiven(n.given);
    setError('');
  };
  const start = () => {
    const s = surname.trim();
    const g = given.trim();
    if (!s || !g) return setError(!s ? '請填入姓氏。' : '請填入名字。');
    newGame({ surname: s, given: g, base });
  };
  const back = () => useGame.setState({ screen: 'title' });

  // 0 姓、1 名、2 隨機姓名、3 擲骰、4 開始、5 返回
  const buttons: (() => void)[] = [() => {}, () => {}, randomName, () => setBase(rollAttrs()), start, back];
  const N = buttons.length;

  // 游標移到輸入框時讓它取得焦點，移開時放掉焦點
  useEffect(() => {
    if (!active) return;
    const el = inputs[cursor]?.current;
    if (el) el.focus();
    else (document.activeElement as HTMLElement | null)?.blur();
  }, [active, cursor]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      // 中文輸入法選字中的按鍵一律交給輸入法
      if (e.isComposing || e.keyCode === 229) return;
      const typing = cursor <= 1;
      if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
        e.preventDefault();
        setCursor((c) => (c + N - 1) % N);
      } else if (e.key === 'ArrowDown' || e.key === 'Tab') {
        e.preventDefault();
        setCursor((c) => (c + 1) % N);
      } else if (e.key === 'Escape') {
        back();
      } else if (typing) {
        // 輸入框裡只有 Enter 有作用：跳到下一欄
        if (e.key === 'Enter') setCursor((c) => c + 1);
      } else if (!e.repeat && isConfirm(e.key)) {
        e.preventDefault();
        buttons[cursor]();
      } else if (e.key === 'x' || e.key === 'X') {
        back();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!active) return null;
  const total = sumAttrs(base);
  const btn = (i: number, label: string) => (
    <button type="button" className={`create-btn ${cursor === i ? 'active' : ''}`} onMouseEnter={() => setCursor(i)} onClick={buttons[i]}>
      {cursor === i ? '▶ ' : '　'}
      {label}
    </button>
  );

  return (
    <div className="title-screen create-screen">
      <div className="title-mountains" />
      <div className="create-box pixel-frame">
        <h2>建立角色</h2>

        <div className="create-name">
          <label className={cursor === 0 ? 'active' : ''}>
            姓
            <input
              ref={inputs[0]}
              value={surname}
              maxLength={2}
              placeholder="　"
              onFocus={() => setCursor(0)}
              onChange={(e) => (setSurname(e.target.value), setError(''))}
            />
          </label>
          <label className={cursor === 1 ? 'active' : ''}>
            名
            <input
              ref={inputs[1]}
              value={given}
              maxLength={3}
              placeholder="　"
              onFocus={() => setCursor(1)}
              onChange={(e) => (setGiven(e.target.value), setError(''))}
            />
          </label>
          {btn(2, '隨機姓名')}
        </div>

        <table className="attrs create-attrs">
          <tbody>
            {ATTRS.map((a) => (
              <tr key={a.key}>
                <th>{a.name}</th>
                <td className="realm">{base[a.key]}</td>
                <td>
                  <div className="exp-track">
                    <div className="exp-fill" style={{ width: `${(base[a.key] / ROLL.max) * 100}%` }} />
                  </div>
                </td>
                <td className="muted small">{a.desc}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="create-total">
          <span>
            五維總和 <b className="realm">{total}</b>
            <small className="muted">（每項 {ROLL.min}–{ROLL.max}，總和固定在 {ROLL.totalMin}–{ROLL.totalMax}）</small>
          </span>
          {btn(3, '重新擲骰')}
        </div>

        <div className="create-foot">
          {btn(4, '踏入江湖')}
          {btn(5, '返回')}
          <span className="create-error">{error}</span>
        </div>
        <p className="title-hint">↑↓ 選擇　E 確定　在輸入框裡按 Enter 跳下一欄　Esc 返回</p>
      </div>
    </div>
  );
}
