class_name BizBook
## 經營的帳簿（照網頁版 ui/ShopManager.tsx、ui/BizHQ.tsx、ui/Handbook.tsx）：一張攤開的帳本，上緣是書籤分頁。
## - "shop"（店裡櫃台的「經營管理」）：總覽（定價、櫃上、近三十天）、帳目（每日／每月長條圖）、人事、進貨、保鏢。
## - "hq"（總號帳簿）：各店、掌櫃、供應商、方針、帳房。
## - "handbook"（經營手冊）：九章，左邊步驟、右邊要訣。
## 按鍵：Q／E（或 Tab）換頁、↑↓ 選一列、←→ 調數值（帳目頁是選一天）、空白鍵執行（有子選項的列攤開選項）、X 回上一層或闔上。
## 每列是 {text, right, bar（0–1）, bar_color, desc, act（Callable → 一句話）, cycle（Callable(方向) → 一句話）, sub（[[名稱, Callable → 一句話]…]）}。

const PAPER := Color("f2e8d2")
const INK := Color("2a2018")
const MUTED := Color("8a7a62")
const RED := Color("8a2e26")
const GOLD := Color("c9962e")
const GREEN := Color("4a7a3a")
const ROWS := 11

const SHOP_TABS := ["總覽", "帳目", "人事", "進貨", "保鏢"]
const HQ_TABS := ["各店", "掌櫃", "供應商", "方針", "帳房"]

## 經營手冊：[書籤, 標題, 副標, [[步驟, 說明]…], [要訣…]]
const CHAPTERS := [
	["序", "東家須知", "得到稱號「東家」", [["置產", "看公告欄的出售告示，找縣衙師爺或萬通牙行買下房子、店面。"], ["開店", "在自己的店面登記商號，雇夥計、擺貨，每天半夜自動結算。"],
		["管帳", "店裡櫃台的「經營管理」看帳目、人事、進貨、保鏢。"], ["進貨", "自己供貨，或跟各地供應商簽約批貨。"], ["代管", "店多了請掌櫃、大掌櫃，照你定的方針替你打理。"]],
		["有了「東家」的稱號，才能跟供應商談合約、請掌櫃。", "這本手冊隨時可以從店裡的櫃台翻開。", "Q／E 翻頁，X 闔上。"]],
	["置產", "一、買屋與出租", "縣衙師爺・萬通牙行", [["看告示", "公告欄「日常公告」貼著誰家要賣房子、店面，有期限。"], ["看房", "找師爺苗守正或牙人錢六，可以先進去看看。"],
		["談價", "自己談（談崩了屋主會漲價），或付三分佣金請牙人出面。"], ["出租", "民居可以招租，每旬收租；修繕過的房子租金高。"], ["賣屋", "市價慢慢賣（九成到一成二），或降價快賣（五到八成）。"]],
		["老店（當鋪、客棧、望江樓）偶爾轉讓，買下照舊經營、每旬分紅。", "民居、店面都可以修繕，房價跟著漲。"]],
	["開店", "二、登記商號開店", "縣衙師爺", [["登記", "到縣衙找師爺，在自己的店面登記商號（規費二十兩）。"], ["選店種", "飯館要烹飪、布莊要紡織、魚鋪要釣魚；雜貨鋪誰都能開。"],
		["雇夥計", "店裡要有人顧才做得了生意；夥計各有長處。"], ["擺貨", "把自己做的菜、釣的魚、織的衣服從行囊擺上架。"], ["收帳", "每天半夜結算，收入存在櫃上，回店裡收。"]],
		["自己做的東西不花本錢，賺得最多。", "東家偶爾親自站櫃台，那天生意多四成。", "店可以擴成店鋪、老字號：客人多、貨架多、能雇的人多。"]],
	["帳簿", "三、經營管理", "店裡櫃台的帳簿", [["總覽", "櫃上的錢、近三十天盈虧、定價（便宜／公道／高價）。"], ["帳目", "每日、每月的長條圖：進帳、開銷、盈虧一目了然。"],
		["人事", "夥計的工錢與士氣，加薪、發紅包、年度加薪。"], ["進貨", "自己供貨或批貨，每樣補到幾件。"], ["保鏢", "從縣衙、鏢局、漕幫請人坐鎮。"]],
		["Q／E 換頁，←→ 調數值、看某一天的帳。", "客人身上的錢有限，太貴的東西會嫌貴不買。"]],
	["進貨", "四、供應商與合約", "去過的地方才找得到", [["走動", "去過的城鎮，總號帳簿才列得出那裡的供應商。"], ["上門", "要親自找那家的人談，才簽得了約。"],
		["簽約", "一個月、一季、一年；簽得越久，進價讓得越多。"], ["批貨", "進貨頁改成批貨，設定每樣補到幾件，每天半夜送來。"], ["續約", "簽過的可以在總號帳簿續約，不必再跑一趟。"]],
		["產地價低，可是要運費、雨雪天常斷貨。", "在那座城有同一種自己的店，由分號就地採辦，不必簽約（貴五分）。", "每樣貨會自動挑最便宜的那家。"]],
	["夥計", "五、夥計與士氣", "人和才能生財", [["士氣", "剛雇來六十，每天慢慢回到五十五上下。"], ["加薪", "加一兩，士氣大漲；拒絕，有人會走。"],
		["紅包", "每人三兩，士氣上來；隔十天才能再發。"], ["年度加薪", "每年正月初一照設定給每個人加薪。"]],
		["士氣高客人多；太低常鬧事，低於二十隨時會走。", "夥計待久、士氣高，可以提拔成掌櫃。"]],
	["店事", "六、店裡的大小事", "櫃台第一項「有事」", [["地痞", "蔡三來收保護費：給錢、動手、報官，或請保鏢坐鎮。"], ["夥計", "想加薪、偷懶帳對不上，要東家拿主意。"],
		["大主顧", "周府下訂，期限內交貨照價多收五成。"], ["老饕", "飯館來了郝一嚐：端出好菜，口碑傳開。"], ["租客", "屋漏、手頭緊、送東西來，去屋裡找他。"]],
		["鏢師坐鎮，地痞不敢上門、小偷不敢打主意。", "夜裡遭小偷不用處理，帳上會記下來。"]],
	["掌櫃", "七、掌櫃與總號", "店多了就交給專業的人", [["找人", "萬通牙行的錢六介紹掌櫃，或提拔自家夥計。"], ["指派", "掌櫃管一家店；大掌櫃管一整座城，連房子一起。"],
		["方針", "在總號帳簿定好方針，掌櫃照著辦，不必你回去。"], ["帳房", "多的錢交回總號帳房，到任何一家店都能提。"], ["查帳", "忠誠低的會中飽私囊，記得偶爾查帳。"]],
		["掌櫃做久了才幹會長，才幹六、經驗九十能升大掌櫃。", "薪水、分紅給得公道，忠誠才會漲。"]],
	["心得", "八、生意經", "老東家的幾句話", [["看節令", "節慶當天客人多；年節賣年貨、新衣，中秋端午上館子。"], ["看天氣", "下雨下雪客人少，遠地的貨也常斷。"],
		["看名聲", "名聲越大，慕名而來的客人越多。"], ["別欠帳", "櫃上欠超過一百兩，供應商就不肯再賒，生意會停。"], ["別貪大", "店少時請大掌櫃、鏢師不划算，先把一家店做起來。"]],
		["批貨省事但利薄；自己做的東西才是真本錢。", "最好的店，一個月也不過淨賺一千多兩。細水長流。"]],
]

var ui: Ui
var mode := "shop"
var shop_id := ""
var tab := 0
var cur := 0
var note := ""
## 攤開的子選項：[[名稱, Callable]…]；空的是沒攤開
var sub: Array = []
var sub_cur := 0
## 帳目頁：false 每日、true 每月；選中的那一根
var monthly := false
var col := -1


## 打開帳簿，闔上才回來
static func open(u: Ui, m: String, id := "") -> void:
	var b := BizBook.new()
	b.ui = u
	b.mode = m
	b.shop_id = id
	await b._run()


func _tabs() -> Array:
	if mode == "shop":
		return SHOP_TABS
	if mode == "hq":
		return HQ_TABS
	return CHAPTERS.map(func(c): return c[0])


func _run() -> void:
	while true:
		var rows := _rows()
		cur = clampi(cur, 0, maxi(0, rows.size() - 1))
		_draw(rows)
		var k: String = await ui._key
		var n := _tabs().size()
		if k == "back":
			if sub.size() > 0:
				sub = []
				continue
			break
		if sub.size() > 0:
			if k == "Up":
				sub_cur = (sub_cur + sub.size() - 1) % sub.size()
			elif k == "Down":
				sub_cur = (sub_cur + 1) % sub.size()
			elif k == "ok":
				var f: Callable = sub[sub_cur][1]
				sub = []
				note = str(await f.call())
			continue
		if k in ["E", "Tab"]:
			tab = (tab + 1) % n
			_reset()
		elif k == "Q":
			tab = (tab + n - 1) % n
			_reset()
		elif _is_chart():
			if k == "Up" or k == "Down":
				monthly = not monthly
				col = -1
			elif k == "Left":
				col -= 1
			elif k == "Right":
				col += 1
		elif k == "Up" and rows.size() > 0:
			cur = (cur + rows.size() - 1) % rows.size()
			note = ""
		elif k == "Down" and rows.size() > 0:
			cur = (cur + 1) % rows.size()
			note = ""
		elif (k == "Left" or k == "Right") and rows.size() > 0 and rows[cur].has("cycle"):
			note = str(rows[cur].cycle.call(-1 if k == "Left" else 1))
		elif k == "ok" and rows.size() > 0:
			var r: Dictionary = rows[cur]
			if r.has("sub"):
				sub = r.sub
				sub_cur = 0
			elif r.has("act"):
				note = str(await r.act.call())
			elif r.has("cycle"):
				note = str(r.cycle.call(1))
	ui._close()


func _reset() -> void:
	cur = 0
	note = ""
	sub = []
	col = -1


func _is_chart() -> bool:
	return mode == "shop" and tab == 1


# ── 畫 ──────────────────────────────────────────────────

func _label(t: String, size := 16, color := INK) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


func _bar(v: float, color: Color, w := 90.0, h := 10.0) -> Control:
	var back := ColorRect.new()
	back.color = Color(0, 0, 0, 0.1)
	back.custom_minimum_size = Vector2(w, h)
	back.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var fg := ColorRect.new()
	fg.color = color
	fg.size = Vector2(w * clampf(v, 0.0, 1.0), h)
	back.add_child(fg)
	return back


func _draw(rows: Array) -> void:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = PAPER
	sb.border_color = Color("6a4a2a")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 24
	sb.content_margin_right = 24
	sb.content_margin_top = 14
	sb.content_margin_bottom = 14
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(860, 520)
	p.position = Vector2(-430, -225)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	p.add_child(v)
	# 標題與書籤
	var head := HBoxContainer.new()
	var title := _label(_title(), 22)
	title.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(title)
	head.add_child(_label("銀兩 %d" % G.silver, 16, MUTED))
	v.add_child(head)
	var tabs := HBoxContainer.new()
	tabs.add_theme_constant_override("separation", 4)
	var names := _tabs()
	for i in names.size():
		var t := _label(" %s " % names[i], 15, Color("fff8e8") if i == tab else INK)
		var tsb := StyleBoxFlat.new()
		tsb.bg_color = Color("8a5a32") if i == tab else Color("e4d6b8")
		tsb.set_corner_radius_all(3)
		tsb.content_margin_left = 6
		tsb.content_margin_right = 6
		t.add_theme_stylebox_override("normal", tsb)
		tabs.add_child(t)
	v.add_child(tabs)
	v.add_child(HSeparator.new())
	var body := VBoxContainer.new()
	body.custom_minimum_size = Vector2(800, 400)
	body.add_theme_constant_override("separation", 3)
	v.add_child(body)
	if mode == "handbook":
		_draw_chapter(body)
	elif _is_chart():
		_draw_chart(body)
	else:
		_draw_rows(body, rows)
	v.add_child(HSeparator.new())
	var foot := _label(note if note != "" else _hint(rows), 14, RED if note != "" else MUTED)
	foot.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	foot.custom_minimum_size = Vector2(800, 0)
	v.add_child(foot)
	ui._show(p)


func _title() -> String:
	if mode == "shop":
		var s := Biz.shop(shop_id)
		return "「%s」帳簿・%s・%s" % [s.name, Biz.SHOP_TYPES[s.type].name, Biz.level_def(s).name]
	if mode == "hq":
		return "總號帳簿"
	return "經營手冊"


func _hint(rows: Array) -> String:
	if mode == "handbook":
		return "Q／E 翻頁　X 闔上"
	if sub.size() > 0:
		return "↑↓ 選　空白鍵 確定　X 收起"
	var base := "Q／E 換頁　↑↓ 選　X 闔上"
	if _is_chart():
		return "↑↓ 換成%s　←→ 選一%s　Q／E 換頁　X 闔上" % ["每日" if monthly else "每月", "個月" if monthly else "天"]
	if rows.size() > 0:
		var r: Dictionary = rows[cur]
		if r.has("cycle"):
			base = "←→ 調整　" + base
		if r.has("sub") or r.has("act"):
			base = "空白鍵 %s　" % r.get("verb", "選") + base
	return base


func _draw_rows(body: VBoxContainer, rows: Array) -> void:
	if rows.is_empty():
		body.add_child(_label("（這一頁還沒有東西）", 16, MUTED))
		return
	var start := clampi(cur - ROWS / 2, 0, maxi(0, rows.size() - ROWS))
	for i in range(start, mini(rows.size(), start + ROWS)):
		var r: Dictionary = rows[i]
		var on := i == cur and sub.is_empty()
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		var pick: bool = r.has("act") or r.has("sub") or r.has("cycle")
		var t := _label(("▶ " if i == cur else "　 ") + r.text, 16, RED if on else (INK if pick or r.get("strong", false) else MUTED))
		t.size_flags_horizontal = Control.SIZE_EXPAND_FILL
		h.add_child(t)
		if r.has("bar"):
			h.add_child(_bar(r.bar, r.get("bar_color", GOLD)))
		if r.has("right"):
			h.add_child(_label(r.right, 15, INK))
		body.add_child(h)
	if rows.size() > ROWS:
		body.add_child(_label("　（%d／%d）" % [cur + 1, rows.size()], 13, MUTED))
	var r2: Dictionary = rows[cur]
	if sub.size() > 0:
		body.add_child(HSeparator.new())
		for j in sub.size():
			body.add_child(_label(("　▶ " if j == sub_cur else "　　 ") + sub[j][0], 16, RED if j == sub_cur else INK))
	elif r2.get("desc", "") != "":
		body.add_child(HSeparator.new())
		var d := _label(r2.desc, 14, Color("5a4a3a"))
		d.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		d.custom_minimum_size = Vector2(800, 0)
		body.add_child(d)


func _draw_chapter(body: VBoxContainer) -> void:
	var c: Array = CHAPTERS[tab]
	body.add_child(_label(c[1], 22, RED))
	body.add_child(_label(c[2], 14, MUTED))
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 24)
	body.add_child(cols)
	var left := VBoxContainer.new()
	left.custom_minimum_size = Vector2(470, 0)
	left.add_theme_constant_override("separation", 8)
	var right := VBoxContainer.new()
	right.custom_minimum_size = Vector2(300, 0)
	right.add_theme_constant_override("separation", 10)
	cols.add_child(left)
	cols.add_child(right)
	for i in (c[3] as Array).size():
		var st: Array = c[3][i]
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 8)
		var num := _label(" %d " % (i + 1), 15, Color("fff8e8"))
		var nsb := StyleBoxFlat.new()
		nsb.bg_color = Color("8a5a32")
		nsb.set_corner_radius_all(10)
		num.add_theme_stylebox_override("normal", nsb)
		num.size_flags_vertical = Control.SIZE_SHRINK_BEGIN
		h.add_child(num)
		var t := _label("%s　%s" % [st[0], st[1]], 16)
		t.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		t.custom_minimum_size = Vector2(420, 0)
		h.add_child(t)
		left.add_child(h)
	right.add_child(_label("要訣", 16, GOLD))
	for tip in c[4]:
		var t2 := _label("◆ " + tip, 15, Color("5a4a3a"))
		t2.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		t2.custom_minimum_size = Vector2(300, 0)
		right.add_child(t2)


# ── 帳目的長條圖 ────────────────────────────────────────

## 每日（近三十天）或每月（近十二個月）：[{label, income, cost, detail}]
func _columns() -> Array:
	var out := []
	var sources: Array = [Biz.shop(shop_id)] if mode == "shop" else Biz.shops().values()
	if monthly:
		var keys := []
		for s in sources:
			for k in s.get("months", {}):
				if not k in keys:
					keys.append(k)
		keys.sort()
		for k in keys.slice(-12):
			var m := {"days": 0, "customers": 0, "income": 0, "wages": 0, "tax": 0, "guard": 0, "supply": 0, "mgr": 0}
			for s in sources:
				var x: Dictionary = s.get("months", {}).get(k, {})
				for f in m:
					m[f] = int(m[f]) + int(x.get(f, 0))
			var parts := (k as String).split("-")
			out.append({"label": "%d月" % (int(parts[1]) + 1), "income": int(m.income), "cost": Biz.cost_of(m),
				"detail": "第%d年%s：營業 %d 天、客人 %d\n進帳 %d、工錢 %d、稅 %d、保鏢 %d、進貨 %d、掌櫃 %d　盈虧 %+d" % [int(parts[0]), G.MONTH_NAMES[int(parts[1])], m.days, m.customers, m.income, m.wages, m.tax, m.guard, m.supply, m.mgr, int(m.income) - Biz.cost_of(m)]})
		return out
	var days: Array = sources[0].get("days", []).slice(-30) if sources.size() > 0 else []
	for d in days:
		var dd := G.date_of(int(d.day))
		out.append({"label": str(dd.date), "income": int(d.income), "cost": Biz.cost_of(d),
			"detail": "%s：%s客人 %d、賣出 %d\n進帳 %d、工錢 %d、稅 %d、保鏢 %d、進貨 %d、掌櫃 %d　盈虧 %+d" % [G.date_text(int(d.day)), "關門。" if d.get("closed", false) else "", int(d.customers), int(d.get("sold", 0)),
				int(d.income), int(d.wages), int(d.tax), int(d.get("guard", 0)), int(d.get("supply", 0)), int(d.get("mgr", 0)), int(d.income) - Biz.cost_of(d)]})
	return out


func _draw_chart(body: VBoxContainer) -> void:
	var cols := _columns()
	body.add_child(_label("%s　（金：進帳　紅：開銷　下排：盈虧）" % ("每月（近十二個月）" if monthly else "每日（近三十天）"), 15, INK))
	if cols.is_empty():
		body.add_child(_label("帳上還沒有記錄。開張以後，每天半夜結算一次。", 16, MUTED))
		return
	col = clampi(col if col >= 0 else cols.size() - 1, 0, cols.size() - 1)
	var top := 1
	var low := 1
	for c in cols:
		top = maxi(top, maxi(int(c.income), int(c.cost)))
		low = maxi(low, absi(int(c.income) - int(c.cost)))
	var chart := HBoxContainer.new()
	chart.add_theme_constant_override("separation", 2)
	chart.custom_minimum_size = Vector2(800, 250)
	body.add_child(chart)
	var bw := clampf(780.0 / cols.size() - 4.0, 8.0, 50.0)
	for i in cols.size():
		var c: Dictionary = cols[i]
		var vb := VBoxContainer.new()
		vb.alignment = BoxContainer.ALIGNMENT_END
		vb.custom_minimum_size = Vector2(bw + 2, 250)
		vb.add_theme_constant_override("separation", 1)
		var pair := HBoxContainer.new()
		pair.alignment = BoxContainer.ALIGNMENT_CENTER
		pair.add_theme_constant_override("separation", 1)
		pair.size_flags_vertical = Control.SIZE_SHRINK_END
		for f in [["income", GOLD], ["cost", RED]]:
			var r := ColorRect.new()
			r.color = f[1] if i == col else Color(f[1], 0.55)
			r.custom_minimum_size = Vector2(bw / 2.0, maxf(1.0, 170.0 * int(c[f[0]]) / top))
			r.size_flags_vertical = Control.SIZE_SHRINK_END
			pair.add_child(r)
		vb.add_child(pair)
		var profit := int(c.income) - int(c.cost)
		var pr := ColorRect.new()
		pr.color = (GREEN if profit >= 0 else RED) if i == col else Color(GREEN if profit >= 0 else RED, 0.5)
		pr.custom_minimum_size = Vector2(bw, maxf(1.0, 40.0 * absi(profit) / low))
		var holder := Control.new()
		holder.custom_minimum_size = Vector2(bw, 42)
		holder.add_child(pr)
		vb.add_child(holder)
		var lb := _label(c.label, 11, RED if i == col else MUTED)
		lb.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		vb.add_child(lb)
		chart.add_child(vb)
	var det := _label(cols[col].detail, 15)
	det.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	det.custom_minimum_size = Vector2(800, 0)
	body.add_child(det)


# ── 各頁的列 ────────────────────────────────────────────

func _rows() -> Array:
	if mode == "handbook":
		return []
	if mode == "shop":
		return [_overview, func(): return [], _staff_rows, _supply_rows, _guard_rows][tab].call()
	return [_shops_rows, _manager_rows, _supplier_rows, _policy_rows, _vault_rows][tab].call()


func _sum30(s: Dictionary) -> Dictionary:
	var out := {"income": 0, "cost": 0, "customers": 0, "n": 0}
	for d in (s.get("days", []) as Array).slice(-30):
		out.income += int(d.income)
		out.cost += Biz.cost_of(d)
		out.customers += int(d.customers)
		out.n += 1
	return out


func _overview() -> Array:
	var s := Biz.shop(shop_id)
	var a := _sum30(s)
	var stock: Array = s.stock.keys().map(func(k): return "%s×%d" % [Ui.item_def(k).get("name", k), int(s.stock[k])])
	var guard := "沒有"
	if s.has("guard"):
		guard = "%s%s（%s）" % [Biz.guard_def(s.guard.source).title, s.guard.name, Biz.guard_def(s.guard.source).from]
	var bz: Dictionary = s.get("buzz", {})
	var mgr := Biz.manager_of(shop_id)
	return [
		{"text": "定價：%s" % Biz.PRICE_TIERS[int(s.price)].name, "right": "賣價 ×%s、客人 ×%s" % [Biz.PRICE_TIERS[int(s.price)].sell, Biz.PRICE_TIERS[int(s.price)].draw],
			"cycle": func(d: int) -> String:
				s.price = clampi(int(s.price) + d, 0, 2)
				return "定價改成「%s」。" % Biz.PRICE_TIERS[int(s.price)].name,
			"desc": "便宜：賣價九成、客人多兩成；公道：照行情；高價：賣價一成一、客人少三成五。"},
		{"text": "櫃上的錢", "right": "%d 兩" % roundi(float(s.till)), "strong": true},
		{"text": "近 %d 天：進帳 %d、開銷 %d" % [a.n, a.income, a.cost], "right": "盈虧 %+d 兩" % (a.income - a.cost), "strong": true},
		{"text": "平均一天的客人", "right": "%.1f 位" % (a.customers / maxf(1.0, a.n))},
		{"text": "每天固定開銷（工錢＋保鏢）", "right": "%d 兩" % Biz.daily_fixed(s)},
		{"text": "夥計 %d／%d 人" % [(s.staff as Array).size(), Biz.level_def(s).staff], "right": "平均士氣 %d" % roundi(Biz.avg_morale(s)), "bar": Biz.avg_morale(s) / 100.0, "bar_color": GREEN},
		{"text": "保鏢：%s" % guard},
		{"text": "進貨：%s" % ("批貨" if s.get("supply", {}).get("mode", "self") == "order" else "自己供貨")},
		{"text": "地段：%s" % Biz.prop_def(shop_id).name, "right": "客人 ×%s" % str(Biz.LOCATION.get(shop_id, 1.0))},
		{"text": "管事的：%s" % (Biz.mgr_title(mgr) if not mgr.is_empty() else "東家自己")},
		{"text": "老饕的口碑：%s" % ("客人 ×%s（到%s）" % [bz.mult, G.date_text(int(bz.until))] if not bz.is_empty() and int(bz.until) >= G.day else "沒有")},
		{"text": "架上：%s" % ("、".join(stock) if stock.size() > 0 else "空的"), "desc": "、".join(stock)},
	]


func _staff_rows() -> Array:
	var s := Biz.shop(shop_id)
	var out := []
	for n in s.staff:
		var name: String = n
		var d := Biz.staff_def(name)
		var since := int(s.get("staffInfo", {}).get(name, {}).get("since", s.opened))
		out.append({"text": "%s（%s）" % [name, d.trait], "right": "工錢 %d 兩・士氣 %d・到職 %d 天" % [Biz.wage_of(s, name), Biz.morale_of(s, name), G.day - since],
			"bar": Biz.morale_of(s, name) / 100.0, "bar_color": GREEN if Biz.morale_of(s, name) >= 40 else RED, "desc": d.desc,
			"sub": [["加薪一兩（士氣 +20）", func() -> String:
				if not s.has("raises"):
					s.raises = {}
				s.raises[name] = int(s.raises.get(name, 0)) + 1
				Biz.add_morale(s, name, 20)
				return "%s的工錢加到一天 %d 兩，高興得不得了。" % [name, Biz.wage_of(s, name)]],
				["辭退", func() -> String:
					Biz.drop_staff(s, name)
					return "%s收拾東西走了。" % name], ["算了", func() -> String: return ""]]})
	var max_n: int = Biz.level_def(s).staff
	var pool := Biz.hire_pool()
	var hire := {"text": "雇人（%d／%d）" % [(s.staff as Array).size(), max_n], "desc": "牙行介紹的人。%s" % ("" if pool.size() > 0 else "城裡能雇的人都在別處做事了。")}
	if (s.staff as Array).size() < max_n and pool.size() > 0:
		hire.sub = pool.map(func(x): return ["%s（%s・一天 %d 兩）：%s" % [x.name, x.trait, x.wage, x.desc], func() -> String:
			Biz.hire_staff(s, x.name)
			return "雇了%s（一天 %d 兩）。" % [x.name, x.wage]]) + [["算了", func() -> String: return ""]]
	elif (s.staff as Array).size() >= max_n:
		hire.desc = "%s最多雇 %d 個夥計。擴店可以多雇。" % [Biz.level_def(s).name, max_n]
	out.append(hire)
	var bonus_day := int(s.get("bonusDay", -99))
	out.append({"text": "發紅包（每人 %d 兩，士氣 +%d）" % [Biz.BONUS.silver, Biz.BONUS.morale], "verb": "發", "desc": "隔十天才能再發。" if G.day - bonus_day < Biz.BONUS.every else "",
		"act": func() -> String:
			if (s.staff as Array).is_empty():
				return "店裡沒有夥計。"
			if G.day - bonus_day < Biz.BONUS.every:
				return "前幾天才發過，%d 天後再發吧。" % (bonus_day + Biz.BONUS.every - G.day)
			var cost: int = Biz.BONUS.silver * (s.staff as Array).size()
			if G.silver < cost:
				return "要 %d 兩，身上不夠。" % cost
			G.silver -= cost
			s.bonusDay = G.day
			for x in s.staff:
				Biz.add_morale(s, x, Biz.BONUS.morale)
			return "每人發了 %d 兩紅包（共 %d 兩），夥計們士氣大振。" % [Biz.BONUS.silver, cost]})
	out.append({"text": "年度加薪：%s" % ("每人 %d 兩" % int(s.get("yearly", 0)) if int(s.get("yearly", 0)) > 0 else "不加"), "desc": "每年正月初一照這個給每個夥計加薪（加一兩士氣 +10、二兩 +20，不加 -5）。",
		"cycle": func(d: int) -> String:
			s.yearly = clampi(int(s.get("yearly", 0)) + d, 0, 2)
			return "往後每年正月初一，每個夥計加薪 %d 兩。" % int(s.yearly) if int(s.yearly) > 0 else "往後新年不加薪。"})
	return out


func _supply_rows() -> Array:
	var s := Biz.shop(shop_id)
	if not s.has("supply"):
		s.supply = {"mode": "self", "targets": {}}
	var order: bool = s.supply.mode == "order"
	var out := [{"text": "進貨方式：%s" % ("批貨" if order else "自己供貨"), "strong": true,
		"desc": "批貨：每天半夜照「補到」的數量進貨，本錢從櫃上扣（最多賒到一百兩）。自己供貨：從行囊上架，不花本錢。" ,
		"cycle": func(_d: int) -> String:
			s.supply.mode = "self" if s.supply.mode == "order" else "order"
			return "改成批貨：每天半夜照設定補貨，本錢從櫃上扣。" if s.supply.mode == "order" else "改成自己供貨：從行囊上架，不花本錢。"}]
	if not order:
		return out
	var srcs := Biz.sources_of(shop_id)
	if srcs.is_empty():
		out.append({"text": "（沒有進得到貨的來源：先去跟供應商簽約，或在那座城開同一種店）", "desc": "總號帳簿的「供應商」列出去過的地方有哪些供應商。"})
		return out
	srcs.sort_custom(func(a, b): return int(s.supply.targets.get(a.id, 0)) > int(s.supply.targets.get(b.id, 0)))
	for x in srcs:
		var src: Dictionary = x
		var n := int(s.supply.targets.get(src.id, 0))
		out.append({"text": "%s　進價 %d（賣 %d）" % [Ui.item_def(src.id).get("name", src.id), src.cost, Biz.shop_price(s, src.id)], "right": "補到 %d 件　%s" % [n, src.from],
			"desc": "←→ 每次加減一件，空白鍵加五件（到 %d 件就歸零）。架上 %d 件。" % [Biz.SUPPLY_MAX, int(s.stock.get(src.id, 0))],
			"cycle": func(d: int) -> String:
				var v := clampi(int(s.supply.targets.get(src.id, 0)) + d, 0, Biz.SUPPLY_MAX)
				if v > 0:
					s.supply.targets[src.id] = v
				else:
					s.supply.targets.erase(src.id)
				return "",
			"act": func() -> String:
				var v2 := int(s.supply.targets.get(src.id, 0)) + 5
				if v2 > Biz.SUPPLY_MAX:
					s.supply.targets.erase(src.id)
				else:
					s.supply.targets[src.id] = v2
				return ""})
	return out


func _guard_rows() -> Array:
	var s := Biz.shop(shop_id)
	var here: Array = Biz.TOWN_GUARDS.get(Biz.shop_town(shop_id), [])
	var out := []
	for gid in Biz.GUARD_ORDER:
		var g := Biz.guard_def(gid)
		var mine: bool = s.has("guard") and s.guard.source == gid
		var row := {"text": "%s%s%s" % [g.from, g.title, "（坐鎮中：%s）" % s.guard.name if mine else ""], "right": "一天 %d 兩" % g.fee,
			"desc": "%s\n地痞上門 ×%s、遭小偷 ×%s、客人 ×%s" % [g.desc, g.ruffian, g.thief, g.draw] if gid in here else "%s這裡沒有%s。" % [Biz.town_name(Biz.shop_town(shop_id)), g.from]}
		if gid in here and not mine:
			row.verb = "請"
			row.act = func() -> String:
				var name: String = load("res://story/managers.gd").free_guard(gid)
				s.guard = {"source": gid, "name": name, "since": G.day}
				return "%s派了%s%s來坐鎮（一天 %d 兩）。" % [g.from, g.title, name, g.fee]
		out.append(row)
	if s.has("guard"):
		out.append({"text": "辭退保鏢", "verb": "辭", "act": func() -> String:
			var name: String = s.guard.name
			s.erase("guard")
			return "%s拱拱手走了。" % name})
	return out


func _shops_rows() -> Array:
	var out := []
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		var a := _sum30(s)
		var m := Biz.manager_of(id)
		var sid: String = id
		out.append({"text": "%s（%s・%s）" % [s.name, Biz.town_name(Biz.shop_town(id)), Biz.SHOP_TYPES[s.type].name], "right": "近三十天 %+d 兩・%s" % [a.income - a.cost, Biz.mgr_title(m) if not m.is_empty() else "東家自己管"],
			"desc": "櫃上 %d 兩。空白鍵打開這家店的帳簿。" % roundi(float(s.till)), "verb": "打開",
			"act": func() -> String:
				await BizBook.open(ui, "shop", sid)
				return ""})
	var houses: Array = Biz.market().owned.keys().filter(func(k): return Biz.prop_def(k).kind != "shop")
	for id in houses:
		out.append({"text": "%s" % Biz.prop_def(id).name, "right": load("res://story/property.gd").status_text(id)})
	return out


func _manager_rows() -> Array:
	var b := Biz.biz()
	var out := []
	for x in b.managers:
		var m: Dictionary = x
		var where := "候著"
		if m.get("shop", "") != "":
			where = "管%s" % Biz.shop(m.shop).get("name", "")
		elif m.get("town", "") != "":
			where = "管整座%s" % Biz.town_name(m.town)
		var assign := []
		for id in Biz.shops():
			var sid: String = id
			assign.append(["管%s" % Biz.shops()[id].name, func() -> String:
				for y in b.managers:
					if y.get("shop", "") == sid:
						y.erase("shop")
				m.erase("town")
				m.shop = sid
				return "%s接手了%s。" % [m.name, Biz.shops()[sid].name]])
		if int(m.rank) == 2:
			for t in b.visited:
				var tid: String = t
				assign.append(["管整座%s（店與租出去的房子）" % Biz.town_name(tid), func() -> String:
					for y in b.managers:
						if y.get("town", "") == tid:
							y.erase("town")
					m.erase("shop")
					m.town = tid
					return "%s接手了整座%s。" % [m.name, Biz.town_name(tid)]])
		var subs := assign + [
			["卸下差事", func() -> String:
				m.erase("shop")
				m.erase("town")
				return "卸下了差事，先在總號候著。"],
			["升大掌櫃（才幹 %d、經驗 %d 才行）" % [Biz.PROMOTE.talent, Biz.PROMOTE.exp], func() -> String:
				if int(m.rank) == 2:
					return "已經是大掌櫃了。"
				if int(m.talent) < Biz.PROMOTE.talent or float(m.exp) < Biz.PROMOTE.exp:
					return "才幹要 %d、經驗要 %d 才升得了大掌櫃（現在 %d、%d）。" % [Biz.PROMOTE.talent, Biz.PROMOTE.exp, int(m.talent), floori(float(m.exp))]
				m.rank = 2
				m.salary = int(m.salary) + 4
				m.loyalty = minf(100.0, float(m.loyalty) + 10)
				return "%s升為大掌櫃（日薪加四兩）！可以把一整座城交給他了。" % m.name],
			["日薪加一兩（忠誠 +6）", func() -> String:
				m.salary = int(m.salary) + 1
				m.loyalty = minf(100.0, float(m.loyalty) + 6)
				return "%s的日薪加到 %d 兩。" % [m.name, int(m.salary)]],
		]
		for sh in Biz.SHARES:
			var share: float = sh
			if absf(share - float(m.share)) < 0.001:
				continue
			subs.append(["分紅改成 %d%%" % roundi(share * 100), func() -> String:
				var up := share > float(m.share)
				m.share = share
				m.loyalty = clampf(float(m.loyalty) + (5 if up else -10), 0.0, 100.0)
				return "分紅調高到 %d%%，%s很是感激。" % [roundi(share * 100), m.name] if up else "分紅降到 %d%%，%s臉色有點難看。" % [roundi(share * 100), m.name]])
		subs += [
			["打賞 %d 兩（忠誠 +%d）" % [Biz.TIP.silver, Biz.TIP.loyalty], func() -> String:
				if G.day - int(m.get("tipDay", -99)) < Biz.TIP.every:
					return "前幾天才賞過。"
				if G.silver < Biz.TIP.silver:
					return "要 %d 兩，身上不夠。" % Biz.TIP.silver
				G.silver -= Biz.TIP.silver
				m.tipDay = G.day
				m.loyalty = minf(100.0, float(m.loyalty) + Biz.TIP.loyalty)
				return "賞了%s %d 兩。" % [m.name, Biz.TIP.silver]],
			["查帳", func() -> String:
				if int(m.get("skim", 0)) <= 0:
					m.loyalty = minf(100.0, float(m.loyalty) + 3)
					return "帳目清清楚楚，%s一文錢也沒短少。（被信任了，忠誠 +3）" % m.name
				var back := roundi(int(m.skim) / 2.0)
				var lost := int(m.skim)
				m.skim = 0
				m.loyalty = maxf(0.0, float(m.loyalty) - 15)
				G.silver += back
				return "帳上對不起來：%s這段時間吞了約 %d 兩！追回了 %d 兩。要不要留他，你自己斟酌。" % [m.name, lost, back]],
			["辭退", func() -> String:
				b.managers.erase(m)
				return "%s交出帳簿走了。" % m.name],
			["算了", func() -> String: return ""],
		]
		out.append({"text": "%s（%s）" % [Biz.mgr_title(m), where], "right": "才幹 %d・忠誠 %d・日薪 %d・分紅 %d%%" % [int(m.talent), roundi(float(m.loyalty)), int(m.salary), roundi(float(m.share) * 100)],
			"bar": float(m.loyalty) / 100.0, "bar_color": GREEN if float(m.loyalty) >= 40 else RED, "desc": "%s\n經驗 %d（每 60 點才幹 +1）。" % [m.get("desc", ""), floori(float(m.exp))], "sub": subs})
	# 提拔夥計：到職 30 天以上、士氣 70 以上
	var risers := []
	for id in Biz.shops():
		var s: Dictionary = Biz.shops()[id]
		for n in s.staff:
			var since := int(s.get("staffInfo", {}).get(n, {}).get("since", s.opened))
			if G.day - since >= Biz.RISE.days and Biz.morale_of(s, n) >= Biz.RISE.morale:
				risers.append([id, n])
	var rise := {"text": "提拔夥計當掌櫃", "desc": "到職 %d 天以上、士氣 %d 以上的夥計可以提拔（老周本來就做過掌櫃）。%s" % [Biz.RISE.days, Biz.RISE.morale, "" if risers.size() > 0 else "現在沒有夠資格的人。"]}
	if risers.size() > 0:
		rise.sub = risers.map(func(r): return ["%s（%s）" % [r[1], Biz.shops()[r[0]].name], func() -> String:
			var d := Biz.staff_def(r[1])
			var st: Array = Biz.RISE_STATS[d.trait]
			Biz.drop_staff(Biz.shops()[r[0]], r[1])
			b.managers.append({"id": "m%d_%d" % [G.day, (b.managers as Array).size()], "name": r[1], "talent": 6 if r[1] == "老周" else st[0], "loyalty": int(st[1]) + 5, "exp": 0, "rank": 1,
				"shop": r[0], "salary": int(d.wage) + 2, "share": 0.05, "since": G.day, "skim": 0, "desc": "從夥計提拔上來的掌櫃。" + d.desc})
			return "%s升做掌櫃，管這家店（日薪 %d 兩、分紅 5%%）。店裡空出一個夥計的位子。" % [r[1], int(d.wage) + 2]]) + [["算了", func() -> String: return ""]]
	out.append(rise)
	if (b.managers as Array).is_empty():
		out.append({"text": "（還沒有掌櫃：萬通牙行的錢六會介紹）"})
	return out


func _supplier_rows() -> Array:
	var b := Biz.biz()
	var out := []
	for x in Biz.SUPPLIERS:
		var sp: Dictionary = x
		if not sp.town in b.visited:
			continue
		var c: Dictionary = b.contracts.get(sp.id, {})
		var live: bool = not c.is_empty() and int(c.until) >= G.day
		var row := {"text": "%s（%s・%s）" % [sp.name, Biz.town_name(sp.town), sp.contact], "right": "合約到%s" % G.date_text(int(c.until)) if live else ("約滿了" if not c.is_empty() else "沒簽約"),
			"desc": "%s\n進價約行情的 %d%%%s，每天送到的機會 %d%%（雨雪天再打折）。%s" % [sp.desc, roundi(float(sp.ratio) * 100), "、每件運費 %s 兩" % str(sp.freight) if float(sp.freight) > 0 else "", roundi(float(sp.reliable) * 100),
				"" if sp.id in b.signed else "\n要親自到%s找%s談，才簽得了約。" % [sp.where, sp.contact]]}
		if sp.id in b.signed:
			row.verb = "續約"
			row.sub = Biz.TERMS.map(func(t): return ["續%s（簽約費 %d 兩）" % [t.name, t.fee], func() -> String: return load("res://story/managers.gd").sign_contract(sp.id, t.id)]) + [["算了", func() -> String: return ""]]
		out.append(row)
	if out.is_empty():
		out.append({"text": "（去過的地方還沒有供應商）"})
	out.append({"text": "還沒去過的地方，到了才知道那裡有哪些供應商。"})
	return out


func _policy_rows() -> Array:
	var p: Dictionary = Biz.biz().policy
	var out := []
	for o in Biz.POLICY_OPTS:
		var key: String = o[0]
		var opts: Array = o[2]
		var idx := 0
		for i in opts.size():
			if opts[i][0] == p[key]:
				idx = i
		out.append({"text": "%s：%s" % [o[1], opts[idx][1]], "desc": "交給掌櫃處理的事要怎麼辦（沒請掌櫃時不用管）。",
			"cycle": func(d: int) -> String:
				var j := 0
				for i in opts.size():
					if opts[i][0] == p[key]:
						j = i
				p[key] = opts[(j + d + opts.size()) % opts.size()][0]
				return ""})
	return out


func _vault_rows() -> Array:
	var b := Biz.biz()
	var debts := 0
	for s in Biz.shops().values():
		if float(s.till) < 0:
			debts += roundi(-float(s.till))
	var total := {"income": 0, "cost": 0}
	for s in Biz.shops().values():
		var a := _sum30(s)
		total.income += a.income
		total.cost += a.cost
	return [
		{"text": "總號帳房", "right": "%d 兩" % int(b.vault), "strong": true, "verb": "提領", "desc": "掌櫃交上來的錢，到任何一家自己的店都能提。",
			"act": func() -> String:
				var n := int(b.vault)
				if n <= 0:
					return "帳房裡沒有錢。"
				b.vault = 0
				G.silver += n
				return "從總號帳房提了 %d 兩。" % n},
		{"text": "補各店的虧空", "right": "共 %d 兩" % debts, "verb": "補", "desc": "櫃上欠錢的店進不了貨（欠超過一百兩供應商就不肯再賒）。",
			"act": func() -> String:
				if debts <= 0:
					return "各店櫃上都沒欠錢。"
				if G.silver < debts:
					return "各店共欠 %d 兩，身上不夠。" % debts
				G.silver -= debts
				for s in Biz.shops().values():
					if float(s.till) < 0:
						s.till = 0
				return "補上了各店的虧空，共 %d 兩。" % debts},
		{"text": "所有店近三十天", "right": "進帳 %d・開銷 %d・盈虧 %+d" % [total.income, total.cost, total.income - total.cost]},
	]
