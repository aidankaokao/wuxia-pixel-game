import { ITEMS, skillDef } from '../game/character';

/**
 * 物品效果的小章：回氣血、內力、體力，甜品的武功經驗加成，服飾兵器的攻防閃，秘笈能突破哪門武功。
 * 行囊的右頁與攤開的紙共用；用圖像化的色塊取代一長串說明文字。
 */
export function ItemEffects({ id }: { id: string }) {
  const it = ITEMS[id];
  if (!it) return null;
  const g = it.gear;
  const pills: [string, string][] = [
    ...(it.hp ? [[`氣血 +${it.hp}`, 'hp'] as [string, string]] : []),
    ...(it.qi ? [[`內力 +${it.qi}`, 'qi'] as [string, string]] : []),
    ...(it.stamina ? [[`體力 +${it.stamina}`, 'st'] as [string, string]] : []),
    ...(it.treat ? [[`${it.treat.battles} 場武功經驗 ×${it.treat.mult}`, 'treat'] as [string, string]] : []),
    ...(g?.atk ? [[`攻 +${g.atk}`, 'atk'] as [string, string]] : []),
    ...(g?.def ? [[`防 +${g.def}`, 'def'] as [string, string]] : []),
    ...(g?.eva ? [[`閃 +${Math.round(g.eva * 1000) / 10}%`, 'eva'] as [string, string]] : []),
    ...(it.manual ? [[`突破「${skillDef({ id: it.manual })?.name ?? '武功'}」`, 'manual'] as [string, string]] : []),
  ];
  if (!pills.length) return null;
  return (
    <div className="effects">
      {pills.map(([t, k]) => (
        <span key={t} className={`effect ${k}`}>
          {t}
        </span>
      ))}
    </div>
  );
}
