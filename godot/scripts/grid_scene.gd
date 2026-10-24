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


func setup(u: Ui, r: CamRig, m: Node, at := {}) -> void:
	ui = u
	rig = r
	main = m
	start = at
	G.time_changed.connect(refresh)


## 依旗標、時間重新決定哪些人、擺設要出現（時間變了、腳本跑完都會叫）
func refresh() -> void:
	for w in walkers:
		var on := Story.present(w.get("def", {}), outdoor) and not beast_away(w.get("def", {}))
		w.hidden = not on
		w.f.visible = on
	for p in props:
		var on := Story.cond(p.def.get("when", ""))
		p.hidden = not on
		if p.node:
			p.node.visible = on


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


## 走在這裡的速度倍數（大地圖：路快、山慢）；子類別覆寫
func _speed_at(_p: Vector3) -> float:
	return 1.0


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
		hero.position.y = _ground_y(hero.position)
		var g := _grid(hero.position)
		if g != _last_tile:
			_last_tile = g
			_on_tile(g)
			_trigger(g)
	_recheck -= dt
	if _recheck <= 0:
		_recheck = 2.0
		if walkers.any(func(w): return w.def.get("encounter", "") != ""):
			refresh()
	for w in walkers:
		var f: Chibi = w.f
		if w.get("hidden", false):
			continue
		# 撞上野獸就開打（逃走、讀檔回來的頭幾秒不算）
		if not busy and w.def.get("encounter", "") != "" and f.position.distance_to(hero.position) < 0.75 and Time.get_ticks_msec() / 1000.0 > G.beast_grace:
			_fight_beast(w)
			return
		if w.fixed or w.talking:
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


func _update_hint(busy: bool) -> void:
	var t := {} if busy else _target()
	if t.is_empty():
		ui.show_hint("", Vector2.ZERO)
		return
	var label: String = t.p.def.get("label", "") if t.kind == "prop" else ""
	var text := ("動手" if t.w.def.get("encounter", "") != "" else "交談") if t.kind == "npc" else (label if label != "" else "查看")
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


func _fill(text: String) -> String:
	return text.replace("{稱}", "小兄弟").replace("{姓}", "無").replace("{名}", "名")


## 跟野獸開打（腳本在 story/beast.gd：打贏了牠才消失，過一陣子重生）
func _fight_beast(w: Dictionary) -> void:
	w.f.face(hero.position - w.f.position)
	Story.run("beast/fight", self, {"npc": w.id, "def": w.def})


func _interact(t: Dictionary) -> void:
	if t.kind == "npc" and t.w.def.get("encounter", "") != "":
		_fight_beast(t.w)
		return
	if t.kind == "prop" and t.p.def.get("script", "") != "":
		await Story.run(t.p.def.script, self)
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
		await ui.say(lines)
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
	var stall: Dictionary = w.get("stall", {})
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
