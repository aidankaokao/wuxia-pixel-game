/**
 * 讀書：「學識」技能的書目（用真實的典籍名稱）。
 *
 * - 書分蒙學、經部、史部、子部、集部，各有學識等級的門檻。
 * - 每本書的熟讀程度是 crafts.ts 的項目（learning:書id），1–5：初讀、略懂、通讀、熟讀、精通。
 * - 讀一回花一個時辰與體力，加學識經驗與這本書的熟讀程度；讀到精通再額外得一筆學識經驗。
 * - 學識的用處：講價（商店買東西便宜一些）、研讀武功時領悟得多一些（見 learningBonus）。
 */

import type { Character } from './character';
import { craftOf, gainCraft, gainWork, workOf, WORK_MAX } from './crafts';

export type Shelf = '蒙學' | '經部' | '史部' | '子部' | '集部';
export const SHELVES: Shelf[] = ['蒙學', '經部', '史部', '子部', '集部'];
export const READ_STAGES = ['', '初讀', '略懂', '通讀', '熟讀', '精通'];

export interface BookDef {
  id: string;
  name: string;
  shelf: Shelf;
  /** 要多少級學識才讀得懂 */
  level: number;
  desc: string;
  /** 讀的時候心裡默念的句子（依熟讀程度輪流） */
  lines: string[];
}

export const BOOKS: BookDef[] = [
  // 蒙學
  { id: 'sanzijing', name: '三字經', shelf: '蒙學', level: 0, desc: '三字一句的啟蒙讀本，講做人的道理與歷代興衰。', lines: ['人之初，性本善。性相近，習相遠。', '玉不琢，不成器。人不學，不知義。'] },
  { id: 'qianziwen', name: '千字文', shelf: '蒙學', level: 0, desc: '一千個字不重複，四字一句，識字的入門書。', lines: ['天地玄黃，宇宙洪荒。日月盈昃，辰宿列張。', '學優登仕，攝職從政。'] },
  { id: 'dizigui', name: '弟子規', shelf: '蒙學', level: 0, desc: '講孝悌、謹信、愛眾的規矩，鳴泉的記名弟子人手一本。', lines: ['弟子規，聖人訓。首孝悌，次謹信。', '見人善，即思齊。縱去遠，以漸躋。'] },
  // 經部
  { id: 'lunyu', name: '論語', shelf: '經部', level: 1, desc: '孔子與弟子的言行錄。', lines: ['學而時習之，不亦說乎？', '三人行，必有我師焉。', '知之為知之，不知為不知，是知也。'] },
  { id: 'daxue', name: '大學', shelf: '經部', level: 2, desc: '講修身、齊家、治國、平天下的次第。', lines: ['大學之道，在明明德，在親民，在止於至善。', '知止而後有定，定而後能靜。'] },
  { id: 'zhongyong', name: '中庸', shelf: '經部', level: 3, desc: '講不偏不倚、執兩用中的道理。', lines: ['喜怒哀樂之未發，謂之中。', '博學之，審問之，慎思之，明辨之，篤行之。'] },
  { id: 'mengzi', name: '孟子', shelf: '經部', level: 3, desc: '孟子的言論，講仁政與浩然之氣。', lines: ['我善養吾浩然之氣。', '富貴不能淫，貧賤不能移，威武不能屈。'] },
  { id: 'shijing', name: '詩經', shelf: '經部', level: 4, desc: '最古的詩歌總集，風、雅、頌三百篇。', lines: ['關關雎鳩，在河之洲。', '如切如磋，如琢如磨。'] },
  { id: 'zhouyi', name: '周易', shelf: '經部', level: 6, desc: '講陰陽變化的卦書，鳴泉的老一輩說劍理也在裡頭。', lines: ['天行健，君子以自強不息。', '窮則變，變則通，通則久。'] },
  // 史部
  { id: 'shiji', name: '史記', shelf: '史部', level: 4, desc: '上起黃帝、下至漢初的通史，遊俠、刺客都有列傳。', lines: ['其言必信，其行必果，已諾必誠，不愛其軀。', '桃李不言，下自成蹊。'] },
  { id: 'hanshu', name: '漢書', shelf: '史部', level: 5, desc: '記西漢一朝的史書。', lines: ['臨淵羨魚，不如退而結網。'] },
  { id: 'zizhi', name: '資治通鑑', shelf: '史部', level: 7, desc: '編年記一千多年的興衰得失，卷帙浩繁。', lines: ['兼聽則明，偏信則暗。'] },
  // 子部
  { id: 'daodejing', name: '道德經', shelf: '子部', level: 2, desc: '五千言，講道與德，以柔克剛。', lines: ['上善若水，水善利萬物而不爭。', '天下莫柔弱於水，而攻堅強者莫之能勝。'] },
  { id: 'sunzi', name: '孫子兵法', shelf: '子部', level: 3, desc: '十三篇兵法，講虛實、奇正。', lines: ['知彼知己，百戰不殆。', '兵無常勢，水無常形。'] },
  { id: 'zhuangzi', name: '莊子', shelf: '子部', level: 5, desc: '寓言多，汪洋恣肆，講逍遙與齊物。', lines: ['北冥有魚，其名為鯤。', '吾生也有涯，而知也無涯。'] },
  { id: 'neijing', name: '黃帝內經', shelf: '子部', level: 6, desc: '醫書之祖，講經絡、氣血，練內功的人也常翻。', lines: ['恬淡虛無，真氣從之。精神內守，病安從來。'] },
  // 集部
  { id: 'chuci', name: '楚辭', shelf: '集部', level: 4, desc: '屈原等人的辭賦。', lines: ['路漫漫其修遠兮，吾將上下而求索。'] },
  { id: 'wenxuan', name: '昭明文選', shelf: '集部', level: 6, desc: '歷代詩文的選集，讀書人案頭必備。', lines: ['蓋文章，經國之大業，不朽之盛事。'] },
];
export const bookDef = (id: string) => BOOKS.find((b) => b.id === id)!;

export const bookOf = (c: Character, id: string) => workOf(c, 'learning', id);

/** 讀一回：回傳讀到的句子與進展的提示（會直接修改傳入的角色） */
export function readBook(c: Character, b: BookDef): string[] {
  c.works ??= {};
  c.works[`learning:${b.id}`] ??= { level: 1, exp: 0 };
  const before = bookOf(c, b.id)!.level;
  const done = before >= WORK_MAX;
  const lines: string[] = [];
  // 讀熟了的書，學識長得慢
  const exp = Math.round((8 + b.level * 3) * (done ? 0.3 : 1));
  if (!done && gainWork(c, 'learning', b.id, 20)) {
    const now = bookOf(c, b.id)!.level;
    lines.push(`《${b.name}》${READ_STAGES[now]}了。`);
    if (now >= WORK_MAX) {
      lines.push(`你把《${b.name}》讀得滾瓜爛熟，掩卷之後，心中豁然開朗。`);
      const up = gainCraft(c, 'learning', 20 + b.level * 5);
      if (up) lines.push(up);
    }
  }
  const up = gainCraft(c, 'learning', exp);
  if (up) lines.push(up);
  return lines;
}

export const learningLevel = (c: Character) => craftOf(c, 'learning').level;

/** 學識的好處：講價折扣（每級 1%，最多 10%）與研讀武功多得的領悟 */
export const learningDiscount = (c: Character) => Math.min(0.1, learningLevel(c) * 0.01);
export const learningBonus = (c: Character) => learningLevel(c);
