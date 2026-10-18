import { useEffect, useState } from 'react';
import { useGame } from '../state/store';
import { DEBUFFS, EFFECT_NAME, type BattleCommand, type BattleView, type Effect, type ItemView, type MoveView } from '../game/battle/types';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

type Mode = 'root' | 'moves' | 'items' | 'target';

interface RootOption {
  label: string;
  enabled: boolean;
}

/** 戰鬥介面：上方訊息、下方敵方名單／主角狀態／指令選單，以及結算畫面。 */
export function BattleUI() {
  const battle = useGame((s) => s.battle);
  const send = useGame((s) => s.battleInput);
  const [mode, setMode] = useState<Mode>('root');
  const [cursor, setCursor] = useState(0);
  const [rootCursor, setRootCursor] = useState(0);
  /** 選好招式後等待選目標 */
  const [pendingMove, setPendingMove] = useState<string | null>(null);

  const input = battle?.input ?? null;
  // 每次輪到主角，都回到第一層選單
  useEffect(() => {
    setMode('root');
    setCursor(0);
    setPendingMove(null);
  }, [input]);

  const enemies = battle ? battle.units.filter((u) => u.side === 'enemy' && u.alive) : [];
  const moves = input ? input.moves.filter((m) => m.id !== 'attack') : [];
  const items = input?.items ?? [];
  const root: RootOption[] = [
    { label: '攻擊', enabled: true },
    { label: '武功', enabled: moves.length > 0 },
    { label: '物品', enabled: items.length > 0 },
    { label: '防禦', enabled: true },
    { label: '逃跑', enabled: !!input?.canFlee },
  ];

  const setTarget = (id: string | null) => useGame.setState({ battleTarget: id });

  const submit = (cmd: BattleCommand) => {
    setTarget(null);
    send?.(cmd);
  };

  const chooseMove = (m: MoveView) => {
    if (!m.usable) return;
    if (m.target === 'enemy') {
      setPendingMove(m.id);
      setMode('target');
      setCursor(0);
      setTarget(enemies[0]?.id ?? null);
    } else {
      submit({ type: 'move', moveId: m.id });
    }
  };

  const chooseRoot = (i: number) => {
    if (!root[i].enabled || !input) return;
    setRootCursor(i);
    switch (root[i].label) {
      case '攻擊':
        chooseMove(input.moves.find((m) => m.id === 'attack')!);
        break;
      case '武功':
        setMode('moves');
        setCursor(0);
        break;
      case '物品':
        setMode('items');
        setCursor(0);
        break;
      case '防禦':
        submit({ type: 'defend' });
        break;
      case '逃跑':
        submit({ type: 'flee' });
        break;
    }
  };

  const auto = useGame((s) => s.battleAuto);
  const gauge = useGame((s) => s.battleGauge);

  useKeys(!!battle, (k) => {
    if (!battle) return;
    if (battle.result) {
      if (isConfirm(k)) send?.(null);
      return;
    }
    if (k === 'q' || k === 'Q') {
      setTarget(null);
      useGame.setState({ battleAuto: !auto });
      return;
    }
    if (!input || !send) return;
    const list = mode === 'root' ? root : mode === 'moves' ? moves : mode === 'items' ? items : enemies;
    const n = list.length;
    const cur = mode === 'root' ? rootCursor : cursor;
    const move = (d: number) => {
      const next = (cur + d + n) % n;
      if (mode === 'root') setRootCursor(next);
      else setCursor(next);
      if (mode === 'target') setTarget(enemies[next].id);
    };
    if (isUp(k) || (mode === 'target' && isLeft(k))) move(-1);
    else if (isDown(k) || (mode === 'target' && isRight(k))) move(1);
    else if (isConfirm(k)) {
      if (mode === 'root') chooseRoot(rootCursor);
      else if (mode === 'moves') chooseMove(moves[cursor]);
      else if (mode === 'items') submit({ type: 'item', itemId: items[cursor].id });
      // 半即時制下，選目標時目標可能已被別人打倒，就改打第一個還站著的
      else if (mode === 'target') submit({ type: 'move', moveId: pendingMove!, targetId: (enemies[cursor] ?? enemies[0])?.id });
    } else if (isCancel(k)) {
      if (mode === 'target') {
        setTarget(null);
        setMode(pendingMove === 'attack' ? 'root' : 'moves');
        setCursor(0);
      } else if (mode !== 'root') setMode('root');
    }
  });

  if (!battle) return null;
  const hero = battle.units.find((u) => u.side === 'hero')!;

  return (
    <div className="battle-ui">
      <div className="battle-msg pixel-frame">{battle.message}</div>

      <div className="battle-panel pixel-frame">
        <ul className="battle-enemies">
          {battle.units
            .filter((u) => u.side === 'enemy')
            .map((u) => (
              <li key={u.id} className={!u.alive ? 'dead' : mode === 'target' && enemies[cursor]?.id === u.id ? 'active' : ''}>
                {mode === 'target' && enemies[cursor]?.id === u.id ? '▶ ' : '　'}
                {u.name}
                {u.charging && <span className="tag danger">蓄勢</span>}
                <EffectTags effects={u.effects} />
              </li>
            ))}
        </ul>

        <div className="battle-hero">
          <div className="battle-hero-name">
            {hero.name}
            {hero.guard && <span className="tag">防禦中</span>}
            <EffectTags effects={hero.effects} />
          </div>
          <Bar label="氣血" value={hero.hp} max={hero.maxHp} color="#d8483c" />
          <Bar label="內力" value={hero.qi} max={hero.maxQi} color="#4a8ad8" />
          {gauge !== null && (
            <div className="bar gauge">
              <span className="bar-label">行動</span>
              <div className="bar-track">
                <div className={`bar-fill ${gauge >= 1 ? 'full' : ''}`} style={{ width: `${gauge * 100}%` }} />
              </div>
              <span className="bar-num">{gauge >= 1 ? '可出手' : ''}</span>
            </div>
          )}
        </div>

        <div className="battle-cmd">
          {auto && (
            <p className="cmd-desc auto-on">
              自動戰鬥中……
              <br />
              按 Q 收回手動
            </p>
          )}
          {input && !auto && <Commands mode={mode} root={root} rootCursor={rootCursor} cursor={cursor} moves={moves} items={items} pendingMove={pendingMove} input={input} onRoot={chooseRoot} onMove={chooseMove} onItem={(it) => submit({ type: 'item', itemId: it.id })} />}
        </div>
      </div>

      {battle.result && (
        <div className="battle-result pixel-frame">
          <h2 className={battle.result.outcome === 'win' ? '' : 'lose'}>{battle.result.title}</h2>
          {battle.result.lines.map((l) => (
            <p key={l}>{l}</p>
          ))}
          <div className="dialog-next">▼</div>
        </div>
      )}
    </div>
  );
}

/** 狀態標籤：名稱＋剩餘次數，減益用另一個顏色 */
function EffectTags({ effects }: { effects: Effect[] }) {
  return (
    <>
      {effects.map((e) => (
        <span key={e.kind} className={`tag effect ${DEBUFFS.includes(e.kind) ? 'debuff' : ''}`}>
          {EFFECT_NAME[e.kind]}
          {e.turns}
        </span>
      ))}
    </>
  );
}

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="bar">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${max ? Math.min(100, (value / max) * 100) : 0}%`, background: color }} />
      </div>
      <span className="bar-num">
        {value}/{max}
      </span>
    </div>
  );
}

interface CommandsProps {
  mode: Mode;
  root: RootOption[];
  rootCursor: number;
  cursor: number;
  moves: MoveView[];
  items: ItemView[];
  pendingMove: string | null;
  input: NonNullable<BattleView['input']>;
  onRoot: (i: number) => void;
  onMove: (m: MoveView) => void;
  onItem: (it: ItemView) => void;
}

function Commands(p: CommandsProps) {
  if (p.mode === 'root') {
    return (
      <ul className="cmd-list">
        {p.root.map((o, i) => (
          <li key={o.label} className={`${i === p.rootCursor ? 'active' : ''} ${o.enabled ? '' : 'disabled'}`} onClick={() => p.onRoot(i)}>
            {i === p.rootCursor ? '▶ ' : '　'}
            {o.label}
          </li>
        ))}
        <li className="cmd-hint">Q 自動戰鬥</li>
      </ul>
    );
  }
  if (p.mode === 'moves') {
    const sel = p.moves[p.cursor];
    return (
      <>
        <ul className="cmd-list">
          {p.moves.map((m, i) => (
            <li key={m.id} className={`${i === p.cursor ? 'active' : ''} ${m.usable ? '' : 'disabled'}`} onClick={() => p.onMove(m)}>
              {i === p.cursor ? '▶ ' : '　'}
              {m.name}
              <span className="cost">{m.qi ? `內力 ${m.qi}` : ''}</span>
            </li>
          ))}
        </ul>
        {sel && <p className="cmd-desc">{sel.desc}</p>}
      </>
    );
  }
  if (p.mode === 'items') {
    const sel = p.items[p.cursor];
    return (
      <>
        <ul className="cmd-list">
          {p.items.map((it, i) => (
            <li key={it.id} className={i === p.cursor ? 'active' : ''} onClick={() => p.onItem(it)}>
              {i === p.cursor ? '▶ ' : '　'}
              {it.name}
              <span className="cost">×{it.count}</span>
            </li>
          ))}
        </ul>
        {sel && <p className="cmd-desc">{sel.desc}</p>}
      </>
    );
  }
  const name = p.input.moves.find((m) => m.id === p.pendingMove)?.name;
  return <p className="cmd-desc">「{name}」要打誰？<br />←→ 選擇目標，E 確定，X 返回</p>;
}
