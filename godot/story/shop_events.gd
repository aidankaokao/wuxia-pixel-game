## 經營的小事件（照網頁版 story/shop_events.ts）：店裡與租出去的房子偶爾出點事，要東家親自處理（請了掌櫃就照方針辦，見 managers.gd）。
## 店裡（店的 event；對生意的影響在 Biz.event_effect）：
## - raise 夥計想加薪：加（每天多一兩）或不加（一半機會走人）；拖六天沒理，他自己走了。
## - slack 夥計偷懶、帳上短少：訓一頓、扣十兩（可能走人）、辭退。老實的夥計不會。
## - ruffian 地痞「過江龍」蔡三收保護費（客人少四成，店裡出現他和跟班賴四）：繳二十兩保十天、動手（打贏名聲 +3、之後很少來、保二十天；打輸砸兩樣貨）、五兩茶水錢報官保十天。
## - patron 大主顧（周府管事）：五天內交幾件某樣貨，照價加五成。
## - critic 老饕郝一嚐（飯館）：端一道菜，精品客人多兩成五五天、名聲 +2；上品多一成四天；普通的少一成三天。
## - thief 遭小偷（不用處理）：櫃上的錢少四分之一（最多 60 兩），櫃上沒錢就偷走幾樣貨。
## 房子（owned 的 event；房租在 Biz.rent_due）：leak 屋漏（拖過五天房租減半）、late 手頭緊（寬限／催討／免了）、gift 送東西。
## 每天半夜擲（roll_all）：一家店隔四天以上、每天 15%；一間租出去的房子隔六天以上、每天 8%。正月初一照年度加薪的設定給夥計加薪。

const PROTECT := 20
const TENANT_GIFTS := ["egg", "tofu", "f_niangao", "jitang", "baifan"]


static func _say(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


# ── 每天半夜 ────────────────────────────────────────────

static func _pick(s: Dictionary) -> String:
	var opts := []
	# 士氣越低越常鬧加薪、偷懶（平均 50 是一倍，0 是一倍半，100 是半倍）
	var mood := 1.5 - Biz.avg_morale(s) / 100.0
	var g: Dictionary = Biz.guard_def(s.guard.source) if s.has("guard") else {}
	if (s.staff as Array).size() > 0:
		opts.append(["raise", 2.0 * mood])
	if (s.staff as Array).any(func(n): return Biz.staff_def(n).trait != "老實"):
		opts.append(["slack", 2.0 * mood])
	opts.append(["ruffian", (0.5 if s.get("ruffianBeaten", false) else 2.0) * (float(g.ruffian) if not g.is_empty() else 1.0)])
	opts.append(["thief", 1.5 * (float(g.thief) if not g.is_empty() else 1.0)])
	opts.append(["patron", 3.0])
	if s.type == "restaurant":
		opts.append(["critic", 2.0])
	var total := 0.0
	for o in opts:
		total += o[1]
	var x := randf() * total
	for o in opts:
		x -= o[1]
		if x < 0:
			return o[0]
	return ""


## 大主顧要什麼：架上或行囊裡、這家店收的東西
static func _patron_item(s: Dictionary) -> String:
	var pool: Array = s.stock.keys()
	for k in G.bag:
		if Biz.accepts(s.type, k) and not k in pool:
			pool.append(k)
	pool = pool.filter(func(k): return int(Ui.item_def(k).get("price", 0)) > 0)
	return pool.pick_random() if pool.size() > 0 else ""


static func _roll_shop(s: Dictionary) -> void:
	var day := G.day
	var e: Dictionary = s.get("event", {})
	if e.get("kind", "") == "patron" and int(e.until) < day:
		s.erase("event")
	if e.get("kind", "") == "raise" and day - int(e.day) >= 6:
		Biz.drop_staff(s, e.staff)
		Biz.note(s, "%s等不到加薪，捲鋪蓋走了" % e.staff)
		s.erase("event")
	# 士氣太低的夥計，每天一成機會走人
	for n in (s.staff as Array).duplicate():
		if Biz.morale_of(s, n) < 20 and randf() < 0.1:
			Biz.drop_staff(s, n)
			Biz.note(s, "%s心灰意冷，辭工走了" % n)
	# 正月初一：年度加薪
	var dt := G.date_of(day)
	if int(dt.month) == 0 and int(dt.date) == 1 and (s.staff as Array).size() > 0:
		var add := int(s.get("yearly", 0))
		for x in s.staff:
			if add > 0:
				if not s.has("raises"):
					s.raises = {}
				s.raises[x] = int(s.raises.get(x, 0)) + add
			Biz.add_morale(s, x, 10 * add if add > 0 else -5)
		Biz.note(s, "新年照例給夥計們每人加薪 %d 兩，大家幹勁十足" % add if add > 0 else "新年沒加薪，夥計們有點失望")
	if s.has("event") or day - int(s.get("lastEvent", s.opened)) < 4 or randf() >= 0.15:
		return
	var kind := _pick(s)
	if kind == "" or (kind == "ruffian" and int(s.get("safeUntil", 0)) > day):
		return
	if kind == "thief":
		_theft(s)
		return
	# 有保鏢坐鎮：地痞來了當場被打發
	if kind == "ruffian" and s.has("guard"):
		s.lastEvent = day
		s.safeUntil = day + 10
		Biz.note(s, "蔡三上門收保護費，被%s%s三兩下打發走了" % [Biz.guard_def(s.guard.source).title, s.guard.name])
		return
	var ev := {"kind": kind, "day": day}
	if kind == "raise":
		ev.staff = (s.staff as Array).pick_random()
	if kind == "slack":
		ev.staff = (s.staff as Array).filter(func(n): return Biz.staff_def(n).trait != "老實").pick_random()
	if kind == "patron":
		var item := _patron_item(s)
		if item == "":
			return
		ev.item = item
		ev.n = 3 + randi() % 4
		ev.until = day + 5
	s.event = ev
	s.lastEvent = day


static func _theft(s: Dictionary) -> void:
	s.lastEvent = G.day
	if float(s.till) >= 20:
		var n := mini(60, roundi(float(s.till) / 4.0))
		s.till = float(s.till) - n
		Biz.note(s, "夜裡遭了小偷，櫃上的錢少了 %d 兩" % n)
		return
	var lost := []
	for k in (s.stock.keys() as Array).slice(0, 3):
		var n2 := mini(int(s.stock[k]), 2)
		s.stock[k] = int(s.stock[k]) - n2
		if int(s.stock[k]) <= 0:
			s.stock.erase(k)
		lost.append("%s×%d" % [Ui.item_def(k).get("name", k), n2])
	if lost.size() > 0:
		Biz.note(s, "夜裡遭了小偷，偷走了%s" % "、".join(lost))


static func _roll_houses() -> void:
	var m := Biz.market()
	for id in m.owned:
		var o: Dictionary = m.owned[id]
		var e: Dictionary = o.get("event", {})
		if e.get("kind", "") == "gift" and G.day - int(e.day) > 5:
			o.erase("event")
		if not Biz.tenant_in(o) or o.has("event") or G.day - int(o.get("lastEvent", o.get("rentFrom", 0))) < 6 or randf() >= 0.08:
			continue
		var r := randf()
		o.event = {"kind": "leak" if r < 0.4 else ("late" if r < 0.7 else "gift"), "day": G.day}
		o.lastEvent = G.day


## 每天半夜（shop.gd 結算完帳以後呼叫）
static func roll_all() -> void:
	for id in Biz.shops():
		_roll_shop(Biz.shops()[id])
	_roll_houses()


# ── 店裡的事 ────────────────────────────────────────────

## 店裡現在有沒有要東家處理的事（櫃台選單第一項；沒有是空字串）
static func label(id: String) -> String:
	var e: Dictionary = Biz.shop(id).get("event", {})
	if e.is_empty() or int(e.day) > G.day:
		return ""
	match e.kind:
		"raise":
			return "%s想跟東家談談工錢" % e.staff
		"slack":
			return "帳對不上，好像少了錢"
		"ruffian":
			return "門口有地痞來收保護費"
		"patron":
			return "大主顧訂了%s×%d（%s前）" % [Ui.item_def(e.item).get("name", e.item), int(e.n), G.date_text(int(e.until))]
		"critic":
			return "來了個挑嘴的老饕"
	return ""


static func handle(ctx: Ctx, id: String) -> void:
	var e: Dictionary = Biz.shop(id).get("event", {})
	match e.get("kind", ""):
		"raise":
			await _raise(ctx, id, e.staff)
		"slack":
			await _slack(ctx, id, e.staff)
		"ruffian":
			await _ruffian(ctx, id)
		"patron":
			await _patron(ctx, id, e)
		"critic":
			await _critic(ctx, id)


## 店裡的地痞、老饕：跟他說話就是處理這件事
static func npc(ctx: Ctx) -> void:
	var rid: String = ctx.scene.get("room_id")
	var Shop := load("res://story/shop.gd")
	var before: String = Shop.people_key(rid.substr(5))
	await handle(ctx, rid.substr(5))
	Shop.reload_if_changed(ctx, rid.substr(5), before)


static func _raise(ctx: Ctx, id: String, name: String) -> void:
	var s := Biz.shop(id)
	var say := _say(name)
	var c := await ctx.ask(say.call("東家……我在店裡也做了一陣子了，一天 %d 兩實在不夠家裡用，能不能多給一兩？" % Biz.wage_of(s, name)), ["加（每天多一兩）", "不加", "再想想"])
	if c == 2:
		return
	s.erase("event")
	if c == 0:
		if not s.has("raises"):
			s.raises = {}
		s.raises[name] = int(s.raises.get(name, 0)) + 1
		Biz.add_morale(s, name, 20)
		await ctx.say(say.call("謝謝東家！往後我一定更賣力！"))
	elif randf() < 0.5:
		Biz.drop_staff(s, name)
		await ctx.say([say.call("……那我另謀高就了。東家保重。"), "（%s收拾東西走了）" % name])
	else:
		Biz.add_morale(s, name, -15)
		await ctx.say([say.call("……知道了。"), "（%s嘴上不說，臉色不太好看）" % name])


static func _slack(ctx: Ctx, id: String, name: String) -> void:
	var s := Biz.shop(id)
	var say := _say(name)
	await ctx.say(["你翻了翻帳本，這幾天的進帳跟架上少的貨對不上，差了好些。", "一問之下，%s支支吾吾，原來是趁你不在溜出去喝茶，還讓客人賒了帳沒記。" % name])
	var c := await ctx.ask("怎麼處置？", ["訓一頓就算了", "扣十兩工錢", "辭退%s" % name, "再想想"])
	if c == 3:
		return
	s.erase("event")
	if c == 0:
		Biz.add_morale(s, name, -5)
		await ctx.say(say.call("東家教訓得是，下回再也不敢了。"))
	elif c == 1:
		s.till = float(s.till) + 10
		if randf() < 0.25:
			Biz.drop_staff(s, name)
			await ctx.say([say.call("扣工錢？這活兒我不幹了！"), "（%s甩手走了。扣下的十兩放回櫃上）" % name])
		else:
			Biz.add_morale(s, name, -15)
			await ctx.say([say.call("……是，我認了。"), "（扣下的十兩放回櫃上）"])
	else:
		Biz.drop_staff(s, name)
		await ctx.say("（%s低著頭走了）" % name)


static func _ruffian(ctx: Ctx, id: String) -> void:
	var cai := _say("蔡三")
	await ctx.say(["一個敞著衣襟的漢子大剌剌地坐在門口的桌上，跟班賴四堵著門。", cai.call("喲，東家來啦？在下過江龍蔡三，這條街上的平安，歸我管。"),
		cai.call("一旬 %d 兩，保你的店平平安安。不給嘛……客人進不進得來，可就難說了。" % PROTECT)])
	var c := await ctx.ask("怎麼辦？", ["給錢（%d 兩，保十天）" % PROTECT, "動手把他們打出去", "派夥計去縣衙報官（五兩茶水錢）", "再想想"])
	if c == 3:
		return
	if c == 0:
		if not ctx.pay(PROTECT):
			await ctx.say(cai.call("沒錢？那就明天再來！"))
			return
		var s := Biz.shop(id)
		s.safeUntil = G.day + 10
		s.erase("event")
		await ctx.say([cai.call("爽快！往後有事報我蔡三的名號。"), "（蔡三帶著跟班晃走了）"])
		ctx.refresh()
		return
	if c == 2:
		if not ctx.pay(5):
			await ctx.say("你摸了摸錢袋，連五兩茶水錢都湊不出來。")
			return
		var s2 := Biz.shop(id)
		s2.safeUntil = G.day + 10
		s2.erase("event")
		await ctx.say(["夥計一路跑到縣衙。不多時，捕快雷小五提著鐵尺過來，在門口一站。", _say("雷小五").call("蔡三！又是你！滾滾滾，再讓我看見你在這條街收錢，就拎你回去吃牢飯！"),
			cai.call("……雷爺，誤會，誤會。"), "（蔡三灰溜溜地走了。往後十天，捕快巡街會多繞過來看一眼）"])
		ctx.refresh()
		return
	var r := await ctx.battle("shop_ruffians")
	var s3 := Biz.shop(id)
	if r == "win":
		s3.ruffianBeaten = true
		s3.safeUntil = G.day + 20
		s3.erase("event")
		await ctx.say([cai.call("哎喲……好漢饒命！小的有眼不識泰山！"), "蔡三連滾帶爬地跑了。街坊們探出頭來，有人帶頭拍起手。"])
		ctx.fame(3)
		ctx.refresh()
		return
	if r == "lose":
		return
	# 打輸、逃了：他們砸了幾樣貨走人，事情還沒完
	var lost := []
	for k in (s3.stock.keys() as Array).slice(0, 2):
		var n := mini(int(s3.stock[k]), 2)
		s3.stock[k] = int(s3.stock[k]) - n
		if int(s3.stock[k]) <= 0:
			s3.stock.erase(k)
		lost.append("%s×%d" % [ctx.item_name(k), n])
	await ctx.say([cai.call("就這點本事？哈哈哈！"), "蔡三一夥掀了貨架，揚長而去。%s" % ("（砸壞了%s）" % "、".join(lost) if lost.size() > 0 else ""), "（他們明天還會再來）"])


static func _patron(ctx: Ctx, id: String, e: Dictionary) -> void:
	var s := Biz.shop(id)
	var item: String = e.item
	var n := int(e.n)
	var unit := roundi(Biz.shop_price(s, item) * 1.5)
	var have := int(G.bag.get(item, 0)) + int(s.stock.get(item, 0))
	var clerk: String = s.staff[0] if (s.staff as Array).size() > 0 else "夥計"
	await ctx.say({"speaker": clerk, "text": "東家，周員外府上的管事來過，說要訂%s %d 件，%s以前送到，一件給 %d 兩。" % [ctx.item_name(item), n, G.date_text(int(e.until)), unit]})
	var c := await ctx.ask("身上加架上共有 %d 件。" % have, ["交貨（收 %d 兩）" % (unit * n) if have >= n else "還不夠（差 %d 件）" % (n - have), "回絕這筆生意", "再想想"])
	if c == 2:
		return
	if c == 1:
		s.erase("event")
		await ctx.say("（你讓夥計去回了周府的管事）")
		return
	if have < n:
		await ctx.say("貨還不夠，期限之前湊齊了再來交。")
		return
	# 先從行囊拿，不夠再從架上拿
	var from_bag := mini(n, int(G.bag.get(item, 0)))
	ctx.take(item, from_bag)
	var rest := n - from_bag
	if rest > 0:
		s.stock[item] = int(s.stock[item]) - rest
		if int(s.stock[item]) <= 0:
			s.stock.erase(item)
	G.silver += unit * n
	s.erase("event")
	await ctx.say("%s×%d 送到了周府。管事點了點貨，爽快地付了 %d 兩。" % [ctx.item_name(item), n, unit * n])
	ctx.fame(1)
	await ctx.say("（大戶人家的生意做成了，名聲 +1）")


static func _quality(k: String) -> int:
	return 3 if k.ends_with("_3") else (2 if k.ends_with("_2") else 1)


static func _critic(ctx: Ctx, id: String) -> void:
	var s := Biz.shop(id)
	var hao := _say("郝一嚐")
	var dishes := []
	for k in s.stock.keys() + G.bag.keys():
		if Ui.item_def(k).has("dish") and not k in dishes and int(s.stock.get(k, 0)) + int(G.bag.get(k, 0)) > 0:
			dishes.append(k)
	await ctx.say(["角落裡坐著一個圓臉的中年人，筷子在桌上點了點。", hao.call("在下郝一嚐，吃遍大江南北。聽說這家館子開張了，特來嚐嚐。"), hao.call("東家，挑一道你最拿手的來。")])
	if dishes.is_empty():
		await ctx.say(hao.call("……一道菜都沒有？那我改天再來。"))
		return
	var i := await ctx.ask("端哪一道給他？", dishes.map(func(k): return ctx.item_name(k)) + ["再想想"])
	if i >= dishes.size():
		return
	var k: String = dishes[i]
	if int(G.bag.get(k, 0)) > 0:
		ctx.take(k, 1)
	else:
		s.stock[k] = int(s.stock[k]) - 1
		if int(s.stock[k]) <= 0:
			s.stock.erase(k)
	var q := _quality(k)
	s.buzz = {"until": G.day + 5, "mult": 1.25} if q == 3 else ({"until": G.day + 4, "mult": 1.1} if q == 2 else {"until": G.day + 3, "mult": 0.9})
	s.erase("event")
	await ctx.say("你端上一盤%s。郝一嚐夾了一筷子，閉著眼嚼了很久。" % ctx.item_name(k))
	if q == 3:
		await ctx.say([hao.call("……好！火候、刀工、滋味，樣樣到位。"), hao.call("這一道，望江樓也做不出來！"), "（郝一嚐逢人就誇。往後五天，客人多了兩成五）"])
		ctx.fame(2)
	elif q == 2:
		await ctx.say([hao.call("嗯，不錯，是用了心的。"), "（往後四天，客人多了一成）"])
	else:
		await ctx.say([hao.call("……就這樣？家常菜嘛。"), "（郝一嚐搖搖頭走了。往後三天，客人少了一成）"])
	ctx.refresh()


# ── 租出去的房子 ────────────────────────────────────────

static func leak_cost(id: String) -> int:
	return maxi(8, roundi(float(Biz.prop_def(id).get("rent", 20)) * 0.6))


## 跟租客說話：有事就處理，沒事就閒聊
static func tenant_talk(ctx: Ctx) -> void:
	var rid: String = ctx.scene.get("room_id")
	var id := rid.substr(5)
	var name := Biz.tenant_of(id)
	var say := _say(name)
	var o := Biz.owned(id)
	var e: Dictionary = o.get("event", {})
	match e.get("kind", ""):
		"leak":
			var cost := leak_cost(id)
			if await ctx.ask(say.call("東家，前幾天下雨，屋頂漏得厲害，盆子都接不過來……能不能找人修一修？"), ["請泥水匠來修（%d 兩）" % cost, "過幾天再說"]) != 0:
				await ctx.say([say.call("……好，那我先拿盆子接著。"), "（拖過五天，房租只收得到一半）"])
				return
			if not ctx.pay(cost):
				await ctx.say("要 %d 兩，你身上不夠。" % cost)
				return
			o.erase("event")
			await ctx.say(["泥水匠爬上屋頂，換了十幾片瓦、補了泥灰。", say.call("東家真是好人！往後房租我一定按時交。")])
			return
		"late":
			var c := await ctx.ask(say.call("東家……這陣子手頭實在緊，這一旬的租，能不能寬限幾天？"), ["寬限（下一旬一起交）", "催他先交一半", "這旬免了（名聲 +1）"])
			if c == 0:
				o.event = {"kind": "gift", "day": G.day}
				await ctx.say([say.call("多謝東家！"), "（租客感激得很。下次來屋裡，他會送點東西）"])
			elif c == 1:
				var half := roundi(float(Biz.prop_def(id).rent) / 2.0)
				G.silver += half
				o.erase("event")
				var leave := randf() < 0.3
				if leave:
					o.rentFrom = G.day
				await ctx.say([say.call("……是，這是半旬的錢。"), "（收了 %d 兩）" % half] + (["（過了兩天，%s搬走了。牙行說會再找新租客）" % name] if leave else []))
			else:
				o.erase("event")
				o.rentPaidTo = int(o.get("rentPaidTo", int(o.get("rentFrom", G.day)) + Biz.TENANT_DAYS)) + Biz.XUN
				await ctx.say(say.call("東家……這、這份情我記下了！"))
				ctx.fame(1)
			return
		"gift":
			var pool := TENANT_GIFTS.filter(func(x): return not Ui.item_def(x).is_empty())
			if pool.size() > 0:
				o.erase("event")
				await ctx.say(say.call("東家來得正好！家裡做了些吃的，您帶兩份回去嚐嚐。"))
				await ctx.give(pool.pick_random(), 2)
				return
	var lines := [["東家來啦！屋子住得挺好的。", "房租我都按旬交到縣衙，您去收就是了。"], ["隔壁那家的狗又跑進院子裡了……沒事沒事，我趕出去了。"], ["東家吃過了沒？要不要喝碗茶再走？"]]
	await ctx.say((lines[G.day % lines.size()] as Array).map(func(t): return say.call(t)))


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	var out := []
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		var e: Dictionary = s.get("event", {})
		if e.is_empty() or int(e.day) > G.day:
			continue
		var t: String = {"raise": "%s想加薪" % e.get("staff", ""), "slack": "帳對不上", "ruffian": "地痞上門收保護費",
			"patron": "大主顧訂了%s×%d" % [Ui.item_def(e.get("item", "")).get("name", ""), int(e.get("n", 0))], "critic": "老饕上門"}[e.kind]
		out.append({"text": "%s：%s" % [s.name, t], "state": "todo", "note": "%s前交貨" % G.date_text(int(e.until)) if e.kind == "patron" else "到店裡處理"})
	var m := Biz.market()
	for id in m.owned:
		var ev: Dictionary = m.owned[id].get("event", {})
		if ev.is_empty():
			continue
		var t2: String = {"leak": "屋頂漏雨", "late": "手頭緊，房租交不出來", "gift": "有東西要送你"}[ev.kind]
		out.append({"text": "%s：%s%s" % [Biz.prop_def(id).name, Biz.tenant_of(id), t2], "state": "todo", "note": "到房子裡找租客"})
	return out
