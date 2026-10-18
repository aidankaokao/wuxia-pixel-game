import { useState } from 'react';
import { ATTRS, REALMS, derive } from '../game/character';
import { useGame } from '../state/store';
import { isCancel, isConfirm, useKeys } from './useKeys';

const TABS = ['人物', '武功', '行囊', '江湖事', '系統'] as const;
type Tab = (typeof TABS)[number];

/** 系統選單：左側分頁、右側內容。↑↓ 切換分頁，X/Esc 關閉。 */
export function GameMenu() {
  const open = useGame((s) => s.menuOpen);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('人物');

  useKeys(open, (k, e) => {
    const i = TABS.indexOf(tab);
    if (k === 'ArrowUp' || k === 'w' || k === 'W') setTab(TABS[(i + TABS.length - 1) % TABS.length]);
    else if (k === 'ArrowDown' || k === 's' || k === 'S') setTab(TABS[(i + 1) % TABS.length]);
    else if (isCancel(k)) setMenu(false);
    else if (isConfirm(k)) e.preventDefault();
  });

  if (!open) return null;
  return (
    <div className="menu-backdrop" onClick={() => setMenu(false)}>
      <div className="menu pixel-frame" onClick={(e) => e.stopPropagation()}>
        <ul className="menu-tabs">
          {TABS.map((t) => (
            <li key={t} className={t === tab ? 'active' : ''} onClick={() => setTab(t)}>
              {t === tab ? '▶ ' : '　'}
              {t}
            </li>
          ))}
        </ul>
        <div className="menu-body">
          {tab === '人物' && <CharacterPage />}
          {tab === '武功' && <SkillsPage />}
          {tab === '行囊' && <Placeholder text="行囊空空如也。" />}
          {tab === '江湖事' && <Placeholder text="尚未接下任何委託。" />}
          {tab === '系統' && <Placeholder text="存檔、讀檔與設定，之後開放。" />}
        </div>
      </div>
    </div>
  );
}

function CharacterPage() {
  const hero = useGame((s) => s.hero);
  const d = derive(hero);
  return (
    <div>
      <h2>
        {hero.name}　<small>{hero.title}</small>
      </h2>
      <p className="muted">本作沒有人物等級。氣血、內力、體力，皆由五維與武功境界推算而來。</p>
      <table className="attrs">
        <tbody>
          {ATTRS.map((a) => {
            const v = hero.attrs[a.key];
            return (
              <tr key={a.key} title={a.desc}>
                <th>{a.name}</th>
                <td className="realm">{REALMS[v.realm]}</td>
                <td>
                  <div className="exp-track">
                    <div className="exp-fill" style={{ width: `${v.exp}%` }} />
                  </div>
                </td>
                <td className="muted small">{a.desc}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="derived">
        <span>氣血上限 {d.maxHp}</span>
        <span>內力上限 {d.maxQi}</span>
        <span>體力上限 {d.maxStamina}</span>
      </div>
    </div>
  );
}

function SkillsPage() {
  const hero = useGame((s) => s.hero);
  return (
    <div>
      <h2>武功</h2>
      {hero.skills.map((s) => (
        <div key={s.id} className="skill">
          <div className="skill-head">
            <span className="skill-name">{s.name}</span>
            <span className="tag">{s.kind}</span>
            <span className="realm">{REALMS[s.realm]}</span>
          </div>
          <div className="exp-track">
            <div className="exp-fill" style={{ width: `${s.exp}%` }} />
          </div>
          <p className="muted small">{s.desc}</p>
        </div>
      ))}
    </div>
  );
}

function Placeholder({ text }: { text: string }) {
  return <p className="muted placeholder">{text}</p>;
}
