class_name Social
## 人際關係（照網頁版 social.ts、story/social.ts）：熟悉度、階段、交談、對方問你、熟悉度事件、贈禮、切磋、請教、交易。
## - 人物檔案在 data/people.json：怎麼稱呼你（address：[條件, 稱呼]，條件可讀 stage、fame 與旗標）、不理人的條件（gate）、
##   劇情優先的腳本（story，回傳 true 表示處理了）、交談（每天前 per_day 次加 gain）、各階段台詞（lines，可帶 when 條件）、
##   聊夠了之後的閒話（idle）、收禮（gift.likes／dislikes）、切磋（spar）、請教（teach）、交易（trade）、事件（events）、
##   對方問你的問題（asks）。台詞裡可以寫 {稱}、{姓}、{名}。
## - 關係存在 G.relations[人物 id]（存檔）。面對有人物檔案的人：空白鍵交談，F 切磋、G 贈禮、R 請教、T 交易（依熟悉度逐步開放）。
## - 地圖上的人填 person（人物 id）就接上；腳本在 story/social.gd。

const STAGES := [[-100, "反感"], [0, "陌生"], [10, "點頭之交"], [30, "熟識"], [60, "知交"], [90, "莫逆之交"]]
const STRANGER := 1
const NOD := 2
const FAMILIAR := 3
const CLOSE := 4
## 動作：按鍵、名稱
const ACTIONS := {"talk": ["空白", "交談"], "spar": ["F", "切磋"], "gift": ["G", "贈禮"], "teach": ["R", "請教"], "trade": ["T", "交易"]}
const KEYS := {KEY_F: "spar", KEY_G: "gift", KEY_R: "teach", KEY_T: "trade"}

static var _people := {}


static func people() -> Dictionary:
	if _people.is_empty():
		var f := FileAccess.open("res://data/people.json", FileAccess.READ)
		_people = JSON.parse_string(f.get_as_text())
		for k in _people:
			_people[k].id = k
	return _people


static func def(id: String) -> Dictionary:
	return people().get(id, {})


## 關係（沒有就是全新的、還沒存進去）
static func rel(id: String) -> Dictionary:
	return G.relations.get(id, _new())


static func _new() -> Dictionary:
	return {"aff": 0, "talk_day": 0, "talk_n": 0, "chat_idx": 0, "gift_day": 0, "spar_day": 0, "teach_day": 0, "asked": [], "last": "", "known": [], "events": []}


## 要改關係時用這個（第一次會建起來，算「認識了」）
static func _mut(id: String) -> Dictionary:
	if not G.relations.has(id):
		G.relations[id] = _new()
	return G.relations[id]


static func met(id: String) -> bool:
	return G.relations.has(id)


static func stage_of(aff: int) -> int:
	var s := 0
	for i in STAGES.size():
		if aff >= STAGES[i][0]:
			s = i
	return s


static func stage(id: String) -> int:
	return stage_of(int(rel(id).aff))


static func stage_name(id: String) -> String:
	return STAGES[stage(id)][1]


static func gate_open(p: Dictionary) -> bool:
	return not p.has("gate") or Story.cond(p.gate.open)


## 對方怎麼稱呼你
static func address(p: Dictionary) -> String:
	var env := {"stage": stage(p.id), "fame": int(G.hero.get("fame", 0))}
	for r in p.get("address", []):
		if Story.cond(r[0], env):
			return _names(r[1])
	return "你"


static func _names(t: String) -> String:
	var sur: String = G.hero.get("surname", "")
	var given: String = G.hero.get("given", "")
	return t.replace("{姓}", sur if sur != "" else given).replace("{名}", given)


## 代入台詞裡的 {稱}、{姓}、{名}
static func fmt(p: Dictionary, lines: Array) -> Array:
	var a := address(p)
	var out := []
	for l in lines:
		var d: Dictionary = {"text": l} if l is String else (l as Dictionary).duplicate()
		d.text = _names(String(d.text).replace("{稱}", a))
		out.append(d)
	return out


## 目前能對這個人做的事（stall：他正顧著攤子，可以買賣）
static func actions(id: String, stall := false) -> Array:
	var p := def(id)
	if p.is_empty() or not gate_open(p):
		return ["talk"]
	var s := stage(id)
	var out := ["talk"]
	if p.has("spar") and s >= int(p.spar.stage):
		out.append("spar")
	if p.has("gift"):
		out.append("gift")
	if p.has("teach") and (s >= int(p.teach.stage) or is_master(id)):
		out.append("teach")
	if p.has("trade") or stall:
		out.append("trade")
	return out


## 這個人是不是你拜的師父（真傳弟子拜的長老，G.sect.master）：不看熟悉度就肯教，請教時領悟多五成
static func is_master(id: String) -> bool:
	return G.sect.get("master", "") == id


## 改變熟悉度：右上角冒通知；跨過階段時說出來，並說明新開放的互動
static func add_aff(ctx: Ctx, p: Dictionary, n: int) -> void:
	if n == 0:
		return
	var r := _mut(p.id)
	var before := stage_of(int(r.aff))
	r.aff = clampi(int(r.aff) + n, -100, 100)
	ctx.ui.notify("%s 熟悉度 %s%d" % [p.name, "+" if n > 0 else "", n], Color("c8a0d8") if n > 0 else Color("a8a8a8"))
	var after := stage_of(int(r.aff))
	if after == before:
		return
	var notes := []
	if after > before:
		if p.has("spar") and before < int(p.spar.stage) and after >= int(p.spar.stage):
			notes.append("可以和%s切磋了（按 F）" % p.name)
		if p.has("teach") and before < int(p.teach.stage) and after >= int(p.teach.stage):
			notes.append("可以向%s%s了（按 R）" % [p.name, p.teach.get("note", "請教武學")])
	await ctx.say("（你和%s的關係變成了「%s」）%s" % [p.name, STAGES[after][1], ("\n" + "\n".join(notes)) if notes.size() > 0 else ""])


static func _usable(c) -> bool:
	return c is Array or Story.cond(c.get("when", ""))


static func _lines(c) -> Array:
	return c if c is Array else c.lines


# ── 交談 ────────────────────────────────────────────────

static func talk(ctx: Ctx, id: String) -> void:
	var p := def(id)
	_mut(id)
	if not gate_open(p):
		await ctx.say(fmt(p, p.gate.refuse))
		return
	if p.has("story") and await Story.run_bool(p.story, ctx):
		return
	var r := _mut(id)
	# 熟悉度到了的事件，下次交談時觸發
	for ev in p.get("events", []):
		if int(r.aff) >= int(ev.at) and not ev.id in r.events:
			r.events.append(ev.id)
			await ctx.say(fmt(p, ev.lines))
			if ev.has("give"):
				await ctx.give(ev.give[0], int(ev.give[1]))
			if ev.has("flag"):
				ctx.set_flag(ev.flag)
			return
	var today: int = int(r.talk_n) if int(r.talk_day) == G.day else 0
	if today < int(p.talk.per_day):
		r.talk_day = G.day
		r.talk_n = today + 1
		var s := stage(id)
		# 偶爾換對方問你問題
		var ask := {}
		for a in p.get("asks", []):
			if int(a.get("stage", 0)) <= s and not a.id in r.asked:
				ask = a
				break
		if not ask.is_empty() and randf() < 0.4:
			r.asked.append(ask.id)
			var q: Dictionary = fmt(p, [{"speaker": p.name, "text": ask.q}])[0]
			var opts := []
			for a in ask.answers:
				opts.append(_names(a.say))
			var c := await ctx.ask(q, opts)
			var ans: Dictionary = ask.answers[c]
			await ctx.say(fmt(p, [{"speaker": p.name, "text": ans.reply}]))
			await add_aff(ctx, p, int(p.talk.gain) + int(ans.aff))
			return
		# 說目前這一階（以及之前各階）的話：這一階的機會比較大，不跟上一次重複
		var pool := []
		var tiers := []
		for k in p.lines:
			if int(k) <= s:
				tiers.append(int(k))
		tiers.sort()
		tiers.reverse()
		for i in tiers.size():
			var list: Array = p.lines[str(tiers[i])]
			for j in list.size():
				if _usable(list[j]):
					for n in (2 if i == 0 else 1):
						pool.append("%d:%d" % [tiers[i], j])
		var fresh := pool.filter(func(k): return k != r.last)
		var from: Array = fresh if fresh.size() > 0 else pool
		if from.size() > 0:
			var key: String = from[randi() % from.size()]
			r.last = key
			var tj := key.split(":")
			await ctx.say(fmt(p, _lines(p.lines[tj[0]][int(tj[1])])))
		await add_aff(ctx, p, int(p.talk.gain))
		return
	# 今天聊夠了：輪流閒聊（不再加熟悉度），或說在忙
	var idle: Array = p.idle.filter(_usable) if p.talk.after == "chat" else []
	r.chat_idx = int(r.chat_idx) + 1
	if idle.size() > 0:
		await ctx.say(fmt(p, _lines(idle[int(r.chat_idx) % idle.size()])))
	else:
		var busy := ["%s：「我還有事要忙，改天再聊吧。」" % p.name, "%s擺擺手：「今天就先這樣吧。」" % p.name]
		await ctx.say(busy[int(r.chat_idx) % busy.size()])


# ── 贈禮 ────────────────────────────────────────────────

static func gift(ctx: Ctx, id: String) -> void:
	var p := def(id)
	if not p.has("gift"):
		await ctx.say(fmt(p, p.get("refuse_gift", [{"text": "%s搖搖頭：「無功不受祿。」" % p.name}])))
		return
	var items: Array = G.bag.keys().filter(func(k): return int(G.bag[k]) > 0 and not Ui.item_def(k).has("manual") and not Ui.item_def(k).get("bound", false))
	if items.is_empty():
		await ctx.say("身上沒有可以送的東西。")
		return
	var shown := items.slice(0, 8)
	var opts := []
	for it in shown:
		var known: bool = it in rel(id).known
		opts.append("%s（%d）%s" % [ctx.item_name(it), G.bag[it], ("　♥" if p.gift.likes.has(it) else "　✕") if known else ""])
	opts.append("算了")
	var i := await ctx.ask("要送什麼給%s？" % p.name, opts)
	if i >= shown.size():
		return
	var item: String = shown[i]
	var r := _mut(id)
	# 支線要的東西不受每天一次的限制
	if p.has("on_gift"):
		ctx.extra["item"] = item
		if await Story.run_bool(p.on_gift, ctx):
			ctx.take(item)
			if p.gift.likes.has(item) and not item in r.known:
				r.known.append(item)
			await add_aff(ctx, p, int(p.gift.likes.get(item, 1)) + 10)
			return
	if int(r.gift_day) == G.day:
		await ctx.say("%s：「今天已經收過你的禮了，心意我明白。」" % p.name)
		return
	ctx.take(item)
	r.gift_day = G.day
	var like := int(p.gift.likes.get(item, 0))
	var dislike := int(p.gift.get("dislikes", {}).get(item, 0))
	if (like > 0 or dislike > 0) and not item in r.known:
		r.known.append(item)
	if like > 0:
		await ctx.say("%s眼睛一亮，看得出很喜歡這份「%s」。" % [p.name, ctx.item_name(item)])
	elif dislike > 0:
		await ctx.say("%s皺了皺眉，勉強收下了「%s」。" % [p.name, ctx.item_name(item)])
	else:
		await ctx.say("%s客氣地收下了「%s」。" % [p.name, ctx.item_name(item)])
	await add_aff(ctx, p, like if like > 0 else (-dislike if dislike > 0 else 1))


# ── 切磋、請教、交易 ────────────────────────────────────

static func spar(ctx: Ctx, id: String) -> void:
	var p := def(id)
	var r := _mut(id)
	if int(r.spar_day) == G.day:
		await ctx.say("%s：「今天已經比過了，明天再來！」" % p.name)
		return
	if await ctx.ask("要和%s切磋嗎？（點到為止，輸了也不會受重傷）" % p.name, ["請賜教", "改天吧"]) != 0:
		return
	r.spar_day = G.day
	var o := await ctx.battle(p.spar.encounter)
	if o == "win":
		await ctx.say("%s收招抱拳：「好身手！佩服。」" % p.name)
	elif o == "lose":
		await ctx.say("%s收招一笑：「承讓了。」" % p.name)
	else:
		await ctx.say("你拱手認輸，%s笑著點了點頭。" % p.name)
	await add_aff(ctx, p, int(p.spar.win) if o == "win" else int(p.spar.lose))


static func teach(ctx: Ctx, id: String) -> void:
	var p := def(id)
	var r := _mut(id)
	# 不是教武學的（例如鍾嬸教做菜）：交給 teach.script
	if p.teach.has("script"):
		await Story.run(p.teach.script, ctx.scene, ctx.extra)
		return
	if int(r.teach_day) == G.day:
		await ctx.say("%s：「貪多嚼不爛，今天就到這裡。」" % p.name)
		return
	var ready := []
	for s in G.hero.skills:
		var nx := Hero.next_move(s)
		if not nx.is_empty() and s.level >= int(nx.level):
			ready.append(s)
	if ready.is_empty():
		var ms: String = G.sect.get("master_skill", "")
		var mk := Hero.find_skill(G.hero, ms) if is_master(id) and ms != "" else {}
		if not mk.is_empty() and mk.level < Hero.cap_of(mk):
			r.teach_day = G.day
			ctx.pass_time(2)
			var up := Hero.gain_skill(G.hero, ms, 40)
			await ctx.say(["%s看你練了一遍「%s」，一招一式地替你拆解……\n（請教了兩刻）" % [p.name, Hero.skill_def(ms).name], "「%s」經驗 +40。%s" % [Hero.skill_def(ms).name, ("\n" + up) if up != "" else ""]])
			await add_aff(ctx, p, 1)
			return
		await ctx.say("%s：「你眼下的功夫，還得自己多練練，才有可問的。」\n（武功要練到一定重數，才有下一招可以參悟）" % p.name)
		return
	var opts := []
	for s in ready:
		opts.append("%s（領悟 %d%%）" % [Hero.skill_def(s.id).name, roundi(s.insight)])
	opts.append("算了")
	var i := await ctx.ask("要向%s請教哪一門武功？" % p.name, opts)
	if i >= ready.size():
		return
	r.teach_day = G.day
	var sid: String = ready[i].id
	var name: String = Hero.skill_def(sid).name
	var before: int = ready[i].level
	ctx.pass_time(2)
	await ctx.say("%s聽你說完，指點了幾處關竅……\n（請教了兩刻）" % p.name)
	var learned := Hero.gain_insight(G.hero, sid, float(p.teach.insight) * (1.5 if is_master(id) else 1.0))
	var s2 := Hero.find_skill(G.hero, sid)
	if learned == "":
		await ctx.say("對「%s」的下一招豁然開朗了一些（領悟 %d%%）。" % [name, roundi(s2.insight)])
	else:
		await ctx.say("靈光一閃！你從「%s」中悟出了「%s」！%s" % [name, Hero.move_def(learned).name, ("\n「%s」隨之精進至第 %d 重！" % [name, s2.level]) if s2.level > before else ""])
	await add_aff(ctx, p, 1)


## 交易：熟客打折；每花（或賺）per 兩加 1 熟悉度。stall 是沒有交易檔案、只是顧攤子的人的貨單
static func trade(ctx: Ctx, id: String, stall := {}) -> void:
	var p := def(id)
	var t: Dictionary = p.get("trade", {})
	var stock: Array = t.get("stock", stall.get("stock", [])).duplicate()
	for e in t.get("extra", []):
		if ctx.flag(e[0]):
			stock.append(e[1])
	var disc: float = float(t.discount[stage(id)]) if t.has("discount") else 0.0
	var moved := await ctx.ui.shop(t.get("title", stall.get("title", p.name)), stock, 0.5, disc)
	if t.has("per"):
		var n := moved / int(t.per)
		if n > 0:
			await add_aff(ctx, p, n)
