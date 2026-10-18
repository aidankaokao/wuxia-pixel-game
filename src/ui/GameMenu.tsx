import { useEffect, useState } from 'react';
import {
  ATTRS,
  attrParts,
  breakthrough,
  derive,
  effLevel,
  equippedCount,
  expToNext,
  hasManual,
  HIDDEN_CAP,
  ITEMS,
  pointsToNext,
  Skill,
  skillCap,
  skillDef,
  SLOT_LIMIT,
  SKILL_SLOT_NAME,
  Slot,
  slotOf,
  toggleEquip,
  trainWithPoints,
  tryBreakthrough,
} from '../game/character';
import { QUESTS } from '../game/story/quests';
import { describeSave, readSave, SLOT_NAME, SlotId, writeSave } from '../game/save';
import { loadGame, toTitle } from '../game/session';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

const TABS = ['人物', '武功', '行囊', '江湖事', '系統'] as const;
type Tab = (typeof TABS)[number];

/** 「武功」「系統」分頁裡可以用鍵盤選的項目 */
interface SystemRow {
  label: string;
  detail?: string;
  run: () => void;
}

function systemRows(refresh: () => void): SystemRow[] {
  const st = useGame.getState();
  const close = () => st.setMenu(false);
  const save = (slot: SlotId) => {
    st.showToast(writeSave(slot) ? `已存檔至${SLOT_NAME[slot]}` : '存檔失敗');
    refresh();
  };
  const load = (slot: SlotId) => {
    const d = readSave(slot);
    if (!d) return st.showToast('這個檔案是空的');
    close();
    loadGame(d);
    st.showToast(`已讀取${SLOT_NAME[slot]}`);
  };
  const summary = (slot: SlotId) => {
    const d = readSave(slot);
    return d ? describeSave(d) : '（空）';
  };
  return [
    { label: '戰鬥模式：回合制', detail: '半即時制開發中', run: () => st.showToast('半即時制開發中，敬請期待') },
    ...(['1', '2', '3'] as SlotId[]).map((s) => ({ label: `存檔　${SLOT_NAME[s]}`, detail: summary(s), run: () => save(s) })),
    ...(['auto', '1', '2', '3'] as SlotId[]).map((s) => ({ label: `讀檔　${SLOT_NAME[s]}`, detail: summary(s), run: () => load(s) })),
    { label: '回到標題畫面', detail: '會先自動存檔', run: () => (close(), toTitle()) },
  ];
}

const SLOT_ORDER: Slot[] = ['outer', 'inner', 'light'];

/** 武功依欄位分組排序（外功、內功、輕功），選單的列表與游標都照這個順序 */
const sortedSkills = (skills: Skill[]) =>
  SLOT_ORDER.flatMap((slot) => skills.filter((s) => slotOf(skillDef(s).kind) === slot));

/** 對一門武功能做的事 */
function skillActions(id: string): SystemRow[] {
  const st = useGame.getState();
  const s = st.hero.skills.find((k) => k.id === id)!;
  const name = skillDef(s).name;
  const rows: SystemRow[] = [
    {
      label: s.equipped ? '卸下' : '裝備',
      run: () =>
        st.updateHero((c) => {
          const err = toggleEquip(c, id);
          clampAfterEquip(c);
          st.showToast(err ?? `${s.equipped ? '卸下' : '裝備'}了「${name}」`);
        }),
    },
  ];
  const cap = skillCap(s);
  if (s.level < cap) {
    const need = pointsToNext(s);
    rows.push(
      { label: '修練（1 點）', detail: `經驗 +10　剩餘 ${st.hero.points} 點`, run: () => train(id, 1) },
      { label: `修練至第 ${s.level + 1} 重（${need} 點）`, detail: st.hero.points >= need ? '' : '點數不足', run: () => train(id, need) },
    );
  } else if (s.level < HIDDEN_CAP) {
    const { chance, cost } = breakthrough(s);
    rows.push({
      label: `突破至第 ${s.level + 1} 重（${cost} 點）`,
      detail: hasManual(st.hero, id) ? `成功率 ${Math.round(chance * 100)}%` : '需要秘笈',
      run: () => {
        const r = st.updateHero((c) => tryBreakthrough(c, id));
        st.showToast(r.text);
      },
    });
  }
  return rows;
}

function train(id: string, n: number) {
  const st = useGame.getState();
  if (st.hero.points < n) return st.showToast('武學點數不足。');
  st.updateHero((c) => {
    const before = c.skills.find((k) => k.id === id)!.level;
    const spent = trainWithPoints(c, id, n);
    const s = c.skills.find((k) => k.id === id)!;
    st.showToast(s.level > before ? `「${skillDef(s).name}」精進至第 ${s.level} 重！` : `花了 ${spent} 點修練「${skillDef(s).name}」`);
  });
}

/** 卸下內功後內力上限可能變低，目前值跟著修正 */
function clampAfterEquip(c: Parameters<typeof derive>[0]) {
  const d = derive(c);
  c.hp = Math.min(c.hp, d.maxHp);
  c.qi = Math.min(c.qi, d.maxQi);
  c.stamina = Math.min(c.stamina, d.maxStamina);
}

/** 系統選單：左側分頁、右側內容。↑↓ 切換分頁，X/Esc 關閉；「系統」分頁按 E 或 → 進入選項。 */
export function GameMenu() {
  const open = useGame((s) => s.menuOpen);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('人物');
  const [inBody, setInBody] = useState(false);
  const [row, setRow] = useState(0);
  const [, setVersion] = useState(0);
  /** 武功分頁：正在看哪一門的動作清單，與清單裡的游標 */
  const [action, setAction] = useState<number | null>(null);
  const hero = useGame((s) => s.hero);
  const skills = sortedSkills(hero.skills);
  const rows = open && tab === '系統' ? systemRows(() => setVersion((v) => v + 1)) : [];
  const actions = open && tab === '武功' && inBody && action !== null && skills[row] ? skillActions(skills[row].id) : [];
  const hasBody = tab === '系統' || tab === '武功';
  useEffect(() => {
    if (!open) {
      setInBody(false);
      setAction(null);
    }
  }, [open]);

  useKeys(open, (k, e) => {
    if (inBody && tab === '武功') {
      if (action !== null) {
        const n = actions.length;
        if (isUp(k)) setAction((a) => ((a ?? 0) + n - 1) % n);
        else if (isDown(k)) setAction((a) => ((a ?? 0) + 1) % n);
        else if (isConfirm(k)) actions[action]?.run();
        else if (isCancel(k) || isLeft(k)) setAction(null);
        return;
      }
      const n = skills.length;
      if (isUp(k)) setRow((r) => (r + n - 1) % n);
      else if (isDown(k)) setRow((r) => (r + 1) % n);
      else if (isConfirm(k) || isRight(k)) setAction(0);
      else if (isCancel(k) || isLeft(k)) setInBody(false);
      return;
    }
    if (inBody) {
      if (isUp(k)) setRow((r) => (r + rows.length - 1) % rows.length);
      else if (isDown(k)) setRow((r) => (r + 1) % rows.length);
      else if (isConfirm(k)) rows[row]?.run();
      else if (isCancel(k) || isLeft(k)) setInBody(false);
      return;
    }
    const i = TABS.indexOf(tab);
    if (isUp(k)) setTab(TABS[(i + TABS.length - 1) % TABS.length]);
    else if (isDown(k)) setTab(TABS[(i + 1) % TABS.length]);
    else if (isCancel(k)) setMenu(false);
    else if (hasBody && (isConfirm(k) || isRight(k))) {
      setInBody(true);
      setRow(0);
      setAction(null);
    } else if (isConfirm(k)) e.preventDefault();
  });

  if (!open) return null;
  return (
    <div className="menu-backdrop" onClick={() => setMenu(false)}>
      <div className="menu pixel-frame" onClick={(e) => e.stopPropagation()}>
        <ul className="menu-tabs">
          {TABS.map((t) => (
            <li key={t} className={t === tab ? 'active' : ''} onClick={() => (setTab(t), setInBody(false), setAction(null))}>
              {t === tab ? '▶ ' : '　'}
              {t}
            </li>
          ))}
        </ul>
        <div className="menu-body">
          {tab === '人物' && <CharacterPage />}
          {tab === '武功' && (
            <SkillsPage
              skills={skills}
              cursor={inBody ? row : -1}
              actions={actions}
              action={action}
              onPick={(i) => (setInBody(true), setRow(i), setAction(0))}
              onAction={(i) => actions[i]?.run()}
            />
          )}
          {tab === '行囊' && <ItemsPage />}
          {tab === '江湖事' && <QuestsPage />}
          {tab === '系統' && <SystemPage rows={rows} cursor={inBody ? row : -1} onPick={(i) => (setInBody(true), setRow(i), rows[i].run())} />}
        </div>
      </div>
    </div>
  );
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

function CharacterPage() {
  const hero = useGame((s) => s.hero);
  const d = derive(hero);
  const parts = attrParts(hero);
  return (
    <div>
      <h2>
        {hero.name}　<small>{hero.title}</small>
      </h2>
      <p className="muted small">本作沒有人物等級。五維 ＝ 天生底值 ＋ 武功帶來的永久成長 ＋ 裝備中武功的加成。</p>
      <table className="attrs attr-table">
        <thead>
          <tr className="muted small">
            <th />
            <td>總計</td>
            <td>底值</td>
            <td>成長</td>
            <td>裝備</td>
            <td />
          </tr>
        </thead>
        <tbody>
          {ATTRS.map((a) => (
            <tr key={a.key} title={a.desc}>
              <th>{a.name}</th>
              <td className="realm">{Math.floor(parts.total[a.key])}</td>
              <td>{parts.base[a.key]}</td>
              <td className="muted">+{fmt(parts.grow[a.key])}</td>
              <td className={parts.equip[a.key] ? 'good' : 'muted'}>+{fmt(parts.equip[a.key])}</td>
              <td className="muted small">{a.desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="derived">
        <span>氣血 {hero.hp}/{d.maxHp}</span>
        <span>內力 {hero.qi}/{d.maxQi}</span>
        <span>體力 {hero.stamina}/{d.maxStamina}</span>
        <span>武學點數 {hero.points}</span>
      </div>
    </div>
  );
}

function SkillsPage(props: {
  skills: Skill[];
  cursor: number;
  actions: SystemRow[];
  action: number | null;
  onPick: (i: number) => void;
  onAction: (i: number) => void;
}) {
  const hero = useGame((s) => s.hero);
  const { skills, cursor, actions, action } = props;
  return (
    <div>
      <h2>
        武功　<small>武學點數 {hero.points}</small>
      </h2>
      <p className="muted small">
        {SLOT_ORDER.map((s) => `${SKILL_SLOT_NAME[s]} ${equippedCount(hero, s)}/${SLOT_LIMIT[s]}`).join('　')}
        　｜　{cursor < 0 ? '按 E 或 → 開始選擇。' : action === null ? '↑↓ 選擇，E 裝備／修練／突破，X 返回。' : '↑↓ 選擇，E 確定，X 返回。'}
      </p>
      {skills.map((s, i) => {
        const def = skillDef(s);
        const cap = skillCap(s);
        const over = s.level > cap;
        const pct = s.level >= cap ? 100 : (s.exp / expToNext(s.level)) * 100;
        return (
          <div key={s.id} className={`skill selectable ${i === cursor ? 'active' : ''} ${s.equipped ? '' : 'unequipped'}`} onClick={() => props.onPick(i)}>
            <div className="skill-head">
              <span className="skill-name">
                {i === cursor ? '▶ ' : ''}
                {def.name}
              </span>
              <span className="tag">{def.kind}</span>
              <span className="tag muted-tag">{def.tier}</span>
              <span className={over ? 'realm over' : 'realm'}>
                第 {s.level} 重<small className="muted">／{cap} 重{over ? '（已突破）' : ''}</small>
              </span>
              <span className={`equip-mark ${s.equipped ? 'on' : ''}`}>{s.equipped ? '◆ 裝備中' : '◇ 未裝備'}</span>
            </div>
            <div className="exp-track">
              <div className="exp-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="muted small">
              {def.desc}
              {over && `（有效等級 ${fmt(effLevel(s))}）`}
            </p>
            {i === cursor && action !== null && (
              <ul className="system-rows skill-actions">
                {actions.map((r, j) => (
                  <li key={r.label} className={j === action ? 'active' : ''} onClick={(e) => (e.stopPropagation(), props.onAction(j))}>
                    <span>
                      {j === action ? '▶ ' : '　'}
                      {r.label}
                    </span>
                    {r.detail && <span className="muted small">{r.detail}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ItemsPage() {
  const hero = useGame((s) => s.hero);
  const list = Object.entries(hero.items).filter(([, n]) => n > 0);
  return (
    <div>
      <h2>行囊</h2>
      <p className="muted">銀兩 {hero.silver}</p>
      {list.length === 0 && <p className="muted placeholder">行囊空空如也。</p>}
      {list.map(([id, n]) => (
        <div key={id} className="skill">
          <div className="skill-head">
            <span className="skill-name">{ITEMS[id].name}</span>
            {ITEMS[id].manual ? <span className="tag">秘笈</span> : <span className="muted">×{n}</span>}
          </div>
          <p className="muted small">
            {ITEMS[id].desc}
            {ITEMS[id].manual ? '' : '（戰鬥中使用）'}
          </p>
        </div>
      ))}
    </div>
  );
}

function QuestsPage() {
  const flags = useGame((s) => s.flags);
  const list = QUESTS.map((q) => ({ q, st: q.status(flags) })).filter((x) => x.st);
  return (
    <div>
      <h2>江湖事</h2>
      {list.length === 0 && <p className="muted placeholder">尚未接下任何委託。</p>}
      {list.map(({ q, st }) => (
        <div key={q.id} className={`quest ${st!.done ? 'done' : ''}`}>
          <div className="skill-head">
            <span className="skill-name">{q.title}</span>
            <span className={`tag ${st!.done ? 'muted-tag' : ''}`}>{st!.done ? '已完成' : '進行中'}</span>
          </div>
          <p className="small">{st!.text}</p>
        </div>
      ))}
    </div>
  );
}

function SystemPage({ rows, cursor, onPick }: { rows: SystemRow[]; cursor: number; onPick: (i: number) => void }) {
  return (
    <div>
      <h2>系統</h2>
      <p className="muted small">{cursor < 0 ? '按 E 或 → 開始選擇。' : '↑↓ 選擇，E 確定，X 返回。'}遊戲也會在進入地圖、劇情與戰鬥結束時自動存檔。</p>
      <ul className="system-rows">
        {rows.map((r, i) => (
          <li key={r.label} className={i === cursor ? 'active' : ''} onClick={() => onPick(i)}>
            <span>
              {i === cursor ? '▶ ' : '　'}
              {r.label}
            </span>
            {r.detail && <span className="muted small">{r.detail}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
