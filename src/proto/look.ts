import * as THREE from 'three';

/**
 * 畫風（試作品）：
 * - 一般：原本的柔光材質。
 * - 卡通描邊：材質換成三階色塊的卡通材質，再用後製依法線與深度畫出黑色描邊。
 * （水墨版使用者看過後不採用，已拿掉。）
 * 描邊靠另外畫一張「法線＋深度」的圖（main.ts 的 renderNormals），這裡的 StyleShader 拿來找邊。
 */

export type Look = 'normal' | 'toon';
export const LOOK_NAME: Record<Look, string> = { normal: '一般', toon: '卡通描邊' };

/** 三階的明暗（卡通材質用） */
const gradient = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
})();

const originals = new WeakMap<THREE.Mesh, THREE.Material | THREE.Material[]>();
const toonCache = new WeakMap<THREE.Material, THREE.Material>();

function toToon(m: THREE.Material): THREE.Material {
  if (!(m instanceof THREE.MeshStandardMaterial)) return m;
  // 會發光的（燈籠）不換，夜裡的亮度由 env 控制
  if (m.emissive.getHex() !== 0) return m;
  const hit = toonCache.get(m);
  if (hit) return hit;
  const t = new THREE.MeshToonMaterial({
    color: m.color,
    map: m.map,
    vertexColors: m.vertexColors,
    transparent: m.transparent,
    opacity: m.opacity,
    alphaTest: m.alphaTest,
    side: m.side,
    depthWrite: m.depthWrite,
    gradientMap: gradient,
  });
  // 積雪的補丁一起帶過去
  t.onBeforeCompile = m.onBeforeCompile;
  t.customProgramCacheKey = m.customProgramCacheKey;
  toonCache.set(m, t);
  return t;
}

/** 把一整棵物件的材質換成這種畫風（換回「一般」就還原） */
export function applyLook(root: THREE.Object3D, look: Look) {
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh || o.userData.noOutline) return;
    if (!originals.has(mesh)) originals.set(mesh, mesh.material);
    const orig = originals.get(mesh)!;
    mesh.material = look === 'normal' ? orig : Array.isArray(orig) ? orig.map(toToon) : toToon(orig);
  });
}

/** 後製：描邊（卡通） */
export const StyleShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    tNormal: { value: null as THREE.Texture | null },
    tDepth: { value: null as THREE.Texture | null },
    resolution: { value: new THREE.Vector2(1, 1) },
    mode: { value: 0 },
    near: { value: 0.1 },
    far: { value: 400 },
    ortho: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform sampler2D tNormal;
    uniform sampler2D tDepth;
    uniform vec2 resolution;
    uniform float mode;
    uniform float near;
    uniform float far;
    uniform float ortho;
    varying vec2 vUv;

    float depthAt(vec2 uv) {
      float z = texture2D(tDepth, uv).x;
      if (ortho > 0.5) return near + z * (far - near);
      float ndc = z * 2.0 - 1.0;
      return (2.0 * near * far) / (far + near - ndc * (far - near));
    }
    /** 邊：四周的法線差、深度差（相對距離） */
    float edgeAt(vec2 uv, float w) {
      vec2 px = w / resolution;
      vec3 n = texture2D(tNormal, uv).rgb;
      float d = depthAt(uv);
      float e = 0.0;
      vec2 offs[4];
      offs[0] = vec2(px.x, 0.0); offs[1] = vec2(-px.x, 0.0); offs[2] = vec2(0.0, px.y); offs[3] = vec2(0.0, -px.y);
      for (int i = 0; i < 4; i++) {
        vec3 n2 = texture2D(tNormal, uv + offs[i]).rgb;
        float d2 = depthAt(uv + offs[i]);
        e = max(e, smoothstep(0.25, 0.6, length(n - n2)));
        e = max(e, smoothstep(0.012, 0.03, abs(d - d2) / d));
      }
      return e;
    }
    void main() {
      vec4 base = texture2D(tDiffuse, vUv);
      if (mode < 0.5) { gl_FragColor = base; return; }
      bool sky = texture2D(tDepth, vUv).x > 0.9999;
      float e = sky ? 0.0 : edgeAt(vUv, 1.0);
      gl_FragColor = vec4(mix(base.rgb, vec3(0.11, 0.09, 0.13), e * 0.9), base.a);
    }`,
};
