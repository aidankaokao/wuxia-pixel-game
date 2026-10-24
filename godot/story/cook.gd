## 做菜（照網頁版 cooking.ts、story/cooking.ts）：灶台前選一道學會的菜、做幾份。
## - 菜在 data/life.json 的 dishes（飯品、麵品回氣血體力，湯品回內力，甜品加接下來幾場戰鬥的武功經驗）；燉山豬肉不用學。
## - 每份各自擲品質：普通、上品、精品（物品 id 是 菜、菜_2、菜_3），也可能燒糊；烹飪等級、這道菜的熟練度、灶台越好越容易做出好菜。
## - 每份體力 6、花 (2 + 菜的難度) 刻；做完加烹飪經驗與這道菜的熟練度。
## - 青竹村：竹風茶寮後頭的灶台（stove），鍾嬸教家常菜（入門、中等，收銀兩；按 R「請教」，熟悉度到「點頭之交」）。

const COOK_STAMINA := 6
const KINDS := ["飯品", "麵品", "湯品", "甜品"]
const QUALITY := ["普通", "上品", "精品"]
## 鍾嬸教菜的學費（入門、中等）
const ZHONG_COST := [5, 12]

const Train := preload("res://story/train.gd")


static func knows(id: String) -> bool:
	return id == "stew" or not Crafts.work("cooking", id).is_empty()


## 某道菜某個品質的物品 id（q：0 普通、1 上品、2 精品）
static func item(id: String, q := 0) -> String:
	return id if q == 0 else "%s_%d" % [id, q + 1]


static func _name(id: String) -> String:
	return Ui.item_def(id).get("name", id)


static func needs_text(d: Dictionary) -> String:
	var parts := []
	for id in d.needs:
		parts.append("%s%s" % [_name(id), ("×%d" % d.needs[id]) if int(d.needs[id]) > 1 else ""])
	return "、".join(parts)


static func missing(d: Dictionary) -> Array:
	var out := []
	for id in d.needs:
		var have := int(G.bag.get(id, 0))
		if have < int(d.needs[id]):
			out.append("%s×%d" % [_name(id), int(d.needs[id]) - have])
	return out


## 做一份的結果：-1 燒糊、0 普通、1 上品、2 精品
static func roll(d: Dictionary, stove: int) -> int:
	var w := Crafts.work("cooking", d.id)
	var q := randf() + Crafts.level("cooking") * 0.05 + (int(w.get("level", 1)) - 1) * 0.1 + stove * 0.05 - int(d.tier) * 0.1
	if q < 0.12:
		return -1
	if q > 1.15:
		return 2
	if q > 0.85:
		return 1
	return 0


## 做完一份加經驗（燒糊也有一點）；回傳升級的提示
static func _exp(d: Dictionary, failed: bool) -> Array:
	var out := []
	var tl: Array = Crafts.data().tier_level
	# 手藝比這道菜高出一截（過了下一階的門檻）經驗減半
	var easy: bool = int(d.tier) < 3 and Crafts.level("cooking") >= int(tl[int(d.tier) + 1])
	var up := Crafts.gain("cooking", roundi((10 + int(d.tier) * 6) * (0.4 if failed else 1.0) * (0.5 if easy else 1.0)))
	if d.id != "stew" and Crafts.gain_work("cooking", d.id, 4 if failed else 10):
		out.append("「%s」越做越順手了（熟練度 %d）。" % [d.name, Crafts.work("cooking", d.id).level])
	if up != "":
		out.append(up)
	return out


## 竹風茶寮後頭的灶台
static func stove(ctx: Ctx) -> void:
	await cook_at(ctx, 1, "一口砌得結實的柴灶，鍋碗瓢盆收拾得整整齊齊。鍾嬸說，要用自己添柴就是了。")


static func cook_at(ctx: Ctx, stove_lv: int, idle: String) -> void:
	var known: Array = Crafts.data().dishes.filter(func(d): return knows(d.id))
	if known.size() == 1 and not ctx.has("boar_meat"):
		await ctx.say("%s\n（有山豬肉的話可以燉來吃；想學更多菜，找鍾嬸請教——按 R）" % idle)
		return
	var kinds := KINDS.filter(func(k): return known.any(func(d): return d.kind == k))
	var k := await ctx.ask("%s\n要做哪一類的菜？（每份體力 %d）" % [idle, COOK_STAMINA], kinds + ["算了"])
	if k >= kinds.size():
		return
	var list := known.filter(func(d): return d.kind == kinds[k])
	var labels := list.map(func(d):
		var w := Crafts.work("cooking", d.id)
		return "%s%s%s" % [d.name, ("（熟練 %d）" % w.level) if not w.is_empty() else "", "　缺料" if missing(d).size() > 0 else ""])
	var i := await ctx.ask("做哪一道？", labels + ["算了"])
	if i >= list.size():
		return
	await _cook(ctx, list[i], stove_lv)


static func _cook(ctx: Ctx, d: Dictionary, stove_lv: int) -> void:
	var lack := missing(d)
	if lack.size() > 0:
		await ctx.say("「%s」要用：%s。\n還缺：%s。" % [d.name, needs_text(d), "、".join(lack)])
		return
	var by_food := 999
	for id in d.needs:
		by_food = mini(by_food, int(G.bag.get(id, 0)) / int(d.needs[id]))
	var most := mini(by_food, int(G.hero.stamina) / COOK_STAMINA)
	var opts := ["做一份"]
	if most > 1:
		opts.append("做 %d 份" % most)
	var c := await ctx.ask("「%s」：%s。\n材料夠做 %d 份。（每份花 %d 點體力）" % [d.name, needs_text(d), by_food, COOK_STAMINA], opts + ["算了"])
	var n := 1 if c == 0 else (most if most > 1 and c == 1 else 0)
	if n == 0 or not await Train.exert(ctx, COOK_STAMINA * n, "站在灶前手都抬不起來了，先歇一歇吧。"):
		return
	await ctx.work("cook", "做%s中……%s" % [d.name, ("（%d 份）" % n) if n > 1 else ""])
	var made := [0, 0, 0]
	var failed := 0
	var ups := []
	for j in n:
		for id in d.needs:
			ctx.take(id, int(d.needs[id]))
		var q := roll(d, stove_lv)
		if q < 0:
			failed += 1
		else:
			made[q] += 1
			G.bag[item(d.id, q)] = int(G.bag.get(item(d.id, q), 0)) + 1
		for l in _exp(d, q < 0):
			if not l in ups:
				ups.append(l)
	ctx.pass_time(n * (2 + int(d.tier)))
	var got := []
	for q in 3:
		if made[q] > 0:
			got.append("%s×%d" % [d.name if q == 0 else "%s（%s）" % [d.name, QUALITY[q]], made[q]])
	var lines := ["柴火劈啪作響，肉香慢慢飄滿了屋子……" if d.id == "stew" else "你繫上圍裙，洗切、生火、下鍋……"]
	var res := []
	if got.size() > 0:
		res.append("做好了：%s。" % "、".join(got))
	if failed > 0:
		res.append("有 %d 份火候沒拿捏好，燒糊了。" % failed)
	res.append("（花了%s）" % G.ke_text(n * (2 + int(d.tier))))
	lines.append("\n".join(res))
	if ups.size() > 0:
		lines.append("\n".join(ups))
	await ctx.say(lines)


## 鍾嬸教菜（人際系統的「請教」轉過來）：只教家常的入門、中等菜；中等菜要烹飪 2 級
static func zhong_teach(ctx: Ctx) -> void:
	var who := func(t: String) -> Dictionary: return {"speaker": "鍾嬸", "text": t}
	var tl: Array = Crafts.data().tier_level
	var left: Array = Crafts.data().dishes.filter(func(d): return not knows(d.id) and int(d.tier) <= 1 and not d.get("spring", false) and not d.get("sea", false) and not d.get("lake", false))
	if left.is_empty():
		await ctx.say(who.call("嬸會的家常菜都教給你啦！再難的菜，得去找大館子的師傅。"))
		return
	var lv := Crafts.level("cooking")
	var can := left.filter(func(d): return lv >= int(tl[int(d.tier)]))
	if can.is_empty():
		await ctx.say([who.call("先把會的菜做熟了再說。手藝不到家，教你也學不會。"), "（烹飪練到 %d 級，鍾嬸才肯教中等的菜）" % int(tl[1])])
		return
	var labels := can.map(func(d): return "%s（%s・%s，%d 兩）" % [d.name, d.kind, Crafts.data().dish_tiers[int(d.tier)], ZHONG_COST[int(d.tier)]])
	var i := await ctx.ask(who.call("想學做菜？嬸教你幾道家常的。學費意思意思就好。"), labels + ["算了"])
	if i >= can.size():
		return
	var d: Dictionary = can[i]
	var cost: int = ZHONG_COST[int(d.tier)]
	if not ctx.pay(cost):
		await ctx.say(who.call("這得 %d 兩，你身上不夠呢。" % cost))
		return
	ctx.pass_time(4)
	Crafts.learn_work("cooking", d.id)
	await ctx.say([who.call("看好了，「%s」的要訣是……" % d.name), "鍾嬸一邊做一邊講，你在旁邊照著做了一遍。\n（花了半個時辰）",
		"學會了「%s」！要用：%s。\n（在竹風茶寮後頭的灶台做；食材陶四的貨郎攤有賣）" % [d.name, needs_text(d)]])
