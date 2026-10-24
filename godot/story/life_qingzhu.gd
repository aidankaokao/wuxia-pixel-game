## 青竹村自己過日子的人（照網頁版 story/life_towns.ts 的青竹村那一群，4.30）：
## 柳承安、鍾嬸、石岳、小石頭、阿牛、杜大樑、陶四、童老根、柳青禾、王嫂、鄒老實。
## 活動範圍：村子、村北、柳宅、茶寮、鐵鋪、王家；家在地圖外的用 "_away"（看不到）。
## 有人物檔案（person）的走人際系統，script 是劇情腳本，talks 是依正在做的事說的話（default 是其他時候）。

const QZ := "qingzhu"
const QN := "qz_north"
const LIU := "qz_liu"
const TEA := "qz_tea"
const SMITH := "qz_smithy"
const WANG := "qz_wang"
const AWAY := "_away"


## 時辰（子 0 … 亥 11）開始的那一刻，再加幾刻
static func T(s: int, ke := 0) -> int:
	return s * 8 - 4 + ke


const 卯 := 3
const 辰 := 4
const 巳 := 5
const 午 := 6
const 未 := 7
const 申 := 8
const 酉 := 9
const 戌 := 10


static func _in(t: int, a: int, b: int) -> bool:
	return t >= T(a) and t < T(b)


static func _sp(id: String, at: Array, acts: Array, pair := "") -> Dictionary:
	var d := {"id": id, "at": at, "acts": acts}
	if pair != "":
		d.pair = pair
	return d


static func _by(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func group() -> Dictionary:
	var spots := [
		# 聊天（兩兩一組）
		_sp("v_chat1a", [QZ, 24, 20, "right"], ["chat"], "v_chat1b"), _sp("v_chat1b", [QZ, 25, 20, "left"], ["chat"], "v_chat1a"),
		_sp("v_chat2a", [QZ, 21, 23, "right"], ["chat"], "v_chat2b"), _sp("v_chat2b", [QZ, 22, 23, "left"], ["chat"], "v_chat2a"),
		_sp("v_chat3a", [QZ, 34, 24, "right"], ["chat"], "v_chat3b"), _sp("v_chat3b", [QZ, 35, 24, "left"], ["chat"], "v_chat3a"),
		_sp("v_chat4a", [QN, 12, 12, "right"], ["chat"], "v_chat4b"), _sp("v_chat4b", [QN, 13, 12, "left"], ["chat"], "v_chat4a"),
		# 散步、玩耍
		_sp("v_walk1", [QZ, 18, 30, "down"], ["stroll"]), _sp("v_walk2", [QZ, 24, 8, "down"], ["stroll"]), _sp("v_walk3", [QZ, 40, 21, "down"], ["stroll"]),
		_sp("v_play1", [QZ, 25, 23, "down"], ["play"]), _sp("v_play2", [QZ, 19, 21, "down"], ["play"]), _sp("v_play3", [QZ, 27, 28, "down"], ["play"]),
		# 下田、洗衣、釣魚
		_sp("v_farm1", [QZ, 9, 33, "down"], ["farm"]), _sp("v_farm2", [QZ, 12, 32, "down"], ["farm"]), _sp("v_farm3", [QZ, 7, 34, "down"], ["farm"]),
		_sp("v_farm4", [QN, 8, 10, "right"], ["farm"]),
		_sp("v_wash1", [QZ, 22, 19, "right"], ["wash"]), _sp("v_wash2", [QN, 16, 6, "right"], ["wash"]),
		_sp("v_fish1", [QZ, 37, 31, "right"], ["fish"]), _sp("v_fish2", [QZ, 37, 23, "right"], ["fish"]),
		# 茶寮喝茶聽書
		_sp("v_tea1", [TEA, 4, 3, "left"], ["tea"]), _sp("v_tea2", [TEA, 6, 3, "right"], ["tea"]), _sp("v_tea3", [TEA, 3, 4, "up"], ["tea"]), _sp("v_tea4", [TEA, 7, 4, "up"], ["tea"]),
	]
	var none := [AWAY, 0, 0]
	var npcs := [
		{"id": "liu", "name": "柳承安", "sprite": "elder", "person": "liu", "home": [LIU, 5, 3, "down"], "seat": [LIU, 6, 2, "down"], "wake": T(卯), "sleep": T(戌), "likes": {"tea": 3, "chat": 2}},
		{"id": "zhong", "name": "鍾嬸", "sprite": "aunt", "person": "zhong", "home": [TEA, 5, 3, "down"], "seat": [TEA, 5, 4, "up"], "wake": T(卯), "sleep": T(戌), "likes": {"chat": 1}},
		{"id": "shi", "name": "石岳", "sprite": "smith", "person": "shi", "home": [SMITH, 5, 5, "up"], "seat": [SMITH, 4, 4, "down"], "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 1}},
		{"id": "kid", "name": "小石頭", "sprite": "child", "script": "qingzhu/kid_talk", "home": none, "seat": none, "wake": T(辰), "sleep": T(酉, 4), "likes": {"play": 5, "fish": 1}},
		{"id": "aniu", "name": "阿牛", "sprite": "farmer", "script": "qingzhu/aniu_talk", "home": [WANG, 7, 2, "down"], "seat": [WANG, 4, 3, "right"], "wake": T(卯), "sleep": T(戌), "likes": {"tea": 1, "chat": 1}},
		{"id": "du", "name": "杜大樑", "sprite": "carpenter", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 1},
			"talks": {"carve": [_by("杜大樑", ["刨子一推，木花就捲起來了。好木頭，聞著都香。"])], "default": [_by("杜大樑", ["村裡誰家的門窗壞了，都是我杜大樑來修。"]), _by("杜大樑", ["竹子做家具輕巧，可要論結實，還是得用杉木。"])]}},
		{"id": "tao", "name": "陶四", "sprite": "peddler", "person": "tao", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 2}},
		{"id": "tong", "name": "童老根", "sprite": "fisher", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 1},
			"talks": {"fish": [_by("童老根", ["噓——別驚了魚。", "雲水河的魚，要心靜才釣得到。練武，其實也是同一個道理。"]), _by("童老根", ["碧漪湖那邊的秦老漢，釣魚的本事比我強。你要學，找他去。"])],
				"default": [_by("童老根", ["人老了，除了釣魚，也沒什麼別的嗜好囉。"])]}},
		{"id": "qinghe", "name": "柳青禾", "sprite": "girl", "person": "qinghe", "home": [LIU, 2, 2, "down"], "seat": [LIU, 3, 4, "left"], "wake": T(卯), "sleep": T(戌), "likes": {"wash": 1, "chat": 2, "tea": 1, "stroll": 1}},
		{"id": "wangsao", "name": "王嫂", "sprite": "lady", "home": [WANG, 3, 2, "down"], "seat": [WANG, 7, 3, "left"], "wake": T(卯), "sleep": T(戌), "likes": {"chat": 1},
			"talks": {"default": [_by("王嫂", ["噓，小聲點，娃兒好不容易才睡著。"]), _by("王嫂", ["我家那口子是阿牛，整天在田裡忙。", "他啊，心思全在莊稼上，連娃兒哭都聽不見。"]), _by("王嫂", ["北邊山上不太平，阿牛上山砍柴，我總要提心吊膽一整天。"])],
				"wash": [_by("王嫂", ["趁娃兒睡著，趕緊把衣裳洗了。"])]}},
		{"id": "zou", "name": "鄒老實", "sprite": "farmer", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 1, "tea": 1},
			"talks": {"default": [_by("鄒老實", ["這幾畝地是我家的。今年雨水好，秧苗長得旺。"]), _by("鄒老實", ["往北走就上蒼嵐山了。以前山上有山賊，現在聽說太平多啦。"])]}},
	]
	return {"id": "qingzhu", "maps": [QZ, QN, LIU, TEA, SMITH, WANG], "outdoor": [QZ, QN], "spots": spots, "npcs": npcs}


## 固定的職責：這個時刻要做什麼、在哪；沒有就回傳空的（照喜好抽）
static func duty(id: String, t: int, wet: bool) -> Dictionary:
	match id:
		"liu":
			# 上午在家門口跟鄉親說話，午後巡田
			if _in(t, 辰, 午):
				return {"act": "stroll", "at": [QZ, 20, 17, "down"]}
			if not wet and _in(t, 未, 申):
				return {"act": "stroll", "at": [QZ, 18, 30, "down"]}
		"zhong":
			# 白天在門口擺茶攤（下雨就回茶寮裡）
			if _in(t, 辰, 酉):
				return {"act": "tea", "at": [TEA, 5, 3, "down"]} if wet else {"act": "stall", "at": [QZ, 32, 17, "down"]}
		"shi":
			# 上午在鋪裡打鐵，午後在門口招呼客人
			if _in(t, 辰, 午) or (wet and _in(t, 未, 酉)):
				return {"act": "forge", "at": [SMITH, 2, 2, "up"]}
			if _in(t, 未, 酉):
				return {"act": "stall", "at": [QZ, 14, 19, "down"]}
		"aniu":
			if not wet and (_in(t, 卯, 午) or _in(t, 未, 酉)):
				return {"act": "farm", "at": [QZ, 9, 33, "down"]}
		"du":
			if not wet and _in(t, 辰, 申) and not _in(t, 午, 未):
				return {"act": "carve", "at": [QZ, 17, 19, "down"]}
		"tao":
			# 旬休進城趕集補貨
			if G.is_xunxiu():
				return {"act": "haul", "at": [AWAY, 0, 0]}
			if _in(t, 辰, 申):
				return {"act": "stall", "at": [QZ, 32, 22, "left"]}
		"tong":
			if not wet and _in(t, 辰, 申) and not _in(t, 午, 未):
				return {"act": "fish", "at": [QZ, 37, 31, "right"]}
		"qinghe":
			# 上午在家做針線
			if _in(t, 辰, 午):
				return {"act": "sew", "at": [LIU, 2, 2, "down"]}
		"wangsao":
			# 一早到井邊打水洗衣，其餘時候多半在家顧娃兒
			if not wet and _in(t, 辰, 巳):
				return {"act": "wash", "at": [QZ, 22, 19, "right"]}
			if _in(t, 巳, 申):
				return {"act": "sew", "at": [WANG, 5, 4, "up"]}
		"zou":
			if not wet and (_in(t, 卯, 午) or _in(t, 未, 酉)):
				return {"act": "farm", "at": [QN, 8, 10, "right"]}
	return {}


## 兩個人站著聊天時湊過去聽：依時事挑一段
static func gossip(a: String, b: String) -> Array:
	var A := func(t: String) -> Dictionary: return {"speaker": a, "text": t}
	var B := func(t: String) -> Dictionary: return {"speaker": b, "text": t}
	var out := []
	if not int(G.flags.get("bandit_boss", 0)):
		out.append([A.call("北邊山上的山賊又下來搶了兩頭豬。"), B.call("村長說要請能人來，可誰敢上斷崖寨？")])
	else:
		out.append([A.call("山賊沒了，今年上山砍柴總算不用提心吊膽。"), B.call("多虧了那位少俠。")])
	if int(G.hero.get("fame", 0)) >= 15:
		out.append([A.call("聽說有個叫%s的年輕人，最近在江湖上闖出了名號。" % G.hero.name), B.call("我也聽說了！說是一個人就挑了斷崖寨。")])
	if G.weather == "rain":
		out.append([A.call("這雨下得，衣裳都晾不乾。"), B.call("明天要是還下，我就不出門了。")])
	out.append([A.call("葛先生昨天說聽濤閣那一段，說到一半就停了，氣死人。"), B.call("他就是要你今天再去喝茶。")])
	out.append([A.call("今年的秧苗長得好，阿牛說秋天要多收兩擔。"), B.call("那你可得幫他割稻，他一個人哪割得完。")])
	out.append([A.call("陶四說臨江城的糖一斤又漲了兩文。"), B.call("那過年的年糕得少放點糖了。")])
	return out
