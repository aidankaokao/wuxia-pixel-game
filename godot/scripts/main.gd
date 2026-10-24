extends Node3D
## 試作品的主控：光線與環境（照 G 的時辰、天氣）、換場景（Tab 或左上的按鈕）、鏡頭轉向（Q／R，每次 90 度）、
## 存讀檔（Ctrl／⌘+S 即時存檔、F9 讀取即時存檔；換場景時自動存檔）。開發用：T 過一個時辰、Y 換天氣。
## 場景：青竹村（village）、戰鬥・平地（plain）、戰鬥・河湖（river）、戰鬥・山道（hill）。

const SCENES := [["tianxia", "天下輿圖"], ["world", "大地圖"], ["village", "青竹村"], ["qz_north", "青竹村北"], ["qz_tea", "竹風茶寮"], ["plain", "戰鬥・平地"], ["river", "戰鬥・河湖"], ["hill", "戰鬥・山道"]]
## 光線的四種樣子：太陽的角度、顏色、亮度；天空與環境光；燈籠亮不亮。一天裡照 LIGHT_KEYS 在它們之間漸變
const TIMES := [
	{"name": "清晨", "pitch": -25.0, "sun": Color("ffd8b0"), "e": 1.0, "bg": Color("9fb4c8"), "amb": Color("8a96b0"), "ae": 0.5, "lamp": 0.0},
	{"name": "正午", "pitch": -55.0, "sun": Color("fff4e0"), "e": 1.1, "bg": Color("8fb4d4"), "amb": Color("9aa8bc"), "ae": 0.5, "lamp": 0.0},
	{"name": "黃昏", "pitch": -18.0, "sun": Color("ffa060"), "e": 0.95, "bg": Color("c88a70"), "amb": Color("8a7088"), "ae": 0.5, "lamp": 1.2},
	{"name": "夜晚", "pitch": -40.0, "sun": Color("8aa0e0"), "e": 0.45, "bg": Color("141a2c"), "amb": Color("3a4a78"), "ae": 0.6, "lamp": 2.5},
]

var ui: Ui
var rig: CamRig
var sun: DirectionalLight3D
var env: Environment
var scene: Node3D
## 一天裡的光線：[幾點, TIMES 的哪一種]，兩個點之間平滑漸變
const LIGHT_KEYS := [[0.0, 3], [4.6, 3], [6.0, 0], [9.0, 1], [15.0, 1], [17.6, 2], [19.2, 3], [24.0, 3]]
const WEATHERS := ["clear", "cloudy", "rain", "fog", "snow"]

var scene_id := "village"
## 現在這個場景是用哪個 id、哪些參數進來的（存檔用）
var cur_id := ""
var cur_at := {}
var rain_fx: GPUParticles3D
var snow_fx: GPUParticles3D
var buttons := {}
## 左上的開發用按鈕
var dev_box: Control


func _ready() -> void:
	ui = Ui.new()
	add_child(ui)
	rig = CamRig.new()
	add_child(rig)
	sun = DirectionalLight3D.new()
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 60.0
	sun.rotation_degrees = Vector3(-55, -35, 0)
	add_child(sun)
	var we := WorldEnvironment.new()
	env = Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.tonemap_mode = Environment.TONE_MAPPER_LINEAR
	env.glow_enabled = true
	env.glow_intensity = 0.6
	env.glow_hdr_threshold = 1.2
	env.fog_enabled = false
	env.fog_density = 0.003
	we.environment = env
	add_child(we)
	_rain()
	_snow()
	_panel()
	G.time_changed.connect(apply_time)
	var args := DevShot.args()
	if args.has("time"):
		# 開發用：0 清晨、1 正午、2 黃昏、3 夜晚
		G.time = [24, 48, 72, 88][int(args.time)]
	if args.has("weather"):
		G.weather = args.weather
	apply_time()
	# 帶 --scene 是開發測試：跳過標題，用預設的角色直接進場景
	if args.has("scene"):
		go(args.scene)
	else:
		_title_flow()


## 標題畫面 → 新的遊戲（建立角色）或讀取進度
func _title_flow() -> void:
	_chrome(false)
	while true:
		var r := await Screens.title(ui)
		if r.do == "new":
			var c := await Screens.create(ui)
			if c.is_empty():
				continue
			G.new_game(c)
			_chrome(true)
			go("village")
			return
		G.apply_save(r.data)
		_chrome(true)
		go(r.data.where.scene, r.data.where.at)
		return


## 遊戲中才顯示的東西（左上的狀態、開發用按鈕、下方的操作說明）
func _chrome(on: bool) -> void:
	ui.info.visible = on
	ui.help.visible = on
	dev_box.visible = on


func _rain() -> void:
	rain_fx = GPUParticles3D.new()
	rain_fx.amount = 650
	rain_fx.lifetime = 0.9
	rain_fx.visibility_aabb = AABB(Vector3(-30, -10, -30), Vector3(60, 30, 60))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(16, 0.5, 16)
	pm.direction = Vector3(0.15, -1, 0)
	pm.spread = 2.0
	pm.initial_velocity_min = 16.0
	pm.initial_velocity_max = 18.0
	pm.gravity = Vector3.ZERO
	rain_fx.process_material = pm
	var drop := BoxMesh.new()
	drop.size = Vector3(0.015, 0.45, 0.015)
	var dm := StandardMaterial3D.new()
	dm.albedo_color = Color(0.8, 0.85, 0.95, 0.35)
	dm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	dm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	drop.material = dm
	rain_fx.draw_pass_1 = drop
	rain_fx.position.y = 10
	rig.add_child(rain_fx)


## 雪：白色的小片，慢慢飄
func _snow() -> void:
	snow_fx = GPUParticles3D.new()
	snow_fx.amount = 500
	snow_fx.lifetime = 4.0
	snow_fx.visibility_aabb = AABB(Vector3(-30, -10, -30), Vector3(60, 30, 60))
	var pm := ParticleProcessMaterial.new()
	pm.emission_shape = ParticleProcessMaterial.EMISSION_SHAPE_BOX
	pm.emission_box_extents = Vector3(16, 0.5, 16)
	pm.direction = Vector3(0.2, -1, 0)
	pm.spread = 25.0
	pm.initial_velocity_min = 2.0
	pm.initial_velocity_max = 3.2
	pm.gravity = Vector3.ZERO
	pm.turbulence_enabled = true
	pm.turbulence_noise_strength = 0.6
	snow_fx.process_material = pm
	var flake := BoxMesh.new()
	flake.size = Vector3(0.06, 0.06, 0.06)
	var fm := StandardMaterial3D.new()
	fm.albedo_color = Color(1, 1, 1, 0.9)
	fm.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	fm.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	flake.material = fm
	snow_fx.draw_pass_1 = flake
	snow_fx.position.y = 10
	snow_fx.emitting = false
	rig.add_child(snow_fx)


## 左上：場景、時辰、天氣的按鈕
func _panel() -> void:
	var box := VBoxContainer.new()
	box.position = Vector2(16, 118)
	ui.add_child(box)
	dev_box = box
	var row := HBoxContainer.new()
	box.add_child(row)
	for s in SCENES:
		var b := _button(s[1], go.bind(s[0]))
		buttons[s[0]] = b
		row.add_child(b)
	var row2 := HBoxContainer.new()
	box.add_child(row2)
	row2.add_child(_button("過一個時辰（T）", func() -> void: G.advance(G.KE_PER_SHICHEN)))
	row2.add_child(_button("換天氣（Y）", _next_weather))
	ui.help.text = "方向鍵或 WASD 走路、Shift 跑、空白鍵 交談／確認、Q／R 轉鏡頭、滾輪或 Z／X 拉遠近、X／Esc 人物與武功、Ctrl／⌘+S 即時存檔、F9 讀檔、T 過一個時辰、Y 換天氣、Tab 換場景"


## 開發用：換到下一種天氣
func _next_weather() -> void:
	G.weather = WEATHERS[(WEATHERS.find(G.weather) + 1) % WEATHERS.size()]
	apply_time()


func _button(text: String, f: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", 14)
	b.pressed.connect(f)
	return b


## 出入大地圖：先淡成黑色、換場景、再淡回來（確認的問句在呼叫的地方問）
func travel(id: String, at := {}) -> void:
	await ui.fade_out()
	go(id, at)
	await ui.fade_in()


## 同一個據點裡換場景（村子與村北、進出屋子）：不問，墨暈進來蓋住、換場景、再化開
func hop(id: String, at := {}) -> void:
	if ui.busy():
		return
	await ui.ink_in()
	go(id, at)
	await ui.ink_out()


## 換場景；at 是從哪一格進來（從門口進屋、出門回村）
func go(id: String, at := {}) -> void:
	# 開發用的戰場按鈕：在這種地形打一場斷崖寨嘍囉（打完回到原本的地方）
	if id in ["plain", "river", "hill"]:
		if scene is GridScene and not ui.busy():
			battle("scouts", id)
		return
	scene_id = id
	cur_id = id
	cur_at = at
	if scene:
		scene.queue_free()
	ui.show_hint("", Vector2.ZERO)
	if id == "tianxia":
		var tx := Tianxia.new()
		tx.setup(ui, self)
		scene = tx
	elif id == "world" or id.begins_with("zhou:"):
		# 大地圖：一張張州圖（"zhou:州id"；"world" 是預設的煙州）
		var zat := at.duplicate()
		if id.begins_with("zhou:"):
			zat["zhou"] = id.substr(5)
		var wm := WorldMap.new()
		wm.setup(ui, rig, self, zat)
		scene = wm
		rig.size = 16.0
		rig.size_max = 40.0
	elif id == "village" or id in Village.OUTDOOR:
		var v := Village.new()
		v.setup(ui, rig, self, at)
		v.open("qingzhu" if id == "village" else id)
		scene_id = "village" if id == "qingzhu" else id
		scene = v
		rig.size = 14.0
		rig.size_max = 26.0
	elif id.begins_with("qz_"):
		var r := Room.new()
		r.setup(ui, rig, self, at)
		r.open(id)
		scene = r
		rig.size = 8.0
		rig.size_max = 12.0
	add_child(scene)
	if id.begins_with("zhou:"):
		scene_id = "world"
	if scene.get("data") is Dictionary:
		ui.show_title(scene.get("data").get("name", ""))
	# 走得動的場景，一進來就自動存檔
	if scene is GridScene:
		G.write_save("auto", where())
	for k in buttons:
		buttons[k].modulate = Color("f0c860") if k == scene_id or (k == "village" and scene is Room) else Color.WHITE
	apply_time()


## 戰敗（不是切磋）：被人救回青竹村的老井旁，恢復一半氣血
const DEFEAT := {"map": "village", "at": {"x": 23, "y": 20, "facing": "up"}, "lines": [
	{"text": "……"}, {"text": "你醒來時，已經躺在青竹村的老井旁。"},
	{"speaker": "鍾嬸", "text": "總算醒啦！是路過的好心人把你背回來的。年輕人，別逞強啊。"}]}


## 開戰：從現在的地圖墨暈進六角格戰場，打完結算、回到原地（輸了又不是切磋：送回青竹村）。
## 回傳 "win"／"lose"／"flee"。field 不填就照遭遇戰的背景挑地形
func battle(enc_id: String, field := "") -> String:
	var enc := Fight.encounter(enc_id)
	var back_id := cur_id
	var back_at: Dictionary = where().get("at", cur_at)
	await ui.ink_in()
	if scene:
		scene.queue_free()
	ui.show_hint("", Vector2.ZERO)
	var b := HexBattle.new()
	b.setup(ui, rig, self, enc_id, field)
	scene = b
	scene_id = "battle"
	rig.size = 9.5
	rig.size_max = 14.0
	add_child(b)
	apply_time()
	await ui.ink_out()
	var r: Array = await b.finished
	var result: String = r[0]
	var lines: Array = (r[1] as Fight).settle(G.hero, enc, result)
	var spar: bool = enc.get("spar", false)
	await ui.ink_in()
	var say := []
	if result == "lose" and not spar:
		var d := Hero.derive(G.hero)
		G.hero.hp = maxi(1, d.max_hp / 2)
		go(DEFEAT.map, DEFEAT.at)
		say = DEFEAT.lines
	else:
		if result == "lose":
			G.hero.hp = maxi(1, int(G.hero.hp))
		go(back_id, back_at)
		var head: String = {"win": "打贏了！", "lose": "這一場輸了。", "flee": "你脫身了。"}[result]
		say = [{"text": head + ("\n" + "\n".join(lines) if not lines.is_empty() else "")}]
	await ui.ink_out()
	await ui.say(say)
	return result


## 現在在哪裡（存檔用）：{scene: 場景 id, at: 進場景的參數, name: 地名}；戰鬥中、輿圖上是空的（不能存）
func where() -> Dictionary:
	if not (scene is GridScene):
		return {}
	var gs := scene as GridScene
	return {"scene": cur_id if not (scene is WorldMap) else "zhou:" + str(gs.get("data").id), "at": gs.where_at(), "name": gs.get("data").get("name", "")}


func quick_save() -> void:
	var w := where()
	if w.is_empty():
		ui.toast("這裡不能存檔")
	elif G.write_save("quick", w):
		ui.toast("已即時存檔（%s）" % G.save_summary(G.read_save("quick")))
	else:
		ui.toast("存檔失敗")


func quick_load() -> void:
	var d := G.read_save("quick")
	if d.is_empty():
		ui.toast("還沒有即時存檔")
		return
	var c := await ui.ask({"text": "讀取即時存檔（%s）嗎？\n現在的進度沒存的話就不見了。" % G.save_summary(d)}, ["讀取", "算了"])
	if c == 0:
		await ui.fade_out()
		G.apply_save(d)
		go(d.where.scene, d.where.at)
		await ui.fade_in()


## 光線照 G 的時辰（在 LIGHT_KEYS 之間漸變，太陽的方向跟著時間轉）與天氣
func apply_time() -> void:
	var h := G.hour()
	var k := 0
	while k < LIGHT_KEYS.size() - 2 and h >= LIGHT_KEYS[k + 1][0]:
		k += 1
	var a: Dictionary = TIMES[LIGHT_KEYS[k][1]]
	var b: Dictionary = TIMES[LIGHT_KEYS[k + 1][1]]
	var f := smoothstep(LIGHT_KEYS[k][0], LIGHT_KEYS[k + 1][0], h)
	var w := G.weather
	var dim: float = {"clear": 1.0, "cloudy": 0.55, "rain": 0.6, "fog": 0.7, "snow": 0.75}[w]
	sun.rotation_degrees = Vector3(lerpf(a.pitch, b.pitch, f), -35.0 + clampf(h - 12.0, -7.0, 7.0) * 9.0, 0)
	sun.light_color = (a.sun as Color).lerp(b.sun, f)
	sun.light_energy = lerpf(a.e, b.e, f) * dim
	var bg := (a.bg as Color).lerp(b.bg, f)
	match w:
		"cloudy":
			bg = bg.lerp(Color("8f98a2"), 0.35)
		"rain":
			bg = bg.lerp(Color("8a94a0"), 0.45)
		"fog":
			bg = bg.lerp(Color("b8bec4"), 0.5)
		"snow":
			bg = bg.lerp(Color("c8ccd4"), 0.35)
	env.background_color = bg
	env.ambient_light_color = (a.amb as Color).lerp(b.amb, f)
	env.ambient_light_energy = lerpf(a.ae, b.ae, f) + (0.1 if w != "clear" else 0.0)
	env.fog_light_color = bg
	env.fog_enabled = w in ["rain", "fog", "snow"]
	env.fog_density = 0.015 if w == "fog" else 0.003
	rain_fx.emitting = w == "rain"
	snow_fx.emitting = w == "snow"
	var lamp_e := lerpf(a.lamp, b.lamp, f)
	if scene is GridScene:
		# 屋裡的燈白天也點著（亮度低一些）
		var lamp: float = maxf(lamp_e, 0.8) if scene is Room else lamp_e
		for l in (scene as GridScene).lamps:
			l.light_energy = lamp
		for m in (scene as GridScene).lamp_mats:
			m.emission_energy_multiplier = 0.2 + lamp * 1.2


func _unhandled_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo or ui.busy():
		return
	if e.keycode == KEY_S and (e.ctrl_pressed or e.meta_pressed):
		get_viewport().set_input_as_handled()
		quick_save()
		return
	match e.keycode:
		KEY_F9:
			quick_load()
		KEY_X, KEY_ESCAPE:
			if scene is GridScene:
				get_viewport().set_input_as_handled()
				Screens.menu(ui)
		KEY_TAB:
			var i := 0
			for j in SCENES.size():
				if SCENES[j][0] == scene_id:
					i = j
			go(SCENES[(i + 1) % SCENES.size()][0])
		KEY_T:
			G.advance(G.KE_PER_SHICHEN)
		KEY_Y:
			_next_weather()
		KEY_Q:
			rig.rotate_step(-1)
		KEY_R:
			rig.rotate_step(1)


func _process(_dt: float) -> void:
	var c := G.hero
	var d := Hero.derive(c)
	ui.info.text = "%s　%s\n氣血 %d/%d　內力 %d/%d　體力 %d/%d\n%s" % [c.name, G.status_text(), c.hp, d.max_hp, c.qi, d.max_qi, c.stamina, d.max_stamina,
		scene.info_text() if scene and scene.has_method("info_text") else ""]
