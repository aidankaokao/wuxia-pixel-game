class_name FishGame
extends Control
## 釣魚的小遊戲「起竿」（照網頁版 FishingGame 的意思重做）：一竿分兩段。
## 一、等咬鉤：浮標在水面上輕輕晃，過一會兒忽然往下一沉、冒出「！」——這時按空白鍵提竿（沉下去之前就按是太早，魚嚇跑了；
##     沉下去太久沒按，魚吐鉤跑了）。
## 二、收線：一條線上紅色的一段是魚鬆勁的時候，指針來回擺，進了紅區按空白鍵收線：正中央「漂亮」、紅區裡「釣起」、沒按準「跑了」。
##     魚越難纏（fight）紅區越窄、指針越快；釣魚手藝越好紅區越寬、指針越慢。
## 回傳 "perfect"／"ok"／"miss"。用法：var r := await FishGame.play(ui, 魚, 釣魚等級)

signal _done

const WATER := Color("16303e")
const PALE := Color("e8e0cc")
const RED := Color("d0503a")
const GOLD := Color("e0b860")
const W := 620.0
const TRACK := 480.0
## 咬鉤之後幾秒內要提竿
const BITE_WINDOW := 0.9
## 開發自動化（dev_shot 的 fishbot）："perfect" 每次都按在最好的時候、"ok" 按在紅區邊上、"late" 提竿太晚
static var bot := ""

var ui: Ui
var phase := "intro"
var t := 0.0
var bite_at := 2.0
var zone := Vector2(0.4, 0.6)
var zone_w := 0.3
var sweep := 0.6
var pos := 0.0
var dir := 1.0
var result := "miss"

var bobber: Label
var bang: Label
var track: Control
var zone_rect: ColorRect
var core_rect: ColorRect
var needle: ColorRect
var tip: Label


static func play(u: Ui, fish: Dictionary, level: int) -> String:
	var g := FishGame.new()
	g.ui = u
	var fight := int(fish.get("fight", 0))
	g.zone_w = maxf(0.12, 0.34 - fight * 0.06 + level * 0.015)
	# 指針從一頭擺到另一頭要幾秒：魚越難纏越快
	g.sweep = clampf(0.75 / (0.9 + fight * 0.35 - level * 0.03), 0.35, 1.0)
	g.bite_at = 1.2 + randf() * 2.3
	g._build()
	u._show(g)
	await g._run()
	u._close()
	return g.result


func _lab(text: String, size: int, col: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_color", col)
	l.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	return l


func _build() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	var p := PanelContainer.new()
	var sb := StyleBoxFlat.new()
	sb.bg_color = WATER
	sb.border_color = Color("5a7a88")
	sb.set_border_width_all(2)
	sb.set_corner_radius_all(6)
	sb.set_content_margin_all(22)
	sb.shadow_color = Color(0, 0, 0, 0.45)
	sb.shadow_size = 8
	p.add_theme_stylebox_override("panel", sb)
	p.set_anchors_preset(Control.PRESET_CENTER)
	p.custom_minimum_size = Vector2(W, 0)
	p.position = Vector2(-W / 2.0, -170)
	add_child(p)
	var v := VBoxContainer.new()
	v.add_theme_constant_override("separation", 12)
	p.add_child(v)
	# 水面與浮標
	var water := Control.new()
	water.custom_minimum_size = Vector2(0, 70)
	v.add_child(water)
	for i in 3:
		var ripple := ColorRect.new()
		ripple.color = Color(1, 1, 1, 0.08)
		ripple.position = Vector2(80 + i * 150, 44 + (i % 2) * 8)
		ripple.size = Vector2(90, 2)
		water.add_child(ripple)
	bobber = _lab("●", 26, RED)
	bobber.position = Vector2(W / 2.0 - 40, 18)
	bobber.size = Vector2(36, 34)
	water.add_child(bobber)
	bang = _lab("！", 34, GOLD)
	bang.position = Vector2(W / 2.0 - 40, -14)
	bang.size = Vector2(36, 40)
	bang.visible = false
	water.add_child(bang)
	# 收線的那一條
	var holder := CenterContainer.new()
	holder.custom_minimum_size = Vector2(0, 34)
	v.add_child(holder)
	track = Control.new()
	track.custom_minimum_size = Vector2(TRACK, 26)
	holder.add_child(track)
	var line := ColorRect.new()
	line.color = Color(1, 1, 1, 0.18)
	line.position = Vector2(0, 11)
	line.size = Vector2(TRACK, 4)
	track.add_child(line)
	zone_rect = ColorRect.new()
	zone_rect.color = Color(RED, 0.45)
	track.add_child(zone_rect)
	core_rect = ColorRect.new()
	core_rect.color = Color(RED, 0.9)
	track.add_child(core_rect)
	needle = ColorRect.new()
	needle.color = PALE
	needle.size = Vector2(8, 26)
	track.add_child(needle)
	track.modulate.a = 0.25
	tip = _lab("浮標一沉、冒出「！」就按空白鍵提竿；\n收線時指針進了紅色那一段再按，正中央最好。按空白鍵甩竿。", 16, PALE)
	v.add_child(tip)


func _run() -> void:
	if bot == "":
		while await ui._key != "ok":
			pass
	phase = "wait"
	t = 0.0
	tip.text = "浮標靜靜漂著……"
	ui._key.connect(_on_key)
	await _done
	ui._key.disconnect(_on_key)
	tip.text = {"perfect": "漂亮！一提一收，乾淨俐落。", "ok": "釣起來了！", "miss": tip.text}[result] + "\n（空白鍵繼續）"
	if bot != "":
		await get_tree().create_timer(0.4).timeout
		return
	while await ui._key != "ok":
		pass


func _finish(r: String, why := "") -> void:
	result = r
	phase = "end"
	if why != "":
		tip.text = why
	_done.emit()


func _process(delta: float) -> void:
	t += delta
	match phase:
		"wait":
			bobber.position.y = 18 + sin(t * 3.0) * 2.0
			if t >= bite_at:
				phase = "bite"
				t = 0.0
				bang.visible = true
				bobber.position.y = 30
				tip.text = "咬鉤了！"
		"bite":
			bobber.position.y = 30 + sin(t * 30.0) * 2.0
			if bot != "" and bot != "late" and t > 0.25:
				_on_key("ok")
			elif t > BITE_WINDOW:
				bang.visible = false
				_finish("miss", "魚吐了鉤，溜走了……")
		"reel":
			pos += dir * delta / sweep
			if pos >= 1.0:
				pos = 1.0
				dir = -1.0
			elif pos <= 0.0:
				pos = 0.0
				dir = 1.0
			needle.position.x = pos * TRACK - needle.size.x / 2.0
			bobber.position.x = W / 2.0 - 40 + (pos - 0.5) * 30
			if bot != "":
				var aim := (zone.x + zone.y) / 2.0 if bot == "perfect" else zone.x + zone_w * 0.1
				if absf(pos - aim) < 0.015:
					_on_key("ok")


func _on_key(k: String) -> void:
	if k != "ok":
		return
	match phase:
		"wait":
			_finish("miss", "提得太早，魚被嚇跑了。")
		"bite":
			# 提竿：開始收線
			phase = "reel"
			bang.visible = false
			track.modulate.a = 1.0
			var a := 0.1 + randf() * (0.9 - zone_w - 0.1)
			zone = Vector2(a, a + zone_w)
			zone_rect.position = Vector2(zone.x * TRACK, 3)
			zone_rect.size = Vector2(zone_w * TRACK, 20)
			var cw := zone_w * 0.3
			core_rect.position = Vector2(((zone.x + zone.y) / 2.0 - cw / 2.0) * TRACK, 1)
			core_rect.size = Vector2(cw * TRACK, 24)
			pos = 0.0
			dir = 1.0
			tip.text = "魚在掙！看準了收線——"
		"reel":
			var mid := (zone.x + zone.y) / 2.0
			var slack := needle.size.x / 2.0 / TRACK
			if absf(pos - mid) <= zone_w * 0.15 + slack:
				_finish("perfect")
			elif pos >= zone.x - slack and pos <= zone.y + slack:
				_finish("ok")
			else:
				_finish("miss", "線一鬆，魚掙脫了……")
