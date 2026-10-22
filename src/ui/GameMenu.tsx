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
  SLOT_LIMIT,
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
import { todayTasks, WEATHER_LINE } from '../game/daily';
import { dateText, festivalOf, isXunxiu, timeText, WEATHER_NAME } from '../game/time';
import { TaskList } from './MorningBrief';
import { describeSave, MANUAL_SLOTS, readSave, SLOT_NAME, SlotId, writeSave } from '../game/save';
import { loadGame, toTitle } from '../game/session';
import { Settings, useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';
import { CharacterPage, GearInfo } from './CharacterPage';
import { CraftsPage } from './CraftsPage';
import { PeoplePage } from './PeoplePage';
import { SectPage } from './SectPage';
import { PageHead, Paper, Row, RowList, Sheet, Spread } from './Paper';
import { ItemEffects } from './ItemEffects';

const TABS = ['人物', '武功', '技能', '行囊', '門派', '交遊', '江湖事', '系統'] as const;
type Tab = (typeof TABS)[number];

/** 每一頁共用的參數：active 時按鍵歸這一頁，onExit 回到書籤 */
interface PageProps {
  active: boolean;
  onExit: () => void;
  folio: number;
}

/**
 * 系統選單：一本攤開的書。上緣是書籤（分頁），←→ 翻頁（有翻頁動畫）；E 或 ↓ 進入這一頁，
 * 頁裡 X 回到書籤。翻閱中也能用 Tab／Shift+Tab、[ ]、PageUp／PageDown 直接翻到別頁。
 * 每一頁是左右兩面的概覽，選中一項按 E 會攤開一張紙（`Paper`），細節與動作都在紙上。
 */
export function GameMenu() {
  const open = useGame((s) => s.menuOpen);
  const setMenu = useGame((s) => s.setMenu);
  const [tab, setTab] = useState<Tab>('人物');
  const [inBody, setInBody] = useState(false);
  const [turn, setTurn] = useState<{ dir: 'next' | 'prev'; n: number } | null>(null);
  useEffect(() => {
    if (!open) (setInBody(false), setTurn(null));
  }, [open]);

  const flip = (to: Tab) => {
    if (to === tab) return;
    setTurn((t) => ({ dir: TABS.indexOf(to) > TABS.indexOf(tab) ? 'next' : 'prev', n: (t?.n ?? 0) + 1 }));
    setTab(to);
    setInBody(false);
  };
  const by = (d: number) => TABS[(TABS.indexOf(tab) + d + TABS.length) % TABS.length];

  useKeys(open, (k, e) => {
    if (k === 'Tab' || k === '[' || k === ']' || k === 'PageUp' || k === 'PageDown') {
      e.preventDefault();
      return flip(by(k === '[' || k === 'PageUp' || (k === 'Tab' && e.shiftKey) ? -1 : 1));
    }
    if (inBody) return;
    if (isLeft(k)) flip(by(-1));
    else if (isRight(k)) flip(by(1));
    else if (isCancel(k)) setMenu(false);
    else if (isConfirm(k) || isDown(k)) (e.preventDefault(), setInBody(true));
  });

  if (!open) return null;
  const props: PageProps = { active: inBody, onExit: () => setInBody(false), folio: TABS.indexOf(tab) };
  return (
    <div className="menu-backdrop" onClick={() => setMenu(false)}>
      <div className="tome" onClick={(e) => e.stopPropagation()}>
        <ul className="tome-tabs">
          {TABS.map((t) => (
            <li key={t} className={t === tab ? 'active' : ''} onClick={() => (t === tab ? setInBody(true) : flip(t))}>
              {t}
            </li>
          ))}
        </ul>
        <div className="tome-cover">
          <div className={`tome-spread ${inBody ? 'reading' : ''}`} key={tab} onClick={() => !inBody && setInBody(true)}>
            {tab === '人物' && <CharacterPage {...props} />}
            {tab === '武功' && <SkillsPage {...props} />}
            {tab === '技能' && <CraftsPage {...props} />}
            {tab === '行囊' && <ItemsPage {...props} />}
            {tab === '門派' && <SectPage {...props} />}
            {tab === '交遊' && <PeoplePage {...props} />}
            {tab === '江湖事' && <QuestsPage {...props} />}
            {tab === '系統' && <SystemPage {...props} />}
          </div>
          {turn && (
            <div
              key={turn.n}
              className={`tome-turn ${turn.dir}`}
              onAnimationEnd={(e) => e.animationName.startsWith('turn-') && setTurn(null)}
            >
              <LeafStrip n={LEAF_STRIPS} />
              <div className="turn-shadow" />
            </div>
          )}
        </div>
        <p className="tome-help">{inBody ? 'Tab／[ ] 翻到別頁　X 回到書籤' : '←→ 翻頁　E／↓ 翻閱這一頁　X 闔上'}</p>
      </div>
    </div>
  );
}

/** 翻過去的那張紙切成幾條，一條接一條各彎一點，整張紙就有弧度 */
const LEAF_STRIPS = 10;

/** 一條紙：正反兩面，後面接著下一條（巢狀，彎曲角度會一路累加） */
function LeafStrip({ n }: { n: number }) {
  return (
    <div className="turn-strip">
      <div className="leaf-face front" />
      <div className="leaf-face back" />
      {n > 1 && <LeafStrip n={n - 1} />}
    </div>
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

/** 格子之間的移動：左欄 0–2、右欄 3–7；右欄再往右由呼叫端接到右頁 */
function moveCell(i: number, k: string): number | 'exit' {
  const left = i < LEFT;
  const row = left ? i : i - LEFT;
  if (isUp(k)) return left ? (row + LEFT - 1) % LEFT : LEFT + ((row + 4) % 5);
  if (isDown(k)) return left ? (row + 1) % LEFT : LEFT + ((row + 1) % 5);
  if (isRight(k)) return left ? LEFT + row : i;
  if (isLeft(k)) return left ? 'exit' : Math.min(row, LEFT - 1);
  return i;
}

type SkillOpen = { kind: 'cell' } | { kind: 'skill'; id: string } | null;
const SLOT_ORDER: Slot[] = ['inner', 'light', 'outer'];

/**
 * 武功：左頁是裝備欄（內功兩格、輕功一格、外功五格），右頁是所學的武功。
 * 在格子上按 E 攤開「挑一門裝上」的紙；在右頁的武功上按 E 攤開武功的細節（招式、加成、修練、突破、裝到哪一格）。
 */
function SkillsPage({ active, onExit, folio }: PageProps) {
  const hero = useGame((s) => s.hero);
  const [side, setSide] = useState<'grid' | 'list'>('grid');
  const [cell, setCell] = useState(0);
  const [row, setRow] = useState(0);
  const [open, setOpen] = useState<SkillOpen>(null);
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    if (!active) (setOpen(null), setSide('grid'));
  }, [active]);
  useEffect(() => {
    listRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [row, side]);

  const { slot, pos } = CELLS[cell];
  const inCell = slotSkills(hero, slot)[pos];
  // 右頁：依內功、輕功、外功排
  const learned = SLOT_ORDER.flatMap((sl) => hero.skills.filter((s) => slotOf(skillDef(s).kind) === sl));
  const listSkill = learned[Math.min(row, learned.length - 1)];
  const focus = side === 'grid' ? inCell : listSkill;

  const cellOf = (s: Skill) => {
    const sl = slotOf(skillDef(s).kind);
    return CELLS.findIndex((c) => c.slot === sl && c.pos === (s.pos ?? 0));
  };

  useKeys(active && !open, (k) => {
    if (isCancel(k)) return onExit();
    if (side === 'grid') {
      if (isConfirm(k)) return setOpen({ kind: 'cell' });
      // 右欄再往右就到右頁
      if (isRight(k) && cell >= LEFT && learned.length) {
        setSide('list');
        const i = inCell ? learned.indexOf(inCell) : -1;
        setRow(i >= 0 ? i : 0);
        return;
      }
      const next = moveCell(cell, k);
      if (next !== 'exit') setCell(next);
      return;
    }
    const n = learned.length;
    if (isUp(k)) setRow((r) => (r + n - 1) % n);
    else if (isDown(k)) setRow((r) => (r + 1) % n);
    else if (isConfirm(k) && listSkill) setOpen({ kind: 'skill', id: listSkill.id });
    else if (isLeft(k)) {
      setSide('grid');
      if (listSkill && listSkill.pos !== null) setCell(cellOf(listSkill));
    }
  });

  const cellView = (i: number) => {
    const c = CELLS[i];
    const s = slotSkills(hero, c.slot)[c.pos];
    const on = active && side === 'grid' && i === cell;
    return (
      <div
        key={i}
        className={`skill-cell ${s ? 'filled' : 'empty'} ${on ? 'active' : ''}`}
        onClick={() => (on ? setOpen({ kind: 'cell' }) : (setSide('grid'), setCell(i)))}
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

  const left = (
    <>
      <PageHead title="武功" sub={`武學點數 ${hero.points}`} />
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
      </div>
      {focus ? <SkillGlance s={focus} /> : <p className="small muted glance">這一格還沒裝備武功。</p>}
      <p className="page-help">
        {!active
          ? '按 E 或 ↓ 開始翻閱'
          : side === 'grid'
            ? '方向鍵選格子　E 挑一門裝上　→ 到右頁　X 回到書籤'
            : '↑↓ 選擇　E 展開細看與修練　← 回到裝備欄'}
      </p>
    </>
  );

  let lastSlot: Slot | null = null;
  const right = (
    <>
      <PageHead title="所學" sub={`${hero.skills.length} 門`} />
      <ul className="art-list" ref={listRef}>
        {learned.map((s, i) => {
          const sl = slotOf(skillDef(s).kind);
          const head = sl !== lastSlot;
          lastSlot = sl;
          const on = active && side === 'list' && i === row;
          return [
            head && (
              <li key={sl} className="art-group">
                {SKILL_SLOT_NAME[sl]}
              </li>
            ),
            <li key={s.id} className={on ? 'active' : ''} onClick={() => (on ? setOpen({ kind: 'skill', id: s.id }) : (setSide('list'), setRow(i)))}>
              <span className={`book kind-${sl}`} />
              <span className="art-name">{skillDef(s).name}</span>
              <span className="art-tier">{skillDef(s).tier}</span>
              <span className="art-level">第 {s.level} 重</span>
              <span className="art-mark">{s.pos !== null ? '◆' : ''}</span>
            </li>,
          ];
        })}
      </ul>
    </>
  );

  const toast = useGame.getState().showToast;
  const doEquip = (id: string, at: number) =>
    toast(
      useGame.getState().updateHero((c) => {
        const m = equipAt(c, id, at);
        clampVitals(c);
        return m;
      }),
    );
  const doUnequip = (id: string) =>
    toast(
      useGame.getState().updateHero((c) => {
        const m = unequip(c, id);
        clampVitals(c);
        return m;
      }),
    );

  let sheet: Sheet | null = null;
  if (open?.kind === 'cell') {
    const candidates = hero.skills.filter((s) => slotOf(skillDef(s).kind) === slot);
    sheet = {
      title: `${SKILL_SLOT_NAME[slot]}・第 ${pos + 1} 格`,
      sub: inCell ? skillDef(inCell).name : '空著',
      body: candidates.length ? (
        <p className="small muted">挑一門{SKILL_SLOT_NAME[slot]}裝在這一格；已經裝在別格的會換過來。裝備中的武功才會加五維、才能在戰鬥中使用。</p>
      ) : (
        <p className="small muted">還沒有學會任何{SKILL_SLOT_NAME[slot]}。</p>
      ),
      actions: [
        ...(inCell ? [{ key: 'off', label: `卸下「${skillDef(inCell).name}」`, run: () => (doUnequip(inCell.id), 'close' as const) }] : []),
        ...candidates.map((s) => ({
          key: s.id,
          label: skillDef(s).name,
          detail: `第 ${s.level} 重・${s === inCell ? '裝在這一格' : s.pos !== null ? `裝在第 ${s.pos + 1} 格` : '未裝備'}`,
          disabled: s === inCell,
          run: () => (doEquip(s.id, pos), 'close' as const),
        })),
      ],
    };
  } else if (open?.kind === 'skill') {
    const s = hero.skills.find((k) => k.id === open.id);
    if (s) {
      const def = skillDef(s);
      const sl = slotOf(def.kind);
      const here = slotSkills(hero, sl);
      sheet = {
        title: def.name,
        sub: `${def.tier}・${def.kind}`,
        body: <SkillDetail s={s} />,
        actions: [
          ...trainRows(s.id),
          ...Array.from({ length: SLOT_LIMIT[sl] }, (_, p) => ({
            key: `pos${p}`,
            label: s.pos === p ? `卸下（目前裝在第 ${p + 1} 格）` : `裝到${SKILL_SLOT_NAME[sl]}第 ${p + 1} 格`,
            detail: s.pos === p ? '' : here[p] ? `換下「${skillDef(here[p]!).name}」` : '空格',
            run: () => (s.pos === p ? doUnequip(s.id) : doEquip(s.id, p)),
          })),
        ],
      };
    }
  }

  return (
    <>
      <Spread folio={folio} left={left} right={right} />
      <Paper sheet={sheet} onClose={() => setOpen(null)} />
    </>
  );
}

/** 左頁下方的一眼概況：重數、經驗條、招式數 */
function SkillGlance({ s }: { s: Skill }) {
  const def = skillDef(s);
  const cap = skillCap(s);
  const pct = s.level >= cap ? 100 : (s.exp / expToNext(s.level)) * 100;
  return (
    <div className="glance">
      <div className="glance-head">
        <span className="glance-name">{def.name}</span>
        <span className="small muted">
          {def.tier}・第 {s.level}／{cap} 重・招式 {s.moves.length}/{def.moves.length}
        </span>
      </div>
      <div className="exp-track">
        <div className="exp-fill" style={{ width: `${pct}%` }} />
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
  const pills = (o: Partial<Record<AttrKey, number>>, kind: string) =>
    (Object.entries(o) as [AttrKey, number][]).map(([k, v]) => (
      <span key={k} className={`effect ${kind}`}>
        {attrName(k)} +{fmt(v * m)}
      </span>
    ));
  const next = nextMove(s);
  return (
    <div className="skill-detail">
      <div className={over ? 'realm over' : 'realm'}>
        第 {s.level} 重<small className="muted">／{cap} 重{over ? `（已突破，有效 ${fmt(effLevel(s))} 重）` : ''}</small>
      </div>
      <div className="exp-track">
        <div className="exp-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="detail-label">裝備加成</div>
      <div className="effects">{pills(def.equip, 'equip')}</div>
      <div className="detail-label">永久成長</div>
      <div className="effects">{pills(def.grow, 'grow')}</div>
      <div className="detail-label">
        招式 {s.moves.length}/{def.moves.length}
      </div>
      {/* 招式卡：學會的翻開，還沒悟出的蓋著，下一招有領悟度 */}
      <div className="move-cards">
        {def.moves.map((mv) => {
          const known = s.moves.includes(mv.id);
          const isNext = next?.id === mv.id;
          const mvDef = MOVES[mv.id];
          return (
            <div key={mv.id} className={`move-card ${known ? 'known' : 'hidden'} ${isNext ? 'next' : ''}`} title={known ? mvDef.desc : ''}>
              <span className="move-name">{known ? mvDef.name : '？？？？'}</span>
              {known ? (
                <>
                  <span className="move-cost">{mvDef.qi ? `內力 ${mvDef.qi}` : '不耗內力'}</span>
                  <span className="move-desc">{mvDef.desc}</span>
                </>
              ) : s.level < mv.level ? (
                <span className="move-cost">第 {mv.level} 重後</span>
              ) : isNext ? (
                <>
                  <span className="move-cost">領悟 {s.insight}%</span>
                  <span className="move-bar">
                    <i style={{ width: `${s.insight}%` }} />
                  </span>
                </>
              ) : (
                <span className="move-cost">尚未參透</span>
              )}
            </div>
          );
        })}
      </div>
      {next && <p className="muted small">在戰鬥中使用這門武功，就有機會悟出新招；悟出時武功也會精進一重。</p>}
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
  if (s.level >= HIDDEN_CAP) return [{ key: 'max', label: '已臻化境，再無可進', disabled: true, run: () => {} }];
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

// ── 行囊 ─────────────────────────────────────────────────

const BAG_COLS = 6;
const BAG_MIN = 24;
type BagCat = '全部' | ItemCategory;
const BAG_CATS: BagCat[] = ['全部', ...ITEM_CATEGORIES];
type BagLayer = 'cats' | 'grid' | 'move';

/**
 * 行囊：左頁上排是分類籤（最後一個是「整理」），下面一格一格的物品；右頁是游標那件東西的說明。
 * 在物品上按 E 攤開一張紙：使用、穿上、移動。移動時拿起物品，放在別的物品上就對調。
 */
function ItemsPage({ active, onExit, folio }: PageProps) {
  const hero = useGame((s) => s.hero);
  const [layer, setLayer] = useState<BagLayer>('cats');
  const [cat, setCat] = useState(0);
  const [cell, setCell] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  /** 移動中的物品 */
  const [held, setHeld] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!active) (setLayer('cats'), setHeld(null), setOpen(null));
  }, [active]);
  useEffect(() => {
    gridRef.current?.querySelector('.active')?.scrollIntoView({ block: 'nearest' });
  }, [cell]);

  const st = useGame.getState();
  const category = BAG_CATS[Math.min(cat, BAG_CATS.length - 1)];
  const ids = Object.keys(hero.items).filter((id) => hero.items[id] > 0 && ITEMS[id] && (category === '全部' || ITEMS[id].category === category));
  const total = Math.max(BAG_MIN, Math.ceil((ids.length + 1) / BAG_COLS) * BAG_COLS);
  const selected = layer === 'cats' ? undefined : ids[cell];
  const sortTab = BAG_CATS.length;

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
    if (isUp(k)) {
      if (cell < BAG_COLS) return false;
      setCell((c) => c - BAG_COLS);
    } else if (isDown(k)) setCell((c) => (c + BAG_COLS) % total);
    else if (isRight(k)) setCell((c) => (col === BAG_COLS - 1 ? c - col : c + 1));
    else if (isLeft(k)) setCell((c) => (col === 0 ? c + BAG_COLS - 1 : c - 1));
    else return false;
    return true;
  };

  useKeys(active && !open, (k) => {
    if (layer === 'cats') {
      const n = BAG_CATS.length + 1;
      if (isLeft(k)) setCat((c) => (c + n - 1) % n);
      else if (isRight(k)) setCat((c) => (c + 1) % n);
      else if (isConfirm(k) && cat === sortTab) tidy();
      else if (isConfirm(k) || isDown(k)) {
        if (cat === sortTab) setCat(0);
        setLayer('grid');
        setCell(0);
      } else if (isCancel(k) || isUp(k)) onExit();
      return;
    }
    if (layer === 'grid') {
      if (isConfirm(k) && selected) setOpen(selected);
      else if (isCancel(k)) setLayer('cats');
      else if (!moveCellBy(k) && isUp(k)) setLayer('cats');
      return;
    }
    // 移動中
    if (isConfirm(k)) drop();
    else if (isCancel(k)) (setHeld(null), setLayer('grid'));
    else moveCellBy(k);
  });

  const focus = held ?? selected;
  const left = (
    <>
      <PageHead title="行囊" sub={`銀兩 ${hero.silver}`} />
      <ul className="bag-tabs">
        {[...BAG_CATS, '整理'].map((c, i) => (
          <li
            key={c}
            className={`${i === cat ? 'current' : ''} ${active && layer === 'cats' && i === cat ? 'active' : ''} ${i === sortTab ? 'bag-sort' : ''}`}
            onClick={() => (i === sortTab ? tidy() : (setCat(i), setLayer('grid'), setCell(0)))}
          >
            {c}
          </li>
        ))}
      </ul>
      <div className="bag-grid" ref={gridRef}>
        {Array.from({ length: total }, (_, i) => {
          const id = ids[i];
          const on = active && layer !== 'cats' && i === cell;
          return (
            <div
              key={i}
              className={`bag-cell ${id ? 'filled' : ''} ${on ? 'active' : ''} ${held && id === held ? 'lifted' : ''}`}
              onClick={() => {
                if (layer === 'move') return (setCell(i), undefined);
                if (on && id) return setOpen(id);
                setLayer('grid');
                setCell(i);
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
      <p className="page-help">
        {!active
          ? '按 E 或 ↓ 開始翻閱'
          : layer === 'cats'
            ? '←→ 選分類　E／↓ 進到格子　X 回到書籤'
            : layer === 'grid'
              ? '方向鍵選物品　E 展開　X 回到分類'
              : '方向鍵選位置　E 放下（放在別的物品上會對調）　X 取消'}
      </p>
    </>
  );

  const used = bagUsed(hero);
  const cap = bagCapacity(hero);
  const right = (
    <>
      <PageHead title={focus ? ITEMS[focus].name : category} sub={focus ? ITEMS[focus].category : `${ids.length} 樣`} />
      {focus ? (
        <div className="item-glance">
          <img className="item-big" src={itemIconUrl(ITEMS[focus].icon)} alt="" />
          <div>
            {!ITEMS[focus].manual && <div className="small">持有 {hero.items[focus]} 個</div>}
            <ItemEffects id={focus} />
            <p className="small">{ITEMS[focus].desc}</p>
            <p className="small muted">{usableInBattle(focus) ? '戰鬥中或行囊裡都能使用。' : usable(focus) ? '在行囊裡使用。' : ITEMS[focus].gear ? '可以穿戴。' : ''}</p>
          </div>
        </div>
      ) : (
        <p className="small muted">{ids.length ? '選一格看看物品的說明。' : category === '全部' ? '行囊空空如也。' : `沒有${category}。`}</p>
      )}
      <div className="bag-capacity">
        <span className="small">已用 {used}/{cap} 格</span>
        <div className="exp-track">
          <div className="exp-fill" style={{ width: `${(used / cap) * 100}%` }} />
        </div>
      </div>
    </>
  );

  const it = open && hero.items[open] ? ITEMS[open] : null;
  const sheet: Sheet | null =
    open && it
      ? {
          title: it.name,
          sub: `${it.category}${it.manual ? '' : `・${hero.items[open]} 個`}`,
          body: it.gear ? (
            <GearInfo id={open} />
          ) : (
            <>
              <div className="item-line">
                <img className="item-icon" src={itemIconUrl(it.icon)} alt="" />
                <ItemEffects id={open} />
              </div>
              <p className="small">
                {it.desc}
                <span className="muted">{usableInBattle(open) ? '（戰鬥中或行囊裡都能使用）' : usable(open) ? '（在行囊裡使用）' : ''}</span>
              </p>
            </>
          ),
          actions: [
            ...(usable(open) ? [{ label: '使用', run: () => st.showToast(st.updateHero((c) => consumeItem(c, open))) }] : []),
            ...(it.gear ? [{ label: '穿上', detail: '換下的放回行囊', run: () => (st.showToast(st.updateHero((c) => equipGear(c, open))), 'close' as const) }] : []),
            { label: '移動', detail: '換到別的格子', run: () => (setHeld(open), setLayer('move'), 'close' as const) },
          ],
        }
      : null;

  return (
    <>
      <Spread folio={folio} left={left} right={right} />
      <Paper sheet={sheet} onClose={() => setOpen(null)} />
    </>
  );
}

// ── 江湖事 ───────────────────────────────────────────────

const NOTICE_COLS = 2;

/** 江湖事：左頁是今天的日子與該做的事，右頁是長期的委託（一張張貼著的告示），E 攤開細看 */
function QuestsPage({ active, onExit, folio }: PageProps) {
  const flags = useGame((s) => s.flags);
  const hero = useGame((s) => s.hero);
  const world = useGame((s) => s.world);
  const [row, setRow] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    if (!active) setOpen(null);
  }, [active]);
  // 進行中的排前面
  const list = QUESTS.map((q) => ({ q, st: q.status(flags) }))
    .filter((x) => x.st)
    .sort((a, b) => Number(a.st!.done) - Number(b.st!.done));
  const cur = Math.min(row, Math.max(0, list.length - 1));

  // 告示兩欄一排：↑↓ 換排、←→ 換欄
  useKeys(active && !open, (k) => {
    const n = list.length;
    if (isCancel(k)) return onExit();
    if (!n) return isLeft(k) && onExit();
    if (isUp(k)) setRow(cur >= NOTICE_COLS ? cur - NOTICE_COLS : cur);
    else if (isDown(k)) setRow(Math.min(n - 1, cur + NOTICE_COLS));
    else if (isLeft(k)) cur % NOTICE_COLS ? setRow(cur - 1) : onExit();
    else if (isRight(k)) setRow(Math.min(n - 1, cur + 1));
    else if (isConfirm(k)) setOpen(list[cur].q.id);
  });

  const fest = festivalOf(world.day);
  const left = (
    <>
      <PageHead title={dateText(world.day)} sub={`${WEATHER_NAME[world.weather]}・${timeText(world.time)}`} />
      {(fest || isXunxiu(world.day)) && <p className="festival small">{[fest, isXunxiu(world.day) && '旬休'].filter(Boolean).join('・')}</p>}
      <p className="small">{WEATHER_LINE[world.weather]}</p>
      <h4 className="page-sec">今日</h4>
      <TaskList tasks={todayTasks({ hero, flags, world })} />
    </>
  );
  const right = (
    <>
      <PageHead title="長期" sub={`進行中 ${list.filter((x) => !x.st!.done).length}`} />
      {list.length === 0 && <p className="muted small">尚未接下任何委託。</p>}
      <div className="notice-board">
        {list.map(({ q, st }, i) => (
          <div
            key={q.id}
            className={`notice ${active && i === cur ? 'active' : ''} ${st!.done ? 'done' : ''}`}
            onClick={() => (i === cur ? setOpen(q.id) : setRow(i))}
          >
            <span className="notice-pin" />
            <span className="notice-title">{q.title}</span>
            <span className="notice-text">{st!.text}</span>
            {st!.done && <span className="notice-seal">完</span>}
          </div>
        ))}
      </div>
      <p className="page-help">{active ? '方向鍵選告示　E 攤開細看　X 回到書籤' : '按 E 或 ↓ 開始翻閱'}</p>
    </>
  );
  const q = open ? list.find((x) => x.q.id === open) : undefined;
  const sheet: Sheet | null = q ? { title: q.q.title, sub: q.st!.done ? '已完成' : '進行中', body: <p>{q.st!.text}</p> } : null;
  return (
    <>
      <Spread folio={folio} left={left} right={right} />
      <Paper sheet={sheet} onClose={() => setOpen(null)} />
    </>
  );
}

// ── 系統 ────────────────────────────────────────────────

type SysRow = 'save' | 'load' | 'settings' | 'title';
const SYS_ROWS: { id: SysRow; label: string; note: string }[] = [
  { id: 'save', label: '存檔', note: '存到手動存檔欄' },
  { id: 'load', label: '讀檔', note: '即時、自動或手動存檔' },
  { id: 'settings', label: '遊戲設定', note: '戰鬥模式、自動戰鬥' },
  { id: 'title', label: '回到標題畫面', note: '會先自動存檔' },
];

/** 系統：左頁選存檔、讀檔、設定、回標題；E 或 → 到右頁操作，← 或 X 回左頁 */
function SystemPage({ active, onExit, folio }: PageProps) {
  const [root, setRoot] = useState(0);
  const [side, setSide] = useState<'left' | 'right'>('left');
  const [cursor, setCursor] = useState(0);
  const [, setVersion] = useState(0);
  const settings = useGame((s) => s.settings);
  useEffect(() => {
    if (!active) setSide('left');
  }, [active]);

  const st = useGame.getState();
  const layer = SYS_ROWS[root].id;
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
  const toTitleScreen = () => (st.setMenu(false), toTitle());

  const rows: Row[] =
    layer === 'save' || layer === 'load'
      ? slotList.map((s) => ({ label: SLOT_NAME[s], disabled: layer === 'load' && !readSave(s), run: () => (layer === 'save' ? saveTo(s) : loadFrom(s)) }))
      : layer === 'settings'
        ? [
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
          ]
        : [{ label: '闔上書，回到標題畫面', run: toTitleScreen }];

  useKeys(active, (k) => {
    if (side === 'left') {
      const n = SYS_ROWS.length;
      if (isUp(k)) setRoot((r) => (r + n - 1) % n);
      else if (isDown(k)) setRoot((r) => (r + 1) % n);
      else if (isConfirm(k) || isRight(k)) (setSide('right'), setCursor(0));
      else if (isCancel(k) || isLeft(k)) onExit();
      return;
    }
    const n = rows.length;
    if (isUp(k)) setCursor((c) => (c + n - 1) % n);
    else if (isDown(k)) setCursor((c) => (c + 1) % n);
    else if (isConfirm(k)) rows[cursor]?.disabled || rows[cursor]?.run();
    else if (isCancel(k) || isLeft(k)) setSide('left');
  });

  const rightOn = active && side === 'right';
  const left = (
    <>
      <PageHead title="系統" />
      <ul className="row-list sys-rows">
        {SYS_ROWS.map((r, i) => (
          <li key={r.id} className={`${i === root ? 'current' : ''} ${active && side === 'left' && i === root ? 'active' : ''}`} onClick={() => (setRoot(i), setSide('right'), setCursor(0))}>
            <span>
              {active && side === 'left' && i === root ? '▸ ' : '　'}
              {r.label}
            </span>
            <span className="row-note">{r.note}</span>
          </li>
        ))}
      </ul>
      <p className="small muted">隨時可按 Ctrl+S（Mac 為 ⌘S）即時存檔、F9 讀取即時存檔。戰鬥中按 Q 開關自動戰鬥。</p>
      <p className="page-help">{!active ? '按 E 或 ↓ 開始翻閱' : side === 'left' ? '↑↓ 選擇　E／→ 到右頁　X 回到書籤' : '↑↓ 選擇　E 確定　←／X 回左頁'}</p>
    </>
  );
  const right = (
    <>
      <PageHead title={SYS_ROWS[root].label} />
      {layer === 'save' || layer === 'load' ? (
        <SlotBars slots={slotList} cursor={rightOn ? cursor : -1} mode={layer} onPick={(i) => (setSide('right'), setCursor(i), rows[i].disabled || rows[i].run())} />
      ) : (
        <>
          {layer === 'title' && <p className="small">離開目前的遊戲回到標題畫面，離開前會自動存檔。</p>}
          <RowList rows={rows} cursor={rightOn ? cursor : -1} onPick={(i) => (setSide('right'), setCursor(i), rows[i].disabled || rows[i].run())} />
        </>
      )}
    </>
  );
  return <Spread folio={folio} left={left} right={right} />;
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
          <li key={s} className={`save-slot ${i === cursor ? 'active' : ''} ${!d && mode === 'load' ? 'disabled' : ''}`} onClick={() => onPick(i)}>
            <span className="save-slot-name">
              {i === cursor ? '▸ ' : '　'}
              {SLOT_NAME[s]}
            </span>
            {d ? <span className="save-slot-info">{describeSave(d)}</span> : <span className="save-slot-info muted">— 空白 —</span>}
          </li>
        );
      })}
    </ul>
  );
}
