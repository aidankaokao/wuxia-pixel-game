## 臨江城（照網頁版 story/linjiang_city.ts、linjiang_jianghu.ts、linjiang.ts、yamen.ts、market.ts）：城南商街與城北民居併成一張圖。
## - 雲來客棧（賀長年）：住店、喝壺茶聽店小二牛小旺說傳聞（一天一則）
## - 望江樓（汪福來）：點菜；說書人費一言每天說一段江湖舊事
## - 回春堂（白濟仁）：買藥、收草藥（比別處高）、看傷
## - 和記當鋪（和守義）：典當收得比別處高，死當貨每旬換一批
## - 錦繡布莊（魏錦娘）：衣物、絲線（紡織還沒搬）
## - 金刀鏢局（金萬山）：護鏢，每天兩趟可挑、一天接一趟；路上可能遇劫
## - 臨江縣衙：知縣盧秉文、師爺苗守正、捕頭霍青山（懸賞）、獄卒鄒老七；鳴冤鼓；公告欄（重要大事、懸賞公告、日常公告）
## - 漕幫分舵（彭大江）：扛貨換工錢（順便練外功）、擲骰子
## - 旬休趕集：城南擺出四個攤子（田記山貨、江南絲行、漱石齋舊書攤、雷家舊貨）
## - 城北：涼茶攤黃阿順、泉霧茶莊（梁敬亭）、臨江書院（讀書、練字還沒搬）、牙人錢六（房產還沒搬）、石匠魯一鑿（蓋橋，見 story/bridge.gd 的 mason）
## 用到的旗標：lj_rumor 哪天聽過傳聞、lj_escort 哪天走過鏢、lj_b_<懸賞> 1 揭了榜／2 收拾掉了、lj_b_<懸賞>_day 上次領賞的日子、
## market 哪天逛過集

const INN_PRICE := 5
const TEA_PRICE := 2
const HEAL_PRICE := 10
const TOWER_MENU := ["zhutongfan", "laweifan", "daoxiao", "jitang", "tangyuan", "xingren", "guihua"]
const CLINIC_STOCK := ["jinchuang", "yangqi_wan", "huiqi_san", "dahuan_dan", "herb"]
const CLINIC_BUYS := ["herb", "mushroom", "boar_tusk"]
const PAWN_POOL := ["g_bamboo_hat", "g_iron_bracer", "g_jade_pendant", "g_cloud_boots", "g_brocade", "g_boots", "g_bracer", "g_sachet",
	"yunwu", "dahuan_dan", "fine_silk", "manual_basic_fist", "manual_breathing", "w_autumn_sword", "w_steel_sword", "w_goose_saber"]
const PAWN_RATE := 0.6
const CLOTH_SHOP := ["g_headband", "g_cap", "g_shortcoat", "g_gown", "g_brocade", "g_rough_pants", "g_pants", "g_sandals", "g_shoes", "g_boots", "g_bracer", "g_sachet"]
const WEAVE_SHOP := ["cotton_thread", "silk_thread"]

## 護鏢：[id, 送到哪, 貨, 來回幾刻, 遇劫機率, 遭遇戰, 酬勞, 名聲門檻, 名聲]
const ROUTES := [
	["mingquan", "鳴泉山腳", "幾箱藥材", 12, 0.3, "escort_near", 20, 0, 1],
	["qingzhu", "青竹村", "一車布疋", 16, 0.35, "escort_near", 25, 0, 1],
	["post", "雲水官道驛站", "一箱官銀", 24, 0.6, "escort_far", 55, 15, 3],
	["lake", "碧漪湖畔的漁村", "兩擔鹽", 20, 0.5, "escort_far", 45, 10, 2],
]
const ESCORT_STAMINA := 20
## 懸賞：[id, 標題, 地點, 說明, 賞銀, 名聲, 名聲門檻]；目標在地圖上等你（旗標 lj_b_<id> 是 1 時才出現）
const BOUNTIES := [
	["dogs", "官道惡犬", "雲水渡口東岸的林子（州圖上）", "一頭惡犬領著野狗群，在渡口邊咬傷了好幾個等船的人。", 30, 3, 0],
	["bandits", "山道毛賊", "往鳴泉山的山道半路（州圖上）", "幾個毛賊在鳴泉山道上打劫上山的香客。", 40, 3, 0],
	["river", "江邊水匪", "臨江城南，碼頭西邊的江灘", "一夥水匪夜裡摸上碼頭偷貨，漕幫也拿他們沒辦法。", 60, 5, 10],
]
const BOUNTY_GAP := 5
const CARRY_STAMINA := 25
const CARRY_PAY := 8
const CARRY_EXP := 12
## 旬休趕集的攤子：[標題, 攤主, 貨, 招呼]
const STALLS := {
	"food": ["田記山貨", "田有餘", ["chicken", "mushroom", "redbean", "osmanthus", "sesame", "almond", "tofu", "egg"], "山裡剛下來的貨！桂花、杏仁、野菌，平常城裡可買不到。"],
	"silk": ["江南絲行", "沈綺羅", ["fine_silk", "silk_thread", "cotton_thread"], "這上品絲線是從江南運來的，一旬才帶這麼幾綑，摻在布裡，織出來的東西就是不一樣。"],
	"books": ["漱石齋舊書攤", "古懷石", ["manual_basic_fist", "manual_breathing"], "舊書舊書，別看紙黃了，裡頭的東西可不舊。"],
	"goods": ["雷家舊貨", "雷振", ["g_bamboo_hat", "g_iron_bracer", "g_jade_pendant", "g_cloud_boots", "w_steel_sword", "w_goose_saber"], "走江湖的家當，件件都是好東西。這把青鋼劍、這把雁翎刀，鐵匠鋪可打不出來。"],
}

const Train := preload("res://story/train.gd")


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _pay(ctx: Ctx, n: int, who: String) -> bool:
	if ctx.pay(n):
		return true
	await ctx.say({"speaker": who, "text": "客官，這得 %d 兩……您身上好像不太夠。" % n})
	return false


static func _night() -> bool:
	var s := G.shichen_of()
	return s < 3 or s >= 10


# ── 雲來客棧 ────────────────────────────────────────────

static func _rumors() -> Array:
	var w := func(t: String) -> Array: return [{"speaker": "牛小旺", "text": t}]
	var out := [
		w.call("聽說鳴泉山的後山，起大霧的早上會有個白頭髮的老人家在泉邊站著。問他話，一轉眼人就不見了。"),
		w.call("城南每逢初十、二十、三十趕集，江南來的絲線、舊書攤上的秘笈，平常可買不到。"),
		w.call("漕幫的人最近跟金刀鏢局的鏢師在碼頭上推推搡搡，差點動起刀子。您往碼頭去可小心些。"),
		w.call("青竹村茶攤的鍾嬸啊，最愛人家送她燉山豬肉，說是比她自己燉的還香。"),
		w.call("下雨天山裡的野獸都躲起來了，獵戶說那時候採野菌最好。"),
		w.call("回春堂的大還丹，一顆一百多兩，聽說吃了能把人從鬼門關拉回來。"),
		w.call("斷崖寨的祁三刀被人打跑啦！聽說是個年輕人幹的……咦，客官，該不會就是您吧？") if G.flags.get("bandit_boss", 0) else w.call("蒼嵐山上的斷崖寨，寨主祁三刀，衙門懸賞五百兩都沒人敢接。"),
		w.call("望江樓的說書人費一言，每天說一段江湖舊事，一天不落。客官有空去聽聽。"),
		w.call("和記當鋪的和掌櫃，眼睛毒得很，什麼東西到他手上，一看就知道值幾兩。"),
		w.call("金刀鏢局的總鏢頭，年輕時一把金刀打遍臨江，現在腰粗了，可沒人敢小看他。"),
	]
	return out


static func inn_talk(ctx: Ctx) -> void:
	var he := _by("賀長年")
	var c := await ctx.ask(he.call("客官，住店還是打尖？"), ["住店（%d 兩，睡到天亮）" % INN_PRICE, "打尖（喝壺茶 %d 兩，聽聽傳聞）" % TEA_PRICE, "不用了"])
	if c == 0:
		if not await _pay(ctx, INN_PRICE, "賀長年"):
			return
		await ctx.say(he.call("天字二號房，被褥都是今天新曬的。小旺，帶客官上去！"))
		await Train.rest(ctx, "要睡到天亮，還是歇幾個時辰？")
	elif c == 1:
		if ctx.flag("lj_rumor") == G.day:
			await ctx.say({"speaker": "牛小旺", "text": "今天該說的我都說啦，客官明天再來，保準有新鮮事！"})
			return
		if not await _pay(ctx, TEA_PRICE, "賀長年"):
			return
		ctx.set_flag("lj_rumor", G.day)
		var pool := _rumors()
		await ctx.say(["店小二牛小旺提著茶壺過來，一邊倒茶一邊壓低了聲音……"] + pool[G.day % pool.size()])


# ── 望江樓 ──────────────────────────────────────────────

static func tower_talk(ctx: Ctx) -> void:
	if await ctx.ask(_by("汪福來").call("客官樓上請！望江樓的菜，臨江城頭一份。"), ["點菜", "不用了"]) == 0:
		await ctx.shop("望江樓・菜單", TOWER_MENU)


const TALES := [
	["話說百年前，大江上有位劍客，人稱「斷江」。", "傳說他一劍劈下，江水斷流三息——", "當然啦，各位看官，說書的嘴，聽聽就好。"],
	["今天說鳴泉劍派的祖師。", "祖師爺當年在鳴泉山上結廬，日日聽泉，悟出「快而不亂，如泉不絕」八個字。", "從此鳴泉劍派開山立派，到今天也有好幾代囉。"],
	["今天說漕幫。", "大江上千百條船，十條有八條要跟漕幫打招呼。", "漕幫的規矩是：「船過水無痕，貨到人不問。」嘿，這話裡的意思，各位自己琢磨。"],
	["今天說金刀鏢局。", "金刀鏢局三十年不失一鏢，直到三年前——", "那一趟鏢在城外被劫，押鏢的十一個兄弟沒一個回來。", "劫鏢的是誰？說書的不敢說，說書的不敢說……"],
	["今天說個怪事。", "蒼嵐山的獵戶說，月圓之夜，山裡會傳來一陣笛聲，跟著笛聲走，就再也找不到回來的路。", "各位看官，夜裡別上山啊。"],
]


static func teller_talk(ctx: Ctx) -> void:
	await ctx.say(["醒木一拍——"] + _lines("費一言", TALES[G.day % TALES.size()]))
	if G.silver >= 1 and await ctx.ask("要賞說書人幾文錢嗎？", ["賞一兩", "不賞"]) == 0:
		ctx.pay(1)
		await ctx.say(_by("費一言").call("多謝客官捧場！明天請早，還有新的！"))


# ── 回春堂 ──────────────────────────────────────────────

static func clinic_talk(ctx: Ctx) -> void:
	var bai := _by("白濟仁")
	# 鳴泉的委託「回春堂送藥」：帶著藥包來
	if ctx.flag("mq_c_med") == 1 and ctx.has("mq_medpack"):
		await load("res://story/mingquan.gd").med_delivery(ctx)
		return
	var c := await ctx.ask(bai.call("哪裡不舒服？"), ["買藥", "賣草藥（收得比別處高）", "看傷（%d 兩，氣血、內力回滿）" % HEAL_PRICE, "不用了"])
	if c == 0:
		await ctx.shop("回春堂", CLINIC_STOCK)
	elif c == 1:
		await ctx.ui.shop("回春堂・收草藥", [], 0.8, 0.0, CLINIC_BUYS)
	elif c == 2:
		var d := Hero.derive(G.hero)
		if int(G.hero.hp) >= d.max_hp and int(G.hero.qi) >= d.max_qi:
			await ctx.say(bai.call("你氣色好得很，不用看。"))
			return
		if not await _pay(ctx, HEAL_PRICE, "白濟仁"):
			return
		ctx.pass_time(2)
		G.hero.hp = d.max_hp
		G.hero.qi = d.max_qi
		await ctx.say([bai.call("躺好，別動。"), "白濟仁推拿、扎針、敷藥，一氣呵成。", "（花了兩刻。氣血、內力回滿）"])


# ── 和記當鋪 ────────────────────────────────────────────

## 這一旬的死當貨（依旬數固定，同一旬來看都一樣；秘笈買過就不再擺）
static func pawn_stock() -> Array:
	var dt := G.date_of()
	var seed: int = (int(dt.get("year", 1)) * 12 + int(dt.month)) * 3 + (int(dt.date) - 1) / 10 + 7
	var pool := PAWN_POOL.duplicate()
	var out := []
	while out.size() < 5 and pool.size() > 0:
		seed = (seed * 1103515245 + 12345) & 0x7fffffff
		out.append(pool.pop_at(seed % pool.size()))
	return out.filter(func(id): return not (Ui.item_def(id).has("manual") and G.bag.has(id)))


static func pawn_talk(ctx: Ctx) -> void:
	var ho := _by("和守義")
	var c := await ctx.ask(ho.call("當東西，還是看看死當的貨？"), ["看看死當貨（每旬換一批）", "典當（收得比別處高）", "不用了"])
	if c == 0:
		await ctx.shop("和記當鋪・死當貨", pawn_stock())
	elif c == 1:
		await ctx.say(ho.call("拿出來我瞧瞧。……嗯，就這個價，童叟無欺。"))
		await ctx.ui.shop("和記當鋪・典當", [], PAWN_RATE)


# ── 錦繡布莊 ────────────────────────────────────────────

static func cloth_talk(ctx: Ctx) -> void:
	var jin := _by("魏錦娘")
	var c := await ctx.ask(jin.call("客官要看看什麼？"), ["看看衣物", "買紡織的材料", "學紡織", "閒聊", "不用了"])
	match c:
		0:
			await ctx.shop("錦繡布莊", CLOTH_SHOP)
		1:
			await ctx.shop("錦繡布莊・絲線", WEAVE_SHOP)
		2:
			await ctx.say([jin.call("想學織布？好啊，等我把後頭的織機修好了再教你。"), "（紡織還沒搬過來）"])
		3:
			var chats := [
				["客官好眼光，我們錦繡布莊的布料，從臨江城到下游的大埠頭都有名。", "穿得好，走到哪兒人家都高看你一眼；料子厚實，挨刀也少挨一些。"],
				["上品、極品的好料子，得請城外的繡娘一針一線慢慢做，這兒可不常有。"],
				["鳴泉山上的道長們也常來，他們的月白道袍，料子就是從我這兒買的。"],
			]
			await ctx.say(_lines("魏錦娘", chats[G.day % chats.size()]))


# ── 金刀鏢局：護鏢 ──────────────────────────────────────

static func escort_talk(ctx: Ctx) -> void:
	var jin := _by("金萬山")
	var c := await ctx.ask(jin.call("金刀鏢局，三十年的招牌。要接鏢？"), ["接鏢", "閒聊", "不用了"])
	if c == 1:
		await ctx.say(_lines("金萬山", ["漕幫那幫人，仗著碼頭是他們的，三天兩頭扣我們的鏢船。", "要不是三年前那趟鏢折了十一個兄弟，鏢局元氣大傷，我早就跟他們理論去了。"]))
		return
	if c != 0:
		return
	if ctx.flag("lj_escort") == G.day:
		await ctx.say(jin.call("今天的鏢已經走過一趟了，明天再來。"))
		return
	var list := [ROUTES[G.day % ROUTES.size()], ROUTES[(G.day + 1) % ROUTES.size()]]
	var fame := int(G.hero.get("fame", 0))
	var labels := list.map(func(r): return "%s（%s，來回%s，酬勞 %d 兩%s）%s" % [r[1], r[2], G.ke_text(r[3]), r[6], "，常有劫匪" if r[4] >= 0.5 else "", ("　名聲 %d 起" % r[7]) if fame < r[7] else ""])
	var i := await ctx.ask(jin.call("今天有兩趟鏢。路上花體力 %d，遇上劫匪就得動手。" % ESCORT_STAMINA), labels + ["算了"])
	if i >= list.size():
		return
	var r: Array = list[i]
	if fame < int(r[7]):
		await ctx.say([jin.call("這趟鏢不輕，我得找個有名號的人押。你再闖蕩闖蕩吧。"), "（名聲要 %d，目前 %d）" % [r[7], fame]])
		return
	if not await Train.exert(ctx, ESCORT_STAMINA, "你累得腳步虛浮，這樣上路只會誤事。"):
		return
	ctx.set_flag("lj_escort", G.day)
	await ctx.say(["你跟著鏢車出了城，押著%s往%s去。" % [r[2], r[1]], "車輪轆轆，鏢旗在風裡獵獵作響……"])
	ctx.pass_time(int(r[3]) / 2)
	if randf() < float(r[4]):
		var o := await ctx.battle(r[5])
		if o != "win":
			ctx.pass_time(int(r[3]) / 2)
			await ctx.say(["劫匪搶了貨，一溜煙鑽進了林子。", jin.call("人沒事就好。貨丟了，酬勞自然是沒有了。下回小心。"), "（護鏢失敗）"])
			return
		await ctx.say("劫匪抱頭鼠竄，鏢車繼續上路。")
	ctx.pass_time(int(r[3]) / 2)
	await ctx.say(["%s平平安安地送到了%s。" % [r[2], r[1]], jin.call("辦得漂亮！這是你的。")])
	ctx.silver(int(r[6]))
	ctx.fame(int(r[8]))


# ── 臨江縣衙：懸賞 ──────────────────────────────────────

static func _bflag(id: String) -> String:
	return "lj_b_" + id


## 這張懸賞現在貼著嗎（沒揭、也不在冷卻中）
static func _posted(b: Array) -> bool:
	var f := _bflag(b[0])
	return int(G.flags.get(f, 0)) == 0 and (not G.flags.has(f + "_day") or G.day >= int(G.flags[f + "_day"]) + BOUNTY_GAP)


static func _bounty(id: String) -> Array:
	for b in BOUNTIES:
		if b[0] == id:
			return b
	return []


## 捕頭霍青山：先領賞，再看懸賞榜
static func bounty_board(ctx: Ctx) -> void:
	var huo := _by("霍青山")
	for b in BOUNTIES:
		if ctx.flag(_bflag(b[0])) == 2:
			await ctx.say(huo.call("「%s」辦妥了？好！這是賞銀。" % b[1]))
			ctx.set_flag(_bflag(b[0]), 0)
			ctx.set_flag(_bflag(b[0]) + "_day", G.day)
			ctx.silver(int(b[4]))
			ctx.fame(int(b[5]))
	await board(ctx, "urgent", "捕快房・懸賞榜")


static func _take_bounty(ctx: Ctx, b: Array) -> void:
	var huo := _by("霍青山")
	var fame := int(G.hero.get("fame", 0))
	if fame < int(b[6]):
		await ctx.say([huo.call("這張懸賞兇險，衙門不放心交給沒名沒姓的人。"), "（名聲要 %d，目前 %d）" % [b[6], fame]])
		return
	ctx.set_flag(_bflag(b[0]), 1)
	ctx.refresh()
	await ctx.say(["你揭下「%s」的榜文。" % b[1], huo.call(b[3]), huo.call("地點在%s。辦妥了回來領賞。" % b[2])])


## 懸賞目標：在地圖上等你（城南江灘的水匪；州圖上的惡犬、毛賊見 world_map 的懸賞標記）
static func bounty_target(ctx: Ctx, id: String) -> void:
	var b := _bounty(id)
	var o := await ctx.battle("bounty_" + id)
	if o != "win":
		return
	ctx.set_flag(_bflag(id), 2)
	ctx.refresh()
	await ctx.say(["「%s」收拾掉了。" % b[1], "（回臨江縣衙領賞）"])


static func bounty_river(ctx: Ctx) -> void:
	await bounty_target(ctx, "river")


static func bounty_dogs(ctx: Ctx) -> void:
	await ctx.say("林子裡傳來一陣低吼——一頭比牛犢還大的惡犬領著狗群，從樹後圍了上來！")
	await bounty_target(ctx, "dogs")


static func bounty_bandits(ctx: Ctx) -> void:
	await ctx.say("山道拐角處蹲著幾個毛賊，正在分剛搶來的香油錢。")
	await bounty_target(ctx, "bandits")


# ── 公告欄 ──────────────────────────────────────────────

## 告示：{title, text: [段落], by, tag, act（揭榜之類的動作，Callable(ctx)）}
static func notices(tab: String) -> Array:
	var out := []
	match tab:
		"big":
			out.append({"title": "海捕文書・緝拿欽犯", "text": ["奉上憲令：有瘦長臉、左眉帶疤之男子一名，身負重案，近日恐自北嶺一帶南下。", "凡有見其行蹤者，速報本縣，查實者重賞。窩藏者同罪。"], "by": "臨江縣正堂", "tag": "朝廷要犯"})
			if G.flags.get("bandit_boss", 0):
				out.append({"title": "斷崖寨匪患已平", "text": ["蒼嵐山斷崖寨匪首祁三刀，已為義士所敗，寨眾星散。", "山道恢復通行，往來樵採、行旅可安心上山。"], "by": "臨江縣正堂"})
			else:
				out.append({"title": "緝拿斷崖寨寨主祁三刀", "text": ["斷崖寨匪首祁三刀，盤據蒼嵐山，屢劫行旅。", "能擒斬者，賞銀五百兩。"], "by": "臨江縣正堂", "tag": "賞銀 500 兩"})
			if int(G.flags.get("bridge", 0)) == 1:
				out.append({"title": "募建雲水橋", "text": ["雲水渡口擬建石橋，現由雲水茶棚季氏張羅。", "有心捐輸者，請至茶棚登記。"], "by": "雲水茶棚季秋娘 謹啟"})
			if G.season_of() == 1:
				out.append({"title": "整修江堤", "text": ["入秋以前，本縣將整修沿江堤防，以防秋汛。", "凡年滿十六之丁壯，可至縣衙報名充作民夫，日給工錢。"], "by": "臨江縣正堂"})
		"urgent":
			for b in BOUNTIES:
				var st := int(G.flags.get(_bflag(b[0]), 0))
				if st > 0:
					out.append({"title": "懸賞・%s（已揭）" % b[1], "text": [b[3], "地點：%s。" % b[2], "你已經辦妥了，找捕頭霍青山領賞。" if st == 2 else "榜已經被你揭了，辦妥了回縣衙領賞。"], "by": "臨江縣捕廳", "tag": "賞銀 %d 兩" % b[4]})
				elif _posted(b):
					out.append({"title": "懸賞・%s" % b[1], "text": [b[3], "地點：%s。" % b[2], "能為地方除害者，賞銀 %d 兩。%s" % [b[4], ("（此案兇險，名聲 %d 以上者方可揭榜）" % b[6]) if b[6] > 0 else ""]],
						"by": "臨江縣捕廳", "tag": "賞銀 %d 兩" % b[4], "act": ["揭榜", func(ctx): await _take_bounty(ctx, b)]})
		"daily":
			out.append({"title": "旬休趕集", "text": ["每逢初十、二十、三十旬休之日，城南商街擺出外地來的攤子：山貨、絲線、舊書、舊貨，平日少見。", "天黑收攤。"], "by": "臨江縣市司"})
			out.append({"title": "鳴泉劍派開山收徒", "text": ["鳴泉劍派開山收徒，不拘時日。", "凡年滿十五、身家清白、有志習武者，可自行上鳴泉山應考，過得入門考驗即可拜師。"], "by": "鳴泉劍派"})
	return out


const TAB_NAME := {"big": "重要大事", "urgent": "懸賞公告", "daily": "日常公告"}


## 打開公告欄：先選一欄，再選一張看；帶動作的（揭榜）看完問要不要做
static func board(ctx: Ctx, tab: String, title: String) -> void:
	var tabs := ["big", "urgent", "daily"]
	var cur := tabs.find(tab)
	while true:
		var c := await ctx.ask("%s\n（現在看的是「%s」）" % [title, TAB_NAME[tabs[cur]]], tabs.map(func(t): return ("▸ " if t == tabs[cur] else "") + "看「%s」" % TAB_NAME[t]) + ["離開"])
		if c >= tabs.size():
			return
		cur = c
		var list := notices(tabs[cur])
		if list.is_empty():
			await ctx.say("「%s」這一欄空空的。" % TAB_NAME[tabs[cur]])
			continue
		var i := await ctx.ask("「%s」貼著 %d 張告示。" % [TAB_NAME[tabs[cur]], list.size()], list.map(func(n): return n.title + (("　〔%s〕" % n.tag) if n.has("tag") else "")) + ["回去"])
		if i >= list.size():
			continue
		var n: Dictionary = list[i]
		await ctx.say(["【%s】\n%s" % [n.title, "\n".join(n.text)], "——%s" % n.by])
		if n.has("act") and await ctx.ask("要%s嗎？" % n.act[0], [n.act[0], "算了"]) == 0:
			await n.act[1].call(ctx)
			return


static func board_gate(ctx: Ctx) -> void:
	await board(ctx, "big", "臨江縣・告示牌")


static func board_yamen(ctx: Ctx) -> void:
	await board(ctx, "big", "臨江縣衙・公告欄")


static func board_bounty(ctx: Ctx) -> void:
	await board(ctx, "urgent", "捕快房・懸賞榜")


# ── 縣衙裡的人 ──────────────────────────────────────────

static func drum(ctx: Ctx) -> void:
	if await ctx.ask("一面大紅鼓，鼓面上落著薄薄一層灰。要敲嗎？", ["不敲", "敲一下"]) != 1:
		return
	await ctx.say(["咚——！鼓聲震得門口的麻雀全飛了。"] + _lines("高升", ["誰？誰擊鼓？", "……你有什麼冤情？沒有？", "沒冤情別亂敲！老爺正在後頭午睡，吵醒了要挨板子的。"]))


static func jailer_talk(ctx: Ctx) -> void:
	if G.time % 3 == 0:
		await ctx.say(_lines("鄒老七", ["牢房重地，閒人免進。", "要探監？先去簽押房找師爺開條子。……不過最近沒人可探，牢裡就關著兩個偷雞的。"]))
	else:
		await ctx.say(_lines("鄒老七", ["站住。再往前一步，我就當你是來劫獄的。", "……開玩笑的。沒事別在這兒晃，裡頭的味道可不好聞。"]))


static func magistrate_talk(ctx: Ctx) -> void:
	var fame := int(G.hero.get("fame", 0))
	if fame >= 80:
		await ctx.say(_lines("盧秉文", ["原來是你。這幾年臨江縣太平，你出了不少力。", "本官上報州府的考績，也沾了你的光，哈哈。"]))
	elif fame >= 15:
		await ctx.say(_lines("盧秉文", ["你就是城裡說的那位少年俠客？", "江湖上的事，衙門不便插手；可地方上的事，你若肯幫忙，本官記在心上。"]))
	else:
		await ctx.say(_lines("盧秉文", ["本官盧秉文，臨江知縣。", "城裡的事，大小都歸衙門管。有事找師爺，懸賞找捕頭。"]))


static func clerk_talk(ctx: Ctx) -> void:
	await ctx.say(_lines("苗守正", ["在下苗守正，忝為本縣刑名錢穀師爺。", "房契地契、過戶登記、商號開業，都歸在下管。有事儘管說。"]) + ["（房產與開店還沒搬過來）"])


# ── 漕幫分舵 ────────────────────────────────────────────

static func guild_talk(ctx: Ctx) -> void:
	var peng := _by("彭大江")
	var c := await ctx.ask(peng.call("漕幫臨江分舵。有事說事。"), ["扛貨（一個時辰、體力 %d，工錢 %d 兩）" % [CARRY_STAMINA, CARRY_PAY], "擲骰子", "搭漕幫的船往大埠頭（大江水路）", "閒聊", "不用了"])
	match c:
		0:
			if not await Train.exert(ctx, CARRY_STAMINA, "腰都快斷了，再扛下去要出人命。"):
				return
			await ctx.work("haul", "扛貨中……")
			ctx.pass_time(8)
			await ctx.say(["你跟著一群赤膊漢子，把船上的米包一袋袋扛上岸。", "汗水流進眼睛裡，肩膀磨得通紅。", "（扛了一個時辰）"])
			G.silver += CARRY_PAY
			var list := Train.trainable("outer")
			await ctx.say(["工錢 %d 兩。" % CARRY_PAY] + (Train._exp_lines(list[0].id, CARRY_EXP, false) if not list.is_empty() else []))
		1:
			await dice(ctx)
		2:
			await load("res://story/dabutou.gd").river_boat(ctx, "dabutou", "彭大江")
		3:
			await ctx.say(_lines("彭大江", ["金刀鏢局？哼，他們的鏢船夾帶私貨，我們扣下來查，有什麼不對？", "碼頭是漕幫的碼頭，規矩是漕幫的規矩。", "……三年前那趟鏢的事，跟我們漕幫沒關係。外頭傳的那些話，你別信。"]))


## 擲骰子比大小：各擲兩顆，點大的贏；平手算莊家的
static func dice(ctx: Ctx) -> void:
	var peng := _by("彭大江")
	while true:
		var bets := [1, 5, 10].filter(func(n): return G.silver >= n)
		if bets.is_empty():
			await ctx.say(peng.call("沒錢了還賭？回去吧！"))
			return
		var i := await ctx.ask(peng.call("押多少？兩顆骰子比大小，點大的贏，平手算莊家的。"), bets.map(func(n): return "押 %d 兩" % n) + ["不玩了"])
		if i >= bets.size():
			return
		var bet: int = bets[i]
		var me := 2 + randi() % 6 + randi() % 6
		var house := 2 + randi() % 6 + randi() % 6
		G.silver += bet if me > house else -bet
		await ctx.say("骰盅一掀——你擲出 %d 點，莊家 %d 點。\n%s" % [me, house, ("你贏了 %d 兩！" if me > house else "你輸了 %d 兩。") % bet])


# ── 旬休趕集 ────────────────────────────────────────────

static func _stall(ctx: Ctx, id: String) -> void:
	var s: Array = STALLS[id]
	var v := _by(s[1])
	if _night():
		await ctx.say(["「%s」的攤子已經收了，%s正在捆貨。" % [s[0], s[1]], v.call("天黑囉，下一旬再來吧！")])
		return
	ctx.set_flag("market", G.day)
	var stock: Array = s[2].filter(func(it): return not (id == "books" and G.bag.has(it)))
	if stock.is_empty():
		await ctx.say(v.call("好書都讓你挑走啦，下一旬我再收些新的來。"))
		return
	await ctx.say(v.call(s[3]))
	await ctx.shop(s[0], stock)


static func stall_food(ctx: Ctx) -> void:
	await _stall(ctx, "food")


static func stall_silk(ctx: Ctx) -> void:
	await _stall(ctx, "silk")


static func stall_books(ctx: Ctx) -> void:
	await _stall(ctx, "books")


static func stall_goods(ctx: Ctx) -> void:
	await _stall(ctx, "goods")


# ── 城北 ────────────────────────────────────────────────

## 北門口的涼茶攤：黃阿順
static func huang_tea(ctx: Ctx) -> void:
	var huang := _by("黃阿順")
	var c := await ctx.ask(huang.call("客官，來碗涼茶？一兩銀子一大碗，解渴又消暑。"), ["打聽北邊的事", "來一碗（1 兩）", "不用了"])
	if c == 1:
		if not ctx.pay(1):
			await ctx.say(huang.call("……沒帶錢？那就算啦，下回再來。"))
			return
		var d := Hero.derive(G.hero)
		G.hero.stamina = mini(d.max_stamina, int(G.hero.stamina) + 10)
		await ctx.say("一碗涼茶下肚，暑氣全消。（體力 +10）")
	elif c == 0:
		await ctx.say(_lines("黃阿順", ["北邊？出了北門往北走，就是鳴泉山。", "山上有個鳴泉劍派，這陣子正在收徒弟，不拘時日。上個月隔壁老顧家的閨女就上山去了，聽說考過了，現在是記名弟子囉。", "想去的話，出城往北走一段山路就到。山門口有知客的弟子接待，說你是來應考的就成。"]))


## 泉霧茶莊：鳴泉劍派的產業（門派還沒搬，先當一般茶莊賣茶）
static func teashop_talk(ctx: Ctx) -> void:
	var liang := _by("梁敬亭")
	if await ctx.ask(liang.call("泉霧茶莊，賣的是鳴泉山後山的茶。客官試一盞？"), ["看看茶", "不用了"]) == 0:
		await ctx.shop("泉霧茶莊", ["quanwu", "yunwu", "tea"])


static func agent_talk(ctx: Ctx) -> void:
	await ctx.say(_lines("錢六", ["萬通牙行，錢六。買房、賣房、招租，找我就對了！", "城北這幾間民居，屋主都託我賣。客官要是有意思，改天帶你看看。"]) + ["（房產還沒搬過來）"])


static func academy_shelf(ctx: Ctx) -> void:
	await ctx.say(["書院的藏書，經史子集都有。夫子說，書是給人讀的，不是給人看的。", "（讀書、學識還沒搬過來）"])


static func academy_desk(ctx: Ctx) -> void:
	await ctx.say(["學童練字的書案，硯台裡的墨還沒乾。", "（琴棋書畫還沒搬過來）"])
