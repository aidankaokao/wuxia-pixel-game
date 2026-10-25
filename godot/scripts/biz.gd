class_name Biz
## 房產與經營的規則與數值（照網頁版 property.ts、shop.ts、shop_manage.ts）：純計算，會問話的事在 story/property.gd、shop.gd、shop_events.gd、managers.gd。
## 狀態都在 G.life（存檔）：
## - property：{listings 出售告示, owned 名下的房子, selling 掛出去賣的, payout 賣掉還沒領的錢, next 幾時再貼新告示}
## - shops：物件 id → 店 {type, name, level, stock, price, staff, till 櫃上的錢, ledger 近十天, opened, served, event, lastEvent,
##   raises, safeUntil, ruffianBeaten, buzz, guard, supply, staffInfo, yearly, bonusDay, days 每日帳, months 每月帳}
## - biz：{visited 去過的城, contracts 供應商合約, signed, managers 掌櫃, policy 總號方針, vault 總號帳房, vault_log}
## JSON 讀回來的數字都是小數，用的時候一律 int()／float()。

# ── 房產（臨江城） ──────────────────────────────────────

## 物件：在哪張地圖的哪棟建築（bx, by 是建築的 x, y）、民居 house／空店面 shop／照舊經營的老店 business、屋主、屋況一級的行情、每旬租金（老店是分紅）
const PROPERTIES := [
	# 城南：臨街的空店面（買下可以開店）
	{"id": "ljs_west", "name": "城南西街鋪面", "map": "linjiang", "bx": 7, "by": 33, "kind": "shop", "owner": "柯老三", "base": 440, "rent": 8, "desc": "西街口的鋪面，離城門近，挑夫行商常經過。"},
	{"id": "ljs_east", "name": "城南東街鋪面", "map": "linjiang", "bx": 47, "by": 33, "kind": "shop", "owner": "鄧阿福", "base": 520, "rent": 10, "desc": "臨街的單間鋪面，後頭帶一間小庫房，人來人往。"},
	{"id": "ljs_dock", "name": "碼頭大街鋪面", "map": "linjiang", "bx": 40, "by": 46, "kind": "shop", "owner": "史大娘", "base": 480, "rent": 9, "desc": "通碼頭的大街上，一早就有卸貨的腳夫進進出出。"},
	# 城南：照舊經營的老店（偶爾轉讓；買下只能照原本的生意做，原班人馬留下，東家每旬分紅）
	{"id": "ljb_pawn", "name": "和記當鋪", "map": "linjiang", "bx": 16, "by": 31, "kind": "business", "owner": "和守義", "base": 1600, "rent": 32, "desc": "城裡的老當鋪，收當、死當貨都有，掌櫃和守義眼光毒。"},
	{"id": "ljb_inn", "name": "雲來客棧", "map": "linjiang", "bx": 8, "by": 40, "kind": "business", "owner": "賀長年", "base": 2200, "rent": 44, "desc": "城南的客棧，南來北往的客人都在這兒落腳、打聽消息。"},
	{"id": "ljb_tower", "name": "望江樓", "map": "linjiang", "bx": 41, "by": 40, "kind": "business", "owner": "封老爺", "base": 3000, "rent": 64, "desc": "臨江城頭一份的酒樓，樓上看得見大江。"},
	{"id": "ljb_cloth", "name": "錦繡布莊", "map": "linjiang", "bx": 40, "by": 32, "kind": "business", "owner": "魏錦娘", "base": 1400, "rent": 28, "desc": "魏錦娘的布莊。", "never": true},
	{"id": "ljb_clinic", "name": "回春堂", "map": "linjiang", "bx": 16, "by": 24, "kind": "business", "owner": "白濟仁", "base": 1800, "rent": 36, "desc": "白濟仁的藥鋪。", "never": true},
	# 民居（自住、出租）
	{"id": "ljn_7_6", "name": "城北西巷民居", "map": "linjiang", "bx": 7, "by": 6, "kind": "house", "owner": "孫家", "base": 380, "rent": 6, "desc": "一進的瓦房，鄰居愛搓麻將，晚上熱鬧些。"},
	{"id": "ljn_17_13", "name": "城北黃狗巷小屋", "map": "linjiang", "bx": 17, "by": 13, "kind": "house", "owner": "丁大腳", "base": 260, "rent": 4, "desc": "一間小屋，便宜，住一個人剛好。"},
	{"id": "ljn_40_7", "name": "城北蘭花巷民居", "map": "linjiang", "bx": 40, "by": 7, "kind": "house", "owner": "溫秀才", "base": 380, "rent": 6, "desc": "屋主愛養蘭花，窗台、院子都擺滿了花盆。"},
	{"id": "ljn_46_6", "name": "城北書聲巷民居", "map": "linjiang", "bx": 46, "by": 6, "kind": "house", "owner": "洪先生", "base": 380, "rent": 6, "desc": "屋主是教書先生，屋裡傳來孩子背書的聲音。"},
	{"id": "ljn_45_16", "name": "城北牽牛花小院", "map": "linjiang", "bx": 45, "by": 16, "kind": "house", "owner": "方婆婆", "base": 420, "rent": 7, "desc": "院牆爬滿牽牛花的小院，夏天很涼快。"},
	{"id": "ljm_6_24", "name": "城西門神巷小屋", "map": "linjiang", "bx": 6, "by": 24, "kind": "house", "owner": "蘇寡婦", "base": 300, "rent": 5, "desc": "一間小屋，門上的門神有些年頭了。"},
	{"id": "ljm_50_24", "name": "城東燉肉巷民居", "map": "linjiang", "bx": 50, "by": 24, "kind": "house", "owner": "胖嬸", "base": 360, "rent": 6, "desc": "一進的瓦房，隔壁天天燉肉，香得人發慌。"},
	{"id": "ljs_7_50", "name": "城南花貓巷民居", "map": "linjiang", "bx": 7, "by": 50, "kind": "house", "owner": "鍾裁縫", "base": 360, "rent": 6, "desc": "一進的瓦房，門口常有一隻花貓打盹。"},
	{"id": "ljs_50_44", "name": "城南喜字巷民居", "map": "linjiang", "bx": 50, "by": 44, "kind": "house", "owner": "閻家", "base": 400, "rent": 7, "desc": "剛辦過喜事的人家，新媳婦嫌屋子小，想換大的。"},
]
const CONDITION := ["", "舊屋", "修過", "翻新"]
const COND_MULT := [0.0, 1.0, 1.25, 1.55]
## 修繕到下一級的費用（佔基本價的比例）
const REPAIR_COST := [0.0, 0.25, 0.4]
## 牙人的佣金（成交價的比例）
const AGENT_FEE := 0.03
const MAX_LISTINGS := 3
## 一旬幾天（收租、分紅的週期）
const XUN := 10
## 招租以後，租客幾天內住進來
const TENANT_DAYS := 2
const TENANTS := ["鄭秀才", "馬貨郎", "褚木匠", "蔡大嫂", "侯鏢師", "吳挑夫", "易書生", "韋寡婦", "彭小販", "桂繡娘"]
const REASONS := ["舉家搬往州城", "欠了賭債，急著周轉", "年紀大了，要回鄉下養老", "兒子在外地成了家，要過去團聚", "生意賠了本，想換點現銀", "嫌屋子小，想換大的", "分家，兄弟要把房子折成銀子分"]
const BIZ_REASONS := ["東家年紀大了，兒孫無意接手", "東家要到州城開分號，這邊想找人接手", "東家欠了一筆大債，忍痛轉讓", "東家想回鄉下享清福"]


static func prop_def(id: String) -> Dictionary:
	for p in PROPERTIES:
		if p.id == id:
			return p
	# 樣板城鎮裡自己買地蓋的鋪面（town_gen.gd）
	return TownGen.lot_prop(id)


static func prop_at(map: String, x: int, y: int) -> Dictionary:
	for p in PROPERTIES:
		if p.map == map and int(p.bx) == x and int(p.by) == y:
			return p
	return TownGen.lot_prop_at(map, x, y)


static func market() -> Dictionary:
	if not G.life.has("property"):
		G.life.property = {"listings": [], "owned": {}, "selling": {}, "payout": {}, "next": 0}
	return G.life.property


static func owned(id: String) -> Dictionary:
	return market().owned.get(id, {})


static func _r10(n: float) -> int:
	return roundi(n / 10.0) * 10


static func value_of(p: Dictionary, cond := 1) -> int:
	return _r10(float(p.base) * COND_MULT[cond])


static func rent_of(p: Dictionary, cond := 1) -> int:
	return roundi(float(p.rent) * COND_MULT[cond])


## 租客：同一間房子的租客固定
static func tenant_of(id: String) -> String:
	var h := 0
	for c in id:
		h += c.unicode_at(0)
	return TENANTS[h % TENANTS.size()]


static func tenant_in(o: Dictionary, day := -1) -> bool:
	var d := G.day if day < 0 else day
	return o.get("use", "") == "rent" and o.has("rentFrom") and d >= int(o.rentFrom) + TENANT_DAYS


## 欠著沒收的房租（整旬才算一次）；老店是分紅，從買下那天算起。回傳 [兩, 旬數]
static func rent_due(p: Dictionary, o: Dictionary, day := -1) -> Array:
	var d := G.day if day < 0 else day
	var ev: Dictionary = o.get("event", {})
	if p.kind == "business":
		if o.use != "business":
			return [0, 0]
		var xun := (d - int(o.get("rentPaidTo", o.day))) / XUN
		return [xun * rent_of(p, int(o.cond)), xun]
	if not tenant_in(o, d) or ev.get("kind", "") == "late":
		return [0, 0]
	var from := int(o.get("rentPaidTo", int(o.rentFrom) + TENANT_DAYS))
	var xun2 := (d - from) / XUN
	var leaking: bool = ev.get("kind", "") == "leak" and d - int(ev.day) > 5
	return [roundi(xun2 * rent_of(p, int(o.cond)) * (0.5 if leaking else 1.0)), xun2]


## 掛出去賣：擲好成交天數與價錢（市價：自己 4–10 天、九成到一成二；牙人 3–6 天、一成到一成五。降價：自己 1–2 天、五到八成；牙人 1 天、六成五到八成）
static func roll_sale(paid: int, mode: String, agent: bool) -> Dictionary:
	var r: Array = ([3, 6, 1.0, 1.15] if agent else [4, 10, 0.9, 1.2]) if mode == "market" else ([1, 1, 0.65, 0.8] if agent else [1, 2, 0.5, 0.8])
	return {"mode": mode, "agent": agent, "until": G.day + roundi(lerpf(r[0], r[1], randf())), "price": _r10(paid * lerpf(r[2], r[3], randf()))}


## 更新市場：撕掉過期的告示、貼新的出售告示、把到期的買賣成交（每天半夜、看公告欄、找師爺或牙人時呼叫）
static func refresh_market() -> void:
	var m := market()
	m.listings = (m.listings as Array).filter(func(l): return int(l.until) >= G.day and not m.owned.has(l.id))
	for id in m.selling.keys():
		var s: Dictionary = m.selling[id]
		if G.day < int(s.until):
			continue
		m.selling.erase(id)
		m.owned.erase(id)
		m.payout[id] = roundi(float(s.price) * (1.0 - AGENT_FEE if s.agent else 1.0))
	if G.day < int(m.next):
		return
	# 頭一回：先貼兩張，第一張一定是店面
	var first := int(m.next) == 0
	m.next = G.day + 2 + randi() % 3
	for k in (2 if first else 1):
		if (m.listings as Array).size() >= MAX_LISTINGS:
			return
		var pool := PROPERTIES.filter(func(p): return not p.get("never", false) and not m.owned.has(p.id) and not m.listings.any(func(l): return l.id == p.id) and not m.payout.has(p.id))
		if pool.is_empty() or (not first and randf() < 0.25):
			return
		var shops := pool.filter(func(p): return p.kind == "shop")
		var p: Dictionary = shops.pick_random() if first and k == 0 and shops.size() > 0 else pool.pick_random()
		# 老店難得轉讓：抽中老店時只有兩成真的貼出來
		if p.kind == "business" and (first or randf() >= 0.2):
			var others := pool.filter(func(x): return x.kind != "business")
			if others.size() > 0:
				p = others[0]
		var biz: bool = p.kind == "business"
		m.listings.append({"id": p.id, "price": _r10(value_of(p) * (0.85 + randf() * 0.3)), "until": G.day + (10 if biz else 6) + randi() % 7,
			"reason": (BIZ_REASONS if biz else REASONS).pick_random()})


# ── 稱號 ────────────────────────────────────────────────

const BIZ_TITLE := "東家"


static func has_title() -> bool:
	return BIZ_TITLE in G.hero.get("titles", [])


# ── 店 ──────────────────────────────────────────────────

## 店種：名字、幌子的字、要哪門技能、小店一天幾位客人、客人帶多少錢、四季的生意
const SHOP_TYPES := {
	"restaurant": {"name": "飯館", "flag": "飯", "craft": "cooking", "base": 8, "budget": 25, "season": [1.0, 0.95, 1.05, 1.1], "desc": "賣自己做的菜。客人最多，菜也賣得最快。"},
	"cloth": {"name": "布莊", "flag": "布", "craft": "weaving", "base": 5, "budget": 55, "season": [1.0, 0.8, 1.2, 1.25], "desc": "賣自己織的衣物與手上的服飾。客人少，但一件值錢；秋冬生意好。"},
	"fish": {"name": "魚鋪", "flag": "魚", "craft": "fishing", "base": 8, "budget": 12, "season": [1.05, 1.1, 1.0, 0.85], "desc": "賣自己釣的魚、曬的魚乾、湖產與海產。"},
	"goods": {"name": "雜貨鋪", "flag": "雜", "craft": "", "base": 7, "budget": 20, "season": [1.0, 1.0, 1.0, 1.0], "desc": "誰都能開：藥品、食材、雜物都能擺。別處買進來、這裡加價賣出去。"},
}
const TYPE_ORDER := ["restaurant", "cloth", "fish", "goods"]
const CRAFT_NAME := {"cooking": "烹飪", "weaving": "紡織", "fishing": "釣魚"}
## 店的等級：名稱、客人倍數、貨架能擺幾種、能雇幾個夥計、升到這一級的費用
const SHOP_LEVELS := [
	{"name": "小店", "mult": 1.0, "slots": 6, "staff": 1, "cost": 0},
	{"name": "店鋪", "mult": 1.4, "slots": 10, "staff": 2, "cost": 300},
	{"name": "老字號", "mult": 1.8, "slots": 16, "staff": 3, "cost": 900},
]
## 定價：賣價倍數、客人多寡
const PRICE_TIERS := [{"name": "便宜", "sell": 0.9, "draw": 1.2}, {"name": "公道", "sell": 1.0, "draw": 1.0}, {"name": "高價", "sell": 1.1, "draw": 0.65}]
## 夥計：每天的工錢、長處（勤快客人多一成、嘴甜賣價多一點、機靈缺貨時少跑客人、老實不出錯）
const STAFF := [
	{"name": "小六子", "wage": 2, "trait": "機靈", "desc": "十四五歲的半大孩子，跑腿快，算帳也快。"},
	{"name": "阿貴", "wage": 3, "trait": "老實", "desc": "話不多，從不偷懶，也不會少收客人一文錢。"},
	{"name": "春桃", "wage": 3, "trait": "嘴甜", "desc": "笑起來兩個酒窩，客人見了都多買一樣。"},
	{"name": "石頭", "wage": 3, "trait": "勤快", "desc": "天沒亮就來開門，天黑了才走。"},
	{"name": "蓮兒", "wage": 4, "trait": "嘴甜", "desc": "從前在望江樓端過盤子，招呼客人很有一套。"},
	{"name": "老周", "wage": 4, "trait": "老實", "desc": "做了二十年的掌櫃，東家倒了才出來找活兒。"},
	{"name": "二妞", "wage": 2, "trait": "勤快", "desc": "鄉下來的姑娘，手腳俐落，吃得少做得多。"},
]
const TRAIT_DRAW := {"勤快": 0.1, "嘴甜": 0.0, "老實": 0.0, "機靈": 0.05}
const TRAIT_SELL := {"勤快": 0.0, "嘴甜": 0.05, "老實": 0.0, "機靈": 0.0}
## 地段：物件 id → 客人倍數
const LOCATION := {"ljs_east": 1.2, "ljs_west": 1.0, "ljs_dock": 1.1}
const SHOP_TAX := 0.03
const SHOP_FEE := 20
## 整體客流（校準：最好的情況一家批貨的店一個月淨賺一千兩上下）
const DEMAND := 0.42
const WEATHER_DRAW := {"clear": 1.1, "cloudy": 1.0, "rain": 0.8, "fog": 0.9, "snow": 0.7}
## 節期的生意（年節 1、端午 2、中秋 3）
const PERIOD_DRAW := {1: {"goods": 1.5, "cloth": 1.4, "restaurant": 1.3, "fish": 1.25}, 2: {"restaurant": 1.2, "fish": 1.1}, 3: {"restaurant": 1.3, "goods": 1.1}}
const SEA := ["sea_fish", "shrimp", "seaweed"]
## 士氣
const MORALE_START := 60
const MORALE_REST := 55
## 發紅包：每人幾兩、士氣、隔幾天
const BONUS := {"silver": 3, "morale": 12, "every": 10}
const YEARLY := [0, 1, 2]
## 每日帳留幾天
const DAYS_KEPT := 120
## 批貨每樣最多補到幾件、櫃上最多賒到多少
const SUPPLY_MAX := 30
const CREDIT := 100


static func shops() -> Dictionary:
	if not G.life.has("shops"):
		G.life.shops = {}
	return G.life.shops


static func shop(id: String) -> Dictionary:
	return shops().get(id, {})


static func type_def(t: String) -> Dictionary:
	return SHOP_TYPES[t]


static func staff_def(name: String) -> Dictionary:
	for s in STAFF:
		if s.name == name:
			return s
	return {"name": name, "wage": 3, "trait": "老實", "desc": ""}


static func _fish_ids() -> Array:
	return Crafts.data().fish.map(func(f): return f.id)


## 這種店的架上能擺什麼
static func accepts(t: String, id: String) -> bool:
	var d := Ui.item_def(id)
	if d.is_empty() or d.get("bound", false):
		return false
	match t:
		"restaurant":
			return d.category == "菜餚"
		"cloth":
			return d.category == "服飾"
		"fish":
			return id in _fish_ids() or id in ["dried_fish", "lotus_root", "water_chestnut"] or id in SEA
		_:
			return d.category in ["藥品", "食材", "雜物"] and not d.has("manual") and not id.begins_with("stone_") and id != "white_carp"


static func can_open(t: String) -> bool:
	var c: String = SHOP_TYPES[t].craft
	return c == "" or Crafts.level(c) >= 1


static func level_def(s: Dictionary) -> Dictionary:
	return SHOP_LEVELS[int(s.level) - 1]


static func morale_of(s: Dictionary, name: String) -> int:
	return int(s.get("staffInfo", {}).get(name, {}).get("morale", MORALE_START))


static func avg_morale(s: Dictionary) -> float:
	var st: Array = s.staff
	if st.is_empty():
		return MORALE_START
	var t := 0.0
	for n in st:
		t += morale_of(s, n)
	return t / st.size()


static func add_morale(s: Dictionary, name: String, n: int) -> void:
	if not s.has("staffInfo"):
		s.staffInfo = {}
	if not s.staffInfo.has(name):
		s.staffInfo[name] = {"since": G.day, "morale": MORALE_START}
	s.staffInfo[name].morale = clampi(roundi(float(s.staffInfo[name].morale) + n), 0, 100)


static func hire_staff(s: Dictionary, name: String) -> void:
	s.staff.append(name)
	if not s.has("staffInfo"):
		s.staffInfo = {}
	s.staffInfo[name] = {"since": G.day, "morale": MORALE_START}


static func drop_staff(s: Dictionary, name: String) -> void:
	s.staff.erase(name)
	if s.has("staffInfo"):
		s.staffInfo.erase(name)
	if s.has("raises"):
		s.raises.erase(name)


static func wage_of(s: Dictionary, name: String) -> int:
	return int(staff_def(name).wage) + int(s.get("raises", {}).get(name, 0))


## 一天的固定開銷（工錢＋保鏢）
static func daily_fixed(s: Dictionary) -> int:
	var t := 0
	for n in s.staff:
		t += wage_of(s, n)
	if s.has("guard"):
		t += int(guard_def(s.guard.source).fee)
	return t


## 城裡還能雇的夥計（別家店雇走的不算）
static func hire_pool() -> Array:
	var hired := []
	for s in shops().values():
		hired += s.staff
	return STAFF.filter(func(x): return not x.name in hired)


## 賣一樣東西的價錢（嘴甜的夥計多賣一點，加起來最多五分）
static func shop_price(s: Dictionary, id: String) -> int:
	var sweet := 0.0
	for n in s.staff:
		sweet += float(TRAIT_SELL[staff_def(n).trait])
	return maxi(1, roundi(float(Ui.item_def(id).get("price", 0)) * float(PRICE_TIERS[int(s.price)].sell) * (1.0 + minf(0.05, sweet))))


## 每天的起伏：同一天同一家固定（0–1）
static func day_rand(day: int, id: String) -> float:
	return float(hash([int(G.life.get("seed", 1)), day, id]) & 0xFFFF) / 65536.0


## 店裡的事對當天生意的影響：[客人倍數, 收入倍數, 說明]
static func event_effect(s: Dictionary, day: int) -> Array:
	var draw := 1.0
	var income := 1.0
	var note := ""
	var e: Dictionary = s.get("event", {})
	if not e.is_empty() and int(e.day) <= day:
		match e.kind:
			"raise":
				draw = 0.9
				note = "%s做事沒勁" % e.staff
			"slack":
				income = 0.8
				note = "帳上短少"
			"ruffian":
				draw = 0.6
				note = "地痞在門口晃，客人不敢進來"
	var bz: Dictionary = s.get("buzz", {})
	if not bz.is_empty() and day <= int(bz.until):
		draw *= float(bz.mult)
	return [draw, income, note]


## 節慶的生意：節日當天客人多四成（清明、中元除外）；節期看店種。回傳 [倍數, 說明]
static func fest_draw(t: String, day: int) -> Array:
	var f := G.festival_of(day)
	var day_mult := 1.4 if f != "" and f != "清明" and f != "中元" else 1.0
	var per := G.festive_period(day)
	var per_mult: float = PERIOD_DRAW.get(per, {}).get(t, 1.0)
	var mult := maxf(day_mult, per_mult)
	if mult == 1.0:
		return [1.0, ""]
	return [mult, f if day_mult >= per_mult else ["", "年節", "端午", "中秋"][per]]


static func month_key(day: int) -> String:
	var d := G.date_of(day)
	return "%d-%02d" % [int(d.year), int(d.month)]


## 記一天的帳（每日、每月）
static func _record(s: Dictionary, d: Dictionary) -> void:
	var days: Array = s.get("days", [])
	days.append(d)
	s.days = days.slice(-DAYS_KEPT)
	var k := month_key(int(d.day))
	if not s.has("months"):
		s.months = {}
	if not s.months.has(k):
		var dd := G.date_of(int(d.day))
		s.months[k] = {"year": dd.year, "month": dd.month, "days": 0, "customers": 0, "income": 0, "wages": 0, "tax": 0, "guard": 0, "supply": 0, "mgr": 0}
	var m: Dictionary = s.months[k]
	m.days = int(m.days) + 1
	for f in ["customers", "income", "wages", "tax", "guard", "supply", "mgr"]:
		m[f] = int(m.get(f, 0)) + int(d.get(f, 0))


static func cost_of(d: Dictionary) -> int:
	return int(d.get("wages", 0)) + int(d.get("tax", 0)) + int(d.get("guard", 0)) + int(d.get("supply", 0)) + int(d.get("mgr", 0))


## 管這家店的掌櫃（先找專管這家的，再找管整座城的大掌櫃）
static func manager_of(id: String) -> Dictionary:
	var ms: Array = biz().managers
	for m in ms:
		if m.get("shop", "") == id:
			return m
	for m in ms:
		if int(m.rank) == 2 and m.get("town", "") == shop_town(id):
			return m
	return {}


static func shop_town(id: String) -> String:
	return town_of_map(prop_def(id).get("map", ""))


## 這家店現在能從哪裡進哪些貨（看合約、分號、掌櫃才幹）
static func sources_of(id: String) -> Array:
	var s := shop(id)
	var towns := []
	for k in shops():
		if shops()[k].type == s.type and not shop_town(k) in towns:
			towns.append(shop_town(k))
	return supply_sources(s.type, towns, int(manager_of(id).get("talent", 0)))


## 批貨：照設定補貨，回傳 [花的本錢, 沒送到的供應商]
static func _restock(s: Dictionary, id: String) -> Array:
	var sup: Dictionary = s.get("supply", {})
	if sup.get("mode", "self") != "order":
		return [0, []]
	var list := sources_of(id)
	var slots: int = level_def(s).slots
	var bad := G.weather in ["rain", "snow"]
	var came := {}
	var missed := []
	var spent := 0
	for item in sup.targets:
		var target := int(sup.targets[item])
		var src := {}
		for x in list:
			if x.id == item:
				src = x
		if src.is_empty() or target <= 0:
			continue
		if not came.has(src.sup):
			came[src.sup] = day_rand(G.day * 7, src.sup) < float(src.reliable) * (float(src.storm) if bad else 1.0)
		if not came[src.sup]:
			if not src.from in missed:
				missed.append(src.from)
			continue
		if not s.stock.has(item) and s.stock.size() >= slots:
			continue
		var need := maxi(0, target - int(s.stock.get(item, 0)))
		var afford := maxi(0, floori((float(s.till) - spent + CREDIT) / float(src.cost)))
		var n := mini(need, afford)
		if n <= 0:
			continue
		s.stock[item] = int(s.stock.get(item, 0)) + n
		spent += n * int(src.cost)
	s.till = float(s.till) - spent
	return [spent, missed]


static func _ledger(s: Dictionary, row: Dictionary) -> void:
	var l: Array = s.ledger
	l.append(row)
	s.ledger = l.slice(-10)


## 結算一家店一天的帳（會改 s）
static func settle_day(s: Dictionary, id: String, day: int) -> void:
	var fame := int(G.hero.get("fame", 0))
	var served := int(s.get("served", -1)) == day
	var guard_fee: int = guard_def(s.guard.source).fee if s.has("guard") else 0
	if (s.staff as Array).is_empty() and not served:
		# 關門也照付保鏢的錢
		s.till = float(s.till) - guard_fee
		_ledger(s, {"day": day, "closed": true, "customers": 0, "sold": 0, "short": 0, "income": 0, "wages": 0, "tax": 0, "guard": guard_fee})
		_record(s, {"day": day, "closed": true, "customers": 0, "sold": 0, "income": 0, "wages": 0, "tax": 0, "guard": guard_fee, "supply": 0})
		return
	var rs := _restock(s, id)
	var supply: int = rs[0]
	var mgr := manager_of(id)
	var t: Dictionary = SHOP_TYPES[s.type]
	var lv := level_def(s)
	var staff_draw := 0.8
	if (s.staff as Array).size() > 0:
		staff_draw = 1.0 + 0.15 * ((s.staff as Array).size() - 1)
		for n in s.staff:
			staff_draw += float(TRAIT_DRAW[staff_def(n).trait])
	var morale_draw := 0.9 + avg_morale(s) / 500.0
	var guard_draw: float = guard_def(s.guard.source).draw if s.has("guard") else 1.0
	var mgr_draw := 1.0 + int(mgr.get("talent", 0)) * 0.01
	var fest := fest_draw(s.type, day)
	var ev := event_effect(s, day)
	var customers := maxi(0, roundi(float(t.base) * float(lv.mult) * float(LOCATION.get(id, 1.0)) * float(t.season[G.season_of(day)]) * float(WEATHER_DRAW.get(G.weather, 1.0))
		* (1.0 + mini(fame, 200) / 400.0) * float(PRICE_TIERS[int(s.price)].draw) * staff_draw * (1.4 if served else 1.0) * float(fest[0]) * float(ev[0])
		* morale_draw * guard_draw * mgr_draw * DEMAND * (0.8 + day_rand(day, id) * 0.4)))
	var sold := 0
	var short := 0
	var pricey := 0
	var income := 0
	for i in customers:
		var ids: Array = s.stock.keys().filter(func(k): return int(s.stock[k]) > 0)
		if ids.is_empty():
			short += 1
			continue
		# 客人身上的錢有多有少：只在買得起的貨裡挑（擺得多的賣得多），都買不起就嫌貴走了
		var budget := float(t.budget) * (0.5 + day_rand(day * 53 + i, id) * 1.5)
		var ok := ids.filter(func(k): return shop_price(s, k) <= budget)
		if ok.is_empty():
			pricey += 1
			continue
		var total := 0
		for k in ok:
			total += int(s.stock[k])
		var x := day_rand(day * 31 + i, id) * total
		var pick: String = ok[0]
		for k in ok:
			x -= int(s.stock[k])
			if x < 0:
				pick = k
				break
		s.stock[pick] = int(s.stock[pick]) - 1
		if int(s.stock[pick]) <= 0:
			s.stock.erase(pick)
		sold += 1
		income += shop_price(s, pick)
	income = roundi(income * float(ev[1]))
	# 掌櫃不忠，偷偷吞掉一些（帳上看起來就是收入少了）
	var skim := 0
	if not mgr.is_empty() and float(mgr.loyalty) < 40:
		skim = roundi(income * (40.0 - float(mgr.loyalty)) / 400.0)
		mgr.skim = int(mgr.get("skim", 0)) + skim
	income -= skim
	var wages := 0
	for n in s.staff:
		wages += wage_of(s, n)
	var tax := roundi(income * SHOP_TAX)
	var shared := 1
	if not mgr.is_empty() and int(mgr.rank) == 2:
		shared = maxi(1, shops().keys().filter(func(k): return manager_of(k) == mgr).size())
	var before := income - wages - tax - guard_fee - supply
	var mgr_pay := 0
	if not mgr.is_empty():
		mgr_pay = roundi(float(mgr.salary) / shared + maxf(0.0, before - float(mgr.salary) / shared) * float(mgr.share))
	s.till = float(s.till) + income - wages - tax - guard_fee - mgr_pay
	var notes := []
	if ev[2] != "":
		notes.append(ev[2])
	if (rs[1] as Array).size() > 0:
		notes.append("%s今天沒送貨來" % "、".join(rs[1]))
	var row := {"day": day, "customers": customers, "sold": sold, "short": short, "pricey": pricey, "income": income, "wages": wages, "tax": tax, "guard": guard_fee, "supply": supply, "mgr": mgr_pay}
	if fest[1] != "":
		row.fest = fest[1]
	if notes.size() > 0:
		row.trouble = "；".join(notes)
	_ledger(s, row)
	_record(s, {"day": day, "customers": customers, "sold": sold, "income": income, "wages": wages, "tax": tax, "guard": guard_fee, "supply": supply, "mgr": mgr_pay})
	# 士氣每天慢慢回到 MORALE_REST
	for n in s.staff:
		var m := morale_of(s, n)
		if m != MORALE_REST:
			add_morale(s, n, -1 if m > MORALE_REST else 1)


## 在最近一天的帳上記一筆事情
static func note(s: Dictionary, text: String) -> void:
	var l: Array = s.ledger
	if l.is_empty():
		return
	var last: Dictionary = l[l.size() - 1]
	last.trouble = (last.trouble + "；" + text) if last.has("trouble") else text


# ── 保鏢 ────────────────────────────────────────────────

## 來源：哪裡請的、稱呼、每天的錢、地痞上門的機會倍數（0 是不敢來）、遭小偷的倍數、客人多寡、名字、樣子
const GUARDS := {
	"yamen": {"from": "縣衙", "title": "衙役", "fee": 3, "ruffian": 0.25, "thief": 0.3, "draw": 1.0, "names": ["魯長順", "鄭四寶"], "look": "guard",
		"desc": "下了值的衙役來店裡坐坐。地痞見了官差多半繞道，真來了也會被當場打發。價錢公道。"},
	"escort": {"from": "金刀鏢局", "title": "鏢師", "fee": 5, "ruffian": 0.0, "thief": 0.1, "draw": 1.05, "names": ["樊大勇", "唐鐵臂"], "look": "escort",
		"desc": "鏢局的鏢師，身手最好，小偷都不敢打主意。客人看了安心，生意還多半成。最貴。"},
	"gang": {"from": "漕幫", "title": "幫眾", "fee": 2, "ruffian": 0.0, "thief": 0.5, "draw": 0.95, "names": ["熊老六", "麻三皮"], "look": "boatman",
		"desc": "漕幫的人往門口一站，蔡三那種小混混連看都不敢看。就是長相兇了點，有些客人看了發毛。最便宜。"},
	"wuguan": {"from": "武館", "title": "武館弟子", "fee": 3, "ruffian": 0.1, "thief": 0.2, "draw": 1.02, "names": ["武館弟子"], "look": "disciple",
		"desc": "武館的弟子出來歷練，規矩好、身手也不差。"},
}
const GUARD_ORDER := ["yamen", "escort", "gang", "wuguan"]
## 各城請得到哪幾種保鏢（看城裡有沒有官府、鏢局、幫會、武館）
const TOWN_GUARDS := {"linjiang": ["yamen", "escort", "gang"]}


static func guard_def(id: String) -> Dictionary:
	return GUARDS[id]


# ── 城與供應商 ──────────────────────────────────────────

## 有市集、有供應商的地方：地圖 id 的開頭對到哪個城（去過才知道那裡有哪些供應商）
const TOWNS := [
	{"id": "linjiang", "name": "臨江城", "maps": ["linjiang", "lj_", "prop:lj"]},
	{"id": "qingzhu", "name": "青竹村", "maps": ["qingzhu", "village", "qz_", "home:qz"]},
	{"id": "biyi", "name": "碧漪湖漁村", "maps": ["biyi", "by_"]},
	{"id": "dabutou", "name": "大埠頭", "maps": ["dabutou", "bp_"]},
]


static func town_of_map(map: String) -> String:
	for t in TOWNS:
		for m in t.maps:
			if map == m or ((m.contains("_") or m.contains(":")) and map.begins_with(m)):
				return t.id
	return TownGen.town_of(map)


static func town_name(id: String) -> String:
	for t in TOWNS:
		if t.id == id:
			return t.name
	if TownGen.has(id):
		return TownGen.cfg(id).name
	return id


## 這座城請得到哪幾種保鏢（樣板城鎮照 towns.json 的 guards）
static func town_guards(town: String) -> Array:
	if TOWN_GUARDS.has(town):
		return TOWN_GUARDS[town]
	return TownGen.cfg(town).get("guards", []) if TownGen.has(town) else []


## 進到某個城的地圖就記下去過（main.go 呼叫）
static func visit(map: String) -> void:
	var t := town_of_map(map)
	if t == "":
		return
	var b := biz()
	if not t in b.visited:
		b.visited.append(t)


## 供應商：哪個城、找誰談、進價（佔行情）、每件運費、每天送到的機會、雨雪天再乘多少
const SUPPLIERS := [
	{"id": "lj_agent", "town": "linjiang", "name": "萬通牙行", "contact": "錢六", "where": "臨江城北・萬通牙行", "ratio": 0.85, "freight": 0.0, "reliable": 0.98, "storm": 1.0,
		"desc": "城裡的牙行什麼都能張羅：藥材、雜物、米麵菜蔬。價錢不算便宜，但從不誤事。"},
	{"id": "lj_cloth", "town": "linjiang", "name": "錦繡布莊", "contact": "魏錦娘", "where": "臨江城・錦繡布莊", "ratio": 0.85, "freight": 0.0, "reliable": 0.97, "storm": 1.0,
		"desc": "城裡最大的布莊，成衣、鞋帽、護具都有現貨。"},
	{"id": "lj_clinic", "town": "linjiang", "name": "回春堂", "contact": "白濟仁", "where": "臨江城・回春堂", "ratio": 0.8, "freight": 0.0, "reliable": 0.97, "storm": 1.0,
		"desc": "藥舖自己配的藥，進價比牙行低一截，只是只有藥。"},
	{"id": "qz_farm", "town": "qingzhu", "name": "青竹村菜農", "contact": "阿牛", "where": "青竹村・田邊", "ratio": 0.7, "freight": 0.5, "reliable": 0.95, "storm": 0.85,
		"desc": "村裡自家種的米菜、雞蛋、豆腐，挑擔子送進城。便宜，就是下雨天路不好走。"},
	{"id": "by_ruan", "town": "biyi", "name": "阮家魚簍", "contact": "阮大水", "where": "碧漪湖漁村・湖邊", "ratio": 0.55, "freight": 1.0, "reliable": 0.92, "storm": 0.8,
		"desc": "碧漪湖每天的漁獲、蓮藕菱角、曬好的魚乾，裝簍挑進城。"},
	{"id": "bp_pang", "town": "dabutou", "name": "龐家漁船", "contact": "龐老大", "where": "大埠頭・魚市碼頭", "ratio": 0.5, "freight": 1.5, "reliable": 0.85, "storm": 0.6,
		"desc": "出海打回來的海魚、鮮蝦、海帶，產地價最便宜。路遠，遇上風浪就斷貨。"},
	{"id": "bp_trader", "town": "dabutou", "name": "海商會館", "contact": "駱千帆", "where": "大埠頭・海商會館", "ratio": 0.76, "freight": 1.5, "reliable": 0.9, "storm": 0.75,
		"desc": "南來北往的海商帶來的糖、乾貨、香料與雜貨，量大價低，從大埠頭一路運過來。"},
	{"id": "wy_tea", "town": "wuya", "name": "霧芽茶舖", "contact": "談雪芽", "where": "霧芽村・霧芽茶舖", "ratio": 0.7, "freight": 1.0, "reliable": 0.93, "storm": 0.85,
		"desc": "北嶺南坡自家炒的茶：霧芽春茶、雲霧、清茶（明前茶不外賣）。產地價便宜，山路下雨就難走。"},
]
## 霧芽茶舖供的茶
const TEAS := ["wuya_tea", "yunwu", "tea"]
## 合約：期限、簽約費、折扣
const TERMS := [
	{"id": "month", "name": "一個月", "days": 30, "fee": 20, "disc": 0.0},
	{"id": "season", "name": "一季", "days": 90, "fee": 50, "disc": 0.03},
	{"id": "year", "name": "一年", "days": 360, "fee": 160, "disc": 0.06},
]
## 沒簽約、由當地的分號就地採辦：進價貴五分
const BRANCH_EXTRA := 0.05
## 飯館的菜：本錢 ＝ 賣價 ×（廚房 KITCHEN ＋ 食材比重 × 食材的進價比例）
const KITCHEN := 0.46
const FOOD_SHARE := 0.55


static func supplier(id: String) -> Dictionary:
	for s in SUPPLIERS:
		if s.id == id:
			return s
	return {}


static func term(id: String) -> Dictionary:
	for t in TERMS:
		if t.id == id:
			return t
	return TERMS[0]


static func _price(id: String) -> int:
	return int(Ui.item_def(id).get("price", 0))


## 湖產：二級以下、在棧橋蘆葦湖心島釣得到的魚，加蓮藕菱角魚乾
static func _lake() -> Array:
	var out := ["lotus_root", "water_chestnut", "dried_fish"]
	for f in Crafts.data().fish:
		var sp: Dictionary = f.spots
		if int(f.level) <= 2 and (sp.has("pier") or sp.has("reeds") or sp.has("isle")):
			out.append(f.id)
	return out


## 某家供應商供不供這樣貨
static func sup_goods(sup: String, id: String) -> bool:
	var d := Ui.item_def(id)
	if d.is_empty() or d.get("bound", false) or _price(id) <= 0:
		return false
	var p := _price(id)
	var fish := id in _fish_ids()
	var food: bool = d.category == "食材" and not fish
	var lake := _lake()
	match sup:
		"lj_agent":
			return d.category in ["藥品", "雜物", "食材"] and p <= 40 and not d.has("manual") and not d.has("dish") and not id.begins_with("stone_") and not fish and not id in SEA and not id in lake
		"lj_cloth":
			return d.has("gear") and p <= 120 and not id.begins_with("w_") and not d.gear.has("sect")
		"lj_clinic":
			return d.category == "藥品" and p <= 40
		"qz_farm":
			return food and p <= 3
		"by_ruan":
			return id in lake
		"bp_pang":
			return id in SEA
		"wy_tea":
			return id in TEAS
		"bp_trader":
			return (d.category == "雜物" or (food and p >= 3)) and not fish and p <= 40 and not d.has("manual") and not id.begins_with("stone_") and not id in SEA and not id in lake
	return false


## 某種店能從哪裡進哪些貨（每樣挑最便宜的來源）：[{id, cost, from, sup, reliable, storm}]
static func supply_sources(t: String, branch_towns: Array, talent := 0) -> Array:
	var b := biz()
	var active := []
	for s in SUPPLIERS:
		var c: Dictionary = b.contracts.get(s.id, {})
		if not c.is_empty() and int(c.until) >= G.day:
			active.append([s, float(s.ratio) * (1.0 - float(term(c.term).disc))])
		elif s.town in branch_towns:
			active.append([s, float(s.ratio) + BRANCH_EXTRA])
	var cut := 1.0 - talent * 0.005
	var best := func(id: String) -> Dictionary:
		var out := {}
		for a in active:
			var s: Dictionary = a[0]
			if not sup_goods(s.id, id):
				continue
			var cost := maxi(1, roundi((_price(id) * float(a[1]) + float(s.freight)) * cut))
			if out.is_empty() or cost < int(out.cost):
				out = {"id": id, "cost": cost, "from": s.name, "sup": s.id, "reliable": s.reliable, "storm": s.storm}
		return out
	var out := []
	if t == "restaurant":
		for d in Crafts.data().dishes:
			if not load("res://story/cook.gd").knows(d.id) or _price(d.id) <= 0:
				continue
			var parts := []
			var missing := false
			for k in d.needs:
				var src: Dictionary = best.call(k)
				if src.is_empty():
					missing = true
					break
				parts.append([src, int(d.needs[k]), _price(k) * int(d.needs[k])])
			if missing or parts.is_empty():
				continue
			var paid := 0.0
			var worth := 0.0
			var worst: Dictionary = parts[0][0]
			for x in parts:
				paid += int(x[0].cost) * int(x[1])
				worth += x[2]
				if float(x[0].reliable) * float(x[0].storm) < float(worst.reliable) * float(worst.storm):
					worst = x[0]
			var r := paid / maxf(1.0, worth)
			out.append({"id": d.id, "cost": maxi(1, roundi(_price(d.id) * (KITCHEN + FOOD_SHARE * minf(1.2, r)) * cut)), "from": "自家廚房", "sup": worst.sup, "reliable": worst.reliable, "storm": worst.storm})
		return out
	for id in Ui.all_items():
		if accepts(t, id):
			var src: Dictionary = best.call(id)
			if not src.is_empty():
				out.append(src)
	return out


# ── 總號、掌櫃 ──────────────────────────────────────────

## 掌櫃：管一家店（rank 1）；大掌櫃（rank 2）管一整座城的店與租出去的房子
## 才幹：客人多（每點 1%）、進價低（每點 0.5%），每 60 點經驗 +1。忠誠低於 40 會中飽私囊，要查帳才看得出來
const MANAGER_POOL := [
	{"name": "晏守拙", "talent": 5, "loyalty": 75, "rank": 1, "salary": 6, "share": 0.05, "desc": "在當鋪做了十年二掌櫃，算盤打得精，人老實。"},
	{"name": "邵通寶", "talent": 8, "loyalty": 45, "rank": 2, "salary": 12, "share": 0.1, "desc": "做過大商號的大掌櫃，手腕高明，就是心思活絡，得看緊點。"},
	{"name": "溫如玉", "talent": 6, "loyalty": 60, "rank": 1, "salary": 8, "share": 0.08, "desc": "綢緞莊出身的女掌櫃，待人和氣，客人都愛跟她做生意。"},
	{"name": "杭老實", "talent": 3, "loyalty": 90, "rank": 1, "salary": 4, "share": 0.03, "desc": "人如其名，本事普通，但一文錢都不會差。"},
]
const PROMOTE := {"talent": 6, "exp": 90}
const RISE := {"days": 30, "morale": 70}
const RISE_STATS := {"老實": [3, 85], "機靈": [5, 60], "嘴甜": [4, 65], "勤快": [4, 75]}
const TIP := {"silver": 20, "loyalty": 10, "every": 10}
const SHARES := [0.03, 0.05, 0.08, 0.1, 0.15]
const HIRE_FEE := 30
## 總號的方針：交給掌櫃處理的事要怎麼辦
const DEFAULT_POLICY := {"ruffian": "report", "raise": "agree", "slack": "scold", "patron": "accept", "hire": true, "renew": true, "yearly": 1, "repair": 20, "late": "grace", "float": 100}
## 方針的選項：[鍵, 名稱, [值, 說明]…]
const POLICY_OPTS := [
	["ruffian", "地痞上門", [["pay", "付保護費"], ["report", "報官"], ["yamen", "請衙役坐鎮"], ["escort", "請鏢師坐鎮"], ["gang", "請漕幫坐鎮"]]],
	["raise", "夥計要加薪", [["agree", "答應"], ["refuse", "不答應"]]],
	["slack", "夥計偷懶", [["scold", "訓一頓"], ["dock", "扣工錢"], ["fire", "辭退"]]],
	["patron", "大主顧下訂", [["accept", "架上夠就接"], ["decline", "一律回絕"]]],
	["hire", "缺人自己補", [[true, "補"], [false, "不補"]]],
	["renew", "合約到期續約", [[true, "續"], [false, "不續"]]],
	["yearly", "年度加薪", [[0, "不加"], [1, "每人一兩"], [2, "每人二兩"]]],
	["repair", "租客屋漏直接修", [[0, "不修"], [10, "十兩內"], [20, "二十兩內"], [40, "四十兩內"]]],
	["late", "租客交不出租", [["grace", "寬限"], ["press", "催討"], ["forgive", "免了"]]],
	["float", "櫃上留周轉金", [[50, "五十兩"], [100, "一百兩"], [200, "兩百兩"]]],
]


static func biz() -> Dictionary:
	if not G.life.has("biz"):
		G.life.biz = {"visited": [], "contracts": {}, "signed": [], "managers": [], "policy": DEFAULT_POLICY.duplicate(), "vault": 0}
	var b: Dictionary = G.life.biz
	for k in DEFAULT_POLICY:
		if not b.policy.has(k):
			b.policy[k] = DEFAULT_POLICY[k]
	return b


static func manager(id: String) -> Dictionary:
	for m in biz().managers:
		if m.id == id:
			return m
	return {}


static func mgr_title(m: Dictionary) -> String:
	return ("大掌櫃" if int(m.rank) == 2 else "掌櫃") + m.name
