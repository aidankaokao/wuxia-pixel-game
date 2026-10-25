## 煙州的名勝（PLAN.md 4.47）：七處，各一張手工野外地圖（data/<id>.json），奇遇、石刻悟招、雅趣、釣點。
## - 雲門瀑 yunmen：瀑下大石練劍（經驗多五成）、打坐；白猿引路（雲嶺猿啼崖看過三次，yl_ape）進瀑布後的石室，壁上劍痕參悟「垂雲劍」；深潭釣魚。
## - 斷戟原 duanji：翻找殘兵（每處一天一次，殘刀；翻滿十回一定挖到古將軍刀）；將軍冢：夜裡或起霧時看見古戰場的異象（悟性 +1，一次），平時祭拜；守冢的欒老卒。
## - 聽濤洞 tingtao：乾潮才進得去（潮汐照 chaoxin.gd），洞壁口訣參悟「聽濤訣」；洞裡的潮池；洞外北邊沙灘海釣。
## - 浮玉洲 fuyu：江南渡搭船才到（stay.gd），浮玉寺的默庵（抄經長學識、問江心、借宿）、上香、禪石打坐、江釣；夜裡江心的怪影（伏筆）。
## - 望煙亭 wangyan：卯時、辰時晴天看雲海（一天一次，內力體力回滿、心情愉快）、寫生、題壁；亭記。
## - 斷碑觀 duanbei：臥碑崖的摩崖掌譜參悟「臥雲掌」；玄樸道人（將來自立門派的地點）。
## - 十里荷堤 hedi：夏天採蓮（每處一天一次）、葉采菱划船遊湖、堤亭撫琴寫生、蘆葦邊釣魚。
## 用到的旗標：ym_cave 白猿引你進了石室、dj_dig 翻找過幾回、dj_saber 挖到古將軍刀、dj_vision 看過古戰場的異象、wg_stele 讀過亭記、
##   fy_shadow 看見江心怪影幾次；yl_ape（雲嶺）
## 一天一次的事記在 G.life.daily：ms:<地圖>:<x>,<y> 那一處翻過／採過、ms:dj_pray、ms:fy_copy、ms:fy_pray、ms:wg_cloud、ms:tt_pool、ms:hd_boat。

const Train := preload("res://story/train.gd")
const Fishing := preload("res://story/fishing.gd")
const Arts := preload("res://story/arts.gd")
const Festival := preload("res://story/festival.gd")
const Chaoxin := preload("res://story/chaoxin.gd")

## 瀑下練劍：每回經驗、體力
const FALL_EXP := 45
const FALL_STAMINA := 25
## 參悟名勝石刻的武功：體會到多少學會（中品）
const CARVE_UNLOCK := 60
const DIG_GUARANTEE := 10
const COPY_EXP := 15
const BOAT_PRICE := 2

const CHUIYUN := {"id": "carve_chuiyun", "title": "石室劍痕", "text": "雲垂四野，瀑落千尋"}
const TINGTAO := {"id": "carve_tingtao", "title": "聽濤洞壁", "text": "潮來則吸，潮去則吐"}
const WOYUN := {"id": "carve_woyun", "title": "臥碑崖", "text": "醉臥碑前，掌推雲月"}


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _lines(who: String, texts: Array) -> Array:
	return texts.map(func(t): return {"speaker": who, "text": t})


static func _daily() -> Dictionary:
	if not G.life.has("daily"):
		G.life.daily = {}
	return G.life.daily


static func _once(key: String) -> bool:
	return int(_daily().get(key, 0)) == G.day


static func _mark(key: String) -> void:
	_daily()[key] = G.day


## 這一處擺設自己的每日記號（同一種擺設好幾處）
static func _spot_key(ctx: Ctx) -> String:
	var p: Dictionary = ctx.extra.get("prop", {})
	return "ms:%s:%d,%d" % [ctx.scene.get("map_id"), int(p.get("x", 0)), int(p.get("y", 0))]


static func _night() -> bool:
	var s := G.shichen_of()
	return s >= 10 or s <= 1


## 名勝石刻上的武功：還不會的累積體會到 CARVE_UNLOCK 學會（送拓本），會了就照竹林石碑的比例參悟
static func _carving(ctx: Ctx, src: Dictionary, skill: String, first: Array, look: String, done: Array, manual: String) -> void:
	var r := Train.record(src.id)
	var sname: String = Hero.skill_def(skill).name
	if Hero.find_skill(G.hero, skill).is_empty():
		if not Practice.tried("read:" + src.id):
			await ctx.say(first)
		var g := await Train.read(ctx, src, "%s（體會 %d／%d）" % [look, int(r.exp), CARVE_UNLOCK], CARVE_UNLOCK - int(r.exp))
		if g < 0:
			return
		if int(r.exp) < CARVE_UNLOCK:
			await ctx.say("這一回體會了 %d。看懂了幾分，卻還連不成一路。\n（體會 %d／%d）" % [g, int(r.exp), CARVE_UNLOCK])
			return
		await ctx.say(done[0])
		await ctx.learn(skill)
		await ctx.say(done.slice(1))
		await ctx.give(manual)
		return
	if not Train.can_gain(skill):
		await ctx.say("這上頭的東西，你已了然於胸。")
		return
	var g2 := await Train.read(ctx, src, "%s\n要再對著它參悟「%s」嗎？" % [look, sname])
	if g2 >= 0:
		await ctx.say(Train.apply(skill, g2, Train.STELE_INSIGHT))


## 練外功（好地方經驗多）
static func _train_outer(ctx: Ctx, exp_each: int, cost: int, desc: String, tired: String) -> void:
	var list := Train.trainable("outer")
	if list.is_empty():
		await ctx.say("（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var s: Dictionary = list[0]
	if list.size() > 1:
		var i := await ctx.ask("要練哪一門？", list.map(func(x): return "%s（第 %d 重）" % [Hero.skill_def(x.id).name, x.level]) + ["算了"])
		if i >= list.size():
			return
		s = list[i]
	var n := await Train.ask_rounds(ctx, cost, "練", Train.rounds_to_cap(s, exp_each))
	if n == 0 or not await Train.exert(ctx, cost * n, tired):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("stake", "練功中……")
	await ctx.say([desc + Train.rounds_note("練", n)] + Train._exp_lines(s.id, exp_each * n, false))


## 打坐（mult 是內功經驗的倍數），內力回滿
static func _sit(ctx: Ctx, mult: float, desc: String) -> void:
	var list := Train.trainable("inner")
	var gain := roundi(Train.SIT_EXP * (1.0 + Hero.attrs(G.hero).insight / 40.0) * mult)
	var max_n := 1
	for s in list:
		max_n = maxi(max_n, Train.rounds_to_cap(s, gain))
	var n := await Train.ask_rounds(ctx, Train.STAMINA.sit, "坐", max_n)
	if n == 0 or not await Train.exert(ctx, Train.STAMINA.sit * n, "心浮氣躁，坐不住。"):
		return
	ctx.pass_time(Train.KE * n)
	await ctx.work("sit", "打坐中……")
	var out := [desc + Train.rounds_note("坐", n), "（內力回滿）"]
	for s in list:
		out += Train._exp_lines(s.id, gain * n, true)
	G.hero.qi = Hero.derive(G.hero).max_qi
	await ctx.say(out)


# ── 雲門瀑 ──────────────────────────────────────────────

static func yunmen_rock(ctx: Ctx) -> void:
	var c := await ctx.ask("瀑布底下一塊平平的大石，水從頭頂砸下來，濺得人睜不開眼。", ["站在瀑下練功（經驗多五成）", "在石上打坐", "算了"])
	if c == 0:
		await _train_outer(ctx, FALL_EXP, FALL_STAMINA, "你站在瀑布底下出招，水的力道一下一下砸在肩上，每一招都得比平常多使三分勁。", "肩膀被水砸得又痠又麻。")
	elif c == 1:
		await _sit(ctx, 1.2, "你盤坐在大石上，瀑聲轟轟地灌進耳朵，坐久了，反倒什麼都聽不見了。")


static func yunmen_fish(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "river", "瀑布底下的深潭，潭水碧綠，看得見魚在石縫間游。")


## 瀑布旁的石縫：雲嶺的白猿看過三次以後，牠會在這裡等你，引你進瀑布後的石室
static func yunmen_cave(ctx: Ctx) -> void:
	if ctx.flag("ym_cave") == 0:
		if ctx.flag("yl_ape") < 3:
			await ctx.say("瀑布旁邊有一道石縫，水霧太大，看不清裡頭有多深。踩上去滑溜溜的，一不小心就會掉進潭裡。\n（也許有誰認得路）")
			return
		await ctx.say(["石縫口蹲著一團白影——是猿啼崖那隻白猿。", "牠看了你一眼，轉身鑽進石縫。你跟著牠貼著濕滑的石壁走，水簾就在背後轟轟地落下……",
			"石縫盡頭豁然開朗，是瀑布後頭的一間石室。", "石室裡一張石床，床上一副遺骨，旁邊一塊木牌：「無名劍客，聽瀑三十年。」", "四面石壁上，密密麻麻全是劍痕。"])
		ctx.set_flag("ym_cave")
	await _carving(ctx, CHUIYUN, "chuiyun",
		["石壁上的劍痕從上往下，像水，又像雲。最上頭刻著八個字：\n「雲垂四野，瀑落千尋」"],
		"石室壁上的劍痕，一道一道從高處垂下來。",
		["瀑聲忽然變得很遠——你看懂了，劍痕不是一招一招，是一整片落下來的雲！", "（戰鬥中可以使出「雲垂四野」了，練深了還能悟出更多）", "你把壁上的劍痕拓了下來。白猿蹲在石床邊，看著你，好像鬆了一口氣。"],
		"manual_chuiyun")


# ── 斷戟原 ──────────────────────────────────────────────

## 翻找殘兵：每一處一天一次；翻滿 DIG_GUARANTEE 回一定挖到古將軍刀（只有一把）
static func duanji_scavenge(ctx: Ctx) -> void:
	var key := _spot_key(ctx)
	if _once(key):
		await ctx.say("這一處今天翻過了，土還是鬆的。")
		return
	if await ctx.ask("土裡露出半截生了鏽的兵刃。要翻一翻嗎？（半個時辰、體力 10）", ["翻找", "算了"]) != 0:
		return
	if not await Train.exert(ctx, 10, "你累得連土都刨不動了。"):
		return
	_mark(key)
	ctx.pass_time(4)
	await ctx.work("farm", "翻找中……")
	var n := ctx.flag("dj_dig") + 1
	ctx.set_flag("dj_dig", n)
	if ctx.flag("dj_saber") == 0 and (n >= DIG_GUARANTEE or randf() < 0.06):
		ctx.set_flag("dj_saber")
		await ctx.say(["你的手碰到一截冰涼的刀柄。刨開土，是一把長刀，刀身裹著一層厚鏽，刀柄上刻著一個「破」字。", "你用沙子把刀身的鏽磨掉一截——底下的鋼，亮得像水。"])
		await ctx.give("dj_saber")
		return
	var r := randf()
	if r < 0.6:
		await ctx.say("你從土裡刨出半截古刀，鏽得連刃口都看不出來了。")
		await ctx.give("rusty_blade")
	elif r < 0.85:
		await ctx.say("土裡只有幾枚生鏽的箭頭，一碰就碎了。")
	else:
		await ctx.say("土裡埋著一個破陶罐，罐裡有幾枚古錢。")
		ctx.silver(5)


## 將軍冢：夜裡或起霧時，看見古戰場的異象（悟性 +1，只有一次）；平時祭拜
static func duanji_tomb(ctx: Ctx) -> void:
	var stele := "一塊殘碑，字被風沙磨得只剩幾個：「……破虜將軍……率三千人守東嶺……無一生還……」"
	if ctx.flag("dj_vision") == 0 and (_night() or G.weather == "fog"):
		ctx.set_flag("dj_vision")
		G.hero.base.insight = int(G.hero.base.insight) + 1
		await ctx.say([stele, "霧從地上冒出來，越來越濃。遠處響起了金鼓聲。", "霧裡影影綽綽站起一排一排的人，盔甲殘破，手裡的戟都斷了一截。他們一聲不響，朝著東嶺口的方向衝了過去——",
			"衝在最前頭的那個人，回頭看了你一眼。", "霧散了。原上什麼也沒有，只有風吹過斷戟的嗚嗚聲。", "你站了很久。那一眼裡的東西，你好像懂了一點。\n（悟性 +1）"])
		return
	if _once("ms:dj_pray"):
		await ctx.say(stele)
		return
	if await ctx.ask(stele, ["祭拜（一刻）", "算了"]) != 0:
		return
	_mark("ms:dj_pray")
	ctx.pass_time(1)
	await ctx.work("pray", "祭拜中……", 1.0)
	Festival._treat(1, 1.1)
	await ctx.say("你在冢前站定，深深一拜。風吹過原上，斷戟嗚嗚地響，像是回禮。\n（心情沉靜：下一場戰鬥武功經驗 ×1.1）" +
		("" if ctx.flag("dj_vision") > 0 else "\n（欒老卒說，夜裡或起霧的時候，這裡會有怪事）"))


static func duanji_luan(ctx: Ctx) -> void:
	var who := Person.full_name("dj_luan")
	var c := await ctx.ask(_by(who).call("年輕人，來看古戰場？"), ["問古戰場的事", "問東嶺口", "不用了"])
	if c == 0:
		await ctx.say(_lines(who, ["幾百年前，破虜將軍帶三千人在這裡擋了北邊來的十萬人，擋了七天。", "後來的人把斷了的戟插在這原上，就叫斷戟原。",
			"夜裡起霧的時候，你要是還在這兒……就站著別動。他們不會傷人的。", "土裡還埋著好多兵器。聽說將軍的那把刀，也埋在這原上，從來沒人挖到過。"]))
	elif c == 1:
		var lines := ["我在東嶺口當了三十年的兵。那地方，冬天的風能把人的耳朵吹掉。"]
		if ctx.flag("wy_cleared") > 0:
			lines += ["……聽說霧鴉寨平了。寒鴉那孩子，以前是我帶的兵。", "他不是壞人。是東嶺口那年的事……唉，不說了。"]
		else:
			lines += ["我帶過的兵裡，有個叫聶寒鴉的，石壁村人。後來那年的事以後，他就跑了。", "聽說他上了鴉嶺……"]
		await ctx.say(_lines(who, lines))


# ── 聽濤洞 ──────────────────────────────────────────────

## 洞口：乾潮才進得去
static func tingtao_mouth(ctx: Ctx) -> void:
	var st := Chaoxin.tide_state()
	if st != "乾潮":
		await ctx.say("海崖底下一個黑洞洞的洞口，現在是%s，海水一浪一浪灌進去，又轟的一聲噴出來。\n（乾潮才進得去。%s）" % [st, Chaoxin.tide_text()])
		return
	if await ctx.ask("乾潮了，洞口露出一條濕漉漉的石路。要進洞嗎？（潮水漲回來之前記得出來）", ["進洞", "算了"]) != 0:
		return
	ctx.warp("tingtao", {"x": 26, "y": 16, "facing": "right"})


static func tingtao_out(ctx: Ctx) -> void:
	var st := Chaoxin.tide_state()
	var lines := ["你沿著石路走出洞口。"]
	if st in ["漲潮", "滿潮"]:
		G.hero.stamina = maxi(0, int(G.hero.stamina) - 10)
		lines = ["潮水已經漲上來了，洞口的石路淹到腰。你頂著浪一步一步走出去，差點被捲回洞裡。", "（體力 −10）"]
	await ctx.say(lines)
	ctx.warp("tingtao", {"x": 19, "y": 16, "facing": "left"})


static func tingtao_carving(ctx: Ctx) -> void:
	var first := ["洞壁上刻著密密麻麻的字，被海水泡了幾百年，邊角都圓了。", "最大的八個字刻在正中：\n「潮來則吸，潮去則吐」", "洞外的潮聲一下一下灌進來，在石壁上嗡嗡地迴響。"]
	if Sect.member("huilan"):
		first.append("落款只有一個字：「瀾」。……是回瀾刀門的祖師。")
	await _carving(ctx, TINGTAO, "tingtao", first, "洞壁上的吐納口訣，潮聲在洞裡嗡嗡地迴響。",
		["潮聲灌進來，又退出去——你的呼吸不知不覺跟上了它，一口氣吸得又深又長！", "（學會「聽濤訣」：內功，戰鬥中可以使出「濤聲入定」回復內力）", "你把洞壁上的口訣一字一字抄了下來。"],
		"manual_tingtao")


static func tingtao_pool(ctx: Ctx) -> void:
	if _once("ms:tt_pool"):
		await ctx.say("潮池裡的東西撿過了，等下一次潮水送新的進來。")
		return
	_mark("ms:tt_pool")
	ctx.pass_time(1)
	if randf() < 0.12:
		await ctx.say("潮池底下的石縫裡卡著一個蚌，撬開一看，裡頭躺著一顆海珠！")
		await ctx.give("pearl")
		return
	await ctx.say("潮池裡困著幾隻小蝦，你用手捧了起來。")
	await ctx.give("shrimp", 2)


# ── 浮玉洲 ──────────────────────────────────────────────

static func fuyu_mo(ctx: Ctx) -> void:
	var who := Person.full_name("fy_mo")
	var mo := _by(who)
	var c := await ctx.ask(mo.call("阿彌陀佛。施主渡江而來，辛苦了。"), ["抄經（一天一次，一個時辰）", "問江心的事", "借宿", "不用了"])
	match c:
		0:
			if _once("ms:fy_copy"):
				await ctx.say(mo.call("一日一卷，多了，心就散了。"))
				return
			if not await Train.exert(ctx, 10, "你的手腕痠得寫不了字。"):
				return
			_mark("ms:fy_copy")
			ctx.pass_time(8)
			await ctx.work("write", "抄經中……")
			var lines := ["你在寺裡的小窗下抄了一卷經，窗外江水嘩嘩地流，一個時辰像一盞茶就過去了。"]
			var up := Crafts.gain("learning", COPY_EXP)
			lines.append("（學識經驗 +%d）" % COPY_EXP)
			if up != "":
				lines.append(up)
			await ctx.say(lines)
		1:
			await ctx.say(_lines(who, ["江心底下有東西。老衲在這洲上住了四十年，夜裡常看見牠浮上來換氣，背上的殼像一座小島。",
				"船家說牠撞船。老衲倒覺得，是船先擋了牠的路。", "施主若夜裡在洲邊看見了，莫驚動牠。"]))
		2:
			await ctx.say(mo.call("後頭有間禪房，被褥是乾淨的。不收錢，走時隨喜就好。"))
			await Train.rest(ctx, "禪房裡只有一張木床、一盞油燈，聽得見江水拍著洲岸。要睡下嗎？")


static func fuyu_incense(ctx: Ctx) -> void:
	if _once("ms:fy_pray"):
		await ctx.say("香爐裡你上的香還沒燒完。")
		return
	if await ctx.ask("寺前一座銅香爐，爐身刻著一圈浪花。要上一炷香嗎？（一刻）", ["上香", "算了"]) != 0:
		return
	_mark("ms:fy_pray")
	ctx.pass_time(1)
	await ctx.work("pray", "上香中……", 1.0)
	Festival._treat(1, 1.1)
	await ctx.say("香煙被江風吹得斜斜的，飄過白玉觀音的臉。你心裡靜了下來。\n（心情平和：下一場戰鬥武功經驗 ×1.1）")


static func fuyu_sit(ctx: Ctx) -> void:
	await _sit(ctx, 1.2, "你在禪石上坐下，江水從兩邊流過，一刻不停。坐著坐著，好像整座洲都在往上游走。")


static func fuyu_fish(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "river", "洲邊的水流得急，江魚肥。默庵說，釣上來的要是太小，就放回去。")


## 夜裡江心的怪影（伏筆）
static func fuyu_shadow(ctx: Ctx) -> void:
	var n := ctx.flag("fy_shadow") + 1
	ctx.set_flag("fy_shadow", n)
	if n == 1:
		await ctx.say(["江心的水忽然鼓了起來，一個黑影在月光底下慢慢浮上水面——", "像一塊長滿青苔的大石頭。石頭動了一下，又沉了下去。"])
	elif n == 2:
		await ctx.say("黑影又浮了上來。這一回你看清了：石頭前頭，有一雙半睜的眼睛，比燈籠還大。")
	else:
		await ctx.say(["黑影浮在江心，一動不動，像是在看著浮玉寺的方向。", "江面上的漩渦，原來是牠在水底轉身留下的。"])


# ── 望煙亭 ──────────────────────────────────────────────

static func wangyan_pavilion(ctx: Ctx) -> void:
	var c := await ctx.ask("北嶺上的望煙亭。往北看，府城的屋頂一片一片鋪到天邊。", ["看雲海", "寫生", "題壁（練字）", "算了"])
	match c:
		0:
			var s := G.shichen_of()
			if _once("ms:wg_cloud"):
				await ctx.say("雲海看過了。山下的炊煙一縷一縷升起來，府城醒了。")
				return
			if not (s >= 3 and s <= 4 and G.weather == "clear"):
				await ctx.say("現在只看得見府城的屋頂與炊煙。%s\n（晴天的卯時、辰時，山下會鋪滿雲海）" % ("霧大，連府城都看不清。" if G.weather == "fog" else ""))
				return
			_mark("ms:wg_cloud")
			ctx.pass_time(2)
			var d := Hero.derive(G.hero)
			G.hero.qi = d.max_qi
			G.hero.stamina = d.max_stamina
			Festival._treat(2, 1.1)
			await ctx.say(["太陽從東邊的海上升起來，山下的雲海一下子被染成了金色。", "府城、府河、三塘鎮，全都沉在雲底下，只露出幾座塔尖。你站在亭邊，覺得自己也是一朵雲。",
				"（花了兩刻。內力、體力回滿；心情開闊：接下來兩場戰鬥武功經驗 ×1.1）"])
		1:
			await Arts.practice(ctx, "painting", "亭外群山起伏，山下是府城的萬家屋頂。", "要鋪紙畫一幅山景嗎？")
		2:
			await Arts.practice(ctx, "calligraphy", "亭柱上題滿了過路文人的詩，有好的，也有歪的。", "要在亭柱上題幾個字嗎？")


static func wangyan_stele(ctx: Ctx) -> void:
	var text := "〈望煙亭記〉\n「登斯亭也，北望州城，萬家炊煙，朝夕不絕。煙之所起，民之所生也。為官者登此，當思煙之所以不絕。」\n——前任煙州知州題"
	if ctx.flag("wg_stele") == 0:
		ctx.set_flag("wg_stele")
		var up := Crafts.gain("learning", 8)
		await ctx.say([text, "（第一次細讀，學識經驗 +8）"] + ([up] if up != "" else []))
		return
	await ctx.say(text)


# ── 斷碑觀 ──────────────────────────────────────────────

static func duanbei_stele(ctx: Ctx) -> void:
	await _carving(ctx, WOYUN, "woyun",
		["崖壁底下躺著一塊斷成兩截的巨碑，碑上沒有字。字刻在碑後的崖壁上——是一幅一幅的人形，擺著各種掌勢。", "最上頭八個字：\n「醉臥碑前，掌推雲月」"],
		"臥碑崖上的摩崖掌譜，人形一個挨一個，像在雲裡走。",
		["你學著崖上的人形推出一掌——掌風帶起的雲氣，好像真的推動了天上的雲！", "（學會「臥雲掌」：拳掌，戰鬥中可以使出「臥雲推月」）", "你把崖上的掌譜拓了下來。"],
		"manual_woyun")


static func duanbei_xuan(ctx: Ctx) -> void:
	var who := Person.full_name("db_xuan")
	var c := await ctx.ask(_by(who).call("無量天尊。這破觀難得有人來。"), ["問斷碑觀", "問臥碑崖", "不用了"])
	if c == 0:
		await ctx.say(_lines(who, ["斷碑觀以前香火旺，北嶺上下的人都來求籤。", "三十年前一場大雨，後山塌了，大殿塌了半邊，觀裡的人也散了。就剩老道一個。",
			"這地方要修好，得花不少錢。……要是哪天有人肯在這兒落腳，收幾個弟子，老道把觀交給他也甘願。（之後開放：自立門派）"]))
	elif c == 1:
		await ctx.say(_lines(who, ["臥碑崖上的掌譜，是前朝的觀主刻的。", "他喝醉了躺在碑底下睡了一夜，說夢裡跟天上的雲過了一夜的招。醒來，就把那一夜的招刻在崖上了。",
			"老道看了一輩子，也只看懂了頭兩式。你年輕，眼睛好，去看看吧。"]))


# ── 十里荷堤 ────────────────────────────────────────────

static func hedi_pavilion(ctx: Ctx) -> void:
	var c := await ctx.ask("堤中間的小亭，四面都是荷花，風一吹，滿亭子都是香的。", ["撫琴", "寫生", "算了"])
	if c == 0:
		await Arts.practice(ctx, "qin", "亭外荷葉田田，蜻蜓停在花苞上。", "要撫一曲嗎？")
	elif c == 1:
		await Arts.practice(ctx, "painting", "一望無際的荷花，遠處是菱塘村的炊煙。", "要畫一幅荷堤嗎？")


## 採蓮：夏天（六到八月）每一處一天一次
static func hedi_lotus(ctx: Ctx) -> void:
	var m := int(G.date_of().month) + 1
	if m < 6 or m > 8:
		await ctx.say("荷葉%s。不是採蓮的季節。" % ("剛冒出水面，捲得緊緊的" if m < 6 else "都枯了，梗子歪在水裡"))
		return
	var key := _spot_key(ctx)
	if _once(key):
		await ctx.say("這一片的蓮蓬採過了。")
		return
	_mark(key)
	ctx.pass_time(1)
	await ctx.work("garden", "採蓮中……", 1.0)
	await ctx.say("你探身折下幾枝蓮蓬，又順手拔起一節嫩藕。")
	await ctx.give("lotus_root")


static func hedi_ye(ctx: Ctx) -> void:
	var who := Person.full_name("hd_ye")
	var y := _by(who)
	var c := await ctx.ask(y.call("客官，坐船遊湖嗎？%d 兩，划到湖心，看荷花看個夠！" % BOAT_PRICE), ["坐船遊湖（兩刻）", "買湖產", "閒聊", "不用了"])
	match c:
		0:
			if _once("ms:hd_boat"):
				await ctx.say(y.call("今天划累了，明天再載你吧。"))
				return
			if not ctx.pay(BOAT_PRICE):
				await ctx.say(y.call("沒錢？那就在堤上看吧，一樣好看。"))
				return
			_mark("ms:hd_boat")
			ctx.pass_time(2)
			Festival._treat(1, 1.1)
			await ctx.say(["小船鑽進荷葉底下，頭頂的荷葉比傘還大。葉采菱一邊划一邊唱，唱的是菱塘村的採菱歌。", "（花了兩刻；心情愉快：下一場戰鬥武功經驗 ×1.1）"])
		1:
			await ctx.ui.shop("葉采菱的小船", ["lotus_root", "water_chestnut", "crucian"], 0.5)
		2:
			await ctx.say(_lines(who, ["夏天荷花開的時候，府城的公子小姐都來這兒，堤上擠得走不動。", "堤的南頭是蘆汀，一大片蘆葦洲，秋天蘆花白得像雪。聽說以前有人在那兒結廬收徒呢。"]))


static func hedi_fish(ctx: Ctx) -> void:
	await Fishing.fish_at(ctx, "reeds", "荷葉底下的水是暗的，魚喜歡躲在這兒。")
