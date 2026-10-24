## 鳴泉劍派的產業（照網頁版 story/mq_industry.ts）：資源、設施與掌門的經營決策。
## - 設施（mq_fund.gd 的 FACILITIES）：伐木場（開局就有一級）、採石場、藥圃擴建、茶園擴建，各兩級。
##   營造要銀兩、木料、石料（不夠的照價買）與天數；蓋好以後每天付工錢。伐木場、採石場有工頭（樊守林、鄔石生），
##   白天記名弟子輪流去幫工（life_mingquan.crew_of）；你可以找工頭（或幫工的同門）一起幹活。產出與賣出在 mq_fund.settle。
## - 掌門座位的「門派產業」（industry_menu，職位與掌門在 story/mq_order.gd）：營造、拆掉、茶莊開關、月例成數、用度、支用公款與歸還。
##   支用公款遲早會被長老查帳發現（功績、交情都會掉，年會的票也少）。
## - 你不是掌門時，掌門每月初一照公庫好壞自己決定：吃緊就節儉、寬裕就營造下一座設施、茶莊收了就重開。
## - 小事件（一次一件，fund.event）：山林失火、採石場塌方、好石脈、茶價起落、地痞到茶莊鬧事、藥圃鬧蟲害、香客捐獻。
##   失火、塌方找工頭；地痞找泉霧茶莊的梁敬亭（mq_trade 呼叫 thugs_option）；蟲害幫甘伯禾除蟲（mq_fund）。沒人處理的，過幾天自己過去（損失多一些）。
## 每天的部分由 mq_fund.settle 最後呼叫 on_settle。沒有用到旗標（幫工的次數記在 G.life.daily 的 "mq:ridge"）。

const Train := preload("res://story/train.gd")
const Chores := preload("res://story/chores.gd")
const MqFund := preload("res://story/mq_fund.gd")

const LEVEL := ["", "一級", "二級"]
const FOREMAN := {"lumber": "樊守林", "quarry": "鄔石生"}
const EVENT_CHANCE := 1.0 / 30.0
## 支用公款被發現的機會：每天基本一分，多拿一千兩多半分
const CAUGHT := {"base": 0.01, "per1000": 0.005, "max": 0.08}
## 你不是掌門時，掌門照這個順序一座座蓋
const NPC_ORDER := [["quarry", 1], ["herbs", 1], ["teagarden", 1], ["lumber", 2], ["herbs", 2], ["quarry", 2], ["teagarden", 2]]
const REOPEN := 100
const TAKE := [100, 300, 1000]
const RIDGE_HELP := {"per_day": 2, "contrib": 2, "wood": 2, "stone": 1}
const WORK := {"lumber": ["伐木", "chop", {"slot": "outer", "exp": 10}], "quarry": ["採石", "quarry", {"slot": "outer", "exp": 12}]}
const EVENT_NAME := {"fire": "南嶺松林失火", "collapse": "採石場塌方", "vein": "採石場鑿到好石脈", "teaprice": "茶價起落", "thugs": "地痞在茶莊鬧事", "blight": "藥圃鬧蟲害"}
const ECONOMY := {"thrift": ["節儉", "伙食、修繕都省著用（開銷少兩三成），同門長進稍慢"], "normal": ["照常", "不特別省，也不特別往外跑"],
	"enterprise": ["開源", "多接委託、產業多出力（收入多），同門練功的時間少了些"]}


static func _f() -> Dictionary:
	return MqFund.fund()


static func _news(text: String) -> void:
	load("res://story/life_mingquan.gd")._news(text, [])


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _fac_text(id: String) -> String:
	var lv := MqFund.fac_level(id)
	return "%s（%s）" % [MqFund.FACILITIES[id].name, LEVEL[lv]] if lv > 0 else ""


static func _leader() -> bool:
	return G.sect.get("leader", false)


# ── 營造 ──────────────────────────────────────────────

## 下一級要花多少：{L 那一級, buy_wood, buy_stone, silver, level}；已經最高是空的
static func build_cost(id: String) -> Dictionary:
	var lv := MqFund.fac_level(id)
	var levels: Array = MqFund.FACILITIES[id].levels
	if lv >= levels.size():
		return {}
	var L: Array = levels[lv]
	var bw := maxf(0, float(L[1]) - float(_f().wood))
	var bs := maxf(0, float(L[2]) - float(_f().stone))
	return {"L": L, "buy_wood": bw, "buy_stone": bs, "silver": int(L[0]) + ceili(bw * MqFund.MATERIAL.wood[3] + bs * MqFund.MATERIAL.stone[3]), "level": lv + 1}


static func start_build(id: String, who: String) -> void:
	var f := _f()
	var c := build_cost(id)
	MqFund.book("out", "build", c.silver)
	f.wood = maxf(0, float(f.wood) - float(c.L[1]))
	f.stone = maxf(0, float(f.stone) - float(c.L[2]))
	f.build = {"id": id, "level": c.level, "done": G.day + int(c.L[3])}
	_news("%s下令營造%s%s，%d 天完工" % [who, MqFund.FACILITIES[id].name, "（擴建到%s）" % LEVEL[c.level] if int(c.level) > 1 else "", c.L[3]])


static func _demolish(id: String) -> void:
	var f := _f()
	var L := MqFund.fac_now(id)
	f.wood = float(f.wood) + floorf(float(L[1]) / 2)
	f.stone = float(f.stone) + floorf(float(L[2]) / 2)
	f.fac[id] = MqFund.fac_level(id) - 1
	_news("掌門下令拆了%s%s" % [MqFund.FACILITIES[id].name, "的擴建" if MqFund.fac_level(id) > 0 else ""])


# ── 小事件 ─────────────────────────────────────────────

static func _roll_event() -> void:
	var f := _f()
	if f.has("event") or randf() >= EVENT_CHANCE:
		return
	var kinds := ["donation", "teaprice", "blight"]
	if MqFund.fac_level("lumber") > 0:
		kinds.append("fire")
	if MqFund.fac_level("quarry") > 0:
		kinds += ["collapse", "vein"]
	if not f.shop.get("closed", false):
		kinds.append("thugs")
	var day := G.day
	match kinds.pick_random():
		"donation":
			var n := 200 + randi() % 201
			MqFund.book("in", "incense", n)
			_news("山下一位富商來上香還願，捐了 %d 兩香油錢" % n)
		"fire":
			f.event = {"kind": "fire", "day": day, "until": day + 8}
			f.wood = float(f.wood) * 0.7
			_news("南嶺的松林起火了，樊守林帶人在救，伐木場停工")
		"collapse":
			f.event = {"kind": "collapse", "day": day, "until": day + 10}
			_news("採石場的石壁塌了一角，碎石堵住了場子，鄔石生說要清好幾天")
		"vein":
			f.event = {"kind": "vein", "day": day, "until": day + 60, "mult": 1.6}
			_news("鄔石生在石壁裡鑿出一道好石脈，石料又整又好打，採石場這兩個月出得多")
		"teaprice":
			var up := randf() < 0.5
			f.event = {"kind": "teaprice", "day": day, "until": day + 30, "mult": 1.4 if up else 0.7}
			_news("城裡的茶價漲了，聽說是北方的茶路斷了，這個月泉霧茶好賣" if up else "南邊的新茶大批進城，茶價跌了，這個月茶賣不起價")
		"thugs":
			f.event = {"kind": "thugs", "day": day, "until": day + 10}
			_news("臨江城的地痞蔡三一夥在泉霧茶莊門口鬧事，客人都不敢進門")
		"blight":
			f.event = {"kind": "blight", "day": day, "until": day + 10}
			_news("藥圃鬧了蟲害，甘伯禾說再不除蟲，這一季的藥材要毀了")


## 沒人處理、時候到了：事情自己過去（損失多一些）
static func _expire_event() -> void:
	var f := _f()
	if not f.has("event") or G.day <= int(f.event.until):
		return
	var k: String = f.event.kind
	f.erase("event")
	match k:
		"fire":
			_news("南嶺的火總算撲滅了，燒掉不少松木，伐木場重新開工")
		"collapse":
			MqFund.book("out", "upkeep", 100)
			_news("採石場的碎石清完了，雇了山下的人手，花了 100 兩")
		"thugs":
			MqFund.book("out", "shopwage", 60)
			_news("梁敬亭塞了 60 兩給蔡三，破財消災，茶莊重新做生意")
		"blight":
			f.herb = maxf(0, float(f.herb) - 10)
			_news("藥圃的蟲害過去了，毀了不少藥材")
		"vein":
			_news("採石場那道好石脈鑿完了")
		"teaprice":
			_news("茶價回到了平常的行情")


static func _clear_event(kind: String) -> void:
	if _f().get("event", {}).get("kind", "") == kind:
		_f().erase("event")


# ── 每天結算時：完工、小事件、掌門的決策、查帳 ─────────────────

## 你不是掌門時，掌門每月初一照公庫好壞決定
static func _npc_leader_plan() -> void:
	var f := _f()
	var mood := MqFund.mood()
	var want := "thrift" if mood in ["broke", "tight"] else "normal"
	if f.get("economy", "normal") != want:
		f.economy = want
		_news("公庫吃緊，掌門吩咐這陣子伙食、修繕都省著用" if want == "thrift" else "公庫緩過來了，掌門說不必再省得那麼緊")
	if float(f.get("pay_scale", 1.0)) != 1.0 and mood != "broke":
		f.pay_scale = 1.0
		_news("掌門吩咐，月例照常發")
	if f.shop.get("closed", false) and mood in ["ok", "rich"] and float(f.silver) > REOPEN * 3:
		MqFund.book("out", "build", REOPEN)
		f.shop.closed = false
		_news("泉霧茶莊重新開張，梁敬亭又站回了櫃台")
	if f.has("build"):
		return
	for nx in NPC_ORDER:
		if MqFund.fac_level(nx[0]) == int(nx[1]) - 1:
			var c := build_cost(nx[0])
			if not c.is_empty() and float(f.silver) - c.silver > MqFund.monthly_out() * 4:
				start_build(nx[0], "掌門")
			return


static func on_settle() -> void:
	var f := _f()
	var d := G.date_of()
	if f.has("build") and G.day >= int(f.build.done):
		var id: String = f.build.id
		var level := int(f.build.level)
		f.fac[id] = level
		f.erase("build")
		_news("%s%s%s" % [MqFund.FACILITIES[id].name, "擴建到%s" % LEVEL[level] if level > 1 else "蓋好了", "，%s帶著工具上了南嶺" % FOREMAN[id] if FOREMAN.has(id) else ""])
	_expire_event()
	_roll_event()
	if int(d.date) == 1 and not _leader():
		_npc_leader_plan()
	if int(d.date) == 1 and float(f.get("scandal", 0)) > 0:
		f.scandal = maxf(0, float(f.scandal) - 2)
	var owed := float(f.get("embezzled", 0))
	if owed > 0 and randf() < minf(CAUGHT.max, CAUGHT.base + owed / 1000.0 * CAUGHT.per1000):
		_caught()


## 長老查帳，發現掌門支走的公款
static func _caught() -> void:
	var f := _f()
	var n := float(f.embezzled)
	f.scandal = minf(30, float(f.get("scandal", 0)) + maxf(3, n / 50))
	f.erase("embezzled")
	if not G.sect.is_empty():
		G.sect.merit = maxi(0, int(G.sect.merit) - roundi(n / 10))
	for p in ["han", "lu", "wen"]:
		var r := Social._mut(p)
		r.aff = clampi(int(r.aff) - mini(15, 4 + roundi(n / 100)), -100, 100)
	_news("韓靖秋查帳時發現公庫短了 %d 兩，追下去是掌門支走的。門裡議論紛紛" % roundi(n))


# ── 南嶺：牌子、木料堆、石料堆 ─────────────────────────────

static func ridge_sign(ctx: Ctx) -> void:
	var lines := []
	lines.append("伐木場：%s，工頭樊守林" % LEVEL[MqFund.fac_level("lumber")] if MqFund.fac_level("lumber") > 0 else "西坡的松林還沒人砍。")
	lines.append("採石場：%s，工頭鄔石生" % LEVEL[MqFund.fac_level("quarry")] if MqFund.fac_level("quarry") > 0 else "東面的石壁還沒開採（要掌門下令營造採石場）。")
	await ctx.say(["「南嶺」\n西坡松林・東面石壁\n本門山產，伐木採石歸公庫。", "\n".join(lines)])


static func log_pile(ctx: Ctx) -> void:
	await ctx.say(["劈好的松木一層層堆著，切口還滲著松脂，香氣沖鼻。", "（存著木料 %d 根；修繕自己用，多的逢九送下山賣）" % floori(float(_f().wood))])


static func stone_pile(ctx: Ctx) -> void:
	await ctx.say(["打好的青石方方正正地疊著，每一塊都鑿了鳴泉的記號。", "（存著石料 %d 方；修繕自己用，多的逢九送下山賣）" % floori(float(_f().stone))])


# ── 工頭：一起幹活、處理失火與塌方 ───────────────────────────

static func _helped() -> int:
	var d: Dictionary = G.life.get("daily", {})
	return int(d.get("mq:ridge_n", 0)) if int(d.get("mq:ridge", 0)) == G.day else 0


static func help_work(ctx: Ctx, fac: String, with_ := "") -> void:
	var job: Array = WORK[fac]
	var boss := _by(FOREMAN[fac])
	if _helped() >= RIDGE_HELP.per_day:
		await ctx.say(boss.call("今天你出的力夠多了，剩下的我們來。明天再來吧。"))
		return
	if G.weather in ["rain", "snow"]:
		await ctx.say(boss.call("下雨天山上滑，斧頭、鐵錘都拿不穩，今天收工。"))
		return
	if not await Train.exert(ctx, 15, "累得手都抬不起來，這活兒今天是幹不動了。"):
		return
	if with_ != "":
		await ctx.say("你在%s旁邊跟著%s，%s。" % [with_, job[0], "一人一邊拉大鋸" if fac == "lumber" else "一個扶鑿、一個掄錘"])
	else:
		await ctx.say(boss.call("來得好！斧頭在那兒。順著紋理劈，別跟木頭較勁。" if fac == "lumber" else "鐵鑿抵穩了再掄錘，手腕放鬆，力從腰上來。"))
	await ctx.work(job[1], "%s中……" % job[0])
	ctx.pass_time(8)
	if not G.life.has("daily"):
		G.life.daily = {}
	G.life.daily["mq:ridge_n"] = _helped() + 1
	G.life.daily["mq:ridge"] = G.day
	var got := ""
	if fac == "lumber":
		_f().wood = float(_f().wood) + RIDGE_HELP.wood
		got = "（多劈了 %d 根木料）" % RIDGE_HELP.wood
	else:
		_f().stone = float(_f().stone) + RIDGE_HELP.stone
		got = "（多打了 %d 方石料）" % RIDGE_HELP.stone
	await ctx.say(["一斧一斧下去，松木應聲裂開。一個時辰下來，虎口震得發麻。" if fac == "lumber" else "叮、叮、叮……石屑濺了一身。一個時辰下來，一塊青石總算方方正正。", "（做了一個時辰）"])
	await ctx.say("\n".join([got] + Chores.growth(job[2]) + [Sect.add_contrib(RIDGE_HELP.contrib)]))
	await load("res://story/schedule.gd").maybe_event(ctx, "chore")


## 救火、清理塌方：兩個時辰、體力 25，事情當場解決
static func _fix_event(ctx: Ctx, fac: String) -> void:
	var boss := _by(FOREMAN[fac])
	if not await Train.exert(ctx, 25, "累得站都站不穩，這時候上去只會添亂。"):
		return
	await ctx.work("water" if fac == "lumber" else "quarry", "救火中……" if fac == "lumber" else "清理碎石中……")
	ctx.pass_time(16)
	_clear_event("fire" if fac == "lumber" else "collapse")
	if fac == "lumber":
		await ctx.say(["你跟著大家挑水、砍出防火的空帶，煙燻得眼淚直流。", "天黑前，最後一處火頭也滅了。", boss.call("好險！多虧你，不然半片林子都要燒光。明天就能開工。"), "（忙了兩個時辰）"])
	else:
		await ctx.say(["你跟著大家把碎石一塊塊撬開、搬走，又把鬆動的石壁撐住。", boss.call("清乾淨了！省下雇人的錢。明天照常開鑿。"), "（忙了兩個時辰）"])
	await ctx.say("\n".join(Chores.growth({"slot": "outer", "exp": 16}) + [Sect.add_contrib(10)]))


static func _report(fac: String) -> Array:
	var f := _f()
	var L := MqFund.fac_now(fac)
	var crew: Dictionary = load("res://story/life_mingquan.gd").crew_of()
	var unit := "根" if fac == "lumber" else "方"
	var what := "木料" if fac == "lumber" else "石料"
	var out := ["場子現在是%s，晴天有人幫工，一天出 %s %s%s上下；下雨天、旬休出得少。" % [LEVEL[MqFund.fac_level(fac)], L[5], unit, what],
		"今天門裡派了%s來幫工。" % Life.npc_def(Life.group("mingquan"), crew[fac]).name if crew.has(fac) else "今天門裡沒派人來，我一個人做，出得少些。",
		"倉裡存著%s %d %s。門裡修房子先用，多的韋季安逢九帶下山賣。" % [what, floori(float(f.wood if fac == "lumber" else f.stone)), unit]]
	if fac == "quarry" and not MqFund.event_on("vein").is_empty():
		out.append("這陣子鑿到一道好石脈，石料出得特別多。")
	return out.map(func(t): return _by(FOREMAN[fac]).call(t))


static func _foreman(ctx: Ctx, fac: String) -> void:
	var boss := _by(FOREMAN[fac])
	if not Sect.member("mingquan"):
		await ctx.say(boss.call("我是鳴泉請來的伐木工頭，姓樊。這片松林是鳴泉的，外人別亂砍。" if fac == "lumber" else "我是鳴泉請來的石匠，姓鄔。石壁上碎石亂飛，站遠點。"))
		return
	var trouble := not MqFund.event_on("fire" if fac == "lumber" else "collapse").is_empty()
	var first := ("幫忙救火（兩個時辰・體力 25）" if fac == "lumber" else "幫忙清理塌方（兩個時辰・體力 25）") if trouble \
		else "幫忙%s（一個時辰・體力 15）%s" % [WORK[fac][0], "（今天做夠了）" if _helped() >= RIDGE_HELP.per_day else ""]
	var greet := ("火還沒滅！人手不夠，能幫就幫一把！" if fac == "lumber" else "石壁塌了一角，碎石堵著，什麼都做不了。") if trouble \
		else ("松木要趁天晴砍，有什麼事？" if fac == "lumber" else "鑿石頭急不得，有什麼事？")
	var c := await ctx.ask(boss.call(greet), [first, "場子的情形", "沒事"])
	if c == 0:
		if trouble:
			await _fix_event(ctx, fac)
		else:
			await help_work(ctx, fac)
	elif c == 1:
		await ctx.say(_report(fac))


static func foreman_lumber(ctx: Ctx) -> void:
	await _foreman(ctx, "lumber")


static func foreman_quarry(ctx: Ctx) -> void:
	await _foreman(ctx, "quarry")


## 在南嶺幫工的同門旁邊一起做（life_mingquan.options 轉過來）
static func help_with(ctx: Ctx) -> void:
	var w := ctx.walker()
	await help_work(ctx, "lumber" if w.get("act", "") == "chop" else "quarry", w.get("name", ""))


# ── 泉霧茶莊的地痞（mq_trade 的梁敬亭呼叫） ─────────────────

## 茶莊有地痞鬧事時，梁敬亭的選項 [文字, 腳本]；沒事是空的
static func thugs_option() -> Array:
	return ["趕走門口的地痞", "mq_industry/thugs_talk"] if not MqFund.event_on("thugs").is_empty() else []


static func thugs_talk(ctx: Ctx) -> void:
	var cai := _by("蔡三")
	await ctx.say([{"speaker": "梁敬亭", "text": "蔡三那夥人天天堵在門口，說這條街的茶莊都要交「茶水錢」。客人一個都不敢進來。"}, "你走出門口。蔡三蹺著腳坐在茶莊的長凳上，幾個手下圍著門。",
		cai.call("喲，鳴泉的人？山上的劍客也管山下的買賣？識相的，一個月二十兩，保你們平安。")])
	if await ctx.battle("shop_ruffians") == "win":
		_clear_event("thugs")
		await ctx.say([cai.call("哎喲……鳴泉的爺，小的再也不敢了！"), "蔡三一夥連滾帶爬地跑了。對門的掌櫃探出頭來，衝你拱了拱手。"])
		ctx.fame(2)
		await ctx.say("（%s）" % Sect.add_contrib(8))
		return
	await ctx.say([cai.call("鳴泉的劍也不過如此！明天再來收錢！"), "（地痞還在門口，茶莊照樣沒生意）"])


# ── 掌門座位：門派產業 ──────────────────────────────────

static func _pay_text() -> String:
	var s := float(_f().get("pay_scale", 1.0))
	return "多發兩成" if s > 1 else ("少發兩成" if s < 1 else "照常")


static func summary() -> String:
	var f := _f()
	var built := MqFund.FACILITIES.keys().map(func(id): return _fac_text(id)).filter(func(t): return t != "")
	var lines := ["公庫存銀 %d 兩（%s），木料 %d 根、石料 %d 方、藥材 %d 份。" % [roundi(float(f.silver)), MqFund.MOOD_NAME[MqFund.mood()], floori(float(f.wood)), floori(float(f.stone)), floori(float(f.herb))],
		"產業：%s；泉霧茶莊%s。" % ["、".join(built) if built.size() > 0 else "沒有", "收著" if f.shop.get("closed", false) else "開著"],
		"月例%s，用度%s。" % [_pay_text(), ECONOMY[f.get("economy", "normal")][0]]]
	if f.has("build"):
		lines.append("營造中：%s（%s），還要 %d 天。" % [MqFund.FACILITIES[f.build.id].name, LEVEL[int(f.build.level)], maxi(1, int(f.build.done) - G.day)])
	var e: String = f.get("event", {}).get("kind", "")
	if e != "" and not e in ["vein", "teaprice"]:
		lines.append("眼下的麻煩：%s" % EVENT_NAME[e])
	return "\n".join(lines)


static func _build_menu(ctx: Ctx) -> void:
	var f := _f()
	if f.has("build"):
		await ctx.say("%s還在營造，一次只蓋一處。" % MqFund.FACILITIES[f.build.id].name)
		return
	var ids := MqFund.FACILITIES.keys().filter(func(id): return not build_cost(id).is_empty())
	if ids.is_empty():
		await ctx.say("各處產業都已經蓋到最好了。")
		return
	var labels := ids.map(func(id):
		var c := build_cost(id)
		return "%s%s（%s）：%d 兩%s%s，%d 天" % [MqFund.FACILITIES[id].name, "擴建" if int(c.level) > 1 else "", LEVEL[c.level], c.silver,
			"、木料 %d" % c.L[1] if int(c.L[1]) > 0 else "", "、石料 %d" % c.L[2] if int(c.L[2]) > 0 else "", c.L[3]])
	var i := await ctx.ask("要營造哪一處？（不夠的木料、石料照價向山下買）", labels + ["算了"])
	if i >= ids.size():
		return
	var id: String = ids[i]
	var c := build_cost(id)
	var fd: Dictionary = MqFund.FACILITIES[id]
	await ctx.say("%s：%s\n在%s。蓋好後每天工錢 %s 兩%s。" % [fd.name, fd.desc, fd.where, c.L[4], "；木料、石料不夠，要另外買（已算在 %d 兩裡）" % c.silver if c.buy_wood > 0 or c.buy_stone > 0 else ""])
	if float(f.silver) < c.silver:
		await ctx.say("公庫只剩 %d 兩，不夠。" % roundi(float(f.silver)))
		return
	if await ctx.ask("動工嗎？", ["動工", "再想想"]) != 0:
		return
	start_build(id, "掌門")
	await ctx.say("你吩咐柯靜言找人動工。%s %d 天後完工。" % [fd.name, c.L[3]])


static func _demolish_menu(ctx: Ctx) -> void:
	var ids := MqFund.FACILITIES.keys().filter(func(id): return MqFund.fac_level(id) > 0)
	if ids.is_empty():
		await ctx.say("沒有可以拆的產業。")
		return
	var i := await ctx.ask("要拆掉哪一處？（拆一級；拆下來的木料、石料收回一半，往後不用再付工錢）", ids.map(func(id): return "%s：每天工錢 %s 兩" % [_fac_text(id), MqFund.fac_now(id)[4]]) + ["算了"])
	if i >= ids.size() or await ctx.ask("真的要拆%s？" % MqFund.FACILITIES[ids[i]].name, ["拆", "不拆了"]) != 0:
		return
	_demolish(ids[i])
	await ctx.say("你下令拆了%s。" % MqFund.FACILITIES[ids[i]].name)


static func _shop_menu(ctx: Ctx) -> void:
	var f := _f()
	if f.shop.get("closed", false):
		if await ctx.ask("泉霧茶莊收著。重新開張要 %d 兩（整理門面、請回夥計）。" % REOPEN, ["重新開張", "再等等"]) != 0:
			return
		if float(f.silver) < REOPEN:
			await ctx.say("公庫不夠。")
			return
		MqFund.book("out", "build", REOPEN)
		f.shop.closed = false
		_news("掌門下令泉霧茶莊重新開張")
		await ctx.say("泉霧茶莊重新開張。")
		return
	if await ctx.ask("泉霧茶莊開著：零賣比整批賣給茶行多五成，夥計工錢一天 %d 兩。收起來的話，茶都整批賣給茶行。" % MqFund.SHOP.wage, ["收起茶莊", "照常開著"]) != 0:
		return
	f.shop.closed = true
	_news("掌門下令收了泉霧茶莊，山上的茶改成整批賣給茶行")
	await ctx.say("你吩咐梁敬亭收了茶莊。往後的茶整批賣給茶行。")


static func _pay_menu(ctx: Ctx) -> void:
	var scales := [1.2, 1.0, 0.8]
	var i := await ctx.ask("月例現在%s。（多發，同門長進快一點；少發，公庫省一些，大家長進慢一點）" % _pay_text(), ["多發兩成", "照常", "少發兩成", "不改"])
	if i >= scales.size() or float(scales[i]) == float(_f().get("pay_scale", 1.0)):
		return
	_f().pay_scale = scales[i]
	_news(["掌門吩咐，月例多發兩成", "掌門吩咐，月例照常發", "掌門吩咐，這陣子月例少發兩成"][i])
	if i == 2:
		for p in ["lu", "han"]:
			load("res://story/mingquan.gd")._aff(p, -2)
	await ctx.say("你當眾宣布：「往後月例%s。」%s" % [["多發兩成", "照常發", "少發兩成"][i], ["弟子們喜形於色。", "", "底下有人低聲嘀咕。"][i]])


static func _economy_menu(ctx: Ctx) -> void:
	var cur: String = _f().get("economy", "normal")
	var keys := ECONOMY.keys()
	var i := await ctx.ask("門裡的用度現在是「%s」。" % ECONOMY[cur][0], keys.map(func(k): return "%s：%s" % ECONOMY[k]) + ["不改"])
	if i >= keys.size() or keys[i] == cur:
		return
	_f().economy = keys[i]
	_news("掌門吩咐，往後門裡的用度%s" % ECONOMY[keys[i]][0])
	await ctx.say("你吩咐柯靜言：往後門裡的用度，%s。" % ECONOMY[keys[i]][0])


## 支用公款：錢進你的口袋，帳上記「掌門支用」，遲早會被查到
static func _take_menu(ctx: Ctx) -> void:
	var f := _f()
	var owed := roundi(float(f.get("embezzled", 0)))
	if owed > 0:
		var c := await ctx.ask("你先前從公庫支了 %d 兩，帳上還掛著。" % owed, ["歸還 %d 兩" % owed, "再支一些", "算了"])
		if c == 0:
			if G.silver < owed:
				await ctx.say("你身上只有 %d 兩，不夠還。" % G.silver)
				return
			G.silver -= owed
			MqFund.book("in", "donate", owed)
			f.erase("embezzled")
			await ctx.say("你悄悄把錢放回公庫，帳也補平了。（銀兩 -%d）" % owed)
			return
		if c != 1:
			return
	var opts := TAKE.filter(func(n): return float(f.silver) - n > 0)
	var i := await ctx.ask("支用公款？（公私分明：掌門拿公庫的錢，長老查帳遲早會發現）", opts.map(func(n): return "支 %d 兩" % n) + ["算了"])
	if i >= opts.size():
		return
	var n: int = opts[i]
	MqFund.book("out", "leader", n)
	f.embezzled = float(f.get("embezzled", 0)) + n
	G.silver += n
	await ctx.say("你從公庫取了錢。帳上記著「掌門支用」四個字，墨跡還沒乾。（銀兩 +%d）" % n)


## 掌門座位的「門派產業」
static func industry_menu(ctx: Ctx) -> void:
	while true:
		var f := _f()
		var opts := [["營造（%s還在蓋）" % MqFund.FACILITIES[f.build.id].name if f.has("build") else "營造", "_build_menu"], ["拆掉", "_demolish_menu"],
			["泉霧茶莊（收著）" if f.shop.get("closed", false) else "泉霧茶莊（開著）", "_shop_menu"], ["月例", "_pay_menu"], ["用度", "_economy_menu"],
			["公款（支了 %d 兩）" % roundi(float(f.embezzled)) if float(f.get("embezzled", 0)) > 0 else "支用公款", "_take_menu"]]
		var i := await ctx.ask(summary(), opts.map(func(o): return o[0]) + ["起身"])
		if i >= opts.size():
			return
		await Callable(load("res://story/mq_industry.gd"), opts[i][1]).call(ctx)


## 今日事：眼下的麻煩
static func tasks() -> Array:
	if not Sect.member("mingquan") or not _f().has("event"):
		return []
	var e: Dictionary = _f().event
	var left := "還有 %d 天" % (int(e.until) - G.day + 1)
	var text: String = {"fire": "南嶺失火：找伐木場的樊守林幫忙救火", "collapse": "採石場塌方：找鄔石生幫忙清理",
		"thugs": "地痞在泉霧茶莊鬧事：到臨江城找梁敬亭", "blight": "藥圃鬧蟲害：到山田找甘伯禾幫忙除蟲"}.get(e.kind, "")
	return [{"text": text, "state": "todo", "note": left}] if text != "" else []


## 開發用：把採石場、伐木場都蓋到二級（run:mq_industry/debug_build）
static func debug_build(ctx: Ctx) -> void:
	_f().fac = {"lumber": 2, "quarry": 2, "herbs": 1, "teagarden": 1}
	ctx.refresh()
