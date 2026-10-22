import { useGame } from '../state/store';

/**
 * 地圖上匾額與幌子的字：板子由 MapScene 畫，字疊在上面（Phaser 不畫字），
 * 位置由 MapScene 每幀擺（data-mx／data-my 是世界座標），大小跟著鏡頭的縮放倍率（--z）。
 */
export function MapSigns() {
  const signs = useGame((s) => s.mapSigns);
  const hidden = useGame((s) => s.battle !== null || s.screen !== 'game' || s.worldMap !== null);
  if (hidden || !signs.length) return null;
  return (
    <div className="map-signs">
      {signs.map((s) => (
        <span key={s.key} className={`map-sign sign-${s.kind}`} data-mx={s.x} data-my={s.y}>
          {s.text}
        </span>
      ))}
    </div>
  );
}
