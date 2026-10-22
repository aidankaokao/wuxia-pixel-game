import { ReactNode, useEffect, useState } from 'react';
import { ArtId, ART_ACTION, PAINTINGS, qinQi } from '../game/arts';
import { ItemIcon, itemIconUrl } from '../game/art/items';
import { BOOKS, bookOf, READ_STAGES, Shelf } from '../game/books';
import { Character, ITEMS } from '../game/character';
import { DISH_TIERS, DISHES, DishDef, dishItem, knowsDish, STEW, TIER_LEVEL } from '../game/cooking';
import { CraftId, craftDef, CRAFTS, craftExpToNext, CRAFT_MAX, craftOf, craftTitle, WORK_MAX, workExpToNext, workOf } from '../game/crafts';
import { gearKindName } from '../game/gear';
import { stageOf, STAGES } from '../game/social';
import { PEOPLE } from '../game/story/people';
import { PATTERNS, wovenItem } from '../game/weaving';
import { FISH, FishSpot } from '../game/fishing';
import { useGame } from '../state/store';
import { IconCell, IconTile, PageHead, Paper, Sheet, Spread } from './Paper';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

/**
 * 選單「技能」：生活技能與雅藝，一門一個圖示，右下角是等級。
 * 右頁是游標那一門的概況與「收藏」（學會的菜、讀過的書……）；E 攤開一張紙，
 * 紙上是一格一格的圖示（菜、書、樣式、畫），游標停在哪一格，右邊就是它的介紹、熟練度、材料。
 */

export const CRAFT_ICON: Record<CraftId, ItemIcon> = {
  cooking: 'c_cook',
  weaving: 'c_weave',
  fishing: 'rod',
  learning: 'c_learn',
  qin: 'c_qin',
  chess: 'c_chess',
  calligraphy: 'c_brush',
  painting: 'painting',
};

const SPOT_NAME: Record<FishSpot, string> = { pier: '湖邊棧橋', reeds: '蘆葦蕩', isle: '湖心島' };
const LIKE_NAME: Record<string, string> = { dawn: '清晨', dusk: '黃昏', night: '夜裡', rain: '雨天', day: '白天', fog: '霧天', clear: '晴天', cloudy: '陰天' };

const SHELF_ICON: Record<Shelf, ItemIcon> = { 蒙學: 'book_meng', 經部: 'book_jing', 史部: 'book_shi', 子部: 'book_zi', 集部: 'book_ji' };
const GROUPS = ['生活', '學問', '雅藝'] as const;

const icon = (i: ItemIcon) => itemIconUrl(i);
const itemIcon = (id: string) => itemIconUrl(ITEMS[id].icon);

/** 依組別排好的技能（生活、學問、雅藝），每組一列 */
const ROWS = GROUPS.map((g) => CRAFTS.filter((c) => c.group === g));
const ORDER = ROWS.flat();

export function CraftsPage({ active, onExit, folio }: { active: boolean; onExit: () => void; folio: number }) {
  const hero = useGame((s) => s.hero);
  const relations = useGame((s) => s.world.relations);
  const [at, setAt] = useState(0);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!active) setOpen(false);
  }, [active]);

  const focus = ORDER[at];
  useKeys(active && !open, (k) => {
    if (isCancel(k)) return onExit();
    if (isConfirm(k)) return setOpen(true);
    if (isLeft(k)) return setAt((at + ORDER.length - 1) % ORDER.length);
    if (isRight(k)) return setAt((at + 1) % ORDER.length);
    if (isUp(k) || isDown(k)) {
      const r = ROWS.findIndex((row) => row.includes(focus));
      const c = ROWS[r].indexOf(focus);
      const row = ROWS[(r + (isUp(k) ? ROWS.length - 1 : 1)) % ROWS.length];
      setAt(ORDER.indexOf(row[Math.min(c, row.length - 1)]));
    }
  });

  const left = (
    <>
      <PageHead title="技能" sub="生活・學問・雅藝" />
      {ROWS.map((row, r) => (
        <div key={GROUPS[r]} className="craft-group">
          <h4 className="page-sec">{GROUPS[r]}</h4>
          <div className="craft-row">
            {row.map((c) => {
              const p = craftOf(hero, c.id);
              const i = ORDER.indexOf(c);
              const on = active && i === at;
              return (
                <div key={c.id} className={`craft-tile ${on ? 'active' : ''} ${c.open ? '' : 'locked'}`} onClick={() => (on ? setOpen(true) : setAt(i))}>
                  <IconTile icon={icon(CRAFT_ICON[c.id])} badge={c.open ? p.level || undefined : '鎖'} dim={!c.open} active={on} size="l" label={c.name} />
                  <span className="craft-name">{c.name}</span>
                  <ExpBar now={p.exp} max={p.level >= CRAFT_MAX ? 0 : craftExpToNext(p.level)} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <p className="page-help">{active ? '方向鍵選擇　E 攤開細看　X 回到書籤' : '按 E 或 ↓ 開始翻閱'}</p>
    </>
  );

  const p = craftOf(hero, focus.id);
  const right = (
    <>
      <PageHead title={focus.name} sub={focus.group} />
      <div className="craft-hero">
        <IconTile icon={icon(CRAFT_ICON[focus.id])} badge={focus.open ? p.level || undefined : undefined} dim={!focus.open} size="l" />
        <div className="craft-hero-text">
          <div>
            <span className="tag">{focus.open ? craftTitle(p.level) : '未開放'}</span>
            <span className="small muted">　第 {p.level} 級{p.level < CRAFT_MAX ? `　${p.exp}/${craftExpToNext(p.level)}` : '　已臻化境'}</span>
          </div>
          <ExpBar now={p.exp} max={p.level >= CRAFT_MAX ? 0 : craftExpToNext(p.level)} />
        </div>
      </div>
      <p className="small">{focus.desc}</p>
      <Collection hero={hero} id={focus.id} relations={relations} />
      <p className="small muted">{focus.howTo}</p>
    </>
  );

  return (
    <>
      <Spread folio={folio} left={left} right={right} />
      <Paper sheet={open ? craftSheet(hero, focus.id, relations) : null} onClose={() => setOpen(false)} />
    </>
  );
}

/** 細細的經驗條；max 為 0 表示滿級 */
function ExpBar({ now, max }: { now: number; max: number }) {
  return (
    <div className="exp-track thin">
      <div className="exp-fill" style={{ width: `${max ? Math.min(100, (now / max) * 100) : 100}%` }} />
    </div>
  );
}

/** 熟練度：五格小方塊 */
function Pips({ n, max = WORK_MAX }: { n: number; max?: number }) {
  return (
    <span className="pips">
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < n ? 'on' : ''} />
      ))}
    </span>
  );
}

/** 材料：一排小圖示，下面寫數量 */
function Needs({ needs }: { needs: Record<string, number> }) {
  const hero = useGame((s) => s.hero);
  return (
    <div className="needs">
      {Object.entries(needs).map(([id, n]) => (
        <div key={id} className="need">
          <IconTile icon={itemIcon(id)} size="s" label={ITEMS[id].name} dim={(hero.items[id] ?? 0) < n} />
          <span>
            {ITEMS[id].name}×{n}
          </span>
        </div>
      ))}
    </div>
  );
}

/** 一門手藝底下的細目（學會的、還沒學的） */
function cellsFor(hero: Character, id: CraftId): IconCell[] | null {
  if (id === 'cooking') {
    const kinds = ['飯品', '麵品', '湯品', '甜品', '湖鮮', '海鮮'];
    const group = (d: DishDef) => (d.sea ? '海鮮' : d.lake ? '湖鮮' : d.kind);
    return [STEW, ...DISHES]
      .sort((a, b) => kinds.indexOf(group(a)) - kinds.indexOf(group(b)))
      .map((d) => {
        const known = knowsDish(hero, d.id);
        const w = workOf(hero, 'cooking', d.id);
        return { key: d.id, icon: itemIcon(dishItem(d.id)), label: d.name, group: group(d), dim: !known, badge: w?.level, detail: () => <DishDetail hero={hero} d={d} /> };
      });
  }
  if (id === 'learning') {
    return BOOKS.map((b) => {
      const p = bookOf(hero, b.id);
      return {
        key: b.id,
        icon: icon(SHELF_ICON[b.shelf]),
        label: b.name,
        group: b.shelf,
        dim: !p,
        badge: p?.level,
        detail: () => (
          <>
            <h4>《{b.name}》</h4>
            <div className="detail-tags">
              <span className="tag muted-tag">{b.shelf}</span>
              <span className="small muted">學識 {b.level} 級起</span>
            </div>
            <p className="small">{b.desc}</p>
            <Progress label={p ? READ_STAGES[p.level] : '還沒讀過'} level={p?.level ?? 0} exp={p?.exp ?? 0} />
            <p className="small muted">在鳴泉書房的「經史子集」書架、臨江書院的書架讀。讀到精通時，學識會多長一截。</p>
          </>
        ),
      };
    });
  }
  if (id === 'weaving') {
    return PATTERNS.map((p) => {
      const w = workOf(hero, 'weaving', p.id);
      const lv = craftOf(hero, 'weaving').level;
      return {
        key: p.id,
        icon: itemIcon(wovenItem(p.id, 1)),
        label: p.name,
        group: gearKindName(p.kind),
        dim: !w,
        badge: w?.level,
        detail: () => (
          <>
            <h4>{p.name}</h4>
            <div className="detail-tags">
              <span className="tag muted-tag">{gearKindName(p.kind)}</span>
              <span className="small muted">紡織 {p.level} 級起</span>
            </div>
            <p className="small">{p.desc}</p>
            <div className="detail-label">材料</div>
            <Needs needs={p.needs} />
            {w ? (
              <Progress label="熟練度" level={w.level} exp={w.exp} />
            ) : (
              <p className="small muted">
                {lv >= p.level ? '可以學了' : `紡織 ${p.level} 級才學得會`}：跟錦繡布莊的魏錦娘學，{p.cost ? `學費 ${p.cost} 兩` : '不收錢'}。
              </p>
            )}
          </>
        ),
      };
    });
  }
  if (id === 'fishing') {
    // 魚譜：釣過的魚亮起來，右下角是熟練度（釣得越多越熟）
    return FISH.map((f) => {
      const w = workOf(hero, 'fishing', f.id);
      return {
        key: f.id,
        icon: itemIcon(f.id),
        label: f.name,
        group: '魚譜',
        dim: !w,
        badge: w?.level,
        detail: () => (
          <>
            <h4>{w ? f.name : '？？？'}</h4>
            <div className="detail-tags">
              <span className="tag muted-tag">{'好釣・普通・難纏・極難'.split('・')[f.fight]}</span>
              <span className="small muted">釣魚 {f.level} 級起</span>
            </div>
            <p className="small">{w ? f.desc : '還沒釣過這種魚。'}</p>
            <div className="detail-label">出沒</div>
            <div className="effects">
              {(Object.keys(f.spots) as FishSpot[]).map((s) => (
                <span key={s} className="effect">
                  {SPOT_NAME[s]}
                </span>
              ))}
              {f.likes?.map((l) => (
                <span key={l} className="effect treat">
                  {LIKE_NAME[l]}多
                </span>
              ))}
            </div>
            {w && <Progress label="熟練度" level={w.level} exp={w.exp} />}
            <p className="small muted">行情：一條約 {f.price} 兩。</p>
          </>
        ),
      };
    });
  }
  if (id === 'painting') {
    return PAINTINGS.map((pid) => ({
      key: pid,
      icon: itemIcon(pid),
      label: ITEMS[pid].name,
      group: '手邊的畫',
      dim: !hero.items[pid],
      badge: hero.items[pid] || undefined,
      detail: () => (
        <>
          <h4>{ITEMS[pid].name}</h4>
          <p className="small">{ITEMS[pid].desc}</p>
          <p className="small muted">手邊有 {hero.items[pid] ?? 0} 幅。可以賣，也可以送給懂畫的人。</p>
        </>
      ),
    }));
  }
  return null;
}

/** 熟練度（或熟讀）：五格方塊加經驗 */
function Progress({ label, level, exp }: { label: string; level: number; exp: number }) {
  return (
    <div className="progress-line">
      <span className="detail-label">{label}</span>
      <Pips n={level} />
      <span className="small muted">{level >= WORK_MAX ? '爐火純青' : level ? `${exp}/${workExpToNext(level)}` : ''}</span>
    </div>
  );
}

function DishDetail({ hero, d }: { hero: Character; d: DishDef }) {
  const known = knowsDish(hero, d.id);
  const w = workOf(hero, 'cooking', d.id);
  const effects = [d.hp && ['氣血', d.hp, 'hp'], d.qi && ['內力', d.qi, 'qi'], d.stamina && ['體力', d.stamina, 'st']].filter(Boolean) as [string, number, string][];
  return (
    <>
      <h4>{d.name}</h4>
      <div className="detail-tags">
        <span className="tag muted-tag">{d.sea ? '海鮮' : d.lake ? '湖鮮' : d.kind}</span>
        <span className="small muted">
          {DISH_TIERS[d.tier]}・烹飪 {TIER_LEVEL[d.tier]} 級起
        </span>
      </div>
      <p className="small">{d.desc}</p>
      <div className="effects">
        {effects.map(([n, v, k]) => (
          <span key={n} className={`effect ${k}`}>
            {n} +{v}
          </span>
        ))}
        {d.treat && <span className="effect treat">之後 {d.treat.battles} 場武功經驗 ×{d.treat.mult}</span>}
      </div>
      <div className="detail-label">食材</div>
      <Needs needs={d.needs} />
      {d.spring && <p className="small muted">要用鳴泉的泉水，只能在鳴泉廚房做。</p>}
      {known ? (
        w ? (
          <Progress label="熟練度" level={w.level} exp={w.exp} />
        ) : (
          <p className="small muted">家常菜，不用學，誰都會燉。</p>
        )
      ) : (
        <p className="small muted">還沒學會：{d.sea ? '大埠頭望潮客棧的潘大娘教海鮮菜' : d.lake ? '碧漪湖漁村湖鮮館的喬嫂教湖鮮菜' : '找鳴泉廚房的卜大勺學'}。</p>
      )}
    </>
  );
}

/** 有同好的人：雅藝可以跟他們論琴、對弈、品字、賞畫 */
function Peers({ art, relations }: { art: ArtId; relations: Record<string, { aff: number }> }) {
  const peers = Object.values(PEOPLE).filter((p) => p.hobby?.art === art);
  if (!peers.length) return null;
  return (
    <>
      <div className="detail-label">同好（{ART_ACTION[art]}）</div>
      <div className="peer-chips">
        {peers.map((p) => {
          const r = relations[p.id];
          const ok = r && stageOf(r.aff) >= p.hobby!.stage;
          return (
            <span key={p.id} className={`peer ${ok ? 'ok' : r ? '' : 'unknown'}`}>
              {r ? p.name : '？？'}
              <small>{r ? (ok ? `可以${ART_ACTION[art]}` : `${STAGES[p.hobby!.stage].name}起`) : '還沒結識'}</small>
            </span>
          );
        })}
      </div>
    </>
  );
}

/** 右頁的收藏：學會幾道菜、讀過幾本書……用小圖示排一排 */
function Collection({ hero, id, relations }: { hero: Character; id: CraftId; relations: Record<string, { aff: number }> }) {
  const cells = cellsFor(hero, id);
  let extra: ReactNode = null;
  if (id === 'qin') extra = <div className="effects"><span className="effect qi">撫一曲回內力 {qinQi(craftOf(hero, 'qin').level)}</span></div>;
  if (id === 'qin' || id === 'chess' || id === 'calligraphy' || id === 'painting') extra = (
    <>
      {extra}
      <Peers art={id} relations={relations} />
    </>
  );
  if (!cells) return extra;
  const have = cells.filter((c) => !c.dim);
  const noun = id === 'cooking' ? '學會的菜' : id === 'learning' ? '讀過的書' : id === 'weaving' ? '會織的樣式' : id === 'fishing' ? '魚譜' : '手邊的畫';
  return (
    <>
      <div className="detail-label">
        {noun}　{have.length}/{cells.length}
      </div>
      <div className="mini-strip">
        {cells.map((c) => (
          <IconTile key={c.key} icon={c.icon} dim={c.dim} badge={c.badge} size="s" label={c.label} />
        ))}
      </div>
      {extra}
    </>
  );
}

/** 攤開的紙：上面是概況，下面是細目的圖示格子（沒有細目的雅藝只有概況與同好） */
function craftSheet(hero: Character, id: CraftId, relations: Record<string, { aff: number }>): Sheet {
  const c = craftDef(id);
  const p = craftOf(hero, id);
  const top = (
    <div className="craft-hero">
      <IconTile icon={icon(CRAFT_ICON[id])} badge={c.open ? p.level || undefined : undefined} dim={!c.open} size="l" />
      <div className="craft-hero-text">
        <div>
          <span className="tag">{c.open ? craftTitle(p.level) : '未開放'}</span>
          <span className="small muted">　第 {p.level} 級{p.level < CRAFT_MAX ? `　經驗 ${p.exp}/${craftExpToNext(p.level)}` : '　已臻化境'}</span>
        </div>
        <ExpBar now={p.exp} max={p.level >= CRAFT_MAX ? 0 : craftExpToNext(p.level)} />
        <p className="small muted">{c.howTo}</p>
      </div>
    </div>
  );
  const cells = cellsFor(hero, id);
  const sub = `${c.group}・${p.level} 級`;
  if (cells) return { title: c.name, sub, body: id === 'painting' ? <>{top}<Peers art="painting" relations={relations} /></> : top, grid: cells };
  return {
    title: c.name,
    sub,
    body: (
      <>
        {top}
        <p className="small">{c.desc}</p>
        <Collection hero={hero} id={id} relations={relations} />
      </>
    ),
  };
}
