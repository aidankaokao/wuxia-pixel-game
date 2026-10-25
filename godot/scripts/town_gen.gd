class_name TownGen
## 樣板城鎮村（PLAN.md 4.41）：照 data/towns.json 的設定，用縣城（府城）、鎮、村三種樣板蓋出室外地圖與每間店的室內，
## 新據點先進得去，之後要手工做的地方再換成自己的地圖檔。
## - 縣城／府城：四面城牆、城門照州圖上通到哪裡自動開（門外一座牌坊）；十字大街（石板）、牆內一圈環城路，
##   四個區塊各兩排房子（北排朝環城路、南排朝大街）；大街交叉口一口井、告示欄。
## - 鎮：一條東西大街、一條南北橫街，兩旁各一排房子；運河的鎮南邊一條河、一座石橋。
## - 村：十字小路，兩旁幾戶人家，外面是田；照地方特色在沒有路的一邊擺湖、海或山。
## - 店照 shops 依序擺（越前面越靠近大街交叉口），空地一律放在朝南的位置（7×5，見 story/town.gd 的買地、營建），剩下的是民居。
## - 每間店的室內是 `town:地圖id:第幾間`（room_data），掌櫃站在櫃台前（人物表的人，過世了就換夥計顧著）。
## 地圖 id 寫在 towns.json 的 map；州圖據點 id 是 towns.json 的 key。

const SLOT_W := 7
const SLOT_H := 5
## 每種樣板留幾塊空地、一塊多少錢
const LOTS := {"fu": 5, "county": 3, "town": 2, "village": 1}
const LOT_PRICE := {"fu": 600, "county": 400, "town": 300, "village": 160}
const TIER_NAME := {"fu": "府城", "county": "縣城", "town": "鎮", "village": "村"}
const ROOFS := {
	"green": ["#3e6656", "#284638", "#56826f"], "grey": ["#4a5568", "#323a4a", "#64708a"], "brown": ["#6a4a3a", "#4a3226", "#86624e"],
	"hall": ["#3f4a5e", "#2a3242", "#5a6880"], "yamen": ["#34363e", "#22232a", "#4c4e58"], "straw": ["#a88a48", "#7a6230", "#c8a860"],
}
## 店種：建築樣式、寬、深、幌子、屋頂、燈籠、匾、室內的樣式
const KINDS := {
	"inn": {"name": "客棧", "style": "teahouse", "w": 6, "h": 4, "flag": "客", "roof": "green", "lanterns": true, "theme": "plain"},
	"restaurant": {"name": "飯館", "style": "teahouse", "w": 6, "h": 5, "flag": "酒", "roof": "green", "lanterns": true, "theme": "plain"},
	"teahouse": {"name": "茶館", "style": "teahouse", "w": 6, "h": 4, "flag": "茶", "roof": "green", "theme": "scholar"},
	"clinic": {"name": "藥鋪", "style": "house", "w": 5, "h": 4, "flag": "藥", "roof": "grey", "theme": "scholar"},
	"goods": {"name": "雜貨鋪", "style": "house2", "w": 5, "h": 4, "flag": "雜", "roof": "brown", "theme": "plain"},
	"smith": {"name": "鐵匠鋪", "style": "smithy", "w": 5, "h": 4, "flag": "鐵", "roof": "grey", "theme": "stone"},
	"cloth": {"name": "布莊", "style": "house", "w": 6, "h": 4, "flag": "布", "roof": "grey", "theme": "scholar"},
	"stable": {"name": "車馬行", "style": "house2", "w": 6, "h": 4, "flag": "馬", "roof": "brown", "theme": "stone"},
	"yamen": {"name": "衙門", "style": "hall", "w": 7, "h": 5, "roof": "yamen", "lanterns": true, "plaque": true, "red": true, "theme": "scholar"},
	"pawn": {"name": "當鋪", "style": "house", "w": 5, "h": 4, "flag": "當", "roof": "hall", "theme": "scholar"},
	"bank": {"name": "錢莊", "style": "hall", "w": 7, "h": 5, "flag": "錢", "roof": "hall", "lanterns": true, "plaque": true, "theme": "scholar"},
	"books": {"name": "書肆", "style": "house", "w": 5, "h": 4, "flag": "書", "roof": "grey", "theme": "scholar"},
	"opera": {"name": "戲樓", "style": "hall", "w": 7, "h": 5, "flag": "戲", "roof": "green", "lanterns": true, "plaque": true, "red": true, "theme": "plain"},
	"builder": {"name": "木作", "style": "house2", "w": 5, "h": 4, "flag": "木", "roof": "brown", "theme": "plain"},
	"chief": {"name": "村長家", "style": "hall", "w": 7, "h": 5, "roof": "hall", "plaque": true, "theme": "plain"},
	# 手工做的城才有的（劇情在 shops 第四欄指的劇情檔）
	"guild": {"name": "幫會堂口", "style": "hall", "w": 7, "h": 5, "roof": "hall", "lanterns": true, "plaque": true, "red": true, "theme": "scholar"},
	"hq": {"name": "會館", "style": "hall", "w": 7, "h": 5, "flag": "蚨", "roof": "hall", "lanterns": true, "plaque": true, "theme": "scholar"},
	"gamble": {"name": "賭坊", "style": "teahouse", "w": 6, "h": 4, "flag": "賭", "roof": "green", "lanterns": true, "theme": "plain"},
	"academy": {"name": "書院", "style": "hall", "w": 7, "h": 5, "roof": "grey", "plaque": true, "theme": "scholar"},
	"wuguan": {"name": "武館", "style": "hall", "w": 7, "h": 5, "flag": "武", "roof": "hall", "plaque": true, "red": true, "theme": "martial"},
	"salt": {"name": "鹽課司", "style": "hall", "w": 7, "h": 5, "roof": "yamen", "lanterns": true, "plaque": true, "red": true, "theme": "scholar"},
	"temple": {"name": "廟", "style": "temple", "w": 6, "h": 4, "roof": "green", "plaque": true, "theme": "scholar"},
	"escort": {"name": "鏢局", "style": "hall", "w": 7, "h": 5, "flag": "鏢", "roof": "hall", "lanterns": true, "plaque": true, "red": true, "theme": "scholar"},
}
const HOUSE_TEXT := ["門關著，裡頭傳出孩子背書的聲音。", "門口曬著一排衣裳，屋裡沒人應門。", "門上的春聯褪了色，主人家大概出門了。",
	"屋裡傳來剁菜的聲音，飯菜的香味飄出來。", "門閂著。門檻上趴著一隻打盹的黃狗。", "窗台上擺著幾盆花，門關得緊緊的。"]

static var _cfg := {}
static var _cache := {}


static func towns() -> Dictionary:
	if _cfg.is_empty():
		var d: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/towns.json"))
		d.erase("_note")
		_cfg = d
	return _cfg


## 地圖 id → 州圖據點 id（不是樣板蓋的回傳空字串）
static func node_of(map: String) -> String:
	for k in towns():
		if towns()[k].map == map:
			return k
	return ""


static func has(map: String) -> bool:
	return node_of(map) != ""


static func cfg(map: String) -> Dictionary:
	return towns().get(node_of(map), {})


## 某個地圖 id（含屋裡、空地上的房子）屬於哪個樣板城：town:地圖:店、prop:地圖_lot1、home:地圖_lot1
static func town_of(id: String) -> String:
	for p in ["town:", "prop:", "home:"]:
		if id.begins_with(p):
			id = id.substr(p.length())
	id = id.get_slice(":", 0)
	for k in towns():
		var m: String = towns()[k].map
		if id == m or id.begins_with(m + "_lot"):
			return m
	return ""


# ── 城門：照州圖上的路，往哪個方向有路就開哪邊的門 ─────────────

## {方向 s/n/e/w: [往哪個據點, …]}
static func gates(node: String, zhou := "yanzhou") -> Dictionary:
	var tx: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/tianxia.json"))
	var det: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/zhou/%s.json" % zhou))
	var at := {}
	for c in tx.cities + tx.passes:
		at[c.id] = Vector2(c.x, c.y)
	for n in det.get("nodes", []):
		at[n.id] = Vector2(n.x, n.y)
	var skip := {}
	for s in det.get("skip_roads", []):
		skip[str(s[0]) + "|" + str(s[1])] = true
		skip[str(s[1]) + "|" + str(s[0])] = true
	var out := {}
	for r in det.get("roads", []) + tx.roads:
		if skip.has(str(r[0]) + "|" + str(r[1])):
			continue
		var other := ""
		if r[0] == node:
			other = r[1]
		elif r[1] == node:
			other = r[0]
		if other == "" or not at.has(other) or not at.has(node):
			continue
		var d: Vector2 = at[other] - at[node]
		var side := ("e" if d.x > 0 else "w") if absf(d.x) > absf(d.y) else ("s" if d.y > 0 else "n")
		if not out.has(side):
			out[side] = []
		if not other in out[side]:
			out[side].append(other)
	if out.is_empty():
		out["s"] = [""]
	return out


## 從州圖進來：從哪個據點那條路來，就從哪一邊的城門進去
static func entry(node: String, from: String) -> Dictionary:
	var d := build(towns()[node].map)
	for side in d.gate_sides:
		if from in d.gate_sides[side]:
			return d.gate_spawn[side]
	return d.gate_spawn.values()[0]


# ── 蓋地圖 ──────────────────────────────────────────────

static func build(map: String) -> Dictionary:
	if _cache.has(map):
		return _cache[map]
	var node := node_of(map)
	var c: Dictionary = towns()[node]
	# 手工做好的地圖（data/<地圖 id>.json）：照樣用樣板的店、室內、空地，只是格子與房子是手擺的
	if FileAccess.file_exists("res://data/%s.json" % map):
		var fd: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/%s.json" % map))
		fd.shop_index = {}
		for bi in fd.buildings.size():
			var to: String = fd.buildings[bi].get("enter", {}).get("to", "")
			if to.begins_with("town:%s:" % map):
				fd.shop_index[int(to.get_slice(":", 2))] = bi
		for l in fd.get("lots", []):
			l.map = map
			l.price = int(l.get("price", LOT_PRICE[c.tier]))
		fd.gate_sides = gates(node, c.get("zhou", "yanzhou"))
		fd.town = node
		_cache[map] = fd
		return fd
	var g := _Grid.new()
	g.rng.seed = int(c.get("seed", 1))
	g.cfg = c
	g.node = node
	g.gates = gates(node, c.get("zhou", "yanzhou"))
	match c.tier:
		"fu":
			g.county(4)
		"county":
			g.county(3)
		"town":
			g.town()
		_:
			g.village()
	var d := g.result()
	_cache[map] = d
	return d


## 這張樣板地圖上的空地（{id, name, x, y, price, map}）
static func lots(map: String) -> Array:
	return build(map).lots if has(map) else []


static func lot_def(id: String) -> Dictionary:
	var m := town_of(id)
	if m == "":
		return {}
	for l in lots(m):
		if l.id == id:
			return l
	return {}


## 空地的狀態（G.life.lots：空地 id → {use: empty／home／shop, paid, day}）
static func lot_state() -> Dictionary:
	if not G.life.has("lots"):
		G.life.lots = {}
	return G.life.lots


## 空地上蓋的鋪面當成房產物件（Biz.prop_def 找不到固定物件時問這裡），開店、上架、帳簿都照臨江城的鋪面
static func lot_prop(id: String) -> Dictionary:
	var s: Dictionary = lot_state().get(id, {})
	if s.get("use", "") != "shop":
		return {}
	var l := lot_def(id)
	var b := shop_building(l)
	return {"id": id, "name": "%s鋪面" % l.name.trim_suffix("空地"), "map": l.map, "bx": b.x, "by": b.y, "kind": "shop", "owner": "你", "lot": true,
		"base": int(l.price) + int(s.get("built", 0)), "rent": roundi(float(l.price) / 50.0), "desc": "自己買地蓋起來的鋪面。"}


static func lot_prop_at(map: String, x: int, y: int) -> Dictionary:
	for l in lots(map):
		var p := lot_prop(l.id)
		if not p.is_empty() and int(p.bx) == x and int(p.by) == y:
			return p
	return {}


## 空地上的鋪面：一棟五格寬的瓦房，靠空地南緣
static func shop_building(l: Dictionary) -> Dictionary:
	var r: Array = ROOFS.grey
	return {"style": "house", "x": int(l.x) + 1, "y": int(l.y) + 1, "face": "s", "name": "鋪面", "door": [{"text": "鋪面還空著。"}],
		"st": {"w": 5, "h": 4, "door": 2, "roof": r[0], "roofDark": r[1], "roofLight": r[2]}}


# ── 室內 ────────────────────────────────────────────────

## 室內的擺設：[擺設, x, y, 寬, 說明]（櫃台另外放，掌櫃站在櫃台前）
const ROOM_PROPS := {
	"inn": [["jars", 1, 1, 2, "一排酒罈，封泥上蓋著店號。"], ["f_shelf_plain_1", 8, 1, 2, "櫃子裡疊著客人的被褥。"], ["f_table_plain_1", 1, 4, 2, "打尖的客人坐的方桌。"], ["f_table_plain_1", 7, 4, 2, "桌上擺著一壺粗茶。"]],
	"restaurant": [["f_stove_plain_3", 8, 1, 2, "灶上燉著一鍋湯，香氣四溢。"], ["f_table_plain_1", 1, 4, 2, "客人吃剩的半碗麵。"], ["f_table_plain_1", 7, 4, 2, "方桌擦得發亮。"], ["jars", 1, 1, 2, "幾罈醬菜。"]],
	"teahouse": [["f_table_scholar_1", 1, 4, 2, "茶客們在這兒下棋。"], ["f_table_scholar_1", 7, 4, 2, "桌上擺著幾碟瓜子。"], ["f_deco_scholar_1", 9, 1, 1, "牆上掛著一幅〈品茗圖〉。"], ["jars", 1, 1, 2, "一排茶罐，貼著茶名。"]],
	"clinic": [["f_shelf_scholar_3", 1, 1, 2, "一整面藥櫃，抽屜上貼滿了藥名。"], ["drying_rack", 1, 5, 2, "竹篩上攤著曬乾的草藥。"], ["jars", 8, 5, 2, "一排藥罈，罈口用油紙封著。"]],
	"goods": [["f_shelf_plain_1", 1, 1, 2, "架上擺著針線、油燈、草鞋。"], ["f_shelf_plain_1", 8, 1, 2, "一袋袋米麵、鹽巴。"], ["jars", 1, 5, 2, "醬油、醋、酒，打幾斤都行。"], ["chest", 8, 5, 1, "裝雜貨的木箱。"]],
	"smith": [["forge", 8, 1, 2, "爐火燒得正旺。"], ["anvil", 8, 4, 1, "鐵砧上一道道錘痕。"], ["vat", 1, 1, 1, "淬火的水缸。"], ["f_deco_martial_1", 1, 4, 1, "兵器架上插著刀劍。"]],
	"cloth": [["cloth_rack", 1, 1, 2, "架上掛著一匹匹布料。"], ["mannequin", 8, 1, 1, "穿著新衣裳的衣架子。"], ["loom", 8, 4, 2, "一台織機，梭子還卡在經線上。"]],
	"stable": [["vat", 1, 4, 1, "飲馬的水槽。"], ["chest", 8, 1, 1, "裝馬鞍、韁繩的木箱。"], ["drying_rack", 7, 5, 2, "晾著馬毯。"]],
	"yamen": [["f_deco_scholar_1", 1, 1, 1, "牆上掛著「明鏡高懸」的匾。"], ["f_deco_scholar_1", 9, 1, 1, "一幅山水，落款是前任的知縣。"], ["chair", 2, 4, 1, "給來辦事的人坐的椅子。"], ["chair", 8, 4, 1, "太師椅。"]],
	"pawn": [["chest", 1, 1, 1, "上了鎖的大木箱。"], ["chest", 2, 1, 1, "死當的東西都收在這裡。"], ["f_shelf_scholar_2", 8, 1, 2, "架上擺著各色當來的物件。"]],
	"bank": [["chest", 1, 1, 1, "包著鐵皮的銀箱。"], ["chest", 2, 1, 1, "銀箱上貼著封條。"], ["f_shelf_scholar_3", 8, 1, 2, "一格格的帳冊。"], ["chair", 8, 4, 1, "給客人坐的椅子。"]],
	"books": [["f_shelf_scholar_3", 1, 1, 2, "經史子集，分門別類。"], ["f_shelf_scholar_3", 8, 1, 2, "話本、詩集、棋譜。"], ["f_shelf_scholar_2", 1, 4, 2, "舊書，按斤賣。"], ["f_table_scholar_1", 7, 4, 2, "讀書人在這兒翻書。"]],
	"opera": [["chair", 2, 4, 1, "看戲的座位。"], ["chair", 4, 4, 1, "看戲的座位。"], ["chair", 6, 4, 1, "看戲的座位。"], ["chair", 8, 4, 1, "看戲的座位。"], ["f_deco_scholar_1", 1, 1, 1, "戲班的行頭。"]],
	"builder": [["f_table_plain_1", 1, 1, 2, "木工台，上面一把刨子。"], ["chest", 8, 1, 1, "工具箱，鑿子、鋸子、墨斗。"], ["f_shelf_plain_1", 8, 4, 2, "一疊疊木料。"]],
	"chief": [["f_bed_plain_1", 1, 1, 2, "床鋪。"], ["f_shelf_plain_1", 8, 1, 2, "櫃子裡收著村裡的地契冊子。"], ["f_table_plain_1", 1, 4, 2, "方桌。"]],
	"guild": [["f_deco_martial_1", 1, 1, 1, "兵器架上插著分水刺、鐵篙。"], ["chair", 8, 1, 1, "總舵主的虎皮交椅。"], ["f_table_plain_1", 1, 5, 2, "桌上攤著一張府河的水路圖。"], ["jars", 8, 5, 2, "幾罈燒刀子。"]],
	"hq": [["f_shelf_scholar_3", 1, 1, 2, "一格格的帳冊，封皮上寫著各家商號的名字。"], ["chair", 8, 1, 1, "紫檀太師椅。"], ["f_deco_scholar_1", 9, 1, 1, "牆上掛著一枚大銅錢，錢眼裡穿著紅繩。"], ["f_table_scholar_1", 7, 5, 2, "桌上擺著算盤與一疊借據。"]],
	"gamble": [["f_table_plain_1", 1, 4, 2, "賭桌上的骰盅還在晃。"], ["f_table_plain_1", 7, 4, 2, "一群人圍著押大小。"], ["jars", 1, 1, 2, "酒罈。"], ["chest", 9, 1, 1, "裝籌碼的木箱。"]],
	"academy": [["f_shelf_scholar_3", 1, 1, 2, "書院的藏書，經史子集都有。"], ["f_shelf_scholar_3", 8, 1, 2, "歷代山長的手稿。"], ["f_table_scholar_1", 1, 4, 2, "學子們讀書的書案。"], ["f_table_scholar_1", 7, 5, 2, "書案上擺著棋盤。"]],
	"wuguan": [["f_dummy_martial_3", 1, 1, 1, "鐵木樁，樁身被打得發亮。"], ["f_dummy_martial_2", 9, 1, 1, "木人樁。"], ["f_deco_martial_1", 1, 4, 1, "兵器架。"], ["f_deco_martial_1", 9, 4, 1, "兵器架。"]],
	"salt": [["f_shelf_scholar_3", 1, 1, 2, "一格格的鹽引存根。"], ["chest", 8, 1, 1, "貼著封條的充公鹽包。"], ["chest", 9, 1, 1, "鹽包。"], ["chair", 8, 4, 1, "鹽大使的太師椅。"]],
	"temple": [["altar", 4, 1, 3, "供桌上擺著潮神的木像，海浪紋的衣袍，手裡捧著一枚海螺。"], ["cushion", 3, 4, 1, "蒲團。"], ["cushion", 7, 4, 1, "蒲團。"], ["f_deco_scholar_1", 1, 1, 1, "牆上掛著歷年大潮的潮水刻度。"]],
	"escort": [["f_deco_martial_1", 1, 1, 1, "兵器架上插著金背大刀。"], ["chest", 8, 1, 1, "待押的鏢箱，貼著封條。"], ["chest", 9, 1, 1, "鏢箱。"], ["f_table_plain_1", 1, 5, 2, "桌上攤著鏢路圖。"]],
}
const COUNTER := {"inn": "櫃台", "restaurant": "點菜", "teahouse": "喝茶", "clinic": "看診／買藥", "goods": "買東西", "smith": "打兵器", "cloth": "看衣裳",
	"stable": "看馬", "yamen": "辦事", "pawn": "典當", "bank": "存取銀兩", "books": "買書", "opera": "看戲", "builder": "營造", "chief": "說話",
	"guild": "說話", "hq": "說話", "gamble": "押大小", "academy": "請教", "wuguan": "學武", "escort": "接鏢", "salt": "辦事", "temple": "上香"}


static func room_data(id: String) -> Dictionary:
	var parts := id.split(":")
	var map: String = parts[1]
	var i := int(parts[2])
	var d := build(map)
	var b: Dictionary = d.buildings[d.shop_index[i]]
	var sh: Array = cfg(map).shops[i]
	var k: Dictionary = KINDS[sh[0]]
	var dt := Village.door_tile(b)
	var dir: Vector2i = Village.FACE_DIR[b.get("face", "s")]
	var out_spawn := {"x": dt.x + dir.x, "y": dt.y + dir.y, "facing": {"s": "down", "n": "up", "e": "right", "w": "left"}[b.get("face", "s")]}
	var props := [{"sprite": "counter", "x": 4, "y": 1, "w": 3, "lines": [], "label": COUNTER[sh[0]], "script": "town/shop"}]
	if sh[0] in ["wuguan", "temple"]:
		props = []
	for p in ROOM_PROPS.get(sh[0], []):
		props.append({"sprite": p[0], "x": p[1], "y": p[2], "w": p[3], "lines": [{"text": p[4]}], "label": ""})
	var npcs := []
	var pid: String = sh[2]
	if Person.alive(pid):
		npcs.append({"id": pid, "name": Person.full_name(pid), "sprite": Person.field(pid, "look", "servant"), "x": 5, "y": 2, "facing": "down",
			"all_day": true, "work": false, "night": false, "wander": 0, "person": "", "script": "town/shop", "when": "", "talks": []})
	# 店裡另外站的人（shops 的第五欄；交談交給第四欄劇情檔的 extra）
	var spots := [Vector2i(2, 3), Vector2i(8, 3), Vector2i(2, 5), Vector2i(8, 5)]
	var extra: Array = sh[4] if sh.size() > 4 else []
	for j in extra.size():
		var xp: String = extra[j]
		# 劇情裡被押走、離開的人（旗標 gone_<人物 id>）不再站在店裡
		if Person.alive(xp) and int(G.flags.get("gone_" + xp, 0)) == 0:
			npcs.append({"id": xp, "name": Person.full_name(xp), "sprite": Person.field(xp, "look", "servant"), "x": spots[j].x, "y": spots[j].y, "facing": "down",
				"all_day": true, "work": false, "night": false, "wander": 0, "person": "", "script": "town/extra", "when": "", "talks": []})
	return {"id": id, "name": sh[1], "subtitle": "%s・%s" % [cfg(map).name, k.name], "theme": k.theme, "tiles": _room(11, 8, 5),
		"spawn": {"x": 5, "y": 6, "facing": "up"}, "props": props, "npcs": npcs,
		"exits": [{"tiles": [[5, 7]], "to": map, "spawn": out_spawn}]}


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


# ── 格子與擺放 ──────────────────────────────────────────

class _Grid:
	var W := 0
	var H := 0
	var t: Array = []
	var rng := RandomNumberGenerator.new()
	var cfg: Dictionary
	var node := ""
	var gates: Dictionary
	## 房子的位置：{x, y, face}（x, y 是 7×5 位置的左上角）
	var slots: Array = []
	var buildings: Array = []
	var props: Array = []
	var exits: Array = []
	var npcs: Array = []
	var lots: Array = []
	var shop_index := {}
	var gate_spawn := {}
	var walk: Array = []
	var center := Vector2i.ZERO

	func init(w: int, h: int, c := ".") -> void:
		W = w
		H = h
		t = []
		for y in h:
			var row := []
			row.resize(w)
			row.fill(c)
			t.append(row)

	func put(x: int, y: int, c: String) -> void:
		if x >= 0 and y >= 0 and x < W and y < H:
			t[y][x] = c

	func at(x: int, y: int) -> String:
		return t[y][x] if x >= 0 and y >= 0 and x < W and y < H else "^"

	func rect(x0: int, y0: int, w: int, h: int, c: String) -> void:
		for y in range(y0, y0 + h):
			for x in range(x0, x0 + w):
				put(x, y, c)

	## 外圍散些樹、花、石頭（不碰路與水）
	func scatter(x0: int, y0: int, w: int, h: int, tree := 0.25) -> void:
		for y in range(y0, y0 + h):
			for x in range(x0, x0 + w):
				if at(x, y) != ".":
					continue
				var r := rng.randf()
				put(x, y, "T" if r < tree else ("*" if r < tree + 0.04 else ("o" if r < tree + 0.055 else ".")))

	func prop(sprite: String, x: int, y: int, w := 1, text := "", script := "", label := "", extra := {}) -> void:
		var p := {"id": "", "sprite": sprite, "x": x, "y": y, "w": w, "lines": [{"text": text}] if text != "" else [], "label": label, "script": script, "when": "", "passable": false}
		p.merge(extra, true)
		props.append(p)

	# ── 縣城、府城 ──

	## n：每個區塊一排幾間（縣城 3、府城 4）
	func county(n: int) -> void:
		var qw := n * TownGen.SLOT_W
		var qh := TownGen.SLOT_H * 2 + 2
		W = 15 + qw * 2
		H = 15 + qh * 2
		init(W, H)
		var cx := 6 + qw + 1
		var cy := 6 + qh + 1
		center = Vector2i(cx, cy)
		# 城牆與牆內的環城路
		for y in range(3, H - 3):
			for x in range(3, W - 3):
				var edge := x == 3 or y == 3 or x == W - 4 or y == H - 4
				put(x, y, "H" if edge else (":" if x <= 5 or y <= 5 or x >= W - 6 or y >= H - 6 else "."))
		# 十字大街（石板）
		rect(cx - 1, 4, 3, H - 8, "=")
		rect(4, cy - 1, W - 8, 3, "=")
		# 城外的地方特色
		flavor_band(3)
		# 城門：牆上開口、門外的路接到地圖邊、出口與牌坊
		for side in gates:
			match side:
				"n":
					rect(cx - 1, 0, 3, 4, ":")
					gate_exit(side, [[cx - 1, 0], [cx, 0], [cx + 1, 0]], Vector2i(cx, 1), "down")
					prop("paifang_city", cx - 1, 1, 3, "", "", "", {"passable": true, "plaque": cfg.get("plaque", "")})
				"s":
					rect(cx - 1, H - 4, 3, 4, ":")
					gate_exit(side, [[cx - 1, H - 1], [cx, H - 1], [cx + 1, H - 1]], Vector2i(cx, H - 2), "up")
					prop("paifang_city", cx - 1, H - 2, 3, "", "", "", {"passable": true, "plaque": cfg.get("plaque", "")})
				"w":
					rect(0, cy - 1, 4, 3, ":")
					gate_exit(side, [[0, cy - 1], [0, cy], [0, cy + 1]], Vector2i(1, cy), "right")
				"e":
					rect(W - 4, cy - 1, 4, 3, ":")
					gate_exit(side, [[W - 1, cy - 1], [W - 1, cy], [W - 1, cy + 1]], Vector2i(W - 2, cy), "left")
		# 四個區塊、各兩排：北排朝北（門口是環城路或大街），南排朝南
		for qx in [6, cx + 2]:
			for qy in [6, cy + 2]:
				for i in n:
					slots.append({"x": qx + i * TownGen.SLOT_W, "y": qy, "face": "n"})
					slots.append({"x": qx + i * TownGen.SLOT_W, "y": qy + TownGen.SLOT_H + 2, "face": "s"})
				# 兩排之間的後院
				scatter(qx, qy + TownGen.SLOT_H, qw, 2, 0.3)
		place_all()
		# 交叉口：井；南邊大街：告示欄
		prop("well", cx, cy, 1, "城裡的大井，井欄被繩子磨出一道道溝。")
		prop("bulletin", cx + 1, cy + 3, 1, "", "town/board", "看告示")
		walk_spots([Vector2i(cx - 1, cy + 5), Vector2i(cx + 6, cy), Vector2i(cx - 6, cy + 1), Vector2i(cx + 1, cy - 6)])

	# ── 鎮 ──

	func town() -> void:
		var n := 3
		var half := n * TownGen.SLOT_W
		W = 3 + half + 3 + half + 3
		H = 28
		init(W, H)
		var cx := 3 + half + 1
		var cy := 10
		center = Vector2i(cx, cy)
		rect(0, cy - 1, W, 3, ":")
		rect(cx - 1, cy - 1, 3, 3, "=")
		if not gates.has("w"):
			rect(0, cy - 1, 3, 3, ".")
		if not gates.has("e"):
			rect(W - 3, cy - 1, 3, 3, ".")
		var canal: bool = cfg.get("flavor", "") == "canal"
		if canal:
			rect(0, 19, W, 3, "~")
			if gates.has("s"):
				rect(cx - 1, 19, 3, 3, "#")
		else:
			flavor_band(3)
		for side in gates:
			match side:
				"n":
					rect(cx - 1, 0, 3, cy - 1, ":")
					gate_exit(side, [[cx - 1, 0], [cx, 0], [cx + 1, 0]], Vector2i(cx, 1), "down")
				"s":
					for y in range(cy + 2, H):
						for x in [cx - 1, cx, cx + 1]:
							if at(x, y) != "#":
								put(x, y, ":")
					gate_exit(side, [[cx - 1, H - 1], [cx, H - 1], [cx + 1, H - 1]], Vector2i(cx, H - 2), "up")
				"w":
					gate_exit(side, [[0, cy - 1], [0, cy], [0, cy + 1]], Vector2i(1, cy), "right")
				"e":
					gate_exit(side, [[W - 1, cy - 1], [W - 1, cy], [W - 1, cy + 1]], Vector2i(W - 2, cy), "left")
		for qx in [3, cx + 2]:
			for i in n:
				slots.append({"x": qx + i * TownGen.SLOT_W, "y": cy - 1 - TownGen.SLOT_H, "face": "s"})
				slots.append({"x": qx + i * TownGen.SLOT_W, "y": cy + 2, "face": "n"})
		scatter(0, 0, W, cy - 1 - TownGen.SLOT_H, 0.3)
		scatter(0, cy + 2 + TownGen.SLOT_H, W, (19 if canal else H) - (cy + 2 + TownGen.SLOT_H), 0.2)
		if canal:
			scatter(0, 22, W, H - 22, 0.25)
			prop("boat", 8, 19, 3, "運河上的貨船，船上堆著米袋。")
			prop("boat", W - 12, 20, 3, "一條烏篷船，船家在船頭打盹。")
		scatter(0, cy - 1, 3, 3, 0.0)
		place_all()
		prop("well", cx + 1, cy + 1, 1, "鎮上的井，挑水的人排著隊。")
		prop("bulletin", cx - 1, cy - 1, 1, "", "town/board", "看告示")
		walk_spots([Vector2i(cx - 8, cy), Vector2i(cx + 8, cy + 1), Vector2i(cx, cy + 4)])

	# ── 村 ──

	func village() -> void:
		W = 40
		H = 30
		init(W, H)
		var cx := 19
		var cy := 13
		center = Vector2i(cx, cy)
		# 田：上下兩片，籬笆圍著
		for f in [[3, 1, 13, 5], [23, 1, 13, 5], [3, 22, 13, 6], [23, 22, 13, 6]]:
			field(f[0], f[1], f[2], f[3])
		rect(0, cy, W, 2, ":")
		rect(cx, 0, 2, H, ":")
		# 沒有開路的那一頭不通到邊上（照州圖的路）
		if not gates.has("w"):
			rect(0, cy, 3, 2, ".")
		if not gates.has("e"):
			rect(W - 3, cy, 3, 2, ".")
		if not gates.has("n"):
			rect(cx, 0, 2, 6, ".")
		if not gates.has("s"):
			rect(cx, H - 7, 2, 7, ".")
		flavor_band(3)
		for side in gates:
			match side:
				"n":
					rect(cx, 0, 2, cy, ":")
					gate_exit(side, [[cx, 0], [cx + 1, 0]], Vector2i(cx, 1), "down")
				"s":
					rect(cx, cy, 2, H - cy, ":")
					gate_exit(side, [[cx, H - 1], [cx + 1, H - 1]], Vector2i(cx, H - 2), "up")
				"w":
					rect(0, cy, cx, 2, ":")
					gate_exit(side, [[0, cy], [0, cy + 1]], Vector2i(1, cy), "right")
				"e":
					rect(cx, cy, W - cx, 2, ":")
					gate_exit(side, [[W - 1, cy], [W - 1, cy + 1]], Vector2i(W - 2, cy), "left")
		for qx in [3, 10, 22, 29]:
			slots.append({"x": qx, "y": cy - TownGen.SLOT_H, "face": "s"})
			slots.append({"x": qx, "y": cy + 2, "face": "n"})
		scatter(0, 0, W, H, 0.12)
		place_all()
		prop("well", cx - 2, cy + 3, 1, "村裡的老井，井水清涼。")
		prop("bulletin", cx - 2, cy - 2, 1, "", "town/board", "看告示")
		walk_spots([Vector2i(cx - 6, cy), Vector2i(cx + 6, cy + 1)])

	func field(x0: int, y0: int, w: int, h: int) -> void:
		for y in range(y0, y0 + h):
			for x in range(x0, x0 + w):
				if at(x, y) != ".":
					continue
				var edge := x == x0 or y == y0 or x == x0 + w - 1 or y == y0 + h - 1
				put(x, y, "f" if edge else "n")

	## 地方特色：在沒有開門的一邊擺湖、海、山（width 格寬）；府城的河在西邊
	func flavor_band(width: int) -> void:
		var f: String = cfg.get("flavor", "")
		var want := {"river": ["w", "e"], "coast": ["e", "s", "n"], "lake": ["w", "n", "s"], "tea": ["n", "e", "w"], "hill": ["n", "s", "e", "w"], "mulberry": [], "canal": []}
		var c := "~" if f in ["river", "coast", "lake"] else "^"
		if f == "mulberry":
			# 桑園：城外一行行的桑樹
			for y in H:
				for x in W:
					if at(x, y) == "." and (x < width or y < width or x >= W - width or y >= H - width) and (x + y * 3) % 4 == 0:
						put(x, y, "T")
			return
		for side in want.get(f, []):
			if gates.has(side):
				continue
			match side:
				"w":
					band(0, 0, width, H, c)
				"e":
					band(W - width, 0, width, H, c)
				"n":
					band(0, 0, W, width, c)
				"s":
					band(0, H - width, W, width, c)
			if f != "hill":
				break

	func band(x0: int, y0: int, w: int, h: int, c: String) -> void:
		for y in range(y0, y0 + h):
			for x in range(x0, x0 + w):
				if at(x, y) in [".", "T", "*", "o", "f", "n"]:
					put(x, y, c)

	func gate_exit(side: String, tiles: Array, spawn: Vector2i, facing: String) -> void:
		var to: Array = gates[side]
		exits.append({"tiles": tiles, "world": node, "worldFrom": to[0]})
		gate_spawn[side] = {"map": cfg.map, "x": spawn.x, "y": spawn.y, "facing": facing}

	func walk_spots(list: Array) -> void:
		walk = list

	## 擺房子：空地放在朝南的位置（離交叉口近的先），店照順序放在最靠近交叉口的位置，剩下的是民居或樹
	func place_all() -> void:
		var dist := func(s: Dictionary) -> float: return Vector2(s.x + TownGen.SLOT_W / 2.0 - center.x, s.y + TownGen.SLOT_H / 2.0 - center.y).length()
		var free := slots.duplicate()
		free.sort_custom(func(a, b): return dist.call(a) < dist.call(b))
		var shops: Array = cfg.shops
		var n_lots: int = TownGen.LOTS[cfg.tier]
		# 空地：朝南的位置照城裡哪一帶分組，一帶挑一塊（每組挑中間那塊，最靠近交叉口的留給店），散在城裡各處
		var groups := {}
		for s in free:
			if s.face == "s":
				var a := area_name(s)
				if not groups.has(a):
					groups[a] = []
				groups[a].append(s)
		var picks := []
		var rr := 0
		while picks.size() < n_lots and rr < 6:
			for a in groups:
				var g: Array = groups[a].filter(func(x): return not x in picks)
				if g.is_empty() or picks.size() >= n_lots:
					continue
				picks.append(g[mini(g.size() - 1, (g.size() + 1) / 2 - (1 if rr > 0 else 0))])
			rr += 1
		for s in picks:
			free.erase(s)
		# 要用的位置先清成空地（外圍散的樹不要長進房子裡）
		for s in slots:
			rect(s.x, s.y, TownGen.SLOT_W, TownGen.SLOT_H, ".")
		# 店照順序擺（空地挑剩的位置，近的先）
		for i in shops.size():
			if free.is_empty():
				push_warning("樣板 %s：位置不夠擺 %s" % [cfg.map, shops[i][1]])
				break
			var s: Dictionary = free.pop_front()
			shop_index[i] = buildings.size()
			buildings.append(shop_house(i, s))
		var used := {}
		for k in picks.size():
			var s: Dictionary = picks[k]
			var a := area_name(s)
			used[a] = int(used.get(a, 0)) + 1
			var nm := "%s%s空地" % [a, ["", "二號", "三號", "四號"][mini(3, used[a] - 1)]]
			lots.append({"id": "%s_lot%d" % [cfg.map, k + 1], "name": nm, "x": s.x, "y": s.y, "price": TownGen.LOT_PRICE[cfg.tier], "map": cfg.map})
		# 剩下的位置：大多是民居，偶爾一片小樹林
		var hi := 0
		for s in free:
			if rng.randf() < 0.2:
				scatter(s.x + 1, s.y + 1, TownGen.SLOT_W - 2, TownGen.SLOT_H - 2, 0.6)
				continue
			buildings.append(house(s, hi))
			hi += 1

	## 位置在城裡哪一帶（東北、西南……）
	func area_name(s: Dictionary) -> String:
		var dx: float = s.x + TownGen.SLOT_W / 2.0 - center.x
		var dy: float = s.y + TownGen.SLOT_H / 2.0 - center.y
		var ns := "北" if dy < -2 else ("南" if dy > 2 else "")
		var ew := "東" if dx > 2 else ("西" if dx < -2 else "")
		var where := ("城" if cfg.tier in ["fu", "county"] else ("鎮" if cfg.tier == "town" else "村")) + (ew + ns if ew + ns != "" else "中")
		return where

	func _st(k: Dictionary) -> Dictionary:
		var r: Array = TownGen.ROOFS[k.roof]
		var st := {"w": k.w, "h": k.h, "door": int(k.w) / 2, "roof": r[0], "roofDark": r[1], "roofLight": r[2]}
		if k.get("lanterns", false):
			st.lanterns = true
		if k.get("plaque", false):
			st.plaque = true
		if k.get("red", false):
			st.timber = "#8a2e26"
		return st

	## 房子放進 7×5 的位置：朝南的貼著南緣、朝北的貼著北緣，左右置中
	func fit(s: Dictionary, w: int, h: int) -> Vector2i:
		var x: int = s.x + (TownGen.SLOT_W - w) / 2
		var y: int = s.y + (TownGen.SLOT_H - h if s.face == "s" else 0)
		return Vector2i(x, y)

	func shop_house(i: int, s: Dictionary) -> Dictionary:
		var sh: Array = cfg.shops[i]
		var k: Dictionary = TownGen.KINDS[sh[0]]
		var p := fit(s, k.w, k.h)
		var b := {"style": k.style, "x": p.x, "y": p.y, "face": s.face, "name": sh[1], "sign": sh[1], "door": [],
			"st": _st(k), "enter": {"to": "town:%s:%d" % [cfg.map, i], "spawn": {"x": 5, "y": 6, "facing": "up"}}}
		if k.has("flag"):
			b.flag = k.flag
		# 木作門口堆木料、車馬行門口停馬車
		if sh[0] == "builder":
			var lx: int = p.x + int(k.w)
			if lx < s.x + TownGen.SLOT_W:
				prop("log_pile", lx, p.y + (int(k.h) - 1 if s.face == "s" else 0), 1, "一堆松木料，等著蓋房子用。")
		return b

	func house(s: Dictionary, i: int) -> Dictionary:
		var w := 5 if rng.randf() < 0.6 else 4
		var h := 4 if w == 5 else 3
		var p := fit(s, w, h)
		var roof: Array = TownGen.ROOFS["straw" if cfg.tier == "village" and rng.randf() < 0.5 else ["brown", "grey"][i % 2]]
		var style: String = ["house", "house2"][rng.randi() % 2] if w == 5 else "home%d" % (1 + rng.randi() % 2)
		return {"style": style, "x": p.x, "y": p.y, "face": s.face, "name": "民居", "door": [{"text": TownGen.HOUSE_TEXT[rng.randi() % TownGen.HOUSE_TEXT.size()]}],
			"st": {"w": w, "h": h, "door": w / 2, "roof": roof[0], "roofDark": roof[1], "roofLight": roof[2]}}

	func result() -> Dictionary:
		var rows := []
		for y in H:
			rows.append("".join(t[y]))
		# 街上的人
		var people_npcs := []
		var street: Array = cfg.get("street", [])
		for i in street.size():
			var pid: String = street[i]
			var sp: Vector2i = walk[i % walk.size()] if walk.size() > 0 else center + Vector2i(2, 0)
			var nm := Person.full_name(pid)
			var rumors: Array = cfg.get("rumors", [])
			var talks := [[{"speaker": nm, "text": "我是%s。" % Person.field(pid, "role", "這裡的人")}]]
			if rumors.size() > 0:
				talks.append([{"speaker": nm, "text": rumors[(i + 1) % rumors.size()]}])
			people_npcs.append({"id": pid, "name": nm, "sprite": Person.field(pid, "look", "farmer"), "x": sp.x, "y": sp.y, "facing": "down",
				"all_day": false, "work": true, "night": false, "wander": 3, "person": "", "script": "", "when": "", "talks": talks})
		var first: Dictionary = gate_spawn.values()[0]
		return {"id": cfg.map, "name": cfg.name, "subtitle": cfg.subtitle, "tiles": rows, "blocking": "^~fTYoWHXR",
			"spawn": {"x": first.x, "y": first.y, "facing": first.facing}, "buildings": buildings, "props": props, "exits": exits,
			"spots": [], "people": [], "npcs": people_npcs, "ring": 18, "lots": lots, "shop_index": shop_index,
			"gate_spawn": gate_spawn, "gate_sides": gates, "town": node}
