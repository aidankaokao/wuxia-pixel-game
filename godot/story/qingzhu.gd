## 青竹村的劇情腳本（照網頁版 story/bandits.ts 搬過來的部分）。
## 用到的旗標：stele 看懂竹林石碑（學會竹影劍）、stranger_talk 跟青衫客說過幾次話、stranger 青衫客走了（斷崖寨支線）、tudi 今天上過香（記日子）、
## q_bandits 斷崖寨的委託（0 未接、1 接了、3 覆命領賞）、met_liu 見過村長、tea 收過鍾嬸的茶、kid_talk 跟小石頭說過幾次話、
## xiaohu_tusk 石小虎想要山豬獠牙（1 接下、2 送了）、smith_intro 石小虎替你在石岳面前說了好話
## （山上的部分在 story/canglan.gd；練功與睡覺在 story/train.gd）

const Festival := preload("res://story/festival.gd")
const Train := preload("res://story/train.gd")
const Chores := preload("res://story/chores.gd")
const Bridge := preload("res://story/bridge.gd")


## 村裡的老井：打水歇歇，花半個時辰。氣血、內力回滿，體力只回四分之一（要練功就得睡覺）
static func well_use(ctx: Ctx) -> void:
	var c := await ctx.ask("一口老井，井水清涼。", ["打水歇歇（半個時辰）", "替鍾嬸的茶寮挑水（雜務）", "算了"])
	if c == 1:
		await Chores.run(ctx, "water", "茶寮的水缸滿滿的。")
		return
	if c != 0:
		return
	ctx.pass_time(4)
	await ctx.work("rest", "打水歇息中……")
	var d := Hero.derive(G.hero)
	G.hero.hp = d.max_hp
	G.hero.qi = d.max_qi
	G.hero.stamina = mini(d.max_stamina, int(G.hero.stamina) + roundi(d.max_stamina * 0.25))
	await ctx.say(["你打起一桶水，掬起一捧喝了，又洗了把臉，在井邊坐著歇了一會兒。", "（氣血、內力完全恢復，體力恢復了一些。歇了半個時辰）"])


## 竹林深處的石碑：要研讀（小遊戲）到一定的體會才看懂竹影劍，見 story/train.gd 的 stele
static func stele_read(ctx: Ctx) -> void:
	await Train.stele(ctx)


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


## 村長柳承安的劇情部分（人物檔案的 story）：接斷崖寨的委託、打完回來覆命。處理了回傳 true，其餘交給一般交談
static func liu_story(ctx: Ctx) -> bool:
	if await Bridge.donation(ctx, "liu"):
		return true
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
		return true
	if q != 0:
		return false
	if not ctx.flag("met_liu"):
		await ctx.say([liu.call("年輕人，看你面生，是頭一回到青竹村吧？"), liu.call("老夫柳承安，忝為本村村長。")])
		ctx.set_flag("met_liu")
	await ctx.say([
		liu.call("唉……不瞞你說，近來北邊蒼嵐山上來了一夥山賊，自稱「斷崖寨」。"),
		liu.call("寨主叫祁三刀，三天兩頭下山搶糧，村裡的年輕人連上山砍柴都不敢了。"),
	])
	if await ctx.ask(liu.call("看少俠背上負劍，想必身手不凡。不知……可願替本村走一趟？"), ["義不容辭", "容我想想"]) == 1:
		await ctx.say(liu.call("不勉強，不勉強。少俠若改變心意，再來找老夫。"))
		return true
	ctx.set_flag("q_bandits", 1)
	await ctx.say([liu.call("好！老夫果然沒看錯人！"), liu.call("這幾帖金創藥你帶著，山上刀劍無眼。")])
	await ctx.give("jinchuang", 3)
	await ctx.say([
		liu.call("還有一事。聽逃回來的樵夫說，祁三刀每回使出殺招之前，總要先高舉大刀蓄勢。"),
		liu.call("見他蓄勢，切莫硬拼——先「防禦」守住了，再找機會反擊。"),
		"（接下委託「蒼嵐山賊」：從村北上山，往斷崖寨去。可在選單「江湖」查看）",
	])
	return true


## 鍾嬸的劇情部分：第一次見面送一碗茶（處理了回傳 true）
static func zhong_story(ctx: Ctx) -> bool:
	if await Festival.zhong(ctx):
		return true
	if await Bridge.donation(ctx, "zhong"):
		return true
	if ctx.flag("tea"):
		return false
	var zhong := _by("鍾嬸")
	await ctx.say([
		zhong.call("客官，來碗竹葉清茶歇歇腳吧！"),
		zhong.call("聽說臨江城的漕幫，最近跟金刀鏢局鬧得很僵，來往的商客都繞道走呢。"),
		zhong.call("看你要出遠門的樣子，這碗茶帶著路上喝。不收錢！"),
	])
	await ctx.give("tea")
	ctx.set_flag("tea")
	return true


## 石小虎收到山豬獠牙（人物檔案的 on_gift；處理了回傳 true）
static func xiaohu_gift(ctx: Ctx) -> bool:
	if ctx.extra.get("item", "") != "boar_tusk" or ctx.flag("xiaohu_tusk") != 1:
		return false
	ctx.set_flag("xiaohu_tusk", 2)
	ctx.set_flag("smith_intro")
	var hu := _by("石小虎")
	await ctx.say([
		hu.call("哇！是山豬獠牙！謝謝{稱}！".replace("{稱}", Social.address(Social.def("xiaohu")))),
		hu.call("我要拿它磨一把匕首……不對，先做木劍的劍柄！"),
		"石小虎抱著獠牙衝出門，過了一會兒，外頭傳來石岳的聲音。",
		{"speaker": "石岳", "text": "……這獠牙成色不錯。是那個外地小子給的？"},
		{"speaker": "石岳", "text": "哼。下回讓他來鋪子裡坐坐。"},
	])
	ctx.fame(3)
	return true


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
