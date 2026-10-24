## 到處翻找（照網頁版 loot.ts）：茶几、書架、罈子、攤子這類沒有劇情、只有描述的擺設，偶爾藏著東西。
## - 哪裡有東西每天重新隨機（依存檔的種子 G.life.seed、日子與地圖決定），所以記不住位置；同一天讀檔重來結果也一樣。
## - 翻到了記在旗標，當天不會再有；翻到空的就照常說描述，不會透露哪裡有東西。
## 由 GridScene 查看擺設時呼叫（find）。
## 用到的旗標：loot_<地圖>_<x>_<y> 翻到東西那天

## 這些擺設不能翻（告示、牌坊、船、旗子、門……）
const SKIP := ["sign", "bulletin", "paifang", "boat", "flag", "stone_tablet", "door", "stele", "dragon_boat", "river_lamp", "sect_flag", "ding", "drum"]
## 每一處藏東西的機率；一張地圖一天最多藏幾處
const CHANCE := 0.06
const MAX_PER_MAP := 2

## [權重, 物品（空的是銀兩）, 數量或銀兩的範圍]
const OUTDOOR := [[30, "herb", [1, 2]], [14, "mushroom", [1, 1]], [24, "", [2, 8]], [8, "cotton_thread", [1, 2]], [8, "yangqi_wan", [1, 1]], [6, "jinchuang", [1, 1]], [2, "", [30, 60]]]
const INDOOR := [[34, "", [1, 6]], [14, "tea", [1, 1]], [10, "jinchuang", [1, 1]], [10, "silk_thread", [1, 1]], [10, "cotton_thread", [1, 2]], [8, "yangqi_wan", [1, 1]], [6, "osmanthus", [1, 1]], [3, "", [20, 50]]]


static func searchable(p: Dictionary) -> bool:
	if p.get("script", "") != "" or p.get("passable", false):
		return false
	var s: String = p.get("sprite", "")
	return not SKIP.any(func(k): return s.begins_with(k))


static func _seed() -> int:
	if not G.life.has("seed"):
		G.life.seed = randi()
	return int(G.life.seed)


## 這張地圖今天藏東西的地方：「x,y」→ [物品, 數量]（物品空的是銀兩）
static func today(map: String, props: Array, indoor: bool) -> Dictionary:
	var spots := props.filter(func(p): return searchable(p.def) and not p.get("hidden", false))
	var order := RandomNumberGenerator.new()
	order.seed = hash("%d:%d:%s" % [_seed(), G.day, map])
	spots.sort_custom(func(a, b): return hash("%d:%s" % [order.seed, a.def.x * 100 + a.def.y]) < hash("%d:%s" % [order.seed, b.def.x * 100 + b.def.y]))
	var table: Array = INDOOR if indoor else OUTDOOR
	var total := 0
	for e in table:
		total += int(e[0])
	var out := {}
	for p in spots:
		if out.size() >= MAX_PER_MAP:
			break
		var r := RandomNumberGenerator.new()
		r.seed = hash("%d:%d:%s:%d,%d" % [_seed(), G.day, map, p.def.x, p.def.y])
		if r.randf() >= CHANCE:
			continue
		var w := r.randf() * total
		for e in table:
			w -= int(e[0])
			if w < 0:
				out["%d,%d" % [p.def.x, p.def.y]] = [e[1], r.randi_range(e[2][0], e[2][1])]
				break
	return out


## 查看擺設時：今天這裡有東西就給（回傳要多說的話，沒有是空的）
static func find(scene: Node, p: Dictionary) -> Array:
	if not searchable(p):
		return []
	var map: String = scene.get("map_id") if scene.get("map_id") else scene.get("room_id")
	var key := "%d,%d" % [p.x, p.y]
	var flag := "loot_%s_%d_%d" % [map, p.x, p.y]
	if int(G.flags.get(flag, 0)) == G.day:
		return []
	var got: Dictionary = today(map, scene.props, not scene.outdoor)
	if not got.has(key):
		return []
	G.flags[flag] = G.day
	var e: Array = got[key]
	if e[0] == "":
		G.silver += int(e[1])
		return [{"text": "你順手翻了翻，翻出幾枚碎銀子。（銀兩 +%d）" % e[1]}]
	G.bag[e[0]] = int(G.bag.get(e[0], 0)) + int(e[1])
	return [{"text": "你順手翻了翻，找到了%s%s！" % [Ui.item_def(e[0]).get("name", e[0]), " ×%d" % e[1] if int(e[1]) > 1 else ""]}]


## 開發用：印出這張地圖接下來三十天藏東西的地方（run:loot/debug）
static func debug(ctx: Ctx) -> void:
	var map: String = ctx.scene.get("map_id") if ctx.scene.get("map_id") else ctx.scene.get("room_id")
	var d0 := G.day
	for d in range(d0, d0 + 30):
		G.day = d
		var t := today(map, ctx.scene.props, not ctx.scene.outdoor)
		if not t.is_empty():
			print("LOOT ", d, " ", t)
	G.day = d0
