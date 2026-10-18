import Phaser from 'phaser';
import { CHAR_H, CHAR_W } from '../constants';
import { CHARACTERS, drawCharacterSheet } from '../art/characters';
import { ANIMALS, drawAnimalSheet } from '../art/animals';
import { allProps } from '../art/props';
import { createWalkAnims } from '../entities/Actor';
import { devStart } from '../save';
import { useGame } from '../../state/store';

/** 啟動場景：把程式畫好的人物、物件素材註冊成 Phaser 貼圖，然後進入第一張地圖。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    const sheets = [
      ...Object.entries(CHARACTERS).map(([k, s]) => [k, drawCharacterSheet(s)] as const),
      ...Object.entries(ANIMALS).map(([k, s]) => [k, drawAnimalSheet(s)] as const),
    ];
    for (const [key, canvas] of sheets) {
      const tex = this.textures.addCanvas(key, canvas)!;
      for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * CHAR_W, Math.floor(i / 3) * CHAR_H, CHAR_W, CHAR_H);
      createWalkAnims(this, key);
    }
    for (const [key, art] of Object.entries(allProps())) {
      this.textures.addCanvas(key, art.canvas);
    }
    useGame.setState({ booted: true });
    // 平常由標題畫面開始遊戲；開發用網址參數則直接進入地圖：
    // ?map=canglan&at=19,28 從指定地圖、位置開始；?flags=q_bandits:1,stele:1 預設劇情旗標
    if (!devStart()) return;
    useGame.setState({ screen: 'game' });
    const q = new URLSearchParams(location.search);
    for (const pair of (q.get('flags') ?? '').split(',').filter(Boolean)) {
      const [k, v] = pair.split(':');
      useGame.getState().setFlag(k, Number(v ?? 1));
    }
    const at = q.get('at')?.split(',').map(Number);
    this.scene.start('map', {
      mapId: q.get('map') ?? 'qingzhu',
      spawn: at ? { x: at[0], y: at[1], facing: 'up' } : undefined,
    });
  }
}
