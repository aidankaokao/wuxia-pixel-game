## 霧鴉寨（PLAN.md 4.46；地圖 data/wuyazhai.json）：雲嶺西段鴉嶺頂上的山寨，劫往東嶺口的商隊、向石壁村收山稅。
## - 寨門口兩個哨兵 → 寨裡：聚義廳前的寨主聶寒鴉（石壁村出身的東嶺口逃兵）。
## - 在蒼嵐山打敗過祁三刀（bandit_boss）的話，祁三刀逃到這裡投奔結義兄弟聶寒鴉：先打祁三刀，再打寨主；
##   寨子平了以後青衫客沈孤舟現身，把祁三刀押去臨江縣衙（了結三年前沈家鏢的仇，gone_qisandao）。
## - 寨子平了：石壁村的山稅就此了結（sb_tax 改成 4，回村找村長覆命），雲嶺山路、鴉嶺小路上的劫道少很多（road.gd）。寨裡的木箱。
## 用到的旗標：wy_gate 打過哨兵、wy_qi 打敗祁三刀、wy_cleared 打敗聶寒鴉、wy_shen 沈孤舟押走了祁三刀、wy_chest 開過木箱；
##   bandit_boss（蒼嵐山）、sb_tax、sb_cliff（石壁村）

const FAME := 15


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func qi_here() -> bool:
	return int(G.flags.get("bandit_boss", 0)) > 0 and int(G.flags.get("wy_shen", 0)) == 0


static func sentries(ctx: Ctx) -> void:
	var g := _by("霧鴉寨哨兵")
	await ctx.say([g.call("站住！鴉嶺上是霧鴉寨的地界。"), g.call("是來交稅的，還是來送死的？")])
	if await ctx.ask("兩個哨兵抽出了刀。", ["動手", "退回去"]) != 0:
		return
	var o := await ctx.battle("wy_sentries")
	if o != "win":
		return
	ctx.set_flag("wy_gate")
	ctx.refresh()
	await ctx.say("兩個哨兵倒在路邊。往上走，就是霧鴉寨的寨門。")


## 祁三刀：還沒打過就開打，打過了是捆在旗杆下
static func qi(ctx: Ctx) -> void:
	var q := _by("祁三刀")
	if ctx.flag("wy_qi") > 0:
		await ctx.say(["祁三刀被捆在旗杆底下，惡狠狠地瞪著你。", q.call("……要殺要剮，給個痛快！")])
		return
	await ctx.say([q.call("是你！"), q.call("蒼嵐山上那一筆帳，老子還沒跟你算！"), q.call("大哥，這小子交給我！")])
	await _fight_qi(ctx)


static func _fight_qi(ctx: Ctx) -> bool:
	var o := await ctx.battle("wy_qi")
	if o != "win":
		return false
	ctx.set_flag("wy_qi")
	ctx.refresh()
	await ctx.say("祁三刀的刀脫了手，被你一腳踢倒。你拿他自己的腰帶把他捆在了旗杆下。")
	return true


## 寨主聶寒鴉（祁三刀在的話先打祁三刀）
static func nie(ctx: Ctx) -> void:
	var n := _by(Person.full_name("wy_nie"))
	if qi_here() and ctx.flag("wy_qi") == 0:
		await ctx.say([n.call("闖寨的就是你？"), _by("祁三刀").call("大哥，就是這小子！蒼嵐山上的事，就是他幹的！"), n.call("……三弟，你先上。")])
		if not await _fight_qi(ctx):
			return
	var lines := [n.call("霧鴉寨立寨十年，還沒人走到這張椅子前面。")]
	if ctx.flag("sb_cliff") > 0:
		lines += ["「你是石壁村的人。」你說，「石壁上刻著你的名字。」", n.call("……那面石壁上的名字，十個有九個死在東嶺口。剩下那一個，總要活下去。")]
	else:
		lines.append(n.call("你是替石壁村出頭來的？那些人，交一點山稅就能保一輩子平安，你懂什麼。"))
	await ctx.say(lines)
	if await ctx.ask(n.call("拔刀吧。"), ["動手", "退回去"]) != 0:
		return
	var o := await ctx.battle("wy_nie")
	if o != "win":
		return
	ctx.set_flag("wy_cleared")
	var t := ctx.flag("sb_tax")
	if t >= 1 and t <= 3:
		ctx.set_flag("sb_tax", 4)
	ctx.fame(FAME)
	ctx.refresh()
	await ctx.say(["聶寒鴉單膝跪地，刀插在土裡撐著身子。", _by(Person.full_name("wy_nie")).call("……好刀。"),
		"他忽然一翻身滾下後寨的山崖，霧裡傳來一聲烏鴉叫，人就不見了。嘍囉們一鬨而散。", "（霧鴉寨平了。回石壁村告訴岳村長）"])
	if qi_here():
		await ctx.say("寨門口傳來腳步聲。一個青衫人慢慢走了進來。")


## 青衫客沈孤舟：押走祁三刀
static func shen(ctx: Ctx) -> void:
	var s := _by("沈孤舟")
	await ctx.say([s.call("……又讓你搶了先。"), s.call("我從蒼嵐山一路追到雲嶺，追了兩年。"),
		"他走到旗杆下，看著捆在那兒的祁三刀，看了很久。", _by("祁三刀").call("沈家的小子……動手吧。"),
		s.call("殺你，太便宜你了。沈家十一條人命，要在臨江縣衙的大堂上，一條一條算清楚。"),
		"沈孤舟把祁三刀從旗杆上解下來，捆住雙手，牽在馬後。", s.call("這份情，沈某記下了。這是沈家鏢局當年的懸賞，本來就該給拿下他的人。")])
	ctx.set_flag("wy_shen")
	ctx.set_flag("gone_qisandao")
	ctx.silver(50)
	ctx.fame(5)
	ctx.refresh()
	await ctx.say(s.call("後會有期。"))


static func chest(ctx: Ctx) -> void:
	ctx.set_flag("wy_chest")
	ctx.refresh()
	await ctx.say("你撬開聚義廳旁的大木箱，裡頭是搶來的銀子、藥材，還有一匹蓋著織造局朱印的錦緞。")
	ctx.silver(80)
	await ctx.give("jinchuang", 3)
	await ctx.give("g_brocade")


static func lookout(ctx: Ctx) -> void:
	await ctx.say("站在這塊大石頭上，霧散的時候看得見山下的東嶺官道，一條灰白的線往南穿過斷戟原，伸到東嶺口去。" +
		("\n寨子還在的時候，哨兵就是在這兒看商隊的。" if ctx.flag("wy_cleared") > 0 else "\n石頭上有人用刀刻了幾道記號：一道是一隊商隊。"))
