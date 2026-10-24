## 支線「雲水渡口造橋」（照網頁版 story/bridge.ts）：南來北往的人過雲水河都得等船，季秋娘想在渡口蓋一座橋。
## 1. 坐過兩次船以後，在雲水茶棚（州圖上渡口的歇腳選單）跟季秋娘聊「修橋的事」，答應幫忙張羅（bridge = 1）。
## 2. 要湊齊三樣：銀兩 300（自己捐，或找柳村長、鍾嬸、陶四、石岳化緣）、青石條 10 塊
##    （青竹村北的採石場鑿，一塊半個時辰、體力 25，順帶練外功）、石匠（石岳的師兄魯一鑿，住臨江城北）。
## 3. 銀兩、石料都齊了，去找魯一鑿，他帶人動工（bridge = 2，記下動工那天）；三天後橋就蓋好了。
## 4. 橋蓋好以後：州圖上渡口那段河搭了橋、不用坐船（world_map 的 _ferries）；茶棚可以看捐建碑；
##    季秋娘請大家喝慶功茶（名聲 +30，之後茶棚吃東西打八折）。
## 用到的旗標：bridge 0 還沒提、1 張羅中、2 動工了；bridge_fund 湊到的銀兩；bridge_stone 交了幾塊青石條；bridge_day 動工那天；
## bridge_d_<人> 已經跟誰化過緣（liu、zhong、tao、shi）；bridge_party 慶功茶喝過了；ferry_rides 坐過幾次渡船

const FUND_GOAL := 300
const STONE_GOAL := 10
const BUILD_DAYS := 3
const QUARRY_STAMINA := 25
const QUARRY_KE := 4
## 化緣：[名字, 捐多少, 說話的人, 台詞]
const DONORS := {
	"liu": ["柳村長", 60, "柳承安", ["修橋？好事，好事！", "老夫年輕時也在那渡口等過船，一等就是半天。", "這六十兩，是村裡公中的錢，算青竹村一份。"]],
	"zhong": ["鍾嬸", 20, "鍾嬸", ["哎呀，修橋鋪路是積德的事！", "我這茶寮小本生意，二十兩，別嫌少。"]],
	"tao": ["陶四", 30, "陶四", ["橋蓋好了，我挑貨去臨江城就不用等船了——這是生意，不是善事。", "三十兩。記得在碑上把我的名字刻大一點。"]],
	"shi": ["石岳", 20, "石岳", ["魯一鑿？那是我師兄。脾氣臭，手藝是真好。", "你去找他，就說是我說的。這二十兩，給工人買酒。"]],
}

const Train := preload("res://story/train.gd")


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _f(k: String) -> int:
	return int(G.flags.get(k, 0))


## 橋蓋好了沒
static func built() -> bool:
	return _f("bridge") == 2 and G.day >= _f("bridge_day") + BUILD_DAYS


## 茶棚裡多一個「修橋的事」選項（坐過兩次船，或已經在張羅了）
static func option() -> bool:
	return _f("ferry_rides") >= 2 or _f("bridge") > 0


static func progress_text() -> String:
	return "銀兩 %d/%d　青石條 %d/%d" % [mini(_f("bridge_fund"), FUND_GOAL), FUND_GOAL, mini(_f("bridge_stone"), STONE_GOAL), STONE_GOAL]


# ── 季秋娘：提起、捐錢、交石料 ──────────────────────────

static func talk(ctx: Ctx) -> void:
	var ji := _by("季秋娘")
	if _f("bridge") == 0:
		await ctx.say(_lines("季秋娘", ["客官也是常過河的人吧？", "去年秋天，一條渡船在河心翻了，船上五個人，只撈回來三個。", "鄭小篙他爹……就是那回沒的。",
			"大夥兒都說這裡該有座橋。縣太爺說了三年，一文錢也沒撥下來。", "我想，與其等官府，不如我們自己蓋。"]))
		if await ctx.ask(ji.call("客官……肯幫這個忙嗎？"), ["我來張羅", "再說吧"]) != 0:
			await ctx.say(ji.call("也是，這事不小。客官哪天改了主意，再跟我說。"))
			return
		ctx.set_flag("bridge", 1)
		await ctx.say([ji.call("好！有你這句話，我心裡就踏實了。")] + _lines("季秋娘", ["蓋橋要三樣東西：",
			"一是銀兩，少說也要 %d 兩。青竹村的柳村長、鍾嬸、陶四都是熱心人，你去說說，他們多少會出一點；剩下的……就得靠大家湊了。" % FUND_GOAL,
			"二是石料。青竹村北邊有片採石場，那兒的青石最結實，要 %d 塊青石條。" % STONE_GOAL,
			"三是石匠。聽說青竹村打鐵的石岳有個師兄叫魯一鑿，在臨江城北住，修過好幾座橋。",
			"銀兩、石料湊齊了，送來我這兒；再去請魯師傅出馬。"]) + ["（接下支線「雲水渡口造橋」）"])
		return
	if _f("bridge") == 2:
		if built():
			await party(ctx)
			return
		await ctx.say(_lines("季秋娘", ["魯師傅帶著人在河邊忙著呢，叮叮噹噹敲了一整天。", "他說再 %d 天就成了。" % (_f("bridge_day") + BUILD_DAYS - G.day)]))
		return
	var c := await ctx.ask(ji.call("修橋的事，現在湊到這樣：\n%s" % progress_text()), ["捐銀兩", "交青石條", "還差什麼？", "算了"])
	match c:
		0:
			await _donate(ctx)
		1:
			await _deliver(ctx)
		2:
			await ctx.say(_lines("季秋娘", _missing()))


static func _missing() -> Array:
	var out := []
	var fund := FUND_GOAL - _f("bridge_fund")
	var stone := STONE_GOAL - _f("bridge_stone")
	if fund > 0:
		var asked := []
		for k in DONORS:
			if _f("bridge_d_" + k) == 0:
				asked.append(DONORS[k][0])
		out.append("銀兩還差 %d 兩。%s" % [fund, ("%s那兒還沒去說呢。" % "、".join(asked)) if asked.size() > 0 else ""])
	if stone > 0:
		out.append("青石條還差 %d 塊，青竹村北的採石場鑿得到。" % stone)
	if fund <= 0 and stone <= 0:
		out.append("東西都齊了！快去臨江城北請魯一鑿魯師傅吧。")
	return out


static func _donate(ctx: Ctx) -> void:
	var ji := _by("季秋娘")
	var need := FUND_GOAL - _f("bridge_fund")
	if need <= 0:
		await ctx.say(ji.call("銀兩已經夠了，客官的心意我收到了。"))
		return
	var options := [10, 50].filter(func(n): return n < need and n <= G.silver)
	var labels := options.map(func(n): return "%d 兩" % n)
	if G.silver >= need:
		labels.append("補足剩下的 %d 兩" % need)
	labels.append("算了")
	var c := await ctx.ask(ji.call("還差 %d 兩。客官要捐多少？（身上有 %d 兩）" % [need, G.silver]), labels)
	var n := 0
	if c < options.size():
		n = options[c]
	elif c == options.size() and G.silver >= need:
		n = need
	if n == 0 or not ctx.pay(n):
		return
	ctx.set_flag("bridge_fund", _f("bridge_fund") + n)
	await ctx.say(_lines("季秋娘", ["%d 兩，我記在簿子上了。" % n, "等橋蓋好，要把每個人的名字都刻在碑上。"]))
	if _f("bridge_fund") >= FUND_GOAL:
		await ctx.say(ji.call("銀兩湊齊了！"))


static func _deliver(ctx: Ctx) -> void:
	var ji := _by("季秋娘")
	var have := int(G.bag.get("stone_slab", 0))
	var need := STONE_GOAL - _f("bridge_stone")
	if need <= 0:
		await ctx.say(ji.call("石料已經夠了，堆在河邊呢。"))
		return
	if have == 0:
		await ctx.say(ji.call("青石條？青竹村北的採石場鑿得到。一塊可沉了，扛的時候小心腰。"))
		return
	var n := mini(have, need)
	ctx.take("stone_slab", n)
	ctx.set_flag("bridge_stone", _f("bridge_stone") + n)
	await ctx.say(["你把 %d 塊青石條卸在河邊的石堆上。" % n, ji.call(progress_text())])


## 橋蓋好以後第一次跟季秋娘說話：慶功茶
static func party(ctx: Ctx) -> void:
	if ctx.flag("bridge_party"):
		await ctx.say(_lines("季秋娘", ["橋蓋好以後，來喝茶的人反倒多了。", "大家走過橋，總要進來坐坐，說一說當年等船的苦。"]))
		return
	ctx.set_flag("bridge_party")
	await ctx.say([_by("季秋娘").call("客官！橋蓋好了！你去看了嗎？"),
		"茶棚裡擠滿了人：挑夫蔣大川、船家范老舟、鄭小篙，還有兩岸的鄉親，人人手上一碗熱茶。",
		{"speaker": "鄭小篙", "text": "我爹要是知道……"},
		{"speaker": "范老舟", "text": "好啦好啦，大喜的日子。往後我們爺兒倆就撐船載人遊河，也是一門生意！"},
		_by("季秋娘").call("這碗慶功茶，敬你！往後你來茶棚吃東西，一律八折。")])
	ctx.fame(30)


## 渡口的捐建碑
static func stele(ctx: Ctx) -> void:
	var names := [G.hero.name]
	for k in DONORS:
		if _f("bridge_d_" + k):
			names.append(String(DONORS[k][0]).replace("柳村長", "柳承安").replace("鍾嬸", "鍾氏"))
	names += ["季秋娘", "兩岸鄉親"]
	await ctx.say(["一塊新立的青石碑，字刻得端端正正：", "「雲水橋」\n鄉人苦渡久矣。今眾人出錢出力，石匠魯一鑿督造，三日而成。\n捐建者：%s" % "、".join(names)])


# ── 化緣（掛在人物檔案的 story 前面） ───────────────────

## 張羅修橋時，第一次跟這些人說話就是化緣；處理了回傳 true
static func donation(ctx: Ctx, who: String) -> bool:
	if _f("bridge") != 1 or _f("bridge_d_" + who):
		return false
	var d: Array = DONORS[who]
	if await ctx.ask("要跟%s說說修橋的事嗎？" % d[0], ["說說修橋的事", "先聊別的"]) != 0:
		return false
	ctx.set_flag("bridge_d_" + who)
	ctx.set_flag("bridge_fund", _f("bridge_fund") + int(d[1]))
	await ctx.say(_lines(d[2], d[3]) + ["（%s捐了 %d 兩修橋。%s）" % [d[0], d[1], progress_text()]])
	return true


## 陶四、石岳的人物檔案 story（只有化緣這件事）
static func tao_story(ctx: Ctx) -> bool:
	return await donation(ctx, "tao")


static func shi_story(ctx: Ctx) -> bool:
	return await donation(ctx, "shi")


# ── 青竹村北的採石場 ────────────────────────────────────

static func quarry(ctx: Ctx) -> void:
	if _f("bridge") != 1:
		await ctx.say(["一片青灰色的石壁，上頭留著一道道鑿痕，旁邊散著幾把生鏽的鐵鑿。", "（以前有人在這裡採石）"])
		return
	if _f("bridge_stone") + int(G.bag.get("stone_slab", 0)) >= STONE_GOAL:
		await ctx.say("手上的青石條加上交了的，已經夠蓋橋了。")
		return
	if await ctx.ask("鑿一塊青石條？（半個時辰、體力 %d）" % QUARRY_STAMINA, ["掄起鐵鑿", "算了"]) != 0:
		return
	if not await Train.exert(ctx, QUARRY_STAMINA, "手臂抖得連鑿子都握不住了。"):
		return
	await ctx.work("quarry", "鑿石中……")
	ctx.pass_time(QUARRY_KE)
	await ctx.say(["你照著石壁上的紋路下鑿，一錘一錘，石屑亂飛。", "好不容易撬下一整塊青石條，扛起來沉得腰都直不起來。"])
	await ctx.give("stone_slab")
	var list := Train.trainable("outer")
	if not list.is_empty():
		await ctx.say(Train._exp_lines(list[0].id, 10, false))


# ── 魯一鑿：石匠（臨江城北） ────────────────────────────

static func mason(ctx: Ctx) -> void:
	if _f("bridge") == 0:
		await ctx.say(_lines("魯一鑿", ["看什麼？沒見過人鑿石頭？", "……石頭不會騙人。你下錯一鑿，它就裂給你看。"]))
		return
	if _f("bridge") == 2:
		await ctx.say({"speaker": "魯一鑿", "text": "那座橋，再撐一百年沒問題。" if built() else "別在這兒礙事。過兩天再來看。"})
		return
	if _f("bridge_fund") < FUND_GOAL or _f("bridge_stone") < STONE_GOAL:
		await ctx.say(_lines("魯一鑿", ["雲水渡口要蓋橋？……石岳那小子跟你提的吧。", "蓋橋不是兒戲。錢不夠、石料不夠，我一錘都不會下。"]) + ["（%s）" % progress_text()])
		return
	await ctx.say(_lines("魯一鑿", ["錢夠了，石料也夠了？", "……行。我帶三個徒弟過去，三天。", "三天以後，你自己走過去看。"]) + ["（魯一鑿動工了。三天後橋就蓋好）"])
	ctx.set_flag("bridge", 2)
	ctx.set_flag("bridge_day", G.day)
