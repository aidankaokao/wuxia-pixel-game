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


## 學會一門武功（level 是幾重；已經會了就不說話）
func learn(skill: String, level := 1) -> void:
	var t := Hero.learn(G.hero, skill, level)
	if t != "":
		await say(t)


## 角色的數值（氣血、內力、體力、五維…）
func hero() -> Dictionary:
	return G.hero


## 氣血、內力、體力回滿
func restore_all() -> void:
	Hero.restore_all(G.hero)


## 武功累積經驗；升重時說出來
func gain_skill(id: String, amount: int) -> void:
	var t := Hero.gain_skill(G.hero, id, amount)
	if t != "":
		await say(t)


func wait(sec: float) -> void:
	await scene.get_tree().create_timer(sec).timeout


## 做事的過場：畫面中間一行字，主角做起動作（掄、攪、坐著），頭上一個個冒出小字（柴、水、魚……），過一兩秒
const WORK_LOOK := {
	"chop": ["swing", "柴"], "water": ["swing", "水"], "farm": ["swing", "田"], "bellows": ["stir", "火"], "stake": ["swing", "啪"],
	"quarry": ["swing", "石"], "haul": ["swing", "貨"], "garden": ["sit", "蓮"], "cook": ["stir", "香"], "fish": ["sit", "魚"],
	"sit": ["sit", "氣"], "study": ["sit", "書"], "sleep": ["sit", "Ｚ"], "rest": ["sit", "歇"], "pray": ["sit", "香"],
	"qin": ["sit", "♪"], "chess": ["sit", "棋"], "write": ["sit", "墨"], "paint": ["sit", "畫"], "weave": ["sit", "梭"],
	"dye": ["stir", "染"], "mulberry": ["swing", "桑"], "embroider": ["sit", "繡"],
}


func work(kind: String, text: String, sec := 1.4) -> void:
	var look: Array = WORK_LOOK.get(kind, ["sit", "…"])
	var h: Chibi = scene.hero if scene and scene.get("hero") is Chibi else null
	var puffs: Array[Node3D] = []
	if h:
		h.action = look[0]
		h.walking = false
		# 每 0.35 秒冒一個小字，往上飄、淡掉
		var n := int(sec / 0.35)
		for i in n:
			var lb := Mk.label(look[1], 26, Color("fff4d8"))
			lb.position = Vector3(0.3 * (1 if i % 2 else -1), 1.5, 0)
			lb.modulate.a = 0.0
			h.add_child(lb)
			puffs.append(lb)
			var tw := lb.create_tween()
			tw.tween_interval(i * 0.35)
			tw.tween_property(lb, "modulate:a", 1.0, 0.1)
			tw.parallel().tween_property(lb, "position:y", 2.1, 0.7)
			tw.tween_property(lb, "modulate:a", 0.0, 0.25)
	await ui.caption(text, sec)
	if h and is_instance_valid(h):
		h.action = ""
	for p in puffs:
		if is_instance_valid(p):
			p.queue_free()


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
	# 腳本還在跑時介面算忙、hop 會略過：等這一幀結束（腳本跑完）再換
	scene.main.call_deferred("hop", map, at)


## 開戰（遭遇戰 id，見 data/enemies.json）；打完回到原地圖再繼續。回傳 "win"／"lose"／"flee"
## 輸了又不是切磋的話會被送回青竹村，腳本就不要再接著做事
## 打完會換成新的場景（原本的場景已經釋放），ctx.scene 跟著換過去，腳本可以接著走路、說話
func battle(encounter: String, field := "") -> String:
	var m: Node = scene.main
	var r: String = await m.battle(encounter, field)
	if m.scene is GridScene:
		scene = m.scene
	G.beast_grace = Time.get_ticks_msec() / 1000.0 + 2.5
	return r


## 對著的這個人（場景裡的 walker；自己過日子的人看 act 知道他在做什麼）
func walker() -> Dictionary:
	for w in scene.walkers:
		if w.get("id", "") == extra.get("npc", ""):
			return w
	return {}


## 跟對著的這個人照平常那樣聊（劇情的部分處理完、沒事可說時用；顧攤子的人會問要不要買賣）
func chat() -> void:
	for w in scene.walkers:
		if w.get("id", "") == extra.get("npc", ""):
			await scene.chat(w)
			return


## 名聲
func fame(n: int) -> void:
	G.hero.fame = int(G.hero.get("fame", 0)) + n
	ui.notify("名聲 +%d" % n)


func silver(n: int) -> void:
	G.silver += n
	ui.notify("銀兩 +%d" % n)


## 打開商店，關了才繼續
func shop(title: String, stock: Array) -> void:
	await ui.shop(title, stock)
