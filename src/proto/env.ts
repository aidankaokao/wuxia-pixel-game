import * as THREE from 'three';

/**
 * 試作品的環境：時辰（太陽角度、顏色、天色）、天氣（雨絲、雪花、霧）、積雪、夜裡的燈籠光。
 * 積雪用材質的小補丁（snowable）：朝上的面隨 SNOW.value 慢慢變白，所以屋頂、地面、樹梢先白。
 */

/** 積雪程度 0–1，所有 snowable 材質共用 */
export const SNOW = { value: 0 };

/** 讓材質會積雪：朝上的面變白；flat 是直立的面也跟著淡淡變白的程度，up 是朝上的面積得多滿（人物身上只沾一點） */
export function snowable<M extends THREE.Material>(m: M, flat = 0, up = 1): M {
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSnow = SNOW;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vSnowUp;\nvarying vec2 vSnowXZ;')
      .replace(
        '#include <beginnormal_vertex>',
        `#include <beginnormal_vertex>
        vec3 snowN = objectNormal;
        #ifdef USE_INSTANCING
          snowN = mat3(instanceMatrix) * snowN;
        #endif
        vSnowUp = normalize(mat3(modelMatrix) * snowN).y;
        vec4 snowW = vec4(position, 1.0);
        #ifdef USE_INSTANCING
          snowW = instanceMatrix * snowW;
        #endif
        vSnowXZ = (modelMatrix * snowW).xz;`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vSnowUp;
        varying vec2 vSnowXZ;
        uniform float uSnow;
        float snowHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float snowNoise(vec2 p) {
          vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(snowHash(i), snowHash(i + vec2(1, 0)), f.x), mix(snowHash(i + vec2(0, 1)), snowHash(i + vec2(1, 1)), f.x), f.y);
        }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        // 積雪有疏有密：一塊塊的，雪下得越久蓋得越滿，但地面總會露出一點草地
        float patchy = smoothstep(0.4, 0.8, snowNoise(vSnowXZ * 0.45) * 0.7 + snowNoise(vSnowXZ * 1.7) * 0.3 + uSnow * 0.12);
        float snowK = uSnow * max(smoothstep(0.45, 0.85, vSnowUp) * patchy * ${up.toFixed(2)}, ${flat.toFixed(2)});
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.84, 0.87, 0.93), snowK * 0.7);`,
      );
  };
  m.customProgramCacheKey = () => `snow${flat}:${up}`;
  return m;
}

export type Weather = 'clear' | 'rain' | 'snow' | 'fog';
export const WEATHER_NAME: Record<Weather, string> = { clear: '晴', rain: '雨', snow: '雪', fog: '霧' };

interface TimePreset {
  name: string;
  /** 太陽仰角、方位（度） */
  elev: number;
  az: number;
  sun: string;
  sunI: number;
  sky: string;
  ground: string;
  hemiI: number;
  bg: string;
  night?: boolean;
}
export const TIMES: TimePreset[] = [
  { name: '卯時・清晨', elev: 14, az: 100, sun: '#ffb48a', sunI: 1.7, sky: '#d6c2e0', ground: '#6a5a4a', hemiI: 0.75, bg: '#e8c4b4' },
  { name: '午時・正午', elev: 62, az: 160, sun: '#fff4dc', sunI: 2.7, sky: '#bcd8ff', ground: '#7a8a5a', hemiI: 0.95, bg: '#a8d0ee' },
  { name: '酉時・黃昏', elev: 11, az: 255, sun: '#ff8848', sunI: 2.0, sky: '#f0a888', ground: '#4a3a3a', hemiI: 0.6, bg: '#eea578' },
  { name: '子時・深夜', elev: 38, az: 210, sun: '#a8c0ff', sunI: 1.0, sky: '#4a5a8e', ground: '#22223a', hemiI: 1.15, bg: '#141a2e', night: true },
];

const WEATHER_MOD: Record<Weather, { light: number; bg: string; mix: number; fog: number }> = {
  clear: { light: 1, bg: '#000000', mix: 0, fog: 0.004 },
  rain: { light: 0.55, bg: '#7a8290', mix: 0.55, fog: 0.018 },
  snow: { light: 0.85, bg: '#d8dde6', mix: 0.5, fog: 0.014 },
  // 霧：淡淡一層，遠處朦朧、近處看得清楚
  fog: { light: 0.9, bg: '#dfe4e8', mix: 0.35, fog: 0.02 },
};

export class Env {
  sun = new THREE.DirectionalLight('#ffffff', 2);
  hemi = new THREE.HemisphereLight('#ffffff', '#444444', 1);
  time = 1;
  weather: Weather = 'clear';
  /** 霧的濃度倍數：鏡頭離得越遠越要調淡（2.5D 的正交鏡頭放得很遠），由主程式每一格設定 */
  fogScale = 1;
  /** 燈籠：位置與發光的材質；夜裡最近的幾盞會真的點亮 */
  lamps: THREE.Vector3[] = [];
  lampMats: THREE.MeshStandardMaterial[] = [];
  private pool: THREE.PointLight[] = [];
  private rain: THREE.InstancedMesh;
  private snow: THREE.InstancedMesh;
  private drops: THREE.Vector3[] = [];
  /** 霧天貼著地面飄的幾團薄霧 */
  private mist: THREE.Mesh[] = [];
  private dummy = new THREE.Object3D();

  constructor(private scene: THREE.Scene) {
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const c = this.sun.shadow.camera;
    c.left = c.bottom = -26;
    c.right = c.top = 26;
    c.near = 1;
    c.far = 120;
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    scene.add(this.sun, this.sun.target, this.hemi);
    for (let i = 0; i < 6; i++) {
      const p = new THREE.PointLight('#ffb060', 0, 7, 1.6);
      this.pool.push(p);
      scene.add(p);
    }
    const N = 1800;
    this.rain = new THREE.InstancedMesh(new THREE.BoxGeometry(0.015, 0.5, 0.015), new THREE.MeshBasicMaterial({ color: '#b8cce8', transparent: true, opacity: 0.35 }), N);
    this.snow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.035, 4, 3), new THREE.MeshBasicMaterial({ color: '#eef2f8', transparent: true, opacity: 0.85 }), N);
    for (let i = 0; i < N; i++) this.drops.push(new THREE.Vector3((Math.random() - 0.5) * 44, Math.random() * 18, (Math.random() - 0.5) * 44));
    this.rain.frustumCulled = this.snow.frustumCulled = false;
    // 雨雪不要描邊
    this.rain.userData.noOutline = this.snow.userData.noOutline = true;
    // 雨絲、雪花只用一部分，不要密得像簾子
    this.rain.count = 650;
    this.snow.count = 700;
    scene.add(this.rain, this.snow);
    scene.fog = new THREE.FogExp2('#a8d0ee', 0.004);
    const cv = document.createElement('canvas');
    cv.width = cv.height = 64;
    const mc = cv.getContext('2d')!;
    const g = mc.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    mc.fillStyle = g;
    mc.fillRect(0, 0, 64, 64);
    const puff = new THREE.CanvasTexture(cv);
    for (let i = 0; i < 18; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: puff, transparent: true, opacity: 0.2, depthWrite: false, fog: false }));
      m.rotation.x = -Math.PI / 2;
      m.scale.setScalar(3 + Math.random() * 4);
      m.position.set((Math.random() - 0.5) * 40, 0.5 + Math.random() * 1.2, (Math.random() - 0.5) * 40);
      m.userData.speed = 0.3 + Math.random() * 0.4;
      m.userData.noOutline = true;
      m.renderOrder = 5;
      this.mist.push(m);
      scene.add(m);
    }
    this.apply();
  }

  get night() {
    return !!TIMES[this.time].night;
  }

  setTime(i: number) {
    this.time = (i + TIMES.length) % TIMES.length;
    this.apply();
  }
  setWeather(w: Weather) {
    this.weather = w;
    this.apply();
  }

  /** 照時辰與天氣設定光線、天色、霧 */
  private apply() {
    const t = TIMES[this.time];
    const wm = WEATHER_MOD[this.weather];
    this.sun.color.set(t.sun);
    this.sun.intensity = t.sunI * wm.light;
    this.hemi.color.set(t.sky);
    this.hemi.groundColor.set(t.ground);
    this.hemi.intensity = t.hemiI * (0.6 + 0.4 * wm.light);
    const bg = new THREE.Color(t.bg).lerp(new THREE.Color(wm.bg).multiplyScalar(t.night ? 0.25 : 1), wm.mix);
    this.scene.background = bg;
    (this.scene.fog as THREE.FogExp2).color.copy(bg);
    (this.scene.fog as THREE.FogExp2).density = wm.fog;
    for (const m of this.lampMats) m.emissiveIntensity = t.night ? 2.2 : this.weather === 'rain' ? 0.5 : 0.15;
    this.rain.visible = this.weather === 'rain';
    for (const m of this.mist) m.visible = this.weather === 'fog';
    this.snow.visible = this.weather === 'snow';
  }

  update(dt: number, focus: THREE.Vector3) {
    const t = TIMES[this.time];
    (this.scene.fog as THREE.FogExp2).density = WEATHER_MOD[this.weather].fog * this.fogScale;
    // 太陽跟著鏡頭焦點移動，陰影才一直照得到眼前這一片
    const el = THREE.MathUtils.degToRad(t.elev);
    const az = THREE.MathUtils.degToRad(t.az);
    const dir = new THREE.Vector3(Math.cos(el) * Math.sin(az), Math.sin(el), Math.cos(el) * Math.cos(az));
    this.sun.position.copy(focus).addScaledVector(dir, 50);
    this.sun.target.position.copy(focus);
    // 積雪：下雪慢慢積，停了慢慢化
    const want = this.weather === 'snow' ? 1 : 0;
    SNOW.value += Math.sign(want - SNOW.value) * Math.min(Math.abs(want - SNOW.value), dt * (want ? 0.07 : 0.15));
    // 雨、雪
    const fall = this.weather === 'rain' ? 16 : 1.3;
    const mesh = this.weather === 'rain' ? this.rain : this.weather === 'snow' ? this.snow : null;
    if (mesh) {
      const now = performance.now() / 1000;
      this.drops.forEach((p, i) => {
        p.y -= fall * dt * (0.8 + (i % 5) * 0.1);
        if (p.y < 0) p.y += 18;
        const sway = this.weather === 'snow' ? Math.sin(now + i) * 0.4 : 0.15 * p.y * 0.1;
        this.dummy.position.set(focus.x + p.x + sway, p.y, focus.z + p.z);
        this.dummy.rotation.set(0, 0, this.weather === 'rain' ? 0.12 : 0);
        this.dummy.updateMatrix();
        mesh.setMatrixAt(i, this.dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
    }
    // 薄霧慢慢往東飄，飄出範圍就從另一邊回來
    if (this.weather === 'fog')
      for (const m of this.mist) {
        m.position.x += m.userData.speed * dt;
        if (m.position.x - focus.x > 22) m.position.x -= 44;
        if (m.position.x - focus.x < -22) m.position.x += 44;
        if (m.position.z - focus.z > 22) m.position.z -= 44;
        if (m.position.z - focus.z < -22) m.position.z += 44;
      }
    // 夜裡點亮離焦點最近的幾盞燈籠
    const near = this.night || this.weather === 'rain' ? [...this.lamps].sort((a, b) => a.distanceToSquared(focus) - b.distanceToSquared(focus)).slice(0, this.pool.length) : [];
    this.pool.forEach((p, i) => {
      const at = near[i];
      p.intensity = at ? (this.night ? 5 : 1.2) * (0.9 + Math.sin(performance.now() / 180 + i) * 0.05) : 0;
      if (at) p.position.copy(at);
    });
  }
}
