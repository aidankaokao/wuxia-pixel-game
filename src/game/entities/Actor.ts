import Phaser from 'phaser';
import { DIR_ROW, DIR_VEC, Dir, TILE } from '../constants';

/**
 * 地圖上會走動的人物（主角與 NPC 共用）。
 * 採掌機 RPG 的格子移動：一次走一整格，走的途中不能轉向。
 */
export class Actor {
  readonly sprite: Phaser.GameObjects.Sprite;
  tx: number;
  ty: number;
  facing: Dir;
  moving = false;

  constructor(
    private scene: Phaser.Scene,
    readonly texKey: string,
    tx: number,
    ty: number,
    facing: Dir = 'down',
  ) {
    this.tx = tx;
    this.ty = ty;
    this.facing = facing;
    const p = Actor.feet(tx, ty);
    this.sprite = scene.add.sprite(p.x, p.y, texKey, standFrame(facing)).setOrigin(0.5, 1);
    this.sprite.setDepth(p.y);
  }

  /** 某一格的腳底位置（格子底邊中央） */
  static feet(tx: number, ty: number) {
    return { x: tx * TILE + TILE / 2, y: (ty + 1) * TILE };
  }

  /** 面前那一格 */
  front(dir: Dir = this.facing) {
    return { x: this.tx + DIR_VEC[dir].x, y: this.ty + DIR_VEC[dir].y };
  }

  face(dir: Dir) {
    this.facing = dir;
    if (!this.moving) this.stand();
  }

  stand() {
    this.sprite.anims.stop();
    this.sprite.setFrame(standFrame(this.facing));
  }

  /** 往 dir 走一格（呼叫前先確認目標格可以走）。 */
  step(dir: Dir, ms: number, onDone?: () => void) {
    this.facing = dir;
    this.moving = true;
    this.tx += DIR_VEC[dir].x;
    this.ty += DIR_VEC[dir].y;
    // 每走一格換兩個動畫格
    this.sprite.anims.play({ key: `${this.texKey}-${dir}`, frameRate: 2000 / ms }, true);
    const p = Actor.feet(this.tx, this.ty);
    this.scene.tweens.add({
      targets: this.sprite,
      x: p.x,
      y: p.y,
      duration: ms,
      onUpdate: () => this.sprite.setDepth(this.sprite.y),
      onComplete: () => {
        this.moving = false;
        this.sprite.setDepth(p.y);
        onDone?.();
      },
    });
  }

  destroy() {
    this.sprite.destroy();
  }
}

const standFrame = (dir: Dir) => DIR_ROW[dir] * 3 + 1;

/** 為一張人物精靈表建立四個方向的走路動畫。 */
export function createWalkAnims(scene: Phaser.Scene, texKey: string) {
  (Object.keys(DIR_ROW) as Dir[]).forEach((dir) => {
    const row = DIR_ROW[dir];
    scene.anims.create({
      key: `${texKey}-${dir}`,
      frames: [0, 1, 2, 1].map((c) => ({ key: texKey, frame: row * 3 + c })),
      frameRate: 8,
      repeat: -1,
    });
  });
}
