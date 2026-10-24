## 今日事與早晨提要（照網頁版 daily.ts、ui/MorningBrief.tsx）：
## - 今日事（tasks）：今天能做、該做的事，依目前的狀態算出來、不存檔——鳴泉的晨課、雜務、領飯、月例與門派活動，旬休趕集，
##   節慶，手上的訂單，懸賞，月圓之夜的白鯉。新的每天一次的事就在 tasks 加一個來源。
## - 早晨提要（brief）：睡到天亮、讀檔、開新遊戲時跳出一頁日誌：日期、節氣、天氣、今日事、進行中的江湖事。書本「江湖」頁也列出今日事。
## 沒有用到旗標。

const Orders := preload("res://story/orders.gd")
const LifeMq := preload("res://story/life_mingquan.gd")

## 交節氣那天，提要多一句
const TERM_LINE := {
	"立春": "立春了。風裡還帶著寒意，柳梢卻已經冒出一點綠。", "雨水": "雨水。春雨細細的，田裡的人開始忙了。",
	"驚蟄": "驚蟄。一聲春雷，冬眠的蟲子都醒了，山裡的野獸也多了起來。", "春分": "春分，晝夜一樣長。燕子回來了。",
	"清明": "清明。家家戶戶上山掃墓，路上的行人多了。", "穀雨": "穀雨。雨生百穀，茶山上採新茶的人多了。",
	"立夏": "立夏。天一下子熱起來，荷塘裡冒出了小小的荷葉。", "小滿": "小滿。麥穗漸漸飽滿，還沒全熟。",
	"芒種": "芒種。農家最忙的時候，搶收又搶種。", "夏至": "夏至，一年裡白天最長的一天。",
	"小暑": "小暑。蟬叫得震天響，午後常有雷陣雨。", "大暑": "大暑，熱得連狗都趴著不動。在外頭練功要多喝水。",
	"立秋": "立秋。早晚涼了些，荷塘裡的菱角快熟了。", "處暑": "處暑，暑氣漸消。",
	"白露": "白露。草葉上掛著露水，夜裡涼得要添衣。", "秋分": "秋分，晝夜又一樣長了。桂花開了，滿城都香。",
	"寒露": "寒露。山上的楓葉紅了。", "霜降": "霜降。早上起來，瓦上結了一層白霜。蓮藕可以挖了。",
	"立冬": "立冬。該醃臘肉、曬魚乾了。", "小雪": "小雪。天陰沉沉的，像是要下雪。",
	"大雪": "大雪。山道積雪難行，出遠門要多留些時候。", "冬至": "冬至，一年裡夜最長的一天。家家吃湯圓。",
	"小寒": "小寒。湖邊結了薄冰。", "大寒": "大寒，一年最冷的時候。再熬一熬，春天就來了。",
}
const WEATHER_LINE := {
	"clear": "天朗氣清，是個練功的好日子。曬藥、織布都順手。",
	"cloudy": "天色陰陰的，雲層壓得很低。",
	"rain": "外頭下著雨，屋簷滴滴答答。野獸少了一半，山裡的野菌倒是冒出不少；在室外練功會比較累。",
	"fog": "山間起了霧，十步之外就看不清人影。聽說霧天的後山，偶爾會碰上怪事。",
	"snow": "下雪了，屋簷、樹梢一片白。野獸躲回窩裡，在外頭練功、趕路都吃力些。",
}


static func _f(k: String) -> int:
	return int(G.flags.get(k, 0))


static func _t(text: String, state := "todo", note := "") -> Dictionary:
	return {"text": text, "state": state, "note": note}


## 今天的事：{text, state（todo／done／missed）, note}；還沒做的排前面
static func tasks() -> Array:
	var out := []
	var fest := G.festival_of()
	if fest != "":
		var done := G.flags.keys().any(func(k): return String(k).begins_with("fest_") and not String(k).begins_with("fest_greet") and int(G.flags[k]) == G.day)
		out.append(_t("今天是%s，到處走走，看看有什麼節慶活動" % fest, "done" if done else "todo"))
	if Sect.member("mingquan"):
		if not G.is_xunxiu():
			var morning := "done" if _f("mq_morning") == G.day else ("missed" if G.shichen_of() >= 6 else "todo")
			out.append(_t("晨課（卯時到巳時，演武台找陸鳴川）", morning))
		var chores := _f("mq_chores") if _f("mq_chores_day") == G.day else 0
		var held: String = G.sect.get("chore", "")
		out.append(_t("門內雜務 %d/3（演武台旁的任務榜）" % chores, "done" if chores >= 3 else "todo", "手上：%s（%s）" % [load("res://story/mingquan.gd").CHORES[held].name, load("res://story/mingquan.gd").CHORES[held].where] if held != "" else ""))
		out.append(_t("到廚房跟卜大勺領今天的飯", "done" if _f("mq_meal") == G.day else "todo"))
		if G.day >= Sect.next_stipend():
			out.append(_t("到大殿找柯靜言領月例"))
		if LifeMq.is_meet_day():
			out.append(_t("旬休比武小會（未時到申時，演武台）", "done" if _f("mq_meet_day") == G.day else "todo"))
		if LifeMq.is_lecture_day():
			out.append(_t("長老講武（申時到酉時，練功房）", "done" if _f("mq_lecture") == G.day else "todo"))
		if LifeMq.watcher_on(G.day) == "hero":
			out.append(_t("今晚輪到你守夜（亥時到子時，大殿前的更鼓）", "done" if _f("mq_watch") == G.day else "todo"))
	if G.is_xunxiu():
		out.append(_t("旬休：臨江城趕集（城南擺出了平時沒有的攤子）"))
	out += Orders.tasks()
	out += load("res://story/mq_fund.gd").tasks()
	out += load("res://story/mq_trade.gd").tasks()
	out += load("res://story/mq_industry.gd").tasks()
	out += load("res://story/mq_order.gd").tasks()
	for b in load("res://story/linjiang.gd").BOUNTIES:
		var v := _f("lj_b_" + b[0])
		if v > 0:
			out.append(_t("懸賞「%s」：回臨江縣衙領賞" % b[1] if v == 2 else "懸賞「%s」" % b[1], "todo", "" if v == 2 else b[2]))
	if _f("by_legend") > 0 and _f("by_carp") == 0 and int(G.date_of().date) == 15:
		out.append(_t("月圓之夜：湖心島望月亭的白鯉", "todo", "夜裡、帶著釣竿"))
	var order := {"todo": 0, "done": 1, "missed": 2}
	out.sort_custom(func(a, b): return order[a.state] < order[b.state])
	return out


const MARK := {"todo": "□", "done": "■", "missed": "×"}


static func task_line(t: Dictionary) -> String:
	return "%s %s%s%s" % [MARK[t.state], t.text, "（今天錯過了）" if t.state == "missed" else "", ("　" + t.note) if t.note != "" else ""]


## 早晨提要：一頁日誌，空白鍵或 X 關上
static func brief(ui: Ui) -> void:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("f2e8d2")
	sb.border_color = Color("6a4a2a")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(6)
	sb.set_content_margin_all(26)
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(620, 0)
	p.position = Vector2(-310, -250)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 8)
	p.add_child(v)
	var lab := func(t: String, size: int, col := Color("2a1f18")) -> Label:
		var l := Label.new()
		l.text = t
		l.add_theme_font_override("font", Ui.font())
		l.add_theme_font_size_override("font_size", size)
		l.add_theme_color_override("font_color", col)
		l.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		l.custom_minimum_size = Vector2(560, 0)
		v.add_child(l)
		return l
	var fest := G.festival_of()
	var head := "%s　%s　%s" % [G.date_text(), ["春", "夏", "秋", "冬"][G.season_of()], G.current_term()]
	lab.call(head + ("　・%s" % fest if fest != "" else "") + ("　・旬休" if G.is_xunxiu() else ""), 24, Color("8a2e26"))
	var term := G.solar_term_of()
	if TERM_LINE.has(term):
		lab.call(TERM_LINE[term], 16, Color("3e5a3a"))
	lab.call(WEATHER_LINE.get(G.weather, ""), 16, Color("5a4a3a"))
	lab.call("—— 今　日 ——", 18, Color("6a5a4a"))
	var list := tasks()
	if list.is_empty():
		lab.call("今天沒有非做不可的事，四處走走吧。", 16, Color("8a7a6a"))
	for t in list:
		lab.call(task_line(t), 16, Color("2a1f18") if t.state == "todo" else Color("9a8a7a"))
	var qs := Quests.all().filter(func(q): return not q.done)
	if qs.size() > 0:
		lab.call("—— 江湖事 ——", 18, Color("6a5a4a"))
		for q in qs.slice(0, 3):
			var next := ""
			for st in q.steps:
				if not st[1]:
					next = st[0]
					break
			lab.call("・%s：%s" % [q.title, next], 15, Color("3a2e26"))
	lab.call("（空白鍵翻過這一頁）", 13, Color("9a8a7a"))
	ui._show(p)
	while true:
		var k: String = await ui._key
		if k in ["ok", "back"]:
			break
	ui._close()
