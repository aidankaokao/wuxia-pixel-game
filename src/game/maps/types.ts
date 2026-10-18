import type { Dir } from '../constants';
import type { Script } from '../events';
import type { Flags } from '../../state/store';

/**
 * 地圖資料格式。
 *
 * tiles 是字元陣列，每個字元是一格：
 *   .  草地          *  花叢（可走）     :  泥土路       =  石板廣場
 *   ~  水（不可走）   #  木橋            ^  山（不可走）  n  農田（可走）
 *   f  木籬（不可走） T  樹（不可走）     Y  竹子（不可走） o  石頭（不可走）
 *   E  出入口（走上去會觸發 exits 裡對應的事件）
 *
 * 室內另有：W  牆（不可走）  _  地板  d  屋內的門（可走）
 *
 * 建築、告示牌、NPC 等不寫在字元裡，另外列在 buildings / props / npcs。
 * 空地（可以買下蓋房子）列在 plots，房子蓋好後由 maps/index.ts 的 getMap() 動態加上建築與室內地圖。
 * 會隨劇情變化的東西用 when（依旗標決定是否存在）與 script（互動時執行的劇情腳本）。
 */

/** 一段對話：可以是旁白，也可以標出說話的人。 */
export interface Line {
  speaker?: string;
  text: string;
}

/** 依劇情旗標決定是否出現 */
export type Condition = (f: Flags) => boolean;

export interface BuildingDef {
  /** 對應 art/props.ts 的 BUILDINGS */
  style: string;
  /** 佔地左上角（格） */
  x: number;
  y: number;
  name: string;
  /** 對著門按確認時的文字（可以進去的建築不需要） */
  door: Line[];
  /** 可以進去：走向門或對門按確認就進到這張地圖 */
  enter?: { to: string; spawn: { x: number; y: number; facing: Dir } };
}

export interface PropDef {
  id?: string;
  /** 貼圖名稱；也可以依旗標換圖（例如打開的寶箱） */
  sprite: string | ((f: Flags) => string);
  x: number;
  y: number;
  /** 佔幾格寬（預設 1） */
  w?: number;
  lines?: Line[];
  script?: Script;
  when?: Condition;
  /** 面對時的提示文字（預設「查看」），例如家具的「睡覺」 */
  label?: string;
}

/** 可以買下來蓋房子的空地。佔地固定 PLOT_W × PLOT_H 格，門口朝下 */
export interface PlotDef {
  id: string;
  name: string;
  x: number;
  y: number;
  /** 售價（銀兩）；用地契的第一塊免費 */
  price: number;
}
export const PLOT_W = 7;
export const PLOT_H = 5;

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
  /** 簡單的 NPC：每次對話依序輪播一組台詞 */
  talks?: Line[][];
  /** 會隨劇情改變說法的 NPC：對話時執行這段腳本 */
  script?: Script;
  when?: Condition;
  /** 有人物檔案（story/people.ts）的人：交談、切磋、贈禮等都走人際系統，熟悉度跟著這個 id */
  person?: string;
  /** 野獸：碰到或按確認鍵就開打這場遭遇戰（battle/enemies.ts 的 ENCOUNTERS） */
  encounter?: string;
  /** 野獸被打倒後，幾秒後重新出現 */
  respawn?: number;
}

export interface ExitDef {
  /** 出入口所在的格子（可以多格） */
  tiles: [number, number][];
  /** 目標地圖 id 與落腳處；沒有 to 表示尚未開放，只顯示 lines */
  to?: string;
  spawn?: { x: number; y: number; facing: Dir };
  lines?: Line[];
}

/** 踩到就觸發的區域（例如埋伏） */
export interface TriggerDef {
  tiles: [number, number][];
  when?: Condition;
  script: Script;
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
  triggers?: TriggerDef[];
  /** 這張地圖在戰鬥時用哪種背景 */
  battleBg?: 'mountain' | 'camp';
  plots?: PlotDef[];
  /** 室內地圖的配色（房屋風格） */
  theme?: string;
}

/** 不能走上去的地形字元 */
export const BLOCKING = new Set(['^', '~', 'f', 'T', 'Y', 'o', 'W']);
