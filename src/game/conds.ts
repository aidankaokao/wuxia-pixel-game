import type { World } from './home';

/**
 * 從 world 算出來的地圖條件（給 MapDef 的 when、patches 讀），例如門派設施蓋到第幾級。
 * 劇情旗標存在 flags；但有些狀態只在 world 裡（每天半夜 onNewDay 改的），就註冊在這裡，
 * MapScene 與 patches 會把它們跟旗標合在一起。只回傳數字，不要改 world。
 */
const SOURCES: ((w: World) => Record<string, number>)[] = [];
export const registerConds = (f: (w: World) => Record<string, number>) => void SOURCES.push(f);
export const worldConds = (w: World): Record<string, number> => Object.assign({}, ...SOURCES.map((f) => f(w)));
