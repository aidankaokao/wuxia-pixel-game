import { useEffect, useRef, useState } from 'react';
import { FishResult, useGame } from '../state/store';
import { isCancel, isConfirm, useKeys } from './useKeys';

/**
 * 釣魚小遊戲：先等浮標下沉（太早提竿會把魚嚇跑），浮標一沉，下面跳出一條拉力條，
 * 指針來回擺動，看準指針落在紅區時按 E 提竿；正中金心是「漂亮」，多拿經驗。
 * 浮標沉下去後太久不提竿，魚會吐鉤跑掉。
 */

type Phase = 'wait' | 'bite' | 'done';
const BITE_MS = 3600;

export function FishingGame() {
  const game = useGame((s) => s.fishing);
  const [phase, setPhase] = useState<Phase>('wait');
  const [pos, setPos] = useState(0);
  const [result, setResult] = useState<{ r: FishResult; text: string } | null>(null);
  const zoneAt = useRef(0.5);
  const startAt = useRef(0);
  const posRef = useRef(0);

  // 每次開始：先等一會兒浮標才沉
  useEffect(() => {
    if (!game) return;
    setPhase('wait');
    setResult(null);
    zoneAt.current = game.zone / 2 + Math.random() * (1 - game.zone);
    const t = setTimeout(() => {
      startAt.current = performance.now();
      setPhase('bite');
    }, 900 + Math.random() * 1600);
    return () => clearTimeout(t);
  }, [game]);

  // 拉力條上的指針：三角波來回擺動
  useEffect(() => {
    if (!game || phase !== 'bite') return;
    let raf = 0;
    const tick = (now: number) => {
      const t = (now - startAt.current) / 1000;
      if (now - startAt.current > BITE_MS) return finish('miss', '浮標浮了上來——魚吐了鉤，溜走了。');
      const x = (t * game.speed) % 2;
      posRef.current = x < 1 ? x : 2 - x;
      setPos(posRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, game]);

  const finish = (r: FishResult, text: string) => {
    setPhase('done');
    setResult({ r, text });
    setTimeout(() => useGame.getState().fishing?.resolve(r), r === 'miss' ? 1100 : 800);
  };

  useKeys(
    !!game && phase !== 'done',
    (k) => {
      if (isCancel(k)) return finish('miss', '你收起了釣線。');
      if (!isConfirm(k) || !game) return;
      if (phase === 'wait') return finish('miss', '提竿太早，水花一濺，魚全嚇跑了。');
      const d = Math.abs(posRef.current - zoneAt.current);
      if (d <= game.zone / 6) finish('perfect', '漂亮！手腕一抖，魚被俐落地拉出水面！');
      else if (d <= game.zone / 2) finish('ok', '釣起來了！');
      else finish('miss', '提竿的時機不對，魚掙脫了魚鉤。');
    },
    true,
  );

  if (!game) return null;
  return (
    <div className="fishing pixel-frame">
      <div className={`fishing-water ${phase}`}>
        <span className="fishing-float" />
        <span className="fishing-ring" />
      </div>
      {phase === 'wait' && <p className="fishing-text">浮標靜靜漂著……等它沉下去再提竿。</p>}
      {phase === 'bite' && <p className="fishing-text bite">浮標一沉——看準了，按 E 提竿！</p>}
      {phase === 'done' && result && <p className={`fishing-text ${result.r}`}>{result.text}</p>}
      <div className={`fishing-bar ${phase === 'wait' ? 'idle' : ''}`}>
        <div className="fishing-zone" style={{ left: `${(zoneAt.current - game.zone / 2) * 100}%`, width: `${game.zone * 100}%` }}>
          <div className="fishing-heart" />
        </div>
        <div className="fishing-needle" style={{ left: `${pos * 100}%` }} />
      </div>
      <p className="fishing-help">E 提竿　X 收線</p>
    </div>
  );
}
