## 練功與歇息（照網頁版 story/estate.ts 的木人樁、書架、床與鳴泉的蒲團）：練樁、打坐、研讀、睡覺。
## 練功都花體力與時間，可以連做幾回（ask_rounds）；體力只有睡覺、小睡、井邊歇息、吃藥能補回來。
## 青竹村裡：竹林的木人樁（stake）、竹林石碑參悟竹影劍（stele_study，由 qingzhu/stele_read 轉過來）、
## 竹隱寺的蒲團（sit）、經架（shelf）、客寮的竹榻（temple_bed）。
## 用到的旗標：lodge 智遠答應讓你在竹隱寺借宿

## 每回要花的體力
const STAMINA := {"stake": 20, "sit": 10, "study": 10}
## 每回幾刻
const KE := 2
## 每回的成長：木人樁的經驗、打坐的內功經驗（研讀的換算在下面「研讀」那一段）
const STAKE_EXP := 30
const SIT_EXP := 20
## 連做時，體力留到剩幾成為止
const KEEP_STAMINA := 0.3


## 花體力：夠就扣掉並回傳 true，不夠就說累了
static func exert(ctx: Ctx, cost: int, tired: String) -> bool:
	var have: int = G.hero.stamina
	if have < cost:
		await ctx.say("%s\n（體力不足：需要 %d，目前只剩 %d。睡一覺、小睡片刻或在井邊歇歇就能恢復）" % [tired, cost, have])
		return false
	G.hero.stamina -= cost
	return true


## 重複的事一次做完：體力夠連做兩回以上，就問一回、三回，還是做到體力剩三成（max 是最多幾回有意義，例如練到上限）。回傳回數，0 是不做
static func ask_rounds(ctx: Ctx, cost: int, verb: String, max_n := 99) -> int:
	var keep := ceili(Hero.derive(G.hero).max_stamina * KEEP_STAMINA)
	var n := mini(max_n, (int(G.hero.stamina) - keep) / cost)
	if n < 2:
		return 1
	var counts := [1]
	if n > 3:
		counts.append(3)
	counts.append(n)
	var labels := []
	for i in counts.size():
		var k: int = counts[i]
		labels.append("%s一回" % verb if k == 1 else ("連%s %d 回（體力剩三成為止）" % [verb, k] if i == counts.size() - 1 else "連%s %d 回" % [verb, k]))
	var c := await ctx.ask("要%s幾回？（每回兩刻、體力 %d）" % [verb, cost], labels + ["算了"])
	return counts[c] if c < counts.size() else 0


## 連做 n 回的說明，例如「（連練 4 回，花了一個時辰）」
static func rounds_note(verb: String, n: int) -> String:
	return "（連%s %d 回，花了%s）" % [verb, n, G.ke_text(KE * n)] if n > 1 else "（花了%s）" % G.ke_text(KE)


## 每回得多少經驗，要幾回才練到上限
static func rounds_to_cap(s: Dictionary, gained: int) -> int:
	var cap := Hero.cap_of(s)
	if s.level >= cap or gained <= 0:
		return 0
	var need: int = -int(s.exp)
	for l in range(s.level, cap):
		need += Hero.exp_to_next(l)
	return ceili(need / float(gained))


## 某類（outer／inner）裝備中、還沒練到上限的武功
static func trainable(slot: String) -> Array:
	return G.hero.skills.filter(func(s): return Hero.is_equipped(s) and Hero.slot_of(Hero.skill_def(s.id).kind) == slot and s.level < Hero.cap_of(s))


## 能參悟下一招的武功（重數夠了、還有招沒悟）；only 限定哪一門
static func studyable(only := "") -> Array:
	return G.hero.skills.filter(func(s):
		var nx := Hero.next_move(s)
		return (only == "" or s.id == only) and not nx.is_empty() and s.level >= int(nx.level))


## 經驗的結果：每門一行，升重另外說
static func _exp_lines(id: String, amount: int, use_insight: bool) -> Array:
	var before: int = Hero.find_skill(G.hero, id).level
	var up := Hero.gain_skill(G.hero, id, amount, use_insight)
	var s := Hero.find_skill(G.hero, id)
	var out := ["「%s」經驗 +%d（第 %d 重）。" % [Hero.skill_def(id).name, amount, s.level]]
	if up != "" and s.level > before:
		out.append(up)
	return out


# ── 竹林的木人樁：練外功 ─────────────────────────────────

static func stake(ctx: Ctx) -> void:
	var list := trainable("outer")
	if list.is_empty():
		await ctx.say("一根埋在竹林空地上的木人樁，伸出三根木臂，樁身被打得油亮。\n（要裝備著還沒練到上限的外功，才能在這裡練）")
		return
	var names := list.map(func(s): return "%s（第 %d 重）" % [Hero.skill_def(s.id).name, s.level])
	var i := await ctx.ask("竹林空地上的木人樁，樁身被打得油亮。要練哪一門？", names + ["算了"])
	if i >= list.size():
		return
	var s: Dictionary = list[i]
	var n := await ask_rounds(ctx, STAMINA.stake, "練", rounds_to_cap(s, STAKE_EXP))
	if n == 0 or not await exert(ctx, STAMINA.stake * n, "手臂都快抬不起來了，筋骨痠痛得很。"):
		return
	ctx.pass_time(KE * n)
	await ctx.work("stake", "練樁中……")
	await ctx.say(["「啪、啪、啪——」你對著木人樁一招一式地練了起來，竹葉被震得簌簌落下。" + rounds_note("練", n)] + _exp_lines(s.id, STAKE_EXP * n, false))


# ── 竹隱寺的蒲團：打坐 ──────────────────────────────────

static func sit(ctx: Ctx) -> void:
	var list := trainable("inner")
	var gain := func(s: Dictionary) -> int: return roundi(SIT_EXP * (1.0 + Hero.attrs(G.hero).insight / 40.0))
	# 內功都練到上限了，打坐只為回內力：一回就夠
	var max_n := 1
	for s in list:
		max_n = maxi(max_n, rounds_to_cap(s, gain.call(s)))
	if await ctx.ask("一個磨舊了的蒲團。要坐下來調息嗎？", ["打坐", "算了"]) != 0:
		return
	var n := await ask_rounds(ctx, STAMINA.sit, "坐", max_n)
	if n == 0 or not await exert(ctx, STAMINA.sit * n, "坐得腿都麻了，心也靜不下來。"):
		return
	ctx.pass_time(KE * n)
	await ctx.work("sit", "打坐中……")
	var out := ["你在蒲團上盤膝坐下，閉目調息。寺外竹聲沙沙，心思漸漸沉靜……" + rounds_note("坐", n), "（內力完全恢復，氣血也恢復了一些）"]
	for s in list:
		out += _exp_lines(s.id, SIT_EXP * n, true)
	# 內功精進了上限會變，所以練完再回內力
	var d := Hero.derive(G.hero)
	G.hero.qi = d.max_qi
	G.hero.hp = mini(d.max_hp, int(G.hero.hp) + roundi(d.max_hp * 0.2 * n))
	if list.is_empty():
		out.append("（裝備著還沒練到上限的內功，打坐時才會精進）")
	await ctx.say(out)


# ── 研讀：小遊戲「循著筆意」（scripts/read_game.gd） ─────────
## 每份讀物（石碑、經架、每一種秘笈）累積的體會記在 G.hero.reading[讀物 id].exp；親自或自動照共用規則（Practice，id 是 "read:讀物"）：
## 第一次一定要親自讀（玩小遊戲）；之後可以選親自讀，或自動讀（每回得上一次親自讀的八成，可以連讀幾回）。
## 讀到的體會：還不會的武功累積到門檻就學會；會了的，能悟下一招就換成領悟，否則換成武功經驗。

## 竹林石碑：體會到多少才看懂竹影劍（碑文八個字，一次最多 24）
const STELE_UNLOCK := 40
## 秘笈上還不會的武功：照品階要多少體會才學得會
const UNLOCK_BY_TIER := {"入門": 30, "中品": 60, "上乘": 120, "絕學": 200}
## 體會換成領悟的比例（石碑專對竹影劍，換得多）；換成武功經驗是體會的兩倍
const STELE_INSIGHT := 0.75
const BOOK_INSIGHT := 0.5
const EXP_RATE := 2

const STELE := {"id": "stele", "title": "竹林石碑", "text": "竹影搖風，劍意自生"}
const SHELF := {"id": "qz_shelf", "title": "經架上的拳譜", "text": "靜觀其變，後發先至"}


static func record(id: String) -> Dictionary:
	if not G.hero.has("reading"):
		G.hero.reading = {}
	if not G.hero.reading.has(id):
		G.hero.reading[id] = {"exp": 0}
	var r: Dictionary = G.hero.reading[id]
	# 早一點的存檔把上次成績也記在這裡：搬到共用的 Practice
	if r.has("times"):
		if not Practice.tried("read:" + id) and int(r.times) > 0:
			Practice.done("read:" + id, float(r.last))
		r.erase("times")
		r.erase("last")
	return r


## 讀一回或連讀幾回：src = {id, title, text}，prompt 是開頭的描述，need 是還要多少體會才學會（自動連讀不會超過）。回傳這次得到的體會；-1 是沒讀
## 親自或自動照共用規則（scripts/practice.gd）：第一次一定親自玩，自動每回得上一次親自的八成
static func read(ctx: Ctx, src: Dictionary, prompt: String, need := 0) -> int:
	var r := record(src.id)
	var pid: String = "read:" + src.id
	var each := roundi(Practice.auto_value(pid))
	var c := await Practice.choose(ctx, pid, "%s\n（每回兩刻、體力 %d%s）" % [prompt, STAMINA.study, "" if Practice.tried(pid) else "；第一次研讀要親自讀"],
		"靜下心來研讀", "親自研讀（上次得 %d）" % roundi(Practice.last(pid)), "自動研讀（每回得 %d，上次的八成）" % each)
	if c < 0:
		return -1
	if c == 0:
		if not await exert(ctx, STAMINA.study, "讀了好一陣子，腦袋有些發脹。"):
			return -1
		var g := await ReadGame.play(ctx.ui, src.title, src.text)
		ctx.pass_time(KE)
		Practice.done(pid, g.exp)
		r.exp = int(r.exp) + int(g.exp)
		return int(g.exp)
	if each <= 0:
		await ctx.say("上次親自讀的時候什麼也沒讀進去，照著那樣讀也是白讀。\n（先親自研讀一回，讀得好，自動研讀才得得多）")
		return -1
	var n := await ask_rounds(ctx, STAMINA.study, "讀", ceili(need / float(each)) if need > 0 else 99)
	if n == 0 or not await exert(ctx, STAMINA.study * n, "讀了好一陣子，腦袋有些發脹。"):
		return -1
	ctx.pass_time(KE * n)
	await ctx.work("study", "研讀中……")
	r.exp = int(r.exp) + each * n
	await ctx.say("你照著上回讀懂的地方，一句一句細細琢磨……%s" % rounds_note("讀", n))
	return each * n


## 這門武功還讀得出東西嗎（能悟下一招，或還沒練到上限）
static func can_gain(id: String) -> bool:
	var s := Hero.find_skill(G.hero, id)
	return not s.is_empty() and (not studyable(id).is_empty() or s.level < Hero.cap_of(s))


## 把體會用到已經會的武功上：能悟下一招就加領悟，否則加經驗；回傳要說的話
static func apply(id: String, gained: int, insight_rate: float) -> Array:
	var name: String = Hero.skill_def(id).name
	var s := Hero.find_skill(G.hero, id)
	if gained <= 0:
		return ["這一回什麼也沒讀進去。"]
	if not studyable(id).is_empty():
		var before: int = s.level
		var learned := Hero.gain_insight(G.hero, id, gained * insight_rate)
		if learned == "":
			return ["對「%s」的下一招又多了幾分體會（領悟 %d%%）。" % [name, int(s.insight)]]
		var out := ["靈光一閃！你從「%s」中悟出了「%s」！" % [name, Hero.move_def(learned).name]]
		if s.level > before:
			out.append("「%s」隨之精進至第 %d 重！" % [name, s.level])
		return out
	if s.level < Hero.cap_of(s):
		return _exp_lines(id, gained * EXP_RATE, false)
	return ["「%s」已經練到上限，讀不出更多東西了。" % name]


## 竹林石碑（qingzhu/stele_read 轉過來）：體會到 STELE_UNLOCK 才看懂竹影劍；看懂之後專門參悟竹影劍
static func stele(ctx: Ctx) -> void:
	var r := record(STELE.id)
	if ctx.flag("stele") == 0:
		if not Practice.tried("read:" + STELE.id):
			await ctx.say(["竹林深處立著一塊長滿青苔的石碑。", "碑上刻著八個字，筆畫如劍痕：\n「竹影搖風，劍意自生」", "一陣風吹過，滿林竹影搖曳。碑上的劍痕好像也跟著動了起來……"])
		var g := await read(ctx, STELE, "碑上的劍痕起落有致，似乎藏著一路劍法。（體會 %d／%d）" % [int(r.exp), STELE_UNLOCK], STELE_UNLOCK - int(r.exp))
		if g < 0:
			return
		if int(r.exp) < STELE_UNLOCK:
			await ctx.say("這一回體會了 %d。碑上的劍意你看懂了幾分，卻還連不成一路劍法。\n（體會 %d／%d）" % [g, int(r.exp), STELE_UNLOCK])
			return
		await ctx.say("一陣風過，竹影與碑上的劍痕疊在一起——你忽然看出了其中的起落轉折！")
		await ctx.learn("zhuying")
		await ctx.say(["（戰鬥中可以使出「破竹直刺」了，練得深了還能悟出「竹影搖風」）", "你撕下一片衣角，蘸著溪水把碑上的劍痕拓了下來。"])
		await ctx.give("manual_zhuying")
		ctx.set_flag("stele")
		return
	if not can_gain("zhuying"):
		await ctx.say("碑上的劍痕，你已了然於胸。")
		return
	var g2 := await read(ctx, STELE, "碑上的劍痕起落有致，竹影在上面晃來晃去。要再對著它參悟「竹影劍法」嗎？")
	if g2 >= 0:
		await ctx.say(apply("zhuying", g2, STELE_INSIGHT))


## 竹隱寺的經架：一冊雲遊僧留下的拳譜，對任何能悟下一招的武功都有點用
static func shelf(ctx: Ctx) -> void:
	var opening := "架上擺著幾部舊經書，夾著一冊不知哪位雲遊僧留下的拳譜，書頁都翻軟了。"
	var ready := studyable()
	if ready.is_empty():
		await ctx.say("%s\n（目前沒有可以參悟的招式：武功要練到一定重數，才悟得出下一招）" % opening)
		return
	var i := 0
	if ready.size() > 1:
		var names := ready.map(func(s): return "%s（領悟 %d%%）" % [Hero.skill_def(s.id).name, int(s.insight)])
		i = await ctx.ask("%s\n要對照哪一門武功參悟？" % opening, names + ["算了"])
		if i >= ready.size():
			return
	var id: String = ready[i].id
	var g := await read(ctx, SHELF, "%s\n對照著「%s」的招式參悟。" % [opening, Hero.skill_def(id).name])
	if g >= 0:
		await ctx.say(apply(id, g, BOOK_INSIGHT))


## 讀行囊裡的秘笈（書本選單的行囊頁選了秘笈，main 在場景上跑這個；ctx.extra.item 是物品 id）
static func read_manual(ctx: Ctx) -> void:
	var item: String = ctx.extra.get("item", "")
	var d := Ui.item_def(item)
	var sk: String = d.get("manual", "")
	if sk == "" or not G.bag.has(item):
		return
	var sname: String = Hero.skill_def(sk).name
	var src := {"id": item, "title": d.name, "text": d.verse if d.has("verse") else _verse(sk)}
	var known := not Hero.find_skill(G.hero, sk).is_empty()
	if known:
		if not can_gain(sk):
			await ctx.say("「%s」你已經讀熟了，書裡的東西都化進了招式裡。\n（帶在身上，之後突破「%s」的上限時用得上）" % [d.name, sname])
			return
		var g := await read(ctx, src, "你翻開「%s」，對照著「%s」的招式推敲。" % [d.name, sname])
		if g >= 0:
			await ctx.say(apply(sk, g, BOOK_INSIGHT))
		return
	var need: int = UNLOCK_BY_TIER.get(Hero.skill_def(sk).tier, 60)
	var r := record(item)
	var g2 := await read(ctx, src, "你翻開「%s」。上面記的是「%s」，你還不會這門武功。（體會 %d／%d）" % [d.name, sname, int(r.exp), need], need - int(r.exp))
	if g2 < 0:
		return
	if int(r.exp) < need:
		await ctx.say("這一回體會了 %d。（體會 %d／%d，讀懂了就能學會「%s」）" % [g2, int(r.exp), need, sname])
		return
	await ctx.say("讀到最後一頁，前前後後的口訣忽然串成了一氣！")
	await ctx.learn(sk)


## 秘笈沒寫口訣時，用前三招的招名當讀的字
static func _verse(sk: String) -> String:
	var names := []
	for mv in Hero.skill_def(sk).moves.slice(0, 3):
		names.append(Hero.move_def(mv.id).get("name", ""))
	return "，".join(names)


# ── 睡覺 ────────────────────────────────────────────────

## 竹隱寺客寮的竹榻：第一次智遠會答應讓你借宿
static func temple_bed(ctx: Ctx) -> void:
	if ctx.flag("lodge") == 0:
		await ctx.say([{"speaker": "智遠", "text": "施主若在村裡沒有落腳的地方，這張竹榻就借你睡吧。"}, {"speaker": "智遠", "text": "寺裡清苦，不收什麼錢。早晚的鐘聲吵了些，施主莫怪。"}])
		ctx.set_flag("lodge")
	await rest(ctx, "一張竹榻，鋪著乾淨的草蓆。要躺下休息嗎？")


## 床：睡到天亮（全回復），或小睡一到三個時辰（每個時辰回四分之一的氣血、內力，三分之一的體力）
## wake：睡到天亮時接著說的話（例如門派宿舍裡同門叫你起床）
static func rest(ctx: Ctx, prompt: String, wake := []) -> void:
	var night: bool = G.time < 20 or G.time >= 72
	var c := await ctx.ask(prompt, ["睡到天亮" if night else "睡到明天早上", "小睡一個時辰", "小睡兩個時辰", "小睡三個時辰", "算了"])
	if c == 0:
		await ctx.work("sleep", "睡覺中……", 1.4)
		ctx.pass_time(G.ke_until_dawn())
		ctx.restore_all()
		await ctx.say(["你一覺睡到天亮。\n——%s　%s" % [G.date_text(), G.time_text()]] + wake + ["（氣血、內力、體力完全恢復）"])
	elif c <= 3:
		await ctx.work("sleep", "小睡片刻……", 1.2)
		ctx.pass_time(c * G.KE_PER_SHICHEN)
		var d := Hero.derive(G.hero)
		G.hero.hp = mini(d.max_hp, int(G.hero.hp) + roundi(d.max_hp * 0.25 * c))
		G.hero.qi = mini(d.max_qi, int(G.hero.qi) + roundi(d.max_qi * 0.25 * c))
		G.hero.stamina = mini(d.max_stamina, int(G.hero.stamina) + roundi(d.max_stamina * 0.34 * c))
		await ctx.say(["你小睡了%s個時辰。\n——%s" % ["一兩三"[c - 1], G.time_text()], "（恢復了一些氣血、內力與體力）"])
