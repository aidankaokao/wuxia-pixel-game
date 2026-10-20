/**
 * 節慶：過年、元宵、清明、端午、中元、中秋、掌門壽辰（日期見 time.ts 的 FESTIVALS）。
 *
 * - 節慶當天卜大勺發節令點心（兩份），青竹村的鍾嬸也會送一份。
 * - 各節有自己的活動（story/festival.ts）：過年領紅包、元宵猜燈謎、清明祭掃劍塚、端午比劍、
 *   中元放河燈、中秋賞月、掌門壽辰拜壽送禮。每項一年一次（節慶只有一天）。
 * - 地圖上的節慶擺設用條件旗標 festival（今天是 FESTIVALS 的第幾個，從 1 起算；平日是 0）。
 */

import type { ItemDef } from './character';
import { festivalOf, FESTIVALS } from './time';

export type FestivalName = '過年' | '元宵' | '清明' | '端午' | '中元' | '中秋' | '掌門壽辰';

/** 條件旗標用：今天是第幾個節慶（1 起算），平日是 0 */
export const festivalIndex = (day: number) => {
  const name = festivalOf(day);
  return name ? FESTIVALS.findIndex((f) => f.name === name) + 1 : 0;
};
/** 掛燈籠的節慶：過年、元宵、中秋 */
export const LANTERN_DAYS = [1, 2, 6];

/** 節令點心 */
export const FEST_FOOD: Record<FestivalName, string> = {
  過年: 'f_jiaozi',
  元宵: 'f_yuanxiao',
  清明: 'f_qingtuan',
  端午: 'f_zongzi',
  中元: 'f_subao',
  中秋: 'f_yuebing',
  掌門壽辰: 'f_shoutao',
};

const food = (name: string, icon: ItemDef['icon'], desc: string, eff: Partial<ItemDef>): ItemDef => {
  const parts = [eff.hp && `氣血 ${eff.hp}`, eff.qi && `內力 ${eff.qi}`, eff.stamina && `體力 ${eff.stamina}`].filter(Boolean);
  const treat = eff.treat ? `吃了心情好：接下來 ${eff.treat.battles} 場戰鬥武功經驗 ×${eff.treat.mult}。` : '';
  return { name, category: '菜餚', icon, desc: `${desc}回復${parts.join('、')}。${treat}`, price: 15, ...eff };
};

export const FEST_ITEMS: Record<string, ItemDef> = {
  f_jiaozi: food('餃子', 'dumpling', '過年包的白菜豬肉餃子，咬開滿口湯汁。', { hp: 80, stamina: 40, treat: { battles: 2, mult: 1.1 } }),
  f_yuanxiao: food('元宵', 'sweet', '滾了一層又一層糯米粉的元宵，裡頭是芝麻餡。', { stamina: 30, treat: { battles: 3, mult: 1.15 } }),
  f_qingtuan: food('青團', 'qingtuan', '艾草汁和糯米做的青團，包著豆沙。', { hp: 60, qi: 30 }),
  f_zongzi: food('粽子', 'zongzi', '竹葉包的鹹肉粽，綁著五彩線。', { hp: 120, stamina: 40 }),
  f_subao: food('素包', 'dumpling', '中元祭祖用的素菜包子。', { hp: 50, qi: 40 }),
  f_yuebing: food('月餅', 'mooncake', '印著「鳴泉」二字的月餅，蓮蓉餡。', { stamina: 30, treat: { battles: 3, mult: 1.2 } }),
  f_shoutao: food('壽桃', 'shoutao', '掌門壽宴上的壽桃饅頭，桃尖點著一抹紅。', { hp: 100, qi: 50, treat: { battles: 2, mult: 1.2 } }),
};
