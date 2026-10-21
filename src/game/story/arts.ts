import { derive, giveItem } from '../character';
import { ArtId, PAINTINGS, paintingRoll, qinQi } from '../arts';
import { craftOf, gainCraft } from '../crafts';
import { withCost, type EventCtx, type Script } from '../events';
import { useGame } from '../../state/store';
import { askRounds, exert, roundsNote } from './estate';

/**
 * 琴棋書畫：自己練（聽泉亭撫琴、聽劍亭打譜、書案練字、望江台寫生），
 * 以及跟同好對弈（三局兩勝：穩守、取勢、強攻，相剋決定勝算，棋藝高低再加減）。
 */

const st = () => useGame.getState();
const PRACTICE_STAMINA = 8;
const PRACTICE_EXP = 12;

const PRACTICE: Record<ArtId, { ask: string; lines: string[] }> = {
  qin: { ask: '亭中石桌上擺著一張古琴。要坐下來撫一曲嗎？', lines: ['你調好琴弦，隨著泉聲撥了一曲。', '琴聲和著水聲，心裡慢慢靜了下來。'] },
  chess: { ask: '亭中石桌上刻著棋盤，旁邊兩罐黑白子。要打一盤譜嗎？', lines: ['你照著記得的棋譜，一黑一白地擺了一盤。', '擺到中盤，才看出當年那一手的妙處。'] },
  calligraphy: { ask: '書案上筆墨紙硯都備著。要練一會兒字嗎？', lines: ['你研好了墨，一筆一畫地臨帖。', '寫到後來，手腕越來越穩，字也有了幾分筋骨。'] },
  painting: { ask: '望江台上視野開闊。要畫一幅大江山水嗎？', lines: ['你鋪開紙，對著江上的白帆與遠山落筆。', '雲氣一層層暈開，江面只留了一片白。'] },
};

/** 自己練一門雅藝：花體力與半個時辰，加技能經驗，各有一點小用處 */
export const practiceAt =
  (art: ArtId, idle: string): Script =>
  withCost(() => ({ ke: 4, stamina: PRACTICE_STAMINA }), async (ctx) => {
    const p = PRACTICE[art];
    const n = await askRounds(ctx, PRACTICE_STAMINA, '練', 99, `${idle}\n${p.ask}`);
    if (!n) return;
    if (!(await exert(ctx, PRACTICE_STAMINA * n, '累得提不起精神，靜不下心來。'))) return;
    ctx.pass(4 * n);
    const lv = craftOf(st().hero, art).level;
    await ctx.say(`${p.lines.join('\n')}\n${roundsNote('練', n, 4) || '（花了半個時辰）'}`);
    await ctx.hero((h) => {
      const lines: (string | null)[] = [];
      if (art === 'qin') {
        const qi = Math.max(0, Math.min(qinQi(lv) * n, derive(h).maxQi - h.qi));
        h.qi += qi;
        if (qi > 0) lines.push(`心境平和，內力 +${qi}。`);
      } else if (art === 'calligraphy') {
        lines.push(gainCraft(h, 'learning', 3 * n));
      } else if (art === 'painting') {
        for (let i = 0; i < n; i++) lines.push(giveItem(h, PAINTINGS[paintingRoll(lv)]));
      }
      lines.push(gainCraft(h, art, PRACTICE_EXP * n));
      return lines;
    });
  });

// ── 對弈 ────────────────────────────────────────────────

export const CHESS_MOVES = ['穩守', '取勢', '強攻'] as const;
/** 相剋：取勢勝穩守、強攻勝取勢、穩守勝強攻 */
const beats = (a: number, b: number) => (a + 2) % 3 === b;
const STYLE_HINT = ['棋風沉穩，總是先求自保', '喜歡搶佔大場，講究取勢', '落子凌厲，一有機會就強攻'];

/**
 * 跟人下一盤棋：三局兩勝。對方有自己的棋風（style，偏好哪一種下法），
 * 看出來了就能挑相剋的下法。回傳是否贏了。
 */
export async function playChess(ctx: EventCtx, name: string, level: number, style: number): Promise<boolean> {
  const mine = craftOf(st().hero, 'chess').level;
  let win = 0;
  let lose = 0;
  await ctx.say(`你和${name}擺好棋盤，猜先落子。\n（${name}${STYLE_HINT[style]}。三局兩勝：取勢勝穩守、強攻勝取勢、穩守勝強攻；棋力高低也有影響）`);
  for (let round = 1; win < 2 && lose < 2; round++) {
    const c = await ctx.ask(`第 ${round} 盤（${win} 勝 ${lose} 負）。這一盤怎麼下？`, [...CHESS_MOVES]);
    // 對方六成照棋風下，其餘隨意
    const theirs = Math.random() < 0.6 ? style : Math.floor(Math.random() * 3);
    const edge = beats(c, theirs) ? 1 : beats(theirs, c) ? -1 : 0;
    const p = Math.max(0.1, Math.min(0.9, 0.5 + edge * 0.3 + (mine - level) * 0.04));
    const ok = Math.random() < p;
    if (ok) win++;
    else lose++;
    const read = edge > 0 ? '你這一手正好剋住了對方。' : edge < 0 ? '對方這一手正好剋住了你。' : '兩邊下法相同，比的是棋力。';
    await ctx.say(`你${CHESS_MOVES[c]}，${name}${CHESS_MOVES[theirs]}。${read}\n${ok ? '這一盤你贏了。' : '這一盤你輸了。'}`);
  }
  return win >= 2;
}
