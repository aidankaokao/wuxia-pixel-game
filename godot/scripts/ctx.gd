class_name Ctx
extends RefCounted
## 劇情腳本拿到的 ctx：腳本能做的事都在這裡（照網頁版 events.ts 的 EventCtx）。寫起來像劇本：
##   static func well_use(ctx: Ctx) -> void:
##       if await ctx.ask("要在井邊歇一會兒嗎？", ["打水歇歇", "算了"]) != 0:
##           return
##       ctx.pass_time(4)
##       await ctx.say("你打起一桶水……")
## 一句話可以是字串（旁白）或 {speaker, text}；say 可以一次給好幾句（陣列）。

var scene: GridScene
var ui: Ui
## 呼叫時帶進來的東西（例如對著哪個人：npc）
var extra: Dictionary


func _init(s: GridScene, ex := {}) -> void:
	scene = s
	ui = s.ui
	extra = ex


static func _line(l) -> Dictionary:
	return {"text": l} if l is String else l


## 依序說幾句話（字串是旁白）
func say(lines) -> void:
	var out := []
	for l in (lines if lines is Array else [lines]):
		out.append(_line(l))
	await ui.say(out)


## 一句話加幾個選項，回傳選第幾個（0 起）
func ask(line, choices: Array) -> int:
	return await ui.ask(_line(line), choices)


func flag(key: String) -> int:
	return int(G.flags.get(key, 0))


func set_flag(key: String, value := 1) -> void:
	if value == 0:
		G.flags.erase(key)
	else:
		G.flags[key] = value


## 做事花了幾刻（過了半夜就換日）
func pass_time(ke: int) -> void:
	G.advance(ke)


func item_name(id: String) -> String:
	return ui.items.get(id, {}).get("name", id)


func has(id: String, n := 1) -> bool:
	return int(G.bag.get(id, 0)) >= n


## 給東西，回傳提示（「得到了金創藥 ×3」）；quiet 不說出來
func give(id: String, n := 1, quiet := false) -> void:
	G.bag[id] = int(G.bag.get(id, 0)) + n
	if not quiet:
		await say("（得到了%s%s）" % [item_name(id), (" ×%d" % n) if n > 1 else ""])


## 拿走東西；不夠就不拿、回傳 false
func take(id: String, n := 1) -> bool:
	if not has(id, n):
		return false
	G.bag[id] = int(G.bag[id]) - n
	if G.bag[id] <= 0:
		G.bag.erase(id)
	return true


## 付錢；不夠就不付、回傳 false
func pay(silver: int) -> bool:
	if G.silver < silver:
		return false
	G.silver -= silver
	return true


## 學會一門武功（角色與武功之後再接上數值，現在先記在主角身上）
func learn(skill: String) -> void:
	var list: Array = G.hero.get("skills", [])
	if not skill in list:
		list.append(skill)
	G.hero["skills"] = list


func wait(sec: float) -> void:
	await scene.get_tree().create_timer(sec).timeout


## 做事的過場：畫面中間一行字（例如「打水中……」），過一兩秒；之後再換成動畫
func work(_kind: String, text: String, sec := 1.2) -> void:
	await ui.caption(text, sec)


## 找地圖上的人（walkers 的 def.id）；"player" 是主角
func who(id: String) -> Node3D:
	if id == "player":
		return scene.hero
	for w in scene.walkers:
		if w.get("id", "") == id:
			return w.f
	return null


## 讓某人轉向（"up"、"down"、"left"、"right"）
func face(id: String, dir: String) -> void:
	var n := who(id)
	if n:
		n.face(scene._facing_vec(dir))


## NPC 與主角轉身面對面
func face_each_other(id: String) -> void:
	var n := who(id)
	if n:
		n.face(scene.hero.position - n.position)
		scene.hero.face(n.position - scene.hero.position)


## 讓某人照著方向一格一格走（["up", "up", "left"]）
func walk(id: String, dirs: Array) -> void:
	var n := who(id)
	if n == null:
		return
	for d in dirs:
		var v: Vector3 = scene._facing_vec(d)
		n.face(v)
		n.walking = true
		var tw := scene.create_tween()
		tw.tween_property(n, "position", n.position + v, 0.32)
		await tw.finished
	n.walking = false


## 依旗標、時間重新決定誰該出現
func refresh() -> void:
	scene.refresh()


## 換到某張地圖的某一格（腳本在這之後就不要再做別的事）
func warp(map: String, at: Dictionary) -> void:
	scene.main.hop(map, at)


## 打開商店，關了才繼續
func shop(title: String, stock: Array) -> void:
	await ui.shop(title, stock)
