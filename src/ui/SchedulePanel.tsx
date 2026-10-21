import { useEffect, useState } from 'react';
import { derive } from '../game/character';
import { activities, activityDef, defaultSchedule, MAX_SLOTS, scheduleOf, staminaOf } from '../game/schedule';
import { keText } from '../game/thought';
import { shichenStart, SHICHEN_INDEX, timeText } from '../game/time';
import { useGame } from '../state/store';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/** 試算從卯時初開始照表做 */
const START = shichenStart(SHICHEN_INDEX.卯);

/** 存進 world.schedule：去掉空格，睡覺一定放在最後 */
function normalize(slots: string[]): string[] {
  const list = slots.filter(Boolean);
  const last = list.filter((id) => activityDef(id)?.last);
  return [...list.filter((id) => !activityDef(id)?.last), ...last.slice(0, 1)];
}

/** 排日課表：↑↓ 選一格，←→ 換成別的事（換成「—」就是空著），X 或「完成」存起來。 */
export function SchedulePanel() {
  const panel = useGame((s) => s.panel);
  const hero = useGame((s) => s.hero);
  const flags = useGame((s) => s.flags);
  const world = useGame((s) => s.world);
  const open = panel?.kind === 'schedule';
  const [slots, setSlots] = useState<string[]>([]);
  const [cursor, setCursor] = useState(0);

  const v = { hero, flags, world };
  const choices = ['', ...activities(v).map((a) => a.id)];
  const pad = (list: string[]) => [...list, ...Array(MAX_SLOTS).fill('')].slice(0, MAX_SLOTS);
  useEffect(() => {
    if (open) {
      setSlots(pad(scheduleOf(useGame.getState())));
      setCursor(0);
    }
  }, [open]);

  const st = useGame.getState();
  const save = () => {
    st.updateWorld((w) => (w.schedule = normalize(slots)));
    st.closePanel();
  };
  const reset = () => setSlots(pad(defaultSchedule(v)));
  const cycle = (i: number, step: number) =>
    setSlots((s) => {
      const k = choices.indexOf(s[i]);
      const next = [...s];
      next[i] = choices[(k + step + choices.length) % choices.length];
      return next;
    });

  // 試算：每件事幾時開始、做完剩多少體力、有沒有超過一天的上限
  const maxSt = derive(hero).maxStamina;
  let t = START;
  let stamina = maxSt;
  const count: Record<string, number> = {};
  const plan = slots.map((id) => {
    const a = id ? activityDef(id) : undefined;
    if (!a) return null;
    count[id] = (count[id] ?? 0) + 1;
    const at = t;
    t += a.ke;
    stamina -= staminaOf(a, v);
    const warn = a.max && count[id] > a.max ? `一天最多 ${a.max} 次，多的會跳過` : stamina < 0 ? '體力可能不夠' : '';
    return { at, warn };
  });

  const rows = slots.length + 2;
  useKeys(open, (k) => {
    if (isUp(k)) setCursor((c) => (c + rows - 1) % rows);
    else if (isDown(k)) setCursor((c) => (c + 1) % rows);
    else if (cursor < slots.length && (isLeft(k) || isRight(k))) cycle(cursor, isLeft(k) ? -1 : 1);
    else if (isConfirm(k)) {
      if (cursor < slots.length) cycle(cursor, 1);
      else if (cursor === slots.length) reset();
      else save();
    } else if (isCancel(k)) save();
  });

  if (!open) return null;
  const focus = cursor < slots.length && slots[cursor] ? activityDef(slots[cursor]) : undefined;
  return (
    <div className="menu-backdrop">
      <div className="panel schedule-panel pixel-frame">
        <h2>
          日課表　<small>從卯時初（早上 5 點）起床算起；體力上限 {maxSt}</small>
        </h2>
        <ul className="system-rows schedule-rows">
          {slots.map((id, i) => {
            const a = id ? activityDef(id) : undefined;
            const p = plan[i];
            return (
              <li key={i} className={i === cursor ? 'active' : ''} onClick={() => (setCursor(i), cycle(i, 1))}>
                <span className="schedule-time">{p ? timeText(p.at) : ''}</span>
                <span className="schedule-name">
                  {i === cursor ? '◀ ' : '　'}
                  {a ? a.name : '—'}
                  {i === cursor ? ' ▶' : ''}
                </span>
                <span className="muted small">
                  {a && (a.ke || staminaOf(a, v)) ? [a.ke ? keText(a.ke) : '', staminaOf(a, v) ? `體力 ${staminaOf(a, v)}` : ''].filter(Boolean).join('・') : ''}
                  {p?.warn && <span className="schedule-warn">　{p.warn}</span>}
                </span>
              </li>
            );
          })}
          <li className={cursor === slots.length ? 'active' : ''} onClick={reset}>
            <span>{cursor === slots.length ? '▶ ' : '　'}恢復預設</span>
          </li>
          <li className={cursor === slots.length + 1 ? 'active' : ''} onClick={save}>
            <span>{cursor === slots.length + 1 ? '▶ ' : '　'}完成</span>
          </li>
        </ul>
        <p className="panel-info small">
          {focus
            ? focus.desc
            : cursor < slots.length
              ? '空著。按 ←→ 排一件事進來。'
              : '「睡覺」不管排在哪裡都會放到最後。照表做時遇到節慶、有人找、體力不夠或天太晚就會停下。'}
        </p>
        <p className="muted small">↑↓ 選擇　←→ 換一件事　E 確定　X 存好離開</p>
      </div>
    </div>
  );
}
