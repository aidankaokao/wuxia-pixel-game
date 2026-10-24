## 州圖上的歇腳點與渡口（照網頁版 story/waystation.ts、story/ferry.ts、story/stable.ts）：
## - 驛站、茶亭、渡口茶棚（州圖據點帶 rest）：住店、吃點東西、打聽消息；有驛馬的驛站可以買馬、賣馬。
## - 渡船（州圖上渡口那段河上的小船，world_map 擺的）：白天 FERRY_DAY 兩、夜裡 FERRY_NIGHT 兩，過河一刻，送到對岸。
## - 坐騎（data/life.json 的 mounts）：G.hero.mount 是馬的 id；有馬在州圖上就騎著走，腳程照馬的 speed（輕功另外算，見 world_map 的 travel_mult）。
## 用到的旗標：ferry_rides 坐過幾次渡船

const FERRY_DAY := 2
const FERRY_NIGHT := 5

const Train := preload("res://story/train.gd")
const Bridge := preload("res://story/bridge.gd")


static func _node(ctx: Ctx) -> Dictionary:
	return ctx.scene.nodes[ctx.extra.node]


## 歇腳點的選單
static func inn(ctx: Ctx) -> void:
	var n := _node(ctx)
	var r: Dictionary = n.rest
	var k := func(t: String) -> Dictionary: return {"speaker": r.keeper, "text": t}
	var horses: Array = r.get("horses", [])
	var opts := ["住店（%d 兩）" % int(r.price), "吃點東西", "打聽消息"]
	if horses.size() > 0:
		opts.append("看看馬")
	# 雲水渡口：修橋的支線（story/bridge.gd）
	if n.id == "ferry" and Bridge.option():
		opts.append("修橋的事")
	if n.id == "ferry" and Bridge.built():
		opts.append("看捐建碑")
	opts.append("繼續趕路")
	var c := await ctx.ask(k.call("%s，歇歇腳吧。" % n.name), opts)
	match opts[c]:
		"吃點東西":
			await ctx.ui.shop(n.name, r.menu, 0.5, 0.2 if n.id == "ferry" and ctx.flag("bridge_party") else 0.0)
		"修橋的事":
			await Bridge.talk(ctx)
		"看捐建碑":
			await Bridge.stele(ctx)
		"打聽消息":
			var talk: Array = r.talk[G.day % r.talk.size()]
			await ctx.say(talk.map(func(t): return k.call(t)))
		"看看馬":
			await horse_trade(ctx, r.keeper, horses)
		_:
			if c == 0:
				if not ctx.pay(int(r.price)):
					await ctx.say(k.call("客官，住一晚得 %d 兩。" % int(r.price)))
					return
				await ctx.say(k.call(r.get("bed", "屋子簡陋，被褥倒是乾淨的。")))
				await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？")


## 渡船：ctx.extra = {node 渡口, banks: [這頭的岸, 對岸]（州圖格）}；從主角站的那一頭送到另一頭
static func ferry(ctx: Ctx) -> void:
	var n := _node(ctx)
	var f: Dictionary = n.get("ferry", {"boatman": "船家"})
	var b := func(t: String) -> Dictionary: return {"speaker": f.boatman, "text": t}
	var s := G.shichen_of()
	var night := s < 3 or s >= 10
	var price := FERRY_NIGHT if night else FERRY_DAY
	var c := await ctx.ask(b.call(("……這麼晚了還要過河？加點錢，我就撐一趟。（%d 兩）" if night else "過河嗎？%d 兩，送你到對岸。") % price), ["過河（%d 兩）" % price, "不用了"])
	if c != 0:
		return
	if not ctx.pay(price):
		await ctx.say(b.call("沒錢就別過河啦，游過去可是會淹死人的。"))
		return
	ctx.set_flag("ferry_rides", ctx.flag("ferry_rides") + 1)
	ctx.pass_time(1)
	await ctx.say(["你上了船。%s一篙點開岸邊，小船晃晃悠悠地往對岸去。" % f.boatman, b.call("坐穩囉——"), "（過河花了一刻）"])
	ctx.scene.ferry_across(ctx.extra.banks)


## 買馬、賣馬：舊馬折一半價
static func horse_trade(ctx: Ctx, keeper: String, ids: Array) -> void:
	var k := func(t: String) -> Dictionary: return {"speaker": keeper, "text": t}
	var own := mount_def(G.hero.get("mount", ""))
	var list := ids.map(func(id): return mount_def(id))
	var opts := list.map(func(m): return "%s（%d 兩，腳程快 %d%%）" % [m.name, int(m.price), roundi((float(m.speed) - 1.0) * 100)])
	if not own.is_empty():
		opts.append("賣掉%s（%d 兩）" % [own.name, int(own.price) / 2])
	opts.append("算了")
	var i := await ctx.ask(k.call("驛裡換下來的馬，腳力還行，價錢公道。"), opts)
	if i < list.size():
		var m: Dictionary = list[i]
		if own.get("id", "") == m.id:
			await ctx.say(k.call("你不是已經有一匹%s了嗎？" % m.name))
			return
		var trade := int(own.get("price", 0)) / 2
		var cost := int(m.price) - trade
		await ctx.say(k.call(m.desc))
		if await ctx.ask("買下%s？要 %d 兩%s。" % [m.name, int(m.price), ("（%s折價 %d 兩，實付 %d 兩）" % [own.name, trade, cost]) if not own.is_empty() else ""], ["買下", "算了"]) != 0:
			return
		if not ctx.pay(cost):
			await ctx.say(k.call("銀兩不夠啊，再攢攢吧。"))
			return
		G.hero.mount = m.id
		if ctx.scene.has_method("mount_up"):
			ctx.scene.mount_up()
		await ctx.say([k.call("好好待牠。"), "你牽過%s，翻身上馬。\n（在州圖上騎馬趕路，腳程快 %d%%）" % [m.name, roundi((float(m.speed) - 1.0) * 100)]])
	elif not own.is_empty() and i == list.size():
		var price := int(own.price) / 2
		if await ctx.ask("把%s賣掉？%s出 %d 兩。" % [own.name, keeper, price], ["賣掉", "算了"]) != 0:
			return
		G.silver += price
		G.hero.erase("mount")
		if ctx.scene.has_method("mount_up"):
			ctx.scene.mount_up()
		await ctx.say([k.call("放心，我會替你好好照顧牠。"), "（銀兩 +%d）" % price])


static func mount_def(id: String) -> Dictionary:
	for m in Crafts.data().get("mounts", []):
		if m.id == id:
			return m
	return {}
