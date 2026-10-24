class_name Tianxia
extends Node3D
## 天下輿圖：整個天下的骨架（海岸、島、各道、山脈、大河、湖、邊牆、城、關隘渡口、官道、海路），
## 畫成一張古地圖。資料在 data/tianxia.json（天下格座標，x 往東、y 往南，一格約十里）。
## 操作：滑鼠拖曳或方向鍵移動、滾輪或 Z／X 縮放；滑鼠移到城或關口上看說明。

var ui: Ui
var main: Node
var data: Dictionary
var view: View


func setup(u: Ui, m: Node) -> void:
	ui = u
	main = m


func _ready() -> void:
	var f := FileAccess.open("res://data/tianxia.json", FileAccess.READ)
	data = JSON.parse_string(f.get_as_text())
	data["name"] = "天下輿圖"
	var layer := CanvasLayer.new()
	layer.layer = 5
	add_child(layer)
	view = View.new()
	view.data = data
	view.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(view)


func info_text() -> String:
	return "天下輿圖　%s" % view.hover_text if view and view.hover_text != "" else "天下輿圖"


class View extends Control:
	const PAPER := Color("e9dcb8")
	const SEA := Color("b9cdc4")
	const SEA_DEEP := Color("a3bdb6")
	const INK := Color("3a2e22")
	const WATER_INK := Color("3f6a86")
	const RED := Color("a8322a")
	const ROAD := Color("8a5a36")
	## 各道的底色（淡淡的，像古地圖上的設色）
	const BIOME := {
		"steppe": Color("d9d6a0"), "forest": Color("bccaa0"), "plain_n": Color("e2d6b0"), "desert": Color("ecd29a"),
		"loess": Color("e2c896"), "plain": Color("e8dcb0"), "plateau": Color("d8d2c4"), "basin": Color("cfd6a8"),
		"marsh": Color("c8d4ac"), "water": Color("cad8b0"), "hills_s": Color("bfcca4"), "tropic": Color("c4d4a0"), "island": Color("d4d8b0"),
	}
	const RES := 2  ## 底圖一個畫素是幾個天下格

	var data: Dictionary
	var zoom := 1.0
	var offset := Vector2.ZERO
	var hover_text := ""
	var _base: ImageTexture
	var _coast := PackedVector2Array()
	var _islands: Array = []
	var _lakes: Array = []
	var _rivers: Array = []
	var _peaks: Array = []
	var _marks: Array = []
	var _places := {}
	var _drag := false
	var _fitted := false

	func _ready() -> void:
		mouse_filter = Control.MOUSE_FILTER_STOP
		focus_mode = Control.FOCUS_ALL
		var rng := RandomNumberGenerator.new()
		rng.seed = 11
		_coast = _rough(_pts(data.coast), 3, 4.0, rng)
		for isl in data.islands:
			_islands.append(_rough(_pts(isl.poly), 2, 2.0, rng))
		for lk in data.lakes:
			var poly := PackedVector2Array()
			for i in 28:
				var a := TAU * i / 28.0
				var r := 1.0 + rng.randf_range(-0.12, 0.12)
				poly.append(Vector2(lk.c[0] + cos(a) * lk.r[0] * r, lk.c[1] + sin(a) * lk.r[1] * r))
			_lakes.append(poly)
		for rv in data.rivers:
			_rivers.append(_smooth(_rough(_pts(rv.pts), 1, 3.0, rng, false)))
		for c in data.cities:
			_places[c.id] = c
		for p in data.passes:
			_places[p.id] = p
		_make_peaks(rng)
		_make_base(rng)

	## 把 [[x,y],…] 換成點列
	func _pts(a: Array) -> PackedVector2Array:
		var out := PackedVector2Array()
		for p in a:
			out.append(Vector2(p[0], p[1]))
		return out

	## 每段折線對半切幾次、中點往旁邊推一點，讓海岸與河道不那麼直（只是畫面，資料不變）
	func _rough(p: PackedVector2Array, times: int, amp: float, rng: RandomNumberGenerator, closed := true) -> PackedVector2Array:
		for t in times:
			var out := PackedVector2Array()
			var n := p.size()
			var segs := n if closed else n - 1
			for i in segs:
				var a := p[i]
				var b := p[(i + 1) % n]
				out.append(a)
				var nrm := (b - a).orthogonal().normalized()
				# 地圖邊上的線不推
				var edge := (a.x <= 0 and b.x <= 0) or (a.y <= 0 and b.y <= 0) or (a.x >= 1000 and b.x >= 1000) or (a.y >= 880 and b.y >= 880)
				out.append((a + b) * 0.5 + (Vector2.ZERO if edge else nrm * rng.randf_range(-amp, amp) * minf(1.0, a.distance_to(b) / 20.0)))
			if not closed:
				out.append(p[n - 1])
			p = out
			amp *= 0.55
		return p

	## 河道用 Catmull-Rom 拉成平順的曲線
	func _smooth(p: PackedVector2Array) -> PackedVector2Array:
		var out := PackedVector2Array()
		for i in p.size() - 1:
			var p0 := p[maxi(i - 1, 0)]
			var p1 := p[i]
			var p2 := p[i + 1]
			var p3 := p[mini(i + 2, p.size() - 1)]
			for k in 4:
				var t := k / 4.0
				out.append(0.5 * (2.0 * p1 + (p2 - p0) * t + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t * t + (3.0 * p1 - p0 - 3.0 * p2 + p3) * t * t * t))
		out.append(p[p.size() - 1])
		return out

	## 山脈：沿著山脊排一座座小山（古地圖的畫法），寬的山脈排好幾列
	func _make_peaks(rng: RandomNumberGenerator) -> void:
		for r in data.ranges:
			var p := _pts(r.pts)
			var w: float = r.w
			for i in p.size() - 1:
				var a := p[i]
				var b := p[i + 1]
				var n := int(a.distance_to(b) / 8.0) + 1
				var side := (b - a).orthogonal().normalized()
				for k in n:
					var at := a.lerp(b, (k + rng.randf()) / n)
					for row in maxi(1, int(w / 12.0)):
						var off := rng.randf_range(-w * 0.5, w * 0.5)
						var s := rng.randf_range(0.75, 1.2) * (6.5 + w * 0.16) * (1.0 - absf(off) / w * 0.6)
						_peaks.append({"at": at + side * off, "s": s, "snow": r.get("snow", false) and rng.randf() < 0.8})
		_peaks.sort_custom(func(x, y): return x.at.y < y.at.y)

	## 底圖：海、陸地、各道的底色、道與道的界線（虛線點），一個畫素 RES 格
	func _make_base(rng: RandomNumberGenerator) -> void:
		var W: int = int(data.w) / RES
		var H: int = int(data.h) / RES
		var land := _fill(_coast, W, H)
		var isle := PackedByteArray()
		isle.resize(W * H)
		for poly in _islands:
			var m := _fill(poly, W, H)
			for i in W * H:
				if m[i] == 1:
					isle[i] = 1
					land[i] = 1
		var lake := PackedByteArray()
		lake.resize(W * H)
		for poly in _lakes:
			var m := _fill(poly, W, H)
			for i in W * H:
				if m[i] == 1:
					lake[i] = 1
		# 各道：離哪個道的中心最近就屬哪一道（座標先用雜訊扭一下，界線才會彎）
		var nz := FastNoiseLite.new()
		nz.seed = 5
		nz.frequency = 0.012
		var seeds: Array = []
		var island_reg := -1
		for i in data.regions.size():
			var r: Dictionary = data.regions[i]
			if r.biome == "island":
				island_reg = i
				seeds.append(null)
			else:
				seeds.append(Vector2(r.seed[0], r.seed[1]))
		var reg := PackedInt32Array()
		reg.resize(W * H)
		for y in H:
			for x in W:
				var i := y * W + x
				if land[i] == 0:
					reg[i] = -1
					continue
				if isle[i] == 1:
					reg[i] = island_reg
					continue
				var q := Vector2(x * RES, y * RES)
				q += Vector2(nz.get_noise_2d(q.x, q.y), nz.get_noise_2d(q.x + 500, q.y)) * 40.0
				var best := 0
				var bd := INF
				for k in seeds.size():
					if seeds[k] == null:
						continue
					var d: float = q.distance_squared_to(seeds[k])
					if d < bd:
						bd = d
						best = k
				reg[i] = best
		var img := Image.create(W, H, false, Image.FORMAT_RGB8)
		var tex := FastNoiseLite.new()
		tex.seed = 9
		tex.frequency = 0.08
		for y in H:
			for x in W:
				var i := y * W + x
				var v := tex.get_noise_2d(x, y) * 0.04
				var c: Color
				if lake[i] == 1:
					c = SEA
				elif land[i] == 0:
					# 離岸越遠越深：看附近幾格有沒有陸地
					c = SEA_DEEP
					for d in [2, 4, 7]:
						if _near(land, W, H, x, y, d):
							c = SEA.lerp(SEA_DEEP, (d - 2) / 5.0)
							break
				else:
					c = BIOME.get(data.regions[reg[i]].biome, PAPER).lerp(PAPER, 0.35)
					# 道與道的界線：隔兩點畫一點
					if x + 1 < W and y + 1 < H and (reg[i + 1] != reg[i] and reg[i + 1] >= 0 or reg[i + W] != reg[i] and reg[i + W] >= 0) and (x + y) % 3 != 0:
						c = Color("9a4a3a")
				img.set_pixel(x, y, Color(c.r + v, c.g + v, c.b + v))
		_base = ImageTexture.create_from_image(img)

	func _near(m: PackedByteArray, W: int, H: int, x: int, y: int, d: int) -> bool:
		for o in [Vector2i(d, 0), Vector2i(-d, 0), Vector2i(0, d), Vector2i(0, -d), Vector2i(d, d), Vector2i(-d, -d), Vector2i(d, -d), Vector2i(-d, d)]:
			var px: int = clampi(x + o.x, 0, W - 1)
			var py: int = clampi(y + o.y, 0, H - 1)
			if m[py * W + px] == 1:
				return true
		return false

	## 多邊形掃描線填滿成 0／1 遮罩
	func _fill(poly: PackedVector2Array, W: int, H: int) -> PackedByteArray:
		var m := PackedByteArray()
		m.resize(W * H)
		var n := poly.size()
		for y in H:
			var fy := (y + 0.5) * RES
			var xs: Array[float] = []
			for i in n:
				var a := poly[i]
				var b := poly[(i + 1) % n]
				if (a.y <= fy and b.y > fy) or (b.y <= fy and a.y > fy):
					xs.append(a.x + (fy - a.y) / (b.y - a.y) * (b.x - a.x))
			xs.sort()
			for k in range(0, xs.size() - 1, 2):
				var x0 := maxi(0, int(ceil(xs[k] / RES - 0.5)))
				var x1 := mini(W - 1, int(floor(xs[k + 1] / RES - 0.5)))
				for x in range(x0, x1 + 1):
					m[y * W + x] = 1
		return m

	## 天下格 → 畫面座標
	func P(v: Vector2) -> Vector2:
		return offset + v * zoom

	func _fit() -> void:
		var z := minf(size.x / float(data.w), size.y / float(data.h))
		var o := (size - Vector2(data.w, data.h) * z) * 0.5
		if z != zoom or o != offset:
			zoom = z
			offset = o
			queue_redraw()

	func _process(dt: float) -> void:
		# 還沒動過地圖之前，畫面大小變了就重新擺滿
		if not _fitted and size.x > 0:
			_fit()
		var mv := Vector2(Input.get_axis("ui_left", "ui_right"), Input.get_axis("ui_up", "ui_down"))
		if Input.is_key_pressed(KEY_A): mv.x -= 1
		if Input.is_key_pressed(KEY_D): mv.x += 1
		if Input.is_key_pressed(KEY_W): mv.y -= 1
		if Input.is_key_pressed(KEY_S): mv.y += 1
		if mv != Vector2.ZERO:
			_fitted = true
			offset -= mv.normalized() * 600.0 * dt
			queue_redraw()
		if Input.is_key_pressed(KEY_Z):
			_zoom_at(size * 0.5, 1.0 + dt * 1.5)
		if Input.is_key_pressed(KEY_X):
			_zoom_at(size * 0.5, 1.0 / (1.0 + dt * 1.5))

	func _zoom_at(at: Vector2, k: float) -> void:
		var base := minf(size.x / float(data.w), size.y / float(data.h))
		var nz := clampf(zoom * k, base * 0.8, base * 4.0)
		_fitted = true
		offset = at - (at - offset) * (nz / zoom)
		zoom = nz
		queue_redraw()

	func _gui_input(e: InputEvent) -> void:
		if e is InputEventMouseButton:
			if e.button_index == MOUSE_BUTTON_WHEEL_UP and e.pressed:
				_zoom_at(e.position, 1.15)
			elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN and e.pressed:
				_zoom_at(e.position, 1.0 / 1.15)
			elif e.button_index == MOUSE_BUTTON_LEFT:
				_drag = e.pressed
		elif e is InputEventMouseMotion:
			if _drag:
				_fitted = true
				offset += e.relative
				queue_redraw()
			_hover(e.position)

	func _hover(at: Vector2) -> void:
		var t := ""
		for id in _places:
			var p: Dictionary = _places[id]
			if P(Vector2(p.x, p.y)).distance_to(at) < 9.0:
				if p.has("rank"):
					t = "%s（%s）・%s" % [p.name, {"京": "京城", "府": "府城", "縣": "縣城"}[p.rank], _region_name(p.region)]
				else:
					t = "%s（%s）" % [p.name, {"關": "關隘", "渡": "渡口", "峽": "峽谷水道"}[p.kind]]
		for r in data.regions:
			if t == "" and P(Vector2(r.seed[0], r.seed[1])).distance_to(at) < 30.0:
				t = "%s：%s" % [r.name, r.note]
		if t != hover_text:
			hover_text = t
			queue_redraw()

	func _region_name(id: String) -> String:
		for r in data.regions:
			if r.id == id:
				return r.name
		return ""

	func _draw() -> void:
		draw_rect(Rect2(Vector2.ZERO, size), SEA_DEEP)
		draw_texture_rect(_base, Rect2(P(Vector2.ZERO), Vector2(data.w, data.h) * zoom), false)
		var lw := clampf(zoom, 0.8, 2.5)
		# 海岸、島、湖
		_ink_line(_coast, INK, 1.6 * lw, true)
		for poly in _islands:
			_ink_line(poly, INK, 1.4 * lw, true)
		for poly in _lakes:
			_ink_line(poly, WATER_INK, 1.2 * lw, true)
		# 大河：從源頭到出海越來越寬
		for i in _rivers.size():
			var p: PackedVector2Array = _rivers[i]
			var w: Array = data.rivers[i].w
			for k in p.size() - 1:
				var t := float(k) / (p.size() - 1)
				draw_line(P(p[k]), P(p[k + 1]), WATER_INK, lerpf(w[0], w[1], t) * lw, true)
		# 官道與海路
		for r in data.roads:
			_road(_places[r[0]], _places[r[1]], ROAD, false)
		for r in data.sea_lanes:
			_road(_places[r[0]], _places[r[1]], WATER_INK, true)
		# 山
		for pk in _peaks:
			_peak(pk)
		# 邊牆
		for wl in data.walls:
			var p := _pts(wl.pts)
			for k in p.size() - 1:
				draw_line(P(p[k]), P(p[k + 1]), Color("6a4a32"), 2.4 * lw, true)
				var n := int(p[k].distance_to(p[k + 1]) / 6.0)
				for j in n:
					var at := P(p[k].lerp(p[k + 1], (j + 0.5) / n))
					draw_rect(Rect2(at - Vector2(1.2, 3.2) * lw, Vector2(2.4, 3.2) * lw), Color("6a4a32"))
		# 現有的大地圖範圍
		var nr: Array = data.now.rect
		var rr := Rect2(P(Vector2(nr[0], nr[1])), Vector2(nr[2], nr[3]) * zoom)
		_dashed_rect(rr, Color("b07a1a"), 1.5)
		_text(rr.position + Vector2(rr.size.x * 0.5, -5), data.now.name, 11, Color("8a5a10"), true)
		# 道名
		for r in data.regions:
			var lp: Array = r.get("label", r.seed)
			var at := P(Vector2(lp[0], lp[1]))
			_text(at, " ".join(r.name.split("")), int(clampf(20 * zoom, 14, 34)), Color(0.45, 0.2, 0.15, 0.55), true, 0)
		# 山名、河名、湖名、邊牆
		var fs := int(clampf(10 * zoom, 10, 18))
		for r in data.ranges:
			var m: Array = r.pts[r.pts.size() / 2]
			_text(P(Vector2(m[0], m[1])) + Vector2(0, -r.w * 0.5 * zoom - 4), r.name, fs, Color("4a3a2a"), true)
		for i in data.rivers.size():
			var p: PackedVector2Array = _rivers[i]
			_text(P(p[p.size() * 2 / 5]) + Vector2(0, -8), data.rivers[i].name, fs, WATER_INK, true)
		for lk in data.lakes:
			_text(P(Vector2(lk.c[0], lk.c[1])) + Vector2(0, 4), lk.name, fs - 1, WATER_INK, true)
		for isl in data.islands:
			var c := Vector2.ZERO
			for q in isl.poly:
				c += Vector2(q[0], q[1])
			c /= isl.poly.size()
			_text(P(c) + Vector2(0, -22 * zoom), isl.name, fs, Color("4a3a2a"), true)
		# 關隘、渡口
		for p in data.passes:
			var at := P(Vector2(p.x, p.y))
			if p.kind == "渡":
				draw_circle(at, 3.4, WATER_INK)
				draw_circle(at, 1.8, PAPER)
			else:
				var g := PackedVector2Array([at + Vector2(-4, 3), at + Vector2(-4, -3), at + Vector2(4, -3), at + Vector2(4, 3), at + Vector2(1.6, 3), at + Vector2(1.6, 0), at + Vector2(-1.6, 0), at + Vector2(-1.6, 3)])
				draw_colored_polygon(g, Color("5a3a2a"))
			if zoom > 1.1:
				_text(at + Vector2(0, 14), p.name, fs - 1, Color("5a3a2a"), true)
		# 城
		for c in data.cities:
			var at := P(Vector2(c.x, c.y))
			match c.rank:
				"京":
					draw_rect(Rect2(at - Vector2(7, 7), Vector2(14, 14)), RED)
					draw_rect(Rect2(at - Vector2(4.5, 4.5), Vector2(9, 9)), PAPER, false, 1.5)
				"府":
					draw_rect(Rect2(at - Vector2(5, 5), Vector2(10, 10)), RED)
					draw_rect(Rect2(at - Vector2(5, 5), Vector2(10, 10)), INK, false, 1.0)
				_:
					draw_circle(at, 4.0, INK)
					draw_circle(at, 2.6, PAPER)
			var big: bool = c.rank != "縣"
			if big or zoom > 0.9:
				_text(at + Vector2(9, 5), c.name, fs + (3 if c.rank == "京" else 1 if big else 0), INK, false)
		_legend()
		if hover_text != "":
			var m := get_local_mouse_position()
			_text(m + Vector2(16, -10), hover_text, 15, Color("f6ecd4"), false, 6)

	func _ink_line(p: PackedVector2Array, c: Color, w: float, closed: bool) -> void:
		var q := PackedVector2Array()
		for v in p:
			q.append(P(v))
		if closed:
			q.append(q[0])
		draw_polyline(q, c, w, true)

	## 官道畫成微彎的虛線（兩點之間往旁邊鼓一點）
	func _road(a: Dictionary, b: Dictionary, c: Color, sea: bool) -> void:
		var p0 := Vector2(a.x, a.y)
		var p1 := Vector2(b.x, b.y)
		var mid := (p0 + p1) * 0.5 + (p1 - p0).orthogonal() * (0.12 if sea else 0.06) * (1.0 if hash(a.id + b.id) % 2 == 0 else -1.0)
		var n := int(p0.distance_to(p1) / 3.0) + 2
		var prev := P(p0)
		for i in range(1, n + 1):
			var t := float(i) / n
			var q := P(p0.lerp(mid, t).lerp(mid.lerp(p1, t), t))
			if i % 2 == 0:
				draw_line(prev, q, Color(c, 0.85), 1.3 if not sea else 1.1, true)
			prev = q

	## 一座小山：左邊受光、右邊背光，墨線勾邊；雪山頂上留白
	func _peak(pk: Dictionary) -> void:
		var at := P(pk.at)
		var s: float = pk.s * zoom
		var top := at + Vector2(s * 0.1, -s)
		var l := at + Vector2(-s * 0.8, 0)
		var r := at + Vector2(s * 0.8, 0)
		var midb := at + Vector2(s * 0.05, 0)
		draw_colored_polygon(PackedVector2Array([l, top, midb]), Color("cbb98e"))
		draw_colored_polygon(PackedVector2Array([midb, top, r]), Color("9a8662"))
		if pk.snow:
			var k := 0.38
			draw_colored_polygon(PackedVector2Array([top, top.lerp(l, k), top.lerp(midb, k * 0.8), top.lerp(r, k)]), Color("f4f2ea"))
		draw_polyline(PackedVector2Array([l, top, r]), INK, maxf(1.0, s * 0.09), true)

	func _dashed_rect(r: Rect2, c: Color, w: float) -> void:
		var corners := [r.position, Vector2(r.end.x, r.position.y), r.end, Vector2(r.position.x, r.end.y), r.position]
		for i in 4:
			draw_dashed_line(corners[i], corners[i + 1], c, w, 6.0)

	func _text(at: Vector2, s: String, fs: int, c: Color, center: bool, outline := 4) -> void:
		var f := Ui.font()
		var w := f.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs).x
		var pos := at - Vector2(w * 0.5, 0) if center else at
		if outline > 0:
			var oc := Color(0.1, 0.08, 0.06, 0.85) if c.get_luminance() > 0.6 else Color(PAPER, 0.85)
			draw_string_outline(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, outline, oc)
		draw_string(f, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1, fs, c)

	## 右下角的圖例
	func _legend() -> void:
		var box := Rect2(size - Vector2(196, 204), Vector2(180, 188))
		draw_rect(box, Color(PAPER, 0.92))
		draw_rect(box, INK, false, 1.2)
		var y := box.position.y + 24
		var x := box.position.x + 16
		_text(Vector2(x, y), "圖　例", 14, INK, false, 0)
		var rows := [["京", "京城"], ["府", "府城"], ["縣", "縣城"], ["關", "關隘、峽谷"], ["渡", "渡口"], ["路", "官道"], ["海", "海路"], ["牆", "邊牆"]]
		for row in rows:
			y += 20
			var at := Vector2(x + 8, y - 5)
			match row[0]:
				"京":
					draw_rect(Rect2(at - Vector2(6, 6), Vector2(12, 12)), RED)
					draw_rect(Rect2(at - Vector2(3.5, 3.5), Vector2(7, 7)), PAPER, false, 1.2)
				"府":
					draw_rect(Rect2(at - Vector2(5, 5), Vector2(10, 10)), RED)
				"縣":
					draw_circle(at, 4.0, INK)
					draw_circle(at, 2.6, PAPER)
				"關":
					draw_colored_polygon(PackedVector2Array([at + Vector2(-4, 3), at + Vector2(-4, -3), at + Vector2(4, -3), at + Vector2(4, 3), at + Vector2(1.6, 3), at + Vector2(1.6, 0), at + Vector2(-1.6, 0), at + Vector2(-1.6, 3)]), Color("5a3a2a"))
				"渡":
					draw_circle(at, 3.4, WATER_INK)
					draw_circle(at, 1.8, PAPER)
				"路":
					draw_dashed_line(at - Vector2(8, 0), at + Vector2(8, 0), ROAD, 1.3, 3.0)
				"海":
					draw_dashed_line(at - Vector2(8, 0), at + Vector2(8, 0), WATER_INK, 1.1, 3.0)
				"牆":
					draw_line(at - Vector2(8, 0), at + Vector2(8, 0), Color("6a4a32"), 2.4)
			_text(Vector2(x + 24, y), row[1], 13, INK, false, 0)
