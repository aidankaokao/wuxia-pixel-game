class_name Village
extends GridScene
## 青竹村：讀網頁版匯出的地圖資料（data/qingzhu.json：字元格子、建築、擺設、村民與台詞），蓋成立體的村子。
## - 山（^）依周圍有幾格山而隆起，水（~）往下凹，路、田、廣場貼在地面上。
## - 主角用方向鍵走（相對鏡頭方向），Shift 跑；村民在自己的位置附近走動，攤販站著不動。
## - 面對村民、擺設時頭上冒出「空白鍵 交談／查看」，按空白鍵對話；陶四、鍾嬸可以買賣東西。
## - 站在竹風茶寮門口、對著門按空白鍵就換到室內（room.gd）；其他房子的室內還沒做，會說門關著。

const GROUND := {":": "c9a46a", "E": "c9a46a", "=": "b9b3a4", "n": "8a6040", "c": "7a5a3a", "g": "8b5e3c", "~": "3a5f86", "#": "a8763f"}

## 顧攤子的人：站哪、面向哪、賣什麼（貨郎照網頁版陶四的貨）
const STALLS := {
	"tao": {"x": 32, "y": 22, "face": Vector3(-1, 0, 0), "title": "陶四的貨郎攤", "stock": ["jinchuang", "tea", "herb", "rice", "flour", "egg", "greens", "sugar"], "greet": "走過路過不要錯過！傷藥、茶葉、草藥，樣樣都有。獸皮、獸肉也收！"},
	"zhong": {"x": 32, "y": 17, "face": Vector3(0, 0, 1), "title": "鍾嬸的茶攤", "stock": ["tea", "egg"], "greet": "來啦！坐下喝碗茶歇歇腳？"},
}
## 精細版的房子（瓦片屋頂、斗拱、格子窗……，見 fine_house.gd）；有樣式設定的都用精細版

## 做好室內的房子（地圖 id）
const ROOMS := ["qz_tea"]

var data: Dictionary
var heights := []
## 地面網格每個頂點的高度（給山上的樹、石頭找地面高度）
var _hv := PackedFloat32Array()
var _vw := 0
## 門口那一格 → 房子（走上去就進門）
var doors := {}


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
	_mountain_plants()
	for b in data.buildings:
		_building(b)
	for p in data.props:
		_prop(p)
	_people()


func tile(x: int, y: int) -> String:
	if y < 0 or y >= H or x < 0 or x >= W:
		return "^"
	return (data.tiles[y] as String)[x]


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


## 每格切成幾小格（地面網格的細緻度）
const SUB := 4


## 一張「每格一個數字」的表
func _grid_of(f: Callable) -> Array:
	var out := []
	for y in H:
		var row := []
		for x in W:
			row.append(f.call(x, y))
		out.append(row)
	return out


## 模糊一次（中間 4、上下左右 2、斜角 1），讓邊界變圓
func _blur(m: Array) -> Array:
	var out := []
	for y in H:
		var row := []
		for x in W:
			var sum := 0.0
			var wsum := 0.0
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var k := 4.0 if dx == 0 and dy == 0 else (2.0 if dx == 0 or dy == 0 else 1.0)
					var yy := clampi(y + dy, 0, H - 1)
					var xx := clampi(x + dx, 0, W - 1)
					sum += float(m[yy][xx]) * k
					wsum += k
			row.append(sum / wsum)
		out.append(row)
	return out


## 在格子之間平滑取值（u、v 以格為單位，格子中心是 i + 0.5）
func _bil(m: Array, u: float, v: float) -> float:
	var fx := u - 0.5
	var fy := v - 0.5
	var x0 := floori(fx)
	var y0 := floori(fy)
	var tx := fx - x0
	var ty := fy - y0
	var at := func(x: int, y: int) -> float: return float(m[clampi(y, 0, H - 1)][clampi(x, 0, W - 1)])
	return lerpf(lerpf(at.call(x0, y0), at.call(x0 + 1, y0), tx), lerpf(at.call(x0, y0 + 1), at.call(x0 + 1, y0 + 1), tx), ty)


## 地面：每格切成 SUB×SUB 小格，高度與地表顏色都在格子之間平滑過渡——
## 河岸、小路、廣場的邊是圓順的曲線，山是緩坡（低多邊形的面）；田地維持方正。
func _ground() -> void:
	var water := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) in ["~", "#"] else 0.0))
	var path := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) in [":", "E", "#"] else 0.0))
	var plaza := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) == "=" else 0.0))
	var mtn := _grid_of(func(x, y): return heights[y][x] if tile(x, y) == "^" else 0.0)
	var n := SUB
	var vw := W * n + 1
	var vh := H * n + 1
	# 每個頂點的高度
	var hv := PackedFloat32Array()
	hv.resize(vw * vh)
	for j in vh:
		for i in vw:
			var u := float(i) / n
			var v := float(j) / n
			var hm := maxf(0.0, _bil(mtn, u, v) - 0.35) * 1.4
			var hw := -0.45 * smoothstep(0.25, 0.75, _bil(water, u, v))
			# 山上多一點起伏（低多邊形的稜角）
			hv[j * vw + i] = hm + hw + (Mk.h01(i, j, 5) - 0.5) * 0.4 * minf(1.0, hm)
	_hv = hv
	_vw = vw
	# 網格：頂點共用，顏色在頂點上算、在三角形裡漸變（邊界用很窄的漸變，看起來是圓順的線，不會鋸齒）
	var grass_a := Color("7cb262")
	var grass_b := Color("8cc070")
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	verts.resize(vw * vh)
	cols.resize(vw * vh)
	for j in vh:
		for i in vw:
			var u := float(i) / n
			var v := float(j) / n
			var h := hv[j * vw + i]
			verts[j * vw + i] = Vector3(u + ox, h, v + oz)
			cols[j * vw + i] = _ground_color(u, v, h, path, plaza, grass_a, grass_b)
	var idx := PackedInt32Array()
	for j in vh - 1:
		for i in vw - 1:
			var a0 := j * vw + i
			idx.append_array([a0, a0 + 1, a0 + vw + 1, a0, a0 + vw + 1, a0 + vw])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	arr[Mesh.ARRAY_INDEX] = idx
	var st := SurfaceTool.new()
	st.create_from_arrays(arr)
	# 拆開共用的頂點再算法線：每個三角形各自一個面（低多邊形的稜角），顏色照樣在頂點上漸變
	st.deindex()
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = Mk.vmat()
	add_child(mi)
	# 水面
	var wplane := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(W, H)
	wplane.mesh = pm
	var wm := StandardMaterial3D.new()
	wm.albedo_color = Color(0.29, 0.55, 0.78, 0.82)
	wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wm.roughness = 0.15
	wm.metallic_specular = 0.8
	wplane.material_override = wm
	wplane.position.y = -0.12
	add_child(wplane)
	_bridges()


## 一個頂點的地表顏色：草地（大片深淺）→ 田地（方正）→ 廣場、小路 → 山石 → 水底，依序疊上去
func _ground_color(u: float, v: float, h: float, path: Array, plaza: Array, ga: Color, gb: Color) -> Color:
	var w := 0.5 + 0.25 * sin(u * 0.45 + v * 0.2) + 0.25 * sin(v * 0.6 - u * 0.15)
	var col := ga.lerp(gb, w)
	# 田地、茶壟、藥畦：看這個頂點周圍四格是不是都是同一種田（田的邊維持方正）
	var t := tile(floori(u - 0.01), floori(v - 0.01))
	if t in ["n", "c", "g"] and tile(floori(u + 0.01), floori(v + 0.01)) == t:
		col = Color(GROUND[t])
		if t == "n" and int(floor(v * 2.0)) % 2 == 1:
			col = col * 0.88
	col = col.lerp(Color(GROUND["="]), smoothstep(0.42, 0.58, _bil(plaza, u, v)))
	col = col.lerp(Color(GROUND[":"]), smoothstep(0.42, 0.58, _bil(path, u, v)))
	# 山：越高越偏淺灰
	var rock := Color("7a7466").lerp(Color("9a9484"), minf(1.0, h / 3.0)) * (0.92 + Mk.h01(int(u * 4), int(v * 4), 7) * 0.12)
	# 山坡上一塊塊的青苔、草皮（低處多、高處少），石色不會整片發白
	var moss := smoothstep(0.0, 0.5, sin(u * 1.1 + v * 0.7) * 0.5 + sin(v * 1.6 - u * 0.4) * 0.5) * (1.0 - smoothstep(2.5, 4.5, h))
	rock = rock.lerp(Color("587540"), moss * 0.85)
	col = col.lerp(rock, smoothstep(0.08, 0.3, h))
	# 水底：岸邊偏沙色，越深越藍
	var bed := Color("8a8a6a").lerp(Color("3a5f86"), clampf((-h - 0.1) / 0.3, 0.0, 1.0))
	col = col.lerp(bed, 1.0 - smoothstep(-0.16, -0.06, h))
	col.a = 1.0
	return col


## 木橋：相連的「#」格子合成一座橋（橋面一整片、欄杆只在兩側外緣），兩頭各伸進岸上半格，接上石砌的橋頭
func _bridges() -> void:
	var seen := {}
	for y in H:
		for x in W:
			if tile(x, y) != "#" or seen.has(Vector2i(x, y)):
				continue
			# 找出整座橋（相連的格子）
			var cells := [Vector2i(x, y)]
			seen[Vector2i(x, y)] = true
			var i := 0
			while i < cells.size():
				var c: Vector2i = cells[i]
				i += 1
				for d in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
					var nb: Vector2i = c + d
					if tile(nb.x, nb.y) == "#" and not seen.has(nb):
						seen[nb] = true
						cells.append(nb)
			var lo := Vector2i(99999, 99999)
			var hi := Vector2i(-1, -1)
			for c in cells:
				lo = Vector2i(mini(lo.x, c.x), mini(lo.y, c.y))
				hi = Vector2i(maxi(hi.x, c.x), maxi(hi.y, c.y))
			# 橋往哪個方向走：兩頭接著陸地的那個方向
			var land := func(tx: int, ty: int) -> bool: return not (tile(tx, ty) in ["~", "#"])
			var along_x: bool = land.call(lo.x - 1, lo.y) and land.call(hi.x + 1, lo.y)
			_bridge(lo, hi, along_x)
	return


func _bridge(lo: Vector2i, hi: Vector2i, along_x: bool) -> void:
	var wood := Color("a8763f")
	var dark := Color("6a4428")
	var stone := Color("9a968a")
	var x0 := lo.x + ox
	var x1 := hi.x + 1 + ox
	var z0 := lo.y + oz
	var z1 := hi.y + 1 + oz
	var reach := 0.5
	var g := Node3D.new()
	add_child(g)
	# 橋面：沿著走的方向多伸出 reach 到岸上
	var len := (x1 - x0 if along_x else z1 - z0) + reach * 2.0
	var wid := (z1 - z0 if along_x else x1 - x0) - 0.15
	var cx := (x0 + x1) / 2.0
	var cz := (z0 + z1) / 2.0
	var size := Vector3(len, 0.12, wid) if along_x else Vector3(wid, 0.12, len)
	g.add_child(Mk.box(size, wood, Vector3(cx, 0.04, cz)))
	# 橋板的縫（橫著的細線）
	var n := int(len / 0.35)
	for k in n:
		var t := -len / 2.0 + (k + 0.5) * len / n
		var seam := Vector3(0.02, 0.005, wid - 0.1) if along_x else Vector3(wid - 0.1, 0.005, 0.02)
		g.add_child(Mk.box(seam, wood.darkened(0.25), Vector3(cx + t, 0.1, cz) if along_x else Vector3(cx, 0.1, cz + t)))
	# 欄杆：只在兩側外緣
	var rail_len := len - reach * 2.0 + 0.2
	for side in [-1, 1]:
		var off: float = side * (wid / 2.0 - 0.06)
		var rp := Vector3(cx, 0.42, cz + off) if along_x else Vector3(cx + off, 0.42, cz)
		g.add_child(Mk.box(Vector3(rail_len, 0.06, 0.07) if along_x else Vector3(0.07, 0.06, rail_len), dark, rp))
		var posts := int(rail_len / 0.7) + 1
		for k in posts:
			var t := -rail_len / 2.0 + k * rail_len / (posts - 1)
			g.add_child(Mk.box(Vector3(0.09, 0.42, 0.09), dark, rp + (Vector3(t, -0.2, 0) if along_x else Vector3(0, -0.2, t))))
	# 兩頭的石砌橋頭（蓋住岸邊與橋面的接縫）
	for end in [-1, 1]:
		var e: float = end * (len / 2.0 - reach / 2.0)
		var at := Vector3(cx + e, -0.1, cz) if along_x else Vector3(cx, -0.1, cz + e)
		g.add_child(Mk.box(Vector3(reach + 0.1, 0.24, wid + 0.25) if along_x else Vector3(wid + 0.25, 0.24, reach + 0.1), stone, at))
	# 橋墩：每隔一格一對
	var spans := (hi.x - lo.x + 1) if along_x else (hi.y - lo.y + 1)
	for k in range(1, spans):
		for side in [-1, 1]:
			var off: float = side * (wid / 2.0 - 0.25)
			var t := -float(spans) / 2.0 + k
			var p := Vector3(cx + t, -0.3, cz + off) if along_x else Vector3(cx + off, -0.3, cz + t)
			g.add_child(Mk.box(Vector3(0.16, 0.6, 0.16), Color("5a3a22"), p))


## 地面某一點的高度（u、v 以格為單位）
func ground_h(u: float, v: float) -> float:
	var fx := clampf(u * SUB, 0, _vw - 1.001)
	var fy := clampf(v * SUB, 0, _hv.size() / _vw - 1.001)
	var x0 := floori(fx)
	var y0 := floori(fy)
	var tx := fx - x0
	var ty := fy - y0
	var a := _hv[y0 * _vw + x0]
	var b := _hv[y0 * _vw + x0 + 1]
	var c := _hv[(y0 + 1) * _vw + x0]
	var d := _hv[(y0 + 1) * _vw + x0 + 1]
	return lerpf(lerpf(a, b, tx), lerpf(c, d, tx), ty)


## 山上的植被：松樹、灌木叢、草叢、大小石頭，照山的高度疏密不同（山腳密、山頂稀、石頭多），
## 位置、大小、轉向都隨機打散，看起來雜亂自然
func _mountain_plants() -> void:
	var cone := func(r: float, h: float, lift: float, sides := 6) -> Mesh:
		var m := CylinderMesh.new()
		m.top_radius = 0.0
		m.bottom_radius = r
		m.height = h
		m.radial_segments = sides
		m.rings = 1
		var st := SurfaceTool.new()
		st.create_from(m, 0)
		var arr := st.commit_to_arrays()
		var verts: PackedVector3Array = arr[Mesh.ARRAY_VERTEX]
		for k in verts.size():
			verts[k].y += lift
		arr[Mesh.ARRAY_VERTEX] = verts
		var out := ArrayMesh.new()
		out.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
		return out
	var trunk_m := CylinderMesh.new()
	trunk_m.top_radius = 0.06
	trunk_m.bottom_radius = 0.09
	trunk_m.height = 0.5
	trunk_m.radial_segments = 5
	trunk_m.rings = 1
	var trunk := Mk.Batch.new(trunk_m, Color("5a3e26"))
	var pine_a := Mk.Batch.new(cone.call(0.42, 0.8, 0.6))
	var pine_b := Mk.Batch.new(cone.call(0.3, 0.6, 1.0))
	var pine_c := Mk.Batch.new(cone.call(0.18, 0.4, 1.35))
	var bush_m := SphereMesh.new()
	bush_m.radius = 0.3
	bush_m.height = 0.45
	bush_m.radial_segments = 6
	bush_m.rings = 3
	var bush := Mk.Batch.new(bush_m)
	var tuft := Mk.Batch.new(cone.call(0.05, 0.28, 0.1, 4))
	var rock_m := SphereMesh.new()
	rock_m.radius = 0.4
	rock_m.height = 0.6
	rock_m.radial_segments = 5
	rock_m.rings = 2
	var rock := Mk.Batch.new(rock_m)
	var greens := [Color("2f6a3a"), Color("3a7a40"), Color("285a34"), Color("44803e")]
	var rocks := [Color("7a7466"), Color("8a8474"), Color("6a6658"), Color("948e7e")]
	for y in H:
		for x in W:
			# 山上、以及山腳旁邊一格的草地
			var near := tile(x, y) == "^"
			if not near:
				continue
			var tall: float = heights[y][x]
			# 越高越稀、越多石頭（0 山腳 … 1 山頂）
			var alt := clampf((tall - 0.6) / 2.7, 0.0, 1.0)
			var count := 3 + int(Mk.h01(x, y, 31) * 3.0)
			for k in count:
				var u := x + Mk.h01(x, y, 40 + k)
				var v := y + Mk.h01(x, y, 60 + k)
				var r := Mk.h01(x, y, 80 + k)
				var h := ground_h(u, v)
				if h < 0.05:
					continue
				var p := Vector3(u + ox, h - 0.04, v + oz)
				var yaw := r * TAU
				var roll := Mk.h01(x, y, 100 + k)
				if roll < 0.45 * (1.0 - alt * 0.7):
					# 松樹：大小不一，有的歪一點
					var s := 0.6 + r * 0.7
					var g: Color = greens[(x + y + k) % 4] * (0.9 + r * 0.2)
					g.a = 1
					trunk.add(p + Vector3(0, 0.25 * s, 0), Vector3.ONE * s, yaw)
					pine_a.add(p, Vector3.ONE * s, yaw, g)
					pine_b.add(p, Vector3.ONE * s, yaw, g)
					if s > 0.9:
						pine_c.add(p, Vector3.ONE * s, yaw, g)
				elif roll < 0.62:
					var g2: Color = greens[(x * 3 + k) % 4].lerp(Color("6a8a3a"), r * 0.5)
					bush.add(p + Vector3(0, 0.1, 0), Vector3(1, 0.8, 1) * (0.6 + r * 0.6), yaw, g2)
				elif roll < 0.8 + alt * 0.1:
					# 石頭：半埋在坡裡，扁的、尖的都有
					var c: Color = rocks[(x + k) % 4]
					rock.add(p + Vector3(0, 0.02, 0), Vector3(0.6 + r * 0.9, 0.4 + Mk.h01(x, y, 120 + k) * 0.7, 0.5 + r * 0.7), yaw, c)
				else:
					for t in 3:
						var q := p + Vector3((Mk.h01(x, y, 140 + k * 3 + t) - 0.5) * 0.3, 0, (Mk.h01(x, y, 160 + k * 3 + t) - 0.5) * 0.3)
						tuft.add(q, Vector3.ONE * (0.8 + r * 0.5), 0, Color("7a9a48").lerp(Color("a8a058"), alt))
	for b in [trunk, pine_a, pine_b, pine_c, bush, tuft, rock]:
		var mi: MultiMeshInstance3D = b.build()
		if mi:
			add_child(mi)


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
	# 門：站在門口、對著門按空白鍵才進去（每棟房子都有門，還沒做室內的會說門關著）
	var dt := Vector2i(int(b.x + st.door), int(b.y + d - 1))
	doors[dt] = b
	props.append({"node": null, "def": {"sprite": "door", "label": "進去", "lines": [], "door": dt}, "at": Vector2(dt.x + 0.5, dt.y + 0.5)})
	# 做好精細版的房子（fine_house.gd）
	if FineHouse.STYLE.has(b.style):
		root.add_child(FineHouse.build(self, b))
		var lb := Mk.label(b.name, 36)
		lb.position = Vector3(w / 2.0, 3.4 + FineHouse.STYLE[b.style].rise, d / 2.0)
		root.add_child(lb)
		return
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
		# 精細版（fine_props.gd）
		"lantern_post":
			FineProps.lantern_post(g, self)
		"well":
			FineProps.well(g)
		"stall":
			FineProps.stall(g, w)
		"stele":
			g.add_child(Mk.box(Vector3(0.6, 1.2, 0.25), Color("8a8a86"), Vector3(0, 0.6, 0)))
			g.add_child(Mk.box(Vector3(0.75, 0.15, 0.4), Color("6a6a66"), Vector3(0, 0.07, 0)))
		"bulletin":
			FineProps.bulletin(g)
		_:
			g.add_child(Mk.box(Vector3(0.7, 0.4, 0.06), Color("b08a5a"), Vector3(0, 0.85, 0)))
			g.add_child(Mk.box(Vector3(0.07, 0.9, 0.07), Color("6a4428"), Vector3(0, 0.45, -0.04)))


## 主角與村民
func _people() -> void:
	_place_hero(data.spawn)
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
		var wk := {"f": f, "name": n.name, "lines": n.lines, "home": Vector2(s.x + 0.5, s.y + 0.5), "goal": null, "wait": randf() * 3.0, "fixed": not stall.is_empty(), "said": 0, "talking": false}
		if not stall.is_empty():
			wk.stall = stall
			wk.face = stall.face
		walkers.append(wk)


## 對著門按空白鍵：做好室內的就直接換到屋裡，還沒做的說一聲
func _interact(t: Dictionary) -> void:
	if not (t.kind == "prop" and t.p.def.has("door")):
		await super._interact(t)
		return
	var b: Dictionary = doors[t.p.def.door]
	var enter = b.get("enter")
	if enter != null and enter.to in ROOMS:
		main.go(enter.to, enter.spawn)
	else:
		await ui.say([{"text": "%s的門關著。（試作品只做了竹風茶寮的室內）" % b.name}])


func info_text() -> String:
	return "%s　%s\n銀兩 %d" % [data.name, data.subtitle, ui.silver]
