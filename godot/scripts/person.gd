class_name Person
## 人物核心（PLAN.md 4.40）：每個有名有姓的人一個 id，其他系統一律透過這裡讀寫他的欄位。
## - 人物表：data/persons/<地區>.json（固定的設定，key 是 id）；關係表 data/persons/relations.json（[a, b, 種類]）。
## - 人物狀態：G.persons（存檔）——p：id → 跟人物表不一樣的欄位（門派、位階、武功重數、在哪、生死、傷）；rel：之後新增的關係；obits：過世的消息。
## - 主角也是一個人（id "hero"），欄位在 G.hero（gender、born、life_roll、scars、health），門派在 G.sect。
## - 年齡照生年算：born 是出生那年（遊戲開始那年是第 1 年，開局 30 歲就是 -29）；壽命見 lifespan（PLAN.md 4.40 第八節）。
## - 條件運算式（Story.cond）可以讀 env(id) 的欄位：gender、age、sect、rank、post、job、fame、五維、skill_<武功>、tag_<標籤>、trait_<性格>。
##
## 人物表一筆的欄位（都可以省略，省略的照預設）：
##   surname、given、name（大家怎麼叫他，例如鍾嬸、老福；有就蓋過姓加名）、alias（字號外號）、npc_ids（地圖、室內資料裡指到同一個人的別的 id）、
##   gender（男／女）、born、life_roll、origin、look、traits [..]、job、tags [..]、
##   base {五維}、skills {武功: 重數}、gear {部位: 物品}、faction {sect, rank, post}、master、home、life、likes、hobby、talk

const LIFESPAN := {"男": 62, "女": 66}
## 職業對壽命的增減（年）
const JOB_LIFE := {"僧": 4, "道": 4, "書生": 1, "農": 0, "漁": -2, "鐵匠": -1, "礦工": -5, "鏢師": -2, "捕快": -2, "船家": -2, "山賊": -4, "鹽丁": -3}
## 性格與習慣對壽命的增減（年）
const TRAIT_LIFE := {"好酒": -3, "暴躁": -2, "清心寡欲": 2}
## 裝備中的內功每一重（乘品階倍數）延壽幾年、最多幾年
const INNER_LIFE := 0.4
const INNER_LIFE_MAX := 15.0
## 根骨對壽命最多增減幾年
const CON_LIFE_MAX := 8.0
## 離壽命幾年內算「體衰」
const FRAIL_YEARS := 2

static var _defs := {}
static var _rels := []
## 地圖、室內資料裡別的 id 指到同一個人（人物表的 npc_ids）：npc id → 人物 id
static var _alias := {}
## 勢力（data/persons/factions.json）：id → {name, kind, ranks}
static var _factions := {}


static func faction_def(sect_id: String) -> Dictionary:
	defs()
	return _factions.get(sect_id, {})


## 某人的勢力與身分，例如「漕幫舵主」；沒有是空字串
static func faction_text(id: String) -> String:
	var fa: Dictionary = of(id).get("faction", {})
	var fd := faction_def(fa.get("sect", ""))
	if fd.is_empty():
		return ""
	var ranks: Array = fd.get("ranks", [])
	var r := int(fa.get("rank", 0))
	return fd.name + (ranks[r] if r >= 0 and r < ranks.size() else "")


# ── 人物表 ──────────────────────────────────────────────

static func defs() -> Dictionary:
	if _defs.is_empty():
		var dir := DirAccess.open("res://data/persons")
		if dir == null:
			return _defs
		for f in dir.get_files():
			if not f.ends_with(".json"):
				continue
			var d = JSON.parse_string(FileAccess.get_file_as_string("res://data/persons/" + f))
			if f == "relations.json":
				_rels = d.get("relations", [])
				continue
			if f == "factions.json":
				_factions = d
				continue
			for id in d:
				if id.begins_with("_"):
					continue
				var p: Dictionary = d[id]
				p["id"] = id
				p["_file"] = f
				_defs[id] = p
				for a in p.get("npc_ids", []):
					_alias[a] = id
	return _defs


## 地圖上的人（npc 的 id）是人物表裡的誰；不在人物表是空字串
static func resolve(npc_id: String) -> String:
	if defs().has(npc_id):
		return npc_id
	return _alias.get(npc_id, "")


## 地圖上的人顯示的名字：在人物表就用人物表的，不在就用資料裡寫的
static func name_of(npc_id: String, fallback := "") -> String:
	var pid := resolve(npc_id)
	return full_name(pid) if pid != "" else fallback


static func ids() -> Array:
	return defs().keys()


static func exists(id: String) -> bool:
	return id == "hero" or defs().has(id)


## 人物狀態（存檔）：沒有就建一份空的
static func _st() -> Dictionary:
	if not G.persons.has("p"):
		G.persons["p"] = {}
	return G.persons.p


static func state(id: String) -> Dictionary:
	return _st().get(id, {})


# ── 讀寫 ────────────────────────────────────────────────

## 這個人現在的樣子：人物表疊上狀態（武功展開成跟主角一樣的格式，給 Hero、Fight 的公式用）
static func of(id: String) -> Dictionary:
	if id == "hero":
		return _hero_view()
	var d: Dictionary = defs().get(id, {})
	if d.is_empty():
		return {}
	var p: Dictionary = d.duplicate(true)
	var s := state(id)
	for k in s:
		if k == "faction" and s.faction is Dictionary:
			var fa: Dictionary = p.get("faction", {}).duplicate()
			fa.merge(s.faction, true)
			p.faction = fa
		else:
			p[k] = s[k]
	p["name"] = full_name(id)
	p["gender"] = p.get("gender", "男")
	p["born"] = int(p.get("born", 1 - 20))
	p["base"] = _base(p.get("base", {}))
	p["extra"] = Hero.zero()
	p["skills"] = expand_skills(p.get("skills", {}))
	p["gear"] = p.get("gear", {})
	p["faction"] = p.get("faction", {})
	p["alive"] = p.get("alive", true)
	p["health"] = int(p.get("health", 100))
	p["scars"] = p.get("scars", [])
	p["fame"] = int(p.get("fame", 0))
	return p


static func _base(b: Dictionary) -> Dictionary:
	var out := {}
	for a in Hero.ATTRS:
		out[a.key] = float(b.get(a.key, Hero.DEFAULT_BASE[a.key]))
	return out


## {武功: 重數} → 主角格式的武功清單：照順序裝進欄位（滿了就不裝），悟出重數到了的招式
static func expand_skills(sk) -> Array:
	if sk is Array:
		return sk
	var out := []
	var used := {"outer": 0, "inner": 0, "light": 0}
	for id in sk:
		var def := Hero.skill_def(id)
		if def.is_empty():
			continue
		var lv := int(sk[id])
		var slot := Hero.slot_of(def.kind)
		var pos = used[slot] if used[slot] < Hero.SLOT_LIMIT[slot] else null
		if pos != null:
			used[slot] += 1
		var moves := []
		for mv in def.moves:
			if int(mv.get("level", 0)) <= lv:
				moves.append(mv.id)
		if moves.is_empty():
			moves.append(def.moves[0].id)
		out.append({"id": id, "level": lv, "exp": 0, "pos": pos, "fails": 0, "roll": 0.5, "moves": moves, "insight": 0})
	return out


static func _hero_view() -> Dictionary:
	var h := G.hero
	var p := h.duplicate()
	p["id"] = "hero"
	p["gender"] = h.get("gender", "男")
	p["born"] = int(h.get("born", 1 - int(h.get("age", 18))))
	p["life_roll"] = int(h.get("life_roll", 0))
	p["faction"] = {"sect": G.sect.get("id", ""), "rank": int(G.sect.get("rank", 0)), "post": G.sect.get("post", "")} if not G.sect.is_empty() else {}
	p["alive"] = true
	p["health"] = int(h.get("health", 100))
	p["scars"] = h.get("scars", [])
	return p


## 寫進狀態（主角寫進 G.hero）
static func put(id: String, key: String, value) -> void:
	if id == "hero":
		G.hero[key] = value
		return
	var st := _st()
	if not st.has(id):
		st[id] = {}
	st[id][key] = value


static func field(id: String, key: String, fallback = null):
	return of(id).get(key, fallback)


static func full_name(id: String) -> String:
	if id == "hero":
		return G.hero.get("name", "")
	var d: Dictionary = defs().get(id, {})
	if d.is_empty():
		return id
	# 稱呼（鍾嬸、老福這種）優先；否則姓加名
	return d.get("name", "%s%s" % [d.get("surname", ""), d.get("given", "")])


static func gender(id: String) -> String:
	return of(id).get("gender", "男")


static func year() -> int:
	return int(G.date_of().year)


## 年齡：開局那年是 1 - born 歲，之後每過一個生日長一歲。生日（一年裡的第幾天，0–359）寫在 bday，
## 沒寫就照 id 散開（大家不會同一天長一歲）；主角的生日在正月初一（跟著過年長一歲）
static func age(id: String) -> int:
	var p := of(id)
	return 1 - int(p.get("born", -19)) + (G.day - 1 + birthday(id)) / 360


static func birthday(id: String) -> int:
	if id == "hero":
		return 30
	var d: Dictionary = defs().get(id, {})
	return int(d.get("bday", hash(id) % 360))


static func alive(id: String) -> bool:
	return id == "hero" or bool(of(id).get("alive", true))


static func sect(id: String) -> String:
	return of(id).get("faction", {}).get("sect", "")


static func rank(id: String) -> int:
	return int(of(id).get("faction", {}).get("rank", 0))


## 拜入某個門派（或幫會）、改位階職位：NPC 寫狀態；主角走 Sect（G.sect）
static func set_faction(id: String, sect_id: String, rank_v := 0, post := "") -> void:
	if id == "hero":
		return
	put(id, "faction", {"sect": sect_id, "rank": rank_v, "post": post})


# ── 能力 ────────────────────────────────────────────────

static func attrs(id: String) -> Dictionary:
	return Hero.attrs(of(id))


## 戰鬥單位：照主角的公式由五維、武功、裝備算出來（切磋、比武、頭目戰用本人的數值）
static func unit(id: String, side := "enemy") -> Dictionary:
	var p := of(id)
	Hero.restore_all(p)
	var u := Fight.hero_unit(p)
	u.id = id
	u.name = p.name
	u.side = side
	u.sprite = p.get("look", "villager")
	u.ai = p.get("ai", "steady")
	return u


## NPC 練功：經驗加在最落後的那門武功（重數÷上限最低的），滿了就升一重（照主角的 exp_to_next），到了上限就換別門。
## 回傳升了重的武功 id（沒升是空字串）。武功與經驗寫進狀態（skills、skill_exp）
static func train(id: String, amount: float) -> String:
	if id == "hero" or amount <= 0.0:
		return ""
	var p := of(id)
	var lv: Dictionary = {}
	for s in p.skills:
		lv[s.id] = int(s.level)
	var best := ""
	var best_r := 99.0
	for sid in lv:
		var cap := int(Hero.data().tiers[Hero.skill_def(sid).tier].cap)
		var r := float(lv[sid]) / cap
		if lv[sid] < cap and r < best_r:
			best_r = r
			best = sid
	if best == "":
		return ""
	var ex: Dictionary = state(id).get("skill_exp", {}).duplicate()
	ex[best] = float(ex.get(best, 0.0)) + amount
	var up := ""
	if ex[best] >= Hero.exp_to_next(lv[best]):
		ex[best] -= Hero.exp_to_next(lv[best])
		lv[best] += 1
		up = best
	put(id, "skills", lv)
	put(id, "skill_exp", ex)
	return up


## 還有沒練到上限的武功
static func can_train(id: String) -> bool:
	for s in of(id).skills:
		if int(s.level) < int(Hero.data().tiers[Hero.skill_def(s.id).tier].cap):
			return true
	return false


## NPC 學會一門新武功（已經會了就不動）
static func learn(id: String, skill_id: String, level := 1) -> void:
	if id == "hero":
		return
	var lv: Dictionary = {}
	for s in of(id).skills:
		lv[s.id] = int(s.level)
	if lv.has(skill_id):
		return
	lv[skill_id] = level
	put(id, "skills", lv)


## 天分（人物表的 talent，預設 1）：練功的快慢
static func talent(id: String) -> float:
	return float(of(id).get("talent", 1.0))


## 實力（一個數字，給選舉、名次、事件比大小）：攻防血速的綜合
static func power(id: String) -> float:
	var u := unit(id)
	return float(u.atk) * 1.5 + float(u.ipow) + float(u.def) * 2.0 + float(u.max_hp) / 8.0 + float(u.spd)


# ── 條件 ────────────────────────────────────────────────

static var _hero_env := {}
static var _hero_env_frame := -1


## 條件運算式讀得到的欄位（主角的每一格畫面只算一次，條件很多時才不會慢）
static func env(id: String) -> Dictionary:
	if id == "hero":
		var fr := Engine.get_process_frames()
		if fr != _hero_env_frame or _hero_env.is_empty():
			_hero_env = _env_of(id)
			_hero_env_frame = fr
		return _hero_env.duplicate()
	return _env_of(id)


static func _env_of(id: String) -> Dictionary:
	var p := of(id)
	if p.is_empty():
		return {}
	var fa: Dictionary = p.get("faction", {})
	var e := {
		"gender": p.gender, "age": age(id), "sect": fa.get("sect", ""), "rank": int(fa.get("rank", 0)), "post": fa.get("post", ""),
		"job": p.get("job", ""), "fame": int(p.get("fame", 0)), "alive": int(p.alive), "health": int(p.health),
	}
	var a := Hero.attrs(p)
	for k in a:
		e[k] = roundi(a[k])
	for s in p.skills:
		e["skill_" + s.id.replace("-", "_")] = int(s.level)
	for t in p.get("tags", []):
		e["tag_" + t] = 1
	for t in p.get("traits", []):
		e["trait_" + t] = 1
	return e


## 合不合條件（條件是空的一律合）
static func check(id: String, expr: String) -> bool:
	return Story.cond(expr, env(id))


## 能不能練某門武功（skills.json 的 req／req_note）：回傳不能的原因，能練是空字串
static func learn_block(id: String, skill_id: String) -> String:
	var d := Hero.skill_def(skill_id)
	var req: String = d.get("req", "")
	if req == "" or check(id, req):
		return ""
	return d.get("req_note", "這門武功你練不了。")


## 能不能拜入某個門派（Sect.DEFS 的 join_req／join_note）：回傳不能的原因，能拜是空字串
static func join_block(id: String, sect_id: String) -> String:
	var d := Sect.def(sect_id)
	var req: String = d.get("join_req", "")
	if req == "" or check(id, req):
		return ""
	return d.get("join_note", "這個門派不收你。")


## 像資料庫的查詢：條件成立的人（預設只看活著的、不含主角）
static func find(expr: String, include_dead := false) -> Array:
	var out := []
	for id in ids():
		if not include_dead and not alive(id):
			continue
		if check(id, expr):
			out.append(id)
	return out


# ── 關係 ────────────────────────────────────────────────

## 所有關係（人物表的加上之後新增的）：[a, b, 種類]
static func relations() -> Array:
	defs()
	return _rels + G.persons.get("rel", [])


## 某人某種關係的對象（例如 rel("lu", "師徒") 是他的師父或徒弟）；方向有意義的種類，a 是長輩／師父。
## 師徒也讀人物的 master 欄位
static func rel(id: String, kind: String) -> Array:
	var out := []
	if kind == "師徒":
		var m: String = of(id).get("master", "")
		if m != "":
			out.append(m)
		for o in ids():
			if of(o).get("master", "") == id:
				out.append(o)
	for r in relations():
		if r[2] != kind:
			continue
		if r[0] == id:
			out.append(r[1])
		elif r[1] == id:
			out.append(r[0])
	return out


static func add_rel(a: String, b: String, kind: String) -> void:
	if not G.persons.has("rel"):
		G.persons["rel"] = []
	G.persons.rel.append([a, b, kind])


# ── 壽命與過世 ──────────────────────────────────────────

## 壽命：{total, parts: [[原因, 年]]}（每次照現狀算）
static func lifespan(id: String) -> Dictionary:
	var p := of(id)
	var parts := []
	parts.append(["%s子的平均壽命" % p.gender, float(LIFESPAN.get(p.gender, 62))])
	if int(p.get("life_roll", 0)) != 0:
		parts.append(["天生", float(p.life_roll)])
	var a := Hero.attrs(p)
	var con := clampf((float(a.constitution) - 12.0) * 0.5, -CON_LIFE_MAX, CON_LIFE_MAX)
	if absf(con) >= 0.5:
		parts.append(["根骨", snappedf(con, 0.5)])
	var inner := minf(INNER_LIFE_MAX, Hero.equipped_level(p, "inner") * INNER_LIFE)
	if inner >= 0.5:
		parts.append(["內功", snappedf(inner, 0.5)])
	var job: String = p.get("job", "")
	if JOB_LIFE.get(job, 0) != 0:
		parts.append([job, float(JOB_LIFE[job])])
	for t in p.get("traits", []):
		if TRAIT_LIFE.has(t):
			parts.append([t, float(TRAIT_LIFE[t])])
	for sc in p.scars:
		parts.append([sc.get("note", sc.get("kind", "舊傷")), float(sc.get("years", 0))])
	if int(p.health) < 30:
		parts.append(["病重", -5.0])
	var total := 0.0
	for x in parts:
		total += x[1]
	return {"total": total, "parts": parts}


## 快到壽命了（差 FRAIL_YEARS 年以內）
static func frail(id: String) -> bool:
	return alive(id) and lifespan(id).total - age(id) <= FRAIL_YEARS


## 留下永久的傷（減壽）：kind 種類（毒傷、內傷、走火入魔…）、years 減幾年（負數）
static func add_scar(id: String, kind: String, years: float, note := "") -> void:
	var sc: Array = of(id).scars.duplicate()
	sc.append({"kind": kind, "years": years, "day": G.day, "note": note if note != "" else kind})
	put(id, "scars", sc)


## 過世（劇情的強制過世也走這裡）：記在狀態、留一則消息
static func die(id: String, cause: String) -> void:
	if id == "hero" or not alive(id):
		return
	put(id, "alive", false)
	put(id, "died", G.day)
	put(id, "cause", cause)
	if not G.persons.has("obits"):
		G.persons["obits"] = []
	G.persons.obits.append({"id": id, "day": G.day, "cause": cause})


## 壽命到了怎麼走：病重是病故、有舊傷是舊傷復發、年過七十是壽終正寢，其他是意外（看職業）
static func natural_cause(id: String) -> String:
	var p := of(id)
	if int(p.health) < 40:
		return "病故"
	if not p.scars.is_empty():
		return "舊傷復發"
	if age(id) >= 70:
		return "壽終正寢"
	match p.get("job", ""):
		"漁", "船家":
			return "出海遇上風浪"
		"鏢師":
			return "走鏢遇伏"
		"礦工":
			return "礦坑塌了"
		"山賊":
			return "被官兵剿殺"
		"獵戶", "藥農":
			return "山裡失足"
	return "染病過世" if age(id) >= 55 else "遭了意外"


## 每天半夜：年齡到了壽命的人過世（G.NEW_DAY_SCRIPTS）
static func new_day() -> void:
	for id in ids():
		if alive(id) and age(id) >= lifespan(id).total:
			die(id, natural_cause(id))


# ── 檢查（開發用：run:dev_person/check） ────────────────

static func check_all() -> void:
	var errs := []
	var names := {}
	for id in ids():
		var d: Dictionary = defs()[id]
		var nm := full_name(id)
		if nm == "" or nm == id:
			errs.append("%s：沒有姓名" % id)
		if names.has(nm):
			errs.append("%s：跟 %s 同名（%s）" % [id, names[nm], nm])
		names[nm] = id
		if not d.get("gender", "男") in LIFESPAN:
			errs.append("%s：性別要寫男或女" % id)
		for sk in d.get("skills", {}):
			if Hero.skill_def(sk).is_empty():
				errs.append("%s：沒有這門武功 %s" % [id, sk])
		var m: String = d.get("master", "")
		if m != "" and not exists(m):
			errs.append("%s：師父 %s 不存在" % [id, m])
	for r in relations():
		for who in [r[0], r[1]]:
			if not exists(who):
				errs.append("關係 %s：%s 不存在" % [r, who])
	var warns := []
	for id in ids():
		var fs: String = defs()[id].get("faction", {}).get("sect", "")
		if fs != "" and faction_def(fs).is_empty():
			errs.append("%s：勢力 %s 不在 factions.json" % [id, fs])
		# 開局就快到壽命的人（一開始沒幾年就過世）
		var left: float = lifespan(id).total - age(id)
		if left < 3:
			warns.append("%s（%s）%d 歲，壽數約 %.1f" % [full_name(id), id, age(id), lifespan(id).total])
	# 地圖、室內、自己過日子那群人寫的名字跟人物表不一樣的（名字以人物表為準，資料裡的只是備註）
	var dir := DirAccess.open("res://data")
	for f in dir.get_files():
		if not f.ends_with(".json"):
			continue
		var d = JSON.parse_string(FileAccess.get_file_as_string("res://data/" + f))
		if not d is Dictionary:
			continue
		for key in ["npcs", "people"]:
			for n in d.get(key, []):
				var pid := resolve(n.get("id", ""))
				if pid != "" and n.get("name", "") != full_name(pid):
					warns.append("%s 的 %s 寫「%s」，人物表是「%s」" % [f, n.id, n.get("name", ""), full_name(pid)])
	for g in ["qingzhu", "biyi", "linjiang", "mingquan", "dabutou"]:
		for n in Life.group(g).npcs:
			var pid := resolve(n.id)
			if pid != "" and n.name != full_name(pid):
				warns.append("自己過日子的 %s：%s 寫「%s」，人物表是「%s」" % [g, n.id, n.name, full_name(pid)])
	# 交談的人物檔案（people.json；talk 沒寫就是同一個 id，寫空字串是沒有檔案）
	for id in ids():
		var tid: String = defs()[id].get("talk", id)
		if tid != "" and Social.people().has(tid) and Social.def(tid).get("name", "") != full_name(id):
			warns.append("people.json 的 %s 寫「%s」，人物表 %s 是「%s」" % [tid, Social.def(tid).get("name", ""), id, full_name(id)])
	for w in warns:
		print("PERSON 注意 ", w)
	print("PERSON 人物 %d 人、關係 %d 條；%s" % [ids().size(), relations().size(), "沒有問題" if errs.is_empty() else "問題 %d 個" % errs.size()])
	for e in errs:
		print("PERSON ", e)
