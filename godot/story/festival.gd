## 節慶（照網頁版 festival.ts、story/festival.ts、story/festival_city.ts）：過年、元宵、清明、端午、中元、中秋、掌門壽辰、冬至、除夕
## （日期在 G.FESTIVALS；條件旗標 festival 是第幾個，平日 0；節期 period、年貨攤 nianhuo、掛燈籠 lantern 見 story.gd）。
## - 節令點心：節慶當天卜大勺發兩份（bu_meal），青竹村鍾嬸送一份（zhong）。
## - 鳴泉（弟子才有）：過年向掌門拜年領紅包、元宵大殿猜燈謎、掌門壽辰拜壽送禮（wen）；清明祭掃劍塚（grave）；
##   端午演武台比劍連戰三場（lu）；中元入夜洗劍池放河燈（pool）；中秋入夜聽泉亭賞月（moon，平常照舊撫琴）。
## - 城裡（不必是弟子）：節慶當天第一次跟認識的人交談互道佳節，過年交情好的塞紅包（greet，Social.talk 呼叫）；
##   臨江城年節的年貨攤（nianhuo_stall）、元宵入夜祝老秀才的燈謎攤（riddle_stall）、端午碼頭賽龍舟（dragon_boat）、
##   中元入夜碼頭放河燈（river_lamps）、中秋入夜望江樓賞月宴（moon_banquet）、冬至雲來客棧的湯圓與除夕年夜飯（inn）。
## 用到的旗標：fest_<活動> 做過那天（節慶一年一天，所以就是一年一次）；fest_greet_<人物> 互道佳節那天

const Train := preload("res://story/train.gd")
const Arts := preload("res://story/arts.gd")

## 節令點心
const FOOD := {"過年": "f_jiaozi", "元宵": "f_yuanxiao", "清明": "f_qingtuan", "端午": "f_zongzi", "中元": "f_subao", "中秋": "f_yuebing",
	"掌門壽辰": "f_shoutao", "冬至": "f_tangyuan", "除夕": "f_niangao"}


static func today() -> String:
	return G.festival_of()


## 入夜（酉時到丑時）
static func night() -> bool:
	return G.shichen_of() in [9, 10, 11, 0, 1]


static func done(key: String) -> bool:
	return int(G.flags.get("fest_" + key, 0)) == G.day


static func mark(key: String) -> void:
	G.flags["fest_" + key] = G.day


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _member() -> bool:
	return Sect.member("mingquan")


static func _aff(ctx: Ctx, id: String, n: int) -> void:
	await Social.add_aff(ctx, Social.def(id), n)


static func _pay(ctx: Ctx, n: int, who: Callable) -> bool:
	if ctx.pay(n):
		return true
	await ctx.say(who.call("要 %d 兩，客官身上好像不太夠。" % n))
	return false


## 心情好：接下來幾場戰鬥武功經驗加成（比現有的好才換）
static func _treat(battles: int, mult: float) -> void:
	var cur: Dictionary = G.hero.get("treat", {})
	if cur.is_empty() or mult * battles >= float(cur.mult) * int(cur.battles):
		G.hero.treat = {"battles": battles, "mult": mult}


static func _restore(stamina := false) -> void:
	var d := Hero.derive(G.hero)
	G.hero.hp = d.max_hp
	G.hero.qi = d.max_qi
	if stamina:
		G.hero.stamina = d.max_stamina


# ── 節令點心 ────────────────────────────────────────────

## 卜大勺領飯的時候：節慶當天換成節令點心兩份（回傳 [物品, 要說的話]，平日是空的）
static func bu_meal() -> Array:
	var f := today()
	if f == "":
		return []
	return [FOOD[f], "今天%s，大夥兒都有%s，給你兩份！" % [f, Ui.item_def(FOOD[f]).name]]


## 鍾嬸：節慶當天送一份點心（處理了回傳 true）
static func zhong(ctx: Ctx) -> bool:
	var f := today()
	if f == "" or f == "掌門壽辰" or done("zhong"):
		return false
	mark("zhong")
	await ctx.say(_by("鍾嬸").call("今天%s，嬸做了些%s，拿一個去嚐嚐！" % [f, Ui.item_def(FOOD[f]).name]))
	await ctx.give(FOOD[f])
	return true


# ── 掌門：過年拜年、元宵燈謎、壽辰拜壽 ──────────────────

## 聞松年的節慶劇情（弟子才有；處理了回傳 true）
static func wen(ctx: Ctx) -> bool:
	var f := today()
	if f == "" or not _member():
		return false
	if f == "過年" and not done("newyear"):
		await _new_year(ctx)
		return true
	if f == "元宵" and not done("lantern"):
		await _riddles(ctx)
		return true
	if f == "掌門壽辰" and not done("birthday"):
		await _birthday(ctx)
		return true
	var hint := {"清明": "今天清明。到後山劍塚，替前輩們掃一掃墓吧。", "端午": "今天端午，鳴川在演武台辦比劍，去試試身手。",
		"中元": "中元了。入夜之後，到洗劍池放一盞河燈，念一念故人。", "中秋": "今晚中秋，月亮一出來，大夥兒都到後山聽泉亭賞月。"}
	if hint.has(f) and not done("hint"):
		mark("hint")
		await ctx.say(_by("聞松年").call(hint[f]))
		return true
	return false


static func _new_year(ctx: Ctx) -> void:
	mark("newyear")
	var silver: int = [10, 20, 30, 40][clampi(int(G.sect.rank), 0, 3)]
	var wen := _by("聞松年")
	await ctx.say(["你向聞松年跪下拜年：「祝師父新年安康！」", wen.call("起來起來。又長了一歲，劍也要長進一些。"), "聞松年從袖中取出一個紅包。"])
	G.silver += silver
	await ctx.say("收到紅包：銀兩 %d。" % silver)
	await _aff(ctx, "wen", 2)


const RIDDLES := [
	["一口咬掉牛尾巴", "告", ["吾", "午"]], ["一月七日", "脂", ["明", "胃"]], ["千里相逢", "重", ["逢", "遠"]],
	["半部春秋", "秦", ["春", "秋"]], ["上不在上，下不在下", "卡", ["一", "中"]], ["四個山字山靠山，四個川字川連川", "田", ["出", "州"]],
	["一人一張口，口下長隻手", "拿", ["拾", "合"]], ["十字對十字，太陽對月亮", "朝", ["明", "早"]], ["一加一，不是二", "王", ["十", "土"]],
	["人在山邊", "仙", ["岸", "屾"]], ["半個月亮", "胖", ["朋", "腓"]], ["兩個月亮並排走", "朋", ["明", "胖"]],
]


## 猜三個燈謎，回傳猜中幾個（學識 3 級起每題先刪掉一個錯的答案）；鳴泉大殿與臨江城燈會共用
static func guess_riddles(ctx: Ctx) -> int:
	var pool := RIDDLES.duplicate()
	pool.shuffle()
	var smart := Arts.learning_level() >= 3
	var right := 0
	for r in pool.slice(0, 3):
		var opts: Array = [r[1]] + ([r[2][0]] if smart else r[2])
		opts.shuffle()
		var c := await ctx.ask("燈謎：「%s」（打一字）%s" % [r[0], "\n（讀過書，一眼就看出有個答案不對）" if smart else ""], opts)
		if opts[c] == r[1]:
			right += 1
			await ctx.say("你答「%s」。——猜中了！" % r[1])
		else:
			await ctx.say("你答「%s」。——不對，謎底是「%s」。" % [opts[c], r[1]])
	return right


static func _riddles(ctx: Ctx) -> void:
	mark("lantern")
	var wen := _by("聞松年")
	await ctx.say(["大殿前掛滿了花燈，每一盞底下都垂著一張紙條。", wen.call("元宵猜燈謎，是本門的老規矩。猜三個，猜中有賞。")])
	var right := await guess_riddles(ctx)
	await ctx.say(wen.call("三個全中！讀書果然沒白讀。" if right == 3 else ("中了 %d 個，不錯。" % right if right > 0 else "一個也沒中？多讀點書吧。")))
	if right > 0:
		G.silver += right * 5
		var up := Crafts.gain("learning", right * 10)
		await ctx.say("獲得銀兩 %d。%s" % [right * 5, ("\n" + up) if up != "" else ""])
	if right == 3:
		await ctx.give("f_yuanxiao", 2)
		await _aff(ctx, "wen", 2)


static func _birthday(ctx: Ctx) -> void:
	var wen := _by("聞松年")
	var gifts := G.bag.keys().filter(func(id):
		var d := Ui.item_def(id)
		return int(G.bag[id]) > 0 and int(d.get("price", 0)) > 0 and not d.has("manual") and d.get("gear", {}).get("sect", "") == "")
	await ctx.say("大殿裡掛起了壽幛，同門們一個個上前向掌門拜壽。")
	var i := gifts.size()
	if gifts.size() > 0:
		i = await ctx.ask("要送什麼當壽禮？（東西越貴重，心意越足）", gifts.map(func(id): return "%s（%d 兩）" % [ctx.item_name(id), Ui.item_def(id).price]) + ["只磕頭"])
	mark("birthday")
	if i >= gifts.size():
		await ctx.say(["你身上沒有像樣的東西可以當壽禮，只好恭恭敬敬地磕了三個頭。" if gifts.is_empty() else "你恭恭敬敬地磕了三個頭。", wen.call("心意到了就好。")])
		await _aff(ctx, "wen", 1)
	else:
		var id: String = gifts[i]
		var price := int(Ui.item_def(id).price)
		ctx.take(id)
		await ctx.say(["你雙手奉上%s。" % ctx.item_name(id), wen.call("這份禮太貴重了……好，好，我收下了。" if price >= 40 else "有心了。")])
		await _aff(ctx, "wen", 5 if price >= 40 else 2)
		await ctx.say("（%s）" % Sect.add_contrib(clampi(roundi(price / 8.0), 1, 20)))
	await ctx.say("壽宴上，卜大勺端出了一大盤壽桃。")
	await ctx.give("f_shoutao", 2)


# ── 清明：祭掃劍塚 ──────────────────────────────────────

static func grave(ctx: Ctx) -> void:
	var lines := ["一座座劍塚，墓前插著前輩用過的劍，劍身早已鏽蝕。", "碑上刻的名字，有些已經被風雨磨得看不清了。"]
	if today() != "清明" or done("qingming"):
		await ctx.say(lines)
		return
	if await ctx.ask("今天清明。要替劍塚的前輩們掃墓嗎？", ["掃墓", "算了"]) != 0:
		return
	mark("qingming")
	ctx.pass_time(4)
	await ctx.say(["你拔去墓前的雜草，擦淨每一座劍塚的石碑，又在墓前插上幾枝新柳。",
		"一陣山風吹過，劍塚間的鏽劍輕輕作響，彷彿前輩們還在這裡練劍。\n（花了半個時辰）"])
	if _member():
		await ctx.say("（%s）" % Sect.add_contrib(5))
	var ready := Train.studyable()
	if ready.size() > 0:
		var i := await ctx.ask("看著這些劍，你想起了哪一門武功？", ready.map(func(s): return Hero.skill_def(s.id).name))
		await ctx.say(Train.apply(ready[i].id, 15, 1.0))


# ── 端午：演武台比劍 ────────────────────────────────────

const DUEL := [["曹小豆", "drill_cao"], ["唐秋生", "drill_tang"], ["顧小滿", "spar_xiaoman"]]


## 陸鳴川：端午比劍（處理了回傳 true）
static func lu(ctx: Ctx) -> bool:
	if today() != "端午" or not _member() or done("duanwu"):
		return false
	var lu := _by("陸鳴川")
	if await ctx.ask(lu.call("端午比劍，連戰三場，點到為止。贏得越多，賞得越多。要上場嗎？"), ["上場", "先不了"]) != 0:
		return true
	if not await Train.exert(ctx, 20, "已經累得喘不過氣，這時候上場只會挨打。"):
		return true
	mark("duanwu")
	var wins := 0
	for foe in DUEL:
		await ctx.say("第 %d 場：%s上場。" % [wins + 1, foe[0]])
		if await ctx.battle(foe[1]) != "win":
			break
		wins += 1
	ctx.pass_time(4)
	match wins:
		3:
			await ctx.say(lu.call("三場全勝！今年的端午劍魁，就是你了。"))
			G.silver += 30
			await ctx.say("獲得銀兩 30。")
			await ctx.give("f_zongzi", 3)
			ctx.fame(5)
			await ctx.say("（%s）" % Sect.add_contrib(10))
		2:
			await ctx.say(lu.call("贏了兩場，很好。"))
			G.silver += 15
			await ctx.say("獲得銀兩 15。")
			await ctx.give("f_zongzi", 2)
		_:
			await ctx.say(lu.call("贏了一場。明年再來。" if wins == 1 else "輸了也不要緊，明年再來。"))
			await ctx.give("f_zongzi")
	await _aff(ctx, "lu", 2)
	return true


# ── 中元：洗劍池放河燈 ──────────────────────────────────

static func pool(ctx: Ctx) -> void:
	var lines := ["「洗劍池」", "相傳開派祖師每練完一套劍，便在此池中洗劍，池水因此終年清冽，不生青苔。"]
	if today() != "中元" or done("zhongyuan"):
		await ctx.say(lines)
		return
	if not night():
		await ctx.say(lines + ["（今天中元。入夜之後可以來這裡放河燈）"])
		return
	if await ctx.ask("池邊已經有人在放河燈了。要放一盞嗎？", ["放河燈", "算了"]) != 0:
		return
	mark("zhongyuan")
	await _float_lamp(ctx, "你點亮一盞紙蓮花燈，輕輕放進池裡。", "燈影隨著水波慢慢漂遠，池面上一點點的燭光，像天上的星星落了下來。")


static func _float_lamp(ctx: Ctx, a: String, b: String) -> void:
	ctx.pass_time(2)
	await ctx.say([a, b, "想起了一些人、一些事，心裡反倒平靜了。"])
	G.hero.qi = Hero.derive(G.hero).max_qi
	_treat(3, 1.15)
	await ctx.say("（內力恢復；心情愉快：接下來 3 場戰鬥武功經驗 ×1.15）")


# ── 中秋：聽泉亭賞月 ────────────────────────────────────

const MOON_FRIENDS := ["wen", "lu", "xiaoman", "han", "yan", "su"]


## 聽泉亭：中秋入夜的賞月（處理了回傳 true，否則照常撫琴）
static func moon(ctx: Ctx) -> bool:
	if today() != "中秋" or not _member() or done("zhongqiu") or not night():
		return false
	mark("zhongqiu")
	ctx.pass_time(4)
	await ctx.say(["一輪明月從山後升起，照得泉水一片銀白。", _by("聞松年").call("一年就這麼一個晚上，大夥兒都在。"),
		"同門們圍坐在亭裡分月餅、說笑，陸鳴川難得多喝了兩杯，顧小滿吵著要比誰的劍影映得最清楚。", "（賞月到深夜。花了半個時辰）"])
	_restore()
	await ctx.give("f_yuebing", 2)
	for id in MOON_FRIENDS:
		if Social.met(id):
			Social._mut(id).aff = clampi(int(Social._mut(id).aff) + 3, -100, 100)
	await ctx.say("（氣血、內力全滿；同門的熟悉度都 +3）")
	return true


# ── 城裡：互道佳節 ──────────────────────────────────────

const GREET := {
	"過年": ["新年好！給{稱}拜年了！", "恭喜恭喜，新年發財！今年也多多照應啊。"],
	"元宵": ["元宵節好！", "晚上城南有燈會，{稱}要去看看嗎？"],
	"端午": ["端午安康！", "吃粽子了沒？碼頭今天賽龍舟，熱鬧得很。"],
	"中秋": ["中秋快樂！", "今晚月亮一定又大又圓。"],
	"冬至": ["冬至大如年，{稱}吃湯圓了沒？", "吃了湯圓，又大一歲囉。"],
	"除夕": ["今天除夕，忙完了就早點回家吃年夜飯吧。", "一年又過去了，明年見！"],
}


## 節慶當天第一次跟認識的人交談：互道佳節（處理了回傳 true）。過年熟悉度 +3、其他 +2；過年交情到熟識以上的塞紅包
static func greet(ctx: Ctx, p: Dictionary) -> bool:
	var f := today()
	if not GREET.has(f) or not Social.met(p.id) or int(G.flags.get("fest_greet_" + p.id, 0)) == G.day:
		return false
	G.flags["fest_greet_" + p.id] = G.day
	var close := Social.stage(p.id) >= Social.FAMILIAR
	if f == "過年":
		await ctx.say("你向%s作揖拜年。" % p.name)
	await ctx.say(Social.fmt(p, GREET[f].map(func(t): return {"speaker": p.name, "text": t})))
	await Social.add_aff(ctx, p, 3 if f == "過年" else 2)
	if f == "過年" and close:
		var n := 6 + randi() % 7
		G.silver += n
		await ctx.say(["%s笑著塞給你一個紅包：「拿去買糖吃！」" % p.name, "收到紅包：銀兩 %d。" % n])
	return true


# ── 臨江城：年貨攤、燈謎攤、龍舟、河燈 ──────────────────

static func nianhuo_stall(ctx: Ctx) -> void:
	await ctx.say(["攤子上紅通通一片：一掛掛鞭炮、成串的紅燈籠、一籠籠剛蒸好的年糕。", _by("喬掌櫃").call("年貨嘞！過年不放炮，年獸找上門！")])
	await ctx.shop("年貨攤", ["firecracker", "red_lantern", "f_niangao", "f_jiaozi"])


static func riddle_stall(ctx: Ctx) -> void:
	var zhu := _by("祝老秀才")
	if done("riddle"):
		await ctx.say(zhu.call("今年的燈謎你都猜過了，讓讓別人吧。明年請早！"))
		return
	await ctx.say(["廣場上掛滿了花燈：兔子燈、荷花燈、走馬燈，一盞盞底下都垂著紙條。", zhu.call("猜燈謎嘍！三題一輪，猜中一題五兩，全中再送一盞燈籠。")])
	if await ctx.ask(zhu.call("要猜嗎？"), ["猜", "先看看燈"]) != 0:
		return
	mark("riddle")
	var right := await guess_riddles(ctx)
	await ctx.say(zhu.call("三題全中！老朽佩服，佩服！" if right == 3 else ("中了 %d 題，不錯不錯。" % right if right > 0 else "一題也沒中？哈哈，明年再來。")))
	if right > 0:
		G.silver += right * 5
		await ctx.say("獲得銀兩 %d。" % (right * 5))
	if right == 3:
		await ctx.give("red_lantern")
		await ctx.give("f_yuanxiao", 2)
		ctx.fame(1)


## 龍舟：[隊伍, 賠率, 勝算]
const TEAMS := [["漕幫", 2, 0.45], ["金刀鏢局", 3, 0.33], ["碧漪漁戶", 4, 0.22]]
const BET := 10


## 擲出贏的隊伍；boost 是碧漪漁戶（你上船時）多出的勝算
static func _winner(boost := 0.0) -> int:
	var w := TEAMS.map(func(t): return float(t[2]))
	w[2] += boost
	var x: float = randf() * (w[0] + w[1] + w[2])
	for i in 3:
		x -= w[i]
		if x < 0:
			return i
	return 0


static func dragon_boat(ctx: Ctx) -> void:
	var hong := _by("洪大槳")
	if done("boat"):
		await ctx.say(hong.call("今年的龍舟賽完啦！明年端午再來，給你留個槳位。"))
		return
	await ctx.say(["江面上三條龍舟一字排開，鑼鼓震天。岸上擠滿了看熱鬧的人。", hong.call("我是今年的龍舟會首洪大槳！要下注，還是上船划？")])
	var c := await ctx.ask(hong.call("碧漪漁戶的船還缺一個槳手。"), ["下注（%d 兩）" % BET, "上碧漪漁戶的船（體力 30）", "在岸上看就好"])
	if c == 2:
		mark("boat")
		await ctx.say(["鼓聲一響，三條龍舟像箭一樣竄了出去，浪花濺得岸上的人一身濕。", "最後是%s的船先搶到了錦標，岸上一片歡呼。" % TEAMS[_winner()][0]])
		await ctx.give("f_zongzi")
		return
	if c == 0:
		var t := await ctx.ask(hong.call("押哪一隊？"), TEAMS.map(func(x): return "%s（一賠%d）" % [x[0], x[1]]) + ["算了"])
		if t >= TEAMS.size() or not await _pay(ctx, BET, hong):
			return
		mark("boat")
		var win := _winner()
		await ctx.say(["你押了%s。" % TEAMS[t][0], "鼓聲一響，三條龍舟破浪而出——", "%s的船頭一個猛衝，先搶到了江心的錦標！" % TEAMS[win][0]])
		if win == t:
			G.silver += BET * int(TEAMS[t][1])
			await ctx.say([hong.call("押中了！眼光不錯！"), "贏得銀兩 %d。" % (BET * int(TEAMS[t][1]))])
		else:
			await ctx.say(hong.call("押錯囉，明年再來！"))
		return
	if not await Train.exert(ctx, 30, "你累得連槳都舉不起來，上了船只會拖累大家。"):
		return
	mark("boat")
	ctx.pass_time(4)
	# 你一個人的力氣也算進去：膂力與體魄越高，碧漪漁戶的勝算越大
	var a := Hero.attrs(G.hero)
	var win := _winner(clampf((a.strength + a.constitution - 20) / 100.0, 0, 0.35))
	await ctx.say(["你接過一支槳，跳上碧漪漁戶的船。鼓手一聲吆喝：「起——！」", "十幾支槳齊刷刷地插進水裡，船身猛地往前一竄。"])
	if win == 2:
		await ctx.say(["最後一段，你咬著牙越划越快，船頭硬是搶在漕幫前頭半個身子——", "錦標到手！岸上的鄉親都跳了起來。", hong.call("好樣的！今年碧漪漁戶翻身了！"), "獲得銀兩 30。"])
		G.silver += 30
		await ctx.give("f_zongzi", 3)
		ctx.fame(3)
	else:
		await ctx.say("拚到最後，還是%s的船先到。你累得癱在船板上，漁戶們拍著你的肩：「明年再來！」" % TEAMS[win][0])
		await ctx.give("f_zongzi", 2)
		ctx.fame(1)
	await ctx.say("（划了半個時辰）")


static func river_lamps(ctx: Ctx) -> void:
	var wu := _by("鄔婆婆")
	if not night():
		await ctx.say(["攤子上擺著一盞盞紙糊的蓮花燈。", wu.call("河燈要等天黑了才放。入夜再來吧。")])
		return
	if done("lamp"):
		await ctx.say("你放的那盞河燈，已經漂到江心，混在一片燈影裡了。")
		return
	if await ctx.ask(wu.call("放一盞河燈吧，替想念的人照照路。兩兩一盞。"), ["放一盞（2 兩）", "算了"]) != 0:
		return
	if not await _pay(ctx, 2, wu):
		return
	mark("lamp")
	await _float_lamp(ctx, "你蹲在江邊，點亮蓮花燈，輕輕推進水裡。", "江面上已經漂著上百盞燈，一點點燭光順著水流往下游去，像一條光做的河。")


# ── 望江樓賞月宴、雲來客棧的冬至與除夕 ────────────────

const BANQUET := 10


## 望江樓：中秋入夜的賞月宴（處理了回傳 true）
static func moon_banquet(ctx: Ctx) -> bool:
	if today() != "中秋" or not night() or done("moon"):
		return false
	var wang := _by("汪福來")
	if await ctx.ask(wang.call("今晚中秋，樓上設了賞月宴，一位 %d 兩，酒菜管夠！" % BANQUET), ["入席", "不了"]) != 0:
		return true
	if not await _pay(ctx, BANQUET, wang):
		return true
	mark("moon")
	ctx.pass_time(4)
	await ctx.say(["望江樓頂層的窗全開了，一輪明月從江面上升起，照得滿江銀光。", "席間有人行酒令，有人吟詩，費一言拍著醒木說了一段「月下斷江」，滿堂叫好。",
		"鄰桌的客商、書生一個個過來敬酒，說說笑笑，不知不覺月已中天。"])
	_restore()
	_treat(3, 1.2)
	await ctx.give("f_yuebing", 2)
	ctx.fame(2)
	await ctx.say("（氣血、內力全滿；接下來 3 場戰鬥武功經驗 ×1.2）")
	return true


## 雲來客棧：冬至請湯圓、除夕入夜的年夜飯（處理了回傳 true）
static func inn(ctx: Ctx) -> bool:
	var he := _by("賀長年")
	var f := today()
	if f == "冬至" and not done("dongzhi"):
		mark("dongzhi")
		await ctx.say([he.call("冬至了！小店請每位客官一碗湯圓，暖暖身子。"), "牛小旺端上一碗熱騰騰的湯圓，紅白各半。"])
		await ctx.give(FOOD["冬至"])
		return true
	if f == "除夕" and night() and not done("nye"):
		if await ctx.ask(he.call("客官今晚除夕還在外頭？不嫌棄的話，一起吃頓年夜飯吧，算你五兩就好。"), ["一起吃", "不了"]) != 0:
			return true
		if not await _pay(ctx, 5, he):
			return true
		mark("nye")
		ctx.pass_time(4)
		await ctx.say(["大堂裡併起兩張桌子，雞鴨魚肉擺了滿滿一桌。賀長年給每個人斟上一杯屠蘇酒。", "窗外的煙火一朵接一朵地開，牛小旺搶著去放鞭炮，嚇得門口的狗直叫。", "守歲守到子時，一年就這麼過去了。"])
		_restore(true)
		_treat(3, 1.2)
		await ctx.give("f_jiaozi", 2)
		await ctx.say("（吃得飽飽的：氣血、內力、體力全滿；接下來 3 場戰鬥武功經驗 ×1.2）")
		return true
	return false
