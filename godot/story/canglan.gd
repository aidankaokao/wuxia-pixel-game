## 蒼嵐山道（照網頁版 story/bandits.ts）：山道上的斷崖寨嘍囉、山頂的祁三刀、寨裡的木箱、青衫客現身。
## 用到的旗標：bandit_scouts 擊退了山道上的嘍囉、bandit_boss 擊敗祁三刀、stranger 青衫客（沈孤舟）走了、chest_camp 開過寨裡的木箱
## （接委託、覆命在 story/qingzhu.gd 的 liu_talk）


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


## 山道上攔路的兩個嘍囉（踩到那一排，或對著他們按空白鍵）
static func scouts(ctx: Ctx) -> void:
	var grunt := _by("斷崖寨嘍囉")
	await ctx.say([grunt.call("站住！此路是我開，此樹是我栽——"), grunt.call("要從此路過，留下買路財！")])
	if await ctx.ask("兩個嘍囉抽出了刀。", ["動手", "退後"]) == 1:
		await ctx.say(grunt.call("哼，算你識相！"))
		await ctx.walk("player", ["down"])
		return
	var r := await ctx.battle("scouts")
	if r == "win":
		ctx.set_flag("bandit_scouts")
		ctx.refresh()
		await ctx.say("嘍囉們抱頭鼠竄，往山上逃去了。")
		ctx.fame(5)
	elif r == "flee":
		await ctx.walk("player", ["down"])


## 闖進斷崖寨：跟祁三刀打一場；打贏了青衫客現身
static func boss(ctx: Ctx) -> void:
	var qi := _by("祁三刀")
	var lines := [qi.call("哪來的毛頭小子，敢闖我斷崖寨？")]
	if ctx.flag("bandit_scouts"):
		lines.append(qi.call("山道上那兩個廢物，就是被你打跑的吧？"))
	lines.append(qi.call("也好！老子這三把刀，正愁沒處見血！"))
	await ctx.say(lines)
	var r := await ctx.battle("camp")
	if r != "win":
		if r == "flee":
			await ctx.walk("player", ["down", "down"])
		return
	ctx.set_flag("bandit_boss")
	await ctx.say([qi.call("好……好小子……"), qi.call("這筆帳，斷崖寨記下了！")])
	ctx.refresh()
	await ctx.say("祁三刀摀著傷口，帶著手下從寨後的小路逃進了深山。")
	ctx.fame(20)
	# 青衫客現身
	var shen := _by("青衫客")
	await ctx.wait(0.4)
	await ctx.walk("shen", ["up"])
	ctx.face_each_other("shen")
	await ctx.say([
		shen.call("……身手不錯。"),
		shen.call("三年前，祁三刀在臨江城外劫了我家的鏢，押鏢的十一個兄弟，一個也沒活下來。"),
		shen.call("我在山下等了他三年，沒想到讓你搶了先。"),
		"他望向祁三刀逃走的方向，沉默了片刻。",
		shen.call("也罷。他既然逃了，總有再碰頭的一天。"),
		shen.call("在下沈孤舟。後會有期。"),
	])
	await ctx.walk("shen", ["down", "down", "down"])
	ctx.set_flag("stranger")
	ctx.refresh()
	await ctx.say("（回青竹村向村長柳承安覆命吧）")


## 寨裡的木箱
static func chest(ctx: Ctx) -> void:
	if ctx.flag("chest_camp"):
		await ctx.say("箱子裡已經空了。")
		return
	ctx.set_flag("chest_camp")
	ctx.refresh()
	await ctx.say("你打開了山賊的木箱。")
	ctx.silver(30)
	await ctx.give("jinchuang", 2)
