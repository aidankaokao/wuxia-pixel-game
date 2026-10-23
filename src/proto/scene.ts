import * as THREE from 'three';
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import type { Env } from './env';

/** 試作品的一個場景（村莊、大地圖、戰鬥）：主程式負責鏡頭、光線、天氣，場景負責地形與人物 */
export interface ProtoScene {
  root: THREE.Group;
  /** 鏡頭看著的地方（跟著主角） */
  focus: THREE.Vector3;
  update(dt: number, cam: CamInfo): void;
  /** 按鍵（回傳 true 表示吃掉了） */
  key?(code: string, down: boolean): boolean;
  /** 滑鼠點地圖 */
  click?(ray: THREE.Raycaster): void;
  /** 畫面左下的說明 */
  info(): string;
  dispose?(): void;
}
export interface CamInfo {
  yaw: number;
  pitch: number;
}
export interface SceneCtx {
  env: Env;
  /** 換場景（大地圖走進青竹村） */
  go: (id: 'village' | 'world' | 'battle' | 'plain' | 'river') => void;
}

/** 浮在 3D 物件上的 HTML 字（地名、名字、傷害數字） */
export function label(text: string, cls = 'p-label'): CSS2DObject {
  const div = document.createElement('div');
  div.className = cls;
  div.textContent = text;
  return new CSS2DObject(div);
}

/** 一批同樣形狀的東西（樹、草、柵欄）合成一個 InstancedMesh */
export class Batch {
  private items: { m: THREE.Matrix4; c?: THREE.Color }[] = [];
  constructor(
    private geo: THREE.BufferGeometry,
    private mat: THREE.Material,
  ) {}
  add(pos: THREE.Vector3, scale: THREE.Vector3 | number = 1, rotY = 0, color?: THREE.ColorRepresentation) {
    const s = typeof scale === 'number' ? new THREE.Vector3(scale, scale, scale) : scale;
    const m = new THREE.Matrix4().compose(pos, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, 0)), s);
    this.items.push({ m, c: color !== undefined ? new THREE.Color(color) : undefined });
  }
  build(): THREE.InstancedMesh | null {
    if (!this.items.length) return null;
    const mesh = new THREE.InstancedMesh(this.geo, this.mat, this.items.length);
    this.items.forEach((it, i) => {
      mesh.setMatrixAt(i, it.m);
      if (it.c) mesh.setColorAt(i, it.c);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }
}

/** 簡單的 0–1 雜湊 */
export const h01 = (x: number, y: number, s = 0) => {
  let n = (x * 374761393 + y * 668265263 + s * 1442695041) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};
