## 自宅（照網頁版 home.ts、maps/home.ts、story/estate.ts）：青竹村的空地買下（或用柳村長給的地契）蓋房子，找杜木匠擴建、升級家具、換擺設風格。
## - 空地寫在地圖資料的 plots（{id, name, x, y, price}，佔地 7×5）；Village 載入地圖時呼叫 patch_map：沒買的插木牌與四角木樁，買了的蓋房子（門通到 home:空地id）。
## - 房屋五級（TIERS）決定外觀、屋裡的配置圖（LAYOUTS）與有哪些家具；家具（FURNITURE）各自 1–3 級；風格（樸素、書香、武人）決定擺法與小效果。
## - 屋裡（room_data，Room 載入 home:空地id 時呼叫）：床（睡覺，2 級起精神飽滿）、灶台（做菜）、書架（研讀）、木人樁（練外功）、
##   藥爐（止血草煉金創藥）、藥圃（每天收止血草）、晾魚架（鮮魚曬成魚乾）、大宅的池塘（釣魚）。
## 狀態在 G.life.estates（空地 id → {plot, tier, style, furniture, rack}）。
## 旗標：home_deed 1 柳村長給了地契（可以免費挑一塊空地）／2 地契已用掉；空地的藥圃一天收一次記在 G.life.daily（<空地>:garden）。

const Train := preload("res://story/train.gd")
const Cook := preload("res://story/cook.gd")

const PLOT_W := 7
const PLOT_H := 5
const STYLE_NAME := {"plain": "樸素", "scholar": "書香", "martial": "武人"}
const STYLE_DESC := {
	"plain": "木色調，以灶台與藥圃為重。做菜時灶台多算一級，藥圃每天多收一株。",
	"scholar": "書架擺在正中、牆上掛著字畫。在書架研讀時，體會換成領悟多一成。",
	"martial": "木人樁擺在顯眼處、兵器架相伴。練木人樁時，經驗額外 +15。",
}
const RESTYLE_COST := 20
## 房屋等級：名字、從上一級擴建的費用、外觀（建築尺寸照網頁版 BUILDINGS）、說明
const TIERS := [
	{"name": "茅草屋", "cost": 0, "st": {"w": 4, "h": 3, "door": 1, "roof": "#b8944a", "roofDark": "#8a6a30", "roofLight": "#d4b066", "wall": "#b8a07a"}, "desc": "一間遮風避雨的茅草屋，擺得下一張床。"},
	{"name": "竹籬小屋", "cost": 80, "st": {"w": 5, "h": 4, "door": 2, "roof": "#a88a48", "roofDark": "#7a6230", "roofLight": "#c8a860", "wall": "#d0c098"}, "desc": "屋子大了些，添上桌椅與灶台，可以自己做菜。"},
	{"name": "瓦頂小院", "cost": 250, "st": {"w": 6, "h": 4, "door": 2, "roof": "#5a6070", "roofDark": "#3e4450", "roofLight": "#767c8c"}, "desc": "換上瓦頂、圍出小院。屋裡放書架，院中立木人樁、晾魚架。"},
	{"name": "青磚宅院", "cost": 600, "st": {"w": 7, "h": 5, "door": 3, "roof": "#3a4a5a", "roofDark": "#28323e", "roofLight": "#526476", "wall": "#9aa0a8"}, "desc": "青磚砌牆，隔出客房。添置藥爐，院裡闢一塊藥圃。"},
	{"name": "大宅", "cost": 1500, "st": {"w": 7, "h": 5, "door": 3, "roof": "#3f4a5e", "roofDark": "#2a3242", "roofLight": "#5a6880", "timber": "#8a2e26", "lanterns": true}, "desc": "氣派的大宅，院中鋪設演武場、挖了一方池塘。在演武場練樁，經驗再多 10。"},
]
## 家具：名字、幾級房屋才有、最高幾級、升到 2、3 級的費用、佔幾格寬、互動的腳本與提示
const FURNITURE := {
	"bed": {"name": "床", "tier": 1, "max": 3, "costs": [60, 150], "w": 2, "label": "睡覺"},
	"deco": {"name": "擺飾", "tier": 1, "max": 1, "costs": [], "w": 1, "label": "查看"},
	"table": {"name": "桌椅", "tier": 2, "max": 1, "costs": [], "w": 2, "label": "查看"},
	"stove": {"name": "灶台", "tier": 2, "max": 3, "costs": [50, 120], "w": 2, "label": "做菜"},
	"shelf": {"name": "書架", "tier": 3, "max": 3, "costs": [80, 180], "w": 2, "label": "研讀"},
	"dummy": {"name": "木人樁", "tier": 3, "max": 3, "costs": [80, 180], "w": 1, "label": "練樁"},
	"rack": {"name": "晾魚架", "tier": 3, "max": 1, "costs": [], "w": 2, "label": "晾魚"},
	"furnace": {"name": "藥爐", "tier": 4, "max": 3, "costs": [100, 220], "w": 1, "label": "煉藥"},
	"garden": {"name": "藥圃", "tier": 4, "max": 3, "costs": [100, 220], "w": 3, "label": "收成"},
	"guestbed": {"name": "客房", "tier": 4, "max": 1, "costs": [], "w": 2, "label": "查看"},
}
const FURN_ORDER := ["bed", "deco", "table", "stove", "shelf", "dummy", "rack", "furnace", "garden", "guestbed"]
## 床 2 級起精神飽滿：[場數, 經驗倍數]
const BED_REST := [[], [], [3, 1.2], [4, 1.35]]
const SHELF_RATE := [0.0, 0.6, 0.7, 0.8]
const DUMMY_EXP := [0, 30, 45, 60]
const GARDEN_HERBS := [0, 2, 3, 4]
const RACK_FISH := ["crucian", "carp", "silverfish", "grass_carp", "mandarin", "sea_fish"]
const SHELF := {"id": "home_shelf", "title": "自家書架", "text": "溫故知新，學而時習"}

## 每個等級一張配置圖（照網頁版 LAYOUTS）：W 牆、_ 地板、d 屋內的門、E 出口；院子 . 草地、f 籬笆、= 石板、~ 池塘。
## 數字與 a b c r 是錨點：家具的左端放在這一格；place 寫出各風格下每件家具放在哪個錨點
const LAYOUTS := [
	{"grid": ["WW5WWWW", "W1__2_W", "W_____W", "W3___4W", "WWWEWWW"],
		"place": {"plain": {"bed": "1", "deco": "4"}, "scholar": {"bed": "2", "deco": "5"}, "martial": {"bed": "3", "deco": "1"}}},
	{"grid": ["WW7WWW8WW", "W1__2_3_W", "W_______W", "W_______W", "W4____6_W", "WWWWEWWWW"],
		"place": {"plain": {"bed": "1", "stove": "3", "table": "4", "deco": "6"}, "scholar": {"table": "2", "bed": "4", "stove": "6", "deco": "7"}, "martial": {"bed": "4", "table": "3", "stove": "6", "deco": "1"}}},
	{"grid": ["WW9WWWWWWWW", "W1__2__3__W", "W_________W", "W_________W", "W4______5_W", "WWWWWdWWWWW", "f.......r.f", "f.6..8..7.f", "f.........f", "fffffEfffff"],
		"place": {"plain": {"bed": "1", "shelf": "3", "table": "4", "stove": "5", "dummy": "7", "deco": "6", "rack": "r"},
			"scholar": {"shelf": "2", "bed": "3", "table": "4", "stove": "5", "dummy": "6", "deco": "9", "rack": "r"},
			"martial": {"bed": "1", "shelf": "3", "table": "4", "stove": "5", "dummy": "8", "deco": "7", "rack": "r"}}},
	{"grid": ["WW9WWWWWWWWWWWW", "W1__2__3_W4___W", "W________W____W", "W________d____W", "W5__6___7W8___W", "WWWWWWdWWWWWWWW", "f..........r..f", "f.a...........f", "f......c..b...f", "f.............f", "ffffffEffffffff"],
		"place": {"plain": {"bed": "1", "shelf": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "b", "deco": "8", "rack": "r"},
			"scholar": {"shelf": "2", "bed": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "b", "deco": "9", "rack": "r"},
			"martial": {"bed": "1", "shelf": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "c", "deco": "8", "rack": "r"}}},
	{"grid": ["WW9WWWWWWWWWWWWWW", "W1__2__3__W4____W", "W_________W_____W", "W_________d_____W", "W5__6___7_W8____W", "WWWWWWWdWWWWWWWWW", "f...............f", "f.a.....===.....f", "f.......=c=..~~.f", "f.....b.===..~~.f", "f.........r.....f", "fffffffEfffffffff"],
		"place": {"plain": {"bed": "1", "shelf": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "c", "deco": "b", "rack": "r"},
			"scholar": {"shelf": "2", "bed": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "c", "deco": "9", "rack": "r"},
			"martial": {"bed": "1", "shelf": "3", "table": "5", "stove": "6", "furnace": "7", "guestbed": "4", "garden": "a", "dummy": "c", "deco": "8", "rack": "r"}}},
]
const ANCHORS := "0123456789abcr"


static func estates() -> Dictionary:
	if not G.life.has("estates"):
		G.life.estates = {}
	return G.life.estates


static func _say(t: String) -> Dictionary:
	return {"speaker": "杜大樑", "text": t}


static func plots(map_id: String) -> Array:
	var f := FileAccess.open("res://data/%s.json" % map_id, FileAccess.READ)
	if f == null:
		return []
	var d: Dictionary = JSON.parse_string(f.get_as_text())
	return d.get("plots", [])


static func plot_def(id: String) -> Dictionary:
	for p in plots("qingzhu"):
		if p.id == id:
			return p
	return {}


static func level(e: Dictionary, fid: String) -> int:
	return int(e.furniture.get(fid, 1))


static func furniture_of(e: Dictionary) -> Array:
	return FURN_ORDER.filter(func(f): return int(FURNITURE[f].tier) <= int(e.tier))


## 房子在空地上的位置：靠下、左右置中
static func _building_of(p: Dictionary, e: Dictionary) -> Dictionary:
	var st: Dictionary = TIERS[int(e.tier) - 1].st
	return {"style": "home%d" % int(e.tier), "x": int(p.x) + (PLOT_W - int(st.w)) / 2, "y": int(p.y) + PLOT_H - int(st.h), "face": "s", "name": "自宅", "st": st, "door": []}


## 把配置圖的錨點換回地形字元，找出各錨點的位置：[地形, {錨點: Vector2i}]
static func _parse(grid: Array) -> Array:
	var anchors := {}
	var tiles := []
	for y in grid.size():
		var row: String = grid[y]
		var out := ""
		for x in row.length():
			var c := row[x]
			if not ANCHORS.contains(c):
				out += c
				continue
			anchors[c] = Vector2i(x, y)
			# 錨點本身的地形取左右最近的非錨點字元（靠牆的錨點取另一邊，免得被當成牆）
			var right := ""
			for k in range(x + 1, row.length()):
				if not ANCHORS.contains(row[k]):
					right = row[k]
					break
			var left := ""
			for k in range(x - 1, -1, -1):
				if not ANCHORS.contains(row[k]):
					left = row[k]
					break
			out += right if right != "" and right != "W" else (left if left != "" and left != "W" else (right if right != "" else "_"))
		tiles.append(out)
	return [tiles, anchors]


# ── 地圖 ────────────────────────────────────────────────

## Village 載入地圖資料時呼叫：沒買的空地插木牌與四角木樁；買了的蓋房子
static func patch_map(map_id: String, data: Dictionary) -> void:
	for p in data.get("plots", []):
		var e: Dictionary = estates().get(p.id, {})
		if not e.is_empty():
			var b := _building_of(p, e)
			b.enter = {"to": "home:" + p.id, "spawn": _spawn(e)}
			data.buildings.append(b)
			continue
		data.props.append({"sprite": "sign", "x": int(p.x) + 3, "y": int(p.y) + PLOT_H - 1, "w": 1, "lines": [], "label": "查看空地", "script": "estate/plot_sign", "plot": p.id})
		for c in [[0, 0], [PLOT_W - 1, 0], [0, PLOT_H - 1], [PLOT_W - 1, PLOT_H - 1]]:
			data.props.append({"sprite": "plot_stake", "passable": true, "x": int(p.x) + c[0], "y": int(p.y) + c[1], "w": 1, "lines": [{"text": "標示地界的木樁。"}], "label": ""})


## 進屋後站在出口上面那一格
static func _spawn(e: Dictionary) -> Dictionary:
	var tiles: Array = _parse(LAYOUTS[int(e.tier) - 1].grid)[0]
	for y in tiles.size():
		var x: int = (tiles[y] as String).find("E")
		if x >= 0:
			return {"x": x, "y": y - 1, "facing": "up"}
	return {"x": 1, "y": 1, "facing": "up"}


## 屋裡（Room 載入 home:空地id 時呼叫）
static func room_data(id: String) -> Dictionary:
	var pid := id.substr(5)
	var p := plot_def(pid)
	var e: Dictionary = estates()[pid]
	var parsed := _parse(LAYOUTS[int(e.tier) - 1].grid)
	var tiles: Array = parsed[0]
	var anchors: Dictionary = parsed[1]
	var place: Dictionary = LAYOUTS[int(e.tier) - 1].place[e.style]
	var props := []
	for fid in furniture_of(e):
		if not place.has(fid):
			continue
		var at: Vector2i = anchors[place[fid]]
		var lv: int = level(e, fid) if int(FURNITURE[fid].max) > 1 else 1
		var w: int = 2 if fid == "deco" and e.style == "martial" else int(FURNITURE[fid].w)
		props.append({"sprite": "f_%s_%s_%d" % [fid, e.style, lv], "x": at.x, "y": at.y, "w": w, "lines": [], "label": FURNITURE[fid].label, "script": "estate/use", "furn": fid})
	# 大宅的池塘：放一個釣點（只有鯽魚、鯉魚）
	for y in tiles.size():
		var x: int = (tiles[y] as String).find("~")
		if x >= 0:
			props.append({"sprite": "ripple", "x": x, "y": y, "w": 1, "lines": [], "label": "釣魚", "script": "estate/pond"})
			break
	var sp := _spawn(e)
	var b := _building_of(p, e)
	return {"id": id, "name": TIERS[int(e.tier) - 1].name, "subtitle": "%s・自宅" % p.name, "theme": e.style, "tiles": tiles, "spawn": sp, "props": props, "npcs": [],
		"exits": [{"tiles": [[sp.x, sp.y + 1]], "to": "qingzhu", "spawn": {"x": int(b.x) + int(b.st.door), "y": int(b.y) + int(b.st.h), "facing": "down"}}]}


# ── 空地的木牌 ──────────────────────────────────────────

static func plot_sign(ctx: Ctx) -> void:
	var p := plot_def(ctx.extra.get("prop", {}).get("plot", ""))
	if p.is_empty():
		return
	await ctx.say("「%s」\n空地一塊，可以蓋屋。售價 %d 兩，買下附贈茅草屋一間。" % [p.name, int(p.price)])
	if ctx.flag("home_deed") == 1:
		if await ctx.ask("你拿出柳村長給的地契。要在這塊地上蓋房子嗎？", ["就是這裡", "再看看"]) != 0:
			return
		ctx.set_flag("home_deed", 2)
	else:
		if await ctx.ask("要花 %d 兩買下這塊地嗎？（目前有 %d 兩）" % [int(p.price), G.silver], ["買下", "算了"]) != 0:
			return
		if not ctx.pay(int(p.price)):
			await ctx.say("銀兩不夠……還是先去多攢一些吧。")
			return
	estates()[p.id] = {"plot": p.id, "tier": 1, "style": "plain", "furniture": {}}
	await ctx.say(["杜木匠帶著幾個幫手扛來茅草和木料，不到半天，就在空地上搭起了一間茅草屋。", "這是你在江湖上的第一個家。\n（找杜木匠可以擴建房子、升級家具、換擺設風格）"])
	ctx.warp("qingzhu", ctx.scene.where_at())


# ── 杜木匠 ──────────────────────────────────────────────

static func carpenter(ctx: Ctx) -> void:
	var list: Array = estates().values()
	if list.is_empty():
		await ctx.say([_say("我是村裡的木匠杜大樑，蓋屋、打家具都找我。"), _say("村東有兩塊、村西南有一塊空地，地上插著木牌。買下來，我就幫你把屋子搭起來。")])
		if ctx.flag("home_deed") == 1:
			await ctx.say(_say("柳村長給了你地契？那就挑一塊喜歡的，到木牌前拿出地契就成。"))
		return
	var e: Dictionary = list[0]
	if list.size() > 1:
		var i := await ctx.ask(_say("要整修哪一間？"), list.map(func(x): return "%s（%s）" % [plot_def(x.plot).name, TIERS[int(x.tier) - 1].name]) + ["算了"])
		if i >= list.size():
			return
		e = list[i]
	await ctx.say(_say("擴建、換家具、改擺設，儘管開口。工錢公道。"))
	var first_tier := int(e.tier)
	while true:
		var tier := int(e.tier)
		var opts := []
		if tier < TIERS.size():
			opts.append(["擴建成「%s」（%d 兩）：%s" % [TIERS[tier].name, TIERS[tier].cost, TIERS[tier].desc], "grow"])
		for fid in furniture_of(e):
			var fd: Dictionary = FURNITURE[fid]
			var lv := level(e, fid)
			if lv < int(fd.max):
				opts.append(["%s升到 %d 級（%d 兩）：%s" % [fd.name, lv + 1, fd.costs[lv - 1], effect(fid, lv + 1, e)], "up:" + fid])
		opts.append(["換擺設風格（%d 兩，現在是「%s」）" % [RESTYLE_COST, STYLE_NAME[e.style]], "style"])
		opts.append(["看看家裡的家具", "list"])
		var c := await ctx.ask(_say("%s，%s。要做什麼？" % [plot_def(e.plot).name, TIERS[tier - 1].name]), opts.map(func(o): return o[0]) + ["不用了"])
		if c >= opts.size():
			# 擴建了：村裡的房子換個樣子
			if int(e.tier) != first_tier:
				ctx.warp("qingzhu", ctx.scene.where_at())
			return
		var k: String = opts[c][1]
		if k == "grow":
			if not ctx.pay(int(TIERS[tier].cost)):
				await ctx.say(_say("這得 %d 兩，你身上不夠。" % TIERS[tier].cost))
				continue
			e.tier = tier + 1
			await ctx.say([_say("好嘞！"), "杜大樑帶著徒弟忙了好幾天，拆了舊牆、打了新樑——", "房子擴建成「%s」了！" % TIERS[tier].name])
		elif k.begins_with("up:"):
			var fid := k.substr(3)
			var cost: int = FURNITURE[fid].costs[level(e, fid) - 1]
			if not ctx.pay(cost):
				await ctx.say(_say("這得 %d 兩，你身上不夠。" % cost))
				continue
			e.furniture[fid] = level(e, fid) + 1
			await ctx.say("杜大樑叮叮咚咚敲了半天，%s煥然一新。（%s %d 級）" % [FURNITURE[fid].name, FURNITURE[fid].name, level(e, fid)])
		elif k == "style":
			var styles := ["plain", "scholar", "martial"]
			var s := await ctx.ask(_say("要換成哪一種擺法？"), styles.map(func(x): return "%s：%s" % [STYLE_NAME[x], STYLE_DESC[x]]) + ["算了"])
			if s >= styles.size() or styles[s] == e.style:
				continue
			if not ctx.pay(RESTYLE_COST):
				await ctx.say(_say("工錢 %d 兩，你身上不夠。" % RESTYLE_COST))
				continue
			e.style = styles[s]
			await ctx.say("家具挪了位置、換了配色，屋裡看起來是「%s」的樣子了。" % STYLE_NAME[e.style])
		elif k == "list":
			await ctx.say("\n".join(furniture_of(e).map(func(f): return "%s %d 級：%s" % [FURNITURE[f].name, level(e, f), effect(f, level(e, f), e)])))


## 家具在某個等級、這種風格下的效果
static func effect(fid: String, lv: int, e: Dictionary) -> String:
	var st: String = e.style
	match fid:
		"bed":
			var r: Array = BED_REST[lv]
			return "睡一覺過一天，氣血、內力、體力全滿。%s" % ("起床後精神飽滿：接下來 %d 場戰鬥武功經驗 ×%s。" % [r[0], r[1]] if r.size() > 0 else "")
		"stove":
			return "做學會的菜，灶台越好越容易做出好菜%s。" % ("（樸素：多算一級）" if st == "plain" else "")
		"shelf":
			return "研讀一門武功，體會換成領悟 %d%%。" % roundi((SHELF_RATE[lv] + (0.1 if st == "scholar" else 0.0)) * 100)
		"dummy":
			return "練一回（兩刻、體力 20），裝備中的外功經驗 +%d。" % (DUMMY_EXP[lv] + (15 if st == "martial" else 0) + (10 if int(e.tier) >= 5 else 0))
		"furnace":
			return "兩株止血草煉成 %d 帖金創藥。" % lv
		"garden":
			return "每天收成 %d 株止血草。" % (GARDEN_HERBS[lv] + (1 if st == "plain" else 0))
		"rack":
			return "把鮮魚掛上去，兩天後收魚乾（秋冬一天就好）。"
		"table":
			return "吃飯、喝茶的地方。"
		"guestbed":
			return "整理好的客房，等著將來的朋友來住。"
	return {"plain": "一盆青竹盆栽。", "scholar": "一幅山水字畫。", "martial": "一座兵器架。"}[st]


# ── 家具 ────────────────────────────────────────────────

static func _here(ctx: Ctx) -> Dictionary:
	var rid: String = ctx.scene.get("room_id")
	return estates().get(rid.substr(5), {})


static func use(ctx: Ctx) -> void:
	var e := _here(ctx)
	var fid: String = ctx.extra.get("prop", {}).get("furn", "")
	if e.is_empty() or fid == "":
		return
	var lv := level(e, fid)
	match fid:
		"bed":
			var r: Array = BED_REST[lv]
			var wake := func() -> Array:
				if r.size() == 0:
					return []
				G.hero.rested = {"battles": r[0], "mult": r[1]}
				return ["精神飽滿！接下來 %d 場戰鬥，武功經驗 ×%s。" % [r[0], r[1]]]
			await Train.rest(ctx, "自家的床，被子曬過太陽，暖烘烘的。要躺下休息嗎？", wake)
		"stove":
			await Cook.cook_at(ctx, mini(3, lv + (1 if e.style == "plain" else 0)), "灶台收拾得乾乾淨淨。")
		"shelf":
			await _shelf(ctx, e, lv)
		"dummy":
			await _dummy(ctx, e, lv)
		"furnace":
			await _furnace(ctx, lv)
		"garden":
			await _garden(ctx, e, lv)
		"rack":
			await _rack(ctx, e)
		"table":
			await ctx.say("一張方桌、兩張竹凳。")
		"guestbed":
			await ctx.say("客房的床鋪得整整齊齊，等著將來的朋友來住。")
		_:
			await ctx.say({"plain": "一盆青竹盆栽，翠綠可愛。", "scholar": "一幅淡墨山水，題著「靜觀自得」。", "martial": "兵器架上插著刀槍劍棍，擦得雪亮。"}[e.style])


static func _shelf(ctx: Ctx, e: Dictionary, lv: int) -> void:
	var ready := Train.studyable()
	if ready.is_empty():
		await ctx.say("架上擺著幾本書。\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）")
		return
	var i := 0
	if ready.size() > 1:
		i = await ctx.ask("要對照哪一門武功研讀？", ready.map(func(s): return "%s（領悟 %d%%）" % [Hero.skill_def(s.id).name, int(s.insight)]) + ["算了"])
		if i >= ready.size():
			return
	var id: String = ready[i].id
	var g := await Train.read(ctx, SHELF, "自家書架上的武學典籍，對照著「%s」的招式推敲。" % Hero.skill_def(id).name)
	if g >= 0:
		await ctx.say(Train.apply(id, g, SHELF_RATE[lv] + (0.1 if e.style == "scholar" else 0.0)))


static func _dummy(ctx: Ctx, e: Dictionary, lv: int) -> void:
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("一根結實的木人樁。\n（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var i := await ctx.ask("要對著木人樁練哪一門？", list.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level]) + ["算了"])
	if i >= list.size():
		return
	var s: Dictionary = list[i]
	# 大宅的演武場練起來更有勁
	var amount: int = DUMMY_EXP[lv] + (15 if e.style == "martial" else 0) + (10 if int(e.tier) >= 5 else 0)
	var n := await Train.ask_rounds(ctx, Train.STAMINA.stake, "練", Train.rounds_to_cap(s, amount))
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.stake * n, "手臂都快抬不起來了，筋骨痠痛得很。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練樁中……")
	await ctx.say(["「啪、啪、啪——」你對著木人樁一招一式地練了起來。" + Train.rounds_note("練", n)] + Train._exp_lines(s.id, amount * n, false))


static func _furnace(ctx: Ctx, per: int) -> void:
	var herbs := int(G.bag.get("herb", 0))
	if herbs < 2:
		await ctx.say("一座青銅藥爐。\n（兩株止血草可以煉成 %d 帖金創藥。目前有 %d 株）" % [per, herbs])
		return
	var batches := herbs / 2
	var c := await ctx.ask("有 %d 株止血草，可以煉 %d 爐，每爐 %d 帖金創藥。" % [herbs, batches, per], ["煉一爐", "全部煉了", "算了"])
	if c == 2:
		return
	var n := 1 if c == 0 else batches
	ctx.take("herb", n * 2)
	ctx.pass_time(4)
	await ctx.work("cook", "煉藥中……")
	await ctx.say("爐火青青，藥香裊裊……\n（花了半個時辰）")
	await ctx.give("jinchuang", n * per)


static func _garden(ctx: Ctx, e: Dictionary, lv: int) -> void:
	if not G.life.has("daily"):
		G.life.daily = {}
	var key := "%s:garden" % e.plot
	if int(G.life.daily.get(key, 0)) == G.day:
		await ctx.say("今天的止血草已經收過了，新芽還沒長出來。\n（明天再來吧。過了半夜就是新的一天）")
		return
	G.life.daily[key] = G.day
	ctx.pass_time(2)
	# 冬天長得慢，少收一株
	var winter := G.season_of() == 3
	var n := maxi(1, GARDEN_HERBS[lv] + (1 if e.style == "plain" else 0) - (1 if winter else 0))
	await ctx.work("garden", "收成中……")
	await ctx.say("藥圃蓋著一層稻草擋霜。你掀開稻草，摘下幾株長得慢吞吞的止血草。" if winter else "你蹲下身，把長好的止血草一株株摘了下來。")
	await ctx.give("herb", n)


static func _rack_days() -> int:
	return 1 if G.season_of() >= 2 else 2


static func _rack(ctx: Ctx, e: Dictionary) -> void:
	var r: Dictionary = e.get("rack", {})
	if int(r.get("n", 0)) > 0:
		var left := int(r.day) + _rack_days() - G.day
		if left > 0:
			await ctx.say("晾魚架上掛著 %d 條魚，還沒乾透。\n（再 %d 天就能收）" % [int(r.n), left])
			return
		await ctx.say("魚都曬得乾硬，聞起來又鹹又香。你一條條取下來，用草繩串好。")
		await ctx.give("dried_fish", int(r.n))
		e.erase("rack")
		return
	var fresh := RACK_FISH.filter(func(id): return int(G.bag.get(id, 0)) > 0)
	var n := 0
	for id in fresh:
		n += int(G.bag[id])
	if n == 0:
		await ctx.say("晾魚架空著。\n（把鮮魚掛上去，%d 天後收魚乾。魚可以自己釣，也能在大埠頭魚市、碧漪湖阮大水那兒買）" % _rack_days())
		return
	if await ctx.ask("要把身上的鮮魚掛上去晾嗎？（%d 條，%d 天後收魚乾）" % [n, _rack_days()], ["全掛上去", "算了"]) != 0:
		return
	ctx.pass_time(1)
	for id in fresh:
		G.bag.erase(id)
	e.rack = {"n": n, "day": G.day}
	await ctx.say("你把魚剖開、抹上鹽，一條條掛上竿子。風一吹，魚尾巴晃呀晃的。")


static func pond(ctx: Ctx) -> void:
	await load("res://story/fishing.gd").fish_at(ctx, "pond", "自家院子的小池塘，養著幾條鯽魚、鯉魚。")


# ── 今日事 ──────────────────────────────────────────────

static func tasks() -> Array:
	var out := []
	for e in estates().values():
		if int(e.tier) >= 4:
			var done := int(G.life.get("daily", {}).get("%s:garden" % e.plot, 0)) == G.day
			out.append({"text": "收%s藥圃的止血草" % plot_def(e.plot).name, "state": "done" if done else "todo", "note": ""})
		var r: Dictionary = e.get("rack", {})
		if int(r.get("n", 0)) > 0 and G.day >= int(r.day) + _rack_days():
			out.append({"text": "%s的晾魚架：魚乾曬好了" % plot_def(e.plot).name, "state": "todo", "note": ""})
	return out
