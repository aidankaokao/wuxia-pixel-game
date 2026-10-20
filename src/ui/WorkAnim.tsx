import { useEffect, useState } from 'react';
import { WORK_FRAMES, workFrame } from '../game/art/work';
import { useGame } from '../state/store';

/** 做事的過場動畫：一兩秒，畫面中央放大顯示，底下是說明與進度條 */
export function WorkAnim() {
  const work = useGame((s) => s.work);
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!work) return;
    setF(0);
    const t = setInterval(() => setF((n) => (n + 1) % WORK_FRAMES), 220);
    return () => clearInterval(t);
  }, [work]);
  if (!work) return null;
  return (
    <div className="work-anim pixel-frame" key={work.id}>
      <img src={workFrame(work.kind, f)} alt="" />
      <div className="work-caption">{work.text}</div>
      <div className="work-bar">
        <div className="work-fill" style={{ animationDuration: `${work.ms}ms` }} />
      </div>
    </div>
  );
}
