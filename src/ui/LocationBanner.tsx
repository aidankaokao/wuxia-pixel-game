import { useEffect, useState } from 'react';
import { useGame } from '../state/store';

/** 進入地圖時浮現的地名橫幅，只在剛進入的幾秒內顯示。 */
export function LocationBanner() {
  const name = useGame((s) => s.mapName);
  const subtitle = useGame((s) => s.mapSubtitle);
  const key = useGame((s) => s.bannerKey);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!key) return;
    setVisible(true);
    const t = window.setTimeout(() => setVisible(false), 3700);
    return () => window.clearTimeout(t);
  }, [key]);

  const onTitle = useGame((s) => s.screen !== 'game');
  if (!name || !visible || onTitle) return null;
  return (
    <div key={key} className="banner">
      <div className="banner-name">{name}</div>
      {subtitle && <div className="banner-sub">{subtitle}</div>}
    </div>
  );
}
