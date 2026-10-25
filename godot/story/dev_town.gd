## 開發用：樣板城鎮村（town_gen.gd）的檢查。run:dev_town/check 印出每張樣板地圖的格子、店與空地，並檢查
## 門口走得到、房子不重疊、出口都在、從城門走得到每間店與每塊空地。


## run:dev_town/parse 載入樣板與府城的劇情檔（檢查有沒有語法錯誤），印出今日事與任務
static func parse(_ctx: Ctx) -> void:
	for p in ["res://story/town.gd", "res://story/yanzhou.gd", "res://story/chaoxin.gd", "res://story/huilan.gd", "res://story/baitan.gd", "res://story/sanglin.gd", "res://story/qiansi.gd", "res://story/yunling.gd", "res://story/shibi.gd", "res://story/wuyazhai.gd", "res://story/scenic.gd", "res://story/stay.gd"]:
		print("TOWN 載入 %s：%s" % [p, "好" if load(p) != null else "失敗"])
	G.flags["yz_berth"] = 2
	G.life.loan = {"owe": 120, "due": G.day + 2, "day": G.day}
	print("TOWN 任務 %s" % str(Quests.yz_berth().steps))
	print("TOWN 今日事 %s" % str(load("res://story/yanzhou.gd").tasks()))
	var CX := load("res://story/chaoxin.gd")
	for t in [0, 20, 40, 60, 80]:
		print("TOWN 潮水 第 %d 刻：%s" % [t, CX.tide_state(-1, t)])
	print("TOWN %s" % CX.tide_text())
	G.flags["cx_salt"] = 2
	print("TOWN 私鹽 %s" % str(Quests.cx_salt().steps))
	G.flags.erase("cx_salt")
	G.flags.erase("yz_berth")
	G.life.erase("loan")


## run:dev_town/rich 身上多五千兩（測買地、蓋屋）
## run:dev_town/moves 印出幾個新對手開戰時的招式與兵器合手倍數
static func moves(_ctx: Ctx) -> void:
	for pid in ["qs_miao", "qs_du", "qs_yu", "hl_lin", "sl_liao"]:
		var u := Person.unit(pid)
		print("TOWN 招式 %s：%s｜倍數 %s" % [Person.full_name(pid), str(u.moves), str(u.move_mult)])


static func rich(_ctx: Ctx) -> void:
	G.silver += 5000


## run:dev_town/state 印出空地、自宅、房產的狀態
static func state(_ctx: Ctx) -> void:
	print("TOWN 狀態 空地 %s｜自宅 %s｜房產 %s｜店 %s｜銀兩 %d" % [TownGen.lot_state(), G.life.get("estates", {}).keys(), Biz.market().owned.keys(), Biz.shops().keys(), G.silver])


## run:dev_town/data 不經過對話，直接檢查每間店的室內、空地蓋自宅與鋪面以後的資料（房產、自宅室內、補過的地圖）
static func data(_ctx: Ctx) -> void:
	var E := load("res://story/estate.gd")
	var P := load("res://story/property.gd")
	var T := load("res://story/town.gd")
	var errs := []
	for node in TownGen.towns():
		var c: Dictionary = TownGen.towns()[node]
		for i in c.shops.size():
			var r := TownGen.room_data("town:%s:%d" % [c.map, i])
			if r.npcs.size() < 1:
				errs.append("%s 的 %s 沒有掌櫃" % [c.name, c.shops[i][1]])
			var sp: Dictionary = r.exits[0].spawn
			if r.exits[0].to != c.map:
				errs.append("%s 出口不對" % c.shops[i][1])
			print("TOWN 室內 %s：%s，出門站 (%d,%d)" % [r.name, r.subtitle, sp.x, sp.y])
		var ls := TownGen.lots(c.map)
		if ls.is_empty():
			continue
		# 第一塊蓋自宅、第二塊蓋鋪面
		TownGen.lot_state()[ls[0].id] = {"use": "home", "paid": 1, "day": 1}
		E.estates()[ls[0].id] = {"plot": ls[0].id, "tier": 1, "style": "plain", "furniture": {}}
		var hr: Dictionary = E.room_data("home:" + ls[0].id)
		print("TOWN 自宅 %s：%s，出門到 %s" % [ls[0].name, hr.subtitle, hr.exits[0].to])
		if ls.size() > 1:
			TownGen.lot_state()[ls[1].id] = {"use": "shop", "paid": 1, "day": 1, "built": 100}
			Biz.market().owned[ls[1].id] = {"paid": 500, "day": 1, "cond": 1, "use": "empty"}
			var pd := Biz.prop_def(ls[1].id)
			var pr: Dictionary = P.room_data("prop:" + ls[1].id)
			print("TOWN 鋪面 %s（%s）：%s，城 %s" % [pd.name, pd.kind, pr.subtitle, Biz.shop_town(ls[1].id)])
			Biz.shops()[ls[1].id] = {"type": "goods", "name": "測記雜貨鋪", "level": 1, "stock": {}, "price": 1, "staff": [], "till": 0, "ledger": [], "opened": 1}
			var pr2: Dictionary = P.room_data("prop:" + ls[1].id)
			print("TOWN 開店後：%s／%s" % [pr2.name, pr2.subtitle])
		var md := TownGen.build(c.map).duplicate(true)
		for p in Village.MAP_PATCHES:
			load(p).patch_map(c.map, md)
		var homes: Array = (md.buildings as Array).filter(func(b): return b.get("enter", {}).get("to", "").begins_with("home:") or b.get("enter", {}).get("to", "").begins_with("prop:"))
		print("TOWN 補過的地圖：%s" % "、".join(homes.map(func(b): return "%s→%s" % [b.name, b.enter.to])))
		if homes.size() != mini(2, ls.size()):
			errs.append("%s 補上的房子不對" % c.name)
		Biz.shops().erase(ls[1].id if ls.size() > 1 else "")
	print("TOWN 資料問題：%s" % ("沒有" if errs.is_empty() else "；".join(errs)))


## run:dev_town/wild 檢查手工的野外地圖：出口、有腳本的擺設、人都走得到（旁邊有一格從出生點走得到）
const WILD := ["yunling", "wuyazhai", "canglan", "yunmen", "duanji", "tingtao", "fuyu", "wangyan", "duanbei", "hedi"]


static func wild(_ctx: Ctx) -> void:
	for map in WILD:
		var d: Dictionary = JSON.parse_string(FileAccess.get_file_as_string("res://data/%s.json" % map))
		var W: int = (d.tiles[0] as String).length()
		var H: int = d.tiles.size()
		var blocked := {}
		for y in H:
			for x in W:
				if "^~fTYoWHXR".contains((d.tiles[y] as String)[x]):
					blocked[Vector2i(x, y)] = true
		for b in d.buildings:
			var fp := Village.footprint(b)
			for yy in range(int(b.y), int(b.y) + fp.y):
				for xx in range(int(b.x), int(b.x) + fp.x):
					blocked[Vector2i(xx, yy)] = true
		for p in d.props:
			if not p.get("passable", false):
				for i in int(p.w):
					blocked[Vector2i(int(p.x) + i, int(p.y))] = true
		var seen := {Vector2i(d.spawn.x, d.spawn.y): true}
		var q := [Vector2i(d.spawn.x, d.spawn.y)]
		# 只能靠劇情傳送進去的另一塊（areas，例如聽濤洞的洞裡）
		for a in d.get("areas", []):
			seen[Vector2i(a[0], a[1])] = true
			q.append(Vector2i(a[0], a[1]))
		while q.size() > 0:
			var p: Vector2i = q.pop_back()
			for dv in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var n: Vector2i = p + dv
				if n.x < 0 or n.y < 0 or n.x >= W or n.y >= H or seen.has(n) or blocked.has(n):
					continue
				seen[n] = true
				q.append(n)
		var near := func(x: int, y: int, w: int) -> bool:
			for i in w:
				for dv in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1), Vector2i(0, 0)]:
					if seen.has(Vector2i(x + i, y) + dv):
						return true
			return false
		var errs := []
		for e in d.exits:
			if not e.tiles.any(func(t): return seen.has(Vector2i(t[0], t[1]))):
				errs.append("出口往 %s 走不到" % e.get("worldFrom", e.get("to", "?")))
		for p in d.props:
			if p.get("script", "") != "" and not near.call(int(p.x), int(p.y), int(p.w)):
				errs.append("擺設 %s (%d,%d) 走不到" % [p.script, p.x, p.y])
		for n in d.npcs:
			if not near.call(int(n.x), int(n.y), 1):
				errs.append("%s (%d,%d) 走不到" % [n.name, n.x, n.y])
		print("TOWN 野外 %s：%s" % [map, "沒有問題" if errs.is_empty() else "；".join(errs)])


static func check(_ctx: Ctx) -> void:
	for node in TownGen.towns():
		var c: Dictionary = TownGen.towns()[node]
		var d := TownGen.build(c.map)
		print("TOWN ==== %s（%s，%d×%d）城門 %s" % [c.name, c.map, (d.tiles[0] as String).length(), d.tiles.size(), str(d.gate_sides)])
		var grid := []
		for r in d.tiles:
			var row := []
			for ch in (r as String):
				row.append(ch)
			grid.append(row)
		var blocked := {}
		var errs := []
		var W: int = grid[0].size()
		var H: int = grid.size()
		for y in H:
			for x in W:
				if "^~fTYoWHXR".contains(grid[y][x]):
					blocked[Vector2i(x, y)] = true
		for b in d.buildings:
			var fp := Village.footprint(b)
			for yy in range(int(b.y), int(b.y) + fp.y):
				for xx in range(int(b.x), int(b.x) + fp.x):
					var k := Vector2i(xx, yy)
					if blocked.has(k) and not grid[yy][xx] in [".", "=", ":", "X", "R"]:
						errs.append("%s 壓在地形 %s 上 (%d,%d)" % [b.name, grid[yy][xx], xx, yy])
					if blocked.get(k, false) is String:
						errs.append("%s 跟 %s 重疊" % [b.name, blocked[k]])
					blocked[k] = b.name
					grid[yy][xx] = "B"
		for p in d.props:
			if not p.get("passable", false):
				for i in int(p.w) if p.get("when", "") == "" else 0:
					blocked[Vector2i(int(p.x) + i, int(p.y))] = true
					grid[p.y][int(p.x) + i] = "P"
		for l in d.lots:
			for yy in range(int(l.y), int(l.y) + TownGen.SLOT_H):
				for xx in range(int(l.x), int(l.x) + TownGen.SLOT_W):
					if blocked.has(Vector2i(xx, yy)):
						errs.append("%s 裡面有東西 (%d,%d)" % [l.name, xx, yy])
					grid[yy][xx] = "L"
		# 從第一個城門走得到哪些格子
		var start: Dictionary = d.gate_spawn.values()[0]
		var seen := {Vector2i(start.x, start.y): true}
		var q := [Vector2i(start.x, start.y)]
		while q.size() > 0:
			var p: Vector2i = q.pop_back()
			for dv in [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]:
				var n: Vector2i = p + dv
				if n.x < 0 or n.y < 0 or n.x >= W or n.y >= H or seen.has(n) or blocked.has(n):
					continue
				seen[n] = true
				q.append(n)
		for b in d.buildings:
			if b.get("decor", false):
				continue
			var dt := Village.door_tile(b)
			var fr: Vector2i = dt + Village.FACE_DIR[b.get("face", "s")]
			if not seen.has(fr):
				errs.append("%s 的門口 (%d,%d) 走不到" % [b.name, fr.x, fr.y])
		for l in d.lots:
			if not seen.has(Vector2i(int(l.x) + 3, int(l.y) + TownGen.SLOT_H)):
				errs.append("%s 前面走不到" % l.name)
		for side in d.gate_spawn:
			var g: Dictionary = d.gate_spawn[side]
			if not seen.has(Vector2i(g.x, g.y)):
				errs.append("%s 門走不到" % side)
		for r in grid:
			print("TOWN " + "".join(r))
		var shops := []
		for i in c.shops.size():
			var b: Dictionary = d.buildings[d.shop_index[i]] if d.shop_index.has(i) else {}
			shops.append("%s(%s,%s)" % [c.shops[i][1], b.get("x", "?"), b.get("y", "?")])
		print("TOWN 店：" + "、".join(shops))
		print("TOWN 空地：" + "、".join(d.lots.map(func(l): return "%s(%d,%d) %d兩" % [l.name, l.x, l.y, l.price])))
		print("TOWN 問題：%s" % ("沒有" if errs.is_empty() else "\n".join(errs)))
