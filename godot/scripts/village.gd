class_name Village
extends GridScene
## 室外地圖（青竹村、青竹村北……）：讀網頁版匯出的地圖資料（data/<地圖 id>.json：字元格子、建築、擺設、出入口、
## 村民與台詞），蓋成立體的村子。地圖四周往外多生一圈 M 格的景（照邊緣的地形接下去：山接山、林接林、河往外流、
## 路延伸到遠方，最外面一圈是山），只能看、不能走；走到出入口就換地圖，往大地圖的出口就到大地圖（world_map.gd）。
## - 山（^）依周圍有幾格山而隆起，水（~）往下凹，路、田、廣場貼在地面上。
## - 主角用方向鍵走（相對鏡頭方向），Shift 跑；村民在自己的位置附近走動，攤販站著不動。
## - 面對村民、擺設時頭上冒出「空白鍵 交談／查看」，按空白鍵對話；陶四、鍾嬸可以買賣東西。
## - 站在門口、對著門按空白鍵就換到室內（room.gd）；沒有室內的房子（趙家）會說門關著。

const GROUND := {":": "c9a46a", "E": "c9a46a", "=": "b9b3a4", "n": "8a6040", "c": "7a5a3a", "g": "8b5e3c", "~": "3a5f86", "#": "a8763f"}

## 顧攤子的人：站哪、面向哪、賣什麼（貨郎照網頁版陶四的貨）
const STALLS := {
	"tao": {"x": 32, "y": 22, "face": Vector3(-1, 0, 0), "title": "陶四的貨郎攤", "stock": ["jinchuang", "tea", "herb", "rice", "flour", "egg", "tofu", "greens", "radish", "redbean", "sugar", "rod"], "greet": "走過路過不要錯過！傷藥、茶葉、草藥，樣樣都有。獸皮、獸肉也收！"},
	"zhong": {"x": 32, "y": 17, "face": Vector3(0, 0, 1), "title": "鍾嬸的茶攤", "stock": ["tea", "egg"], "greet": "來啦！坐下喝碗茶歇歇腳？"},
	# 大埠頭的魚攤（story/life_dabutou.gd）
	"xiaoluo": {"x": 25, "y": 25, "face": Vector3(0, 0, 1), "title": "大埠頭魚市", "stock": ["sea_fish", "shrimp", "seaweed"], "greet": "今早剛靠岸的海魚！蝦子還在跳呢！"},
	"xiaolang": {"x": 28, "y": 25, "face": Vector3(0, 0, 1), "title": "大埠頭魚市", "stock": ["sea_fish", "shrimp", "seaweed"], "greet": "海帶、鮮蝦，都是我爹船上撈的！"},
}
## 精細版的房子（瓦片屋頂、斗拱、格子窗……，見 fine_house.gd）；有樣式設定的都用精細版

## 做好室內的房子（地圖 id）
const ROOMS := ["qz_liu", "qz_tea", "qz_smithy", "qz_wang", "qz_temple", "by_tavern", "by_qinhome",
	"lj_cloth", "lj_inn", "lj_tower", "lj_clinic", "lj_pawn", "lj_escort", "lj_guild", "lj_teashop", "lj_academy", "lj_yamen_hall", "lj_yamen_west", "lj_yamen_east",
	"mq_hall", "mq_dorm", "mq_room_a", "mq_room_b", "mq_cell_1", "mq_cell_2", "mq_train", "mq_lib", "mq_armory", "mq_med", "mq_kitchen",
	"bp_inn", "bp_trader", "bp_ship", "bp_shrine"]
## 做好的室外地圖（出入口通到這些就換過去）
const OUTDOOR := ["qingzhu", "qz_north", "canglan", "biyi", "by_isle", "linjiang", "lj_yamen", "mingquan", "mq_sect", "mq_back", "mq_farm", "mq_ridge", "dabutou"]
## 依狀態產生的室內（自宅 home:空地id、房產 prop:物件id），由這些劇情檔的 room_data 給地圖資料
const GEN_ROOMS := {"home:": "res://story/estate.gd", "prop:": "res://story/property.gd"}
## 載入室外地圖資料時，依狀態補上東西的劇情檔（patch_map：自宅的空地與房子、名下房產的門與店名）
const MAP_PATCHES := ["res://story/estate.gd", "res://story/property.gd"]
## 地圖四周往外延伸幾格（地圖資料可以用 ring 指定：主角會走到很靠邊的地圖要寬一點，免得看到外面）
var M := 16


## 這個 id 是不是做好的室內（含依狀態產生的）
static func is_room(id: String) -> bool:
	if id in ROOMS:
		return true
	for k in GEN_ROOMS:
		if id.begins_with(k):
			return true
	return false

var map_id := "qingzhu"
var data: Dictionary
## 延伸之後的整片格子（含地圖本身），[y + M][x + M]
var _ext := []
var EW := 0
var EH := 0
var heights := []
## 地面網格每個頂點的高度（給山上的樹、石頭找地面高度）
var _hv := PackedFloat32Array()
var _vw := 0
## 門口那一格 → 房子（走上去就進門）
var doors := {}


func open(id: String) -> void:
	map_id = id


func _ready() -> void:
	var f := FileAccess.open("res://data/%s.json" % map_id, FileAccess.READ)
	data = JSON.parse_string(f.get_as_text())
	for p in MAP_PATCHES:
		load(p).patch_map(map_id, data)
	M = int(data.get("ring", 16))
	var tiles: Array = data.tiles
	H = tiles.size()
	W = (tiles[0] as String).length()
	ox = -W / 2.0
	oz = -H / 2.0
	EW = W + M * 2
	EH = H + M * 2
	_ring()
	for y in H:
		for x in W:
			if (data.blocking as String).contains(tile(x, y)):
				blocked[Vector2i(x, y)] = true
	_heights()
	_ground()
	_walls()
	_platforms()
	_plants()
	_mountain_plants()
	for b in data.buildings:
		_building(b)
	for p in data.props:
		_prop(p)
	outdoor = true
	triggers = data.get("triggers", [])
	_people()
	# 室外可以騎馬（V 上馬、下馬）
	rides = true
	mount_up()
	refresh()


func tile(x: int, y: int) -> String:
	if y >= 0 and y < H and x >= 0 and x < W:
		return (data.tiles[y] as String)[x]
	if y < -M or y >= H + M or x < -M or x >= W + M:
		return "^"
	return _ext[y + M][x + M]


## 地圖外圍的景：照最近的邊緣格子往外接——山接山、竹林接竹林、河往外流、路筆直延伸，
## 草地越往外樹越多（偶爾有石頭、花），最外面三圈是山（路與河從山間穿出去）
func _ring() -> void:
	_ext = []
	for y in range(-M, H + M):
		var row := []
		for x in range(-M, W + M):
			var cx := clampi(x, 0, W - 1)
			var cy := clampi(y, 0, H - 1)
			var d := maxi(absi(x - cx), absi(y - cy))
			if d == 0:
				row.append((data.tiles[y] as String)[x])
				continue
			var b := (data.tiles[cy] as String)[cx]
			# 城裡的院子（例如縣衙中庭）：外圍一律是城裡的地面，不長山林
			if data.has("ring_fill"):
				row.append(data.ring_fill)
				continue
			var r := Mk.h01(x, y, 77)
			var straight := x == cx or y == cy
			var c := "."
			if b in ["~", "#"]:
				c = "~"
			elif b in [":", "E", "="] and straight:
				c = ":"
			elif d >= M - 3:
				c = "^"
			elif b == "^":
				c = "^"
			elif b == "Y":
				c = "Y" if r < 0.8 else "T"
			elif b == "T":
				c = "T" if r < 0.85 else "."
			else:
				var forest := 0.2 + d * 0.06
				c = "T" if r < forest else ("o" if r < forest + 0.03 else ("*" if r < forest + 0.07 else "."))
			row.append(c)
		_ext.append(row)


func _heights() -> void:
	heights = []
	for y in range(-M, H + M):
		var row := []
		for x in range(-M, W + M):
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
				# 地圖外面越遠的山越高
				var d := maxi(maxi(-x, x - (W - 1)), maxi(-y, y - (H - 1)))
				if d > 0:
					h += d * 0.12
			row.append(h)
		heights.append(row)


## 每格切成幾小格（地面網格的細緻度）
const SUB := 4


## 一張「每格一個數字」的表
func _grid_of(f: Callable) -> Array:
	var out := []
	for y in range(-M, H + M):
		var row := []
		for x in range(-M, W + M):
			row.append(f.call(x, y))
		out.append(row)
	return out


## 模糊一次（中間 4、上下左右 2、斜角 1），讓邊界變圓
func _blur(m: Array) -> Array:
	var out := []
	for y in EH:
		var row := []
		for x in EW:
			var sum := 0.0
			var wsum := 0.0
			for dy in range(-1, 2):
				for dx in range(-1, 2):
					var k := 4.0 if dx == 0 and dy == 0 else (2.0 if dx == 0 or dy == 0 else 1.0)
					var yy := clampi(y + dy, 0, EH - 1)
					var xx := clampi(x + dx, 0, EW - 1)
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
	var at := func(x: int, y: int) -> float: return float(m[clampi(y + M, 0, EH - 1)][clampi(x + M, 0, EW - 1)])
	return lerpf(lerpf(at.call(x0, y0), at.call(x0 + 1, y0), tx), lerpf(at.call(x0, y0 + 1), at.call(x0 + 1, y0 + 1), tx), ty)


## 地面：每格切成 SUB×SUB 小格，高度與地表顏色都在格子之間平滑過渡——
## 河岸、小路、廣場的邊是圓順的曲線，山是緩坡（低多邊形的面）；田地維持方正。
func _ground() -> void:
	var water := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) in ["~", "#"] else 0.0))
	var path := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) in [":", "E", "#"] else 0.0))
	var plaza := _blur(_grid_of(func(x, y): return 1.0 if tile(x, y) in ["=", "X", "R", "H", "S"] else 0.0))
	var mtn := _grid_of(func(x, y): return heights[y + M][x + M] if tile(x, y) == "^" else 0.0)
	var n := SUB
	var vw := EW * n + 1
	var vh := EH * n + 1
	# 每個頂點的高度
	var hv := PackedFloat32Array()
	hv.resize(vw * vh)
	for j in vh:
		for i in vw:
			var u := float(i) / n - M
			var v := float(j) / n - M
			var ws := smoothstep(0.25, 0.75, _bil(water, u, v))
			# 水把山坡切開（山腳的溪澗不會被旁邊的山填平）
			var hm := maxf(0.0, _bil(mtn, u, v) - 0.35) * 1.4 * (1.0 - ws)
			var hw := -0.45 * ws
			# 山上多一點起伏（低多邊形的稜角）
			hv[j * vw + i] = hm + hw + (Mk.h01(i, j, 5) - 0.5) * 0.4 * minf(1.0, hm)
	_hv = hv
	_vw = vw
	# 網格：頂點共用，顏色在頂點上算、在三角形裡漸變（邊界用很窄的漸變，看起來是圓順的線，不會鋸齒）
	# 草地照季節換色（scripts/season.gd：夏深綠、秋枯黃、冬覆雪）
	var grass_a := Season.tint(Color("7cb262"), "ground")
	var grass_b := Season.tint(Color("8cc070"), "ground")
	var verts := PackedVector3Array()
	var cols := PackedColorArray()
	verts.resize(vw * vh)
	cols.resize(vw * vh)
	for j in vh:
		for i in vw:
			var u := float(i) / n - M
			var v := float(j) / n - M
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
	# 外圍再遠的地方：一大片深綠色的地，鏡頭拉很遠也不會看到空的
	var far := Mk.box(Vector3(EW + 400, 0.1, EH + 400), Season.tint(Color("4a7a40"), "ground"),Vector3(ox + W / 2.0, -0.6, oz + H / 2.0))
	add_child(far)
	# 水面
	var wplane := MeshInstance3D.new()
	var pm := PlaneMesh.new()
	pm.size = Vector2(EW, EH)
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
	_stairs()


## 石階（S）：石板地上一道道階沿（東西向的橫線，往北一階階上去）
func _stairs() -> void:
	var bm := BoxMesh.new()
	bm.size = Vector3(1.0, 0.05, 0.1)
	var edge := Mk.Batch.new(bm, Color("8e887a"))
	for y in H:
		for x in W:
			if tile(x, y) == "S":
				for k in 3:
					var p := w3(x, y)
					edge.add(Vector3(p.x, ground_h(x + 0.5, y + 0.2 + k * 0.33) + 0.02, p.z - 0.3 + k * 0.33))
	var mi: MultiMeshInstance3D = edge.build()
	if mi:
		add_child(mi)


## 進得去的門口上方：一個倒金字塔形的金色光標，上下浮動、慢慢轉；主角走近（MARK_NEAR 格內）才亮出來。
## 不做深度測試，房子背對鏡頭、門被屋頂擋住也看得到
const MARK_NEAR := 8.0
var marks: Array = []


func _door_marker(dt: Vector2i, face: String) -> void:
	var m := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.28
	cm.bottom_radius = 0.0
	cm.height = 0.5
	cm.radial_segments = 4
	cm.rings = 1
	m.mesh = cm
	var mat := StandardMaterial3D.new()
	mat.albedo_color = Color("f0c860")
	mat.emission_enabled = true
	mat.emission = Color("f0b040")
	mat.emission_energy_multiplier = 1.2
	mat.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	mat.no_depth_test = true
	mat.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	mat.render_priority = 10
	m.material_override = mat
	# 浮在門口前面一點、門楣上方
	var fd: Vector2i = FACE_DIR[face]
	m.position = Vector3(dt.x + 0.5 + fd.x * 0.4 + ox, 2.3, dt.y + 0.5 + fd.y * 0.4 + oz)
	m.visible = false
	add_child(m)
	marks.append({"node": m, "at": Vector2(dt.x + 0.5, dt.y + 0.5), "base": m.position.y, "mat": mat})


func _process(dt: float) -> void:
	super._process(dt)
	_fireworks(dt)
	if not hero or marks.is_empty():
		return
	var hp := Vector2(hero.position.x - ox, hero.position.z - oz)
	var t := Time.get_ticks_msec() / 1000.0
	for mk in marks:
		var near: bool = hp.distance_to(mk.at) < MARK_NEAR
		var n: MeshInstance3D = mk.node
		n.visible = near
		if near:
			n.position.y = mk.base + sin(t * 3.0) * 0.12
			n.rotation.y = t * 1.5
			# 越近越亮
			mk.mat.albedo_color.a = clampf(1.3 - hp.distance_to(mk.at) / MARK_NEAR, 0.35, 1.0)


## 墊高的台子（資料的 platforms：{kind, x, y, w, h, top}），人可以走上去、站在上面（_ground_y）。
## 擂台 leitai：石塊砌的台基（一層層錯縫）、石板鋪的台面（一塊塊方石、邊上一圈壓邊的條石），四邊正中各一道石階，四角立一根矮石柱
func _platforms() -> void:
	for pf in data.get("platforms", []):
		var x0: float = pf.x
		var y0: float = pf.y
		var w: float = pf.w
		var d: float = pf.h
		var top: float = pf.top
		var g := Node3D.new()
		g.position = Vector3(x0 + w / 2.0 + ox, 0, y0 + d / 2.0 + oz)
		add_child(g)
		var stone := Color("a8a296")
		var dark := Color("7e786c")
		# 台基：整塊石，外面一圈錯縫的石塊（兩層）
		g.add_child(Mk.box(Vector3(w - 0.04, top - 0.06, d - 0.04), stone.darkened(0.08), Vector3(0, (top - 0.06) / 2.0, 0)))
		var course := (top - 0.06) / 2.0
		for row in 2:
			var cy := course * (row + 0.5)
			for side in 4:
				var along := w if side < 2 else d
				var n := int(along / 0.9) + 1
				var bl := along / n
				for i in n + (row % 2):
					var t0 := -along / 2.0 + (i - 0.5 * (row % 2)) * bl
					var t1 := minf(t0 + bl, along / 2.0)
					t0 = maxf(t0, -along / 2.0)
					var mid := (t0 + t1) / 2.0
					var len := t1 - t0 - 0.03
					var col := stone.lerp(dark, Mk.h01(i, row * 4 + side, 3) * 0.6)
					if side < 2:
						var z := (d / 2.0) * (1 if side == 0 else -1)
						g.add_child(Mk.box(Vector3(len, course - 0.02, 0.06), col, Vector3(mid, cy, z)))
					else:
						var x := (w / 2.0) * (1 if side == 2 else -1)
						g.add_child(Mk.box(Vector3(0.06, course - 0.02, len), col, Vector3(x, cy, mid)))
		# 壓邊的條石
		g.add_child(Mk.box(Vector3(w + 0.12, 0.07, d + 0.12), dark, Vector3(0, top - 0.035, 0)))
		# 台面：一塊塊方石板，顏色深淺不一
		var slab := BoxMesh.new()
		slab.size = Vector3(0.94, 0.04, 0.94)
		var slabs := Mk.Batch.new(slab)
		for i in int(w):
			for j in int(d):
				slabs.add(Vector3(-w / 2.0 + 0.5 + i, top + 0.01, -d / 2.0 + 0.5 + j), Vector3.ONE, 0.0, Color("b8b2a4").lerp(Color("9a958a"), Mk.h01(i, j, 11)))
		var smi: MultiMeshInstance3D = slabs.build()
		smi.position = Vector3.ZERO
		g.add_child(smi)
		# 四邊正中的石階（兩階）
		for dir in [Vector2(0, 1), Vector2(0, -1), Vector2(1, 0), Vector2(-1, 0)]:
			var half := (d if dir.y != 0 else w) / 2.0
			for k in 2:
				var hgt := top * (2 - k) / 3.0
				var off := half + 0.17 + k * 0.32
				var size := Vector3(1.5, hgt, 0.32) if dir.y != 0 else Vector3(0.32, hgt, 1.5)
				g.add_child(Mk.box(size, stone.lerp(dark, 0.2 * k), Vector3(dir.x * off, hgt / 2.0, dir.y * off)))
		# 四角的矮石柱
		for sx in [-1, 1]:
			for sz in [-1, 1]:
				var p := Vector3(sx * (w / 2.0 - 0.2), top, sz * (d / 2.0 - 0.2))
				g.add_child(Mk.box(Vector3(0.28, 0.45, 0.28), stone, p + Vector3(0, 0.225, 0)))
				g.add_child(Mk.box(Vector3(0.34, 0.08, 0.34), dark, p + Vector3(0, 0.48, 0)))


## 站在這裡的地面高度：墊高的台子上是台面的高度
func _ground_y(p: Vector3) -> float:
	var u := p.x - ox
	var v := p.z - oz
	for pf in data.get("platforms", []):
		if u >= float(pf.x) and u < float(pf.x) + float(pf.w) and v >= float(pf.y) and v < float(pf.y) + float(pf.h):
			return float(pf.top)
	return 0.0


## 城牆（H：灰磚牆、上面一排垛口）與官府、大戶的院牆（R：朱紅牆、灰瓦牆帽），一格一段，成批畫
func _walls() -> void:
	var cube := BoxMesh.new()
	var grey := Mk.Batch.new(cube, Color("8a8478"))
	var red := Mk.Batch.new(cube, Color("9a3a2e"))
	var cap := Mk.Batch.new(cube, Color("4a4a52"))
	for y in H:
		for x in W:
			var t := tile(x, y)
			var c := Vector3(x + 0.5 + ox, 0, y + 0.5 + oz)
			if t == "H":
				grey.add(c + Vector3(0, 0.9, 0), Vector3(1.0, 1.8, 1.0))
				grey.add(c + Vector3(0, 1.85, 0), Vector3(1.04, 0.1, 1.04), 0.0, Color("7a7468"))
				# 垛口：牆頂一個個小方塊（隔格錯開）
				if (x + y) % 2 == 0:
					grey.add(c + Vector3(0, 2.05, 0), Vector3(0.5, 0.3, 0.5), 0.0, Color("8a8478"))
			elif t == "R":
				# 矮一點，站在牆後的人不會被擋住
				red.add(c + Vector3(0, 0.5, 0), Vector3(1.0, 1.0, 0.6))
				cap.add(c + Vector3(0, 1.08, 0), Vector3(1.08, 0.16, 0.9))
	for b in [grey, red, cap]:
		var mi: MultiMeshInstance3D = b.build()
		if mi:
			add_child(mi)


## 山坡上的青苔、草皮（照季節換色）
var _moss := Season.tint(Color("587540"), "ground")


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
	rock = rock.lerp(_moss, moss * 0.85)
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
	var fx := clampf((u + M) * SUB, 0, _vw - 1.001)
	var fy := clampf((v + M) * SUB, 0, _hv.size() / _vw - 1.001)
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
	var winter := Season.snow_cap()
	for y in range(-M, H + M):
		for x in range(-M, W + M):
			# 山上、以及山腳旁邊一格的草地
			var near := tile(x, y) == "^"
			if not near:
				continue
			var tall: float = heights[y + M][x + M]
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
					g = Season.tint(g, "evergreen")
					trunk.add(p + Vector3(0, 0.25 * s, 0), Vector3.ONE * s, yaw)
					pine_a.add(p, Vector3.ONE * s, yaw, g)
					pine_b.add(p, Vector3.ONE * s, yaw, g)
					# 冬天：松樹的尖頂積雪
					if s > 0.9 or winter:
						pine_c.add(p, Vector3.ONE * s, yaw, Season.SNOW if winter else g)
				elif roll < 0.62:
					var g2: Color = Season.tint(greens[(x * 3 + k) % 4].lerp(Color("6a8a3a"), r * 0.5), "tree")
					bush.add(p + Vector3(0, 0.1, 0), Vector3(1, 0.8, 1) * (0.6 + r * 0.6), yaw, g2)
				elif roll < 0.8 + alt * 0.1:
					# 石頭：半埋在坡裡，扁的、尖的都有
					var c: Color = rocks[(x + k) % 4]
					rock.add(p + Vector3(0, 0.02, 0), Vector3(0.6 + r * 0.9, 0.4 + Mk.h01(x, y, 120 + k) * 0.7, 0.5 + r * 0.7), yaw, c)
				else:
					for t in 3:
						var q := p + Vector3((Mk.h01(x, y, 140 + k * 3 + t) - 0.5) * 0.3, 0, (Mk.h01(x, y, 160 + k * 3 + t) - 0.5) * 0.3)
						tuft.add(q, Vector3.ONE * (0.8 + r * 0.5), 0, Season.tint(Color("7a9a48").lerp(Color("a8a058"), alt), "ground"))
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
	# 冬天樹梢的積雪：闊葉樹頂上一團、松樹尖上一小頂
	var cap_m := SphereMesh.new()
	cap_m.radius = 0.36
	cap_m.height = 0.34
	cap_m.radial_segments = 6
	cap_m.rings = 2
	var cap_round := Mk.Batch.new(cap_m, Season.SNOW)
	var cap_pine := Mk.Batch.new(cyl.call(0.0, 0.2, 0.32, 7, 1.42), Season.SNOW)
	var winter := Season.snow_cap()
	var cane := Mk.Batch.new(cyl.call(0.035, 0.04, 1.0, 5, 0.5), Season.tint(Color("7aa648"), "evergreen"))
	var leaf := Mk.Batch.new(cyl.call(0.0, 0.22, 0.4, 5, 0.0), Season.tint(Color("5a8a32"), "evergreen"))
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
	var sprout := Mk.Batch.new(cyl.call(0.0, 0.04, 0.2, 4, 0.1), Season.tint(Color("86c255"), "ground"))
	var bm := SphereMesh.new()
	bm.radius = 0.3
	bm.height = 0.6
	bm.radial_segments = 7
	bm.rings = 4
	var bush := Mk.Batch.new(bm, Season.tint(Color("3f7a34"), "evergreen"))
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
	for y in range(-M, H + M):
		for x in range(-M, W + M):
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
						g = Season.tint(g, "evergreen")
						pine_a.add(p, Vector3.ONE * s, r * 6, g)
						pine_b.add(p, Vector3.ONE * s, r * 6, g)
						if winter:
							cap_pine.add(p, Vector3.ONE * s, r * 6)
					else:
						round_tree.add(p + Vector3(0, 0.95 * s, 0), Vector3.ONE * s, r * 6, Season.tint(Color("4f9a48").lerp(Color("6aae4a"), r), "tree"))
						if winter:
							cap_round.add(p + Vector3(0, 1.3 * s, 0), Vector3.ONE * s, r * 6)
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
						if Season.flower_ok(i, flowers[(i + x) % 4]):
							flower.add(p + Vector3(Mk.h01(x, y, i) - 0.5, 0.08, Mk.h01(x, y, i + 5) - 0.5), Vector3.ONE, 0, flowers[(i + x) % 4])
				"n":
					# 冬天田裡收完了，只剩土
					if winter:
						continue
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
	for b in [trunk, pine_a, pine_b, round_tree, cap_round, cap_pine, cane, leaf, rock, flower, sprout, bush, post, rail_x, rail_z]:
		var mi: MultiMeshInstance3D = b.build()
		if mi:
			add_child(mi)


## 房子：台基、牆、柱、門窗、人字屋頂、匾額與幌子、燈籠
## 房子朝哪邊（資料的 face：s 南、n 北、e 東、w 西，預設朝南）：模型照朝南蓋好再繞中心轉；佔地東西南北對調
const FACE_ROT := {"s": 0.0, "e": PI / 2.0, "n": PI, "w": -PI / 2.0}
const FACE_DIR := {"s": Vector2i(0, 1), "e": Vector2i(1, 0), "n": Vector2i(0, -1), "w": Vector2i(-1, 0)}


## 房子的佔地（格）：朝東西的寬深對調
static func footprint(b: Dictionary) -> Vector2i:
	var w := int(b.st.w)
	var d := int(b.st.h)
	return Vector2i(w, d) if b.get("face", "s") in ["s", "n"] else Vector2i(d, w)


## 房子門口那一格（在佔地裡，人站在它前面一格、對著它）
static func door_tile(b: Dictionary) -> Vector2i:
	var w := float(b.st.w)
	var d := float(b.st.h)
	var fp := footprint(b)
	var t: float = FACE_ROT[b.get("face", "s")]
	var v := Vector2(float(b.st.door) + 0.5 - w / 2.0, d / 2.0 - 0.5)
	var r := Vector2(v.x * cos(t) + v.y * sin(t), -v.x * sin(t) + v.y * cos(t))
	return Vector2i(floori(b.x + fp.x / 2.0 + r.x), floori(b.y + fp.y / 2.0 + r.y))


func _building(b: Dictionary) -> void:
	var st: Dictionary = b.st
	var w: float = st.w
	var d: float = st.h
	var fp := footprint(b)
	# 外面一層放在佔地中心、照朝向轉；裡面一層照朝南的座標蓋（x 0..w、z 0..d，正面在 z = d）
	var pivot := Node3D.new()
	pivot.position = Vector3(b.x + fp.x / 2.0 + ox, 0, b.y + fp.y / 2.0 + oz)
	pivot.rotation.y = FACE_ROT[b.get("face", "s")]
	add_child(pivot)
	var root := Node3D.new()
	root.position = Vector3(-w / 2.0, 0, -d / 2.0)
	pivot.add_child(root)
	for yy in range(int(b.y), int(b.y) + fp.y):
		for xx in range(int(b.x), int(b.x) + fp.x):
			blocked[Vector2i(xx, yy)] = true
	# 門：站在門口、對著門按空白鍵才進去（每棟房子都有門，還沒做室內的會說門關著）
	var dt := door_tile(b)
	doors[dt] = b
	props.append({"node": null, "def": {"sprite": "door", "label": "進去", "lines": [], "door": dt}, "at": Vector2(dt.x + 0.5, dt.y + 0.5)})
	var enter = b.get("enter")
	if enter != null and (is_room(enter.to) or enter.to in OUTDOOR):
		_door_marker(dt, b.get("face", "s"))
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


## 煙火：過年、元宵、除夕的夜裡（戌時到丑時），主角附近的天上不時炸開一朵
var _fw_wait := 1.0


func _fireworks(dt: float) -> void:
	if not hero or not G.festival_index() in [1, 2, 9] or not G.shichen_of() in [10, 11, 0, 1]:
		return
	_fw_wait -= dt
	if _fw_wait > 0:
		return
	_fw_wait = randf_range(0.6, 2.2)
	var at := hero.position + Vector3(randf_range(-9, 9), randf_range(7, 11), randf_range(-9, 3))
	var col: Color = [Color("ff5a3a"), Color("ffd060"), Color("70d0ff"), Color("ff80c0"), Color("a0ff80")].pick_random()
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.albedo_color = col
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	var sm := SphereMesh.new()
	sm.radius = 0.09
	sm.height = 0.18
	sm.radial_segments = 6
	sm.rings = 3
	var light := OmniLight3D.new()
	light.position = at
	light.light_color = col
	light.omni_range = 12.0
	light.light_energy = 2.0
	add_child(light)
	var tw := create_tween().set_parallel()
	tw.tween_property(light, "light_energy", 0.0, 1.2)
	tw.tween_property(m, "albedo_color:a", 0.0, 1.4).set_delay(0.4)
	for k in 24:
		var s := MeshInstance3D.new()
		s.mesh = sm
		s.material_override = m
		s.position = at
		add_child(s)
		var dir := Vector3(randf_range(-1, 1), randf_range(-1, 1), randf_range(-1, 1)).normalized()
		tw.tween_property(s, "position", at + dir * randf_range(2.2, 3.0) + Vector3(0, -0.8, 0), 1.6).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	tw.chain().tween_callback(func() -> void:
		light.queue_free()
		for c in get_children():
			if c is MeshInstance3D and c.material_override == m:
				c.queue_free())


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
	# 這個擺設自己擋住的格子（只在某些日子出現的擺設，不在時要讓開，見 GridScene.refresh）
	var cells := []
	for i in w:
		var c := Vector2i(p.x + i, p.y)
		if not p.get("passable", false) and not blocked.has(c):
			blocked[c] = true
			cells.append(c)
	var g := Node3D.new()
	g.position = Vector3(p.x + w / 2.0 + ox, 0, p.y + 0.5 + oz)
	add_child(g)
	props.append({"node": g, "def": p, "at": Vector2(p.x + w / 2.0, p.y + 0.5), "cells": cells})
	# 村口的土地公祠（網頁版用石碑的圖，這裡認 id 蓋成一座小祠）
	if p.get("id", "") == "tudi":
		FineProps.shrine(g, self)
		return
	match p.sprite:
		# 精細版（fine_props.gd）
		"lantern_post":
			FineProps.lantern_post(g, self)
		"well":
			FineProps.well(g)
		"ding":
			FineProps.ding(g)
		"stall":
			FineProps.stall(g, w)
		"stele":
			g.add_child(Mk.box(Vector3(0.6, 1.2, 0.25), Color("8a8a86"), Vector3(0, 0.6, 0)))
			g.add_child(Mk.box(Vector3(0.75, 0.15, 0.4), Color("6a6a66"), Vector3(0, 0.07, 0)))
		"bulletin":
			FineProps.bulletin(g)
		"paifang_city", "paifang_sect":
			# 城門外、山門前的石牌坊：四根石柱、三層橫樑、中間一塊匾（門派的屋頂是青綠色）
			for i in 4:
				var px := -w / 2.0 + 0.5 + i * (w - 1.0) / 3.0
				g.add_child(Mk.box(Vector3(0.35, 3.0, 0.35), Color("b8b2a4"), Vector3(px, 1.5, 0)))
				g.add_child(Mk.box(Vector3(0.6, 0.3, 0.6), Color("9a9488"), Vector3(px, 0.15, 0)))
			g.add_child(Mk.box(Vector3(w, 0.3, 0.45), Color("a8a296"), Vector3(0, 2.7, 0)))
			g.add_child(Mk.box(Vector3(w + 0.6, 0.35, 0.7), Color("3e6656") if p.sprite == "paifang_sect" else Color("3f4a5e"), Vector3(0, 3.15, 0)))
			g.add_child(Mk.box(Vector3(2.2, 0.55, 0.08), Color("2a1f18"), Vector3(0, 2.25, 0.25)))
			var pl := Mk.label("鳴泉" if p.sprite == "paifang_sect" else "臨江", 48, Color("f0c860"), Color(0, 0, 0, 0))
			pl.billboard = BaseMaterial3D.BILLBOARD_DISABLED
			pl.position = Vector3(0, 2.25, 0.3)
			g.add_child(pl)
		"stone_lion":
			g.add_child(Mk.box(Vector3(0.7, 0.4, 0.7), Color("a8a296"), Vector3(0, 0.2, 0)))
			g.add_child(Mk.ball(0.3, Color("b8b2a4"), Vector3(0, 0.65, -0.05), 8))
			g.add_child(Mk.ball(0.26, Color("b8b2a4"), Vector3(0, 1.0, 0.1), 8))
			g.add_child(Mk.ball(0.12, Color("8a8478"), Vector3(0, 1.0, 0.33), 6))
		"drum":
			# 鳴冤鼓：木架上一面大紅鼓
			for sx in [-0.45, 0.45]:
				g.add_child(Mk.box(Vector3(0.08, 1.4, 0.08), Color("5a3a22"), Vector3(sx, 0.7, 0)))
			var drum := Mk.cyl(0.4, 0.4, 0.4, Color("a83a2e"), Vector3(0, 1.0, 0), 14)
			drum.rotation.x = PI / 2.0
			g.add_child(drum)
			var face := Mk.cyl(0.36, 0.36, 0.42, Color("e8d8b8"), Vector3(0, 1.0, 0), 14)
			face.rotation.x = PI / 2.0
			g.add_child(face)
		"drying_rack":
			# 晾架：兩根叉木撐一根長竿，掛著小魚乾或漁網
			for sx in [-w / 2.0 + 0.15, w / 2.0 - 0.15]:
				g.add_child(Mk.box(Vector3(0.07, 1.3, 0.07), Color("6a4428"), Vector3(sx, 0.65, 0)))
			g.add_child(Mk.box(Vector3(w - 0.1, 0.05, 0.05), Color("8a6a42"), Vector3(0, 1.25, 0)))
			for i in int(w * 4):
				var fx := -w / 2.0 + 0.3 + i * (w - 0.6) / maxf(1, w * 4 - 1)
				g.add_child(Mk.box(Vector3(0.07, 0.28, 0.03), Color("b8a070") if i % 2 else Color("a89060"), Vector3(fx, 1.08, 0)))
		"jars":
			for i in w * 2:
				g.add_child(Mk.cyl(0.18, 0.22, 0.42, Color("7a5a3a") if i % 2 else Color("6a4a32"), Vector3(-w / 2.0 + 0.3 + i * 0.45, 0.21, (i % 2) * 0.15), 9))
			g.add_child(Mk.cyl(0.25, 0.2, 0.3, Color("b8a060"), Vector3(w / 2.0 - 0.3, 0.15, -0.25), 10))
		"log_pile":
			# 木料堆：一層層橫放的松木
			for r in 3:
				for k in 4 - r:
					var lg := Mk.cyl(0.13, 0.13, w - 0.2, Color("8a6038") if (r + k) % 2 else Color("7a5230"), Vector3(-0.42 + k * 0.28 + r * 0.14, 0.13 + r * 0.24, 0), 7)
					lg.rotation.z = PI / 2.0
					lg.rotation.y = PI / 2.0
					g.add_child(lg)
		"stump":
			g.add_child(Mk.cyl(0.24, 0.28, 0.32, Color("6a4a2a"), Vector3(0, 0.16, 0), 9))
			g.add_child(Mk.cyl(0.22, 0.22, 0.02, Color("c8a878"), Vector3(0, 0.33, 0), 9))
		"stone_pile":
			# 石料堆：方方正正的青石塊
			for k in 5:
				g.add_child(Mk.box(Vector3(0.5, 0.3, 0.45), Color("8a8a86") if k % 2 else Color("9a9a94"), Vector3(-w / 2.0 + 0.4 + (k % 3) * 0.55, 0.15 + (k / 3) * 0.3, (k % 2) * 0.1)))
		"rock":
			g.add_child(Mk.ball(0.4, Color("8a8478"), Vector3(0, 0.2, 0), 6))
			g.add_child(Mk.ball(0.25, Color("9a9488"), Vector3(0.3, 0.12, 0.2), 5))
		"dragon_boat":
			# 龍舟：細長的船身、龍頭龍尾、中間一面鼓
			var col: Color = [Color("3e7a4a"), Color("8a2e26"), Color("c89a30")][int(p.x) % 3]
			g.add_child(Mk.box(Vector3(w - 0.2, 0.22, 0.6), col, Vector3(0, -0.1, 0)))
			g.add_child(Mk.box(Vector3(w - 0.4, 0.04, 0.5), Color("a8763f"), Vector3(0, 0.02, 0)))
			var head := Mk.box(Vector3(0.3, 0.55, 0.28), col.lightened(0.15), Vector3(w / 2.0 - 0.05, 0.25, 0))
			head.rotation.z = -0.35
			g.add_child(head)
			g.add_child(Mk.ball(0.06, Color("f0c860"), Vector3(w / 2.0 + 0.05, 0.45, 0.12), 5))
			g.add_child(Mk.cone(0.12, 0.4, col, Vector3(-w / 2.0, 0.15, 0), 4))
			var drum := Mk.cyl(0.16, 0.16, 0.18, Color("a83a2e"), Vector3(0, 0.15, 0), 10)
			g.add_child(drum)
			for i in int(w * 2) - 2:
				var ox2 := -w / 2.0 + 0.5 + i * 0.5
				if absf(ox2) > 0.3:
					g.add_child(Mk.box(Vector3(0.04, 0.04, 1.1), Color("8a6a42"), Vector3(ox2, 0.0, 0)))
		"river_lamp":
			# 河燈：漂在水上的紙蓮花，點著一點燭光
			for k in 6:
				var a := k * TAU / 6.0
				var pet := Mk.box(Vector3(0.14, 0.03, 0.08), Color("f0d0d8"), Vector3(cos(a) * 0.1, -0.02, sin(a) * 0.1))
				pet.rotation = Vector3(0, -a, 0.5)
				g.add_child(pet)
			_lantern(g, Vector3(0, 0.08, 0))
			g.get_child(g.get_child_count() - 2).scale = Vector3(0.35, 0.35, 0.35)
		"boat":
			# 大船（說明裡寫著海船、商船、客船、運糧船的）：船身、船艙、一根桅杆掛著收起的帆
			var desc: String = p.lines[0].text if (p.lines as Array).size() > 0 else ""
			if ["海船", "商船", "客船", "運糧船"].any(func(k): return desc.contains(k)):
				var wood := Color("6a4428")
				g.add_child(Mk.box(Vector3(w - 0.2, 0.55, 1.3), wood, Vector3(0, 0.05, 0)))
				for sx in [-1, 1]:
					var bow := Mk.box(Vector3(0.9, 0.5, 0.9), wood, Vector3(sx * (w / 2.0 - 0.1), 0.08, 0))
					bow.rotation.y = PI / 4.0
					bow.scale = Vector3(1, 1, 0.75)
					g.add_child(bow)
				g.add_child(Mk.box(Vector3(w - 0.4, 0.05, 1.15), Color("a8763f"), Vector3(0, 0.34, 0)))
				g.add_child(Mk.box(Vector3(1.2, 0.6, 0.9), Color("8a6a42"), Vector3(-w / 2.0 + 1.0, 0.66, 0)))
				g.add_child(Mk.box(Vector3(1.35, 0.08, 1.05), Color("4a3a2e"), Vector3(-w / 2.0 + 1.0, 1.0, 0)))
				g.add_child(Mk.cyl(0.06, 0.07, 3.2, Color("5a3a22"), Vector3(0.3, 1.9, 0), 6))
				g.add_child(Mk.box(Vector3(0.12, 0.25, 1.4), Color("e8dcc4"), Vector3(0.3, 3.2, 0)))
				g.add_child(Mk.box(Vector3(0.05, 1.4, 1.2), Color("d8c8a8"), Vector3(0.38, 2.3, 0)))
				return
			# 拴在棧橋邊的小船（擺在水格上）
			var hull := Mk.box(Vector3(w - 0.3, 0.25, 0.75), Color("7a5232"), Vector3(0, -0.12, 0))
			g.add_child(hull)
			for sx in [-1, 1]:
				var tip := Mk.box(Vector3(0.5, 0.22, 0.5), Color("7a5232"), Vector3(sx * (w / 2.0 - 0.2), -0.08, 0))
				tip.rotation.y = PI / 4.0
				g.add_child(tip)
			g.add_child(Mk.box(Vector3(w - 0.6, 0.04, 0.6), Color("a8763f"), Vector3(0, 0.02, 0)))
			var pole := Mk.box(Vector3(0.04, 0.04, 2.2), Color("8a6a42"), Vector3(0.3, 0.1, 0))
			pole.rotation = Vector3(0, 0.3, 0.15)
			g.add_child(pole)
		"reeds":
			for i in 9:
				var q := Vector3((Mk.h01(p.x * 7 + i, p.y) - 0.5) * 0.8, 0, (Mk.h01(p.x + i, p.y * 5) - 0.5) * 0.8)
				var hh := 0.8 + Mk.h01(i, p.x) * 0.6
				g.add_child(Mk.cyl(0.015, 0.02, hh, Color("8a9a52"), q + Vector3(0, hh / 2.0 - 0.15, 0), 4))
				g.add_child(Mk.cyl(0.035, 0.03, 0.18, Color("8a6a42"), q + Vector3(0, hh - 0.1, 0), 5))
		"lotus":
			# 荷葉與荷花（浮在水上）
			for i in w * 3:
				var q := Vector3(-w / 2.0 + 0.3 + i * (w - 0.6) / maxf(1, w * 3 - 1), -0.16, (Mk.h01(i, p.y) - 0.5) * 0.6)
				g.add_child(Mk.cyl(0.24, 0.24, 0.02, Color("4a8a3a"), q, 9))
			g.add_child(Mk.cone(0.12, 0.2, Color("f0b8c8"), Vector3(0.1, 0.0, 0.05), 6))
			g.add_child(Mk.cyl(0.015, 0.015, 0.3, Color("4a7a32"), Vector3(0.1, -0.12, 0.05), 4))
		"pavilion":
			# 望月亭：石台、四根紅柱、攢尖頂
			g.add_child(Mk.cyl(1.2, 1.3, 0.25, Color("a8a296"), Vector3(0, 0.12, 0), 8))
			for i in 4:
				var a := i * PI / 2.0 + PI / 4.0
				g.add_child(Mk.cyl(0.07, 0.07, 1.7, Color("8a2e26"), Vector3(cos(a) * 0.95, 1.1, sin(a) * 0.95), 6))
			g.add_child(Mk.cyl(0.0, 1.6, 0.9, Color("3e5a4e"), Vector3(0, 2.35, 0), 4))
			g.add_child(Mk.cyl(0.35, 0.35, 0.5, Color("8a8478"), Vector3(0, 0.5, 0), 8))
		"ripple":
			# 釣點：水面上一圈圈漣漪，中間一枚紅白浮標（擺在水格上，人站在岸邊對著它）
			for k in 2:
				var ring := MeshInstance3D.new()
				var tm := TorusMesh.new()
				tm.inner_radius = 0.18 + k * 0.16
				tm.outer_radius = 0.21 + k * 0.16
				ring.mesh = tm
				var rm := StandardMaterial3D.new()
				rm.albedo_color = Color(1, 1, 1, 0.45 - k * 0.15)
				rm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
				rm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
				ring.material_override = rm
				ring.scale = Vector3(1, 0.2, 1)
				ring.position.y = -0.18
				g.add_child(ring)
			g.add_child(Mk.ball(0.07, Color("d0503a"), Vector3(0, -0.12, 0), 8))
			g.add_child(Mk.cyl(0.015, 0.015, 0.16, Color("f4ead6"), Vector3(0, -0.02, 0), 5))
		"woodpile":
			# 柴堆：一落劈好的柴、一個木墩上插著斧頭
			var wd := Color("9a6a3a")
			for i in 3:
				for j in 3 - i:
					var lg := Mk.cyl(0.08, 0.08, 0.5, wd.darkened(0.08 * ((i + j) % 2)), Vector3(-0.25 + j * 0.17 + i * 0.085, 0.08 + i * 0.15, -0.15), 6)
					lg.rotation.x = PI / 2.0
					g.add_child(lg)
			g.add_child(Mk.cyl(0.2, 0.22, 0.3, Color("7a5232"), Vector3(0.28, 0.15, 0.18), 10))
			var axe := Mk.box(Vector3(0.04, 0.45, 0.04), Color("6a4428"), Vector3(0.28, 0.48, 0.18))
			axe.rotation.z = 0.35
			g.add_child(axe)
			g.add_child(Mk.box(Vector3(0.16, 0.1, 0.03), Color("5a5a62"), Vector3(0.24, 0.32, 0.18)))
		"hoe":
			# 田邊：靠著的鋤頭、一個竹簍
			var hoe := Mk.box(Vector3(0.04, 1.0, 0.04), Color("8a6a42"), Vector3(-0.12, 0.48, 0))
			hoe.rotation.z = 0.25
			g.add_child(hoe)
			g.add_child(Mk.box(Vector3(0.22, 0.04, 0.12), Color("5a5a62"), Vector3(-0.25, 0.96, 0)))
			g.add_child(Mk.cyl(0.18, 0.14, 0.3, Color("b8a060"), Vector3(0.2, 0.15, 0.05), 10))
			g.add_child(Mk.ball(0.08, Color("6aa040"), Vector3(0.2, 0.32, 0.05), 6))
		"stake", "f_dummy_martial_1", "f_dummy_martial_2":
			# 木人樁：一根粗木樁、三根伸出來的木臂、腳下一圈踩實的土
			var wd := Color("7a5232")
			g.add_child(Mk.cyl(0.42, 0.46, 0.04, Color("9a8462"), Vector3(0, 0.02, 0), 12))
			g.add_child(Mk.cyl(0.17, 0.2, 1.45, wd, Vector3(0, 0.72, 0), 10))
			g.add_child(Mk.cyl(0.19, 0.19, 0.06, wd.darkened(0.25), Vector3(0, 1.46, 0), 10))
			for a in [[1.15, 0.5, 0.0], [1.15, -0.5, 0.0], [0.8, 0.0, -0.3]]:
				var arm := Mk.box(Vector3(0.07, 0.07, 0.42), wd.darkened(0.15), Vector3(sin(a[1]) * 0.3, a[0], cos(a[1]) * 0.3))
				arm.rotation = Vector3(a[2], a[1], 0)
				g.add_child(arm)
		"tent":
			# 山寨的帳篷：兩片斜布搭成三角，前面掀開一角
			var cloth := Color("8a7a5a")
			var tw := w - 0.2
			for sd in [-1, 1]:
				var m := Mk.box(Vector3(tw, 0.08, 1.15), cloth.darkened(0.1 if sd > 0 else 0.0), Vector3(0, 0.62, sd * 0.36))
				m.rotation.x = sd * 0.95
				g.add_child(m)
			g.add_child(Mk.box(Vector3(0.08, 1.25, 0.08), Color("5a3a22"), Vector3(-tw / 2.0, 0.62, 0)))
			g.add_child(Mk.box(Vector3(0.08, 1.25, 0.08), Color("5a3a22"), Vector3(tw / 2.0, 0.62, 0)))
			g.add_child(Mk.box(Vector3(tw + 0.2, 0.06, 0.06), Color("5a3a22"), Vector3(0, 1.2, 0)))
			g.add_child(Mk.box(Vector3(0.5, 0.6, 0.04), Color("2a2018"), Vector3(0.2, 0.3, 0.42)))
		"flag":
			g.add_child(Mk.box(Vector3(0.07, 2.4, 0.07), Color("5a3a22"), Vector3(0, 1.2, 0)))
			g.add_child(Mk.box(Vector3(0.7, 0.5, 0.03), Color("2a2228"), Vector3(0.37, 2.05, 0)))
			var fl := Mk.label(p.get("char", "斷"), 40, Color("d8c8a8"), Color(0, 0, 0, 0))
			fl.position = Vector3(0.37, 2.05, 0.03)
			fl.billboard = BaseMaterial3D.BILLBOARD_DISABLED
			g.add_child(fl)
		"campfire":
			for i in 6:
				var lg := Mk.box(Vector3(0.5, 0.08, 0.08), Color("5a3a22"), Vector3(0, 0.06, 0))
				lg.rotation.y = i * PI / 3.0
				g.add_child(lg)
			for i in 7:
				var a := i * TAU / 7.0
				g.add_child(Mk.box(Vector3(0.14, 0.1, 0.14), Color("7a7670"), Vector3(cos(a) * 0.38, 0.05, sin(a) * 0.38)))
			var fm := StandardMaterial3D.new()
			fm.albedo_color = Color("ff8a2a")
			fm.emission_enabled = true
			fm.emission = Color("ff6a1a")
			fm.emission_energy_multiplier = 2.0
			var flame := MeshInstance3D.new()
			var cm := CylinderMesh.new()
			cm.top_radius = 0.0
			cm.bottom_radius = 0.18
			cm.height = 0.45
			flame.mesh = cm
			flame.material_override = fm
			flame.position.y = 0.3
			g.add_child(flame)
			var lt := OmniLight3D.new()
			lt.light_color = Color("ff9a4a")
			lt.light_energy = 1.4
			lt.omni_range = 4.0
			lt.position.y = 0.6
			g.add_child(lt)
		"carriage":
			# 雙輪馬車：車廂、車篷、兩個大輪子、往前伸的車轅
			g.add_child(Mk.box(Vector3(1.3, 0.7, 1.0), Color("7a5232"), Vector3(0, 0.75, 0)))
			g.add_child(Mk.box(Vector3(1.4, 0.12, 1.1), Color("3e6656"), Vector3(0, 1.16, 0)))
			g.add_child(Mk.box(Vector3(0.5, 0.25, 0.04), Color("2a1f18"), Vector3(0, 0.85, 0.52)))
			for sz in [-0.55, 0.55]:
				var wheel := Mk.cyl(0.42, 0.42, 0.08, Color("5a3a22"), Vector3(0.1, 0.42, sz), 12)
				wheel.rotation.x = PI / 2.0
				g.add_child(wheel)
			for sz in [-0.3, 0.3]:
				g.add_child(Mk.box(Vector3(1.2, 0.06, 0.06), Color("5a3a22"), Vector3(-1.1, 0.55, sz)))
		"cave":
			# 山壁上的洞口：一大塊岩石，正面一個黑洞
			var rock := Mk.ball(1.1, Color("7a7670"), Vector3(0, 0.7, -0.3), 7)
			rock.scale = Vector3(1.2, 1.0, 0.8)
			g.add_child(rock)
			g.add_child(Mk.box(Vector3(0.9, 1.1, 0.1), Color("141216"), Vector3(0, 0.55, 0.42)))
		"sword_rock":
			# 試劍石：一塊大青石，上面縱橫的劍痕
			var sr := Mk.box(Vector3(1.5, 1.0, 0.9), Color("7a8078"), Vector3(0, 0.5, 0))
			sr.rotation.y = 0.15
			g.add_child(sr)
			for i in 5:
				var cut := Mk.box(Vector3(0.9, 0.025, 0.02), Color("3a3e3a"), Vector3(-0.05 + Mk.h01(i, 7) * 0.1, 0.25 + i * 0.15, 0.47))
				cut.rotation.z = -0.6 + Mk.h01(i, 8) * 1.2
				g.add_child(cut)
		"sword_grave":
			# 劍塚：小土丘，插著一把劍
			g.add_child(Mk.cyl(0.3, 0.42, 0.25, Color("7a6a50"), Vector3(0, 0.12, 0), 9))
			g.add_child(Mk.box(Vector3(0.06, 0.9, 0.02), Color("a8b0b8"), Vector3(0, 0.65, 0)))
			g.add_child(Mk.box(Vector3(0.28, 0.05, 0.06), Color("5a4a3a"), Vector3(0, 1.1, 0)))
			g.add_child(Mk.box(Vector3(0.05, 0.22, 0.05), Color("4a3a2e"), Vector3(0, 1.23, 0)))
		"wild_herb":
			# 野藥草：一叢細長的葉子，頂上幾朵小花
			for i in 6:
				var a := i * TAU / 6.0
				var leaf := Mk.box(Vector3(0.05, 0.4, 0.02), Color("4a8a3a"), Vector3(cos(a) * 0.08, 0.2, sin(a) * 0.08))
				leaf.rotation = Vector3(sin(a) * 0.4, 0, -cos(a) * 0.4)
				g.add_child(leaf)
			for i in 3:
				g.add_child(Mk.ball(0.04, Color("f0f0d8"), Vector3(-0.08 + i * 0.08, 0.42 + (i % 2) * 0.05, 0), 5))
		"mushrooms":
			for i in 4:
				var q := Vector3(-0.25 + Mk.h01(i, 1) * 0.5, 0, -0.2 + Mk.h01(i, 2) * 0.4)
				g.add_child(Mk.cyl(0.03, 0.04, 0.14, Color("e8e0cc"), q + Vector3(0, 0.07, 0), 6))
				var cap := Mk.ball(0.09, Color("a8643a"), q + Vector3(0, 0.15, 0), 7)
				cap.scale = Vector3(1, 0.55, 1)
				g.add_child(cap)
		"sect_flag":
			g.add_child(Mk.cyl(0.05, 0.05, 3.0, Color("5a3a22"), Vector3(0, 1.5, 0), 6))
			g.add_child(Mk.box(Vector3(0.7, 1.4, 0.03), Color("2e5a6a"), Vector3(0.37, 2.2, 0)))
			g.add_child(Mk.box(Vector3(0.1, 1.2, 0.035), Color("e8f0f0"), Vector3(0.37, 2.2, 0)))
		"f_deco_martial_1":
			# 兵器架：一排木劍、竹劍
			for sx in [-w / 2.0 + 0.15, w / 2.0 - 0.15]:
				g.add_child(Mk.box(Vector3(0.08, 1.1, 0.08), Color("5a3a22"), Vector3(sx, 0.55, 0)))
			g.add_child(Mk.box(Vector3(w - 0.2, 0.06, 0.08), Color("5a3a22"), Vector3(0, 1.0, 0)))
			g.add_child(Mk.box(Vector3(w - 0.2, 0.06, 0.08), Color("5a3a22"), Vector3(0, 0.3, 0)))
			for i in int(w * 3):
				g.add_child(Mk.box(Vector3(0.04, 0.85, 0.03), Color("b8a070") if i % 2 else Color("a8b0b8"), Vector3(-w / 2.0 + 0.35 + i * 0.3, 0.62, 0.03)))
		"plot_stake":
			# 空地四角標地界的小木樁，樁頂綁一圈紅繩（踩得過去）
			g.add_child(Mk.cyl(0.06, 0.07, 0.5, Color("8a6a42"), Vector3(0, 0.25, 0), 6))
			g.add_child(Mk.cone(0.07, 0.1, Color("8a6a42"), Vector3(0, 0.55, 0), 6))
			g.add_child(Mk.cyl(0.075, 0.075, 0.05, Color("c8302a"), Vector3(0, 0.42, 0), 6))
		"chest", "chest_open":
			var wood := Color("7a4a26")
			g.add_child(Mk.box(Vector3(0.7, 0.4, 0.45), wood, Vector3(0, 0.2, 0)))
			g.add_child(Mk.box(Vector3(0.72, 0.05, 0.47), Color("c9a46a"), Vector3(0, 0.12, 0)))
			var lid := Mk.box(Vector3(0.72, 0.12, 0.47), wood.lightened(0.1), Vector3(0, 0.46, 0))
			if p.sprite == "chest_open":
				lid.position = Vector3(0, 0.62, -0.26)
				lid.rotation.x = -1.2
			g.add_child(lid)
		_:
			g.add_child(Mk.box(Vector3(0.7, 0.4, 0.06), Color("b08a5a"), Vector3(0, 0.85, 0)))
			g.add_child(Mk.box(Vector3(0.07, 0.9, 0.07), Color("6a4428"), Vector3(0, 0.45, -0.04)))


## 主角與村民
func _people() -> void:
	_place_hero(data.spawn)
	stall_defs = STALLS
	# 有一群人在這裡自己過日子（scripts/life.gd）：照他們的作息出現；地圖檔裡的 people 就不用了
	var living := not Life.group_for(map_id).is_empty()
	var free_spots := (data.spots as Array).filter(func(s): return _free(s.x, s.y))
	var i := 0
	for n in ([] if living else data.people):
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
		var nm := Person.name_of(n.id, n.name)
		var lb := Mk.label(nm, 30, Color("fffbe8"))
		lb.position.y = 1.3
		f.add_child(lb)
		var wk := {"f": f, "id": n.id, "name": nm, "lines": n.lines, "home": Vector2(s.x + 0.5, s.y + 0.5), "goal": null, "wait": randf() * 3.0,
			"fixed": not stall.is_empty(), "said": 0, "talking": false, "def": {"id": n.id, "name": nm, "script": n.get("script", "")}, "hidden": false}
		if not stall.is_empty():
			wk.stall = stall
			wk.face = stall.face
		walkers.append(wk)
	# 地圖上另外列的人（例如青衫客）：照出現條件與作息
	for n in data.get("npcs", []):
		add_npc(n)
	life_setup(map_id)


## 往某張地圖去的門口：屋子的門口、通往那張地圖的出口（往裡收一格）；地圖外（_away）走往大地圖的出口
func _gate(map: String) -> Vector2i:
	for dt in doors:
		var e = doors[dt].get("enter")
		if e != null and e.get("to", "") == map:
			return dt
	var world := Vector2i(-1, -1)
	for e in data.exits:
		var t: Array = e.tiles[0]
		var g := Vector2i(clampi(t[0], 1, W - 2), clampi(t[1], 1, H - 2))
		if e.get("to", "") == map:
			return g
		if e.has("world") and world.x < 0:
			world = g
	return world if world.x >= 0 else Vector2i(data.spawn.x, data.spawn.y)


## 往大地圖的出口：先問要不要出去；不出去就退回一步
func _leave(e: Dictionary, t: Array) -> void:
	var back := Vector3(clampf(t[0], 1, W - 2) - t[0], 0, clampf(t[1], 1, H - 2) - t[1]).normalized() * 0.6
	var c := await ui.ask({"text": "要離開%s，到大地圖上嗎？" % data.name}, ["出發", "留下"])
	if c == 0:
		await main.travel("world", {"node": e.world, "from": e.get("worldFrom", "")})
	else:
		hero.position += back
		_last_tile = _grid(hero.position)


## 對著門按空白鍵：做好室內的就直接換到屋裡，還沒做的說一聲
## 走到出入口：通到做好的室外地圖就換過去；往大地圖的就到大地圖上這個據點旁邊（往出口那條路的方向）
func _on_tile(g: Vector2i) -> void:
	for e in data.exits:
		for t in e.tiles:
			if g != Vector2i(t[0], t[1]):
				continue
			if e.has("world"):
				_leave(e, t)
			elif e.has("to") and e.to in OUTDOOR:
				main.hop(e.to, e.spawn)
			else:
				var back := Vector3(clampf(t[0], 1, W - 2) - t[0], 0, clampf(t[1], 1, H - 2) - t[1]).normalized() * 0.6
				hero.position += back
				ui.say([{"text": "這條路還沒做好。"}])
			return


func _interact(t: Dictionary) -> void:
	if not (t.kind == "prop" and t.p.def.has("door")):
		await super._interact(t)
		return
	var b: Dictionary = doors[t.p.def.door]
	var enter = b.get("enter")
	if enter != null and (is_room(enter.to) or enter.to in OUTDOOR):
		main.hop(enter.to, enter.spawn)
	elif (b.get("door", []) as Array).size() > 0:
		await ui.say(b.door)
	else:
		await ui.say([{"text": "%s的門關著。" % b.name}])


func info_text() -> String:
	return "%s　%s\n銀兩 %d" % [data.name, data.subtitle, G.silver]
