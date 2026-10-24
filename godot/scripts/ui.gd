class_name Ui
extends CanvasLayer
## 文字介面：對話框（一句一句）、選項、商店，以及左上的狀態、畫面下方的操作說明，
## 和面對人或東西時浮在他頭上的互動提示（空白鍵圖示＋動作，例如「交談」）。
## 操作：空白鍵／Enter 確認（E 留給之後別種互動），↑↓ 選擇，←→ 換分頁，X／Esc 關閉。
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

## 物品資料（名稱、分類、說明、價錢、回復、秘笈、服飾…；銀兩與行囊在 G）
var items: Dictionary = {}
static var _items: Dictionary = {}
## 正在輸入框打字：一般的按鍵交給輸入框，只攔上下、Tab、Enter、Esc
var typing := false
var _toast: Label
var _toast_tw: Tween
var _notes: VBoxContainer

var _root: Control
var _box: Control
var _open := false
var info: Label
var help: Label
var _pill: PanelContainer
var _pill_text: Label
var _veil: ColorRect
var _ink: ColorRect
var _ink_tw: Tween
var _transit := false
var _title: Control
var _title_text: Label
var _title_tw: Tween


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
	help = Label.new()
	help.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	help.offset_left = 16
	help.offset_top = -32
	help.add_theme_font_size_override("font_size", 14)
	help.add_theme_color_override("font_color", Color("e8dcc0"))
	help.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.8))
	help.add_theme_constant_override("outline_size", 6)
	_root.add_child(help)
	_make_pill()
	_make_ink()
	items = all_items()


## 互動提示：深色半透明的小圓角框，左邊是空白鍵的鍵帽圖示，右邊是動作
func _make_pill() -> void:
	_pill = PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.09, 0.08, 0.12, 0.8)
	sb.border_color = Color(0.79, 0.64, 0.42, 0.55)
	sb.set_border_width_all(1)
	sb.set_corner_radius_all(12)
	sb.content_margin_left = 6
	sb.content_margin_right = 12
	sb.content_margin_top = 4
	sb.content_margin_bottom = 4
	_pill.add_theme_stylebox_override("panel", sb)
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 7)
	_pill.add_child(row)
	row.add_child(space_key())
	_pill_text = Label.new()
	_pill_text.add_theme_font_size_override("font_size", 16)
	_pill_text.add_theme_color_override("font_color", Color("fbf4e4"))
	row.add_child(_pill_text)
	_pill.visible = false
	_pill.mouse_filter = Control.MOUSE_FILTER_IGNORE
	_root.add_child(_pill)


## 空白鍵的鍵帽：米白色圓角方塊、底下深一點（有厚度），中間畫一個「⎵」
static func space_key() -> Control:
	var key := Panel.new()
	key.custom_minimum_size = Vector2(34, 20)
	key.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color("f4ead6")
	sb.border_color = Color("9a8a6a")
	sb.border_width_bottom = 3
	sb.set_corner_radius_all(4)
	key.add_theme_stylebox_override("panel", sb)
	var mark := Control.new()
	mark.set_anchors_preset(Control.PRESET_FULL_RECT)
	mark.draw.connect(func() -> void:
		var c := Color("4a3a2a")
		mark.draw_polyline(PackedVector2Array([Vector2(9, 7), Vector2(9, 11), Vector2(25, 11), Vector2(25, 7)]), c, 2.0))
	key.add_child(mark)
	return key


## 轉場：整個畫面淡成黑色（遮住換場景時那一下停頓），回傳時已經全黑
func fade_out(sec := 0.25) -> void:
	if _veil == null:
		_veil = ColorRect.new()
		_veil.color = Color(0.05, 0.04, 0.07, 0.0)
		_veil.set_anchors_preset(Control.PRESET_FULL_RECT)
		_veil.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_veil)
	var tw := create_tween()
	tw.tween_property(_veil, "color:a", 1.0, sec)
	await tw.finished


## 從黑色淡回來
func fade_in(sec := 0.35) -> void:
	if _veil == null:
		return
	# 多等兩格畫面，讓新場景蓋好、畫出來
	await get_tree().process_frame
	await get_tree().process_frame
	var tw := create_tween()
	tw.tween_property(_veil, "color:a", 0.0, sec)
	await tw.finished


## 同一個據點裡換場景（村子與村北、進出屋子）：墨從畫面四周往中間暈進來，整個蓋住後才換場景，
## 換場景那一下停頓藏在墨裡；換好後墨再從中間往外化開（ink_out）
func ink_in(sec := 0.45) -> void:
	show_hint("", Vector2.ZERO)
	_transit = true
	# 墨蓋在所有字與按鈕上面；上一個地名先收起來
	move_child(_ink, -1)
	if _title_tw:
		_title_tw.kill()
		var tw := create_tween()
		tw.tween_property(_title, "modulate:a", 0.0, sec * 0.6)
	_ink_tween(1.0, sec, Tween.EASE_IN)
	await _ink_tw.finished


func ink_out(sec := 0.75) -> void:
	# 多等幾格畫面，讓新場景蓋好、鏡頭就位
	for i in 3:
		await get_tree().process_frame
	_ink_tween(0.0, sec, Tween.EASE_OUT)
	await _ink_tw.finished
	_transit = false


func _ink_tween(to: float, sec: float, ease: Tween.EaseType) -> void:
	if _ink_tw:
		_ink_tw.kill()
	_ink_tw = create_tween()
	_ink_tw.tween_property(_ink.material, "shader_parameter/t", to, sec).set_ease(ease).set_trans(Tween.TRANS_SINE)


## 墨的那一層：一開始就建好、一直畫著（全透明），第一次轉場才不會因為編譯著色器而頓一下
func _make_ink() -> void:
	_ink = ColorRect.new()
	_ink.set_anchors_preset(Control.PRESET_FULL_RECT)
	_ink.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var m := ShaderMaterial.new()
	m.shader = preload("res://shaders/dissolve.gdshader")
	var nz := NoiseTexture2D.new()
	nz.width = 256
	nz.height = 256
	nz.seamless = true
	var fn := FastNoiseLite.new()
	fn.frequency = 0.012
	fn.fractal_octaves = 4
	nz.noise = fn
	m.set_shader_parameter("noise", nz)
	m.set_shader_parameter("t", 0.0)
	_ink.material = m
	add_child(_ink)


## 做事的過場：畫面中間一條深色帶子寫著正在做什麼（例如「打水中……」），停一下再收起來
func caption(text: String, sec := 1.2) -> void:
	var band := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.06, 0.05, 0.08, 0.78)
	sb.content_margin_top = 14
	sb.content_margin_bottom = 14
	band.add_theme_stylebox_override("panel", sb)
	band.anchor_left = 0.0
	band.anchor_right = 1.0
	band.anchor_top = 0.5
	band.anchor_bottom = 0.5
	band.grow_vertical = Control.GROW_DIRECTION_BOTH
	band.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var lb := Label.new()
	lb.text = text
	lb.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	lb.add_theme_font_override("font", font())
	lb.add_theme_font_size_override("font_size", 22)
	lb.add_theme_color_override("font_color", Color("f6ecd4"))
	band.add_child(lb)
	add_child(band)
	band.modulate.a = 0.0
	var tw := create_tween()
	tw.tween_property(band, "modulate:a", 1.0, 0.25)
	tw.tween_interval(sec)
	tw.tween_property(band, "modulate:a", 0.0, 0.3)
	await tw.finished
	band.queue_free()


## 畫面下方中間冒一行小字，過一下就淡掉（存檔成功之類的提示）
func toast(text: String) -> void:
	if _toast == null:
		_toast = Label.new()
		_toast.set_anchors_preset(Control.PRESET_CENTER_BOTTOM)
		_toast.offset_top = -96
		_toast.grow_horizontal = Control.GROW_DIRECTION_BOTH
		_toast.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_toast.add_theme_font_override("font", font())
		_toast.add_theme_font_size_override("font_size", 17)
		_toast.add_theme_color_override("font_color", Color("f6ecd4"))
		_toast.add_theme_color_override("font_outline_color", Color(0, 0, 0, 0.85))
		_toast.add_theme_constant_override("outline_size", 7)
		_toast.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_toast)
	_toast.text = text
	if _toast_tw:
		_toast_tw.kill()
	_toast.modulate.a = 1.0
	_toast_tw = create_tween()
	_toast_tw.tween_interval(1.8)
	_toast_tw.tween_property(_toast, "modulate:a", 0.0, 0.6)


## 右上角的通知：一張小紙條從右邊滑進來，停一下就滑出去（使用了物品、裝備武功這類「剛剛做了什麼」）；可以疊好幾張
func notify(text: String, color := Color("e8c870")) -> void:
	if _notes == null:
		_notes = VBoxContainer.new()
		_notes.set_anchors_preset(Control.PRESET_TOP_RIGHT)
		_notes.position = Vector2(-360, 70)
		_notes.custom_minimum_size = Vector2(340, 0)
		_notes.add_theme_constant_override("separation", 6)
		_notes.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_notes)
	# 外層只佔位置，裡面的紙條自己滑動
	var slot := Control.new()
	slot.custom_minimum_size = Vector2(340, 40)
	slot.mouse_filter = Control.MOUSE_FILTER_IGNORE
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = Color(0.09, 0.08, 0.12, 0.92)
	sb.border_color = color
	sb.border_width_left = 4
	sb.set_corner_radius_all(4)
	sb.content_margin_left = 14
	sb.content_margin_right = 14
	sb.content_margin_top = 8
	sb.content_margin_bottom = 8
	p.add_theme_stylebox_override("panel", sb)
	p.custom_minimum_size = Vector2(340, 40)
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font", font())
	l.add_theme_font_size_override("font_size", 15)
	l.add_theme_color_override("font_color", Color("f4ead6"))
	l.autowrap_mode = TextServer.AUTOWRAP_ARBITRARY
	l.custom_minimum_size = Vector2(300, 0)
	p.add_child(l)
	slot.add_child(p)
	_notes.add_child(slot)
	while _notes.get_child_count() > 4:
		var old := _notes.get_child(0)
		_notes.remove_child(old)
		old.queue_free()
	p.position.x = 380
	var tw := p.create_tween()
	tw.tween_property(p, "position:x", 0.0, 0.22).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	tw.tween_interval(2.0)
	tw.tween_property(p, "position:x", 380.0, 0.25).set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_IN)
	tw.tween_callback(slot.queue_free)
	# 紙條變高時（字多換行）外層跟著撐開
	await get_tree().process_frame
	if is_instance_valid(slot):
		slot.custom_minimum_size.y = p.size.y


## 到了新場景，畫面上方漸漸浮出地名，停一下再淡掉
func show_title(text: String) -> void:
	if _title == null:
		_title = Control.new()
		_title.set_anchors_preset(Control.PRESET_TOP_WIDE)
		_title.offset_top = 34
		_title.offset_bottom = 90
		_title.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(_title)
		var row := HBoxContainer.new()
		row.set_anchors_preset(Control.PRESET_FULL_RECT)
		row.alignment = BoxContainer.ALIGNMENT_CENTER
		row.add_theme_constant_override("separation", 18)
		row.mouse_filter = Control.MOUSE_FILTER_IGNORE
		_title.add_child(row)
		row.add_child(_title_rule(true))
		_title_text = Label.new()
		_title_text.add_theme_font_override("font", font())
		_title_text.add_theme_font_size_override("font_size", 30)
		_title_text.add_theme_color_override("font_color", Color("f6ecd4"))
		_title_text.add_theme_color_override("font_outline_color", Color(0.1, 0.07, 0.05, 0.85))
		_title_text.add_theme_constant_override("outline_size", 8)
		_title_text.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.35))
		_title_text.add_theme_constant_override("shadow_offset_y", 3)
		row.add_child(_title_text)
		row.add_child(_title_rule(false))
	# 字與字之間空一點，比較像匾額
	_title_text.text = " ".join(text.split(""))
	if _title_tw:
		_title_tw.kill()
	# 永遠在轉場的黑幕、定格畫面上面
	move_child(_title, -1)
	_title.modulate.a = 0.0
	_title.position.y = 8.0
	_title_tw = create_tween()
	_title_tw.tween_interval(0.35)
	_title_tw.tween_property(_title, "modulate:a", 1.0, 0.6)
	_title_tw.parallel().tween_property(_title, "position:y", 0.0, 0.6).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
	_title_tw.tween_interval(1.6)
	_title_tw.tween_property(_title, "modulate:a", 0.0, 0.9)


## 地名兩旁的金色細線：靠字的一端是一顆小菱形
func _title_rule(left: bool) -> Control:
	var c := Control.new()
	c.custom_minimum_size = Vector2(90, 10)
	c.size_flags_vertical = Control.SIZE_SHRINK_CENTER
	c.mouse_filter = Control.MOUSE_FILTER_IGNORE
	c.draw.connect(func() -> void:
		var g := Color(GOLD, 0.9)
		var y := 5.0
		var tip := 84.0 if left else 6.0
		var far := 0.0 if left else 90.0
		for i in 6:
			# 越往外越淡
			var a := lerpf(far, tip, i / 6.0)
			var b := lerpf(far, tip, (i + 1) / 6.0)
			c.draw_line(Vector2(a, y), Vector2(b, y), Color(g, g.a * (i + 1) / 6.0), 1.5)
		c.draw_colored_polygon(PackedVector2Array([Vector2(tip, y - 4), Vector2(tip + 4, y), Vector2(tip, y + 4), Vector2(tip - 4, y)]), g))
	return c


## 在畫面上某一點（通常是人物頭上）顯示互動提示；text 空字串就收起來
func show_hint(text: String, at: Vector2) -> void:
	_pill.visible = text != "" and not _open
	if not _pill.visible:
		return
	_pill_text.text = text
	_pill.reset_size()
	_pill.position = (at - Vector2(_pill.size.x / 2.0, _pill.size.y)).round()


## 物品資料表（data/items.json，讀一次）
static func all_items() -> Dictionary:
	if _items.is_empty():
		var f := FileAccess.open("res://data/items.json", FileAccess.READ)
		_items = JSON.parse_string(f.get_as_text())
	return _items


static func item_def(id: String) -> Dictionary:
	return all_items().get(id, {})


func busy() -> bool:
	return _open or _transit or Story.running > 0


func _input(e: InputEvent) -> void:
	if not _open or not (e is InputEventKey) or not e.pressed or e.echo:
		return
	var k: String = OS.get_keycode_string(e.keycode)
	if typing and not k in ["Up", "Down", "Tab", "Enter", "Kp Enter", "Escape"]:
		return
	if k in ["Space", "Enter", "Kp Enter"]:
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


## 一句一句說：lines 是 [{speaker, text}]。字一個一個冒出來；還沒出完按空白鍵整句出現，出完了再按才是下一句
func say(lines: Array) -> void:
	for l in lines:
		var v := _dialog(l.get("speaker", ""))
		var t := _text(l.get("text", ""))
		v.add_child(t)
		var more := _more_mark(v)
		await _type(t)
		_blink(more)
		while true:
			var k: String = await _key
			if k == "ok" or k == "back":
				break
	_close()


## 每秒出幾個字
const TYPE_SPEED := 45.0


## 讓一行字逐字出現；途中按空白鍵（或 X）就整句出現
func _type(l: Label) -> void:
	var n := l.get_total_character_count()
	var skip := [false]
	var on_key := func(k: String) -> void:
		if k == "ok" or k == "back":
			skip[0] = true
	_key.connect(on_key)
	var t := 0.0
	l.visible_characters = 0
	while not skip[0] and l.visible_characters < n and is_instance_valid(l):
		await get_tree().process_frame
		t += get_process_delta_time()
		l.visible_characters = mini(n, int(t * TYPE_SPEED))
	_key.disconnect(on_key)
	if is_instance_valid(l):
		l.visible_characters = -1


## 對話框右下角的 ▼（整句出完才亮、一閃一閃）
func _more_mark(v: VBoxContainer) -> Label:
	var m := Label.new()
	m.text = "▼"
	m.horizontal_alignment = HORIZONTAL_ALIGNMENT_RIGHT
	m.add_theme_font_size_override("font_size", 13)
	m.add_theme_color_override("font_color", GOLD)
	m.modulate.a = 0.0
	v.add_child(m)
	return m


func _blink(m: Label) -> void:
	var tw := m.create_tween().set_loops()
	tw.tween_property(m, "modulate:a", 1.0, 0.35)
	tw.tween_property(m, "modulate:a", 0.25, 0.45)


## 問一句、選一個（回傳第幾個；X 等於選最後一個）
func ask(prompt: Dictionary, options: Array) -> int:
	var cur := 0
	var v := _dialog(prompt.get("speaker", ""))
	var q := _text(prompt.get("text", ""))
	v.add_child(q)
	var rows: Array[Label] = []
	for o in options:
		var r := _text(o, 18)
		r.modulate.a = 0.0
		v.add_child(r)
		rows.append(r)
	# 選項多的時候對話框往上長（不要超出畫面下緣）
	await get_tree().process_frame
	var panel := v.get_parent() as Control
	if panel and panel.size.y > 120:
		(panel.get_parent() as Control).position.y -= panel.size.y - 120
	# 問題先逐字出完，選項才出現
	await _type(q)
	for r in rows:
		r.modulate.a = 1.0
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
## discount 是買東西的折扣（熟客）；回傳這次一共買賣了多少兩（人際系統算交情用）
## buys：只收這些東西（空的是什麼都收）
func shop(title: String, stock: Array, sell_rate := 0.5, discount := 0.0, buys: Array = []) -> int:
	var moved := 0
	var buy_price := func(id: String) -> int: return int(ceil(item_price(id) * (1.0 - discount)))
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
		var ids: Array = stock if tab == 0 else G.bag.keys().filter(func(k): return G.bag[k] > 0 and (buys.is_empty() or k in buys))
		cur = clampi(cur, 0, max(0, ids.size() - 1))
		head.text = "%s　　　銀兩 %d%s" % [title, G.silver, ("　　熟客 %d 折" % roundi((1.0 - discount) * 10)) if discount > 0 else ""]
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
			var price: int = buy_price.call(id) if tab == 0 else int(floor(item_price(id) * sell_rate))
			var have := ("　×%d" % G.bag[id]) if tab == 1 else (("（身上 %d）" % G.bag[id]) if G.bag.has(id) else "")
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
		foot.text = note if note != "" else "空白鍵 買／賣一件　X 離開"
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
				var p2: int = buy_price.call(id)
				if G.silver < p2:
					note = "銀兩不夠（要 %d 兩）" % p2
				else:
					G.silver -= p2
					G.bag[id] = G.bag.get(id, 0) + 1
					moved += p2
					note = "買了一件%s（-%d 兩）" % [item_name(id), p2]
			else:
				var p3 := int(floor(item_price(id) * sell_rate))
				G.silver += p3
				G.bag[id] -= 1
				if G.bag[id] <= 0:
					G.bag.erase(id)
				moved += p3
				note = "賣了一件%s（+%d 兩）" % [item_name(id), p3]
	_close()
	return moved
