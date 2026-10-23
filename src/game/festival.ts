/**
 * 節慶：過年、元宵、清明、端午、中元、中秋、掌門壽辰、冬至、除夕（日期見 time.ts 的 FESTIVALS）。
 *
 * - 節慶當天卜大勺發節令點心（兩份），青竹村的鍾嬸也會送一份。
 * - 各節有自己的活動（story/festival.ts）：過年領紅包、元宵猜燈謎、清明祭掃劍塚、端午比劍、
 *   中元放河燈、中秋賞月、掌門壽辰拜壽送禮。每項一年一次（節慶只有一天）。
 * - 地圖上的節慶擺設用條件旗標 festival（今天是 FESTIVALS 的第幾個，從 1 起算；平日是 0）。
 * - 節慶前後的「節期」（festivePeriod，條件旗標 period）：年節（臘月十五到正月十五）家家貼春聯、掛燈籠、擺年貨攤；
 *   端午節期（五月初一到初五）門上插艾草、江上有龍舟；中秋節期（八月初十到十五）掛燈籠。
 *   城裡的活動在 story/festival_city.ts；店裡的生意在節期也會變好（shop.ts 的 festDraw）。
 */

import type { ItemDef } from './character';
import { dateOf, festivalOf, FESTIVALS } from './time';

export type FestivalName = '過年' | '元宵' | '清明' | '端午' | '中元' | '中秋' | '掌門壽辰' | '冬至' | '除夕';

/** 條件旗標用：今天是第幾個節慶（1 起算），平日是 0 */
export const festivalIndex = (day: number) => {
  const name = festivalOf(day);
  return name ? FESTIVALS.findIndex((f) => f.name === name) + 1 : 0;
};
/** 節慶的序號（條件旗標 festival 的值） */
export const FEST = { 過年: 1, 元宵: 2, 清明: 3, 端午: 4, 中元: 5, 中秋: 6, 掌門壽辰: 7, 冬至: 8, 除夕: 9 } as const;
/** 掛燈籠的節慶：過年、元宵、中秋、除夕 */
export const LANTERN_DAYS = [1, 2, 6, 9];

/** 節期：0 平日、1 年節（臘月十五到正月十五）、2 端午（五月初一到初五）、3 中秋（八月初十到十五） */
export const PERIOD = { none: 0, newyear: 1, duanwu: 2, zhongqiu: 3 } as const;
export function festivePeriod(day: number): number {
  const { month, date } = dateOf(day);
  if ((month === 11 && date >= 15) || (month === 0 && date <= 15)) return PERIOD.newyear;
  if (month === 4 && date <= 5) return PERIOD.duanwu;
  if (month === 7 && date >= 10 && date <= 15) return PERIOD.zhongqiu;
  return PERIOD.none;
}
/** 掛燈籠的時候：過年、元宵、中秋、除夕當天，以及年節、中秋節期（給地圖的 when 用） */
export const lanternTime = (f: { festival?: number; period?: number }) => LANTERN_DAYS.includes(f.festival ?? 0) || f.period === PERIOD.newyear || f.period === PERIOD.zhongqiu;

/** 年節裡擺年貨攤的日子：臘月十五到除夕 */
export const nianhuoDays = (day: number) => {
  const { month, date } = dateOf(day);
  return month === 11 && date >= 15;
};

/** 節令點心 */
export const FEST_FOOD: Record<FestivalName, string> = {
  過年: 'f_jiaozi',
  元宵: 'f_yuanxiao',
  清明: 'f_qingtuan',
  端午: 'f_zongzi',
  中元: 'f_subao',
  中秋: 'f_yuebing',
  掌門壽辰: 'f_shoutao',
  冬至: 'f_tangyuan',
  除夕: 'f_niangao',
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
  f_tangyuan: food('冬至湯圓', 'tangyuan', '冬至吃的湯圓，一碗六顆，紅白各半，熱騰騰的甜湯。', { stamina: 40, hp: 40, treat: { battles: 2, mult: 1.1 } }),
  f_niangao: food('年糕', 'niangao', '蒸得軟糯的紅糖年糕，切片煎過，外脆裡黏。「年年高」。', { hp: 70, stamina: 50 }),
  f_shoutao: food('壽桃', 'shoutao', '掌門壽宴上的壽桃饅頭，桃尖點著一抹紅。', { hp: 100, qi: 50, treat: { battles: 2, mult: 1.2 } }),
};

/** 年貨攤賣的東西：鞭炮（放了心情好）、紅燈籠（當禮物送人） */
FEST_ITEMS.firecracker = {
  name: '鞭炮', category: '雜物', icon: 'firecracker', price: 4,
  desc: '一掛紅紙鞭炮。過年放一串，噼哩啪啦，晦氣都嚇跑了。放了心情好：接下來 2 場戰鬥武功經驗 ×1.1。',
  treat: { battles: 2, mult: 1.1 },
};
FEST_ITEMS.red_lantern = {
  name: '紅燈籠', category: '雜物', icon: 'red_lantern', price: 8,
  desc: '竹骨糊紅紙的燈籠，畫著福字。年節送人最討喜。',
};
