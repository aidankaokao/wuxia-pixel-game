## 鳴泉劍派的公庫（照網頁版 sect_fund.ts、story/mq_fund.ts）：門派要養活自己。
## - 公庫存在 G.life.mq_fund：銀兩、存糧（石）、還沒賣的茶葉（斤）與行情值、藥材（份）、這個月的帳、過去十二個月的月帳、今年的年成。
## - 收入：後山東坡的茶園（明前、雨前最值錢；逢九由韋季安送進臨江城的泉霧茶莊零賣，擺不下的整批賣給茶行）、
##   青竹村祖田的田租（六月初一夏租、十月初一冬租，看年成）、香火、同門接委託與行醫的謝禮、你的捐輸。
## - 支出：名冊上每個人的月例（每天攤一份；見底只發一半）、伙食、存糧不夠時買糧、藥材不夠時買藥、修繕雜項、茶莊工錢、產業工錢。
## - 山田（mq_farm）：水田五月初十夏收麥、九月初一秋收稻，藥圃每天長一點（冬天幾乎不長）；甘伯禾照管，
##   你可以找他（或在山田做事的同門旁邊）幫忙採茶、下田、照料藥圃，一天兩回；下田的照料讓今年收成多一到兩成。
## - 公庫寬裕、吃緊、見底會影響同門長進（growth，life_mingquan 的 new_day 用）。
## - 門派產業（南嶺的伐木場、採石場，擴建的藥圃、茶園）的產出也在這裡結算；營造、小事件、掌門的決策在 story/mq_industry.gd（settle 最後呼叫它的 on_settle）。
## 數值都在檔案開頭。沒有用到旗標（幫忙的次數記在 G.life.daily 的 "mq:field"）。

const Train := preload("res://story/train.gd")
const Chores := preload("res://story/chores.gd")

# ── 數值 ────────────────────────────────────────────────

## 不在名冊上的記名弟子（另有十來人），只吃飯、不領月例
const EXTRA_PUPILS := 12
## 每人每天吃多少糧（石）、菜肉油鹽多少錢
const GRAIN_PER_HEAD := 0.02
const FOOD_PER_HEAD := 0.06
const GRAIN_PRICE := 1.6
const HERB_PRICE := 2.0
## 每週月例：掌門、長老、雜役（弟子照 Sect 的身分）
const PAY := {"掌門": 0, "長老": 30, "雜役": 4, "記名弟子": 5, "正式弟子": 12, "內門弟子": 18, "真傳弟子": 25}
const HERB_GROW := 1.2
const HERB_WINTER := 0.3
const HERB_USE := 1.0
## 夏收麥、秋收稻（月份 0 起算；石，乘上年成）
const HARVEST := [["麥子", 4, 10, 60], ["稻子", 8, 1, 200]]
## 田租（兩，乘上年成）
const RENT := [["夏", 5, 1, 3000], ["冬", 9, 1, 6200]]
const RENT_DAYS := 10
## 泉霧茶莊：架上最多擺幾斤、一天平均賣幾斤、零賣比整批賣多幾成、一天的工錢
const SHOP := {"cap": 150, "demand": 4, "retail": 1.5, "wage": 2}
## 能接委託的人一天平均帶回多少（兩）
const WORK_PER_HEAD := 0.45
## 留著自己用的木料、石料、藥材，多的才賣
const KEEP := {"wood": 30, "stone": 20, "herb": 40}
const HERB_SELL := 1.5
## 修繕用自己的木料、石料：一天用多少，修繕雜項少幾兩
const REPAIR := {"wood": 0.3, "stone": 0.08, "save": 1.0}
## 用度：節儉時伙食、修繕的成數；開源時委託、產業的成數
const THRIFT := {"food": 0.8, "upkeep": 0.7}
const ENTERPRISE := {"work": 1.4, "fac": 1.15}
## 你幫忙一回：採茶多幾斤、照料加幾成收成、藥圃多幾份；一天最多幾回、門派貢獻
const HELP := {"tea": 3, "care": 0.01, "care_max": 0.2, "herb": 3, "per_day": 2, "contrib": 2}
const HELP_STAMINA := 15

## 門派產業的設施：每一級 [營造銀兩, 木料, 石料, 天數, 每天工錢與維持, 產出]
## （伐木場、採石場：每天幾根／幾方；藥圃：每天多幾份；茶園：採茶多幾成）
const FACILITIES := {
	"lumber": {"name": "伐木場", "where": "南嶺西邊的松林", "desc": "砍松木、劈成木料。修屋、營造都用得上，多的送下山賣。",
		"levels": [[0, 0, 0, 0, 2.0, 2.5], [900, 0, 20, 6, 2.8, 4.0]]},
	"quarry": {"name": "採石場", "where": "南嶺東邊的石壁", "desc": "鑿青石、打成石料。鋪路、砌牆、營造都要，城裡的石匠也收。",
		"levels": [[1200, 40, 0, 8, 2.5, 1.5], [1500, 40, 20, 10, 3.5, 2.5]]},
	"herbs": {"name": "藥圃", "where": "山田東南，原本的藥圃旁", "desc": "多闢幾畦藥田。藥房自用以外，多的藥材賣給城裡的藥鋪。",
		"levels": [[500, 20, 10, 4, 0.6, 1.2], [900, 30, 20, 6, 1.0, 2.2]]},
	"teagarden": {"name": "茶園", "where": "山田北坡，茶壟往下多開幾行", "desc": "多種幾行茶。茶季採得多，茶莊賣不完的整批賣給茶行。",
		"levels": [[1500, 30, 20, 10, 0.8, 0.35], [2500, 40, 40, 14, 1.4, 0.7]]},
}
## 木料、石料：名字、單位、賣價、買價
const MATERIAL := {"wood": ["木料", "根", 2.5, 4.0], "stone": ["石料", "方", 5.0, 8.0]}
## 收入、支出的項目（帳本照這個順序列）
const FUND_IN := {"shop": "茶莊", "tea": "賣茶", "wood": "賣木料", "stone": "賣石料", "herbsale": "賣藥材", "rent": "田租", "incense": "香火", "work": "委託行醫", "donate": "捐輸"}
const FUND_OUT := {"pay": "月例", "food": "伙食", "grain": "買糧", "med": "買藥材", "upkeep": "修繕雜項", "shopwage": "茶莊工錢", "facility": "產業工錢", "build": "營造", "leader": "掌門支用"}
const MOOD_NAME := {"rich": "寬裕", "ok": "尚可", "tight": "吃緊", "broke": "見底"}
const MOOD_NEWS := {"rich": "公庫寬裕，卜大勺的伙食裡多了肉", "tight": "公庫吃緊，柯靜言說這陣子什麼都要省著用", "broke": "公庫見底了，這陣子月例只能發一半"}


static func _mq() -> GDScript:
	return load("res://story/mingquan.gd")


static func _life() -> GDScript:
	return load("res://story/life_mingquan.gd")


static func month_key(d := -1) -> int:
	var dt := G.date_of(d)
	return int(dt.year) * 12 + int(dt.month)


## 公庫（還沒有就照開局的家底建一份）
static func fund() -> Dictionary:
	if not G.life.has("mq_fund"):
		G.life.mq_fund = {"silver": 5000.0, "grain": 120.0, "tea": 0.0, "tea_value": 0.0, "herb": 30.0,
			"month": {"key": month_key(), "in": {}, "out": {}}, "books": [], "crop": {"year": int(G.date_of().year), "f": 1.0, "care": 0.0},
			"shop": {"tea": 20.0, "tea_value": 100.0, "sold": 0.0}, "wood": 20.0, "stone": 0.0, "fac": {"lumber": 1}}
	return G.life.mq_fund


## 記一筆帳：收入加進公庫、支出從公庫扣
static func book(kind: String, item: String, n: float) -> void:
	if n <= 0:
		return
	var f := fund()
	f.silver = float(f.silver) + (n if kind == "in" else -n)
	f.month[kind][item] = float(f.month[kind].get(item, 0.0)) + n


static func _sum(r: Dictionary) -> float:
	var s := 0.0
	for k in r:
		s += float(r[k])
	return s


static func month_in(m: Dictionary) -> float:
	return _sum(m.in)


static func month_out(m: Dictionary) -> float:
	return _sum(m.out)


## 一個月大約開銷多少（看上個月的帳；還沒有帳就用估計值）
static func monthly_out() -> float:
	var books: Array = fund().books
	var n := month_out(books[-1]) if books.size() > 0 else 0.0
	return n if n > 0 else 1400.0


## 公庫的好壞：寬裕（夠撐半年）、尚可、吃緊（不到一個半月）、見底
static func mood() -> String:
	var s := float(fund().silver)
	var m := monthly_out()
	if s <= 0:
		return "broke"
	if s < m * 1.5:
		return "tight"
	return "rich" if s >= m * 6 else "ok"


## 月例發幾成：掌門定的成數；見底再減半
static func pay_rate() -> float:
	return (0.5 if float(fund().silver) <= 0 else 1.0) * float(fund().get("pay_scale", 1.0))


## 公庫好壞對同門長進的影響
static func growth() -> float:
	var f := fund()
	var pay := 1.0 + (float(f.get("pay_scale", 1.0)) - 1.0) * 0.2
	var eco := 0.97 if f.get("economy", "normal") != "normal" else 1.0
	return {"rich": 1.05, "ok": 1.0, "tight": 0.97, "broke": 0.9}[mood()] * pay * eco


## 這一天是哪一季茶：[名字, 一天採幾斤, 一斤值幾兩]（不是茶季是空的）
static func tea_season(d := -1) -> Array:
	var dt := G.date_of(d)
	var m: int = dt.month
	var dd: int = dt.date
	if m == 2 and dd <= 15:
		return ["明前茶", 5, 16]
	if (m == 2 and dd > 15) or (m == 3 and dd <= 15):
		return ["雨前茶", 8, 8]
	if m == 4 or m == 5:
		return ["夏茶", 10, 3]
	if m == 7:
		return ["秋茶", 8, 3.5]
	return []


static func fac_level(id: String) -> int:
	return int(fund().get("fac", {}).get(id, 0))


## 這座設施目前這一級的資料（沒蓋是空的）：[營造, 木料, 石料, 天數, 工錢, 產出]
static func fac_now(id: String) -> Array:
	var lv := fac_level(id)
	return FACILITIES[id].levels[lv - 1] if lv > 0 else []


## 產業的小事件（mq_industry.gd）：現在是這一種嗎
static func event_on(kind: String) -> Dictionary:
	var e: Dictionary = fund().get("event", {})
	return e if e.get("kind", "") == kind else {}


static func tea_price() -> float:
	return float(event_on("teaprice").get("mult", 1.0))


## 你現在是不是外務執事（收租、送茶的差事落在你身上；職位見 story/mq_order.gd）
static func hero_out() -> bool:
	return Sect.member("mingquan") and G.sect.get("post", "") == "st_out" and not G.sect.get("leader", false)


static func _news(text: String) -> void:
	_life()._news(text, [])


# ── 名冊算人頭與月例 ────────────────────────────────────

## 名冊上的人（不含你）照位階每週領多少；久未回山的不算
static func weekly_pay() -> float:
	var sum := 0.0
	for m in _mq().ROSTER:
		if String(m[2]).contains("久未回山"):
			continue
		sum += float(PAY.get(_mq()._roster_rank(m), 0))
	return sum


static func heads() -> int:
	return _mq().ROSTER.size() + EXTRA_PUPILS + (1 if Sect.member("mingquan") else 0)


## 能接委託、出去行醫的人（正式弟子以上、長老）
static func capable() -> int:
	return _mq().ROSTER.filter(func(m): return not _mq()._roster_rank(m) in ["記名弟子", "雜役", "掌門"]).size()


## 茶莊賣掉幾斤（最多賣到架上沒有）；回傳 [斤, 兩]
static func shop_sell(want: float) -> Array:
	var shop: Dictionary = fund().shop
	var n := minf(want, float(shop.tea))
	if n <= 0:
		return [0.0, 0.0]
	var v := float(shop.tea_value) / float(shop.tea) * n
	shop.tea = float(shop.tea) - n
	shop.tea_value = float(shop.tea_value) - v
	shop.sold = float(shop.sold) + n
	var silver := v * SHOP.retail * tea_price()
	book("in", "shop", silver)
	return [n, silver]


## 收下田租（cut 是減免幾成，0–1）
static func collect_rent(cut: float) -> int:
	var f := fund()
	if not f.has("rent_due"):
		return 0
	var got := roundi(float(f.rent_due.amount) * (1.0 - cut))
	book("in", "rent", got)
	f.erase("rent_due")
	return got


# ── 每天半夜結算 ─────────────────────────────────────────

static func new_day() -> void:
	settle()


## 結算一天：昨天的產出、今天的開銷與收入
static func settle() -> void:
	var f := fund()
	var d := G.date_of()
	if month_key() != int(f.month.key):
		var books: Array = f.books
		var closed: Dictionary = f.month.duplicate(true)
		closed.silver = roundi(float(f.silver))
		books.append(closed)
		f.books = books.slice(-12)
		f.month = {"key": month_key(), "in": {}, "out": {}}
		f.shop.sold = 0.0
	if int(f.crop.year) != int(d.year):
		f.crop = {"year": int(d.year), "f": 0.8 + randf() * 0.35, "care": 0.0}
	var wet := G.weather in ["rain", "snow"]
	var eco: String = f.get("economy", "normal")
	# 昨天採的茶（下雨不採；擴建過的茶園採得多）
	var tea := tea_season(G.day - 1)
	if tea.size() > 0 and not wet:
		var tg := fac_now("teagarden")
		var n := float(tea[1]) * (0.8 + randf() * 0.4) * (1.0 + (float(tg[5]) if tg.size() > 0 else 0.0))
		f.tea = float(f.tea) + n
		f.tea_value = float(f.tea_value) + n * float(tea[2])
	# 藥圃長的（擴建的藥畦多長；鬧蟲害不長）、藥房用的
	var winter := int(G.date_of(G.day - 1).month) in [10, 11, 0]
	if event_on("blight").is_empty():
		var hb := fac_now("herbs")
		f.herb = float(f.herb) + (HERB_GROW + (float(hb[5]) if hb.size() > 0 else 0.0)) * (HERB_WINTER / HERB_GROW if winter else 1.0)
	f.herb = float(f.herb) - HERB_USE
	if float(f.herb) < 0:
		book("out", "med", -float(f.herb) * HERB_PRICE)
		f.herb = 0.0
	# 吃飯
	var n := heads()
	f.grain = float(f.grain) - n * GRAIN_PER_HEAD
	if float(f.grain) < 0:
		book("out", "grain", -float(f.grain) * GRAIN_PRICE)
		f.grain = 0.0
	book("out", "food", n * FOOD_PER_HEAD * (THRIFT.food if eco == "thrift" else 1.0))
	# 月例（每天攤一份）
	book("out", "pay", weekly_pay() / 7.0 * pay_rate())
	# 修繕雜項：有自己的木料、石料就少花一些
	var upkeep := 1.5 + randf()
	if float(f.wood) >= REPAIR.wood and float(f.stone) >= REPAIR.stone:
		f.wood = float(f.wood) - REPAIR.wood
		f.stone = float(f.stone) - REPAIR.stone
		upkeep -= REPAIR.save
	book("out", "upkeep", upkeep * (THRIFT.upkeep if eco == "thrift" else 1.0))
	# 香火（節慶多）、委託行醫（開源時多接）
	book("in", "incense", (3 + randf() * 6) * (4 if G.festival_of() != "" else 1))
	book("in", "work", capable() * WORK_PER_HEAD * (0.5 + randf()) * (ENTERPRISE.work if eco == "enterprise" else 1.0))
	# 南嶺的伐木場、採石場：昨天的產出（有人幫工才出得足；下雨、旬休少；失火、塌方停工），每座設施付工錢
	var crew: Dictionary = _life().crew_of(G.day - 1) if _life().has_method("crew_of") else {}
	for id in FACILITIES:
		var lv := fac_now(id)
		if lv.is_empty():
			continue
		book("out", "facility", float(lv[4]))
		if not id in ["lumber", "quarry"] or not event_on("fire" if id == "lumber" else "collapse").is_empty():
			continue
		var vein := float(event_on("vein").get("mult", 1.0)) if id == "quarry" else 1.0
		var got := float(lv[5]) * (1.0 if crew.has(id) else 0.7) * (0.3 if wet else 1.0) * (0.5 if G.is_xunxiu(G.day - 1) else 1.0) \
			* (ENTERPRISE.fac if eco == "enterprise" else 1.0) * vein * (0.85 + randf() * 0.3)
		var key := "wood" if id == "lumber" else "stone"
		f[key] = float(f[key]) + got
	# 收成
	for h in HARVEST:
		if int(d.month) == h[1] and int(d.date) == h[2]:
			var got := roundi(float(h[3]) * (float(f.crop.f) + float(f.crop.care)))
			f.grain = float(f.grain) + got
			_news("山田的%s收了，入倉 %d 石" % [h[0], got])
	# 田租：你是外務執事就等你下山收（十天內），否則照常收進來
	for r in RENT:
		if int(d.month) == r[1] and int(d.date) == r[2]:
			var amount := roundi(float(r[3]) * float(f.crop.f))
			if hero_out():
				f.rent_due = {"season": r[0], "amount": amount, "due": G.day + RENT_DAYS - 1}
				_news("%s租該收了，外務執事要下山到青竹村找柳承安收租" % r[0])
			else:
				book("in", "rent", amount)
				_news("青竹村的佃戶送來%s租 %d 兩%s" % [r[0], amount, "（年成不好，少收了些）" if float(f.crop.f) < 0.9 else ""])
	if f.has("rent_due") and G.day > int(f.rent_due.due):
		book("in", "rent", float(f.rent_due.amount))
		_news("%s租拖著沒收，韋季安代外務執事下山收了 %d 兩" % [f.rent_due.season, int(f.rent_due.amount)])
		f.erase("rent_due")
	# 初九、十九、廿九：韋季安把製茶房的茶送進城裡的茶莊；多的木料、石料、藥材也一起帶下山賣
	var shop: Dictionary = f.shop
	if int(d.date) % 10 == 9:
		if float(f.tea) >= 1:
			shop.tea = float(shop.tea) + float(f.tea)
			shop.tea_value = float(shop.tea_value) + float(f.tea_value)
			_news(("韋季安把 %d 斤茶整批賣給了城裡的茶行" if shop.get("closed", false) else "韋季安把 %d 斤茶送進臨江城的泉霧茶莊") % roundi(float(f.tea)))
			f.tea = 0.0
			f.tea_value = 0.0
		for k in ["wood", "stone"]:
			var extra := floorf(float(f[k]) - KEEP[k])
			if extra >= 1:
				book("in", k, extra * float(MATERIAL[k][2]) * (0.9 + randf() * 0.2))
				f[k] = float(f[k]) - extra
		var hx := floorf(float(f.herb) - KEEP.herb)
		if hx >= 1:
			book("in", "herbsale", hx * HERB_SELL * (0.9 + randf() * 0.2))
			f.herb = float(f.herb) - hx
	# 茶莊擺不下的（或茶莊收了）整批賣給茶行
	var cap := 0.0 if shop.get("closed", false) else float(SHOP.cap)
	if float(shop.tea) > cap:
		var n2 := float(shop.tea) - cap
		var v := float(shop.tea_value) / float(shop.tea) * n2
		book("in", "tea", v * (0.9 + randf() * 0.2) * tea_price())
		shop.tea = float(shop.tea) - n2
		shop.tea_value = float(shop.tea_value) - v
	# 茶莊零賣：一天幾斤（旬休趕集、節慶多）；地痞鬧事時沒生意；收起來就不用付工錢
	if not shop.get("closed", false):
		if event_on("thugs").is_empty():
			shop_sell(SHOP.demand * (0.6 + randf() * 0.8) * (1.8 if G.is_xunxiu() else 1.0) * (1.5 if G.festival_of() != "" else 1.0))
		book("out", "shopwage", SHOP.wage)
	# 營造、小事件、掌門的決策（story/mq_industry.gd）
	if ResourceLoader.exists("res://story/mq_industry.gd"):
		load("res://story/mq_industry.gd").on_settle()
	var m := mood()
	if f.has("mood") and m != f.mood:
		var text: String = MOOD_NEWS.get(m, "公庫總算緩過來了" if f.mood in ["tight", "broke"] else "")
		if text != "":
			_news(text)
	f.mood = m


# ── 甘伯禾：山田的活兒 ─────────────────────────────────────

## 這個時節山田最缺人做什麼：[id, 名字, 動畫]
static func job_now() -> Array:
	if tea_season().size() > 0:
		return ["tea", "採茶", "garden"]
	if int(G.date_of().month) >= 3 and int(G.date_of().month) <= 8:
		return ["field", "下田", "farm"]
	return ["herb", "照料藥圃", "garden"]


const JOB_GROW := {"tea": {"slot": "light", "exp": 8}, "field": {"slot": "outer", "exp": 10}, "herb": {"craft": "learning", "exp": 4}}


static func helped() -> int:
	var d: Dictionary = G.life.get("daily", {})
	return int(d.get("mq:field_n", 0)) if int(d.get("mq:field", 0)) == G.day else 0


static func _mark_help() -> void:
	if not G.life.has("daily"):
		G.life.daily = {}
	G.life.daily["mq:field_n"] = helped() + 1
	G.life.daily["mq:field"] = G.day


static func _gan(t: String) -> Dictionary:
	return {"speaker": "甘伯禾", "text": t}


## 做一回山田的活兒：幫甘伯禾，或在正在做事的同門旁邊一起做（who 是他的名字）
static func help_once(ctx: Ctx, who := "") -> void:
	var job := job_now()
	if helped() >= HELP.per_day:
		await ctx.say(_gan("今天的活兒差不多了，剩下的我自己來。明天再來吧。"))
		return
	if G.weather in ["rain", "snow"]:
		await ctx.say(_gan("下著雨，茶菁採下來會悶壞，田裡也踩不得。改天吧。"))
		return
	if not await Train.exert(ctx, HELP_STAMINA, "累得腰都直不起來，這活兒今天是幹不動了。"):
		return
	# 藥圃鬧蟲害（mq_industry 的小事件）：先除蟲，事情就解決了
	if not event_on("blight").is_empty():
		await ctx.say(_gan("先別管別的，藥圃的蟲要緊！拿這把草木灰，一株株撒在葉子底下。"))
		await ctx.work("garden", "除蟲中……")
		ctx.pass_time(8)
		_mark_help()
		fund().erase("event")
		await ctx.say(["你蹲在藥畦間，一片片翻開葉子撒灰、捉蟲。一個時辰下來，蟲總算除乾淨了。", _gan("好！這一季的藥材保住了。"), "（做了一個時辰）"])
		await ctx.say("\n".join(Chores.growth({"craft": "learning", "exp": 6}) + [Sect.add_contrib(8)]))
		return
	if who != "":
		await ctx.say("你在%s旁邊跟著%s，兩人一邊做一邊閒聊。" % [who, job[1]])
	else:
		await ctx.say(_gan({"tea": "來得正好！竹簍在那兒，只採一芽一葉，老葉別碰。", "field": "田裡正缺人手。鞋脫了，跟我下來。"}.get(job[0], "冬天沒什麼好採的，幫我把藥圃和田埂收拾收拾。")))
	await ctx.work(job[2], "%s中……" % job[1])
	ctx.pass_time(8)
	_mark_help()
	var f := fund()
	var effect := ""
	match job[0]:
		"tea":
			var t := tea_season()
			f.tea = float(f.tea) + HELP.tea
			f.tea_value = float(f.tea_value) + HELP.tea * float(t[2])
			effect = "（多採了 %d 斤%s，約值 %d 兩）" % [HELP.tea, t[0], roundi(HELP.tea * float(t[2]))]
		"field":
			f.crop.care = minf(HELP.care_max, float(f.crop.care) + HELP.care)
			effect = "（今年山田的收成多了一分指望：照料 %d/%d）" % [roundi(float(f.crop.care) * 100), roundi(HELP.care_max * 100)]
		_:
			f.herb = float(f.herb) + HELP.herb
			effect = "（藥圃多收了 %d 份藥材）" % HELP.herb
	var lines := _job_lines(job[0])
	await ctx.say(lines + ["（做了一個時辰）"])
	await ctx.say("\n".join([effect] + Chores.growth(JOB_GROW[job[0]]) + [Sect.add_contrib(HELP.contrib)]))
	await load("res://story/schedule.gd").maybe_event(ctx, "chore")


static func _job_lines(id: String) -> Array:
	match id:
		"tea":
			var t := tea_season()
			if float(t[2]) >= 7:
				return ["你背起竹簍，在茶壟間一芽一葉地採。%s嫩得掐得出水，指尖沾滿了茶香。" % t[0], "一個時辰下來，竹簍裡鋪了薄薄一層。"]
			return ["%s的葉子粗些，不必挑得那麼細。你背著竹簍在茶壟間來回，手上越採越快。" % t[0], "一個時辰下來，竹簍裝了大半簍。"]
		"field":
			return ["你挽起褲管下田插秧，一株株秧苗排得筆直。" if int(G.date_of().month) <= 4 else "你在田裡拔草、疏通水溝，太陽曬得背上發燙。", "彎腰彎了一個時辰，起身時腰都直不起來了。"]
	return ["你給藥圃鬆土、蓋上稻草擋霜，又把田埂被雨沖垮的地方補好。", "冬天的山田冷清，倒是幹活的好時候。"]


## 山田今年的情形
static func farm_report() -> Array:
	var f := fund()
	var d := G.date_of()
	var tea := tea_season()
	var out := []
	if tea.size() > 0:
		out.append("眼下是%s的時候，晴天一天能採七、八斤到十來斤。%s" % [tea[0], "這茶金貴，一斤賣得到好幾兩。" if float(tea[2]) >= 7 else ""])
	elif int(d.month) < 2:
		out.append("茶樹還在歇著，到了三月初一，明前茶就能開採了。")
	else:
		out.append("今年的茶季過了，茶樹要養著，明年才好。")
	if int(d.month) >= 3:
		out.append("今年雨水還算順，田裡的稻子長得不錯。" if float(f.crop.f) + float(f.crop.care) >= 1 else "今年雨水不調，稻子長得不如往年，只能多照料些。")
	out.append("製茶房裡存著 %d 斤茶，倉裡有糧 %d 石，藥圃收的藥材 %d 份。" % [roundi(float(f.tea)), roundi(float(f.grain)), roundi(float(f.herb))])
	return out.map(func(t): return _gan(t))


static func gan_talk(ctx: Ctx) -> void:
	if not Sect.member("mingquan"):
		await ctx.say([_gan("這片茶園是鳴泉的祖產，泉水澆出來的茶，山下叫它「泉霧茶」。"), _gan("你是來看風景的吧？看可以，別踩了我的茶壟。")])
		return
	var job := job_now()
	var blight := not event_on("blight").is_empty()
	var greet: String = "藥圃鬧蟲害了，愁死人！" if blight else "%s。有什麼事？" % {"tea": "茶季忙得很", "field": "田裡活兒多"}.get(job[0], "冬天山田清閒些")
	var c := await ctx.ask(_gan(greet), ["%s（一個時辰・體力 %d）%s" % ["幫忙除蟲" if blight else "幫忙" + job[1], HELP_STAMINA, "（今天做夠了）" if helped() >= HELP.per_day else ""], "山田的情形", "沒事"])
	if c == 0:
		await help_once(ctx)
	elif c == 1:
		await ctx.say(farm_report())


## 在山田做事的同門旁邊一起做（life_mingquan.options 轉過來）
static func help_with(ctx: Ctx) -> void:
	await help_once(ctx, Life.npc_def(Life.group("mingquan"), ctx.extra.npc).get("name", ""))


static func farm_sign(ctx: Ctx) -> void:
	await ctx.say("「鳴泉山田」\n北坡茶園・西南水田・東南藥圃\n本門祖產，收成歸公庫。茶壟、田埂不得踐踏。")


static func tea_rack(ctx: Ctx) -> void:
	await ctx.say(["竹匾上攤著今天採下的茶菁，等著進製茶房炒青。" if tea_season().size() > 0 else "空著的竹匾疊在架上，茶季過了。",
		"（製茶房裡存著 %d 斤茶，等韋季安下山時帶去賣）" % roundi(float(fund().tea))])


## 今日事：茶季、農忙
static func tasks() -> Array:
	if not Sect.member("mingquan"):
		return []
	var d := G.date_of()
	var tea := tea_season()
	var busy := ""
	if tea.size() > 0 and float(tea[2]) >= 7:
		busy = "%s開採，山田缺人手" % tea[0]
	elif (int(d.month) == 4 and int(d.date) >= 5 and int(d.date) <= 12) or (int(d.month) == 7 and int(d.date) >= 26) or (int(d.month) == 8 and int(d.date) <= 3):
		busy = "農忙，山田缺人手"
	if busy == "":
		return []
	return [{"text": "%s（後山東坡找甘伯禾幫忙）" % busy, "state": "done" if helped() >= HELP.per_day else "todo", "note": ""}]


## 看得到公庫細帳的人：內門弟子以上、擔任職位、掌門
static func can_see_books() -> bool:
	return Sect.member("mingquan") and (int(G.sect.rank) >= 2 or G.sect.get("post", "") != "" or G.sect.get("leader", false))


## 開發用：照現在的狀態跑幾年結算，印出每月月底結餘（run:mq_fund/sim）
static func sim(_ctx: Ctx) -> void:
	var d0 := G.day
	for i in 360 * 4:
		G.day += 1
		G.weather = "rain" if randf() < 0.2 else "clear"
		# 照遊戲裡的半夜更新跑（同門升身分、年會選舉都會影響月例）
		for f in G._new_day:
			f.call()
		if G.date_of().date == 1 and int(G.date_of().month) == 0:
			print("FUND 第%d年 銀兩 %d 糧 %d 藥 %d 設施 %s" % [G.date_of().year, fund().silver, fund().grain, fund().herb, fund().fac])
			# 去年各項收支
			var tin := {}
			var tout := {}
			for b in fund().books:
				for k in b.in:
					tin[k] = roundi(float(tin.get(k, 0)) + float(b.in[k]))
				for k in b.out:
					tout[k] = roundi(float(tout.get(k, 0)) + float(b.out[k]))
			print("FUND   收 ", tin, "\nFUND   支 ", tout)
	print("FUND 最後一個月 收 %d 支 %d" % [month_in(fund().books[-1]), month_out(fund().books[-1])])
	G.day = d0
