import Phaser from 'phaser';
import { CHAR_H, CHAR_W } from '../constants';
import { CHARACTERS, drawCharacterSheet } from '../art/characters';
import { allProps } from '../art/props';
import { createWalkAnims } from '../entities/Actor';

/** 啟動場景：把程式畫好的人物、物件素材註冊成 Phaser 貼圖，然後進入第一張地圖。 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create() {
    for (const [key, style] of Object.entries(CHARACTERS)) {
      const tex = this.textures.addCanvas(key, drawCharacterSheet(style))!;
      for (let i = 0; i < 12; i++) tex.add(i, 0, (i % 3) * CHAR_W, Math.floor(i / 3) * CHAR_H, CHAR_W, CHAR_H);
      createWalkAnims(this, key);
    }
    for (const [key, art] of Object.entries(allProps())) {
      this.textures.addCanvas(key, art.canvas);
    }
    this.scene.start('map', { mapId: 'qingzhu' });
  }
}
