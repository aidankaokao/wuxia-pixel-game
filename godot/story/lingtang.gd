## 菱塘村（PLAN.md 4.48；手工地圖 data/lingtang.json，店與室內照樣板 town_gen.gd）：煙湖東岸，採菱、養鴨、湖鮮。
## - 村長卞守田（卞家）：支線「大斗小斗」（lt_dou，三塘鎮那一段在 santang.gd）；其他照村長家。
## - 菱塘小舖（甯秋菱）：雜貨之外賣鴨蛋，收湖產（魚、菱角、蓮藕、鴨蛋）。
## - 卞小菱：划菱角船比快（一天一次）、八到十月跟著採菱（一天一次）。棧橋邊的菱角船：採菱。
## - 鴨倌柴老鴨：幫忙趕鴨（一天一次）。湖邊釣魚（reeds）。
## - 支線「大斗小斗」：村裡的米挑到三塘鎮米市，一石總少兩三斗 → 卞守田託你去看看（santang.gd）→ 揭穿苟四以後回來覆命：銀兩 30、鴨蛋、名聲 3。
## 用到的旗標：lt_dou（見 santang.gd）、lt_race 跟小菱比船贏了幾回
## 一天一次的事記在 G.life.daily：lt:race 比船、lt:caoling 採菱、lt:duck 趕鴨。

const Train := preload("res://story/train.gd")
const Town := preload("res://story/town.gd")
const Fishing := preload("res://story/fishing.gd")

const REWARD := 30
const FAME := 3
const DUCK_PAY := 4
const BUYS := ["water_chestnut", "lotus_root", "duck_egg", "crucian", "carp", "grass_carp", "dried_fish"]


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _n(pid: String) -> String:
	return Person.full_name(pid)


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func _once(key: String) -> bool:
	return int(_daily().get(key, 0)) == G.day


static func _mark(key: String) -> void:
	_daily()[key] = G.day


## 八月到十月是採菱的時候（G.date_of 的月份從 0 起）
static func _caoling_season() -> bool:
	var m := int(G.date_of().month) + 1
	return m >= 8 and m <= 10


# ── 卞家：村長卞守田 ────────────────────────────────────

static func chief(ctx: Ctx, h: Dictionary) -> void:
	var bian := _by(h.who)
	var t := ctx.flag("lt_dou")
	if t == 4:
		await ctx.say([bian.call("苟四跑了？米市換了官斗？"), bian.call("好！好啊！村裡的米，往後一斗是一斗了！"), bian.call("這是大夥兒湊的，還有一籃鴨蛋，你一定得收下。")])
		ctx.set_flag("lt_dou", 5)
		ctx.silver(REWARD)
		ctx.fame(FAME)
		await ctx.give("duck_egg", 6)
		return
	if t == 0:
		await ctx.say([bian.call("老漢卞守田，菱塘村的村長。"), bian.call("村裡種稻、採菱、養鴨，日子還過得去。就是有一樁事，憋了好幾年……"),
			bian.call("每年秋收，大夥兒把米挑到三塘鎮的米市去賣。在家裡量好的一石，到了米市一過斗，總少個兩三斗。"), bian.call("誰都知道有鬼，可誰也說不出鬼在哪兒。")])
		if await ctx.ask(bian.call("你是見過世面的人……能不能替我們去三塘鎮米市看看？"), ["我去看看", "這事我管不了"]) == 0:
			ctx.set_flag("lt_dou", 1)
			await ctx.say(bian.call("米市在三塘鎮大街南邊，早上才開。斛手叫苟四，是府城米行的人。"))
		return
	if t < 4:
		await ctx.say(bian.call("米市在三塘鎮大街南邊，早上才開。斛手叫苟四。"))
	await Town.default_shop(ctx, h)


# ── 菱塘小舖 ────────────────────────────────────────────

static func goods(ctx: Ctx, h: Dictionary) -> void:
	var c := await ctx.ask(_by(h.who).call("鴨蛋、菱角、湖裡的魚，都是村裡自家的。要買點什麼？"), ["買東西", "賣湖產（魚、菱角、蓮藕、鴨蛋）", "不用了"])
	if c == 0:
		await ctx.shop(h.name, Town.GOODS.slice(0, 8) + ["duck_egg", "water_chestnut", "lotus_root", "crucian", "jinchuang", "tea"])
	elif c == 1:
		await ctx.ui.shop("%s・收湖產" % h.name, [], 0.7, 0.0, BUYS)


# ── 卞小菱 ──────────────────────────────────────────────

static func xiaoling(ctx: Ctx) -> void:
	var who := _n("lt_xiaoling")
	var x := _by(who)
	var opts := ["比誰划菱角船快（一天一次）", "跟著去採菱（八到十月，一天一次）", "閒聊", "不用了"]
	var c := await ctx.ask(x.call("嘿！要不要比划船？輸的人剝十個菱角！" if ctx.flag("lt_race") == 0 else "又來啦？今天我可不會讓你！"), opts)
	match c:
		0:
			await _race(ctx)
		1:
			await caoling(ctx)
		2:
			if ctx.flag("lt_dou") >= 5:
				await ctx.say(_lines(who, ["爹說，今年挑米去三塘，一斗也沒少！他高興得多喝了兩碗。", "你是怎麼看出那個斗有毛病的？教教我嘛。"]))
			else:
				await ctx.say(_lines(who, ["荷堤上划船的葉姊姊，以前也是村裡的。她划船是全村最好的，我第二！", "秋天菱角熟了，湖上全是菱角船，唱著歌比誰採得多。"]))


static func _race(ctx: Ctx) -> void:
	var x := _by(_n("lt_xiaoling"))
	if _once("lt:race"):
		await ctx.say(x.call("今天比過啦，我胳膊都酸了。明天再來！"))
		return
	if not await Train.exert(ctx, 10, "你連槳都提不起來了。"):
		return
	_mark("lt:race")
	ctx.pass_time(2)
	await ctx.work("haul", "划船中……", 1.0)
	var a := Hero.attrs(G.hero)
	var mine := int(a.agility) * 2 + int(a.constitution) + (8 if not Train.trainable("light").is_empty() else 0) + randi() % 16
	var hers := 38 + mini(ctx.flag("lt_race"), 5) * 2 + randi() % 16
	if mine > hers:
		var first := ctx.flag("lt_race") == 0
		ctx.set_flag("lt_race", ctx.flag("lt_race") + 1)
		await ctx.say(["兩條菱角船從棧橋邊衝出去，繞過湖心那叢蘆葦再划回來。你的船頭先碰到了棧橋。", x.call("哎呀！差一點點！……好嘛，我剝。")])
		await ctx.give("water_chestnut", 3)
		if first:
			ctx.fame(1)
	else:
		await ctx.say(["兩條菱角船從棧橋邊衝出去，繞過湖心那叢蘆葦再划回來。小菱的船像一條魚，你還沒轉過蘆葦，她已經在棧橋上朝你招手了。",
			x.call("哈哈！你剝！十個，一個都不能少！")])


## 採菱：八到十月，一天一次，一個時辰、體力 15，菱角四到六個
static func caoling(ctx: Ctx) -> void:
	if not _caoling_season():
		await ctx.say("湖上的菱葉%s。採菱要等八月以後。" % ("還沒長滿" if int(G.date_of().month) + 1 < 8 else "都黃了，菱角早就採完了"))
		return
	if _once("lt:caoling"):
		await ctx.say("今天採過了。菱角要留一些，明年才長得多。")
		return
	if not await Train.exert(ctx, 15, "你的腰彎不下去了。"):
		return
	_mark("lt:caoling")
	ctx.pass_time(8)
	await ctx.work("garden", "採菱中……")
	await ctx.say("你跟著小菱坐在菱角船裡，一手撥開菱葉，一手把底下的菱角摘進竹籃。湖上的船一條挨一條，有人唱起了採菱歌。")
	await ctx.give("water_chestnut", 4 + randi() % 3)


static func boat(ctx: Ctx) -> void:
	if await ctx.ask("一條窄窄的菱角船，船頭放著竹籃。", ["划出去採菱", "算了"]) == 0:
		await caoling(ctx)


# ── 鴨倌柴老鴨 ──────────────────────────────────────────

static func chai(ctx: Ctx) -> void:
	var who := _n("lt_chai")
	var c := await ctx.ask(_by(who).call("嘎嘎嘎——回來！……喔，客人。幫我趕趕鴨子？"), ["幫忙趕鴨（一天一次，一個時辰，%d 兩）" % DUCK_PAY, "閒聊", "不用了"])
	if c == 1:
		await ctx.say(_lines(who, ["鴨子早上放進湖裡，晚上趕回棚裡。頭鴨認得路，其他的跟著頭鴨走。", "有時候別家的鴨子也混進來，跟著我的頭鴨回棚——嘿嘿，那可不能怪我。"]))
		return
	if c != 0:
		return
	if _once("lt:duck"):
		await ctx.say(_by(who).call("今天的鴨子都回棚啦。"))
		return
	if not await Train.exert(ctx, 15, "你跑不動了，鴨子都比你快。"):
		return
	_mark("lt:duck")
	ctx.pass_time(8)
	await ctx.work("haul", "趕鴨中……")
	ctx.silver(DUCK_PAY)
	var lines := ["你拿著竹竿在湖岸上跑來跑去，把散開的鴨子一隻隻趕回來。有一隻鑽進蘆葦裡，你追了半天。", "柴老鴨給你 %d 兩，又從棚裡摸出兩個鴨蛋。" % DUCK_PAY]
	var list := Train.trainable("light")
	if not list.is_empty():
		lines += Train._exp_lines(list[0].id, 8, false)
	await ctx.say(lines)
	await ctx.give("duck_egg", 2)


static func fish(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "reeds", "煙湖的水一眼望不到邊，蘆葦根底下的魚最多。")
