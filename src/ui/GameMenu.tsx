import { useEffect, useState } from 'react';
import {
  ATTRS,
  attrName,
  attrParts,
  AttrKey,
  breakthrough,
  derive,
  effLevel,
  equipAt,
  expToNext,
  hasManual,
  HIDDEN_CAP,
  ITEMS,
  pointsToNext,
  Skill,
  skillCap,
  skillDef,
  SKILL_SLOT_NAME,
  Slot,
  slotOf,
  slotSkills,
  TIERS,
  trainWithPoints,
  tryBreakthrough,
  unequip,
} from '../game/character';
import { QUESTS } from '../game/story/quests';
import { describeSave, MANUAL_SLOTS, readSave, SLOT_NAME, SlotId, writeSave } from '../game/save';
import { loadGame, toTitle } from '../game/session';
import { Settings, useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

const TABS = ['人物', '武功', '行囊', '江湖事', '系統'] as const;
type Tab = (typeof TABS)[number];

/** 可以用鍵盤選的一列 */
interface Row {
  label: string;
  detail?: string;
  disabled?: boolean;
  run: () => void;
}

/**
 * 系統選單：左側分頁、右側內容。↑↓ 切換分頁，X/Esc 關閉。
 * 「武功」「系統」分頁按 E 或 → 進入內容，內容裡一層一層往下，X 回上一層。
 */
export function GameMenu() {
  const open = useGame((s) => s.menuOpen);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('人物');
  const [inBody, setInBody] = useState(false);
  const hasBody = tab === '武功' || tab === '系統';
  useEffect(() => {
    if (!open) setInBody(false);
  }, [open]);

  useKeys(open && !inBody, (k, e) => {
    const i = TABS.indexOf(tab);
    if (isUp(k)) setTab(TABS[(i + TABS.length - 1) % TABS.length]);
    else if (isDown(k)) setTab(TABS[(i + 1) % TABS.length]);
    else if (isCancel(k)) setMenu(false);
    else if (hasBody && (isConfirm(k) || isRight(k))) setInBody(true);
    else if (isConfirm(k)) e.preventDefault();
  });

  if (!open) return null;
  const exit = () => setInBody(false);
  return (
    <div className="menu-backdrop" onClick={() => setMenu(false)}>
      <div className="menu pixel-frame" onClick={(e) => e.stopPropagation()}>
        <ul className="menu-tabs">
          {TABS.map((t) => (
            <li key={t} className={t === tab ? 'active' : ''} onClick={() => (setTab(t), setInBody(false))}>
              {t === tab ? '▶ ' : '　'}
              {t}
            </li>
          ))}
        </ul>
        <div className="menu-body">
          {tab === '人物' && <CharacterPage />}
          {tab === '武功' && <SkillsPage active={inBody} onEnter={() => setInBody(true)} onExit={exit} />}
          {tab === '行囊' && <ItemsPage />}
          {tab === '江湖事' && <QuestsPage />}
          {tab === '系統' && <SystemPage active={inBody} onEnter={() => setInBody(true)} onExit={exit} />}
        </div>
      </div>
    </div>
  );
}

/** 一列列的選項（系統選單、武功清單共用） */
function RowList({ rows, cursor, onPick }: { rows: Row[]; cursor: number; onPick: (i: number) => void }) {
  return (
    <ul className="system-rows">
      {rows.map((r, i) => (
        <li key={r.label} className={`${i === cursor ? 'active' : ''} ${r.disabled ? 'disabled' : ''}`} onClick={() => onPick(i)}>
          <span>
            {i === cursor ? '▶ ' : '　'}
            {r.label}
          </span>
          {r.detail && <span className="muted small">{r.detail}</span>}
        </li>
      ))}
    </ul>
  );
}

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

// ── 人物 ────────────────────────────────────────────────

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

// ── 武功 ────────────────────────────────────────────────

/** 格子的排法：左欄上面內功兩格、下面輕功一格；右欄外功五格 */
const CELLS: { slot: Slot; pos: number }[] = [
  { slot: 'inner', pos: 0 },
  { slot: 'inner', pos: 1 },
  { slot: 'light', pos: 0 },
  ...[0, 1, 2, 3, 4].map((pos) => ({ slot: 'outer' as Slot, pos })),
];
const LEFT = 3;

/** 格子之間的移動：左欄 0–2、右欄 3–7；在左欄再往左就回到分頁 */
function moveCell(i: number, k: string): number | 'exit' {
  const left = i < LEFT;
  const row = left ? i : i - LEFT;
  if (isUp(k)) return left ? (row + LEFT - 1) % LEFT : LEFT + ((row + 4) % 5);
  if (isDown(k)) return left ? (row + 1) % LEFT : LEFT + ((row + 1) % 5);
  if (isRight(k)) return left ? LEFT + row : i;
  if (isLeft(k)) return left ? 'exit' : Math.min(row, LEFT - 1);
  return i;
}

type SkillLayer = 'grid' | 'list' | 'act';

function SkillsPage({ active, onEnter, onExit }: { active: boolean; onEnter: () => void; onExit: () => void }) {
  const hero = useGame((s) => s.hero);
  const [layer, setLayer] = useState<SkillLayer>('grid');
  const [cell, setCell] = useState(0);
  const [row, setRow] = useState(0);
  const [act, setAct] = useState(0);
  useEffect(() => {
    if (!active) setLayer('grid');
  }, [active]);

  const { slot, pos } = CELLS[cell];
  const inCell = slotSkills(hero, slot)[pos];
  const toast = useGame.getState().showToast;
  const doEquip = (id: string) => {
    toast(
      useGame.getState().updateHero((c) => {
        const m = equipAt(c, id, pos);
        clampVitals(c);
        return m;
      }),
    );
    setLayer('grid');
  };
  const doUnequip = (id: string) => {
    toast(
      useGame.getState().updateHero((c) => {
        const m = unequip(c, id);
        clampVitals(c);
        return m;
      }),
    );
    setLayer('grid');
  };

  // 第二層：這類武功的清單（這格有裝東西時，第一列是「卸下」）
  const candidates = hero.skills.filter((s) => slotOf(skillDef(s).kind) === slot);
  const listRows: (Row & { skill?: Skill })[] = [
    ...(inCell ? [{ label: `卸下「${skillDef(inCell).name}」`, run: () => doUnequip(inCell.id) }] : []),
    ...candidates.map((s) => ({
      label: skillDef(s).name,
      skill: s,
      detail: s === inCell ? '◆ 裝在這一格' : s.pos !== null ? `◆ 裝在第 ${s.pos + 1} 格` : '◇ 未裝備',
      run: () => doEquip(s.id),
    })),
  ];
  const listSkill = listRows[row]?.skill;
  const actRows = layer === 'act' && listSkill ? trainRows(listSkill.id) : [];
  const focus = layer === 'grid' ? inCell : listSkill;

  useKeys(active, (k) => {
    if (layer === 'grid') {
      if (isCancel(k)) return onExit();
      if (isConfirm(k)) {
        setLayer('list');
        // 游標先停在這格裝的武功上，沒有就停在第一門
        const idx = listRows.findIndex((r) => r.skill && r.skill === inCell);
        setRow(idx >= 0 ? idx : 0);
        return;
      }
      const next = moveCell(cell, k);
      if (next === 'exit') onExit();
      else setCell(next);
      return;
    }
    if (layer === 'list') {
      const n = listRows.length;
      if (!n) {
        if (isCancel(k) || isLeft(k) || isConfirm(k)) setLayer('grid');
        return;
      }
      if (isUp(k)) setRow((r) => (r + n - 1) % n);
      else if (isDown(k)) setRow((r) => (r + 1) % n);
      else if (isConfirm(k)) listRows[row]?.run();
      else if (isRight(k) && listSkill) (setLayer('act'), setAct(0));
      else if (isCancel(k) || isLeft(k)) setLayer('grid');
      return;
    }
    const n = actRows.length;
    if (isUp(k)) setAct((a) => (a + n - 1) % n);
    else if (isDown(k)) setAct((a) => (a + 1) % n);
    else if (isConfirm(k)) actRows[act]?.run();
    else if (isCancel(k) || isLeft(k)) setLayer('list');
  });

  const hint = !active
    ? '按 E 或 → 開始選擇欄位。'
    : layer === 'grid'
      ? '方向鍵選欄位，E 選擇要裝的武功，X 返回。'
      : layer === 'list'
        ? '↑↓ 選擇，E 裝備到這一格，→ 修練／突破，X 返回。'
        : '↑↓ 選擇，E 確定，X 返回。';

  const cellView = (i: number) => {
    const c = CELLS[i];
    const s = slotSkills(hero, c.slot)[c.pos];
    const on = active && i === cell;
    return (
      <div
        key={i}
        className={`skill-cell ${s ? 'filled' : 'empty'} ${on ? 'active' : ''} ${on && layer !== 'grid' ? 'open' : ''}`}
        onClick={() => (onEnter(), setCell(i), setLayer('grid'))}
      >
        {s ? (
          <>
            <span className={`book kind-${slotOf(skillDef(s).kind)}`} />
            <span className="cell-name">{skillDef(s).name}</span>
            <span className="cell-level">{s.level}重</span>
          </>
        ) : (
          <span className="cell-empty">空</span>
        )}
      </div>
    );
  };

  return (
    <div className="skills-page">
      <h2>
        武功　<small>武學點數 {hero.points}</small>
      </h2>
      <p className="muted small">{hint}</p>
      <div className="skill-board">
        <div className="skill-col">
          <div className="col-title">內功</div>
          {cellView(0)}
          {cellView(1)}
          <div className="col-title">輕功</div>
          {cellView(2)}
        </div>
        <div className="skill-col">
          <div className="col-title">外功</div>
          {[3, 4, 5, 6, 7].map(cellView)}
        </div>
        <div className="skill-side">
          {layer === 'grid' || !active ? (
            focus ? (
              <SkillDetail s={focus} />
            ) : (
              <p className="muted small">這一格還沒裝備武功。{active ? `按 E 從${SKILL_SLOT_NAME[slot]}清單裡挑一門。` : ''}</p>
            )
          ) : (
            <>
              <div className="col-title">
                {SKILL_SLOT_NAME[slot]}第 {pos + 1} 格
              </div>
              {listRows.length ? (
                <RowList rows={listRows} cursor={layer === 'list' ? row : -1} onPick={(i) => (setRow(i), listRows[i].run())} />
              ) : (
                <p className="muted small">還沒有學會任何{SKILL_SLOT_NAME[slot]}。</p>
              )}
              {layer === 'act' && listSkill && (
                <div className="act-box">
                  <div className="col-title">修練「{skillDef(listSkill).name}」</div>
                  <RowList rows={actRows} cursor={act} onPick={(i) => actRows[i].run()} />
                </div>
              )}
              {focus && <SkillDetail s={focus} />}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** 武功的說明：重數、經驗、加成 */
function SkillDetail({ s }: { s: Skill }) {
  const def = skillDef(s);
  const cap = skillCap(s);
  const over = s.level > cap;
  const pct = s.level >= cap ? 100 : (s.exp / expToNext(s.level)) * 100;
  const m = effLevel(s) * TIERS[def.tier].mult;
  const bonus = (o: Partial<Record<AttrKey, number>>) =>
    (Object.entries(o) as [AttrKey, number][]).map(([k, v]) => `${attrName(k)} +${fmt(v * m)}`).join('　') || '無';
  return (
    <div className="skill-detail">
      <div className="skill-head">
        <span className="skill-name">{def.name}</span>
        <span className="tag">{def.kind}</span>
        <span className="tag muted-tag">{def.tier}</span>
      </div>
      <div className={over ? 'realm over' : 'realm'}>
        第 {s.level} 重<small className="muted">／{cap} 重{over ? `（已突破，有效 ${fmt(effLevel(s))} 重）` : ''}</small>
      </div>
      <div className="exp-track">
        <div className="exp-fill" style={{ width: `${pct}%` }} />
      </div>
      <p className="small">裝備加成：{bonus(def.equip)}</p>
      <p className="small muted">永久成長：{bonus(def.grow)}</p>
      <p className="muted small">{def.desc}</p>
    </div>
  );
}

/** 修練與突破 */
function trainRows(id: string): Row[] {
  const st = useGame.getState();
  const s = st.hero.skills.find((k) => k.id === id)!;
  const cap = skillCap(s);
  if (s.level < cap) {
    const need = pointsToNext(s);
    return [
      { label: '修練（1 點）', detail: `經驗 +10　剩 ${st.hero.points} 點`, disabled: st.hero.points < 1, run: () => train(id, 1) },
      { label: `修練至第 ${s.level + 1} 重（${need} 點）`, disabled: st.hero.points < need, run: () => train(id, need) },
    ];
  }
  if (s.level >= HIDDEN_CAP) return [{ label: '已臻化境，再無可進', disabled: true, run: () => {} }];
  const { chance, cost } = breakthrough(s);
  const manual = hasManual(st.hero, id);
  return [
    {
      label: `突破至第 ${s.level + 1} 重（${cost} 點）`,
      detail: manual ? `成功率 ${Math.round(chance * 100)}%　剩 ${st.hero.points} 點` : '需要秘笈',
      disabled: !manual || st.hero.points < cost,
      run: () => st.showToast(st.updateHero((c) => tryBreakthrough(c, id)).text),
    },
  ];
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
function clampVitals(c: Parameters<typeof derive>[0]) {
  const d = derive(c);
  c.hp = Math.min(c.hp, d.maxHp);
  c.qi = Math.min(c.qi, d.maxQi);
  c.stamina = Math.min(c.stamina, d.maxStamina);
}

// ── 行囊、江湖事 ─────────────────────────────────────────

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

// ── 系統 ────────────────────────────────────────────────

type SysLayer = 'root' | 'save' | 'load' | 'settings';
const SYS_TITLE: Record<SysLayer, string> = { root: '系統', save: '存檔', load: '讀檔', settings: '遊戲設定' };

function SystemPage({ active, onEnter, onExit }: { active: boolean; onEnter: () => void; onExit: () => void }) {
  const [layer, setLayer] = useState<SysLayer>('root');
  const [cursor, setCursor] = useState(0);
  const [, setVersion] = useState(0);
  const settings = useGame((s) => s.settings);
  useEffect(() => {
    if (!active) setLayer('root');
  }, [active]);

  const st = useGame.getState();
  const go = (l: SysLayer) => (setLayer(l), setCursor(0));
  const summary = (slot: SlotId) => {
    const d = readSave(slot);
    return d ? describeSave(d) : '（空）';
  };
  const setSetting = (s: Partial<Settings>) => st.setSettings(s);

  const rows: Row[] =
    layer === 'root'
      ? [
          { label: '存檔', detail: '存到檔案一～三', run: () => go('save') },
          { label: '讀檔', detail: '即時、自動或手動存檔', run: () => go('load') },
          { label: '遊戲設定', detail: '戰鬥模式、自動戰鬥', run: () => go('settings') },
          { label: '回到標題畫面', detail: '會先自動存檔', run: () => (st.setMenu(false), toTitle()) },
        ]
      : layer === 'save'
        ? MANUAL_SLOTS.map((s) => ({
            label: SLOT_NAME[s],
            detail: summary(s),
            run: () => {
              st.showToast(writeSave(s) ? `已存檔至${SLOT_NAME[s]}` : '存檔失敗');
              setVersion((v) => v + 1);
            },
          }))
        : layer === 'load'
          ? (['quick', 'auto', ...MANUAL_SLOTS] as SlotId[]).map((s) => ({
              label: SLOT_NAME[s],
              detail: summary(s),
              disabled: !readSave(s),
              run: () => {
                const d = readSave(s);
                if (!d) return st.showToast('這個檔案是空的');
                st.setMenu(false);
                loadGame(d);
                st.showToast(`已讀取${SLOT_NAME[s]}`);
              },
            }))
          : [
              { label: '戰鬥模式：回合制', detail: '半即時制開發中', run: () => st.showToast('半即時制開發中，敬請期待') },
              {
                label: `自動戰鬥方針：${settings.autoTactic === 'steady' ? '穩健' : '猛攻'}`,
                detail: settings.autoTactic === 'steady' ? '見敵蓄勢就防禦，氣血低於三成補血' : '只管出招，氣血低於兩成才補血',
                run: () => setSetting({ autoTactic: settings.autoTactic === 'steady' ? 'aggressive' : 'steady' }),
              },
              {
                label: `自動戰鬥用藥：${settings.autoItems ? '使用' : '不使用'}`,
                detail: '不使用可避免刷怪時把藥吃光',
                run: () => setSetting({ autoItems: !settings.autoItems }),
              },
            ];

  useKeys(active, (k) => {
    const n = rows.length;
    if (isUp(k)) setCursor((c) => (c + n - 1) % n);
    else if (isDown(k)) setCursor((c) => (c + 1) % n);
    else if (isConfirm(k) || (layer === 'settings' && (isRight(k) || isLeft(k)))) rows[cursor]?.run();
    else if (isCancel(k) || isLeft(k)) {
      if (layer === 'root') onExit();
      else {
        setCursor((['save', 'load', 'settings'] as SysLayer[]).indexOf(layer));
        setLayer('root');
      }
    }
  });

  return (
    <div>
      <h2>
        {layer === 'root' ? (
          '系統'
        ) : (
          <>
            系統 <small>› {SYS_TITLE[layer]}</small>
          </>
        )}
      </h2>
      <p className="muted small">
        {!active ? '按 E 或 → 開始選擇。' : layer === 'settings' ? '↑↓ 選擇，E 或 ←→ 切換，X 返回。' : '↑↓ 選擇，E 確定，X 返回。'}
        {layer === 'root' && '隨時可按 Ctrl+S（Mac 為 ⌘S）即時存檔、F9 讀取即時存檔。'}
        {layer === 'settings' && '戰鬥中按 Q 開關自動戰鬥。'}
      </p>
      <RowList rows={rows} cursor={active ? cursor : -1} onPick={(i) => (onEnter(), setCursor(i), rows[i].run())} />
    </div>
  );
}
