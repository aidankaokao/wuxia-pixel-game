## 大埠頭自己過日子的人（照網頁版 story/life_towns.ts 的大埠頭那一群）：
## 龐老大（寅時出海、午後補網，找他幫忙收網）、鍾小螺（卯時到未時顧魚攤）、龐小浪（上午幫忙顧攤）、
## 譚大力（白天在東海碼頭扛貨）、殷海客（老水手，喝茶看海）、梅小貝（早上陪奶奶在海神祠上香）。
## 活動範圍：港口、望潮客棧、海神祠。

const BP := "dabutou"
const BPI := "bp_inn"
const SHRINE := "bp_shrine"
const AWAY := "_away"


static func T(s: int, ke := 0) -> int:
	return s * 8 - 4 + ke


const 寅 := 2
const 卯 := 3
const 辰 := 4
const 巳 := 5
const 午 := 6
const 未 := 7
const 申 := 8


static func _in(t: int, a: int, b: int) -> bool:
	return t >= T(a) and t < T(b)


static func _sp(id: String, at: Array, acts: Array, pair := "") -> Dictionary:
	var d := {"id": id, "at": at, "acts": acts}
	if pair != "":
		d.pair = pair
	return d


static func group() -> Dictionary:
	var spots := [
		_sp("p_chat1a", ["dabutou", 15, 15, "right"], ["chat"], "p_chat1b"),
		_sp("p_chat1b", ["dabutou", 16, 15, "left"], ["chat"], "p_chat1a"),
		_sp("p_chat2a", ["dabutou", 17, 24, "right"], ["chat"], "p_chat2b"),
		_sp("p_chat2b", ["dabutou", 18, 24, "left"], ["chat"], "p_chat2a"),
		_sp("p_chat3a", ["dabutou", 30, 7, "right"], ["chat"], "p_chat3b"),
		_sp("p_chat3b", ["dabutou", 31, 7, "left"], ["chat"], "p_chat3a"),
		_sp("p_mend1", ["dabutou", 21, 27, "down"], ["mend"]),
		_sp("p_mend2", ["dabutou", 33, 24, "up"], ["mend"]),
		_sp("p_play1", ["dabutou", 12, 25, "down"], ["play"]),
		_sp("p_play2", ["dabutou", 14, 27, "down"], ["play"]),
		_sp("p_play3", ["dabutou", 24, 6, "down"], ["play"]),
		_sp("p_walk1", ["dabutou", 41, 25, "down"], ["stroll"]),
		_sp("p_walk2", ["dabutou", 40, 7, "down"], ["stroll"]),
		_sp("p_walk3", ["dabutou", 23, 28, "down"], ["stroll"]),
		_sp("p_tea1", ["bp_inn", 2, 5, "up"], ["tea"]),
		_sp("p_tea2", ["bp_inn", 7, 5, "up"], ["tea"]),
		_sp("p_tea3", ["bp_inn", 5, 3, "down"], ["tea"]),
		_sp("p_pray1", ["bp_shrine", 3, 2, "up"], ["pray"]),
		_sp("p_pray2", ["bp_shrine", 6, 2, "up"], ["pray"]),
	]
	var npcs := [
		{"id": "pang", "name": Person.full_name("pang"), "sprite": "fisher", "script": "dabutou/fisher_talk", "likes": {"tea": 3, "chat": 1}, "home": ["_away", 0, 0, "down"], "seat": ["bp_inn", 4, 4, "left"], "wake": 12, "sleep": 76},
		{"id": "xiaoluo", "name": Person.full_name("xiaoluo"), "sprite": "lady", "likes": {"chat": 3, "mend": 1, "pray": 1}, "talks": {"stall": [[{"speaker": "鍾小螺", "text": "買魚到攤子前面挑！早上的最新鮮！"}]], "default": [[{"speaker": "鍾小螺", "text": "魚賣完了，明天請早。"}], [{"speaker": "鍾小螺", "text": "龐老大那條船，比他年紀還大。"}]]}, "home": ["_away", 0, 0, "down"], "seat": ["bp_inn", 6, 4, "right"], "wake": 20, "sleep": 76},
		{"id": "xiaolang", "name": Person.full_name("xiaolang"), "sprite": "child", "likes": {"play": 4, "stroll": 1}, "talks": {"stall": [[{"speaker": "龐小浪", "text": "海帶、鮮蝦，都是我爹船上撈的！"}]], "default": [[{"speaker": "龐小浪", "text": "我爹說，等我長大了就帶我出海！"}], [{"speaker": "龐小浪", "text": "我會游泳喔！可以游到那艘大船那邊！……騙你的。"}]]}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 72},
		{"id": "tan", "name": Person.full_name("tan"), "sprite": "farmer", "likes": {"tea": 2, "chat": 2}, "talks": {"haul": [[{"speaker": "譚大力", "text": "扛了一早上的貨，海船上的箱子一個比一個重。"}], [{"speaker": "譚大力", "text": "漕幫的人說，碼頭上的活兒都得先跟他們打招呼。"}]], "default": [[{"speaker": "譚大力", "text": "收工！一身臭汗，先喝碗茶再說。"}]]}, "home": ["_away", 0, 0, "down"], "seat": ["bp_inn", 3, 5, "up"], "wake": 20, "sleep": 76},
		{"id": "yin", "name": Person.full_name("yin"), "sprite": "boatman", "likes": {"tea": 3, "stroll": 3, "chat": 1}, "talks": {"default": [[{"speaker": "殷海客", "text": "我跑了二十年的海，從來沒見過這麼囂張的海盜。"}, {"speaker": "殷海客", "text": "他們的船快得像飛，掛的是黑帆……"}], [{"speaker": "殷海客", "text": "東海上有幾座小島，以前漁民在上頭曬網，現在都沒人敢去了。"}]], "stroll": [[{"speaker": "殷海客", "text": "看這雲，明天要起風。老水手的眼睛不會錯。"}]]}, "home": ["_away", 0, 0, "down"], "seat": ["bp_inn", 8, 5, "up"], "wake": 20, "sleep": 84},
		{"id": "mei", "name": Person.full_name("mei"), "sprite": "child", "likes": {"play": 5}, "talks": {"default": [[{"speaker": "梅小貝", "text": "奶奶的籤很準喔！上回王伯伯求了下籤，第二天就跌了一跤。"}]], "pray": [[{"speaker": "梅小貝", "text": "海神娘娘保佑，讓龐伯伯今天多捕幾條大魚！"}]]}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 72},
	]
	return {"id": "dabutou", "maps": [BP, BPI, SHRINE], "outdoor": [BP], "spots": spots, "npcs": npcs}


static func duty(id: String, t: int, wet: bool) -> Dictionary:
	match id:
		"pang":
			if not wet and t >= T(寅, 4) and t < T(午):
				return {"act": "boat", "at": [AWAY, 0, 0]}
			if t >= T(未) and t < T(申, 4):
				return {"act": "mend", "at": [BP, 21, 27, "down"]}
		"xiaoluo":
			if _in(t, 卯, 未):
				return {"act": "stall", "at": [BP, 25, 25, "down"]}
		"xiaolang":
			if _in(t, 辰, 午):
				return {"act": "stall", "at": [BP, 28, 25, "down"]}
		"tan":
			if not wet and _in(t, 辰, 申) and not _in(t, 午, 未):
				return {"act": "haul", "at": [BP, 41, 15, "left"]}
		"mei":
			if _in(t, 辰, 巳):
				return {"act": "pray", "at": [SHRINE, 3, 2, "up"]}
	return {}


## 湊過去聽兩個人聊天
static func gossip(a: String, b: String) -> Array:
	var A := func(t: String) -> Dictionary: return {"speaker": a, "text": t}
	var B := func(t: String) -> Dictionary: return {"speaker": b, "text": t}
	var out := [
		[A.call("黑帆的船昨天又在外海晃了一圈。"), B.call("船行說這個月的海船都要結伴走了。")],
		[A.call("今天潮水大，龐老大的船回得晚。"), B.call("他那條老船，也該修修了。")],
	]
	if G.weather == "rain":
		out.append([A.call("這雨下得，衣裳都晾不乾。"), B.call("明天要是還下，我就不出門了。")])
	if int(G.hero.get("fame", 0)) >= 15:
		out.append([A.call("聽說有個年輕人，最近在江湖上闖出了名號。"), B.call("我也聽說了！好像還幫官府抓過人呢。")])
	return out
