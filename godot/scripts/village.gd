class_name Village
extends Node3D
## 青竹村：讀網頁版匯出的地圖資料（data/qingzhu.json：字元格子、建築、擺設、村民與台詞），蓋成立體的村子。
## - 山（^）依周圍有幾格山而隆起，水（~）往下凹，路、田、廣場貼在地面上。
## - 主角用方向鍵走（相對鏡頭方向），Shift 跑；村民在自己的位置附近走動，攤販站著不動。
## - 面對村民、擺設時頭上冒出「E 交談／E 查看」，按 E 對話；陶四、鍾嬸可以買賣東西。

const GROUND := {":": "c9a46a", "E": "c9a46a", "=": "b9b3a4", "n": "8a6040", "c": "7a5a3a", "g": "8b5e3c", "~": "3a5f86", "#": "a8763f"}

## 顧攤子的人：站哪、面向哪、賣什麼（貨郎照網頁版陶四的貨）
const STALLS := {
	"tao": {"x": 32, "y": 22, "face": Vector3(-1, 0, 0), "title": "陶四的貨郎攤", "stock": ["jinchuang", "tea", "herb", "rice", "flour", "egg", "greens", "sugar"], "greet": "走過路過不要錯過！傷藥、茶葉、草藥，樣樣都有。獸皮、獸肉也收！"},
	"zhong": {"x": 32, "y": 17, "face": Vector3(0, 0, 1), "title": "鍾嬸的茶攤", "stock": ["tea", "egg"], "greet": "來啦！坐下喝碗茶歇歇腳？"},
}
const PROP_TEXT := {
	"well": [{"text": "一口老井，井水清涼。"}],
	"stele": [{"text": "路邊的石碑，字跡被風雨磨得模糊了。"}],
	"stall": [{"text": "攤子上擺著些雜貨。"}],
	"lantern_post": [{"text": "竹竿上掛著紅燈籠，夜裡會點起來。"}],
}

var ui: Ui
var rig: CamRig
var data: Dictionary
var W := 0
var H := 0
var ox := 0.0
var oz := 0.0
var blocked := {}
var heights := []
var hero: Chibi
var walkers: Array = []
var props: Array = []
var hint: Label3D
var lamps: Array[OmniLight3D] = []
var lamp_mats: Array[StandardMaterial3D] = []


func setup(u: Ui, r: CamRig) -> void:
	ui = u
	rig = r


func _ready() -> void:
	var f := FileAccess.open("res://data/qingzhu.json", FileAccess.READ)
	data = JSON.parse_string(f.get_as_text())
	var tiles: Array = data.tiles
	H = tiles.size()
	W = (tiles[0] as String).length()
	ox = -W / 2.0
	oz = -H / 2.0
	for y in H:
		for x in W:
			if (data.blocking as String).contains(tile(x, y)):
				blocked[Vector2i(x, y)] = true
	_heights()
	_ground()
	_plants()
	for b in data.buildings:
		_building(b)
	for p in data.props:
		_prop(p)
	_people()
	hint = Mk.label("E 交談", 34, Color("17141f"), Color("f0c860"))
	hint.visible = false
	add_child(hint)


func tile(x: int, y: int) -> String:
	if y < 0 or y >= H or x < 0 or x >= W:
		return "^"
	return (data.tiles[y] as String)[x]


## 格子中心的世界座標
func w3(x: float, y: float, h := 0.0) -> Vector3:
	return Vector3(x + 0.5 + ox, h, y + 0.5 + oz)


func _heights() -> void:
	heights = []
	for y in H:
		var row := []
		for x in W:
			var c := tile(x, y)
			var h := 0.0
			if c == "~":
				h = -0.4
			elif c == "^":
				var n := 0
				for dy in range(-2, 3):
					for dx in range(-2, 3):
						if tile(x + dx, y + dy) == "^":
							n += 1
				h = 0.6 + n / 25.0 * 2.2 + Mk.h01(x, y, 3) * 0.5
			row.append(h)
		heights.append(row)


func _h(x: int, y: int) -> float:
	if y < 0 or y >= H or x < 0 or x >= W:
		return -1.0
	return heights[y][x]


## 地面：每格一個頂面，比鄰格高就補側面（平面著色、頂點顏色）
func _ground() -> void:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var quad := func(p: Array, col: Color) -> void:
		for i in [0, 1, 2, 0, 2, 3]:
			st.set_color(col)
			st.add_vertex(p[i])
	for y in H:
		for x in W:
			var c := tile(x, y)
			var h: float = heights[y][x]
			var x0 := x + ox
			var z0 := y + oz
			var v := Mk.h01(x, y)
			var top: Color
			if c == "^":
				top = Color("8e8a78").lerp(Color("b4ae98"), min(1.0, h / 3.0)) * (0.92 + v * 0.12)
			elif GROUND.has(c):
				top = Color(GROUND[c]) * (0.95 + v * 0.1)
			else:
				top = Color("7cb262").lerp(Color("93c271"), v)
			if c == "n" and y % 2 == 1:
				top = top * 0.85
			top.a = 1.0
			quad.call([Vector3(x0, h, z0), Vector3(x0 + 1, h, z0), Vector3(x0 + 1, h, z0 + 1), Vector3(x0, h, z0 + 1)], top)
			var side := top * (0.72 if c == "^" else 0.6)
			side.a = 1.0
			var dirs := [
				[0, -1, Vector3(x0 + 1, 0, z0), Vector3(x0, 0, z0)],
				[1, 0, Vector3(x0 + 1, 0, z0 + 1), Vector3(x0 + 1, 0, z0)],
				[0, 1, Vector3(x0, 0, z0 + 1), Vector3(x0 + 1, 0, z0 + 1)],
				[-1, 0, Vector3(x0, 0, z0), Vector3(x0, 0, z0 + 1)],
			]
			for d in dirs:
				var nh := _h(x + d[0], y + d[1])
				if nh >= h:
					continue
				var a: Vector3 = d[2]
				var b: Vector3 = d[3]
				quad.call([Vector3(a.x, h, a.z), Vector3(b.x, h, b.z), Vector3(b.x, nh, b.z), Vector3(a.x, nh, a.z)], side)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = Mk.vmat()
	add_child(mi)
	# 水面
	var water := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(W, H)
	water.mesh = pm
	var wm := StandardMaterial3D.new()
	wm.albedo_color = Color(0.29, 0.55, 0.78, 0.82)
	wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wm.roughness = 0.15
	wm.metallic_specular = 0.8
	water.material_override = wm
	water.position.y = -0.12
	add_child(water)


func _plants() -> void:
	var cyl := func(top: float, bot: float, h: float, sides: int, lift: float) -> Mesh:
		var m := CylinderMesh.new()
		m.top_radius = top
		m.bottom_radius = bot
		m.height = h
		m.radial_segments = sides
		m.rings = 1
		var st := SurfaceTool.new()
		st.create_from(m, 0)
		var arr := st.commit_to_arrays()
		var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		for i in verts.size():
			verts[i].y += lift
		arr[Mesh.ARRAY_VERTEX] = verts
		var out := ArrayMesh.new()
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		return out
	var trunk := Mk.Batch.new(cyl.call(0.07, 0.11, 0.6, 5, 0.3), Color("6a4a2a"))
	var pine_a := Mk.Batch.new(cyl.call(0.0, 0.5, 0.9, 7, 0.75))
	var pine_b := Mk.Batch.new(cyl.call(0.0, 0.36, 0.7, 7, 1.2))
	var ico := SphereMesh.new()
	ico.radius = 0.52
	ico.height = 1.04
	ico.radial_segments = 6
	ico.rings = 3
	var round_tree := Mk.Batch.new(ico)
	var cane := Mk.Batch.new(cyl.call(0.035, 0.04, 1.0, 5, 0.5), Color("7aa648"))
	var leaf := Mk.Batch.new(cyl.call(0.0, 0.22, 0.4, 5, 0.0), Color("5a8a32"))
	var rock_m := SphereMesh.new()
	rock_m.radius = 0.34
	rock_m.height = 0.5
	rock_m.radial_segments = 5
	rock_m.rings = 2
	var rock := Mk.Batch.new(rock_m, Color("8e8a80"))
	var fl := SphereMesh.new()
	fl.radius = 0.06
	fl.height = 0.12
	fl.radial_segments = 5
	fl.rings = 3
	var flower := Mk.Batch.new(fl)
	var sprout := Mk.Batch.new(cyl.call(0.0, 0.04, 0.2, 4, 0.1), Color("86c255"))
	var bm := SphereMesh.new()
	bm.radius = 0.3
	bm.height = 0.6
	bm.radial_segments = 7
	bm.rings = 4
	var bush := Mk.Batch.new(bm, Color("3f7a34"))
	var post_m := BoxMesh.new()
	post_m.size = Vector3(0.1, 0.5, 0.1)
	var post := Mk.Batch.new(post_m, Color("9a6a3a"))
	var rx := BoxMesh.new()
	rx.size = Vector3(1, 0.06, 0.05)
	var rail_x := Mk.Batch.new(rx, Color("9a6a3a"))
	var rz := BoxMesh.new()
	rz.size = Vector3(0.05, 0.06, 1)
	var rail_z := Mk.Batch.new(rz, Color("9a6a3a"))
	var flowers := [Color("f2c230"), Color("ffffff"), Color("e86a92"), Color("e8603c")]
	for y in H:
		for x in W:
			var c := tile(x, y)
			var r := Mk.h01(x, y, 9)
			var p := w3(x, y)
			match c:
				"T":
					var s := 0.85 + r * 0.35
					trunk.add(p, Vector3.ONE * s)
					if y < 8 or tile(x, y - 1) == "^" or r < 0.25:
						var g := Color("2f6a3a") * (0.85 + r * 0.3)
						g.a = 1
						pine_a.add(p, Vector3.ONE * s, r * 6, g)
						pine_b.add(p, Vector3.ONE * s, r * 6, g)
					else:
						round_tree.add(p + Vector3(0, 0.95 * s, 0), Vector3.ONE * s, r * 6, Color("4f9a48").lerp(Color("6aae4a"), r))
				"Y":
					for i in 4:
						var q := p + Vector3((Mk.h01(x, y, i) - 0.5) * 0.6, 0, (Mk.h01(x, y, i + 9) - 0.5) * 0.6)
						var hh := 1.4 + Mk.h01(x, y, i + 20) * 0.7
						cane.add(q, Vector3(1, hh, 1))
						leaf.add(q + Vector3(0, hh, 0), Vector3.ONE, i)
				"o":
					rock.add(p + Vector3(0, 0.12, 0), Vector3(1, 0.7, 1), r * 6)
				"*":
					for i in 5:
						flower.add(p + Vector3(Mk.h01(x, y, i) - 0.5, 0.08, Mk.h01(x, y, i + 5) - 0.5), Vector3.ONE, 0, flowers[(i + x) % 4])
				"n":
					for i in 3:
						for j in 3:
							sprout.add(p + Vector3(i * 0.3 - 0.3, 0, j * 0.3 - 0.3), Vector3.ONE * (0.8 + Mk.h01(x + i, y + j) * 0.5))
				"c":
					for dx in [-0.25, 0.25]:
						bush.add(p + Vector3(dx, 0.15, 0), Vector3(1, 0.7, 1.2))
				"f":
					post.add(p + Vector3(0, 0.25, 0))
					if tile(x + 1, y) == "f":
						rail_x.add(p + Vector3(0.5, 0.35, 0))
					if tile(x, y + 1) == "f":
						rail_z.add(p + Vector3(0, 0.35, 0.5))
	for b in [trunk, pine_a, pine_b, round_tree, cane, leaf, rock, flower, sprout, bush, post, rail_x, rail_z]:
		var mi: MultiMeshInstance3D = b.build()
		if mi:
			add_child(mi)


## 房子：台基、牆、柱、門窗、人字屋頂、匾額與幌子、燈籠
func _building(b: Dictionary) -> void:
	var st: Dictionary = b.st
	var w: float = st.w
	var d: float = st.h
	var root := Node3D.new()
	root.position = Vector3(b.x + ox, 0, b.y + oz)
	add_child(root)
	for yy in range(int(b.y), int(b.y + d)):
		for xx in range(int(b.x), int(b.x + w)):
			blocked[Vector2i(xx, yy)] = true
	var wall := Color(st.get("wall", "e8dcc4"))
	var timber := Color(st.get("timber", "6a4428"))
	var cx := w / 2.0
	var front := d - 0.25
	var depth := d - 1.0
	var cz := front - depth / 2.0
	var wall_h := 1.5
	root.add_child(Mk.box(Vector3(w - 0.1, 0.18, depth + 0.3), Color("a8a296"), Vector3(cx, 0.09, cz)))
	root.add_child(Mk.box(Vector3(w - 0.5, wall_h, depth - 0.2), wall, Vector3(cx, 0.18 + wall_h / 2.0, cz)))
	# 柱子
	for px in [0.25, w - 0.25]:
		for pz in [cz - depth / 2.0 + 0.1, cz + depth / 2.0 - 0.1]:
			root.add_child(Mk.box(Vector3(0.16, wall_h + 0.1, 0.16), timber, Vector3(px, 0.18 + wall_h / 2.0, pz)))
	root.add_child(Mk.box(Vector3(w - 0.3, 0.12, 0.14), timber, Vector3(cx, 0.18 + wall_h, cz + depth / 2.0 - 0.08)))
	# 門與窗
	var door_x: float = st.door + 0.5
	var fz := cz + (depth - 0.2) / 2.0 + 0.01
	root.add_child(Mk.box(Vector3(0.8, 1.05, 0.06), Color(st.get("doorPaint", "5a3a22")), Vector3(door_x, 0.18 + 0.525, fz)))
	for wx in range(1, int(w) - 1):
		if absf(wx + 0.5 - door_x) < 1.0:
			continue
		root.add_child(Mk.box(Vector3(0.55, 0.45, 0.05), Color("f0e2b8"), Vector3(wx + 0.5, 0.95, fz)))
		for i in 3:
			root.add_child(Mk.box(Vector3(0.03, 0.45, 0.06), timber, Vector3(wx + 0.35 + i * 0.15, 0.95, fz + 0.005)))
	# 屋頂
	var roof_h := 1.0 if w < 7 else 1.3
	root.add_child(Mk.roof(w + 0.4, depth + 0.9, roof_h, Color(st.roof), Vector3(cx, 0.18 + wall_h + roof_h / 2.0, cz)))
	root.add_child(Mk.box(Vector3(w + 0.5, 0.1, 0.16), Color(st.roofDark), Vector3(cx, 0.18 + wall_h + roof_h, cz)))
	if st.get("chimney", false):
		root.add_child(Mk.box(Vector3(0.3, 0.8, 0.3), Color("8a8478"), Vector3(w - 1.0, 0.18 + wall_h + roof_h, cz - 0.3)))
	# 匾額（店名）
	var sign_text: String = b.get("sign", "")
	if sign_text != "":
		var board := Mk.box(Vector3(0.3 + sign_text.length() * 0.28, 0.34, 0.05), Color("2a1f18"), Vector3(door_x, 1.45, fz + 0.06))
		root.add_child(board)
		var t := Label3D.new()
		t.text = sign_text
		t.font = Ui.font()
		t.font_size = 44
		t.pixel_size = 0.005
		t.modulate = Color("f0c860")
		t.outline_size = 0
		t.position = Vector3(door_x, 1.45, fz + 0.09)
		root.add_child(t)
	# 燈籠
	if st.get("lanterns", false):
		for lx in [door_x - 0.9, door_x + 0.9]:
			_lantern(root, Vector3(lx, 1.45, fz + 0.25))
	# 名字
	var name_lb := Mk.label(b.name, 36)
	name_lb.position = Vector3(cx, 0.18 + wall_h + roof_h + 0.6, cz)
	root.add_child(name_lb)


func _lantern(parent: Node3D, pos: Vector3) -> void:
	var m := StandardMaterial3D.new()
	m.albedo_color = Color("c8302a")
	m.emission_enabled = true
	m.emission = Color("ff5a2a")
	m.emission_energy_multiplier = 0.2
	var l := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.16
	sm.height = 0.42
	sm.radial_segments = 8
	sm.rings = 4
	l.mesh = sm
	l.material_override = m
	l.position = pos
	parent.add_child(l)
	lamp_mats.append(m)
	var light := OmniLight3D.new()
	light.position = pos
	light.light_color = Color("ffb070")
	light.omni_range = 3.5
	light.light_energy = 0.0
	parent.add_child(light)
	lamps.append(light)


## 擺設：井、告示欄、木牌、石碑、攤子、燈籠柱
func _prop(p: Dictionary) -> void:
	var w: int = p.w
	for i in w:
		blocked[Vector2i(p.x + i, p.y)] = true
	var g := Node3D.new()
	g.position = Vector3(p.x + w / 2.0 + ox, 0, p.y + 0.5 + oz)
	add_child(g)
	props.append({"node": g, "def": p, "at": Vector2(p.x + w / 2.0, p.y + 0.5)})
	match p.sprite:
		"lantern_post":
			g.add_child(Mk.cyl(0.05, 0.06, 1.6, Color("5a3a22"), Vector3(0, 0.8, 0), 5))
			_lantern(g, Vector3(0, 1.55, 0))
		"well":
			g.add_child(Mk.cyl(0.42, 0.45, 0.45, Color("8e8a80"), Vector3(0, 0.22, 0), 10))
			g.add_child(Mk.cyl(0.36, 0.36, 0.05, Color("2a4a6a"), Vector3(0, 0.4, 0), 10))
			var rf := Mk.cone(0.7, 0.4, Color("6a4a3a"), Vector3(0, 1.3, 0), 4)
			rf.rotation.y = PI / 4.0
			g.add_child(rf)
			for dx in [-0.4, 0.4]:
				g.add_child(Mk.box(Vector3(0.06, 1.1, 0.06), Color("6a4428"), Vector3(dx, 0.6, 0)))
		"stall":
			g.add_child(Mk.box(Vector3(w * 0.9, 0.5, 0.6), Color("8a6a42"), Vector3(0, 0.25, 0)))
			var canopy := Mk.box(Vector3(w, 0.06, 0.9), Color("c84a3a"), Vector3(0, 1.3, 0))
			canopy.rotation.x = 0.2
			g.add_child(canopy)
			for dx in [-w / 2.0 + 0.1, w / 2.0 - 0.1]:
				g.add_child(Mk.box(Vector3(0.06, 1.3, 0.06), Color("6a4428"), Vector3(dx, 0.65, -0.3)))
			for i in 4:
				g.add_child(Mk.ball(0.08, [Color("e8603c"), Color("86c255"), Color("f2c230"), Color("d8c8a0")][i], Vector3(-0.6 + i * 0.4, 0.56, 0), 6))
		"stele":
			g.add_child(Mk.box(Vector3(0.6, 1.2, 0.25), Color("8a8a86"), Vector3(0, 0.6, 0)))
			g.add_child(Mk.box(Vector3(0.75, 0.15, 0.4), Color("6a6a66"), Vector3(0, 0.07, 0)))
		"bulletin":
			g.add_child(Mk.box(Vector3(1.1, 0.6, 0.06), Color("d8c8a0"), Vector3(0, 1.0, 0)))
			g.add_child(Mk.box(Vector3(1.25, 0.08, 0.12), Color("5a3a22"), Vector3(0, 1.34, 0)))
			for dx in [-0.5, 0.5]:
				g.add_child(Mk.box(Vector3(0.07, 1.3, 0.07), Color("6a4428"), Vector3(dx, 0.65, -0.04)))
			var t := Mk.label("告示", 30, Color("3a2418"), Color(0, 0, 0, 0))
			t.billboard = BaseMaterial3D.BILLBOARD_DISABLED
			t.position = Vector3(0, 1.05, 0.04)
			g.add_child(t)
		_:
			g.add_child(Mk.box(Vector3(0.7, 0.4, 0.06), Color("b08a5a"), Vector3(0, 0.85, 0)))
			g.add_child(Mk.box(Vector3(0.07, 0.9, 0.07), Color("6a4428"), Vector3(0, 0.45, -0.04)))


func _free(x: int, y: int) -> bool:
	return x >= 0 and y >= 0 and x < W and y < H and not blocked.has(Vector2i(x, y))


## 主角與村民
func _people() -> void:
	hero = Chibi.make("hero")
	add_child(hero)
	hero.position = w3(data.spawn.x, data.spawn.y)
	var free_spots := (data.spots as Array).filter(func(s): return _free(s.x, s.y))
	var i := 0
	for n in data.people:
		var stall: Dictionary = STALLS.get(n.id, {})
		var s = {"x": stall.x, "y": stall.y} if not stall.is_empty() else (free_spots[(i * 5) % free_spots.size()] if free_spots.size() > 0 else null)
		i += 1
		if s == null:
			continue
		var f := Chibi.make(n.sprite)
		add_child(f)
		f.position = w3(s.x, s.y)
		if not stall.is_empty():
			f.face(stall.face)
		else:
			f.rotation.y = Mk.h01(s.x, s.y) * TAU
		var lb := Mk.label(n.name, 30, Color("fffbe8"))
		lb.position.y = 1.3
		f.add_child(lb)
		walkers.append({"f": f, "npc": n, "home": Vector2(s.x + 0.5, s.y + 0.5), "goal": null, "wait": randf() * 3.0, "fixed": not stall.is_empty(), "said": 0, "talking": false})
	rig.target = hero


func _grid(p: Vector3) -> Vector2i:
	return Vector2i(floori(p.x - ox), floori(p.z - oz))


## 走得過去嗎（主角以 0.25 的半徑檢查四個角）
func _walkable(p: Vector3, r := 0.25) -> bool:
	for c in [Vector3(-r, 0, -r), Vector3(r, 0, -r), Vector3(-r, 0, r), Vector3(r, 0, r)]:
		var g := _grid(p + c)
		if not _free(g.x, g.y):
			return false
	return true


func _process(dt: float) -> void:
	if hero == null:
		return
	var busy := ui.busy()
	# 主角
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
	# 村民：在家附近走走停停；正在說話的停下來看著你
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


## 主角面前的對象：村民優先，再來是擺設
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
	hint.visible = not t.is_empty()
	if hint.visible:
		hint.text = "E 交談" if t.kind == "npc" else "E 查看"
		hint.position = t.at + Vector3(0, 1.75, 0)


func _unhandled_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo or ui.busy():
		return
	if e.keycode in [KEY_E, KEY_SPACE, KEY_ENTER]:
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
	var npc: Dictionary = w.npc
	var stall: Dictionary = STALLS.get(npc.id, {})
	var pool: Array = npc.lines
	var lines: Array = pool[w.said % pool.size()]
	w.said += 1
	var out := []
	for l in lines:
		out.append({"speaker": l.get("speaker", npc.name), "text": _fill(l.text)})
	if stall.is_empty():
		await ui.say(out)
	else:
		var c := await ui.ask({"speaker": npc.name, "text": stall.greet}, ["聊聊", "買賣東西", "沒事"])
		if c == 0:
			await ui.say(out)
		elif c == 1:
			await ui.shop(stall.title, stall.stock)
		f.face(stall.face)
	w.talking = false


func info_text() -> String:
	return "%s　%s\n銀兩 %d" % [data.name, data.subtitle, ui.silver]
