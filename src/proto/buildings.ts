import * as THREE from 'three';
import type { BuildingStyle } from '../game/art/props';
import { snowable } from './env';

/**
 * 立體的房子（低多邊形）：石台基、白牆、木柱、門窗、兩坡屋頂、匾額與幌子、燈籠。
 * 佔地照原本的 BuildingStyle（w×h 格），門在最下排第 door 格（+z 那一面）。
 */

const flat = (color: string) => snowable(new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.9 }), 0);

/** 寫字的木牌（匾額、幌子） */
export function textBoard(text: string, w: number, h: number, vertical = false, bg = '#3a2418', fg = '#f0c860') {
  const cv = document.createElement('canvas');
  const scale = 64;
  cv.width = w * scale;
  cv.height = h * scale;
  const c = cv.getContext('2d')!;
  c.fillStyle = bg;
  c.fillRect(0, 0, cv.width, cv.height);
  c.strokeStyle = fg;
  c.lineWidth = 4;
  c.strokeRect(6, 6, cv.width - 12, cv.height - 12);
  c.fillStyle = fg;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  const size = vertical ? Math.min(cv.width * 0.7, (cv.height - 16) / text.length) : Math.min(cv.height * 0.6, (cv.width - 24) / text.length);
  c.font = `${size}px Cubic11, sans-serif`;
  if (vertical) [...text].forEach((ch, i) => c.fillText(ch, cv.width / 2, 8 + size * (i + 0.5) + (cv.height - 16 - size * text.length) / 2));
  else c.fillText(text, cv.width / 2, cv.height / 2 + 2);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.8 }));
}

export interface Built {
  obj: THREE.Group;
  lamps: THREE.Vector3[];
  lampMats: THREE.MeshStandardMaterial[];
}

/** 一棟房子：回傳以佔地左上角為原點的群組（x 往右、z 往下） */
export function building(st: BuildingStyle, opts: { sign?: string; flag?: string } = {}): Built {
  const g = new THREE.Group();
  const lamps: THREE.Vector3[] = [];
  const lampMats: THREE.MeshStandardMaterial[] = [];
  const W = st.w;
  const D = st.h;
  const wallH = 1.25 + (st.h >= 5 ? 0.25 : 0);
  const bodyD = D - 0.8;
  const front = D - 0.25;
  const cx = W / 2;
  const cz = front - bodyD / 2;
  const wall = st.wall ?? '#ece2cc';
  const timber = st.timber ?? '#6a4428';
  const mk = (geo: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  // 台基
  mk(new THREE.BoxGeometry(W - 0.1, 0.18, bodyD + 0.5), flat('#9a958a'), cx, 0.09, cz + 0.1);
  // 牆
  const wallMat = flat(wall);
  mk(new THREE.BoxGeometry(W - 0.4, wallH, bodyD), wallMat, cx, 0.18 + wallH / 2, cz);
  // 柱子
  const pillar = flat(timber);
  for (const x of [0.2, W - 0.2]) for (const z of [cz - bodyD / 2, cz + bodyD / 2]) mk(new THREE.BoxGeometry(0.14, wallH, 0.14), pillar, x, 0.18 + wallH / 2, z);
  mk(new THREE.BoxGeometry(W - 0.3, 0.1, 0.1), pillar, cx, 0.18 + wallH - 0.05, cz + bodyD / 2 + 0.02);
  // 門、窗
  const doorX = st.door + 0.5;
  const doorH = Math.min(1.0, wallH - 0.15);
  mk(new THREE.BoxGeometry(0.8, doorH, 0.06), flat(st.doorPaint ?? '#5a3a22'), doorX, 0.18 + doorH / 2, cz + bodyD / 2 + 0.03);
  const winMat = flat(st.bars ? '#3a3a3e' : '#4a3424');
  for (let col = 0; col < W; col++) {
    if (Math.abs(col + 0.5 - doorX) < 1.2 || col === 0 || col === W - 1) continue;
    mk(new THREE.BoxGeometry(0.55, 0.45, 0.05), winMat, col + 0.5, 0.18 + wallH * 0.6, cz + bodyD / 2 + 0.03);
  }
  // 屋頂：兩坡，沿 x 方向
  const rw = bodyD + 1.0;
  const rh = 0.75 + bodyD * 0.12;
  const shape = new THREE.Shape([new THREE.Vector2(-rw / 2, 0), new THREE.Vector2(rw / 2, 0), new THREE.Vector2(0.18, rh), new THREE.Vector2(-0.18, rh)]);
  const roofGeo = new THREE.ExtrudeGeometry(shape, { depth: W + 0.3, bevelEnabled: false });
  roofGeo.rotateY(Math.PI / 2);
  roofGeo.translate(-(W + 0.3) / 2, 0, 0);
  const roofMat = flat(st.roof);
  const roof = mk(roofGeo, roofMat, cx, 0.18 + wallH, cz);
  roof.scale.y = 1;
  mk(new THREE.BoxGeometry(W + 0.5, 0.14, 0.4), flat(st.roofDark), cx, 0.18 + wallH + rh, cz);
  // 屋簷兩端翹起
  for (const x of [-0.2, W + 0.2]) mk(new THREE.ConeGeometry(0.1, 0.35, 4), flat(st.roofDark), x, 0.18 + wallH + rh + 0.12, cz);
  if (st.chimney) mk(new THREE.BoxGeometry(0.35, 0.8, 0.35), flat('#6a625a'), W - 0.9, 0.18 + wallH + rh * 0.7, cz - 0.4);
  // 匾額、幌子
  if (opts.sign) {
    const b = textBoard(opts.sign, Math.min(W - 1, 0.45 * opts.sign.length + 0.4), 0.42);
    b.position.set(doorX, 0.18 + wallH + 0.12, cz + bodyD / 2 + 0.5);
    b.rotation.x = -0.25;
    g.add(b);
  }
  if (opts.flag) {
    const f = textBoard(opts.flag, 0.32, 0.8, true, '#f4ecd8', '#8a2e26');
    f.position.set(doorX - 1.0, 0.18 + wallH - 0.5, cz + bodyD / 2 + 0.45);
    g.add(f);
  }
  // 燈籠
  if (st.lanterns) {
    for (const x of [doorX - 0.7, doorX + 0.7]) {
      const m = new THREE.MeshStandardMaterial({ color: '#c8302a', emissive: '#ff5a2a', emissiveIntensity: 0.2, roughness: 0.6 });
      lampMats.push(m);
      const l = mk(new THREE.SphereGeometry(0.15, 8, 6), m, x, 0.18 + wallH - 0.15, cz + bodyD / 2 + 0.55);
      l.scale.y = 1.25;
      lamps.push(l.position.clone());
    }
  }
  return { obj: g, lamps, lampMats };
}
