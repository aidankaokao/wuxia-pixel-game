import { ITEMS, SKILLS } from '../game/character';
import { MOVES } from '../game/battle/moves';
import { usedToday } from '../game/home';
import { choreKey, leaveRuleText, nextStipendDay, promotionChecks, recruitText, roster, SectDef, sectDef, STIPEND_DAYS } from '../game/sect';
import { stageOf, STAGES } from '../game/social';
import { PEOPLE } from '../game/story/people';
import { MINGQUAN } from '../game/story/sect_mingquan';
import { heroAge, heroStanding } from '../game/story/mq_order';
import { canSeeBooks } from '../game/story/mq_fund';
import { FACILITIES, FAC_IDS, facLevel, FUND_IN, FUND_OUT, fundMood, monthIn, monthLabel, monthOut, MOOD_NAME, type SectFund } from '../game/sect_fund';
import { dateText } from '../game/time';
import { useGame } from '../state/store';
import { BrowseItem, Browser } from './Browser';

/** 選單「門派」：身分、晉升、本門武功、弟子名冊、門規、門派規矩，一層一層往下看 */
export function SectPage({ active, onExit, folio }: { active: boolean; onExit: () => void; folio?: number }) {
  const world = useGame((s) => s.world);
  const hero = useGame((s) => s.hero);
  const flags = useGame((s) => s.flags);
  const s = world.sect;
  const def = s && sectDef(s.id);

  if (!s || !def) {
    const left = (world.leftSects ?? []).map((id) => sectDef(id)?.name).filter(Boolean);
    const items: BrowseItem[] = [
      {
        key: 'none',
        label: '尚未拜入門派',
        detail: () => (
          <>
            <h3>尚未拜入任何門派</h3>
            <p className="small">
              江湖上一個人只能拜一個門派。記名弟子通常可以自由離開；成了正式弟子以後，就要照各派的門規——交罰金、闖陣，有的門派甚至不准離開。
            </p>
            {left.length > 0 && <p className="small">曾經離開：{left.join('、')}（不能再回去拜師）</p>}
          </>
        ),
      },
    ];
    // 聽說過的門派：可以先看看它的規矩
    if (flags.mq_seek || flags.mq_left) items.push({ key: 'charter', label: `${MINGQUAN.name}（聽說過）`, detail: () => <Charter def={MINGQUAN} /> });
    return <Browser title="門派" items={items} active={active} onExit={onExit} folio={folio} />;
  }

  const rank = def.ranks[s.rank];
  const next = def.ranks[s.rank + 1];
  const level = (id: string) => hero.skills.find((k) => k.id === id)?.level ?? 0;
  const checks = promotionChecks(s, world.day, level, (id) => SKILLS[id].name);
  const chore = s.chore && def.chores.find((c) => c.id === s.chore);
  const learned = def.skills.filter((k) => hero.skills.some((h) => h.id === k.id)).length;
  const groups = roster(def, s, hero.name, world);
  const standing = heroStanding(world);

  const items: BrowseItem[] = [
    {
      key: 'status',
      label: '身分總覽',
      tag: rank.name,
      detail: () => (
        <>
          <h3>
            {def.name}　<small>{def.size}門派・{rank.name}</small>
          </h3>
          <dl className="kv">
            {s.master && <Row k="師父" v={PEOPLE[s.master]?.name} />}
            {standing.leader && <Row k="職位" v="鳴泉劍派掌門" />}
            {standing.post && <Row k="職位" v={standing.post} />}
            <Row k="年齡" v={`${heroAge(hero, world)} 歲`} />
            <Row
              k="權利"
              v={[standing.vote ? '年會選舉（投票、競選執事）' : '', standing.teach ? '收徒' : standing.vote ? '收徒（要先過授徒考驗）' : '', standing.heir ? '掌門傳位的繼承資格' : ''].filter(Boolean).join('、') || '內門弟子起有選舉權'}
            />
            {standing.apprentices.length > 0 && <Row k="徒弟" v={standing.apprentices.join('、')} />}
            <Row k="入門" v={`${world.day - s.joinedDay} 天`} />
            <Row k="門派貢獻" v={`${s.contrib}（可以花在抄錄武功等）`} />
            <Row k="累計功績" v={`${s.merit}（只增不減，晉升看這個）`} />
            <Row k="住處" v={rank.dorm} />
            <Row
              k="月例"
              v={`每 ${STIPEND_DAYS} 天 ${rank.stipend.silver} 兩${Object.entries(rank.stipend.items ?? {})
                .map(([id, n]) => `、${ITEMS[id].name}×${n}`)
                .join('')}（${dateText(nextStipendDay(s))}起可領）`}
            />
            <Row k="今日雜務" v={`${usedToday(world, choreKey(s.id))}/${def.choresPerDay} 件${chore ? `，手上：${chore.name}（${chore.where}）` : ''}`} />
          </dl>
          <h4>{rank.name}可以做的事</h4>
          <ul className="sect-list small">
            {rank.perks.map((p) => (
              <li key={p}>・{p}</li>
            ))}
          </ul>
        </>
      ),
    },
    {
      key: 'promote',
      label: '晉升',
      tag: next ? `→ ${next.name}` : '最高身分',
      detail: () =>
        next && checks ? (
          <>
            <h3>晉升{next.name}</h3>
            <ul className="sect-list">
              {checks.map((c) => (
                <li key={c.label} className={c.ok ? 'good' : 'muted'}>
                  {c.ok ? '✔' : '・'} {c.label}
                </li>
              ))}
            </ul>
            <p className="small muted">成為{next.name}之後：{next.perks.join('；')}。</p>
          </>
        ) : (
          <>
            <h3>{rank.name}</h3>
            <p className="small">你已經是本門最高的弟子身分了。</p>
          </>
        ),
    },
    {
      key: 'skills',
      label: '本門武功',
      tag: `${learned}/${def.skills.length}`,
      children: () =>
        def.skills.map((k) => {
          const d = SKILLS[k.id];
          const mine = hero.skills.find((h) => h.id === k.id);
          return {
            key: k.id,
            label: d.name,
            muted: !mine && s.rank < k.rank,
            tag: mine ? `第 ${mine.level} 重` : s.rank < k.rank ? `${def.ranks[k.rank].name}起` : `${k.cost} 貢獻`,
            detail: () => (
              <>
                <h3>
                  {d.name}　<small>{d.tier}{d.kind}</small>
                </h3>
                <p className="small">{d.desc}</p>
                <p className="small muted">
                  {mine
                    ? `已學會，第 ${mine.level} 重。`
                    : `${def.ranks[k.rank].name}起可以在書房抄錄${k.cost ? `，要花 ${k.cost} 點門派貢獻` : '（入門時傳授）'}。`}
                </p>
                <h4>招式</h4>
                <ul className="sect-list small">
                  {d.moves.map((m, i) => {
                    const got = mine?.moves.includes(m.id);
                    return (
                      <li key={m.id} className={got ? '' : 'muted'}>
                        {got ? '✔' : '・'} {MOVES[m.id].name}
                        <span className="muted">　{i === 0 ? '學會就會' : `第 ${m.level} 重後悟出`}</span>
                        {got && <div className="muted">{MOVES[m.id].desc}</div>}
                      </li>
                    );
                  })}
                </ul>
              </>
            ),
          };
        }),
    },
    {
      key: 'roster',
      label: '弟子名冊',
      tag: `${groups.reduce((n, g) => n + g.members.length, 0)} 人`,
      ledger: () => ({
        title: `${def.name}弟子名冊`,
        columns: ['位階', '姓名', '年齡', '職司', '近況', '交情'],
        rows: groups.flatMap((g) =>
          g.members.map((m, i) => {
            const rel = m.person ? world.relations[m.person] : undefined;
            return {
              key: m.name,
              mark: m.me,
              muted: !!m.note,
              cells: [
                // 同一位階只在第一列寫，像書上的排法
                i === 0 ? g.rank : '',
                m.me ? `${m.name}（你）` : m.name,
                m.me ? `${heroAge(hero, world)}` : m.age ? `${m.age}` : '—',
                m.me ? [m.role !== '你' ? m.role : '', s.master ? `${PEOPLE[s.master]?.name}門下` : ''].filter(Boolean).join('・') || '—' : (m.role ?? '—'),
                m.note ?? '在山上',
                rel ? `${STAGES[stageOf(rel.aff)].name}（${rel.aff}）` : m.person ? '還沒說過話' : '',
              ],
            };
          }),
        ),
        note: '記名弟子另有十來人，名冊上不一一列出。',
      }),
      detail: () => (
        <>
          <h3>弟子名冊</h3>
          <ul className="sect-list small">
            {groups.map((g) => (
              <li key={g.rank}>
                {g.rank}：{g.members.map((m) => m.name).join('、')}
              </li>
            ))}
          </ul>
          <p className="small muted">記名弟子另有十來人，名冊上不一一列出。</p>
        </>
      ),
    },
    ...(s.id === 'mingquan' && world.life?.fund ? [fundItem(world.life.fund, canSeeBooks(world))] : []),
    {
      key: 'rules',
      label: '門規',
      tag: `${def.rules.length} 條`,
      children: () =>
        def.rules.map((r, i) => ({
          key: r.name,
          label: `${'一二三四五六七八九十'[i]}、${r.name}`,
          detail: () => (
            <>
              <h3>{r.name}</h3>
              <p>{r.desc}</p>
              <p className="small muted">犯了門規，輕則罰做雜務、扣貢獻，重則上思過崖面壁，甚至逐出師門。</p>
            </>
          ),
        })),
    },
    { key: 'charter', label: '門派規矩', tag: def.size + '門派', detail: () => <Charter def={def} /> },
  ];
  return <Browser title={def.name} items={items} active={active} onExit={onExit} folio={folio} />;
}

const MOOD_TEXT = {
  rich: '庫裡銀子夠撐上半年，伙食裡常見得到肉，大家練功也起勁。',
  ok: '收支大致打平，日子過得去。',
  tight: '存銀不到兩個月的開銷，柯靜言什麼都要省著用。',
  broke: '公庫見底了，月例只發得出一半，人心有些浮動。',
};

/** 公庫：內門弟子以上（或擔任職位、掌門）看得到細帳；其他人只聽說個大概 */
function fundItem(f: SectFund, insider: boolean): BrowseItem {
  const mood = fundMood(f);
  const n = (x: number) => Math.round(x).toLocaleString();
  const rows = (r: Record<string, number>, names: Record<string, string>) =>
    Object.keys(names)
      .filter((k) => r[k])
      .map((k) => <Row key={k} k={names[k]} v={`${n(r[k])} 兩`} />);
  return {
    key: 'fund',
    label: '公庫',
    tag: MOOD_NAME[mood],
    detail: () =>
      insider ? (
        <>
          <h3>
            公庫　<small>{MOOD_NAME[mood]}</small>
          </h3>
          <p className="small">{MOOD_TEXT[mood]}</p>
          <dl className="kv">
            <Row k="存銀" v={`${n(f.silver)} 兩`} />
            <Row k="存糧" v={`${n(f.grain)} 石`} />
            <Row k="茶葉" v={`${n(f.tea)} 斤（約值 ${n(f.teaValue)} 兩，等下山時賣）`} />
            <Row k="藥材" v={`${n(f.herb)} 份`} />
            <Row k="木料" v={`${n(f.wood ?? 0)} 根`} />
            <Row k="石料" v={`${n(f.stone ?? 0)} 方`} />
            <Row k="產業" v={FAC_IDS.filter((id) => facLevel(f, id)).map((id) => `${FACILITIES[id].name}${['', '一級', '二級'][facLevel(f, id)]}`).join('、') || '沒有'} />
            {f.build && <Row k="營造中" v={`${FACILITIES[f.build.id].name}（到${dateText(f.build.done)}）`} />}
          </dl>
          <h4>這個月（{monthLabel(f.month.key)}）</h4>
          <dl className="kv small">
            {rows(f.month.in, FUND_IN)}
            <Row k="收入合計" v={`${n(monthIn(f.month))} 兩`} />
            {rows(f.month.out, FUND_OUT)}
            <Row k="支出合計" v={`${n(monthOut(f.month))} 兩`} />
          </dl>
          {f.books.length > 0 && <p className="page-help">E 展開月帳</p>}
        </>
      ) : (
        <>
          <h3>公庫</h3>
          <p className="small">聽師兄們說，公庫眼下{MOOD_NAME[mood]}。{MOOD_TEXT[mood]}</p>
          <p className="small muted">細帳要內門弟子以上，或擔任職位才看得到。</p>
        </>
      ),
    ledger:
      insider && f.books.length
        ? () => ({
            title: '鳴泉劍派公庫月帳',
            columns: ['月份', '收入', '支出', '盈虧', '月底存銀', '大宗'],
            rows: [...f.books].reverse().map((b) => {
              const net = monthIn(b) - monthOut(b);
              const big = Object.entries(b.in).sort((x, y) => y[1] - x[1])[0];
              return {
                key: String(b.key),
                muted: net < 0,
                cells: [monthLabel(b.key), n(monthIn(b)), n(monthOut(b)), `${net >= 0 ? '+' : ''}${n(net)}`, n(b.silver), big ? `${FUND_IN[big[0]]} ${n(big[1])}` : '—'],
              };
            }),
            note: '收入：茶莊、賣茶、賣木料石料藥材、田租、香火、委託行醫、捐輸；支出：月例、伙食、買糧、買藥材、修繕雜項、茶莊與產業工錢、營造。',
          })
        : undefined,
  };
}

/** 門派規矩：收徒、兵器、各身分的住處、月例與脫離方式 */
function Charter({ def }: { def: SectDef }) {
  return (
    <>
      <h3>
        {def.name}　<small>{def.size}門派</small>
      </h3>
      <dl className="kv">
        <Row k="收徒" v={recruitText(def.recruit)} />
        <Row k="兵器" v={def.weapons.join('、')} />
      </dl>
      <h4>各級弟子</h4>
      <table className="charter small">
        <thead>
          <tr className="muted">
            <th>身分</th>
            <th>住處</th>
            <th>月例</th>
            <th>離開師門</th>
          </tr>
        </thead>
        <tbody>
          {def.ranks.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.dorm}</td>
              <td>{r.stipend.silver} 兩</td>
              <td>{r.leave.map(leaveRuleText).join('，或')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <>
      <dt>{k}</dt>
      <dd>{v}</dd>
    </>
  );
}
