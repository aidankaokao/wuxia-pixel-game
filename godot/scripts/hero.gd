class_name Hero
## 角色成長（照網頁版 character.ts）：沒有人物等級。五維 ＝ 擲骰底值 ＋ 永久成長 ＋ 裝備中武功的加成：
## - 永久成長：每門學過的武功依重數永久提升五維與氣血／內力／體力上限，卸下也不會消失；每悟出一招另有永久加成。
## - 裝備加成：只有裝備在身上的武功才有，重數越高加成越多。
## 武功有品階，品階決定正常上限；到了上限後，有秘笈就能花武學點數嘗試突破，最高到隱藏上限 99 重。
## 主角的資料是 G.hero（字典）；銀兩、行囊在 G.silver、G.bag。資料表在 data/skills.json（tiers、skills、moves）與 data/items.json。

const ATTRS := [
	{"key": "strength", "name": "勁力", "desc": "出手的力道，影響外功傷害。"},
	{"key": "agility", "name": "身法", "desc": "身形的靈巧，影響閃避、出手快慢與輕功。"},
	{"key": "constitution", "name": "根骨", "desc": "筋骨的強健，影響氣血與體力上限。"},
	{"key": "energy", "name": "內息", "desc": "丹田真氣的深厚，影響內力上限與內功威力。"},
	{"key": "insight", "name": "悟性", "desc": "領會武學的天分，影響練功的快慢。"},
]
## 擲骰：每項的範圍與五項總和的範圍（避免擲出太強或太弱的角色）
const ROLL := {"min": 5, "max": 18, "total_min": 52, "total_max": 62}
const DEFAULT_BASE := {"strength": 12, "agility": 13, "constitution": 11, "energy": 6, "insight": 15}
const SURNAMES := ["蕭", "葉", "沈", "陸", "顧", "韓", "秦", "柳", "江", "白", "溫", "穆", "凌", "裴", "燕", "楚", "岳", "謝", "杜", "方", "雲", "龍", "石", "嚴", "蘇", "司馬", "歐陽", "上官", "南宮", "東方", "慕容"]
const NAME_CHARS := "子雲風行遠朔寒舟川岳辰逸塵青嵐霜昭明峻然弈之衡鈞驍若謙澄翊非白羽鳴"
## 武功欄位：外功 5、內功 2、輕功 1
const SLOT_NAME := {"outer": "外功", "inner": "內功", "light": "輕功"}
const SLOT_LIMIT := {"outer": 5, "inner": 2, "light": 1}
const HIDDEN_CAP := 99
## 每點武學點數換成的經驗
const POINT_EXP := 10

static var _data := {}


static func data() -> Dictionary:
	if _data.is_empty():
		var f := FileAccess.open("res://data/skills.json", FileAccess.READ)
		_data = JSON.parse_string(f.get_as_text())
	return _data


static func skill_def(id: String) -> Dictionary:
	return data().skills.get(id, {})


static func move_def(id: String) -> Dictionary:
	return data().moves.get(id, {})


static func zero() -> Dictionary:
	return {"strength": 0.0, "agility": 0.0, "constitution": 0.0, "energy": 0.0, "insight": 0.0}


static func attr_name(k: String) -> String:
	for a in ATTRS:
		if a.key == k:
			return a.name
	return k


# ── 擲骰與新角色 ────────────────────────────────────────

static func roll_attrs() -> Dictionary:
	while true:
		var a := {}
		var total := 0
		for at in ATTRS:
			a[at.key] = randi_range(ROLL.min, ROLL.max)
			total += a[at.key]
		if total >= ROLL.total_min and total <= ROLL.total_max:
			return a
	return {}


static func roll_name() -> Array:
	var given := NAME_CHARS[randi() % NAME_CHARS.length()]
	if randf() >= 0.3:
		var second := NAME_CHARS[randi() % NAME_CHARS.length()]
		if second != given:
			given += second
	return [SURNAMES[randi() % SURNAMES.size()], given]


## 剛學會的武功：只會第一招
static func new_skill(id: String, level: int, pos) -> Dictionary:
	return {"id": id, "level": level, "exp": 0, "pos": pos, "fails": 0, "roll": randf(), "moves": [skill_def(id).moves[0].id], "insight": 0}


static func new_hero(surname := "", given := "無名", base := DEFAULT_BASE) -> Dictionary:
	var fist := new_skill("basic-fist", 1, 0)
	fist.exp = 30
	var breath := new_skill("breathing", 0, 0)
	breath.exp = 40
	var c := {
		"surname": surname, "given": given, "name": surname + given, "fame": 0, "age": 18, "titles": [],
		"base": base.duplicate(), "extra": zero(), "skills": [fist, breath], "points": 0, "bag_extra": 0, "gear": {},
		"hp": 0, "qi": 0, "stamina": 0,
	}
	restore_all(c)
	return c


# ── 武功的基本量 ────────────────────────────────────────

static func slot_of(kind: String) -> String:
	return "inner" if kind == "內功" else ("light" if kind == "輕功" else "outer")


static func cap_of(s: Dictionary) -> int:
	return int(data().tiers[skill_def(s.id).tier].cap)


static func tier_mult(s: Dictionary) -> float:
	return float(data().tiers[skill_def(s.id).tier].mult)


## 升到下一重需要的經驗
static func exp_to_next(level: int) -> int:
	return 60 + level * 30


## 有效等級：正常上限以內照算，突破的部分效果遞減（開根號）
static func eff_level(s: Dictionary) -> float:
	var cap := cap_of(s)
	return float(s.level) if s.level <= cap else cap + 3.0 * sqrt(s.level - cap)


static func is_equipped(s: Dictionary) -> bool:
	return s.pos != null


static func find_skill(c: Dictionary, id: String) -> Dictionary:
	for s in c.skills:
		if s.id == id:
			return s
	return {}


# ── 五維與上限 ──────────────────────────────────────────

## 五維的組成：{base, grow（武功與其他的永久成長）, equip（裝備加成）, total}
static func attr_parts(c: Dictionary) -> Dictionary:
	var grow: Dictionary = c.extra.duplicate()
	var equip := zero()
	for s in c.skills:
		var d := skill_def(s.id)
		var m := eff_level(s) * tier_mult(s)
		for k in d.grow:
			grow[k] += d.grow[k] * m
		for mv in d.moves:
			if mv.id in s.moves:
				for k in mv.get("bonus", {}):
					grow[k] += mv.bonus[k]
		if is_equipped(s):
			for k in d.equip:
				equip[k] += d.equip[k] * m
	var total := {}
	for a in ATTRS:
		total[a.key] = c.base[a.key] + grow[a.key] + equip[a.key]
	return {"base": c.base, "grow": grow, "equip": equip, "total": total}


static func attrs(c: Dictionary) -> Dictionary:
	return attr_parts(c).total


## 裝備中的某類武功的有效等級總和（或最大）
static func equipped_level(c: Dictionary, slot: String, use_max := false) -> float:
	var out := 0.0
	for s in c.skills:
		if is_equipped(s) and slot_of(skill_def(s.id).kind) == slot:
			var v := eff_level(s) * tier_mult(s)
			out = maxf(out, v) if use_max else out + v
	return out


## 氣血、內力、體力的上限
static func derive(c: Dictionary) -> Dictionary:
	var a := attrs(c)
	var inner := equipped_level(c, "inner")
	var vh := 0.0
	var vq := 0.0
	var vs := 0.0
	for s in c.skills:
		var d := skill_def(s.id)
		var m := eff_level(s) * tier_mult(s)
		vh += d.vital.get("hp", 0) * m
		vq += d.vital.get("qi", 0) * m
		vs += d.vital.get("stamina", 0) * m
	return {
		"max_hp": roundi(60 + a.constitution * 8 + a.strength * 2 + inner * 15 + vh),
		"max_qi": roundi(20 + a.energy * 10 + inner * 25 + vq),
		"max_stamina": roundi(50 + a.constitution * 4 + a.agility * 4 + vs),
	}


static func restore_all(c: Dictionary) -> void:
	var d := derive(c)
	c.hp = d.max_hp
	c.qi = d.max_qi
	c.stamina = d.max_stamina


## 數值超過上限時（例如卸下內功）修正到合理範圍
static func clamp_vitals(c: Dictionary) -> void:
	var d := derive(c)
	c.hp = clampi(int(c.hp), 0, d.max_hp)
	c.qi = clampi(int(c.qi), 0, d.max_qi)
	c.stamina = clampi(int(c.stamina), 0, d.max_stamina)


# ── 成長 ────────────────────────────────────────────────

## 累積經驗（只在正常上限以內有效）；升重時回傳提示
static func gain_skill(c: Dictionary, id: String, amount: int, use_insight := true) -> String:
	var s := find_skill(c, id)
	if s.is_empty():
		return ""
	var cap := cap_of(s)
	if s.level >= cap:
		return ""
	var mult: float = 1.0 + attrs(c).insight / 40.0 if use_insight else 1.0
	s.exp += roundi(amount * mult)
	var from: int = s.level
	while s.level < cap and s.exp >= exp_to_next(s.level):
		s.exp -= exp_to_next(s.level)
		s.level += 1
	if s.level >= cap:
		s.exp = 0
	return "你的「%s」精進至第 %d 重！" % [skill_def(id).name, s.level] if s.level > from else ""


## 花武學點數修練（只能練到正常上限）；回傳實際花了幾點
static func train_with_points(c: Dictionary, id: String, points: int) -> int:
	var s := find_skill(c, id)
	if s.is_empty() or s.level >= cap_of(s):
		return 0
	var n := mini(points, int(c.points))
	if n <= 0:
		return 0
	c.points -= n
	gain_skill(c, id, n * POINT_EXP, false)
	return n


static func points_to_next(s: Dictionary) -> int:
	return ceili((exp_to_next(s.level) - s.exp) / float(POINT_EXP))


static func has_manual(id: String) -> bool:
	for it in G.bag:
		if G.bag[it] > 0 and Ui.item_def(it).get("manual", "") == id:
			return true
	return false


## 突破第 k 重（已超出上限 k 重）的成功率與花費
static func breakthrough(s: Dictionary) -> Dictionary:
	var k: int = s.level - cap_of(s)
	return {"chance": minf(1.0, maxf(0.03, 0.6 * pow(0.95, k)) + s.fails * 0.05), "cost": roundi(20 * pow(1.08, k))}


## 嘗試突破等級上限：{ok, success, text}
static func try_breakthrough(c: Dictionary, id: String) -> Dictionary:
	var s := find_skill(c, id)
	if s.is_empty():
		return {"ok": false, "text": "沒有這門武功。"}
	var name: String = skill_def(id).name
	if s.level < cap_of(s):
		return {"ok": false, "text": "「%s」還沒練到正常上限，不必突破。" % name}
	if s.level >= HIDDEN_CAP:
		return {"ok": false, "text": "「%s」已臻化境，再無可進。" % name}
	if not has_manual(id):
		return {"ok": false, "text": "需要「%s」的秘笈才能突破。" % name}
	var b := breakthrough(s)
	if c.points < b.cost:
		return {"ok": false, "text": "武學點數不足（需要 %d 點）。" % b.cost}
	c.points -= b.cost
	# 事先擲好的結果存在存檔裡，讀檔重試也不會變
	var success: bool = s.roll < b.chance
	s.roll = randf()
	if success:
		s.level += 1
		s.fails = 0
		return {"ok": true, "success": true, "text": "突破成功！「%s」臻至第 %d 重！" % [name, s.level]}
	s.fails += 1
	return {"ok": true, "success": false, "text": "突破失敗……你對「%s」又多了幾分體悟（下次成功率提高）。" % name}


## 下一招（照順序悟）；全部悟完回傳空的
static func next_move(s: Dictionary) -> Dictionary:
	for mv in skill_def(s.id).moves:
		if not mv.id in s.moves:
			return mv
	return {}


## 增加領悟度；滿 100（或 flash：頭目戰的靈光一閃）就悟出下一招，武功順便升一重。回傳悟出的招式 id
static func gain_insight(c: Dictionary, id: String, amount: float, flash := false) -> String:
	var s := find_skill(c, id)
	if s.is_empty():
		return ""
	var nx := next_move(s)
	if nx.is_empty() or s.level < nx.level:
		return ""
	s.insight = minf(100.0, s.insight + amount)
	if s.insight < 100 and not flash:
		return ""
	s.moves.append(nx.id)
	s.insight = 0
	if s.level < cap_of(s):
		s.level += 1
		if s.level >= cap_of(s):
			s.exp = 0
	return nx.id


# ── 裝備武功 ────────────────────────────────────────────

## 某類欄位裡各格裝的武功（沒裝的格子是空字典）
static func slot_skills(c: Dictionary, slot: String) -> Array:
	var out := []
	for i in SLOT_LIMIT[slot]:
		var found := {}
		for s in c.skills:
			if s.pos != null and int(s.pos) == i and slot_of(skill_def(s.id).kind) == slot:
				found = s
		out.append(found)
	return out


static func free_pos(c: Dictionary, slot: String):
	var ss := slot_skills(c, slot)
	for i in ss.size():
		if ss[i].is_empty():
			return i
	return null


## 學會武功；對應欄位還有空位就自動裝備。回傳提示（已經會了是空字串）
static func learn(c: Dictionary, id: String, level := 1) -> String:
	if not find_skill(c, id).is_empty():
		return ""
	var slot := slot_of(skill_def(id).kind)
	var pos = free_pos(c, slot)
	c.skills.append(new_skill(id, level, pos))
	return "你學會了「%s」！%s" % [skill_def(id).name, "" if pos != null else "（%s欄位已滿，可在「武功」裡替換）" % SLOT_NAME[slot]]


## 把武功裝到某一格（原本那格的卸下）
static func equip_at(c: Dictionary, id: String, pos: int) -> String:
	var s := find_skill(c, id)
	var slot := slot_of(skill_def(id).kind)
	if pos < 0 or pos >= SLOT_LIMIT[slot]:
		return "%s最多只能裝備 %d 門。" % [SLOT_NAME[slot], SLOT_LIMIT[slot]]
	var old: Dictionary = slot_skills(c, slot)[pos]
	if not old.is_empty() and old.id == id:
		return "「%s」已經裝在這一格了。" % skill_def(id).name
	if not old.is_empty():
		old.pos = null
	s.pos = pos
	clamp_vitals(c)
	return ("以「%s」替換了「%s」" % [skill_def(id).name, skill_def(old.id).name]) if not old.is_empty() else "裝備了「%s」" % skill_def(id).name


static func unequip(c: Dictionary, id: String) -> String:
	find_skill(c, id).pos = null
	clamp_vitals(c)
	return "卸下了「%s」" % skill_def(id).name


# ── 物品 ────────────────────────────────────────────────

## 行囊裡能用的：有回復或加成效果的藥品、菜餚
static func usable(id: String) -> bool:
	var d := Ui.item_def(id)
	return d.get("hp", 0) > 0 or d.get("qi", 0) > 0 or d.get("stamina", 0) > 0 or d.has("treat")


## 用掉一個回復類物品；回傳說明
static func consume(c: Dictionary, id: String) -> String:
	var d := Ui.item_def(id)
	if int(G.bag.get(id, 0)) <= 0 or not usable(id):
		return "這樣東西現在用不上。"
	var mx := derive(c)
	var hp := mini(int(d.get("hp", 0)), mx.max_hp - int(c.hp))
	var qi := mini(int(d.get("qi", 0)), mx.max_qi - int(c.qi))
	var st := mini(int(d.get("stamina", 0)), mx.max_stamina - int(c.stamina))
	if hp <= 0 and qi <= 0 and st <= 0 and not d.has("treat"):
		return "現在用不著。"
	c.hp += maxi(hp, 0)
	c.qi += maxi(qi, 0)
	c.stamina += maxi(st, 0)
	if d.has("treat"):
		var cur: Dictionary = c.get("treat", {})
		if cur.is_empty() or d.treat.mult * d.treat.battles >= cur.mult * cur.battles:
			c.treat = d.treat.duplicate()
	G.bag[id] -= 1
	if G.bag[id] <= 0:
		G.bag.erase(id)
	var gains := []
	if hp > 0: gains.append("氣血 +%d" % hp)
	if qi > 0: gains.append("內力 +%d" % qi)
	if st > 0: gains.append("體力 +%d" % st)
	return "%s%s。%s" % ["吃了" if d.get("category", "") == "菜餚" else "用了", d.name, "　".join(gains)]
