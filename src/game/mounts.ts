/**
 * 坐騎：在梁老四的車馬行買馬。有了馬，在室外走路、奔跑都更快（室內照樣步行）。
 * 角色的 mount 是馬的 id，riding 表示現在騎著（可以在選單「人物 › 坐騎」上馬、下馬）。
 * 之後的天下大地圖也會用到坐騎。
 */

export interface MountDef {
  id: string;
  name: string;
  /** 室外移動速度倍數 */
  speed: number;
  price: number;
  desc: string;
}

export const MOUNTS: MountDef[] = [
  { id: 'old_bay', name: '老黃馬', speed: 1.25, price: 80, desc: '年紀大了，跑不快，脾氣倒是溫和。' },
  { id: 'jujube', name: '棗紅馬', speed: 1.5, price: 220, desc: '毛色像熟透的紅棗，腳力穩健。' },
  { id: 'qingcong', name: '青驄馬', speed: 1.75, price: 500, desc: '青白相間的駿馬，一日能走好幾百里。' },
];
export const mountDef = (id?: string) => MOUNTS.find((m) => m.id === id);
