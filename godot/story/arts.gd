## 讀書與琴棋書畫（照網頁版 books.ts、story/reading.ts、arts.ts、story/arts.ts）。
## - 學識：經史子集書架（shelf），書目在 data/life.json 的 books；每本書的熟讀程度是項目 learning:書id（初讀 → 精通）。
##   學識的好處：買東西便宜（discount，每級 1%、最多一成，ui.shop 自動算進去），研讀、參悟領悟多（insight_bonus，Train.apply 加上）。
## - 雅藝：自己練（practice：琴回內力、書順帶長學識、畫畫出畫作），跟同好對弈或論藝（人物檔案的 hobby，按 H，由 social/hobby 轉過來）。
## - 對弈：三局兩勝，穩守、取勢、強攻相剋（play_chess）。
## 地點：鳴泉書房（書架 mq_shelf、書案 mq_desk）、後山聽泉亭（ting_quan）、望江台（wang_jiang）、聽劍亭（ting_jian）；
##   臨江書院（academy_shelf、academy_desk 在 linjiang.gd 轉過來）；竹風茶寮的棋桌（tea_board）；臨江城曲老爹（qu_chess）。
## 用到的旗標：qu_chess 跟曲老爹下棋那天

const Train := preload("res://story/train.gd")

## 讀一回書：幾刻、體力
const READ_KE := 4
const READ_STAMINA := 10
## 練一回雅藝：幾刻、體力、技能經驗
const PRACTICE_KE := 4
const PRACTICE_STAMINA := 8
const PRACTICE_EXP := 12
## 跟同好的互動名稱
const ART_ACTION := {"qin": "論琴", "chess": "對弈", "calligraphy": "品字", "painting": "賞畫"}
## 畫作：習作、佳作、名作
const PAINTINGS := ["painting_1", "painting_2", "painting_3"]


static func learning_level() -> int:
	return Crafts.level("learning")


## 學識的講價折扣（每級 1%，最多一成）
static func discount() -> float:
	return minf(0.1, learning_level() * 0.01)


## 學識讓研讀、參悟多得的領悟
static func insight_bonus() -> int:
	return learning_level()


static func books() -> Array:
	return Crafts.data().books


static func book(id: String) -> Dictionary:
	for b in books():
		if b.id == id:
			return b
	return {}


# ── 讀書 ────────────────────────────────────────────────

## 經史子集書架：挑一類、挑一本；allowed 為假時只說 idle（例如鳴泉的書架只給弟子讀）
static func shelf(ctx: Ctx, idle: String, allowed := true) -> void:
	if not allowed:
		await ctx.say(idle)
		return
	var shelves: Array = Crafts.data().shelves
	var stages: Array = Crafts.data().read_stages
	var k := await ctx.ask("%s\n要讀哪一類的書？（學識 %d 級）" % [idle, learning_level()], shelves + ["算了"])
	if k >= shelves.size():
		return
	var list := books().filter(func(b): return b.shelf == shelves[k])
	var lv := learning_level()
	var labels := list.map(func(b):
		var w := Crafts.work("learning", b.id)
		if lv < int(b.level):
			return "《%s》（學識 %d 級）" % [b.name, b.level]
		return "《%s》%s" % [b.name, "（%s）" % stages[w.level] if not w.is_empty() else ""])
	var i := await ctx.ask("讀哪一本？", labels + ["算了"])
	if i < list.size():
		await read_book(ctx, list[i])


static func read_book(ctx: Ctx, b: Dictionary) -> void:
	if learning_level() < int(b.level):
		await ctx.say("你翻開《%s》，滿紙的字都認得，連起來卻不知道在說什麼。\n（學識練到 %d 級才讀得懂）" % [b.name, b.level])
		return
	var n := await Train.ask_rounds(ctx, READ_STAMINA, "讀", 99, READ_KE)
	if n == 0 or not await Train.exert(ctx, READ_STAMINA * n, "讀了好一陣子，眼睛酸澀，字都在紙上跳。"):
		return
	await ctx.work("study", "讀《%s》中……" % b.name)
	ctx.pass_time(READ_KE * n)
	var w := Crafts.work("learning", b.id)
	# 每讀一回換一句
	var at := int(w.level) * 5 + int(w.exp) / 20 if not w.is_empty() else 0
	var line: String = b.lines[at % b.lines.size()]
	await ctx.say("%s\n「%s」\n%s" % ["你接著讀《%s》。" % b.name if not w.is_empty() else "你取下《%s》，從第一頁讀起。" % b.name, line, Train.rounds_note("讀", n, READ_KE)])
	var out := []
	for r in n:
		out.append_array(_read_once(b))
	if out.size() > 0:
		await ctx.say("\n".join(out))


## 讀一回：熟讀程度與學識經驗；讀到精通再額外得一筆學識經驗。讀熟了的書長得慢
static func _read_once(b: Dictionary) -> Array:
	Crafts.learn_work("learning", b.id)
	var out := []
	var done := int(Crafts.work("learning", b.id).level) >= Crafts.WORK_MAX
	if not done and Crafts.gain_work("learning", b.id, 20):
		var now := int(Crafts.work("learning", b.id).level)
		out.append("《%s》%s了。" % [b.name, Crafts.data().read_stages[now]])
		if now >= Crafts.WORK_MAX:
			out.append("你把《%s》讀得滾瓜爛熟，掩卷之後，心中豁然開朗。" % b.name)
			_push(out, Crafts.gain("learning", 20 + int(b.level) * 5))
	_push(out, Crafts.gain("learning", roundi((8 + int(b.level) * 3) * (0.3 if done else 1.0))))
	return out


static func _push(out: Array, s: String) -> void:
	if s != "":
		out.append(s)


# ── 自己練雅藝 ──────────────────────────────────────────

const PRACTICE := {
	"qin": {"ask": "亭中石桌上擺著一張古琴。要坐下來撫一曲嗎？", "verb": "撫", "work": ["qin", "撫琴中……"], "lines": ["你調好琴弦，隨著泉聲撥了一曲。", "琴聲和著水聲，心裡慢慢靜了下來。"]},
	"chess": {"ask": "石桌上刻著棋盤，旁邊兩罐黑白子。要打一盤譜嗎？", "verb": "打", "work": ["chess", "打譜中……"], "lines": ["你照著記得的棋譜，一黑一白地擺了一盤。", "擺到中盤，才看出當年那一手的妙處。"]},
	"calligraphy": {"ask": "書案上筆墨紙硯都備著。要練一會兒字嗎？", "verb": "練", "work": ["write", "練字中……"], "lines": ["你研好了墨，一筆一畫地臨帖。", "寫到後來，手腕越來越穩，字也有了幾分筋骨。"]},
	"painting": {"ask": "台上視野開闊。要畫一幅大江山水嗎？", "verb": "畫", "work": ["paint", "寫生中……"], "lines": ["你鋪開紙，對著江上的白帆與遠山落筆。", "雲氣一層層暈開，江面只留了一片白。"]},
}


## 撫琴回的內力
static func qin_qi(level: int) -> int:
	return 10 + level * 4


## 畫出來是哪一種：畫藝越高越常出佳作、名作
static func painting_roll(level: int) -> int:
	var q := randf() + level * 0.08
	return 2 if q > 1.25 else (1 if q > 0.85 else 0)


## 自己練一門雅藝：每回半個時辰與體力，加技能經驗，各有一點小用處
static func practice(ctx: Ctx, art: String, idle: String) -> void:
	var p: Dictionary = PRACTICE[art]
	if await ctx.ask("%s\n%s" % [idle, p.ask], ["好", "算了"]) != 0:
		return
	var n := await Train.ask_rounds(ctx, PRACTICE_STAMINA, p.verb, 99, PRACTICE_KE)
	if n == 0 or not await Train.exert(ctx, PRACTICE_STAMINA * n, "累得提不起精神，靜不下心來。"):
		return
	await ctx.work(p.work[0], p.work[1])
	ctx.pass_time(PRACTICE_KE * n)
	var lv := Crafts.level(art)
	await ctx.say("\n".join(p.lines) + "\n" + Train.rounds_note(p.verb, n, PRACTICE_KE))
	var out := []
	match art:
		"qin":
			var d := Hero.derive(G.hero)
			var qi := clampi(qin_qi(lv) * n, 0, int(d.max_qi) - int(G.hero.qi))
			G.hero.qi = int(G.hero.qi) + qi
			if qi > 0:
				out.append("心境平和，內力 +%d。" % qi)
		"calligraphy":
			_push(out, Crafts.gain("learning", 3 * n))
		"painting":
			var got := {}
			for i in n:
				var it: String = PAINTINGS[painting_roll(lv)]
				got[it] = int(got.get(it, 0)) + 1
			for it in got:
				ctx.give(it, got[it], true)
				out.append("畫成了「%s」×%d。" % [ctx.item_name(it), got[it]])
	_push(out, Crafts.gain(art, PRACTICE_EXP * n))
	if out.size() > 0:
		await ctx.say("\n".join(out))


static func ting_quan(ctx: Ctx) -> void:
	# 中秋入夜在這裡賞月（story/festival.gd）
	if await load("res://story/festival.gd").moon(ctx):
		return
	await practice(ctx, "qin", "聽泉亭。坐在亭中，泉水聲叮咚不絕，讓人心思澄靜。")


static func wang_jiang(ctx: Ctx) -> void:
	await practice(ctx, "painting", "「望江台」\n站在台上，臨江城與大江盡收眼底。江上白帆點點，遠處的雲水河像一條銀線。")


static func ting_jian(ctx: Ctx) -> void:
	await practice(ctx, "chess", "聽劍亭。亭柱上刻著一副對聯：「洗劍池邊聽泉語，鳴泉山上看劍心」。")


static func tea_board(ctx: Ctx) -> void:
	await practice(ctx, "chess", "桌上擱著一副棋，一盤殘局還沒下完。")


static func mq_shelf(ctx: Ctx) -> void:
	await shelf(ctx, "經史子集與詩詞。練劍之餘也要讀書，這是祖師定下的規矩。", Sect.member("mingquan"))


static func mq_desk(ctx: Ctx) -> void:
	await practice(ctx, "calligraphy", "書案上鋪著宣紙，壓著鎮紙，筆架上掛著幾支毛筆。")


static func academy_shelf(ctx: Ctx) -> void:
	await shelf(ctx, "書院的藏書，經史子集都有。夫子說，書是給人讀的，不是給人看的。")


static func academy_desk(ctx: Ctx) -> void:
	await practice(ctx, "calligraphy", "學童練字的書案，硯台裡的墨還沒乾。")


# ── 對弈 ────────────────────────────────────────────────

const CHESS_MOVES := ["穩守", "取勢", "強攻"]
const STYLE_HINT := ["棋風沉穩，總是先求自保", "喜歡搶佔大場，講究取勢", "落子凌厲，一有機會就強攻"]


## 相剋：取勢勝穩守、強攻勝取勢、穩守勝強攻
static func _beats(a: int, b: int) -> bool:
	return (a + 2) % 3 == b


## 跟人下一盤棋：三局兩勝。對方六成照自己的棋風（style）下，看出來了就挑相剋的下法；棋力高低也有影響。回傳贏了沒
static func play_chess(ctx: Ctx, name: String, level: int, style: int) -> bool:
	var mine := Crafts.level("chess")
	var win := 0
	var lose := 0
	await ctx.say("你和%s擺好棋盤，猜先落子。\n（%s%s。三局兩勝：取勢勝穩守、強攻勝取勢、穩守勝強攻；棋力高低也有影響）" % [name, name, STYLE_HINT[style]])
	var round := 1
	while win < 2 and lose < 2:
		var c := await ctx.ask("第 %d 盤（%d 勝 %d 負）。這一盤怎麼下？" % [round, win, lose], CHESS_MOVES)
		var theirs := style if randf() < 0.6 else randi() % 3
		var edge := 1 if _beats(c, theirs) else (-1 if _beats(theirs, c) else 0)
		var ok := randf() < clampf(0.5 + edge * 0.3 + (mine - level) * 0.04, 0.1, 0.9)
		if ok:
			win += 1
		else:
			lose += 1
		var read := "你這一手正好剋住了對方。" if edge > 0 else ("對方這一手正好剋住了你。" if edge < 0 else "兩邊下法相同，比的是棋力。")
		await ctx.say("你%s，%s%s。%s\n%s" % [CHESS_MOVES[c], name, CHESS_MOVES[theirs], read, "這一盤你贏了。" if ok else "這一盤你輸了。"])
		round += 1
	return win >= 2


## 跟同好的雅趣（social/hobby 轉過來，一天一次已經在那邊擋了）：棋就對弈，琴書畫就論藝；還不會的話對方教你入門
static func hobby(ctx: Ctx, p: Dictionary) -> int:
	var h: Dictionary = p.hobby
	var art: String = h.art
	var name: String = p.name
	ctx.pass_time(4)
	if art == "chess":
		var won := await play_chess(ctx, name, int(h.level), int(h.get("style", 0)))
		await ctx.say(["%s投子認輸，哈哈一笑：「好棋！」" % name if won else "%s收起棋子：「棋力還欠些火候，多下幾盤就好了。」" % name, "（下了半個時辰）"])
		_say_up(ctx, Crafts.gain("chess", 25 if won else 15))
		return 4 if won else 2
	var verb: String = {"qin": "撫琴論曲", "calligraphy": "品評字帖", "painting": "一同賞畫"}[art]
	if Crafts.level(art) == 0:
		var skill: String = {"qin": "琴", "calligraphy": "書法", "painting": "作畫"}[art]
		await ctx.say("%s見你不懂%s，倒也不嫌，手把手教了你一些入門的功夫。\n（花了半個時辰）" % [name, skill])
		_say_up(ctx, Crafts.gain(art, 40))
		return 1
	var close := Crafts.level(art) >= int(h.level) - 2
	await ctx.say("你和%s%s，%s\n（花了半個時辰）" % [name, verb, "談得十分投機，不知不覺半個時辰就過去了。" if close else "大多時候是你在聽，對方說的你只懂一半。"])
	_say_up(ctx, Crafts.gain(art, 15 + int(h.level) * 2))
	return 3 if close else 1


static func _say_up(ctx: Ctx, s: String) -> void:
	if s != "":
		ctx.ui.notify(s, Color("a8c070"))


## 臨江城曲老爹：他在樹下下棋的時候，可以陪他下一盤（一天一次）
static func qu_chess(ctx: Ctx) -> void:
	var w := ctx.walker()
	if w.get("act", "") != "chess" or ctx.flag("qu_chess") == G.day:
		await ctx.chat()
		return
	var c := await ctx.ask({"speaker": "曲老爹", "text": "年輕人，坐下來陪老頭子下盤棋？"}, ["陪他下一盤（半個時辰）", "聊聊", "不用了"])
	if c == 1:
		await ctx.chat()
	if c != 0:
		return
	ctx.set_flag("qu_chess", G.day)
	ctx.pass_time(4)
	var won := await play_chess(ctx, "曲老爹", 3, 1)
	await ctx.say([{"speaker": "曲老爹", "text": "後生可畏！明天再來，老頭子要扳回一城。" if won else "年輕人，取勢要先看穩，別急。"}, "（下了半個時辰）"])
	_say_up(ctx, Crafts.gain("chess", 25 if won else 15))
