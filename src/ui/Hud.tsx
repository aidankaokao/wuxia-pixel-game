import { derive } from '../game/character';
import { fameTitle } from '../game/social';
import { dateText, festivalOf, isXunxiu, solarTermOf, timeText, WEATHER_NAME } from '../game/time';
import { useGame } from '../state/store';

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

/** 常駐介面：左上角狀態、互動提示、右下角操作說明。 */
export function Hud() {
  const hero = useGame((s) => s.hero);
  const mapName = useGame((s) => s.mapName);
  const day = useGame((s) => s.world.day);
  const time = useGame((s) => s.world.time);
  const weather = useGame((s) => s.world.weather);
  const prompt = useGame((s) => s.prompt);
  const blocking = useGame((s) => s.dialog !== null || s.menuOpen || s.eventRunning || s.brief !== null);
  const inBattle = useGame((s) => s.battle !== null || s.screen !== 'game');
  const d = derive(hero);
  if (inBattle) return null;

  return (
    <>
      <div className="status pixel-frame">
        <div className="status-head">
          <span className="status-name">{hero.name}</span>
          <span className="status-title">{fameTitle(hero.fame)}</span>
        </div>
        <Bar label="氣血" value={hero.hp} max={d.maxHp} color="#d8483c" />
        <Bar label="內力" value={hero.qi} max={d.maxQi} color="#4a8ad8" />
        <Bar label="體力" value={hero.stamina} max={d.maxStamina} color="#e0b040" />
        <div className="status-foot">
          <span>◆ {mapName}</span>
          <span className="silver">銀兩 {hero.silver}</span>
        </div>
        <div className="status-foot status-time">
          <span>
            {dateText(day)}　{timeText(time)}
          </span>
          <span>
            {festivalOf(day) && <span className="festival">{festivalOf(day)}　</span>}
            {isXunxiu(day) && <span className="festival">旬休　</span>}
            {solarTermOf(day) && <span className="festival">{solarTermOf(day)}　</span>}
            {WEATHER_NAME[weather]}
          </span>
        </div>
      </div>

      {prompt && !blocking &&
        (typeof prompt === 'string' ? (
          <div className="prompt pixel-frame">
            <kbd>E</kbd> {prompt}
          </div>
        ) : (
          // 人物：列出目前能做的事與對應按鍵
          <div className="prompt prompt-list pixel-frame">
            <div className="prompt-title">{prompt.title}</div>
            {prompt.actions.map((a) => (
              <div key={a.key}>
                <kbd>{a.key}</kbd> {a.label}
              </div>
            ))}
          </div>
        ))}

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
