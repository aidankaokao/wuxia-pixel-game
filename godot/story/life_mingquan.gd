## 鳴泉劍派自己過日子的人（照網頁版 story/life_mingquan.ts 搬第一輪）：
## 陸鳴川（大師兄，帶晨課）、顧小滿、包小川、唐秋生、曹小豆、鄭大壯、侯三郎、喬木生（記名弟子）、何守一、韋季安（正式弟子）、
## 韓靖秋（傳功長老）、聞松年（掌門）。
## - 晨課：卯時到辰時，陸鳴川在演武廣場正中的演武台（擂台）上帶，記名弟子排兩排（旬休、下雨沒有）。
## - 差事：曹小豆一早掃大殿前；何守一上午、喬木生下午輪班守山門；韋季安旬休前一天下山採買（看不到）；
##   韓靖秋白天在練功房看弟子練功、未時到廣場巡視；聞松年白天在大殿，未時到後山散步（長老、掌門夜裡回自己的居所，看不到）。
## - 比武小會（旬休未時，演武台）、講武（初五、十五、廿五申時，練功房）、守夜（每晚輪一個人）：見 events；你參加的部分在 story/mingquan.gd。
## 同門交情與成長之後再搬。
## 活動範圍：山道、院落、後山、大通鋪、弟子房、真傳弟子房、練功房、書房、廚房、大殿。

const S := "mq_sect"
const AWAY := "_away"


static func T(s: int, ke := 0) -> int:
	return s * 8 - 4 + ke


const 卯 := 3
const 辰 := 4
const 巳 := 5
const 午 := 6
const 未 := 7
const 申 := 8
const 酉 := 9


static func _in(t: int, a: int, b: int) -> bool:
	return t >= T(a) and t < T(b)


static func _sp(id: String, at: Array, acts: Array, pair := "") -> Dictionary:
	var d := {"id": id, "at": at, "acts": acts}
	if pair != "":
		d.pair = pair
	return d


static func group() -> Dictionary:
	var spots := [
		_sp("stake16a", ["mq_sect", 18, 18, "left"], ["stake"]),
		_sp("stake16b", ["mq_sect", 18, 20, "left"], ["stake"]),
		_sp("stake18a", ["mq_sect", 18, 22, "left"], ["stake"]),
		_sp("stake18b", ["mq_sect", 28, 18, "right"], ["stake"]),
		_sp("stake20a", ["mq_sect", 28, 20, "right"], ["stake"]),
		_sp("stake20b", ["mq_sect", 28, 22, "right"], ["stake"]),
		_sp("sw1", ["mq_sect", 15, 13, "down"], ["sword"]),
		_sp("sw2", ["mq_sect", 32, 13, "down"], ["sword"]),
		_sp("sw3", ["mq_sect", 15, 27, "right"], ["sword"]),
		_sp("sw4", ["mq_sect", 32, 27, "left"], ["sword"]),
		_sp("sw5", ["mq_sect", 20, 28, "up"], ["sword"]),
		_sp("sw6", ["mq_sect", 27, 28, "up"], ["sword"]),
		_sp("ch1a", ["mq_sect", 14, 22, "right"], ["chat"], "ch1b"),
		_sp("ch1b", ["mq_sect", 15, 22, "left"], ["chat"], "ch1a"),
		_sp("ch2a", ["mq_sect", 32, 21, "right"], ["chat"], "ch2b"),
		_sp("ch2b", ["mq_sect", 33, 21, "left"], ["chat"], "ch2a"),
		_sp("ch3a", ["mq_sect", 13, 35, "right"], ["chat"], "ch3b"),
		_sp("ch3b", ["mq_sect", 14, 35, "left"], ["chat"], "ch3a"),
		_sp("ch4a", ["mq_sect", 26, 35, "right"], ["chat"], "ch4b"),
		_sp("ch4b", ["mq_sect", 27, 35, "left"], ["chat"], "ch4a"),
		_sp("ch5a", ["mq_dorm", 10, 3, "right"], ["chat"], "ch5b"),
		_sp("ch5b", ["mq_dorm", 11, 3, "left"], ["chat"], "ch5a"),
		_sp("ch6a", ["mq_sect", 31, 31, "right"], ["chat"], "ch6b"),
		_sp("ch6b", ["mq_sect", 32, 31, "left"], ["chat"], "ch6a"),
		_sp("md1", ["mq_sect", 9, 36, "left"], ["meditate"]),
		_sp("md2", ["mq_sect", 5, 41, "up"], ["meditate"]),
		_sp("md3", ["mq_train", 3, 6, "left"], ["meditate"]),
		_sp("md4", ["mq_train", 5, 6, "left"], ["meditate"]),
		_sp("md5", ["mq_train", 8, 6, "right"], ["meditate"]),
		_sp("ts1", ["mq_train", 2, 3, "up"], ["stake"]),
		_sp("ts2", ["mq_train", 5, 3, "up"], ["stake"]),
		_sp("ts3", ["mq_train", 8, 3, "up"], ["stake"]),
		_sp("rd1", ["mq_lib", 1, 2, "up"], ["read"]),
		_sp("rd2", ["mq_lib", 4, 2, "up"], ["read"]),
		_sp("rd3", ["mq_lib", 7, 2, "up"], ["read"]),
		_sp("rd4", ["mq_lib", 3, 5, "up"], ["read"]),
		_sp("sp1", ["mq_sect", 21, 10, "down"], ["sweep"]),
		_sp("sp2", ["mq_sect", 26, 10, "down"], ["sweep"]),
		_sp("wt1", ["mq_sect", 33, 35, "up"], ["water"]),
		_sp("wt2", ["mq_sect", 32, 34, "right"], ["water"]),
		_sp("gd1", ["mq_sect", 38, 40, "down"], ["garden"]),
		_sp("gd2", ["mq_sect", 42, 41, "down"], ["garden"]),
		_sp("st1", ["mq_sect", 14, 38, "down"], ["stroll"]),
		_sp("st2", ["mq_sect", 30, 38, "down"], ["stroll"]),
		_sp("st3", ["mq_sect", 18, 42, "down"], ["stroll"]),
		_sp("st4", ["mq_sect", 30, 42, "down"], ["stroll"]),
	]
	var npcs := [
		{"id": "lu", "name": "陸鳴川", "sprite": "sect_senior", "person": "lu", "likes": {"sword": 4, "meditate": 2, "read": 2, "stroll": 1, "chat": 1}, "home": ["mq_cell_1", 1, 2, "down"], "seat": ["mq_kitchen", 7, 2, "left"], "wake": 19, "sleep": 82},
		{"id": "gu", "name": "顧小滿", "sprite": "disciple_girl", "person": "xiaoman", "likes": {"stake": 4, "sword": 2, "chat": 3, "stroll": 1, "read": 0.5}, "pupil": true, "home": ["mq_room_b", 7, 2, "down"], "seat": ["mq_kitchen", 3, 2, "right"], "wake": 21, "sleep": 83},
		{"id": "bao", "name": "包小川", "sprite": "disciple", "likes": {"stake": 3, "sword": 2, "chat": 3, "stroll": 2}, "talks": {"stake": [[{"speaker": "包小川", "text": "喝！哈！……別看我，師兄說一套劍沒練滿一百遍不許停。"}, {"speaker": "包小川", "text": "秋生昨天練了一百二十遍，我今天要練一百五十遍！"}]], "sword": [[{"speaker": "包小川", "text": "看我這招「泉湧」！……咦，劍怎麼飛出去了。"}]], "chat": [[{"speaker": "包小川", "text": "我跟你說，昨天秋生打坐打到睡著，口水都流下來了，哈哈！"}]], "class": [[{"speaker": "包小川", "text": "噓——晨課呢，被師兄看見我說話就慘了。"}]], "eat": [[{"speaker": "包小川", "text": "（嘴裡塞得滿滿的）唔……今天的菜……好吃！"}], [{"speaker": "包小川", "text": "秋生又跟我搶最後一塊肉，你評評理！"}]], "sleep": [[{"speaker": "包小川", "text": "明天晨課一定不睡過頭……一定……"}]], "spar": [[{"speaker": "包小川", "text": "別吵！我正要贏了！"}]], "watch": [[{"speaker": "包小川", "text": "上啊！……哎呀，怎麼又輸了。"}]], "listen": [[{"speaker": "包小川", "text": "（小聲）長老講的我一句都沒聽懂……你聽懂了嗎？"}]], "patrol": [[{"speaker": "包小川", "text": "守夜好冷……你帶吃的沒有？"}]], "default": [[{"speaker": "包小川", "text": "我叫包小川，跟秋生同一天入門的。他練得比我快……我才不服！"}]]}, "pupil": true, "home": ["mq_dorm", 5, 2, "down"], "seat": ["mq_kitchen", 3, 4, "right"], "wake": 23, "sleep": 84},
		{"id": "tang", "name": "唐秋生", "sprite": "disciple", "likes": {"meditate": 3, "read": 3, "stake": 2, "chat": 1, "sword": 1}, "talks": {"meditate": [[{"speaker": "唐秋生", "text": "（閉著眼睛）……心靜，劍才靜。你也坐一會兒吧。"}]], "read": [[{"speaker": "唐秋生", "text": "這本《劍理淺說》寫得真好。「快而不亂」四個字，講了整整三十頁。"}]], "stake": [[{"speaker": "唐秋生", "text": "本派劍法講究「快而不亂，如泉不絕」。說起來簡單，練起來可難了。"}]], "chat": [[{"speaker": "唐秋生", "text": "小川老說要贏我，可他每天晨課都睡過頭。"}]], "class": [[{"speaker": "唐秋生", "text": "（小聲）師兄在看這邊，專心點。"}]], "eat": [[{"speaker": "唐秋生", "text": "吃飯要細嚼慢嚥，師父說的。……小川，你又噎著了。"}], [{"speaker": "唐秋生", "text": "下午練樁前不能吃太飽，不然一蹲馬步就想睡。"}]], "sleep": [[{"speaker": "唐秋生", "text": "噓，小川睡了。他說夢話會背劍訣，挺好笑的。"}]], "listen": [[{"speaker": "唐秋生", "text": "韓長老說的「劍隨意走」，我好像有點懂了。"}]], "patrol": [[{"speaker": "唐秋生", "text": "夜裡的泉聲特別清楚。守夜也不錯。"}]], "default": [[{"speaker": "唐秋生", "text": "在下唐秋生。小川老說要贏我，可他每天晨課都睡過頭。"}]]}, "pupil": true, "home": ["mq_dorm", 8, 2, "down"], "seat": ["mq_kitchen", 7, 4, "left"], "wake": 20, "sleep": 81},
		{"id": "cao", "name": "曹小豆", "sprite": "disciple", "script": "mingquan/sweeper_talk", "likes": {"sweep": 2, "water": 2, "chat": 2, "stroll": 1, "stake": 1}, "home": ["mq_dorm", 11, 2, "down"], "seat": ["mq_kitchen", 6, 4, "up"], "wake": 20, "sleep": 80},
		{"id": "zheng", "name": "鄭大壯", "sprite": "farmer", "likes": {"water": 3, "garden": 3, "stake": 2, "chat": 1}, "talks": {"water": [[{"speaker": "鄭大壯", "text": "挑水俺最在行！在家一天挑二十擔，這點算啥。"}]], "garden": [[{"speaker": "鄭大壯", "text": "卜師傅的菜圃，俺幫著鬆鬆土。種地跟練功一樣，急不得。"}]], "farm": [[{"speaker": "鄭大壯", "text": "山田的稻子跟俺家的一樣，得天天看水。甘伯說俺是天生的莊稼把式。"}]], "pluck": [[{"speaker": "鄭大壯", "text": "採茶比插秧難多了！一芽一葉，俺這手指頭太粗……"}]], "stake": [[{"speaker": "鄭大壯", "text": "嘿！嘿！……這木樁比俺家的牛還結實。"}]], "chat": [[{"speaker": "鄭大壯", "text": "大通鋪住了十幾個人，晚上打呼聲此起彼落……"}]], "sleep": [[{"speaker": "鄭大壯", "text": "呼……呼……（鄭大壯已經睡得打呼了）"}]], "patrol": [[{"speaker": "鄭大壯", "text": "俺在家也守過夜，防偷瓜的。這兒沒瓜，倒是有劍。"}]], "default": [[{"speaker": "鄭大壯", "text": "俺叫鄭大壯，山下種田的。"}, {"speaker": "鄭大壯", "text": "等俺成了正式弟子，就能住兩人一間的房了！"}]]}, "pupil": true, "home": ["mq_dorm", 2, 2, "down"], "seat": ["mq_kitchen", 4, 3, "right"], "wake": 20, "sleep": 80},
		{"id": "hou", "name": "侯三郎", "sprite": "farmer", "likes": {"chat": 3, "stroll": 2, "garden": 1, "stake": 1, "read": 1}, "talks": {"chat": [[{"speaker": "侯三郎", "text": "聽說二師姐葉疏桐下山快一年了，到現在都沒個消息……"}]], "stroll": [[{"speaker": "侯三郎", "text": "出來透透氣。大通鋪悶得很。"}]], "read": [[{"speaker": "侯三郎", "text": "字認得不多，看看圖也好。"}]], "farm": [[{"speaker": "侯三郎", "text": "出家……不對，上山學劍，結果還是在種田。我娘知道了要笑死。"}]], "pluck": [[{"speaker": "侯三郎", "text": "甘伯說明前茶一斤賣十幾兩！這一簍子，夠我半年的月例了。"}]], "sleep": [[{"speaker": "侯三郎", "text": "（翻了個身）……再五刻……再睡五刻就起來……"}]], "default": [[{"speaker": "侯三郎", "text": "我是侯三郎，家裡排行老三。記名弟子都住大通鋪，一人一個床位。"}], [{"speaker": "侯三郎", "text": "天還沒亮就要起來挑水、劈柴、掃地，練劍反倒是排在最後。"}]]}, "pupil": true, "home": ["mq_dorm", 6, 3, "down"], "seat": ["mq_kitchen", 6, 2, "down"], "wake": 22, "sleep": 85},
		{"id": "qiao", "name": "喬木生", "sprite": "disciple", "script": "mingquan/gate_qiao", "likes": {"stake": 2, "chat": 2, "water": 1, "stroll": 1}, "pupil": true, "home": ["mq_dorm", 3, 5, "up"], "seat": ["mq_kitchen", 2, 3, "right"], "wake": 21, "sleep": 82},
		{"id": "he", "name": "何守一", "sprite": "disciple", "script": "mingquan/gate_he", "likes": {"sword": 2, "chat": 2, "stake": 1, "meditate": 1}, "home": ["mq_room_a", 2, 2, "down"], "seat": ["mq_kitchen", 8, 3, "left"], "wake": 20, "sleep": 81},
		{"id": "wei", "name": "韋季安", "sprite": "disciple", "likes": {"garden": 2, "water": 1, "chat": 2, "read": 1, "sword": 1}, "talks": {"shop": [[{"speaker": "韋季安", "text": "奉師命下山採買：米、鹽、燈油、傷藥……還有卜師傅交代的花椒。"}, {"speaker": "韋季安", "text": "明天旬休，山上的師弟們也會下來趕集。"}]], "garden": [[{"speaker": "韋季安", "text": "採買的差事做久了，對菜價比對劍法還熟。"}]], "default": [[{"speaker": "韋季安", "text": "在下韋季安，管採買。山上缺什麼，跟我說一聲，下山時順道帶。"}]]}, "home": ["mq_room_a", 4, 2, "down"], "seat": ["mq_kitchen", 4, 5, "up"], "wake": 20, "sleep": 82},
		{"id": "han", "name": "韓靖秋", "sprite": "sect_elder", "person": "han", "likes": {}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 76},
		{"id": "wen", "name": "聞松年", "sprite": "sect_master", "person": "wen", "likes": {}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 76},
	]
	return {"id": "mingquan", "maps": ["mq_sect", "mq_dorm", "mq_train", "mq_lib", "mq_kitchen", "mq_room_a", "mq_room_b", "mq_cell_1", "mq_hall", "mq_back", "mingquan"], "outdoor": [S, "mq_back", "mingquan"], "spots": spots, "npcs": npcs}


## 晨課：卯時到辰時，陸鳴川帶，記名弟子排兩排；旬休、下雨天沒有
## 在演武台（擂台）上：大師兄站台後正中，弟子兩排三人
const LESSON_LEAD := [S, 23, 18, "down"]
const LESSON_AT := [[S, 21, 20, "up"], [S, 23, 20, "up"], [S, 25, 20, "up"], [S, 21, 22, "up"], [S, 23, 22, "up"], [S, 25, 22, "up"]]
const PUPILS := ["gu", "bao", "tang", "zheng", "hou", "qiao"]


# ── 比武小會、講武、守夜 ─────────────────────────────────
## 比武小會：旬休那天未時，陸鳴川在演武台上主持，同門兩兩上台（每 4 刻換一對），其他人在台邊看（下雨下雪不比）
## 講武：初五、十五、廿五的申時，韓靖秋在練功房講，同門坐著聽
## 守夜：每晚輪一個人（拜入門下的話你也排進去），亥時到子時在廣場巡；過了半夜算前一天的班

const 亥 := 11
## 同門的實力（比武的名次、你上場碰到誰都照這個；之後同門會自己變強）
const POWER := {"gu": 30, "bao": 24, "tang": 27, "cao": 12, "zheng": 20, "hou": 15, "qiao": 18, "he": 45, "wei": 40}
const FIGHTERS := ["gu", "bao", "tang", "zheng", "hou", "qiao", "he", "wei", "cao"]
const WATCH_ORDER := ["qiao", "zheng", "hou", "bao", "tang", "gu", "cao", "he", "wei"]
const MEET_HOST := [S, 23, 18, "down"]
const MEET_A := [S, 21, 20, "right"]
const MEET_B := [S, 25, 20, "left"]
const MEET_CROWD := [[S, 19, 20, "right"], [S, 19, 22, "right"], [S, 27, 20, "left"], [S, 27, 22, "left"], [S, 21, 24, "up"], [S, 23, 24, "up"], [S, 25, 24, "up"], [S, 22, 17, "down"]]
const LECTURE_LEAD := ["mq_train", 5, 4, "down"]
const LECTURE_CROWD := [["mq_train", 3, 6, "up"], ["mq_train", 5, 6, "up"], ["mq_train", 8, 6, "up"], ["mq_train", 2, 5, "up"], ["mq_train", 9, 5, "up"], ["mq_train", 4, 5, "up"]]
const PATROL_AT := [S, 23, 15, "down"]


static func is_meet_day(d := -1) -> bool:
	return G.is_xunxiu(d)


static func meet_now(t := -1) -> bool:
	return is_meet_day() and _in(G.time if t < 0 else t, 未, 申) and not (G.weather in ["rain", "snow"])


static func is_lecture_day(d := -1) -> bool:
	return int(G.date_of(d).date) % 10 == 5


static func lecture_now(t := -1) -> bool:
	return is_lecture_day() and _in(G.time if t < 0 else t, 申, 酉)


## 守夜的時段：亥時初到子時末
static func night_now(t := -1) -> bool:
	var x := G.time if t < 0 else t
	return x >= T(亥) or x < 4


## 現在是哪一天的班（過了半夜算前一天）
static func watch_day() -> int:
	return G.day - 1 if G.time < 48 else G.day


## 某一天輪到誰守夜（"hero" 是你）
static func watcher_on(d: int) -> String:
	var order := WATCH_ORDER + (["hero"] if Sect.member("mingquan") else [])
	return order[posmod(d, order.size())]


## 比武小會這個時段台上是哪一對
static func meet_pair(t: int) -> Array:
	var block := (t - T(未)) / 4
	var order := FIGHTERS.duplicate()
	order.sort_custom(func(a, b): return (a.unicode_at(0) * 31 + G.day) % 17 < (b.unicode_at(0) * 31 + G.day) % 17)
	return [order[(block * 2) % order.size()], order[(block * 2 + 1) % order.size()]]


static func events(t: int, wet: bool) -> Dictionary:
	var out := {}
	if not wet and not G.is_xunxiu() and _in(t, 卯, 巳):
		out.lu = {"act": "lead", "at": LESSON_LEAD}
		for i in PUPILS.size():
			out[PUPILS[i]] = {"act": "class", "at": LESSON_AT[i]}
	if meet_now(t):
		var pair := meet_pair(t)
		out.lu = {"act": "lead", "at": MEET_HOST}
		out[pair[0]] = {"act": "spar", "at": MEET_A, "with": pair[1]}
		out[pair[1]] = {"act": "spar", "at": MEET_B, "with": pair[0]}
		var i := 0
		for id in FIGHTERS:
			if not out.has(id) and i < MEET_CROWD.size():
				out[id] = {"act": "watch", "at": MEET_CROWD[i]}
				i += 1
	if lecture_now(t):
		out.han = {"act": "lead", "at": LECTURE_LEAD}
		var i := 0
		for id in ["gu", "tang", "bao", "zheng", "hou", "wei"]:
			out[id] = {"act": "listen", "at": LECTURE_CROWD[i]}
			i += 1
	if night_now(t):
		var who := watcher_on(watch_day())
		if who != "hero":
			out[who] = {"act": "patrol", "at": PATROL_AT, "force": true}
	return out


static func duty(id: String, t: int, _wet: bool) -> Dictionary:
	match id:
		"cao":
			if _in(t, 卯, 巳):
				return {"act": "sweep", "at": [S, 23, 10, "down"]}
		"qiao":
			if _in(t, 未, 酉):
				return {"act": "guard", "at": ["mingquan", 17, 4, "left"]}
		"he":
			if _in(t, 卯, 午):
				return {"act": "guard", "at": ["mingquan", 10, 4, "right"]}
		"wei":
			if G.date_of().date % 10 == 9 and _in(t, 辰, 申):
				return {"act": "shop", "at": [AWAY, 0, 0]}
		"han":
			if _in(t, 未, 申):
				return {"act": "stroll", "at": [S, 30, 24, "left"]}
			if _in(t, 辰, 酉) and not _in(t, 午, 未):
				return {"act": "watch", "at": ["mq_train", 10, 4, "left"]}
			return {"act": "sleep", "at": [AWAY, 0, 0]}
		"wen":
			if _in(t, 未, 申):
				return {"act": "stroll", "at": ["mq_back", 18, 11, "up"]}
			if _in(t, 辰, 酉) and not _in(t, 午, 未):
				return {"act": "read", "at": ["mq_hall", 7, 4, "down"]}
			return {"act": "sleep", "at": [AWAY, 0, 0]}
	return {}
