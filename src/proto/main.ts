import * as THREE from 'three';
import { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { HorizontalTiltShiftShader } from 'three/examples/jsm/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/examples/jsm/shaders/VerticalTiltShiftShader.js';
import { Env, SNOW, TIMES, WEATHER_NAME, type Weather } from './env';
import type { ProtoScene } from './scene';
import { applyLook, LOOK_NAME, StyleShader, type Look } from './look';
import { villageScene } from './village';
import { worldScene } from './world';
import { battleScene } from './battle';

/**
 * 3D／2.5D 畫面的試作品（4.34）。開發伺服器開 /proto/ 就能看，不影響遊戲本體。
 * 風格：低多邊形 Q 版（像政策島那樣的小模型；HD-2D 看過後不採用，已拿掉）。
 * 三個場景：青竹村、大地圖（自由走動）、六角格戰鬥。時辰、天氣、移軸模糊可以切換。
 * 鏡頭兩種：2.5D（正交投影、固定俯角，只能轉向與拉遠近）、3D（透視投影，俯角可調）。
 * 畫風預設卡通描邊（look.ts）；水墨版使用者看過後不採用，已拿掉。
 */

type SceneId = 'village' | 'world' | 'battle' | 'plain' | 'river';
/** dist 是 3D 鏡頭的距離；size 是 2.5D 鏡頭畫面高度看得到幾格 */
const SCENES: { id: SceneId; name: string; dist: number; size: number }[] = [
  { id: 'village', name: '青竹村', dist: 24, size: 13 },
  { id: 'world', name: '大地圖', dist: 22, size: 12 },
  { id: 'battle', name: '戰鬥・山道', dist: 15, size: 8.5 },
  { id: 'plain', name: '戰鬥・平地', dist: 15, size: 8.5 },
  { id: 'river', name: '戰鬥・河湖', dist: 15, size: 8.5 },
];
const WEATHERS: Weather[] = ['clear', 'rain', 'snow', 'fog'];
/** 2.5D 鏡頭固定的俯角 */
const FIXED_PITCH = 0.5;

const q = new URLSearchParams(location.search);
const state = {
  scene: Math.max(0, SCENES.findIndex((s) => s.id === q.get('scene'))),
  /** 2.5D（固定俯角、正交投影）或 3D（可調俯角、透視） */
  view: (q.get('view') === '3d' ? '3d' : '25d') as '25d' | '3d',
  /** 畫風：一般、卡通描邊、水墨 */
  look: (q.get('look') === 'normal' ? 'normal' : 'toon') as Look,
  tilt: q.get('tilt') !== '0',
  labels: true,
};

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(2, devicePixelRatio));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const labels = new CSS2DRenderer();
labels.setSize(innerWidth, innerHeight);
labels.domElement.className = 'p-labels';
document.body.appendChild(labels.domElement);

const scene = new THREE.Scene();
const persp = new THREE.PerspectiveCamera(30, innerWidth / innerHeight, 0.1, 400);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 400);
let camera: THREE.Camera = persp;
const env = new Env(scene);
env.setTime(Number(q.get('time') ?? 1));
env.setWeather((q.get('weather') as Weather) ?? 'clear');
if (q.get('snow')) SNOW.value = Number(q.get('snow'));

// 後製：泛光（燈籠、夕陽）＋移軸模糊（上下糊、中間清楚，像在看小模型）
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.5, 0.88);
composer.addPass(bloom);
composer.addPass(new OutputPass());
// 畫風（描邊、水墨）在色調轉換之後做，顏色才是畫面上看到的樣子；移軸模糊放最後，描邊也一起糊
const stylePass = new ShaderPass(StyleShader);
composer.addPass(stylePass);
const tiltH = new ShaderPass(HorizontalTiltShiftShader);
const tiltV = new ShaderPass(VerticalTiltShiftShader);
composer.addPass(tiltH);
composer.addPass(tiltV);
// 描邊要的「法線＋深度」圖：每一格先用法線材質另外畫一次
const normalTarget = new THREE.WebGLRenderTarget(1, 1, { depthTexture: new THREE.DepthTexture(1, 1) });
const normalMat = new THREE.MeshNormalMaterial();
renderer.shadowMap.autoUpdate = false;
function renderNormals() {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (o.visible && o.userData.noOutline) {
      o.visible = false;
      hidden.push(o);
    }
  });
  scene.overrideMaterial = normalMat;
  renderer.setRenderTarget(normalTarget);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  scene.overrideMaterial = null;
  for (const o of hidden) o.visible = true;
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  labels.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  persp.aspect = innerWidth / innerHeight;
  persp.updateProjectionMatrix();
  const pr = renderer.getPixelRatio();
  normalTarget.setSize(innerWidth * pr, innerHeight * pr);
  stylePass.uniforms.resolution.value.set(innerWidth * pr, innerHeight * pr);
  tiltH.uniforms.h.value = 1.6 / innerWidth;
  tiltV.uniforms.v.value = 1.6 / innerHeight;
  tiltH.uniforms.r.value = tiltV.uniforms.r.value = 0.5;
}
addEventListener('resize', resize);
resize();

// ── 鏡頭：繞著焦點轉（Q／E 一次 45 度）、滾輪或 Z／X 拉遠拉近；3D 時 PageUp／PageDown 調俯角 ──
const cam = { yaw: Math.PI * 0.12, pitch: 0.82, dist: 24, size: 13, wantYaw: Math.PI * 0.12 };
const zoom = (d: number) => {
  if (state.view === '3d') cam.dist = THREE.MathUtils.clamp(cam.dist + d * 3, 8, 80);
  else cam.size = THREE.MathUtils.clamp(cam.size + d * 1.5, 5, 40);
};
let current: ProtoScene;

function build() {
  if (current) {
    scene.remove(current.root);
    current.dispose?.();
    labels.domElement.innerHTML = '';
  }
  env.lamps.length = 0;
  env.lampMats.length = 0;
  const ctx = { env, go: (to: SceneId) => ((state.scene = SCENES.findIndex((x) => x.id === to)), build()) };
  const id = SCENES[state.scene].id;
  current = id === 'village' ? villageScene(ctx) : id === 'world' ? worldScene(ctx) : battleScene(ctx, id === 'plain' ? 'plain' : id === 'river' ? 'river' : 'hill');
  scene.add(current.root);
  applyLook(current.root, state.look);
  cam.dist = SCENES[state.scene].dist;
  cam.size = SCENES[state.scene].size;
  env.setTime(env.time);
  hud();
}

function setLook(l: Look) {
  state.look = l;
  applyLook(current.root, l);
}

// ── 介面 ──
const panel = document.getElementById('panel')!;
const info = document.getElementById('info')!;
function hud() {
  const btn = (on: boolean, text: string, act: string) => `<button class="${on ? 'on' : ''}" data-act="${act}">${text}</button>`;
  panel.innerHTML = `
    <h1>扶搖江湖・3D 試作品</h1>
    <div class="row"><b>鏡頭</b>${btn(state.view === '25d', '2.5D 固定俯角', 'view:25d')}${btn(state.view === '3d', '3D 可調俯角', 'view:3d')}</div>
    <div class="row"><b>場景</b>${SCENES.map((s, i) => btn(state.scene === i, s.name, `scene:${i}`)).join('')}</div>
    <div class="row"><b>時辰</b>${TIMES.map((t, i) => btn(env.time === i, t.name.slice(0, 2), `time:${i}`)).join('')}</div>
    <div class="row"><b>天氣</b>${WEATHERS.map((w) => btn(env.weather === w, WEATHER_NAME[w], `weather:${w}`)).join('')}</div>
    <div class="row"><b>畫風</b>${(['normal', 'toon'] as Look[]).map((l) => btn(state.look === l, LOOK_NAME[l], `look:${l}`)).join('')}</div>
    <div class="row"><b>畫面</b>${btn(state.tilt, '移軸模糊', 'tilt')}${btn(state.labels, '名字', 'labels')}</div>
    <p class="keys">V 換鏡頭・L 畫風・Tab 換場景・T 時辰・W 天氣<br>Q／E 轉鏡頭・滾輪或 Z／X 遠近${state.view === '3d' ? '・PgUp／PgDn 俯角' : ''}</p>`;
}
panel.addEventListener('click', (e) => {
  const act = (e.target as HTMLElement).dataset.act;
  if (!act) return;
  const [k, v] = act.split(':');
  if (k === 'view') state.view = v as '25d' | '3d';
  if (k === 'look') setLook(v as Look);
  if (k === 'scene') (state.scene = Number(v)), build();
  if (k === 'time') env.setTime(Number(v));
  if (k === 'weather') env.setWeather(v as Weather);
  if (k === 'tilt') state.tilt = !state.tilt;
  if (k === 'labels') state.labels = !state.labels;
  hud();
  (e.target as HTMLElement).blur();
});

addEventListener('keydown', (e) => {
  if (current.key?.(e.code, true)) return e.preventDefault();
  const k = e.key.toLowerCase();
  if (k === 'v') state.view = state.view === '3d' ? '25d' : '3d';
  else if (k === 'l') setLook(state.look === 'toon' ? 'normal' : 'toon');
  else if (e.key === 'Tab') (state.scene = (state.scene + 1) % SCENES.length), build(), e.preventDefault();
  else if (k === 't') env.setTime(env.time + 1);
  else if (k === 'w') env.setWeather(WEATHERS[(WEATHERS.indexOf(env.weather) + 1) % WEATHERS.length]);
  else if (k === 'q') cam.wantYaw -= Math.PI / 4;
  else if (k === 'e') cam.wantYaw += Math.PI / 4;
  else if (k === 'z') zoom(-1);
  else if (k === 'x') zoom(1);
  else if (e.key === 'PageUp' && state.view === '3d') cam.pitch = Math.min(1.35, cam.pitch + 0.08);
  else if (e.key === 'PageDown' && state.view === '3d') cam.pitch = Math.max(0.35, cam.pitch - 0.08);
  else return;
  hud();
});
addEventListener('keyup', (e) => current.key?.(e.code, false));
addEventListener('wheel', (e) => zoom(Math.sign(e.deltaY)));
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('click', (e) => {
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  current.click?.(ray);
});

// ── 主迴圈 ──
const clock = new THREE.Clock();
let fpsT = 0;
let frames = 0;
let fps = 0;
function loop() {
  const dt = Math.min(0.05, clock.getDelta());
  cam.yaw += (cam.wantYaw - cam.yaw) * Math.min(1, dt * 8);
  const pitch = state.view === '3d' ? cam.pitch : FIXED_PITCH;
  current.update(dt, { yaw: cam.yaw, pitch });
  const f = current.focus;
  // 2.5D：正交投影，鏡頭放遠一點（不影響大小），畫面大小由 size 決定
  camera = state.view === '3d' ? persp : ortho;
  const dist = state.view === '3d' ? cam.dist : 60;
  camera.position.set(f.x + Math.sin(cam.yaw) * Math.cos(pitch) * dist, f.y + Math.sin(pitch) * dist, f.z + Math.cos(cam.yaw) * Math.cos(pitch) * dist);
  camera.lookAt(f);
  if (state.view === '25d') {
    const aspect = innerWidth / innerHeight;
    ortho.top = cam.size / 2;
    ortho.bottom = -cam.size / 2;
    ortho.left = (-cam.size / 2) * aspect;
    ortho.right = (cam.size / 2) * aspect;
    ortho.updateProjectionMatrix();
  }
  renderPass.camera = camera;
  env.fogScale = 24 / dist;
  const cam3 = camera as THREE.PerspectiveCamera | THREE.OrthographicCamera;
  stylePass.enabled = state.look !== 'normal';
  if (stylePass.enabled) {
    renderNormals();
    const u = stylePass.uniforms;
    u.tNormal.value = normalTarget.texture;
    u.tDepth.value = normalTarget.depthTexture;
    u.mode.value = 1;
    u.near.value = cam3.near;
    u.far.value = cam3.far;
    u.ortho.value = state.view === '25d' ? 1 : 0;
  }
  renderer.shadowMap.needsUpdate = true;
  env.update(dt, f);
  bloom.strength = env.night ? 0.9 : 0.25;
  tiltH.enabled = tiltV.enabled = state.tilt;
  labels.domElement.style.display = state.labels ? '' : 'none';
  composer.render();
  labels.render(scene, camera);
  frames++;
  fpsT += dt;
  if (fpsT > 0.5) {
    fps = Math.round(frames / fpsT);
    frames = 0;
    fpsT = 0;
  }
  info.textContent = `${current.info()}\n${TIMES[env.time].name}・${WEATHER_NAME[env.weather]}${SNOW.value > 0.01 ? `・積雪 ${Math.round(SNOW.value * 100)}%` : ''}　${fps} fps`;
  requestAnimationFrame(loop);
}

await document.fonts.load('16px Cubic11');
build();
loop();
// 給自動化測試用
Object.assign(window, { __proto3d: { state, env, cam, build } });
export {};
