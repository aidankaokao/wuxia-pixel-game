## 想法泡泡（照網頁版 thought.ts）：主角頭上冒的念頭。
## - 代價：面對要花時間、體力的東西時寫出花費（COSTS：腳本 → [刻數, 體力]；體力不夠就換成「累了」）。
##   新的練功、做事地點把腳本加進 COSTS（數值要跟腳本裡扣的一樣）。
## - 提醒：時間走到某個點（晨課快結束、開飯、天黑、夜深）、天氣變了或體力見底時，冒一句自言自語；每則一天最多一次（不存檔）。
## 由 GridScene 每格呼叫（cost_of、due）。

const Train := preload("res://story/train.gd")

## 每回的代價：[刻數, 體力]；連做幾回的事寫一回的
const COSTS := {
	"train/stake": [2, 20], "train/sit": [2, 10], "train/shelf": [2, 10], "qingzhu/stele_read": [2, 10],
	"mingquan/yard_stake": [2, -1], "mingquan/iron_stake": [2, 25], "mingquan/cushion": [2, 10], "mingquan/lib_shelf": [2, 10],
	"chores/chop": [8, 15], "chores/farm": [8, 15], "chores/bellows": [8, 15], "bridge/quarry": [4, 25],
	"cook/stove": [2, 6], "mingquan/kitchen_stove": [2, 6], "weaving/loom": [4, 10],
	"fishing/river": [1, 5], "fishing/pier": [1, 5], "fishing/reeds": [1, 5], "fishing/isle": [1, 5], "biyi/lotus_pond": [4, 10],
	"arts/mq_shelf": [4, 10], "arts/academy_shelf": [4, 10], "arts/mq_desk": [4, 8], "arts/academy_desk": [4, 8],
	"arts/ting_quan": [4, 8], "arts/ting_jian": [4, 8], "arts/tea_board": [4, 8], "arts/wang_jiang": [4, 8],
}


## 面對這個腳本時的念頭（不花東西的是空字串）
static func cost_of(script: String) -> String:
	if not COSTS.has(script):
		return ""
	var c: Array = COSTS[script]
	var st: int = c[1]
	# 廣場木樁：雨天、雪天多花一點
	if st < 0:
		st = Train.STAMINA.stake + (5 if G.weather in ["rain", "snow"] else 0)
	if int(G.hero.stamina) < st:
		return "體力不夠了……\n要 %d，只剩 %d" % [st, G.hero.stamina]
	return "%s・體力 %d" % [G.ke_text(c[0]), st]


static var _fired := {}


## [id, 檢查] 檢查回傳要說的話（沒有是空字串）
static func _checks() -> Array:
	var s := G.shichen_of()
	var mq := Sect.member("mingquan")
	return [
		["rain", "下雨了……在外頭練功可要吃力些。" if G.weather == "rain" else ""],
		["snow", "下雪了……山路怕是不好走。" if G.weather == "snow" else ""],
		["fog", "好大的霧……" if G.weather == "fog" else ""],
		["mq_morning", "晨課快結束了，得趕緊去演武台……" if mq and s == 5 and not G.is_xunxiu() and int(G.flags.get("mq_morning", 0)) != G.day else ""],
		["mq_lunch", "肚子咕咕叫……廚房該開飯了。" if mq and s == 6 else ""],
		["mq_supper", "飯香飄過來了，大夥兒都往廚房去了。" if mq and s == 9 else ""],
		["dusk", "天色暗下來了……" if s == 9 else ""],
		["late", "夜深了，該找地方睡了。" if s == 11 else ""],
		["tired", "好累……該歇一歇了。" if int(G.hero.stamina) < Hero.derive(G.hero).max_stamina * 0.2 else ""],
	]


## 有沒有該冒出的提醒（冒出的那則記下今天提醒過）
static func due() -> String:
	for c in _checks():
		if c[1] != "" and int(_fired.get(c[0], 0)) != G.day:
			_fired[c[0]] = G.day
			return c[1]
	return ""
