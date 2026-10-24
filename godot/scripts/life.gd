class_name Life
## 自己過日子的人（照網頁版 life.ts）：每個時段（4 刻）依時辰、天氣、喜好排一件事，每件事有地點（地圖＋格子＋朝向）。
## - 固定的先排：睡覺（夜裡回自己的床）、吃飯（午時、酉時到自己的座位）、職責（duty：例如擺攤、下田、打鐵）。
## - 其餘照喜好（likes）抽：聊天要兩個人，抽到的兩兩配對、站到一組面對面的位置；想做的事沒位子就去散步，都沒有就在家歇著。
## - 下雨、下雪：室外的事換成室內的。同一個位置一次只站一個人；同一天同一時段的安排固定（由日子、時段決定）。
## - 一群人寫在 story/life_<群>.gd：static func group() 回傳 {id, maps, outdoor, spots, npcs}，
##   以及 static func duty(id, 時刻, 下雨) 回傳 {act, at} 或空的；地點 at 是 [地圖, x, y, 朝向]，地圖外（回家、出遠門）用 "_away"。
## - 畫面那邊（grid_scene 的 life_*）：在這張地圖上的人站到位置上；換事情時自己走過去，換地圖就走到門口消失、從門口走進來。

## 每件事：名字、頭上的小字、在原地走動的範圍、是不是室外
const ACTS := {
	"sleep": ["睡覺", "Ｚ", 0, false], "eat": ["吃飯", "飯", 0, false], "chat": ["聊天", "聊", 0, false],
	"stroll": ["散步", "", 3, true], "play": ["玩耍", "玩", 3, true], "farm": ["下田", "田", 1, true],
	"wash": ["洗衣洗菜", "洗", 0, true], "fish": ["釣魚", "釣", 0, true], "tea": ["喝茶聽書", "茶", 0, false],
	"stall": ["擺攤", "攤", 0, true], "forge": ["打鐵", "鐵", 0, false], "carve": ["做木工", "木", 0, true],
	"sew": ["做針線", "針", 0, false], "haul": ["進城補貨", "貨", 0, false], "read": ["讀書", "書", 0, false],
	"home": ["在家歇著", "", 0, false],
}
const BLOCK := 4
const AWAY := "_away"

static var _groups := {}
static var _cache := {}


## 這張地圖上有哪一群人在過日子（沒有就是空的）
static func group_for(map: String) -> Dictionary:
	for id in ["qingzhu"]:
		var g := group(id)
		if map in g.maps:
			return g
	return {}


static func group(id: String) -> Dictionary:
	if not _groups.has(id):
		var s: GDScript = load("res://story/life_%s.gd" % id)
		var g: Dictionary = s.call("group")
		g["script"] = s
		_groups[id] = g
	return _groups[id]


static func _rand(keys: Array) -> float:
	return float(hash(str(keys)) & 0xFFFFF) / float(0x100000)


static func is_outdoor(g: Dictionary, map: String) -> bool:
	return map in g.outdoor


static func _spot_at(at: Array) -> Dictionary:
	return {"map": at[0], "x": int(at[1]), "y": int(at[2]), "facing": at[3] if at.size() > 3 else "down"}


static func meal_time(t: int) -> bool:
	return G.shichen_of(t) in [6, 9]


## 這一群人現在各自在做什麼：id → {act, at: {map, x, y, facing}, with}
static func now(g: Dictionary) -> Dictionary:
	var block := G.time / BLOCK
	var wet := G.weather in ["rain", "snow"]
	var key := "%s:%d:%d:%d:%d" % [g.id, G.day, block, int(wet), int(meal_time(G.time))]
	if _cache.has(key):
		return _cache[key]
	if _cache.size() > 32:
		_cache.clear()
	var out := {}
	var taken := {}
	var free := []
	for n in g.npcs:
		if n.has("when") and not Story.cond(n.when):
			continue
		var awake: bool = G.time >= int(n.wake) and G.time < int(n.sleep)
		if not awake:
			out[n.id] = {"act": "sleep", "at": _spot_at(n.home)}
		elif meal_time(G.time):
			out[n.id] = {"act": "eat", "at": _spot_at(n.seat)}
		else:
			var d: Dictionary = g.script.call("duty", n.id, G.time, wet)
			if not d.is_empty() and not (wet and is_outdoor(g, d.at[0])):
				out[n.id] = {"act": d.act, "at": _spot_at(d.at)}
			else:
				free.append(n)
	for a in out.values():
		for sp in g.spots:
			if sp.at[0] == a.at.map and int(sp.at[1]) == a.at.x and int(sp.at[2]) == a.at.y:
				taken[sp.id] = true
	# 照喜好抽；聊天的人等一下兩兩配對
	var chatters := []
	free.sort_custom(func(a, b): return _rand([G.day, block, a.id]) < _rand([G.day, block, b.id]))
	for n in free:
		var opts := []
		var total := 0.0
		for act in n.likes:
			if wet and ACTS[act][3]:
				continue
			if not g.spots.any(func(sp): return act in sp.acts and not taken.has(sp.id) and not (wet and is_outdoor(g, sp.at[0]))):
				continue
			opts.append([act, float(n.likes[act])])
			total += float(n.likes[act])
		var act := ""
		var r := _rand([G.day, block, n.id, "act"]) * total
		for o in opts:
			r -= o[1]
			if r < 0:
				act = o[0]
				break
		if act == "" and opts.size() > 0:
			act = opts[0][0]
		if act == "":
			out[n.id] = {"act": "home", "at": _spot_at(n.home)}
			continue
		if act == "chat":
			chatters.append(n)
			continue
		var spots: Array = g.spots.filter(func(sp): return act in sp.acts and not taken.has(sp.id) and not (wet and is_outdoor(g, sp.at[0])))
		var sp: Dictionary = spots[int(_rand([G.day, block, n.id, "spot"]) * spots.size())]
		taken[sp.id] = true
		out[n.id] = {"act": act, "at": _spot_at(sp.at)}
	# 聊天：兩兩一組站到一對面對面的位置；落單的去散步（下雨在家）
	var pairs: Array = g.spots.filter(func(sp): return "chat" in sp.acts and sp.has("pair") and sp.id < sp.pair and not taken.has(sp.id) and not taken.has(sp.pair) and not (wet and is_outdoor(g, sp.at[0])))
	var i := 0
	while i + 1 < chatters.size() and pairs.size() > 0:
		var a: Dictionary = chatters[i]
		var b: Dictionary = chatters[i + 1]
		var p: Dictionary = pairs.pop_at(int(_rand([G.day, block, a.id, b.id]) * pairs.size()))
		var q: Dictionary = g.spots.filter(func(sp): return sp.id == p.pair)[0]
		taken[p.id] = true
		taken[q.id] = true
		out[a.id] = {"act": "chat", "at": _spot_at(p.at), "with": b.id}
		out[b.id] = {"act": "chat", "at": _spot_at(q.at), "with": a.id}
		i += 2
	for n in chatters:
		if out.has(n.id):
			continue
		var alt: Array = g.spots.filter(func(sp): return "stroll" in sp.acts and not taken.has(sp.id) and not wet)
		if alt.size() > 0:
			taken[alt[0].id] = true
			out[n.id] = {"act": "stroll", "at": _spot_at(alt[0].at)}
		else:
			out[n.id] = {"act": "home", "at": _spot_at(n.home)}
	_cache[key] = out
	return out


static func npc_def(g: Dictionary, id: String) -> Dictionary:
	for n in g.npcs:
		if n.id == id:
			return n
	return {}
