## 開發用：樣板城鎮村（town_gen.gd）的檢查。run:dev_town/check 印出每張樣板地圖的格子、店與空地，並檢查
## 門口走得到、房子不重疊、出口都在、從城門走得到每間店與每塊空地。


## run:dev_town/rich 身上多五千兩（測買地、蓋屋）
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
			if r.npcs.size() != 1:
				errs.append("%s 的 %s 沒有掌櫃" % [c.name, c.shops[i][1]])
			var sp: Dictionary = r.exits[0].spawn
			if r.exits[0].to != c.map:
				errs.append("%s 出口不對" % c.shops[i][1])
			print("TOWN 室內 %s：%s，出門站 (%d,%d)" % [r.name, r.subtitle, sp.x, sp.y])
		var ls := TownGen.lots(c.map)
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
					if blocked.has(k) and grid[yy][xx] != "." and grid[yy][xx] != "=" and grid[yy][xx] != ":":
						errs.append("%s 壓在地形 %s 上 (%d,%d)" % [b.name, grid[yy][xx], xx, yy])
					if blocked.get(k, false) is String:
						errs.append("%s 跟 %s 重疊" % [b.name, blocked[k]])
					blocked[k] = b.name
					grid[yy][xx] = "B"
		for p in d.props:
			if not p.get("passable", false):
				for i in int(p.w):
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
