## 鳴泉劍派在山下的產業（照網頁版 story/mq_trade.ts）：
## - 臨江城的泉霧茶莊：外門管事梁敬亭掌櫃（linjiang/teashop_talk 轉過來）。山上的茶由韋季安逢九送來，或由外務執事接「送茶進城」的差事送來；
##   茶莊每天零賣（mq_fund.shop_sell），比整批賣給茶行多五成。弟子找梁敬亭可以買茶（八折）、問生意、幫忙招呼客人（一天一回）、交送來的茶。
## - 青竹村的祖田：柳承安代收田租。夏租、冬租到期時你若是外務執事，要在十天內下山找柳承安收（年成不好時佃戶求減租，照收、減一成或兩成由你決定）；
##   過期或你不是外務執事，就由韋季安代收（mq_fund.settle）。
## 送茶的差事存在 G.life.mq_errand（kind "tea"、n 斤、value 行情、day、due、done）。沒有用到旗標（招呼客人記在 G.life.daily 的 "mq:shophelp"）。

const Train := preload("res://story/train.gd")
const Chores := preload("res://story/chores.gd")
const MqFund := preload("res://story/mq_fund.gd")

const STOCK := ["quanwu", "yunwu", "tea"]
## 製茶房存的茶夠不夠送一趟
const TEA_RUN_MIN := 15


static func _liang(t: String) -> Dictionary:
	return {"speaker": "梁敬亭", "text": t}


static func _liu(t: String) -> Dictionary:
	return {"speaker": "柳承安", "text": t}


## 手上還沒交的送茶差事（沒有是空的）
static func tea_errand() -> Dictionary:
	var e: Dictionary = G.life.get("mq_errand", {})
	return e if e.get("kind", "") == "tea" and not e.get("done", false) and G.day <= int(e.due) else {}


## 接下送茶的差事：把製茶房的茶交到你手上；回傳斤數
static func take_tea_run(days: int) -> int:
	var f := MqFund.fund()
	var n := floori(float(f.tea))
	var value := float(f.tea_value) * (n / float(f.tea)) if float(f.tea) > 0 else 0.0
	f.tea = float(f.tea) - n
	f.tea_value = float(f.tea_value) - value
	G.life.mq_errand = {"kind": "tea", "n": n, "value": value, "day": G.day, "due": G.day + days - 1}
	return n


## 每天半夜：送茶的差事過期了，另外找人送去，茶照樣上架
static func new_day() -> void:
	var e: Dictionary = G.life.get("mq_errand", {})
	if e.get("kind", "") != "tea" or e.get("done", false) or G.day <= int(e.due):
		return
	var shop: Dictionary = MqFund.fund().shop
	shop.tea = float(shop.tea) + int(e.n)
	shop.tea_value = float(shop.tea_value) + float(e.get("value", 0))
	e.done = true


# ── 泉霧茶莊：梁敬亭 ─────────────────────────────────────

static func teashop_talk(ctx: Ctx) -> void:
	if not Sect.member("mingquan"):
		if await ctx.ask(_liang("客官喝茶還是買茶？本號賣的是鳴泉山上的泉霧茶，泉水澆出來的，別處買不到。"), ["買茶", "隨便看看"]) == 0:
			await ctx.shop("泉霧茶莊", STOCK)
		return
	var opts := []
	var ind := "res://story/mq_industry.gd"
	if ResourceLoader.exists(ind) and load(ind).has_method("thugs_option"):
		var th: Array = load(ind).thugs_option()
		if th.size() > 0:
			opts.append(th)
	var tea := tea_errand()
	if not tea.is_empty():
		opts.append(["交茶（%d 斤）" % int(tea.n), "mq_trade/_deliver"])
	opts.append(["買茶（本門八折）", "mq_trade/_buy"])
	opts.append(["茶莊的生意", "mq_trade/_business"])
	opts.append(["幫忙招呼客人（一個時辰・體力 10）", "mq_trade/_help_counter"])
	var who := "外務執事" if G.sect.get("post", "") == "st_out" else "同門"
	var i := await ctx.ask(_liang("是山上來的%s啊。茶莊有什麼要問的？" % who), opts.map(func(o): return o[0]) + ["沒事"])
	if i < opts.size():
		var p: PackedStringArray = String(opts[i][1]).split("/")
		await Callable(load("res://story/%s.gd" % p[0]), p[1]).call(ctx)


static func _buy(ctx: Ctx) -> void:
	await ctx.ui.shop("泉霧茶莊", STOCK, 0.5, 0.2)


static func _deliver(ctx: Ctx) -> void:
	var e := tea_errand()
	var shop: Dictionary = MqFund.fund().shop
	shop.tea = float(shop.tea) + int(e.n)
	shop.tea_value = float(shop.tea_value) + float(e.get("value", 0))
	e.done = true
	await ctx.say([_liang("%d 斤，一兩不少。" % int(e.n)), _liang("這批茶上了架，這幾天就賣得動。辛苦你跑這一趟。")])
	G.silver += 10
	await ctx.say("跑腿錢：銀兩 +10。（%s）" % Sect.add_contrib(6))


static func _business(ctx: Ctx) -> void:
	var f := MqFund.fund()
	var shop: Dictionary = f.shop
	if shop.get("closed", false):
		await ctx.say(_liang("掌門吩咐把茶莊收了，山上的茶改成整批賣給茶行。我在這兒看著鋪子，等哪天重新開張。"))
		return
	await ctx.say([_liang("架上還有 %d 斤茶。" % roundi(float(shop.tea)) if float(shop.tea) >= 1 else "架上的茶賣光了，等山上送茶下來。"),
		_liang("這個月賣了 %d 斤，進帳 %d 兩，夥計的工錢一天 %d 兩。" % [roundi(float(shop.sold)), roundi(float(f.month.in.get("shop", 0))), MqFund.SHOP.wage]),
		_liang("旬休趕集、過節的時候生意最好。明前茶一上架，城裡的老茶客搶著要。")])


static func _help_counter(ctx: Ctx) -> void:
	var d: Dictionary = G.life.get("daily", {})
	if int(d.get("mq:shophelp", 0)) == G.day:
		await ctx.say(_liang("今天已經勞你站過櫃台了，剩下的我們來。"))
		return
	if float(MqFund.fund().shop.tea) < 1:
		await ctx.say(_liang("架上沒茶，站櫃台也沒得賣。等山上送茶來再說。"))
		return
	if not await Train.exert(ctx, 10, "累得站都站不穩，這時候招呼客人只會失禮。"):
		return
	ctx.pass_time(8)
	if not G.life.has("daily"):
		G.life.daily = {}
	G.life.daily["mq:shophelp"] = G.day
	var sold := MqFund.shop_sell(3 + randf() * 3)
	await ctx.say(["你學著梁敬亭的樣子，替客人沏一杯試茶，說說這茶是哪座山、哪股泉水澆出來的。", "客人喝了一口，又買了半斤。", "（站了一個時辰的櫃台）"])
	await ctx.say("\n".join(["（多賣了 %.1f 斤，進帳 %d 兩）" % [sold[0], roundi(sold[1])]] + Chores.growth({"craft": "learning", "exp": 4}) + [Sect.add_contrib(2)]))


# ── 青竹村收租：找柳承安 ───────────────────────────────────

## 柳承安的劇情前面先看這個（處理了回傳 true）：你是外務執事、田租該收了
static func rent_story(ctx: Ctx) -> bool:
	var f := MqFund.fund()
	if not MqFund.hero_out() or not f.has("rent_due"):
		return false
	var due: Dictionary = f.rent_due
	if await ctx.ask(_liu("是鳴泉的外務執事啊，來收%s租的吧？" % due.season), ["收%s租" % due.season, "改天再說"]) != 0:
		return true
	if float(f.crop.f) >= 0.9:
		await ctx.say([_liu("鳴泉的%s租？早湊齊了，%d 兩，你點一點。" % [due.season, due.amount]), _liu("今年雨水順，鄉親們交得爽快。替我問你們掌門好。")])
		var got := MqFund.collect_rent(0)
		load("res://story/mingquan.gd")._aff("liu", 2)
		await ctx.say("（收下%s租 %d 兩，交進公庫）\n（%s）" % [due.season, got, Sect.add_contrib(8)])
		return true
	var amount := int(due.amount)
	await ctx.say(_liu("%s租……唉，今年年成不好，阿牛他們的田收得少。照例是 %d 兩，鄉親們湊得很吃力。" % [due.season, amount]))
	var c := await ctx.ask(_liu("能不能看在幾十年的情分上，減一些？"), ["照收（%d 兩）" % amount, "減一成（%d 兩）" % roundi(amount * 0.9), "減兩成（%d 兩）" % roundi(amount * 0.8)])
	var cut: float = [0.0, 0.1, 0.2][c]
	var got := MqFund.collect_rent(cut)
	if cut == 0:
		load("res://story/mingquan.gd")._aff("liu", -3)
		await ctx.say([_liu("……也是，門派上下幾十口人要吃飯。我去跟鄉親們說。"), "（收下%s租 %d 兩。柳承安的熟悉度 -3）" % [due.season, got]])
	else:
		load("res://story/mingquan.gd")._aff("liu", 4 if cut > 0.15 else 2)
		ctx.fame(2 if cut > 0.15 else 1)
		await ctx.say([_liu("多謝！我替鄉親們謝謝鳴泉。明年風調雨順，一定補上。"), "（收下%s租 %d 兩，減了 %d 兩）" % [due.season, got, roundi(amount * cut)]])
	await ctx.say("（%s）" % Sect.add_contrib(8))
	return true


## 今日事：收租、送茶
static func tasks() -> Array:
	if not Sect.member("mingquan"):
		return []
	var out := []
	var f := MqFund.fund()
	if f.has("rent_due") and MqFund.hero_out():
		out.append({"text": "下山收%s租：到青竹村找柳承安" % f.rent_due.season, "state": "todo", "note": "還有 %d 天" % (int(f.rent_due.due) - G.day + 1)})
	var tea := tea_errand()
	if not tea.is_empty():
		out.append({"text": "送茶進城：%d 斤茶交給泉霧茶莊的梁敬亭" % int(tea.n), "state": "todo", "note": "還有 %d 天" % (int(tea.due) - G.day + 1)})
	return out
