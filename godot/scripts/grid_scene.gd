class_name GridScene
extends Node3D
## 能走動的場景（村子、室內）共用的部分：格子座標、擋路、主角走動、人物走走停停、
## 面對人或擺設時頭上浮出互動提示（空白鍵圖示＋交談／查看），按空白鍵對話（E 鍵留給之後別種互動）。各場景負責把東西蓋出來、填好 walkers 與 props。
##
## walkers 每一筆：{f: Chibi, name, lines: [[{speaker, text}]], home: Vector2, goal, wait, fixed, said, talking,
##                 face: 原本面向（站著不動的人說完話會轉回去）, stall: 攤子（可以買賣）}
## props 每一筆：{node, def: {sprite, lines, label}, at: Vector2（格子座標，中心）}

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
## 從哪裡進來（格子座標與面向）；沒填就用地圖的出生點
var start := {}


func setup(u: Ui, r: CamRig, m: Node, at := {}) -> void:
	ui = u
	rig = r
	main = m
	start = at


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


var _last_tile := Vector2i(-99, -99)


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
		var speed := 6.5 if Input.is_key_pressed(KEY_SHIFT) else 3.6
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
	for w in walkers:
		var f: Chibi = w.f
		if w.fixed or w.talking:
			f.walking = false
			continue
		if w.goal == null:
			w.wait -= dt
			f.walking = false
			if w.wait <= 0:
				var gx := int(floor(w.home.x + (randf() - 0.5) * 6))
				var gy := int(floor(w.home.y + (randf() - 0.5) * 6))
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
			if _walkable(f.position + st, 0.2) and f.position.distance_to(hero.position) > 0.8:
				f.position += st
				f.face(to)
				f.walking = true
			else:
				w.goal = null
	_update_hint(busy)


## 主角面前的對象：人優先，再來是擺設
func _target() -> Dictionary:
	var fwd := Vector3(sin(hero.rotation.y), 0, cos(hero.rotation.y))
	var best := {}
	var best_score := 99.0
	for w in walkers:
		var d: Vector3 = w.f.position - hero.position
		d.y = 0
		if d.length() < 1.6 and d.normalized().dot(fwd) > 0.3 and d.length() < best_score:
			best_score = d.length()
			best = {"kind": "npc", "w": w, "at": w.f.position}
	for p in props:
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
	var text := "交談" if t.kind == "npc" else (label if label != "" else "查看")
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


func _interact(t: Dictionary) -> void:
	if t.kind == "prop":
		var p: Dictionary = t.p.def
		var lines: Array = p.lines if (p.lines as Array).size() > 0 else PROP_TEXT.get(p.sprite, [{"text": "（沒什麼特別的）"}])
		await ui.say(lines)
		return
	var w: Dictionary = t.w
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
