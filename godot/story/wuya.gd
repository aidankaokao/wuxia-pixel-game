## 霧芽村（PLAN.md 4.48；手工地圖 data/wuya.json，店與室內照樣板 town_gen.gd）：北嶺南坡的茶村，山坡上一層層的茶壟。
## - 採茶：二月十六到四月底，一天一次（茶青；三月初五以前是明前茶青）。炒茶灶：三份茶青炒成一份茶（第一次談雪芽教你）。
## - 霧芽茶舖（談雪芽）：雜貨之外賣霧芽春茶（明前的時候也賣霧芽明前），收茶青；東家可以跟她簽供貨合約（Biz.SUPPLIERS 的 wy_tea）。
## - 村長茅春山（茅家）：茶村的事、泉霧茶莊每年來收茶。山溪釣魚（river）。
## - 支線「茶山上的生人」（wy_jian）：談小芽說山頂的老茶寮夜裡有火光（或自己到茶寮翻到痕跡）→ 夜裡（戌時以後）茶寮外受傷的書生簡知微 →
##   給他一帖金創藥，聽他說州衙印信的事，他天亮前走了，茶寮裡留下一張字條（學識經驗 20）；或者報給村長，北嶺關的兵把他帶走（賞銀 30）。
## 用到的旗標：wy_jian（1 知道茶寮有人、2 給了藥、3 拿到字條、4 報官了）、wy_jian_day 給藥那天、wy_stove 學過炒茶、gone_wy_jian
## 一天一次的事記在 G.life.daily：wy:pick 採茶。

const Train := preload("res://story/train.gd")
const Town := preload("res://story/town.gd")
const Fishing := preload("res://story/fishing.gd")

const PICK_N := 3
const FRY_NEED := 3
const BOUNTY := 30
const NOTE_EXP := 20
const BUYS := ["tea_leaf", "tea_leaf_mq", "wuya_tea", "wuya_mingqian", "tea", "yunwu", "herb", "mushroom"]


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


## 採茶的季節：二月十六到四月底（G.date_of 的月份從 0 起：二月是 1）
static func season() -> bool:
	var d := G.date_of()
	var m := int(d.month) + 1
	return (m == 2 and int(d.date) >= 16) or m == 3 or m == 4


## 明前：二月十六到三月初五
static func mingqian() -> bool:
	var d := G.date_of()
	var m := int(d.month) + 1
	return (m == 2 and int(d.date) >= 16) or (m == 3 and int(d.date) <= 5)


static func _night() -> bool:
	var s := G.shichen_of()
	return s >= 10 or s <= 1


# ── 茶山 ────────────────────────────────────────────────

## 採茶：一天一次，一個時辰、體力 15，茶青三份
static func pick(ctx: Ctx) -> void:
	if not season():
		var m := int(G.date_of().month) + 1
		await ctx.say("茶樹修剪得圓圓的，" + ("枝頭還沒冒芽。採茶要等二月半。" if m <= 2 else "春茶早採完了，這時節的老葉子只能做粗茶。村裡的人說，明年二月半再來。"))
		return
	if _once("wy:pick"):
		await ctx.say("今天採夠了。茶芽一天一個樣，明天再來，又是一茬新的。")
		return
	if not await Train.exert(ctx, 15, "你的手指頭都掐不動了。"):
		return
	_daily()["wy:pick"] = G.day
	ctx.pass_time(8)
	await ctx.work("mulberry", "採茶中……")
	var mq := mingqian()
	await ctx.say(("清明前的頭春茶，芽頭小得像雀舌。" if mq else "") + "你學著村裡的婦人，用指尖掐下一芽一葉，丟進背後的竹簍。山霧從腳下漫上來，一個時辰下來，竹簍裡鋪了薄薄一層。")
	await ctx.give("tea_leaf_mq" if mq else "tea_leaf", PICK_N)


## 炒茶灶：三份茶青炒成一份茶
static func stove(ctx: Ctx) -> void:
	var tan := _by(_n("wy_tan"))
	var have_mq := ctx.has("tea_leaf_mq", FRY_NEED)
	var have := ctx.has("tea_leaf", FRY_NEED)
	if not have_mq and not have:
		await ctx.say("灶上一口大鐵鍋，鍋底磨得發亮。炒茶要%d份茶青才夠一鍋。" % FRY_NEED)
		return
	if ctx.flag("wy_stove") == 0:
		if not Person.alive("wy_tan"):
			await ctx.say("灶上一口大鐵鍋。你不會炒茶，不敢亂來。")
			return
		await ctx.say([tan.call("要炒茶？來，嫂子教你。"), tan.call("鍋要燒到手掌放在上頭數不到三下。茶青下鍋，手要快，抓起來、抖開、再壓下去，一刻也不能停。"),
			tan.call("火大了焦，火小了青。全憑一雙手。")])
		ctx.set_flag("wy_stove")
	var opts := []
	if have_mq:
		opts.append("炒明前茶（%d 份明前茶青）" % FRY_NEED)
	if have:
		opts.append("炒春茶（%d 份茶青）" % FRY_NEED)
	opts.append("算了")
	var c := await ctx.ask("灶裡的柴火正旺。", opts)
	if c >= opts.size() - 1:
		return
	var mq: bool = have_mq and c == 0
	if not await Train.exert(ctx, 10, "你的手臂抬不起來了。"):
		return
	ctx.take("tea_leaf_mq" if mq else "tea_leaf", FRY_NEED)
	ctx.pass_time(2)
	await ctx.work("cook", "炒茶中……")
	var a := Hero.attrs(G.hero)
	var ok := randf() < 0.55 + int(a.insight) * 0.015 + int(a.agility) * 0.01
	if not ok:
		await ctx.say("你手一慢，鍋裡冒起一股焦味。倒出來一看，茶葉黑了一半。\n（炒焦了。花了兩刻）")
		return
	await ctx.say("茶青在鍋裡一點點捲起來，綠裡透出一層白毫，滿屋子都是茶香。\n（花了兩刻）")
	await ctx.give("wuya_mingqian" if mq else "wuya_tea")


static func stream(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "river", "北嶺上流下來的山溪，水冰得刺手，石頭縫裡有魚影。")


# ── 霧芽茶舖：談雪芽 ────────────────────────────────────

static func teashop(ctx: Ctx, h: Dictionary) -> void:
	if await load("res://story/managers.gd").offer(ctx, "wy_tea"):
		return
	var tan := _by(h.who)
	var stock := ["wuya_tea", "tea"] + (["wuya_mingqian"] if mingqian() else []) + Town.GOODS.slice(0, 6) + ["jinchuang"]
	var c := await ctx.ask(tan.call("喝茶還是買茶？我們霧芽的茶，泡三道還是香的。"), ["買東西", "賣茶青、茶葉", "問泉霧茶莊的事", "不用了"])
	match c:
		0:
			await ctx.shop(h.name, stock)
		1:
			await ctx.ui.shop("%s・收茶" % h.name, [], 0.7, 0.0, BUYS)
		2:
			await ctx.say(_lines(h.who, ["臨江城的泉霧茶莊？每年清明前，梁掌櫃都親自上山，明前茶有多少收多少。", "說是鳴泉山上的茶不夠賣，掺著我們霧芽的一起賣。噓，這話別說出去。"]))


# ── 茅家：村長茅春山 ────────────────────────────────────

static func chief(ctx: Ctx, h: Dictionary) -> void:
	var mao := _by(h.who)
	if ctx.flag("wy_jian") == 1 or ctx.flag("wy_jian") == 2:
		var c := await ctx.ask(mao.call("你臉色不對，有事？"), ["說茶寮裡躲著一個人", "沒事"])
		if c == 0:
			await _report(ctx, h.who)
			return
	await Town.default_shop(ctx, h)


static func _report(ctx: Ctx, who: String) -> void:
	var mao := _by(who)
	await ctx.say([mao.call("……茶寮裡有人？受了傷？"), mao.call("北嶺關的兵前幾天來過，說在抓一個從府城跑出來的書生。八成就是他。"),
		mao.call("老頭子這就叫長根去關上報信。你別再上去了，免得惹禍上身。")])
	ctx.set_flag("wy_jian", 4)
	ctx.set_flag("gone_wy_jian")
	ctx.silver(BOUNTY)
	ctx.refresh()
	await ctx.say(["第二天一早，北嶺關來了四個兵，從茶寮裡架出一個書生，綁上了馬。", "巡檢司託村長送來 %d 兩賞銀。書生被押走的時候，回頭看了村子一眼。" % BOUNTY])


# ── 談小芽 ──────────────────────────────────────────────

static func xiaoya(ctx: Ctx) -> void:
	var x := _by(_n("wy_xiaoya"))
	var j := ctx.flag("wy_jian")
	if j == 0:
		await ctx.say([x.call("跟你說個秘密……山頂上的老茶寮，這幾天晚上都有火光。"), x.call("我放在那兒的茶果子也不見了。娘說是山魈，叫我不許上去。"),
			"（老茶寮在茶山頂上。晚上去看看？）"])
		ctx.set_flag("wy_jian")
		return
	if j == 4:
		await ctx.say(x.call("兵爺爺把一個人從茶寮裡抓走了。他好可憐，腿上都是血。"))
		return
	if j >= 2:
		await ctx.say(x.call("茶寮裡的火光不見了。那個……是山魈嗎？"))
		return
	await ctx.say(x.call("採茶要掐一芽一葉，兩葉就老了。這是娘教我的！"))


# ── 山頂的老茶寮 ────────────────────────────────────────

static func hut(ctx: Ctx) -> void:
	var j := ctx.flag("wy_jian")
	if j == 2 and ctx.flag("wy_jian_day") != G.day:
		ctx.set_flag("wy_jian", 3)
		await ctx.say(["茶寮裡空了。地上的稻草還留著一個人躺過的印子，火堆早就冷了。", "門板上用茶枝壓著一張字條。"])
		await ctx.give("wy_note")
		var up := Crafts.gain("learning", NOTE_EXP)
		await ctx.say(["字是極工整的小楷：「印在人在，印失人亡。大恩不言謝，他日府城再會。——簡」", "（學識經驗 +%d）%s" % [NOTE_EXP, "\n" + up if up != "" else ""]])
		return
	if j >= 3:
		await ctx.say("茶寮裡空蕩蕩的，只有採茶時節才有人上來歇腳。")
		return
	if _night():
		if j == 0:
			ctx.set_flag("wy_jian")
			ctx.refresh()
		await ctx.say("茶寮門口有人影晃了一下。")
		return
	await ctx.say(["茶寮裡一堆稻草，角落裡熄了的火堆還有一點餘溫。稻草上沾著幾點乾了的血。", "火堆邊扔著半個茶果子——是小孩子才吃的那種。"] + (["（有人躲在這裡。夜裡再來看看）"] if j == 0 else ["（夜裡再來看看）"]))
	if j == 0:
		ctx.set_flag("wy_jian")


static func jian(ctx: Ctx) -> void:
	var who := _n("wy_jian")
	var s := _by(who)
	if ctx.flag("wy_jian") == 2:
		await ctx.say(s.call("多謝你的藥。天亮以前我就走，不會連累村裡的人。"))
		return
	await ctx.say(["茶寮外的石頭上坐著一個書生，腿上纏著撕下來的衣襟，血滲了出來。他一見你，抓起一根木棍。", s.call("……你是北嶺關派來的？")])
	var c := await ctx.ask("書生握著木棍的手在發抖。", ["「我只是路過。你傷得不輕。」", "「跟我去北嶺關。」", "轉身走開"])
	if c == 1:
		await ctx.say([s.call("……也罷。"), "書生扔下木棍，苦笑了一聲：「我不怪你。你去叫人吧，我走不動了。」", "（去茅家告訴村長）"])
		return
	if c != 0:
		return
	if not ctx.has("jinchuang"):
		await ctx.say([s.call("路過……那就請你當沒看見我。"), "（他的傷口需要金創藥。身上沒有，得去買一帖）"])
		return
	if await ctx.ask("給他一帖金創藥？", ["給他", "算了"]) != 0:
		return
	ctx.take("jinchuang")
	ctx.set_flag("wy_jian", 2)
	ctx.set_flag("wy_jian_day", G.day)
	await ctx.say(_lines(who, ["……多謝。在下簡知微，煙州州衙的書辦，管的是印信底冊。", "州衙的大印，有人夜裡私下拿去蓋了不該蓋的東西。我在底冊上記了一筆，第二天就有人要我的命。",
		"我說不出是誰，說了你也活不成。只能先躲著，等一個能說話的時候。", "天亮以前我就走。你救我一命，這份情我記著。"]))
	if ctx.flag("yz_berth") >= 2:
		await ctx.say("（私用知州的印……跟府河泊位那張沒登記的執照，是同一回事？）")
