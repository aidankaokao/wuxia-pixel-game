## 石壁村（PLAN.md 4.46；手工地圖 data/shibi.json，店與室內照樣板 town_gen.gd）：雲嶺山腳的獵戶藥農村，靠著一整面大石壁。
## - 村長岳鎮山（岳家）：支線「山稅」；其他照村長家。山貨舖（藺春花）：雜貨之外收獸皮、獸牙、草藥、山菇。
## - 獵戶封老七：跟著上山打獵（一天一次）。藥農岑姑：跟著上山採藥（一天一次）。石壁上的「東嶺戍卒題名」。
## - 支線「山稅」（sb_tax）：霧鴉寨每旬來收山稅 → 村長託你 → 白天村口的兩個收稅嘍囉（替村裡交 20 兩打發，或動手）→
##   打跑了，村長說寨裡會來更多人，只好上霧鴉寨把事情了結（wuyazhai.gd）→ 寨子平了回村覆命：銀兩 60、名聲 8，山貨舖從此八折。
## 用到的旗標：sb_tax（1 答應村長、2 打跑收稅的、3 要上霧鴉寨、4 寨子平了、5 覆命了）、sb_tax_paid 替村裡交稅那天、sb_cliff 看過石壁題名；
##   wy_cleared（霧鴉寨平了，見 wuyazhai.gd）
## 一天一次的事記在 G.life.daily：sb:hunt 打獵、sb:herb 採藥。

const Train := preload("res://story/train.gd")
const Town := preload("res://story/town.gd")

const TAX := 20
const REWARD := 60
const FAME := 8
const BUYS := ["dog_pelt", "boar_tusk", "boar_meat", "herb", "mushroom"]


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


# ── 岳家：村長岳鎮山 ────────────────────────────────────

static func chief(ctx: Ctx, h: Dictionary) -> void:
	var yue := _by(h.who)
	var t := ctx.flag("sb_tax")
	if ctx.flag("wy_cleared") > 0 and t < 5:
		await ctx.say([yue.call("霧鴉寨……平了？"), yue.call("好！好！老頭子活了五十多年，就等這一天。"), yue.call("這是全村湊的一點心意，你別推辭。")])
		ctx.set_flag("sb_tax", 5)
		ctx.silver(REWARD)
		ctx.fame(FAME)
		await ctx.say(yue.call("往後到山貨舖買東西，春花會算你便宜些。"))
		return
	match t:
		0:
			await ctx.say([yue.call("老頭子岳鎮山，石壁村的村長。"), yue.call("村裡窮，就靠打獵採藥過日子。偏偏霧鴉寨那夥人，每旬都下山來收什麼『山稅』。"),
				yue.call("一戶一隻雞、一斗米，交不出來就砸鍋搶人。去年封老七家的閨女……唉。")])
			if await ctx.ask(yue.call("你是練過武的吧？能不能……幫幫我們？"), ["我來想辦法", "這事我管不了"]) == 0:
				ctx.set_flag("sb_tax", 1)
				await ctx.say(yue.call("收稅的人白天都在村口那兒堵著。你……千萬小心。"))
			return
		1:
			await ctx.say(yue.call("收稅的人白天都在村口堵著。"))
		2:
			await ctx.say([yue.call("你把那兩個打跑了？好是好……可他們回去一說，寨裡會來更多人。"), yue.call("霧鴉寨在村西的鴉嶺上，從村口往西走鴉嶺小路就到了。"),
				yue.call("封老七說，寨門口有兩個哨兵，過了哨兵就是寨子。")])
			ctx.set_flag("sb_tax", 3)
			return
		3:
			await ctx.say(yue.call("霧鴉寨在村西的鴉嶺上。你要去的話，先找封老七，他認得路。"))
	await Town.default_shop(ctx, h)


static func goods(ctx: Ctx, h: Dictionary) -> void:
	var lin := _by(h.who)
	var friend := ctx.flag("sb_tax") >= 5
	var c := await ctx.ask(lin.call("要點什麼？山裡的東西我這兒都收。" + ("（你是村裡的恩人，算你八折）" if friend else "")), ["買東西", "賣山貨（獸皮、獸牙、草藥、山菇）", "不用了"])
	if c == 0:
		await ctx.ui.shop(h.name, Town.GOODS.slice(0, 8) + ["mushroom", "herb", "jinchuang", "tea"], 0.5, 0.2 if friend else 0.0)
	elif c == 1:
		await ctx.ui.shop("%s・收山貨" % h.name, [], 0.7, 0.0, BUYS)


# ── 村口收山稅的嘍囉 ────────────────────────────────────

static func taxmen(ctx: Ctx) -> void:
	var g := _by("霧鴉寨嘍囉")
	await ctx.say([g.call("喲，外地來的？霧鴉寨收山稅，這村子歸我們管。"), g.call("你要替他們出頭？")])
	var c := await ctx.ask("兩個嘍囉一左一右擋住了路。", ["替村裡交這一旬的稅（%d 兩）" % TAX, "動手", "走開"])
	if c == 0:
		if not ctx.pay(TAX):
			await ctx.say(g.call("沒錢還充什麼大爺？滾！"))
			return
		ctx.set_flag("sb_tax_paid", G.day)
		ctx.refresh()
		await ctx.say([g.call("識相！"), "兩個嘍囉揣著銀子，大搖大擺地往西去了。"])
		return
	if c != 1:
		return
	var o := await ctx.battle("wy_collectors")
	if o != "win":
		return
	ctx.set_flag("sb_tax", 2)
	ctx.refresh()
	await ctx.say(["兩個嘍囉連滾帶爬地往西逃了，扁擔、麻袋丟了一地。", "（回岳家告訴村長）"])


# ── 獵戶封老七、藥農岑姑、岳小山 ────────────────────────

static func feng(ctx: Ctx) -> void:
	var f := _by(_n("sb_feng"))
	var opts := ["跟著上山打獵（一天一次，一個時辰）", "閒聊", "不用了"]
	var c := await ctx.ask(f.call("要進山？跟緊我，霧裡走散了可沒人找得到你。"), opts)
	if c == 1:
		if ctx.flag("sb_tax") >= 2 and ctx.flag("wy_cleared") == 0:
			await ctx.say(_lines(_n("sb_feng"), ["霧鴉寨在鴉嶺頂上，寨門口兩個哨兵，日夜輪班。", "寨主聶寒鴉是當過兵的，刀法是戰場上學的，不講究招式，只講究要命。小心他蓄勢的那一刀。"]))
		else:
			await ctx.say(_lines(_n("sb_feng"), ["打獵靠的不是箭，是耐性。山豬會在溪邊喝水，狼群會跟著鹿跑。", "村長年輕的時候比我還準。現在眼睛花了，就愛坐在石壁底下曬太陽。"]))
		return
	if c != 0:
		return
	if _once("sb:hunt"):
		await ctx.say(f.call("今天打夠了。山裡的東西，打多了，明年就沒了。"))
		return
	if not await Train.exert(ctx, 20, "你累得連弓都拉不開。"):
		return
	_daily()["sb:hunt"] = G.day
	ctx.pass_time(8)
	await ctx.work("haul", "打獵中……")
	var lines := ["你跟著封老七在霧裡走了一個時辰，踩著他的腳印，一步也不敢走岔。"]
	var r := randf()
	if r < 0.4:
		lines.append("溪邊一頭山豬正低頭喝水。封老七一箭射中牠的前腿，你衝上去把牠撂倒。")
		await ctx.say(lines)
		await ctx.give("boar_meat", 2)
	elif r < 0.8:
		lines.append("封老七在一棵老松下找到一隻掉進陷阱的狐狸，剝下一張好皮給你。")
		await ctx.say(lines)
		await ctx.give("dog_pelt")
	else:
		lines.append("霧太大，什麼也沒打到。封老七說：「山不給，就是山不給。」")
		await ctx.say(lines)
	var list := Train.trainable("light") + Train.trainable("outer")
	if not list.is_empty():
		await ctx.say(Train._exp_lines(list[0].id, 10, false))


static func cen(ctx: Ctx) -> void:
	var cg := _by(_n("sb_cen"))
	var c := await ctx.ask(cg.call("上山採藥？這個時節，背陰的坡上黃精正好。"), ["跟著上山採藥（一天一次，一個時辰）", "問白猿的事", "不用了"])
	if c == 1:
		await ctx.say(_lines(_n("sb_cen"), ["那隻白猿啊，會偷我的乾糧。可有一回我在霧裡迷了路，是牠一路在前頭跳，把我引回山道上的。",
			"牠常往雲門瀑那邊去。瀑布底下……以前好像住過一個人。"]))
		return
	if c != 0:
		return
	if _once("sb:herb"):
		await ctx.say(cg.call("今天採過了。藥要留種，不能採光。"))
		return
	if not await Train.exert(ctx, 15, "你累得腰都直不起來了。"):
		return
	_daily()["sb:herb"] = G.day
	ctx.pass_time(8)
	await ctx.work("farm", "採藥中……")
	await ctx.say("岑姑領著你在山坡上找藥，哪棵是黃精、哪棵是七葉一枝花，一樣一樣指給你看。")
	await ctx.give("herb", 3)
	if randf() < 0.3:
		await ctx.say(cg.call("你運氣好，這叢山菇是今早才冒出來的。"))
		await ctx.give("mushroom", 2)


static func xiaoshan(ctx: Ctx) -> void:
	var xs := _by(_n("sb_xiaoshan"))
	if ctx.flag("wy_cleared") > 0:
		await ctx.say(xs.call("霧鴉寨沒了，我娘說，往後採藥不用繞著鴉嶺走了！"))
		return
	await ctx.say(xs.call("爺爺說，石壁上刻的那些字，是好幾百年前守東嶺口的兵刻的。我一個字也不認得。"))


## 石壁上的「東嶺戍卒題名」
static func cliff(ctx: Ctx) -> void:
	var first := ctx.flag("sb_cliff") == 0
	ctx.set_flag("sb_cliff")
	await ctx.say(["石壁上鑿著一大片字，風吹雨打了幾百年，有些已經看不清了。", "最上面一行大字：「東嶺戍卒題名」。底下密密麻麻幾百個名字，每個名字後頭跟著籍貫。",
		"最底下一行刻得很新，像是這十幾年才補上去的：「聶寒鴉，石壁人。東嶺口戍卒。」"] + (["（霧鴉寨的寨主，原來是石壁村的人）"] if first else []))
