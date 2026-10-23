class_name HexBattle
extends Node3D
## 六角格戰鬥（試作品：只看畫面與手感，規則是臨時的）。9×7 的平頂六角格（奇數欄往下錯半格）。
## 地形：plain 平地（花、石頭、一兩處小土坡）、river 河湖（河從中間流過、左下是湖；水過不去，
## 中間一座木橋，下游一處淺灘多 1 步）、hill 山道（有高低，往上爬一層多 1 步，高差超過 1 爬不上去）。
## 你和顧小滿對上三個山賊：點自己人 → 藍格是走得到的 → 點一格走過去 → 紅格是打得到的，點敵人出手；
## 空白鍵結束這個人的行動。兩人都動過就換山賊。

const COLS := 9
const ROWS := 7
const MOVE := 4
const R := 0.64
const SQ3 := 1.7320508

## 格子：. 草地  * 花  t 樹  o 石頭  w 水（過不去）  f 淺灘（多 1 步）  b 木橋
const LAYOUT := {
	"hill": [".........", ".......t.", "...t.....", "....o....", "......o..", "..t......", "........."],
	"plain": [".....*...", "..*......", "......o..", "....*....", ".*.......", "...o...*.", ".......*."],
	"river": ["....w....", "....w..t.", ".t..b....", "....w....", "...ww..o.", "..wwf....", ".www....."],
}
const START := {
	"hill": {"ally": [Vector2i(1, 5), Vector2i(1, 4)], "foe": [Vector2i(6, 1), Vector2i(7, 3), Vector2i(8, 1)]},
	"plain": {"ally": [Vector2i(1, 3), Vector2i(1, 4)], "foe": [Vector2i(7, 2), Vector2i(7, 4), Vector2i(8, 3)]},
	"river": {"ally": [Vector2i(1, 3), Vector2i(2, 1)], "foe": [Vector2i(7, 3), Vector2i(6, 0), Vector2i(8, 5)]},
}
const NAME := {"hill": "山道", "plain": "平地", "river": "河湖"}

var field := "plain"
var ui: Ui
var rig: CamRig
var level := []
var units: Array = []
var marks := Node3D.new()
var phase := "pick"
var sel = null
var reachable := {}
var msg := "點你或顧小滿，選要行動的人"
var anim = null
var queue: Array[Callable] = []
var floaters: Array = []
var focus := Node3D.new()


func setup(u: Ui, r: CamRig, f: String) -> void:
	ui = u
	rig = r
	field = f


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
	var st: Dictionary = START[field]
	_add("你", "hero", "ally", st.ally[0], 120, 26)
	_add("顧小滿", "disciple_girl", "ally", st.ally[1], 90, 20)
	_add("山賊甲", "bandit", "foe", st.foe[0], 70, 16)
	_add("山賊乙", "bandit", "foe", st.foe[1], 70, 16)
	_add("賊頭", "boss", "foe", st.foe[2], 110, 22)
	rig.target = focus


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


func _add(name: String, sprite: String, side: String, at: Vector2i, hp: int, atk: int) -> void:
	var f := Chibi.make(sprite)
	add_child(f)
	f.position = top(at.x, at.y)
	f.face(Vector3(1, 0, 0) if side == "ally" else Vector3(-1, 0, 0))
	var lb := Mk.label("%s\n%d/%d" % [name, hp, hp], 20, Color("fffbe8"))
	lb.position.y = 1.35
	f.add_child(lb)
	units.append({"name": name, "side": side, "f": f, "c": at.x, "r": at.y, "hp": hp, "max": hp, "atk": atk, "done": false, "lb": lb})


func _occupied(c: int, r: int, except = null) -> bool:
	for u in units:
		if u != except and u.hp > 0 and u.c == c and u.r == r:
			return true
	return false


## 走得到的格子（key 是格子，值是路徑）
func _reach(u: Dictionary) -> Dictionary:
	var start := Vector2i(u.c, u.r)
	var out := {start: [start]}
	var cost := {start: 0}
	var q := [start]
	while not q.is_empty():
		var cur: Vector2i = q.pop_front()
		for n in _around(cur.x, cur.y):
			if _blocked(n.x, n.y) or _occupied(n.x, n.y, u):
				continue
			var climb: int = level[n.y][n.x] - level[cur.y][cur.x]
			if climb > 1:
				continue
			var nd: int = cost[cur] + 1 + max(0, climb) + (1 if T(n.x, n.y) == "f" else 0)
			if nd > MOVE or nd >= cost.get(n, 999):
				continue
			cost[n] = nd
			var path: Array = out[cur].duplicate()
			path.append(n)
			out[n] = path
			q.append(n)
	return out


func _adjacent_foes(u: Dictionary) -> Array:
	var out := []
	for o in units:
		if o.hp > 0 and o.side != u.side and Vector2i(o.c, o.r) in _around(u.c, u.r) and abs(level[o.r][o.c] - level[u.r][u.c]) <= 1:
			out.append(o)
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


func _popup(u: Dictionary, text: String) -> void:
	var l := Mk.label(text, 44, Color("ffe080"), Color("6a1a14"))
	l.position = u.f.position + Vector3(0, 1.7, 0)
	add_child(l)
	floaters.append({"o": l, "t": 0.0})


func _hit(a: Dictionary, d: Dictionary) -> void:
	var high: bool = level[a.r][a.c] > level[d.r][d.c]
	var dmg := int(round(a.atk * (0.85 + randf() * 0.3) * (1.2 if high else 1.0)))
	d.hp = max(0, d.hp - dmg)
	d.lb.text = "%s\n%d/%d" % [d.name, d.hp, d.max]
	_popup(d, "-%d%s" % [dmg, "（居高）" if high else ""])
	if d.hp <= 0:
		d.f.visible = false


func _allies() -> Array:
	return units.filter(func(u): return u.side == "ally" and u.hp > 0)


func _foes() -> Array:
	return units.filter(func(u): return u.side == "foe" and u.hp > 0)


func _end_ally(u: Dictionary) -> void:
	u.done = true
	_clear_marks()
	sel = null
	phase = "pick"
	if _foes().is_empty():
		phase = "over"
		msg = "山賊都打倒了！（換場景再回來可以重打）"
		return
	if _allies().all(func(a): return a.done):
		_enemy_turn()
	else:
		msg = "點另一個人行動"


func _enemy_turn() -> void:
	phase = "busy"
	msg = "山賊的回合……"
	for e in _foes():
		queue.append(_enemy_act.bind(e))
	queue.append(_new_round)
	_next()


## 山賊：朝最近的自己人走，走到旁邊就出手
func _enemy_act(e: Dictionary) -> void:
	var targets := _allies()
	if e.hp <= 0 or targets.is_empty():
		_next()
		return
	var best: Array = [Vector2i(e.c, e.r)]
	var bd := 999
	for p in _reach(e).values():
		var end: Vector2i = p[p.size() - 1]
		var d := 999
		for t in targets:
			d = min(d, _dist(end, Vector2i(t.c, t.r)))
		if d >= 1 and d < bd:
			bd = d
			best = p
	anim = {"u": e, "path": best, "i": 1, "t": 0.0, "then": _enemy_after_move.bind(e)}


func _enemy_after_move(e: Dictionary) -> void:
	var fs := _adjacent_foes(e)
	if fs.is_empty():
		_next()
		return
	anim = {"u": e, "lunge": fs[0], "t": 0.0, "then": _strike.bind(e, fs[0], true)}


## 出手：打完以後，山賊接下一個；自己人結束這個人的行動
func _strike(a: Dictionary, d: Dictionary, enemy: bool) -> void:
	_hit(a, d)
	if enemy:
		_next()
	else:
		_end_ally(a)


func _new_round() -> void:
	for u in units:
		u.done = false
	phase = "pick" if not _allies().is_empty() else "over"
	msg = "你的回合：點你或顧小滿" if phase == "pick" else "全軍覆沒……（換場景再回來可以重打）"


func _next() -> void:
	if not queue.is_empty():
		var f: Callable = queue.pop_front()
		f.call()


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


func _unit_at(cell: Vector2i):
	for u in units:
		if u.hp > 0 and u.c == cell.x and u.r == cell.y:
			return u
	return null


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventKey and e.pressed and not e.echo and e.keycode == KEY_SPACE and sel != null and (phase == "move" or phase == "attack"):
		_end_ally(sel)
		return
	if not (e is InputEventMouseButton) or not e.pressed or e.button_index != MOUSE_BUTTON_LEFT:
		return
	click(_cell_at(e.position))


func click(cell: Vector2i) -> void:
	if phase == "busy" or phase == "over" or anim != null or cell.x < 0:
		return
	var unit = _unit_at(cell)
	if phase == "pick" or (phase == "move" and unit != null and unit.side == "ally" and unit != sel):
		if unit == null or unit.side != "ally" or unit.done:
			return
		sel = unit
		reachable = _reach(unit)
		_show_marks(reachable.keys(), Color("4a8cff"))
		phase = "move"
		msg = "%s：點藍色的格子移動（點自己原地不動；空白鍵結束）" % unit.name
		return
	if phase == "move" and sel != null:
		if not reachable.has(cell):
			return
		var u = sel
		phase = "busy"
		_clear_marks()
		anim = {"u": u, "path": reachable[cell], "i": 1, "t": 0.0, "then": _ally_after_move.bind(u)}
		return
	if phase == "attack" and sel != null and unit != null and unit.side == "foe" and unit in _adjacent_foes(sel):
		var u = sel
		phase = "busy"
		_clear_marks()
		anim = {"u": u, "lunge": unit, "t": 0.0, "then": _strike.bind(u, unit, false)}


func _ally_after_move(u: Dictionary) -> void:
	var ts := _adjacent_foes(u)
	if ts.is_empty():
		_end_ally(u)
		return
	phase = "attack"
	_show_marks(ts.map(func(t): return Vector2i(t.c, t.r)), Color("ff4a4a"))
	msg = "%s：點紅色格子上的敵人出手（空白鍵不出手）" % u.name


func _process(dt: float) -> void:
	if anim != null:
		var a: Dictionary = anim
		var f: Chibi = a.u.f
		if a.has("path"):
			a.t += dt * 4.0
			if a.i >= a.path.size():
				anim = null
				f.walking = false
				a.then.call()
			else:
				var c0: Vector2i = a.path[a.i - 1]
				var c1: Vector2i = a.path[a.i]
				var t: float = min(1.0, a.t)
				var p0 := top(c0.x, c0.y)
				var p1 := top(c1.x, c1.y)
				f.position = p0.lerp(p1, t) + Vector3(0, sin(t * PI) * 0.3, 0)
				f.face(p1 - p0)
				f.walking = true
				if t >= 1.0:
					a.u.c = c1.x
					a.u.r = c1.y
					a.i += 1
					a.t = 0.0
		else:
			a.t += dt * 3.0
			var t: float = min(1.0, a.t)
			var from := top(a.u.c, a.u.r)
			var to := top(a.lunge.c, a.lunge.r)
			f.face(to - from)
			f.position = from.lerp(to, sin(t * PI) * 0.45)
			if t >= 1.0:
				f.position = from
				anim = null
				a.then.call()
	for fl in floaters.duplicate():
		fl.t += dt
		fl.o.position.y += dt * 0.8
		if fl.t > 1.2:
			fl.o.queue_free()
			floaters.erase(fl)


func info_text() -> String:
	return "六角格戰鬥・%s（臨時規則，只看畫面）%s\n%s" % [NAME[field], "　水過不去，走橋或淺灘（多 1 步）" if field == "river" else "", msg]
