import type { Dir } from '../constants';

/**
 * 地圖資料格式。
 *
 * tiles 是字元陣列，每個字元是一格：
 *   .  草地          *  花叢（可走）     :  泥土路       =  石板廣場
 *   ~  水（不可走）   #  木橋            ^  山（不可走）  n  農田（可走）
 *   f  木籬（不可走） T  樹（不可走）     Y  竹子（不可走） o  石頭（不可走）
 *   E  出入口（走上去會觸發 exits 裡對應的事件）
 *
 * 建築、告示牌、NPC 等不寫在字元裡，另外列在 buildings / props / npcs。
 */

/** 一段對話：可以是旁白，也可以標出說話的人。 */
export interface Line {
  speaker?: string;
  text: string;
}

export interface BuildingDef {
  /** 對應 art/props.ts 的 BUILDINGS */
  style: string;
  /** 佔地左上角（格） */
  x: number;
  y: number;
  name: string;
  /** 對著門按確認時的文字 */
  door: Line[];
}

export interface PropDef {
  sprite: string;
  x: number;
  y: number;
  lines: Line[];
}

export interface NpcDef {
  id: string;
  name: string;
  /** 對應 art/characters.ts 的 CHARACTERS */
  sprite: string;
  x: number;
  y: number;
  facing?: Dir;
  /** 會在出生點附近幾格內走動；0 或不填表示站著不動 */
  wander?: number;
  /** 每次對話依序輪播一組台詞 */
  talks: Line[][];
}

export interface ExitDef {
  /** 出入口所在的格子（可以多格） */
  tiles: [number, number][];
  /** 目標地圖 id；尚未開放的地圖先留空 */
  to?: string;
  lines: Line[];
}

export interface MapDef {
  id: string;
  name: string;
  subtitle?: string;
  tiles: string[];
  spawn: { x: number; y: number; facing: Dir };
  buildings: BuildingDef[];
  props: PropDef[];
  npcs: NpcDef[];
  exits: ExitDef[];
}

/** 不能走上去的地形字元 */
export const BLOCKING = new Set(['^', '~', 'f', 'T', 'Y', 'o']);
