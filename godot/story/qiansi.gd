## 千絲坊（PLAN.md 4.45；桑林城東南的朱牆院落，地圖 data/sanglin.json，房子與屋裡照樣板 town_gen.gd；門規在 Sect.DEFS.qiansi）：
## - 表面是繡坊，暗傳飛針。四十年前坊主殷素蘅從織造局逃出來，開了這間繡莊，暗地裡護著城裡的繡娘織工。以女弟子為主，也收男弟子。
## - 不在明處收徒：在前頭的千絲繡莊跟管事祝錦屏接繡活（一天一次），做滿五回（幫過織造局的繡娘，三回就夠）、紡織練到 2 級，
##   收工時會看見繡娘出針 → 祝管事請你從院牆西邊的側門進後院 → 繡樓見坊主：燭下穿九孔針（看身法、悟性、紡織，穿不過明天再來）
##   → 試針（勝過繡徒苗阿蘿）→ 拜師。年過三十的不收（join_req）。
## - 坊裡：針房甄明瑟（教本門武功、指點、繡手考核、金梭試）、繡莊祝錦屏（月例、繡活、夜巡、收織品、離開師門）、繡娘房（睡覺）、
##   後院的飛針靶（夜裡點燭練，經驗多三成）、大師姊尹若絲（過招）。
## 用到的旗標：qs_work 外人做過幾回繡活、qs_trial 入門（1 坊主要見你、2 穿針過了、3 試針過了、4 拜師了）、qs_heart 看見出針時怎麼做、
##   qs_try_day 穿針沒穿過那天、qs_exam 過了繡手考核、qs_inner 過了金梭試、qiansi_left 離開過；sl_tribute（織造局的支線，見 sanglin.gd）
## 一天一次的事記在 G.life.daily：qs:work 繡活、qs:guide 指點、qs:night 夜巡。

const SECT := "qiansi"
const Train := preload("res://story/train.gd")

## 外人做幾回繡活才看得出門道（幫過織造局的繡娘少一點），紡織要幾級
const WORK_NEED := 5
const WORK_NEED_HELPED := 3
const WEAVE_NEED := 2
const WORK_STAMINA := 15
const WORK_EXP := 20
const WORK_CONTRIB := 10
const TARGET_EXP := 30
const NIGHT_MULT := 1.3
const NIGHT_CONTRIB := 20
const GUIDE_EXP := 40
const GOODS_CONTRIB := {2: 15, 3: 25, 4: 40}
const STOCK := ["g_sachet", "g_headband", "cotton_thread", "silk_thread"]


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


static func member() -> bool:
	return Sect.member(SECT)


static func rank() -> int:
	return int(G.sect.rank) if member() else -1


static func night() -> bool:
	return G.shichen_of() >= 10


static func work_need() -> int:
	return WORK_NEED_HELPED if int(G.flags.get("sl_tribute", 0)) == 4 else WORK_NEED


# ── 千絲繡莊：管事祝錦屏 ────────────────────────────────

static func front(ctx: Ctx, h: Dictionary) -> void:
	var zhu := _by(h.who)
	if member():
		await _steward(ctx, h, zhu)
		return
	var c := await ctx.ask(zhu.call("客官看看繡品？還是來接繡活的？"), ["看繡品", "接繡活（一天一次，一個時辰）", "閒聊", "不用了"])
	match c:
		0:
			await ctx.shop(h.name, STOCK)
		1:
			await _work(ctx, zhu)
		2:
			await ctx.say(_lines(h.who, ["千絲繡莊開了四十年了。城裡人家的嫁衣，十件有六件是我們繡的。", "坊主？坊主年紀大了，不見客。"]))


## 繡活：外人按件計錢、練紡織；門下弟子算門派貢獻，工錢減半
static func _work(ctx: Ctx, zhu: Callable) -> void:
	if _once("qs:work"):
		await ctx.say(zhu.call("今天的活兒派完了，明天請早。"))
		return
	if not await Train.exert(ctx, WORK_STAMINA, "眼睛都花了，針都穿不進去。"):
		return
	_mark("qs:work")
	ctx.pass_time(8)
	await ctx.work("embroider", "繡花中……")
	var lv := Crafts.level("weaving")
	var pay := mini(10, 3 + lv)
	if member():
		pay = maxi(1, pay / 2)
	ctx.silver(pay)
	var lines := ["你在長桌邊坐了一個時辰，繡完一對鴛鴦枕套。%s\n（工錢 %d 兩）" % ["針腳還算勻。" if lv >= 2 else "針腳有點歪，祝管事拆了兩針重繡。", pay]]
	var up := Crafts.gain("weaving", WORK_EXP)
	if up != "":
		lines.append(up)
	if member():
		lines.append("（%s）" % Sect.add_contrib(WORK_CONTRIB))
	await ctx.say(lines)
	if member():
		return
	ctx.set_flag("qs_work", ctx.flag("qs_work") + 1)
	await _maybe_reveal(ctx, zhu)


## 繡活做夠了、手藝也夠了：收工時看見繡娘出針
static func _maybe_reveal(ctx: Ctx, zhu: Callable) -> void:
	if ctx.flag("qs_trial") > 0 or ctx.flag("qiansi_left") > 0 or Sect.member():
		return
	if ctx.flag("qs_work") < work_need() or Crafts.level("weaving") < WEAVE_NEED:
		return
	var miao := _n("qs_miao")
	await ctx.say(["收工的時候，一隻綠頭蒼蠅在你頭上嗡嗡地繞。對面的%s頭也沒抬，手腕一翻——" % miao,
		"嗡嗡聲停了。你抬頭一看，一枚繡花針把蒼蠅釘在三丈外的樑上，針尾還在顫。"])
	var c := await ctx.ask("你……", ["裝作沒看見，低頭繼續收線", "「好準的手！」", "走過去把那枚針拔下來看看"])
	ctx.set_flag("qs_heart", c + 1)
	await ctx.say([["你低頭把線頭一根根收好。%s瞄了你一眼，嘴角動了一下。" % miao, "%s的臉一下子白了，祝管事咳了一聲。" % miao,
		"那枚針比尋常的繡花針長一截、沉一些，針尖磨得發亮。祝管事從你手裡把針拿了回去。"][c],
		zhu.call("……你在這兒做了好些天活，手藝、眼力都不差。"),
		zhu.call("坊主想見你。院牆西邊有道側門，往後你從那兒進後院，到繡樓找她。"),
		zhu.call("今天看見的，別跟外人說。")])
	ctx.set_flag("qs_trial", 1)
	ctx.refresh()


static func _steward(ctx: Ctx, h: Dictionary, zhu: Callable) -> void:
	var ready := G.day >= Sect.next_stipend()
	var opts := ["領月例" if ready else "領月例（還沒到日子）", "接繡活（一天一次，貢獻 %d）" % WORK_CONTRIB]
	if rank() >= 1:
		opts.append("夜巡（一天一次，戌時以後）")
	var goods := _fine_goods()
	if goods.size() > 0:
		opts.append("交上好的織品（換貢獻）")
	opts += ["看繡品", "離開師門", "不用了"]
	var k: String = opts[await ctx.ask(zhu.call("什麼事？"), opts)]
	if k.begins_with("領月例"):
		if not ready:
			await ctx.say(zhu.call("月例每 %d 天領一次，%s再來。" % [Sect.STIPEND_DAYS, G.date_text(Sect.next_stipend())]))
			return
		var pay: Dictionary = Sect.rank_def().stipend
		G.sect.stipend_day = G.day
		G.silver += int(pay.silver)
		for it in pay.items:
			G.bag[it] = int(G.bag.get(it, 0)) + int(pay.items[it])
		await ctx.say(zhu.call("%s的月例，%d 兩，還有金創藥。針線錢另算。" % [Sect.rank_name(), int(pay.silver)]))
	elif k.begins_with("接繡活"):
		await _work(ctx, zhu)
	elif k.begins_with("夜巡"):
		await _night(ctx, zhu)
	elif k.begins_with("交上好的織品"):
		await _hand_in(ctx, zhu, goods)
	elif k == "看繡品":
		await ctx.shop(h.name, STOCK)
	elif k == "離開師門":
		await _leave(ctx, zhu)


## 行囊裡精良以上的織品（w_樣式_品級）
static func _fine_goods() -> Array:
	return G.bag.keys().filter(func(id): return String(id).begins_with("w_") and int(String(id).get_slice("_", String(id).get_slice_count("_") - 1)) >= 2)


static func _hand_in(ctx: Ctx, zhu: Callable, goods: Array) -> void:
	var i := await ctx.ask(zhu.call("坊裡接的嫁衣、屏風，正缺好料子。交哪一件？"), goods.map(func(id): return "%s×%d" % [Ui.item_def(id).name, G.bag[id]]) + ["算了"])
	if i >= goods.size():
		return
	var id: String = goods[i]
	var grade := int(id.get_slice("_", id.get_slice_count("_") - 1))
	ctx.take(id)
	await ctx.say([zhu.call("這針腳……好。"), "（%s）" % Sect.add_contrib(int(GOODS_CONTRIB.get(grade, 15)))])


## 夜巡：戌時以後在城裡的巷子走一趟，偶爾撞上欺負繡娘的地痞
static func _night(ctx: Ctx, zhu: Callable) -> void:
	if not night():
		await ctx.say(zhu.call("夜巡要等天黑，戌時以後再來。"))
		return
	if _once("qs:night"):
		await ctx.say(zhu.call("今晚巡過了，回去歇著吧。"))
		return
	if not await Train.exert(ctx, 20, "你累得腳步虛浮。"):
		return
	_mark("qs:night")
	ctx.pass_time(8)
	await ctx.say("你換上深色的衣裳，沿著織造局後頭的小巷，把收工的繡娘一個個送到家門口。")
	if randf() < 0.45:
		var o := await ctx.battle("qs_night")
		if o != "win":
			await ctx.say("那兩個地痞一溜煙跑了。繡娘倒是沒事。")
			return
		await ctx.say(["兩個地痞捂著手腕跪在地上，手背上各插著一枚細針。", "（%s）" % Sect.add_contrib(NIGHT_CONTRIB + 10)])
		return
	await ctx.say(["一路平安，只有更夫的梆子聲。", "（%s）" % Sect.add_contrib(NIGHT_CONTRIB)])


static func _leave(ctx: Ctx, zhu: Callable) -> void:
	var r: Array = Sect.rank_def().leave[0]
	if await ctx.ask(zhu.call("要離開？%s。走了，坊裡的事一個字都不能往外說，千絲坊也不會再收你。" % Sect.leave_text(r)), ["決定離開", "再想想"]) != 0:
		return
	if r[0] == "fine" and not ctx.pay(int(r[1])):
		await ctx.say(zhu.call("要 %d 兩，你身上不夠。" % r[1]))
		return
	if r[0] == "trial":
		await ctx.say(zhu.call("真傳弟子要走，得闖千絲陣。……陣還沒擺好，你先別想了。"))
		return
	Sect.leave()
	ctx.refresh()
	await ctx.say(["你把繡牌、針囊與衫子交回繡莊。", zhu.call("……保重。")])


static func extra(ctx: Ctx, pid: String, h: Dictionary) -> void:
	match pid:
		"qs_miao":
			if member():
				await ctx.say(_lines(_n(pid), ["師姊說，針要射得準，先要繡得勻。我繡了一冬天的帕子，現在閉著眼都能穿針。"]))
			elif ctx.flag("qs_trial") > 0:
				await ctx.say(_lines(_n(pid), ["那天的蒼蠅……你什麼都沒看見，對吧？"]))
			else:
				await ctx.say(_lines(_n(pid), ["我叫苗阿蘿，在莊裡繡帕子。你要接繡活，找祝管事。"]))
		"qs_du":
			await ctx.say(_lines(_n(pid), ["我原本是織造局的織工。廖管工打斷過我兩根手指，是坊主把我接出來的。", "男人學針，被人笑了三年。不過這三年，再也沒人敢在巷子裡欺負繡娘。"]))


# ── 側門、後院 ──────────────────────────────────────────

static func gate(ctx: Ctx) -> void:
	await ctx.say("繡莊後院的側門，門閂從裡頭閂上了。牆裡隱約傳來「篤、篤」的聲音，像有人往木板上釘東西。")


static func yinr(ctx: Ctx) -> void:
	var y := _by(_n("qs_yinr"))
	if member():
		var c := await ctx.ask(y.call("練針呢？還是想跟我過幾招？"), ["跟大師姊過招", "閒聊", "不用了"])
		if c == 0:
			await ctx.battle("spar_qs_yinr")
		elif c == 1:
			await ctx.say(_lines(_n("qs_yinr"), ["針出手之前，眼睛先要到。眼睛到了，針自己就去了。", "織造局那個廖貴，師父盯了他好幾年。總有一天。"]))
		return
	if ctx.flag("qs_trial") > 0:
		await ctx.say(y.call("師父在繡樓等你。"))
		return
	await ctx.say(y.call("……你怎麼進來的？"))


## 飛針靶：門下弟子練暗器（任何裝備著的外功都能練）；夜裡點燭練，經驗多三成
static func target(ctx: Ctx) -> void:
	if not member():
		await ctx.say("一面草編的圓靶，靶心密密麻麻都是針孔。\n（不是坊裡的人，不好動人家的靶）")
		return
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var s: Dictionary = list[0]
	if list.size() > 1:
		var i := await ctx.ask("要練哪一門？", list.map(func(x): return "%s（第 %d 重）" % [Hero.skill_def(x.id).name, x.level]) + ["算了"])
		if i >= list.size():
			return
		s = list[i]
	var each := roundi(TARGET_EXP * (NIGHT_MULT if night() else 1.0))
	var n := await Train.ask_rounds(ctx, Train.STAMINA.stake, "練", Train.rounds_to_cap(s, each))
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.stake * n, "手腕痠得抬不起來了。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練針中……")
	var desc := "後院點起一排蠟燭，你站在三丈外，一針一針地打燭芯。燭火一盞盞滅了。（夜裡練，經驗多三成）" if night() else "你站在三丈外，一針一針往靶心打。"
	await ctx.say([desc + Train.rounds_note("練", n)] + Train._exp_lines(s.id, each * n, false))


# ── 繡樓：坊主殷素蘅 ────────────────────────────────────

static func master(ctx: Ctx, h: Dictionary) -> void:
	var yin := _by(h.who)
	if member():
		await ctx.say(_lines(h.who, ["四十年前，我也是織造局裡的一個繡娘。十個指頭，被針扎得沒一處好肉。", "後來我想通了：針能繡花，也能護人。"]))
		return
	var t := ctx.flag("qs_trial")
	if t == 0:
		await ctx.say(yin.call("……這裡是繡樓，不見外客。"))
		return
	if Sect.member():
		await ctx.say(yin.call("你已經是%s的人了。千絲坊不收腳踏兩條船的。" % Sect.def(G.sect.id).name))
		return
	var block := Person.join_block("hero", SECT)
	if block != "":
		await ctx.say(yin.call(block))
		return
	if t == 1:
		await ctx.say([yin.call("老身殷素蘅。"), yin.call(["那天你低著頭收線。沉得住氣，是學針的第一件事。", "那天你叫了一聲好。直心腸的人，針也直。", "那天你去拔了那根針。好奇心重……不過，眼力是真的好。"][maxi(0, ctx.flag("qs_heart") - 1)])])
		if ctx.flag("sl_tribute") == 4:
			await ctx.say(yin.call("織造局的廖貴，是你扳倒的吧。我盯了他好幾年，沒想到讓一個外人搶了先。"))
		if G.hero.get("gender", "男") == "男":
			await ctx.say(yin.call("坊裡多是女弟子。男弟子，你是第二個。杜子衡那孩子，你見過了吧。"))
		await ctx.say(yin.call("千絲坊不在明處收徒。要入坊，先過兩關：一是穿針，二是試針。"))
		await _needle_test(ctx, yin)
		return
	if t == 2:
		if await ctx.ask(yin.call("第二關：試針。跟阿蘿過幾招，讓我看看你的手。"), ["請", "等一下"]) != 0:
			return
		var o := await ctx.battle("spar_qs_miao")
		if o != "win":
			await ctx.say(_by(_n("qs_yin")).call("手還不夠快。回去練練，明天再來。"))
			return
		ctx.set_flag("qs_trial", 3)
		t = 3
	if t == 3:
		await _ceremony(ctx)


## 第一關：燭下穿九孔針（看身法、悟性、紡織；穿不過明天再來）
static func _needle_test(ctx: Ctx, yin: Callable) -> void:
	if ctx.flag("qs_try_day") == G.day:
		await ctx.say(yin.call("今天穿過一回了，眼睛累了穿不準。明天再來。"))
		return
	if await ctx.ask(yin.call("第一關：穿針。一口氣，把線穿過這九個針孔。"), ["穿針", "等一下"]) != 0:
		return
	var a := Hero.attrs(G.hero)
	var chance := clampf(0.3 + (int(a.agility) + int(a.insight) - 24) * 0.03 + Crafts.level("weaving") * 0.05, 0.2, 0.9)
	await ctx.say(["殷坊主把九枚繡花針插在一根蠟燭上，一枚比一枚細，針孔排成一條線。", "燭火晃了一下。你屏住氣，捻起線頭——"])
	if randf() < chance:
		ctx.set_flag("qs_trial", 2)
		await ctx.say(["線頭一口氣穿過九個針孔，從最後一枚針後頭冒出來。", yin.call("手穩，心也靜。")])
	else:
		ctx.set_flag("qs_try_day", G.day)
		await ctx.say(["穿到第七個針孔，線頭一偏，戳在針身上。", yin.call("差一點。明天再來。")])


static func _ceremony(ctx: Ctx) -> void:
	var yin := _by(_n("qs_yin"))
	await ctx.say([yin.call("兩關都過了。"), yin.call("千絲坊的規矩四條：")])
	await ctx.say("\n".join(Sect.def(SECT).rules.map(func(r): return "・%s：%s" % [r[0], r[1]])))
	if await ctx.ask(yin.call("入了千絲坊，就不能再拜別的門派，坊裡的事一個字都不能往外說。你願意嗎？"), ["弟子願意", "容我再想想"]) != 0:
		return
	await ctx.say(["繡樓的供桌上沒有牌位，只供著一枚生了鏽的大針。你在供桌前跪下，叩了三個頭。", yin.call("好。從今天起，你是千絲坊的繡徒。")])
	Sect.join(SECT)
	ctx.set_flag("qs_trial", 4)
	await ctx.learn("feizhen")
	G.bag["qs_token"] = 1
	await _issue_uniform(ctx, 0)
	await ctx.say([yin.call("纏絲勁，攢了貢獻去針房找甄師父學。月例、繡活，照舊找祝管事。"), "（書本的「門派」頁：身分、貢獻、晉升條件與門規）"])


## 發這個身分的弟子服：收回舊的（繡牌留著），發新的；那個部位空著或比較差就直接換上
static func _issue_uniform(ctx: Ctx, r: int) -> void:
	var ids: Array = Sect.def(SECT).uniforms[r]
	Sect.take_gear(SECT, ids + ["qs_token"])
	if not G.hero.has("gear"):
		G.hero.gear = {}
	var out := []
	for id in ids:
		if id in G.hero.gear.values():
			continue
		G.bag[id] = int(G.bag.get(id, 0)) + 1
		var g: Dictionary = Ui.item_def(id).gear
		var cur: String = G.hero.gear.get(g.kind, "")
		if cur == "" or int(Ui.item_def(cur).get("gear", {}).get("grade", 0)) < int(g.grade):
			Hero.wear(G.hero, id)
			out.append("領到了「%s」，當場換上。" % Ui.item_def(id).name)
		else:
			out.append("領到了「%s」。（放在行囊裡）" % Ui.item_def(id).name)
	if G.bag.has("qs_token") and G.hero.gear.get("neck", "") == "":
		Hero.wear(G.hero, "qs_token")
		out.append("把千絲繡牌繫在頸上。")
	if out.size() > 0:
		await ctx.say("\n".join(out))


# ── 針房：甄明瑟 ────────────────────────────────────────

static func elder(ctx: Ctx, h: Dictionary) -> void:
	var zhen := _by(h.who)
	if not member():
		await ctx.say(_lines(h.who, ["針房裡只有針線。", "……你是誰帶進來的？"]))
		return
	var opts := ["學本門武功", "請師父指點（一天一次）"]
	var r := rank()
	var checks := Sect.promotion_checks()
	var ready := checks.size() > 0 and checks.slice(0, checks.size() - 1).all(func(c): return c[1])
	if ready and r == 0 and ctx.flag("qs_exam") == 0:
		opts.append("繡手考核")
	if ready and r == 1 and ctx.flag("qs_inner") == 0:
		opts.append("金梭試")
	opts.append("不用了")
	match opts[await ctx.ask(zhen.call("什麼事？"), opts)]:
		"學本門武功":
			await _teach(ctx, zhen)
		"請師父指點（一天一次）":
			await _guide(ctx, zhen)
		"繡手考核":
			await _exam(ctx, zhen)
		"金梭試":
			await _inner(ctx, zhen)


static func _teach(ctx: Ctx, zhen: Callable) -> void:
	var list: Array = Sect.def(SECT).skills.filter(func(s): return Hero.find_skill(G.hero, s[0]).is_empty())
	if list.is_empty():
		await ctx.say(zhen.call("坊裡的功夫，你都學了。往深處練吧。"))
		return
	var labels := list.map(func(s): return "%s（%s起，貢獻 %d）" % [Hero.skill_def(s[0]).name, Sect.def(SECT).ranks[s[1]].name, s[2]])
	var i := await ctx.ask(zhen.call("想學哪一門？"), labels + ["算了"])
	if i >= list.size():
		return
	var s: Array = list[i]
	if rank() < int(s[1]):
		await ctx.say(zhen.call("這門功夫，%s才能學。" % Sect.def(SECT).ranks[s[1]].name))
		return
	if int(G.sect.contrib) < int(s[2]):
		await ctx.say(zhen.call("貢獻不夠。去繡莊多接些活兒。（要 %d，目前 %d）" % [s[2], int(G.sect.contrib)]))
		return
	G.sect.contrib = int(G.sect.contrib) - int(s[2])
	await ctx.say(zhen.call("看好了，我只做一遍。"))
	await ctx.learn(s[0])


static func _guide(ctx: Ctx, zhen: Callable) -> void:
	if _once("qs:guide"):
		await ctx.say(zhen.call("今天教過了。回去把今天的練熟。"))
		return
	var list := Train.trainable("outer").filter(func(s): return s.id == "feizhen") + Train.trainable("inner").filter(func(s): return s.id == "chansi")
	if list.is_empty():
		await ctx.say(zhen.call("飛針手、纏絲勁，裝備著、還沒練到頂，我才好指點。"))
		return
	if not await Train.exert(ctx, 15, "你的手腕抖得連針都拿不穩了。"):
		return
	_mark("qs:guide")
	ctx.pass_time(4)
	var s: Dictionary = list[0]
	await ctx.say([zhen.call("手腕別用力。針是送出去的，不是丟出去的——對。"), "甄明瑟捏著你的手腕，一針一針地糾正。（花了半個時辰）"] + Train._exp_lines(s.id, GUIDE_EXP, false))


static func _exam(ctx: Ctx, zhen: Callable) -> void:
	if await ctx.ask(zhen.call("繡手考核：跟繡手杜子衡過招，勝了就升。"), ["應考", "再準備一下"]) != 0:
		return
	var o := await ctx.battle("exam_qs_du")
	if o != "win":
		await ctx.say(_by(_n("qs_zhen")).call("還差一點。過幾天再來。"))
		return
	ctx.set_flag("qs_exam")
	Sect.promote()
	await ctx.say([_by(_n("qs_zhen")).call("好。從今天起你是千絲坊的繡手。"), "（成為繡手：月例提高，可以學金梭步，祝管事會派你夜巡）"])
	await _issue_uniform(ctx, 1)


static func _inner(ctx: Ctx, zhen: Callable) -> void:
	if not night():
		await ctx.say(zhen.call("金梭試要在夜裡考，後院點燭。戌時以後再來。"))
		return
	if await ctx.ask(zhen.call("後院的燭點上了。跟小棠過招，燭不滅、人不倒，才算過。"), ["應考", "再準備一下"]) != 0:
		return
	var o := await ctx.battle("exam_qs_yu")
	if o != "win":
		await ctx.say(_by(_n("qs_zhen")).call("燭一晃，你的針就亂了。再練。"))
		return
	ctx.set_flag("qs_inner")
	Sect.promote()
	await ctx.say([_by(_n("qs_zhen")).call("在燭影裡還能勝過小棠，你的針有千絲坊的樣子了。"), "（成為金針弟子：月例提高，領到纏絲護腕）"])
	await _issue_uniform(ctx, 2)


# ── 繡娘房 ──────────────────────────────────────────────

static func dorm(ctx: Ctx, h: Dictionary) -> void:
	if not member():
		await ctx.say(_by(h.who).call("這是繡娘們睡的地方，外人不能進來。"))
		return
	await Train.rest(ctx, "繡娘房的通鋪，枕頭裡塞著曬乾的桑葉，有股清香。要躺下睡嗎？")
