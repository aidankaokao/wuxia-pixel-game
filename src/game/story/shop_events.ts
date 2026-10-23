import { canHold, giveItem, ITEMS } from '../character';
import { registerDailyTasks } from '../daily';
import type { EventCtx, Script } from '../events';
import { by } from '../maps/rooms';
import { propertyDef, propertyOf, TENANT_DAYS, tenantIn, tenantOf, XUN } from '../property';
import { addMorale, avgMorale, dropStaff, moraleOf, shopPrice, shopsOf, shopTypeDef, staffDef, type ShopEvent, type ShopEventKind, type ShopState } from '../shop';
import { guardDef } from '../shop_manage';
import { dateOf, dateText } from '../time';
import type { World } from '../home';
import { useGame } from '../../state/store';

/**
 * 經營的小事件（4.21）：店裡與租出去的房子偶爾出點事，要東家親自處理。
 *
 * 店裡（ShopState.event，shop.ts 的 eventEffect 算對生意的影響）：
 * - 夥計想加薪：加（每天多一兩）或不加（一半機會走人）；拖六天沒理，他自己走了。
 * - 夥計偷懶、帳上短少：訓一頓、扣工錢（可能走人）、辭退。
 * - 地痞「過江龍」蔡三收保護費：繳二十兩保十天、動手打跑（之後不太敢來）、派人報官（五兩茶水錢，保十天）。
 * - 大主顧下訂：五天內把幾件貨交到櫃上，照價加五成；過期就算了。
 * - 老饕郝一嚐上門（飯館）：端一道菜給他嚐，上品菜名聲傳開、五天內客人多兩成五；普通的菜反而少一成。
 * 房子（Owned.event，property.ts 的 rentDue 算房租）：
 * - 屋漏：花錢修（依物件租金），拖過五天房租只收一半。
 * - 手頭緊：寬限（下旬補上，還多送東西）、催討（收一半，租客可能搬走）、免了這旬（名聲 +1）。
 * - 送東西：租客送自家做的吃食來。
 * 每天半夜擲一次（onNewDay），一家店隔四天以上、一間房子隔六天以上才會再出事。
 * 夥計士氣低更常鬧加薪、偷懶（士氣低於 20 每天一成機會走人）；請了保鏢，地痞、小偷少來（shop_manage.ts 的 GUARDS），
 * 衙役坐鎮時地痞真的來了也會當場被打發。遭小偷（thief）不必處理：當晚就丟了櫃上的錢或幾樣貨，記在帳本上。
 * 每年正月初一照年度加薪的設定給夥計加薪（4.22）。
 */

const st = () => useGame.getState();
const CAI = by('蔡三');
const HAO = by('郝一嚐');

// ── 每天半夜：有沒有出事 ────────────────────────────────

function pickKind(s: ShopState): ShopEventKind | 'thief' | null {
  const opts: [ShopEventKind | 'thief', number][] = [];
  // 士氣越低，越常鬧加薪、偷懶（平均 50 是一倍，0 是一倍半，100 是半倍）
  const mood = 1.5 - avgMorale(s) / 100;
  const g = s.guard ? guardDef(s.guard.source) : null;
  if (s.staff.length) opts.push(['raise', 2 * mood]);
  if (s.staff.some((n) => staffDef(n).trait !== '老實')) opts.push(['slack', 2 * mood]);
  opts.push(['ruffian', (s.ruffianBeaten ? 0.5 : 2) * (g ? g.ruffian : 1)]);
  opts.push(['thief', 1.5 * (g ? g.thief : 1)]);
  opts.push(['patron', 3]);
  if (s.type === 'restaurant') opts.push(['critic', 2]);
  const total = opts.reduce((a, [, w]) => a + w, 0);
  let x = Math.random() * total;
  return opts.find(([, w]) => (x -= w) < 0)?.[0] ?? null;
}

/** 大主顧要什麼：架上或行囊裡、這家店收的東西 */
function patronItem(s: ShopState): string | null {
  const t = shopTypeDef(s.type);
  const pool = [...new Set([...Object.keys(s.stock), ...Object.keys(st().hero.items).filter((k) => t.accepts(k))])].filter((k) => ITEMS[k]?.price);
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
}

function rollShop(s: ShopState, day: number) {
  // 過期、拖太久的事
  const e = s.event;
  if (e?.kind === 'patron' && e.until! < day) delete s.event;
  if (e?.kind === 'raise' && day - e.day >= 6) {
    dropStaff(s, e.staff!);
    note(s, `${e.staff}等不到加薪，捲鋪蓋走了`);
    delete s.event;
  }
  // 士氣太低的夥計，每天一成機會走人
  for (const n of [...s.staff]) {
    if (moraleOf(s, n) < 20 && Math.random() < 0.1) {
      dropStaff(s, n);
      note(s, `${n}心灰意冷，辭工走了`);
    }
  }
  // 正月初一：年度加薪
  const { month, date } = dateOf(day);
  if (month === 0 && date === 1 && s.staff.length) {
    const n = s.yearly ?? 0;
    for (const x of s.staff) {
      if (n) s.raises = { ...s.raises, [x]: (s.raises?.[x] ?? 0) + n };
      addMorale(s, x, n ? 10 * n : -5, day);
    }
    note(s, n ? `新年照例給夥計們每人加薪 ${n} 兩，大家幹勁十足` : '新年沒加薪，夥計們有點失望');
  }
  if (s.event || day - (s.lastEvent ?? s.opened) < 4 || Math.random() >= 0.15) return;
  const kind = pickKind(s);
  if (!kind || (kind === 'ruffian' && (s.safeUntil ?? 0) > day)) return;
  if (kind === 'thief') return theft(s, day);
  // 衙役坐鎮：地痞來了當場被打發
  if (kind === 'ruffian' && s.guard) {
    s.lastEvent = day;
    s.safeUntil = day + 10;
    note(s, `蔡三上門收保護費，被${guardDef(s.guard.source).title}${s.guard.name}三兩下打發走了`);
    return;
  }
  const ev: ShopEvent = { kind, day };
  if (kind === 'raise') ev.staff = s.staff[Math.floor(Math.random() * s.staff.length)];
  if (kind === 'slack') {
    const lazy = s.staff.filter((n) => staffDef(n).trait !== '老實');
    ev.staff = lazy[Math.floor(Math.random() * lazy.length)];
  }
  if (kind === 'patron') {
    const item = patronItem(s);
    if (!item) return;
    Object.assign(ev, { item, n: 3 + Math.floor(Math.random() * 4), until: day + 5 });
  }
  s.event = ev;
  s.lastEvent = day;
}

/** 在最近一天的帳上記一筆事情 */
function note(s: ShopState, text: string) {
  const last = s.ledger[s.ledger.length - 1];
  if (last) last.trouble = last.trouble ? `${last.trouble}；${text}` : text;
}

/** 遭小偷：櫃上的錢被摸走四分之一（最多 60 兩），櫃上沒錢就偷走幾樣貨 */
function theft(s: ShopState, day: number) {
  s.lastEvent = day;
  if (s.till >= 20) {
    const n = Math.min(60, Math.round(s.till / 4));
    s.till -= n;
    note(s, `夜裡遭了小偷，櫃上的錢少了 ${n} 兩`);
    return;
  }
  const lost: string[] = [];
  for (const k of Object.keys(s.stock).slice(0, 3)) {
    const n = Math.min(s.stock[k], 2);
    s.stock[k] -= n;
    if (!s.stock[k]) delete s.stock[k];
    lost.push(`${ITEMS[k]?.name ?? k}×${n}`);
  }
  if (lost.length) note(s, `夜裡遭了小偷，偷走了${lost.join('、')}`);
}

function rollHouse(w: World) {
  const m = propertyOf(w);
  for (const o of Object.values(m.owned)) {
    if (o.event?.kind === 'gift' && w.day - o.event.day > 5) delete o.event;
    if (!tenantIn(o, w.day) || o.event || w.day - (o.lastEvent ?? o.rentFrom ?? 0) < 6 || Math.random() >= 0.08) continue;
    const r = Math.random();
    o.event = { kind: r < 0.4 ? 'leak' : r < 0.7 ? 'late' : 'gift', day: w.day };
    o.lastEvent = w.day;
  }
}

/** 每天半夜（story/shop.ts 結算完帳以後呼叫）：店與房子有沒有出事 */
export function rollEvents(w: World) {
  for (const s of Object.values(shopsOf(w))) rollShop(s, w.day);
  rollHouse(w);
}

// ── 店裡的事 ────────────────────────────────────────────

const shopOf = (id: string): ShopState | undefined => shopsOf(st().world)[id];
const update = (id: string, f: (s: ShopState) => void) => st().updateWorld((w) => f(w.shops![id]));
const clear = (id: string) => update(id, (s) => delete s.event);

/** 店裡現在有沒有要東家處理的事（櫃台選單第一項） */
export function shopEventLabel(id: string): string | null {
  const s = shopOf(id);
  const e = s?.event;
  if (!e || e.day > st().world.day) return null;
  switch (e.kind) {
    case 'raise':
      return `${e.staff}想跟東家談談工錢`;
    case 'slack':
      return '帳對不上，好像少了錢';
    case 'ruffian':
      return '門口有地痞來收保護費';
    case 'patron':
      return `大主顧訂了 ${ITEMS[e.item!].name}×${e.n}（${dateText(e.until!)}前）`;
    case 'critic':
      return '來了個挑嘴的老饕';
  }
}

export async function handleShopEvent(ctx: EventCtx, id: string) {
  const e = shopOf(id)?.event;
  if (!e) return;
  if (e.kind === 'raise') return raise(ctx, id, e.staff!);
  if (e.kind === 'slack') return slack(ctx, id, e.staff!);
  if (e.kind === 'ruffian') return ruffian(ctx, id);
  if (e.kind === 'patron') return patron(ctx, id, e);
  if (e.kind === 'critic') return critic(ctx, id);
}

async function raise(ctx: EventCtx, id: string, name: string) {
  const say = by(name);
  const wage = staffDef(name).wage + (shopOf(id)!.raises?.[name] ?? 0);
  const c = await ctx.ask(say(`東家……我在店裡也做了一陣子了，一天 ${wage} 兩實在不夠家裡用，能不能多給一兩？`)[0], ['加（每天多一兩）', '不加', '再想想']);
  if (c === 2) return;
  if (c === 0) {
    update(id, (s) => {
      s.raises = { ...s.raises, [name]: (s.raises?.[name] ?? 0) + 1 };
      addMorale(s, name, 20);
      delete s.event;
    });
    await ctx.say(...say('謝謝東家！往後我一定更賣力！'));
    return;
  }
  if (Math.random() < 0.5) {
    update(id, (s) => {
      dropStaff(s, name);
      delete s.event;
    });
    await ctx.say(...say('……那我另謀高就了。東家保重。'), `（${name}收拾東西走了）`);
  } else {
    update(id, (s) => {
      addMorale(s, name, -15);
      delete s.event;
    });
    await ctx.say(...say('……知道了。'), `（${name}嘴上不說，臉色不太好看）`);
  }
}

async function slack(ctx: EventCtx, id: string, name: string) {
  const say = by(name);
  await ctx.say('你翻了翻帳本，這幾天的進帳跟架上少的貨對不上，差了好些。', `一問之下，${name}支支吾吾，原來是趁你不在溜出去喝茶，還讓客人賒了帳沒記。`);
  const c = await ctx.ask('怎麼處置？', ['訓一頓就算了', '扣十兩工錢', `辭退${name}`, '再想想']);
  if (c === 3) return;
  if (c === 0) {
    update(id, (s) => {
      addMorale(s, name, -5);
      delete s.event;
    });
    await ctx.say(...say('東家教訓得是，下回再也不敢了。'));
  } else if (c === 1) {
    const quit = Math.random() < 0.25;
    update(id, (s) => {
      s.till += 10;
      if (quit) dropStaff(s, name);
      else addMorale(s, name, -15);
      delete s.event;
    });
    await ctx.say(...(quit ? [...say('扣工錢？這活兒我不幹了！'), `（${name}甩手走了。扣下的十兩放回櫃上）`] : [...say('……是，我認了。'), '（扣下的十兩放回櫃上）']));
  } else {
    update(id, (s) => {
      dropStaff(s, name);
      delete s.event;
    });
    await ctx.say(`（${name}低著頭走了）`);
  }
}

const PROTECT = 20;

async function ruffian(ctx: EventCtx, id: string) {
  const day = st().world.day;
  await ctx.say('一個敞著衣襟的漢子大剌剌地坐在門口的桌上，兩個跟班一左一右堵著門。', ...CAI('喲，東家來啦？在下過江龍蔡三，這條街上的平安，歸我管。', `一旬 ${PROTECT} 兩，保你的店平平安安。不給嘛……客人進不進得來，可就難說了。`));
  const c = await ctx.ask('怎麼辦？', [`給錢（${PROTECT} 兩，保十天）`, '動手把他們打出去', '派夥計去縣衙報官（五兩茶水錢）', '再想想']);
  if (c === 3) return;
  if (c === 0) {
    if (st().hero.silver < PROTECT) {
      await ctx.say(...CAI('沒錢？那就明天再來！'));
      return;
    }
    st().updateHero((h) => (h.silver -= PROTECT));
    update(id, (s) => {
      s.safeUntil = day + 10;
      delete s.event;
    });
    await ctx.say(...CAI('爽快！往後有事報我蔡三的名號。'), '（蔡三帶著跟班晃走了）');
    return;
  }
  if (c === 2) {
    if (st().hero.silver < 5) {
      await ctx.say('你摸了摸錢袋，連五兩茶水錢都湊不出來。');
      return;
    }
    st().updateHero((h) => (h.silver -= 5));
    update(id, (s) => {
      s.safeUntil = day + 10;
      delete s.event;
    });
    await ctx.say('夥計一路跑到縣衙。不多時，捕快雷小五提著鐵尺過來，在門口一站。', ...by('雷小五')('蔡三！又是你！滾滾滾，再讓我看見你在這條街收錢，就拎你回去吃牢飯！'), ...CAI('……雷爺，誤會，誤會。'), '（蔡三灰溜溜地走了。往後十天，捕快巡街會多繞過來看一眼）');
    return;
  }
  const o = await ctx.battle('shop_ruffians');
  if (o === 'win') {
    update(id, (s) => {
      s.ruffianBeaten = true;
      s.safeUntil = day + 20;
      delete s.event;
    });
    await ctx.say(...CAI('哎喲……好漢饒命！小的有眼不識泰山！'), '蔡三連滾帶爬地跑了。街坊們探出頭來，有人帶頭拍起手。');
    await ctx.hero((h) => ((h.fame += 3), '名聲 +3。'));
    return;
  }
  // 打輸了：他們砸了幾樣貨走人，事情還沒完
  const lost: string[] = [];
  update(id, (s) => {
    for (const k of Object.keys(s.stock).slice(0, 2)) {
      const n = Math.min(s.stock[k], 2);
      s.stock[k] -= n;
      if (!s.stock[k]) delete s.stock[k];
      lost.push(`${ITEMS[k].name}×${n}`);
    }
  });
  await ctx.say(...CAI('就這點本事？哈哈哈！'), `蔡三一夥掀了貨架，揚長而去。${lost.length ? `（砸壞了${lost.join('、')}）` : ''}`, '（他們明天還會再來）');
}

async function patron(ctx: EventCtx, id: string, e: ShopEvent) {
  const item = e.item!;
  const s = shopOf(id)!;
  const unit = Math.round(shopPrice(s, item) * 1.5);
  const have = (st().hero.items[item] ?? 0) + (s.stock[item] ?? 0);
  const say = by('夥計');
  await ctx.say(...say(`東家，城北周員外府上的管事來過，說要訂 ${ITEMS[item].name} ${e.n} 件，${dateText(e.until!)}以前送到，一件給 ${unit} 兩。`));
  const c = await ctx.ask(`身上加架上共有 ${have} 件。`, [have >= e.n! ? `交貨（收 ${unit * e.n!} 兩）` : `還不夠（差 ${e.n! - have} 件）`, '回絕這筆生意', '再想想']);
  if (c === 2) return;
  if (c === 1) {
    clear(id);
    await ctx.say('（你讓夥計去回了周府的管事）');
    return;
  }
  if (have < e.n!) {
    await ctx.say('貨還不夠，期限之前湊齊了再來交。');
    return;
  }
  // 先從行囊拿，不夠再從架上拿
  let need = e.n!;
  st().updateHero((h) => {
    const k = Math.min(need, h.items[item] ?? 0);
    h.items[item] -= k;
    if (!h.items[item]) delete h.items[item];
    need -= k;
    h.silver += unit * e.n!;
  });
  update(id, (x) => {
    if (need) {
      x.stock[item] -= need;
      if (!x.stock[item]) delete x.stock[item];
    }
    delete x.event;
  });
  await ctx.say(`${ITEMS[item].name}×${e.n} 送到了周府。管事點了點貨，爽快地付了 ${unit * e.n!} 兩。`);
  await ctx.hero((h) => ((h.fame += 1), '（大戶人家的生意做成了，名聲 +1）'));
}

async function critic(ctx: EventCtx, id: string) {
  const s = shopOf(id)!;
  const dishes = [...new Set([...Object.keys(s.stock), ...Object.keys(st().hero.items)])].filter((k) => ITEMS[k]?.dish && ((s.stock[k] ?? 0) + (st().hero.items[k] ?? 0)) > 0);
  await ctx.say('角落裡坐著一個圓臉的中年人，筷子在桌上點了點。', ...HAO('在下郝一嚐，吃遍大江南北。聽說這家館子開張了，特來嚐嚐。', '東家，挑一道你最拿手的來。'));
  if (!dishes.length) {
    await ctx.say(...HAO('……一道菜都沒有？那我改天再來。'));
    return;
  }
  const i = await ctx.ask('端哪一道給他？', [...dishes.map((k) => `${ITEMS[k].name}`), '再想想']);
  if (i >= dishes.length) return;
  const k = dishes[i];
  const fromBag = (st().hero.items[k] ?? 0) > 0;
  if (fromBag)
    st().updateHero((h) => {
      h.items[k] -= 1;
      if (!h.items[k]) delete h.items[k];
    });
  const q = k.endsWith('_3') ? 3 : k.endsWith('_2') ? 2 : 1;
  const day = st().world.day;
  update(id, (x) => {
    if (!fromBag) {
      x.stock[k] -= 1;
      if (!x.stock[k]) delete x.stock[k];
    }
    x.buzz = q === 3 ? { until: day + 5, mult: 1.25 } : q === 2 ? { until: day + 4, mult: 1.1 } : { until: day + 3, mult: 0.9 };
    delete x.event;
  });
  await ctx.say(`你端上一盤${ITEMS[k].name}。郝一嚐夾了一筷子，閉著眼嚼了很久。`);
  if (q === 3) {
    await ctx.say(...HAO('……好！火候、刀工、滋味，樣樣到位。', '這一道，望江樓也做不出來！'), '（郝一嚐逢人就誇。往後五天，客人多了兩成五）');
    await ctx.hero((h) => ((h.fame += 2), '名聲 +2。'));
  } else if (q === 2) await ctx.say(...HAO('嗯，不錯，是用了心的。'), '（往後四天，客人多了一成）');
  else await ctx.say(...HAO('……就這樣？家常菜嘛。'), '（郝一嚐搖搖頭走了。往後三天，客人少了一成）');
}

/** 地痞、老饕在店裡（maps/property.ts 放的 NPC）：跟他說話就是處理這件事 */
export const shopEventNpc =
  (id: string): Script =>
  (ctx) =>
    handleShopEvent(ctx, id);

// ── 租出去的房子 ────────────────────────────────────────

const houseEvent = (id: string) => propertyOf(st().world).owned[id]?.event;
const clearHouse = (id: string) => st().updateWorld((w) => delete propertyOf(w).owned[id].event);

/** 屋漏要花多少錢修 */
const leakCost = (id: string) => Math.max(8, Math.round((propertyDef(id)?.rent ?? 20) * 0.6));
/** 租客送的東西 */
const TENANT_GIFTS = ['egg', 'tofu', 'f_niangao', 'jitang', 'mantou'];

/** 跟租客說話：有事就處理，沒事就閒聊 */
export const tenantTalk =
  (id: string): Script =>
  async (ctx) => {
    const name = tenantOf(id);
    const say = by(name);
    const e = houseEvent(id);
    if (e?.kind === 'leak') {
      const cost = leakCost(id);
      const c = await ctx.ask(say('東家，前幾天下雨，屋頂漏得厲害，盆子都接不過來……能不能找人修一修？')[0], [`請泥水匠來修（${cost} 兩）`, '過幾天再說']);
      if (c !== 0) {
        await ctx.say(...say('……好，那我先拿盆子接著。'), '（拖過五天，房租只收得到一半）');
        return;
      }
      if (st().hero.silver < cost) {
        await ctx.say(`要 ${cost} 兩，你身上不夠。`);
        return;
      }
      st().updateHero((h) => (h.silver -= cost));
      clearHouse(id);
      await ctx.say('泥水匠爬上屋頂，換了十幾片瓦、補了泥灰。', ...say('東家真是好人！往後房租我一定按時交。'));
      return;
    }
    if (e?.kind === 'late') {
      const c = await ctx.ask(say('東家……這陣子手頭實在緊，這一旬的租，能不能寬限幾天？')[0], ['寬限（下一旬一起交）', '催他先交一半', '這旬免了（名聲 +1）']);
      if (c === 0) {
        clearHouse(id);
        await ctx.say(...say('多謝東家！'), '（租客感激得很。下次去屋裡，他會送點東西來）');
        st().updateWorld((w) => (propertyOf(w).owned[id].event = { kind: 'gift', day: w.day }));
      } else if (c === 1) {
        const p = propertyDef(id)!;
        const half = Math.round(p.rent / 2);
        const leave = Math.random() < 0.3;
        st().updateHero((h) => (h.silver += half));
        st().updateWorld((w) => {
          const o = propertyOf(w).owned[id];
          delete o.event;
          if (leave) o.rentFrom = w.day; // 搬走了：重新招租，幾天後才有新租客
        });
        await ctx.say(...say('……是，這是半旬的錢。'), `（收了 ${half} 兩）`, ...(leave ? [`（過了兩天，${name}搬走了。牙行說會再找新租客）`] : []));
      } else {
        st().updateWorld((w) => {
          const o = propertyOf(w).owned[id];
          delete o.event;
          o.rentPaidTo = (o.rentPaidTo ?? (o.rentFrom ?? w.day) + TENANT_DAYS) + XUN;
        });
        await ctx.say(...say('東家……這、這份情我記下了！'));
        await ctx.hero((h) => ((h.fame += 1), '名聲 +1。'));
      }
      return;
    }
    if (e?.kind === 'gift') {
      const k = TENANT_GIFTS.filter((x) => ITEMS[x])[Math.floor(Math.random() * TENANT_GIFTS.filter((x) => ITEMS[x]).length)];
      if (k && canHold(st().hero, k, 2)) {
        clearHouse(id);
        await ctx.say(...say('東家來得正好！家裡做了些吃的，您帶兩份回去嚐嚐。'));
        await ctx.hero((h) => giveItem(h, k, 2));
        return;
      }
    }
    const lines = [say('東家來啦！屋子住得挺好的。', '房租我都按旬交到縣衙，您去收就是了。'), say('隔壁那家的狗又跑進院子裡了……沒事沒事，我趕出去了。'), say('東家吃過了沒？要不要喝碗茶再走？')];
    await ctx.say(...lines[st().world.day % lines.length]);
  };

// ── 今日事 ──────────────────────────────────────────────

registerDailyTasks(({ world }) => {
  const out: { text: string; state: 'todo'; note?: string }[] = [];
  for (const s of Object.values(shopsOf(world))) {
    const e = s.event;
    if (!e || e.day > world.day) continue;
    const label = {
      raise: `${e.staff}想加薪`,
      slack: '帳對不上',
      ruffian: '地痞上門收保護費',
      patron: `大主顧訂了${ITEMS[e.item!]?.name}×${e.n}`,
      critic: '老饕上門',
    }[e.kind];
    out.push({ text: `${s.name}：${label}`, state: 'todo', note: e.kind === 'patron' ? `${dateText(e.until!)}前交貨` : '到店裡處理' });
  }
  for (const [id, o] of Object.entries(propertyOf(world).owned)) {
    if (!o.event) continue;
    const p = propertyDef(id);
    const label = { leak: '屋頂漏雨', late: '手頭緊，房租交不出來', gift: '有東西要送你' }[o.event.kind];
    out.push({ text: `${p?.name}：${tenantOf(id)}${label}`, state: 'todo', note: '到房子裡找租客' });
  }
  return out;
});
