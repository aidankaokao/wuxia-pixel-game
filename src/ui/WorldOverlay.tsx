import { mountDef } from '../game/mounts';
import { keText } from '../game/thought';
import { AREA_LABELS, edgesFrom, NODE_KIND_NAME, NODES, nodeById } from '../game/world/geo';
import { useGame } from '../state/store';

/** 道路往哪個方向（看路的頭幾格），顯示成箭頭 */
function arrowOf(from: { x: number; y: number }, path: [number, number][]) {
  const [px, py] = path[Math.min(3, path.length - 1)];
  const dx = px - from.x;
  const dy = py - from.y;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? '→' : '←') : dy > 0 ? '↓' : '↑';
}

/**
 * 大地圖的文字：地名、節點名（位置由 WorldScene 每幀擺好，見 data-wx／data-wy），
 * 以及下方的資訊卡：這裡是哪裡、往哪些地方的路、各要走多久。
 */
export function WorldOverlay() {
  const wm = useGame((s) => s.worldMap);
  const hidden = useGame((s) => s.battle !== null || s.screen !== 'game');
  const hero = useGame((s) => s.hero);
  if (!wm || hidden) return null;
  const speed = hero.riding ? (mountDef(hero.mount)?.speed ?? 1) : 1;
  const here = wm.node ? nodeById(wm.node) : null;
  return (
    <>
      {AREA_LABELS.map((a) => (
        <div key={a.text} className={`world-label area ${a.kind}`} data-wx={a.x} data-wy={a.y}>
          {a.text}
        </div>
      ))}
      {NODES.map((n) => (
        <div key={n.id} className={`world-label node ${n.locked ? 'locked' : ''} ${n.id === wm.node ? 'here' : ''}`} data-wx={n.x} data-wy={n.y}>
          {n.locked ? '？' : n.name}
        </div>
      ))}
      <div className="world-card pixel-frame">
        {here ? (
          <>
            <div className="world-card-head">
              <span className="world-card-name">{here.name}</span>
              <span className="muted small">{NODE_KIND_NAME[here.kind]}</span>
            </div>
            <p className="small">{here.desc}</p>
            {here.crossing && wm.from && <p className="small muted">（要到對岸，得進渡口坐船過河）</p>}
            <ul className="world-roads">
              {edgesFrom(here.id, wm.from).map((r) => (
                <li key={r.to.id} className={r.to.locked ? 'muted' : ''}>
                  <kbd>{arrowOf(here, r.path)}</kbd> {r.edge.name}・{r.to.locked ? '？（還沒開放）' : r.to.name}
                  {!r.to.locked && <span className="muted">　約{keText(Math.max(1, Math.round(r.edge.ke / speed)))}</span>}
                </li>
              ))}
            </ul>
            <p className="muted small">{here.enter ? <><kbd>E</kbd> 進入{here.name}　</> : null}<kbd>X</kbd> 選單{speed > 1 ? '　（騎著馬，路上快一些）' : ''}</p>
          </>
        ) : (
          <p className="small">前往{wm.to ? nodeById(wm.to).name : ''}途中……</p>
        )}
      </div>
    </>
  );
}
