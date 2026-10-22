import type Phaser from 'phaser';
import { autosave, canSave, describeSave, readSave, restoreHero, restoreWorld, SaveData, writeSave } from './save';
import { useGame } from '../state/store';
import { Attrs, newHero } from './character';
import { NODES } from './world/geo';
import { resetReminders } from './thought';

/** 遊戲流程：開新遊戲、讀檔、回到標題。由 React 介面呼叫。 */

let game: Phaser.Game | null = null;
export const setGame = (g: Phaser.Game | null) => {
  game = g;
};

function startMap(data: { mapId: string; spawn?: { x: number; y: number; facing: SaveData['facing'] } }) {
  if (!game) return;
  game.scene.stop('battle');
  // 存在大地圖上：x、y 是節點的位置
  if (data.mapId === 'world') {
    game.scene.stop('map');
    const w = useGame.getState().world.wpos;
    const node = w?.node ?? NODES.find((n) => n.x === data.spawn?.x && n.y === data.spawn?.y)?.id;
    game.scene.start('world', { node: node ?? 'linjiang', from: w?.from });
    return;
  }
  game.scene.stop('world');
  // 地圖場景若已在執行，start 會先停掉再重新開始
  game.scene.start('map', data);
}

/** 開新遊戲：用建立角色畫面填好的姓名與擲出的五維 */
export function newGame(profile: { surname: string; given: string; base: Attrs }) {
  resetReminders();
  useGame.getState().resetGame();
  useGame.setState({ screen: 'game', hero: newHero(profile) });
  startMap({ mapId: 'qingzhu' });
  useGame.getState().showBrief();
}

/** 進入建立角色畫面 */
export function toCreate() {
  // 地圖場景攔截過的按鍵（WASD、E、空白鍵）要放掉，否則輸入框打不出這些字
  game?.input.keyboard?.clearCaptures();
  useGame.setState({ screen: 'create' });
}

export function loadGame(d: SaveData) {
  resetReminders();
  const st = useGame.getState();
  st.resetGame();
  useGame.setState({
    screen: 'game',
    hero: restoreHero(d.hero),
    flags: { ...d.flags },
    world: restoreWorld(d.world),
    settings: { ...st.settings, ...d.settings },
  });
  startMap({ mapId: d.mapId, spawn: { x: d.x, y: d.y, facing: d.facing } });
  useGame.getState().showBrief();
}

export function toTitle() {
  autosave();
  game?.scene.stop('battle');
  game?.scene.stop('map');
  game?.scene.stop('world');
  useGame.getState().resetGame();
  useGame.setState({ screen: 'title' });
}

/** 即時存檔（Ctrl/Cmd+S） */
export function quickSave() {
  const st = useGame.getState();
  if (st.screen !== 'game') return;
  if (!canSave()) return st.showToast('對話、劇情或戰鬥中無法存檔');
  st.showToast(writeSave('quick') ? '已即時存檔' : '存檔失敗');
}

/** 讀取即時存檔（F9），先確認 */
export async function quickLoad() {
  const st = useGame.getState();
  if (st.screen !== 'game' || st.confirm || st.panel) return;
  if (!canSave()) return st.showToast('對話、劇情或戰鬥中無法讀檔');
  const d = readSave('quick');
  if (!d) return st.showToast('還沒有即時存檔');
  if (!(await st.askConfirm(`要讀取即時存檔嗎？\n${describeSave(d)}\n\n目前還沒存檔的進度會遺失。`, '讀取'))) return;
  st.setMenu(false);
  loadGame(d);
  st.showToast('已讀取即時存檔');
}

/** 全域快捷鍵：Ctrl/Cmd+S 即時存檔、F9 讀取即時存檔。回傳移除監聽的函式。 */
export function bindHotkeys() {
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
      // 擋掉瀏覽器的「另存網頁」
      e.preventDefault();
      if (!e.repeat) quickSave();
    } else if (e.key === 'F9' && !e.repeat) {
      e.preventDefault();
      quickLoad();
    }
  };
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}
