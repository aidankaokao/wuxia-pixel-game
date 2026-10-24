class_name WorldMap
extends GridScene
## 州圖（大地圖的一張）：地形、據點、道路由 ZhouGen 照天下輿圖與州的細節算出來（見 zhou_gen.gd），
## 堆成一整片連續起伏的低多邊形地面；四周往外延伸 M 格隔壁州的景（蒙一層淡淡的霧，只能看不能走）。
## - 主角在地圖上自由走（不必沿著路）：路上最快，平原照常，林地、丘陵慢，山地最慢；水和高峰過不去（路過河的地方有橋，渡口那段要坐船）。
## - 腳程：騎馬、輕功好都走得快（travel_mult），雨雪天路難走（weather_mult）；沿路走一段會擲一次路上的小事（story/road.gd）。
## - 官道走到州圖邊上的出口，就換到隔壁的州（墨暈轉場）；隔壁還沒切好的說一聲。
## - 據點是一小群模型：村莊幾間房、城有城牆與城門樓、門派的大殿、港口的碼頭與船、渡口、驛站的幌子；還沒開放的是「？」。
## - 走到據點旁邊按空白鍵：做好的地方（青竹村）就進去——從哪條路的方向來，就從那一側進村；驛站、茶亭、渡口茶棚打開歇腳選單（story/stay.gd）；其他的說一聲。
## - 天上幾朵雲慢慢飄過，影子落在地上。

const Stay := preload("res://story/stay.gd")
const Bridge := preload("res://story/bridge.gd")
const TERRAIN_NAME := {"S": "海", "s": "淺灘", "b": "沙岸", "r": "河", "l": "湖", "p": "平原", "f": "林地", "h": "丘陵", "m": "山地", "P": "高峰", "d": "沙地"}
const HEIGHT := {"S": -1.0, "s": -0.6, "r": -0.5, "l": -0.5, "b": 0.05, "p": 0.12, "f": 0.18, "h": 0.6, "m": 1.5, "P": 2.6, "d": 0.1}
const COLOR := {"S": "2f5f96", "s": "4a86bc", "r": "4a86bc", "l": "4a8cc4", "b": "e0cf98", "p": "8cc06a", "f": "5e9a4a", "h": "a8b070", "m": "8e8a78", "P": "b8b4a8", "d": "dcc68a"}
## 走在這種地形的速度倍數（null 過不去）；路另算
const SPEED := {"S": null, "s": null, "r": null, "l": null, "b": 1.0, "p": 1.0, "f": 0.75, "h": 0.65, "m": 0.45, "P": null, "d": 0.85}
const ROAD_SPEED := 1.4
const SUB := 2
## 州圖外圍的霧色
const HAZE := Color("b4c0c4")
## 外圍再往外的遠景有多寬（格）
const FAR := 90
const HERO_SCALE := 0.55

var data: Dictionary
var terr: Array = []
var M := 0
var EW := 0
var EH := 0
var exits := {}
## 在州圖上趕路累積的時間（刻，滿一刻才讓時間走）
var _ke := 0.0
var _last_pos := Vector3.ZERO
## 走一格路花幾刻（路上；其他地形照走路速度換算，越難走越久）
const KE_PER_CELL := 0.3
var road := {}
var road_name := {}
var nodes := {}
var _hv := PackedFloat32Array()
var _vw := 0
var clouds: Array = []
## 渡口那段河：不搭橋、不能走，要坐船（格子 → true）
var ferry_water := {}
## 沿路走了多遠（格）：每走 ROAD_STEP 格擲一次路上的小事（story/road.gd）
var _road_dist := 0.0
const ROAD_STEP := 8.0
## 輕功每一重快幾成、最多快到幾倍（照網頁版 geo.ts 的 travelKe）
const LIGHT_SPEED := 0.03
const LIGHT_SPEED_MAX := 1.5


func _ready() -> void:
	var t0 := Time.get_ticks_msec()
	data = ZhouGen.build(start.get("zhou", "yanzhou"))
	var t1 := Time.get_ticks_msec()
	data["title"] = data.name
	data.name = "%s・%s" % [data.region, data.title]
	W = int(data.W)
	H = int(data.H)
	M = int(data.M)
	EW = W + 2 * M
	EH = H + 2 * M
	ox = -W / 2.0
	oz = -H / 2.0
	terr = data.terrain
	for n in data.nodes:
		nodes[n.id] = n
	for e in data.exits:
		exits[Vector2i(e.x, e.y)] = e
	for e in data.edges:
		for c in e.path:
			road[Vector2i(c[0], c[1])] = true
			road_name[Vector2i(c[0], c[1])] = e.name
	_ferries()
	for y in H:
		for x in W:
			var t := T(x, y)
			if SPEED[t] == null and (not road.has(Vector2i(x, y)) or ferry_water.has(Vector2i(x, y))):
				blocked[Vector2i(x, y)] = true
	_ground()
	_bridges()
	_decor()
	for n in data.nodes:
		_settlement(n)
	_bounties()
	for l in data.labels:
		var lb := Mk.label(l.text, 120 if l.kind != "region" else 80, Color(1, 1, 1, 0.75), Color(0.1, 0.15, 0.25, 0.5))
		lb.position = Vector3(l.x + ox, 3.5, l.y + oz)
		add_child(lb)
	_clouds()
	_place()
	mount_up()
	print("州圖 %s：產生 %d ms，蓋模型 %d ms" % [data.title, t1 - t0, Time.get_ticks_msec() - t1])


## 某一格的地形（x、y 是州圖格，可以是外圍的負數）
func T(x: int, y: int) -> String:
	return (terr[clampi(y + M, 0, EH - 1)] as String)[clampi(x + M, 0, EW - 1)]


## 地面：每格的高度先模糊一次，再切成 SUB×SUB 的細網格平滑取值；顏色也在格子之間漸變，
## 山頂高過一個高度就蓋雪，低於水面的是水底，路是一條條土色的帶子
func _ground() -> void:
	var hc := []
	var road_m := []
	for y in range(-M, H + M):
		var row := []
		var rr := []
		for x in range(-M, W + M):
			var t := T(x, y)
			var h: float = HEIGHT[t]
			if t in ["h", "m", "P"]:
				h += Mk.h01(x, y, 3) * (0.3 if t == "h" else 0.8)
			# 路和據點墊高一點，不會泡在水裡
			if road.has(Vector2i(x, y)) and h < 0.1:
				h = 0.1
			# 外圍最外面幾格慢慢壓平，接上更遠處平平的遠景
			var out := maxi(maxi(-x, x - W + 1), maxi(-y, y - H + 1))
			if h > 0.0:
				h = lerpf(h, 0.1, smoothstep(M - 5.0, M - 1.0, out))
			row.append(h)
			rr.append(1.0 if road.has(Vector2i(x, y)) else 0.0)
		hc.append(row)
		road_m.append(rr)
	var hb := _blur(hc)
	var rb := _blur(road_m)
	var n := SUB
	_vw = EW * n + 1
	var vh := EH * n + 1
	_hv.resize(_vw * vh)
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	verts.resize(_vw * vh)
	cols.resize(_vw * vh)
	for j in vh:
		for i in _vw:
			var u := float(i) / n - M
			var v := float(j) / n - M
			var h := _bil(hb, u, v)
			# 山上的稜角
			if h > 0.5:
				h += (Mk.h01(i, j, 5) - 0.5) * 0.35
			_hv[j * _vw + i] = h
			verts[j * _vw + i] = Vector3(u + ox, h, v + oz)
			cols[j * _vw + i] = _color(u, v, h, _bil(rb, u, v))
	var idx := PackedInt32Array()
	for j in vh - 1:
		for i in _vw - 1:
			var a0 := j * _vw + i
			idx.append_array([a0, a0 + 1, a0 + _vw + 1, a0, a0 + _vw + 1, a0 + _vw])
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	arr[Mesh.ARRAY_INDEX] = idx
	var st := SurfaceTool.new()
	st.create_from_arrays(arr)
	st.deindex()
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.mesh = st.commit()
	mi.material_override = Mk.vmat()
	add_child(mi)
	# 水面（大一點，外海接到看不見的地方）
	var water := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(EW + FAR * 2 + 200, EH + FAR * 2 + 200)
	water.mesh = pm
	var wm := StandardMaterial3D.new()
	wm.albedo_color = Color(0.25, 0.5, 0.75, 0.8)
	wm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	wm.roughness = 0.15
	wm.metallic_specular = 0.8
	water.material_override = wm
	water.position.y = -0.18
	add_child(water)
	# 外海的海底：跟州圖裡的海底同色，遠處的海才不會比近處淺
	var bed := Mk.box(Vector3(EW + FAR * 2 + 200, 0.05, EH + FAR * 2 + 200), Color("2f5a8a"), Vector3(0, -1.05, 0))
	add_child(bed)
	_far()


## 更遠處的陸地：照天下輿圖的海岸蓋一片平平的、霧濛濛的地（州圖與外圍那一圈不蓋）
func _far() -> void:
	const FS := 2  # 遠景每格切幾份
	var fw := (EW + FAR * 2) * FS
	var fh := (EH + FAR * 2) * FS
	var m := ZhouGen.far_land(int(data.gx0) - M - FAR, int(data.gy0) - M - FAR, EW + FAR * 2, EH + FAR * 2, FS)
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	var nrm := PackedVector3Array()
	var x0 := -M - FAR + ox
	var y0 := -M - FAR + oz
	# 州圖與外圍那一圈（遮罩格）不蓋
	var hole := Rect2i(FAR * FS, FAR * FS, EW * FS, EH * FS)
	for j in fh:
		var i := 0
		while i < fw:
			if m[j * fw + i] == 0 or hole.has_point(Vector2i(i, j)):
				i += 1
				continue
			# 一列裡連著的陸地併成一長條，少一點三角形
			var i1 := i
			while i1 < fw and m[j * fw + i1] == 1 and not hole.has_point(Vector2i(i1, j)):
				i1 += 1
			var a := Vector3(x0 + float(i) / FS, 0.1, y0 + float(j) / FS)
			var b := Vector3(x0 + float(i1) / FS, 0.1, y0 + float(j) / FS)
			var c := Vector3(x0 + float(i1) / FS, 0.1, y0 + float(j + 1) / FS)
			var d := Vector3(x0 + float(i) / FS, 0.1, y0 + float(j + 1) / FS)
			var col := Color("6f8c58").lerp(HAZE, 0.3 + Mk.h01(j / 12, i / 12, 2) * 0.08)
			for v in [a, b, c, a, c, d]:
				verts.append(v)
				cols.append(col)
				nrm.append(Vector3.UP)
			i = i1
	if verts.is_empty():
		return
	var arr := []
	arr.resize(Mesh.ARRAY_MAX)
	arr[Mesh.ARRAY_VERTEX] = verts
	arr[Mesh.ARRAY_COLOR] = cols
	arr[Mesh.ARRAY_NORMAL] = nrm
	var am := ArrayMesh.new()
	am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arr)
	var mi := MeshInstance3D.new()
	mi.mesh = am
	mi.material_override = Mk.vmat()
	add_child(mi)


func _color(u: float, v: float, h: float, r: float) -> Color:
	# 格子之間的顏色平滑漸變
	var fx := u - 0.5
	var fy := v - 0.5
	var x0 := floori(fx)
	var y0 := floori(fy)
	var tx := fx - x0
	var ty := fy - y0
	var c := func(x: int, y: int) -> Color: return Color(COLOR[T(x, y)])
	var col: Color = (c.call(x0, y0) as Color).lerp(c.call(x0 + 1, y0), tx).lerp((c.call(x0, y0 + 1) as Color).lerp(c.call(x0 + 1, y0 + 1), tx), ty)
	# 大片的深淺
	col = col * (0.95 + 0.08 * sin(u * 0.7 + v * 0.3) + 0.04 * sin(v * 1.3 - u * 0.5))
	# 路
	col = col.lerp(Color("c9a46a"), smoothstep(0.38, 0.55, r))
	# 雪頂、水底
	col = col.lerp(Color("f2f2f6"), smoothstep(2.0, 2.4, h))
	col = col.lerp(Color("8a8a6a"), 1.0 - smoothstep(-0.15, -0.05, h))
	col = col.lerp(Color("2f5a8a"), 1.0 - smoothstep(-0.7, -0.3, h))
	# 州圖外圍：越往外霧越濃
	var out := maxf(maxf(-u, u - W), maxf(-v, v - H))
	if h > -0.05:
		col = col.lerp(HAZE, clampf(out / M, 0.0, 1.0) * 0.55 + (0.12 if out > 0.0 else 0.0))
	col.a = 1.0
	return col


## m 是含外圍的陣列（m[y + M][x + M]）
func _blur(m: Array) -> Array:
	var out := []
	for y in EH:
		var row := []
		for x in EW:
			var sum := 0.0
			var ws := 0.0
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var k := 4.0 if dx == 0 and dy == 0 else (2.0 if dx == 0 or dy == 0 else 1.0)
					sum += float(m[clampi(y + dy, 0, EH - 1)][clampi(x + dx, 0, EW - 1)]) * k
					ws += k
			row.append(sum / ws)
		out.append(row)
	return out


func _bil(m: Array, u: float, v: float) -> float:
	var fx := u + M - 0.5
	var fy := v + M - 0.5
	var x0 := floori(fx)
	var y0 := floori(fy)
	var tx := fx - x0
	var ty := fy - y0
	var at := func(x: int, y: int) -> float: return float(m[clampi(y, 0, EH - 1)][clampi(x, 0, EW - 1)])
	return lerpf(lerpf(at.call(x0, y0), at.call(x0 + 1, y0), tx), lerpf(at.call(x0, y0 + 1), at.call(x0 + 1, y0 + 1), tx), ty)


## 地面某一點的高度（u、v 以格為單位）
func ground_h(u: float, v: float) -> float:
	var fx := clampf((u + M) * SUB, 0, _vw - 1.001)
	var fy := clampf((v + M) * SUB, 0, _hv.size() / _vw - 1.001)
	var x0 := floori(fx)
	var y0 := floori(fy)
	var tx := fx - x0
	var ty := fy - y0
	return lerpf(lerpf(_hv[y0 * _vw + x0], _hv[y0 * _vw + x0 + 1], tx), lerpf(_hv[(y0 + 1) * _vw + x0], _hv[(y0 + 1) * _vw + x0 + 1], tx), ty)


func _ground_y(p: Vector3) -> float:
	return maxf(ground_h(p.x - ox, p.z - oz), -0.1)


func _speed_at(p: Vector3) -> float:
	var g := _grid(p)
	if road.has(g):
		return ROAD_SPEED * travel_mult()
	var s = SPEED[T(g.x, g.y)]
	return (1.0 if s == null else s) * travel_mult()


## 路過河的地方：一段段木橋
func _bridges() -> void:
	for e in data.edges:
		var path: Array = e.path
		for i in path.size():
			var c := Vector2i(path[i][0], path[i][1])
			if not (T(c.x, c.y) in ["r", "l", "s"]) or ferry_water.has(c):
				continue
			var a: Array = path[maxi(0, i - 1)]
			var b: Array = path[mini(path.size() - 1, i + 1)]
			var dir := Vector3(b[0] - a[0], 0, b[1] - a[1]).normalized()
			var p := w3(c.x, c.y, 0.02)
			var deck := Mk.box(Vector3(0.7, 0.08, 1.3), Color("a8763f"), p)
			deck.rotation.y = atan2(dir.x, dir.z)
			add_child(deck)
			for side in [-1, 1]:
				var rail := Mk.box(Vector3(0.04, 0.15, 1.3), Color("6a4428"), p + Vector3(0, 0.1, 0) + dir.cross(Vector3.UP) * side * 0.33)
				rail.rotation.y = deck.rotation.y
				add_child(rail)


## 渡口：從渡口沿著路往外走幾格，碰到的那段水不搭橋，河上擺一條渡船（坐船才過得去，見 story/stay.gd 的 ferry）。
## 渡船兩頭的岸：水段前一格、後一格
func _ferries() -> void:
	for n in data.nodes:
		if n.kind != "ferry" or n.locked or n.rest == null:
			continue
		# 雲水渡口的橋蓋好了（story/bridge.gd）：照常搭橋，不用坐船
		if n.id == "ferry" and Bridge.built():
			continue
		for e in data.edges:
			if e.a != n.id and e.b != n.id:
				continue
			var path: Array = e.path.duplicate()
			if e.b == n.id:
				path.reverse()
			var first := -1
			var last := -1
			for i in mini(path.size(), 8):
				if T(path[i][0], path[i][1]) in ["r", "l", "s"]:
					if first < 0:
						first = i
					last = i
				elif first >= 0:
					break
			if first <= 0 or last + 1 >= path.size():
				continue
			for i in range(first, last + 1):
				ferry_water[Vector2i(path[i][0], path[i][1])] = true
			var near := Vector2i(path[first - 1][0], path[first - 1][1])
			var far := Vector2i(path[last + 1][0], path[last + 1][1])
			var at := Vector2i(path[first][0], path[first][1])
			var g := Node3D.new()
			g.position = w3(at.x, at.y, -0.1)
			add_child(g)
			var dir := Vector2(far - near).normalized()
			_boat(g, Vector3.ZERO, atan2(-dir.y, dir.x))
			props.append({"node": g, "def": {"sprite": "boat", "label": "坐船", "lines": [], "ferry": n.id, "banks": [near, far]}, "at": Vector2(at.x + 0.5, at.y + 0.5)})


## 臨江縣衙的懸賞目標在州圖上的位置（揭了榜才出現，見 story/linjiang.gd）：惡犬在雲水渡口東岸、毛賊在往鳴泉山的路上
func _bounties() -> void:
	if not data.id == "yanzhou":
		return
	var spots := []
	for e in data.edges:
		var ids := [e.a, e.b]
		if "ferry" in ids and "linjiang" in ids:
			var c: Array = e.path[mini(7, e.path.size() - 1)]
			spots.append(["dogs", Vector2i(c[0] + 1, c[1] + 1), "dog", "惡犬"])
		if "linjiang" in ids and "mingquan" in ids:
			var c: Array = e.path[e.path.size() / 2]
			spots.append(["bandits", Vector2i(c[0] + 1, c[1]), "bandit", "毛賊"])
	for sp in spots:
		var at: Vector2i = sp[1]
		var g := Node3D.new()
		g.position = w3(at.x, at.y)
		g.position.y = _ground_y(g.position)
		add_child(g)
		for i in 2:
			var f := Chibi.make(sp[2])
			f.scale = Vector3.ONE * HERO_SCALE
			f.position = Vector3(-0.25 + i * 0.5, 0, (i % 2) * 0.3)
			f.rotation.y = i * 1.3
			g.add_child(f)
		blocked[at] = true
		props.append({"node": g, "def": {"sprite": "bounty", "label": sp[3], "lines": [], "script": "linjiang/bounty_" + sp[0], "when": "lj_b_%s == 1" % sp[0]}, "at": Vector2(at.x + 0.5, at.y + 0.5)})


## 坐船過河：送到離主角遠的那一頭
func ferry_across(banks: Array) -> void:
	var here := _grid(hero.position)
	var to: Vector2i = banks[1] if Vector2(here - banks[0]).length() <= Vector2(here - banks[1]).length() else banks[0]
	hero.position = w3(to.x, to.y)
	hero.position.y = _ground_y(hero.position)
	rig.position = hero.position
	_last_pos = hero.position
	_last_tile = to


## 有坐騎就騎著走：主角底下一匹馬（照馬的毛色），人抬高坐在馬背上；買了馬、賣了馬再叫一次
var _horse: Node3D
const HORSE_COLOR := {"old_bay": ["b08a4a", "6a4a2a"], "jujube": ["8a3a24", "3a2218"], "qingcong": ["c8ccc8", "6a6e72"]}


func mount_up() -> void:
	if _horse:
		_horse.queue_free()
		_horse = null
		hero.ride = 0.0
	var id: String = G.hero.get("mount", "")
	if id == "" or not hero:
		return
	var c: Array = HORSE_COLOR.get(id, HORSE_COLOR.old_bay)
	var coat := Color(c[0])
	var dark := Color(c[1])
	_horse = Node3D.new()
	hero.add_child(_horse)
	_horse.add_child(Mk.box(Vector3(0.42, 0.42, 1.0), coat, Vector3(0, 0.62, 0)))
	for lx in [-0.15, 0.15]:
		for lz in [-0.38, 0.38]:
			_horse.add_child(Mk.box(Vector3(0.11, 0.48, 0.11), coat.darkened(0.1), Vector3(lx, 0.24, lz)))
			_horse.add_child(Mk.box(Vector3(0.12, 0.08, 0.12), dark, Vector3(lx, 0.04, lz)))
	var neck := Mk.box(Vector3(0.24, 0.5, 0.26), coat, Vector3(0, 0.95, 0.5))
	neck.rotation.x = 0.5
	_horse.add_child(neck)
	_horse.add_child(Mk.box(Vector3(0.22, 0.24, 0.42), coat, Vector3(0, 1.15, 0.7)))
	_horse.add_child(Mk.box(Vector3(0.06, 0.4, 0.3), dark, Vector3(0, 1.1, 0.42)))
	var tail := Mk.box(Vector3(0.08, 0.45, 0.08), dark, Vector3(0, 0.6, -0.55))
	tail.rotation.x = -0.4
	_horse.add_child(tail)
	_horse.add_child(Mk.box(Vector3(0.46, 0.06, 0.4), Color("8a2e26"), Vector3(0, 0.86, -0.05)))
	# 人坐在馬背上
	hero.ride = 0.72


## 腳程倍數：騎馬照坐騎的 speed，裝備中的輕功每重快 3%（最多五成），兩者相乘
func travel_mult() -> float:
	var m: Dictionary = {}
	for d in Crafts.data().get("mounts", []):
		if d.id == G.hero.get("mount", ""):
			m = d
	var mount := float(m.get("speed", 1.0))
	var light := minf(LIGHT_SPEED_MAX, 1.0 + Hero.equipped_level(G.hero, "light") * LIGHT_SPEED)
	return mount * light


## 天氣讓路難走：雨天多一成時間、雪天多兩成
func weather_mult() -> float:
	return 1.2 if G.weather == "snow" else (1.1 if G.weather == "rain" else 1.0)


## 林地的樹、平原零星的樹、丘陵的灌木、山上的松樹與岩石
func _decor() -> void:
	var pine_m := CylinderMesh.new()
	pine_m.top_radius = 0.0
	pine_m.bottom_radius = 0.22
	pine_m.height = 0.6
	pine_m.radial_segments = 6
	pine_m.rings = 1
	var pine := Mk.Batch.new(pine_m)
	var round_m := SphereMesh.new()
	round_m.radius = 0.22
	round_m.height = 0.4
	round_m.radial_segments = 6
	round_m.rings = 3
	var round_t := Mk.Batch.new(round_m)
	var trunk_m := CylinderMesh.new()
	trunk_m.top_radius = 0.03
	trunk_m.bottom_radius = 0.04
	trunk_m.height = 0.2
	trunk_m.radial_segments = 4
	trunk_m.rings = 1
	var trunk := Mk.Batch.new(trunk_m, Color("5a3e26"))
	var rock_m := SphereMesh.new()
	rock_m.radius = 0.2
	rock_m.height = 0.28
	rock_m.radial_segments = 5
	rock_m.rings = 2
	var rock := Mk.Batch.new(rock_m)
	for y in range(-M, H + M):
		for x in range(-M, W + M):
			var t := T(x, y)
			if road.has(Vector2i(x, y)):
				continue
			var count := 0
			match t:
				"f":
					count = 4
				"p":
					count = 1 if Mk.h01(x, y, 4) < 0.1 else 0
				"h":
					count = 2
				"m":
					count = 2
			for k in count:
				var u := x + 0.15 + Mk.h01(x, y, 10 + k) * 0.7
				var v := y + 0.15 + Mk.h01(x, y, 20 + k) * 0.7
				var h := ground_h(u, v)
				if h < 0.0 or h > 2.0:
					continue
				var p := Vector3(u + ox, h, v + oz)
				var r := Mk.h01(x, y, 30 + k)
				var s := 0.7 + r * 0.6
				if t == "f" or (t == "m" and r < 0.6):
					trunk.add(p + Vector3(0, 0.1 * s, 0), Vector3.ONE * s)
					var g := Color("2f6a3a").lerp(Color("4a8a40"), r) * (0.9 + r * 0.2)
					g.a = 1
					pine.add(p + Vector3(0, 0.45 * s, 0), Vector3.ONE * s, r * 6, g)
				elif t == "p":
					trunk.add(p + Vector3(0, 0.1, 0), Vector3.ONE)
					round_t.add(p + Vector3(0, 0.38, 0), Vector3.ONE * s, r * 6, Color("5aa24c").lerp(Color("7ab858"), r))
				else:
					rock.add(p + Vector3(0, 0.05, 0), Vector3(1.2, 0.8, 1) * s, r * 6, Color("8a8676").lerp(Color("9a9484"), r) if t == "m" else Color("7a9a48").lerp(Color("8aa858"), r))
	for b in [trunk, pine, round_t, rock]:
		var mi: MultiMeshInstance3D = b.build()
		if mi:
			add_child(mi)


## 小房子：白牆、人字頂（顏色看據點）
func _house(parent: Node3D, at: Vector3, roof: Color, yaw: float, s := 1.0) -> void:
	var g := Node3D.new()
	g.position = at
	g.rotation.y = yaw
	g.scale = Vector3.ONE * s
	parent.add_child(g)
	g.add_child(Mk.box(Vector3(0.5, 0.3, 0.36), Color("ece2cc"), Vector3(0, 0.15, 0)))
	g.add_child(Mk.box(Vector3(0.08, 0.18, 0.02), Color("6a2a20"), Vector3(0, 0.09, 0.185)))
	g.add_child(Mk.roof(0.62, 0.5, 0.22, roof, Vector3(0, 0.41, 0)))


## 據點的模型與名字；能互動的據點登記成 props（走到旁邊按空白鍵）
func _settlement(n: Dictionary) -> void:
	var g := Node3D.new()
	var base := w3(n.x, n.y)
	base.y = ground_h(n.x + 0.5, n.y + 0.5)
	g.position = base
	add_child(g)
	var kind: String = n.kind
	var label_h := 1.0
	# 府城、京城大一號
	var rank: String = n.get("rank", "")
	var sc := 1.8 if rank == "京" else (1.35 if rank == "府" else 1.0)
	if true:
		match kind:
			"village":
				for i in 5:
					var a := TAU * i / 5.0 + 0.3
					_house(g, Vector3(cos(a) * 0.7, 0, sin(a) * 0.55), Color("6a4a3a") if i % 2 else Color("4a5568"), -a + PI / 2.0)
			"city":
				# 城牆、四角與城門樓、城裡的房子與一座塔
				var r := 1.4
				for side in 4:
					var a := side * PI / 2.0
					var wall := Mk.box(Vector3(r * 2, 0.35, 0.12), Color("8a8478"), Vector3(cos(a) * r, 0.18, sin(a) * r))
					wall.rotation.y = -a + PI / 2.0
					g.add_child(wall)
					var gate := Vector3(cos(a) * r, 0, sin(a) * r)
					g.add_child(Mk.box(Vector3(0.4, 0.5, 0.4), Color("8a8478"), gate + Vector3(0, 0.25, 0)))
					g.add_child(Mk.roof(0.5, 0.5, 0.2, Color("3f4a5e"), gate + Vector3(0, 0.6, 0)))
					g.add_child(Mk.box(Vector3(0.3, 0.3, 0.3), Color("7a7468"), Vector3(cos(a + PI / 4) * r * 1.41, 0.2, sin(a + PI / 4) * r * 1.41)))
				for i in 7:
					var a := TAU * i / 7.0
					_house(g, Vector3(cos(a) * 0.8, 0, sin(a) * 0.8), Color("3f4a5e"), -a, 0.9)
				for lv in 4:
					g.add_child(Mk.box(Vector3(0.36 - lv * 0.06, 0.22, 0.36 - lv * 0.06), Color("e8dcc4"), Vector3(0, 0.11 + lv * 0.28, 0)))
					g.add_child(Mk.cyl(0.0, 0.3 - lv * 0.05, 0.1, Color("3f4a5e"), Vector3(0, 0.27 + lv * 0.28, 0), 4))
				label_h = 1.8
			"sect":
				# 門派：石階上的大殿（綠瓦紅柱）、山門牌坊
				g.add_child(Mk.box(Vector3(1.2, 0.15, 0.8), Color("b8b2a4"), Vector3(0, 0.07, -0.2)))
				g.add_child(Mk.box(Vector3(0.9, 0.45, 0.5), Color("ece2cc"), Vector3(0, 0.37, -0.2)))
				for px in [-0.4, -0.15, 0.15, 0.4]:
					g.add_child(Mk.box(Vector3(0.05, 0.45, 0.05), Color("8a2e26"), Vector3(px, 0.37, 0.07)))
				g.add_child(Mk.roof(1.2, 0.85, 0.35, Color("3e6656"), Vector3(0, 0.77, -0.2)))
				for px in [-0.35, 0.35]:
					g.add_child(Mk.box(Vector3(0.06, 0.5, 0.06), Color("8a2e26"), Vector3(px, 0.25, 0.7)))
				g.add_child(Mk.box(Vector3(0.9, 0.08, 0.1), Color("3e6656"), Vector3(0, 0.52, 0.7)))
				label_h = 1.4
			"port":
				for i in 4:
					_house(g, Vector3(-0.6 + (i % 2) * 0.6, 0, -0.4 + (i / 2) * 0.6), Color("4a5568"), 0.0)
				_pier(g, Vector3(0.9, 0, 0), 1.0)
				_boat(g, Vector3(1.6, -0.15, 0.4), 0.3)
				_boat(g, Vector3(1.8, -0.15, -0.4), -0.2)
			"ferry":
				_pier(g, Vector3(0.3, 0, 0), 0.6)
				_boat(g, Vector3(0.8, -0.15, 0.3), 0.6)
				_house(g, Vector3(-0.4, 0, -0.3), Color("6a4a3a"), 0.0, 0.8)
			"inn":
				_house(g, Vector3(0, 0, 0), Color("6a4a3a"), 0.0, 1.2)
				g.add_child(Mk.cyl(0.02, 0.02, 0.8, Color("8a7a48"), Vector3(0.45, 0.4, 0.3), 4))
				g.add_child(Mk.box(Vector3(0.15, 0.3, 0.02), Color("c8302a"), Vector3(0.37, 0.6, 0.3)))
			"wild":
				g.add_child(Mk.box(Vector3(0.06, 0.6, 0.06), Color("6a4428"), Vector3(0, 0.3, 0)))
				g.add_child(Mk.box(Vector3(0.4, 0.14, 0.04), Color("b08a5a"), Vector3(0.1, 0.5, 0)))
			"pass":
				# 關隘：兩段石牆夾著城門樓
				for side in [-1, 1]:
					g.add_child(Mk.box(Vector3(1.1, 0.45, 0.25), Color("8a8478"), Vector3(side * 0.85, 0.22, 0)))
				g.add_child(Mk.box(Vector3(0.6, 0.6, 0.35), Color("8a8478"), Vector3(0, 0.3, 0)))
				g.add_child(Mk.box(Vector3(0.24, 0.32, 0.37), Color("3a2e26"), Vector3(0, 0.16, 0)))
				g.add_child(Mk.box(Vector3(0.5, 0.25, 0.3), Color("8a2e26"), Vector3(0, 0.72, 0)))
				g.add_child(Mk.roof(0.75, 0.5, 0.22, Color("3f4a5e"), Vector3(0, 0.95, 0)))
				label_h = 1.5
	for c in g.get_children():
		c.position *= sc
		c.scale *= sc
	var lb := Mk.label(n.name, 34 if sc == 1.0 else 44, Color("fffbe8") if not n.locked else Color("d8d2c4"))
	lb.position = Vector3(0, label_h * sc, 0)
	g.add_child(lb)
	var label := "歇腳" if kind == "inn" else ("查看" if n.locked else "進去")
	props.append({"node": g, "def": {"sprite": "node", "label": label, "lines": [], "node": n.id}, "at": Vector2(n.x + 0.5, n.y + 0.5)})


func _pier(g: Node3D, at: Vector3, length: float) -> void:
	g.add_child(Mk.box(Vector3(length, 0.05, 0.3), Color("a8763f"), at + Vector3(0, 0.0, 0)))
	for k in 3:
		g.add_child(Mk.box(Vector3(0.05, 0.3, 0.05), Color("5a3a22"), at + Vector3(-length / 2.0 + k * length / 2.0, -0.12, 0.15)))


func _boat(g: Node3D, at: Vector3, yaw: float) -> void:
	var b := Node3D.new()
	b.position = at
	b.rotation.y = yaw
	g.add_child(b)
	b.add_child(Mk.box(Vector3(0.7, 0.12, 0.24), Color("7a5232"), Vector3(0, 0.1, 0)))
	b.add_child(Mk.box(Vector3(0.03, 0.55, 0.03), Color("5a3a22"), Vector3(0, 0.4, 0)))
	b.add_child(Mk.box(Vector3(0.02, 0.35, 0.3), Color("e8dcc0"), Vector3(0.03, 0.45, 0)))


## 幾朵雲：幾團扁扁的白球，慢慢往東飄，影子落在地上
func _clouds() -> void:
	for i in 7:
		var c := Node3D.new()
		c.position = Vector3(ox + Mk.h01(i, 1) * W, 11.0 + Mk.h01(i, 2) * 2.0, oz + Mk.h01(i, 3) * H)
		for k in 4:
			var puff := Mk.ball(0.8 + Mk.h01(i, k) * 0.6, Color("ffffff"), Vector3((k - 1.5) * 0.9, Mk.h01(k, i) * 0.3, (Mk.h01(i, k + 5) - 0.5) * 0.8), 8)
			puff.scale = Vector3(1, 0.55, 1)
			c.add_child(puff)
		add_child(c)
		clouds.append(c)


## 主角出現的地方：從某個據點出來，就站在那個據點往來路方向的一側
func _place() -> void:
	hero = Chibi.make("hero")
	hero.scale = Vector3.ONE * HERO_SCALE
	add_child(hero)
	if start.has("exact"):
		var c := Vector2i(int(start.gx) - int(data.gx0), int(start.gy) - int(data.gy0))
		hero.position = w3(c.x, c.y)
		hero.position.y = _ground_y(hero.position)
		hero.face(_facing_vec(start.get("facing", "down")))
		_last_tile = c
		rig.target = hero
		rig.position = hero.position
		_last_pos = hero.position
		return
	if start.has("gx"):
		_place_at_edge()
		_last_pos = hero.position
		return
	var n: Dictionary = nodes.get(start.get("node", "qingzhu"), nodes.get("qingzhu", data.nodes[0]))
	var dir := Vector3(0, 0, 1)
	var from: String = start.get("from", "")
	if from != "" and nodes.has(from):
		dir = Vector3(nodes[from].x - n.x, 0, nodes[from].y - n.y).normalized()
	var p := w3(n.x, n.y) + dir * 1.3
	if not _walkable(p):
		p = w3(n.x, n.y) + Vector3(0, 0, 1.0)
	hero.position = p
	hero.position.y = _ground_y(p)
	hero.face(dir)
	rig.target = hero
	rig.position = hero.position
	_last_pos = hero.position


## 從隔壁州走過來：站在天下格 (gx, gy) 對應的地方——找最近的出口，往州裡走兩格
func _place_at_edge() -> void:
	var g := Vector2i(int(start.gx) - int(data.gx0), int(start.gy) - int(data.gy0))
	var best := Vector2i(clampi(g.x, 0, W - 1), clampi(g.y, 0, H - 1))
	var bd := 12.0
	var inward := Vector2i(1 if g.x < 0 else (-1 if g.x >= W else 0), 1 if g.y < 0 else (-1 if g.y >= H else 0))
	for c in exits:
		var d := Vector2(c - g).length()
		if d < bd:
			bd = d
			best = c
			inward = Vector2i(-exits[c].out[0], -exits[c].out[1])
	var p := w3(best.x + inward.x * 2, best.y + inward.y * 2)
	if not _walkable(p):
		p = w3(best.x, best.y)
	hero.position = p
	hero.position.y = _ground_y(p)
	hero.face(Vector3(inward.x, 0, inward.y))
	_last_tile = _grid(p)
	rig.target = hero
	rig.position = hero.position


## 走到州圖邊上的出口：隔壁的州切好了就換過去，還沒切好的說一聲、退回一步
func _on_tile(g: Vector2i) -> void:
	if not exits.has(g):
		return
	var e: Dictionary = exits[g]
	if e.zhou != "":
		main.hop("zhou:" + e.zhou, {"zhou": e.zhou, "gx": int(data.gx0) + g.x + e.out[0], "gy": int(data.gy0) + g.y + e.out[1]})
	else:
		hero.position -= Vector3(e.out[0], 0, e.out[1]) * 0.8
		_last_tile = _grid(hero.position)
		ui.say([{"text": "這條官道往%s去，那一帶的地圖還沒切好。" % e.toName}])


## 從主角的位置看，最像是從哪一條路過來的（用來決定從據點的哪一側進去）
func _from_dir(n: Dictionary) -> String:
	var to_hero := Vector3(hero.position.x - (n.x + 0.5 + ox), 0, hero.position.z - (n.y + 0.5 + oz)).normalized()
	var best := ""
	var best_dot := -2.0
	for e in data.edges:
		var other := ""
		if e.b == "":
			continue
		if e.a == n.id:
			other = e.b
		elif e.b == n.id:
			other = e.a
		else:
			continue
		var o: Dictionary = nodes[other]
		var d := Vector3(o.x - n.x, 0, o.y - n.y).normalized()
		if d.dot(to_hero) > best_dot:
			best_dot = d.dot(to_hero)
			best = other
	return best


func _interact(t: Dictionary) -> void:
	if t.kind == "prop" and t.p.def.has("ferry"):
		await Story.run("stay/ferry", self, {"node": t.p.def.ferry, "banks": t.p.def.banks})
		return
	if t.kind != "prop" or not t.p.def.has("node"):
		await super._interact(t)
		return
	var n: Dictionary = nodes[t.p.def.node]
	if n.locked:
		await ui.say([{"text": "%s：%s" % [n.name, n.desc]}, {"text": "（這裡還沒開放）"}])
		return
	# 驛站、茶亭、渡口茶棚：歇腳的選單（story/stay.gd）
	if n.rest != null:
		await Story.run("stay/inn", self, {"node": n.id})
		return
	var from := _from_dir(n)
	var sp = n.enterFrom.get(from, n.enter) if from != "" else n.enter
	if sp != null and sp.map in Village.OUTDOOR:
		var c := await ui.ask({"text": "%s：%s\n要進去嗎？" % [n.name, n.desc]}, ["進去", "不了"])
		if c == 0:
			await main.travel(sp.map, {"x": sp.x, "y": sp.y, "facing": sp.facing})
	else:
		await ui.say([{"text": "%s：%s" % [n.name, n.desc]}, {"text": "（Godot 版還沒做這裡）"}])


func _process(dt: float) -> void:
	super._process(dt)
	# 趕路花時間：走過的距離 × 每格幾刻 ÷ 這裡的走路速度（路上 1.4 倍快，所以照路上的速度換算）
	if hero:
		var moved := Vector2(hero.position.x - _last_pos.x, hero.position.z - _last_pos.z).length()
		_last_pos = hero.position
		if moved > 0.0 and moved < 2.0:
			_ke += moved * KE_PER_CELL * ROAD_SPEED / maxf(0.3, _speed_at(hero.position)) * weather_mult()
			if _ke >= 1.0:
				G.advance(int(_ke))
				_ke -= int(_ke)
			# 沿路走：每走一段擲一次路上的小事
			var g := _grid(hero.position)
			if road_name.has(g) and not ui.busy():
				_road_dist += moved
				if _road_dist >= ROAD_STEP:
					_road_dist = 0.0
					var near := []
					for n in data.nodes:
						if Vector2(n.x - g.x, n.y - g.y).length() < 14.0:
							near.append(n.id)
					Story.run("road/maybe", self, {"road": road_name[g], "near": near})
	for c in clouds:
		c.position.x += dt * 0.4
		if c.position.x > ox + W + 10:
			c.position.x = ox - 10


## 州圖上的位置用天下格存（exact：讀檔時站回同一格）
func where_at() -> Dictionary:
	var g := _grid(hero.position)
	var at := super.where_at()
	return {"zhou": data.id, "gx": int(data.gx0) + g.x, "gy": int(data.gy0) + g.y, "facing": at.facing, "exact": true}


func info_text() -> String:
	var g := _grid(hero.position)
	var where := ""
	var best := 99.0
	for n in data.nodes:
		var d := Vector2(n.x - g.x, n.y - g.y).length()
		if d < best and d < 3.0:
			best = d
			where = "%s附近・" % n.name
	var on_road: String = ("%s・" % road_name[g]) if road_name.has(g) else ""
	var m := Stay.mount_def(G.hero.get("mount", ""))
	var pace := travel_mult()
	var extra := ""
	if not m.is_empty() or pace > 1.0:
		extra = "・%s腳程 ×%.2f" % [("騎%s、" % m.name) if not m.is_empty() else "", pace]
	return "%s\n%s%s%s%s" % [data.name, where, on_road, TERRAIN_NAME.get(T(g.x, g.y), ""), extra]
