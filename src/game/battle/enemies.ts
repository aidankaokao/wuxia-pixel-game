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
}

export const ENEMIES: Record<string, EnemyDef> = {
  grunt: { name: '斷崖寨嘍囉', sprite: 'bandit', hp: 55, atk: 15, def: 3, spd: 9, eva: 0.05, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  dog: { name: '野狗', sprite: 'dog', hp: 48, atk: 13, def: 2, spd: 13, eva: 0.1, moves: ['e_bite', 'e_pounce'], ai: 'grunt', drops: [{ item: 'dog_pelt', chance: 0.6 }] },
  boar: { name: '山豬', sprite: 'boar', hp: 115, atk: 17, def: 6, spd: 7, eva: 0.02, moves: ['e_gore', 'e_ram'], ai: 'grunt',
    drops: [{ item: 'boar_meat', chance: 1 }, { item: 'boar_tusk', chance: 0.3 }] },
  // 切磋的對手
  qinghe: { name: '柳青禾', sprite: 'girl', hp: 80, atk: 13, def: 2, spd: 15, eva: 0.12, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
  shiyue: { name: '石岳', sprite: 'smith', hp: 210, atk: 19, def: 7, spd: 8, eva: 0.02, moves: ['e_slash', 'e_rush'], ai: 'grunt' },
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
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  dog: { enemies: ['dog'], background: 'mountain', intro: '一隻野狗齜牙咧嘴地撲了上來！', canFlee: true, silver: 0, growth: 0.35, points: 1 },
  dogs: { enemies: ['dog', 'dog'], background: 'mountain', intro: '兩隻野狗一左一右圍了上來！', canFlee: true, silver: 0, growth: 0.35, points: 2 },
  boar: { enemies: ['boar'], background: 'mountain', intro: '山豬刨著前蹄，低頭朝你衝來！', canFlee: true, silver: 0, growth: 0.5, points: 2 },
  scouts: { enemies: ['grunt', 'grunt'], background: 'mountain', intro: '斷崖寨的嘍囉攔住了去路！', canFlee: true, silver: 8, points: 3 },
  spar_qinghe: { enemies: ['qinghe'], background: 'mountain', intro: '柳青禾抱拳一禮：「請賜教！」', canFlee: true, silver: 0, growth: 0.6, points: 1, spar: true },
  spar_shiyue: { enemies: ['shiyue'], background: 'mountain', intro: '石岳捲起袖子：「來，讓我看看你的斤兩。」', canFlee: true, silver: 0, growth: 0.8, points: 2, spar: true },
  camp: { enemies: ['boss', 'grunt', 'grunt'], background: 'camp', intro: '祁三刀提著大刀，帶著手下圍了上來！', canFlee: false, silver: 25, points: 10, boss: true },
};

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
      maxQi: 0,
      qi: 0,
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
