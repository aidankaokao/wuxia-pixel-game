import { ITEMS } from '../game/character';
import { stageOf, STAGES } from '../game/social';
import { PEOPLE, PersonDef } from '../game/story/people';
import { ACTIONS, addressOf, availableActions } from '../game/story/social';
import { useGame } from '../state/store';
import { BrowseItem, Browser } from './Browser';

/** 選單「交遊」：依認識的地方分類，再看每個人的交情、稱呼、喜好與能做的事 */
export function PeoplePage({ active, onExit }: { active: boolean; onExit: () => void }) {
  const relations = useGame((s) => s.world.relations);
  const day = useGame((s) => s.world.day);
  // 先排熟的人
  const known = Object.keys(relations)
    .filter((id) => PEOPLE[id])
    .sort((a, b) => relations[b].aff - relations[a].aff);

  const person = (id: string): BrowseItem => {
    const p = PEOPLE[id];
    const r = relations[id];
    const s = stageOf(r.aff);
    return {
      key: id,
      label: p.name,
      tag: <span className={`tag ${r.aff < 0 ? 'danger' : 'muted-tag'}`}>{STAGES[s].name}</span>,
      detail: () => <PersonDetail p={p} day={day} />,
    };
  };

  const places = [...new Set(known.map((id) => PEOPLE[id].place))];
  const items: BrowseItem[] = known.length
    ? [
        { key: 'all', label: '全部', tag: `${known.length} 人`, children: () => known.map(person) },
        ...places.map((pl) => {
          const ids = known.filter((id) => PEOPLE[id].place === pl);
          return { key: pl, label: pl, tag: `${ids.length} 人`, children: () => ids.map(person) };
        }),
      ]
    : [
        {
          key: 'none',
          label: '還沒有認識的人',
          detail: () => <p className="small">去跟人說說話吧。每個人增進感情的方式不同：有人愛聊天、有人看重買賣、有人收禮、有人只認名聲。</p>,
        },
      ];
  return <Browser title="交遊" items={items} active={active} onExit={onExit} />;
}

function PersonDetail({ p, day }: { p: PersonDef; day: number }) {
  const r = useGame((s) => s.world.relations[p.id]);
  const s = stageOf(r.aff);
  const next = STAGES[s + 1];
  const pct = next ? ((r.aff - STAGES[s].min) / (next.min - STAGES[s].min)) * 100 : 100;
  const talked = r.talk.day === day ? r.talk.n : 0;
  const can = availableActions(p.id).map((a) => ACTIONS[a].name);
  // 還沒開放、熟了才有的互動
  const later = [
    p.spar && s < p.spar.stage && `切磋（${STAGES[p.spar.stage].name}）`,
    p.teach && s < p.teach.stage && `請教（${STAGES[p.teach.stage].name}）`,
  ].filter(Boolean);
  const today = [
    `交談 ${Math.min(talked, p.talk.perDay)}/${p.talk.perDay} 次${talked >= p.talk.perDay ? '（今天聊夠了）' : ''}`,
    p.gift && (r.giftDay === day ? '已送過禮' : '還沒送禮'),
    p.spar && s >= p.spar.stage && (r.sparDay === day ? '已切磋' : '還沒切磋'),
    p.teach && s >= p.teach.stage && (r.teachDay === day ? '已請教' : '還沒請教'),
  ].filter(Boolean);
  return (
    <>
      <h3>
        {p.name}　<small>{p.role}</small>
      </h3>
      <div className="skill-head">
        <span className={`tag ${r.aff < 0 ? 'danger' : ''}`}>{STAGES[s].name}</span>
        <span className="muted small">
          熟悉度 {r.aff}
          {next ? `（到「${next.name}」還差 ${next.min - r.aff}）` : ''}
        </span>
      </div>
      <div className="exp-track">
        <div className={`exp-fill ${r.aff < 0 ? 'bad' : ''}`} style={{ width: `${Math.max(0, pct)}%` }} />
      </div>
      <dl className="kv">
        <dt>所在</dt>
        <dd>{p.place}</dd>
        <dt>稱呼你</dt>
        <dd>「{addressOf(p.id)}」</dd>
        <dt>能做的事</dt>
        <dd>
          {can.join('、')}
          {later.length > 0 && <span className="muted">　熟了以後：{later.join('、')}</span>}
        </dd>
        <dt>今天</dt>
        <dd>{today.join('，')}</dd>
        <dt>喜好</dt>
        <dd>
          {r.known.length
            ? r.known.map((k) => `${ITEMS[k].name}${p.gift?.likes[k] ? '（喜歡）' : '（不喜歡）'}`).join('、')
            : p.gift
              ? '還不清楚（送過東西才知道）'
              : '不收禮'}
        </dd>
      </dl>
    </>
  );
}
