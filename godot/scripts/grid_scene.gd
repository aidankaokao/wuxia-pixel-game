class_name GridScene
extends Node3D
## 能走動的場景（村子、室內）共用的部分：格子座標、擋路、主角走動、人物走走停停、
## 面對人或擺設時頭上浮出互動提示（空白鍵圖示＋交談／查看），按空白鍵對話（E 鍵留給之後別種互動）。各場景負責把東西蓋出來、填好 walkers 與 props。
##
## walkers 每一筆：{f: Chibi, id, name, lines: [[{speaker, text}]], home: Vector2, goal, wait, fixed, said, talking,
##                 face: 原本面向（站著不動的人說完話會轉回去）, stall: 攤子（可以買賣）,
##                 def: 原始資料（when 出現條件、script 腳本、作息 all_day／work／night／out／meal，見 Story）, hidden}
## props 每一筆：{node, def: {sprite, lines, label, script, when}, at: Vector2（格子座標，中心）, hidden}
## triggers 每一筆：{tiles: [[x, y]…], when, script}：踩到就跑腳本（例如埋伏）

const Loot := preload("res://story/loot.gd")
const Thought := preload("res://story/thought.gd")
const PROP_TEXT := {
	"well": [{"text": "一口老井，井水清涼。"}],
	"stele": [{"text": "路邊的石碑，字跡被風雨磨得模糊了。"}],
	"stall": [{"text": "攤子上擺著些雜貨。"}],
	"lantern_post": [{"text": "竹竿上掛著紅燈籠，夜裡會點起來。"}],
}

var ui: Ui
var rig: CamRig
var main: Node
var W := 0
var H := 0
var ox := 0.0
var oz := 0.0
var blocked := {}
var hero: Chibi
var walkers: Array = []
var props: Array = []
var lamps: Array[OmniLight3D] = []
var lamp_mats: Array[StandardMaterial3D] = []
var triggers: Array = []
## 這張地圖是不是室外（決定村民的作息：室外的人天黑就回家）
var outdoor := false
## 從哪裡進來（格子座標與面向）；沒填就用地圖的出生點
var start := {}
## 自己過日子的人（scripts/life.gd）：這張地圖的 id、在這裡活動的那一群人；顧攤子的人的貨單（村子填）
var life_map := ""
var life_group := {}
var stall_defs := {}
var _astar: AStarGrid2D


func setup(u: Ui, r: CamRig, m: Node, at := {}) -> void:
	ui = u
	rig = r
	main = m
	start = at
	G.time_changed.connect(refresh)


## 依旗標、時間重新決定哪些人、擺設要出現（時間變了、腳本跑完都會叫）
func refresh() -> void:
	if not life_group.is_empty():
		_life_update(false)
	for w in walkers:
		if w.has("life"):
			continue
		var on := Story.present(w.get("def", {}), outdoor) and not beast_away(w.get("def", {}))
		w.hidden = not on
		w.f.visible = on
	for p in props:
		var on := Story.cond(p.def.get("when", ""))
		p.hidden = not on
		if p.node:
			p.node.visible = on
		for c in p.get("cells", []):
			if on:
				blocked[c] = true
			else:
				blocked.erase(c)


## 野獸（帶 encounter 的人物）這時候不在：打倒後還沒重生，或雨天、雪天躲起來（約一半）
func beast_away(def: Dictionary) -> bool:
	if def.get("encounter", "") == "":
		return false
	if float(G.respawn_at.get(beast_key(def), 0.0)) > Time.get_ticks_msec() / 1000.0:
		return true
	return G.weather in ["rain", "snow"] and hash(def.get("id", "")) % 2 == 0


func beast_key(def: Dictionary) -> String:
	return "%s:%s" % [main.cur_id if main else "", def.get("id", "")]


## 格子中心的世界座標
func w3(x: float, y: float, h := 0.0) -> Vector3:
	return Vector3(x + 0.5 + ox, h, y + 0.5 + oz)


func _grid(p: Vector3) -> Vector2i:
	return Vector2i(floori(p.x - ox), floori(p.z - oz))


func _free(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < W and y < H and not blocked.has(Vector2i(x, y))


## 走得過去嗎（以 r 的半徑檢查四個角）
func _walkable(p: Vector3, r := 0.25) -> bool:
	for c in [Vector3(-r, 0, -r), Vector3(r, 0, -r), Vector3(-r, 0, r), Vector3(r, 0, r)]:
		var g := _grid(p + c)
		if not _free(g.x, g.y):
			return false
	return true


## 放主角：照 start（從門口進來）或地圖的出生點
func _place_hero(spawn: Dictionary) -> void:
	hero = Chibi.make("hero")
	add_child(hero)
	var s: Dictionary = start if not start.is_empty() else spawn
	hero.position = w3(s.x, s.y)
	hero.face(_facing_vec(s.get("facing", "down")))
	hero.xray(true)
	rig.target = hero
	rig.position = hero.position


func _facing_vec(f: String) -> Vector3:
	match f:
		"up":
			return Vector3(0, 0, -1)
		"left":
			return Vector3(-1, 0, 0)
		"right":
			return Vector3(1, 0, 0)
	return Vector3(0, 0, 1)


## 主角走到某一格時（門口、出口）；子類別覆寫
func _on_tile(_g: Vector2i) -> void:
	pass


## 走在這裡的速度倍數（大地圖：路快、山慢）；子類別覆寫。室外騎著馬照坐騎的 speed
func _speed_at(_p: Vector3) -> float:
	return horse_mult()


# ── 坐騎 ────────────────────────────────────────────────
## 室外（村子、州圖）可以騎馬；室內照樣步行。G.hero.mount 是馬的 id，G.hero.riding 是騎著還是牽著（沒寫當作騎著）；V 上馬、下馬

## 這張圖能不能騎馬（Village、WorldMap 設成 true）
var rides := false
var _horse: Node3D
const HORSE_COLOR := {"old_bay": ["b08a4a", "6a4a2a"], "jujube": ["8a3a24", "3a2218"], "qingcong": ["c8ccc8", "6a6e72"]}


func riding() -> bool:
	return rides and G.hero.get("mount", "") != "" and G.hero.get("riding", true)


## 騎著馬的腳程倍數（沒騎是 1）
func horse_mult() -> float:
	if not riding():
		return 1.0
	return float(load("res://story/stay.gd").mount_def(G.hero.mount).get("speed", 1.0))


## 騎著就在主角底下畫一匹馬（照馬的毛色），人抬高坐在馬背上；買賣馬、上下馬後再叫一次
func mount_up() -> void:
	if _horse:
		_horse.queue_free()
		_horse = null
	if not hero:
		return
	hero.ride = 0.0
	if not riding():
		return
	var c: Array = HORSE_COLOR.get(G.hero.mount, HORSE_COLOR.old_bay)
	var coat := Color(c[0])
	var dark := Color(c[1])
	_horse = Node3D.new()
	hero.add_child(_horse)
	_horse.add_child(Mk.box(Vector3(0.42, 0.42, 1.0), coat, Vector3(0, 0.62, 0)))
	for lx in [-0.15, 0.15]:
		for lz in [-0.38, 0.38]:
			_horse.add_child(Mk.box(Vector3(0.11, 0.48, 0.11), coat.darkened(0.1), Vector3(lx, 0.24, lz)))
			_horse.add_child(Mk.box(Vector3(0.12, 0.08, 0.12), dark, Vector3(lx, 0.04, lz)))
	var neck := Mk.box(Vector3(0.24, 0.5, 0.26), coat, Vector3(0, 0.95, 0.5))
	neck.rotation.x = 0.5
	_horse.add_child(neck)
	_horse.add_child(Mk.box(Vector3(0.22, 0.24, 0.42), coat, Vector3(0, 1.15, 0.7)))
	_horse.add_child(Mk.box(Vector3(0.06, 0.4, 0.3), dark, Vector3(0, 1.1, 0.42)))
	var tail := Mk.box(Vector3(0.08, 0.45, 0.08), dark, Vector3(0, 0.6, -0.55))
	tail.rotation.x = -0.4
	_horse.add_child(tail)
	_horse.add_child(Mk.box(Vector3(0.46, 0.06, 0.4), Color("8a2e26"), Vector3(0, 0.86, -0.05)))
	# 人坐在馬背上
	hero.ride = 0.72


## V：上馬、下馬（有馬、在室外才行）
func toggle_ride() -> void:
	var m: Dictionary = load("res://story/stay.gd").mount_def(G.hero.get("mount", ""))
	if m.is_empty():
		return
	if not rides:
		ui.notify("屋裡騎不了馬，%s拴在外頭。" % m.name)
		return
	G.hero.riding = not G.hero.get("riding", true)
	mount_up()
	ui.notify("騎上了%s。" % m.name if G.hero.riding else "從%s背上下來，牽著走。" % m.name)


## 這裡的地面高度（大地圖有起伏）；子類別覆寫
func _ground_y(_p: Vector3) -> float:
	return 0.0


var _last_tile := Vector2i(-99, -99)
## 隔一陣子重新看一次誰該出現（野獸重生）
var _recheck := 0.0


func _process(dt: float) -> void:
	if hero == null:
		return
	var busy := ui.busy()
	var v := Vector2.ZERO
	if not busy:
		if Input.is_key_pressed(KEY_LEFT) or Input.is_key_pressed(KEY_A):
			v.x -= 1
		if Input.is_key_pressed(KEY_RIGHT) or Input.is_key_pressed(KEY_D):
			v.x += 1
		if Input.is_key_pressed(KEY_UP) or Input.is_key_pressed(KEY_W):
			v.y -= 1
		if Input.is_key_pressed(KEY_DOWN) or Input.is_key_pressed(KEY_S):
			v.y += 1
	var dir := rig.ground_dir(v)
	hero.walking = dir.length() > 0
	if hero.walking:
		var speed := (6.5 if Input.is_key_pressed(KEY_SHIFT) else 3.6) * _speed_at(hero.position)
		var step := dir * speed * dt
		hero.face(dir)
		if _walkable(hero.position + Vector3(step.x, 0, 0)):
			hero.position.x += step.x
		if _walkable(hero.position + Vector3(0, 0, step.z)):
			hero.position.z += step.z
		var g := _grid(hero.position)
		if g != _last_tile:
			_last_tile = g
			_on_tile(g)
			_trigger(g)
	# 地面高度每格都算（站在擂台這種墊高的地方，傳送、劇情搬動之後也對）
	hero.position.y = _ground_y(hero.position)
	_recheck -= dt
	if _recheck <= 0:
		_recheck = 2.0
		if walkers.any(func(w): return w.def.get("encounter", "") != ""):
			refresh()
	for w in walkers:
		var f: Chibi = w.f
		if w.get("hidden", false):
			continue
		f.position.y = _ground_y(f.position)
		# 撞上野獸就開打（逃走、讀檔回來的頭幾秒不算）
		if not busy and w.def.get("encounter", "") != "" and f.position.distance_to(hero.position) < 0.75 and Time.get_ticks_msec() / 1000.0 > G.beast_grace:
			_fight_beast(w)
			return
		if w.talking:
			f.walking = false
			continue
		if w.get("path", []).size() > 0:
			_follow(w, dt)
			continue
		if w.fixed:
			f.walking = false
			continue
		if w.goal == null:
			w.wait -= dt
			f.walking = false
			if w.wait <= 0:
				var rad := float(w.def.get("wander", 3)) * 2.0
				var gx := int(floor(w.home.x + (randf() - 0.5) * rad))
				var gy := int(floor(w.home.y + (randf() - 0.5) * rad))
				if _free(gx, gy):
					w.goal = w3(gx, gy)
				w.wait = 2.0 + randf() * 4.0
		else:
			var to: Vector3 = w.goal - f.position
			to.y = 0
			if to.length() < 0.1:
				w.goal = null
				continue
			var st: Vector3 = to.normalized() * 1.4 * dt
			if _walkable(f.position + st, 0.2) and (f.position.distance_to(hero.position) > 0.8 or w.def.get("encounter", "") != ""):
				f.position += st
				f.face(to)
				f.walking = true
			else:
				w.goal = null
	_update_hint(busy)


## 踩到某格就跑的腳本
func _trigger(g: Vector2i) -> void:
	for t in triggers:
		for c in t.tiles:
			if Vector2i(c[0], c[1]) == g and Story.cond(t.get("when", "")):
				Story.run(t.script, self)
				return


## 主角面前的對象：人優先，再來是擺設
func _target() -> Dictionary:
	var fwd := Vector3(sin(hero.rotation.y), 0, cos(hero.rotation.y))
	var best := {}
	var best_score := 99.0
	for w in walkers:
		if w.get("hidden", false):
			continue
		var d: Vector3 = w.f.position - hero.position
		d.y = 0
		if d.length() < 1.6 and d.normalized().dot(fwd) > 0.3 and d.length() < best_score:
			best_score = d.length()
			best = {"kind": "npc", "w": w, "at": w.f.position}
	for p in props:
		if p.get("hidden", false):
			continue
		var at := w3(p.at.x - 0.5, p.at.y - 0.5)
		var d: Vector3 = at - hero.position
		d.y = 0
		var score := d.length() + 2.0
		if d.length() < 1.6 and d.normalized().dot(fwd) > 0.3 and score < best_score:
			best_score = score
			best = {"kind": "prop", "p": p, "at": at}
	return best


## 想法泡泡：提醒冒出來還剩幾秒、上次檢查提醒的時間
var _musing := ""
var _musing_left := 0.0
var _muse_check := 0.0


## 主角頭上的想法泡泡（story/thought.gd）：有提醒先說提醒，否則面對要花時間、體力的東西時寫出代價
func _update_thought(busy: bool, t: Dictionary, dt: float) -> void:
	_musing_left -= dt
	_muse_check -= dt
	if not busy and _muse_check <= 0:
		_muse_check = 1.0
		var m := Thought.due()
		if m != "":
			_musing = m
			_musing_left = 3.5
	var text := ""
	if busy:
		text = ""
	elif _musing_left > 0:
		text = _musing
	elif not t.is_empty():
		var sc: String = t.p.def.get("script", "") if t.kind == "prop" else ""
		# 自宅的家具共用一個腳本，代價照是哪一件（estate/use:dummy）
		if t.kind == "prop" and t.p.def.has("furn"):
			sc += ":" + t.p.def.furn
		text = Thought.cost_of(sc)
	ui.show_thought(text, rig.cam.unproject_position(hero.position + Vector3(0, 2.0, 0)))


func _update_hint(busy: bool) -> void:
	var t := {} if busy else _target()
	_update_thought(busy, t, get_process_delta_time())
	if t.is_empty():
		ui.show_hint("", Vector2.ZERO)
		return
	var label: String = t.p.def.get("label", "") if t.kind == "prop" else ""
	var text := ("動手" if t.w.def.get("encounter", "") != "" else "交談") if t.kind == "npc" else (label if label != "" else "查看")
	# 有人物檔案的人：名字與關係，加上能做的事（F 切磋、G 贈禮……）
	if t.kind == "npc" and t.w.def.get("person", "") != "":
		var pid: String = t.w.def.person
		var extra := []
		for a in Social.actions(pid, _stall_of(t.w).size() > 0):
			if a != "talk":
				extra.append("%s %s" % Social.action_label(pid, a))
		text = "交談　" + "　".join(extra) if extra.size() > 0 else "交談"
		text = "%s（%s）　%s" % [Social.def(pid).name, Social.stage_name(pid), text]
	# 人頭上；擺設上方一點；門（沒有高度）就在門口低一點的地方
	var h: float = 1.75 if t.kind == "npc" else (0.7 if t.p.def.sprite == "door" else 1.4)
	ui.show_hint(text, rig.cam.unproject_position(t.at + Vector3(0, h, 0)))


func _unhandled_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo or ui.busy():
		return
	if e.keycode in [KEY_SPACE, KEY_ENTER, KEY_KP_ENTER]:
		var t := _target()
		if not t.is_empty():
			get_viewport().set_input_as_handled()
			_interact(t)
	elif e.keycode == KEY_V and G.hero.get("mount", "") != "":
		get_viewport().set_input_as_handled()
		toggle_ride()
	elif Social.KEYS.has(e.keycode):
		# 面對有人物檔案的人：F 切磋、G 贈禮、R 請教、T 交易、H 雅趣（還不能做的就照常交給別的按鍵）
		var t := _target()
		if t.get("kind", "") != "npc" or t.w.def.get("person", "") == "":
			return
		var act: String = Social.KEYS[e.keycode]
		if not act in Social.actions(t.w.def.person, _stall_of(t.w).size() > 0):
			return
		get_viewport().set_input_as_handled()
		var w: Dictionary = t.w
		w.talking = true
		_face_pair(w)
		w.f.xray(true, Chibi.XRAY_NPC)
		await Story.run("social/" + act, self, {"npc": w.id, "person": w.def.person, "stall": _stall_of(w)})
		if is_instance_valid(w.f):
			w.talking = false
			w.f.xray(false)


func _fill(text: String) -> String:
	return text.replace("{稱}", "小兄弟").replace("{姓}", "無").replace("{名}", "名")


## 跟野獸開打（腳本在 story/beast.gd：打贏了牠才消失，過一陣子重生）
func _fight_beast(w: Dictionary) -> void:
	w.f.face(hero.position - w.f.position)
	Story.run("beast/fight", self, {"npc": w.id, "def": w.def})


## 互動的時候，說話的對象被擋住也畫出輪廓
func _interact(t: Dictionary) -> void:
	var f: Chibi = t.w.f if t.kind == "npc" else null
	if f:
		f.xray(true, Chibi.XRAY_NPC)
	await _interact_with(t)
	if f and is_instance_valid(f):
		f.xray(false)


func _interact_with(t: Dictionary) -> void:
	if t.kind == "npc" and t.w.def.get("encounter", "") != "":
		_fight_beast(t.w)
		return
	if t.kind == "prop" and t.p.def.get("script", "") != "":
		await Story.run(t.p.def.script, self, {"prop": t.p.def})
		return
	if t.kind == "npc" and t.w.get("act", "") == "chat" and _partner(t.w).size() > 0:
		var pw := _partner(t.w)
		var c := await ui.ask({"text": "%s正和%s聊著天。" % [t.w.name, pw.name]}, ["跟%s說話" % t.w.name, "湊過去聽", "算了"])
		if c == 1:
			await Story.run("social/listen", self, {"a": t.w, "b": pw})
			return
		if c == 2:
			return
	# 自己過日子的人正在做的事可以一起做（群的 options：一起練、對練、一起打坐）
	if t.kind == "npc" and t.w.has("life") and life_group.script.has_method("options"):
		var opts: Array = life_group.script.call("options", t.w.id, t.w.get("act", ""))
		if opts.size() > 0:
			var wl: Dictionary = t.w
			_face_pair(wl)
			wl.talking = true
			var c := await ui.ask({"text": "%s正在%s。" % [wl.name, Life.ACTS.get(wl.act, ["做事"])[0]]}, opts.map(func(o): return o[0]) + ["說話", "算了"])
			if is_instance_valid(wl.f):
				wl.talking = false
			if c < opts.size():
				await Story.run(opts[c][1], self, {"npc": wl.id})
				return
			if c > opts.size():
				return
	if t.kind == "npc" and t.w.def.get("person", "") != "":
		var wp: Dictionary = t.w
		wp.talking = true
		_face_pair(wp)
		await Story.run("social/talk", self, {"npc": wp.id, "person": wp.def.person})
		if is_instance_valid(wp.f):
			wp.talking = false
			if wp.has("face"):
				wp.f.face(wp.face)
		return
	if t.kind == "npc" and t.w.get("def", {}).get("script", "") != "":
		var w0: Dictionary = t.w
		w0.talking = true
		w0.f.face(hero.position - w0.f.position)
		hero.face(w0.f.position - hero.position)
		await Story.run(w0.def.script, self, {"npc": w0.get("id", "")})
		if w0.has("face"):
			w0.f.face(w0.face)
		w0.talking = false
		return
	if t.kind == "prop":
		var p: Dictionary = t.p.def
		var lines: Array = p.lines if (p.lines as Array).size() > 0 else PROP_TEXT.get(p.sprite, [{"text": "（沒什麼特別的）"}])
		# 到處翻找：今天這裡藏了東西就順手找到（story/loot.gd）
		await ui.say(lines + Loot.find(self, p))
		return
	await chat(t.w)


## 跟一個人的一般交談：照他的台詞輪著說；顧攤子的人可以買賣（劇情腳本處理完劇情也可以接著呼叫，見 ctx.chat）
func chat(w: Dictionary) -> void:
	var f: Chibi = w.f
	w.talking = true
	f.face(hero.position - f.position)
	hero.face(f.position - hero.position)
	var pool: Array = w.lines
	var out := []
	if pool.size() > 0:
		for l in pool[w.said % pool.size()]:
			out.append({"speaker": l.get("speaker", w.name), "text": _fill(l.text)})
	else:
		out.append({"text": "%s朝你點點頭。" % w.name})
	w.said += 1
	var stall := _stall_of(w)
	if stall.is_empty():
		await ui.say(out)
	else:
		var c := await ui.ask({"speaker": w.name, "text": stall.greet}, ["聊聊", "買賣東西", "沒事"])
		if c == 0:
			await ui.say(out)
		elif c == 1:
			await ui.shop(stall.title, stall.stock)
	if w.has("face"):
		f.face(w.face)
	w.talking = false


func info_text() -> String:
	return ""


## 這個人現在顧著攤子嗎（村子的攤販：原本就站攤子的，或自己過日子的人排到「擺攤」）
func _stall_of(w: Dictionary) -> Dictionary:
	if w.has("stall"):
		return w.stall
	if w.get("act", "") == "stall":
		return stall_defs.get(w.get("id", ""), {})
	return {}


func _face_pair(w: Dictionary) -> void:
	w.f.face(hero.position - w.f.position)
	hero.face(w.f.position - hero.position)


## 正在跟這個人聊天的那一位（看得到的話）
func _partner(w: Dictionary) -> Dictionary:
	var other: String = w.get("with", "")
	if other == "":
		return {}
	for x in walkers:
		if x.get("id", "") == other and not x.hidden and x.get("act", "") == "chat":
			return x
	return {}


# ── 自己過日子的人 ──────────────────────────────────────

## 把在這張地圖活動的那一群人放上來（一開始都藏著，照現在的安排出現）
func life_setup(map: String) -> void:
	life_map = map
	life_group = Life.group_for(map)
	if life_group.is_empty():
		return
	for n in life_group.npcs:
		var w := add_npc({"id": n.id, "name": n.name, "sprite": n.sprite, "x": 0, "y": 0, "person": n.get("person", ""), "script": n.get("script", "")})
		w.life = n
		w.key = ""
		w.hidden = true
		w.f.visible = false
		var badge := Mk.label("", 26, Color("f0c860"))
		badge.position.y = 1.62
		w.f.add_child(badge)
		w.badge = badge
	_life_update(true)


func _life_update(initial: bool) -> void:
	var now := Life.now(life_group)
	for w in walkers:
		if not w.has("life"):
			continue
		var a: Dictionary = now.get(w.id, {})
		if a.is_empty():
			w.hidden = true
			w.f.visible = false
			continue
		var key := "%s|%s|%d|%d" % [a.act, a.at.map, a.at.x, a.at.y]
		if key == w.key:
			continue
		var here_before: bool = not w.hidden
		var from_map: String = w.get("map", "")
		w.key = key
		w.act = a.act
		w.map = a.at.map
		w["with"] = a.get("with", "")
		w.badge.text = Life.ACTS.get(a.act, ["", "", 0, false])[1]
		var talks: Dictionary = w.life.get("talks", {})
		w.lines = talks.get(a.act, talks.get("default", []))
		w.face = _facing_vec(a.at.facing)
		var wander: int = Life.ACTS.get(a.act, ["", "", 0, false])[2]
		if a.at.map == life_map:
			var to := Vector2i(a.at.x, a.at.y)
			w.home = Vector2(to.x + 0.5, to.y + 0.5)
			w.goal = null
			w.fixed = wander == 0
			w.leave = false
			if initial or (here_before == false and from_map == ""):
				w.f.position = w3(to.x, to.y)
				w.f.face(w.face)
				w.path = []
			elif not here_before:
				# 從別的地方回來：從那邊的門口走進來
				w.f.position = w3(_gate(from_map).x, _gate(from_map).y)
				w.path = _path(_gate(from_map), to)
			else:
				w.path = _path(_grid(w.f.position), to)
			w.hidden = false
			w.f.visible = true
		elif here_before and not initial:
			# 要去別的地方：走到往那邊的門口再消失
			w.path = _path(_grid(w.f.position), _gate(a.at.map))
			w.leave = true
			w.fixed = true
		else:
			w.hidden = true
			w.f.visible = false


## 沿著路走；走完了：要離開的就消失，否則轉向該面對的方向
func _follow(w: Dictionary, dt: float) -> void:
	var f: Chibi = w.f
	var to: Vector3 = w.path[0]
	var d := to - f.position
	d.y = 0
	var step := 1.8 * dt
	if d.length() <= step:
		f.position = Vector3(to.x, f.position.y, to.z)
		w.path.pop_front()
		if w.path.is_empty():
			f.walking = false
			if w.get("leave", false):
				w.leave = false
				w.hidden = true
				f.visible = false
			else:
				f.face(w.face)
		return
	f.position += d.normalized() * step
	f.position.y = _ground_y(f.position)
	f.face(d)
	f.walking = true


## 往某張地圖去的門口（格子）；各場景覆寫（村子：屋門、通往村北的路口、往大地圖的出口；室內：門口）
func _gate(_map: String) -> Vector2i:
	return Vector2i(start.get("x", 0), start.get("y", 0))


## 兩格之間的路（世界座標的一串點）；走不到就直接到終點
func _path(from: Vector2i, to: Vector2i) -> Array:
	if _astar == null:
		_astar = AStarGrid2D.new()
		_astar.region = Rect2i(0, 0, W, H)
		_astar.cell_size = Vector2(1, 1)
		_astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_ONLY_IF_NO_OBSTACLES
		_astar.update()
		for b in blocked:
			if _astar.is_in_boundsv(b):
				_astar.set_point_solid(b, true)
	if not _astar.is_in_boundsv(from) or not _astar.is_in_boundsv(to):
		return [w3(to.x, to.y)]
	var sf := _astar.is_point_solid(from)
	var st := _astar.is_point_solid(to)
	_astar.set_point_solid(from, false)
	_astar.set_point_solid(to, false)
	var ids := _astar.get_id_path(from, to)
	_astar.set_point_solid(from, sf)
	_astar.set_point_solid(to, st)
	if ids.is_empty():
		return [w3(to.x, to.y)]
	var out := []
	for i in range(1, ids.size()):
		out.append(w3(ids[i].x, ids[i].y))
	return out


## 照資料放一個人（地圖上的 npcs、室內的人）：{id, name, sprite, x, y, facing, wander, talks, script, when, 作息}
func add_npc(n: Dictionary) -> Dictionary:
	var f := Chibi.make(n.get("sprite", "villager"))
	add_child(f)
	f.position = w3(n.x, n.y)
	var face := _facing_vec(n.get("facing", "down"))
	f.face(face)
	var lb := Mk.label(n.name, 30, Color("fffbe8"))
	lb.position.y = 1.3
	f.add_child(lb)
	var wander: int = int(n.get("wander", 0))
	var wk := {"f": f, "id": n.get("id", ""), "name": n.name, "lines": n.get("talks", []), "home": Vector2(n.x + 0.5, n.y + 0.5),
		"goal": null, "wait": randf() * 3.0, "fixed": wander == 0, "said": 0, "talking": false, "face": face, "def": n, "hidden": false}
	walkers.append(wk)
	return wk


## 主角現在的位置（存檔用，讀檔時當成 main.go 的 at）：格子座標與面向
func where_at() -> Dictionary:
	var g := _grid(hero.position)
	var fwd := Vector3(sin(hero.rotation.y), 0, cos(hero.rotation.y))
	var facing := ("right" if fwd.x > 0 else "left") if absf(fwd.x) > absf(fwd.z) else ("down" if fwd.z > 0 else "up")
	return {"x": g.x, "y": g.y, "facing": facing}
