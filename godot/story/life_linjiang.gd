## 臨江城自己過日子的人（照網頁版 story/life_towns.ts 的臨江城那一群；城裡改成九宮格以後重新排了位置）：
## 蕭子墨、胡來喜、何六、孫大娘、余二嫂、阿寶、黃阿順、何婆婆、何小石、杜三嫂、曲老爹。
## 旬休趕集那天，余二嫂、孫大娘、杜三嫂巳時到未時去逛市集（duty 裡照日子排）。

const LJ := "linjiang"
const TOWER := "lj_tower"
const INN := "lj_inn"
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
const 戌 := 10
const 亥 := 11


static func _in(t: int, a: int, b: int, ka := 0, kb := 0) -> bool:
	return t >= T(a, ka) and t < T(b, kb)


static func _sp(id: String, at: Array, acts: Array, pair := "") -> Dictionary:
	var d := {"id": id, "at": at, "acts": acts}
	if pair != "":
		d.pair = pair
	return d


## 城裡的位置
static func p(x: int, y: int, f := "down") -> Array:
	return [LJ, x, y, f]


static func _by(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func group() -> Dictionary:
	var spots := [
		_sp("c_chat1a", p(24, 21, "right"), ["chat"], "c_chat1b"), _sp("c_chat1b", p(25, 21, "left"), ["chat"], "c_chat1a"),
		_sp("c_chat2a", p(44, 38, "right"), ["chat"], "c_chat2b"), _sp("c_chat2b", p(45, 38, "left"), ["chat"], "c_chat2a"),
		_sp("c_chat3a", p(9, 21, "right"), ["chat"], "c_chat3b"), _sp("c_chat3b", p(10, 21, "left"), ["chat"], "c_chat3a"),
		_sp("n_chat1a", p(30, 45, "right"), ["chat"], "n_chat1b"), _sp("n_chat1b", p(31, 45, "left"), ["chat"], "n_chat1a"),
		_sp("n_chat2a", p(12, 38, "right"), ["chat"], "n_chat2b"), _sp("n_chat2b", p(13, 38, "left"), ["chat"], "n_chat2a"),
		_sp("c_walk1", p(30, 44), ["stroll"]), _sp("c_walk2", p(46, 21), ["stroll"]), _sp("c_walk3", p(13, 30), ["stroll"]),
		_sp("n_walk1", p(27, 13), ["stroll"]), _sp("n_walk2", p(47, 45), ["stroll"]),
		_sp("c_shop1", p(38, 35, "right"), ["shop"]), _sp("c_shop2", p(21, 28, "left"), ["shop"]), _sp("c_shop3", p(26, 43, "up"), ["shop"]),
		_sp("c_play1", p(31, 46), ["play"]), _sp("c_play2", p(13, 31), ["play"]), _sp("n_play1", p(26, 13), ["play"]), _sp("n_play2", p(44, 15), ["play"]),
		_sp("n_wash1", p(29, 13, "up"), ["wash"]), _sp("n_wash2", p(11, 29, "up"), ["wash"]), _sp("c_wash1", p(33, 50, "up"), ["wash"]),
		_sp("t_tea1", [TOWER, 2, 5, "up"], ["tea"]), _sp("t_tea2", [TOWER, 6, 5, "up"], ["tea"]), _sp("t_tea3", [TOWER, 7, 3, "down"], ["tea"]), _sp("t_tea4", [TOWER, 3, 3, "down"], ["tea"]),
		_sp("i_tea1", [INN, 2, 5, "up"], ["tea"]), _sp("i_tea2", [INN, 7, 5, "up"], ["tea"]),
		_sp("n_read1", p(12, 21, "up"), ["read"]),
	]
	var none := [AWAY, 0, 0]
	var npcs := [
		{"id": "xiao", "name": "蕭子墨", "sprite": "scholar", "home": none, "seat": [INN, 4, 4, "left"], "wake": T(卯), "sleep": T(亥), "likes": {"tea": 3, "stroll": 2, "chat": 1, "read": 1},
			"talks": {"default": [_by("蕭子墨", ["小生進城趕考，盤纏卻在路上丟了大半……", "聽說望江樓的掌櫃愛才，或許能讓小生題幾句詩，換頓飯吃。"])],
				"read": [_by("蕭子墨", ["「學而不思則罔」……噢，失禮了，小生讀得太入神。"]), _by("蕭子墨", ["書院的呂先生借了小生幾本書，真是好人。"])],
				"tea": [_by("蕭子墨", ["費先生說書，句句有典故，小生聽了都想記下來。"])]}},
		{"id": "hu", "name": "胡來喜", "sprite": "farmer", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 2, "stroll": 1},
			"talks": {"stall": [_by("胡來喜", ["糖人兒——又甜又好看的糖人兒——"]), _by("胡來喜", ["要捏個什麼？猴子、老虎，還是大俠？捏大俠多一文。"])], "default": [_by("胡來喜", ["收攤囉，糖都賣完了。明兒請早！"])]}},
		{"id": "he6", "name": "何六", "sprite": "beggar", "home": p(4, 53), "seat": p(30, 49), "wake": T(卯), "sleep": T(戌), "likes": {"stroll": 1},
			"talks": {"beg": [_by("何六", ["行行好，賞口飯吃吧……", "……小子，看你腳步虛浮，下盤不穩。要上鳴泉山，可得多練練。"]), _by("何六", ["望江樓門口好，吃剩的菜比別處多。"])],
				"sleep": [_by("何六", ["（縮在牆角打呼）……呼……別吵……"])], "default": [_by("何六", ["天快黑了，老叫化找個不漏風的地方窩著。"])]}},
		{"id": "sun", "name": "孫大娘", "sprite": "lady", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 3, "tea": 1, "stroll": 1, "shop": 1},
			"talks": {"shop": [_by("孫大娘", ["布莊的料子又漲價了，這日子怎麼過喲。"])], "default": [_by("孫大娘", ["我家那口子在碼頭幫漕幫記帳，天天回來唉聲嘆氣。"]), _by("孫大娘", ["布莊的料子又漲價了，這日子怎麼過喲。"])]}},
		{"id": "yu", "name": "余二嫂", "sprite": "lady", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 3, "shop": 2, "stroll": 1},
			"talks": {"wash": [_by("余二嫂", ["一大早就得來打水，晚了井邊排得跟長龍似的。"])], "shop": [_by("余二嫂", ["一旬才一回集，不早點來，好東西都讓人挑走了！"])], "default": [_by("余二嫂", ["我家小叔子在鏢局當趟子手，一出門就是半個月。"])]}},
		{"id": "abao", "name": "阿寶", "sprite": "child", "home": none, "seat": none, "wake": T(辰), "sleep": T(酉, 4), "likes": {"play": 5, "stroll": 1},
			"talks": {"default": [[{"speaker": "阿寶", "text": "我長大了要上鳴泉山學劍！"}, {"speaker": "阿寶", "text": "可是我娘說，山上的師父很兇……"}], _by("阿寶", ["嘿！看招！……（拿著樹枝亂揮一通）"])]}},
		{"id": "huang", "name": "黃阿順", "sprite": "elder", "script": "linjiang/huang_tea", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 2, "tea": 1, "chess": 1}},
		{"id": "hepo", "name": "何婆婆", "sprite": "aunt", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 3, "wash": 1},
			"talks": {"default": [_by("何婆婆", ["我在城北住了六十年囉。以前這兒沒這麼多房子，都是菜田。"]), _by("何婆婆", ["城南熱鬧是熱鬧，可我還是喜歡城北，夜裡安安靜靜的，聽得見更夫打更。"])], "wash": [_by("何婆婆", ["老了，手腳不靈光，洗幾件衣裳就腰痠。"])]}},
		{"id": "hexs", "name": "何小石", "sprite": "child", "home": none, "seat": none, "wake": T(辰), "sleep": T(酉, 4), "likes": {"play": 5},
			"talks": {"default": [_by("何小石", ["奶奶說我長大要去書院念書，可我想去鏢局當鏢師！"]), _by("何小石", ["呂先生今天打了我手心……因為我在書上畫烏龜。"])]}},
		{"id": "du3", "name": "杜三嫂", "sprite": "lady", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"chat": 3, "stroll": 1, "shop": 1},
			"talks": {"default": [_by("杜三嫂", ["城北的井水比城南的甜，洗衣裳也乾淨。"]), _by("杜三嫂", ["聽說漕幫跟鏢局又吵起來了，唉，城南那邊老是不太平。"])]}},
		{"id": "qu", "name": "曲老爹", "sprite": "elder", "home": none, "seat": none, "wake": T(卯), "sleep": T(戌), "likes": {"tea": 3, "stroll": 1, "chat": 1},
			"talks": {"chess": [_by("曲老爹", ["年輕人，坐下來陪老頭子下盤棋？……唉，今天手氣不好，改天吧。"]), _by("曲老爹", ["自己跟自己下也有意思——黑棋是我，白棋也是我，總有一個贏。"])],
				"tea": [_by("曲老爹", ["望江樓的茶貴是貴，可費先生說書不收錢，算起來不虧。"])], "default": [_by("曲老爹", ["人老了，就喜歡曬太陽、下棋、聽書。"])]}},
	]
	return {"id": "linjiang", "maps": [LJ, TOWER, INN], "outdoor": [LJ], "spots": spots, "npcs": npcs}


static func duty(id: String, t: int, wet: bool) -> Dictionary:
	# 旬休趕集：幾位大嬸巳時到未時去逛市集
	var market := {"yu": p(26, 43, "up"), "sun": p(29, 43, "up"), "du3": p(32, 43, "up")}
	if G.is_xunxiu() and not wet and market.has(id) and _in(t, 巳, 未):
		return {"act": "shop", "at": market[id]}
	match id:
		"xiao":
			if _in(t, 辰, 午):
				return {"act": "read", "at": p(12, 21, "up")}
		"hu":
			if _in(t, 辰, 酉):
				return {"act": "stall", "at": p(25, 46)}
		"he6":
			if _in(t, 辰, 午):
				return {"act": "beg", "at": p(30, 49)}
			if _in(t, 未, 酉):
				return {"act": "beg", "at": p(44, 38)}
		"sun":
			if _in(t, 辰, 巳):
				return {"act": "shop", "at": p(38, 35, "right")}
		"yu":
			if _in(t, 卯, 辰, 4, 4):
				return {"act": "wash", "at": p(11, 29, "up")}
		"huang":
			if _in(t, 辰, 酉):
				return {"act": "stall", "at": p(23, 11)}
		"hepo":
			if not wet and _in(t, 巳, 午):
				return {"act": "tea", "at": p(28, 5)}
		"hexs":
			if not G.is_xunxiu() and _in(t, 辰, 午):
				return {"act": "study", "at": [AWAY, 0, 0]}
		"du3":
			if _in(t, 辰, 巳, 0, 4):
				return {"act": "wash", "at": p(33, 50, "up")}
		"qu":
			if not wet and _in(t, 未, 酉):
				return {"act": "chess", "at": p(12, 25, "right")}
	return {}


static func gossip(a: String, b: String) -> Array:
	var A := func(t: String) -> Dictionary: return {"speaker": a, "text": t}
	var B := func(t: String) -> Dictionary: return {"speaker": b, "text": t}
	var out := [
		[A.call("望江樓的費先生今天又說《劍俠傳》，聽說說到最精彩的地方了。"), B.call("那我晚點也去聽！")],
		[A.call("漕幫跟鏢局的人前天在碼頭又差點打起來。"), B.call("唉，神仙打架，凡人遭殃。")],
		[A.call("鳴泉山上又在收徒了，我家那小子吵著要去。"), B.call("山上苦哇，我看他吃不了那個苦。")],
	]
	if G.is_xunxiu(G.day + 1):
		out.append([A.call("明天趕集，田家的山貨要早點去搶。"), B.call("我要去沈家的絲行看看，聽說來了新線。")])
	if int(G.flags.get("lj_b_river", 0)) == 1:
		out.append([A.call("江邊那個水匪還沒抓到，夜裡別去碼頭。"), B.call("縣衙不是貼了懸賞嗎？怎麼沒人去揭？")])
	if int(G.flags.get("bandit_boss", 0)):
		out.append([A.call("斷崖寨被人挑了，往青竹村那條路太平多了。"), B.call("是啊，我表哥總算敢挑貨進城了。")])
	if G.weather == "rain":
		out.append([A.call("這雨下得，衣裳都晾不乾。"), B.call("明天要是還下，我就不出門了。")])
	return out
