class_name Ui
extends CanvasLayer
## 文字介面：對話框（一句一句）、選項、商店，以及左上的狀態、畫面下方的提示。
## 操作跟網頁版一樣：E／空白鍵／Enter 確認，↑↓ 選擇，←→ 換分頁，X／Esc 關閉。
## 介面開著時 busy() 為真，主角不會走動。

signal _key(k: String)

static var _font: SystemFont

## 中文字型：用系統內建的黑體
static func font() -> SystemFont:
	if _font == null:
		_font = SystemFont.new()
		_font.font_names = PackedStringArray(["PingFang TC", "Heiti TC", "Noto Sans CJK TC", "Microsoft JhengHei", "sans-serif"])
		_font.antialiasing = TextServer.FONT_ANTIALIASING_GRAY
	return _font

const GOLD := Color("c9a46a")
const INK := Color(0.09, 0.08, 0.12, 0.93)

## 試作品自己記的銀兩與行囊（不讀存檔）
var silver := 120
var bag := {"boar_meat": 2, "dog_pelt": 1, "boar_tusk": 1, "herb": 3, "jinchuang": 1}
var items: Dictionary = {}

var _root: Control
var _box: Control
var _open := false
var info: Label
var hint: Label


func _ready() -> void:
	layer = 10
	_root = Control.new()
	_root.set_anchors_preset(Control.PRESET_FULL_RECT)
	_root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var th := Theme.new()
	th.default_font = font()
	th.default_font_size = 20
	_root.theme = th
	add_child(_root)
	info = Label.new()
	info.position = Vector2(16, 14)
	info.add_theme_font_size_override("font_size", 15)
	info.add_theme_color_override("font_color", Color("f4ead6"))
	info.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	info.add_theme_constant_override("outline_size", 6)
	_root.add_child(info)
	hint = Label.new()
	hint.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	hint.offset_left = 16
	hint.offset_top = -32
	hint.add_theme_font_size_override("font_size", 14)
	hint.add_theme_color_override("font_color", Color("e8dcc0"))
	hint.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	hint.add_theme_constant_override("outline_size", 6)
	_root.add_child(hint)
	var f := FileAccess.open("res://data/items.json", FileAccess.READ)
	if f:
		items = JSON.parse_string(f.get_as_text())


func busy() -> bool:
	return _open


func _input(e: InputEvent) -> void:
	if not _open or not (e is InputEventKey) or not e.pressed or e.echo:
		return
	var k: String = OS.get_keycode_string(e.keycode)
	if k in ["E", "Space", "Enter", "Kp Enter"]:
		k = "ok"
	elif k in ["X", "Escape"]:
		k = "back"
	get_viewport().set_input_as_handled()
	_key.emit(k)


func _panel(bottom := true) -> PanelContainer:
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = INK
	sb.border_color = GOLD
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 22
	sb.content_margin_right = 22
	sb.content_margin_top = 16
	sb.content_margin_bottom = 18
	sb.shadow_color = Color(0, 0, 0, 0.35)
	sb.shadow_size = 4
	sb.shadow_offset = Vector2(0, 4)
	p.add_theme_stylebox_override("panel", sb)
	if bottom:
		p.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
		p.custom_minimum_size = Vector2(760, 120)
		p.position = Vector2(-380, -200)
	return p


func _show(c: Control) -> void:
	_close()
	_box = c
	_root.add_child(c)
	_open = true


func _close() -> void:
	if _box:
		_box.queue_free()
		_box = null
	_open = false


## 畫面下方的對話框：外框是一個 Control，裡面放對話框本體與左上角的名牌（名牌不參與排版）
func _dialog(who: String) -> VBoxContainer:
	var holder := Control.new()
	holder.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
	holder.position = Vector2(-380, -200)
	var p := _panel(false)
	p.custom_minimum_size = Vector2(760, 120)
	holder.add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	p.add_child(v)
	_show(holder)
	_speaker_tag(holder, who)
	return v


func _speaker_tag(p: Control, name: String) -> void:
	if name == "":
		return
	var tag := Label.new()
	tag.text = " %s " % name
	tag.add_theme_font_size_override("font_size", 16)
	tag.add_theme_color_override("font_color", Color("17141f"))
	var sb := StyleBoxFlat.new()
	sb.bg_color = GOLD
	sb.set_corner_radius_all(3)
	sb.content_margin_left = 8
	sb.content_margin_right = 8
	tag.add_theme_stylebox_override("normal", sb)
	tag.position = Vector2(14, -18)
	p.add_child(tag)


func _text(t: String, size := 20) -> Label:
	var l := Label.new()
	l.text = t
	l.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	l.custom_minimum_size = Vector2(700, 0)
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", Color("f4ead6"))
	l.add_theme_constant_override("line_spacing", 6)
	return l


## 一句一句說：lines 是 [{speaker, text}]，按 E 下一句
func say(lines: Array) -> void:
	for l in lines:
		var v := _dialog(l.get("speaker", ""))
		v.add_child(_text(l.get("text", "")))
		while true:
			var k: String = await _key
			if k == "ok" or k == "back":
				break
	_close()


## 問一句、選一個（回傳第幾個；X 等於選最後一個）
func ask(prompt: Dictionary, options: Array) -> int:
	var cur := 0
	var v := _dialog(prompt.get("speaker", ""))
	v.add_child(_text(prompt.get("text", "")))
	var rows: Array[Label] = []
	for o in options:
		var r := _text(o, 18)
		v.add_child(r)
		rows.append(r)
	while true:
		for i in rows.size():
			rows[i].text = ("▶ " if i == cur else "　 ") + str(options[i])
			rows[i].add_theme_color_override("font_color", Color("ffffff") if i == cur else Color("b8ac94"))
		var k: String = await _key
		if k == "Up":
			cur = (cur + options.size() - 1) % options.size()
		elif k == "Down":
			cur = (cur + 1) % options.size()
		elif k == "ok":
			break
		elif k == "back":
			cur = options.size() - 1
			break
	_close()
	return cur


func item_name(id: String) -> String:
	return items.get(id, {}).get("name", id)


func item_price(id: String) -> int:
	return int(items.get(id, {}).get("price", 0))


## 商店：買（stock）與賣（身上的東西，照 sell_rate 收）
func shop(title: String, stock: Array, sell_rate := 0.5) -> void:
	var tab := 0
	var cur := 0
	var note := ""
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("f2e8d2")
	sb.border_color = Color("6a4a2a")
	sb.set_border_width_all(3)
	sb.set_corner_radius_all(6)
	sb.content_margin_left = 22
	sb.content_margin_right = 22
	sb.content_margin_top = 16
	sb.content_margin_bottom = 16
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(540, 420)
	p.position = Vector2(-270, -230)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 6)
	p.add_child(v)
	var head := Label.new()
	var tabs := Label.new()
	var list := VBoxContainer.new()
	var desc := Label.new()
	var foot := Label.new()
	for l in [head, tabs, desc, foot]:
		l.add_theme_color_override("font_color", Color("2a2018"))
	head.add_theme_font_size_override("font_size", 22)
	tabs.add_theme_font_size_override("font_size", 16)
	desc.add_theme_font_size_override("font_size", 14)
	desc.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	desc.custom_minimum_size = Vector2(490, 44)
	desc.add_theme_color_override("font_color", Color("5a4a3a"))
	foot.add_theme_font_size_override("font_size", 14)
	foot.add_theme_color_override("font_color", Color("8a2e26"))
	list.custom_minimum_size = Vector2(490, 240)
	for c in [head, tabs, list, desc, foot]:
		v.add_child(c)
	_show(p)
	while true:
		var ids: Array = stock if tab == 0 else bag.keys().filter(func(k): return bag[k] > 0)
		cur = clampi(cur, 0, max(0, ids.size() - 1))
		head.text = "%s　　　銀兩 %d" % [title, silver]
		tabs.text = ("【買】　賣" if tab == 0 else "　買　【賣】") + "　　（←→ 換分頁）"
		for c in list.get_children():
			c.queue_free()
		if ids.is_empty():
			var e := Label.new()
			e.text = "身上沒有可以賣的東西"
			e.add_theme_color_override("font_color", Color("9a8a6a"))
			list.add_child(e)
		for i in ids.size():
			var id: String = ids[i]
			var price := item_price(id) if tab == 0 else int(floor(item_price(id) * sell_rate))
			var have := ("　×%d" % bag[id]) if tab == 1 else (("（身上 %d）" % bag[id]) if bag.has(id) else "")
			var row := HBoxContainer.new()
			var nm := Label.new()
			nm.text = "%s%s%s" % ["▶ " if i == cur else "　 ", item_name(id), have]
			nm.size_flags_horizontal = Control.SIZE_EXPAND_FILL
			var pr := Label.new()
			pr.text = "%d 兩" % price
			for l in [nm, pr]:
				l.add_theme_font_size_override("font_size", 17)
				l.add_theme_color_override("font_color", Color("8a2e26") if i == cur else Color("2a2018"))
				row.add_child(l)
			list.add_child(row)
		desc.text = items.get(ids[cur], {}).get("desc", "") if not ids.is_empty() else ""
		foot.text = note if note != "" else "E 買／賣一件　X 離開"
		var k: String = await _key
		if k == "Up" and ids.size() > 0:
			cur = (cur + ids.size() - 1) % ids.size()
		elif k == "Down" and ids.size() > 0:
			cur = (cur + 1) % ids.size()
		elif k == "Left" or k == "Right":
			tab = 1 - tab
			cur = 0
			note = ""
		elif k == "back":
			break
		elif k == "ok" and ids.size() > 0:
			var id: String = ids[cur]
			if tab == 0:
				var p2 := item_price(id)
				if silver < p2:
					note = "銀兩不夠（要 %d 兩）" % p2
				else:
					silver -= p2
					bag[id] = bag.get(id, 0) + 1
					note = "買了一件%s（-%d 兩）" % [item_name(id), p2]
			else:
				var p3 := int(floor(item_price(id) * sell_rate))
				silver += p3
				bag[id] -= 1
				if bag[id] <= 0:
					bag.erase(id)
				note = "賣了一件%s（+%d 兩）" % [item_name(id), p3]
	_close()
