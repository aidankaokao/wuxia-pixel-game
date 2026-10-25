## 雲嶺山道（PLAN.md 4.46；地圖 data/yunling.json）：江南渡過江以後進山的路，半路有座半山亭，往西到石壁村、往東南進雲門瀑。
## - 半山亭的竇婆婆：喝茶、吃點東西、借宿、打聽山裡的事。
## - 路邊的草藥（每一株一天採一次）、山狼與山豬（撞上就開打）、猿啼崖上的白猿（雲門瀑的伏筆）。
## 用到的旗標：yl_ape 看見白猿幾次
## 一天一次的事記在 G.life.daily：yl:herb:<x>,<y> 那株草藥採過了。

const Train := preload("res://story/train.gd")

const TEA_PRICE := 1
const BED_PRICE := 3
const MENU := ["baifan", "yangchun", "hongdou", "mushroom", "tea", "yunwu"]
const TALK := [
	["這山裡的霧，早上起、中午散，太陽一偏西又起來了。客官要趕路，趁中午。"],
	["往西去是石壁村，村裡的人都是獵戶、藥農，老實人。就是霧鴉寨那夥人，三天兩頭去收山稅。"],
	["往東南走，聽得見水聲的地方就是雲門瀑。瀑布底下有塊大石頭，以前常有練武的人去那兒坐著。"],
	["猿啼崖上那隻白猿，老婆子看了四十年了，還是那一隻。你說怪不怪？"],
]


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func pavilion(ctx: Ctx) -> void:
	await ctx.say("半山亭，四根木柱撐著一片茅草頂，亭裡兩條長凳被人坐得發亮。亭柱上刻滿了過路人的名字。\n（找竇婆婆喝茶、借宿）")


## 半山亭的竇婆婆
static func dou(ctx: Ctx) -> void:
	var who := Person.full_name("yl_dou")
	var by := _by(who)
	var c := await ctx.ask(by.call("走累了吧？坐下歇歇腳。"), ["喝碗茶（%d 兩，歇一刻）" % TEA_PRICE, "吃點東西", "借宿（%d 兩）" % BED_PRICE, "打聽山裡的事", "不用了"])
	match c:
		0:
			if not ctx.pay(TEA_PRICE):
				await ctx.say(by.call("沒錢？那喝碗白水吧，不收錢。"))
				return
			ctx.pass_time(1)
			var d := Hero.derive(G.hero)
			G.hero.qi = mini(d.max_qi, int(G.hero.qi) + 20)
			G.hero.stamina = mini(d.max_stamina, int(G.hero.get("stamina", 0)) + 15)
			await ctx.say("竇婆婆端來一碗雲霧茶，茶湯清得像山泉，喝下去一身的汗都收了。\n（花了一刻。內力 +20、體力 +15）")
		1:
			await ctx.ui.shop("半山亭", MENU, 0.5)
		2:
			if not ctx.pay(BED_PRICE):
				await ctx.say(by.call("借宿要 %d 兩。……算了算了，凳子上將就一晚也行，不過被子沒有。" % BED_PRICE))
				return
			await ctx.say(by.call("亭子後頭有間小屋，被褥是前天才曬的。"))
			await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？")
		3:
			await ctx.say(TALK[G.day % TALK.size()].map(func(t): return by.call(t)))


## 路邊的草藥：每一株一天採一次
static func herb(ctx: Ctx) -> void:
	var p: Dictionary = ctx.extra.get("prop", {})
	var key := "yl:herb:%d,%d" % [int(p.get("x", 0)), int(p.get("y", 0))]
	if int(_daily().get(key, 0)) == G.day:
		await ctx.say("這株剛採過，留著根，過些日子又會長出來。")
		return
	if not await Train.exert(ctx, 5, "你累得蹲都蹲不下去了。"):
		return
	_daily()[key] = G.day
	ctx.pass_time(1)
	if randf() < 0.25:
		await ctx.say("草藥旁邊的腐木上長著一叢山菇。你一併採了下來。")
		await ctx.give("mushroom")
	await ctx.say("你撥開濕漉漉的草叢，連根挖起一株草藥。")
	await ctx.give("herb", 1 + randi() % 2)


## 猿啼崖上的白猿（雲門瀑的伏筆）
static func ape(ctx: Ctx) -> void:
	var n := ctx.flag("yl_ape") + 1
	ctx.set_flag("yl_ape", n)
	if n == 1:
		await ctx.say(["崖邊的大石頭上，蹲著一隻通身雪白的猿猴，正歪著頭看你。", "你往前走了一步，牠一縱身，沒進了霧裡。"])
	elif n < 3:
		await ctx.say("大石頭上空空的。霧裡遠遠傳來一聲猿啼。")
	else:
		await ctx.say(["白猿又蹲在那塊大石頭上。這一回牠沒跑，只是朝東南方指了指，又看了看你。", "東南方……是雲門瀑的方向。"])
