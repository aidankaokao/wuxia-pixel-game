## 釣魚（照網頁版 fishing.ts、story/biyi.ts 的 fishAt）：站在有浮標漣漪的水邊按空白鍵。
## - 要有釣竿（rod，陶四的貨郎攤有賣）。每竿一刻、體力 5。
## - 親自拉竿（小遊戲 scripts/fish_game.gd，一竿一竿釣到收竿）或慢慢等（自動，可以連釣幾回）：照共用規則（Practice，id "fish"）
##   第一次一定親自拉竿；這一趟每竿的成色（漂亮 100、釣起 70、跑了 0）平均起來記成「手感」，慢慢等每竿上鉤的機會是手感的八成（帶著漁網再多一成）。
## - 上鉤的是哪種魚看釣點、時辰、天氣、季節與手藝（data/life.json 的 fish）；釣過的魚記進魚譜（works 的 fishing:魚）。
## 青竹村的釣點：雲水河邊（river）。

const CAST_KE := 1
const CAST_STAMINA := 5
const SCORE := {"perfect": 100.0, "ok": 70.0, "miss": 0.0}
## 慢慢等時帶著漁網：多一成上鉤，偶爾一次撈上兩條
const NET_BONUS := 0.1
const NET_DOUBLE := 0.15
const SEASONS := ["spring", "summer", "autumn", "winter"]

const Train := preload("res://story/train.gd")


## 雲水河邊的釣點
static func river(ctx: Ctx) -> void:
	await fish_at(ctx, "river", "雲水河在這裡轉了個彎，水流慢了下來，水面上漾著一圈圈漣漪。")


## 現在是清晨、白天、黃昏還是夜裡
static func period() -> String:
	var s := G.shichen_of()
	if s == 3:
		return "dawn"
	if s == 9:
		return "dusk"
	return "day" if s >= 4 and s <= 8 else "night"


## 這一竿上鉤的是哪種魚（手藝不夠的、這個季節躲起來的不會上鉤）
static func roll(spot: String) -> Dictionary:
	var lv := Crafts.level("fishing")
	var season: String = SEASONS[G.season_of()]
	var pool := []
	var total := 0.0
	for f in Crafts.data().fish:
		var w := float(f.spots.get(spot, 0))
		if w <= 0 or lv < int(f.level) or season in f.get("hides", []):
			continue
		var likes: Array = f.get("likes", [])
		if period() in likes or G.weather in likes:
			w *= 2
		if season in likes:
			w *= 2
		pool.append([f, w])
		total += w
	var r := randf() * total
	for p in pool:
		r -= p[1]
		if r <= 0:
			return p[0]
	return pool[0][0]


## 釣起一條魚的技能經驗
static func catch_exp(f: Dictionary, perfect: bool) -> int:
	return 4 + int(f.fight) * 3 + int(f.level) + (4 if perfect else 0)


## 釣起來：放進行囊、記進魚譜、加經驗；回傳要說的話
static func land(f: Dictionary, perfect: bool, mult := 1.0) -> Array:
	var out := []
	var fresh := Crafts.work("fishing", f.id).is_empty()
	Crafts.learn_work("fishing", f.id)
	Crafts.gain_work("fishing", f.id, 2 if perfect else 1)
	G.bag[f.id] = int(G.bag.get(f.id, 0)) + 1
	if fresh:
		out.append("魚譜新添一筆：「%s」！" % f.name)
	var up := Crafts.gain("fishing", roundi(catch_exp(f, perfect) * mult))
	if up != "":
		out.append(up)
	return out


static func fish_at(ctx: Ctx, spot: String, look: String) -> void:
	if not ctx.has("rod"):
		await ctx.say("%s\n（沒有釣竿。村口陶四的貨郎攤有賣）" % look)
		return
	var feel := Practice.last("fish")
	var c := await Practice.choose(ctx, "fish", "%s\n要怎麼釣？（每竿一刻、體力 %d%s）" % [look, CAST_STAMINA, "" if Practice.tried("fish") else "；第一次要自己拉竿"],
		"自己拉竿", "自己拉竿（上次手感 %d）" % roundi(feel), "慢慢等（每竿約 %d%% 上鉤，上次手感的八成）" % roundi(_wait_chance() * 100))
	if c == 0:
		await _by_hand(ctx, spot)
	elif c == 1:
		await _waiting(ctx, spot)


static func _wait_chance() -> float:
	return minf(0.95, Practice.auto_value("fish") / 100.0 + (NET_BONUS if G.bag.has("fish_net") else 0.0))


## 自己拉竿：一竿一竿釣，每竿玩一次小遊戲；收竿時把這一趟的平均成色記成手感
static func _by_hand(ctx: Ctx, spot: String) -> void:
	var scores := []
	while true:
		if not await Train.exert(ctx, CAST_STAMINA, "手臂痠得握不住竿了。"):
			break
		ctx.pass_time(CAST_KE)
		var f := roll(spot)
		var r := await FishGame.play(ctx.ui, f, Crafts.level("fishing"))
		scores.append(SCORE[r])
		if r == "miss":
			Crafts.gain("fishing", 1)
		else:
			await ctx.say(["釣起一條%s！%s" % [f.name, "（漂亮）" if r == "perfect" else ""]] + land(f, r == "perfect"))
		if await ctx.ask("魚跑了。再甩一竿？" if r == "miss" else "再釣一竿？", ["再釣一竿", "收竿"]) != 0:
			break
	if scores.is_empty():
		return
	var avg := 0.0
	for s in scores:
		avg += s
	avg /= scores.size()
	Practice.done("fish", avg)
	await ctx.say("（這一趟的手感：%d。之後「慢慢等」每竿約 %d%% 上鉤）" % [roundi(avg), roundi(_wait_chance() * 100)])


## 慢慢等：照上次的手感判定，可以連釣幾回
static func _waiting(ctx: Ctx, spot: String) -> void:
	var chance := _wait_chance()
	if chance <= 0.0:
		await ctx.say("上次自己拉竿一條也沒釣著，光是乾等也不會有魚上鉤。\n（先自己拉竿釣一趟，手感好了，慢慢等才容易上鉤）")
		return
	var n := await Train.ask_rounds(ctx, CAST_STAMINA, "釣")
	if n == 0 or not await Train.exert(ctx, CAST_STAMINA * n, "手臂痠得握不住竿了。"):
		return
	ctx.pass_time(CAST_KE * n)
	var net := G.bag.has("fish_net")
	await ctx.work("fish", "撒網垂釣中……" if net else "垂釣中……")
	var tally := {}
	var notes := []
	var lost := 0
	for i in n:
		var f := roll(spot)
		if randf() < chance:
			var k := 2 if net and randf() < NET_DOUBLE else 1
			for j in k:
				tally[f.name] = int(tally.get(f.name, 0)) + 1
				notes += land(f, false, 0.75)
		else:
			lost += 1
	if lost > 0:
		Crafts.gain("fishing", lost)
	var got := []
	for name in tally:
		got.append("%s×%d" % [name, tally[name]])
	var out := ["你在水邊坐下，甩出釣線，靜靜等著浮標動。（%s花了%s）" % [("連釣 %d 回，" % n) if n > 1 else "", G.ke_text(CAST_KE * n)]]
	out.append(("釣起：%s。" % "、".join(got)) if got.size() > 0 else "一條也沒釣著……")
	if lost > 0 and got.size() > 0:
		out.append("（另外跑了 %d 條）" % lost)
	await ctx.say(out + notes)
