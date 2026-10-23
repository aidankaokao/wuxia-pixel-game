import { useEffect, useState } from 'react';
import { ATTRS, attrParts, Character, derive, equipGear, GEAR_SLOTS, gearStats, heldWeapon, isEquipped, ITEMS, skillDef, slotsFor, unequipGear } from '../game/character';
import { GEAR_ICON, weaponFit, weaponWanted } from '../game/gear';
import { GearSlotId, GRADE_CLASS, GRADES } from '../game/gear';
import { CHARACTERS, drawCharacterSheet } from '../game/art/characters';
import { itemIconUrl } from '../game/art/items';
import { CHAR_H, CHAR_W } from '../game/constants';
import { mountDef } from '../game/mounts';
import { rankName, sectDef } from '../game/sect';
import { fameTitle } from '../game/social';
import { useGame } from '../state/store';
import { IconTile, Paper, Sheet, Spread } from './Paper';
import { ItemEffects } from './ItemEffects';
import { isCancel, isConfirm, isDown, isLeft, isRight, isUp, useKeys } from './useKeys';

const fmt = (n: number) => (Math.round(n * 10) / 10).toString();

/** 主角的正面像（取精靈表第一列站立那格，放大用 CSS） */
let portrait: string | null = null;
function heroPortrait(): string {
  if (!portrait) {
    const sheet = drawCharacterSheet(CHARACTERS.hero);
    const c = document.createElement('canvas');
    c.width = CHAR_W;
    c.height = CHAR_H;
    c.getContext('2d')!.drawImage(sheet, CHAR_W, 0, CHAR_W, CHAR_H, 0, 0, CHAR_W, CHAR_H);
    portrait = c.toDataURL();
  }
  return portrait;
}

/** 一條數值：名稱、數字與長條 */
function Vital({ name, now, max, kind }: { name: string; now: number; max: number; kind: string }) {
  return (
    <div className="vital">
      <span className="vital-name">{name}</span>
      <div className={`vital-bar ${kind}`}>
        <div style={{ width: `${max ? Math.min(100, (now / max) * 100) : 0}%` }} />
      </div>
      <span className="vital-num">
        {now}/{max}
      </span>
    </div>
  );
}

/**
 * 人形四周的裝備框：左邊由上而下帽子、上衣、左手、褲子，右邊頸飾、兵器、右手、鞋子，腳下是坐騎。
 * 索引 0–3 左欄、4–7 右欄、8 坐騎。
 */
const DOLL: GearSlotId[] = ['hat', 'top', 'leftHand', 'bottom', 'neck', 'weapon', 'rightHand', 'shoes'];
const MOUNT = 8;

/** 裝備框之間的移動；回傳 'attrs' 表示往左回到左頁的五維 */
function moveDoll(i: number, k: string): number | 'attrs' {
  if (i === MOUNT) return isUp(k) ? 3 : isLeft(k) ? 3 : isRight(k) ? 7 : i;
  const right = i >= 4;
  const row = i % 4;
  if (isUp(k)) return (right ? 4 : 0) + ((row + 3) % 4);
  if (isDown(k)) return row === 3 ? MOUNT : i + 1;
  if (isRight(k)) return right ? i : i + 4;
  if (isLeft(k)) return right ? i - 4 : 'attrs';
  return i;
}

type Spot = { col: 0 | 1; i: number };

/**
 * 選單「人物」：左頁是名帖（畫像、氣血內力體力、五維），右頁是人形與四周的裝備框。
 * 有穿戴的框裡畫著那件東西，沒有的是空框（淡淡的部位圖示）。E 把那一格攤開成紙：穿上、卸下、上馬、下馬。
 */
export function CharacterPage({ active, onExit, folio }: { active: boolean; onExit: () => void; folio?: number }) {
  const hero = useGame((s) => s.hero);
  const sect = useGame((s) => s.world.sect);
  const [spot, setSpot] = useState<Spot>({ col: 0, i: 0 });
  const [open, setOpen] = useState<Spot | null>(null);
  useEffect(() => {
    if (!active) (setOpen(null), setSpot({ col: 0, i: 0 }));
  }, [active]);

  const d = derive(hero);
  const parts = attrParts(hero);
  const gs = gearStats(hero);
  const m = mountDef(hero.mount);

  useKeys(active && !open, (k) => {
    if (isCancel(k)) return onExit();
    if (isConfirm(k)) return setOpen(spot);
    if (spot.col === 0) {
      const n = ATTRS.length;
      if (isUp(k)) setSpot({ col: 0, i: (spot.i + n - 1) % n });
      else if (isDown(k)) setSpot({ col: 0, i: (spot.i + 1) % n });
      else if (isRight(k)) setSpot({ col: 1, i: Math.min(spot.i, 3) });
      else if (isLeft(k)) onExit();
      return;
    }
    const next = moveDoll(spot.i, k);
    setSpot(next === 'attrs' ? { col: 0, i: Math.min(spot.i, ATTRS.length - 1) } : { col: 1, i: next });
  });

  const on = (col: 0 | 1, i: number) => active && spot.col === col && spot.i === i;
  const pick = (col: 0 | 1, i: number) => () => (on(col, i) ? setOpen({ col, i }) : setSpot({ col, i }));

  const left = (
    <>
      <div className="namecard">
        <img className="portrait" src={heroPortrait()} alt="" />
        <div>
          <div className="namecard-name">{hero.name}</div>
          <div className="namecard-title">{fameTitle(hero.fame)}</div>
          {hero.titles?.map((t) => (
            <span key={t} className="namecard-badge">{t}</span>
          ))}
          <div className="small muted">{sect ? `${sectDef(sect.id)?.name}・${rankName(sect)}` : '無門無派'}</div>
        </div>
      </div>
      <Vital name="氣血" now={hero.hp} max={d.maxHp} kind="hp" />
      <Vital name="內力" now={hero.qi} max={d.maxQi} kind="qi" />
      <Vital name="體力" now={hero.stamina} max={d.maxStamina} kind="st" />
      <div className="purse small">
        <span>銀兩 {hero.silver}</span>
        <span>名聲 {hero.fame}</span>
        <span>武學點數 {hero.points}</span>
      </div>
      <h4 className="page-sec">五維</h4>
      <ul className="attr-rows">
        {ATTRS.map((a, i) => (
          <li key={a.key} className={on(0, i) ? 'active' : ''} onClick={pick(0, i)}>
            <span className="attr-name">
              {on(0, i) ? '▸ ' : ''}
              {a.name}
            </span>
            <span className="attr-total">{Math.floor(parts.total[a.key])}</span>
            <span className="attr-parts">
              底 {parts.base[a.key]}　長 +{fmt(parts.grow[a.key])}　
              <span className={parts.equip[a.key] ? 'good' : ''}>裝 +{fmt(parts.equip[a.key])}</span>
            </span>
          </li>
        ))}
      </ul>
      <p className="page-help">{active ? '方向鍵選擇　→ 到裝備　E 展開　X 回到書籤' : '按 E 或 ↓ 開始翻閱'}</p>
    </>
  );

  const box = (i: number) => {
    if (i === MOUNT) {
      return (
        <div className={`doll-slot mount ${on(1, i) ? 'active' : ''}`} onClick={pick(1, i)}>
          <IconTile icon={itemIconUrl('horse')} dim={!m} active={on(1, i)} badge={m && hero.riding ? '騎' : undefined} label="坐騎" />
          <span className="doll-label">坐騎</span>
        </div>
      );
    }
    const slot = DOLL[i];
    const id = hero.gear?.[slot];
    const g = id ? ITEMS[id].gear : undefined;
    return (
      <div key={slot} className={`doll-slot ${on(1, i) ? 'active' : ''} ${g ? `filled grade-frame${g.grade}` : 'empty'}`} onClick={pick(1, i)}>
        <IconTile icon={itemIconUrl(id ? ITEMS[id].icon : GEAR_ICON[slot])} dim={!id} active={on(1, i)} label={id ? ITEMS[id].name : GEAR_NAME[slot]} />
        <span className="doll-label">{GEAR_NAME[slot]}</span>
      </div>
    );
  };

  // 框下面的說明：游標那一格是什麼
  const focusSlot = spot.col === 1 ? (spot.i === MOUNT ? null : DOLL[spot.i]) : null;
  const focusId = focusSlot ? hero.gear?.[focusSlot] : undefined;
  const caption =
    spot.col !== 1 ? (
      <span className="muted">→ 選一個裝備框</span>
    ) : spot.i === MOUNT ? (
      m ? (
        <>
          {m.name}・{hero.riding ? '騎乘中' : '牽著'}
        </>
      ) : (
        <span className="muted">坐騎：無</span>
      )
    ) : focusId ? (
      <>
        {GEAR_NAME[focusSlot!]}：<span className={GRADE_CLASS[ITEMS[focusId].gear!.grade]}>{ITEMS[focusId].name}</span>
        <span className="muted">（{GRADES[ITEMS[focusId].gear!.grade]}）</span>
      </>
    ) : (
      <span className="muted">{GEAR_NAME[focusSlot!]}：{focusSlot === 'weapon' ? '空手' : '空著'}</span>
    );

  const right = (
    <>
      <header className="page-head">
        <h2>裝備</h2>
        <span className="page-sub gear-sum">
          <span className="stat atk">攻 {gs.atk}</span>
          <span className="stat def">防 {gs.def}</span>
          <span className="stat eva">閃 {Math.round(gs.eva * 1000) / 10}%</span>
        </span>
      </header>
      <div className="doll">
        <div className="doll-col">{[0, 1, 2, 3].map(box)}</div>
        <div className="doll-figure">
          <img src={heroPortrait()} alt="" />
          {box(MOUNT)}
        </div>
        <div className="doll-col">{[4, 5, 6, 7].map(box)}</div>
      </div>
      <p className="doll-caption">{caption}</p>
    </>
  );

  return (
    <>
      <Spread folio={folio} left={left} right={right} />
      <Paper sheet={open ? sheetFor(hero, open) : null} onClose={() => setOpen(null)} />
    </>
  );
}

const GEAR_NAME = Object.fromEntries(GEAR_SLOTS.map((g) => [g.id, g.name])) as Record<GearSlotId, string>;

/** 某一項攤開成紙的內容 */
function sheetFor(hero: Character, at: Spot): Sheet {
  if (at.col === 0) {
    const a = ATTRS[at.i];
    const parts = attrParts(hero);
    return {
      title: a.name,
      sub: `${Math.floor(parts.total[a.key])}`,
      body: (
        <>
          <p>{a.desc}</p>
          <dl className="kv">
            <dt>天生底值</dt>
            <dd>{parts.base[a.key]}</dd>
            <dt>永久成長</dt>
            <dd>+{fmt(parts.grow[a.key])}（學過的武功、悟出的招式）</dd>
            <dt>裝備加成</dt>
            <dd>+{fmt(parts.equip[a.key])}（裝備中的武功）</dd>
          </dl>
          <p className="small muted">本作沒有人物等級。五維 ＝ 天生底值 ＋ 武功帶來的永久成長 ＋ 裝備中武功的加成。</p>
        </>
      ),
    };
  }
  if (at.i === MOUNT) return mountSheet(hero);
  return gearSheet(hero, DOLL[at.i], GEAR_NAME[DOLL[at.i]]);
}

/** 一件服飾的說明：品級、數值、描述 */
export function GearInfo({ id }: { id: string }) {
  const g = ITEMS[id].gear!;
  return (
    <div className="gear-info">
      <div className="item-line">
        <img className="item-icon" src={itemIconUrl(ITEMS[id].icon)} alt="" />
        <span className={GRADE_CLASS[g.grade]}>{ITEMS[id].name}</span>
        <span className="tag muted-tag">{GRADES[g.grade]}</span>
      </div>
      <ItemEffects id={id} />
      <p className="small muted">{ITEMS[id].desc}</p>
    </div>
  );
}

/** 裝備欄：身上穿的（可以卸下）與行囊裡能穿在這一欄的 */
function gearSheet(hero: Character, slot: GearSlotId, name: string): Sheet {
  const now = hero.gear?.[slot];
  const run = (f: (c: Character) => string) => () => {
    const st = useGame.getState();
    st.showToast(st.updateHero(f));
  };
  const options = Object.keys(hero.items).filter((id) => hero.items[id] > 0 && slotsFor(id).includes(slot));
  return {
    title: name,
    sub: now ? '穿戴中' : slot === 'weapon' ? '空手' : '空著',
    body: (
      <>
        {now ? <GearInfo id={now} /> : <p className="small muted">{name}沒有穿戴東西。</p>}
        {slot === 'weapon' && <WeaponFitList hero={hero} />}
        {!options.length && <p className="small muted">行囊裡沒有能{slot === 'weapon' ? '拿' : '穿'}在這裡的東西。</p>}
      </>
    ),
    actions: [
      ...(now ? [{ key: 'off', label: `卸下「${ITEMS[now].name}」`, run: run((c) => unequipGear(c, slot)) }] : []),
      ...options.map((id) => ({
        key: id,
        label: (
          <span className="action-item">
            <img className="item-icon small" src={itemIconUrl(ITEMS[id].icon)} alt="" />
            <span className={GRADE_CLASS[ITEMS[id].gear!.grade]}>{ITEMS[id].name}</span>
          </span>
        ),
        detail: `${GRADES[ITEMS[id].gear!.grade]}・${slot === 'weapon' ? '拿上' : '穿上'}`,
        run: run((c) => equipGear(c, id, slot)),
      })),
    ],
  };
}

/** 坐騎：有馬就能上馬、下馬 */
function mountSheet(hero: Character): Sheet {
  const m = mountDef(hero.mount);
  if (!m) {
    return { title: '坐騎', sub: '無', body: <p className="small muted">還沒有坐騎。鳴泉山下的梁老四有馬可買：騎著馬在室外走得更快，大地圖上也走得快。</p> };
  }
  const toggle = () => {
    const st = useGame.getState();
    st.updateHero((c) => (c.riding = !c.riding));
    st.showToast(useGame.getState().hero.riding ? `騎上了${m.name}。` : `從${m.name}背上下來，牽著走。`);
  };
  return {
    title: m.name,
    sub: hero.riding ? '騎乘中' : '牽著走',
    body: (
      <>
        <p className="small">{m.desc}</p>
        <dl className="kv">
          <dt>腳力</dt>
          <dd>室外走路、奔跑快 {Math.round((m.speed - 1) * 100)}%（室內照樣步行）</dd>
        </dl>
        <p className="small muted">不要了可以賣回給梁老四（半價）。</p>
      </>
    ),
    actions: [{ label: hero.riding ? '下馬' : '上馬', run: toggle }],
  };
}

/** 裝備中的外功與手上的兵器合不合：拿錯或沒拿只有九成威力，空手打拳多一成 */
function WeaponFitList({ hero }: { hero: Character }) {
  const held = heldWeapon(hero);
  const outer = hero.skills.filter((s) => isEquipped(s) && weaponWanted(skillDef(s).kind));
  if (!outer.length) return null;
  return (
    <ul className="small fit-list">
      {outer.map((s) => {
        const kind = skillDef(s).kind;
        const want = weaponWanted(kind);
        const fit = weaponFit(kind, held);
        return (
          <li key={s.id} className={fit < 1 ? 'bad' : 'good'}>
            {skillDef(s).name}：{want === 'hand' ? '要空手' : `要拿${want}`}
            {fit < 1 ? `——目前${held ? `拿著${held}` : '空手'}，威力只有九成` : fit > 1 ? '——空手打拳，威力多一成' : '——合手'}
          </li>
        );
      })}
    </ul>
  );
}

