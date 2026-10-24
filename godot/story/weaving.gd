## 紡織（照網頁版 weaving.ts、story/weaving.ts）：跟錦繡布莊的魏錦娘學樣式（teach），借布莊後頭的織機織衣物（loom）。
## - 樣式在 data/life.json 的 patterns；學會的樣式是項目 weaving:樣式（熟練度 1–5）。
## - 每織一件花體力 10、半個時辰；品級隨機（roll）：紡織等級、樣式熟練度越高越好，越難的樣式越難織好，晴天好一些。
##   摻一綑上品絲線（fine_silk）至少是「精良」。織出來的是物品 w_樣式_品級（0 粗製 … 4 極品）。
## - 紡織 1 級起能結漁網（fish_net，釣魚慢慢等時用，見 story/fishing.gd）。
## 沒有用到旗標。

const Train := preload("res://story/train.gd")

const STAMINA := 10
const KE := 4
## 晴天加的品級擲骰
const SUNNY := 0.1
## 摻上品絲線時至少到這一級（精良）
const FINE_GRADE := 2
const NET_LEVEL := 1
const NET_THREAD := 4


static func patterns() -> Array:
	return Crafts.data().patterns


static func knows(id: String) -> bool:
	return not Crafts.work("weaving", id).is_empty()


static func item_of(pattern: String, grade: int) -> String:
	return "w_%s_%d" % [pattern, grade]


static func needs_text(p: Dictionary) -> String:
	return "、".join(p.needs.keys().map(func(id): return "%s×%d" % [Ui.item_def(id).get("name", id), p.needs[id]]))


static func _missing(p: Dictionary) -> Array:
	var out := []
	for id in p.needs:
		var lack := int(p.needs[id]) - int(G.bag.get(id, 0))
		if lack > 0:
			out.append("%s×%d" % [Ui.item_def(id).get("name", id), lack])
	return out


## 織一件的品級 0–4
static func roll(p: Dictionary, bonus := 0.0) -> int:
	var w := Crafts.work("weaving", p.id)
	var q := randf() + Crafts.level("weaving") * 0.09 + (int(w.get("level", 1)) - 1) * 0.08 - int(p.level) * 0.06 + bonus
	return 0 if q < 0.35 else (1 if q < 0.85 else (2 if q < 1.15 else (3 if q < 1.45 else 4)))


# ── 學樣式 ──────────────────────────────────────────────

static func teach(ctx: Ctx, who: String) -> void:
	var by := func(t: String) -> Dictionary: return {"speaker": who, "text": t}
	var lv := Crafts.level("weaving")
	var left := patterns().filter(func(p): return not knows(p.id))
	if left.is_empty():
		await ctx.say(by.call("我會的都教給你了，往後就看你自己的手藝。"))
		return
	var can := left.filter(func(p): return lv >= int(p.level))
	var need := 99
	for p in left:
		if lv < int(p.level):
			need = mini(need, int(p.level))
	var hint := "\n（紡織練到 %d 級，還能學更難的樣式）" % need if need < 99 else ""
	if can.is_empty():
		await ctx.say([by.call("先把會的織熟了再說。"), hint.strip_edges()])
		return
	var i := await ctx.ask(by.call("想學哪個樣式？" + hint), can.map(func(p): return "%s（%s）" % [p.name, "%d 兩" % p.cost if int(p.cost) > 0 else "不收錢"]) + ["算了"])
	if i >= can.size():
		return
	var p: Dictionary = can[i]
	if not ctx.pay(int(p.cost)):
		await ctx.say(by.call("學「%s」要 %d 兩，你的銀兩不夠。" % [p.name, p.cost]))
		return
	ctx.pass_time(4)
	Crafts.learn_work("weaving", p.id)
	await ctx.say([by.call("看好了，「%s」是這樣起針的……" % p.name), "%s一邊織一邊講，你在旁邊跟著織了一遍。\n（花了半個時辰）" % who,
		"學會了「%s」！要用：%s。\n（材料在布莊買，織機在布莊後頭）" % [p.name, needs_text(p)]])


# ── 織機 ────────────────────────────────────────────────

static func loom(ctx: Ctx) -> void:
	var idle := "一架織布機，經線繃得整整齊齊。老闆娘說，學了手藝的客人可以借用。"
	var known := patterns().filter(func(p): return knows(p.id))
	if known.is_empty():
		await ctx.say("%s\n（還不會紡織。跟老闆娘魏錦娘學個樣式再來）" % idle)
		return
	var labels := known.map(func(p): return "%s（熟練 %d）%s" % [p.name, Crafts.work("weaving", p.id).level, "　缺料" if _missing(p).size() > 0 else ""])
	var net := Crafts.level("weaving") >= NET_LEVEL
	if net:
		labels.append("漁網（棉線×%d）" % NET_THREAD)
	var i := await ctx.ask("%s\n要織什麼？" % idle, labels + ["算了"])
	if net and i == known.size():
		await _knit_net(ctx)
	elif i < known.size():
		await _weave(ctx, known[i])


static func _weave(ctx: Ctx, p: Dictionary) -> void:
	var lack := _missing(p)
	if lack.size() > 0:
		await ctx.say("「%s」要用：%s。\n還缺：%s。" % [p.name, needs_text(p), "、".join(lack)])
		return
	var fine := int(G.bag.get("fine_silk", 0))
	var use_fine := fine > 0 and await ctx.ask("要摻上品絲線嗎？每件一綑，織出來至少是「%s」。（還有 %d 綑）" % [Crafts.data().grades[FINE_GRADE], fine], ["摻上品絲線", "不用"]) == 0
	# 材料夠織幾件，就最多連織幾件
	var most := fine if use_fine else 99
	for id in p.needs:
		most = mini(most, int(G.bag.get(id, 0)) / int(p.needs[id]))
	var n := await Train.ask_rounds(ctx, STAMINA, "織", most, KE)
	if n == 0 or not await Train.exert(ctx, STAMINA * n, "手指都僵了，再織下去只會織錯。"):
		return
	await ctx.work("weave", "織%s中……%s" % [p.name, "（%d 件）" % n if n > 1 else ""])
	ctx.pass_time(KE * n)
	var sunny := G.weather == "clear"
	var made := []
	var ups := []
	for k in n:
		var grade := maxi(roll(p, SUNNY if sunny else 0.0), FINE_GRADE if use_fine else 0)
		for id in p.needs:
			ctx.take(id, int(p.needs[id]))
		if use_fine:
			ctx.take("fine_silk")
		var it := item_of(p.id, grade)
		G.bag[it] = int(G.bag.get(it, 0)) + 1
		made.append("「%s」（%s）" % [Ui.item_def(it).name, Crafts.data().grades[grade]])
		if Crafts.gain_work("weaving", p.id, 10):
			ups.append("「%s」越織越順手了（熟練度 %d）。" % [p.name, Crafts.work("weaving", p.id).level])
		var up := Crafts.gain("weaving", 12 + int(p.level) * 5)
		if up != "":
			ups.append(up)
	var lines := ["梭子在經線間來回穿梭，喀噠、喀噠……%s" % ("\n（大晴天，光線好，絲線也乾爽，織起來格外順手）" if sunny else ""),
		"織好了 %d 件：\n%s\n%s" % [n, "、".join(made), Train.rounds_note("織", n, KE)] if n > 1 else "織好了一件%s！\n（花了半個時辰）" % made[0]]
	if ups.size() > 0:
		lines.append("\n".join(ups))
	await ctx.say(lines)


## 漁網：棉線結成一張網；帶在身上，釣魚「慢慢等」時更容易釣起來，偶爾一次兩條
static func _knit_net(ctx: Ctx) -> void:
	if not ctx.has("cotton_thread", NET_THREAD):
		await ctx.say("結一張漁網要棉線×%d。" % NET_THREAD)
		return
	if not await Train.exert(ctx, STAMINA, "手指都僵了，再結下去只會打錯結。"):
		return
	await ctx.work("weave", "結漁網中……")
	ctx.pass_time(KE)
	ctx.take("cotton_thread", NET_THREAD)
	await ctx.say("你把棉線搓成粗繩，一個結一個結地打，結成一張細密的漁網。\n（花了半個時辰）")
	await ctx.give("fish_net")
	var up := Crafts.gain("weaving", 6)
	if up != "":
		await ctx.say(up)
