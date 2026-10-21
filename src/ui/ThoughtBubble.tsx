import { useEffect, useState } from 'react';
import { dueReminder } from '../game/thought';
import { useGame } from '../state/store';

/** 提醒在畫面上停留多久 */
const THOUGHT_MS = 2800;

/**
 * 主角頭上的雲朵泡泡（位置由 MapScene 每幀擺到主角頭頂）：
 * 一閃而過的提醒優先，其次是面對的東西要花的代價。對話、選單、劇情進行中先收起來，提醒等介面關了才冒出。
 */
export function ThoughtBubble() {
  const hint = useGame((s) => s.hint);
  const thought = useGame((s) => s.thought);
  const hidden = useGame(
    (s) => s.screen !== 'game' || s.dialog !== null || s.menuOpen || s.eventRunning || s.battle !== null || s.panel !== null || s.confirm !== null || s.brief !== null || s.work !== null,
  );
  const [shown, setShown] = useState<number | null>(null);

  // 時間或體力變了就看看有沒有該冒出的提醒
  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.screen !== 'game') return;
        if (s.world.time === prev.world.time && s.hero.stamina === prev.hero.stamina) return;
        const text = dueReminder(s);
        if (text) s.think(text);
      }),
    [],
  );
  // 介面沒擋著時才開始計時
  useEffect(() => {
    if (thought && !hidden && shown !== thought.id) setShown(thought.id);
  }, [thought, hidden]);
  useEffect(() => {
    if (shown === null) return;
    const t = setTimeout(() => {
      if (useGame.getState().thought?.id === shown) useGame.setState({ thought: null });
      setShown(null);
    }, THOUGHT_MS);
    return () => clearTimeout(t);
  }, [shown]);

  const text = !hidden && (thought?.text ?? hint);
  return (
    <div id="thought" className="thought-anchor">
      {text && (
        <div className={`thought ${thought ? 'remind' : ''}`} key={thought?.id ?? 'hint'}>
          {text}
          <span className="thought-dot big" />
          <span className="thought-dot" />
        </div>
      )}
    </div>
  );
}
