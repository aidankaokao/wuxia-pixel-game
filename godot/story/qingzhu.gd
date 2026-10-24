## 青竹村的劇情腳本（照網頁版 story/bandits.ts 搬過來的部分）。
## 用到的旗標：stele 看過竹林石碑、stranger_talk 跟青衫客說過幾次話、stranger 青衫客走了（斷崖寨支線）、tudi 今天上過香（記日子）


## 村裡的老井：打水歇歇，花半個時辰
static func well_use(ctx: Ctx) -> void:
	if await ctx.ask("一口老井，井水清涼。要在井邊歇一會兒嗎？", ["打水歇歇（半個時辰）", "算了"]) != 0:
		return
	ctx.pass_time(4)
	await ctx.work("rest", "打水歇息中……")
	# 氣血、內力、體力之後接上角色數值
	await ctx.say(["你打起一桶水，掬起一捧喝了，又洗了把臉，在井邊坐著歇了一會兒。", "（氣血、內力、體力完全恢復。歇了半個時辰）"])


## 竹林深處的石碑：第一次看會悟出竹影劍的招式，拓下劍譜
static func stele_read(ctx: Ctx) -> void:
	if ctx.flag("stele"):
		await ctx.say("碑上的劍痕，你已了然於胸。")
		return
	await ctx.say([
		"竹林深處立著一塊長滿青苔的石碑。",
		"碑上刻著八個字，筆畫如劍痕：\n「竹影搖風，劍意自生」",
		"一陣風吹過，滿林竹影搖曳。你望著碑上的劍痕，忽然看出了其中的起落轉折……",
	])
	ctx.learn("zhuying")
	await ctx.say(["（戰鬥中可以使出「破竹式」與「竹影搖風」了）", "你撕下一片衣角，蘸著溪水把碑上的劍痕拓了下來。"])
	await ctx.give("manual_zhuying")
	ctx.set_flag("stele")


## 青衫客：站在村裡望著北方的山，不太理人
static func stranger_talk(ctx: Ctx) -> void:
	var n := ctx.flag("stranger_talk")
	ctx.set_flag("stranger_talk", n + 1)
	var shen := func(t: String) -> Dictionary: return {"speaker": "青衫客", "text": t}
	if n == 0:
		await ctx.say([shen.call("……"), "他瞥了你一眼，又轉頭望向北方的山。", shen.call("這把劍，等了三年。")])
	else:
		await ctx.say(shen.call("少管閒事，對你沒有壞處。"))


## 村口的土地公祠：上一炷香（一天一次，花一刻）
static func tudi_pray(ctx: Ctx) -> void:
	await ctx.say(["村口一座小小的土地公祠，供著一尊石雕的土地公，香爐裡插著幾炷香。", "出遠門的人都會在這裡拜一拜，求一路平安。"])
	if ctx.flag("tudi") == G.day:
		await ctx.say("（今天已經上過香了）")
		return
	if await ctx.ask("要上一炷香嗎？", ["上香（一刻）", "不了"]) != 0:
		return
	ctx.pass_time(1)
	await ctx.work("pray", "上香中……", 1.0)
	ctx.set_flag("tudi", G.day)
	await ctx.say("你點了一炷香，恭恭敬敬拜了三拜。青煙裊裊，好像心裡也踏實了些。")
