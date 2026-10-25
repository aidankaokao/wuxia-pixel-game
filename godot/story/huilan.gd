## 回瀾刀門（PLAN.md 4.44；地圖 data/huilan.json，房子與屋裡照樣板 town_gen.gd；門規在 Sect.DEFS.huilan）：
## - 潮信北邊海崖上的中派，刀。祖師看潮悟刀：「潮有回瀾，刀有回勢」。潮汐照 story/chaoxin.gd。
## - 收徒：每季頭十天（二、五、八、十一月初一到初十）與八月大潮之後（八月十六到廿五）。大師兄雷震洋主持入門考驗：
##   問心 → 漲潮時站浪樁（看根骨、身法，掉下去就明天再來）→ 試刀（勝過記名弟子林小漁）→ 回瀾堂拜見門主裴驚濤。
## - 門裡：傳功長老洪定潮（教本門武功、正式弟子考核、內門試刀、指點）、執事邱海棠（月例、雜務、收海珠、離開師門）、
##   弟子房（睡覺）、練刀場的木樁、崖下浪樁（漲潮、滿潮經驗多五成；記名弟子漲潮時不得獨自下崖）、崖頂觀潮石（打坐，滿潮時觀潮心法經驗多）、
##   乾潮時礁石間採珠（海珠，執事收一顆換貢獻 15，海商會館收得最高）。
## 用到的旗標：hl_trial 入門考驗（1 問心過了、2 浪樁過了、3 試刀過了）、hl_heart 問心選了第幾個、hl_post_day 浪樁掉下去那天、
##   hl_exam 過了正式弟子考核、hl_inner 過了內門試刀、huilan_left 離開過
## 一天一次的事記在 G.life.daily：hl:chore 補網、hl:patrol 巡海、hl:pearl 採珠、hl:guide 長老指點。

const SECT := "huilan"
const Train := preload("res://story/train.gd")
const Chaoxin := preload("res://story/chaoxin.gd")

const POST_EXP := 30
const WAVE_EXP := 45
const WAVE_STAMINA := 25
const SIT_EXP := 20
const PEARL_STAMINA := 15
const PEARL_CHANCE := 0.35
const PEARL_CONTRIB := 15
const CHORE_CONTRIB := 10
const PATROL_CONTRIB := 20
const GUIDE_EXP := 40


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


## 漲潮或滿潮
static func high_water() -> bool:
	return Chaoxin.tide_state() in ["漲潮", "滿潮"]


## 現在收不收徒
static func recruiting() -> bool:
	var dt := G.date_of()
	var m := int(dt.month) + 1
	var d := int(dt.date)
	return (m in [2, 5, 8, 11] and d <= 10) or (m == 8 and d >= 16 and d <= 25)


# ── 大師兄雷震洋：入門考驗 ──────────────────────────────

static func lei(ctx: Ctx) -> void:
	var ld := _by(_n("hl_lei"))
	if member():
		var c := await ctx.ask(ld.call("練刀的時候別想太多。浪來了，刀就出去。"), ["跟大師兄過招", "閒聊", "不用了"])
		if c == 0:
			await ctx.battle("spar_hl_lei")
		elif c == 1:
			await ctx.say(_lines(_n("hl_lei"), ["八月十八大潮，師父會在浪樁上演一套回瀾刀。那一天，你一定要看。", "東海的黑帆船，搶過咱們漁家子弟的船。本門的規矩：跟海寇有來往的，逐出師門。"]))
		return
	if ctx.flag("huilan_left") > 0:
		await ctx.say(ld.call("離開過師門的人，回瀾不收第二次。"))
		return
	if Sect.member():
		await ctx.say(ld.call("你已經是%s的人了。學武的人，不能腳踏兩條船。" % Sect.def(G.sect.id).name))
		return
	var block := Person.join_block("hero", SECT)
	if block != "":
		await ctx.say(ld.call(block))
		return
	var t := ctx.flag("hl_trial")
	if t == 0:
		await ctx.say([ld.call("回瀾刀門大師兄，雷震洋。"), ld.call("想學刀？本門不是天天收徒。每季頭十天，還有八月大潮之後，才開山門。")])
		if not recruiting():
			await ctx.say(ld.call("現在不收。二、五、八、十一月的初一到初十，或是八月十六到廿五，再來。"))
			return
		var c := await ctx.ask(ld.call("先問你一句：你為什麼想學刀？"), ["想保護海邊的人，不讓黑帆船再欺負漁家", "刀法講究氣勢，我想試試自己的膽量", "練好了刀，走到哪裡都不怕人欺負"])
		ctx.set_flag("hl_heart", c + 1)
		await ctx.say(ld.call(["……好。本門的祖師，也是為了這個才在崖上結廬。", "膽量？浪樁上站一站，就知道你有沒有膽量。", "實在話。刀是用來護身的，記住這一點，就不會走歪。"][c]))
		ctx.set_flag("hl_trial", 1)
		t = 1
	if t == 1:
		await _post_test(ctx, ld)
		return
	if t == 2:
		if await ctx.ask(ld.call("浪樁站穩了。最後一關：試刀。跟記名弟子林小漁過幾招。"), ["請", "等一下"]) != 0:
			return
		var o := await ctx.battle("spar_hl_lin")
		if o != "win":
			await ctx.say(_by(_n("hl_lei")).call("刀還不夠穩。回去練練，明天再來。"))
			return
		ctx.set_flag("hl_trial", 3)
		await ctx.say([_by(_n("hl_lei")).call("好刀！去回瀾堂拜見師父吧。"), "（到回瀾堂拜見門主裴驚濤）"])
		return
	await ctx.say(ld.call("去回瀾堂拜見師父吧，他在等你。"))


## 站浪樁：要漲潮、滿潮；看根骨與身法，掉下去就明天再來
static func _post_test(ctx: Ctx, ld: Callable) -> void:
	if ctx.flag("hl_post_day") == G.day:
		await ctx.say(ld.call("今天掉下去一次了，衣服都還沒乾。明天再來。"))
		return
	if not high_water():
		await ctx.say([ld.call("第二關：站浪樁。崖下的浪樁，要漲潮的時候站上去才算數。"), ld.call("現在是%s。去潮神廟問問，或自己看著海，等潮水漲上來再來找我。" % Chaoxin.tide_state())])
		return
	if await ctx.ask(ld.call("潮漲上來了。跟我下崖，站上浪樁，撐過三個浪頭。"), ["站浪樁", "等一下"]) != 0:
		return
	var a := Hero.attrs(G.hero)
	var chance := clampf(0.35 + (int(a.constitution) + int(a.agility) - 24) * 0.03, 0.2, 0.9)
	if not Hero.find_skill(G.hero, "qingzhu").is_empty() or not Hero.find_skill(G.hero, "tashi").is_empty():
		chance += 0.1
	await ctx.say(["你踩上濕滑的木樁。第一個浪打過來，冰冷的海水淹到膝蓋——", "第二個浪更大，木樁晃了一下——"])
	if randf() < chance:
		ctx.set_flag("hl_trial", 2)
		await ctx.say(["第三個浪迎面撲來，你沉腰坐馬，硬是沒動。", ld.call("好！下盤夠穩。")])
	else:
		ctx.set_flag("hl_post_day", G.day)
		G.hero.stamina = maxi(0, int(G.hero.stamina) - 15)
		await ctx.say(["第三個浪把你整個人掀進了海裡。", ld.call("哈哈，誰第一次不喝幾口海水？明天再來。"), "（體力 −15）"])


static func wei(ctx: Ctx) -> void:
	var w := _by(_n("hl_wei"))
	if member() and await ctx.ask(w.call("要過招嗎？我的刀可不留情。"), ["過招", "不了"]) == 0:
		await ctx.battle("spar_hl_wei")
		return
	await ctx.say(w.call("刀要快，快到浪還沒落下，刀已經回來了。"))


# ── 回瀾堂：門主裴驚濤 ──────────────────────────────────

static func master(ctx: Ctx, h: Dictionary) -> void:
	var pei := _by(h.who)
	if not member() and ctx.flag("hl_trial") == 3 and not Sect.member():
		await ctx.say([pei.call("震洋說你過了三關。"), pei.call(["你說要護著海邊的人。這句話，老夫記下了。", "膽量是好東西。可浪大的時候，退一步也是膽量。", "會護身，才會護人。"][maxi(0, ctx.flag("hl_heart") - 1)]),
			pei.call("本門規矩四條：")])
		await ctx.say("\n".join(Sect.def(SECT).rules.map(func(r): return "・%s：%s" % [r[0], r[1]])))
		if await ctx.ask(pei.call("入了回瀾，就不能再拜入其他門派。你願意嗎？"), ["弟子願意", "容我再想想"]) != 0:
			return
		await ctx.say(["你在祖師牌位前跪下，叩了三個頭。", pei.call("好。從今天起，你是回瀾刀門的記名弟子。")])
		Sect.join(SECT)
		ctx.set_flag("hl_trial", 4)
		await ctx.learn("huilan_dao")
		G.bag["hl_token"] = 1
		await _issue_uniform(ctx, 0)
		await ctx.say([pei.call("觀潮心法，攢了門派貢獻，去傳功堂找洪長老學。月例與雜務，找執事邱海棠。"), "（書本的「門派」頁：身分、貢獻、晉升條件與門規）"])
		return
	if member():
		await ctx.say(_lines(h.who, ["潮有回瀾，刀有回勢。刀砍出去，要想著怎麼收回來。", "收得回來的刀，才砍得了第二刀。"]))
		return
	await ctx.say(_lines(h.who, ["老夫裴驚濤。", "想學刀，找震洋。"]))


## 發這個身分的弟子服：收回舊的（腰牌留著），發新的；那個部位空著或比較差就直接換上
static func _issue_uniform(ctx: Ctx, r: int) -> void:
	var ids: Array = Sect.def(SECT).uniforms[r]
	Sect.take_gear(SECT, ids + ["hl_token"])
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
	if G.bag.has("hl_token") and G.hero.gear.get("neck", "") == "":
		Hero.wear(G.hero, "hl_token")
		out.append("把回瀾腰牌繫在頸上。")
	if out.size() > 0:
		await ctx.say("\n".join(out))


# ── 傳功堂：洪定潮 ──────────────────────────────────────

static func elder(ctx: Ctx, h: Dictionary) -> void:
	var hong := _by(h.who)
	if not member():
		await ctx.say(_lines(h.who, ["傳功堂，閒人莫入。", "……想學刀？找大師兄震洋。"]))
		return
	var opts := ["學本門武功", "請長老指點（一天一次）"]
	var r := rank()
	var checks := Sect.promotion_checks()
	var ready := checks.size() > 0 and checks.slice(0, checks.size() - 1).all(func(c): return c[1])
	if ready and r == 0 and ctx.flag("hl_exam") == 0:
		opts.append("正式弟子考核")
	if ready and r == 1 and ctx.flag("hl_inner") == 0:
		opts.append("內門試刀")
	opts.append("不用了")
	var c := await ctx.ask(hong.call("說吧，什麼事？"), opts)
	match opts[c]:
		"學本門武功":
			await _teach(ctx, hong)
		"請長老指點（一天一次）":
			await _guide(ctx, hong)
		"正式弟子考核":
			await _exam(ctx, hong)
		"內門試刀":
			await _inner(ctx, hong)


static func _teach(ctx: Ctx, hong: Callable) -> void:
	var list: Array = Sect.def(SECT).skills.filter(func(s): return Hero.find_skill(G.hero, s[0]).is_empty())
	if list.is_empty():
		await ctx.say(hong.call("本門的武功，你都學了。往深處練吧。"))
		return
	var labels := list.map(func(s): return "%s（%s起，貢獻 %d）" % [Hero.skill_def(s[0]).name, Sect.def(SECT).ranks[s[1]].name, s[2]])
	var i := await ctx.ask(hong.call("想學哪一門？"), labels + ["算了"])
	if i >= list.size():
		return
	var s: Array = list[i]
	if rank() < int(s[1]):
		await ctx.say(hong.call("這門功夫，%s才能學。" % Sect.def(SECT).ranks[s[1]].name))
		return
	if int(G.sect.contrib) < int(s[2]):
		await ctx.say(hong.call("貢獻不夠。去執事那兒多做些雜務。（要 %d，目前 %d）" % [s[2], int(G.sect.contrib)]))
		return
	G.sect.contrib = int(G.sect.contrib) - int(s[2])
	await ctx.say(hong.call("看好了，我只演一遍。"))
	await ctx.learn(s[0])


static func _guide(ctx: Ctx, hong: Callable) -> void:
	if _once("hl:guide"):
		await ctx.say(hong.call("今天教過了。回去把今天的練熟。"))
		return
	var list := Train.trainable("outer").filter(func(s): return s.id == "huilan_dao") + Train.trainable("inner").filter(func(s): return s.id == "guanchao")
	if list.is_empty():
		await ctx.say(hong.call("回瀾刀法、觀潮心法，裝備著、還沒練到頂，我才好指點。"))
		return
	if not await Train.exert(ctx, 15, "你累得連刀都握不穩了。"):
		return
	_mark("hl:guide")
	ctx.pass_time(4)
	var s: Dictionary = list[0]
	await ctx.say([hong.call("刀砍出去，別急著收。等浪退的那一下——對，就是現在！"), "洪定潮一刀一刀地糾正你的架子。（花了半個時辰）"] + Train._exp_lines(s.id, GUIDE_EXP, false))


static func _exam(ctx: Ctx, hong: Callable) -> void:
	if await ctx.ask(hong.call("正式弟子考核：跟正式弟子郭長纜過招，勝了就升。"), ["應考", "再準備一下"]) != 0:
		return
	var o := await ctx.battle("exam_hl_guo")
	if o != "win":
		await ctx.say(_by(_n("hl_hong")).call("還差一點火候。過幾天再來。"))
		return
	ctx.set_flag("hl_exam")
	Sect.promote()
	await ctx.say([_by(_n("hl_hong")).call("好！從今天起你是回瀾刀門的正式弟子。"), "（成為正式弟子：月例提高，可以向傳功長老學踏浪步，漲潮時可以獨自下崖）"])
	await _issue_uniform(ctx, 1)


static func _inner(ctx: Ctx, hong: Callable) -> void:
	if Chaoxin.tide_state() != "滿潮":
		await ctx.say(hong.call("內門試刀要在滿潮的浪樁上考。現在是%s，等滿潮再來。" % Chaoxin.tide_state()))
		return
	if await ctx.ask(hong.call("滿潮了。下崖，在浪樁上跟你師姊蔚雲舒過招。"), ["應考", "再準備一下"]) != 0:
		return
	var o := await ctx.battle("exam_hl_wei")
	if o != "win":
		await ctx.say(_by(_n("hl_hong")).call("浪一大，你的刀就亂了。再練。"))
		return
	ctx.set_flag("hl_inner")
	Sect.promote()
	await ctx.say([_by(_n("hl_hong")).call("在浪樁上還能勝過雲舒，你的刀有潮的樣子了。"), "（成為內門弟子：月例提高，領到浪紋護腕）"])
	await _issue_uniform(ctx, 2)


# ── 執事房：邱海棠 ──────────────────────────────────────

static func steward(ctx: Ctx, h: Dictionary) -> void:
	var qiu := _by(h.who)
	if not member():
		await ctx.say(qiu.call("執事房管的是門裡的事。外人有事，找大師兄。"))
		return
	var ready := G.day >= Sect.next_stipend()
	var opts := ["領月例" if ready else "領月例（還沒到日子）", "做雜務：補網（一天一次）"]
	if rank() >= 1:
		opts.append("巡海（一天一次）")
	if G.bag.has("pearl"):
		opts.append("交海珠（一顆換貢獻 %d）" % PEARL_CONTRIB)
	opts += ["離開師門", "不用了"]
	var c := await ctx.ask(qiu.call("什麼事？"), opts)
	var k: String = opts[c]
	if k.begins_with("領月例"):
		if not ready:
			await ctx.say(qiu.call("月例每 %d 天領一次，%s再來。" % [Sect.STIPEND_DAYS, G.date_text(Sect.next_stipend())]))
			return
		var pay: Dictionary = Sect.rank_def().stipend
		G.sect.stipend_day = G.day
		G.silver += int(pay.silver)
		for it in pay.items:
			G.bag[it] = int(G.bag.get(it, 0)) + int(pay.items[it])
		await ctx.say(qiu.call("這是%s的月例，%d 兩，還有金創藥。" % [Sect.rank_name(), int(pay.silver)]))
	elif k.begins_with("做雜務"):
		await _chore(ctx, qiu)
	elif k.begins_with("巡海"):
		await _patrol(ctx, qiu)
	elif k.begins_with("交海珠"):
		var n := int(G.bag.pearl)
		G.bag.erase("pearl")
		var t := Sect.add_contrib(PEARL_CONTRIB * n)
		await ctx.say([qiu.call("%d 顆，成色不錯。" % n), "（%s）" % t])
	elif k == "離開師門":
		await _leave(ctx, qiu)


static func _chore(ctx: Ctx, qiu: Callable) -> void:
	if _once("hl:chore"):
		await ctx.say(qiu.call("今天的網補完了，明天再來。"))
		return
	if not await Train.exert(ctx, 15, "手指都磨破了，補不動了。"):
		return
	_mark("hl:chore")
	ctx.pass_time(6)
	await ctx.work("haul", "補網中……")
	await ctx.say(["你跟郭長纜坐在崖頂，把漁家送來的破網一格一格補好。", "（%s）" % Sect.add_contrib(CHORE_CONTRIB)])


## 巡海：沿著崖下礁石走一趟，偶爾碰上黑帆船派上岸探路的人
static func _patrol(ctx: Ctx, qiu: Callable) -> void:
	if _once("hl:patrol"):
		await ctx.say(qiu.call("今天巡過了。"))
		return
	if not await Train.exert(ctx, 20, "你累得腳步虛浮。"):
		return
	_mark("hl:patrol")
	ctx.pass_time(8)
	await ctx.say("你沿著崖下的礁石往北走，一路看著海面。")
	if randf() < 0.4:
		var o := await ctx.battle("hl_scouts")
		if o != "win":
			await ctx.say("那幾個人跳上小船跑了。")
			return
		await ctx.say(["你在礁石間撂倒了幾個鬼鬼祟祟的人，他們腰上都繫著一條黑布。", "（%s）" % Sect.add_contrib(PATROL_CONTRIB + 10)])
		ctx.set_flag("hl_blacksail", ctx.flag("hl_blacksail") + 1)
		return
	await ctx.say(["海面平靜，什麼也沒有。", "（%s）" % Sect.add_contrib(PATROL_CONTRIB)])


static func _leave(ctx: Ctx, qiu: Callable) -> void:
	var r: Array = Sect.rank_def().leave[0]
	if await ctx.ask(qiu.call("要離開師門？%s。離開了，回瀾就不會再收你。" % Sect.leave_text(r)), ["決定離開", "再想想"]) != 0:
		return
	if r[0] == "fine" and not ctx.pay(int(r[1])):
		await ctx.say(qiu.call("罰金 %d 兩，你身上不夠。" % r[1]))
		return
	if r[0] == "trial":
		await ctx.say(qiu.call("真傳弟子要離開，得闖回瀾刀陣。……刀陣還沒擺好，你先別想了。"))
		return
	Sect.leave()
	await ctx.say(["你把腰牌與弟子服交回執事房。", qiu.call("……保重。")])


# ── 弟子房 ──────────────────────────────────────────────

static func dorm(ctx: Ctx, h: Dictionary) -> void:
	if not member():
		await ctx.say(_by(h.who).call("這是弟子房，外人不能睡這兒。"))
		return
	await Train.rest(ctx, "弟子房的通鋪，被子有股海風的鹹味。要躺下睡嗎？")


static func extra(ctx: Ctx, pid: String, h: Dictionary) -> void:
	match pid:
		"hl_guo":
			await ctx.say(_lines(_n("hl_guo"), ["我家在潮信打漁。去年黑帆船搶了我家的船，我爹被砍了一刀，到現在還躺著。", "我上崖學刀，就是要等那條黑帆船再來。"]))


# ── 練刀：練刀場的木樁、崖下浪樁、觀潮石、採珠 ──────────

static func _train_outer(ctx: Ctx, exp_each: int, cost: int, desc: String) -> void:
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var i := 0
	if list.size() > 1:
		i = await ctx.ask("要練哪一門？", list.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level]) + ["算了"])
		if i >= list.size():
			return
	var s: Dictionary = list[i]
	var n := await Train.ask_rounds(ctx, cost, "練", Train.rounds_to_cap(s, exp_each))
	if n == 0 or not await Train.exert(ctx, cost * n, "手臂痠得抬不起來了。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練刀中……")
	await ctx.say([desc + Train.rounds_note("練", n)] + Train._exp_lines(s.id, exp_each * n, false))


static func yard_post(ctx: Ctx) -> void:
	if not member():
		await ctx.say("回瀾刀門練刀場的木樁，上面滿是刀痕。\n（不是門下弟子，不好動人家的木樁）")
		return
	await _train_outer(ctx, POST_EXP, Train.STAMINA.stake, "你對著木樁一刀一刀地砍，海風把刀聲吹得很遠。")


## 崖下浪樁：漲潮、滿潮時經驗多五成，體力也花得多；記名弟子漲潮時不得獨自下崖
static func wave_post(ctx: Ctx) -> void:
	var st := Chaoxin.tide_state()
	var high := st in ["漲潮", "滿潮"]
	if not member():
		await ctx.say("崖下的浪樁，木頭被海水泡得發黑。現在是%s。\n（不是門下弟子，不好動人家的樁）" % st)
		return
	if high and rank() == 0:
		await ctx.say("現在是%s，浪頭一個比一個大。門規：記名弟子漲潮時不得獨自下崖練刀。\n（落潮、乾潮再來，或升了正式弟子）" % st)
		return
	if high:
		await _train_outer(ctx, WAVE_EXP, WAVE_STAMINA, "浪頭一個接一個打上浪樁，你迎著浪出刀，浪退刀收。")
	else:
		await _train_outer(ctx, POST_EXP, Train.STAMINA.stake, "潮水退了，浪樁露在礁石上，跟崖頂的木樁差不多。")


## 崖頂觀潮石：打坐練內功；滿潮時觀潮心法經驗多五成
static func watch_sit(ctx: Ctx) -> void:
	var st := Chaoxin.tide_state()
	var list := Train.trainable("inner")
	if list.is_empty():
		await ctx.say("崖頂的大石頭，正對著海。現在是%s。\n（要裝備著還沒練到上限的內功，才能在這裡打坐）" % st)
		return
	var s: Dictionary = list[0]
	if list.size() > 1:
		var i := await ctx.ask("觀潮石正對著海，現在是%s。要練哪一門？" % st, list.map(func(x): return Hero.skill_def(x.id).name) + ["算了"])
		if i >= list.size():
			return
		s = list[i]
	var gain := roundi(SIT_EXP * (1.0 + Hero.attrs(G.hero).insight / 40.0) * (1.5 if s.id == "guanchao" and st == "滿潮" else 1.0))
	var n := await Train.ask_rounds(ctx, Train.STAMINA.sit, "坐", Train.rounds_to_cap(s, gain))
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.sit * n, "心浮氣躁，坐不住。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("sit", "觀潮中……")
	var d := Hero.derive(G.hero)
	G.hero.qi = d.max_qi
	await ctx.say(["你盤坐在大石上，看著潮水一進一退，呼吸跟著慢了下來。" + Train.rounds_note("坐", n)] + Train._exp_lines(s.id, gain * n, false) + ["（內力回滿）"])


## 採珠：乾潮時礁石露出來，一天一次
static func pearl(ctx: Ctx) -> void:
	var st := Chaoxin.tide_state()
	if st != "乾潮":
		await ctx.say("礁石間的蚌床，現在是%s，都淹在水底。等乾潮再來。" % st)
		return
	if _once("hl:pearl"):
		await ctx.say("今天能撬的蚌都撬過了。")
		return
	if await ctx.ask("乾潮了，礁石間露出一片蚌床。要下去撬蚌採珠嗎？（半個時辰、體力 %d）" % PEARL_STAMINA, ["採珠", "算了"]) != 0:
		return
	if not await Train.exert(ctx, PEARL_STAMINA, "你累得連蚌殼都撬不開。"):
		return
	_mark("hl:pearl")
	ctx.pass_time(4)
	if randf() < PEARL_CHANCE:
		await ctx.say("你撬開十幾個蚌，其中一個裡頭，躺著一顆圓潤的海珠！")
		await ctx.give("pearl")
	else:
		await ctx.say("你撬開十幾個蚌，只撿到一把小蝦。")
		await ctx.give("shrimp", 2)
