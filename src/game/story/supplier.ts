import type { EventCtx, Script } from '../events';
import { ITEMS } from '../character';
import { by } from '../maps/rooms';
import { shopsOf, shopTypeDef } from '../shop';
import { signContract, managerPool, hireManager } from '../shop_admin';
import { hasBizTitle, SUPPLIERS, supplierDef, TERMS, townName, type TermId } from '../shop_manage';
import { useGame } from '../../state/store';

/**
 * 供應商與掌櫃的對話（4.23）：
 * - 供應商要親自上門談才簽得了約（簽過一次，之後可以在總號帳簿裡續約）。地圖上的人用 `supplierTalk(供應商id, 原本的腳本)` 包一層：
 *   東家有開店、這家供應商又有你店裡用得上的貨，先問要不要談合約，不談就照原本的腳本。
 * - 萬通牙行的錢六另外介紹掌櫃（`hireManagerTalk`）。
 */

const st = () => useGame.getState();

/** 這家供應商的貨，你的哪幾家店用得上 */
function usefulFor(sup: string) {
  const d = supplierDef(sup);
  return Object.values(shopsOf(st().world)).filter((s) => {
    const t = shopTypeDef(s.type);
    if (s.type === 'restaurant') return Object.keys(ITEMS).some((k) => d.goods(k) && ITEMS[k].category === '食材');
    return Object.keys(ITEMS).some((k) => d.goods(k) && t.accepts(k));
  });
}

/** 談供貨合約 */
export async function contractTalk(ctx: EventCtx, sup: string) {
  const d = supplierDef(sup);
  const say = by(d.contact);
  const c = st().world.biz?.contracts[sup];
  const day = st().world.day;
  const samples = Object.keys(ITEMS).filter((k) => d.goods(k)).slice(0, 6).map((k) => ITEMS[k].name);
  await ctx.say(
    ...say(
      `${d.name}供的是：${samples.join('、')}${samples.length >= 6 ? '……' : ''}。`,
      `進價大約是行情的 ${Math.round(d.ratio * 100)}%${d.freight ? `，每件另加運費 ${d.freight} 兩` : ''}；${d.reliable >= 0.95 ? '從不誤事' : d.reliable >= 0.9 ? '偶爾會晚' : '遇上壞天氣就斷貨'}。`,
    ),
    ...(c && c.until >= day ? say(`咱們的約到第 ${c.until} 天。要續的話，從那天往後接。`) : []),
  );
  const i = await ctx.ask(say('簽多久？簽得越久，價錢讓得越多。')[0], [...TERMS.map((t) => `${t.name}（簽約費 ${t.fee} 兩${t.disc ? `，再讓 ${Math.round(t.disc * 100)}%` : ''}）`), '再想想']);
  if (i >= TERMS.length) return;
  const r = signContract(sup, TERMS[i].id as TermId);
  await ctx.say(...(r.ok ? say('好！白紙黑字，按了手印就算數。往後每天半夜，貨照你店裡的單子送到。') : []), r.msg);
  if (r.ok) await ctx.say('（到店裡的「經營管理」→「進貨」改成批貨、設定每樣補到幾件，貨才會送來）');
}

/** 地圖上的供應商：有用得上的店，就先問要不要談合約 */
export const supplierTalk =
  (sup: string, inner: Script): Script =>
  async (ctx) => {
    // 要有「東家」的稱號、又有用得上這家貨的店，才談得了合約
    if (!hasBizTitle(st().hero) || !usefulFor(sup).length) return inner(ctx);
    const d = supplierDef(sup);
    const c = await ctx.ask(by(d.contact)(`${st().hero.surname || ''}東家來啦！是來談供貨的？`)[0], ['談供貨合約', '別的事']);
    if (c === 0) await contractTalk(ctx, sup);
    else await inner(ctx);
  };

/** 牙行介紹掌櫃 */
export async function hireManagerTalk(ctx: EventCtx) {
  const say = by('錢六');
  const pool = managerPool();
  if (!pool.length) {
    await ctx.say(...say('城裡能當掌櫃的人，都讓您請走啦！'));
    return;
  }
  await ctx.say(...say('要找掌櫃？有了好掌櫃，東家就不必事事操心。我這兒有幾個人，您挑挑。', '掌櫃管一家店；大掌櫃能把整座城的店與房子都管起來。薪水之外，照規矩還要分點紅。'));
  const i = await ctx.ask(say('看上哪一位？')[0], [
    ...pool.map((p) => `${p.name}（${p.rank === 2 ? '大掌櫃' : '掌櫃'}・才幹 ${p.talent}・日薪 ${p.salary}・分紅 ${Math.round(p.share * 100)}%）：${p.desc}`),
    '再想想',
  ]);
  if (i >= pool.length) return;
  const fee = 30;
  if ((await ctx.ask(say(`介紹費 ${fee} 兩。人我叫來，往後他的薪水從店裡出。`)[0], ['就他了', '算了'])) !== 0) return;
  if (st().hero.silver < fee) {
    await ctx.say(...say('介紹費都拿不出來？那可不成。'));
    return;
  }
  st().updateHero((h) => (h.silver -= fee));
  const r = hireManager(pool[i].name);
  await ctx.say({ speaker: pool[i].name, text: '見過東家！往後店裡的事，交給在下就是。' }, r.msg);
}

/** 總號帳簿「供應商」頁用：各城的供應商 */
export const suppliersIn = (town: string) => SUPPLIERS.filter((s) => s.town === town).map((s) => ({ ...s, townName: townName(town) }));
