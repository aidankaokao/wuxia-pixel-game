class_name FineProps
## 精細版的擺設（跟 fine_house.gd 同一套做法）：水井、攤子、燈籠柱、告示欄。
## g 是擺設的節點（原點在擺設佔地的中心、地面上），v 是村子（燈籠要登記才會隨時辰亮）。


## 小小的兩面坡瓦頂：屋脊沿 x，寬 w、深 dd，屋脊高 ridge、簷高 eave
static func _tiny_roof(g: Node3D, w: float, dd: float, ridge: float, eave: float, roof: Color, dark: Color) -> void:
	var tube := CylinderMesh.new()
	tube.top_radius = 1.0
	tube.bottom_radius = 1.0
	tube.height = 1.0
	tube.radial_segments = 5
	tube.rings = 1
	var tiles := Mk.Batch.new(tube, roof)
	for side in [-1, 1]:
		var a := Vector3(0, ridge, 0)
		var b := Vector3(0, eave, side * dd / 2.0)
		var slab := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(1, 1, 1)
		slab.mesh = bm
		slab.material_override = Mk.mat(dark)
		var t := Mk.span(a, b, Vector2(w, 0.04))
		slab.transform = t
		g.add_child(slab)
		var n := int(w / 0.16)
		for i in n + 1:
			var x := -w / 2.0 + 0.05 + i * (w - 0.1) / n
			tiles.add_xf(Mk.span(a + Vector3(x, 0.04, 0), b + Vector3(x, 0.04, 0), Vector2(0.035, 0.035)))
	g.add_child(tiles.build())
	g.add_child(Mk.box(Vector3(w + 0.06, 0.08, 0.1), dark, Vector3(0, ridge + 0.03, 0)))


## 水井：石塊砌的井口、井水、木頭轆轤（繩子、搖把）、井邊的木桶、小瓦頂
static func well(g: Node3D) -> void:
	var stones := [Color("9a968a"), Color("8a867a"), Color("a8a296")]
	for i in 12:
		var a := TAU * i / 12.0
		var blk := Mk.box(Vector3(0.24, 0.42, 0.13), stones[i % 3], Vector3(cos(a) * 0.4, 0.21, sin(a) * 0.4))
		blk.rotation.y = -a + PI / 2.0
		g.add_child(blk)
	g.add_child(Mk.cyl(0.47, 0.47, 0.06, Color("b0aa9c"), Vector3(0, 0.44, 0), 12))
	g.add_child(Mk.cyl(0.33, 0.33, 0.07, Color("2a3a4a"), Vector3(0, 0.44, 0), 12))
	# 轆轤
	for side in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.08, 1.15, 0.08), Color("6a4428"), Vector3(side * 0.52, 0.6, 0)))
	var axle := Mk.cyl(0.035, 0.035, 1.1, Color("7a5636"), Vector3(0, 1.02, 0), 6)
	axle.rotation.z = PI / 2.0
	g.add_child(axle)
	var coil := Mk.cyl(0.08, 0.08, 0.36, Color("c8b07a"), Vector3(0, 1.02, 0), 8)
	coil.rotation.z = PI / 2.0
	g.add_child(coil)
	g.add_child(Mk.box(Vector3(0.04, 0.22, 0.04), Color("6a4428"), Vector3(0.6, 0.93, 0)))
	g.add_child(Mk.box(Vector3(0.14, 0.04, 0.04), Color("6a4428"), Vector3(0.66, 0.83, 0)))
	g.add_child(Mk.cyl(0.008, 0.008, 0.5, Color("c8b07a"), Vector3(0, 0.77, 0.06), 3))
	# 井邊的木桶
	g.add_child(Mk.cyl(0.12, 0.1, 0.2, Color("8a6440"), Vector3(0.32, 0.57, 0.28), 8))
	g.add_child(Mk.cyl(0.125, 0.125, 0.025, Color("4a4a50"), Vector3(0.32, 0.6, 0.28), 8))
	_tiny_roof(g, 1.3, 1.0, 1.55, 1.18, Color("5a5a62"), Color("3a3a42"))


## 攤子：木頭攤台（前面一塊擋板）、紅白條紋布棚與波浪垂邊、攤上的竹籃與貨、棚下掛的東西、地上的麻袋
static func stall(g: Node3D, w: float) -> void:
	var wood := Color("8a6440")
	var dark := Color("5a3a22")
	var tw := w * 0.92
	g.add_child(Mk.box(Vector3(tw, 0.06, 0.7), wood, Vector3(0, 0.75, 0)))
	g.add_child(Mk.box(Vector3(tw, 0.55, 0.04), wood.darkened(0.1), Vector3(0, 0.45, 0.33)))
	for k in 3:
		g.add_child(Mk.box(Vector3(tw, 0.03, 0.05), dark, Vector3(0, 0.25 + k * 0.2, 0.35)))
	for sx in [-1, 1]:
		for sz in [-1, 1]:
			g.add_child(Mk.box(Vector3(0.06, 0.75, 0.06), dark, Vector3(sx * (tw / 2.0 - 0.05), 0.375, sz * 0.3)))
	# 棚子：前低後高，紅白相間的布條
	var back_h := 1.75
	var front_h := 1.45
	for sx in [-1, 1]:
		g.add_child(Mk.box(Vector3(0.05, back_h, 0.05), dark, Vector3(sx * (w / 2.0 - 0.04), back_h / 2.0, -0.38)))
		g.add_child(Mk.box(Vector3(0.05, front_h, 0.05), dark, Vector3(sx * (w / 2.0 - 0.04), front_h / 2.0, 0.5)))
	var strips := 8
	var sw := (w + 0.1) / strips
	for i in strips:
		var x := -(w + 0.1) / 2.0 + (i + 0.5) * sw
		var cloth := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(1, 1, 1)
		cloth.mesh = bm
		cloth.material_override = Mk.mat(Color("c8463a") if i % 2 == 0 else Color("f2e8d2"))
		cloth.transform = Mk.span(Vector3(x, back_h + 0.02, -0.45), Vector3(x, front_h + 0.02, 0.6), Vector2(sw, 0.03))
		g.add_child(cloth)
		# 波浪垂邊
		var flap := Mk.ball(sw / 2.0, Color("c8463a") if i % 2 == 0 else Color("f2e8d2"), Vector3(x, front_h - 0.04, 0.6), 6)
		flap.scale = Vector3(1, 0.9, 0.12)
		g.add_child(flap)
	# 攤上的貨：三個竹籃（裝著果菜）、一疊藥包、兩個罐子
	var produce := [Color("e8603c"), Color("86c255"), Color("f2c230")]
	for i in 3:
		var bx := -tw / 2.0 + 0.3 + i * 0.38
		g.add_child(Mk.cyl(0.15, 0.12, 0.12, Color("b08a50"), Vector3(bx, 0.84, 0.05), 10))
		for k in 5:
			g.add_child(Mk.ball(0.05, produce[i], Vector3(bx + (Mk.h01(i, k) - 0.5) * 0.16, 0.92, 0.05 + (Mk.h01(k, i) - 0.5) * 0.16), 5))
	for k in 3:
		var pk := Mk.box(Vector3(0.16, 0.06, 0.12), Color("efe4c8"), Vector3(tw / 2.0 - 0.35, 0.81 + k * 0.065, 0.0))
		pk.rotation.y = (k - 1) * 0.15
		g.add_child(pk)
	g.add_child(Mk.box(Vector3(0.06, 0.07, 0.125), Color("c8302a"), Vector3(tw / 2.0 - 0.35, 0.97, 0.0)))
	for k in 2:
		g.add_child(Mk.cyl(0.07, 0.08, 0.18, Color("5a6a7a") if k == 0 else Color("8a4a3a"), Vector3(tw / 2.0 - 0.12, 0.87, -0.2 + k * 0.18), 8))
	# 棚下掛的葫蘆、蒜頭
	for i in 3:
		var hx := -w / 2.0 + 0.45 + i * 0.5
		var hz := 0.42
		g.add_child(Mk.cyl(0.006, 0.006, 0.22, Color("3a2a1a"), Vector3(hx, front_h - 0.12, hz), 3))
		if i % 2 == 0:
			g.add_child(Mk.ball(0.06, Color("d8b860"), Vector3(hx, front_h - 0.27, hz), 6))
			g.add_child(Mk.ball(0.085, Color("d8b860"), Vector3(hx, front_h - 0.38, hz), 6))
		else:
			for k in 3:
				g.add_child(Mk.ball(0.045, Color("f0ece0"), Vector3(hx + (k - 1) * 0.05, front_h - 0.27 - absf(k - 1) * 0.04, hz), 5))
	# 地上的麻袋
	var sack := Mk.ball(0.2, Color("c8b08a"), Vector3(-w / 2.0 - 0.1, 0.2, 0.25), 7)
	sack.scale = Vector3(0.9, 1.1, 0.9)
	g.add_child(sack)
	g.add_child(Mk.cyl(0.05, 0.08, 0.1, Color("b09a74"), Vector3(-w / 2.0 - 0.1, 0.45, 0.25), 6))


## 燈籠柱：石墩、木柱、挑出去的橫桿、垂著流蘇的紅燈籠
static func lantern_post(g: Node3D, v: Village) -> void:
	g.add_child(Mk.box(Vector3(0.3, 0.18, 0.3), Color("9a968a"), Vector3(0, 0.09, 0)))
	g.add_child(Mk.cyl(0.05, 0.06, 1.9, Color("5a3a22"), Vector3(0, 1.1, 0), 6))
	g.add_child(Mk.box(Vector3(0.5, 0.05, 0.05), Color("5a3a22"), Vector3(0.22, 1.95, 0)))
	g.add_child(Mk.box(Vector3(0.04, 0.3, 0.04), Color("5a3a22"), Vector3(0.12, 1.82, 0)))
	g.add_child(Mk.cyl(0.006, 0.006, 0.14, Color("3a2a1a"), Vector3(0.42, 1.88, 0), 3))
	v._lantern(g, Vector3(0.42, 1.62, 0))
	g.add_child(Mk.cyl(0.06, 0.06, 0.04, Color("2a1f18"), Vector3(0.42, 1.83, 0), 8))
	g.add_child(Mk.cyl(0.06, 0.06, 0.04, Color("2a1f18"), Vector3(0.42, 1.41, 0), 8))
	g.add_child(Mk.cone(0.03, 0.18, Color("e8c040"), Vector3(0.42, 1.3, 0), 5))
	g.get_child(g.get_child_count() - 1).rotation.x = PI


## 告示欄：兩根柱子、木板上貼著幾張告示（有新有舊、歪歪的）、上面一個小瓦頂
static func bulletin(g: Node3D) -> void:
	for dx in [-0.6, 0.6]:
		g.add_child(Mk.box(Vector3(0.08, 1.6, 0.08), Color("5a3a22"), Vector3(dx, 0.8, -0.04)))
	g.add_child(Mk.box(Vector3(1.2, 0.72, 0.05), Color("8a6440"), Vector3(0, 1.05, -0.02)))
	var papers := [[-0.32, 1.12, 0.05, Color("f2ead2")], [0.05, 1.05, -0.06, Color("e8dcbc")], [0.36, 1.15, 0.08, Color("f4ecd8")], [-0.05, 0.86, 0.02, Color("e0d2b0")]]
	for p in papers:
		var sheet := Mk.box(Vector3(0.3, 0.38, 0.01), p[3], Vector3(p[0], p[1], 0.012))
		sheet.rotation.z = p[2]
		g.add_child(sheet)
		for k in 3:
			var line := Mk.box(Vector3(0.2, 0.012, 0.005), Color("4a3a2a"), Vector3(p[0], p[1] + 0.08 - k * 0.07, 0.02))
			line.rotation.z = p[2]
			g.add_child(line)
	var t := Mk.label("告示", 30, Color("3a2418"), Color(0, 0, 0, 0))
	t.billboard = BaseMaterial3D.BILLBOARD_DISABLED
	t.position = Vector3(0, 1.48, 0.03)
	g.add_child(Mk.box(Vector3(0.5, 0.18, 0.03), Color("e8dcbc"), Vector3(0, 1.48, 0.0)))
	g.add_child(t)
	_tiny_roof(g, 1.5, 0.5, 1.82, 1.6, Color("5a5a62"), Color("3a3a42"))
