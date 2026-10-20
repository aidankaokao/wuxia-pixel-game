/**
 * 雅藝：琴、棋、書、畫。跟武功分開，練了各有一點小用處，也能跟有同好的人結交。
 *
 * - 琴：在聽泉亭撫琴，心境平和，回一些內力。
 * - 棋：在聽劍亭打譜；跟愛下棋的人對弈（三局兩勝的小遊戲）。
 * - 書：在書房的書案練字，順帶長一點學識。
 * - 畫：在望江台寫生，畫成的畫可以賣、可以送人；畫藝越高越常畫出好畫。
 */

import type { ItemDef } from './character';
import type { CraftId } from './crafts';

export type ArtId = Extract<CraftId, 'qin' | 'chess' | 'calligraphy' | 'painting'>;

/** 跟同好互動時的動作名稱 */
export const ART_ACTION: Record<ArtId, string> = { qin: '論琴', chess: '對弈', calligraphy: '品字', painting: '賞畫' };

/** 畫作：習作、佳作、名作 */
export const PAINTINGS = ['painting_1', 'painting_2', 'painting_3'];
export const ART_ITEMS: Record<string, ItemDef> = {
  painting_1: { name: '山水習作', category: '雜物', icon: 'painting', desc: '望江台上寫生的山水，筆法還生澀。', price: 8 },
  painting_2: { name: '山水佳作', category: '雜物', icon: 'painting', desc: '江上白帆、遠山雲氣，畫得頗有幾分意境。懂畫的人會喜歡。', price: 40 },
  painting_3: { name: '山水名作', category: '雜物', icon: 'painting', desc: '一幅氣韻生動的大江煙雨圖，掛在哪裡都體面。', price: 150 },
};

/** 畫出來是哪一種：畫藝越高越常出佳作、名作 */
export function paintingRoll(level: number, rand: () => number = Math.random): number {
  const q = rand() + level * 0.08;
  return q > 1.25 ? 2 : q > 0.85 ? 1 : 0;
}

/** 撫琴回的內力 */
export const qinQi = (level: number) => 10 + level * 4;
