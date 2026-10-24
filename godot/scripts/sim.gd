class_name Sim
## 戰鬥平衡模擬（開發用；dev_shot 的 sim 指令跑這裡）：只用規則層 Fight，不管位置（大家都打得到），
## 主角用穩健的自動戰鬥、打血最少的那個。每種組合預設 300 場。
## 模擬會動到 G（結算寫回行囊、銀兩），跑之前先存起來、跑完還原。


## 打一場：回傳 {result, rounds, hp}（hp 是打完剩幾成氣血）
static func one(c: Dictionary, enc_id: String, items: Dictionary) -> Dictionary:
	var enc := Fight.encounter(enc_id)
	var f := Fight.new()
	f.can_flee = false
	f.no_items = enc.get("noItems", false)
	f.items = items.duplicate()
	f.units = [Fight.hero_unit(c)] + Fight.enemy_units(enc)
	var rounds := 0
	while rounds < 150:
		rounds += 1
		var order: Array = f.alive().map(func(u): return {"u": u, "k": f.stat(u, "spd") * (0.85 + randf() * 0.3)})
		order.sort_custom(func(x, y): return x.k > y.k)
		for o in order:
			var u: Dictionary = o.u
			if u.hp <= 0:
				continue
			if f.start_turn(u).skip:
				continue
			var cmd: Dictionary
			if u.side == "hero":
				cmd = f.auto_command(u, true, func(_id): return true)
				if cmd.type == "move" and Fight.mv(cmd.move).target == "enemy":
					var foes := f.alive("enemy")
					foes.sort_custom(func(a, b): return a.hp < b.hp)
					cmd.target = foes[0].id
			else:
				cmd = f.enemy_command(u, f.unit("hero"))
			f.act(u, cmd)
			var r := f.outcome()
			if r != "":
				var h := f.unit("hero")
				return {"result": r, "rounds": rounds, "hp": float(h.hp) / h.max_hp, "fight": f}
	return {"result": "lose", "rounds": rounds, "hp": 0.0, "fight": f}


## 同一個角色打 n 場（每場都補滿、帶同樣的藥）：勝率、平均回合、贏的時候平均剩幾成氣血
static func rate(c: Dictionary, enc_id: String, items: Dictionary, n := 300) -> Dictionary:
	var wins := 0
	var rounds := 0
	var hp := 0.0
	for i in n:
		var h: Dictionary = c.duplicate(true)
		Hero.restore_all(h)
		var r := one(h, enc_id, items)
		rounds += r.rounds
		if r.result == "win":
			wins += 1
			hp += r.hp
	return {"win": float(wins) / n, "rounds": float(rounds) / n, "hp": hp / maxf(1, wins)}


## 隨機擲一個新角色（照建角的擲骰）；stele：看過竹林石碑、學了竹影劍
static func fresh(stele: bool) -> Dictionary:
	var c := Hero.new_hero("", "測試", Hero.roll_attrs())
	if stele:
		Hero.learn(c, "zhuying")
	Hero.restore_all(c)
	return c


## 在山腳練功：輪流打野狗、野狗、野狗群、山豬（每場前在井邊補滿，打贏照常結算經驗與悟招），
## 每打 every 場量一次對某場（例如 camp）的勝率；回傳每一次量到的 [場數, 勝率]
static func train(c: Dictionary, target: String, fights: int, every: int, items: Dictionary, n := 100) -> Array:
	var rot := ["dog", "dog", "dogs", "boar"]
	var out := [[0, rate(c, target, items, n).win]]
	for i in fights:
		Hero.restore_all(c)
		var enc_id: String = rot[i % rot.size()]
		var r := one(c, enc_id, {})
		if r.result == "win":
			(r.fight as Fight).settle(c, Fight.encounter(enc_id), "win")
		if (i + 1) % every == 0:
			out.append([i + 1, rate(c, target, items, n).win])
	return out


## 只看頭目與石岳（調難度用，比整份報告快）：初始與看過石碑各打 n 場，再看練功曲線
static func boss(n := 300) -> void:
	var keep := {"bag": G.bag.duplicate(), "silver": G.silver}
	var meds := {"jinchuang": 3}
	for setup in [["初始", false], ["看過石碑", true]]:
		var line := "%s：" % setup[0]
		for enc in ["camp", "spar_shiyue"]:
			var tot := [0.0, 0.0, 0.0]
			for k in 10:
				var r := rate(fresh(setup[1]), enc, meds, n / 10)
				tot = [tot[0] + r.win / 10.0, tot[1] + r.rounds / 10.0, tot[2] + r.hp / 10.0]
			line += "　%s 勝 %d%%（%.1f 回合、剩血 %d%%）" % [enc, roundi(tot[0] * 100), tot[1], roundi(tot[2] * 100)]
		print(line)
	var sum := {}
	for k in 5:
		for p in train(fresh(true), "camp", 30, 10, meds, 60):
			sum[p[0]] = sum.get(p[0], 0.0) + p[1] / 5.0
	var s := "練功曲線（看過石碑，5 個角色平均）："
	for f in sum:
		s += "　%d場→%d%%" % [f, roundi(sum[f] * 100)]
	print(s)
	G.bag = keep.bag
	G.silver = keep.silver


## 整份報告（印在主控台）
static func report(n := 300) -> void:
	var keep := {"bag": G.bag.duplicate(), "silver": G.silver}
	var meds := {"jinchuang": 3}
	print("=== 戰鬥平衡模擬（每格 %d 場；主角穩健自動、帶金創藥 ×3；勝率／平均回合／贏時剩血）===" % n)
	for setup in [["初始（拳腳＋吐納）", false], ["看過石碑（加竹影劍）", true]]:
		var line := "%s：" % setup[0]
		var tot := {}
		# 每種組合擲 10 個角色，各打 n/10 場
		for k in 10:
			var c := fresh(setup[1])
			for enc in ["dog", "dogs", "boar", "scouts", "camp", "spar_qinghe", "spar_shiyue"]:
				var r := rate(c, enc, meds, n / 10)
				var t: Array = tot.get(enc, [0.0, 0.0, 0.0])
				tot[enc] = [t[0] + r.win / 10.0, t[1] + r.rounds / 10.0, t[2] + r.hp / 10.0]
		for enc in tot:
			line += "\n  %-12s 勝 %3d%%　%4.1f 回合　剩血 %3d%%" % [enc, roundi(tot[enc][0] * 100), tot[enc][1], roundi(tot[enc][2] * 100)]
		print(line)
	print("--- 在山腳練功後打祁三刀（看過石碑；每 10 場量一次，各 100 場；5 個角色）---")
	for k in 5:
		var c := fresh(true)
		var curve := train(c, "camp", 60, 10, meds, 100)
		var s := "角色%d：" % (k + 1)
		for p in curve:
			s += "　%d場→%d%%" % [p[0], roundi(p[1] * 100)]
		var lv := []
		for sk in c.skills:
			lv.append("%s%d" % [Hero.skill_def(sk.id).name.left(2), sk.level])
		print(s, "　（練完：", "、".join(lv), "）")
	G.bag = keep.bag
	G.silver = keep.silver
