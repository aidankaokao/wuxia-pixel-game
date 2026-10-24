## 大埠頭（照網頁版 story/dabutou.ts）：大江入海口的港口小城（州圖上的 dabutou）。
## - 望潮客棧（掌櫃潘海生、老闆娘潘大娘）：住店、點菜；潘大娘教海鮮料理（收銀兩）
## - 魚市：碼頭邊的攤子，卯時到申時賣海魚、鮮蝦、海帶
## - 海商會館（駱千帆）：海外來的飾品
## - 船行（凌萬川）：搭船走大江水路回臨江城；出海往東海諸島（還沒開放）。臨江城漕幫分舵也能搭船過來（story/linjiang.gd）
## - 海神祠（梅婆婆）：上香求籤，一天一次；上籤以上接下來幾場戰鬥武功經驗加成
## - 觀潮台：每月十五到十八大潮（白天），看潮有所領悟（一個月一次）
## - 漁家（龐老大）：幫忙收網，順帶練輕功
## - 漕幫總舵：大門緊閉（之後的伏筆）
## 用到的旗標：bp_tide 上次觀大潮是第幾個月（年 × 12 + 月）；bp_shrine 求過籤那天

const Train := preload("res://story/train.gd")
const Cook := preload("res://story/cook.gd")

const INN_PRICE := 6
## 潘大娘教海鮮料理的學費（入門、中等、進階、拿手）
const SEA_DISH_COST := [10, 25, 50, 80]
const INN_MENU := ["haidai", "yuzhou", "xiahun", "yuwan"]
const FISH_STOCK := ["sea_fish", "shrimp", "seaweed"]
const TRADER_STOCK := ["g_coral", "g_shark_bracer", "g_sea_hat", "yunwu", "fine_silk"]
## 大江水路：船錢、花的時間（比走州圖快）；靠岸的碼頭
const RIVER_PRICE := 15
const RIVER_KE := 8
const LANDING := {"linjiang": {"x": 15, "y": 60, "facing": "up"}, "dabutou": {"x": 22, "y": 27, "facing": "up"}}
const NET_STAMINA := 20
const NET_PAY := 5


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _pay(ctx: Ctx, n: int, who: String) -> bool:
	if ctx.pay(n):
		return true
	await ctx.say(_by(who).call("這得 %d 兩，你身上不夠呢。" % n))
	return false


# ── 望潮客棧 ────────────────────────────────────────────

static func inn_talk(ctx: Ctx) -> void:
	var pan := _by("潘海生")
	var c := await ctx.ask(pan.call("客官，打尖還是住店？夜裡聽著潮聲睡，保準睡得香。"), ["住店（%d 兩）" % INN_PRICE, "點菜", "不用了"])
	if c == 0:
		if not await _pay(ctx, INN_PRICE, "潘海生"):
			return
		await ctx.say(pan.call("樓上靠海那間，推開窗就是海。"))
		await Train.rest(ctx, "窗外傳來一陣陣浪聲，海鳥在桅杆上叫個不停。要睡到天亮，還是歇幾個時辰？")
	elif c == 1:
		await ctx.shop("望潮客棧・菜單", INN_MENU)


static func cook_talk(ctx: Ctx) -> void:
	var ma := _by("潘大娘")
	var c := await ctx.ask(ma.call("想學做海鮮？我們海邊人家的手藝，不藏私——學費照收就是了。"), ["學做菜", "閒聊", "不用了"])
	if c == 1:
		await ctx.say([ma.call("海魚要趁新鮮，早上靠岸的最好，過了中午就不鮮了。"), ma.call("鮮蝦餛飩的皮要擀得透光，蝦仁要整隻包進去，咬下去才有味。")])
	elif c == 0:
		await Cook.teach(ctx, "潘大娘", func(d): return d.get("sea", false), SEA_DISH_COST,
			"想學哪一道？", "我會的都教給你啦！湖裡的魚，得去問碧漪湖的喬嫂。", "在灶台做；海魚、鮮蝦、海帶到碼頭的魚市買")


# ── 魚市 ────────────────────────────────────────────────

static func _fish_stall(ctx: Ctx, vendor: String, line: String) -> void:
	var s := G.shichen_of()
	if s < 3 or s > 8:
		await ctx.say(["魚市收攤了，只剩一股魚腥味。", "（魚市卯時到申時開，早上的貨最新鮮）"])
		return
	await ctx.say(_by(vendor).call(line))
	await ctx.shop("大埠頭魚市", FISH_STOCK)


static func stall_zhong(ctx: Ctx) -> void:
	await _fish_stall(ctx, "鍾小螺", "今早剛靠岸的海魚！蝦子還在跳呢！")


static func stall_lang(ctx: Ctx) -> void:
	await _fish_stall(ctx, "龐小浪", "海帶、鮮蝦，都是我爹船上撈的！")


# ── 海商會館 ────────────────────────────────────────────

static func trader_talk(ctx: Ctx) -> void:
	var luo := _by("駱千帆")
	var c := await ctx.ask(luo.call("在下駱千帆，跑南洋的海商。這些都是船上帶回來的好東西，看看？"), ["看看", "閒聊", "不用了"])
	if c == 0:
		await ctx.shop("海商會館", TRADER_STOCK)
	elif c == 1:
		await ctx.say([luo.call("東海上這兩年不太平，聽說有一夥海盜，專劫往來的商船。"), luo.call("船行說要等官府派兵船護航才肯出海……等到那時候，我的貨都要發霉囉。")])


# ── 船行：大江水路 ──────────────────────────────────────

## 搭船走水路到另一頭（臨江城漕幫分舵與大埠頭船行共用）
static func river_boat(ctx: Ctx, to: String, who: String) -> void:
	var name := "臨江城" if to == "linjiang" else "大埠頭"
	if await ctx.ask(_by(who).call("搭船走大江水路到%s？%d 兩，順風的話一個時辰就到。" % [name, RIVER_PRICE]), ["上船", "不用了"]) != 0:
		return
	if not await _pay(ctx, RIVER_PRICE, who):
		return
	ctx.pass_time(RIVER_KE)
	await ctx.say(["帆鼓滿了風，船順著大江走。兩岸的蘆葦一叢叢往後退，江鷗在船尾盤旋。", "（坐了一個時辰的船，到了%s的碼頭）" % name])
	ctx.warp(to, LANDING[to])


static func ship_talk(ctx: Ctx) -> void:
	var ling := _by("凌萬川")
	var c := await ctx.ask(ling.call("船行凌萬川。走江，走海，都找我。"), ["搭船回臨江城（大江水路）", "出海往東海諸島", "不用了"])
	if c == 0:
		await river_boat(ctx, "linjiang", "凌萬川")
	elif c == 1:
		await ctx.say([ling.call("出海？最近不行。"), ling.call("東海上鬧海盜，上個月才有一條商船回不來。船行的規矩，等官府的兵船來了，才結伴出海。"), "（東海諸島還沒開放）"])


# ── 海神祠：求籤 ────────────────────────────────────────

## [籤名, 籤詩, 接下來幾場戰鬥, 武功經驗倍數]
const FORTUNES := [
	["上上籤", "「潮平兩岸闊，風正一帆懸。」——諸事順遂，出手必有所得。", 5, 1.2],
	["上籤", "「千帆過盡處，一葉自從容。」——不爭先，反而走得遠。", 3, 1.1],
	["中籤", "「浪來莫慌張，潮退自分明。」——事情急不得，等一等就看清楚了。", 0, 1.0],
	["中籤", "「海闊憑魚躍。」——天地大得很，別把自己困住了。", 0, 1.0],
	["下籤", "「月黑風高夜，行船莫近礁。」——近日小心，別逞強。", 0, 1.0],
]


static func shrine_talk(ctx: Ctx) -> void:
	var mei := _by("梅婆婆")
	var done := ctx.flag("bp_shrine") == G.day
	if await ctx.ask(mei.call("海神娘娘保佑出海的人平平安安。要上炷香、求支籤嗎？香油錢一兩。"), ["求籤（今天求過了）" if done else "上香求籤（1 兩）", "不用了"]) != 0:
		return
	if done:
		await ctx.say(mei.call("一天求一支就夠了，求多了，娘娘也嫌煩呢。"))
		return
	if not await _pay(ctx, 1, "梅婆婆"):
		return
	ctx.set_flag("bp_shrine", G.day)
	var f: Array = FORTUNES[randi() % FORTUNES.size()]
	await ctx.say(["你上了香，搖動籤筒，「喀啦」一聲掉出一支籤。", mei.call("是%s。" % f[0]), mei.call(f[1])])
	if int(f[2]) > 0:
		G.hero.rested = {"battles": f[2], "mult": f[3]}
		await ctx.say("（心裡踏實多了。接下來 %d 場戰鬥，武功經驗 ×%s）" % [f[2], f[3]])


# ── 觀潮台：每月十五到十八大潮 ──────────────────────────

static func tide_watch(ctx: Ctx) -> void:
	var d := G.date_of()
	var month_key := int(d.year) * 12 + int(d.month)
	var s := G.shichen_of()
	if int(d.date) < 15 or int(d.date) > 18 or s < 3 or s > 9:
		await ctx.say(["觀潮台。台邊的石碑刻著：「每月十五至十八，海潮最盛」。", "今天的潮水平平穩穩，一波接著一波。"])
		return
	if ctx.flag("bp_tide") == month_key:
		await ctx.say(["大潮又來了，潮頭一線白，轟隆隆地壓過來。", "這個月的大潮你已經看過了，心裡的那點領悟還在慢慢沉澱。"])
		return
	ctx.set_flag("bp_tide", month_key)
	ctx.pass_time(4)
	await ctx.say(["遠處先是一條白線，接著轟隆聲越來越近——", "潮頭高過人頭，一層疊著一層撲上岸來，打得觀潮台都在顫。", "你看著潮水一波推著一波，前浪未退、後浪已至……"])
	# 有能參悟的招式就加領悟，沒有就給武學點數
	var ready := Train.studyable()
	if ready.size() > 0:
		await ctx.say(Train.apply(ready[0].id, 30, 1.0))
	else:
		G.hero.points = int(G.hero.get("points", 0)) + 5
		await ctx.say("（若有所悟，武學點數 +5）")


# ── 漁家：幫忙收網 ──────────────────────────────────────

static func fisher_talk(ctx: Ctx) -> void:
	var pang := _by("龐老大")
	if await ctx.ask(pang.call("船剛靠岸，網裡全是魚。來幫忙收網？給你工錢，再分你幾條魚。"), ["幫忙收網（一個時辰、體力 %d，工錢 %d 兩）" % [NET_STAMINA, NET_PAY], "不用了"]) != 0:
		return
	if not await Train.exert(ctx, NET_STAMINA, "腿都站不穩了，上船只會掉下海。"):
		return
	await ctx.work("haul", "收網中……")
	ctx.pass_time(8)
	await ctx.say(["你跟著龐老大跳上搖搖晃晃的漁船，一把一把把漁網拖上甲板。", "船晃得厲害，你得一直穩住腳步，才沒有一頭栽進海裡。", "（收了一個時辰的網）"])
	G.silver += NET_PAY
	var n := 1 + randi() % 2
	G.bag["sea_fish"] = int(G.bag.get("sea_fish", 0)) + n
	# 在船上站穩練的是下盤：順帶練一門裝備中、還沒到上限的輕功
	var light := Train.trainable("light")
	await ctx.say(["工錢 %d 兩。（得到了海魚 ×%d）" % [NET_PAY, n]] + (Train._exp_lines(light[0].id, 12, false) if not light.is_empty() else []))
