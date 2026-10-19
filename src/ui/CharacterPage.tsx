import { Fragment } from 'react';
import { ATTRS, attrParts, Character, derive, equipGear, GEAR_SLOTS, gearStats, ITEMS, slotsFor, unequipGear } from '../game/character';
import { GearSlotId, GRADE_CLASS, GRADES } from '../game/gear';
import { DISH_TIERS, DISHES, dishItem, knowsDish, needsText, STEW, TIER_LEVEL } from '../game/cooking';
import { CRAFTS, craftExpToNext, CRAFT_MAX, craftOf, craftTitle, WORK_MAX, workExpToNext, workOf } from '../game/crafts';
import { rankName, sectDef } from '../game/sect';
import { fameTitle } from '../game/social';
import { useGame } from '../state/store';
import { BrowseItem, Browser } from './Browser';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** 選單「人物」：概況、五維、裝備、技能、坐騎 */
export function CharacterPage({ active, onExit }: { active: boolean; onExit: () => void }) {
  const hero = useGame((s) => s.hero);
  const sect = useGame((s) => s.world.sect);
  const d = derive(hero);
  const parts = attrParts(hero);
  const gs = gearStats(hero);

  const items: BrowseItem[] = [
    {
      key: 'summary',
      label: '概況',
      tag: fameTitle(hero.fame),
      detail: () => (
        <>
          <h3>
            {hero.name}　<small>{fameTitle(hero.fame)}</small>
          </h3>
          <dl className="kv">
            <dt>氣血</dt>
            <dd>
              {hero.hp}/{d.maxHp}
            </dd>
            <dt>內力</dt>
            <dd>
              {hero.qi}/{d.maxQi}
            </dd>
            <dt>體力</dt>
            <dd>
              {hero.stamina}/{d.maxStamina}
            </dd>
            <dt>名聲</dt>
            <dd>{hero.fame}</dd>
            <dt>銀兩</dt>
            <dd>{hero.silver}</dd>
            <dt>武學點數</dt>
            <dd>{hero.points}</dd>
            <dt>師門</dt>
            <dd>{sect ? `${sectDef(sect.id)?.name}・${rankName(sect)}` : '無門無派'}</dd>
          </dl>
          <p className="muted small">本作沒有人物等級。五維 ＝ 天生底值 ＋ 武功帶來的永久成長 ＋ 裝備中武功的加成。</p>
        </>
      ),
    },
    {
      key: 'attrs',
      label: '五維',
      children: () =>
        ATTRS.map((a) => ({
          key: a.key,
          label: a.name,
          tag: String(Math.floor(parts.total[a.key])),
          detail: () => (
            <>
              <h3>
                {a.name}　<small>{Math.floor(parts.total[a.key])}</small>
              </h3>
              <p className="small">{a.desc}</p>
              <dl className="kv">
                <dt>天生底值</dt>
                <dd>{parts.base[a.key]}</dd>
                <dt>永久成長</dt>
                <dd>+{fmt(parts.grow[a.key])}（學過的武功、悟出的招式）</dd>
                <dt>裝備加成</dt>
                <dd>+{fmt(parts.equip[a.key])}（裝備中的武功）</dd>
              </dl>
            </>
          ),
        })),
      detail: () => (
        <table className="attrs attr-table">
          <thead>
            <tr className="muted small">
              <th />
              <td>總計</td>
              <td>底值</td>
              <td>成長</td>
              <td>裝備</td>
            </tr>
          </thead>
          <tbody>
            {ATTRS.map((a) => (
              <tr key={a.key}>
                <th>{a.name}</th>
                <td className="realm">{Math.floor(parts.total[a.key])}</td>
                <td>{parts.base[a.key]}</td>
                <td className="muted">+{fmt(parts.grow[a.key])}</td>
                <td className={parts.equip[a.key] ? 'good' : 'muted'}>+{fmt(parts.equip[a.key])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ),
    },
    {
      key: 'gear',
      label: '裝備',
      tag: `防禦 +${gs.def}`,
      children: () => GEAR_SLOTS.map((g) => gearSlot(hero, g.id, g.name)),
      detail: () => (
        <>
          <h3>裝備</h3>
          <dl className="kv">
            {GEAR_SLOTS.map((g) => {
              const id = hero.gear?.[g.id];
              return (
                <Fragment key={g.id}>
                  <dt>{g.name}</dt>
                  <dd className={id ? GRADE_CLASS[ITEMS[id].gear!.grade] : 'muted'}>{id ? ITEMS[id].name : g.id === 'weapon' ? '（之後開放）' : '（空）'}</dd>
                </Fragment>
              );
            })}
          </dl>
          <p className="small">
            服飾合計：防禦 +{gs.def}　閃避 +{Math.round(gs.eva * 1000) / 10}%
          </p>
          <p className="small muted">進去選一個欄位，再挑行囊裡的服飾穿上，或把身上的卸下。</p>
        </>
      ),
    },
    {
      key: 'crafts',
      label: '技能',
      children: () =>
        CRAFTS.map((c) => {
          const p = craftOf(hero, c.id);
          return {
            key: c.id,
            label: c.name,
            muted: !c.open,
            tag: c.open ? `${p.level} 級・${craftTitle(p.level)}` : '未開放',
            children: c.id === 'cooking' ? () => dishList(hero) : undefined,
            detail: () => (
              <>
                <h3>
                  {c.name}　<small>{c.group}</small>
                </h3>
                <p className="small">{c.desc}</p>
                <div className="skill-head">
                  <span className="tag">{craftTitle(p.level)}</span>
                  <span className="muted small">
                    第 {p.level} 級{p.level < CRAFT_MAX ? `　經驗 ${p.exp}/${craftExpToNext(p.level)}` : '（已臻化境）'}
                  </span>
                </div>
                <div className="exp-track">
                  <div className="exp-fill" style={{ width: `${p.level >= CRAFT_MAX ? 100 : (p.exp / craftExpToNext(p.level)) * 100}%` }} />
                </div>
                <p className="small muted">{c.howTo}</p>
              </>
            ),
          };
        }),
    },
    {
      key: 'mount',
      label: '坐騎',
      tag: '無',
      detail: () => (
        <>
          <h3>坐騎</h3>
          <p className="small muted">還沒有坐騎。之後可以買馬：平常走路變快，也能騎著走天下大地圖。</p>
        </>
      ),
    },
  ];
  return <Browser title={hero.name} items={items} active={active} onExit={onExit} />;
}

/** 技能 › 烹飪：學會的菜與熟練度，沒學的菜列出幾級能學 */
function dishList(hero: Character): BrowseItem[] {
  const name = (id: string) => ITEMS[id].name;
  return [STEW, ...DISHES].map((d) => {
    const known = knowsDish(hero, d.id);
    const w = workOf(hero, 'cooking', d.id);
    return {
      key: d.id,
      label: d.name,
      muted: !known,
      tag: !known ? (craftOf(hero, 'cooking').level >= TIER_LEVEL[d.tier] ? '可以學' : `烹飪 ${TIER_LEVEL[d.tier]} 級起`) : w ? `熟練 ${w.level}` : '家常',
      detail: () => (
        <>
          <h3>
            {d.name}　<small>
              {d.kind}・{DISH_TIERS[d.tier]}
            </small>
          </h3>
          <p className="small">{ITEMS[dishItem(d.id)].desc}</p>
          <dl className="kv">
            <dt>食材</dt>
            <dd>{needsText(d, name)}</dd>
            {d.spring && (
              <>
                <dt>灶台</dt>
                <dd>要用鳴泉的泉水，只能在鳴泉廚房做</dd>
              </>
            )}
            <dt>熟練度</dt>
            <dd>
              {!known
                ? '還沒學會（找鳴泉廚房的卜大勺學）'
                : w
                  ? `${w.level}/${WORK_MAX}${w.level < WORK_MAX ? `　${w.exp}/${workExpToNext(w.level)}` : '（爐火純青）'}`
                  : '不用學，誰都會燉'}
            </dd>
          </dl>
          <p className="small muted">做出來的品質有普通、上品、精品；烹飪等級與熟練度越高，越不會失手、越容易做出好菜。</p>
        </>
      ),
    };
  });
}

/** 裝備 › 某一欄：身上穿的（可以卸下）與行囊裡能穿在這一欄的服飾 */
function gearSlot(hero: Character, slot: GearSlotId, name: string): BrowseItem {
  const now = hero.gear?.[slot];
  const run = (f: (c: Character) => string) => () => {
    const st = useGame.getState();
    st.showToast(st.updateHero(f));
  };
  const info = (id: string) => (
    <>
      <h3 className={GRADE_CLASS[ITEMS[id].gear!.grade]}>
        {ITEMS[id].name}　<small>{GRADES[ITEMS[id].gear!.grade]}</small>
      </h3>
      <p className="small">{ITEMS[id].desc}</p>
    </>
  );
  if (slot === 'weapon') {
    return { key: slot, label: name, tag: '之後開放', muted: true, detail: () => <p className="small muted">兵器之後再設計。</p> };
  }
  const options = Object.keys(hero.items).filter((id) => hero.items[id] > 0 && slotsFor(id).includes(slot));
  const children: BrowseItem[] = [
    ...(now
      ? [{ key: 'off', label: `卸下「${ITEMS[now].name}」`, action: run((c) => unequipGear(c, slot)), actionLabel: '卸下', detail: () => info(now) }]
      : []),
    ...options.map((id) => ({
      key: id,
      label: ITEMS[id].name,
      tag: <span className={GRADE_CLASS[ITEMS[id].gear!.grade]}>{GRADES[ITEMS[id].gear!.grade]}</span>,
      action: run((c) => equipGear(c, id, slot)),
      actionLabel: '穿上',
      detail: () => info(id),
    })),
  ];
  return {
    key: slot,
    label: name,
    tag: now ? <span className={GRADE_CLASS[ITEMS[now].gear!.grade]}>{ITEMS[now].name}</span> : '（空）',
    muted: !now,
    children: () => (children.length ? children : [{ key: 'none', label: '行囊裡沒有能穿在這裡的東西', muted: true }]),
    detail: () => (now ? info(now) : <p className="small muted">{name}沒有穿戴東西。{options.length ? `行囊裡有 ${options.length} 件可以穿。` : ''}</p>),
  };
}
