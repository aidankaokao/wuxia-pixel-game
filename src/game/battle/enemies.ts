import type { Unit } from './types';

/** 敵人樣板 */
interface EnemyDef {
  name: string;
  sprite: string;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  eva: number;
  moves: string[];
  ai: Unit['ai'];
  /** 打倒後可能掉落的物品：物品 id 與機率 */
  drops?: { item: string; chance: number }[];
  /** 內力（會用武功招式的對手才需要） */
  qi?: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  grunt: { name: '斷崖寨嘍囉', sprite: 'bandit', hp: 55, atk: 15, def: 3, spd: 9, eva: 0.05, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  dog: { name: '野狗', sprite: 'dog', hp: 48, atk: 13, def: 2, spd: 13, eva: 0.1, moves: ['e_bite', 'e_pounce'], ai: 'grunt', drops: [{ item: 'dog_pelt', chance: 0.6 }] },
  boar: { name: '山豬', sprite: 'boar', hp: 115, atk: 17, def: 6, spd: 7, eva: 0.02, moves: ['e_gore', 'e_ram'], ai: 'grunt',
    drops: [{ item: 'boar_meat', chance: 1 }, { item: 'boar_tusk', chance: 0.3 }] },
  // 切磋的對手
  qinghe: { name: '柳青禾', sprite: 'girl', hp: 80, atk: 13, def: 2, spd: 15, eva: 0.12, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  shiyue: { name: '石岳', sprite: 'smith', hp: 210, atk: 19, def: 7, spd: 8, eva: 0.02, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  xiaoman: { name: '顧小滿', sprite: 'disciple_girl', hp: 180, atk: 28, def: 4, spd: 16, eva: 0.1, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  lumingchuan: { name: '陸鳴川', sprite: 'sect_senior', hp: 650, atk: 50, def: 10, spd: 20, eva: 0.08, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  qizhenyuan: { name: '齊振遠', sprite: 'disciple', hp: 320, atk: 38, def: 7, spd: 17, eva: 0.08, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  mengduo: { name: '孟鐸', sprite: 'disciple', hp: 380, atk: 42, def: 9, spd: 13, eva: 0.04, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  hanjingqiu: { name: '韓靖秋', sprite: 'sect_elder', hp: 1150, atk: 74, def: 15, spd: 23, eva: 0.12, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  masked: { name: '蒙面人', sprite: 'masked', hp: 950, atk: 82, def: 17, spd: 16, eva: 0.05, moves: ['e_slash', 'e_heavy'], ai: 'boss' },
  boar_big: { name: '護藥山豬', sprite: 'boar', hp: 950, atk: 80, def: 15, spd: 10, eva: 0.02, moves: ['e_gore', 'e_ram'], ai: 'grunt' },
  // 臨江城的差事：護鏢路上的劫匪、縣衙懸賞的目標（見 story/linjiang_jianghu.ts）
  robber: { name: '攔路劫匪', sprite: 'bandit', hp: 90, atk: 20, def: 4, spd: 11, eva: 0.06, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  robber_lead: { name: '劫匪頭目', sprite: 'bandit', hp: 220, atk: 28, def: 7, spd: 12, eva: 0.06, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  water_bandit: { name: '江匪', sprite: 'boatman', hp: 130, atk: 25, def: 5, spd: 13, eva: 0.08, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  fierce_dog: { name: '惡犬', sprite: 'dog', hp: 160, atk: 26, def: 4, spd: 15, eva: 0.1, moves: ['e_bite', 'e_pounce'], ai: 'grunt', drops: [{ item: 'dog_pelt', chance: 1 }] },
  boss: { name: '祁三刀', sprite: 'boss', hp: 240, atk: 22, def: 6, spd: 12, eva: 0.06, moves: ['e_slash', 'e_heavy'], ai: 'boss' },
};

/** 遭遇戰：哪些敵人、什麼背景、能不能逃、打贏給多少銀兩與武學點數 */
export interface EncounterDef {
  enemies: string[];
  background: 'mountain' | 'camp';
  intro: string;
  canFlee: boolean;
  silver: number;
  /** 戰後武功熟練的倍率（野獸練功用，較低）；預設 1 */
  growth?: number;
  /** 打贏獲得的武學點數 */
  points: number;
  /** 頭目戰：打贏時有機會「靈光一閃」直接悟出下一招 */
  boss?: boolean;
  /** 切磋：點到為止，輸了不會被送回村裡 */
  spar?: boolean;
  /** 不許用藥（例如門派考核） */
  noItems?: boolean;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  dog: { enemies: ['dog'], background: 'mountain', intro: '一隻野狗齜牙咧嘴地撲了上來！', canFlee: true, silver: 0, growth: 0.35, points: 1 },
  dogs: { enemies: ['dog', 'dog'], background: 'mountain', intro: '兩隻野狗一左一右圍了上來！', canFlee: true, silver: 0, growth: 0.35, points: 2 },
  boar: { enemies: ['boar'], background: 'mountain', intro: '山豬刨著前蹄，低頭朝你衝來！', canFlee: true, silver: 0, growth: 0.5, points: 2 },
  scouts: { enemies: ['grunt', 'grunt'], background: 'mountain', intro: '斷崖寨的嘍囉攔住了去路！', canFlee: true, silver: 8, points: 3 },
  spar_qinghe: { enemies: ['qinghe'], background: 'mountain', intro: '柳青禾抱拳一禮：「請賜教！」', canFlee: true, silver: 0, growth: 0.6, points: 1, spar: true },
  spar_shiyue: { enemies: ['shiyue'], background: 'mountain', intro: '石岳捲起袖子：「來，讓我看看你的斤兩。」', canFlee: true, silver: 0, growth: 0.8, points: 2, spar: true },
  trial_xiaoman: { enemies: ['xiaoman'], background: 'mountain', intro: '顧小滿抽出木劍，抱拳道：「鳴泉記名弟子顧小滿，請賜教！」', canFlee: true, silver: 0, growth: 0.6, points: 2, spar: true },
  spar_xiaoman: { enemies: ['xiaoman'], background: 'mountain', intro: '顧小滿揚起木劍：「這次我可不會手下留情！」', canFlee: true, silver: 0, growth: 0.6, points: 1, spar: true },
  spar_lu: { enemies: ['lumingchuan'], background: 'mountain', intro: '陸鳴川長劍斜指地面：「師弟，出招吧。」', canFlee: true, silver: 0, growth: 0.8, points: 2, spar: true },
  mq_path_dogs: { enemies: ['dog', 'dog', 'dog'], background: 'mountain', intro: '三隻野狗堵在山道上，齜牙低吼！', canFlee: true, silver: 0, growth: 0.5, points: 3 },
  exam_qi: { enemies: ['qizhenyuan'], background: 'mountain', intro: '齊振遠抱劍一禮：「考核不講情面，也不許用藥。師弟小心了。」', canFlee: false, silver: 0, growth: 0.8, points: 3, spar: true, noItems: true },
  exam_meng: { enemies: ['mengduo'], background: 'mountain', intro: '孟鐸活動了一下手腕：「連戰兩場，就看你撐不撐得住。」', canFlee: false, silver: 0, growth: 0.8, points: 3, spar: true, noItems: true },
  // 真傳拜師試煉
  trial_han: { enemies: ['hanjingqiu'], background: 'mountain', intro: '韓靖秋在試劍石前拔劍：「拿出你全部的本事。」', canFlee: false, silver: 0, growth: 1, points: 5, spar: true, noItems: true },
  trial_night1: { enemies: ['dog', 'dog', 'dog'], background: 'mountain', intro: '第一夜。黑暗中亮起幾雙綠眼睛——野狗群摸上了崖！', canFlee: false, silver: 0, growth: 0.5, points: 2, spar: true, noItems: true },
  trial_night2: { enemies: ['boar', 'boar'], background: 'mountain', intro: '第二夜。兩頭山豬嗅著氣味，低頭朝你衝來！', canFlee: false, silver: 0, growth: 0.5, points: 2, spar: true, noItems: true },
  trial_night3: { enemies: ['masked'], background: 'mountain', intro: '第三夜。一個蒙面人從崖頂躍下，一言不發，揮掌便打！', canFlee: false, silver: 0, growth: 1, points: 5, spar: true, noItems: true },
  trial_boar: { enemies: ['boar_big'], background: 'mountain', intro: '一頭比尋常大上一倍的山豬護在藥草前，鼻孔噴著白氣！', canFlee: true, silver: 0, growth: 0.8, points: 3, spar: true },
  escort_near: { enemies: ['robber', 'robber'], background: 'mountain', intro: '路邊的草叢裡跳出兩個蒙面漢子：「把貨留下！」', canFlee: true, silver: 0, points: 2 },
  escort_far: { enemies: ['robber_lead', 'robber', 'robber'], background: 'mountain', intro: '一夥劫匪攔住了鏢車，為首的扛著鬼頭刀：「金刀鏢局？今天栽在我手裡！」', canFlee: true, silver: 0, points: 4 },
  bounty_dogs: { enemies: ['fierce_dog', 'dog', 'dog'], background: 'mountain', intro: '一頭比牛犢還大的惡犬領著狗群，低吼著圍了上來！', canFlee: true, silver: 0, growth: 0.6, points: 3 },
  bounty_bandits: { enemies: ['robber', 'robber', 'robber'], background: 'mountain', intro: '三個毛賊從樹後鑽出來：「上山的？把錢袋交出來！」', canFlee: true, silver: 6, points: 3 },
  bounty_river: { enemies: ['water_bandit', 'water_bandit', 'water_bandit'], background: 'mountain', intro: '幾條黑影從船上躍上岸，手裡的魚叉閃著寒光！', canFlee: true, silver: 10, points: 5 },
  camp: { enemies: ['boss', 'grunt', 'grunt'], background: 'camp', intro: '祁三刀提著大刀，帶著手下圍了上來！', canFlee: false, silver: 25, points: 10, boss: true },
};

/**
 * 同門過招：照主角目前的戰鬥數值，產生一個差不多強的對手（強弱在 85%–110% 之間浮動），
 * 用的是本門武功的招式。寫進 ENEMIES / ENCOUNTERS 的 'drill'，回傳遭遇戰 id。
 */
export function setupDrill(
  hero: { maxHp: number; atk: number; def: number; spd: number; eva: number },
  who: { name: string; sprite: string },
  moves: string[],
  rand: () => number = Math.random,
): string {
  const r = 0.85 + rand() * 0.25;
  ENEMIES.drill = {
    name: who.name,
    sprite: who.sprite,
    hp: Math.round(hero.maxHp * r * DRILL.hp),
    atk: Math.round(hero.atk * r * DRILL.atk),
    def: Math.round(hero.def * r),
    spd: Math.round(hero.spd * (0.9 + rand() * 0.2)),
    eva: Math.min(0.2, hero.eva * r),
    moves,
    qi: 80,
    ai: 'grunt',
  };
  ENCOUNTERS.drill = {
    enemies: ['drill'],
    background: 'mountain',
    intro: `${who.name}抱拳一禮：「請賜教！」`,
    canFlee: true,
    silver: 0,
    growth: 0.9,
    points: 1,
    spar: true,
  };
  return 'drill';
}
/** 過招對手的攻擊力倍率（用模擬校準：勢均力敵，勝率大約六成） */
export const DRILL = { hp: 1.5, atk: 1.15 };

const SUFFIX = ['甲', '乙', '丙', '丁'];

export function enemyUnits(e: EncounterDef): Unit[] {
  const counts: Record<string, number> = {};
  e.enemies.forEach((k) => (counts[k] = (counts[k] ?? 0) + 1));
  const seen: Record<string, number> = {};
  return e.enemies.map((k, i) => {
    const d = ENEMIES[k];
    seen[k] = (seen[k] ?? 0) + 1;
    return {
      id: `e${i}`,
      name: counts[k] > 1 ? `${d.name}${SUFFIX[seen[k] - 1]}` : d.name,
      side: 'enemy',
      sprite: d.sprite,
      maxHp: d.hp,
      hp: d.hp,
      maxQi: d.qi ?? 0,
      qi: d.qi ?? 0,
      atk: d.atk,
      ipow: 0,
      def: d.def,
      spd: d.spd,
      eva: d.eva,
      moves: d.moves,
      guard: false,
      charging: false,
      effects: [],
      ai: d.ai,
    };
  });
}
