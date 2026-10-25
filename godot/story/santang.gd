## 三塘鎮（PLAN.md 4.48；手工地圖 data/santang.json，店與室內照樣板 town_gen.gd）：府河邊的運河市鎮，三口大塘連著府河。
## - 碼頭卸米（一天一次，米市雜貨的米掌櫃給工錢）；老船頭湯：撐船到塘心撒網（一天一次）、閒聊；三口塘釣魚（pond）。
## - 米市（每天卯時到申時）：糙米、白米；斛手苟四。旬休趕集（巳時到申時）：趕集攤、甘老糖吹糖人、鮑大錘胸口碎大石（打賞、上台比劃）。
## - 支線「大斗小斗」（lt_dou，從菱塘村卞守田那裡接，見 lingtang.gd）：菱塘的米挑到三塘總少兩三斗 → 看苟四量米，斗底是厚的 →
##   找里正鄒秉正借官斗 → 當著鄉親的面比斗，苟四翻臉，打退他與米行打手（gone_st_gou）→ 回菱塘向卞守田覆命。
## 用到的旗標：lt_dou（1 答應卞守田、2 看出斗有問題、3 借到官斗、4 揭穿苟四、5 覆命了）、st_bao_win 勝過鮑大錘、gone_st_gou
## 一天一次的事記在 G.life.daily：st:unload 卸米、st:net 撒網、st:bao 上台比劃、st:bao_tip 打賞。

const Train := preload("res://story/train.gd")
const Town := preload("res://story/town.gd")
const Fishing := preload("res://story/fishing.gd")
const Festival := preload("res://story/festival.gd")

const UNLOAD_PAY := 6
const NET_PRICE := 3
const TIP := 1
const BAO_PRIZE := 10
const RICE := ["rice", "flour", "redbean"]
const FAIR := ["water_chestnut", "duck_egg", "lotus_root", "wuya_tea", "tangren", "g_sachet", "firecracker", "red_lantern", "fish_net"]


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


# ── 米市雜貨：米掌櫃 ────────────────────────────────────

static func goods(ctx: Ctx, h: Dictionary) -> void:
	var mi := _by(h.who)
	if ctx.flag("lt_dou") == 2:
		await ctx.say(_lines(h.who, ["苟四的斗？……唉，你看出來啦。", "那是府城青蚨會米行的斗。鄉下人挑米來，他用大斗收；我們這些鋪子跟米行買，他用小斗賣。兩頭吃。",
			"要治他，得有官斗。官斗在里正鄒老爺那兒收著，就在大街東頭、過了石橋。"]))
	await Town.default_shop(ctx, h)


## 碼頭卸米：一天一次，一個時辰、體力 20，工錢 6 兩，外功經驗 10
static func unload(ctx: Ctx) -> void:
	if _once("st:unload"):
		await ctx.say("今天的漕船卸完了。船工蹲在船頭抽菸，說明天還有一條。")
		return
	if await ctx.ask("碼頭上堆著剛從漕船上搬下來的米袋。米市雜貨的米掌櫃說，搬進米市一袋算一袋的錢。", ["幫忙卸米（一個時辰，%d 兩）" % UNLOAD_PAY, "算了"]) != 0:
		return
	if not await Train.exert(ctx, 20, "你的腰快斷了，再扛一袋就要趴下。"):
		return
	_mark("st:unload")
	ctx.pass_time(8)
	await ctx.work("haul", "卸米中……")
	ctx.silver(UNLOAD_PAY)
	var lines := ["你一袋一袋把米從船上扛到米市，一個時辰下來，肩膀磨得通紅。", "米掌櫃數了 %d 兩給你：「好力氣！明天還來啊。」" % UNLOAD_PAY]
	var list := Train.trainable("outer")
	if not list.is_empty():
		lines += Train._exp_lines(list[0].id, 10, false)
	await ctx.say(lines)


## 米市：每天早上
static func rice(ctx: Ctx) -> void:
	var c := await ctx.ask("米攤上一袋袋糙米、白米敞著口，買米的人抓一把在手裡看成色。", ["買米", "看斛手量米", "算了"])
	if c == 0:
		await ctx.shop("三塘米市", RICE)
	elif c == 1:
		await _watch(ctx)


static func _watch(ctx: Ctx) -> void:
	if ctx.flag("lt_dou") >= 4:
		await ctx.say("米市換了一個年輕的斛手，量米時斗口刮得平平的，賣米的人點頭走了。")
		return
	if ctx.flag("lt_dou") != 1:
		await ctx.say("斛手苟四一斗一斗地量，量得飛快。挑米來賣的鄉下人眼巴巴地看著，一句話也不敢說。")
		return
	ctx.set_flag("lt_dou", 2)
	await ctx.say(["你在米攤邊看了一會兒。苟四收米的時候用左手邊那隻斗，賣米給鋪子的時候，換成右手邊那隻。",
		"兩隻斗看著一樣大。可收米那隻斗的斗沿高出一指，賣米那隻，斗底比平常的厚了一截。",
		"（大斗收、小斗賣。得找一隻官斗來比一比——米市雜貨的米掌櫃或許知道官斗在誰手上）"])


# ── 斛手苟四 ────────────────────────────────────────────

static func gou(ctx: Ctx) -> void:
	var g := _by(_n("st_gou"))
	var t := ctx.flag("lt_dou")
	if t < 3:
		await ctx.say(g.call("賣米？排隊！要買？去鋪子裡買。青蚨會的米行，童叟無欺。" if t < 2 else "看什麼看？沒見過人量米？"))
		return
	await ctx.say(["你把里正的官斗往米攤上一放。四周買米賣米的人都圍了過來。", g.call("……這是幹什麼？")])
	if await ctx.ask("「當著鄉親的面，拿官斗跟你的斗比一比。」", ["比斗", "還是算了"]) != 0:
		return
	await ctx.say(["你拿官斗量了一斗米，倒進苟四收米的那隻斗——斗裡還空著一截。", "人群裡嗡的一聲炸開了。菱塘來的一個老漢直跺腳：「難怪！難怪！」",
		g.call("……好小子，敢砸青蚨會的場子！")])
	var o := await ctx.battle("st_gou")
	if o != "win":
		return
	ctx.take("st_guandou")
	ctx.set_flag("lt_dou", 4)
	ctx.set_flag("gone_st_gou")
	ctx.fame(4)
	ctx.refresh()
	await ctx.say(["苟四和打手爬起來，連斗也不要了，擠出人群跑了。", "鄒里正帶著兩個保甲趕過來，把兩隻黑心斗收走，官斗也收了回去。",
		_by(_n("st_zou")).call("米市往後由鎮上派人量米，用官斗。這口氣，大家忍了好幾年了。"), "（回菱塘村告訴卞村長）"])


# ── 里正鄒秉正 ──────────────────────────────────────────

static func zou(ctx: Ctx) -> void:
	var z := _by(_n("st_zou"))
	var t := ctx.flag("lt_dou")
	if t == 2:
		await ctx.say([z.call("苟四的斗有毛病？……老夫早有耳聞，可沒人肯出來作證。"), z.call("官斗在我這兒。你要拿去當眾比，老夫借你。可話說在前頭——苟四背後是府城的青蚨會。")])
		if await ctx.ask(z.call("這擔子，你挑不挑？"), ["借官斗", "再想想"]) == 0:
			ctx.set_flag("lt_dou", 3)
			await ctx.give("st_guandou")
			await ctx.say(z.call("米市早上才開。去吧，當著鄉親的面比，叫他賴不掉。"))
		return
	if t == 3:
		await ctx.say(z.call("官斗帶著了？米市早上開，苟四就在米攤邊上。"))
		return
	if t >= 4:
		await ctx.say(_lines(_n("st_zou"), ["米市清淨多了。府城那邊青蚨會的人來問過一回，老夫說斗是保甲收的，跟旁人無關。", "你自己倒要當心。青蚨會的人記仇。"]))
		return
	await ctx.say(_lines(_n("st_zou"), ["三塘鎮里正鄒秉正。鎮上戶籍、米市的官斗，都歸老夫管。", "旬休那天趕集，府城、菱塘、白鷺的人都來。熱鬧是熱鬧，就是丟東西的也多。"]))


# ── 老船頭 ──────────────────────────────────────────────

static func chuan(ctx: Ctx) -> void:
	var who := _n("st_chuan")
	var c := await ctx.ask(_by(who).call("要上船？我這條船只在塘裡轉，出府河得找漕幫。"), ["撐船到塘心撒網（%d 兩，一天一次）" % NET_PRICE, "閒聊", "不用了"])
	if c == 1:
		await ctx.say(_lines(who, ["三口塘，上塘養魚，下塘種藕，西塘洗衣裳。都跟府河連著，水是活的。",
			"往年府河發大水，塘就是鎮上的命。水灌進塘裡，鎮子就淹不著。", "漕幫的船在碼頭歇腳。船上的米，一半進府城的官倉，一半……嘿，進了青蚨會的米行。"]))
		return
	if c != 0:
		return
	if _once("st:net"):
		await ctx.say(_by(who).call("今天撒過了。塘裡的魚也要歇口氣。"))
		return
	if not ctx.pay(NET_PRICE):
		await ctx.say(_by(who).call("沒錢？那就在岸上釣吧，一樣有魚。"))
		return
	_mark("st:net")
	ctx.pass_time(4)
	await ctx.work("fish", "撒網中……")
	var fish := "carp" if randf() < 0.5 else "grass_carp"
	var n := 1 + randi() % 3
	await ctx.say("老船頭把船撐到上塘當中，教你怎麼甩網。網撒出去圓圓的一片，收上來 %d 條活蹦亂跳的魚。\n（花了半個時辰）" % n)
	await ctx.give(fish, n)


static func pond(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "pond", "塘水連著府河，是活水。水面上浮著幾片浮萍。")


# ── 旬休趕集 ────────────────────────────────────────────

static func fair(ctx: Ctx) -> void:
	await ctx.say("趕集的攤子一個挨一個：菱塘來的菱角鴨蛋、霧芽來的新茶，還有香包、爆竹、紅燈籠。")
	await ctx.shop("三塘鎮集", FAIR)


static func gan(ctx: Ctx) -> void:
	var g := _by(_n("st_gan"))
	var c := await ctx.ask(g.call("糖人兒！糖人兒！一文錢一隻，要猴子有猴子，要老虎有老虎！"), ["買糖人", "閒聊", "不用了"])
	if c == 0:
		await ctx.shop("甘老糖的糖擔", ["tangren"])
	elif c == 1:
		await ctx.say(_lines(_n("st_gan"), ["老頭子吹了四十年糖人，府城、臨江、白鷺，哪個集沒去過？", "這三塘的集啊，以前更熱鬧。自從青蚨會的米行來了，鄉下人挑米來賣都要吃虧，來的人就少了。"]))


static func bao(ctx: Ctx) -> void:
	var who := _n("st_bao")
	var b := _by(who)
	var c := await ctx.ask(b.call("各位鄉親！走過路過不要錯過！胸口碎大石，看了不白看！"), ["看胸口碎大石（打賞 %d 兩）" % TIP, "上台比劃比劃（一天一次）", "閒聊", "不用了"])
	match c:
		0:
			if _once("st:bao_tip"):
				await ctx.say(b.call("今天的大石頭砸完啦，明天趕早！"))
				return
			if not ctx.pay(TIP):
				return
			_mark("st:bao_tip")
			ctx.pass_time(1)
			Festival._treat(1, 1.1)
			await ctx.say(["鮑大錘躺在兩條板凳中間，胸口壓一塊大青石，他徒弟掄起大錘——轟的一聲，石頭碎成兩半。", "鮑大錘一躍而起，拍拍胸口，一點事也沒有。四周叫好聲響成一片。",
				"（花了一刻；心情愉快：下一場戰鬥武功經驗 ×1.1）"])
		1:
			if _once("st:bao"):
				await ctx.say(b.call("今天比過啦！我這把骨頭，一天只挨一回揍。"))
				return
			_mark("st:bao")
			var o := await ctx.battle("spar_st_bao")
			if o == "win":
				var first := ctx.flag("st_bao_win") == 0
				ctx.set_flag("st_bao_win", ctx.flag("st_bao_win") + 1)
				if first:
					ctx.silver(BAO_PRIZE)
					ctx.fame(1)
				await ctx.say([_by(who).call("好身手！鮑某服了！"), "（四周的鄉親拍手叫好）" + ("\n（鮑大錘塞給你 %d 兩彩頭；名聲 +1）" % BAO_PRIZE if first else "")])
			else:
				await ctx.say(_by(who).call("承讓承讓！你底子不錯，再練練！"))
		2:
			await ctx.say(_lines(who, ["鮑某跑了十幾年碼頭，靠的就是一身硬功。", "說是硬功，其實就是挨打挨多了。哈哈！"]))
