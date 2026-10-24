## 青竹村的劇情腳本（照網頁版 story/bandits.ts 搬過來的部分）。
## 用到的旗標：stele 看過竹林石碑、stranger_talk 跟青衫客說過幾次話、stranger 青衫客走了（斷崖寨支線）、tudi 今天上過香（記日子）、
## q_bandits 斷崖寨的委託（0 未接、1 接了、3 覆命領賞）、met_liu 見過村長、tea 收過鍾嬸的茶、kid_talk 跟小石頭說過幾次話
## （山上的部分在 story/canglan.gd）


## 村裡的老井：打水歇歇，花半個時辰
static func well_use(ctx: Ctx) -> void:
	if await ctx.ask("一口老井，井水清涼。要在井邊歇一會兒嗎？", ["打水歇歇（半個時辰）", "算了"]) != 0:
		return
	ctx.pass_time(4)
	await ctx.work("rest", "打水歇息中……")
	ctx.restore_all()
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
	await ctx.learn("zhuying")
	await ctx.say(["（戰鬥中可以使出「破竹直刺」了，練得深了還能悟出「竹影搖風」）", "你撕下一片衣角，蘸著溪水把碑上的劍痕拓了下來。"])
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


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


## 村長柳承安：接斷崖寨的委託、打完回來覆命；沒有劇情時照平常聊
static func liu_talk(ctx: Ctx) -> void:
	var liu := _by("柳承安")
	var q := ctx.flag("q_bandits")
	if ctx.flag("bandit_boss") and q != 3:
		if q == 0:
			await ctx.say([liu.call("……什麼？斷崖寨的山賊，是你一個人挑了的？"), liu.call("老夫還沒開口相求，少俠便已出手。這份俠義，青竹村記下了！")])
		else:
			await ctx.say([liu.call("你回來了！看你這一身塵土……祁三刀那廝，真被你打跑了？"), liu.call("好！好！果然英雄出少年！")])
		await ctx.say([liu.call("這些銀兩是村裡湊的一點心意，請務必收下。"), liu.call("另外，老夫年輕時也在江湖上走過幾年，有一套「青竹步」的輕身功夫，就傳給你吧。")])
		ctx.silver(50)
		await ctx.learn("qingzhu")
		await ctx.give("manual_qingzhu")
		ctx.fame(15)
		ctx.set_flag("q_bandits", 3)
		await ctx.say([
			liu.call("步法的要訣在「輕」與「變」。多加練習，閃躲刀劍時自有妙用。"),
			liu.call("那本手札是老夫當年的心得。等你把步法練熟了，再翻翻看，或許能更上一層樓。"),
		])
		return
	if q != 0:
		await ctx.chat()
		return
	if not ctx.flag("met_liu"):
		await ctx.say([liu.call("年輕人，看你面生，是頭一回到青竹村吧？"), liu.call("老夫柳承安，忝為本村村長。")])
		ctx.set_flag("met_liu")
	await ctx.say([
		liu.call("唉……不瞞你說，近來北邊蒼嵐山上來了一夥山賊，自稱「斷崖寨」。"),
		liu.call("寨主叫祁三刀，三天兩頭下山搶糧，村裡的年輕人連上山砍柴都不敢了。"),
	])
	if await ctx.ask(liu.call("看少俠背上負劍，想必身手不凡。不知……可願替本村走一趟？"), ["義不容辭", "容我想想"]) == 1:
		await ctx.say(liu.call("不勉強，不勉強。少俠若改變心意，再來找老夫。"))
		return
	ctx.set_flag("q_bandits", 1)
	await ctx.say([liu.call("好！老夫果然沒看錯人！"), liu.call("這幾帖金創藥你帶著，山上刀劍無眼。")])
	await ctx.give("jinchuang", 3)
	await ctx.say([
		liu.call("還有一事。聽逃回來的樵夫說，祁三刀每回使出殺招之前，總要先高舉大刀蓄勢。"),
		liu.call("見他蓄勢，切莫硬拼——先「防禦」守住了，再找機會反擊。"),
		"（接下委託「蒼嵐山賊」：從村北上山，往斷崖寨去。可在選單「江湖事」查看）",
	])


## 鍾嬸：第一次見面送一碗茶；之後照平常（可以買茶）
static func zhong_talk(ctx: Ctx) -> void:
	if ctx.flag("tea"):
		await ctx.chat()
		return
	var zhong := _by("鍾嬸")
	await ctx.say([
		zhong.call("客官，來碗竹葉清茶歇歇腳吧！"),
		zhong.call("聽說臨江城的漕幫，最近跟金刀鏢局鬧得很僵，來往的商客都繞道走呢。"),
		zhong.call("看你要出遠門的樣子，這碗茶帶著路上喝。不收錢！"),
	])
	await ctx.give("tea")
	ctx.set_flag("tea")


static func kid_talk(ctx: Ctx) -> void:
	var kid := _by("小石頭")
	if ctx.flag("bandit_boss"):
		await ctx.say([kid.call("大哥哥！聽說你把山賊打跑了！"), kid.call("教我武功好不好？我也想飛簷走壁！")])
		return
	var n := ctx.flag("kid_talk")
	ctx.set_flag("kid_talk", n + 1)
	if n % 2 == 0:
		await ctx.say([kid.call("大哥哥，你會飛簷走壁嗎？"), kid.call("韓叔叔說，真正的高手踩著竹梢就能飛過整片竹林！")])
	else:
		await ctx.say(kid.call("西邊竹林裡有一塊怪石頭，上面刻著字，可是我看不懂……"))


static func aniu_talk(ctx: Ctx) -> void:
	var a := _by("阿牛")
	if ctx.flag("bandit_boss"):
		await ctx.say([a.call("山賊沒了，今年總算能安心收成了！"), a.call("少俠，等稻子熟了，我送一袋新米到你那兒！")])
		return
	await ctx.say([a.call("今年雨水好，秧苗長得旺。"), a.call("就怕山上的山賊又下來搶糧……唉。")])
