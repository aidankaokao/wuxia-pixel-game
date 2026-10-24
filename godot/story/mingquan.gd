## 鳴泉劍派（照網頁版 story/sect_mingquan.ts 搬第一輪）：臨江城北、鳴泉山上的小門派，收徒不拘時日。
## - 入門考驗：大師兄陸鳴川主持問心、觀骨、試劍（跟顧小滿過招）；過了到大殿拜見掌門聞松年，成為記名弟子。
## - 門裡的日子：卯時到巳時跟陸鳴川做晨課（旬休沒有）、廣場木樁練樁、練功房蒲團打坐、正式弟子起鐵木人樁、書房研讀與抄錄本門武功、
##   任務榜的雜務（一天三件）與下山委託、伙房卜大勺發飯教菜、值殿柯靜言發月例與弟子服、看名冊、離開師門。
## - 後山：劍塚、試劍石、聽泉亭、霧天泉源旁的白髮老人、野菌。
## - 晉升：記名弟子條件齊了找韓靖秋考正式弟子（三問門規＋連戰齊振遠、孟鐸，不許用藥），過了到大殿由掌門升級；正式弟子試內門（跟何守一過一場＋三問）；
##   內門弟子條件齊了、跟長老熟到熟識，接受三位長老之一的拜師試煉（韓靖秋試劍石、嚴守拙思過崖守三夜、蘇芷蘅採三味藥），過了到大殿升真傳、學上乘武功。
## 門派的狀態在 G.sect（scripts/sect.gd，真傳弟子的師父在 master、師門武功在 master_skill）；年會、公庫、產業之後再搬。
## 用到的旗標：
##   mq_seek 知道要找大師兄應考；mq_trial 1 過了問心觀骨、2 試劍也過了；mq_trial_day 試劍輸掉那天；mq_heart 問心的結果（1 守正、2 謙和、3 好勝）
##   mq_join 是鳴泉弟子（1）；mq_left 離開了鳴泉；mq_exam 正式弟子考核 1 考過了（等掌門升級）2 已升正式；mq_exam_day 考核沒過那天
##   mq_inner 升了內門；mq_inner_day 試過內門那天；mq_true_hint 掌門提過拜師；mq_mt 拜師試煉進行中（1 韓靖秋 2 嚴守拙 3 蘇芷蘅）；mq_mt_day 試煉沒過那天
##   mq_herbs 採到的藥（位元：1 泉心草 2 鐵骨藤 4 雲根芝）；mq_herb_boar 打跑了護藥山豬；mq_master 試煉過了誰（等掌門升真傳）；mq_true 真傳弟子；mq_teacher 拜的師父（1 韓靖秋 2 嚴守拙 3 蘇芷蘅，師父稱你徒兒）
##   mq_morning 做過晨課那天；mq_meal 領過飯那天；mq_chores／mq_chores_day 今天做了幾件雜務；mq_chore_<雜務> 那件做過那天
##   mq_c_path 委託「清理山道」1 接下 2 打跑野狗 3 覆命；mq_c_med 委託「回春堂送藥」1 接下 2 送到 3 覆命
##   mq_mush_west／mq_mush_east 後山野菌採的那天；mq_fog_old 霧天見過白髮老人那天
##   mq_meet_day 參加比武小會那天；mq_meet_place 最近一次比武的名次；mq_lecture 聽講武那天；mq_watch 守過夜的那一班（日子）

const Festival := preload("res://story/festival.gd")
const Train := preload("res://story/train.gd")
const Cook := preload("res://story/cook.gd")
const Chores := preload("res://story/chores.gd")
const Schedule := preload("res://story/schedule.gd")
const LifeMq := preload("res://story/life_mingquan.gd")

const SECT := "mingquan"
## 鳴泉的人（名冊與台詞都用這份名字）
const MQ := {
	"wen": "聞松年", "han": "韓靖秋", "yan": "嚴守拙", "su": "蘇芷蘅", "lu": "陸鳴川", "ye": "葉疏桐",
	"qi": "齊振遠", "fang": "方硯清", "ke": "柯靜言", "song": "宋知微", "miao": "蘇青苗", "meng": "孟鐸",
	"he": "何守一", "wei": "韋季安", "gu": "顧小滿", "qiao": "喬木生", "bao": "包小川", "tang": "唐秋生",
	"cao": "曹小豆", "zheng": "鄭大壯", "hou": "侯三郎", "bu": "卜大勺", "shao": "邵長庚", "gan": "甘伯禾",
}
## 弟子名冊：[名字, 位階, 職司]（主角照身分排進去）
const ROSTER := [
	["wen", "掌門", "鳴泉劍派第七代掌門"], ["han", "長老", "傳功長老，在練功房指點弟子"], ["yan", "長老", "執法長老，坐鎮後山，看守思過崖"],
	["su", "長老", "藥堂長老，常下山行醫"], ["lu", "真傳弟子", "大弟子，主持晨課與入門考驗"], ["ye", "真傳弟子", "二弟子，下山歷練，久未回山"],
	["qi", "內門弟子", "教習，在練功房教基本功"], ["fang", "內門弟子", "知客，在山門內迎客"], ["ke", "內門弟子", "值殿，掌管門規與月例"],
	["song", "內門弟子", "管書"], ["miao", "內門弟子", "管藥，蘇長老的姪女"], ["meng", "內門弟子", "管武器房"],
	["he", "正式弟子", "守山門"], ["wei", "正式弟子", "採買，常下山到臨江城"],
	["gu", "記名弟子", "上個月入門"], ["qiao", "記名弟子", "守山門"], ["bao", "記名弟子", "練劍"], ["tang", "記名弟子", "練劍"],
	["cao", "記名弟子", "掃殿前"], ["zheng", "記名弟子", ""], ["hou", "記名弟子", ""],
	["bu", "雜役", "伙房師傅，管廚房與菜圃"], ["shao", "雜役", "守山人，在後山守了四十年"], ["gan", "雜役", "管後山東坡的茶園、山田與藥圃"],
]

## 晨課：卯時到巳時；練功房、木樁的數值
const MORNING_EXP := 30
const MORNING_CONTRIB := 2
const YARD_EXP := 30
const IRON_EXP := 55
const IRON_STAMINA := 25
const RAIN_EXTRA := 5
## 本門武功練起來多的經驗
const SECT_BONUS := 10
## 雜務：一天三件，每件一個時辰、體力 15、貢獻 3
const CHORES_PER_DAY := 3
const CHORE_KE := 8
const CHORE_STAMINA := 15
const CHORE_REWARD := 3
## 伙房：學菜的學費（門派貢獻；入門、中等、進階、拿手）；賣的食材
const BU_COST := [0, 10, 25, 50]
const KITCHEN_STOCK := ["rice", "flour", "egg", "tofu", "greens", "radish", "chicken", "redbean", "sugar", "osmanthus", "sesame", "almond"]


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func member() -> bool:
	return Sect.member(SECT)


static func rank() -> int:
	return int(G.sect.rank) if member() else -1


static func _contrib(ctx: Ctx, n: int) -> void:
	await ctx.say("（%s）" % Sect.add_contrib(n))


## 熟悉度直接加一點（不冒通知，用在劇情裡順帶的）
static func _aff(id: String, n: int) -> void:
	var r := Social._mut(id)
	r.aff = clampi(int(r.aff) + n, -100, 100)


static func _morning_time() -> bool:
	var s := G.shichen_of()
	return s >= 3 and s <= 5


static func _wet() -> bool:
	return G.weather in ["rain", "snow"]


# ── 入門考驗：問心、觀骨、試劍（大師兄陸鳴川主持） ─────────

const QUESTIONS := [
	["第一問：你為何習武？", ["行俠仗義，鋤強扶弱", "強身健體，護得住身邊的人", "揚名立萬，做天下第一"]],
	["第二問：同門師兄弟與人爭執，錯在同門，你當如何？", ["當面直言，勸他賠罪", "先把兩邊拉開，回頭再說", "先幫同門出頭，錯了再論"]],
	["第三問：倘若師門所傳，不如你在外頭學到的功夫，你會如何？", ["師門武功是根本，先練紮實", "兩邊都學，融會貫通", "哪個厲害就練哪個"]],
]
const BONE := {
	"strength": "臂力不弱，出劍沉得住。", "agility": "筋骨輕靈，是練快劍的料子。", "constitution": "骨架結實，經得起苦練。",
	"energy": "氣息綿長，將來練內功會比別人快。", "insight": "眼神清亮，是個肯想事情的人。學武，悟性最要緊。",
}


static func _heart_and_bone(ctx: Ctx) -> void:
	var lu := _by(MQ.lu)
	await ctx.say([lu.call("本派收徒不拘時日，不看出身，只看三關：問心、觀骨、試劍。"), lu.call("先問心。照實答就好，沒有對錯。")])
	var tally := [0, 0, 0]
	var last := 0
	for q in QUESTIONS:
		last = await ctx.ask(lu.call(q[0]), q[1])
		tally[last] += 1
	var best: int = tally.max()
	var heart: int = last if tally[last] == best else tally.find(best)
	ctx.set_flag("mq_heart", heart + 1)
	var remark: String = ["心裡有把尺，好。只是江湖上的事，不是每件都分得清是非。",
		"不爭不搶，懂得顧全大局。只是有時候，該爭的也得爭。",
		"有股不服輸的勁，練劍的人要有這個。只是別讓它變成戾氣。"][heart]
	await ctx.say([lu.call(remark), "陸鳴川點點頭，在手上的冊子裡記了幾筆。"])
	await ctx.say([lu.call("再來是觀骨。伸出手來。"), "陸鳴川捏了捏你的手腕、肩膀，又按了按你的背脊。"])
	var base: Dictionary = G.hero.base
	var top := "insight"
	for k in base:
		if int(base[k]) > int(base[top]):
			top = k
	await ctx.say(lu.call(BONE.get(top, BONE.insight)))
	ctx.set_flag("mq_trial", 1)


static func _sword_trial(ctx: Ctx) -> void:
	var lu := _by(MQ.lu)
	var xm := _by(MQ.gu)
	if ctx.flag("mq_trial_day") == G.day:
		await ctx.say([lu.call("今天就先歇著吧，明天再來比過。"), lu.call("大通鋪最裡頭有張空鋪，上山應考的人可以借住一晚。")])
		return
	await ctx.say([lu.call("最後一關是試劍。小滿！"), xm.call("來啦！大師兄，這次又要我陪誰比？")])
	await ctx.say([lu.call("她是上個月入門的記名弟子。你跟她過幾招，點到為止。"), lu.call("勝了，這一關就算過。")])
	if await ctx.ask(lu.call("準備好了嗎？"), ["請賜教", "等一下"]) != 0:
		await ctx.say(lu.call("準備好了再來找我。"))
		return
	var o := await ctx.battle("trial_xiaoman")
	if o == "win":
		ctx.set_flag("mq_trial", 2)
		await ctx.say([xm.call("哎呀……輸了輸了。你出手好快！"), lu.call("三關都過了。"), lu.call("去大殿拜見掌門吧，掌門會親自收你入門。")])
		ctx.fame(2)
		return
	ctx.set_flag("mq_trial_day", G.day)
	await ctx.say([xm.call("承讓啦！"), lu.call("根基還差了些。不過能撐到這一步，不算差。"), lu.call("明天再來比過吧。大通鋪最裡頭有張空鋪，可以借住。")])


## 陸鳴川的劇情：入門考驗、晨課；處理了回傳 true，否則照人際系統平常聊
static func lu_story(ctx: Ctx) -> bool:
	var lu := _by(MQ.lu)
	if ctx.flag("mq_left") > 0:
		await ctx.say(lu.call("……你既已離開師門，就各自珍重吧。"))
		return true
	if await Festival.lu(ctx):
		return true
	if not member():
		var t := ctx.flag("mq_trial")
		if t == 2:
			await ctx.say(lu.call("三關都過了，去大殿拜見掌門吧。"))
			return true
		if not G.sect.is_empty():
			return false
		if t == 0:
			await ctx.say(lu.call("在下陸鳴川，鳴泉劍派大弟子。"))
			var c := await ctx.ask(lu.call("閣下上山，是來拜師的？"), ["正是", "只是來看看"])
			ctx.set_flag("mq_seek")
			if c != 0:
				await ctx.say(lu.call("那就隨意看看吧。想拜師的話，隨時來找我。"))
				return true
			await _heart_and_bone(ctx)
			if await ctx.ask(lu.call("問心、觀骨都過了。最後一關試劍，現在就比嗎？"), ["現在就比", "晚點再來"]) != 0:
				await ctx.say(lu.call("好，準備好了再來找我。"))
				return true
		await _sword_trial(ctx)
		return true
	# 旬休未時：比武小會
	if LifeMq.meet_now():
		await _tournament(ctx)
		return true
	# 弟子：晨課在卯時到巳時之間，一天一回；旬休沒有晨課
	if not _morning_time():
		return false
	if G.is_xunxiu():
		await ctx.say(lu.call("今天旬休，不上晨課。想下山就下山，臨江城今天趕集。"))
		return true
	if ctx.flag("mq_morning") == G.day:
		return false
	if await ctx.ask(lu.call("來得正好，今天的晨課要一起練嗎？"), ["跟著練", "晚點再說"]) != 0:
		return false
	await _morning_drill(ctx)
	return true


static func _morning_drill(ctx: Ctx) -> void:
	ctx.set_flag("mq_morning", G.day)
	await ctx.work("stake", "晨課中……")
	ctx.pass_time(8)
	var out := ["你跟著陸鳴川和師兄弟們，在演武廣場上一招一式地練起鳴泉劍法。", "劍風與泉聲混在一起，迴盪在山間……\n（晨課練了一個時辰）"]
	var s := Hero.find_skill(G.hero, "mingquan")
	if not s.is_empty():
		out.append("\n".join(Train._exp_lines("mingquan", MORNING_EXP, true)) if s.level < Hero.cap_of(s) else "「鳴泉劍法」已經練到上限，要突破才能再進一步。")
	await ctx.say(out)
	await _contrib(ctx, MORNING_CONTRIB)


# ── 拜師：大殿見掌門聞松年 ────────────────────────────

static func wen_story(ctx: Ctx) -> bool:
	var wen := _by(MQ.wen)
	if ctx.flag("mq_left") > 0:
		await ctx.say(wen.call("你我師徒緣分已盡，不必多言。"))
		return true
	if await Festival.wen(ctx):
		return true
	if member():
		if ctx.flag("mq_exam") == 1 and rank() == 0:
			await _promotion_ceremony(ctx)
			return true
		if rank() != 2:
			return false
		if ctx.flag("mq_master") > 0:
			await _true_ceremony(ctx)
			return true
		if _ready_to_promote() and ctx.flag("mq_true_hint") == 0:
			ctx.set_flag("mq_true_hint")
			await ctx.say([wen.call("你入了內門以來，功績、武功都長進了不少。是時候拜師了。"),
				wen.call("本門三位長老，各有一門上乘武功：靖秋的「疊泉劍」、守拙的「斷流掌」、芷蘅的「寒潭心經」。"),
				wen.call("靖秋在練功房，守拙在後山思過崖前，芷蘅在藥房。想拜誰為師，就去找誰。"),
				wen.call("只是長老收徒，看的不只是武功，也看緣分——跟長老不夠熟，他們未必肯收。每位長老的試煉也不一樣。")])
			return true
		return false
	if ctx.flag("mq_trial") != 2:
		await ctx.say(wen.call("想入我鳴泉，先去演武廣場找鳴川，過了入門考驗再來。"))
		ctx.set_flag("mq_seek")
		return true
	if not G.sect.is_empty():
		await ctx.say(wen.call("你已有師門，鳴泉不收身在他派之人。"))
		return true
	await _initiation(ctx)
	return true


static func _initiation(ctx: Ctx) -> void:
	var wen := _by(MQ.wen)
	var heart := maxi(0, ctx.flag("mq_heart") - 1)
	var rules := []
	var d := Sect.def(SECT)
	for i in d.rules.size():
		rules.append("%s、%s" % ["一二三四五"[i], d.rules[i][0]])
	await ctx.say([wen.call("你就是鳴川說的那個年輕人？"),
		wen.call(["鳴川說你心裡有把尺。這把尺，守得住是福，守不住是禍。",
			"鳴川說你性子溫和，懂得顧全大局。劍法要穩，人也要穩，這很好。",
			"鳴川說你好勝。好勝不是壞事——只要你勝的是昨天的自己。"][heart]),
		wen.call("本派是小門派，規矩不多，但有五條，入門的人都得守："), "\n".join(rules)])
	if await ctx.ask(wen.call("入了鳴泉，就不能再拜入其他門派。你可願意拜入本門，遵守門規？"), ["弟子願意", "容我再想想"]) != 0:
		await ctx.say(wen.call("拜師是一輩子的事，想清楚了再來。"))
		return
	await ctx.say(["你在祖師像前跪下，恭恭敬敬地叩了三個頭。", wen.call("好。從今天起，你就是鳴泉劍派的記名弟子。"), "聞松年從案上取過一塊木腰牌，親手交給你。"])
	Sect.join(SECT)
	ctx.set_flag("mq_join")
	# 問心的結果：守正合掌門的意、謙和合大師兄的意、好勝讓顧小滿把你當對手
	_aff(["wen", "lu", "xiaoman"][heart], 5)
	G.bag["mq_token"] = 1
	await ctx.say("（得到了鳴泉腰牌）")
	await ctx.learn("mingquan")
	await ctx.say("%s捧來一套灰布衣：「這是記名弟子的衣服。」" % MQ.ke)
	await _issue_uniform(ctx, 0)
	await ctx.say([wen.call("記名弟子住大通鋪。每天跟鳴川做晨課，廣場上的木樁、練功房的蒲團、書房的書，都可以用。"),
		wen.call("本門的「澄泉心法」收在書房，攢夠了門派貢獻，就去找管書的%s抄錄。" % MQ.song),
		wen.call("記名弟子若是覺得不合適，隨時可以離開；成了正式弟子，那就不同了。好好想清楚自己的路。"),
		"（書本多了「門派」一頁：身分、貢獻、晉升條件與門規）"])


# ── 弟子服 ──────────────────────────────────────────────

static func _has_uniform(r: int) -> bool:
	var worn: Array = G.hero.get("gear", {}).values()
	return Sect.def(SECT).uniforms[r].all(func(id): return G.bag.has(id) or id in worn)


## 發這個身分的弟子服：收回舊的（腰牌留著），發新的；那個部位空著或身上那件比較差就直接換上
static func _issue_uniform(ctx: Ctx, r: int) -> void:
	var ids: Array = Sect.def(SECT).uniforms[r]
	Sect.take_gear(SECT, ids + ["mq_token"])
	if not G.hero.has("gear"):
		G.hero.gear = {}
	var out := []
	for id in ids:
		if id in G.hero.gear.values():
			continue
		G.bag[id] = int(G.bag.get(id, 0)) + 1
		var g: Dictionary = Ui.item_def(id).gear
		var cur: String = G.hero.gear.get(g.kind, "")
		if cur == "" or int(Ui.item_def(cur).get("gear", {}).get("grade", 0)) < int(g.grade):
			Hero.wear(G.hero, id)
			out.append("領到了「%s」，當場換上。" % Ui.item_def(id).name)
		else:
			out.append("領到了「%s」。（放在行囊裡，在書本的行囊頁換上）" % Ui.item_def(id).name)
	if G.bag.has("mq_token") and G.hero.gear.get("neck", "") == "":
		Hero.wear(G.hero, "mq_token")
		out.append("順手把鳴泉腰牌繫在頸上。")
	if out.size() > 0:
		await ctx.say("\n".join(out))


# ── 大殿：值殿弟子柯靜言（門規、月例、弟子名冊、離開師門） ───

static func _read_roster(ctx: Ctx) -> void:
	var ke := _by(MQ.ke)
	var groups := ["掌門", "長老", "真傳弟子", "內門弟子", "正式弟子", "記名弟子", "雜役"]
	var pages := [ke.call("弟子名冊在這兒，本門上下都記在上頭。")]
	var mine := Sect.rank_name() if member() else ""
	for g in groups:
		var rows := []
		for m in ROSTER:
			if m[1] == g:
				rows.append("%s%s" % [MQ[m[0]], ("　" + m[2]) if m[2] != "" else ""])
		if g == mine:
			rows.append("%s（你）%s" % [G.hero.name, ("・比武第 %d" % meet_place()) if meet_place() > 0 else ""])
		if rows.size() > 0:
			pages.append("【%s】\n%s" % [g, "\n".join(rows)])
	pages.append(ke.call("記名弟子還有十來個，名冊上就不一一列了。"))
	await ctx.say(pages)


static func duty_talk(ctx: Ctx) -> void:
	var ke := _by(MQ.ke)
	if not member():
		await ctx.say([ke.call("在下%s，在大殿值守。" % MQ.ke), ke.call("這裡是大殿，掌門與長老議事、收徒入門都在這裡。")])
		if ctx.flag("mq_left") == 0:
			await ctx.say(ke.call("想拜入本門，先去演武廣場找大師兄，過了入門考驗再來拜見掌門。"))
		if await ctx.ask(ke.call("想看看本門的弟子名冊嗎？"), ["看看", "不必了"]) == 0:
			await _read_roster(ctx)
		return
	# 舊存檔或弄丟了：補發這個身分的弟子服
	if not _has_uniform(rank()):
		await ctx.say(ke.call("你的弟子服還沒領吧？拿去，在門裡要穿得整整齊齊。"))
		await _issue_uniform(ctx, rank())
	var ready := G.day >= Sect.next_stipend()
	var c := await ctx.ask(ke.call("師兄弟有什麼事？"), ["請教門規", "領月例" if ready else "領月例（還沒到日子）", "弟子名冊", "捐銀給門裡", "離開師門", "沒事"])
	match c:
		0:
			var rules := [ke.call("門規就掛在祖師像旁，一共五條：")]
			var d := Sect.def(SECT)
			for i in d.rules.size():
				rules.append("%s、%s\n%s" % ["一二三四五"[i], d.rules[i][0], d.rules[i][1]])
			rules.append(ke.call("犯了門規，輕則罰掃地，重則上思過崖面壁。"))
			await ctx.say(rules)
		1:
			if not ready:
				await ctx.say(ke.call("月例每 %d 天領一次，%s再來吧。" % [Sect.STIPEND_DAYS, G.date_text(Sect.next_stipend())]))
				return
			var pay: Dictionary = Sect.rank_def().stipend
			G.sect.stipend_day = G.day
			G.silver += int(pay.silver)
			var out := ["（得到了銀兩 %d 兩）" % pay.silver]
			for it in pay.get("items", {}):
				G.bag[it] = int(G.bag.get(it, 0)) + int(pay.items[it])
				out.append("（得到了%s ×%d）" % [ctx.item_name(it), pay.items[it]])
			await ctx.say([ke.call("這是%s的月例，收好。" % Sect.rank_name())] + out)
		2:
			await _read_roster(ctx)
		3:
			await _donate_silver(ctx)
		4:
			await _leave_sect(ctx)


## 捐銀：每 20 兩換 1 點門派貢獻（只加貢獻，不算功績）
static func _donate_silver(ctx: Ctx) -> void:
	var ke := _by(MQ.ke)
	var amounts := [50, 200, 1000].filter(func(n): return n <= G.silver)
	if amounts.is_empty():
		await ctx.say(ke.call("心意領了。你身上的銀子還是留著自己用吧。"))
		return
	var i := await ctx.ask(ke.call("門裡用度不寬裕，捐多少都是心意。（每 20 兩記 1 點門派貢獻）"), amounts.map(func(n): return "%d 兩" % n) + ["算了"])
	if i >= amounts.size():
		return
	var n: int = amounts[i]
	G.silver -= n
	Sect.add_contrib(n / 20, false)
	await ctx.say([ke.call("%d 兩，我記在帳上了。" % n), "（門派貢獻 +%d；捐輸只算貢獻，不算功績）" % (n / 20)])


static func _leave_sect(ctx: Ctx) -> void:
	var ke := _by(MQ.ke)
	var wen := _by(MQ.wen)
	var rules: Array = Sect.rank_def().leave
	await ctx.say(ke.call("這事得稟告掌門……以你%s的身分，按門規：%s。" % [Sect.rank_name(), "，或".join(rules.map(func(r): return Sect.leave_text(r)))]))
	var free := rules.filter(func(r): return r[0] == "free")
	var fine := rules.filter(func(r): return r[0] == "fine")
	if not free.is_empty():
		if await ctx.ask(ke.call("真的要離開鳴泉劍派嗎？離開之後，就不能再回來拜師了。"), ["我意已決", "再想想"]) != 0:
			return
	elif not fine.is_empty():
		var price: int = fine[0][1]
		if await ctx.ask(ke.call("要繳 %d 兩罰金離開師門嗎？離開之後，就不能再回來了。（目前有 %d 兩）" % [price, G.silver]), ["繳罰金離開", "再想想"]) != 0:
			return
		if not ctx.pay(price):
			await ctx.say(ke.call("銀兩不夠。"))
			return
	else:
		await ctx.say([ke.call("泉音劍陣還沒佈好，這事改天再說吧。"), "（闖陣脫離之後開放）"])
		return
	await ctx.say(["%s進了內堂，過了好一會兒，聞松年走了出來。" % MQ.ke, wen.call("人各有志，我不強留。"), wen.call("本門的武功你可以留著，但記住第五條門規：不得外傳。"), wen.call("下山去吧。"),
		"你把鳴泉腰牌與弟子服放在供桌上，向祖師像拜了一拜，轉身離開了大殿。"])
	Sect.leave()
	ctx.set_flag("mq_join", 0)
	ctx.set_flag("mq_left")


## 大殿正中的掌門座位
static func leader_chair(ctx: Ctx) -> void:
	await ctx.say("掌門的座位。座前的蒲團上，跪過一代又一代入門的弟子。")


# ── 晉升：正式弟子考核（韓靖秋）、升級典禮（掌門）、內門試劍（韓靖秋） ─────

## 考沒過隔幾天才能再考
const EXAM_RETRY := 3
const EXAM_QUESTIONS := [
	["第一問：你在後山看見思過崖洞口沒人看守，心裡好奇，該當如何？", ["進去看一眼就出來", "叫上同門一起進去", "不得擅入，轉身離開"], 2],
	["第二問：同門與你口角，竟拔劍相向，你當如何？", ["退開不與他動手，稟告執法長老", "拔劍還擊，教訓他一頓", "找師兄弟來幫忙"], 0],
	["第三問：山下的朋友想學你的鳴泉劍法，你當如何？", ["交情好，教他幾招無妨", "未經掌門允許，不得外傳", "收些銀兩再教"], 1],
]
const INNER_QUESTIONS := [
	["同門師弟私下鬥毆，被你撞見了，你怎麼做？", ["先把兩人分開，再稟報值殿", "讓他們打完再說", "各打五十大板"], 0],
	["記名弟子練劍偷懶，你身為內門弟子該如何？", ["罵他一頓", "陪他練一回，看他卡在哪裡", "不關我的事"], 1],
	["門派年會選執事，你最看重候選人的什麼？", ["跟我交情好不好", "武功最高", "肯不肯擔事、處事公不公道"], 2],
]


## 晉升條件（考核以外）是不是都齊了
static func _ready_to_promote() -> bool:
	var checks := Sect.promotion_checks()
	return checks.size() > 0 and checks.slice(0, checks.size() - 1).all(func(c): return c[1])


## 上次考沒過還在等的話說一聲，回傳 true
static func _too_soon(ctx: Ctx, flag: String, who: String, what: String) -> bool:
	var last := ctx.flag(flag)
	if last > 0 and G.day < last + EXAM_RETRY:
		await ctx.say(_by(who).call("上回的%s才過去沒幾天。%s再來。" % [what, G.date_text(last + EXAM_RETRY)]))
		return true
	return false


static func _quiz(ctx: Ctx, who: String, qs: Array) -> int:
	var right := 0
	for q in qs:
		if await ctx.ask(_by(who).call(q[0]), q[1]) == int(q[2]):
			right += 1
	return right


## 韓靖秋的劇情：記名弟子報考正式、正式弟子試內門、內門弟子拜他為師
static func han_story(ctx: Ctx) -> bool:
	if LifeMq.lecture_now():
		await _lecture(ctx)
		return true
	if not member():
		return false
	match rank():
		0:
			return await _exam(ctx)
		1:
			return await _inner_exam(ctx)
		2:
			return await _master_story(ctx, 0)
	return false


static func _exam(ctx: Ctx) -> bool:
	var han := _by(MQ.han)
	if ctx.flag("mq_exam") == 1:
		await ctx.say(han.call("考核過了，還愣在這裡做什麼？去大殿見掌門。"))
		return true
	if not _ready_to_promote():
		return false
	if await _too_soon(ctx, "mq_exam_day", MQ.han, "考核"):
		return true
	if await ctx.ask(han.call("你入門也有些日子了，功績、劍法都夠了。要報考正式弟子嗎？"), ["弟子報考", "改天再說"]) != 0:
		return true
	await ctx.say(han.call("正式弟子要下山辦事，代表的是鳴泉的臉面。先考門規，再考武功。"))
	var right := await _quiz(ctx, MQ.han, EXAM_QUESTIONS)
	if right < 2:
		ctx.set_flag("mq_exam_day", G.day)
		await ctx.say([han.call("三問只答對 %d 問。門規都記不住，怎麼放你下山？" % right), han.call("%d 天後再來考吧。" % EXAM_RETRY)])
		return true
	await ctx.say([han.call("三問全對。好。" if right == 3 else "答對兩問，勉強過得去。回頭把門規再念熟。"),
		han.call("武功這一關，連戰兩場：先是教習%s，再來是%s。中間不歇，也不許用藥。" % [MQ.qi, MQ.meng]),
		"韓靖秋領著你來到演武台。師兄弟們聽說有人考正式弟子，紛紛圍了過來。"])
	if await ctx.battle("exam_qi") != "win":
		ctx.set_flag("mq_exam_day", G.day)
		await ctx.say([han.call("第一場就落敗了。根基還要再打紮實些。"), han.call("%d 天後再來考吧。" % EXAM_RETRY)])
		return true
	await ctx.say([{"speaker": MQ.qi, "text": "……好劍法。這一場是我輸了。"}, han.call("不許歇，下一場。")])
	if await ctx.battle("exam_meng") != "win":
		ctx.set_flag("mq_exam_day", G.day)
		await ctx.say([han.call("撐過了一場，第二場力氣就跟不上了。內息與耐力，都還差一點。"), han.call("%d 天後再來考吧。" % EXAM_RETRY)])
		return true
	ctx.set_flag("mq_exam", 1)
	await ctx.say([{"speaker": MQ.meng, "text": "服了。往後下山辦事，算你一份。"}, "圍觀的師兄弟們一陣喝采。", han.call("門規、武功都過了。去大殿見掌門，由掌門親自升你為正式弟子。")])
	ctx.fame(5)
	return true


static func _promotion_ceremony(ctx: Ctx) -> void:
	var wen := _by(MQ.wen)
	await ctx.say([wen.call("靖秋都跟我說了。三問答得好，兩場也打得漂亮。"), wen.call("從今日起，你就是鳴泉劍派的正式弟子。"), "聞松年親手在你的腰牌背面刻上「正」字。"])
	Sect.promote()
	ctx.set_flag("mq_exam", 2)
	await ctx.give("jinchuang", 2)
	await ctx.say("%s捧來一件月白道袍與一雙布靴：「恭喜師兄弟，這是正式弟子的衣服。」" % MQ.ke)
	await _issue_uniform(ctx, 1)
	await ctx.say([wen.call("你搬去弟子房・甲，跟%s同住。練功房的鐵木樁、書房的「踏石步」，往後都能用了；任務榜上的下山委託，也可以接。" % MQ.he),
		wen.call("只是記住：正式弟子再要離開師門，就不是說走就走了。"),
		"（成為正式弟子：住處改為弟子房・甲，月例提高；練功房鐵木樁、抄錄踏石步、下山委託「回春堂送藥」開放）"])


## 內門試劍：先跟何守一過一場，再答三問
static func _inner_exam(ctx: Ctx) -> bool:
	var han := _by(MQ.han)
	if not _ready_to_promote():
		return false
	if await _too_soon(ctx, "mq_inner_day", MQ.han, "試劍"):
		return true
	if await ctx.ask(han.call("你的功績、劍法都夠了。要試內門嗎？內門弟子能在年會上選長老、選執事，往後還能收徒。"), ["請長老考我", "改天再說"]) != 0:
		return true
	ctx.set_flag("mq_inner_day", G.day)
	await ctx.say([han.call("先試劍。%s守了六年山門，劍法紮實，你跟他過一場。" % MQ.he), "何守一被叫了過來，抱拳一禮。"])
	if await ctx.battle("exam_he") != "win":
		await ctx.say([han.call("劍還不夠穩。"), han.call("%d 天後再來。" % EXAM_RETRY)])
		return true
	await ctx.say([{"speaker": MQ.he, "text": "好劍！我服。"}, han.call("再問你三件事。內門弟子要管事、要帶人，光會打不夠。")])
	var right := await _quiz(ctx, MQ.han, INNER_QUESTIONS)
	if right < 2:
		await ctx.say([han.call("三問只對了 %d 問。心性還要再磨一磨。" % right), han.call("%d 天後再來。" % EXAM_RETRY)])
		return true
	Sect.promote()
	ctx.set_flag("mq_inner", 1)
	await ctx.say([han.call("三問全對。好！" if right == 3 else "答對兩問，過了。"), han.call("從今日起，你是鳴泉的內門弟子。年會上有你一票，往後也能出來競選執事。"),
		"（成為內門弟子：月例提高；功績、武功再長進，就能向三位長老求拜師試煉，成為真傳弟子）"])
	await _issue_uniform(ctx, 2)
	ctx.fame(5)
	return true


# ── 真傳拜師試煉：三位長老各有試煉，通過一位就拜他為師 ─────────

## [人物 id, 武功, 試煉的說明]
const MASTERS := [
	["han", "diequan", "到後山試劍石前，接我一套劍。勝了，「疊泉劍」就傳給你。"],
	["yan", "duanliu", "在思過崖前守三夜，不許下崖、不許用藥。三夜都守住了，「斷流掌」就傳給你。"],
	["su", "hantan", "到後山採三味藥回來：鳴泉源頭的泉心草、劍塚旁的鐵骨藤、望江台崖邊的雲根芝。採齊了，我還要考你藥性。"],
]
## 拜師要跟長老熟到「熟識」
const MASTER_AFF := 30
const HERBS := [
	["quanxin", 1, "泉心草", "鳴泉源頭", "性寒，生在泉眼的石縫裡"],
	["tiegu", 2, "鐵骨藤", "劍塚旁", "性溫，能續筋接骨"],
	["yungen", 4, "雲根芝", "望江台崖邊", "性平，長在崖邊的雲氣裡"],
]


static func _mname(i: int) -> String:
	return MQ[MASTERS[i][0]]


static func yan_story(ctx: Ctx) -> bool:
	return await _master_story(ctx, 1)


static func su_story(ctx: Ctx) -> bool:
	return await _master_story(ctx, 2)


## 三位長老共用：內門弟子條件齊了、跟長老夠熟就能接受拜師試煉
static func _master_story(ctx: Ctx, i: int) -> bool:
	var say := _by(_mname(i))
	if rank() != 2:
		return false
	var passed := ctx.flag("mq_master")
	if passed > 0:
		if passed != i + 1:
			return false
		await ctx.say(say.call("還不去大殿見掌門？"))
		return true
	if not _ready_to_promote():
		return false
	var doing := ctx.flag("mq_mt")
	if doing > 0 and doing != i + 1:
		await ctx.say(say.call("你正在接受%s的試煉，先把那邊的事辦完。" % _mname(doing - 1)))
		return false
	if doing == i + 1:
		return await _trial_progress(ctx, i)
	if await _too_soon(ctx, "mq_mt_day", _mname(i), "試煉"):
		return true
	if int(Social.rel(MASTERS[i][0]).get("aff", 0)) < MASTER_AFF:
		await ctx.say([say.call("聽說你想拜師？你我還談不上熟，我不收不熟的徒弟。"), "（熟悉度要到「熟識」，長老才肯收你）"])
		return false
	if await ctx.ask(say.call("想拜我為師？%s" % MASTERS[i][2]), ["接受試煉", "容我再想想"]) != 0:
		return true
	ctx.set_flag("mq_mt", i + 1)
	match i:
		0:
			await _trial_han(ctx)
		1:
			await _trial_yan(ctx)
		2:
			ctx.set_flag("mq_herbs", 0)
			ctx.refresh()
			await ctx.say([say.call("藥草要親手採，連根帶土，別弄斷了根鬚。採齊了再來找我。"), "（到後山採三味藥：鳴泉源頭的泉心草、劍塚旁的鐵骨藤、望江台崖邊的雲根芝）"])
	return true


static func _trial_fail(ctx: Ctx, i: int, why: String) -> void:
	ctx.set_flag("mq_mt", 0)
	ctx.set_flag("mq_mt_day", G.day)
	ctx.set_flag("mq_herbs", 0)
	await ctx.say([_by(_mname(i)).call(why), _by(_mname(i)).call("%d 天後再來吧。" % EXAM_RETRY)])


static func _trial_pass(ctx: Ctx, i: int) -> void:
	ctx.set_flag("mq_mt", 0)
	ctx.set_flag("mq_master", i + 1)
	await ctx.say([_by(_mname(i)).call("好。從今往後，你就是我的徒弟了。"), _by(_mname(i)).call("去大殿稟告掌門，由掌門升你為真傳弟子。")])
	ctx.fame(8)


## 韓靖秋：後山試劍石前接他一套劍
static func _trial_han(ctx: Ctx) -> void:
	await ctx.say(["韓靖秋領著你上了後山，在試劍石前站定。", _by(MQ.han).call("石上這些劍痕，是歷代真傳留下的。你若勝了，也能在上頭留一道。")])
	if await ctx.battle("trial_han") != "win":
		await _trial_fail(ctx, 0, "劍是快了，可還不夠穩。")
		return
	await ctx.say("韓靖秋收劍入鞘，看著試劍石上你剛留下的那道劍痕，點了點頭。")
	await _trial_pass(ctx, 0)


## 嚴守拙：思過崖前守三夜，夜裡有東西摸上崖來；白天也不許下崖
static func _trial_yan(ctx: Ctx) -> void:
	await ctx.say([_by(MQ.yan).call("崖上夜裡不太平。守住了，才知道你的心定不定。"), "你在思過崖前盤膝坐下。天色漸漸暗了……"])
	for n in [1, 2, 3]:
		# 坐到子時（子時初是今天的第 92 刻，跨過半夜就是 0）
		var to_midnight := (92 - G.time + 96) % 96
		ctx.pass_time(to_midnight if to_midnight > 0 else 96)
		if await ctx.battle("trial_night%d" % n) != "win":
			await _trial_fail(ctx, 1, "第 %d 夜就撐不住了。心不定，掌就不穩。" % n)
			return
		ctx.pass_time(G.ke_until_dawn())
		if n < 3:
			await ctx.say("天亮了。你揉了揉發僵的腿，又坐回原處。" if n == 1 else "又一個天亮。你的手臂已經抬不太起來了。")
	await ctx.say(["蒙面人退開幾步，扯下面巾——竟是嚴守拙。", _by(MQ.yan).call("三夜都守住了，最後一夜還接得住我的掌。"), "——%s　%s" % [G.date_text(), G.time_text()]])
	await _trial_pass(ctx, 1)


## 蘇芷蘅：三味藥採齊了，再考一題藥性
static func _trial_progress(ctx: Ctx, i: int) -> bool:
	if i != 2:
		return false
	var su := _by(MQ.su)
	var got := ctx.flag("mq_herbs")
	if got != 7:
		var left := HERBS.filter(func(h): return (got & int(h[1])) == 0).map(func(h): return "%s（%s）" % [h[2], h[3]])
		await ctx.say(su.call("還差%s。" % "、".join(left)))
		return true
	await ctx.say(["你把三味藥一一攤在蘇芷蘅面前。", su.call("採得不錯，根鬚都完好。"), su.call("最後一問。")])
	var c := await ctx.ask(su.call("寒潭心經最忌燥熱。用這三味藥配「寒潭散」，哪一味只能放一點，還要最後才下？"), HERBS.map(func(h): return h[2]))
	if HERBS[c][0] != "tiegu":
		await _trial_fail(ctx, i, "錯了。%s%s，不是它。藥性不熟，這門心法練了會傷身。" % [HERBS[c][2], HERBS[c][4]])
		return true
	await ctx.say(su.call("不錯。鐵骨藤性溫，續筋接骨是好藥，可放多了，寒潭散就成了燥藥。"))
	await _trial_pass(ctx, i)
	return true


## 後山的藥草（蘇芷蘅的試煉進行中、還沒採到時才出現；雲根芝有一頭護藥山豬）
static func _herb(ctx: Ctx, i: int) -> void:
	var h: Array = HERBS[i]
	if h[0] == "yungen" and ctx.flag("mq_herb_boar") == 0:
		if await ctx.battle("trial_boar") != "win":
			return
		ctx.set_flag("mq_herb_boar")
		await ctx.say("護藥山豬哼哼兩聲，鑽進林子裡去了。")
	ctx.set_flag("mq_herbs", ctx.flag("mq_herbs") | int(h[1]))
	ctx.refresh()
	await ctx.say("你小心地連根帶土，採下了一株%s。\n（%s%s）" % [h[2], h[2], h[4]])


static func herb_quanxin(ctx: Ctx) -> void:
	await _herb(ctx, 0)


static func herb_tiegu(ctx: Ctx) -> void:
	await _herb(ctx, 1)


static func herb_yungen(ctx: Ctx) -> void:
	await _herb(ctx, 2)


static func _true_ceremony(ctx: Ctx) -> void:
	var i := ctx.flag("mq_master") - 1
	var m: Array = MASTERS[i]
	var wen := _by(MQ.wen)
	await ctx.say([wen.call("%s都跟我說了。好，好。" % _mname(i)), "大殿裡點起了香。你在祖師像前叩首，又轉身向師父行了拜師禮。",
		wen.call("從今日起，你是鳴泉劍派的真傳弟子，%s的親傳徒弟。" % _mname(i))])
	Sect.promote()
	G.sect.master = m[0]
	G.sect.master_skill = m[1]
	ctx.set_flag("mq_master", 0)
	ctx.set_flag("mq_true")
	ctx.set_flag("mq_teacher", i + 1)
	await ctx.learn(m[1])
	await ctx.give("jinchuang", 3)
	await ctx.say("師父親手替你披上一件青紋道袍。")
	await _issue_uniform(ctx, 3)
	await ctx.say([_by(_mname(i)).call("這門「%s」，往後每天來找我請教。" % Hero.skill_def(m[1]).name),
		wen.call("疏桐下山多年，她的房間空著，你先搬進真傳弟子房・二吧。"),
		"（成為真傳弟子：住處改為真傳弟子房・二，月例提高；師父不看交情就肯指點，每天可以請教一次；離開師門只能闖「泉音劍陣」）"])


# ── 書房：管書的宋知微、書架 ─────────────────────────────

static func keeper_talk(ctx: Ctx) -> void:
	var k := _by(MQ.song)
	if not member():
		await ctx.say([k.call("在下%s，管著書房。" % MQ.song), k.call("書房只給本派弟子用。大門派有藏經閣，咱們鳴泉劍派小，一間書房就夠了。")])
		return
	var c := await ctx.ask(k.call("要找什麼書？"), ["抄錄本門武功", "書房的規矩", "沒事"])
	if c == 1:
		await ctx.say([k.call("書架上的劍譜心法都可以讀，對參悟招式大有好處。讀本門的武功，收穫更多。"), k.call("本門武功要抄錄才能帶回去練，抄錄要用門派貢獻換。"), k.call("書不能帶出書房——這是第四條門規。")])
		return
	if c != 0:
		return
	var list: Array = Sect.def(SECT).skills.filter(func(x): return Hero.find_skill(G.hero, x[0]).is_empty())
	if list.is_empty():
		await ctx.say(k.call("本門的武功你都抄過了。往後的上乘武功，要真傳弟子拜了師才學得到。"))
		return
	var ranks: Array = Sect.def(SECT).ranks
	var labels := list.map(func(x): return "%s（%s・%s起・%d 貢獻）" % [Hero.skill_def(x[0]).name, Hero.skill_def(x[0]).kind, ranks[x[1]].name, x[2]])
	var i := await ctx.ask(k.call("你目前有 %d 點門派貢獻。要抄錄哪一門？" % int(G.sect.contrib)), labels + ["算了"])
	if i >= list.size():
		return
	var x: Array = list[i]
	var sname: String = Hero.skill_def(x[0]).name
	if rank() < int(x[1]):
		await ctx.say(k.call("「%s」要%s才能抄錄。" % [sname, ranks[x[1]].name]))
		return
	if int(G.sect.contrib) < int(x[2]):
		await ctx.say([k.call("貢獻不夠，還差 %d 點。" % (int(x[2]) - int(G.sect.contrib))), k.call("跟大師兄做晨課、替門裡做事，都能攢貢獻。")])
		return
	if await ctx.ask("花 %d 點門派貢獻抄錄「%s」？" % [x[2], sname], ["抄錄", "算了"]) != 0:
		return
	G.sect.contrib = int(G.sect.contrib) - int(x[2])
	await ctx.work("study", "抄錄中……")
	ctx.pass_time(8)
	await ctx.say("你在書案前坐下，一筆一劃地把「%s」抄了下來，花了一個時辰。\n%s" % [sname, Hero.skill_def(x[0]).get("desc", "")])
	await ctx.learn(x[0])


## 本派劍譜的書架：研讀（小遊戲），對照一門能悟下一招的武功；本門武功領悟得多
const LIB := {"id": "mq_lib", "title": "本派劍譜", "text": "快而不亂，如泉不絕"}


static func lib_shelf(ctx: Ctx) -> void:
	var opening := "本派的劍譜與心法抄本，按入門先後排列。"
	if not member():
		await ctx.say([opening, _by(MQ.song).call("這位朋友，書房只給本派弟子用。")])
		return
	var ready := Train.studyable()
	if ready.is_empty():
		await ctx.say("%s\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）" % opening)
		return
	var names := ready.map(func(s): return "%s（領悟 %d%%）" % [Hero.skill_def(s.id).name, int(s.insight)])
	var i := await ctx.ask("%s\n要對照哪一門武功研讀？（本門武功收穫更多）" % opening, names + ["算了"])
	if i >= ready.size():
		return
	var id: String = ready[i].id
	var g := await Train.read(ctx, LIB, "%s\n對照著「%s」的招式推敲。" % [opening, Hero.skill_def(id).name])
	if g >= 0:
		await ctx.say(Train.apply(id, g, 0.7 if _sect_skill(id) else Train.BOOK_INSIGHT))


static func _sect_skill(id: String) -> bool:
	return Sect.def(SECT).skills.any(func(x): return x[0] == id)


# ── 練功：廣場木樁、練功房的鐵木人樁與蒲團 ─────────────────

## 練外功（廣場木樁、鐵木樁）：本門武功多 SECT_BONUS
static func _practice(ctx: Ctx, amount: int, stamina: int, look: String) -> void:
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("%s\n（要裝備著還沒練到上限的外功，才能在這裡練）" % look)
		return
	var names := list.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level])
	var i := await ctx.ask("%s\n要練哪一門？（本門武功收穫更多）" % look, names + ["算了"])
	if i >= list.size():
		return
	var s: Dictionary = list[i]
	var per := amount + (SECT_BONUS if _sect_skill(s.id) else 0)
	var n := await Train.ask_rounds(ctx, stamina, "練", Train.rounds_to_cap(s, per))
	if n == 0 or not await Train.exert(ctx, stamina * n, "手臂都快抬不起來了，虎口也震得發麻。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練樁中……")
	await ctx.say(["「啪、啪、啪——」你對著木樁一招一式地練了起來。" + Train.rounds_note("練", n)] + Train._exp_lines(s.id, per * n, false))


static func yard_stake(ctx: Ctx) -> void:
	if not member():
		await ctx.say("木樁上滿是劍痕。\n（這是鳴泉弟子練功用的木樁，拜入門下之後才能用）")
		return
	var stamina: int = Train.STAMINA.stake + (RAIN_EXTRA if _wet() else 0)
	var look := "廣場上的木樁林。" if not _wet() else ("廣場上的木樁林積了一層雪，踩上去又冷又滑。" if G.weather == "snow" else "廣場上的木樁林。雨打在身上，練起來格外吃力。")
	var c := await ctx.ask(look, ["練樁（每回兩刻・體力 %d）" % stamina, "找同門過招（一刻・體力 %d）" % DRILL_STAMINA, "算了"])
	if c == 0:
		await _practice(ctx, YARD_EXP, stamina, look)
	elif c == 1:
		await _drill(ctx)


## 找同門過招：從記名、正式弟子裡挑一位（身分不高過你一級），點到為止
const DRILL_STAMINA := 10
const DRILL_PEERS := [["xiaoman", "trial_xiaoman", 0], ["bao", "drill_bao", 0], ["tang", "drill_tang", 0], ["zheng", "drill_zheng", 0], ["hou", "drill_hou", 0], ["qiao", "drill_qiao", 0], ["he", "drill_he", 1], ["wei", "drill_wei", 1]]


static func _drill(ctx: Ctx) -> void:
	var pool := DRILL_PEERS.filter(func(p): return int(p[2]) <= rank() + 1)
	var p: Array = pool[randi() % pool.size()]
	var name: String = MQ.get(p[0], MQ.gu) if p[0] != "xiaoman" else MQ.gu
	if not await Train.exert(ctx, DRILL_STAMINA, "已經累得喘不過氣，這時候過招只會挨打。"):
		return
	await ctx.say("%s正好在一旁練劍，看見你走過來，收了劍勢。" % name)
	var o := await ctx.battle(p[1])
	ctx.pass_time(2)
	var who := _by(name)
	if o == "win":
		await ctx.say(who.call("好功夫！改天再來討教。"))
	elif o == "lose":
		await ctx.say(who.call("承讓了。你的劍再穩一點就好。"))
	else:
		await ctx.say("你收劍認輸，%s笑著點了點頭。" % name)
	if p[0] == "xiaoman":
		_aff("xiaoman", 2 if o == "win" else 1)


static func iron_stake(ctx: Ctx) -> void:
	var look := "包了鐵皮的木人樁，比廣場上的木樁沉得多。"
	if rank() < 1:
		await ctx.say([look, _by(MQ.qi).call("鐵木樁是給正式弟子練的，記名弟子先在廣場上把基本功練紮實。")])
		return
	await _practice(ctx, IRON_EXP, IRON_STAMINA, look)


## 練功房的蒲團：打坐，本門內功（澄泉心法）多得一些
static func cushion(ctx: Ctx) -> void:
	if not member():
		await ctx.say("打坐用的蒲團。\n（拜入鳴泉之後，可以在這裡打坐修練內功）")
		return
	var list := Train.trainable("inner")
	var per := func(s: Dictionary) -> int: return Train.SIT_EXP + (SECT_BONUS if _sect_skill(s.id) else 0)
	var max_n := 1
	for s in list:
		max_n = maxi(max_n, Train.rounds_to_cap(s, roundi(per.call(s) * (1.0 + Hero.attrs(G.hero).insight / 40.0))))
	if await ctx.ask("練功房角落的蒲團。要坐下來調息嗎？", ["打坐", "算了"]) != 0:
		return
	var n := await Train.ask_rounds(ctx, Train.STAMINA.sit, "坐", max_n)
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.sit * n, "坐得腿都麻了，心也靜不下來。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("sit", "打坐中……")
	var out := ["你盤膝坐下，閉目調息。泉聲從窗外隱隱傳來，心思漸漸沉靜……" + Train.rounds_note("坐", n), "（內力完全恢復，氣血也恢復了一些）"]
	for s in list:
		out += Train._exp_lines(s.id, per.call(s) * n, true)
	var d := Hero.derive(G.hero)
	G.hero.qi = d.max_qi
	G.hero.hp = mini(d.max_hp, int(G.hero.hp) + roundi(d.max_hp * 0.2 * n))
	if list.is_empty():
		out.append("（裝備著還沒練到上限的內功，打坐時才會精進）")
	await ctx.say(out)


# ── 宿舍：睡到天亮時同門叫你起床去晨課 ───────────────────

static func _wake(where: String) -> Array:
	if not member():
		return []
	if G.is_xunxiu():
		return ["今天旬休，不用上晨課。你翻了個身，又賴了一會兒床。"]
	var name: String = G.hero.get("given", G.hero.name)
	if where != "cell" and int(Social.rel("xiaoman").get("aff", 0)) >= 30:
		return ["門外傳來砰砰的敲門聲。", {"speaker": MQ.gu, "text": "%s師兄！再不起來，晨課就要遲到啦！" % name}]
	if where == "dorm":
		return ["%s把你搖醒。" % MQ.tang, {"speaker": MQ.tang, "text": "該起了，大師兄已經在廣場上等著晨課了。"}]
	if where == "room":
		return ["%s一邊打哈欠，一邊踢了踢你的床腳。" % MQ.he, {"speaker": MQ.he, "text": "起了起了，晨課別遲到。"}]
	return ["隔壁傳來陸鳴川的聲音。", {"speaker": MQ.lu, "text": "師弟，晨課了。"}]


static func dorm_bed(ctx: Ctx) -> void:
	if ctx.flag("mq_left") > 0:
		await ctx.say("一張空床鋪。你已經不是鳴泉弟子了。")
		return
	var mine := member() and rank() == 0
	if member() and not mine:
		await ctx.say("一張空床鋪，已經不是你的鋪位了。")
		return
	if mine:
		await Schedule.bed(ctx, "你的鋪位。", func(): return _wake("dorm"))
	else:
		await Train.rest(ctx, "大通鋪最裡頭的空鋪，借給上山應考的人住。要躺下休息嗎？")


static func room_bed(ctx: Ctx) -> void:
	if rank() < 1 or rank() >= 3:
		await ctx.say("正式弟子的床鋪，被褥比大通鋪的厚實多了。")
		return
	await Schedule.bed(ctx, "你在弟子房的床。", func(): return _wake("room"))


static func cell_bed(ctx: Ctx) -> void:
	if ctx.flag("mq_true") == 0:
		await ctx.say("真傳弟子的床鋪，被褥是上好的棉布。主人很久沒回來了。")
		return
	await Schedule.bed(ctx, "你的床。", func(): return _wake("cell"))


# ── 山門、知客、掃殿前 ─────────────────────────────────

static func greeter_talk(ctx: Ctx) -> void:
	var g := _by(MQ.fang)
	if member():
		await ctx.say(g.call("今天旬休，不少師兄弟都下山趕集去了。" if G.is_xunxiu() else "師兄弟早。大師兄在演武廣場帶晨課，去晚了可要挨罵。"))
		return
	if ctx.flag("mq_left") > 0:
		await ctx.say(g.call("……你回來看看？四處走走無妨，只是別亂闖禁地。"))
		return
	ctx.set_flag("mq_seek")
	await ctx.say([g.call("在下%s，在此知客。" % MQ.fang), g.call("這位朋友是來拜師的吧？本派收徒不拘時日，過得了入門考驗就行。"),
		g.call("大師兄陸鳴川在演武廣場，找他應考就是。"), g.call("掌門居與後山的思過崖不可擅入，其他地方可以四處看看。")])


const GATE := {
	"he": {"outsider": [["此處是鳴泉劍派山門，在下何守一。來者何人？", "……來拜師的？本派收徒不拘時日，進去找知客的方師兄就是。只是別亂闖禁地。"], ["山門內是本派重地，閒逛可以，別在院子裡動刀動劍。"]],
		"member": [["{稱}回來了。山道上最近有野狗出沒，下山的時候小心些。"], ["要下山？臨江城北門的守城兵認得本派的腰牌，進出方便。"], ["守山門最要緊的是眼睛。誰上山、誰下山，我都記著。"], ["木生那小子又在打瞌睡了吧？{稱}幫我看著點。"]],
		"left": ["……是你啊。進去看看無妨，只是別忘了，你已經不是本門弟子了。"]},
	"qiao": {"outsider": [["我是喬木生，才入門半年，跟何師兄學守山門。", "山門重地，進去之後請守規矩。"], ["站一整天，腿都直了……"]],
		"member": [["{稱}，下午輪我守山門，何師兄去練劍了。"], ["……（打了個哈欠）啊！沒睡、沒睡，我醒著呢！"], ["守山門無聊得很，{稱}陪我聊兩句？"]],
		"left": ["……你、你不是已經下山了嗎？"]},
}


static func _gate(ctx: Ctx, id: String) -> void:
	var g: Dictionary = GATE[id]
	var who: String = MQ[id]
	var title := "師兄" if member() else ""
	var pool: Array
	if ctx.flag("mq_left") > 0:
		pool = [g.left]
	elif member():
		pool = g.member
	else:
		pool = g.outsider
	var lines: Array = pool[G.time / 4 % pool.size()]
	await ctx.say(lines.map(func(t): return {"speaker": who, "text": t.replace("{稱}", title)}))


static func gate_he(ctx: Ctx) -> void:
	await _gate(ctx, "he")


static func gate_qiao(ctx: Ctx) -> void:
	await _gate(ctx, "qiao")


## 曹小豆：手上有「掃殿前」的雜務就把掃帚塞給你，否則閒聊
static func sweeper_talk(ctx: Ctx) -> void:
	if _holding("sweep"):
		await _do_chore(ctx, "sweep")
		return
	await ctx.say(_lines(MQ.cao, ["我是記名弟子曹小豆，每天得把大殿前掃三遍。", "師兄說，掃地也是練功……我怎麼覺得只是在掃地。"]))


# ── 任務榜：門內雜務、下山委託 ───────────────────────────

const CHORES := {
	"water": {"name": "挑水", "where": "廚房的水缸",
		"lines": ["你挑起扁擔，在山泉與廚房之間來回了十幾趟，總算把水缸挑滿了。", "肩膀火辣辣地疼，腳步倒是越走越穩。"], "grow": {"slot": "light", "exp": 10}},
	"sweep": {"name": "掃殿前", "where": "大殿前找曹小豆",
		"intro": [{"speaker": "曹小豆", "text": "太好了！今天換你掃！"}, "曹小豆把掃帚塞進你手裡，一溜煙跑了。"],
		"lines": ["你把大殿前的平台從東掃到西，連石縫裡的落葉都掃乾淨了。", "掃帚揮久了，手腕倒是越來越活。"], "grow": {"slot": "outer", "exp": 10}},
	"herbs": {"name": "翻曬草藥", "where": "藥房的晾藥架",
		"lines": ["你把晾藥架上的草藥一一翻面、攤開曬勻，順便記住了好幾味藥的名字。", {"speaker": "蘇青苗", "text": "辛苦了，這株止血草你拿去。"}], "items": {"herb": 1}, "grow": {"slot": "inner", "exp": 8}},
	"books": {"name": "整理書房", "where": "書房的掌故書架",
		"lines": ["你把散亂的書冊照年代排好，順手翻了幾頁江湖掌故。", "書上說，百年前江湖上有個劍客，一劍斷江……多半是說書人的誇張。"], "grow": {"slot": "inner", "exp": 10}},
	"garden": {"name": "照顧菜圃", "where": "廚房找伙房的卜大勺",
		"lines": ["你提著水桶到後頭菜圃澆水、拔草，還抓走了好幾條菜蟲。", "哪些菜該摘、哪些還得等，你也看出了一點門道。", {"speaker": "卜大勺", "text": "不錯不錯！這幾把青菜拿去，算是賞你的。"}], "items": {"greens": 3}, "grow": {"craft": "cooking", "exp": 6}},
}
const CHORE_ORDER := ["water", "sweep", "herbs", "books", "garden"]


static func _chores_today() -> int:
	return int(G.flags.get("mq_chores", 0)) if int(G.flags.get("mq_chores_day", 0)) == G.day else 0


## 今天任務榜上貼出的雜務：每天輪換三件
static func todays_chores() -> Array:
	return [0, 2, 4].map(func(i): return CHORE_ORDER[(G.day + i) % CHORE_ORDER.size()])


static func _holding(id: String) -> bool:
	return member() and G.sect.get("chore", "") == id


static func _do_chore(ctx: Ctx, id: String) -> void:
	var d: Dictionary = CHORES[id]
	if not await Train.exert(ctx, CHORE_STAMINA, "累得手腳發軟，這活兒今天是幹不動了。"):
		return
	if d.has("intro"):
		await ctx.say(d.intro)
	await ctx.work({"water": "water", "sweep": "farm", "herbs": "garden", "books": "study", "garden": "farm"}[id], "%s中……" % d.name)
	ctx.pass_time(CHORE_KE)
	await ctx.say(d.lines + ["（做了一個時辰）"])
	var out := Chores.growth(d.grow)
	for it in d.get("items", {}):
		var n: int = int(d.items[it]) + (1 if id == "herbs" and G.weather == "clear" else 0)
		G.bag[it] = int(G.bag.get(it, 0)) + n
		out.append("（得到了%s ×%d）" % [ctx.item_name(it), n])
	if id == "herbs" and G.weather == "clear":
		out.append("（大晴天，藥曬得又快又好）")
	G.sect.erase("chore")
	G.flags["mq_chores"] = _chores_today() + 1
	G.flags["mq_chores_day"] = G.day
	G.flags["mq_chore_" + id] = G.day
	out.append("（%s）" % Sect.add_contrib(CHORE_REWARD))
	await ctx.say("\n".join(out))
	await Schedule.maybe_event(ctx, "chore")


## 雜務的地點：手上有這件雜務就去做，否則照常查看
static func _chore_at(ctx: Ctx, id: String, look: Array) -> void:
	if _holding(id):
		await _do_chore(ctx, id)
		return
	await ctx.say(look)


static func vat(ctx: Ctx) -> void:
	await _chore_at(ctx, "water", ["一口大水缸，缸裡的水是從後山泉眼挑來的，清得見底。"])


static func herb_rack(ctx: Ctx) -> void:
	await _chore_at(ctx, "herbs", ["晾藥架上攤著一排排草藥，曬得半乾。"])


static func book_shelf(ctx: Ctx) -> void:
	await _chore_at(ctx, "books", ["掌故書架，擺著江湖掌故、地方志與歷代掌門的手記，有些書冊散亂地堆著。"])


static func _chore_board(ctx: Ctx) -> void:
	var held: String = G.sect.get("chore", "")
	if held != "":
		var d: Dictionary = CHORES[held]
		if await ctx.ask("你手上還有「%s」沒做完（%s）。" % [d.name, d.where], ["這就去", "放棄這件"]) == 1:
			G.sect.erase("chore")
			await ctx.say("你把「%s」的籤條掛回任務榜上。" % d.name)
		return
	var done := _chores_today()
	if done >= CHORES_PER_DAY:
		await ctx.say("今天貼出來的 %d 件雜務都做完了。\n（明天再來。過了半夜就是新的一天）" % CHORES_PER_DAY)
		return
	var list := todays_chores().filter(func(id): return ctx.flag("mq_chore_" + id) != G.day)
	var labels := list.map(func(id): return "%s（%s）" % [CHORES[id].name, CHORES[id].where])
	var i := await ctx.ask("今天的雜務（已做 %d/%d 件，每件一個時辰、體力 %d，門派貢獻 +%d）" % [done, CHORES_PER_DAY, CHORE_STAMINA, CHORE_REWARD], labels + ["算了"])
	if i >= list.size():
		return
	G.sect.chore = list[i]
	await ctx.say("你揭下「%s」的籤條。\n（地點：%s）" % [CHORES[list[i]].name, CHORES[list[i]].where])


## 下山委託：[旗標, 標題, 幾級身分起, 說明, 進行中的提示, 貢獻, 名聲]
const COMMISSIONS := [
	["mq_c_path", "清理山道", 0, "鳴泉山道上來了一群野狗，驚擾上山的香客與樵夫。下山把牠們趕走。", "野狗群在鳴泉山道的半山腰。", 10, 3],
	["mq_c_med", "回春堂送藥", 1, "藥房配好了一包金創藥，要送到臨江城的回春堂。回春堂的掌櫃白濟仁在店裡等。", "把藥包送到臨江城的回春堂。", 15, 2],
]


static func _commission_board(ctx: Ctx) -> void:
	var list := COMMISSIONS.filter(func(c): return ctx.flag(c[0]) < 3)
	if list.is_empty():
		await ctx.say("目前沒有新的下山委託。")
		return
	var ranks: Array = Sect.def(SECT).ranks
	var labels := list.map(func(c): return "%s（%s）" % [c[1], ("%s起" % ranks[c[2]].name) if rank() < int(c[2]) else ["可接", "進行中", "可覆命"][ctx.flag(c[0])]])
	var i := await ctx.ask("下山委託", labels + ["算了"])
	if i >= list.size():
		return
	var c: Array = list[i]
	var f := ctx.flag(c[0])
	if rank() < int(c[2]):
		await ctx.say("「%s」：%s\n（%s才能接）" % [c[1], c[3], ranks[c[2]].name])
	elif f == 1:
		await ctx.say("「%s」還沒辦完。\n（%s）" % [c[1], c[4]])
	elif f == 2:
		ctx.set_flag(c[0], 3)
		await ctx.say("你在任務榜上記下「%s」已經辦妥。" % c[1])
		ctx.fame(int(c[6]))
		await _contrib(ctx, int(c[5]))
	elif await ctx.ask("「%s」：%s\n（門派貢獻 +%d、名聲 +%d）" % [c[1], c[3], c[5], c[6]], ["接下", "算了"]) == 0:
		ctx.set_flag(c[0], 1)
		ctx.refresh()
		await ctx.say("你揭下「%s」的籤條。" % c[1])
		if c[0] == "mq_c_med":
			await ctx.say({"speaker": MQ.miao, "text": "藥包在這兒，路上小心，別淋濕了。"})
			await ctx.give("mq_medpack")


## 演武廣場的任務榜
static func task_board(ctx: Ctx) -> void:
	if not member():
		await ctx.say("鳴泉劍派的任務榜，貼著門內的雜務與下山委託。\n（本門弟子才能接）")
		return
	var c := await ctx.ask("鳴泉劍派任務榜。做雜務、辦委託都能攢門派貢獻。", ["門內雜務", "下山委託", "算了"])
	if c == 0:
		await _chore_board(ctx)
	elif c == 1:
		await _commission_board(ctx)


## 委託「清理山道」：山道上的野狗群
static func path_dogs(ctx: Ctx) -> void:
	if await ctx.battle("mq_path_dogs") != "win":
		return
	ctx.set_flag("mq_c_path", 2)
	ctx.refresh()
	await ctx.say(["野狗群夾著尾巴逃下山去了。", {"speaker": "柴老根", "text": "多謝鳴泉的少俠！這下總算能安心砍柴了。"}, "（回門派的任務榜覆命）"])


## 委託「回春堂送藥」：story/linjiang.gd 的白濟仁那裡轉過來
static func med_delivery(ctx: Ctx) -> void:
	var bai := _by("白濟仁")
	await ctx.say([bai.call("可把鳴泉的藥盼來了！最近城裡跌打損傷的人多，金創藥一下就賣光了。"), "你把藥包交給掌櫃。"])
	ctx.take("mq_medpack")
	ctx.set_flag("mq_c_med", 2)
	G.silver += 10
	await ctx.say(["掌櫃塞給你 10 兩跑腿錢。", bai.call("替我向聞掌門問好。"), "（回門派的任務榜覆命）"])


# ── 繳納：把打獵、採藥得來的東西交給門裡 ─────────────────

static func _donate(ctx: Ctx, who: String, item: String, n: int, reward: int, thanks: String) -> bool:
	var have := int(G.bag.get(item, 0))
	if have < n:
		await ctx.say(_by(who).call("要 %d 份「%s」才收。你身上只有 %d 份。" % [n, ctx.item_name(item), have]))
		return false
	ctx.take(item, n)
	await ctx.say(_by(who).call(thanks))
	await _contrib(ctx, reward)
	return true


static func _giver(ctx: Ctx, who: String, item: String, n: int, reward: int, thanks: String, talks: Array) -> void:
	var chat: Array = talks[G.time / 6 % talks.size()].map(func(t): return {"speaker": who, "text": t})
	if not member():
		await ctx.say(chat)
		return
	if await ctx.ask(_by(who).call("有什麼事？"), ["繳納%s（%d 份，貢獻 +%d）" % [ctx.item_name(item), n, reward], "閒聊"]) == 0:
		await _donate(ctx, who, item, n, reward, thanks)
	else:
		await ctx.say(chat)


static func herbalist_talk(ctx: Ctx) -> void:
	if _holding("herbs"):
		await _do_chore(ctx, "herbs")
		return
	await _giver(ctx, MQ.miao, "herb", 3, 4, "止血草收下了，正好拿來配金創藥。", [
		["我是管藥的蘇青苗。練武難免受傷，傷了就來藥房，別硬撐。", "後山有不少草藥，有空可以幫忙採一些。"],
		["我姑姑蘇長老常下山行醫，藥房平常由我照看。", "我們的金創藥，可比山下回春堂的還好用。"]])


static func armory_talk(ctx: Ctx) -> void:
	await _giver(ctx, MQ.meng, "dog_pelt", 2, 3, "狗皮正好拿來做劍鞘的襯裡。", [
		["我是管武器房的孟鐸。本門以劍為主，拳腳是根基，兩樣都得練。", "刀槍棍棒擺在這兒，是讓你們見識見識各家兵器的，不教。"],
		["劍鞘磨破了就拿來換，野狗皮硝過之後，做襯裡最好。"]])


static func coach_talk(ctx: Ctx) -> void:
	await ctx.say(_lines(MQ.qi, ["我是教習齊振遠，在練功房教基本功。", "鐵木樁是給正式弟子練的；蒲團誰都能坐，打坐最養內力。"] if not member() or rank() >= 1 else
		["基本功沒練紮實，就別想著上鐵木樁。", "廣場上的木樁每天打上一陣子，比什麼都強。"]))


# ── 廚房：卜大勺發飯、教做菜、賣食材 ─────────────────────

## 每天的大鍋飯：入門、中等的家常菜輪著煮
static func _daily_meal() -> Dictionary:
	var pool: Array = Crafts.data().dishes.filter(func(d): return int(d.tier) <= 1 and not d.get("sea", false) and not d.get("lake", false) and not d.get("spring", false) and d.id != "stew")
	return pool[(G.day * 5 + 3) % pool.size()]


static func _bu_stage() -> int:
	return Social.stage("bu")


## 卜大勺的劇情：菜圃雜務、弟子的選單；選「聊聊」就回 false，照人際系統平常聊
static func bu_story(ctx: Ctx) -> bool:
	if _holding("garden"):
		await _do_chore(ctx, "garden")
		return true
	if not member():
		return false
	var bu := _by(MQ.bu)
	var meal := _daily_meal()
	var c := await ctx.ask(bu.call("餓了吧？"), ["領今天的飯（%s）" % meal.name, "學做菜", "買食材", "繳納山豬肉（1 份，貢獻 +4）", "聊聊"])
	match c:
		0:
			if ctx.flag("mq_meal") == G.day:
				await ctx.say(bu.call("今天的份你領過啦！明天再來，明天換別的菜。"))
			else:
				ctx.set_flag("mq_meal", G.day)
				# 節慶當天換成節令點心兩份
				var fest := Festival.bu_meal()
				if fest.size() > 0:
					await ctx.say(bu.call(fest[1]))
					await ctx.give(fest[0], 2)
				else:
					await ctx.say(bu.call("今天是%s！趁熱吃。" % meal.name))
					await ctx.give(meal.id)
		1:
			var tier := 3 if _bu_stage() >= Social.CLOSE else (2 if _bu_stage() >= Social.FAMILIAR else (1 if _bu_stage() >= Social.NOD else -1))
			if tier < 0:
				await ctx.say([bu.call("學做菜？嘿，我的手藝可不是隨便教人的。"), bu.call("先常來陪我聊聊，讓我看看你是不是那塊料。"), "（跟卜大勺熟到「點頭之交」才肯教菜）"])
				return true
			await Cook.teach(ctx, MQ.bu, func(d): return int(d.tier) <= tier and not d.get("sea", false) and not d.get("lake", false) and d.id != "stew",
				BU_COST, "想學哪一道？學費用門派貢獻抵。", "我會的都教給你啦！海鮮、湖鮮那些，得找大埠頭、碧漪湖的師傅。", "在廚房的大灶做；食材跟我買",
				func(cx: Ctx, n: int) -> bool: return await _pay_contrib(cx, n), "貢獻")
		2:
			await ctx.shop("伙房的食材", KITCHEN_STOCK)
		3:
			if await _donate(ctx, MQ.bu, "boar_meat", 1, 4, "好大一塊山豬肉！今晚加菜！"):
				_aff("bu", 2)
		_:
			return false
	return true


static func _pay_contrib(ctx: Ctx, n: int) -> bool:
	if int(G.sect.contrib) < n:
		await ctx.say(_by(MQ.bu).call("這道菜得花 %d 點門派貢獻，你現在只有 %d 點。多做點雜務再來。" % [n, int(G.sect.contrib)]))
		return false
	G.sect.contrib = int(G.sect.contrib) - n
	return true


## 廚房的大灶：跟卜大勺熟到點頭之交才讓用
static func kitchen_stove(ctx: Ctx) -> void:
	var look := "大灶上的鍋子比人還寬，正冒著熱氣。"
	if not member():
		await ctx.say(look)
		return
	if _bu_stage() < Social.NOD:
		await ctx.say([look, _by(MQ.bu).call("欸欸欸，別亂碰！我的灶可不是誰都能用的。"), "（跟卜大勺熟到「點頭之交」才能用大灶）"])
		return
	await Cook.cook_at(ctx, 3, look)


# ── 後山 ────────────────────────────────────────────────

static func _mushroom(ctx: Ctx, spot: String) -> void:
	ctx.set_flag("mq_mush_" + spot, G.day)
	ctx.refresh()
	ctx.pass_time(1)
	# 下雨天野菌冒得特別多；秋天多一朵、冬天少一些
	var season := G.season_of()
	var n := maxi(1, 1 + randi() % 3 + (2 if G.weather == "rain" else 0) + (1 if season == 2 else (-1 if season == 3 else 0)))
	await ctx.say("雨後的落葉底下冒出一大片野菌，你摘得手都滿了。" if G.weather == "rain" else "你撥開落葉，把肥嫩的野菌一朵朵摘了下來。")
	await ctx.give("mushroom", n)


static func mushroom_west(ctx: Ctx) -> void:
	await _mushroom(ctx, "west")


static func mushroom_east(ctx: Ctx) -> void:
	await _mushroom(ctx, "east")


## 霧天的奇事：清晨起霧時，後山泉源旁站著一位白髮老人（身分刻意不寫），問你一個問題就走
static func fog_elder(ctx: Ctx) -> void:
	var old := _by("霧中老人")
	await ctx.say(["濃霧裡，一位白髮老人背著手，靜靜看著泉水從石縫裡湧出來。", old.call("……年輕人，你也是來聽泉的？")])
	var c := await ctx.ask(old.call("你說這泉水，是快的好，還是不斷的好？"), ["快的好", "不斷的好", "泉水就是泉水"])
	var r: Array = [["快？快了，就斷了。", 1], ["「如泉不絕」……嗯，你是鳴泉的娃兒。記住了，不斷，比快難。", 3], ["哈哈哈！說得好。泉水就是泉水，劍也就是劍。", 5]][c]
	await ctx.say(old.call(r[0]))
	ctx.set_flag("mq_fog_old", G.day)
	G.hero.points = int(G.hero.get("points", 0)) + int(r[1])
	await ctx.say(["一陣山風吹過，霧散了一些——", "泉邊空蕩蕩的，老人已經不見了。", "（武學點數 +%d）" % r[1]])
	ctx.refresh()


## 山道的馬車行：往其他大城的大路還沒通
static func coachman(ctx: Ctx) -> void:
	await ctx.say(_lines("梁老四", ["客官要坐車？鳴泉車馬，往大城直達，省得走斷腿。", "……可惜往別州的大路還沒修好，車只能先停在這兒。"]) + ["（馬車之後開放）"])


# ── 比武小會、講武、守夜 ─────────────────────────────────

## 比武的對手：記名、正式弟子的切磋遭遇戰
const DUEL := {"gu": "trial_xiaoman", "bao": "drill_bao", "tang": "drill_tang", "cao": "drill_cao", "zheng": "drill_zheng", "hou": "drill_hou", "qiao": "drill_qiao", "he": "drill_he", "wei": "drill_wei"}


## 同門照實力由強到弱
static func _ranked() -> Array:
	var r: Array = LifeMq.FIGHTERS.duplicate()
	r.sort_custom(func(a, b): return LifeMq.POWER[a] > LifeMq.POWER[b])
	return r


## 這一旬你的名次（沒比過是 0）
static func meet_place() -> int:
	return int(G.flags.get("mq_meet_place", 0))


## 比武小會：連戰三場（從中段挑三個，由弱到強），照打贏的最強那個人排名次，有賞
static func _tournament(ctx: Ctx) -> void:
	var lu := _by(MQ.lu)
	if not member():
		await ctx.say(lu.call("本門的比武小會，外人只能在旁邊看。"))
		return
	if ctx.flag("mq_meet_day") == G.day:
		await ctx.say(lu.call("今天你已經比過了。下一旬再來！"))
		return
	if await ctx.ask(lu.call("比武小會開始了。要上場嗎？連戰三場，點到為止。"), ["上場", "在旁邊看就好"]) != 0:
		return
	if not await Train.exert(ctx, DRILL_STAMINA, "已經累得喘不過氣，這時候上場只會挨打。"):
		return
	var pool := _ranked()
	pool.reverse()
	var mid := maxi(0, pool.size() / 2 - 1)
	var foes := pool.slice(mid, mid + 3)
	var wins := 0
	for id in foes:
		await ctx.say("第 %d 場：%s上場。" % [wins + 1, MQ[id]])
		if await ctx.battle(DUEL[id]) != "win":
			break
		wins += 1
	ctx.pass_time(4)
	var ranked := _ranked()
	var place: int = (ranked.find(foes[wins - 1]) if wins > 0 else ranked.size()) + 1
	ctx.set_flag("mq_meet_day", G.day)
	ctx.set_flag("mq_meet_place", place)
	await ctx.say([lu.call("三戰全勝！" if wins == 3 else ("贏了 %d 場，不錯。" % wins if wins > 0 else "輸了不要緊，下一旬再來。")), lu.call("這一旬的名次，你排第 %d。" % place)])
	if wins > 0:
		ctx.silver(wins * 5)
		if wins == 3:
			ctx.fame(2)
		await _contrib(ctx, wins * 3)
	_aff("lu", 1)


## 長老講武：旁聽半個時辰，挑一門能悟新招的武功有所領悟
static func _lecture(ctx: Ctx) -> void:
	var han := _by(MQ.han)
	if not member():
		await ctx.say(han.call("本門講武，外人不便旁聽。"))
		return
	if ctx.flag("mq_lecture") == G.day:
		await ctx.say(han.call("今天講的，回去好好琢磨。"))
		return
	if await ctx.ask(han.call("今天講「劍隨意走」。坐下來聽吧。"), ["坐下旁聽（半個時辰）", "改天"]) != 0:
		return
	ctx.set_flag("mq_lecture", G.day)
	ctx.pass_time(4)
	await ctx.say([han.call("劍是死的，人是活的。招式記熟了，要忘掉招式，讓劍跟著心意走。"), han.call("你們練劍時，心裡想的是下一招，還是眼前的對手？"), "（聽了半個時辰）"])
	var ready := Train.studyable()
	if ready.size() > 0:
		var i := await ctx.ask("聽著聽著，你想起了哪一門武功？", ready.map(func(x): return Hero.skill_def(x.id).name))
		await ctx.say(Train.apply(ready[i].id, 20, 1.0))
	else:
		await ctx.say("（你若有所思。等武功練到能悟新招的時候，這番話會更有用）")
	await _contrib(ctx, 2)
	_aff("han", 1)


## 大殿前的更鼓：輪到你守夜，亥時到子時敲更巡一圈
const WATCH_TALES := [
	["你提著燈籠繞過大通鋪，看見一個人影鬼鬼祟祟地從廚房溜出來——", {"speaker": "包小川", "text": "……我、我只是口渴！"}, "他懷裡掉出半個肉包子。"],
	["巡到洗劍池邊，月光照在水面上。遠處後山傳來一陣若有若無的笛聲，一會兒就聽不見了。"],
	["大殿後頭亮著燈。從窗縫看進去，掌門一個人在殿裡慢慢地練劍，一招一式都慢得出奇。", "你沒有出聲，悄悄走開了。"],
	["一夜無事。只有風吹過木樁林，發出嗚嗚的聲音。"],
]


static func night_drum(ctx: Ctx) -> void:
	var d := LifeMq.watch_day()
	var who := LifeMq.watcher_on(d)
	if not member() or who != "hero":
		await ctx.say(["值夜用的更鼓，鼓面磨得發亮。", "（今晚值夜的是%s）" % ("你" if who == "hero" else MQ[who])])
		return
	if ctx.flag("mq_watch") == d:
		await ctx.say("今晚已經巡過了。")
		return
	if not LifeMq.night_now():
		await ctx.say("今晚輪你守夜。亥時到子時再來敲更鼓巡夜。")
		return
	if await ctx.ask("今晚輪你守夜。要敲更巡一圈嗎？（一個時辰）", ["巡夜", "等一下"]) != 0:
		return
	ctx.set_flag("mq_watch", d)
	await ctx.work("water", "巡夜中……")
	ctx.pass_time(8)
	await ctx.say(["「咚——咚！」你敲著更鼓，沿著院子巡了一圈。"] + WATCH_TALES[randi() % WATCH_TALES.size()] + ["（巡了一個時辰）"])
	await _contrib(ctx, 4)
