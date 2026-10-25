## 桑林城（PLAN.md 4.45；手工地圖 data/sanglin.json，店與室內照樣板 town_gen.gd）：絲鄉縣城。
## - 織造局（督造柏文淵、管工廖貴）：收上好的織品（八成價）、進局織錦（一天一次，紡織 2 級起）。
## - 染坊（戚長順）：幫工挑布攪缸（一天一次，雨雪天不行）。浣紗溪釣魚（river 釣點）。早上桑市的繭市。
## - 城南桑園：蠶花嫂，二月到五月採桑（一天一次）。
## - 支線「一百匹雲錦」（sl_tribute）：織造局的小姑娘桑小絃說管工廖貴剋扣工錢、偷賣貢緞 →
##   督造柏文淵要憑據 → 戌時以後到織造局後門（東牆），撞見廖貴裝車，打退他，拿到私帳 → 交給柏文淵：廖貴被押走（gone_sl_liao），
##   賞銀 50、名聲 5；小絃送一只香囊；千絲坊的坊主聽說了，進坊的繡活只要做三回（見 qiansi.gd）。
## 用到的旗標：sl_tribute（1 答應小絃、2 柏文淵要憑據、3 拿到私帳、4 了結）、sl_xx_thanks 小絃謝過了、gone_sl_liao 廖貴被押走
## 一天一次的事記在 G.life.daily：sl:weave 進局織錦、sl:dye 染坊幫工、sl:mulberry 採桑。

const Train := preload("res://story/train.gd")
const Fishing := preload("res://story/fishing.gd")

const BUREAU_RATE := 0.8
const WEAVE_STAMINA := 20
const WEAVE_EXP := 25
## 廖貴還在的時候，每回扣的「茶水錢」
const LIAO_CUT := 3
const DYE_PAY := 6
const DYE_EXP := 8
const MULBERRY_PAY := 4
const TRIBUTE_SILVER := 50
const TRIBUTE_FAME := 5


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


static func liao_here() -> bool:
	return Person.alive("sl_liao") and int(G.flags.get("gone_sl_liao", 0)) == 0


# ── 織造局：督造柏文淵 ──────────────────────────────────

static func bureau(ctx: Ctx, h: Dictionary) -> void:
	var bo := _by(h.who)
	var t := ctx.flag("sl_tribute")
	var opts := ["賣織品（八成價）", "進局織錦（一天一次，一個時辰）"]
	if t == 1:
		opts.append("說起廖管工的事")
	if t == 3 and ctx.has("sl_ledger"):
		opts.append("交出廖貴的私帳")
	opts += ["閒聊", "不用了"]
	match opts[await ctx.ask(bo.call("本官奉旨督辦貢緞。有什麼事？"), opts)]:
		"賣織品（八成價）":
			var buys := G.bag.keys().filter(func(id): return String(id).begins_with("w_"))
			if buys.is_empty():
				await ctx.say(bo.call("局裡只收織品。你手上沒有。"))
				return
			await ctx.ui.shop("%s・收織品" % h.name, [], BUREAU_RATE, 0.0, buys)
		"進局織錦（一天一次，一個時辰）":
			await _weave(ctx, bo)
		"說起廖管工的事":
			await ctx.say([bo.call("剋扣工錢？偷賣貢緞？"), bo.call("廖貴在局裡二十年了，上上下下都是他管著。沒憑沒據，本官不能拿人。"),
				bo.call("……你要是拿得出憑據，本官替那些繡娘作主。")])
			ctx.set_flag("sl_tribute", 2)
			await ctx.say("（廖貴偷賣貢緞，總要運出局去。戌時以後，到織造局東牆的後門看看）")
		"交出廖貴的私帳":
			await _close_tribute(ctx, bo)
		"閒聊":
			await ctx.say(_lines(h.who, ["今年要進貢一百匹雲錦，局裡的花樓機日夜不停。", "城東那間千絲繡莊……哼，四十年前從局裡逃出去的繡娘開的。本官也懶得管。"]))


## 進局織錦：要紡織 2 級；工錢照手藝，廖貴還在的時候要被扣茶水錢
static func _weave(ctx: Ctx, bo: Callable) -> void:
	if Crafts.level("weaving") < 2:
		await ctx.say(bo.call("局裡的花樓機，手生的人碰不得。紡織練到 2 級再來。（布莊、千絲繡莊都能練手）"))
		return
	if _once("sl:weave"):
		await ctx.say(bo.call("今天的班排滿了，明天再來。"))
		return
	if not await Train.exert(ctx, WEAVE_STAMINA, "你的手指僵得連梭子都握不住了。"):
		return
	_mark("sl:weave")
	ctx.pass_time(8)
	await ctx.work("weave", "織錦中……")
	var pay := 6 + Crafts.level("weaving")
	var lines := ["你在花樓機前坐了一個時辰。樓上拉花的織工一聲聲喊著號子，雲紋一寸寸織了出來。"]
	if liao_here():
		pay -= LIAO_CUT
		lines.append("%s走過來，從你的工錢裡抽走 %d 兩：「茶水錢。局裡的規矩。」" % [_n("sl_liao"), LIAO_CUT])
	ctx.silver(pay)
	lines.append("（工錢 %d 兩）" % pay)
	var up := Crafts.gain("weaving", WEAVE_EXP)
	if up != "":
		lines.append(up)
	await ctx.say(lines)


static func _close_tribute(ctx: Ctx, bo: Callable) -> void:
	ctx.take("sl_ledger")
	await ctx.say([bo.call("……哪天、幾匹、賣給誰，記得清清楚楚。"), bo.call("來人！把廖貴押進縣衙大牢。局裡扣的工錢，一文不少發還給繡娘。")])
	ctx.set_flag("sl_tribute", 4)
	ctx.set_flag("gone_sl_liao")
	ctx.silver(TRIBUTE_SILVER)
	ctx.fame(TRIBUTE_FAME)
	await ctx.say(bo.call("這是本官的一點心意。"))


static func extra(ctx: Ctx, pid: String, _h: Dictionary) -> void:
	match pid:
		"sl_liao":
			await ctx.say(_lines(_n(pid), ["看什麼看？要做工去織房，別在這兒礙眼。"]))


## 小姑娘桑小絃：支線的起頭與了結
static func xiaoxian(ctx: Ctx) -> void:
	var xx := _by(_n("sl_xiaoxian"))
	match ctx.flag("sl_tribute"):
		0:
			await ctx.say([xx.call("……你是外地來的？"), xx.call("我在織造局織錦。管工廖貴每個月扣我們三成工錢，說是孝敬督造大人的。"),
				xx.call("阿秀姊病了，他也不准歇，說一百匹雲錦織不完，誰都別想回家。"), xx.call("夜裡，我還看見他從後門運布出去……那是貢緞啊。")])
			if await ctx.ask(xx.call("你……你能幫幫我們嗎？"), ["我去問問督造大人", "這事我管不了"]) == 0:
				ctx.set_flag("sl_tribute", 1)
				await ctx.say(xx.call("督造大人在織造局裡。千萬別讓廖貴知道是我說的。"))
		1:
			await ctx.say(xx.call("督造大人在織造局裡……他會管嗎？"))
		2:
			await ctx.say(xx.call("廖貴都是戌時以後，從局裡東牆的後門運布出去。"))
		3:
			await ctx.say(xx.call("帳冊拿到了？快交給督造大人！"))
		4:
			if ctx.flag("sl_xx_thanks") == 0:
				ctx.set_flag("sl_xx_thanks")
				await ctx.say([xx.call("工錢都發回來了！阿秀姊也回家養病了。"), xx.call("這是我自己繡的香囊……你別嫌棄。")])
				await ctx.give("g_sachet")
				return
			await ctx.say(xx.call("局裡現在是督造大人親自管著。雲錦今年一定織得完。"))


## 織造局東牆的後門
static func back_door(ctx: Ctx) -> void:
	if ctx.flag("sl_tribute") == 2 and G.shichen_of() < 10:
		await ctx.say("織造局的後門，門上掛著一把大鎖，門檻上有新的車轍印。\n（戌時以後再來看看）")
		return
	await ctx.say("織造局的後門，門上掛著一把大鎖。")


## 夜裡在後門裝車的廖貴
static func liao_night(ctx: Ctx) -> void:
	await ctx.say(["後門開著一條縫。%s正跟一個打手把一捆捆蓋著黃綾的布往板車上搬。" % _n("sl_liao"), _by(_n("sl_liao")).call("……誰？")])
	var o := await ctx.battle("sl_liao")
	if o != "win":
		await ctx.say("板車吱吱呀呀地跑遠了。明晚再來吧。")
		return
	ctx.set_flag("sl_tribute", 3)
	await ctx.say(["廖貴丟下板車跑了。車上的布捆裡夾著一本帳冊。"])
	await ctx.give("sl_ledger")
	ctx.refresh()


# ── 染坊：戚長順 ────────────────────────────────────────

static func dye(ctx: Ctx, h: Dictionary) -> void:
	var qi := _by(h.who)
	var c := await ctx.ask(qi.call("染布的地方，小心別沾一身。有事？"), ["幫工（一天一次，一個時辰）", "看染好的絲線", "閒聊", "不用了"])
	match c:
		0:
			if G.weather in ["rain", "snow"]:
				await ctx.say(qi.call("下雨天布曬不乾，今天不開缸。"))
				return
			if _once("sl:dye"):
				await ctx.say(qi.call("今天的布都下缸了，明天再來。"))
				return
			if not await Train.exert(ctx, 20, "你累得連布都擰不動了。"):
				return
			_mark("sl:dye")
			ctx.pass_time(8)
			await ctx.work("dye", "挑布、攪缸中……")
			ctx.silver(DYE_PAY)
			var list := Train.trainable("outer")
			await ctx.say(["你把濕淋淋的布一匹匹挑上晾架，再拿長竿攪了半天的靛缸，兩隻手染得跟戚師傅一樣藍。（花了一個時辰）\n（工錢 %d 兩）" % DYE_PAY] +
				(Train._exp_lines(list[0].id, DYE_EXP, false) if not list.is_empty() else []))
		1:
			await ctx.shop("%s・絲線" % h.name, ["cotton_thread", "silk_thread"])
		2:
			await ctx.say(_lines(h.who, ["靛藍要泡七回、曬七回，才染得出「天青」。急不得。", "織造局的貢緞，顏色都是我們這兒染的。局裡的錢……唉，欠了三個月了。"]))


# ── 浣紗溪、桑市、桑園 ──────────────────────────────────

static func stream(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "river", "浣紗溪的水清得看得見底，岸邊的石板上有人在洗絲。")


static func market(ctx: Ctx) -> void:
	await ctx.say("早上的繭市：城外的蠶農挑著竹筐進城，雪白的蠶繭堆得像小山。攤上也賣自家繅的絲。")
	await ctx.shop("桑市・繭市", ["silk_thread", "cotton_thread"])


## 蠶花嫂：二月到五月採桑
static func cansao(ctx: Ctx) -> void:
	var cs := _by(_n("sl_cansao"))
	var m := int(G.date_of().month) + 1
	if m < 2 or m > 5:
		await ctx.say(_lines(_n("sl_cansao"), ["蠶都結繭了。等明年開春，桑葉長出來，又要忙了。", "桑林的絲為什麼好？桑葉好。這片桑園，是我家太公那一輩種下的。"]))
		return
	if _once("sl:mulberry"):
		await ctx.say(cs.call("今天的葉子夠了，蠶吃不了那麼多。明天再來幫忙吧。"))
		return
	if await ctx.ask(cs.call("春蠶正能吃，一天要餵五回葉子。幫我採一筐桑葉？給你 %d 兩。（半個時辰、體力 15）" % MULBERRY_PAY), ["幫忙採桑", "不了"]) != 0:
		return
	if not await Train.exert(ctx, 15, "你累得手都抬不起來了。"):
		return
	_mark("sl:mulberry")
	ctx.pass_time(4)
	await ctx.work("mulberry", "採桑中……")
	ctx.silver(MULBERRY_PAY)
	await ctx.say(["你挎著竹筐在桑樹間穿來穿去，把嫩葉一片片摘下來，不一會兒就裝滿了一筐。", cs.call("手腳真俐落！"), "（工錢 %d 兩）" % MULBERRY_PAY])
