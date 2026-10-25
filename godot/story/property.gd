## 房產市場（照網頁版 story/property.ts、maps/property.ts；資料與計算在 scripts/biz.gd）：
## - 縣衙師爺苗守正（linjiang/clerk_talk 轉過來）、萬通牙行的牙人錢六（linjiang/agent_talk）：買屋、賣屋、名下的房子（出租、修繕、進去看看）、收房租與分紅、領賣屋的錢。
## - 買屋談價：照價買、自己談（看名聲與學識，談崩了屋主漲半成、不肯再談）、請牙人（收三分佣金，保證砍六到一成）。
## - 賣屋：市價出售（等幾天，九成到一成二）或降價求售（一兩天，五到八成）；自己出面或請牙人（價錢穩、賣得快，扣三分）。
## - 出售告示貼在公告欄的「日常公告」（notices）；房子裡面是 `prop:物件id`（room_data，Room 載入時呼叫）。
## - 自己名下的房子門打得開、開了店的鋪面換上自己的匾額與幌子（patch_map，Village 載入地圖時呼叫）。
## 沒有用到旗標（狀態在 G.life.property，見 Biz）。

const Shop := preload("res://story/shop.gd")


static func _say(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _who(kind: String) -> Callable:
	return _say("苗守正" if kind == "clerk" else "錢六")


static func _pay(ctx: Ctx, n: int, say: Callable) -> bool:
	if G.silver < n:
		await ctx.say(say.call("這要 %d 兩，你身上只有 %d 兩。" % [n, G.silver]))
		return false
	G.silver -= n
	return true


## 賣掉的房子：領錢
static func _payouts(ctx: Ctx, kind: String) -> void:
	var m := Biz.market()
	for id in m.payout.keys():
		var n := int(m.payout[id])
		await ctx.say([_who(kind).call("%s找到買主了，成交！" % Biz.prop_def(id).name), _who(kind).call("扣掉該扣的，這是你的 %d 兩。" % n)])
		G.silver += n
		m.payout.erase(id)


# ── 師爺與牙人的選單 ──────────────────────────────────────

## 師爺與牙人共用；選了閒聊（或問牙行是做什麼的）回傳 false，讓呼叫的人接著說原本的話
static func menu(ctx: Ctx, kind: String) -> bool:
	Biz.refresh_market()
	await _payouts(ctx, kind)
	var m := Biz.market()
	var ids: Array = m.owned.keys()
	var due := 0
	for id in ids:
		due += int(Biz.rent_due(Biz.prop_def(id), m.owned[id])[0])
	var opts := [["買屋（出售中 %d 間）" % (m.listings as Array).size(), "_buy_menu"]]
	if ids.any(func(id): return not m.selling.has(id)):
		opts.append(["賣屋", "_sell_menu"])
	if ids.size() > 0:
		opts.append(["名下的房子（%d 間）" % ids.size(), "_owned_menu"])
	if due > 0:
		opts.append(["收房租、分紅（%d 兩）" % due, "_collect"])
	if kind == "clerk" and Shop.openable().size() > 0:
		opts.append(["登記商號（在自己的鋪面開店）", "_open_shop"])
	var greet := "房契地契、過戶登記，找在下就對了。要辦什麼？" if kind == "clerk" else "萬通牙行錢六，買房賣房、租屋招租，一句話的事！"
	var c := await ctx.ask(_who(kind).call(greet), opts.map(func(o): return o[0]) + ["閒聊" if kind == "clerk" else "問問牙行是做什麼的", "不用了"])
	if c < opts.size():
		await Callable(load("res://story/property.gd"), opts[c][1]).call(ctx, kind)
		return true
	return c > opts.size()


static func _open_shop(ctx: Ctx, _kind: String) -> void:
	await Shop.open_shop(ctx)


# ── 買屋 ────────────────────────────────────────────────

static func _buy_menu(ctx: Ctx, kind: String) -> void:
	var say := _who(kind)
	var list: Array = Biz.market().listings
	if list.is_empty():
		await ctx.say(say.call("這幾天沒有人要賣房子。過兩天再來，公告欄上一有，我馬上知道。"))
		return
	var i := await ctx.ask(say.call("目前出售中的："), list.map(func(l): return "%s（要價 %d 兩，貼到%s）" % [Biz.prop_def(l.id).name, int(l.price), G.date_text(int(l.until))]) + ["算了"])
	if i < list.size():
		await _buy_one(ctx, kind, list[i].id)


static func _listing(id: String) -> Dictionary:
	for l in Biz.market().listings:
		if l.id == id:
			return l
	return {}


static func _buy_one(ctx: Ctx, kind: String, id: String) -> void:
	var say := _who(kind)
	var p := Biz.prop_def(id)
	var l := _listing(id)
	var line2 := ""
	if p.kind == "business":
		line2 = "%s。買下來照舊經營，原班人馬留下，你當東家，一旬大約分紅 %d 兩。" % [l.reason, Biz.rent_of(p)]
	else:
		line2 = "屋主是%s，%s。屋況：%s。%s" % [p.owner, l.reason, Biz.CONDITION[1], "是間店面，買下來可以開店。" if p.kind == "shop" else "出租的話，一旬大約收 %d 兩。" % Biz.rent_of(p)]
	await ctx.say([say.call("%s：%s" % [p.name, p.desc]), say.call(line2)])
	while true:
		var cur := _listing(id)
		if cur.is_empty():
			return
		var price := int(cur.price)
		var fee := roundi(price * Biz.AGENT_FEE)
		var c := await ctx.ask(say.call("現在的價錢是 %d 兩。" % price), ["先去看看房子", "照價買下（%d 兩）" % price,
			"自己談價（屋主不肯再談了）" if cur.get("haggled", false) else "自己跟屋主談價",
			("請牙人出面（佣金約 %d 兩）" if kind == "clerk" else "交給錢六去談（佣金約 %d 兩）") % fee, "算了"])
		match c:
			0:
				if p.kind == "business":
					await ctx.say(say.call("%s天天開門做生意，你進去看看就知道了。" % p.name))
					continue
				await ctx.say(say.call("房子就在那兒，自己去看吧。門我先替你打開了。"))
				ctx.warp("prop:" + id, spawn_in(p))
				return
			1:
				await _purchase(ctx, kind, p, price, 0)
				return
			2:
				if cur.get("haggled", false):
					await ctx.say(say.call("%s說了，價錢就這樣，不談了。" % p.owner))
				else:
					await _haggle(ctx, p, cur)
			3:
				# 牙人保證砍個六到一成，另收三分佣金
				var deal := Biz._r10(price * (0.9 + randf() * 0.04))
				var cost := roundi(deal * Biz.AGENT_FEE)
				await ctx.say([_say("錢六").call("%s那兒我熟。" % p.owner), _say("錢六").call("……談妥了！%d 兩，另外我的佣金 %d 兩。" % [deal, cost])])
				if await ctx.ask("一共 %d 兩，買下嗎？" % (deal + cost), ["買下", "再想想"]) == 0:
					await _purchase(ctx, kind, p, deal, cost)
				return
			_:
				return


## 自己談價：名聲越高、學識越好越容易；大砍一刀容易談崩
static func _haggle(ctx: Ctx, p: Dictionary, l: Dictionary) -> void:
	var c := await ctx.ask("你找上%s。要怎麼談？" % p.owner, ["誠懇地請屋主讓一點", "挑房子的毛病，大砍一刀", "算了"])
	if c > 1:
		return
	var chance := 0.4 + minf(0.25, int(G.hero.get("fame", 0)) / 300.0) + Crafts.level("learning") * 0.03 - (0.15 if c == 1 else 0.0)
	var owner := _say(p.owner)
	l.haggled = true
	if randf() < chance:
		var cut := (0.1 + randf() * 0.05) if c == 1 else (0.04 + randf() * 0.04)
		l.price = Biz._r10(float(l.price) * (1.0 - cut))
		await ctx.say([owner.call("……好吧好吧，算你眼尖。" if c == 1 else "看你是個實在人，就讓一點吧。"), "（%s讓到 %d 兩）" % [p.owner, int(l.price)]])
	else:
		l.price = Biz._r10(float(l.price) * 1.05)
		await ctx.say([owner.call("嫌東嫌西的，那你別買啊！" if c == 1 else "這價錢已經很公道了。"), "（談崩了。%s不高興，價錢漲到 %d 兩，也不肯再談了）" % [p.owner, int(l.price)]])


static func _purchase(ctx: Ctx, kind: String, p: Dictionary, price: int, fee: int) -> void:
	if not await _pay(ctx, price + fee, _who(kind)):
		return
	var m := Biz.market()
	m.listings = (m.listings as Array).filter(func(x): return x.id != p.id)
	m.owned[p.id] = {"paid": price, "day": G.day, "cond": 1, "use": "business" if p.kind == "business" else "empty"}
	var miao := _say("苗守正")
	var lines := []
	if kind == "agent":
		lines.append(_say("錢六").call("成交！我這就陪你去縣衙過戶。"))
	lines.append(miao.call("過戶辦好了。%s從今天起歸你，這是%s。" % [p.name, "房契與商號的契書" if p.kind == "business" else "房契"]))
	if p.kind == "business":
		lines.append(miao.call("%s照舊經營，%s那邊的人手都留著，你是東家，每旬來收分紅就是。這行當城裡少不得，可不能改做別的。" % [p.name, p.owner]))
	elif p.kind == "shop":
		lines.append(miao.call("這是間店面，日後要開店，再來縣衙登記商號。"))
	else:
		lines.append(miao.call("要出租的話，跟我說一聲，我替你招租。"))
	lines.append("（買下了%s，花了 %d 兩）" % [p.name, price + fee])
	await ctx.say(lines)
	# 第一次買下店面或老店：成了「東家」
	if p.kind != "house":
		await Shop.grant_title(ctx)


# ── 賣屋 ────────────────────────────────────────────────

static func _sell_menu(ctx: Ctx, kind: String) -> void:
	var say := _who(kind)
	var m := Biz.market()
	var ids: Array = m.owned.keys().filter(func(id): return not m.selling.has(id))
	var i := await ctx.ask(say.call("要賣哪一間？"), ids.map(func(id): return "%s（買價 %d 兩）" % [Biz.prop_def(id).name, int(m.owned[id].paid)]) + ["算了"])
	if i >= ids.size():
		return
	var id: String = ids[i]
	var p := Biz.prop_def(id)
	var paid := int(m.owned[id].paid)
	if Biz.shops().has(id):
		await ctx.say(say.call("%s還開著店呢。先到店裡把店收了（歇業），再來賣。" % p.name))
		return
	var mode := await ctx.ask(say.call("要怎麼賣？"), ["市價出售（要等幾天，約 %d～%d 兩）" % [roundi(paid * 0.9), roundi(paid * 1.2)], "降價求售（一兩天就賣掉，約 %d～%d 兩）" % [roundi(paid * 0.5), roundi(paid * 0.8)], "算了"])
	if mode > 1:
		return
	var agent := await ctx.ask(say.call("自己出面跟買主談，還是交給牙人？"), ["自己出面談", "請牙人（佣金三分，價錢穩、賣得快）"]) == 1
	m.selling[id] = Biz.roll_sale(paid, "market" if mode == 0 else "quick", agent)
	# 要賣了，租客搬走（老店照常營業，只是換東家）
	if m.owned[id].use != "business":
		m.owned[id].use = "empty"
	await ctx.say([say.call("好，%s登記出售了，公告欄上會貼出去。" % p.name), say.call("市價賣，得等買主慢慢上門，過些日子再來問。" if mode == 0 else "降價賣，一兩天就有人要。"),
		"（成交了到縣衙或牙行領錢%s）" % ("，牙人佣金三分從裡頭扣" if agent else "")])


# ── 名下的房子 ──────────────────────────────────────────

static func status_text(id: String) -> String:
	var m := Biz.market()
	var o: Dictionary = m.owned[id]
	if m.selling.has(id):
		return "出售中"
	match o.use:
		"shop":
			return "開店中"
		"business":
			return "照舊經營・你是東家"
		"rent":
			return "租給%s" % Biz.tenant_of(id) if Biz.tenant_in(o) else "招租中"
	return "空著"


static func _owned_menu(ctx: Ctx, kind: String) -> void:
	var say := _who(kind)
	var m := Biz.market()
	var ids: Array = m.owned.keys()
	var i := await ctx.ask(say.call("你名下的房子："), ids.map(func(id): return "%s（%s）" % [Biz.prop_def(id).name, status_text(id)]) + ["算了"])
	if i >= ids.size():
		return
	var id: String = ids[i]
	var p := Biz.prop_def(id)
	var o: Dictionary = m.owned[id]
	var cond := int(o.cond)
	if m.selling.has(id):
		if await ctx.ask(say.call("%s正在出售。要撤回嗎？" % p.name), ["撤回，不賣了", "繼續賣"]) == 0:
			m.selling.erase(id)
			await ctx.say(say.call("撤回了。告示我叫人撕下來。"))
		return
	var repair := Biz._r10(float(p.base) * Biz.REPAIR_COST[cond]) if cond < 3 else 0
	if p.kind == "business":
		await ctx.say(say.call("%s：照舊經營，%s，一旬分紅約 %d 兩。行情約 %d 兩。" % [p.name, ["", "原樣", "擴過一次", "大擴"][cond], Biz.rent_of(p, cond), Biz.value_of(p, cond)]))
		if repair == 0:
			return
		if await ctx.ask(say.call("要出錢擴店嗎？%d 兩，之後每旬分紅變成約 %d 兩。" % [repair, Biz.rent_of(p, cond + 1)]), ["出錢擴店", "算了"]) == 0:
			if not await _pay(ctx, repair, say):
				return
			o.cond = cond + 1
			o.paid = int(o.paid) + roundi(repair * 0.8)
			await ctx.say(say.call("%s那邊收了錢，添了人手、擴了門面。%s的生意更旺了。" % [p.owner, p.name]))
		return
	await ctx.say(say.call("%s：屋況「%s」，%s。行情約 %d 兩。" % [p.name, Biz.CONDITION[cond], status_text(id), Biz.value_of(p, cond)]))
	var opts := []
	if p.kind == "house":
		opts.append(["收回來，不租了", "empty"] if o.use == "rent" else ["出租（一旬約 %d 兩）" % Biz.rent_of(p, cond), "rent"])
	if repair > 0:
		opts.append(["修繕（%d 兩，屋況升為「%s」）" % [repair, Biz.CONDITION[cond + 1]], "repair"])
	opts.append(["進去看看", "look"])
	var c := await ctx.ask(say.call("要怎麼處置？"), opts.map(func(x): return x[0]) + ["算了"])
	if c >= opts.size():
		return
	match opts[c][1]:
		"rent":
			o.use = "rent"
			o.rentFrom = G.day
			o.erase("rentPaidTo")
			await ctx.say(say.call("好，我替你貼招租。%s正在找房子，兩三天內就會住進去，每旬收一次租。" % Biz.tenant_of(id)))
		"empty":
			o.use = "empty"
			o.erase("event")
			await ctx.say(say.call("好，%s下旬就搬走。房子空著，隨時可以再租出去。" % Biz.tenant_of(id)))
		"repair":
			if not await _pay(ctx, repair, say):
				return
			o.cond = cond + 1
			# 修繕花的錢，八成算進房子的價值（之後賣的時候照這個算）
			o.paid = int(o.paid) + roundi(repair * 0.8)
			await ctx.say(say.call("工匠來了幾天，屋頂換了瓦、樑柱上了漆，%s現在是「%s」了。" % [p.name, Biz.CONDITION[cond + 1]]))
		"look":
			ctx.warp("prop:" + id, spawn_in(p))


static func _collect(ctx: Ctx, kind: String) -> void:
	var total := 0
	var lines := []
	var m := Biz.market()
	for id in m.owned:
		var o: Dictionary = m.owned[id]
		var p := Biz.prop_def(id)
		var ev: Dictionary = o.get("event", {})
		if ev.get("kind", "") == "late":
			lines.append("%s：%s說手頭緊，這旬交不出來（去房子裡找他談）" % [p.name, Biz.tenant_of(id)])
		var d := Biz.rent_due(p, o)
		if int(d[1]) == 0:
			continue
		if ev.get("kind", "") == "leak" and G.day - int(ev.day) > 5:
			lines.append("%s：屋頂漏雨一直沒修，%s只肯交一半" % [p.name, Biz.tenant_of(id)])
		total += int(d[0])
		if p.kind == "business":
			lines.append("%s：%d 旬的分紅，%d 兩" % [p.name, d[1], d[0]])
			o.rentPaidTo = int(o.get("rentPaidTo", o.day)) + int(d[1]) * Biz.XUN
		else:
			lines.append("%s：%s交了 %d 旬的租，%d 兩" % [p.name, Biz.tenant_of(id), d[1], d[0]])
			o.rentPaidTo = int(o.get("rentPaidTo", int(o.rentFrom) + Biz.TENANT_DAYS)) + int(d[1]) * Biz.XUN
	G.silver += total
	await ctx.say([_who(kind).call("房租都收齊了。"), "%s\n（共 %d 兩）" % ["\n".join(lines), total]])


# ── 縣衙師爺、萬通牙行 ──────────────────────────────────

static func clerk(ctx: Ctx) -> void:
	if await menu(ctx, "clerk"):
		return
	await ctx.say([_say("苗守正").call("在下苗守正，忝為本縣刑名錢穀師爺。"), _say("苗守正").call("房契地契、過戶登記、商號開業，都歸在下管。公告欄上貼著誰家要賣房子，有意思就來找我。")])


static func agent(ctx: Ctx) -> void:
	var qian := _say("錢六")
	# 有了「東家」的稱號：牙行也供貨、介紹掌櫃（story/managers.gd）
	if Biz.has_title():
		var c := await ctx.ask(qian.call("東家今天要辦什麼事？"), ["房子的事", "談供貨合約", "找掌櫃", "沒事"])
		var mg := load("res://story/managers.gd")
		if c == 1:
			await mg.contract_talk(ctx, "lj_agent")
			return
		if c == 2:
			await mg.hire_talk(ctx)
			return
		if c == 3:
			return
	if await menu(ctx, "agent"):
		return
	await ctx.say([qian.call("牙行嘛，就是替人牽線的。買房、賣房、租屋，兩頭說合，成了收個三分佣金。"),
		qian.call("你自己去談也行，可屋主一不高興就漲價；我出面，價錢包你砍得下來，賣的話也賣得快、賣得穩。"),
		qian.call("這城裡哪家要賣房、誰家缺錢，我錢六比縣衙還先知道！")])


# ── 公告欄：出售告示（linjiang.gd 的 notices("daily") 接過來） ──

static func notices() -> Array:
	Biz.refresh_market()
	var m := Biz.market()
	var out := []
	for l in m.listings:
		var p := Biz.prop_def(l.id)
		if p.kind == "business":
			out.append({"title": "轉讓・%s（照舊經營）" % p.name, "text": ["%s%s，欲將店鋪連同生意一併轉讓。" % [p.name, l.reason], p.desc, "接手者須照舊經營，原班人馬留用。要價 %d 兩。" % int(l.price), "有意者請洽縣衙師爺苗守正，或城北萬通牙行錢六。"],
				"by": p.owner, "tag": "要價 %d 兩" % int(l.price)})
		else:
			out.append({"title": "出售・%s" % p.name, "text": ["屋主%s%s，欲將%s出售。" % [p.owner, l.reason, p.name], p.desc, "屋況：%s。要價 %d 兩。" % [Biz.CONDITION[1], int(l.price)], "有意者請洽縣衙師爺苗守正，或城北萬通牙行錢六。"],
				"by": p.owner, "tag": "要價 %d 兩" % int(l.price)})
	for id in m.selling:
		var p2 := Biz.prop_def(id)
		out.append({"title": "出售・%s（你的）" % p2.name, "text": ["%s已登記出售，等候買主。" % p2.name, p2.desc], "by": "臨江縣師爺 代貼"})
	return out


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	var m := Biz.market()
	var out := []
	if m.payout.size() > 0 or m.selling.values().any(func(s): return G.day >= int(s.until)):
		out.append({"text": "房子賣掉了：到臨江縣衙或萬通牙行領錢", "state": "todo", "note": ""})
	var due := 0
	for id in m.owned:
		due += int(Biz.rent_due(Biz.prop_def(id), m.owned[id])[0])
	if due > 0:
		out.append({"text": "收房租、分紅（%d 兩）" % due, "state": "todo", "note": "臨江縣衙或萬通牙行"})
	return out


# ── 地圖：自己的房子門打得開、自己的店換上匾額 ──────────

## 房子在室外地圖上的那棟建築
static func _building(p: Dictionary) -> Dictionary:
	# 樣板城鎮空地上蓋的鋪面
	if p.get("lot", false):
		return TownGen.shop_building(TownGen.lot_def(p.id))
	var f := FileAccess.open("res://data/%s.json" % p.map, FileAccess.READ)
	var d: Dictionary = JSON.parse_string(f.get_as_text())
	for b in d.buildings:
		if int(b.x) == int(p.bx) and int(b.y) == int(p.by):
			return b
	return {}


## 進屋後站哪一格
static func spawn_in(p: Dictionary) -> Dictionary:
	return {"x": 5, "y": 6, "facing": "up"} if p.kind == "shop" else {"x": 4, "y": 5, "facing": "up"}


## Village 載入地圖資料時呼叫：名下的民居、鋪面門打得開；開了店的鋪面換上店名與幌子
static func patch_map(map_id: String, data: Dictionary) -> void:
	var m := Biz.market()
	for b in data.buildings:
		var p := Biz.prop_at(map_id, int(b.x), int(b.y))
		if p.is_empty() or p.kind == "business":
			continue
		if m.owned.has(p.id):
			b.enter = {"to": "prop:" + p.id, "spawn": spawn_in(p)}
		var s := Biz.shop(p.id)
		if not s.is_empty():
			b.name = s.name
			b.sign = s.name
			b.flag = Biz.SHOP_TYPES[s.type].flag
			# 匾額與幌子只有精細版的房子畫得出來：一般民居（同樣五格寬）開了店就換成精細版的瓦房
			if not FineHouse.STYLE.has(b.style):
				b.style = "house"
		elif m.owned.has(p.id):
			b.name = "你的%s" % ("鋪面" if p.kind == "shop" else "房子")


## 房子裡面（Room 載入 prop:物件id 時呼叫）：民居是床、桌、櫃，租出去了租客在屋裡；店面是櫃台、貨架，開了店由經營接手
static func room_data(id: String) -> Dictionary:
	var pid := id.substr(5)
	var p := Biz.prop_def(pid)
	var b := _building(p)
	var dt := Village.door_tile(b)
	var dir: Vector2i = Village.FACE_DIR[b.get("face", "s")]
	var out := {"to": p.map, "spawn": {"x": dt.x + dir.x, "y": dt.y + dir.y, "facing": {"s": "down", "n": "up", "e": "right", "w": "left"}[b.get("face", "s")]}}
	var o := Biz.owned(pid)
	var mine := not o.is_empty()
	var s := Biz.shop(pid)
	if p.kind == "shop":
		var town := Biz.town_name(Biz.town_of_map(p.map))
		var d := {"id": id, "name": p.name, "subtitle": town + ("・你的鋪面" if mine else "・看房"), "theme": "plain",
			"tiles": _room(11, 8, 5), "spawn": spawn_in(p), "exits": [{"tiles": [[5, 7]], "to": out.to, "spawn": out.spawn}], "npcs": [],
			"props": [_prop("counter", 1, 1, 3, "空蕩蕩的櫃台，擦乾淨了就能做生意。" if mine else "前一家留下的櫃台，漆掉了一半。"),
				_prop("jars", 6, 1, 2, "前一家留下的幾個空罈子。"), _prop("jars", 8, 1, 2, "空罈子，角落結了蜘蛛網。"), _prop("f_table_plain_1", 2, 4, 2, "給客人坐的方桌。")]}
		if not s.is_empty():
			Shop.fill_room(d, pid)
		return d
	var tenant := Biz.tenant_of(pid) if mine and Biz.tenant_in(o) else ""
	var npcs := []
	if tenant != "":
		npcs.append(_npc("tenant", tenant, "lady", 3, 3, "down", "shop_events/tenant_talk"))
	return {"id": id, "name": p.name, "subtitle": ("你的房子・租給%s" % tenant if tenant != "" else "你的房子") if mine else "看房", "theme": "plain",
		"tiles": _room(9, 7, 4), "spawn": spawn_in(p), "exits": [{"tiles": [[4, 6]], "to": out.to, "spawn": out.spawn}], "npcs": npcs,
		"props": [_prop("f_bed_plain_1", 1, 1, 2, "%s的床鋪，被子疊得整整齊齊。" % tenant if tenant != "" else "一張舊床板。"),
			_prop("f_table_plain_1", 5, 3, 2, "一張方桌，桌腳墊了塊瓦片。"), _prop("f_shelf_plain_1", 5, 1, 2, "櫃子裡擺著租客的家當。" if tenant != "" else "空櫃子。")]}


## 一間 w×h 的屋子：四周是牆，下緣 door 那一格是出口
static func _room(w: int, h: int, door: int) -> Array:
	var rows := []
	for y in h:
		var r := ""
		for x in w:
			if y == h - 1 and x == door:
				r += "E"
			elif x == 0 or y == 0 or x == w - 1 or y == h - 1:
				r += "W"
			else:
				r += "_"
		rows.append(r)
	return rows


static func _prop(sprite: String, x: int, y: int, w: int, text: String, script := "", label := "") -> Dictionary:
	return {"sprite": sprite, "x": x, "y": y, "w": w, "lines": [{"text": text}] if text != "" else [], "label": label, "script": script}


static func _npc(id: String, name: String, look: String, x: int, y: int, facing: String, script := "", talks: Array = []) -> Dictionary:
	return {"id": id, "name": name, "sprite": look, "x": x, "y": y, "facing": facing, "all_day": true, "work": false, "night": false, "wander": 0,
		"person": "", "script": script, "when": "", "talks": talks}
