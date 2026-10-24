class_name FineHouse
## 精細版的房子（先做竹風茶寮給使用者看）：
## - 屋頂：中間微微下凹的兩面坡，一行行筒瓦從屋脊排到屋簷，簷口一排瓦當；屋脊兩端往上翹，屋簷四角飛起；兩頭有博風板。
## - 屋身：石砌台基與門前石階、朱紅圓柱、柱頭的小斗拱、額枋、下半截磚牆；格子窗（窗櫺）、兩扇門板（門釘、門環）、
##   門邊一對春聯、門楣上的匾額、簷下兩盞燈籠，門前一支寫著「茶」的幌子。
## 座標跟 village.gd 的 _building 一樣：原點在佔地左上角，x 往右 w 格、z 往前 d 格，門在最前排。

const PLINTH := 0.25
const WALL_H := 1.5


## v 是村子（燈籠要登記到它的 lamps 才會隨時辰亮）；回傳整棟房子
static func build(v: Village, b: Dictionary) -> Node3D:
	var st: Dictionary = b.st
	var w: float = st.w
	var d: float = st.h
	var root := Node3D.new()
	var front := d - 0.3
	var back := 0.7
	var cz := (front + back) / 2.0
	var door_x: float = st.door + 0.5
	var timber := Color("7a3226")
	var wood := Color("5a3a22")
	var plaster := Color("ece2cc")
	var stone := Color("b8b0a0")
	var base_y := PLINTH
	var top_y := PLINTH + WALL_H

	# ── 台基與石階 ──
	root.add_child(Mk.box(Vector3(w - 0.05, PLINTH, front - back + 0.5), stone, Vector3(w / 2.0, PLINTH / 2.0, cz)))
	root.add_child(Mk.box(Vector3(w - 0.05, 0.04, front - back + 0.5), stone.darkened(0.12), Vector3(w / 2.0, PLINTH + 0.01, cz)))
	for i in 2:
		root.add_child(Mk.box(Vector3(1.5 - i * 0.2, PLINTH * (1 - i * 0.5), 0.28), stone.darkened(0.05 * i), Vector3(door_x, PLINTH * (1 - i * 0.5) / 2.0, front + 0.36 + i * 0.22)))

	# ── 牆：下半截磚、上半截白牆（四面） ──
	var body_w := w - 0.5
	var body_d := front - back - 0.1
	var wx := w / 2.0
	root.add_child(Mk.box(Vector3(body_w, WALL_H, body_d), plaster, Vector3(wx, base_y + WALL_H / 2.0, cz)))
	root.add_child(Mk.box(Vector3(body_w + 0.02, 0.45, body_d + 0.02), Color("7a7670"), Vector3(wx, base_y + 0.225, cz)))
	# 磚縫
	for k in 3:
		root.add_child(Mk.box(Vector3(body_w + 0.03, 0.015, body_d + 0.03), Color("5e5a54"), Vector3(wx, base_y + 0.11 + k * 0.12, cz)))
	var fz := cz + body_d / 2.0 + 0.01

	# ── 柱子：前排（兩端、門兩側）、後排兩端；柱頭一個小斗拱 ──
	var cols := [0.3, door_x - 0.62, door_x + 0.62, w - 0.3]
	for x in cols:
		_pillar(root, Vector3(x, base_y, fz + 0.06), timber)
	for x in [0.3, w - 0.3]:
		_pillar(root, Vector3(x, base_y, cz - body_d / 2.0 - 0.06), timber)
	# 額枋（柱子之間的橫樑）與樑上的彩繪色帶
	root.add_child(Mk.box(Vector3(w - 0.4, 0.18, 0.12), timber, Vector3(wx, top_y - 0.12, fz + 0.06)))
	root.add_child(Mk.box(Vector3(w - 0.6, 0.06, 0.13), Color("3e6656"), Vector3(wx, top_y - 0.12, fz + 0.065)))

	# ── 門：兩扇門板、門釘、門環，門框 ──
	var leaf_w := 0.48
	for side in [-1, 1]:
		var cx: float = door_x + side * leaf_w / 2.0
		root.add_child(Mk.box(Vector3(leaf_w - 0.03, 1.15, 0.06), Color("6a2a20"), Vector3(cx, base_y + 0.575, fz + 0.02)))
		for r in 4:
			for c in 3:
				root.add_child(Mk.ball(0.018, Color("d8b060"), Vector3(cx - 0.13 + c * 0.13, base_y + 0.3 + r * 0.22, fz + 0.06), 4))
		var ring := MeshInstance3D.new()
		var tm := TorusMesh.new()
		tm.inner_radius = 0.035
		tm.outer_radius = 0.05
		tm.rings = 8
		tm.ring_segments = 4
		ring.mesh = tm
		ring.material_override = Mk.mat(Color("c9a46a"))
		ring.rotation.x = PI / 2.0
		ring.position = Vector3(door_x + side * 0.08, base_y + 0.6, fz + 0.07)
		root.add_child(ring)
	root.add_child(Mk.box(Vector3(leaf_w * 2 + 0.16, 0.1, 0.1), wood, Vector3(door_x, base_y + 1.2, fz + 0.04)))
	for side in [-1, 1]:
		root.add_child(Mk.box(Vector3(0.08, 1.2, 0.1), wood, Vector3(door_x + side * (leaf_w + 0.04), base_y + 0.6, fz + 0.04)))

	# ── 春聯（門邊兩根柱子上） ──
	var lines := ["竹影搖風", "茶香引客"]
	for i in 2:
		var x: float = door_x + (-0.62 if i == 0 else 0.62)
		root.add_child(Mk.box(Vector3(0.15, 0.82, 0.02), Color("c8302a"), Vector3(x, base_y + 0.85, fz + 0.16)))
		var t := Label3D.new()
		t.text = "\n".join(Array(lines[i].split("")))
		t.font = Ui.font()
		t.font_size = 22
		t.pixel_size = 0.0055
		t.line_spacing = -6
		t.modulate = Color("1e1a18")
		t.outline_size = 0
		t.position = Vector3(x, base_y + 0.85, fz + 0.175)
		root.add_child(t)

	# ── 格子窗：前面門兩側各一扇、兩側牆各一扇 ──
	for x in [(0.3 + door_x - 0.62) / 2.0, (door_x + 0.62 + w - 0.3) / 2.0]:
		_lattice(root, Vector3(x, base_y + 0.95, fz + 0.015), 0.0, wood)
	_lattice(root, Vector3(wx - body_w / 2.0 - 0.015, base_y + 0.95, cz), -PI / 2.0, wood)
	_lattice(root, Vector3(wx + body_w / 2.0 + 0.015, base_y + 0.95, cz), PI / 2.0, wood)

	# ── 匾額 ──
	var sign_text: String = b.get("sign", "")
	if sign_text != "":
		var bw := 0.4 + sign_text.length() * 0.27
		root.add_child(Mk.box(Vector3(bw + 0.08, 0.42, 0.05), Color("c9a46a"), Vector3(door_x, top_y - 0.02, fz + 0.14)))
		root.add_child(Mk.box(Vector3(bw, 0.34, 0.06), Color("2a1f18"), Vector3(door_x, top_y - 0.02, fz + 0.15)))
		var t2 := Label3D.new()
		t2.text = sign_text
		t2.font = Ui.font()
		t2.font_size = 44
		t2.pixel_size = 0.005
		t2.modulate = Color("f0c860")
		t2.outline_size = 0
		t2.position = Vector3(door_x, top_y - 0.02, fz + 0.185)
		root.add_child(t2)

	# ── 屋頂 ──
	_roof(root, st, w, back, front, cz, top_y + 0.05)

	# ── 簷下燈籠、門前幌子 ──
	for lx in [door_x - 1.0, door_x + 1.0]:
		v._lantern(root, Vector3(lx, top_y - 0.35, fz + 0.45))
	_flag(root, Vector3(w - 0.25, 0, front + 0.25), "茶")
	return root


## 圓柱：柱礎（石墩）、紅漆柱身、柱頭斗拱
static func _pillar(root: Node3D, at: Vector3, timber: Color) -> void:
	root.add_child(Mk.cyl(0.13, 0.15, 0.1, Color("a8a090"), at + Vector3(0, 0.05, 0), 8))
	root.add_child(Mk.cyl(0.085, 0.09, WALL_H, timber, at + Vector3(0, WALL_H / 2.0, 0), 10))
	root.add_child(Mk.box(Vector3(0.26, 0.08, 0.26), Color("5a3a22"), at + Vector3(0, WALL_H + 0.02, 0)))
	root.add_child(Mk.box(Vector3(0.4, 0.07, 0.14), Color("3e6656"), at + Vector3(0, WALL_H + 0.09, 0)))


## 格子窗：木框、糊窗紙、直橫的窗櫺；yaw 是面向（0 朝前）
static func _lattice(root: Node3D, at: Vector3, yaw: float, wood: Color) -> void:
	var g := Node3D.new()
	g.position = at
	g.rotation.y = yaw
	root.add_child(g)
	var ww := 0.9
	var hh := 0.62
	g.add_child(Mk.box(Vector3(ww, hh, 0.02), Color("f2e6c4"), Vector3.ZERO))
	for s in [-1, 1]:
		g.add_child(Mk.box(Vector3(ww + 0.08, 0.06, 0.05), wood, Vector3(0, s * hh / 2.0, 0.02)))
		g.add_child(Mk.box(Vector3(0.06, hh, 0.05), wood, Vector3(s * ww / 2.0, 0, 0.02)))
	for i in range(1, 6):
		g.add_child(Mk.box(Vector3(0.02, hh, 0.03), wood, Vector3(-ww / 2.0 + i * ww / 6.0, 0, 0.02)))
	for i in range(1, 4):
		g.add_child(Mk.box(Vector3(ww, 0.02, 0.03), wood, Vector3(0, -hh / 2.0 + i * hh / 4.0, 0.02)))
	# 窗台
	g.add_child(Mk.box(Vector3(ww + 0.14, 0.05, 0.12), wood, Vector3(0, -hh / 2.0 - 0.05, 0.05)))


## 屋頂：兩面坡（中間略凹）＋筒瓦＋瓦當＋屋脊（兩端翹起）＋博風板；屋簷四角飛起
static func _roof(root: Node3D, st: Dictionary, w: float, back: float, front: float, cz: float, eave_y: float) -> void:
	var over_x := 0.4
	var over_z := 0.6
	var x0 := -over_x + 0.05
	var x1 := w + over_x - 0.05
	var rise := 1.15
	var ridge_y := eave_y + rise
	var sag := 0.1
	var lift := 0.22
	var roof_c := Color(st.roof)
	var dark := Color(st.roofDark)
	var light := Color(st.roofLight)
	var slopes := [front + over_z, back - over_z]
	# 斜面上的一點：x 沿屋長，t 從屋脊（0）到屋簷（1）
	var P := func(ze: float, x: float, t: float) -> Vector3:
		var e := absf(x - w / 2.0) / ((x1 - x0) / 2.0)
		return Vector3(x, lerpf(ridge_y, eave_y, t) - sag * sin(PI * t) + lift * pow(e, 4.0) * t * t, lerpf(cz, ze, t))
	var slab_m := StandardMaterial3D.new()
	slab_m.albedo_color = dark
	slab_m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	slab_m.cull_mode = BaseMaterial3D.CULL_DISABLED
	# 底板（兩面坡各一片，切成格子才彎得起來）
	for ze in slopes:
		var st2 := SurfaceTool.new()
		st2.begin(Mesh.PRIMITIVE_TRIANGLES)
		var nx := 24
		var nt := 6
		for i in nx:
			for j in nt:
				var xa := lerpf(x0, x1, float(i) / nx)
				var xb := lerpf(x0, x1, float(i + 1) / nx)
				var ta := float(j) / nt
				var tb := float(j + 1) / nt
				var a: Vector3 = P.call(ze, xa, ta)
				var bb: Vector3 = P.call(ze, xb, ta)
				var c: Vector3 = P.call(ze, xb, tb)
				var dd: Vector3 = P.call(ze, xa, tb)
				for q in [a, bb, c, a, c, dd]:
					st2.add_vertex(q)
		st2.generate_normals()
		var mi := MeshInstance3D.new()
		mi.mesh = st2.commit()
		mi.material_override = slab_m
		root.add_child(mi)
	# 筒瓦：一行行從屋脊排到屋簷（沿著彎曲的斜面分三段），簷口一個圓瓦當
	var tube := CylinderMesh.new()
	tube.top_radius = 1.0
	tube.bottom_radius = 1.0
	tube.height = 1.0
	tube.radial_segments = 6
	tube.rings = 1
	var tiles := Mk.Batch.new(tube, roof_c)
	var cap := Mk.Batch.new(tube, light)
	var step := 0.2
	var n := int((x1 - x0 - 0.1) / step)
	for ze in slopes:
		var normal_up := 0.045
		for i in n + 1:
			var x := x0 + 0.05 + i * (x1 - x0 - 0.1) / n
			var segs := 4
			for k in segs:
				var a: Vector3 = P.call(ze, x, float(k) / segs) + Vector3(0, normal_up, 0)
				var bb: Vector3 = P.call(ze, x, float(k + 1) / segs) + Vector3(0, normal_up, 0)
				tiles.add_xf(Mk.span(a, bb, Vector2(0.05, 0.05)))
			var end: Vector3 = P.call(ze, x, 1.0) + Vector3(0, normal_up, 0)
			var dir: Vector3 = (end - (P.call(ze, x, 0.92) + Vector3(0, normal_up, 0))).normalized()
			cap.add_xf(Mk.span(end, end + dir * 0.03, Vector2(0.065, 0.065)))
	for bt in [tiles, cap]:
		root.add_child(bt.build())
	# 屋脊：一條粗脊，兩端往上翹（鴟尾）
	var rz := cz
	root.add_child(Mk.box(Vector3(x1 - x0 + 0.1, 0.18, 0.24), dark, Vector3(w / 2.0, ridge_y + 0.07, rz)))
	root.add_child(Mk.box(Vector3(x1 - x0 + 0.14, 0.05, 0.28), light, Vector3(w / 2.0, ridge_y + 0.18, rz)))
	for side in [-1, 1]:
		var ex: float = w / 2.0 + side * (x1 - x0) / 2.0
		var tail := Mk.box(Vector3(0.14, 0.42, 0.2), dark, Vector3(ex - side * 0.02, ridge_y + 0.32, rz))
		tail.rotation.z = -side * 0.45
		root.add_child(tail)
		root.add_child(Mk.ball(0.08, light, Vector3(ex + side * 0.08, ridge_y + 0.55, rz), 6))
	# 博風板：兩頭沿著斜面的木板
	for ze in slopes:
		for x in [x0, x1]:
			for k in 4:
				var a: Vector3 = P.call(ze, x, float(k) / 4.0)
				var bb: Vector3 = P.call(ze, x, float(k + 1) / 4.0)
				var board := MeshInstance3D.new()
				var bm := BoxMesh.new()
				bm.size = Vector3(1, 1, 1)
				board.mesh = bm
				board.material_override = Mk.mat(Color("5a3a22"))
				board.transform = Mk.span(a + Vector3(0, 0.02, 0), bb + Vector3(0, 0.02, 0), Vector2(0.06, 0.16))
				root.add_child(board)


## 幌子：竹竿、橫桿、垂下的布幅（寫一個字）
static func _flag(root: Node3D, at: Vector3, ch: String) -> void:
	root.add_child(Mk.cyl(0.035, 0.045, 2.6, Color("8a7a48"), at + Vector3(0, 1.3, 0), 6))
	root.add_child(Mk.box(Vector3(0.6, 0.04, 0.04), Color("8a7a48"), at + Vector3(-0.28, 2.45, 0)))
	var cloth := Mk.box(Vector3(0.42, 0.95, 0.025), Color("f2e8d2"), at + Vector3(-0.32, 1.95, 0))
	root.add_child(cloth)
	root.add_child(Mk.box(Vector3(0.46, 0.08, 0.03), Color("3e6656"), at + Vector3(-0.32, 2.4, 0)))
	for k in 3:
		root.add_child(Mk.cone(0.05, 0.12, Color("3e6656"), at + Vector3(-0.46 + k * 0.14, 1.42, 0), 4))
		root.get_child(root.get_child_count() - 1).rotation.x = PI
	var t := Label3D.new()
	t.text = ch
	t.font = Ui.font()
	t.font_size = 64
	t.pixel_size = 0.006
	t.modulate = Color("a82a22")
	t.outline_size = 0
	t.position = at + Vector3(-0.32, 1.95, 0.016)
	root.add_child(t)
