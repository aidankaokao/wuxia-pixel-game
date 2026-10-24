class_name Room
extends GridScene
## 室內：讀網頁版匯出的房間（data/<id>.json：牆 W、地板 _、出口 E，家具與屋裡的人），蓋成一間沒有屋頂的屋子。
## - 鏡頭固定斜 45 度看：只立著背對鏡頭的那兩道牆，靠鏡頭的兩道牆拿掉；轉鏡頭（每次 90 度）就換成新的那兩道。
## - 地板與牆依房間的樣式（theme）：一般人家木地板、書香大宅深色木地板、鐵鋪石板地；窗、掛軸、吊燈籠。
## - 家具照網頁版的擺設名做：櫃台、茶罐架、方桌與板凳、盆景、供桌、太師椅、書架、上鎖的門、火爐、兵器架、
##   鐵砧、水缸、床、搖籃、灶。放在牆上的擺設（掛軸、門）貼著那面牆、跟著牆一起立起或收掉。
## - 屋裡的人站在原地，按空白鍵交談（說網頁版的台詞）；對著門口按空白鍵就回村裡。

const WALL_H := 2.1
## 網頁版沒有對應貼圖、要另外指定外觀的人（例如和尚）
const LOOK_BY_ID := {"zhiyuan": "monk"}
## 牆的厚度：牆貼在牆格靠屋裡的那一邊（牆格其他地方是屋外，空著）
const WALL_T := 0.2

## 房間的樣式：地板顏色、是不是石板地、牆色、牆腳色、北牆要不要掛山水
const THEMES := {
	"plain": {"floor": ["b08458", "a87c50", "b88c5e"], "stone": false, "wall": "e8dcc4", "base": "6a4a32", "scroll": true},
	"scholar": {"floor": ["8a5a3a", "82543a", "93623f"], "stone": false, "wall": "efe6d2", "base": "4a2e1e", "scroll": true},
	"stone": {"floor": ["8e8a80", "858177", "97938a"], "stone": true, "wall": "c9bda6", "base": "5e5a54", "scroll": false},
}

var data: Dictionary
var room_id := ""
## 四面牆各一個節點（n 北、s 南、w 西、e 東），牆上的窗、掛軸、門框掛在所屬那面牆底下，一起立起或收掉
var sides := {}
## 轉角：{node, sides: [兩面牆]}，有一面立著就立著
var corners: Array = []
var th: Dictionary
var _settled := false


func open(id: String) -> void:
	room_id = id


func _ready() -> void:
	var f := FileAccess.open("res://data/%s.json" % room_id, FileAccess.READ)
	data = JSON.parse_string(f.get_as_text())
	th = THEMES.get(data.get("theme", "plain"), THEMES["plain"])
	var tiles: Array = data.tiles
	H = tiles.size()
	W = (tiles[0] as String).length()
	ox = -W / 2.0
	oz = -H / 2.0
	for y in H:
		for x in W:
			if tile(x, y) in ["W", "E"]:
				blocked[Vector2i(x, y)] = true
	# 門口：對著門按空白鍵出去
	for e in data.exits:
		var t: Array = e.tiles[0]
		props.append({"node": null, "def": {"sprite": "door", "label": "出去", "lines": [], "exit": e}, "at": Vector2(t[0] + 0.5, t[1] + 0.5)})
	_floor()
	_walls()
	_decor()
	for p in data.props:
		_prop(p)
	triggers = data.get("triggers", [])
	_people()
	refresh()


func tile(x: int, y: int) -> String:
	if y < 0 or y >= H or x < 0 or x >= W:
		return "W"
	return (data.tiles[y] as String)[x]


## 木地板：一條條木板，顏色略有深淺；屋外一圈暗色地面
func _floor() -> void:
	var outside := Mk.box(Vector3(W + 30, 0.1, H + 30), Color("2a2620"), Vector3(0, -0.12, 0))
	add_child(outside)
	var planks: Array = (th.floor as Array).map(func(c): return Color(c))
	for y in H:
		for x in W:
			var c := tile(x, y)
			if c == "W":
				continue
			var col: Color = planks[(x * 7 + y * 3) % 3]
			if c == "E":
				col = Color("8a8478")
			# 地板一格接一格（不留縫，不然每格都會被描邊）；木地板畫兩條木紋，石板地畫十字的石縫
			add_child(Mk.box(Vector3(1.0, 0.1, 1.0), col, w3(x, y, -0.05)))
			if c == "E":
				continue
			if th.stone:
				add_child(Mk.box(Vector3(1.0, 0.004, 0.025), col.darkened(0.2), w3(x, y, 0.002) + Vector3(0, 0, 0.5 if y % 2 == 0 else 0.0)))
				add_child(Mk.box(Vector3(0.025, 0.004, 1.0), col.darkened(0.2), w3(x, y, 0.002) + Vector3(0.5 if (x + y) % 2 == 0 else 0.0, 0, 0)))
			else:
				for dz in [-0.17, 0.17]:
					add_child(Mk.box(Vector3(0.9, 0.004, 0.02), col.darkened(0.15), w3(x, y, 0.002) + Vector3(0, 0, dz)))
	# 門口外的石階
	for e in data.exits:
		var t: Array = e.tiles[0]
		add_child(Mk.box(Vector3(1.6, 0.08, 0.8), Color("9a968a"), w3(t[0], t[1] + 0.8, -0.06)))


## 牆：每一格一段，底下是深色牆腳、上面白牆、牆頂木條
func _walls() -> void:
	for k in ["n", "s", "w", "e"]:
		var n := Node3D.new()
		add_child(n)
		sides[k] = n
	for y in H:
		for x in W:
			if tile(x, y) != "W":
				continue
			var on: Array = []
			if y == 0:
				on.append("n")
			if y == H - 1:
				on.append("s")
			if x == 0:
				on.append("w")
			if x == W - 1:
				on.append("e")
			var seg := Node3D.new()
			seg.position = w3(x, y)
			# 牆只佔靠屋裡的那一條：北牆貼這一格的南緣、西牆貼東緣……；轉角只立一根小方柱接起兩面牆
			var inner := 0.5 - WALL_T / 2.0
			var off := Vector3.ZERO
			var size := Vector3(1.0, 0, 1.0)
			if on.has("n"):
				off.z = inner
				size.z = WALL_T
			if on.has("s"):
				off.z = -inner
				size.z = WALL_T
			if on.has("w"):
				off.x = inner
				size.x = WALL_T
			if on.has("e"):
				off.x = -inner
				size.x = WALL_T
			var base_h := 0.3 if not th.stone else 0.6
			seg.add_child(Mk.box(Vector3(size.x, WALL_H, size.z), Color(th.wall), off + Vector3(0, WALL_H / 2.0, 0)))
			seg.add_child(Mk.box(Vector3(size.x + 0.02, base_h, size.z + 0.02), Color(th.base), off + Vector3(0, base_h / 2.0, 0)))
			# 牆頂的木條（略高於牆面，避免兩個面疊在同一個高度上閃爍）
			seg.add_child(Mk.box(Vector3(size.x + 0.04, 0.08, size.z + 0.04), Color("5a3a22"), off + Vector3(0, WALL_H + 0.03, 0)))
			if on.size() >= 2:
				add_child(seg)
				corners.append({"node": seg, "sides": on})
			elif on.size() == 1:
				sides[on[0]].add_child(seg)
	# 門框（在門所在的那面牆上）
	for e in data.exits:
		var t: Array = e.tiles[0]
		for dx in [-0.48, 0.48]:
			sides["s"].add_child(Mk.box(Vector3(0.14, WALL_H, WALL_T + 0.06), Color("5a3a22"), w3(t[0], t[1], WALL_H / 2.0) + Vector3(dx, 0, -(0.5 - WALL_T / 2.0))))


## 窗：嵌在牆上的木窗框（有深度）、透著外頭天光的窗紙、步步錦的窗櫺、窗台，地上一塊斜斜的光
## （normal 是朝屋裡的方向；整扇窗跟著那面牆一起立起或收掉）
func _window(side: String, at: Vector3, normal: Vector3) -> void:
	var g := Node3D.new()
	g.position = at
	g.rotation.y = atan2(normal.x, normal.z)
	var wood := Color("5a3a22")
	var ww := 1.1
	var hh := 0.8
	# 窗紙：外面的天光透進來（微微發亮）
	var paper := Mk.box(Vector3(ww, hh, 0.02), Color("fbf0d4"), Vector3(0, 0, -0.03))
	var pm := StandardMaterial3D.new()
	pm.albedo_color = Color("fbf0d4")
	pm.emission_enabled = true
	pm.emission = Color("ffe8b8")
	pm.emission_energy_multiplier = 0.45
	paper.material_override = pm
	g.add_child(paper)
	# 窗框：四邊有厚度，往屋裡凸一點
	for sy in [-1, 1]:
		g.add_child(Mk.box(Vector3(ww + 0.16, 0.08, 0.12), wood, Vector3(0, sy * (hh / 2.0 + 0.04), 0.02)))
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.08, hh + 0.16, 0.12), wood, Vector3(sx * (ww / 2.0 + 0.04), 0, 0.02)))
	# 步步錦：外圈一道細框，裡面長短交錯的木條
	var lc := Color("6a4428")
	var inset := 0.12
	for sy in [-1, 1]:
		g.add_child(Mk.box(Vector3(ww - inset * 2, 0.025, 0.04), lc, Vector3(0, sy * (hh / 2.0 - inset), 0.0)))
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.025, hh - inset * 2, 0.04), lc, Vector3(sx * (ww / 2.0 - inset), 0, 0.0)))
	g.add_child(Mk.box(Vector3(0.025, hh, 0.04), lc, Vector3(0, 0, 0.0)))
	g.add_child(Mk.box(Vector3(ww, 0.025, 0.04), lc, Vector3(0, 0, 0.0)))
	for sx in [-1, 1]:
		for sy in [-1, 1]:
			g.add_child(Mk.box(Vector3(0.025, inset, 0.04), lc, Vector3(sx * ww / 4.0, sy * (hh / 2.0 - inset / 2.0), 0.0)))
			g.add_child(Mk.box(Vector3(inset, 0.025, 0.04), lc, Vector3(sx * (ww / 2.0 - inset / 2.0), sy * hh / 4.0, 0.0)))
			g.add_child(Mk.box(Vector3(0.025, (hh / 2.0 - inset) * 0.55, 0.04), lc, Vector3(sx * ww / 4.0, sy * hh / 4.0, 0.0)))
	# 窗台
	g.add_child(Mk.box(Vector3(ww + 0.3, 0.05, 0.2), wood, Vector3(0, -hh / 2.0 - 0.1, 0.08)))
	# 地上的光：從窗口斜斜灑進屋裡的一塊亮
	var patch := MeshInstance3D.new()
	var qm := PlaneMesh.new()
	qm.size = Vector2(ww * 0.9, 1.2)
	patch.mesh = qm
	var lm := StandardMaterial3D.new()
	lm.albedo_color = Color(1.0, 0.9, 0.65, 0.16)
	lm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	lm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	patch.material_override = lm
	patch.position = Vector3(0.25, -at.y + 0.012, 0.9)
	patch.rotation.y = 0.2
	g.add_child(patch)
	sides[side].add_child(g)


## 牆上的東西：四面牆都有窗（轉到哪個方向都看得到）、北牆正中掛軸、吊燈籠（夜裡亮）
func _decor() -> void:
	var back_z := oz + 1.0
	# 牆上已經有擺設（掛軸、門）的地方不開窗
	var on_wall := func(x: float, y: float) -> bool:
		for p in data.props:
			if tile(p.x, p.y) == "W" and absf(p.x + 0.5 - x) < 1.3 and absf(p.y + 0.5 - y) < 1.3:
				return true
		return false
	for x in [W / 2.0 - 2.5, W / 2.0 + 2.5]:
		if not on_wall.call(x, 0.5):
			_window("n", Vector3(ox + x, 1.25, back_z + 0.02), Vector3(0, 0, 1))
	if not on_wall.call(0.5, H / 2.0):
		_window("w", Vector3(ox + 1.02, 1.25, oz + H / 2.0), Vector3(1, 0, 0))
	if not on_wall.call(W - 0.5, H / 2.0):
		_window("e", Vector3(ox + W - 1.02, 1.25, oz + H / 2.0), Vector3(-1, 0, 0))
	var sx := ox + W / 2.0
	var n: Node3D = sides["n"]
	if not th.scroll:
		# 鐵鋪：北牆上掛著鐵鉗、鐵鎚與馬蹄鐵
		for i in 5:
			var hx := sx - 1.2 + i * 0.6
			n.add_child(Mk.box(Vector3(0.04, 0.04, 0.08), Color("3a2a1a"), Vector3(hx, 1.75, back_z + 0.04)))
			if i % 2 == 0:
				n.add_child(Mk.box(Vector3(0.05, 0.5, 0.04), Color("4a4a50"), Vector3(hx, 1.45, back_z + 0.04)))
				n.add_child(Mk.box(Vector3(0.18, 0.08, 0.06), Color("4a4a50"), Vector3(hx, 1.2, back_z + 0.05)))
			else:
				var ring := MeshInstance3D.new()
				var tm := TorusMesh.new()
				tm.inner_radius = 0.07
				tm.outer_radius = 0.11
				ring.mesh = tm
				ring.material_override = Mk.mat(Color("5a5a62"))
				ring.rotation.x = PI / 2.0
				ring.position = Vector3(hx, 1.6, back_z + 0.05)
				n.add_child(ring)
	if th.scroll and not on_wall.call(W / 2.0, 0.5):
		_scroll(n, Vector3(sx, 1.35, back_z + 0.02))
	_lamps()


## 北牆正中的掛軸（山水）
func _scroll(n: Node3D, at: Vector3) -> void:
	var sx := at.x
	var back_z := at.z - 0.02
	n.add_child(Mk.box(Vector3(0.6, 1.0, 0.03), Color("f4ecd8"), Vector3(sx, 1.35, back_z + 0.02)))
	n.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(sx, 1.87, back_z + 0.03)))
	n.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(sx, 0.83, back_z + 0.03)))
	for i in 3:
		var hill := Mk.cone(0.14 + i * 0.03, 0.3, Color("6a7a7a"), Vector3(sx - 0.15 + i * 0.15, 1.3, back_z + 0.05), 3)
		hill.rotation.x = PI / 2.0
		hill.scale = Vector3(1, 1, 0.2)
		n.add_child(hill)


## 吊燈籠（兩盞）與暖光
func _lamps() -> void:
	for x in [W / 3.0, W * 2.0 / 3.0]:
		var p := Vector3(ox + x, 1.9, oz + H / 2.0 - 0.3)
		add_child(Mk.cyl(0.01, 0.01, 0.3, Color("3a2a1a"), p + Vector3(0, 0.25, 0), 3))
		var m := StandardMaterial3D.new()
		m.albedo_color = Color("c8302a")
		m.emission_enabled = true
		m.emission = Color("ff6a2a")
		m.emission_energy_multiplier = 0.6
		var lamp := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.17
		sm.height = 0.44
		sm.radial_segments = 8
		sm.rings = 4
		lamp.mesh = sm
		lamp.material_override = m
		lamp.position = p
		add_child(lamp)
		lamp_mats.append(m)
		var light := OmniLight3D.new()
		light.position = p + Vector3(0, -0.3, 0)
		light.light_color = Color("ffc890")
		light.omni_range = 5.0
		light.light_energy = 0.8
		light.shadow_enabled = true
		add_child(light)
		lamps.append(light)


## 家具：照網頁版的擺設名
func _prop(p: Dictionary) -> void:
	var w: int = p.w
	for i in w:
		blocked[Vector2i(p.x + i, p.y)] = true
	var g := Node3D.new()
	g.position = Vector3(p.x + w / 2.0 + ox, 0, p.y + 0.5 + oz)
	props.append({"node": g, "def": p, "at": Vector2(p.x + w / 2.0, p.y + 0.5)})
	# 擺在牆上的（掛軸、門）：貼著那面牆的內側、面向屋裡，跟著牆一起立起或收掉
	if tile(p.x, p.y) == "W":
		var side := "n" if p.y == 0 else ("s" if p.y == H - 1 else ("w" if p.x == 0 else "e"))
		match side:
			"n":
				g.position.z = oz + 1.0
			"s":
				g.position.z = oz + H - 1.0
				g.rotation.y = PI
			"w":
				g.position.x = ox + 1.0
				g.rotation.y = PI / 2.0
			"e":
				g.position.x = ox + W - 1.0
				g.rotation.y = -PI / 2.0
		sides[side].add_child(g)
		_wall_prop(g, p)
		return
	add_child(g)
	var wood := Color("7a5232")
	var dark := Color("5a3a22")
	match p.sprite:
		"counter":
			# 長櫃台：深色檯面、前面一排木板，檯上茶壺、茶碗、梅子罐
			g.add_child(Mk.box(Vector3(w - 0.1, 0.85, 0.7), wood, Vector3(0, 0.425, 0)))
			g.add_child(Mk.box(Vector3(w, 0.08, 0.8), dark, Vector3(0, 0.89, 0)))
			for i in w:
				g.add_child(Mk.box(Vector3(0.04, 0.7, 0.02), dark, Vector3(-w / 2.0 + 0.5 + i, 0.42, 0.36)))
			_teapot(g, Vector3(-0.8, 0.93, 0))
			for i in 3:
				g.add_child(Mk.cyl(0.06, 0.045, 0.07, Color("e8e4d8"), Vector3(-0.2 + i * 0.18, 0.97, 0.1), 8))
			g.add_child(Mk.cyl(0.13, 0.11, 0.26, Color("8a4a3a"), Vector3(0.9, 1.06, -0.05), 8))
			g.add_child(Mk.cyl(0.08, 0.08, 0.04, Color("3a2a1a"), Vector3(0.9, 1.21, -0.05), 8))
		"jars":
			# 茶罐架：三層木架，擺滿貼了紅紙的茶罐
			for dx in [-w / 2.0 + 0.05, w / 2.0 - 0.05]:
				g.add_child(Mk.box(Vector3(0.08, 1.8, 0.45), dark, Vector3(dx, 0.9, -0.2)))
			for lv in 3:
				var y := 0.35 + lv * 0.55
				g.add_child(Mk.box(Vector3(w - 0.1, 0.05, 0.45), wood, Vector3(0, y, -0.2)))
				for i in 4:
					var jx := -w / 2.0 + 0.35 + i * (w - 0.6) / 3.0
					var col: Color = [Color("4a6a5a"), Color("8a5a3a"), Color("5a5a72"), Color("a88a4a")][(i + lv) % 4]
					g.add_child(Mk.cyl(0.11, 0.12, 0.26, col, Vector3(jx, y + 0.155, -0.2), 8))
					g.add_child(Mk.box(Vector3(0.1, 0.1, 0.02), Color("c8302a"), Vector3(jx, y + 0.16, -0.08)))
		"f_table_plain_1":
			# 方桌與四張板凳；打譜的那一桌擺著棋盤
			g.add_child(Mk.box(Vector3(1.4, 0.07, 0.9), wood, Vector3(0, 0.72, 0)))
			for dx in [-0.6, 0.6]:
				for dz in [-0.35, 0.35]:
					g.add_child(Mk.box(Vector3(0.07, 0.72, 0.07), dark, Vector3(dx, 0.36, dz)))
			for dx in [-0.95, 0.95]:
				g.add_child(Mk.box(Vector3(0.3, 0.06, 0.6), wood, Vector3(dx, 0.42, 0)))
				for dz in [-0.22, 0.22]:
					g.add_child(Mk.box(Vector3(0.05, 0.42, 0.05), dark, Vector3(dx, 0.21, dz)))
			if p.get("label", "") != "":
				g.add_child(Mk.box(Vector3(0.6, 0.03, 0.6), Color("d8b878"), Vector3(0, 0.77, 0)))
				for i in 7:
					g.add_child(Mk.cyl(0.035, 0.035, 0.02, Color("1e1a24") if i % 2 == 0 else Color("f4f0e8"), Vector3(-0.2 + Mk.h01(i, 1) * 0.4, 0.795, -0.2 + Mk.h01(i, 2) * 0.4), 8))
			else:
				_teapot(g, Vector3(0.25, 0.76, 0))
				g.add_child(Mk.cyl(0.06, 0.045, 0.07, Color("e8e4d8"), Vector3(-0.2, 0.79, 0.15), 8))
				g.add_child(Mk.cyl(0.06, 0.045, 0.07, Color("e8e4d8"), Vector3(-0.35, 0.79, -0.1), 8))
		"f_deco_plain_1":
			# 盆景：一盆青竹
			g.add_child(Mk.cyl(0.22, 0.17, 0.3, Color("6a7a8a"), Vector3(0, 0.15, 0), 8))
			for i in 5:
				var q := Vector3((Mk.h01(i, 3) - 0.5) * 0.25, 0.3, (Mk.h01(i, 4) - 0.5) * 0.25)
				var hh := 0.8 + Mk.h01(i, 5) * 0.6
				g.add_child(Mk.cyl(0.02, 0.025, hh, Color("7aa648"), q + Vector3(0, hh / 2.0, 0), 5))
				g.add_child(Mk.cone(0.12, 0.25, Color("5a8a32"), q + Vector3(0, hh, 0), 5))
		"altar":
			_altar(g, w)
		"chair":
			_chair(g)
		"cushion":
			# 蒲團：草編的圓墊，一圈圈的紋
			g.add_child(Mk.cyl(0.3, 0.32, 0.12, Color("b8944e"), Vector3(0, 0.06, 0), 14))
			for k in 2:
				var ring := MeshInstance3D.new()
				var tm := TorusMesh.new()
				tm.inner_radius = 0.1 + k * 0.09
				tm.outer_radius = 0.12 + k * 0.09
				ring.mesh = tm
				ring.material_override = Mk.mat(Color("9a7a3e"))
				ring.position = Vector3(0, 0.12, 0)
				g.add_child(ring)
		"f_shelf_scholar_2":
			_bookshelf(g, w)
		"forge":
			_forge(g, w)
		"f_deco_martial_1":
			_weapon_rack(g, w)
		"anvil":
			g.add_child(Mk.cyl(0.2, 0.24, 0.45, Color("6a4a32"), Vector3(0, 0.225, 0), 9))
			g.add_child(Mk.box(Vector3(0.55, 0.18, 0.24), Color("3a3a40"), Vector3(0, 0.54, 0)))
			g.add_child(Mk.box(Vector3(0.3, 0.1, 0.18), Color("3a3a40"), Vector3(0, 0.42, 0)))
			var horn := Mk.cone(0.09, 0.26, Color("3a3a40"), Vector3(-0.38, 0.56, 0), 5)
			horn.rotation.z = PI / 2.0
			g.add_child(horn)
			# 鐵砧上擱著一把鎚
			g.add_child(Mk.box(Vector3(0.04, 0.04, 0.32), Color("7a5636"), Vector3(0.12, 0.66, 0.05)))
			g.add_child(Mk.box(Vector3(0.1, 0.08, 0.08), Color("4a4a50"), Vector3(0.12, 0.67, -0.1)))
		"vat":
			var vat := Mk.ball(0.4, Color("6a4a3a"), Vector3(0, 0.38, 0), 12)
			vat.scale = Vector3(1, 0.95, 1)
			g.add_child(vat)
			g.add_child(Mk.cyl(0.34, 0.34, 0.06, Color("5a3a2a"), Vector3(0, 0.72, 0), 12))
			g.add_child(Mk.cyl(0.3, 0.3, 0.07, Color("3a4a52"), Vector3(0, 0.72, 0), 12))
		"f_bed_plain_1":
			_bed(g, w)
		"cradle":
			_cradle(g)
		"f_stove_plain_1":
			_stove(g, w)
		_:
			g.add_child(Mk.box(Vector3(w * 0.8, 0.8, 0.6), wood, Vector3(0, 0.4, 0)))


## 牆上的擺設：掛軸（寫字的或山水）、上鎖的門；g 的 +z 朝屋裡
func _wall_prop(g: Node3D, p: Dictionary) -> void:
	var text: String = (p.lines[0].text if (p.lines as Array).size() > 0 else "")
	match p.sprite:
		"door_locked":
			g.add_child(Mk.box(Vector3(0.9, 1.6, 0.06), Color("6a4428"), Vector3(0, 0.8, 0.03)))
			for k in 3:
				g.add_child(Mk.box(Vector3(0.015, 1.5, 0.07), Color("4a2e1e"), Vector3(-0.22 + k * 0.22, 0.8, 0.04)))
			g.add_child(Mk.box(Vector3(1.05, 0.1, 0.1), Color("4a2e1e"), Vector3(0, 1.65, 0.05)))
			for dx in [-0.5, 0.5]:
				g.add_child(Mk.box(Vector3(0.08, 1.7, 0.1), Color("4a2e1e"), Vector3(dx, 0.85, 0.05)))
			# 門閂上一把銅鎖
			g.add_child(Mk.box(Vector3(0.3, 0.05, 0.05), Color("4a4a50"), Vector3(0, 0.9, 0.09)))
			g.add_child(Mk.box(Vector3(0.1, 0.12, 0.05), Color("c9a46a"), Vector3(0.05, 0.84, 0.11)))
		_:
			# 掛軸：「一幅字」寫四個大字，否則是山水
			g.add_child(Mk.box(Vector3(0.6, 1.0, 0.03), Color("f4ecd8"), Vector3(0, 1.3, 0.02)))
			g.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(0, 1.82, 0.03)))
			g.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(0, 0.78, 0.03)))
			if text.contains("「") and text.contains("字"):
				var words := text.get_slice("「", 1).get_slice("」", 0)
				var t := Label3D.new()
				t.text = "\n".join(Array(words.split("")))
				t.font = Ui.font()
				t.font_size = 40
				t.pixel_size = 0.005
				t.line_spacing = -4
				t.modulate = Color("1e1a18")
				t.outline_size = 0
				t.position = Vector3(0, 1.3, 0.04)
				g.add_child(t)
			else:
				for i in 3:
					var hill := Mk.cone(0.14 + i * 0.03, 0.3, Color("6a7a7a"), Vector3(-0.15 + i * 0.15, 1.25, 0.05), 3)
					hill.rotation.x = PI / 2.0
					hill.scale = Vector3(1, 1, 0.2)
					g.add_child(hill)


## 供桌：長桌、一排祖先牌位、香爐與三炷香、一對紅燭、一盤供果
func _altar(g: Node3D, w: int) -> void:
	var red := Color("6a2a20")
	if room_id == "qz_temple":
		_statue(g)
	g.add_child(Mk.box(Vector3(w - 0.2, 0.08, 0.7), red, Vector3(0, 0.95, -0.05)))
	g.add_child(Mk.box(Vector3(w - 0.3, 0.7, 0.04), red.darkened(0.2), Vector3(0, 0.6, 0.29)))
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.1, 0.95, 0.6), red.darkened(0.15), Vector3(sx * (w / 2.0 - 0.2), 0.475, -0.05)))
	g.add_child(Mk.box(Vector3(w - 0.5, 0.06, 0.08), Color("c9a46a"), Vector3(0, 0.88, 0.3)))
	# 牌位（寺裡是佛像，不擺牌位）
	for i in (0 if room_id == "qz_temple" else 5):
		var tx := -0.8 + i * 0.4
		g.add_child(Mk.box(Vector3(0.14, 0.05, 0.1), Color("3a2a1a"), Vector3(tx, 1.01, -0.28)))
		g.add_child(Mk.box(Vector3(0.11, 0.38 - absf(i - 2) * 0.04, 0.03), Color("2a1f18"), Vector3(tx, 1.2 - absf(i - 2) * 0.02, -0.28)))
		g.add_child(Mk.box(Vector3(0.03, 0.26, 0.005), Color("d8b060"), Vector3(tx, 1.2, -0.264)))
	# 香爐（三足）與香
	g.add_child(Mk.cyl(0.13, 0.1, 0.14, Color("8a6a3a"), Vector3(0, 1.08, 0.05), 10))
	for k in 3:
		var a := TAU * k / 3.0
		g.add_child(Mk.cyl(0.015, 0.015, 0.08, Color("6a4a2a"), Vector3(cos(a) * 0.08, 1.0, 0.05 + sin(a) * 0.08), 4))
	for k in 3:
		g.add_child(Mk.cyl(0.006, 0.006, 0.3, Color("8a4a2a"), Vector3(-0.04 + k * 0.04, 1.3, 0.05), 3))
		var tip := Mk.ball(0.012, Color("ff7a3a"), Vector3(-0.04 + k * 0.04, 1.45, 0.05), 4)
		(tip.material_override as StandardMaterial3D).emission_enabled = true
		(tip.material_override as StandardMaterial3D).emission = Color("ff5a2a")
		g.add_child(tip)
	# 紅燭
	for sx in [-1, 1]:
		var cx: float = sx * 0.55
		g.add_child(Mk.cyl(0.05, 0.06, 0.06, Color("c9a46a"), Vector3(cx, 1.02, 0.05), 8))
		g.add_child(Mk.cyl(0.035, 0.035, 0.25, Color("c8302a"), Vector3(cx, 1.17, 0.05), 8))
		var flame := MeshInstance3D.new()
		var fm := SphereMesh.new()
		fm.radius = 0.025
		fm.height = 0.08
		flame.mesh = fm
		var m := StandardMaterial3D.new()
		m.albedo_color = Color("ffd060")
		m.emission_enabled = true
		m.emission = Color("ffb030")
		m.emission_energy_multiplier = 2.0
		flame.material_override = m
		flame.position = Vector3(cx, 1.33, 0.05)
		g.add_child(flame)
	# 供果
	g.add_child(Mk.cyl(0.14, 0.1, 0.03, Color("e8e4d8"), Vector3(0.95, 1.0, 0.1), 10))
	for k in 4:
		g.add_child(Mk.ball(0.05, Color("e8603c") if k < 3 else Color("f2c230"), Vector3(0.95 + (k % 2) * 0.08 - 0.04, 1.06 + (k / 3) * 0.06, 0.1 + (k / 2) * 0.06 - 0.03), 6))


## 寺裡供桌上的木雕佛像（坐在供桌靠牆那一側）：蓮花座、盤腿坐著、雙手合在腹前，背後一圈光
func _statue(g: Node3D) -> void:
	var gold := Color("c9a046")
	var s := Node3D.new()
	s.position = Vector3(0, 0.42, -0.2)
	s.scale = Vector3.ONE * 0.6
	g.add_child(s)
	for k in 8:
		var a := TAU * k / 8.0
		var petal := Mk.ball(0.12, Color("d88a8a"), Vector3(cos(a) * 0.3, 1.02, sin(a) * 0.22), 6)
		petal.scale = Vector3(1, 0.5, 1)
		s.add_child(petal)
	var legs := Mk.ball(0.34, gold, Vector3(0, 1.12, 0), 10)
	legs.scale = Vector3(1, 0.4, 0.7)
	s.add_child(legs)
	s.add_child(Mk.cyl(0.18, 0.24, 0.5, gold, Vector3(0, 1.4, 0), 10))
	s.add_child(Mk.ball(0.08, gold.darkened(0.1), Vector3(0, 1.3, 0.2), 8))
	s.add_child(Mk.ball(0.17, gold, Vector3(0, 1.8, 0), 12))
	s.add_child(Mk.ball(0.08, Color("3a3a50"), Vector3(0, 1.94, -0.02), 8))
	for side in [-1, 1]:
		s.add_child(Mk.box(Vector3(0.04, 0.012, 0.01), Color("5a4020"), Vector3(side * 0.06, 1.81, 0.165)))
	var halo := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.3
	tm.outer_radius = 0.36
	halo.mesh = tm
	halo.material_override = Mk.mat(Color("e8c060"))
	halo.rotation.x = PI / 2.0
	halo.position = Vector3(0, 1.8, -0.2)
	s.add_child(halo)


## 太師椅：座、高靠背（上緣圓弧）、扶手、四腳，面向 +z
func _chair(g: Node3D) -> void:
	var wood := Color("4a2e1e")
	g.add_child(Mk.box(Vector3(0.6, 0.07, 0.55), wood, Vector3(0, 0.48, 0)))
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			g.add_child(Mk.box(Vector3(0.06, 0.48, 0.06), wood, Vector3(sx * 0.26, 0.24, sz * 0.24)))
		# 扶手
		g.add_child(Mk.box(Vector3(0.05, 0.05, 0.5), wood, Vector3(sx * 0.29, 0.75, 0.0)))
		g.add_child(Mk.box(Vector3(0.05, 0.27, 0.05), wood, Vector3(sx * 0.29, 0.62, 0.22)))
	g.add_child(Mk.box(Vector3(0.6, 0.75, 0.06), wood, Vector3(0, 0.88, -0.26)))
	g.add_child(Mk.box(Vector3(0.3, 0.45, 0.065), Color("8a6440"), Vector3(0, 0.92, -0.26)))
	var crest := Mk.cyl(0.05, 0.05, 0.72, wood, Vector3(0, 1.28, -0.26), 6)
	crest.rotation.z = PI / 2.0
	g.add_child(crest)
	# 坐墊
	g.add_child(Mk.box(Vector3(0.48, 0.05, 0.44), Color("8a2e26"), Vector3(0, 0.53, 0.02)))


## 書架：三層，擺滿高矮、顏色不一的書，夾著幾卷畫軸
func _bookshelf(g: Node3D, w: int) -> void:
	var wood := Color("5a3a22")
	var bw := w - 0.15
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.06, 1.7, 0.42), wood, Vector3(sx * bw / 2.0, 0.85, -0.05)))
	g.add_child(Mk.box(Vector3(bw, 1.7, 0.03), wood.darkened(0.2), Vector3(0, 0.85, -0.25)))
	var colors := [Color("3a5a8a"), Color("8a3a3a"), Color("3a6a4a"), Color("8a6a3a"), Color("5a4a6a"), Color("d8c8a0")]
	for lv in 4:
		var y := 0.05 + lv * 0.52
		g.add_child(Mk.box(Vector3(bw, 0.05, 0.42), wood, Vector3(0, y, -0.05)))
		if lv == 3:
			break
		var x := -bw / 2.0 + 0.08
		var i := 0
		while x < bw / 2.0 - 0.1:
			var bwid := 0.05 + Mk.h01(lv, i) * 0.05
			var bh := 0.28 + Mk.h01(i, lv, 3) * 0.14
			if Mk.h01(i, lv, 9) < 0.15:
				# 一卷畫軸躺著
				var sc := Mk.cyl(0.04, 0.04, 0.34, Color("e8dcc0"), Vector3(x + 0.17, y + 0.07, -0.02), 8)
				sc.rotation.z = PI / 2.0
				g.add_child(sc)
				x += 0.38
			else:
				g.add_child(Mk.box(Vector3(bwid, bh, 0.3), colors[(i + lv * 2) % colors.size()], Vector3(x + bwid / 2.0, y + 0.025 + bh / 2.0, -0.05)))
				x += bwid + 0.01
			i += 1


## 打鐵的火爐：磚砌爐台、燒紅的炭、往上收的煙罩、旁邊的風箱；有一盞橘色的光
func _forge(g: Node3D, w: int) -> void:
	var brick := Color("7a5a4a")
	g.add_child(Mk.box(Vector3(w - 0.2, 0.75, 0.85), brick, Vector3(0, 0.375, -0.05)))
	for k in 3:
		g.add_child(Mk.box(Vector3(w - 0.18, 0.015, 0.87), brick.darkened(0.25), Vector3(0, 0.2 + k * 0.2, -0.05)))
	g.add_child(Mk.box(Vector3(0.9, 0.08, 0.55), Color("3a2a24"), Vector3(-0.15, 0.78, -0.05)))
	for k in 9:
		var coal := Mk.ball(0.06, Color("ff6a2a"), Vector3(-0.45 + (k % 3) * 0.25 + Mk.h01(k, 1) * 0.08, 0.84, -0.2 + (k / 3) * 0.15), 5)
		var m := coal.material_override.duplicate() as StandardMaterial3D
		m.emission_enabled = true
		m.emission = Color("ff4a1a")
		m.emission_energy_multiplier = 1.5
		coal.material_override = m
		g.add_child(coal)
	# 煙罩：一路收到牆頂
	var hood := Mk.cyl(0.25, 0.55, 0.6, brick.darkened(0.1), Vector3(-0.15, 1.45, -0.15), 4)
	hood.rotation.y = PI / 4.0
	g.add_child(hood)
	g.add_child(Mk.box(Vector3(0.36, 0.5, 0.36), brick.darkened(0.1), Vector3(-0.15, 1.95, -0.15)))
	# 風箱
	g.add_child(Mk.box(Vector3(0.4, 0.3, 0.55), Color("7a5636"), Vector3(w / 2.0 - 0.3, 0.95, -0.05)))
	g.add_child(Mk.box(Vector3(0.04, 0.04, 0.3), Color("5a3a22"), Vector3(w / 2.0 - 0.3, 0.95, 0.35)))
	var light := OmniLight3D.new()
	light.light_color = Color("ff8a3a")
	light.omni_range = 4.0
	light.light_energy = 1.4
	light.position = Vector3(-0.15, 1.2, 0.4)
	g.add_child(light)


## 兵器架：兩根柱子、上下兩道橫桿，插著長槍、大刀、劍
func _weapon_rack(g: Node3D, w: int) -> void:
	var wood := Color("5a3a22")
	var rw := w - 0.2
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.08, 1.6, 0.08), wood, Vector3(sx * rw / 2.0, 0.8, -0.15)))
		g.add_child(Mk.box(Vector3(0.1, 0.06, 0.4), wood, Vector3(sx * rw / 2.0, 0.03, -0.05)))
	for y in [0.35, 1.3]:
		g.add_child(Mk.box(Vector3(rw, 0.06, 0.06), wood, Vector3(0, y, -0.15)))
	for i in 6:
		var x := -rw / 2.0 + 0.2 + i * (rw - 0.4) / 5.0
		match i % 3:
			0:
				# 長槍
				g.add_child(Mk.cyl(0.018, 0.02, 1.7, Color("7a5636"), Vector3(x, 0.85, -0.1), 5))
				g.add_child(Mk.cone(0.035, 0.18, Color("c8ccd4"), Vector3(x, 1.79, -0.1), 4))
				g.add_child(Mk.ball(0.04, Color("c8302a"), Vector3(x, 1.66, -0.1), 5))
			1:
				# 大刀
				g.add_child(Mk.cyl(0.018, 0.018, 1.0, Color("5a3a22"), Vector3(x, 0.5, -0.1), 5))
				g.add_child(Mk.box(Vector3(0.1, 0.42, 0.015), Color("c8ccd4"), Vector3(x + 0.03, 1.2, -0.1)))
			2:
				# 劍
				g.add_child(Mk.box(Vector3(0.035, 0.75, 0.012), Color("d8dce4"), Vector3(x, 0.95, -0.1)))
				g.add_child(Mk.box(Vector3(0.12, 0.025, 0.03), Color("c9a46a"), Vector3(x, 0.57, -0.1)))
				g.add_child(Mk.box(Vector3(0.03, 0.14, 0.03), Color("3a2a1a"), Vector3(x, 0.48, -0.1)))


## 床：木床架、床褥、花被、枕頭、四根床柱與床楣
func _bed(g: Node3D, w: int) -> void:
	var wood := Color("7a5232")
	var bl := w - 0.15
	g.add_child(Mk.box(Vector3(bl, 0.35, 0.85), wood, Vector3(0, 0.175, -0.02)))
	g.add_child(Mk.box(Vector3(bl - 0.08, 0.1, 0.78), Color("efe6d2"), Vector3(0, 0.4, -0.02)))
	g.add_child(Mk.box(Vector3(bl * 0.62, 0.1, 0.8), Color("8a4a5a"), Vector3(0.2, 0.47, -0.02)))
	for k in 3:
		g.add_child(Mk.box(Vector3(0.04, 0.105, 0.8), Color("e8b860"), Vector3(-0.15 + k * 0.25, 0.475, -0.02)))
	g.add_child(Mk.box(Vector3(0.3, 0.1, 0.5), Color("d8e0e8"), Vector3(-bl / 2.0 + 0.25, 0.5, -0.02)))
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			g.add_child(Mk.box(Vector3(0.06, 1.6, 0.06), wood, Vector3(sx * (bl / 2.0 - 0.03), 0.8, -0.02 + sz * 0.4)))
	g.add_child(Mk.box(Vector3(bl, 0.12, 0.06), wood, Vector3(0, 1.55, 0.38)))
	g.add_child(Mk.box(Vector3(bl, 0.06, 0.86), wood, Vector3(0, 1.6, -0.02)))
	# 半掛的床帳
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.22, 1.05, 0.02), Color("e8dcc4"), Vector3(sx * (bl / 2.0 - 0.18), 1.05, 0.39)))


## 搖籃：木頭籃身、底下兩道弧形搖腳、裡面包著小被的娃娃
func _cradle(g: Node3D) -> void:
	var wood := Color("9a7246")
	g.add_child(Mk.box(Vector3(0.6, 0.28, 0.42), wood, Vector3(0, 0.33, 0)))
	g.add_child(Mk.box(Vector3(0.52, 0.2, 0.34), Color("efe6d2"), Vector3(0, 0.42, 0)))
	for sx in [-1, 1]:
		var rocker := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.38
		tm.outer_radius = 0.42
		tm.rings = 16
		tm.ring_segments = 4
		rocker.mesh = tm
		rocker.material_override = Mk.mat(wood.darkened(0.2))
		rocker.rotation.z = PI / 2.0
		rocker.scale = Vector3(1, 1, 1)
		rocker.position = Vector3(sx * 0.0, 0.48, sx * 0.17)
		rocker.rotation = Vector3(0, 0, 0)
		rocker.rotation.x = PI / 2.0
		g.add_child(rocker)
		g.add_child(Mk.box(Vector3(0.04, 0.2, 0.04), wood, Vector3(-0.25, 0.15, sx * 0.17)))
		g.add_child(Mk.box(Vector3(0.04, 0.2, 0.04), wood, Vector3(0.25, 0.15, sx * 0.17)))
	g.add_child(Mk.ball(0.08, Color("f2c9a0"), Vector3(-0.14, 0.53, 0), 8))
	var quilt := Mk.ball(0.14, Color("e86a7a"), Vector3(0.06, 0.52, 0), 8)
	quilt.scale = Vector3(1.4, 0.6, 1)
	g.add_child(quilt)


## 灶：磚砌灶台、兩口鍋（一口蓋著木蓋冒煙）、灶口的火光、通到牆頂的煙囪、旁邊的柴
func _stove(g: Node3D, w: int) -> void:
	var brick := Color("a8968a")
	g.add_child(Mk.box(Vector3(w - 0.15, 0.75, 0.8), brick, Vector3(0, 0.375, -0.05)))
	g.add_child(Mk.box(Vector3(w - 0.1, 0.06, 0.84), Color("8a7a6e"), Vector3(0, 0.77, -0.05)))
	for sx in [-1, 1]:
		var cx: float = sx * 0.45
		var wok := Mk.ball(0.26, Color("2a2a30"), Vector3(cx, 0.8, -0.05), 10)
		wok.scale = Vector3(1, 0.35, 1)
		g.add_child(wok)
		# 灶口（下面的火光）
		var fire := Mk.box(Vector3(0.24, 0.18, 0.02), Color("ff7a2a"), Vector3(cx, 0.2, 0.36))
		var m := fire.material_override.duplicate() as StandardMaterial3D
		m.emission_enabled = true
		m.emission = Color("ff5a1a")
		m.emission_energy_multiplier = 1.2
		fire.material_override = m
		g.add_child(fire)
	g.add_child(Mk.cyl(0.24, 0.24, 0.04, Color("8a6440"), Vector3(-0.45, 0.9, -0.05), 10))
	g.add_child(Mk.box(Vector3(0.12, 0.04, 0.04), Color("5a3a22"), Vector3(-0.45, 0.94, -0.05)))
	g.add_child(Mk.cyl(0.08, 0.08, 1.4, brick.darkened(0.1), Vector3(w / 2.0 - 0.2, 1.4, -0.3), 8))
	for k in 3:
		var log := Mk.cyl(0.05, 0.05, 0.5, Color("8a6440"), Vector3(-w / 2.0 + 0.1, 0.06 + k * 0.09, 0.4 - k * 0.02), 6)
		log.rotation.x = PI / 2.0
		g.add_child(log)


func _teapot(g: Node3D, at: Vector3) -> void:
	var body := Mk.ball(0.12, Color("8a5a3a"), at + Vector3(0, 0.09, 0), 10)
	body.scale = Vector3(1, 0.8, 1)
	g.add_child(body)
	var spout := Mk.cyl(0.015, 0.03, 0.14, Color("8a5a3a"), at + Vector3(0.14, 0.12, 0), 5)
	spout.rotation.z = -0.9
	g.add_child(spout)
	g.add_child(Mk.ball(0.03, Color("6a3a22"), at + Vector3(0, 0.2, 0), 5))


## 主角與屋裡的人（站在原地，說網頁版的台詞）
func _people() -> void:
	_place_hero(data.spawn)
	for n in data.npcs:
		var f := Chibi.make(LOOK_BY_ID.get(n.id, n.sprite))
		add_child(f)
		f.position = w3(n.x, n.y)
		var face := _facing_vec(n.facing)
		f.face(face)
		var lb := Mk.label(n.name, 26, Color("fffbe8"))
		lb.position.y = 1.3
		f.add_child(lb)
		blocked[Vector2i(n.x, n.y)] = true
		walkers.append({"f": f, "id": n.id, "name": n.name, "lines": n.talks, "home": Vector2(n.x + 0.5, n.y + 0.5), "goal": null, "wait": 0.0,
			"fixed": true, "said": 0, "talking": false, "face": face, "def": n, "hidden": false})


## 只立背對鏡頭的兩道牆：鏡頭在東南就留北、西兩面，以此類推；轉角有一面立著就立著
func _process(dt: float) -> void:
	super._process(dt)
	var c := Vector3(sin(rig.yaw), 0, cos(rig.yaw))
	var shown := {"n": c.z > 0.01, "s": c.z < -0.01, "w": c.x > 0.01, "e": c.x < -0.01}
	# 剛進屋的第一格畫面直接到位（不要讓靠鏡頭的牆先出現再消失）
	var k := minf(1.0, dt * 10.0) if _settled else 1.0
	_settled = true
	for sd in sides:
		_raise(sides[sd], shown[sd], k)
	for cn in corners:
		_raise(cn.node, cn.sides.any(func(x): return shown[x]), k)


func _raise(n: Node3D, up: bool, k: float) -> void:
	n.scale.y = lerp(n.scale.y, 1.0 if up else 0.0, k)
	n.visible = n.scale.y > 0.02


## 對著門按空白鍵：回到村裡的門口
func _interact(t: Dictionary) -> void:
	if t.kind == "prop" and t.p.def.has("exit"):
		main.hop(t.p.def.exit.to, t.p.def.exit.spawn)
		return
	await super._interact(t)


func info_text() -> String:
	return "%s　%s\n銀兩 %d" % [data.name, data.subtitle, G.silver]
