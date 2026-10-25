## 白灘（PLAN.md 4.44；地圖 data/baitan.json，房子照樣板 town_gen.gd）：海邊的鹽村，白沙幫總堂。
## - 總堂主杭大海：白沙幫的事（接潮信「一船私鹽」的結果：幫過鹽丁的是自己人，舉發過白沙幫的不准進總堂）、曬鹽的活。
## - 鹽田曬鹽：一天一次，雨雪天曬不了；一個時辰、體力 20，工錢 6 兩（白沙幫的朋友 8 兩）。
## - 夜裡（亥時起）灘外停著一條黑帆船（東海海盜的伏筆）。
## 用到的旗標：bt_gift 杭大海謝過你、bt_blacksail 看過黑帆船；cx_salt（story/chaoxin.gd）
## 一天一次的事記在 G.life.daily：bt:salt 曬鹽。

const Train := preload("res://story/train.gd")

const SALT_STAMINA := 20
const SALT_PAY := 6


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


## 白沙幫把你當自己人嗎（私鹽支線幫過鹽丁）
static func friend() -> bool:
	return int(G.flags.get("cx_salt", 0)) in [4, 8]


static func hall(ctx: Ctx, h: Dictionary) -> void:
	var hang := _by(h.who)
	var s := ctx.flag("cx_salt")
	if s == 9:
		await ctx.say(hang.call("把分堂報給鹽課司的就是你？白灘不歡迎你。出去。"))
		return
	if friend() and ctx.flag("bt_gift") == 0:
		ctx.set_flag("bt_gift")
		await ctx.say([hang.call("四海跟我說了你的事。" + ("你揪出了鹽課司的內鬼，鹽丁們都念著你。" if s == 4 else "那車鹽送到了，一家分了一斗米。")),
			hang.call("白沙幫沒什麼好東西，這點銀子拿著。以後在海邊，報我杭大海的名字。")])
		ctx.silver(30)
		ctx.fame(2)
		return
	var c := await ctx.ask(hang.call("白沙幫總堂，我是杭大海。" if not friend() else "兄弟來了！坐。"), ["問問曬鹽的活", "問白沙幫的事", "問灘外的黑帆船", "不用了"])
	match c:
		0:
			await ctx.say(hang.call("鹽田缺人手。天晴的日子，到田邊的鹽堆那兒找石頭，曬一天給你 %d 兩。" % (SALT_PAY + (2 if friend() else 0))))
		1:
			await ctx.say(_lines(h.who, ["白沙幫說是幫，其實就是一群曬鹽的苦哈哈抱成一團。", "鹽課司一斤收三文，轉手賣三十文。鹽丁不賣點私鹽，一家老小就得餓死。", "潮信的分堂歸四海管，他比我能幹。"]))
		2:
			await ctx.say(_lines(h.who, ["……你也看見了？", "那條船三不五時半夜在灘外停一停，划小船上岸，拿刀槍換鹽、換淡水。", "白沙幫不跟他們做買賣，可也不敢得罪。哪天他們不想換了，直接上岸搶，白灘就完了。"]))


## 鹽田曬鹽（鹽堆那裡）
static func salt_work(ctx: Ctx) -> void:
	if ctx.flag("cx_salt") == 9:
		await ctx.say("鹽丁們看見你，都轉過身去。")
		return
	if G.weather in ["rain", "snow"]:
		await ctx.say("天陰下雨，鹽池裡的鹽都化了。等天晴再來曬。")
		return
	if int(_daily().get("bt:salt", 0)) == G.day:
		await ctx.say("今天的鹽已經耙好了，明天再來。")
		return
	var pay := SALT_PAY + (2 if friend() else 0)
	if await ctx.ask("鹽田邊堆著剛耙起來的鹽。要幫鹽丁們曬一天鹽嗎？（一個時辰、體力 %d，工錢 %d 兩）" % [SALT_STAMINA, pay], ["曬鹽", "算了"]) != 0:
		return
	if not await Train.exert(ctx, SALT_STAMINA, "太陽曬得你頭昏眼花，再曬下去要中暑了。"):
		return
	_daily()["bt:salt"] = G.day
	await ctx.work("farm", "曬鹽中……")
	ctx.pass_time(8)
	G.silver += pay
	var list := Train.trainable("outer")
	await ctx.say(["你挑著海水一擔擔倒進鹽池，再用木耙把結出來的鹽耙成堆。太陽底下，鹽白得刺眼。（花了一個時辰）", "工錢 %d 兩。" % pay] + (Train._exp_lines(list[0].id, 10, false) if not list.is_empty() else []))


## 夜裡灘外的黑帆船
static func black_sail(ctx: Ctx) -> void:
	var first := ctx.flag("bt_blacksail") == 0
	ctx.set_flag("bt_blacksail", ctx.flag("bt_blacksail") + 1)
	await ctx.say(["灘外的黑暗裡停著一條船，帆是黑的，船上一點燈火也沒有。", "隱約看見有人划著小船往岸邊來，又停住了——像是看見了你，掉頭回去了。"] +
		(["（白沙幫的總堂主杭大海也許知道這條船的事）"] if first else []))
