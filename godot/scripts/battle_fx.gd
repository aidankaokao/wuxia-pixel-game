class_name BattleFx
## 戰場上的招式特效（battle.gd 在出招打中的那一刻呼叫）：依招式的 fx 畫出刀光、拳風、重擊、內勁、風、落葉，
## 會心一擊另外閃白光、停格、鏡頭震一下。特效都是半透明、加亮（不受描邊影響），演完自己消失。
## fx：slash 刀劍的弧光、punch 拳掌的衝擊圈、heavy 重擊（交叉的大弧光＋地面震波）、qi 內勁（光球飛過去炸開）、
##     wind 身法的風（幾道小弧繞著轉）、leaves 落葉（綠葉四散）。

const COLORS := {
	"slash": Color(0.85, 0.93, 1.0), "punch": Color(1.0, 0.85, 0.55), "heavy": Color(1.0, 0.45, 0.25),
	"qi": Color(0.45, 0.8, 1.0), "wind": Color(0.75, 1.0, 0.85), "leaves": Color(0.45, 0.8, 0.35),
}


static func glow(c: Color, a := 1.0) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.blend_mode = BaseMaterial3D.BLEND_MODE_ADD
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	m.albedo_color = Color(c, a)
	return m


## 一道弧形的光帶（中間粗、兩頭細），在 XY 平面上，圓心在原點
static func arc_mesh(r: float, width: float, span: float, segs := 18) -> ArrayMesh:
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var pts := []
	for i in segs + 1:
		var t := float(i) / segs
		var a := -span / 2.0 + span * t
		var w := width * sin(t * PI)
		pts.append([Vector3(cos(a), sin(a), 0) * (r - w / 2.0), Vector3(cos(a), sin(a), 0) * (r + w / 2.0)])
	for i in segs:
		var a0: Vector3 = pts[i][0]
		var a1: Vector3 = pts[i][1]
		var b0: Vector3 = pts[i + 1][0]
		var b1: Vector3 = pts[i + 1][1]
		for v in [a0, a1, b1, a0, b1, b0]:
			st.add_vertex(v)
	return st.commit()


## 讓一個特效淡出、消失（同時可以放大、轉）
static func _fade(host: Node3D, n: Node3D, mat: StandardMaterial3D, sec: float, grow := 1.0, spin := 0.0) -> void:
	var tw := host.create_tween().set_parallel()
	tw.tween_property(mat, "albedo_color:a", 0.0, sec).set_ease(Tween.EASE_IN)
	if grow != 1.0:
		tw.tween_property(n, "scale", n.scale * grow, sec).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	if spin != 0.0:
		tw.tween_property(n, "rotation:z", n.rotation.z + spin, sec).set_ease(Tween.EASE_OUT)
	tw.chain().tween_callback(n.queue_free)


## 一個擺好方向的節點：Z 軸朝攻擊方向（XY 平面就是對著攻擊者的那一面）
static func _holder(host: Node3D, at: Vector3, dir: Vector3) -> Node3D:
	var h := Node3D.new()
	host.add_child(h)
	h.position = at
	var d := Vector3(dir.x, 0, dir.z)
	if d.length() < 0.01:
		d = Vector3(0, 0, 1)
	h.look_at_from_position(at, at + d.normalized(), Vector3.UP)
	return h


static func _arc(host: Node3D, at: Vector3, dir: Vector3, c: Color, r: float, width: float, span: float, tilt: float, sec: float, spin: float) -> void:
	var h := _holder(host, at, dir)
	var mi := MeshInstance3D.new()
	mi.mesh = arc_mesh(r, width, span)
	var m := glow(c, 0.95)
	mi.material_override = m
	h.add_child(mi)
	mi.rotation.z = tilt
	mi.scale = Vector3.ONE * 0.85
	_fade(host, mi, m, sec, 1.25, spin)
	host.get_tree().create_timer(sec + 0.05).timeout.connect(h.queue_free)


static func _ring(host: Node3D, at: Vector3, dir: Vector3, c: Color, size: float, sec: float, flat := false) -> void:
	var mi := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.82
	tm.outer_radius = 1.0
	tm.rings = 24
	tm.ring_segments = 4
	mi.mesh = tm
	var m := glow(c, 0.9)
	mi.material_override = m
	host.add_child(mi)
	mi.position = at
	if not flat:
		# 圈面對著攻擊方向
		var d := Vector3(dir.x, 0, dir.z).normalized()
		mi.look_at_from_position(at, at + Vector3.UP, d if d.length() > 0.1 else Vector3.FORWARD)
	mi.scale = Vector3.ONE * size * 0.25
	_fade(host, mi, m, sec, 4.0)


static func _ball(host: Node3D, at: Vector3, c: Color, r: float, sec: float, grow: float) -> void:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = r
	sm.height = r * 2
	sm.radial_segments = 12
	sm.rings = 6
	mi.mesh = sm
	var m := glow(c, 0.85)
	mi.material_override = m
	host.add_child(mi)
	mi.position = at
	_fade(host, mi, m, sec, grow)


## 幾片小東西往外噴（落葉、碎屑）
static func _bits(host: Node3D, at: Vector3, c: Color, n: int, spread: float, sec: float, fall := true) -> void:
	for i in n:
		var mi := MeshInstance3D.new()
		var q := QuadMesh.new()
		q.size = Vector2(0.14, 0.08)
		mi.mesh = q
		var m := glow(c.lerp(Color.WHITE, randf() * 0.3), 0.95)
		m.blend_mode = BaseMaterial3D.BLEND_MODE_MIX
		mi.material_override = m
		host.add_child(mi)
		mi.position = at
		mi.rotation = Vector3(randf() * TAU, randf() * TAU, randf() * TAU)
		var a := randf() * TAU
		var to := at + Vector3(cos(a) * spread * (0.5 + randf()), 0.3 + randf() * 0.5, sin(a) * spread * (0.5 + randf()))
		var tw := host.create_tween().set_parallel()
		tw.tween_property(mi, "position", to, sec * 0.5).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
		if fall:
			tw.chain().tween_property(mi, "position:y", at.y - 0.6, sec * 0.5).set_ease(Tween.EASE_IN)
		tw.parallel().tween_property(mi, "rotation", mi.rotation + Vector3(4, 6, 2), sec)
		tw.parallel().tween_property(m, "albedo_color:a", 0.0, sec).set_ease(Tween.EASE_IN)
		tw.chain().tween_callback(mi.queue_free)


## 打中的那一刻：from 出手的人、to 被打的人（胸口的高度），crit 會心
static func hit(host: Node3D, kind: String, from: Vector3, to: Vector3, crit: bool) -> void:
	var dir := to - from
	var c: Color = COLORS.get(kind, COLORS.punch)
	match kind:
		"slash":
			var tilt := 0.6 if randf() < 0.5 else -0.6
			_arc(host, to, dir, c, 0.72, 0.3, 2.5, tilt, 0.26, 1.2)
			_arc(host, to, dir, Color.WHITE, 0.72, 0.1, 2.3, tilt, 0.2, 1.2)
		"heavy":
			_arc(host, to, dir, c, 0.8, 0.24, 2.6, 0.8, 0.32, 1.0)
			_arc(host, to, dir, c.lerp(Color.WHITE, 0.3), 0.8, 0.2, 2.6, -0.8, 0.32, -1.0)
			_ring(host, Vector3(to.x, to.y - 0.65, to.z), dir, c, 1.2, 0.45, true)
			_bits(host, Vector3(to.x, to.y - 0.6, to.z), Color(0.65, 0.55, 0.45), 8, 0.6, 0.5)
		"qi":
			_ball(host, to, c, 0.25, 0.35, 3.0)
			_ring(host, to, dir, c.lerp(Color.WHITE, 0.4), 1.0, 0.35)
		"wind":
			for i in 3:
				_arc(host, to + Vector3(0, (i - 1) * 0.25, 0), dir, c, 0.5 + i * 0.08, 0.16, 2.0, i * 2.1, 0.32, 3.0)
		"leaves":
			_bits(host, to, c, 12, 0.7, 0.6)
			_ring(host, to, dir, c, 0.8, 0.3)
		_:
			_ring(host, to, dir, c, 0.9, 0.25)
			_ball(host, to, c, 0.12, 0.2, 2.5)
	if crit:
		_ball(host, to, Color(1, 1, 0.9), 0.3, 0.18, 2.2)


## 內勁的光球：從出手的人飛到目標（飛到了才算打中）
static func orb(host: Node3D, from: Vector3, to: Vector3) -> void:
	var mi := MeshInstance3D.new()
	var sm := SphereMesh.new()
	sm.radius = 0.16
	sm.height = 0.32
	mi.mesh = sm
	var m := glow(COLORS.qi, 0.95)
	mi.material_override = m
	host.add_child(mi)
	mi.position = from
	var tw := host.create_tween()
	tw.tween_property(mi, "position", to, 0.18).set_trans(Tween.TRANS_SINE)
	tw.tween_callback(mi.queue_free)
	await tw.finished


## 鏡頭震一下（重擊、會心）
static func shake(cam: Camera3D, power: float) -> void:
	var tw := cam.create_tween()
	for i in 6:
		var k := power * (1.0 - i / 6.0)
		tw.tween_property(cam, "h_offset", randf_range(-k, k), 0.03)
		tw.parallel().tween_property(cam, "v_offset", randf_range(-k, k), 0.03)
	tw.tween_property(cam, "h_offset", 0.0, 0.03)
	tw.parallel().tween_property(cam, "v_offset", 0.0, 0.03)


## 頭目蓄勢：腳下一圈紅光，一直脈動到出招（回傳那個節點，出招時拿掉）
static func aura(host: Node3D, at: Vector3) -> Node3D:
	var mi := MeshInstance3D.new()
	var tm := TorusMesh.new()
	tm.inner_radius = 0.42
	tm.outer_radius = 0.55
	tm.rings = 24
	tm.ring_segments = 4
	mi.mesh = tm
	var m := glow(Color(1, 0.3, 0.15), 0.8)
	mi.material_override = m
	host.add_child(mi)
	mi.position = at + Vector3(0, 0.05, 0)
	var tw := host.create_tween().set_loops()
	tw.tween_property(mi, "scale", Vector3.ONE * 1.25, 0.4).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(m, "albedo_color:a", 0.35, 0.4)
	tw.tween_property(mi, "scale", Vector3.ONE, 0.4).set_trans(Tween.TRANS_SINE)
	tw.parallel().tween_property(m, "albedo_color:a", 0.85, 0.4)
	mi.tree_exiting.connect(tw.kill)
	return mi


## 防禦：身前一片淡藍的護盾，閃一下
static func guard(host: Node3D, at: Vector3, facing: Vector3) -> void:
	var h := _holder(host, at + Vector3(0, 0.75, 0) + facing.normalized() * 0.35, facing)
	var mi := MeshInstance3D.new()
	mi.mesh = arc_mesh(0.55, 0.5, 2.2)
	var m := glow(Color(0.55, 0.8, 1.0), 0.6)
	mi.material_override = m
	mi.rotation.z = PI / 2.0
	h.add_child(mi)
	_fade(host, mi, m, 0.5, 1.15)
	host.get_tree().create_timer(0.55).timeout.connect(h.queue_free)


## 調息、吃藥：綠色的光點往上飄
static func heal(host: Node3D, at: Vector3) -> void:
	for i in 10:
		var mi := MeshInstance3D.new()
		var sm := SphereMesh.new()
		sm.radius = 0.04
		sm.height = 0.08
		sm.radial_segments = 6
		sm.rings = 3
		mi.mesh = sm
		var m := glow(Color(0.5, 1.0, 0.6), 0.9)
		mi.material_override = m
		host.add_child(mi)
		var a := randf() * TAU
		mi.position = at + Vector3(cos(a) * 0.35, 0.2 + randf() * 0.4, sin(a) * 0.35)
		var tw := host.create_tween().set_parallel()
		tw.tween_property(mi, "position:y", mi.position.y + 0.9 + randf() * 0.4, 0.7).set_delay(randf() * 0.2)
		tw.tween_property(m, "albedo_color:a", 0.0, 0.7).set_delay(randf() * 0.2)
		tw.chain().tween_callback(mi.queue_free)
