import * as THREE from 'three';
import { CHARACTERS, type CharStyle } from '../game/art/characters';
import { snowable } from './env';

/**
 * 試作品的人物（第二版，做細）：低多邊形 Q 版小人，顏色照像素人物的設定（CharStyle）。
 * - 臉：畫在頭的前半面上的貼圖（眉、眼、亮點、嘴、腮紅），會眨眼；山賊皺眉、老人瞇眼、姑娘有睫毛。
 * - 頭髮：髮帽、瀏海、鬢髮，依髮型加髮髻與髮帶、髮簪，或雙髻、長髮（走路會擺）；光頭綁頭巾；可戴斗笠。
 * - 衣服：交領（內衫露出一個 V）、寬袖、腰帶打結垂兩條帶子、袍擺鑲邊；老人有鬍子；帶劍的人腰間掛劍。
 * 朝 +z 為「面向前方」，yaw 設定面向。（HD-2D 的像素立牌版本使用者看過後不採用，已拿掉。）
 */

export interface Figure {
  obj: THREE.Object3D;
  /** 面向（弧度，0 是 +z） */
  yaw: number;
  tick(dt: number, moving: boolean): void;
}

type Mood = 'calm' | 'angry' | 'old';

const mat = (color: string) => snowable(new THREE.MeshStandardMaterial({ color, roughness: 0.75 }), 0.05, 0.25);
const mesh = (geo: THREE.BufferGeometry, color: string | THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) => {
  const m = new THREE.Mesh(geo, typeof color === 'string' ? mat(color) : color);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
};
const lighten = (c: string, k: number) => '#' + new THREE.Color(c).lerp(new THREE.Color('#ffffff'), k).getHexString();
const isLight = (c: string) => new THREE.Color(c).getHSL({ h: 0, s: 0, l: 0 }).l > 0.55;

/** 臉的貼圖：睜眼、閉眼兩張 */
function faceTextures(s: CharStyle, mood: Mood, girl: boolean) {
  const draw = (closed: boolean) => {
    const cv = document.createElement('canvas');
    cv.width = 128;
    cv.height = 96;
    const c = cv.getContext('2d')!;
    const ink = '#2a1e1e';
    const brow = s.hairStyle === 'bald' ? '#5a4030' : s.beard ?? s.hair;
    c.lineCap = 'round';
    for (const side of [-1, 1]) {
      const ex = 64 + side * 22;
      const ey = 52;
      // 眉毛：山賊往中間壓、老人垂下
      c.strokeStyle = brow;
      c.lineWidth = mood === 'old' ? 5 : 4;
      c.beginPath();
      const tilt = mood === 'angry' ? 7 : mood === 'old' ? -5 : 0;
      c.moveTo(ex - side * 10, ey - 18 + tilt * 0);
      c.lineTo(ex + side * 9, ey - 18 - tilt * -1 + (mood === 'angry' ? -6 : mood === 'old' ? 4 : -2));
      c.stroke();
      if (closed || mood === 'old') {
        // 閉眼／瞇眼：一道彎線
        c.strokeStyle = ink;
        c.lineWidth = 3.5;
        c.beginPath();
        c.arc(ex, ey - 2, 7, 0.15 * Math.PI, 0.85 * Math.PI);
        c.stroke();
      } else {
        c.fillStyle = ink;
        c.beginPath();
        c.ellipse(ex, ey, 6.5, 9, 0, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#ffffff';
        c.beginPath();
        c.arc(ex + 2, ey - 3.5, 2.6, 0, Math.PI * 2);
        c.fill();
        c.beginPath();
        c.arc(ex - 2, ey + 3.5, 1.2, 0, Math.PI * 2);
        c.fill();
        if (girl) {
          // 睫毛
          c.strokeStyle = ink;
          c.lineWidth = 2.5;
          c.beginPath();
          c.moveTo(ex + side * 5, ey - 7);
          c.lineTo(ex + side * 10, ey - 10);
          c.stroke();
        }
      }
      // 腮紅
      if (girl || s.short) {
        c.fillStyle = 'rgba(232,120,120,0.45)';
        c.beginPath();
        c.ellipse(ex + side * 4, ey + 15, 8, 4, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    // 嘴
    c.strokeStyle = girl ? '#b0484a' : '#6a3a2a';
    c.lineWidth = 3;
    c.beginPath();
    if (mood === 'angry') {
      c.moveTo(56, 77);
      c.quadraticCurveTo(64, 72, 72, 77);
    } else c.arc(64, 70, 6, 0.2 * Math.PI, 0.8 * Math.PI);
    c.stroke();
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  return [draw(false), draw(true)];
}

/** Q 版小人 */
export function chibi(s: CharStyle, mood: Mood = 'calm'): Figure {
  const girl = s.hairStyle === 'bun' || s.hairStyle === 'twinbuns' || s.hairStyle === 'long';
  const old = mood === 'old' || (!!s.beard && isLight(s.beard)) || (s.hairStyle !== 'bald' && isLight(s.hair));
  const face: Mood = mood === 'angry' ? 'angry' : old ? 'old' : 'calm';
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  if (s.short) root.scale.setScalar(0.82);

  // ── 腿與鞋 ──
  const legs: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.085, 0.2, 0);
    mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.2, 8).translate(0, -0.1, 0), s.pants, leg);
    const shoe = mesh(new THREE.CapsuleGeometry(0.055, 0.08, 4, 8), s.shoe, leg, 0, -0.19, 0.03);
    shoe.rotation.x = Math.PI / 2;
    body.add(leg);
    legs.push(leg);
  }
  // ── 袍子：下擺、鑲邊、上身 ──
  mesh(new THREE.CylinderGeometry(0.19, 0.29, 0.34, 16), s.robe, body, 0, 0.3, 0);
  mesh(new THREE.CylinderGeometry(0.292, 0.3, 0.05, 16), s.robeDark, body, 0, 0.14, 0);
  // 前襟的開衩
  mesh(new THREE.BoxGeometry(0.05, 0.32, 0.02), s.robeDark, body, 0.06, 0.3, 0.245).rotation.x = -0.28;
  const torso = mesh(new THREE.CylinderGeometry(0.165, 0.195, 0.27, 16), s.robe, body, 0, 0.56, 0);
  // 交領：內衫露出一個 V，外面一道深色領邊
  for (const side of [-1, 1]) {
    const lap = mesh(new THREE.BoxGeometry(0.035, 0.2, 0.02), s.inner, body, side * 0.035, 0.6, 0.168);
    lap.rotation.z = side * 0.5;
    const trim = mesh(new THREE.BoxGeometry(0.025, 0.22, 0.02), s.robeDark, body, side * 0.06, 0.6, 0.172);
    trim.rotation.z = side * 0.5;
  }
  // 腰帶與結、垂下的兩條帶子
  mesh(new THREE.CylinderGeometry(0.198, 0.2, 0.065, 16), s.sash, body, 0, 0.44, 0);
  mesh(new THREE.SphereGeometry(0.04, 8, 6), s.sash, body, -0.08, 0.44, 0.19);
  const tails: THREE.Mesh[] = [];
  for (const dx of [-0.1, -0.06]) {
    const tail = mesh(new THREE.BoxGeometry(0.03, 0.16, 0.012).translate(0, -0.08, 0), s.sash, body, dx, 0.43, 0.2);
    tails.push(tail);
  }
  // ── 手臂：寬袖、袖口、手 ──
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.2, 0.66, 0);
    arm.rotation.z = side * 0.18;
    mesh(new THREE.CylinderGeometry(0.055, 0.1, 0.27, 10).translate(0, -0.13, 0), s.robe, arm);
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.035, 10), s.robeDark, arm, 0, -0.27, 0);
    mesh(new THREE.SphereGeometry(0.045, 8, 6), s.skin, arm, 0, -0.3, 0.01);
    body.add(arm);
    arms.push(arm);
  }
  // ── 頭 ──
  const head = new THREE.Group();
  head.position.y = 0.97;
  if (s.short) head.scale.setScalar(1.08);
  body.add(head);
  const R = 0.27;
  const skull = mesh(new THREE.SphereGeometry(R, 24, 18), s.skin, head);
  skull.scale.y = 0.96;
  for (const side of [-1, 1]) mesh(new THREE.SphereGeometry(0.035, 8, 6), s.skin, head, side * 0.26, -0.03, -0.03);
  // 臉：前半面的貼圖
  const [open, shut] = faceTextures(s, face, girl);
  const faceMat = new THREE.MeshStandardMaterial({ map: open, transparent: true, alphaTest: 0.1, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 });
  const faceGeo = new THREE.SphereGeometry(R * 1.004, 20, 14, Math.PI / 2 - 0.95, 1.9, Math.PI / 2 - 0.62, 1.25);
  const faceMesh = new THREE.Mesh(faceGeo, faceMat);
  faceMesh.scale.y = 0.96;
  faceMesh.userData.noOutline = true;
  head.add(faceMesh);
  // 鼻子：一點點
  mesh(new THREE.SphereGeometry(0.018, 6, 4), lighten(s.skin, -0.1), head, 0, -0.04, R * 0.98);

  const swayers: THREE.Object3D[] = [];
  if (s.hairStyle !== 'bald') {
    const hair = s.hair;
    // 髮帽：蓋住頭頂與後腦，額頭露出來
    const cap = mesh(new THREE.SphereGeometry(R * 1.05, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.56), hair, head);
    cap.rotation.x = -0.42;
    // 後腦再補一塊，頭髮比較有份量
    mesh(new THREE.SphereGeometry(R * 1.02, 16, 12), hair, head, 0, -0.03, -0.05).scale.set(1, 0.92, 0.95);
    // 瀏海：一排往下垂的小髮束
    for (let i = -1; i <= 1; i++) {
      const a = i * 0.45 + 0.08;
      const lock = mesh(new THREE.ConeGeometry(0.075, 0.11, 6), hair, head, Math.sin(a) * R * 0.95, 0.165 - Math.abs(i) * 0.02, Math.cos(a) * R * 0.88);
      lock.rotation.set(Math.PI - 0.85, a, i * 0.25);
    }
    // 鬢髮
    for (const side of [-1, 1]) {
      const sidelock = mesh(new THREE.CapsuleGeometry(0.04, 0.14, 4, 8), hair, head, side * 0.24, -0.08, 0.1);
      sidelock.rotation.z = side * 0.1;
    }
    const bun = (x: number, y: number, z: number, r: number) => mesh(new THREE.SphereGeometry(r, 12, 10), hair, head, x, y, z);
    const tie = (x: number, y: number, z: number, r: number, rotX = Math.PI / 2) => {
      const t = mesh(new THREE.TorusGeometry(r, 0.018, 6, 14), s.band ?? '#8a2e26', head, x, y, z);
      t.rotation.x = rotX;
    };
    const pin = (x: number, y: number, z: number, rz: number) => {
      const p = mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.26, 5), '#d8c070', head, x, y, z);
      p.rotation.z = rz;
      mesh(new THREE.SphereGeometry(0.022, 6, 5), '#c84a4a', p, 0, 0.13, 0);
    };
    if (s.hairStyle === 'topknot' && !s.hat) {
      bun(0, 0.3, -0.04, 0.1);
      tie(0, 0.24, -0.04, 0.075);
      pin(0, 0.31, -0.04, Math.PI / 2);
    }
    if (s.hairStyle === 'bun') {
      bun(0, 0.1, -0.27, 0.13);
      pin(0.05, 0.16, -0.28, 1.1);
    }
    if (s.hairStyle === 'twinbuns') {
      for (const side of [-1, 1]) {
        bun(side * 0.21, 0.19, -0.03, 0.095);
        tie(side * 0.19, 0.14, -0.03, 0.06, Math.PI / 2 - side * 0.5);
        const ribbon = mesh(new THREE.BoxGeometry(0.03, 0.18, 0.01).translate(0, -0.09, 0), s.band ?? '#c4534a', head, side * 0.24, 0.12, -0.05);
        swayers.push(ribbon);
      }
    }
    if (s.hairStyle === 'long') {
      // 長髮：從後腦垂到背上，兩節，走路會擺
      const upper = new THREE.Group();
      upper.position.set(0, -0.08, -0.2);
      head.add(upper);
      mesh(new THREE.BoxGeometry(0.4, 0.3, 0.07).translate(0, -0.15, 0), hair, upper);
      const lower = new THREE.Group();
      lower.position.y = -0.3;
      upper.add(lower);
      mesh(new THREE.BoxGeometry(0.34, 0.22, 0.06).translate(0, -0.11, 0), hair, lower);
      swayers.push(upper, lower);
      tie(0, -0.06, -0.25, 0.06, 0);
    }
  }
  if (s.band && s.hairStyle === 'bald') {
    // 頭巾
    const band = mesh(new THREE.TorusGeometry(R * 1.0, 0.03, 6, 24), s.band, head, 0, 0.08, 0);
    band.rotation.x = Math.PI / 2 - 0.2;
    const knot = mesh(new THREE.BoxGeometry(0.04, 0.12, 0.01).translate(0, -0.06, 0), s.band, head, 0.05, 0.1, -0.27);
    swayers.push(knot);
  }
  if (s.hat === 'straw') {
    // 斗笠：寬沿的竹笠，一道深色箍
    const hat = new THREE.Group();
    hat.position.y = 0.17;
    hat.rotation.x = -0.12;
    head.add(hat);
    mesh(new THREE.ConeGeometry(0.52, 0.24, 20, 1, true), '#d6b56c', hat).material = snowable(new THREE.MeshStandardMaterial({ color: '#d6b56c', roughness: 0.9, side: THREE.DoubleSide }), 0);
    mesh(new THREE.CylinderGeometry(0.24, 0.27, 0.035, 16), '#9a7a3a', hat, 0, -0.04, 0);
  }
  if (s.beard) {
    // 鬍子：下巴一撮、兩撇八字鬍
    const beard = mesh(new THREE.ConeGeometry(0.11, 0.26, 8), s.beard, head, 0, -0.27, 0.15);
    beard.rotation.x = Math.PI + 0.3;
    for (const side of [-1, 1]) {
      const m = mesh(new THREE.CapsuleGeometry(0.018, 0.08, 3, 6), s.beard, head, side * 0.05, -0.1, 0.25);
      m.rotation.z = side * 1.1;
    }
  }
  // ── 腰間的劍：劍鞘、護手、劍柄、劍穗 ──
  if (s.sword) {
    const sword = new THREE.Group();
    sword.position.set(-0.2, 0.42, -0.02);
    sword.rotation.set(0.25, 0, 1.2);
    body.add(sword);
    mesh(new THREE.BoxGeometry(0.045, 0.5, 0.03), '#3a2a22', sword, 0, -0.22, 0);
    mesh(new THREE.BoxGeometry(0.12, 0.025, 0.05), '#c9a046', sword, 0, 0.04, 0);
    mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.12, 6), '#5a3a22', sword, 0, 0.11, 0);
    const tassel = mesh(new THREE.ConeGeometry(0.025, 0.1, 5).translate(0, -0.05, 0), '#c8302a', sword, 0, 0.17, 0);
    swayers.push(tassel);
  }

  let phase = 0;
  let blinkT = 2 + Math.random() * 3;
  let breath = Math.random() * 10;
  const f: Figure = {
    obj: root,
    yaw: 0,
    tick(dt, moving) {
      root.rotation.y = THREE.MathUtils.lerp(root.rotation.y, nearAngle(root.rotation.y, f.yaw), Math.min(1, dt * 12));
      phase = moving ? phase + dt * 11 : phase * 0.85;
      breath += dt;
      const sw = Math.sin(phase) * (moving ? 0.6 : 0);
      legs[0].rotation.x = sw;
      legs[1].rotation.x = -sw;
      arms[0].rotation.x = -sw * 0.7;
      arms[1].rotation.x = sw * 0.7;
      body.position.y = moving ? Math.abs(Math.sin(phase)) * 0.045 : 0;
      torso.scale.y = 1 + Math.sin(breath * 2) * 0.015;
      head.rotation.z = moving ? Math.sin(phase * 0.5) * 0.04 : Math.sin(breath * 0.9) * 0.035;
      // 帶子、長髮、劍穗：走路往後飄，停下來輕輕擺
      const flow = moving ? 0.35 + Math.sin(phase * 2) * 0.12 : Math.sin(breath * 1.6) * 0.06;
      for (const t of tails) t.rotation.x = flow;
      for (const o of swayers) o.rotation.x = flow * 0.8;
      // 眨眼
      blinkT -= dt;
      if (blinkT < 0) {
        faceMat.map = shut;
        if (blinkT < -0.12) {
          faceMat.map = open;
          blinkT = 2.5 + Math.random() * 3;
        }
      }
    },
  };
  return f;
}

/** 角度取最接近的那一圈（轉身時不要繞遠路） */
function nearAngle(from: number, to: number) {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return from + d;
}

/** 照像素人物的名字做一個小人；山賊、賊頭皺眉 */
export const figure = (sprite: string) => chibi(CHARACTERS[sprite] ?? CHARACTERS.hero, sprite === 'bandit' || sprite === 'boss' ? 'angry' : 'calm');
