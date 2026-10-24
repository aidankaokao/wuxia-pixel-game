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
## 山田、南嶺
const F := "mq_farm"
const R := "mq_ridge"
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
		_sp("fm1", [F, 6, 17, "down"], ["farm"]),
		_sp("fm2", [F, 12, 18, "down"], ["farm"]),
		_sp("fm3", [F, 16, 16, "down"], ["farm"]),
		_sp("hb1", [F, 25, 17, "down"], ["tend"]),
		_sp("hb2", [F, 31, 18, "down"], ["tend"]),
	]
	var npcs := [
		{"id": "lu", "name": "陸鳴川", "sprite": "sect_senior", "person": "lu", "likes": {"sword": 4, "meditate": 2, "read": 2, "stroll": 1, "chat": 1}, "home": ["mq_cell_1", 1, 2, "down"], "seat": ["mq_kitchen", 7, 2, "left"], "wake": 19, "sleep": 82},
		{"id": "gu", "name": "顧小滿", "sprite": "disciple_girl", "person": "xiaoman", "likes": {"stake": 4, "sword": 2, "chat": 3, "stroll": 1, "read": 0.5}, "pupil": true, "home": ["mq_room_b", 7, 2, "down"], "seat": ["mq_kitchen", 3, 2, "right"], "wake": 21, "sleep": 83},
		{"id": "bao", "name": "包小川", "sprite": "disciple", "likes": {"stake": 3, "sword": 2, "chat": 3, "stroll": 2}, "talks": {"stake": [[{"speaker": "包小川", "text": "喝！哈！……別看我，師兄說一套劍沒練滿一百遍不許停。"}, {"speaker": "包小川", "text": "秋生昨天練了一百二十遍，我今天要練一百五十遍！"}]], "sword": [[{"speaker": "包小川", "text": "看我這招「泉湧」！……咦，劍怎麼飛出去了。"}]], "chat": [[{"speaker": "包小川", "text": "我跟你說，昨天秋生打坐打到睡著，口水都流下來了，哈哈！"}]], "class": [[{"speaker": "包小川", "text": "噓——晨課呢，被師兄看見我說話就慘了。"}]], "eat": [[{"speaker": "包小川", "text": "（嘴裡塞得滿滿的）唔……今天的菜……好吃！"}], [{"speaker": "包小川", "text": "秋生又跟我搶最後一塊肉，你評評理！"}]], "sleep": [[{"speaker": "包小川", "text": "明天晨課一定不睡過頭……一定……"}]], "spar": [[{"speaker": "包小川", "text": "別吵！我正要贏了！"}]], "watch": [[{"speaker": "包小川", "text": "上啊！……哎呀，怎麼又輸了。"}]], "listen": [[{"speaker": "包小川", "text": "（小聲）長老講的我一句都沒聽懂……你聽懂了嗎？"}]], "patrol": [[{"speaker": "包小川", "text": "守夜好冷……你帶吃的沒有？"}]], "default": [[{"speaker": "包小川", "text": "我叫包小川，跟秋生同一天入門的。他練得比我快……我才不服！"}]]}, "pupil": true, "home": ["mq_dorm", 5, 2, "down"], "seat": ["mq_kitchen", 3, 4, "right"], "wake": 23, "sleep": 84},
		{"id": "tang", "name": "唐秋生", "sprite": "disciple", "likes": {"meditate": 3, "read": 3, "stake": 2, "chat": 1, "sword": 1}, "talks": {"meditate": [[{"speaker": "唐秋生", "text": "（閉著眼睛）……心靜，劍才靜。你也坐一會兒吧。"}]], "read": [[{"speaker": "唐秋生", "text": "這本《劍理淺說》寫得真好。「快而不亂」四個字，講了整整三十頁。"}]], "stake": [[{"speaker": "唐秋生", "text": "本派劍法講究「快而不亂，如泉不絕」。說起來簡單，練起來可難了。"}]], "chat": [[{"speaker": "唐秋生", "text": "小川老說要贏我，可他每天晨課都睡過頭。"}]], "class": [[{"speaker": "唐秋生", "text": "（小聲）師兄在看這邊，專心點。"}]], "eat": [[{"speaker": "唐秋生", "text": "吃飯要細嚼慢嚥，師父說的。……小川，你又噎著了。"}], [{"speaker": "唐秋生", "text": "下午練樁前不能吃太飽，不然一蹲馬步就想睡。"}]], "sleep": [[{"speaker": "唐秋生", "text": "噓，小川睡了。他說夢話會背劍訣，挺好笑的。"}]], "listen": [[{"speaker": "唐秋生", "text": "韓長老說的「劍隨意走」，我好像有點懂了。"}]], "patrol": [[{"speaker": "唐秋生", "text": "夜裡的泉聲特別清楚。守夜也不錯。"}]], "default": [[{"speaker": "唐秋生", "text": "在下唐秋生。小川老說要贏我，可他每天晨課都睡過頭。"}]]}, "pupil": true, "home": ["mq_dorm", 8, 2, "down"], "seat": ["mq_kitchen", 7, 4, "left"], "wake": 20, "sleep": 81},
		{"id": "cao", "name": "曹小豆", "sprite": "disciple", "script": "mingquan/sweeper_talk", "likes": {"sweep": 2, "water": 2, "chat": 2, "stroll": 1, "stake": 1}, "home": ["mq_dorm", 11, 2, "down"], "seat": ["mq_kitchen", 6, 4, "up"], "wake": 20, "sleep": 80},
		{"id": "zheng", "name": "鄭大壯", "sprite": "farmer", "likes": {"water": 3, "garden": 3, "farm": 2, "stake": 2, "chat": 1}, "talks": {"water": [[{"speaker": "鄭大壯", "text": "挑水俺最在行！在家一天挑二十擔，這點算啥。"}]], "garden": [[{"speaker": "鄭大壯", "text": "卜師傅的菜圃，俺幫著鬆鬆土。種地跟練功一樣，急不得。"}]], "farm": [[{"speaker": "鄭大壯", "text": "山田的稻子跟俺家的一樣，得天天看水。甘伯說俺是天生的莊稼把式。"}]], "pluck": [[{"speaker": "鄭大壯", "text": "採茶比插秧難多了！一芽一葉，俺這手指頭太粗……"}]], "stake": [[{"speaker": "鄭大壯", "text": "嘿！嘿！……這木樁比俺家的牛還結實。"}]], "chat": [[{"speaker": "鄭大壯", "text": "大通鋪住了十幾個人，晚上打呼聲此起彼落……"}]], "sleep": [[{"speaker": "鄭大壯", "text": "呼……呼……（鄭大壯已經睡得打呼了）"}]], "patrol": [[{"speaker": "鄭大壯", "text": "俺在家也守過夜，防偷瓜的。這兒沒瓜，倒是有劍。"}]], "default": [[{"speaker": "鄭大壯", "text": "俺叫鄭大壯，山下種田的。"}, {"speaker": "鄭大壯", "text": "等俺成了正式弟子，就能住兩人一間的房了！"}]]}, "pupil": true, "home": ["mq_dorm", 2, 2, "down"], "seat": ["mq_kitchen", 4, 3, "right"], "wake": 20, "sleep": 80},
		{"id": "hou", "name": "侯三郎", "sprite": "farmer", "likes": {"chat": 3, "stroll": 2, "garden": 1, "farm": 1, "stake": 1, "read": 1}, "talks": {"chat": [[{"speaker": "侯三郎", "text": "聽說二師姐葉疏桐下山快一年了，到現在都沒個消息……"}]], "stroll": [[{"speaker": "侯三郎", "text": "出來透透氣。大通鋪悶得很。"}]], "read": [[{"speaker": "侯三郎", "text": "字認得不多，看看圖也好。"}]], "farm": [[{"speaker": "侯三郎", "text": "出家……不對，上山學劍，結果還是在種田。我娘知道了要笑死。"}]], "pluck": [[{"speaker": "侯三郎", "text": "甘伯說明前茶一斤賣十幾兩！這一簍子，夠我半年的月例了。"}]], "sleep": [[{"speaker": "侯三郎", "text": "（翻了個身）……再五刻……再睡五刻就起來……"}]], "default": [[{"speaker": "侯三郎", "text": "我是侯三郎，家裡排行老三。記名弟子都住大通鋪，一人一個床位。"}], [{"speaker": "侯三郎", "text": "天還沒亮就要起來挑水、劈柴、掃地，練劍反倒是排在最後。"}]]}, "pupil": true, "home": ["mq_dorm", 6, 3, "down"], "seat": ["mq_kitchen", 6, 2, "down"], "wake": 22, "sleep": 85},
		{"id": "qiao", "name": "喬木生", "sprite": "disciple", "script": "mingquan/gate_qiao", "likes": {"stake": 2, "chat": 2, "water": 1, "stroll": 1}, "pupil": true, "home": ["mq_dorm", 3, 5, "up"], "seat": ["mq_kitchen", 2, 3, "right"], "wake": 21, "sleep": 82},
		{"id": "he", "name": "何守一", "sprite": "disciple", "script": "mingquan/gate_he", "likes": {"sword": 2, "chat": 2, "stake": 1, "meditate": 1}, "home": ["mq_room_a", 2, 2, "down"], "seat": ["mq_kitchen", 8, 3, "left"], "wake": 20, "sleep": 81},
		{"id": "wei", "name": "韋季安", "sprite": "disciple", "likes": {"garden": 2, "tend": 1, "water": 1, "chat": 2, "read": 1, "sword": 1}, "talks": {"shop": [[{"speaker": "韋季安", "text": "奉師命下山採買：米、鹽、燈油、傷藥……還有卜師傅交代的花椒。"}, {"speaker": "韋季安", "text": "明天旬休，山上的師弟們也會下來趕集。"}]], "garden": [[{"speaker": "韋季安", "text": "採買的差事做久了，對菜價比對劍法還熟。"}]], "default": [[{"speaker": "韋季安", "text": "在下韋季安，管採買。山上缺什麼，跟我說一聲，下山時順道帶。"}]]}, "home": ["mq_room_a", 4, 2, "down"], "seat": ["mq_kitchen", 4, 5, "up"], "wake": 20, "sleep": 82},
		# 管山田的雜役：住在製茶房（看不到），白天照時節採茶、下田、照料藥圃
		{"id": "gan", "name": "甘伯禾", "sprite": "farmer", "script": "mq_fund/gan_talk", "likes": {}, "home": [AWAY, 0, 0, "down"], "seat": [AWAY, 0, 0, "down"], "wake": 16, "sleep": 76},
		# 南嶺的兩個工頭：設施蓋好了才上山；白天在場子裡幹活，下雨天、夜裡在工寮（看不到）
		{"id": "fan", "name": "樊守林", "sprite": "carpenter", "script": "mq_industry/foreman_lumber", "likes": {}, "home": [AWAY, 0, 0, "down"], "seat": [AWAY, 0, 0, "down"], "wake": 16, "sleep": 76},
		{"id": "wu", "name": "鄔石生", "sprite": "smith", "script": "mq_industry/foreman_quarry", "likes": {}, "home": [AWAY, 0, 0, "down"], "seat": [AWAY, 0, 0, "down"], "wake": 16, "sleep": 76},
		{"id": "han", "name": "韓靖秋", "sprite": "sect_elder", "person": "han", "likes": {}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 76},
		{"id": "wen", "name": "聞松年", "sprite": "sect_master", "person": "wen", "likes": {}, "home": ["_away", 0, 0, "down"], "seat": ["_away", 0, 0, "down"], "wake": 20, "sleep": 76},
	]
	return {"id": "mingquan", "maps": ["mq_sect", "mq_dorm", "mq_train", "mq_lib", "mq_kitchen", "mq_room_a", "mq_room_b", "mq_cell_1", "mq_hall", "mq_back", F, R, "mingquan"], "outdoor": [S, "mq_back", F, R, "mingquan"], "spots": spots, "npcs": npcs}


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


# ── 同門的狀態（G.life.mq：members 每人的實力、身分、下山、吵架、師父；news 門派消息；ranking 比武名次） ──

## 同門之間的交情：[a, b, 種類（friend 要好、rival 較勁、admire a 仰慕 b）, 說明]
const BONDS := [
	["bao", "tang", "rival", "同一天入門，誰也不服誰"], ["gu", "lu", "admire", "顧小滿很崇拜大師兄"],
	["zheng", "hou", "friend", "都是山下莊稼人出身，同鄉"], ["cao", "bao", "friend", "常一起溜去廚房偷吃"],
	["gu", "tang", "friend", "常一起討論劍理"], ["qiao", "he", "friend", "一起守山門的搭檔"],
]
const AWAY_WHY := ["下山歷練", "回鄉探親", "隨蘇長老下山行醫"]
## 每天大約長多少實力（愛練的長得快）
const GROW := {"gu": 0.3, "bao": 0.25, "tang": 0.28, "cao": 0.15, "zheng": 0.22, "hou": 0.18, "qiao": 0.2, "he": 0.15, "wei": 0.12, "lu": 0.08}
## 一開始的身分（0 記名、1 正式、2 內門、3 真傳）
const START_RANK := {"he": 1, "wei": 1, "lu": 3}
## 記名弟子實力到這裡有機會升正式；正式到這裡有機會升內門
const PROMOTE_AT := 55
const INNER_AT := 90
const RANK_NAME := ["記名弟子", "正式弟子", "內門弟子", "真傳弟子"]


static func state() -> Dictionary:
	if not G.life.has("mq"):
		G.life.mq = {"members": {}, "news": [], "ranking": []}
	return G.life.mq


## 某位同門的狀態（沒記過就照一開始的）
static func mem(id: String) -> Dictionary:
	var ms: Dictionary = state().members
	if not ms.has(id):
		ms[id] = {"power": float(POWER.get(id, 60 if id == "lu" else 10)), "rank": int(START_RANK.get(id, 0))}
	return ms[id]


static func away(id: String) -> bool:
	var m := mem(id)
	return m.has("away") and int(m.away.until) >= G.day


static func feud(a: String, b: String) -> bool:
	var m := mem(a)
	return m.has("feud") and m.feud.with == b and int(m.feud.until) >= G.day


static func bond(a: String, b: String) -> Array:
	for x in BONDS:
		if (x[0] == a and x[1] == b) or (x[0] == b and x[1] == a):
			return x
	return []


static func _news(text: String, who: Array) -> void:
	var n: Array = state().news
	n.append({"day": G.day, "text": text, "who": who})
	state().news = n.slice(-20)


static func _name(id: String) -> String:
	return Life.npc_def(Life.group("mingquan"), id).get("name", id)


## Life.now 的鉤子：不在山上的人（下山歷練）；記名弟子才上晨課；聊天配對時要好的先湊、吵架的不湊
static func absent(id: String) -> bool:
	return GROW.has(id) and away(id)


static func pair_score(a: String, b: String) -> float:
	if feud(a, b) or feud(b, a):
		return -1.0
	var x := bond(a, b)
	return 3.0 if not x.is_empty() and x[2] == "friend" else (2.0 if not x.is_empty() else 1.0)


## 狀態變了排程要重算：身分、下山、吵架
static func version() -> String:
	var parts := []
	for id in state().members:
		var m: Dictionary = state().members[id]
		parts.append("%s%d%d%d" % [id, int(m.rank), int(m.get("away", {}).get("until", 0)), int(m.get("feud", {}).get("until", 0))])
	return ",".join(parts)


## 每天半夜：成長、升身分、下山、回山、吵架；比武小會那天你沒上場就照實力排名次
static func new_day() -> void:
	var st := state()
	# 掌門定的方針：重武長得快、容易吵；寬和長得慢一點、常下山、少吵架（story/mq_order.gd）
	var policy: String = st.get("policy", "steady")
	var pol := 1.2 if policy == "martial" else (0.95 if policy == "gentle" else 1.0)
	for id in GROW:
		var m := mem(id)
		if m.has("away") and int(m.away.until) < G.day:
			_news("%s%s回山了" % [_name(id), m.away.why], [id])
			m.erase("away")
		if m.has("away"):
			continue
		# 你收的徒弟長得快五成；公庫寬裕、見底也有影響（story/mq_fund.gd）
		m.power = float(m.power) + float(GROW[id]) * (0.6 + randf() * 0.8) * (1.5 if m.get("master", "") == "hero" else 1.0) * load("res://story/mq_fund.gd").growth() * pol
		var before := int(m.rank)
		if int(m.rank) == 0 and float(m.power) >= PROMOTE_AT and randf() < 0.25:
			m.rank = 1
			_news("%s通過了正式弟子的考核" % _name(id), [id])
		elif int(m.rank) == 1 and float(m.power) >= INNER_AT and randf() < 0.15:
			m.rank = 2
			_news("%s過了內門試劍，升為內門弟子" % _name(id), [id])
		# 徒弟升了身分，師父也有面子
		if int(m.rank) > before and m.get("master", "") == "hero" and Sect.member("mingquan"):
			Sect.add_contrib(10)
			_news("你的徒弟%s出息了，你也得了門派貢獻 10" % _name(id), [id])
		# 正式弟子偶爾下山（大師兄、守山門的何守一不走）
		if int(m.rank) == 1 and not id in ["he", "lu"] and randf() < (0.04 if policy == "gentle" else 0.02):
			var why: String = AWAY_WHY.pick_random()
			m.away = {"until": G.day + 5 + randi() % 6, "why": why}
			_news("%s%s去了" % [_name(id), why], [id])
	# 較勁的人偶爾吵架
	for b in BONDS:
		if b[2] != "rival":
			continue
		var ma := mem(b[0])
		if ma.has("away") or feud(b[0], b[1]) or randf() >= (0.12 if policy == "martial" else (0.02 if policy == "gentle" else 0.06)):
			continue
		var until := G.day + 1 + randi() % 3
		ma.feud = {"with": b[1], "until": until}
		mem(b[1]).feud = {"with": b[0], "until": until}
		_news("%s和%s吵了一架，誰也不理誰" % [_name(b[0]), _name(b[1])], [b[0], b[1]])
	if is_meet_day(G.day - 1) and int(G.flags.get("mq_meet_day", 0)) != G.day - 1:
		rank_all(-1)


## 排名次：照實力排；hero_at 是你的位置（-1 照上次的位置，沒排過就不排進去）
static func rank_all(hero_at: int) -> void:
	var sorted := FIGHTERS.filter(func(id): return not away(id))
	sorted.sort_custom(func(a, b): return float(mem(a).power) > float(mem(b).power))
	var prev: int = state().ranking.find("hero")
	var pos := hero_at if hero_at >= 0 else prev
	if pos >= 0 and Sect.member("mingquan"):
		sorted.insert(mini(pos, sorted.size()), "hero")
	state().ranking = sorted


## 跟正在做事的同門說話時多的選項：[選項, 腳本]（弟子才有；練樁、練劍可以一起練，練劍可以對練，打坐可以一起坐）
static func options(id: String, act: String) -> Array:
	if not Sect.member("mingquan") or not GROW.has(id):
		return []
	# 收徒、指點徒弟、典儀主持比武、傳功長老開講（story/mq_order.gd）
	var out: Array = load("res://story/mq_order.gd").options(id, act)
	if act in ["stake", "sword"]:
		out.append(["一起練", "mingquan/practice_with"])
	if act == "sword" and id != "lu":
		out.append(["對練一場", "mingquan/spar_with"])
	if act == "meditate":
		out.append(["一起打坐", "mingquan/sit_with"])
	if act in ["chop", "quarry"]:
		out.append(["一起%s（一個時辰）" % ("伐木" if act == "chop" else "採石"), "mq_industry/help_with"])
	if act in ["pluck", "farm", "tend"]:
		out.append(["一起%s（一個時辰）" % _fund().job_now()[1], "mq_fund/help_with"])
	return out


static func _fund() -> GDScript:
	return load("res://story/mq_fund.gd")


## 伐木場、採石場今天輪到哪個記名弟子去幫工（茶季採茶的那幾個不派；結算產量也看這個）：{lumber: id, quarry: id}
const CREW := ["qiao", "cao", "hou", "zheng", "bao", "tang", "gu"]
const TEA_PICKERS := ["zheng", "hou", "cao", "qiao"]
const TEA_SPOTS := [[F, 6, 4, "up"], [F, 19, 4, "up"], [F, 30, 6, "up"], [F, 9, 6, "up"], [F, 21, 8, "up"]]
const CREW_AT := {"lumber": [R, 6, 10, "left"], "quarry": [R, 31, 10, "right"]}


static func crew_of(d := -1) -> Dictionary:
	var day := G.day if d < 0 else d
	var tea: bool = _fund().tea_season(day).size() > 0
	var pool := CREW.filter(func(id): return int(mem(id).rank) == 0 and not away(id) and not (tea and id in TEA_PICKERS))
	var out := {}
	var i := day
	for fac in ["lumber", "quarry"]:
		if _fund().fac_level(fac) > 0 and i - day < pool.size():
			out[fac] = pool[i % pool.size()]
			i += 1
	return out


## 同門的實力換成對練時的強弱倍數
static func power_mult(id: String) -> float:
	return clampf(0.55 + float(mem(id).power) / 100.0, 0.6, 1.4)


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
	# 巡山執事排過今晚的班（story/mq_order.gd）
	var pick: Dictionary = state().get("watch_pick", {})
	if int(pick.get("day", 0)) == d:
		return pick.who
	var order := WATCH_ORDER + (["hero"] if Sect.member("mingquan") else [])
	return order[posmod(d, order.size())]


## 比武小會這個時段台上是哪一對
static func meet_pair(t: int) -> Array:
	var block := (t - T(未)) / 4
	var order := FIGHTERS.filter(func(id): return not away(id))
	order.sort_custom(func(a, b): return (a.unicode_at(0) * 31 + G.day) % 17 < (b.unicode_at(0) * 31 + G.day) % 17)
	return [order[(block * 2) % order.size()], order[(block * 2 + 1) % order.size()]]


static func events(t: int, wet: bool) -> Dictionary:
	var out := {}
	if not wet and not G.is_xunxiu() and _in(t, 卯, 巳):
		out.lu = {"act": "lead", "at": LESSON_LEAD}
		var k := 0
		for id in PUPILS:
			if int(mem(id).rank) == 0 and not away(id) and k < LESSON_AT.size():
				out[id] = {"act": "class", "at": LESSON_AT[k]}
				k += 1
	if meet_now(t):
		var pair := meet_pair(t)
		out.lu = {"act": "lead", "at": MEET_HOST}
		out[pair[0]] = {"act": "spar", "at": MEET_A, "with": pair[1]}
		out[pair[1]] = {"act": "spar", "at": MEET_B, "with": pair[0]}
		var i := 0
		for id in FIGHTERS:
			if not out.has(id) and not away(id) and i < MEET_CROWD.size():
				out[id] = {"act": "watch", "at": MEET_CROWD[i]}
				i += 1
	if lecture_now(t):
		# 你當了傳功長老，就由你主講（找聽講的人開講），韓靖秋不上台
		if load("res://story/mq_order.gd").holder_of("elder_teach") == "han":
			out.han = {"act": "lead", "at": LECTURE_LEAD}
		var i := 0
		for id in ["gu", "tang", "bao", "zheng", "hou", "wei"]:
			out[id] = {"act": "listen", "at": LECTURE_CROWD[i]}
			i += 1
	# 茶季：巳時、未時兩個時辰，沒事的記名弟子到山田採茶（下雨不採）
	var free_pupil := func(id: String) -> bool: return not out.has(id) and not away(id) and int(mem(id).rank) == 0
	if _fund().tea_season().size() > 0 and not wet and (_in(t, 巳, 午) or _in(t, 未, 申)):
		var i := 0
		for id in TEA_PICKERS:
			if free_pupil.call(id) and i < TEA_SPOTS.size():
				out[id] = {"act": "pluck", "at": TEA_SPOTS[i]}
				i += 1
	# 南嶺的伐木場、採石場：辰時到午時、未時到申時，輪到的記名弟子去幫工（旬休、下雨不去；出事停工時也不去）
	if not G.is_xunxiu() and not wet and (_in(t, 辰, 午) or _in(t, 未, 申)):
		var crew := crew_of()
		for fac in crew:
			var id: String = crew[fac]
			if not out.has(id) and _fund().event_on("fire" if fac == "lumber" else "collapse").is_empty():
				out[id] = {"act": "chop" if fac == "lumber" else "quarry", "at": CREW_AT[fac]}
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
		"gan":
			if not _in(t, 卯, 酉) or _in(t, 午, 未):
				return {"act": "home" if _in(t, 卯, 酉) else "sleep", "at": [AWAY, 0, 0]}
			if _fund().tea_season().size() > 0:
				return {"act": "pluck", "at": [F, 32, 4, "up"]}
			var m := int(G.date_of().month)
			return {"act": "farm", "at": [F, 9, 19, "down"]} if m >= 3 and m <= 8 else {"act": "tend", "at": [F, 28, 17, "down"]}
		"fan", "wu":
			var fac := "lumber" if id == "fan" else "quarry"
			var work := _in(t, 卯, 酉) and not _in(t, 午, 未)
			var built: bool = _fund().fac_level(fac) > 0
			if not built or not work or _wet:
				return {"act": "home" if built and work else "sleep", "at": [AWAY, 0, 0]}
			return {"act": "chop", "at": [R, 5, 8, "left"]} if fac == "lumber" else {"act": "quarry", "at": [R, 31, 8, "right"]}
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


## 湊過去聽兩個同門聊天（a、b 是名字）：較勁的鬥嘴、要好的聊家常、顧小滿說大師兄、比武名次、時事
static func gossip(a: String, b: String) -> Array:
	var A := func(t: String) -> Dictionary: return {"speaker": a, "text": t}
	var B := func(t: String) -> Dictionary: return {"speaker": b, "text": t}
	var pair := [a, b]
	var out := []
	if "包小川" in pair and "唐秋生" in pair:
		out.append([A.call("%s，這次比武我一定贏你。" % b), B.call("上次你也這麼說，結果呢？"), A.call("上次是我讓你！")])
	if "鄭大壯" in pair and "侯三郎" in pair:
		out.append([A.call("今年家裡的麥子不知收得怎樣……"), B.call("我娘捎信來說雨水好，應該不差。等旬休下山去看看？")])
	if "曹小豆" in pair:
		out.append([A.call("卜師傅今晚燉肉，我聞到了！"), B.call("噓——上次偷吃被抓，掃了三天茅房，你忘啦？")])
	if "喬木生" in pair or "何守一" in pair:
		out.append([A.call("今天上山應考的人又多了兩個。"), B.call("有一個連石階都爬不完，坐在半山腰喘氣，哈哈。")])
	if "顧小滿" in pair:
		var other: String = b if a == "顧小滿" else a
		out.append([{"speaker": "顧小滿", "text": "大師兄今天那一劍你看見沒？快得我都沒看清……"}, {"speaker": other, "text": "嘿，又在說大師兄了。"}])
	# 門派消息（近五天、不是在說他們自己的）
	var recent: Array = state().news.filter(func(x): return G.day - int(x.day) <= 5 and not x.who.any(func(w): return _name(w) in pair))
	for n in recent.slice(-2):
		out.append([A.call("聽說了沒？%s。" % n.text), B.call("真的？……唉，我什麼時候也能這樣。")])
	var ranking: Array = state().ranking
	if ranking.size() > 0:
		out.append([A.call("這一旬比武，%s拿了頭名。" % ("新來的那位" if ranking[0] == "hero" else _name(ranking[0]))), B.call("下回換我！")])
	if int(G.flags.get("bandit_boss", 0)) > 0:
		out.append([A.call("聽說斷崖寨被人挑了，祁三刀都栽了！"), B.call("不知道是哪路高手，真想見見。")])
	out.append([A.call("二師姐葉疏桐下山都快一年了，你說她會不會不回來了？"), B.call("別亂說，大師兄聽見要生氣的。")])
	out.append([A.call("昨晚又聽見後山有笛聲，你聽見沒？"), B.call("別嚇我，我晚上還要守夜呢。")])
	return out


## 開發用：跑兩百天的半夜更新，印出每個人的實力、身分與門派消息（run:life_mingquan/debug）
static func debug(_ctx: Ctx) -> void:
	for i in 200:
		G.day += 1
		new_day()
	for id in GROW:
		print("MQ ", id, " ", mem(id))
	for n in state().news.slice(-8):
		print("NEWS ", n.day, " ", n.text)
