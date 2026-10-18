import Phaser from 'phaser';
import { useEffect, useRef } from 'react';
import { BootScene } from './scenes/BootScene';
import { MapScene } from './scenes/MapScene';

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
      scene: [BootScene, MapScene],
    });
    return () => game.destroy(true);
  }, []);

  return <div ref={ref} className="game-canvas" />;
}
