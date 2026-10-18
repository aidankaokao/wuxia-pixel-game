import { derive } from '../game/character';
import { useGame } from '../state/store';

function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="bar">
      <span className="bar-label">{label}</span>
      <div className="bar-track">
        <div className="bar-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="bar-num">
        {value}/{max}
      </span>
    </div>
  );
}

/** 常駐介面：左上角狀態、互動提示、右下角操作說明。 */
export function Hud() {
  const hero = useGame((s) => s.hero);
  const mapName = useGame((s) => s.mapName);
  const prompt = useGame((s) => s.prompt);
  const blocking = useGame((s) => s.dialog !== null || s.menuOpen || s.eventRunning);
  const inBattle = useGame((s) => s.battle !== null || s.screen !== 'game');
  const d = derive(hero);
  if (inBattle) return null;

  return (
    <>
      <div className="status pixel-frame">
        <div className="status-head">
          <span className="status-name">{hero.name}</span>
          <span className="status-title">{hero.title}</span>
        </div>
        <Bar label="氣血" value={hero.hp} max={d.maxHp} color="#d8483c" />
        <Bar label="內力" value={hero.qi} max={d.maxQi} color="#4a8ad8" />
        <Bar label="體力" value={hero.stamina} max={d.maxStamina} color="#e0b040" />
        <div className="status-foot">
          <span>◆ {mapName}</span>
          <span className="silver">銀兩 {hero.silver}</span>
        </div>
      </div>

      {prompt && !blocking && (
        <div className="prompt pixel-frame">
          <kbd>E</kbd> {prompt}
        </div>
      )}

      {!blocking && (
        <div className="help">
          <span><kbd>↑↓←→</kbd>/<kbd>WASD</kbd> 移動</span>
          <span><kbd>Shift</kbd> 奔跑</span>
          <span><kbd>E</kbd> 對話／查看</span>
          <span><kbd>X</kbd> 選單</span>
        </div>
      )}
    </>
  );
}
