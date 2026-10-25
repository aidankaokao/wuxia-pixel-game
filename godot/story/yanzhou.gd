## 煙州府城（PLAN.md 4.42；地圖 data/yzfu.json 是手工擺的，店、室內、空地照樣板 town_gen.gd 與 story/town.gd）：
## - 州衙（師爺柴守中、知州韋明德、總捕頭凌鋒）、青蚨錢莊（存取、借錢）、青蚨會館（會首蕭萬貫）、青蚨坊（押大小）、
##   漕幫總舵（總舵主褚萬川）與府河碼頭（把頭戴鐵肩：扛漕糧）、煙山書院（山長顏敬齋：借書、聽講、對弈）、
##   長風武館（館主辛長風：入館學長風拳、指點、切磋；大師姊辛嵐；練武場的木人樁）、金刀鏢局府城分號（鏢頭金萬河：護鏢）、
##   煙雨園（撫琴、寫生、池邊釣魚、園記碑）、夜市（戌時起：段二娘的小吃、藍守拙的古玩、余半仙算命、傅小猴耍把戲）。
## - 支線「府河泊位」：漕幫與青蚨會爭府河碼頭東段的泊位。幫漕幫查出青蚨會的執照是假的、報知州、打退來尋仇的打手；
##   或收青蚨會的錢替他們傳話，跟漕幫翻臉。
## 用到的旗標：
##   yz_berth 府河泊位：1 聽褚萬川說了、2 在州衙查出執照是假的、3 報了知州（烏大烏二在碼頭等你）、4 收了青蚨會的錢、
##            5 替青蚨會傳了話（跟漕幫翻臉，任務完）、6 打退了烏大烏二、7 跟褚萬川覆命（任務完）
##   yz_qf_paid 青蚨會的尾款領了；yz_wuguan 入了長風武館；yz_win_xinlan、yz_win_xinc 第一次勝過辛嵐、辛長風；yz_stele 讀過園記
## 一天一次的事記在 G.life.daily：yz:carry 扛貨、yz:escort 護鏢、yz:lecture 聽講、yz:chess 對弈、yz:guide 館主指點、yz:show 看把戲、yz:study 跟穆雲帆讀書。
## 借錢記在 G.life.loan：{owe 要還多少, due 期限（第幾天）, day 借的那天}。

const Town := preload("res://story/town.gd")
const Train := preload("res://story/train.gd")
const Arts := preload("res://story/arts.gd")
const Fishing := preload("res://story/fishing.gd")
const Festival := preload("res://story/festival.gd")
const Shop := preload("res://story/shop.gd")

const CARRY_STAMINA := 25
const CARRY_PAY := 10
const CARRY_EXP := 14
const LOANS := [100, 300, 600]
## 借錢一個月內還，利錢兩成；過期每多十天再加一成
const LOAN_DAYS := 30
const LOAN_RATE := 0.2
const LOAN_LATE := 0.1
const WUGUAN_FEE := 30
const GUIDE_FEE := 3
const GUIDE_EXP := 45
const DUMMY_EXP := 35
const LECTURE_KE := 4
const SHOW_PRICE := 1
const FORTUNE_PRICE := 1
const BET := [1, 5, 10, 50]
## 護鏢：[送到哪, 貨, 來回幾刻, 遇劫機率, 遭遇戰, 酬勞, 名聲門檻, 名聲]
const ROUTES := [
	["三塘鎮", "十擔官米", 12, 0.3, "escort_near", 25, 0, 1],
	["白水驛", "一箱公文與官銀", 16, 0.45, "escort_far", 45, 10, 2],
	["潮信城", "青蚨會的一箱銀票", 24, 0.55, "escort_far", 60, 15, 3],
	["北嶺關", "巡檢司的軍餉", 18, 0.5, "escort_far", 50, 10, 2],
]
const NIGHT_FOOD := ["tangyuan", "xiahun", "guihua", "hongdou", "f_jiaozi", "yangchun"]
const CURIO := ["g_jade_pendant", "g_cloud_boots", "g_bamboo_hat", "g_iron_bracer", "w_steel_sword", "w_goose_saber", "g_sachet", "manual_basic_fist", "red_lantern"]
const FORTUNES := [
	"「東南有水，水中有財。」……客官往海邊走走，或許有所得。",
	"「劍在匣中，鳴而未出。」您身上有一門功夫，再練下去就要開竅了。",
	"「月滿則虧。」錢財莫露白，夜路莫獨行。",
	"「貴人在北，其人姓韓。」……準不準？準不準要看您自己。",
	"「舟到橋頭自然直。」眼前的難事，過了這幾天就順了。",
	"「青蚨還錢，有借有還。」……這是青蚨會的人叫我說的，嘿嘿，您別當真。",
]
const ACTS := ["傅小猴連翻十八個筋斗，落地時頭頂的瓷碗一滴水都沒灑。", "傅小猴把三把飛刀拋上半空，接住、再拋，刀刃在燈火下閃閃發亮。",
	"傅小猴爬上竹竿頂端，單手倒立，底下的人看得大氣都不敢喘。"]


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func _once(key: String) -> bool:
	return int(_daily().get(key, 0)) == G.day


static func _mark(key: String) -> void:
	_daily()[key] = G.day


static func _n(pid: String) -> String:
	return Person.full_name(pid)


# ── 州衙 ────────────────────────────────────────────────

## 師爺柴守中：泊位的事、空地、登記商號
static func yamen(ctx: Ctx, h: Dictionary) -> void:
	var say := _by(h.who)
	var b := ctx.flag("yz_berth")
	if b == 1:
		if await ctx.ask(say.call("有什麼事？"), ["打聽府河碼頭東段泊位的事", "辦別的事"]) == 0:
			await _permit(ctx, say)
			return
	await Town.default_shop(ctx, h)


## 查青蚨會的泊位執照：塞十兩茶水錢讓師爺翻底冊，或學識夠了自己翻
static func _permit(ctx: Ctx, say: Callable) -> void:
	await ctx.say([say.call("泊位？東段那幾個泊位，上個月州衙發了執照給青蚨會。"), say.call("執照上蓋著知州大人的印，白紙黑字，漕幫爭也沒用。")])
	var lv := Arts.learning_level()
	var opts := ["塞十兩茶水錢，請師爺翻底冊看看", "（學識 %d 級）自己借底冊來翻" % lv if lv >= 2 else "（學識要 2 級才看得懂州衙的底冊）", "算了"]
	var c := await ctx.ask(say.call("怎麼？你不信？"), opts)
	if c == 0:
		if not ctx.pay(10):
			await ctx.say(say.call("……你身上連十兩都沒有，還想看底冊？"))
			return
		await ctx.say([say.call("咳，看在你這麼誠心的份上……"), "柴守中翻了半天底冊，臉色漸漸變了。"])
	elif c == 1 and lv >= 2:
		ctx.pass_time(2)
		await ctx.say("你借來州衙的發照底冊，一頁頁翻過去。（花了兩刻）")
	else:
		return
	ctx.set_flag("yz_berth", 2)
	await ctx.say([say.call("怪了……底冊上根本沒有這一號執照。"), say.call("印是真的印，可這張執照從沒經過州衙的手——有人私下用了知州大人的印。"),
		say.call("這事我不敢聲張。你要是有膽子，直接去大堂稟告知州大人。"), "（去州衙大堂找知州韋明德）"])


## 州衙裡另外站的人：知州韋明德、總捕頭凌鋒；書院的學子穆雲帆
static func extra(ctx: Ctx, pid: String, h: Dictionary) -> void:
	match pid:
		"yz_wei":
			await _zhizhou(ctx)
		"yz_ling":
			await ctx.say(_lines(_n("yz_ling"), ["州衙總捕頭凌鋒。", "北嶺關那邊在抓的那個人，上頭催得緊，可連畫像都沒有，叫人怎麼抓？",
				"雲嶺的霧鴉寨，一年比一年囂張。等州衙調齊了人手，總有一天要上山剿了它。"]))
		"yz_mu":
			await _mu(ctx)


static func _zhizhou(ctx: Ctx) -> void:
	var wei := _by(_n("yz_wei"))
	if ctx.flag("yz_berth") == 2:
		await ctx.say(["你把底冊裡查不到那張執照的事，一五一十稟告了知州。", wei.call("……竟有此事！本州的印，是誰拿去用的？"), wei.call("好，好。這張執照即刻作廢，東段泊位照舊歸漕幫。"),
			wei.call("不過青蚨會那邊……蕭萬貫不是好相與的。你出了這個頭，自己小心些。")])
		ctx.set_flag("yz_berth", 3)
		ctx.fame(3)
		ctx.refresh()
		return
	var fame := int(G.hero.get("fame", 0))
	await ctx.say(_lines(_n("yz_wei"), ["本州韋明德。" if fame < 30 else "是你啊。地方上的事，你出了不少力。", "煙州富庶，可富庶的地方，麻煩也多。漕幫、青蚨會、鹽幫，哪一個都不省心。"]))


static func drum(ctx: Ctx) -> void:
	if await ctx.ask("州衙門口的鳴冤鼓，鼓槌掛在架上。要敲嗎？", ["不敲", "敲一下"]) != 1:
		return
	await ctx.say(["咚——！", "門裡探出一個衙役的頭：「誰擊鼓？……沒冤情就別敲，知州大人正在批公文。」"])


# ── 青蚨錢莊：存取、借錢 ─────────────────────────────────

static func _loan() -> Dictionary:
	return G.life.get("loan", {})


## 現在要還多少（過期每多十天加一成）
static func loan_owe() -> int:
	var l := _loan()
	if l.is_empty():
		return 0
	var late := maxi(0, G.day - int(l.due))
	return roundi(float(l.owe) * (1.0 + LOAN_LATE * ceili(late / 10.0)))


static func bank(ctx: Ctx, h: Dictionary) -> void:
	var say := _by(h.who)
	var owe := loan_owe()
	var opts := ["存取銀兩"] + (["還錢（要還 %d 兩%s）" % [owe, "，已經過期了" if G.day > int(_loan().due) else "，%s前還" % G.date_text(int(_loan().due))]] if owe > 0 else ["借錢"]) + ["不用了"]
	var c := await ctx.ask(say.call("青蚨錢莊，存、取、借、還，童叟無欺。"), opts)
	match opts[c]:
		"存取銀兩":
			await Town._bank(ctx, h)
		"借錢":
			var i := await ctx.ask(say.call("借多少？一個月內還，利錢兩成。過了期限，每拖十天再加一成。"), LOANS.map(func(n): return "借 %d 兩（一個月後還 %d 兩）" % [n, roundi(n * (1.0 + LOAN_RATE))]) + ["算了"])
			if i >= LOANS.size():
				return
			var n: int = LOANS[i]
			if n >= 600 and int(G.hero.get("fame", 0)) < 20:
				await ctx.say(say.call("六百兩不是小數目，得是城裡叫得出名號的人才借得。"))
				return
			G.life.loan = {"owe": roundi(n * (1.0 + LOAN_RATE)), "due": G.day + LOAN_DAYS, "day": G.day}
			ctx.silver(n)
			await ctx.say([say.call("這是 %d 兩的銀票，在這兒按個手印。" % n), "（%s以前還 %d 兩）" % [G.date_text(G.day + LOAN_DAYS), int(G.life.loan.owe)]])
		_:
			if c == 1 and owe > 0:
				if not ctx.pay(owe):
					await ctx.say(say.call("要還 %d 兩，您身上不夠。" % owe))
					return
				G.life.erase("loan")
				await ctx.say(say.call("%d 兩收訖，借據還您。下回有需要，再來找青蚨錢莊。" % owe))


## 今日事（daily.gd）：借的錢快到期、過期了；夜市
static func tasks() -> Array:
	var out := []
	var l := _loan()
	if not l.is_empty() and G.day >= int(l.due) - 5:
		out.append({"text": "還青蚨錢莊的錢（%d 兩）" % loan_owe(), "state": "todo", "note": "已經過期了，每拖十天多一成" if G.day > int(l.due) else "%s到期" % G.date_text(int(l.due))})
	return out


# ── 青蚨會館、青蚨坊 ────────────────────────────────────

static func hq(ctx: Ctx, h: Dictionary) -> void:
	var xiao := _by(h.who)
	var b := ctx.flag("yz_berth")
	if b in [1, 2] and await ctx.ask(xiao.call("貴客上門。有何指教？"), ["問府河泊位的事", "閒聊"]) == 0:
		await ctx.say([xiao.call("泊位？州衙發的執照，青蚨會按規矩收泊位錢，有什麼不對？"), xiao.call("漕幫的褚老頭仗著人多，賴著不給。說到底，大家都是做生意的。"),
			xiao.call("這樣吧，你替我把這封信送給褚萬川，勸他按規矩交錢。辦成了，五十兩先給，事後再給五十兩。")])
		if await ctx.ask("要收青蚨會的錢，替他們傳話嗎？", ["收下", "不了"]) == 0:
			ctx.set_flag("yz_berth", 4)
			ctx.silver(50)
			await ctx.say([xiao.call("爽快！信在這兒。"), "（把信送到漕幫總舵，交給褚萬川）"])
		return
	if b == 5 and ctx.flag("yz_qf_paid") == 0:
		ctx.set_flag("yz_qf_paid")
		await ctx.say([xiao.call("話傳到了，褚老頭氣得跳腳，哈哈。青蚨會說話算話，這是另外五十兩。"), xiao.call("以後在府城，有青蚨會照應你。")])
		ctx.silver(50)
		return
	if b >= 6:
		await ctx.say(_lines(h.who, ["……是你壞了我的事。", "府城的生意，十家有七家要跟青蚨會打交道。你好自為之。"]))
		return
	await ctx.say(_lines(h.who, ["青蚨會，青蚨還錢。錢放出去，總會飛回來。", "煙州的米行、布行、鹽行，哪一家沒向青蚨會借過錢？要做大生意，少不了我們。"]))


## 押大小：三顆骰子，十一點以上是大、十點以下是小；三顆一樣是豹子，莊家通吃
static func gamble(ctx: Ctx, h: Dictionary) -> void:
	var rui := _by(h.who)
	while true:
		var bets := BET.filter(func(n): return G.silver >= n)
		if bets.is_empty():
			await ctx.say(rui.call("沒本錢了？外頭的青蚨錢莊借得到。"))
			return
		var i := await ctx.ask(rui.call("押大押小，買定離手！三顆一樣是豹子，莊家通吃。"), bets.map(func(n): return "押 %d 兩" % n) + ["不玩了"])
		if i >= bets.size():
			return
		var bet: int = bets[i]
		var side := await ctx.ask("押大還是押小？", ["押大（11–17）", "押小（4–10）"])
		var d := [1 + randi() % 6, 1 + randi() % 6, 1 + randi() % 6]
		var sum: int = d[0] + d[1] + d[2]
		var leopard: bool = d[0] == d[1] and d[1] == d[2]
		var win: bool = not leopard and ((sum >= 11) == (side == 0))
		G.silver += bet if win else -bet
		await ctx.say("骰盅一掀——%d、%d、%d，%s。\n%s" % [d[0], d[1], d[2], "豹子！" if leopard else ("%d 點大" % sum if sum >= 11 else "%d 點小" % sum), ("你贏了 %d 兩！" if win else "你輸了 %d 兩。") % bet])


# ── 漕幫總舵、府河碼頭 ──────────────────────────────────

static func guild(ctx: Ctx, h: Dictionary) -> void:
	var chu := _by(h.who)
	var b := ctx.flag("yz_berth")
	match b:
		0:
			await ctx.say([chu.call("漕幫府城總舵，我是褚萬川。"), chu.call("府河碼頭東段那幾個泊位，漕幫的船停了三十年。上個月青蚨會拿來一張州衙的執照，說泊位歸他們，要我們每條船交錢。"),
				chu.call("我褚萬川不怕打架，可跟官府打不起。那張執照，我總覺得有鬼。")])
			if await ctx.ask(chu.call("你是外地人，跟兩邊都沒瓜葛。肯不肯替我去州衙打聽打聽？"), ["幫你打聽", "不想蹚渾水"]) == 0:
				ctx.set_flag("yz_berth", 1)
				await ctx.say([chu.call("好！州衙的柴師爺管發照，你去問他。"), "（去州衙問師爺柴守中泊位執照的事）"])
		1, 2, 3:
			await ctx.say(chu.call(["州衙那邊怎麼說？柴師爺管發照的事。", "執照是假的？好啊，我就知道！快去稟告知州大人！", "知州大人把執照作廢了？痛快！……可蕭萬貫不會善罷甘休，碼頭上最近多了幾張生面孔，你小心。"][b - 1]))
		4:
			await ctx.say(["你把青蚨會的信交給褚萬川。他看了兩行，臉色鐵青，把信撕成了碎片。", chu.call("好啊，我把你當自己人，你倒替蕭萬貫跑起腿來了！"), chu.call("鐵肩！把這位「貴客」請出去！")])
			ctx.set_flag("yz_berth", 5)
			var o := await ctx.battle("berth_dai")
			await ctx.say(["戴鐵肩揉著肩膀退開了。" if o == "win" else "你被戴鐵肩一扁擔掃出了總舵大門。", "（漕幫從此不歡迎你；回青蚨會館找蕭萬貫拿尾款）"])
		5:
			await ctx.say(chu.call("滾！漕幫的地方，不歡迎替青蚨會跑腿的人。"))
		6:
			await ctx.say([chu.call("烏大烏二被你打得抱頭鼠竄？哈哈哈！"), chu.call("執照作廢了，打手也趕跑了，東段泊位保住了。這是漕幫的一點心意。"),
				chu.call("從今以後，你就是漕幫的朋友。碼頭上扛貨，工錢多給你兩成。")])
			ctx.set_flag("yz_berth", 7)
			ctx.silver(80)
			ctx.fame(8)
		_:
			await ctx.say(_lines(h.who, ["府河上的船，十條有九條是漕幫的。", "朋友來了有好酒。坐，喝一碗燒刀子！"]))


## 碼頭的把頭戴鐵肩：扛漕糧（一天一次）
static func dock(ctx: Ctx) -> void:
	var dai := _by(_n("yz_dai"))
	if ctx.flag("yz_berth") == 5:
		await ctx.say(dai.call("哼，替青蚨會跑腿的。碼頭的活兒，不給你幹。"))
		return
	var pay := roundi(CARRY_PAY * (1.2 if ctx.flag("yz_berth") == 7 else 1.0))
	var c := await ctx.ask(dai.call("碼頭缺人手，有力氣就來扛漕糧。"), ["扛貨（一個時辰、體力 %d，工錢 %d 兩）" % [CARRY_STAMINA, pay], "閒聊", "不用了"])
	if c == 1:
		await ctx.say(_lines(_n("yz_dai"), ["府河往北接白水渡，往南進大江。中州的麥子、江南的米，全從這碼頭過。", "東段那幾個泊位要是丟了，弟兄們吃什麼？"]))
		return
	if c != 0:
		return
	if _once("yz:carry"):
		await ctx.say(dai.call("今天的船都卸完了，明天趕早。"))
		return
	if not await Train.exert(ctx, CARRY_STAMINA, "腰都快斷了，再扛下去要出人命。"):
		return
	_mark("yz:carry")
	await ctx.work("haul", "扛漕糧中……")
	ctx.pass_time(8)
	G.silver += pay
	var list := Train.trainable("outer")
	await ctx.say(["你跟著腳夫們把一船漕糧一袋袋扛進貨棧。（扛了一個時辰）", "工錢 %d 兩。" % pay] + (Train._exp_lines(list[0].id, CARRY_EXP, false) if not list.is_empty() else []))


## 碼頭上等著你的烏大烏二
static func thugs(ctx: Ctx) -> void:
	await ctx.say([_by(_n("yz_wuda")).call("就是你，在知州面前多嘴？"), _by(_n("yz_wuer")).call("會首說了，給你長點記性！")])
	var o := await ctx.battle("berth_thugs")
	if o != "win":
		return
	ctx.set_flag("yz_berth", 6)
	ctx.refresh()
	await ctx.say(["烏大烏二連滾帶爬地跑了。", "（回漕幫總舵告訴褚萬川）"])


# ── 煙山書院 ────────────────────────────────────────────

static func academy(ctx: Ctx, h: Dictionary) -> void:
	var yan := _by(h.who)
	var c := await ctx.ask(yan.call("讀書人不必拘禮。想做什麼？"), ["借書來讀", "聽山長講學（半個時辰，一天一次）", "跟山長下一盤棋（一天一次）", "閒聊", "不用了"])
	match c:
		0:
			await Arts.shelf(ctx, "煙山書院的藏書，經史子集、歷代詩文，任人借讀。")
		1:
			if _once("yz:lecture"):
				await ctx.say(yan.call("今天講完了。學而時習之，回去溫一溫。"))
				return
			_mark("yz:lecture")
			ctx.pass_time(LECTURE_KE)
			var up := Crafts.gain("learning", 20)
			await ctx.say(["顏敬齋講了一段《春秋》裡的故事，從一場仗說到人心，又從人心說回了治亂。", "（花了半個時辰；學識經驗 +20）"] + ([up] if up != "" else []))
		2:
			if _once("yz:chess"):
				await ctx.say(yan.call("一天一盤，多了傷神。明天再來。"))
				return
			_mark("yz:chess")
			var won: bool = await Arts.play_chess(ctx, h.who, 6, 0)
			var up2 := Crafts.gain("chess", 25 if won else 12)
			if won and ctx.flag("yz_chess_win") == 0:
				ctx.set_flag("yz_chess_win")
				ctx.fame(2)
			await ctx.say([yan.call("後生可畏！" if won else "棋要往後看三步。你只看了一步。")] + ([up2] if up2 != "" else []))
		3:
			await ctx.say(_lines(h.who, ["書院建在州城裡，是要讀書人別忘了，書是讀給世道用的。", "城裡那些商人、幫會鬥來鬥去，說到底，都是一個『利』字。"]))


static func _mu(ctx: Ctx) -> void:
	var mu := _by(_n("yz_mu"))
	if _once("yz:study"):
		await ctx.say(mu.call("今天的功課做完了，我要去夜市吃碗湯圓。"))
		return
	if await ctx.ask(mu.call("兄台也來讀書？要不要一起溫書？（半個時辰）"), ["一起溫書", "不了"]) != 0:
		return
	_mark("yz:study")
	ctx.pass_time(4)
	var up := Crafts.gain("learning", 10)
	await ctx.say([mu.call("這一段我老是背不熟……原來是這個意思！多謝兄台。"), "（學識經驗 +10）"] + ([up] if up != "" else []))


# ── 長風武館 ────────────────────────────────────────────

static func _enrolled() -> bool:
	return int(G.flags.get("yz_wuguan", 0)) == 1


static func wuguan(ctx: Ctx, h: Dictionary) -> void:
	var xin := _by(h.who)
	if not _enrolled():
		var c := await ctx.ask(xin.call("長風武館，教的是長風拳。入館束脩 %d 兩，館裡的木人樁、練武場任你用。" % WUGUAN_FEE), ["入館（%d 兩）" % WUGUAN_FEE, "跟館主切磋", "閒聊", "不用了"])
		match c:
			0:
				if not ctx.pay(WUGUAN_FEE):
					await ctx.say(xin.call("束脩 %d 兩，一分不能少。" % WUGUAN_FEE))
					return
				ctx.set_flag("yz_wuguan")
				await ctx.say([xin.call("好！從今天起你就是長風武館的學徒了。"), xin.call("武館不是門派，不拘你另有師承。拳頭練硬了，走到哪兒都用得上。")])
				await ctx.learn("changfeng", 1)
			1:
				await _spar_master(ctx, h)
			2:
				await ctx.say(_lines(h.who, ["長風拳不花俏，講的是腰馬沉穩、後勁綿長。", "州衙的凌捕頭，當年也是在我這兒練出來的。"]))
		return
	var opts := ["請館主指點（%d 兩，一天一次）" % GUIDE_FEE, "跟館主切磋", "閒聊", "不用了"]
	var c2 := await ctx.ask(xin.call("練得怎麼樣了？"), opts)
	match c2:
		0:
			if _once("yz:guide"):
				await ctx.say(xin.call("一天教一回，貪多嚼不爛。"))
				return
			if Hero.find_skill(G.hero, "changfeng").is_empty():
				await ctx.say(xin.call("你連長風拳都還沒學，指點什麼？"))
				return
			if not ctx.pay(GUIDE_FEE):
				await ctx.say(xin.call("指點費 %d 兩。" % GUIDE_FEE))
				return
			if not await Train.exert(ctx, 15, "你喘得連馬步都紮不穩了。"):
				G.silver += GUIDE_FEE
				return
			_mark("yz:guide")
			ctx.pass_time(4)
			await ctx.work("stake", "館主指點中……")
			await ctx.say([xin.call("腰再沉一點！拳從腳底起，不是從肩膀起！"), "辛長風一拳一拳地糾正你的架子。（花了半個時辰）"] + Train._exp_lines("changfeng", GUIDE_EXP, false))
		1:
			await _spar_master(ctx, h)
		2:
			await ctx.say(_lines(h.who, ["嵐兒是我女兒，也是館裡的大師姊。她那一關都過不了，就別來找我切磋。"]))


static func _spar_master(ctx: Ctx, h: Dictionary) -> void:
	if ctx.flag("yz_win_xinlan") == 0:
		await ctx.say(_by(h.who).call("想跟我過招，先勝過練武場上的嵐兒。"))
		return
	var o := await ctx.battle("spar_xinc")
	if o == "win" and ctx.flag("yz_win_xinc") == 0:
		ctx.set_flag("yz_win_xinc")
		ctx.fame(4)
		await ctx.say(_by(_n("yz_xinc")).call("好拳！府城能接我十招的，你是頭一個年輕人。"))


static func xinlan(ctx: Ctx) -> void:
	var lan := _by(_n("yz_xinlan"))
	if await ctx.ask(lan.call("來練武場做什麼？想過招？"), ["過招", "不了"]) != 0:
		return
	var o := await ctx.battle("spar_xinlan")
	if o == "win" and ctx.flag("yz_win_xinlan") == 0:
		ctx.set_flag("yz_win_xinlan")
		ctx.fame(1)
		await ctx.say(lan.call("……輸就輸了。我爹在館裡，你有本事去找他。"))


## 練武場的木人樁：入館才能用，經驗比外頭的樁多一些
static func yard_dummy(ctx: Ctx) -> void:
	if not _enrolled():
		await ctx.say("長風武館練武場的木人樁。\n（要先入館才能用）")
		return
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("木人樁被打得油亮。\n（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var i := 0
	if list.size() > 1:
		i = await ctx.ask("要練哪一門？", list.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level]) + ["算了"])
		if i >= list.size():
			return
	var s: Dictionary = list[i]
	var n := await Train.ask_rounds(ctx, Train.STAMINA.stake, "練", Train.rounds_to_cap(s, DUMMY_EXP))
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.stake * n, "手臂都快抬不起來了。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練樁中……")
	await ctx.say(["你在練武場上對著木人樁一拳一拳地打，武館的學徒們在旁邊吆喝。" + Train.rounds_note("練", n)] + Train._exp_lines(s.id, DUMMY_EXP * n, false))


# ── 金刀鏢局府城分號：護鏢 ──────────────────────────────

static func escort(ctx: Ctx, h: Dictionary) -> void:
	var jin := _by(h.who)
	var c := await ctx.ask(jin.call("金刀鏢局府城分號。我是金萬河，臨江總號的金萬山是我大哥。要接鏢？"), ["接鏢", "閒聊", "不用了"])
	if c == 1:
		await ctx.say(_lines(h.who, ["府城的鏢，一半是替青蚨會押銀子。錢是好賺，可我總覺得那些銀子來路不太乾淨。", "三年前那趟鏢的事，我大哥到現在都睡不好覺。"]))
		return
	if c != 0:
		return
	if _once("yz:escort"):
		await ctx.say(jin.call("今天的鏢已經走過一趟了，明天再來。"))
		return
	var list := [ROUTES[G.day % ROUTES.size()], ROUTES[(G.day + 1) % ROUTES.size()]]
	var fame := int(G.hero.get("fame", 0))
	var i := await ctx.ask(jin.call("今天有兩趟。路上花體力 20，遇上劫匪就得動手。"), list.map(func(r): return "%s（%s，來回%s，酬勞 %d 兩%s）%s" % [r[0], r[1], G.ke_text(r[2]), r[5], "，常有劫匪" if r[3] >= 0.5 else "", ("　名聲 %d 起" % r[6]) if fame < r[6] else ""]) + ["算了"])
	if i >= list.size():
		return
	var r: Array = list[i]
	if fame < int(r[6]):
		await ctx.say([jin.call("這趟鏢不輕，得找個有名號的人押。"), "（名聲要 %d，目前 %d）" % [r[6], fame]])
		return
	if not await Train.exert(ctx, 20, "你累得腳步虛浮，這樣上路只會誤事。"):
		return
	_mark("yz:escort")
	await ctx.say(["你跟著鏢車出了城，押著%s往%s去。" % [r[1], r[0]], "鏢旗在風裡獵獵作響……"])
	ctx.pass_time(int(r[2]) / 2)
	if randf() < float(r[3]):
		var o := await ctx.battle(r[4])
		if o != "win":
			ctx.pass_time(int(r[2]) / 2)
			await ctx.say(["劫匪搶了貨，跑得不見蹤影。", jin.call("人沒事就好。貨丟了，酬勞自然沒有了。"), "（護鏢失敗）"])
			return
		await ctx.say("劫匪抱頭鼠竄，鏢車繼續上路。")
	ctx.pass_time(int(r[2]) / 2)
	await ctx.say(["%s平平安安送到了%s。" % [r[1], r[0]], jin.call("辦得漂亮！這是你的。")])
	ctx.silver(int(r[5]))
	ctx.fame(int(r[7]))


# ── 煙雨園 ──────────────────────────────────────────────

static func garden_pavilion(ctx: Ctx) -> void:
	var c := await ctx.ask("池邊的水亭，亭裡擺著一張古琴、一張畫案。", ["撫琴", "寫生", "算了"])
	if c == 0:
		await Arts.practice(ctx, "qin", "水亭臨著一池碧水，風吹過來帶著荷葉的香。", "要坐下來撫一曲嗎？")
	elif c == 1:
		await Arts.practice(ctx, "painting", "亭外假山、竹叢、一池碧水，倒影裡有雲。", "要鋪紙畫一幅園景嗎？")


static func garden_fish(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "pond", "園子裡的池塘，錦鯉在荷葉底下游來游去。園丁說，釣上來的放生也行。")


static func garden_stele(ctx: Ctx) -> void:
	await ctx.say("「煙雨園記」\n前朝知州某公所建。園不在大，有水則靈；城不在富，有書則清。後之來者，登斯亭、臨斯池，當思煙州百姓。")
	if ctx.flag("yz_stele") == 0:
		ctx.set_flag("yz_stele")
		var up := Crafts.gain("learning", 8)
		await ctx.say("（讀了一篇好文章，學識經驗 +8）" + ("\n" + up if up != "" else ""))


# ── 夜市 ────────────────────────────────────────────────

static func night_food(ctx: Ctx) -> void:
	var duan := _by(_n("yz_duan"))
	await ctx.say(duan.call("熱騰騰的湯圓、鮮蝦餛飩！客官來一碗？"))
	await ctx.ui.shop("段二娘的小吃攤", NIGHT_FOOD, 0.5, 0.2)


## 古玩攤：每天換幾樣（照日子固定）
static func night_curio(ctx: Ctx) -> void:
	var lan := _by(_n("yz_lan"))
	var pool := CURIO.duplicate()
	var out := []
	var seed := G.day * 7 + 3
	while out.size() < 4 and pool.size() > 0:
		seed = (seed * 1103515245 + 12345) & 0x7fffffff
		out.append(pool.pop_at(seed % pool.size()))
	out = out.filter(func(id): return not (Ui.item_def(id).has("manual") and G.bag.has(id)))
	await ctx.say(lan.call("這可是前朝的東西！……好吧好吧，就算不是前朝的，也是好東西。"))
	await ctx.ui.shop("藍守拙的古玩攤", out, 0.5)


static func night_fortune(ctx: Ctx) -> void:
	var yu := _by(_n("yz_banxian"))
	if await ctx.ask(yu.call("鐵口直斷，一卦一兩。客官要算什麼？"), ["算一卦（%d 兩）" % FORTUNE_PRICE, "不了"]) != 0:
		return
	if not ctx.pay(FORTUNE_PRICE):
		await ctx.say(yu.call("沒錢？那貧道送你一句：「囊中羞澀，宜早歸家。」"))
		return
	await ctx.say(["余半仙搖了搖竹籤筒，抽出一支，瞇著眼看了半天。", yu.call(FORTUNES[(G.day + randi() % 3) % FORTUNES.size()])])


static func night_show(ctx: Ctx) -> void:
	var fu := _by(_n("yz_fu"))
	if _once("yz:show"):
		await ctx.say(fu.call("今晚的把戲耍完啦，明晚再來！"))
		return
	if await ctx.ask(fu.call("走過路過不要錯過！看一回把戲，賞一兩銀子就成！"), ["看把戲（%d 兩）" % SHOW_PRICE, "不了"]) != 0:
		return
	if not ctx.pay(SHOW_PRICE):
		await ctx.say(fu.call("沒錢也能看，站後面一點就是。"))
		return
	_mark("yz:show")
	ctx.pass_time(2)
	Festival._treat(1, 1.1)
	await ctx.say([ACTS[G.day % ACTS.size()], "四周的人拍手叫好，銅錢叮叮噹噹地落進傅小猴的破碗。", "（花了兩刻；心情愉快：下一場戰鬥武功經驗 ×1.1）"])
