class_name Quests
## 任務日誌（書本的「江湖事」）：每個任務的步驟都由劇情旗標算出來，不另外存。
## 新的任務：寫一個回傳 {id, title, giver, place, desc, done, steps: [[說明, 做到了沒]], reward} 的函式（還沒接的回傳空的），加進 all()。


static func all() -> Array:
	var out := []
	for q in [bandits(), xiaohu(), carp(), bridge(), bounty(), mq_join(), mq_rise(), mq_commission("mq_c_path"), mq_commission("mq_c_med"), yz_berth(), cx_salt(), sl_tribute()]:
		if not q.is_empty():
			out.append(q)
	# 進行中的排前面
	out.sort_custom(func(a, b): return not a.done and b.done)
	return out


static func _f(k: String) -> int:
	return int(G.flags.get(k, 0))


## 蒼嵐山賊（story/qingzhu.gd 的 liu_talk、story/canglan.gd）
static func bandits() -> Dictionary:
	var q := _f("q_bandits")
	var boss := _f("bandit_boss")
	if q == 0 and boss == 0:
		return {}
	return {
		"id": "bandits", "title": "蒼嵐山賊", "giver": "柳承安", "place": "青竹村・蒼嵐山", "done": q == 3,
		"desc": "蒼嵐山上來了一夥自稱「斷崖寨」的山賊，寨主祁三刀三天兩頭下山搶糧。受青竹村村長柳承安所託，上山把他們趕走。" if q > 0 else "斷崖寨的山賊盤據蒼嵐山，你自己上山把他們挑了。",
		"steps": [
			["受村長柳承安所託", q > 0],
			["擊退山道上攔路的嘍囉", _f("bandit_scouts") > 0],
			["擊敗斷崖寨寨主祁三刀", boss > 0],
			["回青竹村向柳承安覆命", q == 3],
		],
		"reward": "銀兩 50、輕功「青竹步」與手札、名聲",
	}


## 小虎的木劍（人物檔案 xiaohu 的熟悉度事件與 on_gift，story/qingzhu.gd 的 xiaohu_gift）
static func xiaohu() -> Dictionary:
	var t := _f("xiaohu_tusk")
	if t == 0:
		return {}
	return {
		"id": "xiaohu", "title": "小虎的木劍", "giver": "石小虎", "place": "青竹村・石家鐵鋪", "done": t == 2,
		"desc": "石小虎想自己做一把木劍，劍柄要用山豬獠牙。蒼嵐山道上的山豬有時會掉獠牙，拿到後送給他（面對他按 G）。",
		"steps": [["答應石小虎", true], ["弄到一根山豬獠牙", t == 2 or int(G.bag.get("boar_tusk", 0)) > 0], ["把獠牙送給石小虎", t == 2]],
		"reward": "名聲、石岳肯理你了",
	}


## 碧漪湖的白鯉（秦老漢的熟悉度事件，story/biyi.gd 的 moon_pavilion）
static func carp() -> Dictionary:
	var c := _f("by_carp")
	if _f("by_legend") == 0 and c == 0:
		return {}
	return {
		"id": "carp", "title": "碧漪湖的白鯉", "giver": "秦老漢", "place": "碧漪湖・湖心島望月亭", "done": c > 0,
		"desc": "傳說每月十五的夜裡，白鯉會浮上湖心島的望月亭邊。帶著釣竿去等等看（釣魚 3 級以上才有本事跟牠周旋）。秦老漢可以撐船送你過去。" if c == 0
			else ("月圓之夜，你在望月亭釣起了白鯉，又把牠放回湖裡。掌心留下一片銀白的鱗。" if c == 1 else "月圓之夜，你在望月亭釣起了白鯉，把牠帶走了。"),
		"steps": [["聽秦老漢說白鯉的傳說", true], ["釣魚練到 3 級", Crafts.level("fishing") >= 3 or c > 0], ["十五夜裡在望月亭釣起白鯉", c > 0]],
		"reward": "看你怎麼選",
	}


## 雲水渡口造橋（story/bridge.gd）
static func bridge() -> Dictionary:
	var b := _f("bridge")
	if b == 0:
		return {}
	var built: bool = b == 2 and G.day >= _f("bridge_day") + 3
	return {
		"id": "bridge", "title": "雲水渡口造橋", "giver": "季秋娘", "place": "雲水渡口・青竹村・臨江城", "done": built,
		"desc": "南來北往的人過雲水河都得等船。季秋娘想在渡口蓋一座橋：銀兩可以自己捐，也可以找柳村長、鍾嬸、陶四、石岳化緣；青石條在青竹村北的採石場鑿；都齊了再去臨江城北請石匠魯一鑿。",
		"steps": [["答應季秋娘張羅蓋橋", true], ["湊齊銀兩 300（目前 %d）" % mini(_f("bridge_fund"), 300), _f("bridge_fund") >= 300], ["交齊青石條 10 塊（目前 %d）" % mini(_f("bridge_stone"), 10), _f("bridge_stone") >= 10],
			["請魯一鑿動工", b == 2], ["三天後橋蓋好", built]],
		"reward": "名聲 30、雲水茶棚吃東西八折、不用再等船",
	}


## 臨江縣衙的懸賞（story/linjiang.gd）
static func bounty() -> Dictionary:
	var names := {"dogs": ["官道惡犬", "雲水渡口東岸的林子（州圖上）"], "bandits": ["山道毛賊", "往鳴泉山的山道半路（州圖上）"], "river": ["江邊水匪", "臨江城南，碼頭西邊的江灘"]}
	var steps := []
	for id in names:
		var st := _f("lj_b_" + id)
		if st > 0:
			steps.append(["「%s」：%s" % [names[id][0], names[id][1]], st == 2])
	if steps.is_empty():
		return {}
	return {"id": "lj_bounty", "title": "臨江縣衙・懸賞", "giver": "霍青山", "place": "臨江縣衙", "done": false,
		"desc": "揭了縣衙的懸賞：到地點收拾目標，回捕快房找捕頭霍青山領賞。", "steps": steps, "reward": "賞銀與名聲"}


## 拜入鳴泉（story/mingquan.gd 的入門考驗與拜師）
static func mq_join() -> Dictionary:
	var seek := _f("mq_seek")
	var t := _f("mq_trial")
	var joined := _f("mq_join") > 0 or _f("mq_left") > 0
	if seek == 0 and t == 0 and not joined:
		return {}
	return {
		"id": "mq_join", "title": "拜入鳴泉", "giver": "陸鳴川", "place": "鳴泉山・鳴泉劍派", "done": joined,
		"desc": "鳴泉劍派收徒不拘時日，不看出身，只看三關：問心、觀骨、試劍。過了大師兄陸鳴川的考驗，再到大殿拜見掌門聞松年。",
		"steps": [["找大師兄陸鳴川應考", seek > 0 or t > 0 or joined], ["問心、觀骨", t >= 1 or joined], ["試劍：勝過記名弟子顧小滿", t >= 2 or joined], ["到大殿拜見掌門聞松年", joined]],
		"reward": "成為鳴泉劍派的記名弟子、鳴泉劍法、鳴泉腰牌與弟子服",
	}


## 府河泊位（story/yanzhou.gd）：幫漕幫查假執照，或收青蚨會的錢替他們傳話
static func yz_berth() -> Dictionary:
	var b := _f("yz_berth")
	if b == 0:
		return {}
	if b in [4, 5]:
		return {"id": "yz_berth", "title": "府河泊位", "giver": "蕭萬貫", "place": "煙州府城・青蚨會館、漕幫總舵", "done": b == 5 and _f("yz_qf_paid") == 1,
			"desc": "你收了青蚨會會首蕭萬貫的錢，替他把信送給漕幫總舵主褚萬川，勸漕幫按青蚨會的規矩交泊位錢。",
			"steps": [["收下蕭萬貫的五十兩與信", true], ["把信交給褚萬川", b == 5], ["回青蚨會館領尾款", _f("yz_qf_paid") == 1]], "reward": "銀兩 100，跟漕幫翻臉"}
	return {"id": "yz_berth", "title": "府河泊位", "giver": "褚萬川", "place": "煙州府城・漕幫總舵、州衙", "done": b == 7,
		"desc": "府河碼頭東段的泊位，漕幫的船停了三十年。青蚨會拿出州衙的執照說泊位歸他們。漕幫總舵主褚萬川覺得執照有鬼，託你去州衙打聽。",
		"steps": [["答應褚萬川去州衙打聽", true], ["問州衙的師爺柴守中", b >= 2], ["稟告知州韋明德", b >= 3], ["打退青蚨會來尋仇的打手（碼頭上）", b >= 6], ["回漕幫總舵覆命", b == 7]],
		"reward": "銀兩 80、名聲、漕幫的交情（碼頭扛貨工錢多兩成）"}


## 一船私鹽（story/chaoxin.gd）：替鹽課司查私鹽的來路
static func cx_salt() -> Dictionary:
	var s := _f("cx_salt")
	if s == 0:
		return {}
	var base := {"id": "cx_salt", "title": "一船私鹽", "giver": "饒德厚", "place": "潮信城・鹽課司、白沙幫分堂、鹽倉", "reward": "看你怎麼了結"}
	if s == 8:
		base.merge({"done": true, "desc": "你替白沙幫押了一車鹽出南門，打退了巡鹽兵丁。鹽課司那邊，你什麼也沒說。", "steps": [["答應鹽大使去查", true], ["替白沙幫押鹽車出南門", true]]})
		return base
	if s == 9:
		base.merge({"done": true, "desc": "你把白沙幫分堂報給了鹽課司，領了賞銀。分堂被封了，白沙幫的人從此恨你。", "steps": [["答應鹽大使去查", true], ["舉發白沙幫分堂", true]]})
		return base
	base.merge({"done": s == 4,
		"desc": "潮信鹽課司的鹽大使饒德厚抓了一年私鹽，私鹽卻越抓越多。他託你查私鹽的來路。白沙幫分堂主盛四海說，私鹽是從鹽課司自己的鹽倉流出去的。",
		"steps": [["答應鹽大使去查", true], ["到城南的白沙幫分堂探口風", s >= 2], ["戌時以後到港邊的鹽倉後頭看看", s >= 3], ["把帳冊交給鹽大使饒德厚", s == 4]]})
	return base


## 一百匹雲錦（story/sanglin.gd）：織造局的管工剋扣工錢、偷賣貢緞
static func sl_tribute() -> Dictionary:
	var s := _f("sl_tribute")
	if s == 0:
		return {}
	return {"id": "sl_tribute", "title": "一百匹雲錦", "giver": "桑小絃", "place": "桑林城・織造局", "done": s == 4,
		"desc": "桑林織造局的小姑娘桑小絃說，管工廖貴剋扣繡娘織工的工錢，病了也不准歇，夜裡還從後門偷運貢緞出去。",
		"steps": [["答應小絃，去問督造柏文淵", true], ["督造要憑據", s >= 2], ["戌時以後到織造局東牆的後門看看", s >= 3], ["把廖貴的私帳交給督造", s == 4]],
		"reward": "銀兩 50、名聲 5"}


## 鳴泉的下山委託（演武廣場的任務榜）
static func mq_commission(flag: String) -> Dictionary:
	var f := _f(flag)
	if f == 0:
		return {}
	var c: Array = load("res://story/mingquan.gd").COMMISSIONS.filter(func(x): return x[0] == flag)[0]
	return {
		"id": flag, "title": "鳴泉委託・%s" % c[1], "giver": "任務榜", "place": "鳴泉劍派", "done": f == 3,
		"desc": "%s\n%s" % [c[3], c[4]],
		"steps": [["接下委託", true], ["把事情辦完", f >= 2], ["回演武廣場的任務榜覆命", f == 3]],
		"reward": "門派貢獻 %d、名聲 %d" % [c[5], c[6]],
	}


## 鳴泉的晉升：下一級要做到的事（Sect.promotion_checks）；考過了還沒升，最後一步是去大殿見掌門
static func mq_rise() -> Dictionary:
	if not Sect.member("mingquan"):
		return {}
	var r := int(G.sect.rank)
	if r >= 3:
		return {"id": "mq_rise", "title": "鳴泉・真傳弟子", "giver": "聞松年", "place": "鳴泉劍派", "done": true,
			"desc": "你拜了%s為師，成了鳴泉劍派的真傳弟子。" % load("res://story/mingquan.gd").MQ.get(G.sect.get("master", ""), "長老"),
			"steps": [["成為真傳弟子", true]], "reward": "上乘武功、師父每天的指點"}
	var next: String = Sect.def("mingquan").ranks[r + 1].name
	var steps := Sect.promotion_checks().map(func(c): return [c[0], c[1]])
	var waiting := (r == 0 and _f("mq_exam") == 1) or (r == 2 and _f("mq_master") > 0)
	if r != 1:
		steps.append(["到大殿拜見掌門", false])
	return {"id": "mq_rise", "title": "鳴泉・升為%s" % next, "giver": "鳴泉劍派", "place": "鳴泉劍派", "done": false,
		"desc": "考過了，去大殿見掌門聞松年。" if waiting else ["攢功績、練鳴泉劍法，條件齊了到練功房找傳功長老韓靖秋報考。", "條件齊了到練功房找傳功長老韓靖秋試內門。", "條件齊了，又跟長老熟到「熟識」，就能向三位長老之一求拜師試煉：韓靖秋在練功房、嚴守拙在後山思過崖前、蘇芷蘅在藥房。"][r],
		"steps": steps, "reward": ["月白道袍、弟子房、鐵木樁、踏石步", "內門弟子的護腕、年會的一票", "上乘武功、真傳弟子房"][r]}
