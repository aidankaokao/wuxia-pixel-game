## 生活技能訂單（照網頁版 orders.ts、story/orders.ts）：卜大勺、鍾嬸要菜，魏錦娘要織品，望江樓的汪福來要魚、魚乾、湖產與湖鮮海鮮菜。
## - 每位下單的人同時只有一張訂單（G.life.orders[下單的人]），期限內交貨給銀兩、謝禮與熟悉度；交貨、婉拒或過期之後隔幾天（G.life.order_next）才再下單。
## - 只挑你學會的菜、樣式、釣過的魚（卜大勺例外：他教得了的入門、中等菜，沒學過也會下單，順便叫你來學）。
## - 找下單的人說話時先處理（talk 回傳 true 表示處理了）：卜大勺、鍾嬸在人際系統的交談裡（Social.talk），魏錦娘在布莊選單前，汪福來在望江樓選單前。
## 沒有用到旗標。

const Weaving := preload("res://story/weaving.gd")
const Cook := preload("res://story/cook.gd")

## 交貨期限幾天；之後隔幾天再下單；沒有訂單時說話下新單的機率
const DAYS := 7
const GAP := 3
const OFFER := 0.5
## 酬勞：收購價 × 份數 × 倍數，再加一點
const MULT := 1.5
const TIP := 5

## [id, 名字, 種類, 人物檔案 id, 謝禮挑一樣]
const GIVERS := {
	"bu": {"name": "卜大勺", "kind": "dish", "person": "bu", "gifts": [["osmanthus", 3], ["almond", 3], ["sesame", 3]]},
	"zhong": {"name": "鍾嬸", "kind": "dish", "person": "zhong", "gifts": [["yunwu", 2], ["tea", 3], ["egg", 4]]},
	"jin": {"name": "魏錦娘", "kind": "woven", "person": "", "gifts": [["fine_silk", 1], ["silk_thread", 3]]},
	"tower": {"name": "汪福來", "kind": "goods", "person": "", "gifts": [["yunwu", 1], ["huiqi_san", 2], ["fine_silk", 1]]},
}
const NUM := "零一兩三四五六七八九十"
const DISH_Q := ["普通", "上品", "精品"]


static func _store(key: String) -> Dictionary:
	if not G.life.has(key):
		G.life[key] = {}
	return G.life[key]


static func order_of(giver: String) -> Dictionary:
	return _store("orders").get(giver, {})


static func _dish_item(id: String, q: int) -> String:
	return id if q == 0 else "%s_%d" % [id, q + 1]


static func _sell(id: String) -> int:
	return int(Ui.item_def(id).get("price", 0)) / 2


## 訂單要的東西，例如「三份上品以上的桂花糕」「一件精良以上的長衫」
static func text(o: Dictionary) -> String:
	var n: String = NUM[int(o.n)] if int(o.n) < NUM.length() else str(o.n)
	match o.kind:
		"dish":
			return "%s份%s%s" % [n, ("%s以上的" % DISH_Q[int(o.q)]) if int(o.q) > 0 else "", Ui.item_def(o.id).name]
		"goods":
			var unit := "條" if not Crafts.fish(o.id).is_empty() else ("節" if o.id == "lotus_root" else "份")
			return "%s%s%s" % [n, unit, Ui.item_def(o.id).name]
	var p := {}
	for x in Weaving.patterns():
		if x.id == o.id:
			p = x
	return "%s件%s%s" % [n, ("%s以上的" % Crafts.data().grades[int(o.q)]) if int(o.q) > 0 else "", p.get("name", o.id)]


## 符合訂單的物品（品質由低到高，交貨時先交低的）
static func items_of(o: Dictionary) -> Array:
	match o.kind:
		"dish":
			return range(int(o.q), 3).map(func(q): return _dish_item(o.id, q))
		"goods":
			return [o.id]
	return range(int(o.q), 5).map(func(g): return Weaving.item_of(o.id, g))


static func have(o: Dictionary) -> int:
	var n := 0
	for id in items_of(o):
		n += int(G.bag.get(id, 0))
	return n


## 下一張訂單；沒得挑是空的
static func new_order(giver: String) -> Dictionary:
	var g: Dictionary = GIVERS[giver]
	var gift: Array = g.gifts.pick_random()
	var base := {"due": G.day + DAYS, "items": {gift[0]: gift[1]}, "aff": 4 if g.person != "" else 0}
	match g.kind:
		"dish":
			var pool: Array = Crafts.data().dishes.filter(func(d): return not d.get("spring", false) and (Cook.knows(d.id) or (giver == "bu" and int(d.tier) <= 1 and not d.get("sea", false) and not d.get("lake", false))))
			if pool.is_empty():
				return {}
			var d: Dictionary = pool.pick_random()
			var q := 1 if randf() < 0.5 else 0
			var n := 2 + randi() % 2
			return base.merged({"kind": "dish", "id": d.id, "q": q, "n": n, "silver": roundi(_sell(_dish_item(d.id, q)) * n * MULT) + TIP})
		"woven":
			var pool := Weaving.patterns().filter(func(p): return Weaving.knows(p.id))
			if pool.is_empty():
				return {}
			var p: Dictionary = pool.pick_random()
			var q := 2 if randf() < 0.4 else 1
			return base.merged({"kind": "woven", "id": p.id, "q": q, "n": 1, "silver": roundi(_sell(Weaving.item_of(p.id, q)) * MULT) + TIP})
	# 望江樓：會做湖鮮、海鮮菜的話一半機會訂菜；否則訂釣過的魚、魚乾、湖產
	var dishes: Array = Crafts.data().dishes.filter(func(d): return (d.get("lake", false) or d.get("sea", false)) and Cook.knows(d.id))
	if dishes.size() > 0 and randf() < 0.5:
		var d: Dictionary = dishes.pick_random()
		var n := 2 + randi() % 2
		return base.merged({"kind": "dish", "id": d.id, "q": 0, "n": n, "silver": roundi(_sell(d.id) * n * MULT) + TIP})
	var goods := []
	for f in Crafts.data().fish:
		if f.id != "golden_carp" and not Crafts.work("fishing", f.id).is_empty():
			goods.append(f.id)
	if not Crafts.work("fishing", "crucian").is_empty():
		goods += ["lotus_root", "water_chestnut"]
	if G.bag.has("dried_fish") or not Crafts.work("fishing", "carp").is_empty():
		goods.append("dried_fish")
	if goods.is_empty():
		return {}
	var id: String = goods.pick_random()
	var rare := int(Crafts.fish(id).get("level", 0))
	var n := 1 + randi() % 2 if rare >= 2 else 3 + randi() % 4
	# 酒樓收貨照市價再加三成（比賣給魚販划算得多）
	return base.merged({"kind": "goods", "id": id, "q": 0, "n": n, "silver": roundi(int(Ui.item_def(id).get("price", 0)) * n * 1.3) + 8})


## 找下單的人說話：過期、交貨、接新單；處理了回傳 true
static func talk(ctx: Ctx, giver: String) -> bool:
	var g: Dictionary = GIVERS[giver]
	var say := func(t: String) -> Dictionary: return {"speaker": g.name, "text": t}
	var o := order_of(giver)
	var later := func() -> void: _store("order_next")[giver] = G.day + GAP
	if not o.is_empty():
		if G.day > int(o.due):
			_store("orders").erase(giver)
			later.call()
			await ctx.say(say.call("上回託你的%s，我等不及，找別人做了。" % text(o)))
			return false
		if have(o) < int(o.n):
			return false
		if await ctx.ask(say.call("我要的%s，做好啦？" % text(o)), ["交貨", "還沒"]) != 0:
			return true
		var left := int(o.n)
		for id in items_of(o):
			var k := mini(left, int(G.bag.get(id, 0)))
			if k > 0:
				ctx.take(id, k)
				left -= k
		G.silver += int(o.silver)
		_store("orders").erase(giver)
		later.call()
		await ctx.say([say.call({"dish": "好手藝！這味道，夠格！", "goods": "新鮮！客人就愛這一味，我這就送進廚房。"}.get(o.kind, "針腳細密，料子也勻，好東西。")), "（銀兩 +%d）" % int(o.silver)])
		for id in o.items:
			await ctx.give(id, int(o.items[id]))
		if int(o.aff) > 0 and g.person != "":
			await Social.add_aff(ctx, Social.def(g.person), int(o.aff))
		return true
	if G.day < int(_store("order_next").get(giver, 0)) or randf() >= OFFER:
		return false
	var next := new_order(giver)
	if next.is_empty():
		return false
	var due := G.date_text(int(next.due))
	var gifts := "、".join(next.items.keys().map(func(id): return "%s×%d" % [ctx.item_name(id), next.items[id]]))
	var ask: String = {"goods": "樓裡的客人點名要%s，市面上不好買。%s以前送來，價錢好說！" % [text(next), due],
		"dish": "想託你做%s，%s以前送來。" % [text(next), due]}.get(next.kind, "有位客人訂了%s，我這兒忙不過來，%s以前織好送來，成不成？" % [text(next), due])
	if await ctx.ask(say.call("%s\n（酬勞：銀兩 %d、%s）" % [ask, next.silver, gifts]), ["接下", "婉拒"]) != 0:
		later.call()
		await ctx.say(say.call("那就下回吧。"))
		return true
	_store("orders")[giver] = next
	await ctx.say([say.call("那就說定了！"), "（接下訂單：%s。期限 %s）" % [text(next), due]])
	return true


## 今日事：手上的訂單
static func tasks() -> Array:
	var out := []
	for giver in GIVERS:
		var o := order_of(giver)
		if o.is_empty() or G.day > int(o.due):
			continue
		out.append({"text": "訂單：%s要%s" % [GIVERS[giver].name, text(o)], "state": "todo",
			"note": "東西齊了，回去交貨" if have(o) >= int(o.n) else "期限 %s" % G.date_text(int(o.due))})
	return out
