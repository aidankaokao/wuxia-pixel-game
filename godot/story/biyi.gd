## 碧漪湖漁村（照網頁版 story/biyi.ts、biyi_people.ts）：
## - 釣魚：棧橋盡頭、南岸蘆葦蕩、湖心島各有釣點（story/fishing.gd 的 pier／reeds／isle）；釣竿跟秦老漢買
## - 秦老漢：老漁夫（人際），賣釣竿、撐船送人去湖心島；熟了講白鯉的傳說（熟悉度事件，旗標 by_legend）
## - 喬嫂：湖鮮館老闆娘（人際），點菜、教湖鮮菜（收銀兩）、賣菱角蓮藕、住一晚
## - 阮大水：年輕漁夫，魚簍邊收魚、賣魚
## - 荷塘：一天採一次蓮藕與菱角（喬小荷在旁邊幫忙），隨季節變
## - 湖心島望月亭：每月十五的夜裡，傳說中的白鯉會浮上來（moon_pavilion）
## - 湖邊的小事：釣魚、採蓮之後偶爾碰上一件（lake_event）
## 用到的旗標：by_legend 聽過白鯉的傳說（或親眼見過）、by_carp 白鯉（1 放生了、2 帶回去了）、by_lotus 哪天採過荷塘、by_lake 哪天碰過湖邊的小事

const ISLE_FARE := 2
const INN_PRICE := 3
## 喬嫂教湖鮮菜的學費（入門、中等、進階、拿手）
const LAKE_DISH_COST := [8, 20, 45, 80]
const MENU := ["jiyu", "tangcu", "yinyu", "qingxia", "lingjiao"]
const LOTUS_STAMINA := 10
## 荷塘各季能採什麼：春天荷葉才冒尖；夏天菱角剛結；秋天菱角、蓮藕都有；冬天只剩挖藕（比較冷、比較累）
const LOTUS_SEASON := [
	{},
	{"roots": [0, 0], "nuts": [1, 2], "stamina": LOTUS_STAMINA},
	{"roots": [1, 2], "nuts": [2, 3], "stamina": LOTUS_STAMINA},
	{"roots": [1, 3], "nuts": [0, 0], "stamina": LOTUS_STAMINA + 8},
]
const LAKE_EVENT_CHANCE := 0.25

const Train := preload("res://story/train.gd")
const Cook := preload("res://story/cook.gd")


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _night() -> bool:
	var s := G.shichen_of()
	return s < 3 or s >= 10


# ── 秦老漢 ──────────────────────────────────────────────

## 人物檔案的 story：交談前先問要做什麼；選聊聊回 false，照平常交談
static func qin_story(ctx: Ctx) -> bool:
	var qin := _by("秦老漢")
	var c := await ctx.ask(qin.call("嗯？"), ["聊聊", "買釣竿", "撐船去湖心島"])
	if c == 0:
		return false
	if c == 1:
		await ctx.shop("秦老漢的漁具", ["rod"])
	else:
		await isle_boat(ctx)
	return true


## 棧橋邊秦老漢的小船：白天撐船送人去湖心島；夜裡只有月圓前後才肯出船
static func isle_boat(ctx: Ctx) -> void:
	var qin := _by("秦老漢")
	var date: int = G.date_of().date
	var moon: bool = date >= 14 and date <= 16
	if _night() and not moon:
		await ctx.say(["秦老漢的小船拴在棧橋邊，隨著水波輕輕晃。", qin.call("天黑了不行船，湖心有暗流。明兒早上再來吧。")])
		return
	var friend := Social.stage("qinlao") >= 2
	var fare := 0 if friend else ISLE_FARE
	var line := "月亮這麼亮，湖面跟白天一樣。走吧，老漢送你過去。" if _night() else ("要去湖心島？%s" % (("船錢 %d 兩，來回都算上。" % fare) if fare > 0 else "自己人，不收錢。"))
	if await ctx.ask(qin.call(line), ["上船", "不用了"]) != 0:
		return
	if fare > 0 and not ctx.pay(fare):
		await ctx.say(qin.call("這得 %d 兩，你身上不夠呢。" % fare))
		return
	ctx.pass_time(2)
	await ctx.say(["秦老漢一篙一篙撐著船，小船慢慢離了岸。", "湖水清得見底，水草在船底下搖。", "（過了兩刻，到了湖心島）"])
	ctx.warp("by_isle", {"x": 6, "y": 8, "facing": "right"})


static func isle_back(ctx: Ctx) -> void:
	if await ctx.ask(_by("秦老漢").call("回漁村去？"), ["回去", "再待一會兒"]) != 0:
		return
	ctx.pass_time(2)
	await ctx.say("小船靠上了棧橋。（過了兩刻）")
	ctx.warp("biyi", {"x": 38, "y": 14, "facing": "up"})


## 望月亭：每月十五的夜裡，白鯉會浮上來。釣魚 3 級以上、帶著釣竿才能跟牠周旋（一次很難的起竿）。
## 釣起來以後放生或帶回去，只會發生一次。
static func moon_pavilion(ctx: Ctx) -> void:
	var carp := ctx.flag("by_carp")
	if carp == 1:
		await ctx.say(["望月亭。月光下的湖面平靜無波。", "你摸了摸頸上的鱗墜——那尾白鯉，大概正在湖底某處睡著吧。"])
		return
	if carp == 2:
		await ctx.say("望月亭。亭柱上「月滿碧漪，白鯉朝天」八個字，看起來有點寂寞。")
		return
	if not _night():
		await ctx.say(["一座小小的石亭，亭柱上刻著兩行字：「月滿碧漪，白鯉朝天」。", "亭裡的石桌上，有人用小刀刻了一條魚。"])
		return
	var date: int = G.date_of().date
	if date != 15:
		await ctx.say(["夜裡的湖面黑沉沉的，只有風吹蘆葦的聲音。", "月亮還差一點才圓。" if date >= 12 and date < 15 else "月亮缺了一角，湖上什麼也沒有。"])
		return
	await ctx.say(["月亮又大又圓，碧漪湖平得像一面鏡子，亭子的影子倒映在水裡。", "忽然，湖心泛起一圈銀白的漣漪——", "一尾通體雪白的大鯉魚浮上水面，鱗片映著月光，像是自己會發光。"])
	if ctx.flag("by_legend") == 0:
		ctx.set_flag("by_legend")
	if not ctx.has("rod"):
		await ctx.say("（手邊沒有釣竿，只能看著牠緩緩沉回湖底）")
		return
	if Crafts.level("fishing") < 3:
		await ctx.say(["你甩出釣線，白鯉連看都不看一眼，尾巴一擺就沉下去了。", "（釣魚 3 級以上，才有本事跟白鯉周旋）"])
		return
	if await ctx.ask("白鯉繞著亭子慢慢游，好像在等什麼。", ["甩竿", "靜靜看著就好"]) != 0:
		await ctx.say(["白鯉在月光下繞著亭子游了一圈，緩緩沉回湖底。", "你在亭裡坐了很久，心裡一片寧靜。", "（心神澄明。接下來 3 場戰鬥，武功經驗 ×1.1）"])
		G.hero.rested = {"battles": 3, "mult": 1.1}
		return
	if not await Train.exert(ctx, 15, "你連握竿的力氣都沒有了。"):
		return
	ctx.pass_time(2)
	# 白鯉最難纏：難纏 5（紅區很窄、指針很快）
	var r := await FishGame.play(ctx.ui, {"fight": 5}, Crafts.level("fishing"))
	if r == "miss":
		await ctx.say(["釣線「啪」地一聲斷了。白鯉翻了個身，沉入湖底。", "（下個月十五再來吧）"])
		return
	await ctx.say(["你和白鯉在月光下拉扯了好一陣，終於把牠拉到亭邊——", "白鯉不再掙扎了，一雙眼睛靜靜地看著你。"])
	var up := Crafts.gain("fishing", 30)
	if await ctx.ask("……", ["解下魚鉤，放牠回湖裡", "把牠帶回去"]) == 0:
		ctx.set_flag("by_carp", 1)
		await ctx.say(["你解下魚鉤，雙手捧著白鯉送回水裡。", "白鯉在亭邊停了一會兒，甩了甩尾巴，濺起的水珠落在你掌心——", "掌心裡多了一片銀白的鱗，在月光下微微發亮。"])
		G.hero.points = int(G.hero.points) + 5
		await ctx.give("g_carp_scale")
		ctx.fame(10)
		await ctx.say("武學點數 +5。%s" % (("\n" + up) if up != "" else ""))
	else:
		ctx.set_flag("by_carp", 2)
		await ctx.say("你把白鯉裝進魚簍。牠在簍裡一動也不動，月亮好像暗了一點。")
		await ctx.give("white_carp")
		if up != "":
			await ctx.say(up)


# ── 荷塘 ────────────────────────────────────────────────

static func lotus_pond(ctx: Ctx) -> void:
	var season := G.season_of()
	var s: Dictionary = LOTUS_SEASON[season]
	if s.is_empty():
		await ctx.say(["荷塘裡的荷葉才剛冒尖，捲得像一支支小筆。", "（菱角夏天才結，蓮藕要等到秋冬）"])
		return
	if ctx.flag("by_lotus") == G.day:
		await ctx.say("荷塘今天已經採過了，留一些明天再長吧。")
		return
	var what := "水面漂著剛結的嫩菱角。" if season == 1 else ("荷葉底下有蓮藕，水面漂著菱角。" if season == 2 else "荷葉都枯了，塘泥底下還埋著蓮藕。")
	if await ctx.ask("%s要下塘採一些嗎？（兩刻、體力 %d）" % [what, s.stamina], ["咬咬牙，下塘挖藕" if season == 3 else "挽起褲腳下塘", "算了"]) != 0:
		return
	if not await Train.exert(ctx, int(s.stamina), "腿軟得站不穩，掉進塘裡就不好笑了。"):
		return
	ctx.pass_time(2)
	ctx.set_flag("by_lotus", G.day)
	await ctx.work("garden", "挖藕中……" if season == 3 else "採蓮中……")
	await ctx.say(["塘水冰得刺骨，你咬著牙順著枯荷梗往下摸，拔出一節沾滿泥的白藕。" if season == 3 else "塘泥軟軟的，一腳踩下去沒到小腿。",
		_by("喬小荷").call("冬天的藕最粉！娘說燉肉最好吃！" if season == 3 else "菱角要從底下翻過來摘，才不會扎手！")])
	var roots: int = s.roots[0] + randi() % (int(s.roots[1]) - int(s.roots[0]) + 1)
	var nuts: int = s.nuts[0] + randi() % (int(s.nuts[1]) - int(s.nuts[0]) + 1)
	if roots > 0:
		await ctx.give("lotus_root", roots)
	if nuts > 0:
		await ctx.give("water_chestnut", nuts)
	await lake_event(ctx)


# ── 阮大水的魚簍 ────────────────────────────────────────

static func ruan_stall(ctx: Ctx) -> void:
	var ruan := _by("阮大水")
	var c := await ctx.ask(ruan.call("今天的魚都在簍子裡。你要是自己釣了魚，我也收——價錢公道！"), ["買魚／賣魚", "聊聊", "不用了"])
	if c == 0:
		var buys: Array = Crafts.data().fish.map(func(f): return f.id) + ["lotus_root", "water_chestnut", "white_carp"]
		await ctx.ui.shop("阮大水的魚簍", ["crucian", "carp", "lake_shrimp"], 0.7, 0.0, buys)
	elif c == 1:
		var lines := [
			[ruan.call("秦老爺子釣了一輩子魚，連白鯉都見過。"), ruan.call("我？我只見過我家的白貓。")],
			[ruan.call("下雨天別躲屋裡，雨天的魚最貪嘴。"), ruan.call("蘆葦蕩那邊青蝦多，甲魚也愛躲在那兒。")],
			[ruan.call("鱖魚要等太陽下山才肯咬鉤，脾氣大得很。")],
		]
		await ctx.say(lines.pick_random())


# ── 湖鮮館 ──────────────────────────────────────────────

## 喬嫂的人物檔案 story：點菜、學做湖鮮、買湖產、住一晚；選聊聊回 false
static func qiao_story(ctx: Ctx) -> bool:
	var qiao := _by("喬嫂")
	var c := await ctx.ask(qiao.call("來啦！要吃點什麼？"), ["聊聊", "點菜", "學做湖鮮", "買菱角、蓮藕", "住一晚（%d 兩）" % INN_PRICE])
	match c:
		0:
			return false
		1:
			await ctx.shop("湖鮮館・菜單", MENU)
		2:
			await Cook.teach(ctx, "喬嫂", func(d): return d.get("lake", false), LAKE_DISH_COST, "想學湖鮮？學費照收，手藝包教包會。",
				"我會的湖鮮都教給你啦！剩下的就看你自己琢磨。", "在灶台做；魚自己釣，或跟阮大水買；蓮藕菱角在荷塘採")
		3:
			await ctx.shop("湖鮮館・湖產", ["lotus_root", "water_chestnut"])
		4:
			if not ctx.pay(INN_PRICE):
				await ctx.say(qiao.call("這得 %d 兩，你身上不夠呢。" % INN_PRICE))
				return true
			await ctx.say(qiao.call("後頭那間小房，窗子開著就聽得見湖水。被子我才曬過的。"))
			await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？")
	return true


## 櫃台：喬嫂不在跟前也能點菜（同一個選單）
static func qiao_counter(ctx: Ctx) -> void:
	await qiao_story(ctx)


# ── 湖邊的小事（釣魚、採蓮之後偶爾碰上，一天最多一件） ──

static func lake_event(ctx: Ctx) -> void:
	if ctx.flag("by_lake") == G.day or randf() >= LAKE_EVENT_CHANCE:
		return
	var pool := ["heron"]
	if ctx.has("crucian"):
		pool.append("otter")
	if not _night():
		pool.append("xiaohe")
	ctx.set_flag("by_lake", G.day)
	match pool.pick_random():
		"otter":
			await ctx.say(["蘆葦叢裡「嘩」地鑽出一隻水獺，叼起你簍子裡的一條鯽魚就跑。", "牠跑到幾步外，還回頭看了你一眼，好像在說謝謝。", "（少了一條鯽魚）"])
			ctx.take("crucian")
		"heron":
			var lines := ["一隻白鷺單腳立在淺水裡，半天一動不動；魚一游近，牠脖子一伸就叼住了。", "你看著牠那份靜，忽然覺得腳底下也穩了些。"]
			var list := Train.trainable("light")
			await ctx.say(lines + (Train._exp_lines(list[0].id, 10, false) if not list.is_empty() else ["（心裡靜了下來）"]))
		"xiaohe":
			await ctx.say([_by("喬小荷").call("給你！我剛剝的菱角，娘說不能白吃人家的，你上回幫我拉過船。"), "……你不記得幫她拉過船。不過菱角很甜。"])
			await ctx.give("water_chestnut", 2)
