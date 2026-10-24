class_name Crafts
## 生活技能（照網頁版 crafts.ts）：烹飪、釣魚……跟武功分開，不影響五維。
## - 每項技能有等級（0–10）與經驗，等級越高做得越好、越不容易失手。
## - 技能底下的「項目」（每一道菜、每一種魚）各有熟練度 1–5，練項目同時替技能加經驗。
## - 存在角色身上：G.hero.crafts[技能] = {level, exp}，G.hero.works["技能:項目"] = {level, exp}。
## - 資料在 data/life.json（技能、菜、魚）。

const MAX := 10
const WORK_MAX := 5
const TITLES := [[0, "未習"], [1, "生疏"], [3, "入門"], [5, "熟手"], [7, "精通"], [9, "名家"], [10, "宗師"]]

static var _data := {}


static func data() -> Dictionary:
	if _data.is_empty():
		_data = JSON.parse_string(FileAccess.get_file_as_string("res://data/life.json"))
	return _data


static func def(id: String) -> Dictionary:
	for c in data().crafts:
		if c.id == id:
			return c
	return {}


static func dish(id: String) -> Dictionary:
	for d in data().dishes:
		if d.id == id:
			return d
	return {}


static func fish(id: String) -> Dictionary:
	for f in data().fish:
		if f.id == id:
			return f
	return {}


## 升到下一級要的經驗
static func exp_to_next(level: int) -> int:
	return 40 + level * 40


static func title(level: int) -> String:
	var t: String = TITLES[0][1]
	for e in TITLES:
		if level >= e[0]:
			t = e[1]
	return t


static func of(id: String) -> Dictionary:
	var all: Dictionary = G.hero.get("crafts", {})
	var p: Dictionary = all.get(id, {})
	return {"level": int(p.get("level", 0)), "exp": int(p.get("exp", 0))}


static func level(id: String) -> int:
	return of(id).level


## 加經驗；升級時回傳提示（右上角也冒一張通知）
static func gain(id: String, n: int) -> String:
	if not G.hero.has("crafts"):
		G.hero.crafts = {}
	var p := of(id)
	if p.level >= MAX or n <= 0:
		return ""
	var from: int = p.level
	p.exp += n
	while p.level < MAX and p.exp >= exp_to_next(p.level):
		p.exp -= exp_to_next(p.level)
		p.level += 1
	if p.level >= MAX:
		p.exp = 0
	G.hero.crafts[id] = p
	return "你的「%s」提升到第 %d 級（%s）！" % [def(id).name, p.level, title(p.level)] if p.level > from else ""


# ── 項目（每一道菜、每一種魚） ──────────────────────────

static func _key(craft: String, id: String) -> String:
	return "%s:%s" % [craft, id]


## 這個項目的熟練度（沒學過是空的）
static func work(craft: String, id: String) -> Dictionary:
	var w: Dictionary = G.hero.get("works", {}).get(_key(craft, id), {})
	return {} if w.is_empty() else {"level": int(w.level), "exp": int(w.exp)}


static func learn_work(craft: String, id: String) -> void:
	if not G.hero.has("works"):
		G.hero.works = {}
	if not G.hero.works.has(_key(craft, id)):
		G.hero.works[_key(craft, id)] = {"level": 1, "exp": 0}


## 熟練度升級要的經驗
static func work_to_next(level: int) -> int:
	return 10 + level * 10


## 項目加熟練；升級回傳 true
static func gain_work(craft: String, id: String, n: int) -> bool:
	var w := work(craft, id)
	if w.is_empty() or w.level >= WORK_MAX:
		return false
	var from: int = w.level
	w.exp += n
	while w.level < WORK_MAX and w.exp >= work_to_next(w.level):
		w.exp -= work_to_next(w.level)
		w.level += 1
	if w.level >= WORK_MAX:
		w.exp = 0
	G.hero.works[_key(craft, id)] = w
	return w.level > from


## 某技能學過的項目 id
static func works_of(craft: String) -> Array:
	var out := []
	for k in G.hero.get("works", {}):
		if k.begins_with(craft + ":"):
			out.append(k.substr(craft.length() + 1))
	return out
