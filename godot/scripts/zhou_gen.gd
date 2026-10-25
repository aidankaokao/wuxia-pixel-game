class_name ZhouGen
## 州圖產生器：照天下輿圖（data/tianxia.json）的海岸、島、湖、山脈、大河、各道的風土，
## 加上這個州自己的細節（data/zhou/<州 id>.json：小河、小湖、小山、據點、小路），算出一張州圖。
## - 地形一律由天下格座標算出來，所以州圖外圍延伸 M 格的景，跟隔壁那張州圖的地形是同一片。
## - 道路用 AStarGrid2D 在地形上找路（平原快、山慢、過河要搭橋、海與湖與高峰過不去），已經有路的地方優先走。
## - 天下輿圖上通到州外的官道，在州圖邊上留一個出口（exits），走到那裡就換到隔壁的州。
##
## 回傳：{id, name, region, W, H, M, gx0, gy0, terrain（EH 列、每列 EW 個字元，含外圍）, nodes, edges, exits, labels}
## 地形字元：S 海、s 淺灘、b 沙岸、r 河、l 湖、p 平原、f 林地、h 丘陵、m 山地、P 高峰、d 沙地

const M := 14
## 各道的風土：林地多寡（雜訊超過這個值就是林地）、丘陵多寡、底色地形
const BIOME := {
	"forest": {"forest": -0.05, "hill": 0.45, "base": "p"},
	"hills_s": {"forest": 0.0, "hill": 0.3, "base": "p"},
	"tropic": {"forest": 0.05, "hill": 0.45, "base": "p"},
	"basin": {"forest": 0.12, "hill": 0.5, "base": "p"},
	"marsh": {"forest": 0.3, "hill": 0.6, "base": "p"},
	"water": {"forest": 0.25, "hill": 0.55, "base": "p"},
	"plain": {"forest": 0.4, "hill": 0.62, "base": "p"},
	"plain_n": {"forest": 0.35, "hill": 0.55, "base": "p"},
	"loess": {"forest": 0.5, "hill": 0.35, "base": "p"},
	"steppe": {"forest": 0.65, "hill": 0.55, "base": "p"},
	"desert": {"forest": 9.0, "hill": 0.5, "base": "d"},
	"plateau": {"forest": 0.55, "hill": 0.3, "base": "p"},
	"island": {"forest": 0.15, "hill": 0.45, "base": "p"},
}
## 找路時各種地形的花費（null 過不去）
const COST := {"S": null, "s": null, "l": null, "P": null, "r": 10.0, "b": 1.2, "p": 1.0, "d": 1.4, "f": 1.6, "h": 2.4, "m": 5.0}
const RANK_NAME := {"京": "京城", "府": "府城", "縣": "縣城"}
const PASS_NAME := {"關": "關隘", "渡": "渡口", "峽": "峽谷水道"}


static func _json(path: String) -> Dictionary:
	var f := FileAccess.open(path, FileAccess.READ)
	return JSON.parse_string(f.get_as_text()) if f else {}


static func tianxia() -> Dictionary:
	return _json("res://data/tianxia.json")


## 天下格上的某一點落在哪個州（沒有就回傳空字串）
static func zhou_at(tx: Dictionary, gx: float, gy: float) -> String:
	for z in tx.zhou:
		var r: Array = z.rect
		if gx >= r[0] and gy >= r[1] and gx < r[0] + r[2] and gy < r[1] + r[3]:
			return z.id
	return ""


static func build(zid: String) -> Dictionary:
	var tx := tianxia()
	var z: Dictionary = {}
	for it in tx.zhou:
		if it.id == zid:
			z = it
	var det := _json("res://data/zhou/%s.json" % zid)
	var rx: int = int(z.rect[0])
	var ry: int = int(z.rect[1])
	var W: int = int(z.rect[2])
	var H: int = int(z.rect[3])
	var EW := W + 2 * M
	var EH := H + 2 * M
	var gx0 := rx - M  # 外圍左上角的天下格
	var gy0 := ry - M
	var N := EW * EH
	var reg_name := ""
	for r in tx.regions:
		if r.id == z.region:
			reg_name = r.name
	var nz := FastNoiseLite.new()
	nz.seed = 21
	nz.frequency = 0.08
	nz.fractal_octaves = 3

	# 一、陸地與海：先用掃描線填多邊形，再用離岸距離加雜訊讓海岸線曲折
	var land := PackedByteArray()
	land.resize(N)
	var polys: Array = [tx.coast]
	for isl in tx.islands:
		polys.append(isl.poly)
	for poly in polys:
		for j in EH:
			var fy := gy0 + j + 0.5
			var xs: Array[float] = []
			var n: int = poly.size()
			for i in n:
				var a: Array = poly[i]
				var b: Array = poly[(i + 1) % n]
				if (a[1] <= fy and b[1] > fy) or (b[1] <= fy and a[1] > fy):
					xs.append(a[0] + (fy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
			xs.sort()
			for k in range(0, xs.size() - 1, 2):
				for i in range(maxi(0, ceili(xs[k] - gx0 - 0.5)), mini(EW - 1, floori(xs[k + 1] - gx0 - 0.5)) + 1):
					land[j * EW + i] = 1
	var d_land := _dist(land, EW, EH, 1)  # 海上的格離陸地多遠
	var d_sea := _dist(land, EW, EH, 0)  # 陸上的格離海多遠
	var t := PackedByteArray()
	t.resize(N)
	for j in EH:
		for i in EW:
			var k := j * EW + i
			var sd: float = d_sea[k] if land[k] == 1 else -d_land[k]
			sd += nz.get_noise_2d(gx0 + i, gy0 + j) * 2.5
			land[k] = 1 if sd > 0.0 else 0
	d_land = _dist(land, EW, EH, 1)

	# 二、各道：跟天下輿圖同一套算法（離哪個道的中心最近，座標先用雜訊扭一下）
	var rn := FastNoiseLite.new()
	rn.seed = 5
	rn.frequency = 0.012
	var seeds: Array = []
	for r in tx.regions:
		seeds.append(null if r.biome == "island" else Vector2(r.seed[0], r.seed[1]))
	# 島上的格：不在大陸多邊形裡、但在陸地上
	var main_land := PackedByteArray()
	main_land.resize(N)
	_fill_poly(tx.coast, main_land, EW, EH, gx0, gy0)

	# 三、山：沿著山脊蓋出「山的強度」（中心 1、往外遞減）
	var ranges: Array = []
	ranges.append_array(tx.ranges)
	ranges.append_array(det.get("ranges", []))
	var mt := PackedFloat32Array()
	mt.resize(N)
	var snowy := PackedByteArray()
	snowy.resize(N)
	for rg in ranges:
		var pts: Array = rg.pts
		var w: float = rg.w
		var R := w * 0.75
		for s in pts.size() - 1:
			var a := Vector2(pts[s][0], pts[s][1])
			var b := Vector2(pts[s + 1][0], pts[s + 1][1])
			var steps := int(a.distance_to(b) / 0.8) + 1
			for q in steps + 1:
				var c := a.lerp(b, float(q) / steps)
				var ci := int(c.x) - gx0
				var cj := int(c.y) - gy0
				var ri := int(R) + 1
				if ci < -ri or cj < -ri or ci >= EW + ri or cj >= EH + ri:
					continue
				for j in range(maxi(0, cj - ri), mini(EH, cj + ri + 1)):
					for i in range(maxi(0, ci - ri), mini(EW, ci + ri + 1)):
						var dd := c.distance_to(Vector2(gx0 + i + 0.5, gy0 + j + 0.5))
						var v := 1.0 - dd / R
						var k := j * EW + i
						if v > mt[k]:
							mt[k] = v
							snowy[k] = 1 if rg.get("snow", false) else 0

	# 四、湖、河：湖是帶雜訊的橢圓，河沿著平順的曲線一路蓋圓
	var water := PackedByteArray()  # 1 湖、2 河
	water.resize(N)
	var lakes: Array = []
	lakes.append_array(tx.lakes)
	lakes.append_array(det.get("lakes", []))
	for lk in lakes:
		var cx: float = lk.c[0]
		var cy: float = lk.c[1]
		var lrx: float = lk.r[0]
		var lry: float = lk.r[1]
		for j in range(maxi(0, int(cy - lry - 2) - gy0), mini(EH, int(cy + lry + 3) - gy0)):
			for i in range(maxi(0, int(cx - lrx - 2) - gx0), mini(EW, int(cx + lrx + 3) - gx0)):
				var ux := (gx0 + i + 0.5 - cx) / lrx
				var uy := (gy0 + j + 0.5 - cy) / lry
				if ux * ux + uy * uy + nz.get_noise_2d((gx0 + i) * 2.0, (gy0 + j) * 2.0) * 0.25 < 1.0:
					water[j * EW + i] = 1
	var rivers: Array = []
	rivers.append_array(tx.rivers)
	rivers.append_array(det.get("rivers", []))
	var labels: Array = []
	for rv in rivers:
		var sm := _smooth(rv.pts)
		var wd: Array = rv.w
		var inside: Array = []
		for s in sm.size() - 1:
			var a: Vector2 = sm[s]
			var b: Vector2 = sm[s + 1]
			var steps := int(a.distance_to(b) / 0.4) + 1
			var hw := maxf(0.55, lerpf(wd[0], wd[1], float(s) / (sm.size() - 1)) * 0.5)
			for q in steps:
				var c := a.lerp(b, float(q) / steps)
				var ci := int(c.x) - gx0
				var cj := int(c.y) - gy0
				if ci < -3 or cj < -3 or ci >= EW + 3 or cj >= EH + 3:
					continue
				if ci >= M and cj >= M and ci < M + W and cj < M + H:
					inside.append(c)
				var ri := int(hw) + 1
				for j in range(maxi(0, cj - ri), mini(EH, cj + ri + 1)):
					for i in range(maxi(0, ci - ri), mini(EW, ci + ri + 1)):
						if c.distance_to(Vector2(gx0 + i + 0.5, gy0 + j + 0.5)) <= hw:
							water[j * EW + i] = 2
		if inside.size() > 6:
			var mid: Vector2 = inside[inside.size() * 2 / 5]
			labels.append({"text": rv.name, "x": int(mid.x) - rx, "y": int(mid.y) - ry, "kind": "water"})
	for lk in lakes:
		if lk.name != "" and _in(lk.c[0], lk.c[1], rx, ry, W, H):
			labels.append({"text": lk.name, "x": int(lk.c[0]) - rx, "y": int(lk.c[1]) - ry, "kind": "water"})
	for rg in ranges:
		var m: Array = rg.pts[rg.pts.size() / 2]
		if _in(m[0], m[1], rx, ry, W, H):
			labels.append({"text": rg.name, "x": int(m[0]) - rx, "y": int(m[1] - rg.w * 0.4) - ry, "kind": "mount"})

	# 五、合起來：海的深淺、沙岸、山、丘陵、林地、湖、河
	var hn := FastNoiseLite.new()
	hn.seed = 33
	hn.frequency = 0.05
	var fn := FastNoiseLite.new()
	fn.seed = 44
	fn.frequency = 0.07
	fn.fractal_octaves = 3
	for j in EH:
		for i in EW:
			var k := j * EW + i
			var gx := gx0 + i
			var gy := gy0 + j
			var c := "p"
			if land[k] == 0:
				c = "S" if d_land[k] > 3.0 else "s"
			else:
				var bi: Dictionary = BIOME[_biome(tx, seeds, rn, gx, gy, main_land[k] == 0)]
				c = bi.base
				var mv: float = mt[k] + nz.get_noise_2d(gx * 1.7, gy * 1.7) * 0.18
				if mv > 0.78 and snowy[k] == 1:
					c = "P"
				elif mv > 0.45:
					c = "m"
				elif mv > 0.18 or hn.get_noise_2d(gx, gy) > bi.hill:
					c = "h"
				elif fn.get_noise_2d(gx, gy) > bi.forest:
					c = "f"
				if water[k] == 1:
					c = "l"
				elif water[k] == 2:
					c = "r"
				elif d_land[k] == 0.0 and _near_sea(land, EW, EH, i, j) and c in ["p", "f", "d"]:
					c = "b"
			t[k] = c.unicode_at(0)

	# 六、據點：天下輿圖上州裡的城與關口，加上州細節的據點（同 id 的蓋過去）
	var nodes: Array = []
	var by_id := {}
	for c in tx.cities:
		if _in(c.x, c.y, rx, ry, W, H):
			var n := {"id": c.id, "name": c.name + ("城" if c.rank != "京" and c.name.length() < 3 else ""), "kind": "city", "rank": c.rank, "x": c.x, "y": c.y,
				"desc": "%s的%s。" % [reg_name, RANK_NAME[c.rank]], "locked": true, "enter": null, "enterFrom": {}, "rest": null}
			by_id[c.id] = n
	for p in tx.passes:
		if _in(p.x, p.y, rx, ry, W, H):
			by_id[p.id] = {"id": p.id, "name": p.name, "kind": "pass" if p.kind == "關" else "ferry", "x": p.x, "y": p.y,
				"desc": "%s的%s。" % [reg_name, PASS_NAME[p.kind]], "locked": true, "enter": null, "enterFrom": {}, "rest": null}
	for dn in det.get("nodes", []):
		var n: Dictionary = by_id.get(dn.id, {}).duplicate()
		n.merge(dn, true)
		by_id[dn.id] = n
	var all_places := {}
	for c in tx.cities:
		all_places[c.id] = c
	for p in tx.passes:
		all_places[p.id] = p
	for id in by_id:
		var n: Dictionary = by_id[id]
		n.x = int(n.x) - rx
		n.y = int(n.y) - ry
		# 據點腳下一定是平地（城大一點；渡口只清自己那一格，不把河截斷）
		var rad := 0 if n.kind == "ferry" else (2 if n.kind in ["city", "pass", "town"] else 1)
		var clear := ["S", "s", "l", "r", "m", "P", "h", "f"] if rad == 2 else ["S", "s", "l", "r", "m", "P"]
		for dj in range(-rad, rad + 1):
			for di in range(-rad, rad + 1):
				var k: int = (n.y + M + dj) * EW + (n.x + M + di)
				if char(t[k]) in clear and (rad < 2 or not char(t[k]) in ["S", "s", "r"] or (di == 0 and dj == 0)):
					t[k] = "p".unicode_at(0)
		nodes.append(n)

	# 七、道路
	var astar := AStarGrid2D.new()
	astar.region = Rect2i(0, 0, W, H)
	astar.diagonal_mode = AStarGrid2D.DIAGONAL_MODE_NEVER
	astar.default_compute_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	astar.default_estimate_heuristic = AStarGrid2D.HEURISTIC_MANHATTAN
	astar.update()
	for y in H:
		for x in W:
			var cost = COST[char(t[(y + M) * EW + x + M])]
			if cost == null:
				astar.set_point_solid(Vector2i(x, y), true)
			else:
				astar.set_point_weight_scale(Vector2i(x, y), cost)
	for n in nodes:
		astar.set_point_solid(Vector2i(n.x, n.y), false)
		astar.set_point_weight_scale(Vector2i(n.x, n.y), 1.0)
	var skip := {}
	for s in det.get("skip_roads", []):
		skip[_pair(s[0], s[1])] = true
	var want: Array = []
	for r in det.get("roads", []):
		want.append(r)
	for r in tx.roads:
		if not skip.has(_pair(r[0], r[1])):
			want.append([r[0], r[1], ""])
	var edges: Array = []
	var exits: Array = []
	var done := {}
	for r in want:
		var a_in := by_id.has(r[0])
		var b_in := by_id.has(r[1])
		if (not a_in and not b_in) or done.has(_pair(r[0], r[1])):
			continue
		done[_pair(r[0], r[1])] = true
		if a_in and b_in:
			var A: Dictionary = by_id[r[0]]
			var B: Dictionary = by_id[r[1]]
			var path := astar.get_id_path(Vector2i(A.x, A.y), Vector2i(B.x, B.y))
			if path.is_empty():
				push_warning("州圖 %s：%s 到 %s 找不到路" % [zid, A.name, B.name])
				continue
			edges.append({"a": A.id, "b": B.id, "path": _cells(path), "name": r[2] if r[2] != "" else "%s往%s的官道" % [A.name, B.name]})
			_cheapen(astar, path)
		else:
			# 一頭在州外：從州裡那頭沿著往州外那頭的方向，走到州圖邊上留一個出口
			var I: Dictionary = by_id[r[0] if a_in else r[1]]
			var O: Dictionary = all_places.get(r[1] if a_in else r[0], {})
			if O.is_empty():
				continue
			var edge := _edge_cell(astar, Vector2(I.x, I.y), Vector2(O.x - rx, O.y - ry), W, H)
			if edge.x < 0:
				continue
			var path := astar.get_id_path(Vector2i(I.x, I.y), edge)
			if path.is_empty():
				continue
			var out := Vector2i(1 if edge.x == W - 1 else (-1 if edge.x == 0 else 0), 1 if edge.y == H - 1 else (-1 if edge.y == 0 else 0))
			var tz := zhou_at(tx, rx + edge.x + out.x * 2 + 0.5, ry + edge.y + out.y * 2 + 0.5)
			var name := "往%s的官道" % O.name
			edges.append({"a": I.id, "b": "", "path": _cells(path), "name": name})
			exits.append({"x": edge.x, "y": edge.y, "out": [out.x, out.y], "to": O.id, "toName": O.name, "zhou": tz})
			_cheapen(astar, path)

	var rows: Array = []
	for j in EH:
		rows.append(t.slice(j * EW, (j + 1) * EW).get_string_from_ascii())
	return {"id": zid, "name": z.name, "region": reg_name, "W": W, "H": H, "M": M, "gx0": rx, "gy0": ry,
		"terrain": rows, "nodes": nodes, "edges": edges, "exits": exits, "labels": labels}


## 州圖外圍再往外的遠景：從天下輿圖的海岸、大河、大湖算一大片粗略的陸地遮罩（1 陸地、0 水），
## 範圍是天下格 (gx0, gy0) 起 w×h 格，每格再切 sub×sub（回傳 (w*sub)×(h*sub)，邊緣才不會一格一格的）
static func far_land(gx0: int, gy0: int, w: int, h: int, sub := 1) -> PackedByteArray:
	var tx := tianxia()
	var fw := w * sub
	var fh := h * sub
	# 天下格 → 遮罩格
	var to_m := func(a: Array) -> Array:
		var out := []
		for q in a:
			out.append([(q[0] - gx0) * sub, (q[1] - gy0) * sub])
		return out
	var m := PackedByteArray()
	m.resize(fw * fh)
	_fill_poly(to_m.call(tx.coast), m, fw, fh, 0, 0)
	for isl in tx.islands:
		_fill_poly(to_m.call(isl.poly), m, fw, fh, 0, 0)
	for rv in tx.rivers:
		var sm := _smooth(rv.pts)
		for s in sm.size() - 1:
			var a: Vector2 = (sm[s] - Vector2(gx0, gy0)) * sub
			var b: Vector2 = (sm[s + 1] - Vector2(gx0, gy0)) * sub
			var hw := maxf(0.6, lerpf(rv.w[0], rv.w[1], float(s) / (sm.size() - 1)) * 0.5) * sub
			var steps := int(a.distance_to(b) / 0.5) + 1
			for q in steps:
				var c := a.lerp(b, float(q) / steps)
				for j in range(maxi(0, int(c.y - hw)), mini(fh, int(c.y + hw) + 1)):
					for i in range(maxi(0, int(c.x - hw)), mini(fw, int(c.x + hw) + 1)):
						if c.distance_to(Vector2(i + 0.5, j + 0.5)) <= hw:
							m[j * fw + i] = 0
	for lk in tx.lakes:
		var cx: float = (lk.c[0] - gx0) * sub
		var cy: float = (lk.c[1] - gy0) * sub
		var lrx: float = lk.r[0] * sub
		var lry: float = lk.r[1] * sub
		for j in range(maxi(0, int(cy - lry)), mini(fh, int(cy + lry) + 1)):
			for i in range(maxi(0, int(cx - lrx)), mini(fw, int(cx + lrx) + 1)):
				var ux := (i + 0.5 - cx) / lrx
				var uy := (j + 0.5 - cy) / lry
				if ux * ux + uy * uy < 1.0:
					m[j * fw + i] = 0
	return m


static func _in(x: float, y: float, rx: int, ry: int, W: int, H: int) -> bool:
	return x >= rx and y >= ry and x < rx + W and y < ry + H


static func _pair(a: String, b: String) -> String:
	return a + "|" + b if a < b else b + "|" + a


static func _cells(path: Array) -> Array:
	var out := []
	for c in path:
		out.append([c.x, c.y])
	return out


## 走過的路變便宜，後面的路會盡量併上去
static func _cheapen(astar: AStarGrid2D, path: Array) -> void:
	for c in path:
		astar.set_point_weight_scale(c, minf(astar.get_point_weight_scale(c), 0.35))


## 從 a 往 b 的方向，碰到州圖邊上的那一格；那格過不去就沿著邊找最近能走的
static func _edge_cell(astar: AStarGrid2D, a: Vector2, b: Vector2, W: int, H: int) -> Vector2i:
	var d := b - a
	var tmin := INF
	if d.x > 0: tmin = minf(tmin, (W - 1 - a.x) / d.x)
	if d.x < 0: tmin = minf(tmin, -a.x / d.x)
	if d.y > 0: tmin = minf(tmin, (H - 1 - a.y) / d.y)
	if d.y < 0: tmin = minf(tmin, -a.y / d.y)
	var p := a + d * tmin
	var c := Vector2i(clampi(roundi(p.x), 0, W - 1), clampi(roundi(p.y), 0, H - 1))
	var along := Vector2i(0, 1) if c.x == 0 or c.x == W - 1 else Vector2i(1, 0)
	for k in 20:
		for s in [1, -1]:
			var q: Vector2i = c + along * k * s
			if q.x >= 0 and q.y >= 0 and q.x < W and q.y < H and not astar.is_point_solid(q):
				return q
	return Vector2i(-1, -1)


static func _biome(tx: Dictionary, seeds: Array, rn: FastNoiseLite, gx: float, gy: float, island: bool) -> String:
	if island:
		return "island"
	var q := Vector2(gx, gy)
	q += Vector2(rn.get_noise_2d(q.x, q.y), rn.get_noise_2d(q.x + 500, q.y)) * 40.0
	var best := 0
	var bd := INF
	for k in seeds.size():
		if seeds[k] == null:
			continue
		var d: float = q.distance_squared_to(seeds[k])
		if d < bd:
			bd = d
			best = k
	return tx.regions[best].biome


static func _near_sea(land: PackedByteArray, EW: int, EH: int, i: int, j: int) -> bool:
	for dj in range(-1, 2):
		for di in range(-1, 2):
			var x := clampi(i + di, 0, EW - 1)
			var y := clampi(j + dj, 0, EH - 1)
			if land[y * EW + x] == 0:
				return true
	return false


static func _fill_poly(poly: Array, m: PackedByteArray, EW: int, EH: int, gx0: int, gy0: int) -> void:
	var n: int = poly.size()
	for j in EH:
		var fy := gy0 + j + 0.5
		var xs: Array[float] = []
		for i in n:
			var a: Array = poly[i]
			var b: Array = poly[(i + 1) % n]
			if (a[1] <= fy and b[1] > fy) or (b[1] <= fy and a[1] > fy):
				xs.append(a[0] + (fy - a[1]) / (b[1] - a[1]) * (b[0] - a[0]))
		xs.sort()
		for k in range(0, xs.size() - 1, 2):
			for i in range(maxi(0, ceili(xs[k] - gx0 - 0.5)), mini(EW - 1, floori(xs[k + 1] - gx0 - 0.5)) + 1):
				m[j * EW + i] = 1


## 距離轉換（兩趟掃過）：每一格離最近的「值等於 target」的格有多遠；本身就是 target 的為 0
static func _dist(m: PackedByteArray, EW: int, EH: int, target: int) -> PackedFloat32Array:
	var d := PackedFloat32Array()
	d.resize(EW * EH)
	for k in EW * EH:
		d[k] = 0.0 if m[k] == target else 9999.0
	for j in EH:
		for i in EW:
			var k := j * EW + i
			if i > 0: d[k] = minf(d[k], d[k - 1] + 1.0)
			if j > 0:
				d[k] = minf(d[k], d[k - EW] + 1.0)
				if i > 0: d[k] = minf(d[k], d[k - EW - 1] + 1.414)
				if i < EW - 1: d[k] = minf(d[k], d[k - EW + 1] + 1.414)
	for j in range(EH - 1, -1, -1):
		for i in range(EW - 1, -1, -1):
			var k := j * EW + i
			if i < EW - 1: d[k] = minf(d[k], d[k + 1] + 1.0)
			if j < EH - 1:
				d[k] = minf(d[k], d[k + EW] + 1.0)
				if i < EW - 1: d[k] = minf(d[k], d[k + EW + 1] + 1.414)
				if i > 0: d[k] = minf(d[k], d[k + EW - 1] + 1.414)
	return d


## 河道用 Catmull-Rom 拉成平順的曲線（跟天下輿圖一樣）
static func _smooth(pts: Array) -> Array:
	var p: Array = []
	for q in pts:
		p.append(Vector2(q[0], q[1]))
	var out: Array = []
	for i in p.size() - 1:
		var p0: Vector2 = p[maxi(i - 1, 0)]
		var p1: Vector2 = p[i]
		var p2: Vector2 = p[i + 1]
		var p3: Vector2 = p[mini(i + 2, p.size() - 1)]
		for k in 4:
			var tt := k / 4.0
			out.append(0.5 * (2.0 * p1 + (p2 - p0) * tt + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * tt * tt + (3.0 * p1 - p0 - 3.0 * p2 + p3) * tt * tt * tt))
	out.append(p[p.size() - 1])
	return out
