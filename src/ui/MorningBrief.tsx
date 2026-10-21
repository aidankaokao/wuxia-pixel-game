import { useEffect, useRef } from 'react';
import { todayTasks, WEATHER_LINE, type DayTask } from '../game/daily';
import { QUESTS } from '../game/story/quests';
import { dateText, festivalOf, isXunxiu, timeText, WEATHER_NAME } from '../game/time';
import { useGame } from '../state/store';
import { isCancel, isConfirm, useKeys } from './useKeys';

/** 長期的事在提要裡最多列幾件 */
const LONG_MAX = 3;

const MARK: Record<DayTask['state'], string> = { todo: '□', done: '■', missed: '×' };

/** 今日事清單（提要與選單「江湖事」共用） */
export function TaskList({ tasks }: { tasks: DayTask[] }) {
  if (!tasks.length) return <p className="muted small">今天沒有非做不可的事，四處走走吧。</p>;
  return (
    <ul className="task-list">
      {tasks.map((t) => (
        <li key={t.text} className={`task ${t.state}`}>
          <span className="task-mark">{MARK[t.state]}</span>
          <span>
            {t.text}
            {t.state === 'missed' && <span className="task-note">（今天錯過了）</span>}
            {t.note && <span className="task-note">　{t.note}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** 進行中的長期任務 */
export const ongoingQuests = (flags: Record<string, number>) =>
  QUESTS.map((q) => ({ title: q.title, st: q.status(flags) })).filter((x) => x.st && !x.st.done);

/** 早晨提要：睡醒、讀檔、開新遊戲時跳出，像翻開一頁日誌。E 或 X 關閉。 */
export function MorningBrief() {
  const brief = useGame((s) => s.brief);
  const hero = useGame((s) => s.hero);
  const flags = useGame((s) => s.flags);
  const world = useGame((s) => s.world);
  // 剛跳出來時忽略按鍵，免得上一個畫面的確認鍵直接把它關掉
  const shownAt = useRef(0);
  useEffect(() => {
    if (brief) shownAt.current = performance.now();
  }, [brief]);

  useKeys(!!brief, (k) => {
    if (performance.now() - shownAt.current < 300) return;
    if (isConfirm(k) || isCancel(k)) brief?.resolve();
  });

  if (!brief) return null;
  const tasks = todayTasks({ hero, flags, world });
  const quests = ongoingQuests(flags);
  const fest = festivalOf(world.day);
  return (
    <div className="menu-backdrop">
      <div className="brief pixel-frame">
        <div className="brief-head">
          <span className="brief-date">{dateText(world.day)}</span>
          {fest && <span className="festival">{fest}</span>}
          {isXunxiu(world.day) && <span className="festival">旬休</span>}
          <span className="brief-weather">
            {WEATHER_NAME[world.weather]}　{timeText(world.time)}
          </span>
        </div>
        <p className="brief-line">{WEATHER_LINE[world.weather]}</p>

        <h3>今日</h3>
        <TaskList tasks={tasks} />

        {quests.length > 0 && (
          <>
            <h3>長期</h3>
            <ul className="task-list">
              {quests.slice(0, LONG_MAX).map((q) => (
                <li key={q.title} className="task">
                  <span className="task-mark">◇</span>
                  <span>{q.title}</span>
                </li>
              ))}
            </ul>
            {quests.length > LONG_MAX && <p className="muted small">還有 {quests.length - LONG_MAX} 件，見選單「江湖事」。</p>}
          </>
        )}

        <p className="brief-foot muted small">
          <kbd>E</kbd> 開始今天　　選單「江湖事」隨時可以再看
        </p>
      </div>
    </div>
  );
}
