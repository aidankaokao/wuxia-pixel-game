import type Phaser from 'phaser';
import { autosave, restoreHero, SaveData } from './save';
import { useGame } from '../state/store';
import { Attrs, newHero } from './character';

/** 遊戲流程：開新遊戲、讀檔、回到標題。由 React 介面呼叫。 */

let game: Phaser.Game | null = null;
export const setGame = (g: Phaser.Game | null) => {
  game = g;
};

function startMap(data: { mapId: string; spawn?: { x: number; y: number; facing: SaveData['facing'] } }) {
  if (!game) return;
  game.scene.stop('battle');
  // 地圖場景若已在執行，start 會先停掉再重新開始
  game.scene.start('map', data);
}

/** 開新遊戲：用建立角色畫面填好的姓名與擲出的五維 */
export function newGame(profile: { surname: string; given: string; base: Attrs }) {
  useGame.getState().resetGame();
  useGame.setState({ screen: 'game', hero: newHero(profile) });
  startMap({ mapId: 'qingzhu' });
}

/** 進入建立角色畫面 */
export function toCreate() {
  // 地圖場景攔截過的按鍵（WASD、E、空白鍵）要放掉，否則輸入框打不出這些字
  game?.input.keyboard?.clearCaptures();
  useGame.setState({ screen: 'create' });
}

export function loadGame(d: SaveData) {
  const st = useGame.getState();
  st.resetGame();
  useGame.setState({
    screen: 'game',
    hero: restoreHero(d.hero),
    flags: { ...d.flags },
    settings: { ...st.settings, ...d.settings },
  });
  startMap({ mapId: d.mapId, spawn: { x: d.x, y: d.y, facing: d.facing } });
}

export function toTitle() {
  autosave();
  game?.scene.stop('battle');
  game?.scene.stop('map');
  useGame.getState().resetGame();
  useGame.setState({ screen: 'title' });
}
