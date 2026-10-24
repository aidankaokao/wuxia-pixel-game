class_name Screens
## 整頁的介面：標題畫面、建立角色（系統選單在 book_menu.gd）。都照 ui.gd 的做法：_show 一個 Control，迴圈裡等 _key。
## 按鍵：↑↓ 選、←→ 換分頁、空白鍵／Enter 確定、X／Esc 返回。

const PAPER := Color("f2e8d2")
const INK_DARK := Color("2a2018")
const INK_SOFT := Color("6a5a48")
const INK_FAINT := Color("a8987c")
const RED := Color("8a2e26")


static func _lab(text: String, size := 18, color := INK_DARK) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", color)
	return l


## 淺色紙底的面板（置中）
static func _paper(w: float, h: float) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = PAPER
	sb.border_color = Color("6a4a2a")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 26
	sb.content_margin_right = 26
	sb.content_margin_top = 20
	sb.content_margin_bottom = 20
	sb.shadow_color = Color(0, 0, 0, 0.3)
	sb.shadow_size = 8
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(w, h)
	p.position = Vector2(-w / 2.0, -h / 2.0)
	return p


## 一條長條（經驗、氣血之類）
static func _bar(frac: float, w := 160.0, color := Color("6a8a4a")) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(w, 10)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.draw.connect(func() -> void:
		c.draw_rect(Rect2(Vector2.ZERO, Vector2(w, 10)), Color("d8ccb0"))
		c.draw_rect(Rect2(Vector2.ZERO, Vector2(w * clampf(frac, 0, 1), 10)), color)
		c.draw_rect(Rect2(Vector2.ZERO, Vector2(w, 10)), Color("8a7a5a"), false, 1.0))
	return c


static func _row_text(l: Label, text: String, on: bool, enabled := true) -> void:
	l.text = ("▶ " if on else "　 ") + text
	l.add_theme_color_override("font_color", RED if on else (INK_DARK if enabled else INK_FAINT))


# ── 標題畫面 ────────────────────────────────────────────

## 回傳 {"do": "new"} / {"do": "load", "data": 存檔}
static func title(ui: Ui) -> Dictionary:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := Control.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.draw.connect(func() -> void: _ink_mountains(bg))
	root.add_child(bg)
	var v := VBoxContainer.new()
	v.set_anchors_preset(Control.PRESET_CENTER)
	v.position = Vector2(-220, -210)
	v.custom_minimum_size = Vector2(440, 0)
	v.add_theme_constant_override("separation", 10)
	root.add_child(v)
	var t := _lab("扶 搖 江 湖", 64, Color("1e1a22"))
	t.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(t)
	var sub := _lab("一 介 布 衣　　仗 劍 天 涯", 18, INK_SOFT)
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	v.add_child(sub)
	v.add_child(_gap(36))
	var list := VBoxContainer.new()
	list.add_theme_constant_override("separation", 8)
	v.add_child(list)
	ui._show(root)
	var saves := G.list_saves()
	var latest: Dictionary = {}
	for s in saves:
		if not s.data.is_empty() and (latest.is_empty() or s.data.saved_at > latest.saved_at):
			latest = s.data
	var mode := "main"
	var cur := 0 if not latest.is_empty() else 2
	while true:
		var items: Array = []
		if mode == "main":
			items = [{"text": "繼續遊戲", "on": not latest.is_empty()}, {"text": "讀取進度", "on": saves.any(func(s): return not s.data.is_empty())}, {"text": "新的遊戲", "on": true}]
		else:
			for s in saves:
				items.append({"text": "%s　%s" % [G.slot_name(s.slot), G.save_summary(s.data) if not s.data.is_empty() else "（空）"], "on": not s.data.is_empty()})
		for c in list.get_children():
			c.queue_free()
		for i in items.size():
			var l := _lab("", 22 if mode == "main" else 17)
			l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER if mode == "main" else HORIZONTAL_ALIGNMENT_LEFT
			_row_text(l, items[i].text, i == cur, items[i].on)
			list.add_child(l)
		var k: String = await ui._key
		if k == "Up" or k == "Down":
			# 跳過不能選的項目
			var step := -1 if k == "Up" else 1
			for i in items.size():
				cur = (cur + step + items.size()) % items.size()
				if items[cur].on:
					break
		elif k == "back" and mode == "load":
			mode = "main"
			cur = 1
		elif k == "ok" and items[cur].on:
			if mode == "main":
				match cur:
					0:
						ui._close()
						return {"do": "load", "data": latest}
					1:
						mode = "load"
						cur = 0
						while not items[0].on and cur < saves.size() - 1 and saves[cur].data.is_empty():
							cur += 1
					2:
						ui._close()
						return {"do": "new"}
			else:
				ui._close()
				return {"do": "load", "data": saves[cur].data}
	return {}


static func _gap(h: float) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(0, h)
	return c


## 標題背景：宣紙底、幾層水墨遠山、一輪淡淡的紅日
static func _ink_mountains(c: Control) -> void:
	var s := c.size
	c.draw_rect(Rect2(Vector2.ZERO, s), Color("efe6d2"))
	c.draw_circle(Vector2(s.x * 0.74, s.y * 0.26), 46, Color(0.75, 0.25, 0.2, 0.55))
	for layer in 4:
		var col := Color(0.18, 0.17, 0.2, 0.12 + layer * 0.1)
		var base := s.y * (0.55 + layer * 0.11)
		var pts := PackedVector2Array([Vector2(0, s.y)])
		var x := 0.0
		while x <= s.x + 20:
			var h := sin(x * 0.006 + layer * 1.7) * 60 + sin(x * 0.017 + layer * 3.1) * 28 + sin(x * 0.041 + layer) * 10
			pts.append(Vector2(x, base - h - (90 - layer * 18)))
			x += 12
		pts.append(Vector2(s.x, s.y))
		c.draw_colored_polygon(pts, col)
	# 右下角的紅色小印
	var at := Vector2(s.x - 110, s.y - 120)
	c.draw_rect(Rect2(at, Vector2(56, 56)), Color(0.66, 0.16, 0.13, 0.85))
	c.draw_string(Ui.font(), at + Vector2(6, 25), "江湖", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("f6ecd4"))
	c.draw_string(Ui.font(), at + Vector2(6, 50), "夜雨", HORIZONTAL_ALIGNMENT_LEFT, -1, 20, Color("f6ecd4"))


# ── 建立角色 ────────────────────────────────────────────

## 填姓名（可隨機）、擲骰決定五維；回傳新角色，返回是空字典
static func create(ui: Ui) -> Dictionary:
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	var bg := Control.new()
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	bg.draw.connect(func() -> void: _ink_mountains(bg))
	root.add_child(bg)
	var p := _paper(760, 400)
	root.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 10)
	p.add_child(v)
	v.add_child(_lab("建立角色", 26))
	var name_row := HBoxContainer.new()
	name_row.add_theme_constant_override("separation", 12)
	v.add_child(name_row)
	var edits: Array[LineEdit] = []
	for i in 2:
		name_row.add_child(_lab("姓" if i == 0 else "名", 20))
		var e := LineEdit.new()
		e.max_length = 2 if i == 0 else 3
		e.custom_minimum_size = Vector2(110, 0)
		e.add_theme_font_size_override("font_size", 20)
		e.add_theme_color_override("font_color", INK_DARK)
		e.add_theme_color_override("caret_color", RED)
		# 淺色紙底、底下一條墨線；正在打字的那欄墨線變紅
		for st in ["normal", "focus"]:
			var sb := StyleBoxFlat.new()
			sb.bg_color = Color("fbf6ea")
			sb.border_color = RED if st == "focus" else Color("6a4a2a")
			sb.border_width_bottom = 2
			sb.content_margin_left = 8
			sb.content_margin_right = 8
			sb.content_margin_top = 2
			sb.content_margin_bottom = 2
			e.add_theme_stylebox_override(st, sb)
		name_row.add_child(e)
		edits.append(e)
	var random_l := _lab("", 18)
	name_row.add_child(random_l)
	var table := GridContainer.new()
	table.columns = 4
	table.add_theme_constant_override("h_separation", 14)
	table.add_theme_constant_override("v_separation", 6)
	v.add_child(table)
	var total_row := HBoxContainer.new()
	total_row.add_theme_constant_override("separation", 20)
	v.add_child(total_row)
	var total_l := _lab("", 18)
	total_row.add_child(total_l)
	var reroll_l := _lab("", 18)
	total_row.add_child(reroll_l)
	var foot := HBoxContainer.new()
	foot.add_theme_constant_override("separation", 24)
	v.add_child(foot)
	var start_l := _lab("", 20)
	var back_l := _lab("", 20)
	var err_l := _lab("", 16, RED)
	for l in [start_l, back_l, err_l]:
		foot.add_child(l)
	v.add_child(_lab("↑↓ 選擇　空白鍵 確定　在姓名欄可以直接打字（Enter 到下一欄）", 14, INK_SOFT))
	ui._show(root)
	var base := Hero.roll_attrs()
	var cur := 0
	while true:
		# 0 姓、1 名、2 隨機姓名、3 擲骰、4 開始、5 返回
		ui.typing = cur <= 1
		if cur <= 1:
			edits[cur].grab_focus()
		else:
			for e in edits:
				e.release_focus()
		_row_text(random_l, "隨機姓名", cur == 2)
		_row_text(reroll_l, "重新擲骰", cur == 3)
		_row_text(start_l, "踏入江湖", cur == 4)
		_row_text(back_l, "返回", cur == 5)
		for c in table.get_children():
			c.queue_free()
		var total := 0
		for a in Hero.ATTRS:
			table.add_child(_lab(a.name, 18))
			table.add_child(_lab(str(base[a.key]), 18, RED))
			table.add_child(_bar(float(base[a.key]) / Hero.ROLL.max, 140))
			table.add_child(_lab(a.desc, 14, INK_SOFT))
			total += base[a.key]
		total_l.text = "五維總和 %d（每項 %d–%d，總和 %d–%d）" % [total, Hero.ROLL.min, Hero.ROLL.max, Hero.ROLL.total_min, Hero.ROLL.total_max]
		var k: String = await ui._key
		if k == "Up" or (k == "Tab" and Input.is_key_pressed(KEY_SHIFT)):
			cur = (cur + 5) % 6
		elif k == "Down" or k == "Tab":
			cur = (cur + 1) % 6
		elif (k == "ok" or k == "Enter") and cur <= 1:
			cur += 1
		elif k == "back":
			break
		elif k == "ok":
			match cur:
				2:
					var n := Hero.roll_name()
					edits[0].text = n[0]
					edits[1].text = n[1]
					err_l.text = ""
				3:
					base = Hero.roll_attrs()
				4:
					var sn := edits[0].text.strip_edges()
					var gn := edits[1].text.strip_edges()
					if sn == "" or gn == "":
						err_l.text = "請填入姓氏。" if sn == "" else "請填入名字。"
						continue
					ui.typing = false
					ui._close()
					return Hero.new_hero(sn, gn, base)
				5:
					break
	ui.typing = false
	ui._close()
	return {}
