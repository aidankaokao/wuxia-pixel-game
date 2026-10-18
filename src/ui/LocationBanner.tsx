import { useGame } from '../state/store';

/** 進入地圖時浮現的地名橫幅（以 key 重新掛載來重播動畫）。 */
export function LocationBanner() {
  const name = useGame((s) => s.mapName);
  const subtitle = useGame((s) => s.mapSubtitle);
  const key = useGame((s) => s.bannerKey);
  if (!name) return null;
  return (
    <div key={key} className="banner">
      <div className="banner-name">{name}</div>
      {subtitle && <div className="banner-sub">{subtitle}</div>}
    </div>
  );
}
