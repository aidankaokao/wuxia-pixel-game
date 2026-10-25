## 潮信城（PLAN.md 4.43；地圖 data/chaoxin.json 手工擺，店、室內、空地照樣板 town_gen.gd 與 story/town.gd）：
## - 潮汐：一天兩次滿潮，每天晚六刻（tide_state、high_tides）；初一、十五是大潮，八月十八最大。潮神廟問得到今天幾時滿潮，
##   之後回瀾刀門漲潮練刀、聽濤洞退潮才進得去都照這裡。
## - 港邊：潮神廟（廟祝溫守潮：上香、求籤、問潮）、海商會館分館（館主曹萬帆：海貨、收海產；海路暫停）、鹽課司（鹽大使饒德厚、書辦葉茂才）、
##   鹽倉、船木作（解長松：營造、看船台）、魚市（卯時到午時：汪大浪、海螺嫂）、棧橋海釣（sea 釣點：海魚、鮮蝦、大黃魚）。
## - 城裡：縣衙（師爺樂明遠、知縣施廷之）、白沙幫分堂（堂主盛四海、幫眾魯小石）。
## - 支線「一船私鹽」：鹽課司要抓私鹽。查下去，是書辦葉茂才夜裡把充公的鹽賣給青蚨會的閻有方；
##   拿到帳冊交給鹽大使最好；也可以直接舉發白沙幫，或幫白沙幫運一車鹽出南門。
## 用到的旗標：
##   cx_salt 一船私鹽：1 鹽大使託你查、2 盛四海說了葉茂才的事、3 在鹽倉拿到帳冊、4 交了帳冊（葉茂才被押走，任務完）、
##           8 幫白沙幫運鹽（任務完）、9 舉發了白沙幫（任務完）
##   cx_salt_thanks 盛四海謝過你了；gone_cx_ye 葉茂才被押走（不再出現）
## 一天一次的事記在 G.life.daily：cx:incense 上香。

const Town := preload("res://story/town.gd")
const Estate := preload("res://story/estate.gd")
const Fishing := preload("res://story/fishing.gd")
const Festival := preload("res://story/festival.gd")

const FORTUNE_PRICE := 1
const TRADER_STOCK := ["g_coral", "g_shark_bracer", "g_sea_hat", "sugar", "fine_silk", "yunwu"]
const SEA_GOODS := ["sea_fish", "shrimp", "seaweed", "huangyu", "dried_fish"]
const FISH_STOCK := ["sea_fish", "shrimp", "seaweed", "huangyu"]
const SALT_REWARD := 60
const INFORM_REWARD := 40
const SMUGGLE_PAY := 40
const FORTUNES := [
	"上上籤：「潮來潮去本無心，退時方見海底金。」——急事緩辦，退一步反而有得。",
	"中籤：「風急莫揚帆，浪平再出港。」——近日少走夜路、少碰水。",
	"上籤：「一葦渡滄海。」——心裡想的那件事，放膽去做。",
	"下籤：「錢在潮頭，人在浪底。」——借來的錢不要碰，青蚨會的更不要。",
	"中籤：「孤嶼有燈，照不見岸。」——有個人一直在等你去找他，可惜他自己不知道。",
]


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


# ── 潮汐 ────────────────────────────────────────────────

## 今天兩次滿潮在第幾刻（一天 96 刻）：每天晚六刻
static func high_tides(day := -1) -> Array:
	var d := G.day if day < 0 else day
	var t0 := (d * 6 + 20) % 48
	return [t0, t0 + 48]


## 現在的潮水：滿潮（離滿潮八刻內）、乾潮（離滿潮二十刻以上）、漲潮、落潮
static func tide_state(day := -1, time := -1) -> String:
	var t := G.time if time < 0 else time
	var hs := high_tides(day)
	var best := 999
	var signed := 0
	for h in hs + [hs[0] + 96, hs[1] - 96]:
		if absi(t - int(h)) < best:
			best = absi(t - int(h))
			signed = t - int(h)
	if best <= 8:
		return "滿潮"
	if best >= 20:
		return "乾潮"
	return "落潮" if signed > 0 else "漲潮"


## 大潮的日子：初一、十五，八月十八最大
static func spring_tide() -> String:
	var dt := G.date_of()
	if int(dt.month) == 8 and int(dt.date) == 18:
		return "今天八月十八，一年裡最大的潮"
	if int(dt.date) in [1, 2, 15, 16]:
		return "這兩天是大潮"
	return ""


static func tide_text() -> String:
	var hs := high_tides()
	var s := "今天%s、%s滿潮，現在是%s。" % [_clock(hs[0]), _clock(hs[1]), tide_state()]
	var sp := spring_tide()
	return s + ("（%s）" % sp if sp != "" else "")


## 第幾刻 → 「卯時三刻」這種說法
static func _clock(t: int) -> String:
	const NAMES := ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"]
	var s := (t % 96) / 8
	var k := t % 8
	return "%s時%s" % [NAMES[s], ["初", "一刻", "二刻", "三刻", "四刻", "五刻", "六刻", "七刻"][k]]


# ── 港邊 ────────────────────────────────────────────────

static func temple(ctx: Ctx, h: Dictionary) -> void:
	var wen := _by(h.who)
	var c := await ctx.ask(wen.call("潮神保佑。施主要上香、求籤，還是問潮？"), ["上香（一天一次）", "求籤（%d 兩）" % FORTUNE_PRICE, "問今天的潮水", "閒聊", "不用了"])
	match c:
		0:
			await incense(ctx)
		1:
			if not ctx.pay(FORTUNE_PRICE):
				await ctx.say(wen.call("香油錢不夠，心誠也可以，下回再來。"))
				return
			await ctx.say(["你搖著籤筒，一支竹籤跳了出來。", wen.call(FORTUNES[(G.day * 3 + randi() % 5) % FORTUNES.size()])])
		2:
			await ctx.say(wen.call(tide_text()))
		3:
			await ctx.say(_lines(h.who, ["潮水跟月亮走。初一、十五大潮，八月十八的潮頭能打上海塘。", "回瀾崖的刀客漲潮時在崖下練刀；聽濤洞要退潮才進得去，潮一來，洞口就沒了。",
				"外海的孤嶼上住著一個人，十幾年沒上岸了。他點的燈，夜裡從這裡看得到。"]))


## 上香（廟前的香爐也接這裡）：一天一次，內力回一些，心情愉快
static func incense(ctx: Ctx) -> void:
	if int(_daily().get("cx:incense", 0)) == G.day:
		await ctx.say("香爐裡你插的那炷香還在燒。")
		return
	if await ctx.ask("潮神廟前的大香爐，香灰堆得像小山。要上一炷香嗎？", ["上香", "算了"]) != 0:
		return
	_daily()["cx:incense"] = G.day
	ctx.pass_time(1)
	var d := Hero.derive(G.hero)
	G.hero.qi = mini(d.max_qi, int(G.hero.qi) + 30)
	Festival._treat(1, 1.1)
	await ctx.say(["你點了一炷香，朝著海的方向拜了三拜。海風把香煙吹得斜斜的。", "（內力 +30；心情愉快：下一場戰鬥武功經驗 ×1.1）"])


static func trader(ctx: Ctx, h: Dictionary) -> void:
	var cao := _by(h.who)
	var c := await ctx.ask(cao.call("海商會館潮信分館。南洋的珊瑚、鯨港的鯊皮，這兒都有。"), ["看看海貨", "賣海產（收得比魚市高）", "問海路", "不用了"])
	match c:
		0:
			await ctx.shop("海商會館・海貨", TRADER_STOCK)
		1:
			await ctx.ui.shop("海商會館・收海產", [], 0.7, 0.0, SEA_GOODS)
		2:
			await ctx.say(_lines(h.who, ["往北是鯨港，往南是霞城，順風的話三五天就到。", "可最近東海出了一夥黑帆船，專搶落單的商船。會館的船都停在港裡，等官府派船護航。",
				"什麼時候開航？等黑帆船的事有個了結吧。"]))


static func shipyard(ctx: Ctx, h: Dictionary) -> void:
	var xie := _by(h.who)
	var c := await ctx.ask(xie.call("船木作，造船也蓋屋。有什麼要做的？"), ["蓋屋、擴建、家具", "看看船台", "不用了"])
	if c == 0:
		await Estate.carpenter(ctx, h.who)
	elif c == 1:
		await ctx.say(_lines(h.who, ["船台上那艘是海商會館訂的三桅船，龍骨用的是雲嶺的老杉木。", "一艘海船從龍骨到下水，少說要半年。", "想要自己的船？等你攢夠了銀子，再來找我。"]))


## 棧橋盡頭的海釣：sea 釣點
static func sea_fish(ctx: Ctx) -> void:
	var st := tide_state()
	await Fishing.fish_at(ctx, "sea", "棧橋盡頭，海浪拍著木樁。現在是%s%s。" % [st, "，海水漲上來，魚也跟著靠岸" if st in ["滿潮", "漲潮"] else "，礁石露出了大半"])


## 魚市（卯時到午時）：買海產、賣漁獲
static func fish_stall(ctx: Ctx) -> void:
	var who := _n(ctx.extra.get("npc", "cx_wang")) if ctx.extra.has("npc") else "汪大浪"
	var say := _by(who)
	var c := await ctx.ask(say.call("今早剛靠岸的！海魚、鮮蝦、大黃魚！自己釣的也收。"), ["買", "賣漁獲", "不用了"])
	if c == 0:
		await ctx.shop("潮信魚市", FISH_STOCK)
	elif c == 1:
		var fish: Array = Crafts.data().fish.map(func(f): return f.id) + ["seaweed", "dried_fish"]
		await ctx.ui.shop("潮信魚市・收漁獲", [], 0.6, 0.0, fish)


# ── 縣衙 ────────────────────────────────────────────────

static func yamen(ctx: Ctx, h: Dictionary) -> void:
	await Town.default_shop(ctx, h)


static func extra(ctx: Ctx, pid: String, h: Dictionary) -> void:
	match pid:
		"cx_shi":
			await ctx.say(_lines(_n("cx_shi"), ["本縣施廷之。", "潮信一半的人靠海吃飯、一半靠鹽吃飯。鹽課司歸朝廷管，鹽幫歸……唉，誰也管不了。",
				"東海的黑帆船要是再不剿，海商會館的人天天來本縣這兒哭。"]))
		"cx_ye":
			if ctx.flag("cx_salt") >= 2:
				await ctx.say(_by(_n("cx_ye")).call("……你、你看我做什麼？帳都在帳上，一筆一筆清清楚楚。"))
			else:
				await ctx.say(_lines(_n("cx_ye"), ["在下葉茂才，鹽課司的書辦。充公的私鹽都歸我記帳。", "鹽大使大人眼裡揉不得沙子，我們底下的人也不好做啊。"]))
		"cx_lu":
			await ctx.say(_lines(_n("cx_lu"), ["我爹也是鹽丁，曬了一輩子鹽，最後咳血死了。", "堂主說，等鹽課司的鹽價降下來，鹽丁就不用拼命了。"]))


# ── 鹽課司與白沙幫：一船私鹽 ────────────────────────────

static func salt(ctx: Ctx, h: Dictionary) -> void:
	var rao := _by(h.who)
	var s := ctx.flag("cx_salt")
	match s:
		0:
			await ctx.say([rao.call("本官饒德厚，潮信鹽課司的鹽大使。"), rao.call("潮信的私鹽，抓了一年，越抓越多。鹽倉裡充公的鹽，堆得比山還高，市面上的私鹽卻一點沒少。"),
				rao.call("一定是有人在背後撐腰。白沙幫脫不了干係。")])
			if await ctx.ask(rao.call("你是外地人，不惹眼。替本官查一查私鹽的來路，查實了，賞銀 %d 兩。" % SALT_REWARD), ["答應去查", "不想管"]) == 0:
				ctx.set_flag("cx_salt", 1)
				await ctx.say([rao.call("好。白沙幫的分堂在城南，靠近南門的後巷。去探探他們的口風。"), "（去城南的白沙幫分堂）"])
		1, 2:
			var opts := ["還在查", "舉發白沙幫分堂（不再查下去）"]
			var c := await ctx.ask(rao.call("查得怎麼樣了？"), opts)
			if c == 1:
				await _inform(ctx, rao)
		3:
			if not ctx.has("cx_ledger"):
				await ctx.say(rao.call("帳冊呢？沒有憑據，本官不能抓人。"))
				return
			ctx.take("cx_ledger")
			ctx.set_flag("cx_salt", 4)
			ctx.set_flag("gone_cx_ye")
			await ctx.say(["你把帳冊交給饒德厚。他一頁一頁翻過去，手越抖越厲害。", rao.call("葉茂才！本官的書辦，竟然把充公的鹽一船一船賣給青蚨會！"),
				rao.call("來人！把葉茂才拿下！"), rao.call("……是本官錯怪了白沙幫。鹽丁的苦處，本官會往上報，鹽價能降一分是一分。"), rao.call("這是賞銀。你辦了一件大事。")])
			ctx.silver(SALT_REWARD)
			ctx.fame(6)
		4:
			await ctx.say(rao.call("葉茂才招了，青蚨會那邊，州衙會去查。鹽課司的鹽倉，本官現在親自管。"))
		8:
			await ctx.say(rao.call("最近私鹽又多了……你那邊查得怎麼樣？算了，本官另找人。"))
		9:
			await ctx.say(rao.call("白沙幫的分堂封了，可私鹽還是沒少……怪事。"))


## 舉發白沙幫：拿賞銀，白沙幫從此恨你
static func _inform(ctx: Ctx, rao: Callable) -> void:
	if await ctx.ask("真的要把白沙幫分堂報給鹽課司嗎？（白沙幫從此不會再理你）", ["舉發", "再想想"]) != 0:
		return
	ctx.set_flag("cx_salt", 9)
	await ctx.say([rao.call("好！本官今晚就派人去封了他們的分堂。"), rao.call("這是賞銀。")])
	ctx.silver(INFORM_REWARD)


static func baisha(ctx: Ctx, h: Dictionary) -> void:
	var sheng := _by(h.who)
	var s := ctx.flag("cx_salt")
	if s == 9:
		await ctx.say(sheng.call("……就是你把我們報給鹽課司的。滾出去，別讓我再看見你。"))
		return
	match s:
		0:
			await ctx.say(_lines(h.who, ["白沙幫潮信分堂，我是盛四海。", "鹽丁曬一個夏天的鹽，換不到一石米。鹽課司一斤收三文，轉手賣三十文。", "我們賣點私鹽，是要讓鹽丁活下去。"]))
		1:
			await ctx.say([sheng.call("鹽課司派你來的吧？我一看就知道。"), sheng.call("我跟你說實話：白沙幫賣的私鹽，一個月不過幾十擔。市面上那麼多私鹽，是從鹽課司自己的鹽倉流出去的。"),
				sheng.call("書辦葉茂才，夜裡在鹽倉後頭，把充公的鹽一船一船賣給青蚨會的閻有方。戌時以後去鹽倉看看，你就知道了。")])
			ctx.set_flag("cx_salt", 2)
			await _offer_smuggle(ctx, sheng)
		2, 3:
			await ctx.say(sheng.call("戌時以後去鹽倉後頭，拿到憑據，交給饒大使。他人是死板，倒不貪。"))
			await _offer_smuggle(ctx, sheng)
		4:
			if ctx.flag("cx_salt_thanks") == 0:
				ctx.set_flag("cx_salt_thanks")
				await ctx.say([sheng.call("葉茂才被押走了，饒大使還派人來說要往上報鹽價的事。"), sheng.call("你是鹽丁的恩人。這點心意，收下。")])
				ctx.silver(20)
				ctx.fame(2)
				return
			await ctx.say(sheng.call("白沙幫的人，見到你就是見到自己人。"))
		8:
			await ctx.say(sheng.call("上回那車鹽，白灘的鹽丁一家分了一斗米。兄弟，謝了。"))


## 幫白沙幫運一車鹽出南門：會碰上巡鹽兵丁
static func _offer_smuggle(ctx: Ctx, sheng: Callable) -> void:
	if await ctx.ask(sheng.call("還有一件事……今晚有一車鹽要出南門，送去白灘換米。兄弟們面孔太熟，你肯不肯替我們押車？酬勞 %d 兩。" % SMUGGLE_PAY), ["替他們押車", "不了"]) != 0:
		return
	await ctx.say(["你推著蓋了草蓆的鹽車，趁著夜色往南門走。", "快到城門的時候，火把亮了。"])
	ctx.pass_time(4)
	var o := await ctx.battle("salt_patrol")
	if o != "win":
		await ctx.say(["鹽車被扣下了。你趁亂逃了出來。", "（押車失敗；可以再找盛四海）"])
		return
	ctx.set_flag("cx_salt", 8)
	await ctx.say(["兵丁們爬起來四散逃了。鹽車出了南門，沿著海塘往白灘去。", sheng.call("好兄弟！這是說好的。")])
	ctx.silver(SMUGGLE_PAY)


## 夜裡鹽倉後頭的葉茂才與閻有方
static func warehouse(ctx: Ctx) -> void:
	await ctx.say(["鹽倉後頭的暗處，葉茂才正打著燈籠點鹽包，閻有方把一包銀子塞進他手裡。", _by(_n("cx_ye")).call("今晚三十包，老規矩……誰？！"), _by(_n("cx_yanyf")).call("嘖，有尾巴。")])
	var o := await ctx.battle("salt_yan")
	if o != "win":
		return
	ctx.set_flag("cx_salt", 3)
	ctx.refresh()
	await ctx.say(["閻有方丟下帳冊跳上小船跑了，葉茂才腿一軟坐在地上。", "你撿起掉在地上的帳冊。"])
	await ctx.give("cx_ledger")
	await ctx.say("（把帳冊交給鹽課司的鹽大使饒德厚）")
