class_name HexBattle
extends Node3D
## 六角格戰場：規則照網頁版（fight.gd 的 Fight），這裡管位置、出手順序、指令與動畫。
## - 9×7 的平頂六角格（奇數欄往下錯半格）。地形：plain 平地、river 河湖（水過不去，走橋或淺灘多 1 步）、
##   hill 山道（往上爬一層多 1 步，高差超過 1 爬不上去，也打不到）。
## - 每一回合照速度（帶一點隨機）排出手順序，一人一次：先走（步數看速度），再做一件事：出手、招式、物品、防禦、逃跑。
## - 範圍：單打的外功招式打相鄰一格；打全部敵人的招式籠罩兩格內的敵人；內功招式打三格內。
## - 主角的回合：下方的指令選單（↑↓ 選、空白鍵確定、X 返回）；「移動」後用方向鍵或滑鼠選藍格；選了招式再選紅格上的目標。
##   Q 切換自動戰鬥（穩健）。氣血、內力在打中的那一刻才扣（數字跟著動畫走）。
## 打完發出 finished(結果, 戰鬥規則)，由 main 結算、送回原本的地圖。

signal finished(result: String, fight: Fight)
signal _input_ev(ev: Dictionary)

const COLS := 9
const ROWS := 7
const R := 0.64
const SQ3 := 1.7320508

## 格子：. 草地  * 花  t 樹  o 石頭  w 水（過不去）  f 淺灘（多 1 步）  b 木橋
const LAYOUT := {
	"hill": [".........", ".......t.", "...t.....", "....o....", "......o..", "..t......", "........."],
	"plain": [".....*...", "..*......", "......o..", "....*....", ".*.......", "...o...*.", ".......*."],
	"river": ["....w....", "....w..t.", ".t..b....", "....w....", "...ww..o.", "..wwf....", ".www....."],
}
const START := {
	"hill": {"ally": [Vector2i(1, 5)], "foe": [Vector2i(6, 1), Vector2i(7, 3), Vector2i(8, 1), Vector2i(6, 4)]},
	"plain": {"ally": [Vector2i(1, 3)], "foe": [Vector2i(7, 2), Vector2i(7, 4), Vector2i(8, 3), Vector2i(6, 3)]},
	"river": {"ally": [Vector2i(1, 3)], "foe": [Vector2i(7, 3), Vector2i(6, 0), Vector2i(8, 5), Vector2i(7, 1)]},
}
const NAME := {"hill": "山道", "plain": "平地", "river": "河湖"}

var field := "plain"
var enc_id := ""
var enc: Dictionary
var ui: Ui
var rig: CamRig
var main: Node
var fight: Fight
var level := []
## 戰場上的人：{u: Fight 的單位, f: Chibi, c, r, lb: 頭上的字}
var bodies: Array = []
var marks := Node3D.new()
var focus := Node3D.new()
var floaters: Array = []
var auto := false
var _ended := false
var _log: Label
var _menu: PanelContainer
var _menu_box: VBoxContainer
var _cursor: MeshInstance3D


func setup(u: Ui, r: CamRig, m: Node, encounter: String, f := "") -> void:
	ui = u
	rig = r
	main = m
	enc_id = encounter
	enc = Fight.encounter(encounter)
	field = f if f != "" else ("plain" if enc.get("background", "") == "camp" else "hill")


func T(c: int, r: int) -> String:
	return (LAYOUT[field][r] as String)[c]


func _inside(c: int, r: int) -> bool:
	return c >= 0 and r >= 0 and c < COLS and r < ROWS


func _around(c: int, r: int) -> Array:
	var n := [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, 1], [1, 1]] if c & 1 else [[0, -1], [0, 1], [-1, -1], [1, -1], [-1, 0], [1, 0]]
	var out := []
	for d in n:
		if _inside(c + d[0], r + d[1]):
			out.append(Vector2i(c + d[0], r + d[1]))
	return out


func _blocked(c: int, r: int) -> bool:
	return "tow".contains(T(c, r))


## 地面高度：水面低、淺灘略低、橋面平
func _gh(c: int, r: int) -> float:
	var t := T(c, r)
	if t == "w":
		return -0.28
	if t == "f":
		return -0.1
	return level[r][c] * 0.4


func top(c: int, r: int) -> Vector3:
	var ox := -((COLS - 1) * 1.5 * R) / 2.0
	var oz := -((ROWS - 0.5) * SQ3 * R) / 2.0
	return Vector3(c * 1.5 * R + ox, 0.08 if T(c, r) == "b" else _gh(c, r), (r + (c & 1) * 0.5) * SQ3 * R + oz)


func _ready() -> void:
	add_child(marks)
	add_child(focus)
	level = []
	for r in ROWS:
		var row := []
		for c in COLS:
			var lv := 0
			if field == "hill":
				lv = clampi(int(floor((c + (ROWS - r)) / 4.0 + Mk.h01(c, r, 1) * 0.9)) - 1, 0, 3)
			elif field == "plain" and ((c == 4 and r == 1) or (c == 5 and r == 1) or (c == 2 and r == 5)):
				lv = 1
			row.append(lv)
		level.append(row)
	_board()
	fight = Fight.new()
	fight.can_flee = enc.get("canFlee", true)
	fight.no_items = enc.get("noItems", false)
	fight.items = G.bag.duplicate()
	fight.units = [Fight.hero_unit(G.hero)] + Fight.enemy_units(enc)
	Fight.power_mult = 1.0
	var st: Dictionary = START[field]
	var fi := 0
	for u in fight.units:
		var at: Vector2i = st.ally[0] if u.side == "hero" else st.foe[fi % st.foe.size()]
		if u.side == "enemy":
			fi += 1
		_add(u, at)
	rig.target = focus
	_hud()
	_run()


func _hex_mesh(h: float, r: float) -> CylinderMesh:
	var m := CylinderMesh.new()
	m.top_radius = r
	m.bottom_radius = r
	m.height = h
	m.radial_segments = 6
	m.rings = 1
	return m


func _board() -> void:
	# 戰場外圍的地面與樹（讓戰場不是浮在空中）
	var base := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(40, 40)
	base.mesh = pm
	base.material_override = Mk.mat(Color("6aa253") if field != "hill" else Color("7a9a5a"))
	base.position.y = -0.62
	add_child(base)
	for i in 40:
		var a := Mk.h01(i, 7) * TAU
		var d := 7.5 + Mk.h01(i, 3) * 6.0
		var p := Vector3(cos(a) * d, -0.62, sin(a) * d * 0.8)
		_tree(p, 0.9 + Mk.h01(i, 5) * 0.6, Mk.h01(i, 11) < 0.5)
	# 湖、河的水面
	if field == "river":
		var water := MeshInstance3D.new()
		var wp := PlaneMesh.new()
		wp.size = Vector2(30, 30)
		water.mesh = wp
		var wm := StandardMaterial3D.new()
		wm.albedo_color = Color(0.29, 0.55, 0.78, 0.85)
		wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
		wm.roughness = 0.1
		water.material_override = wm
		water.position.y = -0.2
		water.scale = Vector3(1, 1, 1)
		add_child(water)
		water.visible = false  # 只有水格自己畫水
	var grass := [Color("7cb262"), Color("8ac06c")]
	for r in ROWS:
		for c in COLS:
			var t := T(c, r)
			var p := top(c, r)
			var col: Color
			match t:
				"w":
					col = Color("4a8cc8")
				"f":
					col = Color("8ab0b8")
				"b":
					col = Color("4a8cc8")
				_:
					col = grass[(c + r) % 2].lerp(Color("a8a070"), 0.25 * level[r][c])
			var h := 0.6 + maxf(0.0, p.y)
			var tile := MeshInstance3D.new()
			tile.mesh = _hex_mesh(h, R * 0.97)
			tile.rotation.y = PI / 6.0
			tile.position = Vector3(p.x, (p.y if t != "b" else -0.28) - h / 2.0, p.z)
			tile.material_override = Mk.mat(col)
			add_child(tile)
			match t:
				"t":
					_tree(p, 1.0, Mk.h01(c, r) < 0.5)
				"o":
					var rk := Mk.ball(0.34, Color("8e8a80"), p + Vector3(0, 0.15, 0), 5)
					rk.scale = Vector3(1, 0.7, 1)
					add_child(rk)
				"*":
					for i in 6:
						add_child(Mk.ball(0.06, [Color("f2c230"), Color("ffffff"), Color("e86a92")][i % 3], p + Vector3((Mk.h01(c, r, i) - 0.5) * 0.8, 0.06, (Mk.h01(c, r, i + 7) - 0.5) * 0.8), 5))
				"b":
					# 木橋：橋面與兩側欄杆
					add_child(Mk.box(Vector3(R * 1.9, 0.08, R * 1.1), Color("a8763f"), p))
					for dz in [-R * 0.5, R * 0.5]:
						add_child(Mk.box(Vector3(R * 1.9, 0.06, 0.06), Color("6a4428"), p + Vector3(0, 0.35, dz)))
						for dx in [-R * 0.8, 0.0, R * 0.8]:
							add_child(Mk.box(Vector3(0.07, 0.35, 0.07), Color("6a4428"), p + Vector3(dx, 0.17, dz)))
				"f":
					for i in 3:
						add_child(Mk.ball(0.1, Color("9a968a"), p + Vector3((Mk.h01(c, r, i) - 0.5) * 0.7, 0.0, (Mk.h01(c, r, i + 3) - 0.5) * 0.7), 5))
			# 水邊長蘆葦
			if t == "." and field == "river":
				for n in _around(c, r):
					if T(n.x, n.y) == "w" and Mk.h01(c, r, 4) < 0.6:
						# 朝著水那一邊長一叢
						var toward := (top(n.x, n.y) - p) * 0.45
						for i in 5:
							var q := p + toward + Vector3((Mk.h01(c, r, i + 1) - 0.5) * 0.35, 0.2, (Mk.h01(c, r, i + 2) - 0.5) * 0.35)
							var blade := Mk.cone(0.035, 0.45 + Mk.h01(c, r, i) * 0.2, Color("6a9a3a"), q, 4)
							blade.rotation.z = (Mk.h01(c, r, i + 5) - 0.5) * 0.5
							add_child(blade)
							if i % 2 == 0:
								add_child(Mk.cyl(0.03, 0.03, 0.1, Color("7a5a32"), q + Vector3(0, 0.25, 0), 5))
						break


func _tree(p: Vector3, s: float, pine: bool) -> void:
	add_child(Mk.cyl(0.07 * s, 0.11 * s, 0.6 * s, Color("6a4a2a"), p + Vector3(0, 0.3 * s, 0), 5))
	if pine:
		add_child(Mk.cone(0.5 * s, 0.9 * s, Color("2f6a3a"), p + Vector3(0, 0.75 * s, 0), 7))
		add_child(Mk.cone(0.36 * s, 0.7 * s, Color("2f6a3a"), p + Vector3(0, 1.2 * s, 0), 7))
	else:
		add_child(Mk.ball(0.52 * s, Color("5aa24c"), p + Vector3(0, 0.95 * s, 0), 6))


func _add(u: Dictionary, at: Vector2i) -> void:
	var f := Chibi.make(u.sprite)
	add_child(f)
	f.position = top(at.x, at.y)
	f.face(Vector3(1, 0, 0) if u.side == "hero" else Vector3(-1, 0, 0))
	var lb := Mk.label("", 22, Color("fffbe8"))
	lb.position.y = 1.35
	f.add_child(lb)
	var b := {"u": u, "f": f, "c": at.x, "r": at.y, "lb": lb, "hp": u.hp, "qi": u.qi}
	bodies.append(b)
	_label(b)


## 頭上的名字與氣血（hp、qi 是畫面上顯示的值，打中的那一刻才更新）
func _label(b: Dictionary) -> void:
	var u: Dictionary = b.u
	var fx := ""
	for e in u.effects:
		fx += Fight.EFFECT_NAME.get(e.kind, "")[0]
	b.lb.text = "%s%s\n%d/%d%s" % [u.name, ("［%s］" % fx) if fx != "" else "", b.hp, u.max_hp, ("　內 %d" % b.qi) if u.side == "hero" else ""]


func _body(u: Dictionary) -> Dictionary:
	for b in bodies:
		if b.u == u or b.u.id == u.get("id", ""):
			return b
	return {}


func _body_id(id: String) -> Dictionary:
	for b in bodies:
		if b.u.id == id:
			return b
	return {}


# ── 位置 ────────────────────────────────────────────────

func _occupied(c: int, r: int, except = null) -> bool:
	for b in bodies:
		if b != except and b.u.hp > 0 and b.c == c and b.r == r:
			return true
	return false


## 一次能走幾步：速度越快走越遠（2～5 步）
func _steps(b: Dictionary) -> int:
	return clampi(2 + int(fight.stat(b.u, "spd") / 9.0), 2, 5)


## 走得到的格子（key 是格子，值是路徑）
func _reach(b: Dictionary) -> Dictionary:
	var start := Vector2i(b.c, b.r)
	var out := {start: [start]}
	var cost := {start: 0}
	var q := [start]
	var limit := _steps(b)
	while not q.is_empty():
		var cur: Vector2i = q.pop_front()
		for n in _around(cur.x, cur.y):
			if _blocked(n.x, n.y) or _occupied(n.x, n.y, b):
				continue
			var climb: int = level[n.y][n.x] - level[cur.y][cur.x]
			if climb > 1:
				continue
			var nd: int = cost[cur] + 1 + max(0, climb) + (1 if T(n.x, n.y) == "f" else 0)
			if nd > limit or nd >= cost.get(n, 999):
				continue
			cost[n] = nd
			var path: Array = out[cur].duplicate()
			path.append(n)
			out[n] = path
			q.append(n)
	return out


func _dist(a: Vector2i, b: Vector2i) -> int:
	var ca := Vector3i(a.x, a.y - (a.x - (a.x & 1)) / 2, 0)
	ca.z = -ca.x - ca.y
	var cb := Vector3i(b.x, b.y - (b.x - (b.x & 1)) / 2, 0)
	cb.z = -cb.x - cb.y
	return max(abs(ca.x - cb.x), abs(ca.y - cb.y), abs(ca.z - cb.z))


func _show_marks(cells: Array, color: Color) -> void:
	_clear_marks()
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(color, 0.45)
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	for cell in cells:
		var mi := MeshInstance3D.new()
		mi.mesh = _hex_mesh(0.03, R * 0.85)
		mi.rotation.y = PI / 6.0
		mi.material_override = m
		mi.position = top(cell.x, cell.y) + Vector3(0, 0.03, 0)
		marks.add_child(mi)


func _clear_marks() -> void:
	for c in marks.get_children():
		c.queue_free()


## 這一招的範圍（格數）
func _range_of(move_id: String) -> int:
	var m := Fight.mv(move_id)
	if m.target == "allEnemies":
		return 2
	return 3 if m.kind == "inner" else 1


## 從 a 打不打得到 t：在範圍內；只打一格的招式高差不能超過 1
func _can_hit(a: Dictionary, t: Dictionary, move_id: String) -> bool:
	var d := _dist(Vector2i(a.c, a.r), Vector2i(t.c, t.r))
	var rg := _range_of(move_id)
	if d > rg:
		return false
	return rg > 1 or abs(level[t.r][t.c] - level[a.r][a.c]) <= 1


func _targets(a: Dictionary, move_id: String) -> Array:
	var out := []
	for b in bodies:
		if b.u.hp > 0 and b.u.side != a.u.side and _can_hit(a, b, move_id):
			out.append(b)
	return out


# ── 回合 ────────────────────────────────────────────────

func _run() -> void:
	await get_tree().create_timer(0.4).timeout
	await _say(enc.get("intro", "打起來了！"))
	while not _ended:
		var order: Array = fight.alive().map(func(u): return {"u": u, "k": fight.stat(u, "spd") * (0.85 + randf() * 0.3)})
		order.sort_custom(func(x, y): return x.k > y.k)
		for o in order:
			var u: Dictionary = o.u
			if u.hp <= 0 or _ended:
				continue
			var b := _body(u)
			var st := fight.start_turn(u)
			_label(b)
			await _play(st.events)
			if st.skip:
				continue
			var cmd: Dictionary
			if u.side == "hero":
				cmd = await _hero_turn(b)
			else:
				cmd = await _enemy_turn(b)
			if cmd.is_empty():
				continue
			var events := fight.act(u, cmd)
			await _play(events)
			for e in events:
				if e.type == "flee" and e.success:
					_end("flee")
			var r := fight.outcome()
			if r != "":
				_end(r)
				break


func _end(result: String) -> void:
	if _ended:
		return
	_ended = true
	_clear_marks()
	_menu.visible = false
	await get_tree().create_timer(0.6).timeout
	finished.emit(result, fight)


## 敵人：朝主角走，走到旁邊就出手（蓄勢不用走到旁邊）
func _enemy_turn(b: Dictionary) -> Dictionary:
	var hero := _body_id("hero")
	var cmd := fight.enemy_command(b.u, hero.u)
	if cmd.type == "charge":
		return cmd
	if not _can_hit(b, hero, cmd.move):
		await _walk(b, _approach(b, hero))
	if not _can_hit(b, hero, cmd.move):
		await _say("%s逼近了過來。" % b.u.name)
		return {}
	return cmd


## 往目標靠過去的路徑：走得到的格子裡，離目標最近、又不跟目標重疊的那一格
func _approach(b: Dictionary, t: Dictionary) -> Array:
	var best: Array = [Vector2i(b.c, b.r)]
	var bd := _dist(Vector2i(b.c, b.r), Vector2i(t.c, t.r))
	for p in _reach(b).values():
		var end: Vector2i = p[p.size() - 1]
		var d := _dist(end, Vector2i(t.c, t.r))
		if d >= 1 and (d < bd or (d == bd and p.size() < best.size())):
			bd = d
			best = p
	return best


## 主角的回合：回傳指令（逃跑、出手…）；空字典是只走不做事
func _hero_turn(b: Dictionary) -> Dictionary:
	var moved := false
	while true:
		if auto:
			return await _auto_turn(b, moved)
		var reach := {} if moved else _reach(b)
		if not moved:
			_show_marks(reach.keys(), Color("4a8cff"))
		var items := _menu_items(b, moved)
		var pick: Dictionary = await _choose(items, "%s的回合" % b.u.name, reach)
		_clear_marks()
		_menu.visible = false
		match pick.get("do", ""):
			"walk":
				var cell: Vector2i = pick.cell
				if cell != Vector2i(b.c, b.r):
					await _walk(b, reach[cell])
				moved = true
			"auto":
				auto = true
			"defend":
				return {"type": "defend"}
			"flee":
				return {"type": "flee"}
			"rest":
				return {}
			"item":
				return {"type": "item", "item": pick.item}
			"move":
				var m := Fight.mv(pick.move)
				if m.kind in ["restore", "buff"]:
					return {"type": "move", "move": pick.move}
				var ts := _targets(b, pick.move)
				if m.target == "allEnemies":
					var ok := await _confirm_area(ts, m.name)
					if ok:
						return {"type": "move", "move": pick.move, "targets": ts.map(func(t): return t.u.id)}
				else:
					var t: Dictionary = await _pick_target(ts, m.name)
					if not t.is_empty():
						return {"type": "move", "move": pick.move, "target": t.u.id}
	return {}


## 自動戰鬥：打不到人就先往最近的敵人走，再照規則層挑招
func _auto_turn(b: Dictionary, moved: bool) -> Dictionary:
	var foes: Array = bodies.filter(func(o): return o.u.side == "enemy" and o.u.hp > 0)
	foes.sort_custom(func(x, y): return _dist(Vector2i(b.c, b.r), Vector2i(x.c, x.r)) < _dist(Vector2i(b.c, b.r), Vector2i(y.c, y.r)))
	if not moved and _targets(b, "attack").is_empty() and not foes.is_empty():
		await _walk(b, _approach(b, foes[0]))
	var cmd := fight.auto_command(b.u, true, func(id): return not _targets(b, id).is_empty())
	if cmd.type == "move" and Fight.mv(cmd.move).kind not in ["restore", "buff"]:
		var ts := _targets(b, cmd.move)
		if ts.is_empty():
			return {"type": "defend"}
		if Fight.mv(cmd.move).target == "allEnemies":
			cmd.targets = ts.map(func(t): return t.u.id)
		else:
			ts.sort_custom(func(x, y): return x.u.hp < y.u.hp)
			cmd.target = ts[0].u.id
	await get_tree().create_timer(0.25).timeout
	return cmd


## 指令選單的項目：{text, on, do, …}
func _menu_items(b: Dictionary, moved: bool) -> Array:
	var u: Dictionary = b.u
	var out := []
	if not moved:
		out.append({"text": "移動（%d 步）" % _steps(b), "on": true, "do": "walk_pick"})
	for id in u.moves:
		var m := Fight.mv(id)
		var reach_ok: bool = m.kind in ["restore", "buff"] or not _targets(b, id).is_empty()
		var cost := ("　內力 %d" % m.qi) if m.qi > 0 else ""
		var why := "" if u.qi >= m.qi else "（內力不足）"
		if why == "" and not reach_ok:
			why = "（打不到）"
		out.append({"text": "%s%s%s" % [m.name, cost, why], "on": u.qi >= m.qi and reach_ok, "do": "move", "move": id, "desc": m.get("desc", "")})
	var usable: Array = fight.items.keys().filter(func(id): return fight.items[id] > 0 and Fight.usable_in_battle(id))
	for id in usable:
		out.append({"text": "用 %s ×%d" % [Ui.item_def(id).name, fight.items[id]], "on": not fight.no_items, "do": "item", "item": id, "desc": Ui.item_def(id).get("desc", "")})
	out.append({"text": "防禦（受傷減半）", "on": true, "do": "defend"})
	if moved:
		out.append({"text": "不做事", "on": true, "do": "rest"})
	out.append({"text": "逃跑", "on": fight.can_flee, "do": "flee"})
	out.append({"text": "自動戰鬥（Q）", "on": true, "do": "auto"})
	return out


# ── 輸入 ────────────────────────────────────────────────

func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo:
		var k := OS.get_keycode_string(e.keycode)
		if k in ["Space", "Enter", "Kp Enter"]:
			k = "ok"
		elif k in ["X", "Escape"]:
			k = "back"
		elif k == "Q":
			auto = not auto
			ui.toast("自動戰鬥：%s" % ("開" if auto else "關"))
		get_viewport().set_input_as_handled()
		_input_ev.emit({"key": k})
	elif e is InputEventMouseButton and e.pressed and e.button_index == MOUSE_BUTTON_LEFT:
		_input_ev.emit({"click": _cell_at(e.position)})


## 開發自動化用：點某一格
func click(cell: Vector2i) -> void:
	_input_ev.emit({"click": cell})


## 指令選單：回傳選到的項目；在「移動」上按確定（或直接點藍格）就選格子走過去
func _choose(items: Array, head: String, reach: Dictionary) -> Dictionary:
	var cur := 0
	while not items[cur].on:
		cur += 1
	while true:
		_draw_menu(head, items, cur)
		var ev: Dictionary = await _input_ev
		if auto:
			return {"do": "auto"}
		if ev.has("click"):
			if reach.has(ev.click):
				return {"do": "walk", "cell": ev.click}
			continue
		match ev.key:
			"Up", "Down":
				var step := -1 if ev.key == "Up" else 1
				for i in items.size():
					cur = (cur + step + items.size()) % items.size()
					if items[cur].on:
						break
			"ok":
				if items[cur].do == "walk_pick":
					var cell = await _pick_cell(reach)
					if cell != null:
						return {"do": "walk", "cell": cell}
				else:
					return items[cur]
	return {}


## 用方向鍵在藍格裡挑一格（空白鍵走過去、X 取消）
func _pick_cell(reach: Dictionary):
	var hero := _body_id("hero")
	var cur := Vector2i(hero.c, hero.r)
	_menu.visible = false
	while true:
		_show_cursor(cur, Color("ffffff"))
		var ev: Dictionary = await _input_ev
		if ev.has("click"):
			if reach.has(ev.click):
				_hide_cursor()
				_menu.visible = true
				return ev.click
			continue
		match ev.key:
			"ok":
				_hide_cursor()
				_menu.visible = true
				return cur
			"back":
				_hide_cursor()
				_menu.visible = true
				return null
			"Up", "Down", "Left", "Right":
				var nx = _step_cell(cur, ev.key, reach)
				if nx != null:
					cur = nx
	return null


## 往畫面上的某個方向，挑最接近那個方向的相鄰藍格
func _step_cell(cur: Vector2i, key: String, reach: Dictionary):
	var want: Vector2 = {"Up": Vector2(0, -1), "Down": Vector2(0, 1), "Left": Vector2(-1, 0), "Right": Vector2(1, 0)}[key]
	var here := rig.cam.unproject_position(top(cur.x, cur.y))
	var best = null
	var bd := 0.3
	for n in _around(cur.x, cur.y):
		if not reach.has(n):
			continue
		var d := (rig.cam.unproject_position(top(n.x, n.y)) - here).normalized().dot(want)
		if d > bd:
			bd = d
			best = n
	return best


## 選一個目標（紅格；←→↑↓ 換、空白鍵確定、X 返回）
func _pick_target(ts: Array, what: String) -> Dictionary:
	if ts.is_empty():
		return {}
	var cur := 0
	_menu.visible = false
	while true:
		_show_marks(ts.map(func(t): return Vector2i(t.c, t.r)), Color("ff4a4a"))
		_show_cursor(Vector2i(ts[cur].c, ts[cur].r), Color("ffe080"))
		_log_line("「%s」打誰？（←→ 換、空白鍵確定、X 返回）　%s" % [what, ts[cur].u.name], true)
		var ev: Dictionary = await _input_ev
		if ev.has("click"):
			for t in ts:
				if Vector2i(t.c, t.r) == ev.click:
					_done_pick()
					return t
			continue
		match ev.key:
			"Left", "Up":
				cur = (cur + ts.size() - 1) % ts.size()
			"Right", "Down":
				cur = (cur + 1) % ts.size()
			"ok":
				_done_pick()
				return ts[cur]
			"back":
				_done_pick()
				return {}
	return {}


func _confirm_area(ts: Array, what: String) -> bool:
	_menu.visible = false
	_show_marks(ts.map(func(t): return Vector2i(t.c, t.r)), Color("ff4a4a"))
	_log_line("「%s」會打到紅格上的 %d 個人。空白鍵出招、X 返回" % [what, ts.size()], true)
	while true:
		var ev: Dictionary = await _input_ev
		if ev.has("key") and ev.key in ["ok", "back"]:
			_done_pick()
			return ev.key == "ok"
	return false


func _done_pick() -> void:
	_hide_cursor()
	_clear_marks()
	_menu.visible = true
	_log_line("", true)


# ── 動畫與事件 ──────────────────────────────────────────

func _walk(b: Dictionary, path: Array) -> void:
	var f: Chibi = b.f
	for i in range(1, path.size()):
		var c0: Vector2i = path[i - 1]
		var c1: Vector2i = path[i]
		var p0 := top(c0.x, c0.y)
		var p1 := top(c1.x, c1.y)
		f.face(p1 - p0)
		f.walking = true
		var t := 0.0
		while t < 1.0:
			t = minf(1.0, t + get_process_delta_time() * 4.0)
			f.position = p0.lerp(p1, t) + Vector3(0, sin(t * PI) * 0.3, 0)
			await get_tree().process_frame
		b.c = c1.x
		b.r = c1.y
	f.walking = false


## 照規則層的事件依序演出來：說明一行行出現；出招時撲過去，打中的那一刻才扣血、跳數字
func _play(events: Array) -> void:
	for e in events:
		match e.type:
			"message":
				await _say(e.text)
			"strike":
				var a := _body_id(e.actor)
				var kind: String = Fight.mv(e.get("move", "")).get("fx", "punch")
				# 蓄勢的紅光：出招了就收掉
				if a.has("aura"):
					a.aura.queue_free()
					a.erase("aura")
				var first: Dictionary = _body_id(e.hits[0].target) if not e.hits.is_empty() else {}
				if not first.is_empty():
					await _lunge(a, first)
					# 內勁：光球飛過去才打中
					if kind == "qi":
						await BattleFx.orb(self, a.f.position + Vector3(0, 0.8, 0), first.f.position + Vector3(0, 0.75, 0))
				for h in e.hits:
					var t := _body_id(h.target)
					if h.miss:
						_popup(t, "閃", Color("d8f0ff"))
						_dodge(t, a)
					else:
						BattleFx.hit(self, kind, a.f.position + Vector3(0, 0.75, 0), t.f.position + Vector3(0, 0.75, 0), h.crit)
						t.hp = maxi(0, t.hp - h.damage)
						_popup(t, ("會心 -%d" if h.crit else "-%d") % h.damage, Color("ffe080") if not h.crit else Color("ff9a4a"))
						_label(t)
						_knock(t, a, kind == "heavy" or h.crit)
						if h.crit or kind == "heavy":
							BattleFx.shake(rig.cam, 0.14 if h.crit else 0.09)
						if h.crit:
							await _hitstop(0.09)
						if h.killed:
							_fall(t)
					await get_tree().create_timer(0.12).timeout
				a.qi = a.u.qi
				_label(a)
			"restore":
				var a := _body_id(e.actor)
				BattleFx.heal(self, a.f.position)
				a.hp = a.u.hp
				a.qi = a.u.qi
				_popup(a, "+%d%s" % [e.hp, ("　內 +%d" % e.qi) if e.qi > 0 else ""], Color("9aff9a"))
				_label(a)
			"effects", "guard", "charge":
				var a := _body_id(e.actor)
				a.qi = a.u.qi
				_label(a)
				if e.type == "guard":
					_popup(a, "守", Color("d8f0ff"))
					BattleFx.guard(self, a.f.position, Vector3(sin(a.f.rotation.y), 0, cos(a.f.rotation.y)))
				elif e.type == "charge" and not a.has("aura"):
					a.aura = BattleFx.aura(self, a.f.position)


func _lunge(a: Dictionary, t: Dictionary) -> void:
	var f: Chibi = a.f
	var from := top(a.c, a.r)
	var to := top(t.c, t.r)
	f.face(to - from)
	var k := 0.0
	var reach := 0.45 if _dist(Vector2i(a.c, a.r), Vector2i(t.c, t.r)) <= 1 else 0.2
	# 撲到最前面就算打中，回傳讓呼叫端扣血、跳數字
	while k < 0.5:
		k = minf(0.5, k + get_process_delta_time() * 3.2)
		f.position = from.lerp(to, sin(k * PI) * reach)
		await get_tree().process_frame
	# 收回來的那一半不等它
	var tw := create_tween()
	tw.tween_property(f, "position", from, 0.18)


## 被打中往後一頓（重擊、會心退得多一點）
func _knock(t: Dictionary, a: Dictionary, hard := false) -> void:
	var base := top(t.c, t.r)
	var away: Vector3 = base - a.f.position
	away.y = 0
	away = away.normalized() * (0.28 if hard else 0.14)
	var tw := create_tween()
	tw.tween_property(t.f, "position", base + away, 0.06)
	tw.tween_property(t.f, "position", base, 0.18).set_trans(Tween.TRANS_SINE)


## 閃開：往側邊一閃再回來
func _dodge(t: Dictionary, a: Dictionary) -> void:
	var base := top(t.c, t.r)
	var d: Vector3 = base - a.f.position
	d.y = 0
	var side: Vector3 = d.cross(Vector3.UP).normalized() * 0.35
	var tw := create_tween()
	tw.tween_property(t.f, "position", base + side, 0.08)
	tw.tween_property(t.f, "position", base, 0.2).set_trans(Tween.TRANS_SINE)


## 會心一擊的停格：整個畫面慢下來一瞬間
func _hitstop(sec: float) -> void:
	var ts := Engine.time_scale
	Engine.time_scale = ts * 0.08
	await get_tree().create_timer(sec, true, false, true).timeout
	Engine.time_scale = ts


func _fall(b: Dictionary) -> void:
	var tw := create_tween()
	tw.tween_property(b.f, "rotation:z", PI / 2.0, 0.35)
	tw.parallel().tween_property(b.f, "position:y", b.f.position.y - 0.2, 0.35)
	tw.tween_property(b.f, "scale", Vector3.ONE * 0.01, 0.4)
	tw.tween_callback(func() -> void: b.f.visible = false)


func _popup(b: Dictionary, text: String, color := Color("ffe080")) -> void:
	var l := Mk.label(text, 44, color, Color("3a1410"))
	l.position = b.f.position + Vector3(0, 1.9, 0)
	add_child(l)
	floaters.append({"o": l, "t": 0.0})


func _show_cursor(cell: Vector2i, color: Color) -> void:
	if _cursor == null:
		_cursor = MeshInstance3D.new()
		var m := TorusMesh.new()
		m.inner_radius = R * 0.72
		m.outer_radius = R * 0.86
		m.rings = 6
		m.ring_segments = 6
		_cursor.mesh = m
		var mat := StandardMaterial3D.new()
		mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		_cursor.material_override = mat
		_cursor.rotation.y = PI / 6.0
		add_child(_cursor)
	(_cursor.material_override as StandardMaterial3D).albedo_color = color
	_cursor.position = top(cell.x, cell.y) + Vector3(0, 0.06, 0)
	_cursor.visible = true


func _hide_cursor() -> void:
	if _cursor:
		_cursor.visible = false


# ── 畫面上的字 ──────────────────────────────────────────

## 下方左邊的戰況（最近幾行）與右邊的指令選單
func _hud() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 4
	add_child(layer)
	var lp := ui._panel(false)
	lp.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	lp.position = Vector2(16, -190)
	lp.custom_minimum_size = Vector2(620, 150)
	layer.add_child(lp)
	_log = Label.new()
	_log.add_theme_font_override("font", Ui.font())
	_log.add_theme_font_size_override("font_size", 17)
	_log.add_theme_color_override("font_color", Color("f4ead6"))
	_log.add_theme_constant_override("line_spacing", 4)
	_log.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	_log.custom_minimum_size = Vector2(580, 0)
	lp.add_child(_log)
	_menu = ui._panel(false)
	_menu.set_anchors_preset(Control.PRESET_BOTTOM_RIGHT)
	_menu.custom_minimum_size = Vector2(330, 0)
	_menu.position = Vector2(-350, -420)
	_menu.visible = false
	layer.add_child(_menu)
	_menu_box = VBoxContainer.new()
	_menu_box.add_theme_constant_override("separation", 3)
	_menu.add_child(_menu_box)


var _lines: Array[String] = []
var _hint := ""


## 加一行戰況；hint 是暫時的提示（選目標時），放在最下面、不進紀錄
func _log_line(text: String, hint := false) -> void:
	if hint:
		_hint = text
	elif text != "":
		_lines.append(text)
		if _lines.size() > 5:
			_lines.pop_front()
	_log.text = "\n".join(_lines) + (("\n▸ " + _hint) if _hint != "" else "")


func _say(text: String) -> void:
	_log_line(text)
	await get_tree().create_timer(0.45 if not auto else 0.25).timeout


func _draw_menu(head: String, items: Array, cur: int) -> void:
	_menu.visible = true
	for c in _menu_box.get_children():
		c.queue_free()
	var h := Label.new()
	h.text = head
	h.add_theme_font_size_override("font_size", 16)
	h.add_theme_color_override("font_color", Ui.GOLD)
	_menu_box.add_child(h)
	for i in items.size():
		var l := Label.new()
		l.text = ("▶ " if i == cur else "　 ") + items[i].text
		l.add_theme_font_size_override("font_size", 17)
		l.add_theme_color_override("font_color", Color("ffffff") if i == cur else (Color("c8bca4") if items[i].on else Color("6a6458")))
		_menu_box.add_child(l)
	var d: String = items[cur].get("desc", "")
	if d != "":
		var dl := Label.new()
		dl.text = d
		dl.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		dl.custom_minimum_size = Vector2(290, 0)
		dl.add_theme_font_size_override("font_size", 13)
		dl.add_theme_color_override("font_color", Color("a8a090"))
		_menu_box.add_child(dl)


## 滑鼠點到哪一格（射線打到地面高度附近，找最近的格子中心）
func _cell_at(screen: Vector2) -> Vector2i:
	var cam := rig.cam
	var from := cam.project_ray_origin(screen)
	var dir := cam.project_ray_normal(screen)
	var best := Vector2i(-1, -1)
	var bd := 99.0
	for r in ROWS:
		for c in COLS:
			var p := top(c, r)
			var t := (p.y - from.y) / dir.y
			var hitp := from + dir * t
			var d := Vector2(hitp.x - p.x, hitp.z - p.z).length()
			if d < R * 0.95 and d < bd:
				bd = d
				best = Vector2i(c, r)
	return best


func _process(dt: float) -> void:
	for fl in floaters.duplicate():
		fl.t += dt
		fl.o.position.y += dt * 0.8
		if fl.t > 1.2:
			fl.o.queue_free()
			floaters.erase(fl)


func info_text() -> String:
	return "%s・%s%s" % [NAME[field], "自動戰鬥中（Q 關掉）" if auto else "Q 自動戰鬥", "　水過不去，走橋或淺灘（多 1 步）" if field == "river" else ""]
