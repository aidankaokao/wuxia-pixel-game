## 日課表與日常小事（照網頁版 schedule.ts、story/schedule.ts 與鳴泉的 registerActivity／registerDayEvent）：
## - 日課表：鳴泉弟子在自己的床鋪排好一天的固定行程（晨課 → 領飯 → 雜務 → 練樁 → 研讀 → 打坐 → 睡覺），選「照日課表過今天」一鍵照做：
##   每件事扣體力、過時間、播一小段動畫，最後一次說完今天做了什麼；節慶不照表，有人找（掌門要升你）、體力不夠、天太晚就停。
##   表存在 G.life.schedule（ACTS 的 id）。
## - 日常小事：照表做事、親手做雜務、跟人聊天時偶爾發生一件（做事、聊天各一天最多一件，G.life.daily），依時辰、天氣、交情而不同。
##   新的小事加進 EVENTS（[id, 場合, 權重, 只跟誰聊]）並寫 _ok_<id> 與 ev_<id>。
## 沒有用到旗標（晨課、領飯、雜務照鳴泉原本的旗標記）。

const Train := preload("res://story/train.gd")
const Chores := preload("res://story/chores.gd")
const Festival := preload("res://story/festival.gd")

static func _mq() -> GDScript:
	return load("res://story/mingquan.gd")


## 能排的事：名字、說明、場合（給小事挑：drill 練功、chore 雜務、study 研讀、meal 吃飯、rest 歇息）、刻數、體力、動畫、一天最多幾次
const ACTS := {
	"morning": {"name": "晨課", "desc": "卯時到巳時，跟著陸鳴川在演武台練鳴泉劍法（一個時辰，門派貢獻 +2）。", "tag": "drill", "ke": 8, "stamina": 0, "work": "stake", "max": 1},
	"meal": {"name": "領飯", "desc": "到廚房跟卜大勺領今天的大鍋飯（兩刻，一天一份）。", "tag": "meal", "ke": 2, "stamina": 0, "work": "cook", "max": 1},
	"chore": {"name": "雜務", "desc": "做任務榜上的一件雜務（一個時辰、體力 15，門派貢獻 +3；一天最多 3 件）。", "tag": "chore", "ke": 8, "stamina": 15, "work": "water", "max": 3},
	"stake": {"name": "練樁", "desc": "在演武台旁的木樁練一門外功，本門武功收穫更多（兩刻、體力 20；下雨天多 5）。", "tag": "drill", "ke": 2, "stamina": -1, "work": "stake"},
	"study": {"name": "研讀", "desc": "到書房對照劍譜參悟下一招，本門武功收穫更多（兩刻、體力 10）。", "tag": "study", "ke": 2, "stamina": 10, "work": "study"},
	"sit": {"name": "打坐", "desc": "在練功房的蒲團打坐：內力回滿、氣血回一些，裝備中的內功也會精進（兩刻、體力 10）。", "tag": "rest", "ke": 2, "stamina": 10, "work": "sit"},
	"nap": {"name": "午休", "desc": "小睡一個時辰，恢復一些氣血、內力與體力。", "tag": "rest", "ke": 8, "stamina": 0, "work": "sleep"},
	"sleep": {"name": "睡覺", "desc": "做完今天的事，回床睡到天亮。（一定排在最後）", "tag": "rest", "ke": 0, "stamina": 0, "work": "sleep", "last": true},
}
const ORDER := ["morning", "meal", "chore", "stake", "study", "sit", "nap", "sleep"]
const DEFAULT := ["morning", "meal", "chore", "chore", "chore", "stake", "stake", "study", "sit", "sleep"]
const MAX_SLOTS := 10
## 亥時起就不再做事
const LATE := 76


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func table() -> Array:
	return G.life.get("schedule", DEFAULT).duplicate()


static func _stamina(id: String) -> int:
	var s: int = ACTS[id].stamina
	return Train.STAMINA.stake + (5 if G.weather in ["rain", "snow"] else 0) if s < 0 else s


static func _f(k: String) -> int:
	return int(G.flags.get(k, 0))


## 本門武功優先
static func _sect_first(list: Array) -> Array:
	var out := list.duplicate()
	out.sort_custom(func(a, b): return _mq()._sect_skill(a.id) and not _mq()._sect_skill(b.id))
	return out


static func _next_chore() -> String:
	var held: String = G.sect.get("chore", "")
	if held != "":
		return held
	for id in _mq().todays_chores():
		if _f("mq_chore_" + id) != G.day:
			return id
	return ""


## 現在做得了嗎：做得了回傳空字串，否則回傳跳過的原因
static func _check(id: String) -> String:
	match id:
		"morning":
			if G.is_xunxiu():
				return "今天旬休，沒有晨課。"
			if _f("mq_morning") == G.day:
				return "今天已經練過了。"
			return "" if G.shichen_of() in [3, 4, 5] else "不是晨課的時辰（卯時到巳時），沒練到。"
		"meal":
			return "今天的飯領過了。" if _f("mq_meal") == G.day else ""
		"chore":
			return "今天的雜務都做完了。" if _mq()._chores_today() >= 3 or _next_chore() == "" else ""
		"stake":
			return "" if Train.trainable("outer").size() > 0 else "沒有裝備著、還沒練到上限的外功。"
		"study":
			return "" if Train.studyable().size() > 0 else "目前沒有能參悟的招式。"
	return ""


## 做這件事（不問話、不扣體力、不過時間），回傳要記進總結的話
static func _run(id: String) -> Array:
	var mq := _mq()
	match id:
		"morning":
			G.flags["mq_morning"] = G.day
			var out := Train._exp_lines("mingquan", mq.MORNING_EXP, true) if Train.can_gain("mingquan") else []
			return out + [Sect.add_contrib(mq.MORNING_CONTRIB)]
		"meal":
			G.flags["mq_meal"] = G.day
			var fest := Festival.bu_meal()
			var it: String = fest[0] if fest.size() > 0 else mq._daily_meal().id
			var n := 2 if fest.size() > 0 else 1
			G.bag[it] = int(G.bag.get(it, 0)) + n
			return ["得到了%s%s。" % [Ui.item_def(it).name, " ×%d" % n if n > 1 else ""]]
		"chore":
			var c := _next_chore()
			var d: Dictionary = mq.CHORES[c]
			var out := ["（%s）" % d.name] + Chores.growth(d.grow)
			for it in d.get("items", {}):
				G.bag[it] = int(G.bag.get(it, 0)) + int(d.items[it])
				out.append("得到了%s ×%d。" % [Ui.item_def(it).name, d.items[it]])
			G.sect.erase("chore")
			G.flags["mq_chores"] = mq._chores_today() + 1
			G.flags["mq_chores_day"] = G.day
			G.flags["mq_chore_" + c] = G.day
			return out + [Sect.add_contrib(mq.CHORE_REWARD)]
		"stake":
			var s: Dictionary = _sect_first(Train.trainable("outer"))[0]
			return Train._exp_lines(s.id, mq.YARD_EXP + (mq.SECT_BONUS if mq._sect_skill(s.id) else 0), false)
		"study":
			var s: Dictionary = _sect_first(Train.studyable())[0]
			return Train.apply(s.id, 24 if mq._sect_skill(s.id) else 15, 1.0)
		"sit":
			var d := Hero.derive(G.hero)
			G.hero.qi = d.max_qi
			G.hero.hp = mini(d.max_hp, int(G.hero.hp) + roundi(d.max_hp * 0.2))
			var out := ["內力回滿。"]
			for s in Train.trainable("inner"):
				out += Train._exp_lines(s.id, Train.SIT_EXP + (mq.SECT_BONUS if mq._sect_skill(s.id) else 0), true)
			return out
		"nap":
			var d := Hero.derive(G.hero)
			G.hero.hp = mini(d.max_hp, int(G.hero.hp) + roundi(d.max_hp * 0.25))
			G.hero.qi = mini(d.max_qi, int(G.hero.qi) + roundi(d.max_qi * 0.25))
			G.hero.stamina = mini(d.max_stamina, int(G.hero.stamina) + roundi(d.max_stamina * 0.34))
			return ["睡了個好覺，精神好多了。"]
	return []


## 有人找你（掌門要升你的身分）：回傳要說的話
static func interrupt() -> String:
	if not Sect.member("mingquan"):
		return ""
	var call := func(what: String) -> String: return "柯靜言匆匆跑來：「掌門在大殿等你，%s。快去吧！」\n（日課先停下，到大殿見掌門）" % what
	if _f("mq_exam") == 1 and int(G.sect.rank) == 0:
		return call.call("要升你為正式弟子")
	if _f("mq_master") > 0 and int(G.sect.rank) == 2:
		return call.call("要升你為真傳弟子")
	return ""


# ── 床鋪：休息、照表過今天、排表 ────────────────────────

## 鳴泉弟子的床鋪（dorm_bed、room_bed、cell_bed 轉過來）
static func bed(ctx: Ctx, prompt: String, wake: Callable) -> void:
	var c := await ctx.ask(prompt, ["躺下休息", "照日課表過今天", "排日課表", "算了"])
	match c:
		0:
			await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？", wake)
		1:
			await run(ctx, wake)
		2:
			await edit(ctx)


static func _table_text(list: Array) -> String:
	return "→".join(list.map(func(id): return ACTS[id].name)) if list.size() > 0 else "（空的）"


## 排表：一件件加，最後一定是睡覺（要的話）
static func edit(ctx: Ctx) -> void:
	var list := table()
	while true:
		var c := await ctx.ask("日課表：%s\n（最多 %d 件；照表做時，做不了的會跳過）" % [_table_text(list), MAX_SLOTS], ["加一件", "拿掉最後一件", "清空重排", "照預設排", "排好了"])
		match c:
			0:
				if list.size() >= MAX_SLOTS:
					await ctx.say("表排滿了。")
					continue
				var opts := ORDER.filter(func(id): return id != "sleep" or not "sleep" in list)
				var i := await ctx.ask("加哪一件？", opts.map(func(id): return "%s：%s" % [ACTS[id].name, ACTS[id].desc]) + ["算了"])
				if i < opts.size():
					# 睡覺一定在最後：其他的事插在睡覺前面
					if opts[i] != "sleep" and "sleep" in list:
						list.insert(list.find("sleep"), opts[i])
					else:
						list.append(opts[i])
			1:
				if list.size() > 0:
					list.pop_back()
			2:
				list = []
			3:
				list = DEFAULT.duplicate()
			_:
				break
	G.life.schedule = list
	await ctx.say("日課表排好了：%s" % _table_text(list))


## 照表過今天
static func run(ctx: Ctx, wake: Callable) -> void:
	var fest := G.festival_of()
	if fest != "":
		await ctx.say("今天是%s。照著日課表悶頭練功太可惜了，四處走走吧。\n（節慶這天不照表）" % fest)
		return
	var busy := interrupt()
	if busy != "" and await ctx.ask(busy, ["先去辦事", "還是照表過今天"]) == 0:
		return
	var list := table()
	if list.filter(func(id): return not ACTS[id].get("last", false)).is_empty():
		await ctx.say("日課表上還沒排事情。\n（先選「排日課表」）")
		return
	var day := G.day
	var log := []
	var stop := ""
	var sleep_at_end := false
	var counts := {}
	for id in list:
		var a: Dictionary = ACTS[id]
		if a.get("last", false):
			sleep_at_end = true
			break
		if stop != "":
			continue
		if G.day != day or G.time >= LATE:
			stop = "天色已晚，剩下的明天再說。"
			continue
		var who := interrupt()
		if who != "" and who != busy:
			log.append(who)
			await _summary(ctx, log)
			return
		counts[id] = int(counts.get(id, 0)) + 1
		var why := "今天排了太多次了。" if a.has("max") and int(counts[id]) > int(a.max) else _check(id)
		if why != "":
			log.append("%s：%s" % [a.name, why])
			continue
		var cost := _stamina(id)
		if int(G.hero.stamina) < cost:
			stop = "做到「%s」時已經累得不行，只好停下。" % a.name
			continue
		G.hero.stamina = int(G.hero.stamina) - cost
		var at := G.time_text()
		await ctx.work(a.work, "%s……" % a.name, 0.7)
		ctx.pass_time(a.ke)
		var lines := _run(id).filter(func(l): return l != null and l != "")
		log.append("【%s】%s%s" % [at, a.name, ("\n" + "\n".join(lines)) if lines.size() > 0 else ""])
		await maybe_event(ctx, a.tag)
	if stop != "":
		log.append(stop)
	await _summary(ctx, log)
	if not sleep_at_end or G.day != day:
		return
	# 天還亮著就問一聲，免得大白天就睡到隔天
	if G.shichen_of() < 9 and G.shichen_of() >= 3:
		if await ctx.ask("今天的事做完了，現在才%s，天還亮著。" % G.time_text(), ["回床睡到天亮", "先不睡，四處走走"]) != 0:
			return
	await ctx.say("你回到床鋪躺下。")
	await ctx.work("sleep", "睡覺中……", 1.4)
	ctx.pass_time(G.ke_until_dawn())
	ctx.restore_all()
	await ctx.say(["你一覺睡到天亮。\n——%s　%s" % [G.date_text(), G.time_text()]] + wake.call() + ["（氣血、內力、體力完全恢復）"])
	await load("res://story/daily.gd").brief(ctx.ui)


## 今天做了什麼：三件一頁
static func _summary(ctx: Ctx, log: Array) -> void:
	if log.is_empty():
		return
	var pages := ["——今天的日課——"]
	for i in range(0, log.size(), 3):
		pages.append("\n".join(log.slice(i, i + 3)))
	await ctx.say(pages)


# ── 日常小事 ────────────────────────────────────────────

## 做完一件事、每聊一次天，發生小事的機率（各一天最多一件）
const CHANCE := {"work": 0.06, "chat": 0.1}
## [id, 場合（drill／chore／study／meal／rest／chat）, 權重, 只跟這些人聊才會發生]
const EVENTS := [
	["praise", ["chore"], 3, []], ["slack", ["chore"], 2, []], ["distracted", ["drill"], 3, []], ["pointer", ["drill"], 2, []],
	["pill", ["drill", "chore", "study"], 2, []], ["doze", ["study"], 2, []], ["extra_meal", ["meal"], 2, []],
	["rain_herbs", ["chore", "drill", "study"], 4, []], ["cao_bucket", ["chore", "drill"], 3, []], ["lost_tassel", ["drill", "chore", "rest"], 3, []],
	["lu_tip", ["drill"], 3, []], ["night_sword", ["rest", "chat", "study"], 4, []],
	["xiaoman_snack", ["chat"], 3, ["xiaoman"]], ["lu_notes", ["chat"], 3, ["lu"]], ["rain_shelter", ["chat"], 3, []], ["small_gift", ["chat"], 2, []],
]


static func _aff_of(id: String) -> int:
	return int(Social.rel(id).get("aff", 0)) if Social.met(id) else 0


static func _day_time() -> bool:
	return G.shichen_of() in [4, 5, 6, 7, 8]


static func _night() -> bool:
	return G.shichen_of() in [10, 11, 0, 1]


## 這件小事現在合不合適（who 是聊天的對象）
static func _ok(id: String, who: String) -> bool:
	var mq := Sect.member("mingquan")
	match id:
		"praise", "slack", "distracted", "pill", "doze", "extra_meal", "lost_tassel":
			return mq
		"pointer":
			return mq and _aff_of("han") >= 10
		"rain_herbs":
			return mq and G.weather == "rain" and _day_time()
		"cao_bucket":
			return mq and _day_time()
		"lu_tip":
			return mq and _aff_of("lu") >= 30
		"night_sword":
			return mq and _night()
		"xiaoman_snack":
			return _day_time()
		"lu_notes":
			return _aff_of("lu") >= 30
		"rain_shelter":
			return G.weather == "rain" and who != ""
		"small_gift":
			return who != "" and _aff_of(who) >= 30
	return true


## 做完一件事（或聊完天）後偶爾發生一件小事；發生了回傳 true。tag 是場合，who 是聊天的對象
static func maybe_event(ctx: Ctx, tag: String, who := "") -> bool:
	var key := "event:chat" if tag == "chat" else "event:work"
	if int(_daily().get(key, 0)) == G.day or randf() >= CHANCE["chat" if tag == "chat" else "work"]:
		return false
	var pool := EVENTS.filter(func(e): return tag in e[1] and (e[3].is_empty() or who in e[3]) and _ok(e[0], who))
	if pool.is_empty():
		return false
	var total := 0
	for e in pool:
		total += int(e[2])
	var r := randf() * total
	for e in pool:
		r -= int(e[2])
		if r < 0:
			_daily()[key] = G.day
			await Callable(load("res://story/schedule.gd"), "ev_" + e[0]).call(ctx, who)
			return true
	return false


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _aff_note(id: String, n: int) -> String:
	Social._mut(id).aff = clampi(int(Social._mut(id).aff) + n, -100, 100)
	return "（%s的熟悉度 +%d）" % [Social.def(id).name, n]


static func ev_praise(ctx: Ctx, _who: String) -> void:
	await ctx.say(["陸鳴川路過，停下來看了一會兒。", _by("陸鳴川").call("做得仔細。這種小事做得好，練劍也錯不了。"), "%s（%s）" % [_aff_note("lu", 1), Sect.add_contrib(2)]])


static func ev_slack(ctx: Ctx, _who: String) -> void:
	ctx.pass_time(4)
	G.hero.stamina = maxi(0, int(G.hero.stamina) - 10)
	await ctx.say(["做到一半，你靠著柱子打了個盹——", "柯靜言正好撞見。", _by("柯靜言").call("偷懶？罰你多做半個時辰。"), "（多花了半個時辰，體力 −10）"])


static func ev_distracted(ctx: Ctx, _who: String) -> void:
	var n := mini(int(G.hero.hp) - 1, roundi(Hero.derive(G.hero).max_hp * 0.1))
	G.hero.hp = int(G.hero.hp) - n
	await ctx.say(["練著練著，心思飄到了山下的臨江城……", "一個沒留神，彈回來的木樁結結實實撞在你肩上。", "（氣血 −%d）" % n])


static func ev_pointer(ctx: Ctx, _who: String) -> void:
	G.hero.points = int(G.hero.get("points", 0)) + 2
	await ctx.say(["韓靖秋不知什麼時候站在一旁，看了半晌。", _by("韓靖秋").call("手肘再沉一點。劍是從腰上發的，不是從手上。"), "你照著一試，果然順了許多。", "（武學點數 +2）"])


static func ev_pill(ctx: Ctx, _who: String) -> void:
	await ctx.say(["蘇青苗經過，看你滿頭大汗。", _by("蘇青苗").call("藥房新搓的，拿去，提提神。")])
	await ctx.give("yangqi_wan")


static func ev_doze(ctx: Ctx, _who: String) -> void:
	ctx.pass_time(2)
	G.hero.stamina = mini(Hero.derive(G.hero).max_stamina, int(G.hero.stamina) + 10)
	await ctx.say(["讀著讀著，字越來越模糊……", "你猛然驚醒，口水差點滴在劍譜上。抬頭一看，窗外的日影已經挪了一大截。", "（多花了兩刻，不過睡了一下，體力 +10）"])


static func ev_extra_meal(ctx: Ctx, _who: String) -> void:
	await ctx.say([_by("卜大勺").call("長身體的，多吃點！"), "卜大勺又往你手裡多塞了一份。"])
	await ctx.give(_mq()._daily_meal().id)


static func ev_rain_herbs(ctx: Ctx, _who: String) -> void:
	G.hero.stamina = maxi(0, int(G.hero.stamina) - 5)
	await ctx.say(["雨點忽然密了起來。", _by("蘇青苗").call("藥！架上的藥還曬著——誰來幫把手！"), "你跟著幾個師兄弟衝過去，七手八腳地把一篩篩草藥搶進屋簷下。", "（體力 −5。%s）" % Sect.add_contrib(2)])


static func ev_cao_bucket(ctx: Ctx, _who: String) -> void:
	var cao := _by("曹小豆")
	await ctx.say(["曹小豆提著水桶跑過，腳下一絆——", "嘩啦！半桶水全潑在你身上。", cao.call("對、對不起！這桶是要挑去廚房的……")])
	var c := await ctx.ask("（還好太陽大，一曬就乾了）" if G.weather == "clear" else "（衣服濕透了，風一吹有點冷）", ["幫曹小豆再挑一桶", "擺擺手，叫曹小豆小心點"])
	if c == 0:
		ctx.pass_time(2)
		G.hero.stamina = maxi(0, int(G.hero.stamina) - 8)
		await ctx.say([cao.call("謝謝師兄！我下次一定看路！"), "（多花了兩刻，體力 −8。%s）" % Sect.add_contrib(1)])
	else:
		await ctx.say([cao.call("是！是！"), "曹小豆提著空桶，一溜煙又跑了。"])


static func ev_lost_tassel(ctx: Ctx, _who: String) -> void:
	await ctx.say("你在地上撿到一條紅色的劍穗，穗結上繡著一個小小的「滿」字。")
	if await ctx.ask("這是誰的，一看就知道了。", ["拿去還給顧小滿", "交給知客的方硯清"]) == 0:
		await ctx.say([_by("顧小滿").call("我的劍穗！找了一早上……謝謝你！"), _by("顧小滿").call("這是我娘編的，丟了我得哭死。"), _aff_note("xiaoman", 3)])
	else:
		await ctx.say([_by("方硯清").call("我會貼張字條，失主自會來領。"), "（%s）" % Sect.add_contrib(1)])


static func ev_lu_tip(ctx: Ctx, _who: String) -> void:
	await ctx.say(["陸鳴川在一旁看你練了一陣，走過來把你的劍尖往下壓了半寸。", _by("陸鳴川").call("「泉湧」這一式，劍尖太高，力就散了。再來一次。")])
	var lines := Train._exp_lines("mingquan", 40, false) if Train.can_gain("mingquan") else []
	if lines.is_empty():
		G.hero.points = int(G.hero.get("points", 0)) + 2
		lines = ["武學點數 +2。"]
	await ctx.say("\n".join(lines + [_aff_note("lu", 1)]))


static func ev_night_sword(ctx: Ctx, _who: String) -> void:
	await ctx.say(["夜深人靜，後山的方向隱隱傳來一陣劍聲。", "「錚——」一聲清響，接著又沒了動靜。"])
	if await ctx.ask("要去看看嗎？", ["摸黑上後山看看", "蒙頭睡覺"]) != 0:
		await ctx.say("你翻了個身。隔天問起，師兄弟都說什麼也沒聽見。")
		return
	ctx.pass_time(4)
	G.hero.stamina = maxi(0, int(G.hero.stamina) - 10)
	G.hero.points = int(G.hero.get("points", 0)) + 3
	await ctx.say(["你循著聲音摸到劍塚附近，月光下只見一道人影一閃，就沒入了林子。", "地上留著幾道新鮮的劍痕，深淺如一。你蹲下來比劃了半天，似乎悟到了一點什麼。", "（多花了半個時辰，體力 −10，武學點數 +3）"])


static func ev_xiaoman_snack(ctx: Ctx, _who: String) -> void:
	var gu := _by("顧小滿")
	await ctx.say([gu.call("欸，我跟你說，卜大勺今天蒸了桂花糕，就擱在廚房的蒸籠裡……"), gu.call("我們去「嘗」一塊，好不好？")])
	if await ctx.ask(gu.call("去不去嘛？"), ["一起去", "勸她別去"]) != 0:
		await ctx.say([gu.call("……好啦好啦，不去就不去。你真像大師兄。"), _aff_note("xiaoman", 1)])
		return
	if randf() < 0.6:
		await ctx.say(["你們躡手躡腳溜進廚房，一人摸了一塊就跑。", gu.call("嘻嘻，好吃吧？")])
		await ctx.give("guihua")
	else:
		ctx.pass_time(4)
		await ctx.say(["手才剛碰到蒸籠——", _by("卜大勺").call("好哇！兩個小賊！洗碗去，洗完再走！"), "你和顧小滿在水缸邊洗了半個時辰的碗。", "（多花了半個時辰）"])
	await ctx.say(_aff_note("xiaoman", 3))


static func ev_lu_notes(ctx: Ctx, _who: String) -> void:
	G.hero.points = int(G.hero.get("points", 0)) + 2
	await ctx.say([_by("陸鳴川").call("對了，這個給你。"), _by("陸鳴川").call("我剛入門時記的練功筆記，字醜，將就著看。"), "薄薄一冊，密密麻麻寫滿了每一式的心得，還有好幾處被劃掉重寫。", "（武學點數 +2）%s" % _aff_note("lu", 1)])


static func ev_rain_shelter(ctx: Ctx, who: String) -> void:
	ctx.pass_time(2)
	await ctx.say(["雨越下越大，你和%s躲在屋簷下，一句接一句，不知不覺又聊了兩刻。" % Social.def(who).name, _aff_note(who, 2)])


static func ev_small_gift(ctx: Ctx, who: String) -> void:
	await ctx.say("臨走前，%s往你手裡塞了一包東西：「自家的，別客氣。」" % Social.def(who).name)
	await ctx.give("tea" if randf() < 0.5 else "jinchuang")
