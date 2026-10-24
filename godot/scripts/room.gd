class_name Room
extends GridScene
## 室內：讀網頁版匯出的房間（data/<id>.json：牆 W、地板 _、出口 E，家具與屋裡的人），蓋成一間沒有屋頂的屋子。
## - 鏡頭固定斜 45 度看：只立著背對鏡頭的那兩道牆，靠鏡頭的兩道牆拿掉；轉鏡頭（每次 90 度）就換成新的那兩道。
## - 木地板、牆腳、樑柱、窗、掛軸、吊燈籠；家具照網頁版的擺設名做（櫃台、茶罐架、方桌與板凳、盆景）。
## - 屋裡的人站在原地，按空白鍵交談（說網頁版的台詞）；對著門口按空白鍵就回村裡。

const WALL_H := 2.1

var data: Dictionary
var room_id := ""
## 四面牆各一個節點（n 北、s 南、w 西、e 東），牆上的窗、掛軸、門框掛在所屬那面牆底下，一起立起或收掉
var sides := {}
## 轉角：{node, sides: [兩面牆]}，有一面立著就立著
var corners: Array = []


func open(id: String) -> void:
	room_id = id


func _ready() -> void:
	var f := FileAccess.open("res://data/%s.json" % room_id, FileAccess.READ)
	data = JSON.parse_string(f.get_as_text())
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
	_people()


func tile(x: int, y: int) -> String:
	if y < 0 or y >= H or x < 0 or x >= W:
		return "W"
	return (data.tiles[y] as String)[x]


## 木地板：一條條木板，顏色略有深淺；屋外一圈暗色地面
func _floor() -> void:
	var outside := Mk.box(Vector3(W + 30, 0.1, H + 30), Color("2a2620"), Vector3(0, -0.12, 0))
	add_child(outside)
	var planks := [Color("b08458"), Color("a87c50"), Color("b88c5e")]
	for y in H:
		for x in W:
			var c := tile(x, y)
			if c == "W":
				continue
			var col: Color = planks[(x * 7 + y * 3) % 3]
			if c == "E":
				col = Color("8a8478")
			# 地板一格接一格（不留縫，不然每格都會被描邊），木紋用兩條深色細線
			add_child(Mk.box(Vector3(1.0, 0.1, 1.0), col, w3(x, y, -0.05)))
			if c != "E":
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
			seg.add_child(Mk.box(Vector3(1.0, WALL_H, 1.0), Color("e8dcc4"), Vector3(0, WALL_H / 2.0, 0)))
			seg.add_child(Mk.box(Vector3(1.02, 0.3, 1.02), Color("6a4a32"), Vector3(0, 0.15, 0)))
			# 牆頂的木條（略高於牆面，避免兩個面疊在同一個高度上閃爍）
			seg.add_child(Mk.box(Vector3(1.04, 0.08, 1.04), Color("5a3a22"), Vector3(0, WALL_H + 0.03, 0)))
			if on.size() >= 2:
				add_child(seg)
				corners.append({"node": seg, "sides": on})
			elif on.size() == 1:
				sides[on[0]].add_child(seg)
	# 門框（在門所在的那面牆上）
	for e in data.exits:
		var t: Array = e.tiles[0]
		for dx in [-0.48, 0.48]:
			sides["s"].add_child(Mk.box(Vector3(0.14, WALL_H, 0.2), Color("5a3a22"), w3(t[0], t[1], WALL_H / 2.0) + Vector3(dx, 0, 0)))


## 格子窗：掛在某面牆的內側（normal 是朝屋裡的方向）
func _window(side: String, at: Vector3, normal: Vector3) -> void:
	var g := Node3D.new()
	g.position = at
	g.rotation.y = atan2(normal.x, normal.z)
	g.add_child(Mk.box(Vector3(1.0, 0.7, 0.04), Color("f0e2b8"), Vector3.ZERO))
	for i in 4:
		g.add_child(Mk.box(Vector3(0.03, 0.7, 0.06), Color("6a4428"), Vector3(-0.36 + i * 0.24, 0, 0.02)))
	g.add_child(Mk.box(Vector3(1.0, 0.03, 0.06), Color("6a4428"), Vector3(0, 0, 0.02)))
	sides[side].add_child(g)


## 牆上的東西：四面牆都有窗（轉到哪個方向都看得到）、北牆正中掛軸、吊燈籠（夜裡亮）
func _decor() -> void:
	var back_z := oz + 1.0
	for x in [W / 2.0 - 2.5, W / 2.0 + 2.5]:
		_window("n", Vector3(ox + x, 1.3, back_z + 0.02), Vector3(0, 0, 1))
	_window("w", Vector3(ox + 1.02, 1.3, oz + H / 2.0), Vector3(1, 0, 0))
	_window("e", Vector3(ox + W - 1.02, 1.3, oz + H / 2.0), Vector3(-1, 0, 0))
	# 北牆正中的掛軸（山水）
	var sx := ox + W / 2.0
	var n: Node3D = sides["n"]
	n.add_child(Mk.box(Vector3(0.6, 1.0, 0.03), Color("f4ecd8"), Vector3(sx, 1.35, back_z + 0.02)))
	n.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(sx, 1.87, back_z + 0.03)))
	n.add_child(Mk.box(Vector3(0.66, 0.05, 0.05), Color("5a3a22"), Vector3(sx, 0.83, back_z + 0.03)))
	for i in 3:
		var hill := Mk.cone(0.14 + i * 0.03, 0.3, Color("6a7a7a"), Vector3(sx - 0.15 + i * 0.15, 1.3, back_z + 0.05), 3)
		hill.rotation.x = PI / 2.0
		hill.scale = Vector3(1, 1, 0.2)
		n.add_child(hill)
	# 吊燈籠（兩盞）與暖光
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
	add_child(g)
	props.append({"node": g, "def": p, "at": Vector2(p.x + w / 2.0, p.y + 0.5)})
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
		_:
			g.add_child(Mk.box(Vector3(w * 0.8, 0.8, 0.6), wood, Vector3(0, 0.4, 0)))


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
		var f := Chibi.make(n.sprite)
		add_child(f)
		f.position = w3(n.x, n.y)
		var face := _facing_vec(n.facing)
		f.face(face)
		var lb := Mk.label(n.name, 26, Color("fffbe8"))
		lb.position.y = 1.3
		f.add_child(lb)
		blocked[Vector2i(n.x, n.y)] = true
		walkers.append({"f": f, "name": n.name, "lines": n.talks, "home": Vector2(n.x + 0.5, n.y + 0.5), "goal": null, "wait": 0.0, "fixed": true, "said": 0, "talking": false, "face": face})


## 只立背對鏡頭的兩道牆：鏡頭在東南就留北、西兩面，以此類推；轉角有一面立著就立著
func _process(dt: float) -> void:
	super._process(dt)
	var c := Vector3(sin(rig.yaw), 0, cos(rig.yaw))
	var shown := {"n": c.z > 0.01, "s": c.z < -0.01, "w": c.x > 0.01, "e": c.x < -0.01}
	var k := minf(1.0, dt * 10.0)
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
		main.go(t.p.def.exit.to, t.p.def.exit.spawn)
		return
	await super._interact(t)


func info_text() -> String:
	return "%s　%s\n銀兩 %d" % [data.name, data.subtitle, ui.silver]
