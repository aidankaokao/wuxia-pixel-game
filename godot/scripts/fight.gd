class_name Fight
extends RefCounted
## 戰鬥規則（照網頁版 battle/engine.ts、moves.ts 的 heroUnit、enemies.ts、rewards.ts、auto.ts）：
## 給定「誰、做了什麼」，算出結果並改動雙方狀態；不管位置、出手順序、動畫（六角格戰場在 battle.gd）。
## 單位（unit）是字典：{id, name, side "hero"/"enemy", sprite, max_hp, hp, max_qi, qi, atk, ipow, def, spd, eva, moves,
##   guard 防禦中, charging 蓄勢中, ai, base_skill 主角「出手」算哪門武功, move_mult 兵器合手的威力倍數, effects [{kind, value, turns}]}
## 指令：{type: "move", move, target, targets（打全部敵人的招式：在範圍內的敵人 id）} / {type: "item", item} / {type: "defend"} / {type: "flee"} / {type: "charge"}
## 事件：{type: "message", text} / {type: "strike", actor, move, hits: [{target, damage, miss, crit, killed}]} /
##   {type: "restore", actor, hp, qi} / {type: "effects", actor, gained} / {type: "guard", actor} / {type: "charge", actor} / {type: "flee", actor, success}

const EFFECT_NAME := {"block": "格擋", "speed": "迅捷", "power": "勁增", "evade": "身輕", "counter": "反擊", "slow": "遲緩", "weaken": "力竭", "armorBreak": "破綻", "stun": "震懾"}
const DEBUFFS := ["slow", "weaken", "armorBreak", "stun"]
## 外功要拿什麼兵器：劍法拿劍、刀法拿刀、拳掌空手；拿錯（或沒拿）九成威力，空手打拳多一成
const WEAPON_FOR := {"劍法": "劍", "刀法": "刀", "拳掌": "hand"}
const WEAPON_MISFIT := 0.9
const BARE_HAND_BONUS := 1.1
## 頭目戰靈光一閃（直接悟出下一招）的機率
const BOSS_FLASH := 0.2
const SUFFIX := ["甲", "乙", "丙", "丁"]

var units: Array = []
## 帶進戰鬥的物品（id → 數量），打完寫回行囊
var items: Dictionary = {}
var can_flee := true
## 不許用藥（例如門派考核）
var no_items := false
## 主角這場的表現，戰後決定武功的成長
var stats := {"outer_hits": 0, "dodges": 0, "hits_taken": 0, "qi_used": 0, "skill_uses": {}}

static var _enemy_data := {}


static func enemy_data() -> Dictionary:
	if _enemy_data.is_empty():
		var f := FileAccess.open("res://data/enemies.json", FileAccess.READ)
		_enemy_data = JSON.parse_string(f.get_as_text())
	return _enemy_data


static func encounter(id: String) -> Dictionary:
	return enemy_data().encounters.get(id, {})


static func mv(id: String) -> Dictionary:
	return Hero.move_def(id)


func unit(id: String) -> Dictionary:
	for u in units:
		if u.id == id:
			return u
	return {}


func alive(side := "") -> Array:
	return units.filter(func(u): return u.hp > 0 and (side == "" or u.side == side))


# ── 單位 ────────────────────────────────────────────────

## 用這一類武功的招式時，手上的兵器合不合：威力倍數
static func weapon_fit(kind: String, held: String) -> float:
	var want: String = WEAPON_FOR.get(kind, "")
	if want == "":
		return 1.0
	if want == "hand":
		return WEAPON_MISFIT if held != "" else BARE_HAND_BONUS
	return 1.0 if held == want else WEAPON_MISFIT


## 身上服飾與兵器加總的攻擊、防禦、閃避，以及手上拿的兵器種類
static func gear_stats(c: Dictionary) -> Dictionary:
	var out := {"atk": 0.0, "def": 0.0, "eva": 0.0, "weapon": ""}
	for slot in c.get("gear", {}):
		var g: Dictionary = Ui.item_def(c.gear[slot]).get("gear", {})
		out.atk += g.get("atk", 0)
		out.def += g.get("def", 0)
		out.eva += g.get("eva", 0)
		if slot == "weapon":
			out.weapon = g.get("weapon", "")
	return out


## 主角的戰鬥數值：裝備中、已入門的武功，悟出了哪些招式就能用哪些
static func hero_unit(c: Dictionary) -> Dictionary:
	var a := Hero.attrs(c)
	var d := Hero.derive(c)
	var gs := gear_stats(c)
	var moves := ["attack"]
	var best_outer := {}
	var mult := {}
	for s in c.skills:
		if not Hero.is_equipped(s):
			continue
		var kind: String = Hero.skill_def(s.id).kind
		if s.level > 0:
			moves.append_array(s.moves)
		for m in s.moves:
			mult[m] = weapon_fit(kind, gs.weapon)
		if Hero.slot_of(kind) == "outer" and (best_outer.is_empty() or Hero.eff_level(s) > Hero.eff_level(best_outer)):
			best_outer = s
	var base_skill: String = best_outer.get("id", "")
	mult["attack"] = weapon_fit(Hero.skill_def(base_skill).kind if base_skill != "" else "拳掌", gs.weapon)
	return {
		"id": "hero", "name": c.name, "side": "hero", "sprite": "hero",
		"max_hp": d.max_hp, "hp": int(c.hp), "max_qi": d.max_qi, "qi": int(c.qi),
		"atk": roundi(10 + a.strength + Hero.equipped_level(c, "outer", true) * 4 + gs.atk),
		"ipow": roundi(6 + a.energy * 1.2 + Hero.equipped_level(c, "inner") * 4),
		"def": roundi(2 + a.constitution * 0.5 + gs.def),
		"spd": roundi(8 + a.agility),
		"eva": minf(0.4, minf(0.35, 0.03 + a.agility * 0.006 + Hero.equipped_level(c, "light") * 0.04) + gs.eva),
		"moves": moves, "guard": false, "charging": false, "base_skill": base_skill, "move_mult": mult, "effects": [],
	}


## 遭遇戰的敵人（同一種有好幾個就加甲乙丙丁）
## 下一場敵人的強弱倍數（同門對練照他自己練出來的實力；氣血、攻擊、防禦一起乘），開戰後由 HexBattle 歸回 1
static var power_mult := 1.0


static func enemy_units(enc: Dictionary) -> Array:
	var counts := {}
	for k in enc.enemies:
		counts[k] = counts.get(k, 0) + 1
	var seen := {}
	var out := []
	for i in enc.enemies.size():
		var k: String = enc.enemies[i]
		var d: Dictionary = enemy_data().enemies[k]
		seen[k] = seen.get(k, 0) + 1
		out.append({
			"id": "e%d" % i, "name": d.name + (SUFFIX[seen[k] - 1] if counts[k] > 1 else ""), "side": "enemy", "sprite": d.sprite,
			"max_hp": roundi(int(d.hp) * power_mult), "hp": roundi(int(d.hp) * power_mult), "max_qi": int(d.get("qi", 0)), "qi": int(d.get("qi", 0)),
			"atk": roundi(float(d.atk) * power_mult), "ipow": 0, "def": roundi(float(d.def) * power_mult), "spd": d.spd, "eva": d.eva, "moves": d.moves,
			"guard": false, "charging": false, "effects": [], "ai": d.ai, "kind": k,
		})
	return out


# ── 狀態 ────────────────────────────────────────────────

func _eff(u: Dictionary, kind: String) -> float:
	var n := 0.0
	for e in u.effects:
		if e.kind == kind:
			n += e.value
	return n


## 套用狀態後的數值
func stat(u: Dictionary, key: String) -> float:
	match key:
		"atk":
			return u.atk * (1 + _eff(u, "power") - _eff(u, "weaken"))
		"ipow":
			return u.ipow * (1 + _eff(u, "power") - _eff(u, "weaken"))
		"def":
			return u.def * maxf(0, 1 - _eff(u, "armorBreak"))
		"spd":
			return u.spd * maxf(0.3, 1 + _eff(u, "speed") - _eff(u, "slow"))
		"eva":
			return minf(0.6, u.eva + _eff(u, "evade"))
	return 0.0


## 給狀態；同種狀態不疊加，取比較強、比較久的
func add_effect(u: Dictionary, eff: Dictionary) -> void:
	for e in u.effects:
		if e.kind == eff.kind:
			e.value = maxf(e.value, eff.value)
			e.turns = maxi(e.turns, eff.turns)
			return
	u.effects.append({"kind": eff.kind, "value": eff.value, "turns": int(eff.turns)})


## 輪到某人出手時先呼叫：狀態的持續次數減一；被震懾的話這次不能出手
func start_turn(u: Dictionary) -> Dictionary:
	var stunned: bool = u.effects.any(func(e): return e.kind == "stun")
	var before: int = u.effects.size()
	for e in u.effects:
		e.turns -= 1
	u.effects = u.effects.filter(func(e): return e.turns > 0)
	var events := []
	if stunned:
		events.append({"type": "message", "text": "%s被震懾住了，一時動彈不得！" % u.name})
	if u.effects.size() != before:
		events.append({"type": "effects", "actor": u.id})
	return {"skip": stunned, "events": events}


func outcome() -> String:
	if alive("hero").is_empty():
		return "lose"
	if alive("enemy").is_empty():
		return "win"
	return ""


# ── 出手 ────────────────────────────────────────────────

func act(actor: Dictionary, cmd: Dictionary) -> Array:
	actor.guard = false
	match cmd.type:
		"defend":
			actor.guard = true
			return [{"type": "guard", "actor": actor.id}, {"type": "message", "text": "%s凝神守備。" % actor.name}]
		"flee":
			var enemy_spd := 0.0
			for u in alive("enemy"):
				enemy_spd = maxf(enemy_spd, stat(u, "spd"))
			var success := can_flee and randf() < 0.45 + (stat(actor, "spd") - enemy_spd) * 0.04
			return [{"type": "flee", "actor": actor.id, "success": success}, {"type": "message", "text": "你施展身法，脫離了戰鬥。" if success else "被攔了下來，沒能脫身！"}]
		"charge":
			actor.charging = true
			return [{"type": "charge", "actor": actor.id}, {"type": "message", "text": "%s高舉大刀，殺氣騰騰——蓄勢待發！" % actor.name}]
		"item":
			return _use_item(actor, cmd.item)
		"move":
			return _use_move(actor, cmd.move, cmd.get("target", ""), cmd.get("targets"))
	return []


## 戰鬥中能用的：能回氣血或內力的藥品、菜餚
static func usable_in_battle(id: String) -> bool:
	var d := Ui.item_def(id)
	return d.get("hp", 0) > 0 or d.get("qi", 0) > 0


func _use_item(actor: Dictionary, id: String) -> Array:
	var d := Ui.item_def(id)
	if no_items:
		return [{"type": "message", "text": "這一場不許用藥！"}]
	if int(items.get(id, 0)) <= 0:
		return [{"type": "message", "text": "已經沒有了。"}]
	if not usable_in_battle(id):
		return [{"type": "message", "text": "戰鬥中用不了這個。"}]
	items[id] -= 1
	var hp := mini(int(d.get("hp", 0)), actor.max_hp - actor.hp)
	var qi := mini(int(d.get("qi", 0)), actor.max_qi - actor.qi)
	actor.hp += hp
	actor.qi += qi
	return [{"type": "message", "text": "%s用了%s。" % [actor.name, d.name]}, {"type": "restore", "actor": actor.id, "hp": hp, "qi": qi}]


## 這一招打得到誰：targets 是規則認定的目標（位置的限制由戰場另外篩）
func _use_move(actor: Dictionary, move_id: String, target_id: String, targets_override = null) -> Array:
	var m := mv(move_id)
	if actor.qi < m.qi:
		return [{"type": "message", "text": "%s內力不足！" % actor.name}]
	actor.qi -= int(m.qi)
	if actor.side == "hero":
		stats.qi_used += int(m.qi)
		var skill: String = m.get("skillId", actor.get("base_skill", "") if move_id == "attack" else "")
		if skill != "":
			stats.skill_uses[skill] = stats.skill_uses.get(skill, 0) + 1
	if m.kind == "restore":
		var qi := mini(roundi(12 + stat(actor, "ipow") * 1.2), actor.max_qi - actor.qi)
		var hp := mini(roundi(actor.max_hp * 0.08), actor.max_hp - actor.hp)
		actor.qi += qi
		actor.hp += hp
		return [{"type": "message", "text": "%s運起「%s」，氣息漸穩。" % [actor.name, m.name]}, {"type": "restore", "actor": actor.id, "hp": hp, "qi": qi}]
	if m.kind == "buff":
		return [{"type": "message", "text": "%s施展「%s」！" % [actor.name, m.name]}] + _self_effects(actor, m)
	var foes := alive("enemy" if actor.side == "hero" else "hero")
	var targets: Array
	if m.target == "allEnemies":
		targets = foes if targets_override == null else foes.filter(func(u): return u.id in targets_override)
	else:
		var t := unit(target_id)
		targets = [t if not t.is_empty() and t.hp > 0 else foes[0]]
	# 連擊：每一下分別算命中與傷害；目標倒下就不再打
	var hits := []
	var power: float = m.power * actor.get("move_mult", {}).get(move_id, 1.0)
	for n in int(m.get("hits", 1)):
		for t in targets:
			if t.hp > 0:
				hits.append(_hit(actor, t, power, m.kind == "inner"))
	var events := [{"type": "message", "text": "%s使出「%s」！" % [actor.name, m.name]}, {"type": "strike", "actor": actor.id, "move": move_id, "hits": hits}]
	if hits.any(func(h): return h.crit and not h.miss):
		events.append({"type": "message", "text": "會心一擊！"})
	for t in targets:
		var mine := hits.filter(func(h): return h.target == t.id)
		if mine.all(func(h): return h.miss):
			events.append({"type": "message", "text": "%s閃身避開了。" % t.name})
			events.append_array(_counter(t, actor))
			continue
		if t.hp == 0:
			events.append({"type": "message", "text": ("%s倒地不起！" if t.side == "enemy" else "%s支撐不住，倒了下去……") % t.name})
			continue
		var gained := []
		for f in m.get("foe", []):
			if f.has("chance") and randf() >= f.chance:
				continue
			add_effect(t, f)
			gained.append(f.kind)
		if not gained.is_empty():
			events.append({"type": "effects", "actor": t.id, "gained": gained})
			events.append({"type": "message", "text": "%s陷入%s！" % [t.name, "".join(gained.map(func(k): return "「%s」" % EFFECT_NAME[k]))]})
	if actor.hp > 0:
		events.append_array(_self_effects(actor, m))
	return events


## 出招後給自己的狀態（+1：這次出手結束後，到下一次出手前也都算數）
func _self_effects(actor: Dictionary, m: Dictionary) -> Array:
	var sf: Array = m.get("self", [])
	if sf.is_empty():
		return []
	for e in sf:
		add_effect(actor, {"kind": e.kind, "value": e.value, "turns": int(e.turns) + 1})
	return [{"type": "effects", "actor": actor.id, "gained": sf.map(func(e): return e.kind)},
		{"type": "message", "text": "%s得到%s！" % [actor.name, "".join(sf.map(func(e): return "「%s」" % EFFECT_NAME[e.kind]))]}]


## 閃過攻擊、身上有「反擊」時還手一擊
func _counter(u: Dictionary, attacker: Dictionary) -> Array:
	var power := _eff(u, "counter")
	if power <= 0 or u.hp <= 0 or attacker.hp <= 0:
		return []
	var h := _hit(u, attacker, power, false)
	var events := [{"type": "message", "text": "%s順勢回身還擊！" % u.name}, {"type": "strike", "actor": u.id, "move": "attack", "hits": [h], "counter": true}]
	if h.killed:
		events.append({"type": "message", "text": ("%s倒地不起！" if attacker.side == "enemy" else "%s支撐不住，倒了下去……") % attacker.name})
	return events


func _hit(actor: Dictionary, target: Dictionary, power: float, inner: bool) -> Dictionary:
	if randf() > 0.95 - stat(target, "eva"):
		if target.side == "hero":
			stats.dodges += 1
		return {"target": target.id, "damage": 0, "miss": true, "crit": false, "killed": false}
	var crit := randf() < 0.08
	var dmg := stat(actor, "ipow" if inner else "atk") * power * (0.9 + randf() * 0.2) - stat(target, "def") * 0.5
	if crit:
		dmg *= 1.5
	if target.guard:
		dmg *= 0.5
	dmg *= maxf(0.2, 1 - _eff(target, "block"))
	var damage := maxi(1, roundi(dmg))
	target.hp = maxi(0, target.hp - damage)
	if actor.side == "hero" and not inner:
		stats.outer_hits += 1
	if target.side == "hero":
		stats.hits_taken += 1
	return {"target": target.id, "damage": damage, "miss": false, "crit": crit, "killed": target.hp == 0}


## 敵人的行動：頭目會蓄勢後使出殺招；一般敵人七成用主要招式，其餘隨機用其他招式（內力不夠的不用）
func enemy_command(u: Dictionary, target: Dictionary) -> Dictionary:
	if u.ai == "boss":
		if u.charging:
			u.charging = false
			return {"type": "move", "move": "e_heavy", "target": target.id}
		if randf() < 0.34:
			return {"type": "charge"}
		return {"type": "move", "move": "e_slash", "target": target.id}
	var ok: Array = u.moves.filter(func(m): return mv(m).qi <= u.qi)
	if ok.is_empty():
		return {"type": "move", "move": "e_slash", "target": target.id}
	var pick: String = ok[0]
	if ok.size() > 1 and randf() < 0.3:
		pick = ok[1 + randi() % (ok.size() - 1)]
	return {"type": "move", "move": pick, "target": target.id}


# ── 自動戰鬥 ────────────────────────────────────────────

## 替主角挑指令（穩健：敵人蓄勢就防禦、氣血低於三成補血、內力不夠先調息；猛攻：只管出招，兩成才補血）
## in_range(move_id) 回答這一招現在打不打得到人（六角格上看距離）
func auto_command(hero: Dictionary, steady: bool, in_range: Callable) -> Dictionary:
	var foes := alive("enemy")
	var has := func(kind: String) -> String:
		if no_items:
			return ""
		for id in items:
			if items[id] > 0 and usable_in_battle(id) and Ui.item_def(id).get(kind, 0) > 0:
				return id
		return ""
	var hp_item: String = has.call("hp")
	if hero.hp < hero.max_hp * (0.35 if steady else 0.2) and hp_item != "":
		return {"type": "item", "item": hp_item}
	if steady and foes.any(func(f): return f.charging):
		return {"type": "defend"}
	var buff_value := {"block": 1.2, "evade": 1.2, "counter": 0.9, "speed": 0.6, "power": 0.9}
	var best := ""
	var best_score := -1.0
	var skill_cost := 9999
	for id in hero.moves:
		var m := mv(id)
		if m.kind == "restore" or (not steady and m.kind == "buff"):
			continue
		if m.qi > 0 and m.kind != "buff":
			skill_cost = mini(skill_cost, int(m.qi))
		if m.qi > hero.qi or (m.kind != "buff" and not in_range.call(id)):
			continue
		var dmg: float = m.power * m.get("hits", 1) * (foes.size() if m.target == "allEnemies" else 1)
		var buff := 0.0
		for e in m.get("self", []):
			if not hero.effects.any(func(h): return h.kind == e.kind):
				buff += buff_value.get(e.kind, 0.3)
		var sc: float = dmg + buff * (1.0 if steady else 0.5)
		if sc > best_score or (sc == best_score and m.qi < mv(best).qi):
			best_score = sc
			best = id
	# 誰都打不到（還沒靠近）：先守著
	if best == "":
		return {"type": "defend"}
	# 只剩「出手」可用、其實有武功招式但內力不夠：穩健時先回內力
	if steady and mv(best).qi == 0 and skill_cost < 9999 and hero.qi < skill_cost:
		var qi_item: String = has.call("qi")
		if qi_item != "":
			return {"type": "item", "item": qi_item}
		for id in hero.moves:
			if mv(id).kind == "restore":
				return {"type": "move", "move": id}
	return {"type": "move", "move": best}


# ── 戰後結算 ────────────────────────────────────────────

## 把結果寫回角色：氣血、內力、物品；打贏時給銀兩、武學點數、掉落，以及武功的經驗與領悟。回傳要說的話
func settle(c: Dictionary, enc: Dictionary, result: String) -> Array:
	var hero := unit("hero")
	c.hp = hero.hp
	c.qi = hero.qi
	G.bag = {}
	for id in items:
		if items[id] > 0:
			G.bag[id] = items[id]
	if result != "win":
		return []
	var lines := []
	if enc.get("silver", 0) > 0:
		G.silver += int(enc.silver)
		lines.append("獲得銀兩 %d。" % enc.silver)
	if enc.get("points", 0) > 0:
		c.points += int(enc.points)
		lines.append("獲得武學點數 %d。" % enc.points)
	var drops := {}
	for k in enc.enemies:
		for d in enemy_data().enemies[k].get("drops", []):
			if randf() < d.chance:
				drops[d.item] = drops.get(d.item, 0) + 1
	for id in drops:
		G.bag[id] = int(G.bag.get(id, 0)) + drops[id]
		lines.append("獲得「%s」×%d。" % [Ui.item_def(id).get("name", id), drops[id]])
	# 悟性越高，練得越快；睡過好床、吃了甜品時再加成
	var g: float = enc.get("growth", 1.0) * (1 + Hero.attrs(c).insight / 40.0)
	for key in ["rested", "treat"]:
		var bonus: Dictionary = c.get(key, {})
		if bonus.get("battles", 0) > 0:
			g *= bonus.mult
			bonus.battles -= 1
			lines.append("%s：武功經驗 ×%s%s" % ["精神飽滿" if key == "rested" else "心情愉快", bonus.mult, ("（還有 %d 場）" % bonus.battles) if bonus.battles > 0 else "（效果結束）"])
			if bonus.battles <= 0:
				c.erase(key)
	var exp := {}
	for id in stats.skill_uses:
		exp[id] = stats.skill_uses[id] * 6.0
	for s in c.skills:
		if not Hero.is_equipped(s):
			continue
		var slot := Hero.slot_of(Hero.skill_def(s.id).kind)
		if slot == "light":
			exp[s.id] = exp.get(s.id, 0.0) + 3 + stats.dodges * 5
		elif slot == "inner":
			exp[s.id] = exp.get(s.id, 0.0) + 2 + stats.qi_used / 4.0
	var ups := []
	var shown := []
	for id in exp:
		var s := Hero.find_skill(c, id)
		if s.is_empty() or s.level >= Hero.cap_of(s):
			continue
		var amount := maxi(1, roundi(exp[id] * g))
		shown.append("%s +%d" % [Hero.skill_def(id).name, amount])
		var up := Hero.gain_skill(c, id, amount, false)
		if up != "":
			ups.append(up)
	if not shown.is_empty():
		lines.append("武功熟練：" + "　".join(shown))
	# 悟招：這場用過的武功累積領悟度（輕功的閃避也算），頭目戰有機會靈光一閃
	var uses: Dictionary = stats.skill_uses.duplicate()
	for s in c.skills:
		if Hero.is_equipped(s) and Hero.slot_of(Hero.skill_def(s.id).kind) == "light" and stats.dodges > 0:
			uses[s.id] = uses.get(s.id, 0) + stats.dodges
	for id in uses:
		var s := Hero.find_skill(c, id)
		if s.is_empty() or Hero.next_move(s).is_empty():
			continue
		var before: int = s.level
		var flash: bool = enc.get("boss", false) and randf() < BOSS_FLASH
		var learned := Hero.gain_insight(c, id, roundi((8 + uses[id] * 4) * g), flash)
		var name: String = Hero.skill_def(id).name
		if learned != "":
			ups.append("靈光一閃！你從「%s」中悟出了「%s」！" % [name, mv(learned).name])
			if s.level > before:
				ups.append("「%s」隨之精進至第 %d 重！" % [name, s.level])
		elif s.insight > 0:
			lines.append("對「%s」的下一招似有所悟（領悟 %d%%）。" % [name, roundi(s.insight)])
	return lines + ups
