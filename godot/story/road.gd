## 州圖路上的小事（照網頁版 story/road.ts）：沿著道路走，每走一段（world_map 的 ROAD_STEP 格）擲一次，偶爾碰上一件。
## - 機率 CHANCE；一天最多 MAX_PER_DAY 件；同一件事各有冷卻天數（旗標 road:<事> 記哪天碰的）。
## - 每件事：權重、冷卻、合不合適（_ok：看路、時辰、天氣、季節、旗標）、劇情（ev_<事>）。
## - v（路況）= {road 路名, near 附近的據點 id 陣列, period 清晨／白天／黃昏／夜裡, weather, season, danger 這條路險不險}
## 用到的旗標：road 今天碰了幾件（記成 日子*10+件數）、road:<事> 哪天碰的、road_gan 跟遊俠甘十一切磋贏了幾次（3 次後送東西，之後 = 9）、
## road_bundle 把撿到的包袱送回去幾次

const CHANCE := 0.18
const MAX_PER_DAY := 2
## 路險不險（劫道的毛賊）：照路名，沒寫的是 0.05
const DANGER := {"沿江大道": 0.15, "北嶺官道": 0.15, "南嶺古道": 0.12, "蒼嵐山道": 0.12, "雲水官道": 0.06, "湖畔小路": 0.04}

## [id, 權重, 冷卻天數]
const EVENTS := [
	["peddler", 4, 1], ["sprained", 3, 4], ["bundle", 2, 6], ["rumor", 4, 0], ["sunrise", 3, 3], ["sunset", 3, 3],
	["rain_temple", 4, 2], ["fog_lost", 3, 2], ["forage", 3, 1], ["checkpoint", 6, 2], ["wanderer", 2, 5], ["robbers", 3, 2],
	["blossoms", 3, 4], ["shade", 3, 3], ["geese", 3, 4], ["persimmon", 2, 5], ["snow_road", 4, 2], ["plum", 2, 5], ["fireflies", 3, 3],
]
const PEDDLERS := ["齊有福", "孫二貴", "馮春生", "邵大旺"]
const PEDDLER_GOODS := ["jinchuang", "yangqi_wan", "tea", "cotton_thread", "egg", "sugar", "mushroom", "rod", "g_bamboo_hat", "g_sachet"]
const RUMORS := [
	["丁老三", "挑夫", ["臨江城碼頭上，漕幫跟金刀鏢局又槓上了。", "聽說三年前鏢局丟了一趟鏢，到現在都說是漕幫幹的。"], ""],
	["駱青", "販茶的", ["東海上那夥掛黑帆的海盜，連官船都敢劫。", "大埠頭的船行都不肯出海了，海商們急得跳腳。"], ""],
	["游先生", "說書的", ["蒼嵐山上夜裡有人吹笛子，調子悽悽慘慘的。", "有人說是斷崖寨的冤魂……我看是哪個傷心人。"], ""],
	["柯文", "趕考的書生", ["北嶺關口最近查得嚴，說是在抓什麼要犯。", "我的路引看了三遍才放行，嚇得我腿都軟了。"], ""],
	["彭雄", "走鏢的", ["南嶺古道那頭的江南渡，渡船停了好一陣子。", "船家說江心有東西，晚上會撞船——誰知道是真是假。"], ""],
	["岑姑", "採藥的", ["雲嶺上的雲霧茶，採下來要在當天炒好，晚一刻就不香了。", "山上有隻白猿，會偷採茶人的乾糧。"], ""],
	["汪七", "漁夫", ["碧漪湖東頭有人下密網，連魚苗都撈。", "秦老爺子氣得幾天沒吃飯。"], "biyi"],
]
const SEASONS := ["spring", "summer", "autumn", "winter"]

const Train := preload("res://story/train.gd")


## 走了一段路：擲骰挑一件小事來做（world_map 呼叫，ctx.extra 帶著 road、near）
static func maybe(ctx: Ctx) -> void:
	var today := int(ctx.flag("road")) / 10 == G.day
	var n := int(ctx.flag("road")) % 10 if today else 0
	if n >= MAX_PER_DAY or randf() >= CHANCE:
		return
	var v := view(ctx.extra.get("road", ""), ctx.extra.get("near", []))
	var pool := []
	var total := 0.0
	for e in EVENTS:
		var last := int(G.flags.get("road:" + e[0], -99))
		if G.day - last < int(e[2]) or not _ok(e[0], v):
			continue
		pool.append(e)
		total += float(e[1])
	if pool.is_empty():
		return
	var r := randf() * total
	for e in pool:
		r -= float(e[1])
		if r < 0:
			ctx.set_flag("road", G.day * 10 + n + 1)
			ctx.set_flag("road:" + e[0], G.day)
			await Story.run_bool("road/ev_" + e[0], ctx)
			return


static func view(road: String, near: Array) -> Dictionary:
	var s := G.shichen_of()
	var period := "dawn" if s == 3 else ("dusk" if s == 9 else ("day" if s >= 4 and s <= 8 else "night"))
	return {"road": road, "near": near, "period": period, "weather": G.weather, "season": SEASONS[G.season_of()], "danger": float(DANGER.get(road, 0.05))}


static func _ok(id: String, v: Dictionary) -> bool:
	var night: bool = v.period == "night"
	match id:
		"peddler", "sprained", "forage", "blossoms", "geese", "persimmon", "plum":
			if night:
				return false
	match id:
		"sunrise":
			return v.period == "dawn" and v.weather in ["clear", "cloudy"]
		"sunset":
			return v.period == "dusk" and v.weather == "clear"
		"rain_temple":
			return v.weather == "rain"
		"fog_lost":
			return v.weather == "fog"
		"checkpoint":
			return "beiling" in v.near and not night
		"wanderer":
			return int(G.flags.get("road_gan", 0)) < 9 and not night
		"robbers":
			# 險路才有；夜裡更常碰到
			return randf() < v.danger * (3.0 if night else 1.5)
		"blossoms":
			return v.season == "spring" and v.weather != "rain"
		"shade":
			return v.season == "summer" and v.period == "day" and v.weather == "clear"
		"geese", "persimmon":
			return v.season == "autumn"
		"snow_road":
			return v.season == "winter"
		"plum":
			return v.season == "winter"
		"fireflies":
			return night and v.weather != "rain" and v.season == "summer"
	return true


static func _by(who: String) -> Callable:
	return func(t: String) -> Dictionary: return {"speaker": who, "text": t}


static func _heal(key: String, n: int) -> String:
	var d := Hero.derive(G.hero)
	var mx: int = {"hp": d.max_hp, "qi": d.max_qi, "stamina": d.max_stamina}[key]
	G.hero[key] = mini(mx, int(G.hero[key]) + n)
	return "%s +%d" % [{"hp": "氣血", "qi": "內力", "stamina": "體力"}[key], n]


## 若有所悟：能悟下一招的武功加領悟，沒有就武學點數 +1
static func _insight(n: int) -> Array:
	var ready := Train.studyable()
	if ready.is_empty():
		G.hero.points = int(G.hero.points) + 1
		return ["（若有所悟，武學點數 +1）"]
	var s: Dictionary = ready[0]
	var name: String = Hero.skill_def(s.id).name
	var learned := Hero.gain_insight(G.hero, s.id, n)
	if learned == "":
		return ["（對「%s」的下一招又多了幾分體會，領悟 %d%%）" % [name, int(s.insight)]]
	return ["靈光一閃！你從「%s」中悟出了「%s」！" % [name, Hero.move_def(learned).name]]


# ── 各件小事 ────────────────────────────────────────────

static func ev_peddler(ctx: Ctx) -> bool:
	var name: String = PEDDLERS.pick_random()
	var p := _by(name)
	var stock := PEDDLER_GOODS.duplicate()
	stock.shuffle()
	if await ctx.ask(p.call("客官留步！走這麼遠的路，缺什麼沒有？藥、茶、針頭線腦，擔子裡都有！"), ["看看貨", "不用了，趕路"]) == 0:
		await ctx.ui.shop("%s的貨擔" % name, stock.slice(0, 6))
	else:
		await ctx.say(p.call("好走好走，下回再碰上，算你便宜！"))
	return true


static func ev_sprained(ctx: Ctx) -> bool:
	var name: String = ["杜婆婆", "韓老丈", "葉阿公"].pick_random()
	var p := _by(name)
	await ctx.say(["路邊石頭上坐著一位老人家，揉著腳踝直皺眉。", p.call("哎喲……下坡的時候踩空了，這腳一沾地就疼。")])
	var med := ctx.has("jinchuang")
	var opts := ["扶老人家走一段（兩刻）"] + (["給一帖金創藥"] if med else []) + ["說聲保重，繼續趕路"]
	var c := await ctx.ask("要幫忙嗎？", opts)
	if c == 0:
		ctx.pass_time(2)
		await ctx.say(["你讓老人家搭著肩，慢慢走了一段，送到前頭的岔路口，那裡有人家。", p.call("好孩子，好孩子……這幾個銅板你拿著買碗茶喝。")])
		ctx.silver(2)
		ctx.fame(3)
	elif c == 1 and med:
		ctx.take("jinchuang")
		await ctx.say(["你取出金創藥替老人家敷上，又用布條纏緊。", p.call("涼涼的，不怎麼疼了……真是遇上好人了。")])
		ctx.fame(5)
	else:
		await ctx.say(p.call("去吧去吧，我歇一會兒就好。"))
	return true


static func ev_bundle(ctx: Ctx) -> bool:
	await ctx.say("路邊的草叢裡丟著一個藍布包袱，打了個死結。四下沒有人。")
	if await ctx.ask("……", ["打開看看", "不關我的事，走開"]) != 0:
		return true
	var silver := 5 + randi() % 8
	await ctx.say(["包袱裡是幾件換洗衣服、一封家書，還有一小包碎銀，約莫 %d 兩。" % silver, "家書的信封上寫著：「臨江城北，杜家三嫂親啟」。"])
	if await ctx.ask("……", ["把碎銀收下", "原樣包好，託人帶去給杜三嫂"]) == 0:
		G.silver += silver
		G.hero.fame = maxi(0, int(G.hero.get("fame", 0)) - 2)
		await ctx.say("銀兩 +%d。\n（心裡有點不踏實。名聲 -2）" % silver)
	else:
		ctx.set_flag("road_bundle", ctx.flag("road_bundle") + 1)
		await ctx.say("你把包袱重新紮好，到了前頭的驛站，託往臨江城的驛差順路捎去杜家。\n驛差拍拍胸脯：「放心，一文錢都不會少。」")
		ctx.fame(6)
		await ctx.give("yangqi_wan", 1)
	return true


static func ev_rumor(ctx: Ctx) -> bool:
	var v: Dictionary = view(ctx.extra.get("road", ""), ctx.extra.get("near", []))
	var pool := RUMORS.filter(func(r): return r[3] == "" or r[3] in v.near or "qingzhu" in v.near)
	var r: Array = pool.pick_random()
	var p := _by(r[0])
	await ctx.say(["路上跟一個旅人並肩走了一段，是%s%s。" % [r[1], r[0]]] + r[2].map(func(t): return p.call(t)))
	return true


static func ev_sunrise(ctx: Ctx) -> bool:
	await ctx.say(["東邊的天一點一點亮起來，太陽從山脊後頭跳出來，整條路都鍍上了金。", "你停下腳步，深深吸了一口氣——胸中一股清氣，緩緩沉到丹田。"] + _insight(12))
	return true


static func ev_sunset(ctx: Ctx) -> bool:
	await ctx.say(["晚霞燒紅了半邊天，歸鳥一群群往林子裡飛。", "你在路邊的石頭上坐了一會兒，腿上的痠也散了些。（%s）" % _heal("stamina", 10)])
	return true


static func ev_rain_temple(ctx: Ctx) -> bool:
	ctx.pass_time(2)
	var p := _by("書生何默")
	await ctx.say(["雨越下越大，你躲進路旁一座破山神廟。", "廟裡已經有個書生在烤火，見你進來，往旁邊挪了挪。",
		p.call("這雨一時半刻停不了。兄台不嫌棄，我念段書給你聽，打發打發時間？"), "（雨停前，書生念了半部兵書給你聽。過了兩刻）"] + _insight(8))
	return true


static func ev_fog_lost(ctx: Ctx) -> bool:
	ctx.pass_time(3)
	await ctx.say(["霧大得看不見三步外的路，你走著走著，竟然繞回了剛才那棵歪脖子樹。", "（在霧裡多走了三刻冤枉路）"])
	return true


static func ev_forage(ctx: Ctx) -> bool:
	if G.weather in ["rain", "cloudy"]:
		await ctx.say("雨後的樹根旁冒出一叢叢野菌，你順手採了一些。")
		await ctx.give("mushroom", 1 + randi() % 2)
	else:
		await ctx.say("路邊的溝渠旁長著一片止血草，葉子肥厚。你採了幾株。")
		await ctx.give("herb", 2)
	return true


static func ev_checkpoint(ctx: Ctx) -> bool:
	var p := _by("官差鄔勝")
	await ctx.say("官道上橫著一道木柵，兩個官差攔住過往的行人，一個個對著告示上的畫像看。")
	if int(G.hero.get("fame", 0)) >= 40:
		await ctx.say([p.call("咦，你不就是……失敬失敬，請過請過。"), "（名聲在外，官差揮揮手放你過去了）"])
		return true
	var c := await ctx.ask(p.call("站住！哪裡來的？往哪裡去？……身上帶了什麼？"), ["老老實實讓他搜", "塞一兩銀子當茶水錢"])
	if c == 1 and ctx.pay(1):
		await ctx.say(p.call("嗯，懂規矩。走吧走吧。"))
	else:
		ctx.pass_time(1)
		await ctx.say(["官差把你的行囊翻了個底朝天，又對著畫像看了半天。", p.call("……不是。走吧。"), "（告示上畫的是個瘦長臉、左眉有疤的漢子，底下寫著「欽犯」兩個大字）"])
	return true


static func ev_wanderer(ctx: Ctx) -> bool:
	var p := _by("甘十一")
	var wins := ctx.flag("road_gan")
	if wins > 0:
		await ctx.say(["前頭的大樹下，又是那個揹著破劍的遊俠，正嚼著草根等人。", p.call("又見面了！上回不算，再來！")])
	else:
		await ctx.say(["前頭的大樹下坐著一個揹著破劍的遊俠，嘴裡嚼著草根。", p.call("這位朋友，走路的架勢不錯。"), p.call("在下甘十一，四海為家。過兩招？點到為止。")])
	if await ctx.ask("……", ["過兩招", "改天吧"]) != 0:
		await ctx.say(p.call("哈，那就改天！江湖這麼小，總會再碰上的。"))
		return true
	var o := await ctx.battle("spar_wanderer")
	if o != "win":
		await ctx.say(p.call("跑得倒快！" if o == "flee" else "承讓承讓。你的底子不壞，就是火候差些。"))
		return true
	var n := wins + 1
	ctx.set_flag("road_gan", n)
	if n < 3:
		await ctx.say([p.call("好！痛快！"), p.call("這是第 %d 回了。贏我三回，我送你樣好東西。" % n)])
		return true
	ctx.set_flag("road_gan", 9)
	await ctx.say([p.call("三回了……服了，服了。"), p.call("這塊護腕跟了我十年，擋過的刀比你吃過的飯還多。拿去吧。"), p.call("後會有期！"), "甘十一把劍往背上一甩，頭也不回地走了。"])
	await ctx.give("g_iron_bracer")
	ctx.fame(5)
	return true


## 險路上的毛賊（沿江大道、北嶺官道、南嶺古道這類長路；夜裡更常碰到）
static func ev_robbers(ctx: Ctx) -> bool:
	await ctx.say("路旁的樹林裡竄出三條人影，手裡拎著棍棒柴刀，攔在路中間。")
	var c := await ctx.ask({"speaker": "毛賊", "text": "此路是我開！留下五兩銀子，放你過去！"}, ["拔劍（開打）", "給五兩銀子", "轉身就跑"])
	if c == 1 and ctx.pay(5):
		await ctx.say("毛賊掂了掂銀子，嘿嘿笑著讓開了路。")
		return true
	if c == 2:
		# 輕功好就跑得掉
		if randf() < 0.4 + Hero.equipped_level(G.hero, "light") * 0.08:
			await ctx.say("你腳下一發力，三兩步竄進林子裡，毛賊在後頭罵罵咧咧，追了幾步就不追了。")
			return true
		await ctx.say("沒跑幾步就被追上了——躲不掉，只好打！")
	await ctx.battle("bounty_bandits")
	return true


static func ev_blossoms(ctx: Ctx) -> bool:
	await ctx.say(["路旁一片桃林開得正盛，風一吹，花瓣落了你一肩。", "你伸手接住一片，忽然想起一句「桃花流水鱖魚肥」——這時節，河裡的鱖魚該肥了。（心情大好，%s）" % _heal("stamina", 8)])
	return true


static func ev_shade(ctx: Ctx) -> bool:
	ctx.pass_time(1)
	await ctx.say(["日頭毒得像火，你在路邊一棵大樟樹下歇了歇腳。", "樹上的蟬叫得震天響。賣涼茶的老漢舀了一碗給你，只收一個銅板。（歇了一刻，%s）" % _heal("stamina", 15)])
	return true


static func ev_geese(ctx: Ctx) -> bool:
	await ctx.say(["一行大雁排成人字，從頭頂往南飛去，叫聲一聲接一聲。", "你看著牠們的隊形，一隻領頭、兩翼相應，忽然覺得跟劍陣有幾分相似。"] + _insight(8))
	return true


static func ev_persimmon(ctx: Ctx) -> bool:
	var p := _by("包大嫂")
	await ctx.say(["路邊的農家院子裡，柿子樹掛滿了紅燈籠似的果子。", p.call("過路的，拿兩個去吃！今年結得多，吃不完要爛啦。"), "（甜得黏牙。%s）" % _heal("hp", 30)])
	return true


static func ev_snow_road(ctx: Ctx) -> bool:
	ctx.pass_time(1)
	var lines := ["雪越下越大，路上的腳印一下就被蓋住了。" if G.weather == "snow" else "路上的積雪還沒化，一腳深一腳淺。", "你提一口氣，踩著前人的腳印往前走，竟也走出了幾分輕功的味道。"]
	var list := Train.trainable("light")
	if list.is_empty():
		lines.append("（踩雪走路，腿上的勁長了些）")
	else:
		lines += Train._exp_lines(list[0].id, 12, false)
	await ctx.say(lines)
	return true


static func ev_plum(ctx: Ctx) -> bool:
	await ctx.say(["雪地裡一株老梅開了，紅得耀眼，香氣冷冷的。", "你在梅樹下站了一會兒，胸中一股清氣慢慢沉了下去。（%s）" % _heal("qi", 20)])
	return true


static func ev_fireflies(ctx: Ctx) -> bool:
	await ctx.say(["夜路上，草叢裡亮起一點一點的螢火，忽明忽滅，跟著你走了好長一段。", "頭頂的星星密得像撒了一把鹽。你忽然覺得，夜路也沒那麼難走。（%s）" % _heal("qi", 10)])
	return true
