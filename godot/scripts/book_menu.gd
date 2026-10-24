class_name BookMenu
extends RefCounted
## 系統選單（一本線裝書）：X／Esc 打開。
## - 上緣的書籤是分頁：←→ 翻頁（舊的那一面繞著書脊轉過去，背面就是新的一面），Tab 隨時翻到下一頁。
## - ↓／空白鍵進入這一頁（人物頁沒有可選的東西），頁裡 X 回到書籤，在書籤上再按 X 闔上書。
## - 存檔頁：即時、自動、十個手動欄（手動欄可存可讀，即時與自動只能讀），最後一列回到標題；讀檔與回標題由 main 接手（open 的回傳值）。
## - 武功頁選一門按空白鍵，攤開一卷手卷（兩根卷軸往左右推開）看細節，在卷上裝備、修練、突破。
## 每一頁是左右兩面，_fill(面, 左右) 依分頁填內容；數值能畫的就畫成條、格子、圖（氣血、五維、重數、修為、領悟）。

const TABS := ["人物", "武功", "行囊", "存檔"]
const TAB_COLORS := [Color("8a2e26"), Color("2f4a5a"), Color("6a5420"), Color("4a3a5a")]
## 存檔頁的欄位：即時、自動、十個手動，最後一列是回到標題
const SLOTS := ["quick", "auto", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "title"]
const W := 1120.0
const H := 640.0
const PW := 500.0
const PH := 572.0
const LX := 40.0
const RX := 580.0
const TOP := 36.0
const BAG_COLS := 6
const BAG_CELLS := 36
const SW := 980.0
const SH := 540.0
const CN := ["〇", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十"]
const INK := Color("2a2018")
const SOFT := Color("6a5a48")
const FAINT := Color("a8987c")
const RED := Color("8a2e26")
const GREEN := Color("4a6a2a")
const BLUE := Color("3a5a8a")
const GOLD := Color("b08a3a")

var ui: Ui
var root: Control
var book: Control
var left: Control
var right: Control
var layer: Control
var hint: Label
var tab_labels: Array = []
var tab := 0
var focus := "tabs"  # tabs／page／scroll
var cur := 0
var pick := -1  # 卷軸上欄位滿了、要選替換哪一格
var scroll: Control
var scroll_body: Control
## 現在在哪（存檔用，main.where()）；選單關掉後要 main 做的事：{do: "load", data} 或 {do: "title"}
var here: Dictionary
var result := {}


static func open(u: Ui, where := {}, t := 0) -> Dictionary:
	var b := BookMenu.new()
	b.here = where
	await b._run(u, t)
	return b.result


func _run(u: Ui, t: int) -> void:
	ui = u
	tab = t
	_build()
	ui._show(root)
	left = _page(0)
	right = _page(1)
	_fill_both()
	book.scale = Vector2(0.95, 0.95)
	root.modulate.a = 0.0
	var tw := root.create_tween().set_parallel()
	tw.tween_property(root, "modulate:a", 1.0, 0.18)
	tw.tween_property(book, "scale", Vector2.ONE, 0.22).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	while true:
		_chrome()
		var k: String = await ui._key
		if focus == "scroll":
			await _scroll_key(k)
			continue
		if k == "Tab":
			await _flip(1)
			continue
		if focus == "tabs":
			match k:
				"Left":
					await _flip(-1)
				"Right":
					await _flip(1)
				"Down", "ok":
					if tab != 0:
						focus = "page"
						_fill_both()
				"back":
					break
			continue
		var n := _list_size()
		match k:
			"back":
				focus = "tabs"
			"Up":
				cur = maxi(0, cur - (BAG_COLS if tab == 2 else 1))
			"Down":
				cur = mini(maxi(0, n - 1), cur + (BAG_COLS if tab == 2 else 1))
			"Left":
				if tab == 2:
					cur = maxi(0, cur - 1)
				else:
					await _flip(-1)
					continue
			"Right":
				if tab == 2:
					cur = mini(maxi(0, n - 1), cur + 1)
				else:
					await _flip(1)
					continue
			"ok":
				if tab == 3:
					if await _save_action():
						break
				if tab == 1 and n > 0:
					await _open_scroll()
					continue
				if tab == 2 and n > 0:
					var id: String = G.bag.keys()[cur]
					if not Hero.usable(id):
						ui.notify("這樣東西不能直接使用。", FAINT)
					elif not Hero.useful(G.hero, id):
						ui.notify("現在用不著：用了也補不上什麼。", FAINT)
					elif await _confirm("使用「%s」？" % Ui.item_def(id).get("name", id), "身上有 %d 個，用了就少一個。" % G.bag[id], ["使用", "取消"]) == 0:
						ui.notify(Hero.consume(G.hero, id))
					cur = clampi(cur, 0, maxi(0, G.bag.size() - 1))
		_fill_both()
	var tw2 := root.create_tween().set_parallel()
	tw2.tween_property(root, "modulate:a", 0.0, 0.15)
	tw2.tween_property(book, "scale", Vector2(0.96, 0.96), 0.15)
	await tw2.finished
	ui._close()


func _list_size() -> int:
	match tab:
		1:
			return G.hero.skills.size()
		2:
			return G.bag.size()
		3:
			return SLOTS.size()
	return 0


# ── 書本的架子 ──────────────────────────────────────────

func _build() -> void:
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0.04, 0.03, 0.02, 0.55)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(dim)
	book = Control.new()
	book.set_anchors_preset(Control.PRESET_CENTER)
	book.position = Vector2(-W / 2, -H / 2 + 14)
	book.size = Vector2(W, H)
	book.pivot_offset = Vector2(W / 2, H / 2)
	book.draw.connect(_draw_book)
	root.add_child(book)
	for i in TABS.size():
		var l := _lab(_vert(TABS[i]), 18, Color("f4ead6"))
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.add_theme_constant_override("line_spacing", -4)
		l.size = Vector2(44, 50)
		book.add_child(l)
		tab_labels.append(l)
	layer = Control.new()
	layer.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(layer)
	hint = _lab("", 15, Color("e8dcc0"))
	hint.set_anchors_preset(Control.PRESET_CENTER)
	hint.position = Vector2(-W / 2, H / 2 + 24)
	hint.size = Vector2(W, 24)
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hint.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	hint.add_theme_constant_override("outline_size", 5)
	root.add_child(hint)


## 書籤位置（書的座標）：x、露出的長度
func _tab_rect(i: int) -> Rect2:
	var long := 74.0 if i == tab else 58.0
	return Rect2(Vector2(640 + i * 62, -long), Vector2(44, long + 30))


func _chrome() -> void:
	for i in tab_labels.size():
		var r := _tab_rect(i)
		tab_labels[i].position = Vector2(r.position.x, r.position.y + 11)
		tab_labels[i].modulate.a = 1.0 if i == tab else 0.75
	book.queue_redraw()
	var t := ""
	if focus == "scroll":
		t = "←→ 選要替換的格子　空白鍵 確定　X 取消" if pick >= 0 else "↑↓ 換一門　空白鍵 裝備／卸下　T 修練　B 突破　X 收起卷軸"
	elif focus == "tabs":
		t = "←→ 翻頁　X 闔上書" if tab == 0 else "←→ 翻頁　↓／空白鍵 進入這一頁　X 闔上書"
	elif tab == 1:
		t = "↑↓ 選　空白鍵 攤開卷軸　←→ 翻頁　X 回到書籤"
	elif tab == 3:
		t = "↑↓ 選　空白鍵 存檔／讀取　←→ 翻頁　X 回到書籤"
	else:
		t = "方向鍵 選　空白鍵 使用　X 回到書籤"
	hint.text = t


func _draw_book() -> void:
	# 書籤（壓在封面底下，只露出上半截）
	for i in TABS.size():
		var r := _tab_rect(i)
		var c: Color = TAB_COLORS[i]
		if i != tab:
			c = c.lerp(Color("8a7a66"), 0.35)
		var x := r.position.x
		var y := r.position.y
		var pts := PackedVector2Array([Vector2(x, y), Vector2(x + 22, y + 9), Vector2(x + 44, y), Vector2(x + 44, y + r.size.y), Vector2(x, y + r.size.y)])
		book.draw_colored_polygon(pts, c)
		book.draw_line(Vector2(x + 4, y + 6), Vector2(x + 4, y + r.size.y), Color(1, 1, 1, 0.12), 2.0)
		if i == tab and focus == "tabs":
			book.draw_polyline(pts + PackedVector2Array([pts[0]]), Color("f0d890"), 2.0)
	# 影子、封面
	book.draw_style_box(_sb(Color(0, 0, 0, 0.4), Color(0, 0, 0, 0), 14), Rect2(10, 14, W, H))
	book.draw_style_box(_sb(Color("4a2a20"), Color("24140e"), 12, 3), Rect2(0, 0, W, H))
	book.draw_style_box(_sb(Color(0, 0, 0, 0), Color(0.69, 0.54, 0.29, 0.55), 8, 1), Rect2(9, 9, W - 18, H - 18))
	# 書頁的厚度（一層層的邊）
	for k in range(4, 0, -1):
		var c := Color("d8c8a4").darkened(k * 0.06)
		book.draw_rect(Rect2(LX - k * 2, TOP + k * 1.5, PW, PH), c)
		book.draw_rect(Rect2(RX + k * 2, TOP + k * 1.5, PW, PH), c)
	# 書脊
	var sx := LX + PW
	book.draw_rect(Rect2(sx, TOP - 4, RX - sx, PH + 10), Color("3a2018"))


## 一面書頁：紙底（往書脊那邊暗一點）＋版框；body 放內容，shade 是翻頁時的陰影
func _page(side: int) -> Control:
	var p := Control.new()
	p.position = Vector2(LX if side == 0 else RX, TOP)
	p.size = Vector2(PW, PH)
	p.pivot_offset = Vector2(PW, 0) if side == 0 else Vector2.ZERO
	p.set_meta("side", side)
	p.draw.connect(_draw_paper.bind(p, side))
	var body := Control.new()
	body.name = "body"
	body.size = p.size
	p.add_child(body)
	var shade := ColorRect.new()
	shade.name = "shade"
	shade.size = p.size
	shade.color = Color(0.1, 0.06, 0.02, 0)
	shade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	p.add_child(shade)
	book.add_child(p)
	return p


func _draw_paper(p: Control, side: int) -> void:
	var paper := Screens.PAPER
	var dark := Color("d9c7a2")
	var cols := PackedColorArray([paper, dark, dark, paper]) if side == 0 else PackedColorArray([dark, paper, paper, dark])
	p.draw_polygon(PackedVector2Array([Vector2(0, 0), Vector2(PW, 0), Vector2(PW, PH), Vector2(0, PH)]), cols)
	# 版框：外粗內細兩道
	var fc := Color(0.55, 0.36, 0.24, 0.55)
	p.draw_rect(Rect2(18, 18, PW - 36, PH - 36), fc, false, 2.0)
	p.draw_rect(Rect2(23, 23, PW - 46, PH - 46), Color(fc, 0.35), false, 1.0)


func _body(p: Control) -> Control:
	var old := p.get_node("body")
	p.remove_child(old)
	old.queue_free()
	var body := Control.new()
	body.name = "body"
	body.size = p.size
	p.add_child(body)
	p.move_child(body, 0)
	return body


func _fill_both() -> void:
	_fill(left, 0)
	_fill(right, 1)


## 一面的骨架：上方標題、下方頁碼，回傳放內容的直排
func _sheet(p: Control, title: String) -> VBoxContainer:
	var body := _body(p)
	var side: int = p.get_meta("side")
	var head := _lab("── %s ──" % title, 17, SOFT)
	head.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	head.position = Vector2(30, 34)
	head.size = Vector2(PW - 60, 24)
	body.add_child(head)
	var num := _lab(CN[tab * 2 + side + 1], 14, FAINT)
	num.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	num.position = Vector2(30, PH - 50)
	num.size = Vector2(PW - 60, 20)
	body.add_child(num)
	var v := VBoxContainer.new()
	v.position = Vector2(42, 70)
	v.size = Vector2(PW - 84, PH - 130)
	v.add_theme_constant_override("separation", 8)
	body.add_child(v)
	return v


func _fill(p: Control, side: int) -> void:
	match tab:
		0:
			_hero_left(_sheet(p, "名　帖")) if side == 0 else _hero_right(_sheet(p, "五　維"))
		1:
			_skills_left(_sheet(p, "武　學")) if side == 0 else _skills_right(_sheet(p, "身上的武功"))
		2:
			_bag_left(_sheet(p, "行　囊")) if side == 0 else _bag_right(_sheet(p, "細　看"))
		3:
			_save_left(_sheet(p, "存　檔")) if side == 0 else _save_right(_sheet(p, "細　看"))


# ── 翻頁 ────────────────────────────────────────────────

## d = 1 往後翻（右頁繞書脊翻到左邊），-1 往前翻
func _flip(d: int) -> void:
	var to := (tab + d + TABS.size()) % TABS.size()
	var old_l := left
	var old_r := right
	tab = to
	cur = 0
	if focus == "page" and tab == 0:
		focus = "tabs"
	var new_l := _page(0)
	var new_r := _page(1)
	_fill(new_l, 0)
	_fill(new_r, 1)
	# 翻起來的那一面在最上面，它底下是新的那一面；背面（另一側的新頁）最後才蓋上去
	var lift: Control = old_r if d > 0 else old_l
	var under: Control = new_r if d > 0 else new_l
	var back: Control = new_l if d > 0 else new_r
	var keep: Control = old_l if d > 0 else old_r
	book.move_child(under, keep.get_index())
	book.move_child(lift, -1)
	book.move_child(back, -1)
	back.scale.x = 0.0
	back.visible = false
	_chrome()
	var tw := book.create_tween()
	tw.tween_method(func(t: float) -> void:
		var c := cos(t * PI)
		var lift_shade: ColorRect = lift.get_node("shade")
		var back_shade: ColorRect = back.get_node("shade")
		if t < 0.5:
			lift.scale.x = maxf(0.001, c)
			lift_shade.color.a = t * 0.7
		else:
			lift.visible = false
			back.visible = true
			back.scale.x = maxf(0.001, -c)
			back_shade.color.a = (1.0 - t) * 0.7
		, 0.0, 1.0, 0.42).set_trans(Tween.TRANS_SINE).set_ease(Tween.EASE_IN_OUT)
	await tw.finished
	back.scale.x = 1.0
	(back.get_node("shade") as ColorRect).color.a = 0.0
	old_l.queue_free()
	old_r.queue_free()
	left = new_l
	right = new_r


# ── 人物 ────────────────────────────────────────────────

func _hero_left(v: VBoxContainer) -> void:
	var c: Dictionary = G.hero
	var d := Hero.derive(c)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 16)
	v.add_child(top)
	top.add_child(_seal(c.surname if c.surname != "" else c.name.left(1), 58, RED))
	var nv := VBoxContainer.new()
	nv.add_theme_constant_override("separation", 2)
	top.add_child(nv)
	nv.add_child(_lab(c.name, 30))
	nv.add_child(_lab("%d 歲　名聲 %d" % [c.age, c.fame], 15, SOFT))
	if not c.titles.is_empty():
		nv.add_child(_lab("、".join(c.titles), 14, GOLD))
	v.add_child(_gap(8))
	for row in [["氣血", c.hp, d.max_hp, Color("a83a2e")], ["內力", c.qi, d.max_qi, Color("3a6a9a")], ["體力", c.stamina, d.max_stamina, Color("6a8a3a")]]:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		v.add_child(h)
		h.add_child(_lab(row[0], 17))
		h.add_child(_bar(float(row[1]) / maxf(1, row[2]), 250, 14, row[3]))
		h.add_child(_lab("%d / %d" % [row[1], row[2]], 15, SOFT))
	v.add_child(_gap(10))
	v.add_child(_rule())
	var money := HBoxContainer.new()
	money.add_theme_constant_override("separation", 28)
	v.add_child(money)
	money.add_child(_icon_num(_coin(), "銀兩", str(G.silver)))
	money.add_child(_icon_num(_item_icon("", "book", 26), "武學點數", str(c.points)))
	v.add_child(_rule())
	v.add_child(_lab(G.date_text(), 17))
	v.add_child(_lab("%s・%s" % [G.time_text(), G.WEATHER_NAME[G.weather]], 15, SOFT))
	v.add_child(_lab("節氣　" + G.current_term(), 14, FAINT))


func _hero_right(v: VBoxContainer) -> void:
	var c: Dictionary = G.hero
	var parts := Hero.attr_parts(c)
	var top := 0.0
	for a in Hero.ATTRS:
		top = maxf(top, parts.total[a.key])
	var scale := maxf(20.0, ceilf(top / 10.0) * 10.0)
	var radar := _radar(parts.total, scale)
	radar.size_flags_horizontal = Control.SIZE_SHRINK_CENTER
	v.add_child(radar)
	var leg := HBoxContainer.new()
	leg.alignment = BoxContainer.ALIGNMENT_CENTER
	leg.add_theme_constant_override("separation", 14)
	v.add_child(leg)
	for l in [["底值", Color("8a6a4a")], ["成長", GREEN], ["裝備", BLUE]]:
		leg.add_child(_swatch(l[1]))
		leg.add_child(_lab(l[0], 13, SOFT))
	for a in Hero.ATTRS:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		v.add_child(h)
		h.add_child(_lab(a.name, 17))
		h.add_child(_stack([[parts.base[a.key], Color("8a6a4a")], [parts.grow[a.key], GREEN], [parts.equip[a.key], BLUE]], scale, 270, 14))
		h.add_child(_lab("%.1f" % parts.total[a.key], 17, RED))


# ── 武功 ────────────────────────────────────────────────

## 照欄位（外功、內功、輕功）排好的武功；游標照這個順序
func _skill_order() -> Array:
	var out := []
	for slot in ["outer", "inner", "light"]:
		for s in G.hero.skills:
			if Hero.slot_of(Hero.skill_def(s.id).kind) == slot:
				out.append(s)
	return out


func _skills_left(v: VBoxContainer) -> void:
	var c: Dictionary = G.hero
	var order := _skill_order()
	var i := 0
	for slot in ["outer", "inner", "light"]:
		var used := Hero.slot_skills(c, slot).filter(func(s): return not s.is_empty()).size()
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		v.add_child(h)
		h.add_child(_lab(Hero.SLOT_NAME[slot], 16, SOFT))
		h.add_child(_pips(used, Hero.SLOT_LIMIT[slot], 0, 10, RED))
		for s in order:
			if Hero.slot_of(Hero.skill_def(s.id).kind) != slot:
				continue
			v.add_child(_skill_row(s, focus == "page" and i == cur))
			i += 1
		v.add_child(_gap(2))
	v.add_child(_rule())
	v.add_child(_lab("武學點數　%d" % c.points, 15, SOFT))


func _skill_row(s: Dictionary, on: bool) -> Control:
	var d := Hero.skill_def(s.id)
	var row := PanelContainer.new()
	var sb := _sb(Color(0.54, 0.18, 0.15, 0.12) if on else Color(0, 0, 0, 0), Color(0.54, 0.18, 0.15, 0.5) if on else Color(0, 0, 0, 0), 4, 1)
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	row.add_theme_stylebox_override("panel", sb)
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 8)
	row.add_child(h)
	h.add_child(_mark(Hero.is_equipped(s)))
	var name := _lab(d.name, 18, RED if on else INK)
	name.custom_minimum_size = Vector2(120, 0)
	h.add_child(name)
	h.add_child(_tag(d.tier, _tier_color(d.tier)))
	var lv := _lab("%s重" % _cn(s.level), 15, SOFT)
	lv.custom_minimum_size = Vector2(56, 0)
	lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	h.add_child(lv)
	h.add_child(_bar(float(s.level) / Hero.cap_of(s), 90, 8, _tier_color(d.tier)))
	return row


func _skills_right(v: VBoxContainer) -> void:
	var c: Dictionary = G.hero
	for slot in ["outer", "inner", "light"]:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 8)
		v.add_child(h)
		var sl := _lab(_vert(Hero.SLOT_NAME[slot]), 15, SOFT)
		sl.add_theme_constant_override("line_spacing", -4)
		sl.size_flags_vertical = Control.SIZE_SHRINK_CENTER
		h.add_child(sl)
		for s in Hero.slot_skills(c, slot):
			h.add_child(_slot_card(s, false))
	v.add_child(_gap(4))
	v.add_child(_rule())
	var order := _skill_order()
	if order.is_empty():
		return
	var s: Dictionary = order[clampi(cur, 0, order.size() - 1)]
	var d := Hero.skill_def(s.id)
	v.add_child(_lab(d.name, 20))
	var desc := _lab(d.desc, 14, SOFT)
	desc.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	desc.custom_minimum_size = Vector2(PW - 90, 0)
	v.add_child(desc)


## 欄位卡：直寫的武功名＋重數；空的格子是虛線框
func _slot_card(s: Dictionary, on: bool, w := 60.0, h := 104.0) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	var empty := s.is_empty()
	var d: Dictionary = {} if empty else Hero.skill_def(s.id)
	c.draw.connect(func() -> void:
		var r := Rect2(Vector2.ZERO, Vector2(w, h))
		if empty:
			var col := Color(0.42, 0.35, 0.28, 0.5)
			for k in range(0, int(w), 8):
				c.draw_line(Vector2(k, 0), Vector2(minf(k + 4, w), 0), col)
				c.draw_line(Vector2(k, h - 1), Vector2(minf(k + 4, w), h - 1), col)
			for k in range(0, int(h), 8):
				c.draw_line(Vector2(0, k), Vector2(0, minf(k + 4, h)), col)
				c.draw_line(Vector2(w - 1, k), Vector2(w - 1, minf(k + 4, h)), col)
		else:
			c.draw_style_box(_sb(Color("e8dcc0"), _tier_color(d.tier), 4, 2), r)
		if on:
			c.draw_style_box(_sb(Color(0, 0, 0, 0), Color("c8a040"), 5, 3), r.grow(3)))
	var l := _lab("空" if empty else _vert(d.name), 15 if not empty else 14, FAINT if empty else INK)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.add_theme_constant_override("line_spacing", -5)
	l.position = Vector2(0, 6)
	l.size = Vector2(w, h - 24)
	c.add_child(l)
	if not empty:
		var lv := _lab("%s重" % _cn(s.level), 12, SOFT)
		lv.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		lv.position = Vector2(0, h - 20)
		lv.size = Vector2(w, 18)
		c.add_child(lv)
	return c


# ── 卷軸（武功細節） ────────────────────────────────────

func _open_scroll() -> void:
	focus = "scroll"
	pick = -1
	scroll = Control.new()
	scroll.set_anchors_preset(Control.PRESET_FULL_RECT)
	layer.add_child(scroll)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.0)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	scroll.add_child(dim)
	var holder := Control.new()
	holder.set_anchors_preset(Control.PRESET_CENTER)
	holder.position = Vector2(0, 0)
	scroll.add_child(holder)
	var clip := Control.new()
	clip.clip_contents = true
	clip.position = Vector2(0, -SH / 2)
	clip.size = Vector2(0, SH)
	holder.add_child(clip)
	scroll_body = Control.new()
	scroll_body.size = Vector2(SW, SH)
	scroll_body.draw.connect(_draw_silk.bind(scroll_body))
	clip.add_child(scroll_body)
	var rods := Control.new()
	rods.set_meta("w", 0.0)
	rods.draw.connect(_draw_rods.bind(rods))
	holder.add_child(rods)
	scroll.set_meta("clip", clip)
	scroll.set_meta("rods", rods)
	scroll.set_meta("dim", dim)
	_fill_scroll()
	_chrome()
	var tw := scroll.create_tween()
	tw.tween_method(_scroll_w, 0.0, 1.0, 0.5).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	await tw.finished


func _scroll_w(t: float) -> void:
	var w := SW * t
	var clip: Control = scroll.get_meta("clip")
	clip.position.x = -w / 2
	clip.size.x = w
	scroll_body.position.x = -(SW - w) / 2
	var rods: Control = scroll.get_meta("rods")
	rods.set_meta("w", w)
	rods.queue_redraw()
	(scroll.get_meta("dim") as ColorRect).color.a = 0.45 * t


func _close_scroll() -> void:
	var tw := scroll.create_tween()
	tw.tween_method(_scroll_w, 1.0, 0.0, 0.35).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	await tw.finished
	scroll.queue_free()
	scroll = null
	focus = "page"
	_fill_both()


## 兩根卷軸：木軸＋上下兩頭的玉軸頭
func _draw_rods(r: Control) -> void:
	var w: float = r.get_meta("w")
	for x in [-w / 2 - 12, w / 2 - 10]:
		var top := -SH / 2 - 16
		var hh := SH + 32
		var cols := [Color("4a2a18"), Color("8a5a34"), Color("a8744a"), Color("6a4024"), Color("3a2012")]
		for i in cols.size():
			r.draw_rect(Rect2(x + i * 4.4, top, 4.6, hh), cols[i])
		for y in [top - 12, top + hh]:
			r.draw_style_box(_sb(Color("cfd8c4"), Color("6a7a64"), 4, 1), Rect2(x - 3, y, 28, 12))


## 手卷的絹：天頭、地腳的錦邊，中間是淺絹
func _draw_silk(b: Control) -> void:
	b.draw_rect(Rect2(0, 0, SW, SH), Color("efe3c6"))
	var band := Color("34504c")
	for y in [0.0, SH - 30]:
		b.draw_rect(Rect2(0, y, SW, 30), band)
		for k in range(0, int(SW), 24):
			b.draw_rect(Rect2(k + 8, y + 11, 8, 8), Color(0.75, 0.62, 0.35, 0.45))
		b.draw_line(Vector2(0, y + 2), Vector2(SW, y + 2), Color("c8a860"), 1.0)
		b.draw_line(Vector2(0, y + 28), Vector2(SW, y + 28), Color("c8a860"), 1.0)
	b.draw_rect(Rect2(30, 44, SW - 60, SH - 88), Color(0.55, 0.36, 0.24, 0.35), false, 1.0)


func _fill_scroll() -> void:
	for ch in scroll_body.get_children():
		ch.queue_free()
	var c: Dictionary = G.hero
	var order := _skill_order()
	var s: Dictionary = order[clampi(cur, 0, order.size() - 1)]
	var d := Hero.skill_def(s.id)
	var cap := Hero.cap_of(s)
	var v := VBoxContainer.new()
	v.position = Vector2(56, 56)
	v.size = Vector2(SW - 112, SH - 112)
	v.add_theme_constant_override("separation", 10)
	scroll_body.add_child(v)
	# 名號列
	var head := HBoxContainer.new()
	head.add_theme_constant_override("separation", 12)
	v.add_child(head)
	head.add_child(_lab(d.name, 34))
	head.add_child(_seal(d.tier, 40, _tier_color(d.tier)))
	head.add_child(_tag(d.kind, SOFT))
	head.add_child(_tag("已裝備" if Hero.is_equipped(s) else "未裝備", RED if Hero.is_equipped(s) else FAINT))
	var sp := Control.new()
	sp.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	head.add_child(sp)
	head.add_child(_lab("第 %d 重" % s.level, 28, RED))
	head.add_child(_lab("／上限 %d" % cap, 15, SOFT))
	var desc := _lab(d.desc, 15, SOFT)
	desc.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	desc.custom_minimum_size = Vector2(SW - 120, 0)
	v.add_child(desc)
	# 重數格（突破的部分是金色）
	var lvrow := HBoxContainer.new()
	lvrow.add_theme_constant_override("separation", 10)
	v.add_child(lvrow)
	lvrow.add_child(_lab("重數", 15))
	lvrow.add_child(_pips(mini(s.level, cap), cap, maxi(0, s.level - cap), 14, _tier_color(d.tier)))
	# 修為、領悟
	var bars := HBoxContainer.new()
	bars.add_theme_constant_override("separation", 40)
	v.add_child(bars)
	var b1 := HBoxContainer.new()
	b1.add_theme_constant_override("separation", 8)
	bars.add_child(b1)
	if s.level < cap:
		var need := Hero.exp_to_next(s.level)
		b1.add_child(_lab("修為", 15))
		b1.add_child(_bar(float(s.exp) / need, 220, 12, Color("8a6a2a")))
		b1.add_child(_lab("%d / %d" % [s.exp, need], 13, SOFT))
	else:
		var bt := Hero.breakthrough(s)
		b1.add_child(_lab("突破", 15))
		b1.add_child(_bar(bt.chance, 220, 12, GOLD))
		b1.add_child(_lab("成功率 %d%%・%d 點%s" % [roundi(bt.chance * 100), bt.cost, "" if Hero.has_manual(s.id) else "・缺秘笈"], 13, SOFT))
	var nx := Hero.next_move(s)
	var b2 := HBoxContainer.new()
	b2.add_theme_constant_override("separation", 8)
	bars.add_child(b2)
	if nx.is_empty():
		b2.add_child(_lab("招式已全數悟出", 14, GREEN))
	elif s.level < nx.level:
		b2.add_child(_lab("領悟", 15, FAINT))
		b2.add_child(_bar(0, 160, 12, BLUE))
		b2.add_child(_lab("第 %d 重才能悟下一招" % nx.level, 13, FAINT))
	else:
		b2.add_child(_lab("領悟", 15))
		b2.add_child(_bar(s.insight / 100.0, 160, 12, BLUE))
		b2.add_child(_lab("%d%%" % roundi(s.insight), 13, SOFT))
	# 加成：裝備（裝上才有）、永久成長、上限
	var m := Hero.eff_level(s) * Hero.tier_mult(s)
	var cols := HBoxContainer.new()
	cols.add_theme_constant_override("separation", 36)
	v.add_child(cols)
	var eq := []
	for k in d.equip:
		eq.append([Hero.attr_name(k), d.equip[k] * m])
	var gr := []
	for k in d.grow:
		gr.append([Hero.attr_name(k), d.grow[k] * m])
	for mv in d.moves:
		if mv.id in s.moves:
			for k in mv.get("bonus", {}):
				gr.append([Hero.attr_name(k) + "（招）", float(mv.bonus[k])])
	var vt := []
	for k in d.vital:
		vt.append([{"hp": "氣血", "qi": "內力", "stamina": "體力"}[k], d.vital[k] * m])
	cols.add_child(_bonus_col("裝備加成" + ("" if Hero.is_equipped(s) else "（卸下時無）"), eq, BLUE, Hero.is_equipped(s)))
	cols.add_child(_bonus_col("永久成長", gr, GREEN, true))
	cols.add_child(_bonus_col("上限", vt, Color("a83a2e"), true))
	# 招式卡
	var known := 0
	for mv in d.moves:
		if mv.id in s.moves:
			known += 1
	v.add_child(_lab("招式　已悟 %d／%d" % [known, d.moves.size()], 15))
	var cards := HBoxContainer.new()
	cards.add_theme_constant_override("separation", 10)
	v.add_child(cards)
	for mv in d.moves:
		cards.add_child(_move_card(mv, mv.id in s.moves, d.moves.size()))
	# 欄位滿了：選要換掉哪一格
	if pick >= 0:
		var slot := Hero.slot_of(d.kind)
		var pv := VBoxContainer.new()
		pv.position = Vector2(SW - 56 - 64 * Hero.SLOT_LIMIT[slot] - 8 * (Hero.SLOT_LIMIT[slot] - 1) - 20, 150)
		var bg := ColorRect.new()
		bg.color = Color(0.94, 0.89, 0.78, 0.96)
		scroll_body.add_child(bg)
		scroll_body.add_child(pv)
		pv.add_child(_lab("%s欄位滿了，換掉哪一格？" % Hero.SLOT_NAME[slot], 16, RED))
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 8)
		pv.add_child(h)
		var ss := Hero.slot_skills(c, slot)
		for i in ss.size():
			h.add_child(_slot_card(ss[i], i == pick))
		bg.position = pv.position - Vector2(14, 10)
		bg.size = Vector2(64 * ss.size() + 8 * (ss.size() - 1) + 40, 150)
		pv.position.x = SW - 56 - bg.size.x + 14
		bg.position.x = pv.position.x - 14


func _bonus_col(title: String, rows: Array, col: Color, on: bool) -> Control:
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 3)
	v.add_child(_lab(title, 14, SOFT))
	var top := 1.0
	for r in rows:
		top = maxf(top, r[1])
	for r in rows:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 6)
		v.add_child(h)
		var n := _lab(r[0], 14, INK if on else FAINT)
		n.custom_minimum_size = Vector2(70, 0)
		h.add_child(n)
		h.add_child(_bar(r[1] / top, 90, 8, col if on else FAINT))
		h.add_child(_lab("+%.1f" % r[1], 13, col if on else FAINT))
	if rows.is_empty():
		v.add_child(_lab("—", 14, FAINT))
	return v


func _move_card(mv: Dictionary, known: bool, n: int) -> Control:
	var w := minf(200.0, (SW - 112 - 10 * (n - 1)) / maxf(1, n))
	var h := 148.0
	var md := Hero.move_def(mv.id)
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	c.draw.connect(func() -> void:
		if known:
			c.draw_style_box(_sb(Color("f6eedb"), Color("6a4a2a"), 6, 2), Rect2(0, 0, w, h))
			c.draw_rect(Rect2(6, 6, w - 12, 3), Color("8a2e26"))
		else:
			c.draw_style_box(_sb(Color("5a4636"), Color("3a2a1e"), 6, 2), Rect2(0, 0, w, h))
			for k in range(0, int(w + h), 14):
				c.draw_line(Vector2(k, 0), Vector2(k - h, h), Color(1, 1, 1, 0.05), 3.0))
	if not known:
		var q := _lab("？", 40, Color("c8b898"))
		q.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		q.position = Vector2(0, 26)
		q.size = Vector2(w, 50)
		c.add_child(q)
		var l := _lab("第 %d 重可悟" % mv.level, 13, Color("c8b898"))
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.position = Vector2(0, 92)
		l.size = Vector2(w, 20)
		c.add_child(l)
		return c
	var v := VBoxContainer.new()
	v.position = Vector2(10, 14)
	v.size = Vector2(w - 20, h - 20)
	v.add_theme_constant_override("separation", 3)
	c.add_child(v)
	v.add_child(_lab(md.name, 17))
	var tags := {"enemy": "單打", "allEnemies": "全體", "self": "自身"}
	var t := "%s・%s" % [{"outer": "外功", "inner": "內功", "buff": "運勁", "restore": "調息"}.get(md.kind, ""), tags.get(md.target, "")]
	if md.get("hits", 1) > 1:
		t += "・連%d" % md.hits
	v.add_child(_lab(t, 12, SOFT))
	var qi := HBoxContainer.new()
	qi.add_theme_constant_override("separation", 4)
	v.add_child(qi)
	qi.add_child(_lab("內力", 12, BLUE))
	qi.add_child(_bar(minf(1.0, md.qi / 30.0), 50, 6, BLUE))
	qi.add_child(_lab(str(md.qi), 12, BLUE))
	if md.get("power", 0) > 0:
		var pw := HBoxContainer.new()
		pw.add_theme_constant_override("separation", 4)
		v.add_child(pw)
		pw.add_child(_lab("威力", 12, RED))
		pw.add_child(_bar(minf(1.0, md.power / 3.0), 50, 6, RED))
		pw.add_child(_lab("%.1f" % md.power, 12, RED))
	var desc := _lab(md.desc, 12, SOFT)
	desc.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	desc.custom_minimum_size = Vector2(w - 20, 0)
	v.add_child(desc)
	return c


func _scroll_key(k: String) -> void:
	var c: Dictionary = G.hero
	var order := _skill_order()
	var s: Dictionary = order[clampi(cur, 0, order.size() - 1)]
	var slot := Hero.slot_of(Hero.skill_def(s.id).kind)
	if pick >= 0:
		match k:
			"Left":
				pick = (pick + Hero.SLOT_LIMIT[slot] - 1) % Hero.SLOT_LIMIT[slot]
			"Right":
				pick = (pick + 1) % Hero.SLOT_LIMIT[slot]
			"ok":
				ui.notify(Hero.equip_at(c, s.id, pick))
				pick = -1
			"back":
				pick = -1
		_fill_scroll()
		return
	match k:
		"back":
			await _close_scroll()
			return
		"Up":
			cur = (cur + order.size() - 1) % order.size()
		"Down":
			cur = (cur + 1) % order.size()
		"ok":
			if Hero.is_equipped(s):
				ui.notify(Hero.unequip(c, s.id))
			else:
				var pos = Hero.free_pos(c, slot)
				if pos != null:
					ui.notify(Hero.equip_at(c, s.id, pos))
				else:
					pick = 0
		"T":
			var used := Hero.train_with_points(c, s.id, Hero.points_to_next(s))
			ui.notify(("花了 %d 點武學點數修練「%s」。" % [used, Hero.skill_def(s.id).name]) if used > 0 else ("已經練到正常上限了，要突破（B）。" if s.level >= Hero.cap_of(s) else "武學點數不足。"))
		"B":
			ui.notify(Hero.try_breakthrough(c, s.id).text)
	_fill_scroll()


## 書上跳出一張小紙條問一下：←→（或 ↑↓）選、空白鍵確定、X 取消（等於選最後一個）
func _confirm(title: String, sub: String, options: Array) -> int:
	var box := PanelContainer.new()
	var sb := _sb(Color("f6eedb"), Color("6a4a2a"), 6, 2)
	sb.content_margin_left = 28
	sb.content_margin_right = 28
	sb.content_margin_top = 18
	sb.content_margin_bottom = 18
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 10
	box.add_theme_stylebox_override("panel", sb)
	box.set_anchors_preset(Control.PRESET_CENTER)
	box.grow_horizontal = Control.GROW_DIRECTION_BOTH
	box.grow_vertical = Control.GROW_DIRECTION_BOTH
	box.custom_minimum_size = Vector2(340, 0)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	box.add_child(v)
	var t := _lab(title, 20)
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	if sub != "":
		var s2 := _lab(sub, 14, SOFT)
		s2.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		v.add_child(s2)
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 18)
	v.add_child(row)
	var btns: Array = []
	for o in options:
		var b := PanelContainer.new()
		var l := _lab(o, 17)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		l.custom_minimum_size = Vector2(80, 0)
		b.add_child(l)
		row.add_child(b)
		btns.append(b)
	layer.add_child(box)
	box.scale = Vector2(0.9, 0.9)
	box.modulate.a = 0.0
	var tw := box.create_tween().set_parallel()
	tw.tween_property(box, "modulate:a", 1.0, 0.12)
	tw.tween_property(box, "scale", Vector2.ONE, 0.15).set_trans(Tween.TRANS_BACK).set_ease(Tween.EASE_OUT)
	await box.get_tree().process_frame
	box.pivot_offset = box.size / 2
	var at := 0
	while true:
		for i in btns.size():
			var on: bool = i == at
			var bs := _sb(Color(0.54, 0.18, 0.15, 0.9) if on else Color(0, 0, 0, 0), Color(0.54, 0.18, 0.15, 0.8), 4, 1)
			bs.content_margin_top = 4
			bs.content_margin_bottom = 4
			btns[i].add_theme_stylebox_override("panel", bs)
			(btns[i].get_child(0) as Label).add_theme_color_override("font_color", Color("f6ecd8") if on else INK)
		var k: String = await ui._key
		if k in ["Left", "Up"]:
			at = (at + btns.size() - 1) % btns.size()
		elif k in ["Right", "Down"]:
			at = (at + 1) % btns.size()
		elif k == "ok":
			break
		elif k == "back":
			at = btns.size() - 1
			break
	box.queue_free()
	return at


# ── 行囊 ────────────────────────────────────────────────

func _bag_left(v: VBoxContainer) -> void:
	var ids: Array = G.bag.keys()
	v.add_child(_lab("%d／%d 格" % [ids.size(), BAG_CELLS], 14, SOFT))
	var g := GridContainer.new()
	g.columns = BAG_COLS
	g.add_theme_constant_override("h_separation", 6)
	g.add_theme_constant_override("v_separation", 6)
	v.add_child(g)
	for i in BAG_CELLS:
		if i < ids.size():
			g.add_child(_bag_cell(ids[i], focus == "page" and i == cur))
		else:
			g.add_child(_bag_cell("", false))


func _bag_cell(id: String, on: bool) -> Control:
	var s := 64.0
	var c := Control.new()
	c.custom_minimum_size = Vector2(s, s)
	c.draw.connect(func() -> void:
		c.draw_style_box(_sb(Color(0.85, 0.79, 0.66, 0.6), Color(0.42, 0.33, 0.24, 0.45), 5, 1), Rect2(0, 0, s, s))
		if on:
			c.draw_style_box(_sb(Color(0, 0, 0, 0), Color("c8a040"), 6, 3), Rect2(-2, -2, s + 4, s + 4)))
	if id == "":
		return c
	var d := Ui.item_def(id)
	var ic := _item_icon(id, d.get("icon", ""), 48, d.get("category", ""))
	ic.position = Vector2(8, 6)
	c.add_child(ic)
	var n: int = G.bag[id]
	if n > 1:
		var l := _lab(str(n), 13, INK)
		l.add_theme_color_override("font_outline_color", Color("f2e8d2"))
		l.add_theme_constant_override("outline_size", 4)
		l.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
		l.position = Vector2(0, s - 20)
		l.size = Vector2(s - 4, 18)
		c.add_child(l)
	return c


func _bag_right(v: VBoxContainer) -> void:
	var ids: Array = G.bag.keys()
	if ids.is_empty():
		v.add_child(_lab("行囊裡空空的。", 17, SOFT))
		return
	var id: String = ids[clampi(cur, 0, ids.size() - 1)]
	var d := Ui.item_def(id)
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	v.add_child(top)
	top.add_child(_item_icon(id, d.get("icon", ""), 80, d.get("category", "")))
	var nv := VBoxContainer.new()
	top.add_child(nv)
	nv.add_child(_lab(d.get("name", id), 24))
	var tr := HBoxContainer.new()
	tr.add_theme_constant_override("separation", 6)
	nv.add_child(tr)
	tr.add_child(_tag(d.get("category", "雜物"), SOFT))
	tr.add_child(_tag("×%d" % G.bag[id], INK))
	var desc := _lab(d.get("desc", ""), 15, SOFT)
	desc.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	desc.custom_minimum_size = Vector2(PW - 90, 0)
	v.add_child(desc)
	v.add_child(_rule())
	for e in [["hp", "氣血", Color("a83a2e"), 200.0], ["qi", "內力", Color("3a6a9a"), 150.0], ["stamina", "體力", Color("6a8a3a"), 150.0]]:
		if d.has(e[0]):
			var h := HBoxContainer.new()
			h.add_theme_constant_override("separation", 8)
			v.add_child(h)
			h.add_child(_lab(e[1], 15))
			h.add_child(_bar(float(d[e[0]]) / e[3], 200, 10, e[2]))
			h.add_child(_lab("+%d" % d[e[0]], 14, e[2]))
	if d.has("manual"):
		v.add_child(_lab("可研讀「%s」" % Hero.skill_def(d.manual).get("name", d.manual), 15, BLUE))
	if d.has("price"):
		v.add_child(_icon_num(_coin(), "值", "%d 兩" % d.price))
	if focus == "page" and Hero.usable(id):
		v.add_child(_lab("（空白鍵使用）", 13, FAINT))


# ── 存檔 ────────────────────────────────────────────────

func _slot_label(slot: String) -> String:
	return "回到標題" if slot == "title" else G.slot_name(slot)


func _save_left(v: VBoxContainer) -> void:
	v.add_theme_constant_override("separation", 3)
	for i in SLOTS.size():
		var slot: String = SLOTS[i]
		var on := focus == "page" and i == cur
		if slot == "1" or slot == "title":
			v.add_child(_rule())
		var row := PanelContainer.new()
		var sb := _sb(Color(0.54, 0.18, 0.15, 0.12) if on else Color(0, 0, 0, 0), Color(0.54, 0.18, 0.15, 0.5) if on else Color(0, 0, 0, 0), 4, 1)
		sb.content_margin_left = 6
		sb.content_margin_right = 6
		row.add_theme_stylebox_override("panel", sb)
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		row.add_child(h)
		var name := _lab(_slot_label(slot), 15, RED if on else INK)
		name.custom_minimum_size = Vector2(76, 0)
		h.add_child(name)
		if slot != "title":
			var d := G.read_save(slot)
			if d.is_empty():
				h.add_child(_lab("（空）", 14, FAINT))
			else:
				h.add_child(_lab("%s　%s・%s" % [d.hero.get("name", ""), G.date_text(int(d.day)), d.where.get("name", "")], 14, SOFT))
		v.add_child(row)


func _save_right(v: VBoxContainer) -> void:
	var slot: String = SLOTS[clampi(cur, 0, SLOTS.size() - 1)]
	v.add_child(_lab(_slot_label(slot), 22))
	if slot == "title":
		v.add_child(_lab("闔上書，回到標題畫面。", 15, SOFT))
		v.add_child(_lab("還沒存的進度會不見。", 15, RED))
		return
	var d := G.read_save(slot)
	if d.is_empty():
		v.add_child(_lab("這一欄是空的。", 15, SOFT))
		if slot not in ["quick", "auto"]:
			v.add_child(_lab("空白鍵把現在的進度存到這裡。", 14, FAINT))
		return
	var top := HBoxContainer.new()
	top.add_theme_constant_override("separation", 14)
	v.add_child(top)
	var c: Dictionary = d.hero
	top.add_child(_seal(c.get("surname", "") if c.get("surname", "") != "" else str(c.get("name", "？")).left(1), 52, RED))
	var nv := VBoxContainer.new()
	top.add_child(nv)
	nv.add_child(_lab(c.get("name", ""), 24))
	nv.add_child(_lab(d.where.get("name", ""), 15, SOFT))
	v.add_child(_lab("%s　%s・%s" % [G.date_text(int(d.day)), G.time_text(int(d.time)), G.WEATHER_NAME.get(d.weather, "")], 15))
	v.add_child(_rule())
	for row in [["氣血", "hp", Color("a83a2e")], ["內力", "qi", Color("3a6a9a")], ["體力", "stamina", Color("6a8a3a")]]:
		var h := HBoxContainer.new()
		h.add_theme_constant_override("separation", 10)
		v.add_child(h)
		h.add_child(_lab(row[0], 15))
		h.add_child(_lab(str(int(c.get(row[1], 0))), 15, row[2]))
	v.add_child(_icon_num(_coin(), "銀兩", str(int(d.silver))))
	var names := []
	for s in c.get("skills", []):
		if s.get("pos") != null:
			names.append(Hero.skill_def(s.id).get("name", s.id))
	if not names.is_empty():
		var l := _lab("裝備：" + "、".join(names), 14, SOFT)
		l.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
		l.custom_minimum_size = Vector2(PW - 90, 0)
		v.add_child(l)
	v.add_child(_rule())
	var bias: int = Time.get_time_zone_from_system().get("bias", 0)
	var dt := Time.get_datetime_dict_from_unix_time(int(d.get("saved_at", 0)) + bias * 60)
	v.add_child(_lab("存於 %d/%d/%d %02d:%02d" % [dt.year, dt.month, dt.day, dt.hour, dt.minute], 13, FAINT))


## 存檔頁按空白鍵；要讀檔或回標題（選單要關掉）回傳 true
func _save_action() -> bool:
	var slot: String = SLOTS[clampi(cur, 0, SLOTS.size() - 1)]
	if slot == "title":
		if await _confirm("回到標題畫面？", "還沒存的進度會不見。", ["回去", "取消"]) == 0:
			result = {"do": "title"}
			return true
		return false
	var d := G.read_save(slot)
	var manual := slot not in ["quick", "auto"]
	var opts: Array = []
	if manual:
		opts.append("存檔" if d.is_empty() else "蓋過去")
	if not d.is_empty():
		opts.append("讀取")
	if opts.is_empty():
		ui.notify("這一欄是空的。", FAINT)
		return false
	opts.append("取消")
	var sub := "（空）" if d.is_empty() else G.save_summary(d)
	var pick_i := await _confirm(_slot_label(slot), sub, opts)
	var act: String = opts[pick_i]
	if act == "存檔" or act == "蓋過去":
		if here.is_empty():
			ui.notify("這裡不能存檔。", FAINT)
		elif G.write_save(slot, here):
			ui.notify("已存到「%s」。" % _slot_label(slot))
		else:
			ui.notify("存檔失敗。", FAINT)
		_fill_both()
	elif act == "讀取":
		if await _confirm("讀取「%s」？" % _slot_label(slot), "現在的進度沒存的話就不見了。", ["讀取", "取消"]) == 0:
			result = {"do": "load", "data": d}
			return true
	return false


# ── 小元件 ──────────────────────────────────────────────

static func _lab(text: String, size := 18, color := INK) -> Label:
	return Screens._lab(text, size, color)


static func _gap(h: float) -> Control:
	return Screens._gap(h)


static func _sb(fill: Color, border: Color, radius := 4, bw := 0) -> StyleBoxFlat:
	var sb := StyleBoxFlat.new()
	sb.bg_color = fill
	sb.border_color = border
	sb.set_border_width_all(bw)
	sb.set_corner_radius_all(radius)
	return sb


static func _vert(s: String) -> String:
	var out := []
	for ch in s:
		out.append(ch)
	return "\n".join(out)


static func _cn(n: int) -> String:
	if n <= 10:
		return CN[n]
	if n < 20:
		return "十" + (CN[n - 10] if n > 10 else "")
	return CN[n / 10] + "十" + (CN[n % 10] if n % 10 > 0 else "")


static func _tier_color(t: String) -> Color:
	return {"入門": Color("7a6a52"), "中品": Color("3a6a5a"), "上乘": Color("3a4a8a"), "絕學": Color("8a2e26")}.get(t, SOFT)


## 長條：圓頭的槽，裡面是填色＋一道亮邊
static func _bar(frac: float, w: float, h: float, col: Color) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		c.draw_style_box(_sb(Color("ddd0b2"), Color("8a7a5a"), int(h / 2), 1), Rect2(0, 0, w, h))
		var f := clampf(frac, 0, 1)
		if f > 0:
			var fw := maxf(h, (w - 2) * f)
			c.draw_style_box(_sb(col, Color(0, 0, 0, 0), int(h / 2)), Rect2(1, 1, fw, h - 2))
			if h >= 8:
				c.draw_line(Vector2(h / 2, 3), Vector2(fw - h / 2 + 1, 3), Color(1, 1, 1, 0.28), 1.0))
	return c


## 分段長條（五維：底值＋成長＋裝備）
static func _stack(parts: Array, top: float, w: float, h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, h)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		c.draw_rect(Rect2(0, 0, w, h), Color("ddd0b2"))
		var x := 0.0
		for p in parts:
			var pw := w * clampf(p[0] / top, 0, 1)
			c.draw_rect(Rect2(x, 0, minf(pw, w - x), h), p[1])
			x += pw
		for k in range(1, int(top / 5)):
			var tx := w * k * 5 / top
			c.draw_line(Vector2(tx, h - 3), Vector2(tx, h), Color(0, 0, 0, 0.25))
		c.draw_rect(Rect2(0, 0, w, h), Color("8a7a5a"), false, 1.0))
	return c


## 一排菱形格：fill 個實心、共 total 個，extra 個金色（突破）
static func _pips(fill: int, total: int, extra: int, s: float, col: Color) -> Control:
	var c := Control.new()
	var step := s + 4
	c.custom_minimum_size = Vector2(step * (total + extra), s)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		for i in total + extra:
			var cx := i * step + s / 2
			var pts := PackedVector2Array([Vector2(cx, 0), Vector2(cx + s / 2, s / 2), Vector2(cx, s), Vector2(cx - s / 2, s / 2)])
			if i >= total:
				c.draw_colored_polygon(pts, GOLD)
			elif i < fill:
				c.draw_colored_polygon(pts, col)
			c.draw_polyline(pts + PackedVector2Array([pts[0]]), Color(0.3, 0.22, 0.15, 0.7), 1.0))
	return c


## 印章：方框紅底白字
static func _seal(text: String, s: float, col: Color) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(s, s)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		c.draw_style_box(_sb(col, col.darkened(0.3), 4, 2), Rect2(0, 0, s, s))
		c.draw_rect(Rect2(4, 4, s - 8, s - 8), Color(1, 0.95, 0.85, 0.5), false, 1.0))
	var l := _lab(text if text.length() <= 1 else _vert(text) if s >= 50 else text, int(s * 0.55) if text.length() <= 1 else int(s * 0.32), Color("f6ecd8"))
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	l.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	l.size = Vector2(s, s)
	c.add_child(l)
	return c


## 小標籤：細框圓角＋字
static func _tag(text: String, col: Color) -> Control:
	var p := PanelContainer.new()
	var sb := _sb(Color(col, 0.08), Color(col, 0.7), 3, 1)
	sb.content_margin_left = 6
	sb.content_margin_right = 6
	p.add_theme_stylebox_override("panel", sb)
	p.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	p.add_child(_lab(text, 13, col))
	return p


## 裝備中的記號：紅圈（沒裝是空圈）
static func _mark(on: bool) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(14, 14)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		if on:
			c.draw_circle(Vector2(7, 7), 6, RED)
		else:
			c.draw_arc(Vector2(7, 7), 5.5, 0, TAU, 20, FAINT, 1.0))
	return c


static func _swatch(col: Color) -> Control:
	var c := ColorRect.new()
	c.color = col
	c.custom_minimum_size = Vector2(12, 12)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	return c


static func _rule() -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, 8)
	c.draw.connect(func() -> void:
		c.draw_line(Vector2(0, 4), Vector2(c.size.x, 4), Color(0.55, 0.36, 0.24, 0.35), 1.0))
	return c


## 銅錢（外圓內方）
static func _coin() -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(26, 26)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		c.draw_circle(Vector2(13, 13), 12, Color("c8a040"))
		c.draw_arc(Vector2(13, 13), 12, 0, TAU, 24, Color("7a5a20"), 1.5)
		c.draw_rect(Rect2(9, 9, 8, 8), Color("efe3c6"))
		c.draw_rect(Rect2(9, 9, 8, 8), Color("7a5a20"), false, 1.0))
	return c


static func _icon_num(icon: Control, name: String, value: String) -> Control:
	var h := HBoxContainer.new()
	h.add_theme_constant_override("separation", 6)
	h.add_child(icon)
	h.add_child(_lab(name, 15, SOFT))
	h.add_child(_lab(value, 18))
	return h


## 五維雷達圖
static func _radar(vals: Dictionary, top: float) -> Control:
	var s := 220.0
	var c := Control.new()
	c.custom_minimum_size = Vector2(s, s)
	c.draw.connect(func() -> void:
		var o := Vector2(s / 2, s / 2 + 6)
		var r := 82.0
		var n := Hero.ATTRS.size()
		var dir := func(i: int) -> Vector2: return Vector2.from_angle(-PI / 2 + TAU * i / n)
		for ring in [0.25, 0.5, 0.75, 1.0]:
			var pts := PackedVector2Array()
			for i in n + 1:
				pts.append(o + dir.call(i % n) * r * ring)
			c.draw_polyline(pts, Color(0.42, 0.33, 0.24, 0.35 if ring < 1 else 0.6), 1.0)
		for i in n:
			c.draw_line(o, o + dir.call(i) * r, Color(0.42, 0.33, 0.24, 0.25), 1.0)
		var poly := PackedVector2Array()
		for i in n:
			poly.append(o + dir.call(i) * r * clampf(vals[Hero.ATTRS[i].key] / top, 0.02, 1))
		c.draw_colored_polygon(poly, Color(0.54, 0.18, 0.15, 0.28))
		c.draw_polyline(poly + PackedVector2Array([poly[0]]), RED, 2.0)
		for p in poly:
			c.draw_circle(p, 3, RED)
		var f := Ui.font()
		for i in n:
			var lp: Vector2 = o + dir.call(i) * (r + 20)
			var t: String = Hero.ATTRS[i].name
			c.draw_string(f, lp + Vector2(-30, 6), t, HORIZONTAL_ALIGNMENT_CENTER, 60, 15, INK)
			c.draw_string(f, lp + Vector2(-30, 22), "%.0f" % vals[Hero.ATTRS[i].key], HORIZONTAL_ALIGNMENT_CENTER, 60, 12, SOFT))
	return c


## 物品圖示：分類的底色＋依圖示名畫的簡單形狀
static func _item_icon(id: String, icon: String, s: float, cat := "") -> Control:
	var bg: Color = {"藥品": Color("e8c4b4"), "秘笈": Color("c4ccd8"), "菜餚": Color("ecd6a4"), "食材": Color("d2dfb4"), "服飾": Color("d6c6de"), "雜物": Color("dccfb4")}.get(cat, Color("dccfb4"))
	var shape := _shape_of(icon, id)
	var c := Control.new()
	c.custom_minimum_size = Vector2(s, s)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		var k := s / 48.0
		c.draw_style_box(_sb(bg, Color(0.3, 0.22, 0.15, 0.5), int(6 * k), 1), Rect2(0, 0, s, s))
		c.draw_set_transform(Vector2.ZERO, 0, Vector2(k, k))
		var ink := Color("3a2a1e")
		match shape:
			"pill":
				c.draw_circle(Vector2(18, 28), 8, Color("a83a2e"))
				c.draw_circle(Vector2(30, 22), 7, Color("c86a3a"))
				c.draw_circle(Vector2(16, 26), 2.5, Color(1, 1, 1, 0.5))
			"jar":
				c.draw_rect(Rect2(14, 18, 20, 20), Color("8a6a4a"))
				c.draw_rect(Rect2(17, 12, 14, 6), Color("6a4a2a"))
				c.draw_rect(Rect2(14, 24, 20, 6), Color("e8dcc0"))
			"book":
				c.draw_rect(Rect2(12, 10, 24, 30), Color("3a4a6a"))
				c.draw_rect(Rect2(28, 13, 5, 18), Color("efe3c6"))
				for y in [14, 22, 30, 37]:
					c.draw_line(Vector2(13, y), Vector2(16, y), Color("efe3c6"), 1.0)
			"fish":
				c.draw_colored_polygon(PackedVector2Array([Vector2(8, 24), Vector2(20, 15), Vector2(34, 18), Vector2(40, 24), Vector2(34, 30), Vector2(20, 33)]), Color("6a8aa0"))
				c.draw_colored_polygon(PackedVector2Array([Vector2(8, 24), Vector2(3, 17), Vector2(3, 31)]), Color("4a6a80"))
				c.draw_circle(Vector2(33, 22), 1.8, ink)
			"leaf":
				c.draw_colored_polygon(PackedVector2Array([Vector2(12, 36), Vector2(16, 18), Vector2(30, 10), Vector2(36, 14), Vector2(32, 28)]), Color("5a8a3a"))
				c.draw_line(Vector2(12, 36), Vector2(32, 14), Color("3a5a2a"), 1.5)
			"robe":
				c.draw_colored_polygon(PackedVector2Array([Vector2(18, 10), Vector2(30, 10), Vector2(40, 18), Vector2(35, 23), Vector2(33, 20), Vector2(34, 40), Vector2(14, 40), Vector2(15, 20), Vector2(13, 23), Vector2(8, 18)]), Color("4a6a8a"))
				c.draw_line(Vector2(24, 12), Vector2(20, 30), Color("e8dcc0"), 1.5)
			"sword":
				c.draw_line(Vector2(12, 36), Vector2(36, 12), Color("c8ccd0"), 4.0)
				c.draw_line(Vector2(10, 30), Vector2(18, 38), Color("8a6a2a"), 3.0)
				c.draw_line(Vector2(8, 40), Vector2(13, 35), Color("5a3a1a"), 3.0)
			"bowl":
				c.draw_colored_polygon(PackedVector2Array([Vector2(8, 24), Vector2(40, 24), Vector2(34, 36), Vector2(14, 36)]), Color("e8e0d0"))
				c.draw_rect(Rect2(8, 22, 32, 3), Color("3a5a8a"))
				c.draw_circle(Vector2(20, 20), 4, Color("d8a050"))
				c.draw_circle(Vector2(28, 19), 4, Color("c87a3a"))
			_:
				c.draw_colored_polygon(PackedVector2Array([Vector2(14, 18), Vector2(34, 18), Vector2(38, 38), Vector2(10, 38)]), Color("a07a4a"))
				c.draw_rect(Rect2(18, 12, 12, 6), Color("8a6a3a"))
				c.draw_line(Vector2(16, 18), Vector2(32, 18), Color("6a4020"), 2.0)
		c.draw_set_transform(Vector2.ZERO, 0, Vector2.ONE))
	return c


static func _shape_of(icon: String, id: String) -> String:
	if icon in ["pill", "sweet", "tangyuan"]:
		return "pill"
	if icon in ["salve", "tea", "sugar"]:
		return "jar"
	if icon in ["book", "scroll", "painting"]:
		return "book"
	if icon.begins_with("f_") or icon in ["fish", "shrimp"]:
		return "fish"
	if icon in ["herb", "greens", "flower", "lotus_root", "mushroom", "seaweed", "radish", "seeds", "beans", "nut", "water_chestnut"]:
		return "leaf"
	if icon.begins_with("robe") or icon in ["pants", "hat", "shoes", "shoutao", "bracer"]:
		return "robe"
	if icon in ["sword", "blade"]:
		return "sword"
	if icon in ["noodle", "soup", "stew", "rice", "dumpling", "zongzi", "mooncake", "qingtuan", "niangao", "tofu", "egg", "meat", "chicken", "flour"]:
		return "bowl"
	if id == "":
		return icon
	return "pouch"
