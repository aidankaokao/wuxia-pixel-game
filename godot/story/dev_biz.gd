## 開發用：房產與經營的自動測試與模擬（dev_shot 的 run:dev_biz/函式）。不會出現在遊戲裡。
## - setup：直接買下城南東街鋪面、開雜貨鋪、雇兩個夥計、擺貨（給截圖、手動測試用）
## - sim：經濟模擬，各店種照幾種條件跑三十天，印出一個月的淨賺（改了經營數值要重跑）
## - nights：照現在的狀態連過幾個半夜，印出帳本與事件

const Shop := preload("res://story/shop.gd")


static func _open(id: String, t: String, level := 1) -> Dictionary:
	var m := Biz.market()
	m.owned[id] = {"paid": 500, "day": G.day, "cond": 1, "use": "shop"}
	Biz.shops()[id] = {"type": t, "name": "測記%s" % Biz.SHOP_TYPES[t].name, "level": level, "stock": {}, "price": 1, "staff": [], "till": 0, "ledger": [], "opened": G.day}
	if not G.hero.has("titles"):
		G.hero.titles = []
	if not Biz.BIZ_TITLE in G.hero.titles:
		G.hero.titles.append(Biz.BIZ_TITLE)
	return Biz.shops()[id]


static func setup(_ctx: Ctx) -> void:
	var s := _open("ljs_east", "goods")
	Biz.hire_staff(s, "春桃")
	s.stock = {"jinchuang": 6, "tea": 10, "rice": 12, "egg": 8}
	s.till = 35
	Biz.market().owned["ljn_7_6"] = {"paid": 380, "day": G.day - 20, "cond": 1, "use": "rent", "rentFrom": G.day - 15, "event": {"kind": "leak", "day": G.day}}
	var b := Biz.biz()
	b.visited = ["linjiang", "qingzhu", "biyi"]
	b.signed = ["lj_agent"]
	b.contracts["lj_agent"] = {"term": "month", "since": G.day, "until": G.day + 30}
	var m: Dictionary = Biz.MANAGER_POOL[1].duplicate()
	m.merge({"id": "m1", "since": G.day, "skim": 12, "exp": 95, "town": "linjiang"})
	b.managers.append(m)
	print("BIZ setup 完成：", Biz.shops().keys(), " 名下 ", Biz.market().owned.keys())


## 名下有一間還沒開店的鋪面（城南東街），行囊裡有幾樣雜貨
static func own(_ctx: Ctx) -> void:
	Biz.market().owned["ljs_east"] = {"paid": 520, "day": G.day, "cond": 1, "use": "empty"}
	if not G.hero.has("titles"):
		G.hero.titles = []
	G.hero.titles.append(Biz.BIZ_TITLE)
	for k in ["rice", "egg", "tea", "tofu"]:
		G.bag[k] = 6
	G.silver += 500


## 像存檔再讀檔那樣把 G.life 走一趟 JSON（數字都變成小數），看結算與選單還正不正常
static func roundtrip(_ctx: Ctx) -> void:
	G.life = JSON.parse_string(JSON.stringify(G.life))
	G.hero = JSON.parse_string(JSON.stringify(G.hero))
	for k in ["fame", "age", "points", "bag_extra", "hp", "qi", "stamina"]:
		G.hero[k] = int(G.hero.get(k, 0))
	for s in G.hero.skills:
		for k in ["level", "exp", "fails"]:
			s[k] = int(s[k])
	print("BIZ roundtrip 完成")


static func tasks(_ctx: Ctx) -> void:
	for t in load("res://story/daily.gd").tasks():
		print("TASK ", load("res://story/daily.gd").task_line(t))


## 店裡來了地痞
static func ruffian(_ctx: Ctx) -> void:
	Biz.shop("ljs_east").event = {"kind": "ruffian", "day": G.day}


static func rich(_ctx: Ctx) -> void:
	G.silver += 3000
	Biz.refresh_market()


## 三塊空地都蓋好房子：東坡大宅（武人、家具滿級）、東溪瓦頂小院（書香）、西竹青磚宅院（樸素）
static func homes(_ctx: Ctx) -> void:
	var es: Dictionary = load("res://story/estate.gd").estates()
	es.qz_east = {"plot": "qz_east", "tier": 5, "style": "martial", "furniture": {"bed": 3, "stove": 3, "shelf": 3, "dummy": 3, "furnace": 3, "garden": 3}, "rack": {"n": 4, "day": G.day}}
	es.qz_creek = {"plot": "qz_creek", "tier": 3, "style": "scholar", "furniture": {}}
	es.qz_west = {"plot": "qz_west", "tier": 4, "style": "plain", "furniture": {"garden": 2}}


## 打開帳簿（不等它關上，給截圖用）：book_shop 店的帳簿、book_hq 總號、book_hand 經營手冊
static func book_shop(ctx: Ctx) -> void:
	await BizBook.open(ctx.ui, "shop", "ljs_east")


static func book_hq(ctx: Ctx) -> void:
	await BizBook.open(ctx.ui, "hq")


static func book_hand(ctx: Ctx) -> void:
	await BizBook.open(ctx.ui, "handbook")


static func nights(_ctx: Ctx) -> void:
	for i in 12:
		G.day += 1
		G.weather = ["clear", "cloudy", "rain"][i % 3]
		Shop.new_day()
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		print("BIZ ", s.name, " 櫃上 ", roundi(float(s.till)), " 架上 ", s.stock, " 事件 ", s.get("event", {}))
		for r in s.ledger:
			print("  ", Shop.ledger_line(r))
	for id in Biz.market().owned:
		print("BIZ 房 ", id, " ", Biz.market().owned[id], " 欠租 ", Biz.rent_due(Biz.prop_def(id), Biz.market().owned[id]))
	print("BIZ 告示 ", Biz.market().listings)


## 一種條件跑三十天：回傳一個月的 [進帳, 開銷, 淨賺]
static func _month(t: String, level: int, fame: int, staff: Array, guard: String, id: String) -> Array:
	G.life = {"seed": 7}
	G.hero.fame = fame
	var s := _open(id, t, level)
	for n in staff:
		Biz.hire_staff(s, n)
		s.staffInfo[n].morale = 100
	if guard != "":
		s.guard = {"source": guard, "name": Biz.guard_def(guard).names[0], "since": G.day}
	var b := Biz.biz()
	for sp in Biz.SUPPLIERS:
		b.contracts[sp.id] = {"term": "year", "since": G.day, "until": G.day + 999}
	s.supply = {"mode": "order", "targets": {}}
	var srcs := Biz.sources_of(id)
	srcs.sort_custom(func(a, c): return int(Ui.item_def(a.id).price) - int(a.cost) > int(Ui.item_def(c.id).price) - int(c.cost))
	# 架上先補滿（只算一個月裡補貨的本錢，不算開張那天一次進的貨）
	for x in srcs.slice(0, int(Biz.level_def(s).slots)):
		s.supply.targets[x.id] = 12
		s.stock[x.id] = 12
	s.till = 300
	var inc := 0
	var cost := 0
	var day0 := G.day
	for d in 30:
		G.day = day0 + d + 1
		G.weather = ["clear", "cloudy", "clear", "rain", "clear"][d % 5]
		Biz.settle_day(s, id, G.day - 1)
		for n in staff:
			s.staffInfo[n].morale = 100
		var row: Dictionary = s.ledger[s.ledger.size() - 1]
		inc += int(row.income)
		cost += Biz.cost_of(row)
	G.day = day0
	return [inc, cost, inc - cost, srcs.size()]


static func sim(_ctx: Ctx) -> void:
	var keep_life := G.life
	var keep_fame := int(G.hero.get("fame", 0))
	var keep_day := G.day
	# 會做幾道菜（飯館的貨由自家廚房照會的菜做）
	for d in Crafts.data().dishes:
		Crafts.learn_work("cooking", d.id)
	var cases := [["老字號・名聲 200・三夥計・鏢師", 3, 200, ["春桃", "石頭", "蓮兒"], "escort"], ["店鋪・名聲 50・兩夥計", 2, 50, ["春桃", "石頭"], ""], ["小店・名聲 20・一夥計", 1, 20, ["阿貴"], ""]]
	for t in Biz.TYPE_ORDER:
		for c in cases:
			var r := _month(t, c[1], c[2], c[3], c[4], "ljs_east")
			print("SIM %s %s：進帳 %d、開銷 %d、淨賺 %d（可進的貨 %d 種）" % [Biz.SHOP_TYPES[t].name, c[0], r[0], r[1], r[2], r[3]])
	G.life = keep_life
	G.hero.fame = keep_fame
	G.day = keep_day
