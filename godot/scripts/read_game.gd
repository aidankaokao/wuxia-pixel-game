class_name ReadGame
extends Control
## 研讀的小遊戲「循著筆意」：拓本似的黑底，一排淡白的字（碑文、秘笈的口訣），一個字一拍。
## 每個字底下有一條筆路，一點墨在上面來回走，淡金色的一段是這個字的筆意；墨點走進去時按空白鍵：
## 正中央是「妙」（3 點）、在筆意裡是「通」（2 點）、沒按準是「滯」（0 點）。一個字只按一次，越後面墨走得越快一點。
## 悟性高，筆意那一段寬一點。全部按完攤開結果，回傳 {exp, max, perfect, good, miss}。
## 用法：var r := await ReadGame.play(ui, "竹林石碑", "竹影搖風劍意自生")

signal _done

const PAPER := Color("17151b")
const PALE := Color("e8e0cc")
const FAINT := Color(0.9, 0.86, 0.78, 0.22)
const GOLD := Color("e0b860")
const MISS := Color("8a5a52")
const W := 820.0
const TRACK := 600.0
## 每一拍：墨點從一頭走到另一頭要幾秒（第一個字），之後每字快一點，最快幾秒
const SWEEP := 1.25
const SWEEP_STEP := 0.05
const SWEEP_MIN := 0.75
const SCORE := {"perfect": 3, "good": 2, "miss": 0}
## 開發自動化（dev_shot 的 readbot）：自己玩，"perfect" 每字都按在正中央、"good" 按在筆意邊上；開頭與結尾也不等空白鍵
static var bot := ""

var ui: Ui
var chars: Array = []
var cells: Array[Label] = []
var idx := -1
var pos := 0.0
var dir := 1.0
var sweep := SWEEP
var zone := Vector2(0.4, 0.6)
var zone_w := 0.24
var running := false
var result := {"exp": 0, "max": 0, "perfect": 0, "good": 0, "miss": 0}

var track: Control
var zone_rect: ColorRect
var core_rect: ColorRect
var dot: ColorRect
var flash: Label
var score_lab: Label
var tip: Label


static func play(u: Ui, title: String, text: String) -> Dictionary:
	var g := ReadGame.new()
	g.ui = u
	for ch in text:
		if not ch in "，。、；：「」 ":
			g.chars.append(ch)
	g.result.max = g.chars.size() * SCORE.perfect
	# 悟性 15 左右筆意約四分之一條；最寬三分之一
	g.zone_w = clampf(0.18 + Hero.attrs(G.hero).insight * 0.004, 0.18, 0.34)
	g._build(title)
	u._show(g)
	await g._run()
	u._close()
	return g.result


func _lab(t: String, size: int, col: Color) -> Label:
	var l := Label.new()
	l.text = t
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func _build(title: String) -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var dim := ColorRect.new()
	dim.color = Color(0, 0, 0, 0.45)
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(dim)
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = PAPER
	sb.border_color = Color("6a5a40")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(4)
	sb.set_content_margin_all(24)
	sb.shadow_color = Color(0, 0, 0, 0.5)
	sb.shadow_size = 10
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(W, 0)
	p.position = Vector2(-W / 2.0, -210)
	add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 14)
	p.add_child(v)
	v.add_child(_lab(title, 24, GOLD))
	# 一排字：沒讀到的淡淡的，讀過的照結果上色
	var row := HBoxContainer.new()
	row.alignment = BoxContainer.ALIGNMENT_CENTER
	row.add_theme_constant_override("separation", 10 if chars.size() <= 10 else 4)
	v.add_child(row)
	var size := 46 if chars.size() <= 10 else 38
	for ch in chars:
		var c := _lab(ch, size, FAINT)
		c.custom_minimum_size = Vector2(size + 8, size + 16)
		c.pivot_offset = Vector2((size + 8) / 2.0, (size + 16) / 2.0)
		row.add_child(c)
		cells.append(c)
	# 筆路：一條淡線、一段淡金色的筆意（中間更亮的是「妙」）、一點墨
	var holder := CenterContainer.new()
	holder.custom_minimum_size = Vector2(0, 46)
	v.add_child(holder)
	track = Control.new()
	track.custom_minimum_size = Vector2(TRACK, 30)
	holder.add_child(track)
	var line := ColorRect.new()
	line.color = Color(0.9, 0.86, 0.78, 0.18)
	line.position = Vector2(0, 13)
	line.size = Vector2(TRACK, 4)
	track.add_child(line)
	zone_rect = ColorRect.new()
	zone_rect.color = Color(0.88, 0.72, 0.38, 0.35)
	track.add_child(zone_rect)
	core_rect = ColorRect.new()
	core_rect.color = Color(0.95, 0.8, 0.45, 0.75)
	track.add_child(core_rect)
	dot = ColorRect.new()
	dot.color = Color("f4ead6")
	dot.size = Vector2(12, 30)
	track.add_child(dot)
	flash = _lab("", 26, GOLD)
	flash.position = Vector2(TRACK / 2.0 - 60, -40)
	flash.size = Vector2(120, 34)
	track.add_child(flash)
	score_lab = _lab("", 16, Color(0.9, 0.86, 0.78, 0.7))
	v.add_child(score_lab)
	tip = _lab("墨點走進淡金色的筆意時按空白鍵，正中央最亮的一段是「妙」。\n一個字只按一次。按空白鍵開始。", 16, PALE)
	v.add_child(tip)
	zone_rect.visible = false
	core_rect.visible = false
	dot.visible = false
	_score()


func _score() -> void:
	score_lab.text = "妙 %d　通 %d　滯 %d　　參悟 %d／%d" % [result.perfect, result.good, result.miss, result.exp, result.max]


func _run() -> void:
	await _wait_ok()
	tip.text = ""
	zone_rect.visible = true
	core_rect.visible = true
	dot.visible = true
	ui._key.connect(_on_key)
	_next()
	await _done
	ui._key.disconnect(_on_key)
	running = false
	await get_tree().create_timer(0.5).timeout
	var grade := "一氣呵成，筆意盡在心中。" if result.miss == 0 and result.perfect * 2 >= chars.size() else ("大致看懂了，還有幾處滯澀。" if result.exp * 2 >= result.max else "似懂非懂，還得多看幾遍。")
	tip.text = "%s\n（空白鍵繼續）" % grade
	zone_rect.visible = false
	core_rect.visible = false
	dot.visible = false
	await _wait_ok()


func _wait_ok() -> void:
	if bot != "":
		await get_tree().create_timer(0.3).timeout
		return
	while true:
		var k: String = await ui._key
		if k == "ok":
			return


## 下一個字：筆意換個位置，墨點從左邊重新走
func _next() -> void:
	idx += 1
	if idx >= chars.size():
		_done.emit()
		return
	# 正在讀的字：白字金邊、放大一點
	var c := cells[idx]
	c.add_theme_color_override("font_color", Color.WHITE)
	c.add_theme_color_override("font_outline_color", GOLD)
	c.add_theme_constant_override("outline_size", 6)
	c.scale = Vector2(1.25, 1.25)
	sweep = maxf(SWEEP_MIN, SWEEP - SWEEP_STEP * idx)
	var a := 0.12 + randf() * (0.88 - zone_w - 0.12)
	zone = Vector2(a, a + zone_w)
	zone_rect.position = Vector2(zone.x * TRACK, 5)
	zone_rect.size = Vector2(zone_w * TRACK, 20)
	var cw := zone_w * 0.36
	var mid := (zone.x + zone.y) / 2.0
	core_rect.position = Vector2((mid - cw / 2.0) * TRACK, 3)
	core_rect.size = Vector2(cw * TRACK, 24)
	pos = 0.0
	dir = 1.0
	running = true


func _process(delta: float) -> void:
	if not running:
		return
	pos += dir * delta / sweep
	if pos >= 1.0:
		pos = 1.0
		dir = -1.0
	elif pos <= 0.0:
		pos = 0.0
		dir = 1.0
	dot.position = Vector2(pos * TRACK - dot.size.x / 2.0, 0)
	if bot != "":
		var aim := (zone.x + zone.y) / 2.0 if bot == "perfect" else zone.x + zone_w * 0.1
		if absf(pos - aim) < 0.01:
			_on_key("ok")


func _on_key(k: String) -> void:
	if k != "ok" or not running:
		return
	running = false
	var mid := (zone.x + zone.y) / 2.0
	var kind := "miss"
	# 墨點本身有寬度：判定放寬半個墨點
	var slack := dot.size.x / 2.0 / TRACK
	if absf(pos - mid) <= zone_w * 0.18 + slack:
		kind = "perfect"
	elif pos >= zone.x - slack and pos <= zone.y + slack:
		kind = "good"
	result[kind] += 1
	result.exp += SCORE[kind]
	_score()
	var c := cells[idx]
	c.scale = Vector2.ONE
	c.add_theme_constant_override("outline_size", 0)
	c.add_theme_color_override("font_color", GOLD if kind == "perfect" else (PALE.darkened(0.15) if kind == "good" else MISS))
	flash.text = {"perfect": "妙！", "good": "通", "miss": "滯"}[kind]
	flash.add_theme_color_override("font_color", GOLD if kind == "perfect" else (PALE if kind == "good" else MISS))
	flash.position.x = pos * TRACK - 60
	flash.modulate.a = 1.0
	var tw := flash.create_tween()
	tw.tween_property(flash, "modulate:a", 0.0, 0.5).set_delay(0.15)
	var pop := c.create_tween()
	c.scale = Vector2(1.3, 1.3) if kind == "perfect" else Vector2.ONE
	pop.tween_property(c, "scale", Vector2.ONE, 0.25)
	await get_tree().create_timer(0.4).timeout
	_next()
