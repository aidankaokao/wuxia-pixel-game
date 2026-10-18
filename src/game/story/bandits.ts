import { giveItem, learnSkill, restoreAll } from '../character';
import type { Script } from '../events';
import type { Line } from '../maps/types';
import type { Flags } from '../../state/store';

/**
 * 第一個支線「蒼嵐山賊」以及青竹村相關的劇情腳本。
 *
 * 旗標：
 *   q_bandits      0 未接 / 1 已接下委託 / 3 已覆命領賞
 *   bandit_scouts  1 已擊退山道上的嘍囉
 *   bandit_boss    1 已擊敗祁三刀
 *   stranger       1 青衫客（沈孤舟）已離開
 *   stele          1 已從石碑悟出竹影劍法
 *   tea            1 已收下鍾嬸的茶
 *   chest_camp     1 已打開山寨的寶箱
 *   home_deed      覆命時一併給地契（見 story/estate.ts）
 */

const by = (speaker: string) => (text: string): Line => ({ speaker, text });
const liu = by('柳承安');
const zhong = by('鍾嬸');
const kid = by('小石頭');
const qi = by('祁三刀');
const shen = by('青衫客');
const grunt = by('斷崖寨嘍囉');

// ── 任務日誌 ────────────────────────────────────────────

export const banditsQuest = {
  id: 'bandits',
  title: '蒼嵐山賊',
  status(f: Flags): { text: string; done: boolean } | null {
    if (f.q_bandits === 3) return { text: '斷崖寨的山賊已被趕跑，青竹村重歸平靜。', done: true };
    if (f.bandit_boss) return { text: '已擊退斷崖寨寨主祁三刀。回青竹村向村長柳承安覆命吧。', done: false };
    if (f.q_bandits === 1)
      return { text: '受青竹村村長柳承安所託，前往村北的蒼嵐山道，趕走盤據在斷崖寨的山賊。', done: false };
    return null;
  },
};

// ── 青竹村 ──────────────────────────────────────────────

export const liuTalk: Script = async (ctx) => {
  const q = ctx.flag('q_bandits');
  if (q === 3) {
    await ctx.say(liu('托少俠的福，村裡總算能睡個安穩覺了。'));
    if (ctx.flag('home_deed') === 1) await ctx.say(liu('地契可收好了？村東、村西南的空地，插著木牌的就是，挑一塊喜歡的吧。'));
    else await ctx.say(liu('往後若累了，就回家好好歇著。'));
    return;
  }
  if (ctx.flag('bandit_boss')) {
    if (q === 0) {
      await ctx.say(liu('……什麼？斷崖寨的山賊，是你一個人挑了的？'), liu('老夫還沒開口相求，少俠便已出手。這份俠義，青竹村記下了！'));
    } else {
      await ctx.say(liu('你回來了！看你這一身塵土……祁三刀那廝，真被你打跑了？'), liu('好！好！果然英雄出少年！'));
    }
    await ctx.say(
      liu('這些銀兩是村裡湊的一點心意，請務必收下。'),
      liu('另外，老夫年輕時也在江湖上走過幾年，有一套「青竹步」的輕身功夫，就傳給你吧。'),
    );
    await ctx.hero((c) => {
      c.silver += 50;
      return ['獲得銀兩 50。', learnSkill(c, 'qingzhu'), giveItem(c, 'manual_qingzhu')];
    });
    await ctx.say(
      liu('步法的要訣在「輕」與「變」。多加練習，閃躲刀劍時自有妙用。'),
      liu('那本手札是老夫當年的心得。等你把步法練熟了，再翻翻看，或許能更上一層樓。'),
      liu('還有——少俠若不嫌棄，就在青竹村安個家吧。'),
      liu('村東、村西南有三塊空地，這張地契你收著，挑一塊喜歡的，杜木匠會幫你把屋子搭起來。'),
    );
    ctx.setFlag('q_bandits', 3);
    ctx.setFlag('home_deed', 1);
    await ctx.say('（獲得「地契」：到空地的木牌前，就能免費挑一塊地蓋房子）');
    return;
  }
  if (q === 1) {
    await ctx.say(
      liu('斷崖寨就在蒼嵐山道的盡頭，從村北的山口上去便是。'),
      liu('若是受了傷，就回村裡的老井喝口水歇歇，那井水可是能養人的。'),
    );
    return;
  }
  if (!ctx.flag('met_liu')) {
    await ctx.say(liu('年輕人，看你面生，是頭一回到青竹村吧？'), liu('老夫柳承安，忝為本村村長。'));
    ctx.setFlag('met_liu');
  }
  await ctx.say(
    liu('唉……不瞞你說，近來北邊蒼嵐山上來了一夥山賊，自稱「斷崖寨」。'),
    liu('寨主叫祁三刀，三天兩頭下山搶糧，村裡的年輕人連上山砍柴都不敢了。'),
  );
  const choice = await ctx.ask(liu('看少俠背上負劍，想必身手不凡。不知……可願替本村走一趟？'), ['義不容辭', '容我想想']);
  if (choice === 1) {
    await ctx.say(liu('不勉強，不勉強。少俠若改變心意，再來找老夫。'));
    return;
  }
  ctx.setFlag('q_bandits', 1);
  await ctx.say(liu('好！老夫果然沒看錯人！'), liu('這幾帖金創藥你帶著，山上刀劍無眼。'));
  await ctx.hero((c) => giveItem(c, 'jinchuang', 3));
  await ctx.say(
    liu('還有一事。聽逃回來的樵夫說，祁三刀每回使出殺招之前，總要先高舉大刀蓄勢。'),
    liu('見他蓄勢，切莫硬拼——先「防禦」守住了，再找機會反擊。'),
  );
};

export const wellUse: Script = async (ctx) => {
  await ctx.say('一口老井，井水清涼。');
  await ctx.hero((c) => {
    restoreAll(c);
    return '你掬起一捧喝了，精神為之一振。\n（氣血、內力、體力完全恢復）';
  });
};

export const steleRead: Script = async (ctx) => {
  if (ctx.flag('stele')) {
    await ctx.say('碑上的劍痕，你已了然於胸。');
    return;
  }
  await ctx.say(
    '竹林深處立著一塊長滿青苔的石碑。',
    '碑上刻著八個字，筆畫如劍痕：\n「竹影搖風，劍意自生」',
    '一陣風吹過，滿林竹影搖曳。你望著碑上的劍痕，忽然看出了其中的起落轉折……',
  );
  await ctx.hero((c) => learnSkill(c, 'zhuying'));
  await ctx.say('（戰鬥中可以使出「破竹式」與「竹影搖風」了）', '你撕下一片衣角，蘸著溪水把碑上的劍痕拓了下來。');
  await ctx.hero((c) => giveItem(c, 'manual_zhuying'));
  ctx.setFlag('stele');
};

export const zhongTalk: Script = async (ctx) => {
  if (ctx.flag('q_bandits') === 3) {
    await ctx.say(zhong('聽說是你把山賊趕跑的？哎呀，真是了不起！'), zhong('往後來喝茶，嬸都不收你錢！'));
    return;
  }
  if (!ctx.flag('tea')) {
    await ctx.say(
      zhong('客官，來碗竹葉清茶歇歇腳吧！'),
      zhong('聽說臨江城的漕幫，最近跟金刀鏢局鬧得很僵，來往的商客都繞道走呢。'),
      zhong('看你要出遠門的樣子，這碗茶帶著路上喝。不收錢！'),
    );
    await ctx.hero((c) => giveItem(c, 'tea', 1));
    ctx.setFlag('tea');
    return;
  }
  await ctx.say(zhong('我家這茶，用的是雲水河上游的水，別處喝不到的。'));
};

export const kidTalk: Script = async (ctx) => {
  if (ctx.flag('bandit_boss')) {
    await ctx.say(kid('大哥哥！聽說你把山賊打跑了！'), kid('教我武功好不好？我也想飛簷走壁！'));
    return;
  }
  const n = ctx.flag('kid_talk');
  ctx.setFlag('kid_talk', n + 1);
  if (n % 2 === 0) {
    await ctx.say(kid('大哥哥，你會飛簷走壁嗎？'), kid('韓叔叔說，真正的高手踩著竹梢就能飛過整片竹林！'));
  } else {
    await ctx.say(kid('西邊竹林裡有一塊怪石頭，上面刻著字，可是我看不懂……'));
  }
};

export const aniuTalk: Script = async (ctx) => {
  const a = by('阿牛');
  if (ctx.flag('bandit_boss')) {
    await ctx.say(a('山賊沒了，今年總算能安心收成了！'), a('少俠，等稻子熟了，我送一袋新米到你那兒！'));
    return;
  }
  await ctx.say(a('今年雨水好，秧苗長得旺。'), a('就怕山上的山賊又下來搶糧……唉。'));
};

export const strangerTalk: Script = async (ctx) => {
  const n = ctx.flag('stranger_talk');
  ctx.setFlag('stranger_talk', n + 1);
  if (n === 0) {
    await ctx.say(shen('……'), '他瞥了你一眼，又轉頭望向北方的山。', shen('這把劍，等了三年。'));
  } else {
    await ctx.say(shen('少管閒事，對你沒有壞處。'));
  }
};

// ── 蒼嵐山道 ────────────────────────────────────────────

export const scoutsFight: Script = async (ctx) => {
  await ctx.say(grunt('站住！此路是我開，此樹是我栽——'), grunt('要從此路過，留下買路財！'));
  const choice = await ctx.ask('兩個嘍囉抽出了刀。', ['動手', '退後']);
  if (choice === 1) {
    await ctx.say(grunt('哼，算你識相！'));
    await ctx.walk('player', ['down']);
    return;
  }
  const result = await ctx.battle('scouts');
  if (result === 'win') {
    ctx.setFlag('bandit_scouts');
    ctx.refresh();
    await ctx.say('嘍囉們抱頭鼠竄，往山上逃去了。');
  } else {
    await ctx.walk('player', ['down']);
  }
};

export const bossFight: Script = async (ctx) => {
  await ctx.say(
    qi('哪來的毛頭小子，敢闖我斷崖寨？'),
    ...(ctx.flag('bandit_scouts') ? [qi('山道上那兩個廢物，就是被你打跑的吧？')] : []),
    qi('也好！老子這三把刀，正愁沒處見血！'),
  );
  await ctx.battle('camp');
  ctx.setFlag('bandit_boss');
  await ctx.say(qi('好……好小子……'), qi('這筆帳，斷崖寨記下了！'));
  await ctx.say('祁三刀摀著傷口，帶著手下從寨後的小路逃進了深山。');
  ctx.refresh();

  // 青衫客現身
  await ctx.wait(400);
  await ctx.walk('shen', ['up']);
  ctx.faceEachOther('shen');
  await ctx.say(
    shen('……身手不錯。'),
    shen('三年前，祁三刀在臨江城外劫了我家的鏢，押鏢的十一個兄弟，一個也沒活下來。'),
    shen('我在山下等了他三年，沒想到讓你搶了先。'),
    '他望向祁三刀逃走的方向，沉默了片刻。',
    shen('也罷。他既然逃了，總有再碰頭的一天。'),
    shen('在下沈孤舟。後會有期。'),
  );
  await ctx.walk('shen', ['down', 'down', 'down']);
  ctx.setFlag('stranger');
  ctx.refresh();
  await ctx.say('（回青竹村向村長柳承安覆命吧）');
};

export const campChest: Script = async (ctx) => {
  if (ctx.flag('chest_camp')) {
    await ctx.say('箱子裡已經空了。');
    return;
  }
  ctx.setFlag('chest_camp');
  ctx.refresh();
  await ctx.say('你打開了山賊的木箱。');
  await ctx.hero((c) => {
    c.silver += 30;
    return ['獲得銀兩 30。', giveItem(c, 'jinchuang', 2)];
  });
};
