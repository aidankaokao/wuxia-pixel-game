## 碧漪湖漁村自己過日子的人（照網頁版 story/life_towns.ts 的碧漪湖那一群）：
## 秦老漢（卯時出船、午後補網、傍晚在棧橋釣魚）、阮大水（清早出船、白天擺魚攤）、喬小荷（上午在荷塘）、汪七（每三天挑魚去青竹村賣）。
## 活動範圍：漁村、湖鮮館、秦家；喬嫂守著湖鮮館（不在這一群裡）。

const BY := "biyi"
const TAV := "by_tavern"
const QIN := "by_qinhome"
const AWAY := "_away"


static func T(s: int, ke := 0) -> int:
	return s * 8 - 4 + ke


const 卯 := 3
const 辰 := 4
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
		_sp("l_chat1a", [BY, 6, 12, "right"], ["chat"], "l_chat1b"), _sp("l_chat1b", [BY, 7, 12, "left"], ["chat"], "l_chat1a"),
		_sp("l_chat2a", [BY, 31, 13, "right"], ["chat"], "l_chat2b"), _sp("l_chat2b", [BY, 32, 13, "left"], ["chat"], "l_chat2a"),
		_sp("l_chat3a", [BY, 17, 13, "right"], ["chat"], "l_chat3b"), _sp("l_chat3b", [BY, 18, 13, "left"], ["chat"], "l_chat3a"),
		_sp("l_mend1", [BY, 4, 11, "up"], ["mend"]), _sp("l_mend2", [BY, 21, 12, "up"], ["mend"]),
		_sp("l_fish1", [BY, 36, 13, "right"], ["fish"]), _sp("l_fish2", [BY, 29, 25, "right"], ["fish"]), _sp("l_fish3", [BY, 35, 14, "right"], ["fish"]),
		_sp("l_pick1", [BY, 8, 20, "down"], ["pick"]), _sp("l_pick2", [BY, 14, 24, "left"], ["pick"]),
		_sp("l_play1", [BY, 14, 12, "down"], ["play"]), _sp("l_play2", [BY, 12, 20, "down"], ["play"]),
		_sp("l_walk1", [BY, 22, 4, "down"], ["stroll"]), _sp("l_walk2", [BY, 16, 26, "down"], ["stroll"]),
		_sp("l_tea1", [TAV, 3, 5, "up"], ["tea"]), _sp("l_tea2", [TAV, 7, 5, "up"], ["tea"]),
	]
	var none := [AWAY, 0, 0]
	var npcs := [
		{"id": "qin", "name": Person.full_name("qin"), "sprite": "fisher", "person": "qinlao", "home": [QIN, 3, 2, "down"], "seat": [TAV, 4, 4, "left"], "wake": T(卯), "sleep": T(戌), "likes": {"tea": 2, "chat": 1, "fish": 1}},
		{"id": "ruan", "name": Person.full_name("ruan"), "sprite": "boatman", "script": "biyi/ruan_stall", "home": none, "seat": [TAV, 6, 4, "right"], "wake": T(卯), "sleep": T(戌), "likes": {"chat": 2, "tea": 2, "mend": 1}},
		{"id": "xiaohe", "name": Person.full_name("xiaohe"), "sprite": "girl", "home": [TAV, 6, 3, "down"], "seat": [TAV, 8, 5, "up"], "wake": T(卯), "sleep": T(戌), "likes": {"play": 4, "pick": 1, "chat": 1},
			"talks": {"pick": [_by("喬小荷", ["荷塘裡的蓮藕可大了！你要不要下來挖？", "……褲腳要挽高一點喔。"])],
				"sleep": [_by("喬小荷", ["（打了個哈欠）明天……明天我還要去荷塘……"])],
				"default": [_by("喬小荷", ["秦爺爺說湖裡有一條白色的大鯉魚。", "我每天都在找，可是只看到白鵝。"]), _by("喬小荷", ["娘做的菱角糕最好吃了！比城裡的桂花糕還好吃！"])]}},
		{"id": "wang7", "name": Person.full_name("wang7"), "sprite": "farmer", "home": none, "seat": [TAV, 2, 5, "up"], "wake": T(卯), "sleep": T(戌), "likes": {"mend": 2, "chat": 2, "fish": 1},
			"talks": {"default": [_by("汪七", ["往西走湖畔小路，一刻鐘就到青竹村。", "我每隔幾天就挑魚過去賣，鍾嬸那兒收得最多。"]), _by("汪七", ["這幾年湖裡的魚少了些。秦老爺子說，是有人在湖東頭下了密網。"])],
				"mend": [_by("汪七", ["網破了不補，魚就從洞裡溜了。跟做人一樣。"])]}},
	]
	return {"id": "biyi", "maps": [BY, TAV, QIN], "outdoor": [BY], "spots": spots, "npcs": npcs}


static func duty(id: String, t: int, wet: bool) -> Dictionary:
	match id:
		"qin":
			if not wet and _in(t, 卯, 午):
				return {"act": "boat", "at": [AWAY, 0, 0]}
			if _in(t, 未, 申):
				return {"act": "mend", "at": [BY, 4, 11, "up"]}
			if _in(t, 申, 酉):
				return {"act": "fish", "at": [BY, 36, 13, "right"]}
		"ruan":
			if not wet and _in(t, 卯, 辰):
				return {"act": "boat", "at": [AWAY, 0, 0]}
			if _in(t, 辰, 申):
				return {"act": "stall", "at": [BY, 27, 14, "down"]}
		"xiaohe":
			if not wet and _in(t, 辰, 午):
				return {"act": "pick", "at": [BY, 8, 20, "down"]}
		"wang7":
			# 每三天挑魚去青竹村賣
			if G.day % 3 == 0 and _in(t, 辰, 申):
				return {"act": "haul", "at": [AWAY, 0, 0]}
	return {}


## 湊過去聽兩個人聊天
static func gossip(a: String, b: String) -> Array:
	var A := func(t: String) -> Dictionary: return {"speaker": a, "text": t}
	var B := func(t: String) -> Dictionary: return {"speaker": b, "text": t}
	var out := [
		[A.call("秦老爺子說，月圓那晚湖心島邊上看得見白鯉。"), B.call("他說了幾十年了，誰見過？")],
		[A.call("湖東頭那片密網又多了，誰下的？"), B.call("還能有誰，城裡來的魚販子唄。")],
	]
	if G.weather == "rain":
		out.append([A.call("下雨天的魚最貪嘴，可惜船出不去。"), B.call("那就在棧橋上釣，一樣的。")])
	if int(G.flags.get("bandit_boss", 0)):
		out.append([A.call("聽說青竹村北邊的山賊被人挑了。"), B.call("那往青竹村賣魚的路就太平了。")])
	return out
