## 樣板城鎮村的店家、告示欄、空地（PLAN.md 4.41；地圖與室內由 scripts/town_gen.gd 產生，設定在 data/towns.json）：
## - 店：櫃台與掌櫃都接 shop，照店種做事（住店打尖、點菜、喝茶、看診買藥、雜貨、兵器、衣裳、買馬、衙門辦事、典當、錢莊、書肆、看戲、營造、村長）。
##   掌櫃過世了換夥計顧著，生意照做（之後再設計誰接手）。
## - 告示欄 board：towns.json 的 notices，加上還沒賣掉的空地。
## - 空地 lot：買下來（地契），再決定蓋自宅（附贈茅草屋，擴建、家具找城裡的木作，見 estate.gd）或蓋鋪面（蓋好登記商號就能開店，見 shop.gd）；
##   武館之後開放。狀態在 G.life.lots（TownGen.lot_state），鋪面另外記進房產 Biz.market().owned，自宅記進 estate 的 G.life.estates。
## - patch_map：Village 載入樣板地圖時，照空地的狀態擺木牌與木樁、蓋自宅或鋪面。
## 一天一次的事記在 G.life.daily：town:<地圖>:rumor 打聽過、town:<地圖>:opera 看過戲。沒有用到旗標。

const Train := preload("res://story/train.gd")
const Estate := preload("res://story/estate.gd")
const Shop := preload("res://story/shop.gd")
const Stay := preload("res://story/stay.gd")
const Weaving := preload("res://story/weaving.gd")
const Arts := preload("res://story/arts.gd")
const Festival := preload("res://story/festival.gd")
const Linjiang := preload("res://story/linjiang.gd")

const INN_PRICE := {"fu": 6, "county": 5, "town": 4, "village": 3}
const RUMOR_PRICE := 2
const TEA_PRICE := 2
const HEAL_PRICE := 10
const OPERA_PRICE := {"fu": 5, "county": 3}
const READ_PRICE := 2
## 蓋鋪面的工錢（佔地價的比例）
const SHOP_BUILD := 0.5
const MENU := ["baifan", "yangchun", "doufutang", "hongdou", "rouzao", "luobotang"]
const MENU_CITY := ["danchaofan", "jitang", "guihua", "tangcu"]
const MENU_FU := ["laweifan", "tangyuan", "xingren", "qingzheng"]
const MENU_FLAVOR := {"coast": ["yuzhou", "xiahun", "haidai"], "lake": ["jiyu", "lingjiao", "yinyu"], "canal": ["tangcu", "qingxia"], "river": ["qingxia", "yuwan"], "mulberry": ["ouzhou"], "tea": ["jitang"], "hill": ["jitang", "luobotang"]}
const CLINIC := ["jinchuang", "huiqi_san", "yangqi_wan", "herb"]
const CLINIC_BUYS := ["herb", "mushroom", "boar_tusk"]
const GOODS := ["rice", "flour", "egg", "tofu", "greens", "radish", "sugar", "redbean", "rod", "fish_net", "cotton_thread", "firecracker", "red_lantern"]
const GOODS_FLAVOR := {"coast": ["sea_fish", "shrimp", "seaweed"], "lake": ["crucian", "lotus_root", "water_chestnut"], "tea": ["yunwu", "tea"], "hill": ["mushroom", "herb"], "canal": ["carp", "grass_carp"], "river": ["carp"], "mulberry": ["silk_thread"]}
const SMITH := ["w_wood_sword", "w_iron_sword", "w_chopper", "w_saber", "g_bracer"]
const SMITH_CITY := ["w_steel_sword", "w_goose_saber", "g_iron_bracer"]
const CLOTH := ["g_headband", "g_cap", "g_shortcoat", "g_gown", "g_rough_pants", "g_pants", "g_sandals", "g_shoes", "g_sachet"]
const CLOTH_CITY := ["g_brocade", "g_boots"]
const SILK := ["cotton_thread", "silk_thread", "fine_silk"]
const HORSES := {"fu": ["old_bay", "jujube", "qingcong"], "county": ["old_bay", "jujube"], "town": ["old_bay", "jujube"]}
const BOOKS := ["manual_basic_fist", "manual_breathing"]
const PLAYS := [["斷江記", "百年前一劍斷江的劍客，為了救一船的百姓，在江心跟水寇打了三天三夜。"], ["桑園會", "書生在桑園裡遇見採桑的姑娘，一首詩換來一輩子。"],
	["潮信刀", "海崖上的刀客看潮練刀，一刀比一刀快，最後一刀劈開了浪頭。"], ["白水渡", "落難的公子在白水渡被船家所救，十年後回來報恩。"]]


static func _say(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func _pay(ctx: Ctx, n: int, who: String) -> bool:
	if ctx.pay(n):
		return true
	await ctx.say(_say(who).call("這得 %d 兩……您身上好像不太夠。" % n))
	return false


## 這間店：{map, i, kind, name, keeper 人物 id, who 現在顧店的人, cfg}
static func _here(ctx: Ctx) -> Dictionary:
	var rid: String = ctx.scene.get("room_id")
	var parts := rid.split(":")
	var map: String = parts[1]
	var i := int(parts[2])
	var c := TownGen.cfg(map)
	var sh: Array = c.shops[i]
	var pid: String = sh[2]
	return {"map": map, "i": i, "kind": sh[0], "name": sh[1], "keeper": pid, "who": Person.full_name(pid) if Person.alive(pid) else "夥計", "cfg": c,
		"script": sh[3] if sh.size() > 3 else ""}


## 第四欄「檔名/函式」指到的劇情（手工做的城裡，店家另外有事）：func(ctx, h)
static func _override(h: Dictionary) -> Callable:
	var parts: PackedStringArray = String(h.script).split("/")
	return Callable(load("res://story/%s.gd" % parts[0]), parts[1])


## 今天打聽到的消息（一天一則，店家各說各的）
static func _rumor(ctx: Ctx, h: Dictionary) -> void:
	var key := "town:%s:rumor:%d" % [h.map, h.i]
	var say := _say(h.who)
	if int(_daily().get(key, 0)) == G.day:
		await ctx.say(say.call("今天該說的都說啦，明天再來，保準有新鮮事。"))
		return
	var pool: Array = h.cfg.get("rumors", [])
	if pool.is_empty():
		await ctx.say(say.call("這兒沒什麼新鮮事。"))
		return
	_daily()[key] = G.day
	await ctx.say(say.call(pool[(G.day + h.i) % pool.size()]))


# ── 店 ──────────────────────────────────────────────────

static func shop(ctx: Ctx) -> void:
	var h := _here(ctx)
	if h.script != "":
		await _override(h).call(ctx, h)
		return
	await default_shop(ctx, h)


## 店裡另外站的人（shops 的第五欄）：交給第四欄劇情檔的 extra(ctx, 人物 id, h)
static func extra(ctx: Ctx) -> void:
	var h := _here(ctx)
	var parts: PackedStringArray = String(h.script).split("/")
	await Callable(load("res://story/%s.gd" % parts[0]), "extra").call(ctx, ctx.extra.get("npc", ""), h)


## 照店種的一般做法（手工做的店也可以先處理自己的事，再交回這裡）
static func default_shop(ctx: Ctx, h: Dictionary) -> void:
	match h.kind:
		"inn":
			await _inn(ctx, h)
		"restaurant":
			await _restaurant(ctx, h)
		"teahouse":
			await _teahouse(ctx, h)
		"clinic":
			await _clinic(ctx, h)
		"goods":
			await _goods(ctx, h)
		"smith":
			await _smith(ctx, h)
		"cloth":
			await _cloth(ctx, h)
		"stable":
			await _stable(ctx, h)
		"yamen":
			await _yamen(ctx, h)
		"pawn":
			await _pawn(ctx, h)
		"bank":
			await _bank(ctx, h)
		"books":
			await _books(ctx, h)
		"opera":
			await _opera(ctx, h)
		"builder":
			await _builder(ctx, h)
		"chief":
			await _chief(ctx, h)


static func _inn(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var price: int = INN_PRICE[h.cfg.tier]
	var c := await ctx.ask(say.call("客官，住店還是打尖？"), ["住店（%d 兩，睡到天亮）" % price, "打尖（喝壺茶 %d 兩，聽聽傳聞）" % RUMOR_PRICE, "不用了"])
	if c == 0:
		if not await _pay(ctx, price, h.who):
			return
		await ctx.say(say.call("樓上的房間，被褥都是新曬的。"))
		await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？")
	elif c == 1:
		if int(_daily().get("town:%s:rumor:%d" % [h.map, h.i], 0)) != G.day and not await _pay(ctx, RUMOR_PRICE, h.who):
			return
		await _rumor(ctx, h)


static func _menu(h: Dictionary) -> Array:
	var out := MENU.duplicate()
	if h.cfg.tier in ["fu", "county"]:
		out += MENU_CITY
	if h.cfg.tier == "fu":
		out += MENU_FU
	for d in MENU_FLAVOR.get(h.cfg.get("flavor", ""), []):
		if not d in out:
			out.append(d)
	return out


static func _restaurant(ctx: Ctx, h: Dictionary) -> void:
	if await ctx.ask(_say(h.who).call("客官裡邊請！今天想吃點什麼？"), ["點菜", "不用了"]) == 0:
		await ctx.ui.shop("%s・菜單" % h.name, _menu(h), 0.5)


static func _teahouse(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var c := await ctx.ask(say.call("來啦！坐下喝壺茶？"), ["喝壺茶（%d 兩，歇一刻，聽聽閒話）" % TEA_PRICE, "買茶葉", "不用了"])
	if c == 0:
		if not await _pay(ctx, TEA_PRICE, h.who):
			return
		ctx.pass_time(1)
		var d := Hero.derive(G.hero)
		G.hero.qi = mini(d.max_qi, int(G.hero.qi) + 20)
		G.hero.stamina = mini(d.max_stamina, int(G.hero.get("stamina", 0)) + 10)
		await ctx.say("你挑了張靠窗的桌子，慢慢喝完一壺茶。\n（花了一刻。內力 +20、體力 +10）")
		await _rumor(ctx, h)
	elif c == 1:
		await ctx.shop("%s・茶葉" % h.name, ["tea", "yunwu"])


static func _clinic(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var stock := CLINIC.duplicate()
	if h.cfg.tier in ["fu", "county"]:
		stock.insert(2, "dahuan_dan")
	var c := await ctx.ask(say.call("哪裡不舒服？"), ["買藥", "賣草藥", "看傷（%d 兩，氣血、內力回滿）" % HEAL_PRICE, "不用了"])
	if c == 0:
		await ctx.shop(h.name, stock)
	elif c == 1:
		await ctx.ui.shop("%s・收草藥" % h.name, [], 0.7, 0.0, CLINIC_BUYS)
	elif c == 2:
		var d := Hero.derive(G.hero)
		if int(G.hero.hp) >= d.max_hp and int(G.hero.qi) >= d.max_qi:
			await ctx.say(say.call("你氣色好得很，不用看。"))
			return
		if not await _pay(ctx, HEAL_PRICE, h.who):
			return
		ctx.pass_time(2)
		G.hero.hp = d.max_hp
		G.hero.qi = d.max_qi
		await ctx.say([say.call("躺好，別動。"), "%s推拿、扎針、敷藥，一氣呵成。" % h.who, "（花了兩刻。氣血、內力回滿）"])


static func _goods(ctx: Ctx, h: Dictionary) -> void:
	var stock := GOODS.duplicate()
	for g in GOODS_FLAVOR.get(h.cfg.get("flavor", ""), []):
		if not g in stock:
			stock.append(g)
	if h.cfg.tier == "village":
		stock = stock.slice(0, 8) + GOODS_FLAVOR.get(h.cfg.get("flavor", ""), []) + ["jinchuang", "tea"]
	var c := await ctx.ask(_say(h.who).call("要買點什麼？油鹽醬醋、針頭線腦，樣樣都有。"), ["買東西", "賣東西", "不用了"])
	if c == 0:
		await ctx.shop(h.name, stock)
	elif c == 1:
		await ctx.ui.shop("%s・收購" % h.name, [])


static func _smith(ctx: Ctx, h: Dictionary) -> void:
	var stock := SMITH.duplicate()
	if h.cfg.tier in ["fu", "county"]:
		stock += SMITH_CITY
	if await ctx.ask(_say(h.who).call("刀劍、護具，都是這爐子裡打出來的。看看？"), ["看兵器", "不用了"]) == 0:
		await ctx.shop(h.name, stock)


static func _cloth(ctx: Ctx, h: Dictionary) -> void:
	var stock := CLOTH.duplicate()
	if h.cfg.tier in ["fu", "county"]:
		stock += CLOTH_CITY
	var silk: bool = h.cfg.get("flavor", "") == "mulberry"
	var opts := ["看看衣物", "買紡織的材料"] + (["學紡織"] if silk else []) + ["不用了"]
	var c := await ctx.ask(_say(h.who).call("客官要看看什麼？" + ("桑林的絲，天下第一。" if silk else "")), opts)
	match opts[c]:
		"看看衣物":
			await ctx.shop(h.name, stock)
		"買紡織的材料":
			await ctx.shop("%s・絲線" % h.name, SILK if silk else SILK.slice(0, 2))
		"學紡織":
			await Weaving.teach(ctx, h.who)


static func _stable(ctx: Ctx, h: Dictionary) -> void:
	var horses: Array = HORSES.get(h.cfg.tier, [])
	if horses.is_empty():
		await ctx.say(_say(h.who).call("馬都租出去了，過些日子再來。"))
		return
	await Stay.horse_trade(ctx, h.who, horses)


## 衙門的師爺：空地的事、登記商號、告示
static func _yamen(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var mine := _lot_shops(h.map).filter(func(id): return Biz.market().owned.get(id, {}).get("use", "") != "shop" and not Biz.shops().has(id))
	var opts := ["問問城裡的空地"] + (["登記商號（在自己的鋪面開店）"] if mine.size() > 0 else []) + ["閒聊", "不用了"]
	var c := await ctx.ask(say.call("房契地契、商號登記，都歸在下管。有什麼事？"), opts)
	match opts[c]:
		"問問城裡的空地":
			await ctx.say(say.call(_lots_text(h.map)))
		"登記商號（在自己的鋪面開店）":
			await Shop.open_shop(ctx, mine, h.who)
		"閒聊":
			await _rumor(ctx, h)


static func _pawn(ctx: Ctx, h: Dictionary) -> void:
	var c := await ctx.ask(_say(h.who).call("當東西，還是看看死當的貨？"), ["看看死當貨（每旬換一批）", "典當", "不用了"])
	if c == 0:
		await ctx.ui.shop("%s・死當貨" % h.name, Linjiang.pawn_stock(), 0.5)
	elif c == 1:
		await ctx.ui.shop("%s・典當" % h.name, [], Linjiang.PAWN_RATE)


## 錢莊：存銀子、取銀子（存在 G.life.bank，不算利錢；走到哪個城的錢莊都取得到）
static func _bank(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var saved := int(G.life.get("bank", 0))
	var c := await ctx.ask(say.call("存銀子、取銀子？青蚨錢莊的銀票，煙州哪家分號都認。（存著 %d 兩）" % saved), ["存一百兩", "全部存起來", "取一百兩", "全部取出來", "不用了"])
	var n := 0
	match c:
		0:
			n = mini(100, G.silver)
		1:
			n = G.silver
		2:
			n = -mini(100, saved)
		3:
			n = -saved
		_:
			return
	if n == 0:
		await ctx.say(say.call("您這……沒有銀子可存，也沒有銀子可取啊。"))
		return
	G.silver -= n
	G.life.bank = saved + n
	await ctx.say(say.call("%s %d 兩，您收好票據。（錢莊裡存著 %d 兩）" % ["存了" if n > 0 else "取了", absi(n), int(G.life.bank)]))


static func _books(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var c := await ctx.ask(say.call("看書？買書？店裡的書都能翻，坐一會兒收 %d 兩茶水錢。" % READ_PRICE), ["坐下來讀書（%d 兩）" % READ_PRICE, "買書", "不用了"])
	if c == 0:
		if not await _pay(ctx, READ_PRICE, h.who):
			return
		await Arts.shelf(ctx, "書架上經史子集、話本詩集，應有盡有。")
	elif c == 1:
		await ctx.shop(h.name, BOOKS.filter(func(id): return not G.bag.has(id)))


## 戲樓：一天看一齣（一個時辰），心情愉快：接下來兩場戰鬥武功經驗 ×1.1
static func _opera(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var key := "town:%s:opera" % h.map
	var s := G.shichen_of()
	if s < 5 or s > 10:
		await ctx.say(say.call("戲要午後才開鑼，晚上散了場就不唱了。"))
		return
	if int(_daily().get(key, 0)) == G.day:
		await ctx.say(say.call("今天的戲您看過啦，明天換一齣新的。"))
		return
	var price: int = OPERA_PRICE.get(h.cfg.tier, 3)
	var play: Array = PLAYS[G.day % PLAYS.size()]
	if await ctx.ask(say.call("今天唱《%s》。一位 %d 兩，好座位還有。" % [play[0], price]), ["看戲（一個時辰）", "不用了"]) != 0:
		return
	if not await _pay(ctx, price, h.who):
		return
	_daily()[key] = G.day
	ctx.pass_time(8)
	Festival._treat(2, 1.1)
	await ctx.say(["鑼鼓一響，戲開場了。", "《%s》：%s" % play, "滿堂叫好，你也跟著拍了手。", "（花了一個時辰；心情愉快：接下來 2 場戰鬥武功經驗 ×1.1）"])


static func _builder(ctx: Ctx, h: Dictionary) -> void:
	await Estate.carpenter(ctx, h.who)


static func _chief(ctx: Ctx, h: Dictionary) -> void:
	var say := _say(h.who)
	var c := await ctx.ask(say.call("外地來的？村子小，沒什麼好招待的，坐坐。"), ["問問村裡的空地", "閒聊", "不用了"])
	if c == 0:
		await ctx.say(say.call(_lots_text(h.map)))
	elif c == 1:
		await _rumor(ctx, h)


# ── 告示欄 ──────────────────────────────────────────────

static func board(ctx: Ctx) -> void:
	var map: String = (ctx.scene as Village).map_id
	var c := TownGen.cfg(map)
	var list: Array = c.get("notices", []).duplicate()
	for l in TownGen.lots(map):
		if not TownGen.lot_state().has(l.id):
			list.append({"title": "出售・%s" % l.name, "text": ["%s一塊，七丈寬、五丈深，臨街。" % l.name, "售價 %d 兩。地上插有木牌，可當場買下。" % int(l.price), "買下後蓋屋、開店悉聽尊便。"], "by": c.name})
	if list.is_empty():
		await ctx.say("告示欄上空空的。")
		return
	while true:
		var i := await ctx.ask("告示欄上貼著幾張告示。", list.map(func(n): return n.title) + ["不看了"])
		if i >= list.size():
			return
		var n: Dictionary = list[i]
		await ctx.say("「%s」\n%s\n——%s" % [n.title, "\n".join(n.text), n.get("by", "")])


# ── 空地 ────────────────────────────────────────────────

## 這張地圖上自己蓋的鋪面
static func _lot_shops(map: String) -> Array:
	return TownGen.lots(map).map(func(l): return l.id).filter(func(id): return TownGen.lot_state().get(id, {}).get("use", "") == "shop")


static func _lots_text(map: String) -> String:
	var lines := []
	for l in TownGen.lots(map):
		var s: Dictionary = TownGen.lot_state().get(l.id, {})
		lines.append("%s：%s" % [l.name, "售價 %d 兩，地上插著木牌" % int(l.price) if s.is_empty() else "已經賣出去了"])
	return "這裡的空地：\n" + "\n".join(lines) if lines.size() > 0 else "這裡沒有空地了。"


## 誰替你登記商號（衙門的師爺；沒有衙門就是村長、木作）
static func _clerk(map: String) -> String:
	for sh in TownGen.cfg(map).shops:
		if sh[0] in ["yamen", "chief"] and Person.alive(sh[2]):
			return Person.full_name(sh[2])
	for sh in TownGen.cfg(map).shops:
		if sh[0] == "builder" and Person.alive(sh[2]):
			return Person.full_name(sh[2])
	return "里正"


static func lot(ctx: Ctx) -> void:
	var l := TownGen.lot_def(ctx.extra.get("prop", {}).get("lot", ""))
	if l.is_empty():
		return
	var map: String = l.map
	var st := TownGen.lot_state()
	var s: Dictionary = st.get(l.id, {})
	if s.is_empty():
		await ctx.say("「%s」\n空地一塊，七丈寬、五丈深，臨街。售價 %d 兩。\n買下後可以蓋自宅，也可以蓋鋪面開店。" % [l.name, int(l.price)])
		if await ctx.ask("要花 %d 兩買下這塊地嗎？（目前有 %d 兩）" % [int(l.price), G.silver], ["買下", "算了"]) != 0:
			return
		if not ctx.pay(int(l.price)):
			await ctx.say("銀兩不夠……還是先去多攢一些吧。")
			return
		s = {"use": "empty", "paid": int(l.price), "day": G.day}
		st[l.id] = s
		await ctx.say("%s當場寫了地契、蓋了印。%s從今天起歸你了。" % [_clerk(map), l.name])
	if s.use == "shop":
		await _lot_shop(ctx, l)
		return
	if s.use != "empty":
		return
	var cost := roundi(float(l.price) * SHOP_BUILD)
	var c := await ctx.ask("%s是你的地。要蓋什麼？" % l.name, ["蓋自宅（附贈茅草屋一間，之後找木匠擴建）", "蓋鋪面（工錢 %d 兩，蓋好可以開店）" % cost, "開武館（還沒開放）", "先空著"])
	match c:
		0:
			s.use = "home"
			Estate.estates()[l.id] = {"plot": l.id, "tier": 1, "style": "plain", "furniture": {}}
			await ctx.say(["木匠帶著幫手扛來茅草和木料，不到半天，就在空地上搭起了一間茅草屋。", "（找城裡的木作可以擴建房子、升級家具、換擺設風格）"])
			ctx.warp(map, ctx.scene.where_at())
		1:
			if not ctx.pay(cost):
				await ctx.say("蓋鋪面的工錢要 %d 兩，你身上不夠。" % cost)
				return
			s.use = "shop"
			s.built = cost
			Biz.market().owned[l.id] = {"paid": int(s.paid) + cost, "day": G.day, "cond": 1, "use": "empty"}
			await ctx.say(["木匠忙了好幾天，在空地上蓋起一間臨街的瓦房鋪面。", "（在木牌前或衙門登記商號，就能開店）"])
			await Shop.grant_title(ctx)
			ctx.warp(map, ctx.scene.where_at())
		2:
			await ctx.say("（自己當館主、收徒弟的武館，之後才開放）")


## 自己的鋪面前的木牌：還沒開店就登記商號
static func _lot_shop(ctx: Ctx, l: Dictionary) -> void:
	var s := Biz.shop(l.id)
	if not s.is_empty():
		await ctx.say("「%s」的木牌。店裡的事，到櫃台去辦。" % s.name)
		return
	if await ctx.ask("你的鋪面還空著。要登記商號開店嗎？", ["登記商號", "再想想"]) == 0:
		await Shop.open_shop(ctx, [l.id], _clerk(l.map))
		ctx.warp(l.map, ctx.scene.where_at())


## Village 載入樣板地圖時呼叫：照空地的狀態擺木牌、木樁，蓋自宅或鋪面（鋪面的門與店名交給 property.gd 的 patch_map）
static func patch_map(map_id: String, data: Dictionary) -> void:
	if not TownGen.has(map_id):
		return
	for l in data.get("lots", []):
		var s: Dictionary = TownGen.lot_state().get(l.id, {})
		var use: String = s.get("use", "")
		if use == "home":
			var e: Dictionary = Estate.estates().get(l.id, {})
			if not e.is_empty():
				var b := Estate._building_of(l, e)
				b.enter = {"to": "home:" + l.id, "spawn": Estate._spawn(e)}
				data.buildings.append(b)
			continue
		if use == "shop":
			data.buildings.append(TownGen.shop_building(l))
			data.props.append({"sprite": "sign", "x": int(l.x), "y": int(l.y) + TownGen.SLOT_H - 1, "w": 1, "lines": [], "label": "查看", "script": "town/lot", "lot": l.id})
			continue
		data.props.append({"sprite": "sign", "x": int(l.x) + 3, "y": int(l.y) + TownGen.SLOT_H - 1, "w": 1, "lines": [], "label": "查看空地" if use == "" else "你的空地", "script": "town/lot", "lot": l.id})
		for c in [[0, 0], [TownGen.SLOT_W - 1, 0], [0, TownGen.SLOT_H - 1], [TownGen.SLOT_W - 1, TownGen.SLOT_H - 1]]:
			data.props.append({"sprite": "plot_stake", "passable": true, "x": int(l.x) + c[0], "y": int(l.y) + c[1], "w": 1, "lines": [{"text": "標示地界的木樁。"}], "label": ""})
