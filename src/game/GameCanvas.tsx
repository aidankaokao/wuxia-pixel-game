import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { BootScene } from './scenes/BootScene';
import { BattleScene } from './scenes/BattleScene';
import { MapScene } from './scenes/MapScene';
import { autosave } from './save';
import { bindHotkeys, setGame } from './session';

/** 把 Phaser 遊戲掛進 React，畫布填滿整個視窗。 */
export function GameCanvas() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: ref.current!,
      pixelArt: true,
      roundPixels: true,
      backgroundColor: '#14121a',
      scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
      scene: [BootScene, MapScene, BattleScene],
    });
    setGame(game);
    // 關閉或重新整理頁面前自動存檔
    window.addEventListener('beforeunload', autosave);
    const unbind = bindHotkeys();
    return () => {
      unbind();
      window.removeEventListener('beforeunload', autosave);
      setGame(null);
      game.destroy(true);
    };
  }, []);

  return <div ref={ref} className="game-canvas" />;
}
