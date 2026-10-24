class_name Mk
## 做低多邊形模型的小工具：卡通材質、方塊、圓柱、圓錐、球、成批的同款模型（MultiMesh）。
## 所有東西都用程式產生，不讀外部模型檔。

static var _mats := {}
static var _vmat: StandardMaterial3D


## 卡通材質（兩階明暗，邊緣由 shaders/outline.gdshader 描）；同色共用一份
static func mat(color: Color) -> StandardMaterial3D:
	var key := color.to_html()
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
	m.specular_mode = BaseMaterial3D.SPECULAR_TOON
	m.roughness = 0.85
	_mats[key] = m
	return m


## 用頂點顏色的卡通材質（地面、成批的樹）
static func vmat() -> StandardMaterial3D:
	if _vmat == null:
		_vmat = StandardMaterial3D.new()
		_vmat.vertex_color_use_as_albedo = true
		_vmat.diffuse_mode = BaseMaterial3D.DIFFUSE_TOON
		_vmat.specular_mode = BaseMaterial3D.SPECULAR_TOON
		_vmat.roughness = 0.9
	return _vmat


static func _inst(mesh: Mesh, color: Color, pos: Vector3) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.mesh = mesh
	mi.material_override = mat(color)
	mi.position = pos
	return mi


static func box(size: Vector3, color: Color, pos := Vector3.ZERO) -> MeshInstance3D:
	var m := BoxMesh.new()
	m.size = size
	return _inst(m, color, pos)


static func cyl(top: float, bottom: float, h: float, color: Color, pos := Vector3.ZERO, sides := 8) -> MeshInstance3D:
	var m := CylinderMesh.new()
	m.top_radius = top
	m.bottom_radius = bottom
	m.height = h
	m.radial_segments = sides
	m.rings = 1
	return _inst(m, color, pos)


static func cone(r: float, h: float, color: Color, pos := Vector3.ZERO, sides := 7) -> MeshInstance3D:
	return cyl(0.0, r, h, color, pos, sides)


static func ball(r: float, color: Color, pos := Vector3.ZERO, segs := 8) -> MeshInstance3D:
	var m := SphereMesh.new()
	m.radius = r
	m.height = r * 2.0
	m.radial_segments = segs
	m.rings = max(3, segs / 2)
	return _inst(m, color, pos)


## 人字形屋頂：寬 w（沿 x）、深 d（沿 z）、高 h
static func roof(w: float, d: float, h: float, color: Color, pos := Vector3.ZERO) -> MeshInstance3D:
	var m := PrismMesh.new()
	m.size = Vector3(d, h, w)
	var mi := _inst(m, color, pos)
	mi.rotation.y = PI / 2.0
	return mi


## 浮在物件上方、永遠面向鏡頭的字
static func label(text: String, size := 40, color := Color.WHITE, outline := Color(0.08, 0.06, 0.1)) -> Label3D:
	var l := Label3D.new()
	l.text = text
	l.font = Ui.font()
	l.font_size = size
	l.pixel_size = 0.011
	l.modulate = color
	l.outline_modulate = outline
	l.outline_size = 10
	l.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	l.no_depth_test = false
	l.render_priority = 2
	l.outline_render_priority = 1
	return l


## 成批的同款模型：先 add 每一個的位置、大小、轉向、顏色，最後 build 成一個 MultiMeshInstance3D
class Batch:
	var mesh: Mesh
	var xf: Array[Transform3D] = []
	var colors: Array[Color] = []
	var base: Color

	func _init(m: Mesh, c := Color.WHITE) -> void:
		mesh = m
		base = c

	func add(pos: Vector3, scale := Vector3.ONE, yaw := 0.0, color := Color(-1, 0, 0)) -> void:
		var b := Basis(Vector3.UP, yaw).scaled(scale)
		xf.append(Transform3D(b, pos))
		colors.append(base if color.r < 0 else color)

	## 用完整的變換放一個（可以任意轉向，例如沿著屋頂斜面躺著的瓦）
	func add_xf(t: Transform3D, color := Color(-1, 0, 0)) -> void:
		xf.append(t)
		colors.append(base if color.r < 0 else color)

	func build() -> MultiMeshInstance3D:
		if xf.is_empty():
			return null
		var mm := MultiMesh.new()
		mm.transform_format = MultiMesh.TRANSFORM_3D
		mm.use_colors = true
		mm.mesh = mesh
		mm.instance_count = xf.size()
		for i in xf.size():
			mm.set_instance_transform(i, xf[i])
			mm.set_instance_color(i, colors[i])
		var mi := MultiMeshInstance3D.new()
		mi.multimesh = mm
		mi.material_override = Mk.vmat()
		return mi


## 從 a 到 b 的一根棒子（圓柱或方塊的 Y 軸對準 a→b，長度剛好）的變換；mesh 的高要是 1
static func span(a: Vector3, b: Vector3, thick := Vector2(1, 1)) -> Transform3D:
	var d := b - a
	var y := d.normalized()
	var x := y.cross(Vector3.FORWARD if absf(y.dot(Vector3.FORWARD)) < 0.9 else Vector3.RIGHT).normalized()
	var z := x.cross(y).normalized()
	return Transform3D(Basis(x * thick.x, y * d.length(), z * thick.y), (a + b) / 2.0)


## 0–1 之間、跟座標綁定的雜訊（同一格每次都一樣）
static func h01(x: int, y: int, salt := 0) -> float:
	var n := (x * 374761393 + y * 668265263 + salt * 2147483647) & 0x7fffffff
	n = ((n ^ (n >> 13)) * 1274126177) & 0x7fffffff
	return float(n % 10000) / 10000.0
