## 鳴泉劍派的門派秩序與職位差事（照網頁版 story/mq_order.ts、story/mq_posts.ts）：年齡、職位與年會選舉、收徒、掌門傳位、職位的差事、掌門事務。
## - 年齡：名冊上每人有第一年的年紀（AGE），每過一年長一歲；你也是（G.hero.age，預設十八）。體力 vigor：四十五歲以後慢慢衰退。
## - 職位（POSTS）：傳功、執法、藥堂三位長老與外務、巡山、典儀三個執事。你當執事月例多 8 兩、長老多 25 兩、掌門多 60 兩（post_bonus）。
## - 年會：每年正月十六（辰時到午時）在大殿找掌門。先議退位（七十二歲以上的長老）與傳位（掌門七十五歲或體力衰到五成五以下），
##   再選舉空出來的長老席與三個執事。投票的是內門弟子以上；你是內門以上能投一票、競選執事（長老席要真傳弟子、功績一千二）。你沒來，年會照開（隔天半夜補算）。
## - 收徒：內門弟子以上、入內門滿十五天、功績三百、鳴泉劍法第七重，找韓靖秋過授徒考驗（旗標 mq_teach）；之後找沒有師父的記名、正式弟子收為徒弟
##   （內門兩個、真傳三個、長老或掌門五個）。徒弟長得快五成；每天能指點一次；徒弟升了身分你貢獻 +10（life_mingquan.new_day）。
## - 傳位：掌門傳位時從真傳弟子裡挑繼承人（實力、功績、名聲、跟掌門的交情）；你是真傳弟子就有機會接任，否則由陸鳴川接任。卸任的掌門成了太上長老。
## - 職位的差事（找值殿柯靜言，duty_talk 的「職位的差事」）：外務執事領山下的差事（送茶或採買）、收租；巡山執事巡山、排守夜；典儀執事節慶祭祖、主持比武；
##   傳功長老主講講武（找聽講的人）；執法長老調解吵架；藥堂長老看診換藥。
## - 掌門：大殿正中的掌門座位（leader_chair）：主持年會、任免職位、門派方針（重武／守成／寬和）、門派產業（mq_industry）、門派近況。
## 狀態在 G.life.mq（posts 職位 → 誰、ranks 位階與職司的覆寫、meeting_year、policy、watch_pick）與 G.sect（post、leader）；差事在 G.life.mq_errand。
## 用到的旗標：mq_teach 過了授徒考驗

const Train := preload("res://story/train.gd")

## [id, 名字, 種類, 一開始誰擔任, 月例加給, 說明]
const POSTS := [
	["elder_teach", "傳功長老", "elder", "han", 25, "在練功房指點弟子，主持考核與講武。"],
	["elder_law", "執法長老", "elder", "yan", 25, "掌門規，看守思過崖。"],
	["elder_med", "藥堂長老", "elder", "su", 25, "掌藥堂，行醫濟世。"],
	["st_out", "外務執事", "steward", "wei", 8, "打理下山的委託、採買與門派在山下的往來。"],
	["st_patrol", "巡山執事", "steward", "he", 8, "排守山門、守夜的班，管山上的安危。"],
	["st_rite", "典儀執事", "steward", "", 8, "籌辦年會、比武小會、節慶與入門拜師的典禮。"],
]
## 名冊上每人第一年的年紀
const AGE := {"wen": 68, "han": 52, "yan": 71, "su": 45, "lu": 27, "ye": 24, "qi": 31, "fang": 26, "ke": 29, "song": 25, "miao": 21, "meng": 30,
	"he": 24, "wei": 23, "gu": 16, "qiao": 18, "bao": 17, "tang": 17, "cao": 15, "zheng": 20, "hou": 19, "bu": 52, "shao": 74, "gan": 61}
## 不在日常系統裡的人的實力（給選舉用）
const STATIC_POWER := {"qi": 62, "fang": 50, "ke": 55, "song": 45, "miao": 48, "meng": 58, "ye": 95, "yan": 160, "su": 120, "han": 200, "wen": 300}
const RANK_ORDER := ["記名弟子", "正式弟子", "內門弟子", "真傳弟子", "長老", "太上長老", "掌門"]
const POLICY := {"martial": ["重武", "同門練功更勤，長得快兩成；但較勁的人更容易吵架。"], "steady": ["守成", "一切照舊。"],
	"gentle": ["寬和", "同門和氣，很少吵架，也更常下山歷練、行俠；只是練功鬆一些。"]}


static func _mq() -> GDScript:
	return load("res://story/mingquan.gd")


static func _life() -> GDScript:
	return load("res://story/life_mingquan.gd")


static func _st() -> Dictionary:
	return _life().state()


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _news(text: String) -> void:
	_life()._news(text, [])


static func member() -> bool:
	return Sect.member("mingquan")


static func leader() -> bool:
	return member() and G.sect.get("leader", false)


static func my_post() -> String:
	return G.sect.get("post", "") if member() else ""


# ── 年齡、實力、位階 ────────────────────────────────────

static func year() -> int:
	return int(G.date_of().year)


static func age_now(k: String) -> int:
	return int(AGE.get(k, 20)) + year() - 1


static func hero_age() -> int:
	return Person.age("hero")


## 體力：45 歲以前 1，之後每年 -1%，60 歲時 0.85、之後每年 -2%（最低 0.3）
static func vigor(age: int) -> float:
	return 1.0 if age <= 45 else (1.0 - (age - 45) * 0.01 if age <= 60 else maxf(0.3, 0.85 - (age - 60) * 0.02))


static func power_of(k: String) -> float:
	if _life().GROW.has(k):
		return float(_life().mem(k).power)
	return float(STATIC_POWER.get(k, 20))


static func hero_power() -> float:
	var s := 0
	for sk in G.hero.skills:
		s += int(sk.level)
	return s * 4 + int(G.hero.get("fame", 0)) / 2.0


static func name_of(k: String) -> String:
	return G.hero.name if k == "hero" else _mq().MQ.get(k, k)


static func _roster_row(k: String) -> Array:
	for m in _mq().ROSTER:
		if m[0] == k:
			return m
	return []


## 某人現在的位階（年會、任免改過的優先；自己過日子的同門照他們練出來的身分）
static func rank_now(k: String) -> String:
	var over: Dictionary = _st().get("ranks", {}).get(k, {})
	if over.has("rank"):
		return over.rank
	var row := _roster_row(k)
	if row.is_empty():
		return ""
	if _life().GROW.has(k) and k != "lu":
		return _life().RANK_NAME[maxi(int(_life().mem(k).rank), _life().RANK_NAME.find(row[1]))]
	return row[1]


static func role_now(k: String) -> String:
	var over: Dictionary = _st().get("ranks", {}).get(k, {})
	var row := _roster_row(k)
	var role: String = over.get("role", row[2] if row.size() > 2 else "")
	var p := post_of(k)
	if not over.has("role") and not p.is_empty() and p[2] == "steward":
		role = ("%s・%s" % [role, p[1]]) if role != "" else p[1]
	if _life().GROW.has(k) and _life().mem(k).get("master", "") == "hero":
		role = ("%s・你的徒弟" % role) if role != "" else "你的徒弟"
	return role


static func away(k: String) -> bool:
	if _life().GROW.has(k) and _life().away(k):
		return true
	var row := _roster_row(k)
	return row.size() > 2 and String(row[2]).contains("下山")


static func at_least(r: String, min_r: String) -> bool:
	return RANK_ORDER.find(r) >= RANK_ORDER.find(min_r)


# ── 職位 ────────────────────────────────────────────────

static func post_def(id: String) -> Array:
	for p in POSTS:
		if p[0] == id:
			return p
	return []


static func holder_of(id: String) -> String:
	var posts: Dictionary = _st().get("posts", {})
	return posts[id] if posts.has(id) else post_def(id)[3]


static func post_of(who: String) -> Array:
	for p in POSTS:
		if holder_of(p[0]) == who:
			return p
	return []


## 月例加給（職位）
static func post_bonus() -> int:
	if leader():
		return 60
	return int(post_def(my_post())[4]) if my_post() != "" else 0


## 職位交接（也改名冊上的位階、職司）
static func seat(p: Array, winner: String) -> void:
	var st := _st()
	if not st.has("posts"):
		st.posts = {}
	if not st.has("ranks"):
		st.ranks = {}
	st.posts[p[0]] = winner
	if winner == "hero":
		G.sect.post = p[0]
	else:
		if p[2] == "elder":
			st.ranks[winner] = {"rank": "長老", "role": p[1]}
		if my_post() == p[0]:
			G.sect.erase("post")


## 現任掌門（名冊 key）
static func leader_key() -> String:
	for k in _st().get("ranks", {}):
		if _st().ranks[k].get("rank", "") == "掌門":
			return k
	return "wen"


# ── 年會 ────────────────────────────────────────────────

static func is_meeting_day(d := -1) -> bool:
	var dt := G.date_of(d)
	return int(dt.month) == 0 and int(dt.date) == 16


static func meeting_pending() -> bool:
	return is_meeting_day() and int(_st().get("meeting_year", 0)) != year()


static func _voters() -> Array:
	return _mq().ROSTER.map(func(m): return m[0]).filter(func(k): return at_least(rank_now(k), "內門弟子") and rank_now(k) != "太上長老" and not away(k))


## 同門投票的心意：實力、資歷、現任、交情，再加一點運氣（同一天同一人固定）
static func _preference(voter: String, cand: String, p: Array) -> float:
	var r := float((voter.unicode_at(0) * 131 + cand.unicode_at(0) * 17 + G.day + String(p[0]).length() * 7) % 100) / 100.0
	var incumbent := 12.0 if holder_of(p[0]) == cand else 0.0
	if cand == "hero":
		var person: String = {"wen": "wen", "han": "han", "lu": "lu", "su": "su", "yan": "yan"}.get(voter, "")
		var aff := float(Social.rel(person).get("aff", 0)) if person != "" and Social.met(person) else 0.0
		var fresh := 10.0 if G.day - int(G.sect.get("joined", G.day)) < 360 else 0.0
		var scandal := minf(20, float(load("res://story/mq_fund.gd").fund().get("scandal", 0)))
		return hero_power() / 2 + hero_age() / 3.0 + minf(8, int(G.sect.get("merit", 0)) / 100.0) + minf(10, int(G.hero.get("fame", 0)) / 8.0) + aff / 3 + incumbent - fresh - scandal + r * 15
	var bondish := 5.0 if voter == "lu" and cand == "he" else 0.0
	return power_of(cand) / 2 + age_now(cand) / 3.0 + incumbent + bondish + r * 15


static func _candidates(p: Array, hero_runs: bool) -> Array:
	var pool: Array = _mq().ROSTER.map(func(m): return m[0]).filter(func(k):
		var op := post_of(k)
		if away(k) or (not op.is_empty() and op[2] == "elder") or k in ["wen", "bu", "shao", "gan"]:
			return false
		var r := rank_now(k)
		if p[2] == "elder":
			return (r == "真傳弟子" or r == "內門弟子") and age_now(k) >= 30
		return at_least(r, "正式弟子") and not r in ["長老", "掌門", "太上長老"] and (op.is_empty() or op[0] == p[0]))
	pool.sort_custom(func(a, b): return power_of(a) + (30 if holder_of(p[0]) == a else 0) > power_of(b) + (30 if holder_of(p[0]) == b else 0))
	var top := pool.slice(0, 2)
	if hero_runs:
		top.append("hero")
	return top


## 開票：每位有投票權的人投一票（不投自己）；hero_vote 是你投的人
static func _tally(p: Array, cands: Array, hero_vote: String) -> Dictionary:
	var count := {}
	for c in cands:
		count[c] = 0
	for v in _voters():
		var opts := cands.filter(func(c): return c != v)
		opts.sort_custom(func(a, b): return _preference(v, a, p) > _preference(v, b, p))
		if opts.size() > 0:
			count[opts[0]] += 1
	if hero_vote != "" and count.has(hero_vote):
		count[hero_vote] += 1
	var order := cands.duplicate()
	order.sort_custom(func(a, b): return count[a] > count[b] or (count[a] == count[b] and _preference("wen", a, p) > _preference("wen", b, p)))
	var winner: String = order[0]
	var tie := cands.filter(func(c): return count[c] == count[winner]).size() > 1
	return {"winner": winner, "count": count, "tie": tie}


## 退位：七十二歲以上的長老，年會上一半機會退下
static func _retirements() -> Array:
	var out := []
	for p in POSTS:
		if p[2] != "elder":
			continue
		var h := holder_of(p[0])
		if h == "" or h == "hero":
			continue
		var age := age_now(h)
		if age >= 72 and float((age * 7 + G.day) % 10) / 10.0 < 0.5 + (1 - vigor(age)):
			out.append([h, p])
	return out


static func _retire(who: String, p: Array) -> void:
	var st := _st()
	if not st.has("posts"):
		st.posts = {}
	if not st.has("ranks"):
		st.ranks = {}
	st.posts[p[0]] = ""
	st.ranks[who] = {"rank": "太上長老", "role": "前%s" % p[1]}
	_news("%s卸下%s之職" % [name_of(who), p[1]])


static func _wants_to_retire() -> bool:
	if leader():
		return false
	var age := age_now(leader_key())
	return age >= 75 or vigor(age) < 0.55


static func _successor() -> String:
	var pool: Array = _mq().ROSTER.map(func(m): return m[0]).filter(func(k): return rank_now(k) == "真傳弟子" and not away(k))
	if member() and int(G.sect.rank) >= 3:
		pool.append("hero")
	var score := func(c: String) -> float:
		if c == "hero":
			return hero_power() / 2 + int(G.sect.get("merit", 0)) / 30.0 + int(G.hero.get("fame", 0)) / 3.0 + (float(Social.rel("wen").get("aff", 0)) / 2 if Social.met("wen") else 0.0)
		return power_of(c) / 2 + (30 if c == "lu" else 0) + age_now(c) / 4.0
	pool.sort_custom(func(a, b): return score.call(a) > score.call(b))
	return pool[0] if pool.size() > 0 else "lu"


static func _hand_over(heir: String) -> void:
	var st := _st()
	if not st.has("ranks"):
		st.ranks = {}
	if not st.has("posts"):
		st.posts = {}
	var old := leader_key()
	st.ranks[old] = {"rank": "太上長老", "role": "卸任的掌門，在後山清修"}
	for p in POSTS:
		if holder_of(p[0]) == heir:
			st.posts[p[0]] = ""
	if heir == "hero":
		G.sect.leader = true
		G.sect.erase("post")
	else:
		st.ranks[heir] = {"rank": "掌門", "role": "鳴泉劍派第八代掌門"}
	_news("%s傳位給%s" % [name_of(old), name_of(heir)])


## 年會（有你在場）：退位、傳位、選舉。由現任掌門主持；你是掌門就由你主持（平票由你定）
static func annual_meeting(ctx: Ctx) -> void:
	var chair := "hero" if leader() else leader_key()
	var host := func(t: String) -> Variant: return "你說：「%s」" % t if chair == "hero" else {"speaker": name_of(chair), "text": t}
	await ctx.say(["大殿裡站滿了人。你在正中的座位坐下，長老們分坐兩側，弟子們齊齊行禮。" if chair == "hero" else "大殿裡站滿了人。長老們坐在兩側，內門以上的弟子站在前排，記名弟子擠在殿門口張望。", host.call("今年的年會，開始吧。")])
	for r in _retirements():
		await ctx.say(host.call("%s年事已高，今年起卸下%s之職，留在山上清修。" % [name_of(r[0]), r[1][1]]))
		_retire(r[0], r[1])
	if chair != "hero" and _wants_to_retire():
		var heir := _successor()
		await ctx.say([host.call("我年紀大了，劍也提不太動了。是時候把鳴泉交給年輕人。"), host.call("這些年來，真傳弟子們的品行、武功，我都看在眼裡。")])
		_hand_over(heir)
		if heir == "hero":
			await ctx.say([host.call("%s，鳴泉劍派第八代掌門，由你來當。" % G.hero.name), "滿殿的人齊齊向你行禮。你接過那柄刻著「鳴泉」二字的古劍，只覺得沉甸甸的。"])
			ctx.fame(30)
			await ctx.say("（接任鳴泉劍派掌門）")
		else:
			await ctx.say(host.call("鳴泉劍派第八代掌門，由%s接任。" % name_of(heir)))
	var can_vote := member() and int(G.sect.rank) >= 2
	for p in POSTS.filter(func(x): return x[2] == "steward" or holder_of(x[0]) == ""):
		var hero_can: bool = member() and not leader() and not (my_post() != "" and my_post() != p[0]) and (int(G.sect.rank) >= 2 if p[2] == "steward" else (int(G.sect.rank) >= 3 and int(G.sect.merit) >= 1200))
		var runs := hero_can and await ctx.ask("改選%s：%s\n要出來競選嗎？" % [p[1], p[5]], ["參選", "不參選"]) == 0
		var cands := _candidates(p, runs)
		if cands.is_empty():
			continue
		var vote := ""
		if can_vote:
			var opts := cands.filter(func(c): return c != "hero" or runs)
			var i := await ctx.ask("%s的候選人：%s。你投誰？" % [p[1], "、".join(cands.map(func(c): return name_of(c)))], opts.map(func(c): return "投自己" if c == "hero" else name_of(c)) + ["不投"])
			vote = opts[i] if i < opts.size() else ""
		var r := _tally(p, cands, vote)
		var winner: String = r.winner
		await ctx.say("開票：%s。" % "、".join(cands.map(func(c): return "%s %d 票" % [name_of(c), r.count[c]])))
		if r.tie and chair == "hero":
			var tied := cands.filter(func(c): return r.count[c] == r.count[r.winner])
			winner = tied[await ctx.ask("票數相同，由掌門裁定。你選誰？", tied.map(func(c): return name_of(c)))]
		elif r.tie:
			await ctx.say(host.call("票數相同，由我來定。"))
		seat(p, winner)
		await ctx.say(host.call("%s由%s擔任。" % [p[1], ("我" if chair == "hero" else "你") if winner == "hero" else name_of(winner)]))
		if winner == "hero":
			ctx.fame(3)
			await ctx.say("（當選%s：月例多 %d 兩）" % [p[1], p[4]])
	_st().meeting_year = year()
	await ctx.say(host.call("今年的年會就到這裡。各自好好練功，好好做事。"))


static func _meeting_without_hero() -> void:
	for r in _retirements():
		_retire(r[0], r[1])
	if not leader() and _wants_to_retire():
		_hand_over(_successor())
	for p in POSTS.filter(func(x): return x[2] == "steward" or holder_of(x[0]) == ""):
		var cands := _candidates(p, false)
		if cands.size() > 0:
			seat(p, _tally(p, cands, "").winner)
	_st().meeting_year = year()
	_news("今年的年會開過了，各職位重新選定")


## 每天半夜：年會你沒來，照開
static func new_day() -> void:
	if is_meeting_day(G.day - 1) and int(_st().get("meeting_year", 0)) != int(G.date_of(G.day - 1).year):
		_meeting_without_hero()


## 聞松年（是現任掌門時）的劇情前面：年會那天找他就開年會（處理了回傳 true）
static func wen_meeting(ctx: Ctx) -> bool:
	if not member() or not meeting_pending() or leader_key() != "wen" or leader():
		return false
	await annual_meeting(ctx)
	return true


# ── 授徒考驗、收徒、指點 ─────────────────────────────────

const TEACH_Q := [
	["徒弟練了三個月還是學不會一招，你怎麼辦？", ["換一個徒弟", "拆成小步，一步一步帶", "罵到他會為止"], 1],
	["徒弟的劍法跟你的路數不同，卻打得不差，你怎麼看？", ["硬改成跟我一樣", "順著他的長處教", "不管他"], 1],
	["徒弟在外頭闖了禍，對方找上門來，你怎麼做？", ["先問清楚，該賠的賠、該罰的罰", "護著自己人", "把徒弟交出去了事"], 0],
]


static func can_teach() -> bool:
	return int(G.flags.get("mq_teach", 0)) > 0


static func _apprentice_cap() -> int:
	var p := post_def(my_post()) if my_post() != "" else []
	return 5 if leader() or (not p.is_empty() and p[2] == "elder") else (3 if int(G.sect.get("rank", 0)) >= 3 else 2)


static func apprentices() -> Array:
	return _life().GROW.keys().filter(func(k): return _life().mem(k).get("master", "") == "hero")


## 韓靖秋的劇情前面：條件齊了就考授徒（處理了回傳 true）
static func teach_exam(ctx: Ctx) -> bool:
	if can_teach() or not member() or int(G.sect.rank) < 2:
		return false
	var s := Hero.find_skill(G.hero, "mingquan")
	var ok: bool = G.day - int(G.sect.rank_day) >= 15 and int(G.sect.merit) >= 300 and not s.is_empty() and int(s.level) >= 7
	if not ok:
		return false
	var han := _by("韓靖秋")
	if await ctx.ask(han.call("你入內門也有些時日了。想收徒的話，先過我這一關。"), ["請長老考我", "先不了"]) != 0:
		return false
	var right := 0
	for q in TEACH_Q:
		if await ctx.ask(han.call(q[0]), q[1]) == q[2]:
			right += 1
	if right < 2:
		await ctx.say(han.call("三問對了 %d 問。帶人比自己練劍難多了，再想想。" % right))
		return true
	ctx.pass_time(2)
	await ctx.say([han.call("再來，帶小豆練一套劍給我看。"), "曹小豆緊張兮兮地站到你面前。你一招一招拆給他看，他總算把整套劍練下來了。", han.call("好。往後你可以收徒了。徒弟教得好不好，也算在你的功績裡。")])
	ctx.set_flag("mq_teach")
	await ctx.say("（%s）" % Sect.add_contrib(5))
	return true


## 收徒：沒有師父的記名、正式弟子；有人物檔案的看交情，其他人看你的實力
static func take_apprentice(ctx: Ctx) -> void:
	var id: String = ctx.extra.npc
	var d: Dictionary = Life.npc_def(Life.group("mingquan"), id)
	if apprentices().size() >= _apprentice_cap():
		await ctx.say("（你已經收了 %d 個徒弟，照門規不能再收）" % _apprentice_cap())
		return
	var person: String = d.get("person", "")
	var willing := (Social.met(person) and int(Social.rel(person).aff) >= 40) if person != "" else hero_power() > power_of(id) + 10
	if not willing:
		await ctx.say({"speaker": d.name, "text": "……我們還不算太熟，這事讓我再想想。" if person != "" else "師兄的好意我心領了，只是……我想再多看看。"})
		return
	_life().mem(id).master = "hero"
	_life()._news("%s拜了%s為師" % [d.name, G.hero.name], [id])
	await ctx.say(["%s跪下來，恭恭敬敬地磕了三個頭：「師父在上，請受徒兒一拜！」" % d.name, "（收了一個徒弟。每天可以找他「指點」一次，他會長得比別人快）"])


## 指點徒弟：一天一次
static func teach_apprentice(ctx: Ctx) -> void:
	var id: String = ctx.extra.npc
	var d: Dictionary = Life.npc_def(Life.group("mingquan"), id)
	ctx.pass_time(2)
	var m: Dictionary = _life().mem(id)
	m.power = float(m.power) + 1.5
	m.taught_day = G.day
	await ctx.say(["你看著%s練了一遍劍，指出幾處毛病，又親手示範了兩招。" % d.name, {"speaker": d.name, "text": "多謝師父！我明白了！"}, "（指點了兩刻）"])
	await ctx.say("（%s）" % Sect.add_contrib(1))


## 跟同門說話時多的選項（life_mingquan.options 轉過來）：收徒、指點徒弟、典儀主持比武、傳功長老開講
static func options(id: String, act: String) -> Array:
	var out := []
	if not member() or act in ["sleep", "class", "spar"]:
		return out
	if id == "lu" and act == "lead" and _life().meet_now() and my_post() == "st_rite" and int(G.life.get("daily", {}).get("mq:host", 0)) != G.day:
		out.append(["唱名主持一場比試", "mq_order/host_match"])
	if act == "listen" and my_post() == "elder_teach" and _life().lecture_now() and int(G.life.get("daily", {}).get("mq:lecture", 0)) != G.day:
		out.append(["開講", "mq_order/hero_lecture"])
	if act == "lead":
		return out
	if _life().GROW.has(id):
		var m: Dictionary = _life().mem(id)
		if m.get("master", "") == "hero":
			if int(m.get("taught_day", 0)) != G.day:
				out.append(["指點徒弟（兩刻）", "mq_order/teach_apprentice"])
		elif can_teach() and int(m.rank) <= 1 and not m.has("master") and not id in ["lu", "han", "wen"]:
			out.append(["收為徒弟", "mq_order/take_apprentice"])
	return out


# ── 職位的差事（值殿柯靜言） ────────────────────────────

const ERRANDS := [["jinchuang", 3, "回春堂", "藥堂的金創藥用完了"], ["herb", 6, "回春堂", "蘇長老要止血草配藥"],
	["w_wood_sword", 3, "石家鐵鋪", "新來的記名弟子還沒有練習用的木劍"], ["cotton_thread", 5, "錦繡布莊", "弟子服要補，棉線不夠了"]]
const ERRAND_DAYS := 5
const TEA_DAYS := 4
const POST_NOTE := {
	"st_out": "外務執事：每五天領一次山下的差事——製茶房存了茶就送進城裡的泉霧茶莊，不然就是採買，五天內買齊交來，照價報帳再多一成；夏租、冬租到期時，下山到青竹村找柳村長收租。",
	"st_patrol": "巡山執事：每天巡山一圈；也可以排今晚誰守夜。",
	"st_rite": "典儀執事：節慶當天主持祭祖；旬休未時的比武小會，找陸鳴川就能唱名主持一場。",
	"elder_teach": "傳功長老：逢五（初五、十五、廿五）申時的講武由你主講，到練功房找聽講的弟子開講。",
	"elder_law": "執法長老：同門吵架時，由你調解。",
	"elder_med": "藥堂長老：每天看診換藥，有止血草更好。",
}


static func _ke(t: String) -> Dictionary:
	return {"speaker": "柯靜言", "text": t}


static func _daily_done(key: String) -> bool:
	return int(G.life.get("daily", {}).get(key, 0)) == G.day


static func _mark(key: String) -> void:
	if not G.life.has("daily"):
		G.life.daily = {}
	G.life.daily[key] = G.day


static func _errand() -> Dictionary:
	return G.life.get("mq_errand", {})


static func _errand_ready() -> bool:
	var e := _errand()
	return e.is_empty() or (G.day - int(e.day) >= ERRAND_DAYS if e.get("done", false) else G.day > int(e.due))


static func _outer_duty(ctx: Ctx) -> void:
	var e := _errand()
	var live: bool = not e.is_empty() and not e.get("done", false) and G.day <= int(e.due)
	if live and e.get("kind", "") == "tea":
		await ctx.say(_ke("那 %d 斤茶送到臨江城的泉霧茶莊，交給梁敬亭就算交差。%d 天內送到就行。" % [e.n, int(e.due) - G.day + 1]))
		return
	if live:
		var have := int(G.bag.get(e.item, 0))
		if have < int(e.n):
			await ctx.say(_ke("差事還沒辦完：到臨江城買%s %d 件（你身上有 %d 件）。%d 天內交來就行。" % [ctx.item_name(e.item), e.n, have, int(e.due) - G.day + 1]))
			return
		if await ctx.ask(_ke("%s %d 件，都買齊了？" % [ctx.item_name(e.item), e.n]), ["交差", "再等等"]) != 0:
			return
		var pay := roundi(int(Ui.item_def(e.item).get("price", 0)) * int(e.n) * 1.1)
		ctx.take(e.item, int(e.n))
		G.silver += pay
		e.done = true
		e.day = G.day
		await ctx.say([_ke("辛苦了！帳我記上，銀子照價還你，多的一成算跑腿錢。"), "（交了%s %d 件，領回銀兩 %d）" % [ctx.item_name(e.item), e.n, pay]])
		await ctx.say("（%s）" % Sect.add_contrib(6))
		return
	if not _errand_ready():
		await ctx.say(_ke("這幾天山下沒什麼要辦的。過 %d 天再來問。" % (ERRAND_DAYS - (G.day - int(e.day)))))
		return
	if not e.is_empty() and not e.get("done", false):
		await ctx.say(_ke("上回那件差事過期了，我另外找人辦了。"))
	var trade: GDScript = load("res://story/mq_trade.gd")
	var tea := floori(float(load("res://story/mq_fund.gd").fund().tea))
	if tea >= trade.TEA_RUN_MIN:
		if await ctx.ask(_ke("製茶房存了 %d 斤茶，勞煩你送進臨江城的泉霧茶莊，交給梁敬亭上架。%d 天內送到。" % [tea, TEA_DAYS]), ["接下", "先不了"]) != 0:
			return
		trade.take_tea_run(TEA_DAYS)
		await ctx.say("（接下送茶的差事：%d 斤茶，到臨江城的泉霧茶莊）" % tea)
		return
	var pick: Array = ERRANDS[G.day % ERRANDS.size()]
	if await ctx.ask(_ke("%s。勞煩你下山到臨江城%s買%s %d 件，%d 天內帶回來。錢先墊著，回來照價報帳。" % [pick[3], pick[2], ctx.item_name(pick[0]), pick[1], ERRAND_DAYS]), ["接下", "先不了"]) != 0:
		return
	G.life.mq_errand = {"kind": "buy", "item": pick[0], "n": pick[1], "day": G.day, "due": G.day + ERRAND_DAYS - 1}
	await ctx.say("（接下了外務差事）")


static func _patrol(ctx: Ctx) -> void:
	if _daily_done("mq:post:patrol"):
		await ctx.say("今天已經巡過山了。")
		return
	if not await Train.exert(ctx, 20, "已經累得走不動了，巡山得等明天。"):
		return
	_mark("mq:post:patrol")
	ctx.pass_time(8)
	var r := randf()
	await ctx.say("你沿著山門、後山、菜圃與思過崖下的小路，巡了一大圈。")
	if r < 0.2:
		await ctx.say("菜圃那頭一陣騷動——一頭山豬拱破了籬笆，正大嚼卜師傅的蘿蔔！")
		if await ctx.battle("boar") == "win":
			await ctx.say("山豬負痛逃回林子裡。你把籬笆扶正，回去跟卜大勺說了一聲。")
			await ctx.say("（%s）" % Sect.add_contrib(2))
		else:
			await ctx.say("山豬撞開你，一溜煙跑了。你揉著腰，把籬笆扶正。")
	elif r < 0.4:
		await ctx.say("石縫裡長著幾株止血草，你順手採了下來。")
		await ctx.give("herb", 2)
	elif r < 0.55:
		await ctx.say("林子裡有個樵夫迷了路，天快黑了還在打轉。你把他領到山路上，他千恩萬謝地下山去了。")
		ctx.fame(1)
	else:
		await ctx.say(["山上一切太平，只有幾隻松鼠在樹上吵架。", "山門的石階有一塊鬆了，你記下來，回頭請人修。", "後山的泉水比前幾天漲了些，看來上游下過雨。"].pick_random())
	await ctx.say("（巡了一個時辰）\n（%s）" % Sect.add_contrib(3))


static func _pick_watch(ctx: Ctx) -> void:
	var cur: String = _life().watcher_on(G.day)
	if int(_st().get("watch_pick", {}).get("day", 0)) == G.day:
		await ctx.say("今晚的守夜已經排好了：%s。" % ("你自己" if cur == "hero" else name_of(cur)))
		return
	var pool: Array = _life().WATCH_ORDER.filter(func(id): return not _life().away(id))
	var i := await ctx.ask("今晚照輪是%s守夜。要改排誰？" % ("你" if cur == "hero" else name_of(cur)), pool.map(func(id): return name_of(id)) + ["我自己", "照輪就好"])
	if i > pool.size():
		return
	var who: String = "hero" if i == pool.size() else pool[i]
	_st().watch_pick = {"day": G.day, "who": who}
	await ctx.say("（今晚你自己守夜。亥時到子時到大殿前敲更鼓）" if who == "hero" else "（今晚改由%s守夜）" % name_of(who))


## 典儀執事：主持一場比試（你挑兩個人上場、唱名、判勝負）
static func host_match(ctx: Ctx) -> void:
	var pool: Array = _life().FIGHTERS.filter(func(id): return not _life().away(id))
	var a: String = pool[await ctx.ask("你站到台中。先叫誰上場？", pool.map(func(id): return name_of(id)))]
	var rest := pool.filter(func(x): return x != a)
	var b: String = rest[await ctx.ask("%s上場了。對手是誰？" % name_of(a), rest.map(func(id): return name_of(id)))]
	var pa := power_of(a) * (0.8 + randf() * 0.4)
	var pb := power_of(b) * (0.8 + randf() * 0.4)
	var win := a if pa >= pb else b
	var lose := b if pa >= pb else a
	ctx.pass_time(4)
	await ctx.say(["你高聲唱名：「%s對%s——點到為止，開始！」" % [name_of(a), name_of(b)],
		"兩人你來我往，鬥了四五十招仍分不出高下。最後%s搶到半步先機，劍尖點在%s肩頭。" % [name_of(win), name_of(lose)] if absf(pa - pb) < 5 else "%s出手又快又穩，不到十招就逼得%s收劍認輸。" % [name_of(win), name_of(lose)],
		"你判%s勝。兩人互相行禮下場，圍觀的師兄弟一陣喝采。" % name_of(win)])
	_life().mem(win).power = float(_life().mem(win).power) + 0.4
	_life().mem(lose).power = float(_life().mem(lose).power) + 0.2
	_mark("mq:host")
	ctx.fame(1)
	await ctx.say("（主持了一場比試）\n（%s）" % Sect.add_contrib(4))


static func _festival_rite(ctx: Ctx) -> void:
	if _daily_done("mq:post:rite"):
		await ctx.say("今天的祭祖已經辦過了。")
		return
	_mark("mq:post:rite")
	ctx.pass_time(4)
	await ctx.say(["%s。你領著全派弟子在大殿列隊，點香、獻供、讀祝文。" % G.festival_of(), "祖師像前香煙裊裊，殿裡靜得只聽得見衣袂聲。禮成，弟子們依序上前三拜。", "（主持祭祖，花了半個時辰）"])
	ctx.fame(2)
	await ctx.say("（%s）" % Sect.add_contrib(5))


## 傳功長老：主講講武，聽的人實力都長一點
static func hero_lecture(ctx: Ctx) -> void:
	if _daily_done("mq:lecture"):
		await ctx.say("今天的講武已經講過了。")
		return
	var mine: Array = G.hero.skills.filter(func(s): return _mq()._sect_skill(s.id) or int(s.level) >= 3)
	if mine.is_empty():
		return
	var i := await ctx.ask("弟子們都坐好了，等你開講。今天講哪一門？", mine.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level]) + ["改天再講"])
	if i >= mine.size():
		return
	var sk: Dictionary = mine[i]
	_mark("mq:lecture")
	for id in _life().FIGHTERS:
		if not _life().away(id):
			_life().mem(id).power = float(_life().mem(id).power) + 0.6
	ctx.pass_time(4)
	await ctx.say(["你講「%s」：從起手的步法講到收勢的呼吸，再挑了兩招拆給大家看。" % Hero.skill_def(sk.id).name, "底下的弟子聽得入神，有人拿著樹枝在地上比劃。講到後來，你自己也想通了一兩處從前沒留意的地方。", "（講了半個時辰。聽講的同門都有長進）"])
	if Train.studyable(sk.id).size() > 0:
		await ctx.say(Train.apply(sk.id, 10, 1.0))
	await ctx.say("（%s）" % Sect.add_contrib(4))


static func _feuds() -> Array:
	var out := []
	for id in _life().GROW:
		var m: Dictionary = _life().mem(id)
		if m.has("feud") and int(m.feud.until) >= G.day and not out.any(func(x): return x[0] == m.feud.with and x[1] == id):
			out.append([id, m.feud.with])
	return out


static func _mediate(ctx: Ctx) -> void:
	var list := _feuds()
	if list.is_empty():
		await ctx.say("這幾天同門相安無事，沒有要調解的。")
		return
	var i := await ctx.ask("誰跟誰鬧了彆扭？", list.map(func(x): return "%s和%s" % [name_of(x[0]), name_of(x[1])]) + ["算了"])
	if i >= list.size():
		return
	var a: String = list[i][0]
	var b: String = list[i][1]
	ctx.pass_time(2)
	await ctx.say(["你把%s和%s叫到大殿，一個一個問清楚。原來是為了一點小事——誰占了誰的木樁、誰說了誰一句閒話。" % [name_of(a), name_of(b)], "你各打五十大板，罰兩人一起去挑十擔水。挑到第五擔，兩人已經有說有笑了。"])
	_life().mem(a).erase("feud")
	_life().mem(b).erase("feud")
	_news("%s和%s和好了" % [name_of(a), name_of(b)])
	await ctx.say("（%s）" % Sect.add_contrib(3))


static func _clinic(ctx: Ctx) -> void:
	if _daily_done("mq:post:clinic"):
		await ctx.say("今天已經看過診了。")
		return
	if not await Train.exert(ctx, 10, "已經累得手都在抖，這時候換藥只會幫倒忙。"):
		return
	_mark("mq:post:clinic")
	ctx.pass_time(2)
	var herb := ctx.take("herb")
	var who: String = _life().FIGHTERS.pick_random()
	await ctx.say(["藥堂裡排著幾個練功扭了腳、被木劍敲腫手腕的弟子。你一個一個看過，%s該推拿的推拿，該包紮的包紮。" % ("搗了止血草敷上，" if herb else ""), "%s的舊傷總算好了，直說要回去練劍。" % name_of(who), "（看診兩刻%s）" % ("，用了止血草 1 件" if herb else "")])
	_life().mem(who).power = float(_life().mem(who).power) + 0.3
	await ctx.say("（%s）" % Sect.add_contrib(3 if herb else 2))


## 值殿那裡的「職位的差事」（duty_talk 轉過來）
static func post_duty(ctx: Ctx) -> void:
	if leader():
		await ctx.say(_ke("掌門的事務，請到大殿正中的掌門座位處理。"))
		return
	var p := my_post()
	if p == "":
		return
	var d := post_def(p)
	var opts := []
	if p == "st_out":
		var e := _errand()
		var busy: bool = not e.is_empty() and not e.get("done", false) and G.day <= int(e.due)
		opts.append([("送茶的差事" if e.get("kind", "") == "tea" else "交差") if busy else "領山下的差事", "_outer_duty"])
		if load("res://story/mq_fund.gd").fund().has("rent_due"):
			opts.append(["田租的事", "_rent_note"])
	if p == "st_patrol":
		opts += [["巡山（一個時辰・體力 20）", "_patrol"], ["排今晚的守夜", "_pick_watch"]]
	if p == "st_rite" and G.festival_of() != "":
		opts.append(["主持祭祖（%s，半個時辰）" % G.festival_of(), "_festival_rite"])
	if p == "elder_law":
		opts.append(["調解吵架（%d 起）" % _feuds().size(), "_mediate"])
	if p == "elder_med":
		opts.append(["看診換藥（兩刻・體力 10）", "_clinic"])
	var i := await ctx.ask(_ke("%s有什麼吩咐？" % d[1]), opts.map(func(o): return o[0]) + ["職位說明", "沒事"])
	if i < opts.size():
		await Callable(load("res://story/mq_order.gd"), opts[i][1]).call(ctx)
	elif i == opts.size():
		await ctx.say([POST_NOTE[p], "（擔任%s，月例多 %d 兩；年會時%s）" % [d[1], d[4], "每年改選" if d[2] == "steward" else "長老席一直做到退位"]])


static func _rent_note(ctx: Ctx) -> void:
	var due: Dictionary = load("res://story/mq_fund.gd").fund().rent_due
	await ctx.say([_ke("青竹村祖田的%s租該收了，照例 %d 兩。到村裡找柳村長收，%d 天內收回來。" % [due.season, due.amount, int(due.due) - G.day + 1]), _ke("年成不好的話，佃戶會求減租。減不減，你看著辦——門裡要吃飯，村裡也要過日子。")])


# ── 掌門座位 ────────────────────────────────────────────

static func _appointable(p: Array) -> Array:
	var pool: Array = _mq().ROSTER.map(func(m): return m[0]).filter(func(k):
		if k in ["wen", "bu", "shao", "gan"] or away(k) or k == leader_key():
			return false
		var r := rank_now(k)
		if r in ["太上長老", "掌門"]:
			return false
		for q in POSTS:
			if q[0] != p[0] and holder_of(q[0]) == k:
				return false
		return at_least(r, "內門弟子") if p[2] == "elder" else (at_least(r, "正式弟子") and r != "長老"))
	pool.sort_custom(func(a, b): return power_of(a) > power_of(b))
	return pool.slice(0, 5)


static func _appoint_menu(ctx: Ctx) -> void:
	var i := await ctx.ask("要任免哪個職位？", POSTS.map(func(p): return "%s：%s" % [p[1], name_of(holder_of(p[0])) if holder_of(p[0]) != "" else "（空著）"]) + ["算了"])
	if i >= POSTS.size():
		return
	var p: Array = POSTS[i]
	var pool := _appointable(p)
	var prev := holder_of(p[0])
	var j := await ctx.ask("%s：%s\n交給誰？" % [p[1], p[5]], pool.map(func(k): return "%s（%s）" % [name_of(k), rank_now(k)]) + ["空著", "算了"])
	if j > pool.size():
		return
	var who: String = "" if j == pool.size() else pool[j]
	if who == prev:
		await ctx.say("%s本來就是%s。" % [name_of(prev), p[1]])
		return
	var st := _st()
	if not st.has("ranks"):
		st.ranks = {}
	if prev != "" and prev != "hero" and p[2] == "elder":
		if _roster_row(prev).size() > 0 and _roster_row(prev)[1] == "長老":
			st.ranks[prev] = {"rank": "長老", "role": "長老（未掌職）"}
		else:
			st.ranks.erase(prev)
	if who != "":
		seat(p, who)
	else:
		if not st.has("posts"):
			st.posts = {}
		st.posts[p[0]] = ""
	_news("掌門任命%s為%s" % [name_of(who), p[1]] if who != "" else "%s一職暫時空著" % p[1])
	await ctx.say("你當眾宣布：「%s，由%s擔任。」%s上前行禮領命。" % [p[1], name_of(who), name_of(who)] if who != "" else "%s一職暫時空著。" % p[1])


static func _policy_menu(ctx: Ctx) -> void:
	var cur: String = _st().get("policy", "steady")
	var keys := POLICY.keys()
	var i := await ctx.ask("現在的方針是「%s」。要改嗎？" % POLICY[cur][0], keys.map(func(k): return "%s：%s" % POLICY[k]) + ["不改"])
	if i >= keys.size() or keys[i] == cur:
		return
	_st().policy = keys[i]
	_news("掌門定下門派方針「%s」" % POLICY[keys[i]][0])
	await ctx.say("你召集眾弟子，宣布往後門裡以「%s」為方針。" % POLICY[keys[i]][0])


static func _sect_news(ctx: Ctx) -> void:
	var counts := ["記名弟子", "正式弟子", "內門弟子", "真傳弟子"].map(func(r): return "%s %d 人" % [r, _mq().ROSTER.filter(func(m): return rank_now(m[0]) == r).size()])
	var n: Array = _st().news.slice(-6)
	n.reverse()
	await ctx.say(["門下：%s（記名弟子另有十來人）。方針：%s。" % ["、".join(counts), POLICY[_st().get("policy", "steady")][0]],
		"近來的事：\n%s" % "\n".join(n.map(func(x): return "・" + x.text)) if n.size() > 0 else "近來門裡沒什麼大事。"])


static func _meeting(ctx: Ctx) -> void:
	await annual_meeting(ctx)


static func _industry(ctx: Ctx) -> void:
	await load("res://story/mq_industry.gd").industry_menu(ctx)


## 大殿正中的掌門座位（你是掌門時；處理了回傳 true）
static func chair(ctx: Ctx) -> bool:
	if not leader():
		return false
	var opts := []
	if meeting_pending():
		opts.append(["主持年會", "_meeting"])
	opts += [["任免職位", "_appoint_menu"], ["門派方針", "_policy_menu"], ["門派產業", "_industry"], ["門派近況", "_sect_news"]]
	var i := await ctx.ask("你在掌門的座位坐下。殿裡的香煙繚繞，祖師像靜靜地看著你。", opts.map(func(o): return o[0]) + ["起身"])
	if i < opts.size():
		await Callable(load("res://story/mq_order.gd"), opts[i][1]).call(ctx)
	return true


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	if not member():
		return []
	var out := []
	var t := func(text: String, done := false, note := "") -> Dictionary: return {"text": text, "state": "done" if done else "todo", "note": note}
	for d in 6:
		if not leader() and is_meeting_day(G.day + d) and int(_st().get("meeting_year", 0)) != int(G.date_of(G.day + d).year):
			out.append(t.call("%d 天後是門派年會（正月十六，大殿找掌門）" % d if d > 0 else "今天是門派年會（辰時到午時，大殿找掌門）", false, "你有投票權，也能競選執事" if int(G.sect.rank) >= 2 else ""))
	if leader() and meeting_pending():
		out.append(t.call("今天是年會：到大殿正中的掌門座位主持"))
	for k in apprentices():
		if int(_life().mem(k).get("taught_day", 0)) != G.day:
			out.append(t.call("指點徒弟%s" % name_of(k)))
	var p := my_post()
	if p == "st_out":
		var e := _errand()
		if not e.is_empty() and not e.get("done", false) and G.day <= int(e.due):
			if e.get("kind", "") != "tea":
				out.append(t.call("外務差事：買%s %d 件交給柯靜言" % [Ui.item_def(e.item).get("name", e.item), e.n], false, "還有 %d 天" % (int(e.due) - G.day + 1)))
		elif _errand_ready():
			out.append(t.call("外務執事：找柯靜言領山下的差事"))
	if p == "st_patrol":
		out.append(t.call("巡山一圈（找值殿的柯靜言）", _daily_done("mq:post:patrol")))
	if p == "st_rite" and G.festival_of() != "":
		out.append(t.call("主持%s祭祖" % G.festival_of(), _daily_done("mq:post:rite")))
	if p == "st_rite" and _life().is_meet_day():
		out.append(t.call("比武小會可以由你唱名主持（未時，找陸鳴川）", _daily_done("mq:host")))
	if p == "elder_teach" and _life().is_lecture_day():
		out.append(t.call("今天輪你講武（申時，練功房）", _daily_done("mq:lecture")))
	if p == "elder_law" and _feuds().size() > 0:
		out.append(t.call("有 %d 起同門吵架等你調解" % _feuds().size()))
	if p == "elder_med":
		out.append(t.call("藥堂看診換藥", _daily_done("mq:post:clinic")))
	return out


## 開發用：直接當上掌門（run:mq_order/debug_leader）或外務執事（run:mq_order/debug_out）
static func debug_leader(_ctx: Ctx) -> void:
	_hand_over("hero")


static func debug_out(_ctx: Ctx) -> void:
	seat(post_def("st_out"), "hero")
