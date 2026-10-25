## 開店與櫃台（照網頁版 story/shop.ts；規則與結算在 scripts/biz.gd）：
## - 縣衙師爺「登記商號」（property.gd 的選單）：名下的空店面開店，選店種、付規費二十兩，店名是「姓氏＋記＋店種」。
## - 店裡的櫃台（counter，東家用）：有事、經營管理（帳簿，scripts/biz_book.gd）、總號帳簿、看帳本、翻經營手冊、上架、下架、收帳、親自招呼客人、擴店、歇業。
## - 親自招呼客人：一天一次，兩刻、體力 8；三位客人各要一樣東西，給對了照價多收兩成；三位都滿意名聲 +1，那天生意多四成。
## - 每天半夜（new_day，掛在 G.NEW_DAY_SCRIPTS）：房產市場換告示、結算昨天的帳、擲店與房子的小事件、掌櫃代管。
## - 稱號「東家」：第一次買下店面或老店時給（grant_title），並翻開《經營手冊》。
## 一天一次的事記在 G.life.daily：shop:<物件id>:serve。

const Train := preload("res://story/train.gd")
const Events := preload("res://story/shop_events.gd")

const GUESTS := ["挑夫", "書生", "大嬸", "老丈", "小姑娘", "跑船的", "外地客商", "鏢師"]
## 店裡逛的客人（地圖上的人都要有名字）
const BROWSERS := [["吳掌櫃", "peddler"], ["邢大嫂", "aunt"], ["童秀才", "scholar"], ["牛二", "farmer"]]


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func _surname() -> String:
	var s: String = G.hero.get("surname", "")
	return s if s != "" else String(G.hero.get("name", "無")).left(1)


# ── 每天半夜 ────────────────────────────────────────────

static func new_day() -> void:
	Biz.refresh_market()
	for id in Biz.shops():
		Biz.settle_day(Biz.shops()[id], id, G.day - 1)
	Events.roll_all()
	load("res://story/managers.gd").manage_daily()


# ── 稱號與經營手冊 ──────────────────────────────────────

static func grant_title(ctx: Ctx) -> void:
	if Biz.has_title():
		return
	if not G.hero.has("titles"):
		G.hero.titles = []
	G.hero.titles.append(Biz.BIZ_TITLE)
	ctx.ui.notify("得到稱號「%s」" % Biz.BIZ_TITLE)
	await ctx.say(["（得到稱號「%s」：從今天起你是有產業的人了）" % Biz.BIZ_TITLE, "（開店、跟供應商簽約、請掌櫃代管……經營的事都記在《經營手冊》裡，隨時可以從店裡的櫃台翻閱）"])
	await BizBook.open(ctx.ui, "handbook")


# ── 開店（縣衙師爺） ────────────────────────────────────

## 名下還沒開店的店面
static func openable() -> Array:
	var m := Biz.market()
	return m.owned.keys().filter(func(id): return Biz.prop_def(id).kind == "shop" and m.owned[id].use != "shop" and not m.selling.has(id))


static func open_shop(ctx: Ctx) -> void:
	var say := func(t: String) -> Dictionary: return {"speaker": "苗守正", "text": t}
	var ids := openable()
	var i := await ctx.ask(say.call("要在哪間鋪面開店？"), ids.map(func(id): return Biz.prop_def(id).name) + ["算了"])
	if i >= ids.size():
		return
	var id: String = ids[i]
	var types: Array = Biz.TYPE_ORDER.filter(func(t): return Biz.can_open(t))
	var locked: Array = Biz.TYPE_ORDER.filter(func(t): return not Biz.can_open(t)).map(func(t): return "%s要%s 1 級" % [Biz.SHOP_TYPES[t].name, Biz.CRAFT_NAME[Biz.SHOP_TYPES[t].craft]])
	var c := await ctx.ask(say.call("開什麼店？" + ("\n（%s）" % "、".join(locked) if locked.size() > 0 else "")), types.map(func(t): return "%s：%s" % [Biz.SHOP_TYPES[t].name, Biz.SHOP_TYPES[t].desc]) + ["再想想"])
	if c >= types.size():
		return
	var t: String = types[c]
	var name := "%s記%s" % [_surname(), Biz.SHOP_TYPES[t].name]
	if await ctx.ask(say.call("商號就叫「%s」？登記規費 %d 兩。" % [name, Biz.SHOP_FEE]), ["就這麼辦", "算了"]) != 0:
		return
	if not ctx.pay(Biz.SHOP_FEE):
		await ctx.say(say.call("規費 %d 兩，你身上不夠。" % Biz.SHOP_FEE))
		return
	Biz.market().owned[id].use = "shop"
	Biz.shops()[id] = {"type": t, "name": name, "level": 1, "stock": {}, "price": 1, "staff": [], "till": 0, "ledger": [], "opened": G.day}
	await ctx.say([say.call("「%s」登記好了，恭喜開張！" % name), say.call("店裡要有夥計顧著才做得了生意，東家不在的時候也一樣。"), say.call("到店裡的櫃台，就能上架、雇人、看帳。")])


# ── 店裡（property.gd 的 room_data 交給這裡擺人） ────────

## 開了店的鋪面：櫃台是東家的；夥計、掌櫃、保鏢站在店裡；有人顧又有貨的白天有客人；店裡出了事，地痞或老饕也在
static func fill_room(d: Dictionary, pid: String) -> void:
	var s := Biz.shop(pid)
	var t: Dictionary = Biz.SHOP_TYPES[s.type]
	d.name = s.name
	d.subtitle = "臨江城・%s・%s" % [t.name, Biz.level_def(s).name]
	d.theme = "plain" if s.type == "restaurant" else "scholar"
	var goods: int = s.stock.size()
	d.props[0] = {"sprite": "counter", "x": 1, "y": 1, "w": 3, "lines": [], "label": "東家的櫃台", "script": "shop/counter"}
	d.props[1].lines = [{"text": "貨架上擺著 %d 樣貨。" % goods if goods > 0 else "貨架空著，該上貨了。"}]
	d.props[2].lines = [{"text": "客人在架前挑挑揀揀。" if goods > 0 else "空貨架。"}]
	d.props.append({"sprite": "f_table_plain_1", "x": 7, "y": 4, "w": 2, "lines": [{"text": "桌上留著客人喝剩的半碗茶。"}], "label": ""})
	var P := load("res://story/property.gd")
	var npcs: Array = d.npcs
	var e: Dictionary = s.get("event", {})
	if not e.is_empty() and int(e.day) <= G.day:
		if e.kind == "ruffian":
			npcs.append(P._npc("ruffian", "蔡三", "bandit", 6, 4, "down", "shop_events/npc"))
			npcs.append(P._npc("ruffian2", "賴四", "beggar", 4, 6, "right", "shop_events/npc"))
		elif e.kind == "critic":
			npcs.append(P._npc("critic", "郝一嚐", "elder", 9, 4, "left", "shop_events/npc"))
	for m in Biz.biz().managers:
		if m.get("shop", "") == pid:
			npcs.append(P._npc("mgr", m.name, "storyteller", 2, 3, "down", "", [[{"speaker": m.name, "text": "東家來了！店裡一切照方針辦，帳都記在總號帳簿上，您過目。"}]]))
	if s.has("guard"):
		var g := Biz.guard_def(s.guard.source)
		npcs.append(P._npc("guard", s.guard.name, g.look, 9, 6, "left", "", [[{"speaker": s.guard.name, "text": "東家放心，有我%s%s在，誰也別想在這兒撒野。" % [g.title, s.guard.name]}]]))
	for i in (s.staff as Array).size():
		npcs.append(P._npc("staff_%d" % i, s.staff[i], "girl" if i % 2 else "servant", 4 + i * 2, 2, "down", "shop/staff_talk"))
	if (s.staff as Array).size() > 0 and goods > 0 and G.shichen_of() >= 4 and G.shichen_of() <= 9:
		for k in 2:
			var b: Array = BROWSERS[(G.day + k * 2) % BROWSERS.size()]
			npcs.append(P._npc("guest_%d" % k, b[0], b[1], 3 + k * 5, 5, "up", "", [[{"speaker": b[0], "text": ["這家東西實在，價錢也公道。", "東家？久仰久仰！"][k]}]]))


static func staff_talk(ctx: Ctx) -> void:
	var name: String = ctx.walker().get("name", "")
	var sweet: bool = Biz.staff_def(name).trait == "嘴甜"
	await ctx.say([{"speaker": name, "text": "東家來啦！"}, {"speaker": name, "text": "今天好幾位客人都說咱們的東西好！" if sweet else "帳都記在本子上了，您過目。"}])


static func _pid(ctx: Ctx) -> String:
	var rid: String = ctx.scene.get("room_id")
	return rid.substr(5) if rid.begins_with("prop:") else ""


## 店裡站著哪些人（夥計、保鏢、掌櫃、地痞或老饕）：變了就要重新進門才看得到
static func people_key(id: String) -> String:
	var s := Biz.shop(id)
	var mgrs: Array = Biz.biz().managers.filter(func(m): return m.get("shop", "") == id).map(func(m): return m.name)
	return str([s.get("staff", []), s.get("guard", {}).get("name", ""), s.get("event", {}).get("kind", ""), mgrs, s.is_empty()])


## 人變了：原地重新載入這間店（地痞走了、新雇的夥計站進來）
static func reload_if_changed(ctx: Ctx, id: String, before: String) -> void:
	if people_key(id) != before and String(ctx.scene.get("room_id")) == "prop:" + id:
		ctx.warp("prop:" + id, ctx.scene.where_at())


# ── 櫃台 ────────────────────────────────────────────────

static func counter(ctx: Ctx) -> void:
	var id := _pid(ctx)
	# 舊存檔：已經有店卻還沒有稱號，補上
	await grant_title(ctx)
	var before := people_key(id)
	await _counter(ctx, id)
	reload_if_changed(ctx, id, before)


static func _counter(ctx: Ctx, id: String) -> void:
	while true:
		var s := Biz.shop(id)
		if s.is_empty():
			return
		var t: Dictionary = Biz.SHOP_TYPES[s.type]
		var lv := Biz.level_def(s)
		var kinds: int = s.stock.size()
		var count := 0
		for k in s.stock:
			count += int(s.stock[k])
		var nxt: Dictionary = Biz.SHOP_LEVELS[int(s.level)] if int(s.level) < Biz.SHOP_LEVELS.size() else {}
		var served := int(_daily().get("shop:%s:serve" % id, 0)) == G.day
		var trouble := Events.label(id)
		var till := roundi(float(s.till))
		var vault := int(Biz.biz().vault)
		var opts := []
		if trouble != "":
			opts.append(["【有事】" + trouble, "trouble"])
		opts.append(["經營管理（定價、帳目、夥計 %d/%d、進貨、保鏢）" % [(s.staff as Array).size(), lv.staff], "manage"])
		opts.append(["總號帳簿（所有店、掌櫃、供應商、方針%s）" % ("・帳房 %d 兩" % vault if vault > 0 else ""), "hq"])
		opts.append(["看帳本（近五天）", "ledger"])
		opts.append(["翻經營手冊", "handbook"])
		opts.append(["上架（架上 %d/%d 種、%d 件）" % [kinds, lv.slots, count], "stock"])
		if kinds > 0:
			opts.append(["下架", "unstock"])
		if till != 0:
			opts.append(["收帳（櫃上 %d 兩）" % till if till > 0 else "補上欠的工錢（%d 兩）" % -till, "collect"])
		opts.append(["親自招呼客人（今天招呼過了）" if served else "親自招呼客人（兩刻、體力 8）", "serve"])
		if not nxt.is_empty():
			opts.append(["擴店為「%s」（%d 兩）" % [nxt.name, nxt.cost], "upgrade"])
		opts.append(["歇業（把店收起來）", "close"])
		var c := await ctx.ask("「%s」%s・%s\n要做什麼？" % [s.name, t.name, lv.name], opts.map(func(o): return o[0]) + ["離開櫃台"])
		if c >= opts.size():
			return
		match opts[c][1]:
			"trouble":
				await Events.handle(ctx, id)
			"manage":
				await BizBook.open(ctx.ui, "shop", id)
			"hq":
				await BizBook.open(ctx.ui, "hq")
			"handbook":
				await BizBook.open(ctx.ui, "handbook")
			"ledger":
				await _ledger(ctx, s)
			"stock":
				await _stock_up(ctx, id)
			"unstock":
				await _unstock(ctx, id)
			"collect":
				await _collect(ctx, id)
			"serve":
				await _serve(ctx, id)
			"upgrade":
				await _upgrade(ctx, id)
			"close":
				if await _close_shop(ctx, id):
					return
		ctx.refresh()


static func ledger_line(r: Dictionary) -> String:
	if r.get("closed", false):
		return "%s：關門（沒人顧店）" % G.date_text(int(r.day))
	var t := "%s%s：客人 %d、賣出 %d" % [G.date_text(int(r.day)), "（%s）" % r.fest if r.has("fest") else "", int(r.customers), int(r.sold)]
	if int(r.get("short", 0)) > 0:
		t += "、缺貨跑了 %d" % int(r.short)
	if int(r.get("pricey", 0)) > 0:
		t += "、嫌貴走了 %d" % int(r.pricey)
	t += "；進帳 %d、開銷 %d" % [int(r.income), Biz.cost_of(r)]
	if r.has("trouble"):
		t += "\n　　※ " + r.trouble
	return t


static func _ledger(ctx: Ctx, s: Dictionary) -> void:
	var rows: Array = (s.ledger as Array).slice(-5)
	rows.reverse()
	var stock: Array = s.stock.keys().map(func(k): return "%s×%d（%d 兩）" % [ctx.item_name(k), int(s.stock[k]), Biz.shop_price(s, k)])
	await ctx.say(["\n".join(rows.map(func(r): return ledger_line(r))) if rows.size() > 0 else "帳本還是空的。開張以後，每天半夜結算一次。", "架上：%s" % ("、".join(stock) if stock.size() > 0 else "空的")])


static func _stock_up(ctx: Ctx, id: String) -> void:
	var s := Biz.shop(id)
	var t: Dictionary = Biz.SHOP_TYPES[s.type]
	var slots: int = Biz.level_def(s).slots
	var bag: Array = G.bag.keys().filter(func(k): return int(G.bag[k]) > 0 and Biz.accepts(s.type, k))
	if bag.is_empty():
		await ctx.say("行囊裡沒有能擺上%s貨架的東西。" % t.name)
		return
	var i := await ctx.ask("要擺什麼上架？", bag.map(func(k): return "%s（身上 %d，%d 兩一件）" % [ctx.item_name(k), int(G.bag[k]), Biz.shop_price(s, k)]) + ["算了"])
	if i >= bag.size():
		return
	var k: String = bag[i]
	if not s.stock.has(k) and s.stock.size() >= slots:
		await ctx.say("貨架擺滿了（%d 種）。先下架別的，或是擴店。" % slots)
		return
	var have := int(G.bag[k])
	var n := 1
	if have > 1:
		n = [have, ceili(have / 2.0), 1][await ctx.ask("擺幾件？（身上 %d）" % have, ["全部 %d 件" % have, "一半 %d 件" % ceili(have / 2.0), "一件"])]
	ctx.take(k, n)
	s.stock[k] = int(s.stock.get(k, 0)) + n
	await ctx.say("%s×%d 擺上架了。" % [ctx.item_name(k), n])


static func _unstock(ctx: Ctx, id: String) -> void:
	var s := Biz.shop(id)
	var ks: Array = s.stock.keys()
	var i := await ctx.ask("要收回哪一樣？", ks.map(func(k): return "%s×%d" % [ctx.item_name(k), int(s.stock[k])]) + ["算了"])
	if i >= ks.size():
		return
	var k: String = ks[i]
	var n := int(s.stock[k])
	s.stock.erase(k)
	G.bag[k] = int(G.bag.get(k, 0)) + n
	await ctx.say("%s×%d 收回行囊了。" % [ctx.item_name(k), n])


static func _collect(ctx: Ctx, id: String) -> void:
	var s := Biz.shop(id)
	var till := roundi(float(s.till))
	if till > 0:
		s.till = 0
		G.silver += till
		await ctx.say("你把櫃上的 %d 兩收進錢袋。" % till)
		return
	if not ctx.pay(-till):
		await ctx.say("欠夥計 %d 兩工錢，你身上不夠。" % -till)
		return
	s.till = 0
	await ctx.say("補上了 %d 兩工錢，夥計們鬆了口氣。" % -till)


static func _upgrade(ctx: Ctx, id: String) -> void:
	var s := Biz.shop(id)
	var nxt: Dictionary = Biz.SHOP_LEVELS[int(s.level)]
	if await ctx.ask("擴成「%s」：客人多、貨架能擺 %d 種、能雇 %d 個夥計。要花 %d 兩。" % [nxt.name, nxt.slots, nxt.staff, nxt.cost], ["擴店", "算了"]) != 0:
		return
	if not ctx.pay(int(nxt.cost)):
		await ctx.say("要 %d 兩，你身上不夠。" % nxt.cost)
		return
	s.level = int(s.level) + 1
	await ctx.say("工匠忙了幾天，店面打通、添了貨架與桌椅。「%s」現在是「%s」了！" % [s.name, nxt.name])


static func _close_shop(ctx: Ctx, id: String) -> bool:
	var s := Biz.shop(id)
	if await ctx.ask("要把「%s」收起來嗎？架上的貨收回行囊，夥計遣散。" % s.name, ["歇業", "算了"]) != 0:
		return false
	for k in s.stock:
		G.bag[k] = int(G.bag.get(k, 0)) + int(s.stock[k])
	G.silver += maxi(0, roundi(float(s.till)))
	for m in Biz.biz().managers:
		if m.get("shop", "") == id:
			m.erase("shop")
	Biz.shops().erase(id)
	Biz.market().owned[id].use = "empty"
	await ctx.say("「%s」歇業了。鋪面還是你的，想開再到縣衙登記。" % s.name)
	return true


# ── 親自招呼客人 ────────────────────────────────────────

## 客人要什麼：菜要某一類、衣服要某個部位、其他就指名。回傳 [要的話, 判斷給得對不對的 Callable]
static func _want(k: String) -> Array:
	var it := Ui.item_def(k)
	if it.has("dish"):
		var kind: String = Crafts.dish(it.dish).get("kind", "")
		return ["來一份%s！" % kind, func(x: String) -> bool: return Ui.item_def(x).has("dish") and Crafts.dish(Ui.item_def(x).dish).get("kind", "") == kind]
	if it.has("gear"):
		var g: String = it.gear.kind
		return ["有沒有%s的？" % Hero.GEAR_SLOT.get(g, "穿"), func(x: String) -> bool: return Ui.item_def(x).get("gear", {}).get("kind", "") == g]
	return ["要%s！" % it.name, func(x: String) -> bool: return x == k]


static func _serve(ctx: Ctx, id: String) -> void:
	var key := "shop:%s:serve" % id
	if int(_daily().get(key, 0)) == G.day:
		await ctx.say("今天已經親自招呼過一輪了，剩下的交給夥計吧。")
		return
	if Biz.shop(id).stock.is_empty():
		await ctx.say("架上是空的，拿什麼招呼客人？先上架吧。")
		return
	if not await Train.exert(ctx, 8, "你累得連笑都笑不出來，這樣招呼客人只會把人嚇跑。"):
		return
	_daily()[key] = G.day
	var s := Biz.shop(id)
	s.served = G.day
	ctx.pass_time(2)
	await ctx.say(["你繫上圍裙站到櫃台後頭。" + ("%s愣了一下：「東、東家？」" % s.staff[0] if (s.staff as Array).size() > 0 else "櫃台擦得發亮，就等客人上門。"), "門口的客人一個接一個進來了。"])
	var ok := 0
	var earned := 0
	for n in 3:
		var ks: Array = s.stock.keys()
		if ks.is_empty():
			await ctx.say("架上賣空了，後頭的客人只好走了。")
			break
		var k: String = ks.pick_random()
		var want := _want(k)
		var guest: String = GUESTS.pick_random()
		ks.shuffle()
		var choices: Array = ks.slice(0, 4)
		if not choices.any(func(x): return want[1].call(x)):
			choices[0] = k
		var c := await ctx.ask({"speaker": guest, "text": want[0]}, choices.map(func(x): return "%s（架上 %d）" % [ctx.item_name(x), int(s.stock[x])]))
		var pick: String = choices[c]
		if not want[1].call(pick):
			await ctx.say({"speaker": guest, "text": "不是這個啦……算了，我上別家去。"})
			continue
		# 給對了：照價賣，再多收兩成小費
		var price := roundi(Biz.shop_price(s, pick) * 1.2)
		s.stock[pick] = int(s.stock[pick]) - 1
		if int(s.stock[pick]) <= 0:
			s.stock.erase(pick)
		s.till = float(s.till) + price
		ok += 1
		earned += price
		await ctx.say([{"speaker": guest, "text": ["就是這個！東家親自招呼，果然不一樣。", "好！下回還來！", "爽快！多的不用找了。"][n % 3]}, "（賣出%s，收 %d 兩，放進櫃上）" % [ctx.item_name(pick), price]])
	if ok == 3:
		ctx.fame(1)
		await ctx.say("（客人都滿意得很，名聲 +1）")
	await ctx.say(["招呼了兩刻，收了 %d 兩。" % earned, "（東家親自顧店，今天的生意多了四成，晚上結算時就看得到）"])


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	var out := []
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		for r in s.ledger:
			if int(r.day) == G.day - 1:
				var closed: bool = r.get("closed", false)
				out.append({"text": "%s：昨天沒人顧店，關門一天" % s.name if closed else "%s：昨天客人 %d、賣出 %d，進帳 %d 兩%s" % [s.name, int(r.customers), int(r.sold), int(r.income), "（%s生意好）" % r.fest if r.has("fest") else ""],
					"state": "todo" if closed else "done", "note": "缺貨跑了 %d 位客人" % int(r.short) if int(r.get("short", 0)) > 0 else r.get("trouble", "")})
		var till := roundi(float(s.till))
		if till >= 20:
			out.append({"text": "%s：櫃上有 %d 兩可收" % [s.name, till], "state": "todo", "note": Biz.prop_def(id).name})
		var count := 0
		for k in s.stock:
			count += int(s.stock[k])
		if count < 5:
			out.append({"text": "%s：貨快賣光了（架上 %d 件）" % [s.name, count], "state": "todo", "note": ""})
		if (s.staff as Array).is_empty():
			out.append({"text": "%s：還沒雇夥計" % s.name, "state": "todo", "note": "櫃台的「經營管理」→「人事」"})
		if till < -50:
			out.append({"text": "%s：櫃上欠了 %d 兩，快要進不了貨" % [s.name, -till], "state": "todo", "note": "到櫃台補錢，或總號帳簿的「帳房」撥款"})
	return out
