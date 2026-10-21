import { useEffect, useRef, useState } from 'react';
import {
  attrName,
  AttrKey,
  breakthrough,
  derive,
  effLevel,
  equipAt,
  expToNext,
  hasManual,
  HIDDEN_CAP,
  ITEM_CATEGORIES,
  ItemCategory,
  ITEMS,
  nextMove,
  pointsToNext,
  Skill,
  sortItems,
  swapItems,
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
  consumeItem,
  equipGear,
  usable,
  usableInBattle,
  bagCapacity,
  bagUsed,
} from '../game/character';
import { itemIconUrl } from '../game/art/items';
import { MOVES } from '../game/battle/moves';
import { QUESTS } from '../game/story/quests';
import { todayTasks } from '../game/daily';
import { TaskList } from './MorningBrief';
import { describeSave, MANUAL_SLOTS, readSave, SLOT_NAME, SlotId, writeSave } from '../game/save';
import { loadGame, toTitle } from '../game/session';
import { Settings, useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';
import { CharacterPage } from './CharacterPage';
import { PeoplePage } from './PeoplePage';
import { SectPage } from './SectPage';

const TABS = ['人物', '武功', '行囊', '門派', '交遊', '江湖事', '系統'] as const;
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
 * 「武功」「行囊」「系統」分頁按 E 或 → 進入內容，內容裡一層一層往下，X 回上一層。
 */
export function GameMenu() {
  const open = useGame((s) => s.menuOpen);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('人物');
  const [inBody, setInBody] = useState(false);
  const hasBody = tab === '人物' || tab === '武功' || tab === '系統' || tab === '行囊' || tab === '門派' || tab === '交遊';
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
          {tab === '人物' && <CharacterPage active={inBody} onExit={exit} />}
          {tab === '武功' && <SkillsPage active={inBody} onEnter={() => setInBody(true)} onExit={exit} />}
          {tab === '行囊' && <ItemsPage active={inBody} onEnter={() => setInBody(true)} onExit={exit} />}
          {tab === '門派' && <SectPage active={inBody} onExit={exit} />}
          {tab === '交遊' && <PeoplePage active={inBody} onExit={exit} />}
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
      <div className="move-list">
        <div className="col-title">
          招式 {s.moves.length}/{def.moves.length}
        </div>
        {def.moves.map((mv) => {
          const known = s.moves.includes(mv.id);
          const isNext = nextMove(s)?.id === mv.id;
          return (
            <div key={mv.id} className={`move-row ${known ? '' : 'unknown'}`} title={known ? MOVES[mv.id].desc : ''}>
              <span>
                {known ? '◆ ' : '◇ '}
                {known ? MOVES[mv.id].name : '？？？'}
              </span>
              <span className="muted small">
                {known
                  ? MOVES[mv.id].qi
                    ? `內力 ${MOVES[mv.id].qi}`
                    : ''
                  : s.level < mv.level
                    ? `第 ${mv.level} 重後可悟`
                    : isNext
                      ? `領悟 ${s.insight}%`
                      : '尚未參透'}
              </span>
            </div>
          );
        })}
        {nextMove(s) && <p className="muted small">在戰鬥中使用這門武功，就有機會悟出新招；悟出時武功也會精進一重。</p>}
      </div>
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

const BAG_COLS = 6;
const BAG_MIN = 24;
type BagCat = '全部' | ItemCategory;
const BAG_CATS: BagCat[] = ['全部', ...ITEM_CATEGORIES];
type BagLayer = 'cats' | 'grid' | 'act' | 'move';

/** 行囊：左邊分類與「重新整理」，右邊一格一格的物品。E 開啟動作（使用、移動）。 */
function ItemsPage({ active, onEnter, onExit }: { active: boolean; onEnter: () => void; onExit: () => void }) {
  const hero = useGame((s) => s.hero);
  const [layer, setLayer] = useState<BagLayer>('cats');
  const [cat, setCat] = useState(0);
  const [cell, setCell] = useState(0);
  const [act, setAct] = useState(0);
  /** 移動中的物品 */
  const [held, setHeld] = useState<string | null>(null);
  useEffect(() => {
    if (!active) (setLayer('cats'), setHeld(null));
  }, [active]);

  const st = useGame.getState();
  const category = BAG_CATS[cat];
  const ids = Object.keys(hero.items).filter((id) => hero.items[id] > 0 && ITEMS[id] && (category === '全部' || ITEMS[id].category === category));
  const total = Math.max(BAG_MIN, Math.ceil((ids.length + 1) / BAG_COLS) * BAG_COLS);
  const selected = layer === 'cats' ? undefined : ids[cell];
  const sortRow = BAG_CATS.length;

  const actRows: Row[] = selected
    ? [
        ...(usable(selected)
          ? [
              {
                label: '使用',
                run: () => {
                  const msg = st.updateHero((c) => consumeItem(c, selected));
                  st.showToast(msg);
                  if (!useGame.getState().hero.items[selected]) setLayer('grid');
                },
              },
            ]
          : []),
        ...(ITEMS[selected].gear
          ? [
              {
                label: '穿上',
                detail: '穿到身上（換下的放回行囊）',
                run: () => {
                  st.showToast(st.updateHero((c) => equipGear(c, selected)));
                  if (!useGame.getState().hero.items[selected]) setLayer('grid');
                },
              },
            ]
          : []),
        { label: '移動', detail: '換到別的格子', run: () => (setHeld(selected), setLayer('move')) },
      ]
    : [];

  const tidy = () => {
    st.updateHero((c) => sortItems(c));
    st.showToast('行囊已整理');
  };
  /** 放下移動中的物品：放在別的物品上就對調，放在空格就排到最後 */
  const drop = () => {
    const target = ids[cell];
    st.updateHero((c) => {
      if (!held) return;
      if (target && target !== held) swapItems(c, held, target);
      else if (!target) {
        const n = c.items[held];
        delete c.items[held];
        c.items[held] = n;
      }
    });
    setHeld(null);
    setLayer('grid');
    const keys = Object.keys(useGame.getState().hero.items).filter((id) => category === '全部' || ITEMS[id].category === category);
    setCell(Math.max(0, keys.indexOf(held!)));
  };

  const moveCellBy = (k: string): boolean => {
    const col = cell % BAG_COLS;
    if (isUp(k)) setCell((c) => (c - BAG_COLS + total) % total);
    else if (isDown(k)) setCell((c) => (c + BAG_COLS) % total);
    else if (isRight(k)) setCell((c) => (col === BAG_COLS - 1 ? c - col : c + 1));
    else if (isLeft(k)) {
      if (col === 0) return false;
      setCell((c) => c - 1);
    } else return false;
    return true;
  };

  useKeys(active, (k) => {
    if (layer === 'cats') {
      const n = BAG_CATS.length + 1;
      if (isUp(k)) setCat((c) => (c + n - 1) % n);
      else if (isDown(k)) setCat((c) => (c + 1) % n);
      else if (isConfirm(k) || isRight(k)) {
        if (cat === sortRow) return isConfirm(k) && tidy();
        setLayer('grid');
        setCell(0);
      } else if (isCancel(k) || isLeft(k)) onExit();
      return;
    }
    if (layer === 'grid') {
      if (isConfirm(k) && selected) (setLayer('act'), setAct(0));
      else if (isCancel(k)) setLayer('cats');
      else if (!moveCellBy(k) && isLeft(k)) setLayer('cats');
      return;
    }
    if (layer === 'act') {
      const n = actRows.length;
      if (isUp(k)) setAct((a) => (a + n - 1) % n);
      else if (isDown(k)) setAct((a) => (a + 1) % n);
      else if (isConfirm(k)) actRows[act]?.run();
      else if (isCancel(k) || isLeft(k)) setLayer('grid');
      return;
    }
    // 移動中
    if (isConfirm(k)) drop();
    else if (isCancel(k)) (setHeld(null), setLayer('grid'));
    else moveCellBy(k);
  });


  const hint = !active
    ? '按 E 或 → 開始選擇。'
    : layer === 'cats'
      ? '↑↓ 選擇分類，E 或 → 進入物品格，X 返回。'
      : layer === 'grid'
        ? '方向鍵選擇物品，E 使用或移動，X 返回分類。'
        : layer === 'act'
          ? '↑↓ 選擇，E 確定，X 返回。'
          : '方向鍵選擇位置，E 放下（放在別的物品上會對調），X 取消。';

  const focus = held ?? selected;
  return (
    <div className="bag-page">
      <h2>
        行囊　<small>
          銀兩 {hero.silver}　已用 {bagUsed(hero)}/{bagCapacity(hero)} 格
        </small>
      </h2>
      <p className="muted small">{hint}</p>
      <div className="bag-board">
        <ul className="bag-cats">
          {BAG_CATS.map((c, i) => (
            <li
              key={c}
              className={`${i === cat ? 'current' : ''} ${active && layer === 'cats' && i === cat ? 'active' : ''}`}
              onClick={() => (onEnter(), setCat(i), setLayer('grid'), setCell(0))}
            >
              {active && layer === 'cats' && i === cat ? '▶ ' : '　'}
              {c}
            </li>
          ))}
          <li
            className={`bag-sort ${active && layer === 'cats' && cat === sortRow ? 'active' : ''}`}
            onClick={() => (onEnter(), setCat(sortRow), tidy())}
          >
            {active && layer === 'cats' && cat === sortRow ? '▶ ' : '　'}重新整理
          </li>
        </ul>
        <div className="bag-main">
          <div className="bag-grid" style={{ gridTemplateColumns: `repeat(${BAG_COLS}, 1fr)` }}>
            {Array.from({ length: total }, (_, i) => {
              const id = ids[i];
              const on = active && layer !== 'cats' && i === cell;
              return (
                <div
                  key={i}
                  className={`bag-cell ${id ? 'filled' : ''} ${on ? 'active' : ''} ${held && id === held ? 'lifted' : ''}`}
                  onClick={() => {
                    onEnter();
                    setCell(i);
                    if (layer === 'move') return;
                    setLayer(ids[i] ? 'act' : 'grid');
                    setAct(0);
                  }}
                >
                  {id && (
                    <>
                      <img src={itemIconUrl(ITEMS[id].icon)} alt={ITEMS[id].name} />
                      {!ITEMS[id].manual && <span className="bag-count">{hero.items[id]}</span>}
                    </>
                  )}
                  {/* 移動中：拿起的物品跟著游標 */}
                  {on && held && <img className="bag-held" src={itemIconUrl(ITEMS[held].icon)} alt="" />}
                </div>
              );
            })}
          </div>
          <div className="bag-detail">
            {focus ? (
              <>
                <div className="skill-head">
                  <img className="bag-big" src={itemIconUrl(ITEMS[focus].icon)} alt="" />
                  <span className="skill-name">{ITEMS[focus].name}</span>
                  <span className="tag">{ITEMS[focus].category}</span>
                  {!ITEMS[focus].manual && <span className="muted">×{hero.items[focus]}</span>}
                </div>
                <p className="muted small">
                  {ITEMS[focus].desc}
                  {usableInBattle(focus) ? '（戰鬥中或行囊裡都能使用）' : usable(focus) ? '（在行囊裡使用）' : ''}
                </p>
                {layer === 'act' && <RowList rows={actRows} cursor={act} onPick={(i) => actRows[i].run()} />}
              </>
            ) : (
              <p className="muted small">{ids.length ? '選一格看看物品的說明。' : category === '全部' ? '行囊空空如也。' : `沒有${category}。`}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestsPage() {
  const flags = useGame((s) => s.flags);
  const hero = useGame((s) => s.hero);
  const world = useGame((s) => s.world);
  // 進行中的排前面
  const list = QUESTS.map((q) => ({ q, st: q.status(flags) }))
    .filter((x) => x.st)
    .sort((a, b) => Number(a.st!.done) - Number(b.st!.done));
  return (
    <div className="quests-page">
      <h2>江湖事</h2>
      <h3>今日</h3>
      <TaskList tasks={todayTasks({ hero, flags, world })} />
      <h3>長期</h3>
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
  const setSetting = (s: Partial<Settings>) => st.setSettings(s);
  const slotList: SlotId[] = layer === 'save' ? MANUAL_SLOTS : ['quick', 'auto', ...MANUAL_SLOTS];
  // 存檔：先確認（已經有存檔的要確認覆蓋）
  const saveTo = async (s: SlotId) => {
    const d = readSave(s);
    const ok = await st.askConfirm(d ? `要覆蓋「${SLOT_NAME[s]}」嗎？\n原本：${describeSave(d)}` : `要存到「${SLOT_NAME[s]}」嗎？`, d ? '覆蓋' : '存檔');
    if (!ok) return;
    st.showToast(writeSave(s) ? `已存檔至${SLOT_NAME[s]}` : '存檔失敗');
    setVersion((v) => v + 1);
  };
  const loadFrom = async (s: SlotId) => {
    const d = readSave(s);
    if (!d) return st.showToast('這個檔案是空的');
    const ok = await st.askConfirm(`要讀取「${SLOT_NAME[s]}」嗎？\n${describeSave(d)}\n\n目前還沒存檔的進度會遺失。`, '讀取');
    if (!ok) return;
    st.setMenu(false);
    loadGame(d);
    st.showToast(`已讀取${SLOT_NAME[s]}`);
  };

  const rows: Row[] =
    layer === 'root'
      ? [
          { label: '存檔', detail: `存到檔案一～${SLOT_NAME[MANUAL_SLOTS[MANUAL_SLOTS.length - 1]].slice(2)}`, run: () => go('save') },
          { label: '讀檔', detail: '即時、自動或手動存檔', run: () => go('load') },
          { label: '遊戲設定', detail: '戰鬥模式、自動戰鬥', run: () => go('settings') },
          { label: '回到標題畫面', detail: '會先自動存檔', run: () => (st.setMenu(false), toTitle()) },
        ]
      : layer === 'save' || layer === 'load'
        ? slotList.map((s) => ({ label: SLOT_NAME[s], disabled: layer === 'load' && !readSave(s), run: () => (layer === 'save' ? saveTo(s) : loadFrom(s)) }))
          : [
              {
                label: `戰鬥模式：${settings.battleMode === 'turn' ? '回合制' : '半即時制'}`,
                detail: settings.battleMode === 'turn' ? '依速度排順序，輪流出手' : '行動條跑滿才能出手，速度越快出手越多',
                run: () => setSetting({ battleMode: settings.battleMode === 'turn' ? 'active' : 'turn' }),
              },
              {
                label: `半即時制選指令時：${settings.atbWait ? '暫停' : '不暫停'}`,
                detail: settings.atbWait ? '等待模式：慢慢想，時間會停住' : '即時模式：想太久敵人會先出手',
                disabled: settings.battleMode === 'turn',
                run: () => setSetting({ atbWait: !settings.atbWait }),
              },
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
        {layer === 'save' && '選一個欄位存檔，已經有存檔的會先問要不要覆蓋。'}
        {layer === 'settings' && '戰鬥中按 Q 開關自動戰鬥。'}
      </p>
      {layer === 'save' || layer === 'load' ? (
        <SlotBars slots={slotList} cursor={active ? cursor : -1} mode={layer} onPick={(i) => (onEnter(), setCursor(i), rows[i].run())} />
      ) : (
        <RowList rows={rows} cursor={active ? cursor : -1} onPick={(i) => (onEnter(), setCursor(i), rows[i].run())} />
      )}
    </div>
  );
}

/** 存檔欄：一條一條的欄位，空的顯示「空白」；游標所在的捲到看得見 */
function SlotBars({ slots, cursor, mode, onPick }: { slots: SlotId[]; cursor: number; mode: 'save' | 'load'; onPick: (i: number) => void }) {
  const ref = useRef<HTMLUListElement>(null);
  useEffect(() => {
    ref.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [cursor]);
  return (
    <ul className="save-slots" ref={ref}>
      {slots.map((s, i) => {
        const d = readSave(s);
        return (
          <li key={s} className={`save-slot pixel-frame ${i === cursor ? 'active' : ''} ${!d && mode === 'load' ? 'disabled' : ''}`} onClick={() => onPick(i)}>
            <span className="save-slot-name">
              {i === cursor ? '▶ ' : '　'}
              {SLOT_NAME[s]}
            </span>
            {d ? <span className="save-slot-info">{describeSave(d)}</span> : <span className="save-slot-info muted">— 空白 —</span>}
          </li>
        );
      })}
    </ul>
  );
}
