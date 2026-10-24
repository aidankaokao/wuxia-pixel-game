class_name Story
## 劇情腳本系統：執行腳本、算出現條件、NPC 作息。
## - 腳本寫在 godot/story/<檔名>.gd 的 static 函式（`static func well_use(ctx: Ctx) -> void:`），資料裡用「檔名/函式名」指到它，
##   例如擺設的 `"script": "qingzhu/well_use"`。執行期間主角不能自由行動（ui.busy() 為真），跑完會重新判斷誰該出現。
## - 出現條件 `when` 是一條運算式字串，例如 `"not stranger"`、`"q_bandits >= 2 and not rain"`：
##   可以讀劇情旗標（沒設過的是 0），以及 rain、fog、snow、cloudy、clear（是就為 1）、today（今天第幾日）、
##   festival（今天是第幾個節慶，平日 0）、xunxiu（旬休是 1）、season（0 春…3 冬）、shichen（0 子時…11 亥時）。
## - NPC 作息照網頁版 npcPresent：all_day 一直都在；night 只有夜裡在；室外的人與 work 的人白天才在
##   （依名字錯開，卯時到辰時之間陸續出門、酉時到戌時之間陸續回房；out 可以指定幾點出門）；
##   meal "eat" 只在用餐時段（午時、酉時）出現，"away" 用餐時段不在。

static var _cache := {}
## 正在跑的腳本數（巢狀呼叫也算）
static var running := 0


## 執行一段腳本：id 是「檔名/函式名」
static func run(id: String, scene: GridScene, extra := {}) -> void:
	var parts := id.split("/")
	if parts.size() != 2:
		push_warning("腳本 id 寫錯了：%s" % id)
		return
	var path := "res://story/%s.gd" % parts[0]
	if not _cache.has(path):
		_cache[path] = load(path)
	var s: GDScript = _cache[path]
	if s == null or not s.has_method(parts[1]):
		push_warning("找不到腳本：%s" % id)
		return
	var ctx := Ctx.new(scene, extra)
	running += 1
	await s.call(parts[1], ctx)
	running -= 1
	if is_instance_valid(scene):
		scene.refresh()


## 出現條件成立嗎（空字串一律成立）
static func cond(expr: String) -> bool:
	if expr.strip_edges() == "":
		return true
	var env := _env()
	var names: Array[String] = []
	var values := []
	var re := RegEx.create_from_string("[A-Za-z_][A-Za-z0-9_]*")
	for m in re.search_all(expr):
		var n := m.get_string()
		if n in ["and", "or", "not", "true", "false"] or n in names:
			continue
		names.append(n)
		values.append(env.get(n, G.flags.get(n, 0)))
	var e := Expression.new()
	if e.parse(expr, PackedStringArray(names)) != OK:
		push_warning("條件寫錯了：%s（%s）" % [expr, e.get_error_text()])
		return false
	var r = e.execute(values)
	return bool(r) if not e.has_execute_failed() else false


## 條件裡可以讀的世界狀態
static func _env() -> Dictionary:
	var fest := 0
	var name := G.festival_of()
	for i in G.FESTIVALS.size():
		if G.FESTIVALS[i].name == name:
			fest = i + 1
	return {
		"rain": int(G.weather == "rain"), "fog": int(G.weather == "fog"), "snow": int(G.weather == "snow"),
		"cloudy": int(G.weather == "cloudy"), "clear": int(G.weather == "clear"),
		"today": G.day, "festival": fest, "xunxiu": int(G.is_xunxiu()), "season": G.season_of(), "shichen": G.shichen_of(),
	}


## 這個人現在在不在：先看出現條件，再看作息（outdoor：這張地圖是不是室外）
static func present(def: Dictionary, outdoor: bool) -> bool:
	if not cond(def.get("when", "")):
		return false
	if def.get("encounter", "") != "":
		return true
	var meal_time := G.shichen_of() in [6, 9]
	match def.get("meal", ""):
		"eat":
			return meal_time
		"away":
			if meal_time:
				return false
	if def.get("all_day", false):
		return true
	var hours := npc_hours(def.get("name", ""))
	var out: int = int(def.get("out", hours[0]))
	var awake: bool = G.time >= out and G.time < hours[1]
	if def.get("night", false):
		return not awake
	if outdoor or def.get("work", false):
		return awake
	return true


## 依名字算出這個人幾點出門、幾點回房（第幾刻），讓大家陸陸續續地走；跟網頁版算出來一樣
static func npc_hours(name: String) -> Array:
	var h := 0
	for ch in name:
		h = (h * 31 + ch.unicode_at(0)) & 0xFFFFFFFF
	return [20 + h % 9, 68 + (h >> 4) % 13]
