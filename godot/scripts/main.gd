extends Node3D
## 試作品的主控：光線與環境、時辰（T）、天氣（Y）、換場景（Tab 或左上的按鈕）、鏡頭轉向（Q／R，每次 90 度）。
## 場景：青竹村（village）、戰鬥・平地（plain）、戰鬥・河湖（river）、戰鬥・山道（hill）。

const SCENES := [["village", "青竹村"], ["qz_north", "青竹村北"], ["qz_tea", "竹風茶寮"], ["plain", "戰鬥・平地"], ["river", "戰鬥・河湖"], ["hill", "戰鬥・山道"]]
## 時辰：太陽的角度、顏色、亮度；天空與環境光；燈籠亮不亮
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
var scene_id := "village"
var time_i := 1
var rain := false
var rain_fx: GPUParticles3D
var buttons := {}


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
	_panel()
	var args := DevShot.args()
	if args.has("scene"):
		scene_id = args.scene
	if args.has("time"):
		time_i = int(args.time)
	if args.has("weather"):
		rain = args.weather == "rain"
	go(scene_id)
	apply_time()


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


## 左上：場景、時辰、天氣的按鈕
func _panel() -> void:
	var box := VBoxContainer.new()
	box.position = Vector2(16, 96)
	ui.add_child(box)
	var row := HBoxContainer.new()
	box.add_child(row)
	for s in SCENES:
		var b := _button(s[1], go.bind(s[0]))
		buttons[s[0]] = b
		row.add_child(b)
	var row2 := HBoxContainer.new()
	box.add_child(row2)
	row2.add_child(_button("時辰（T）", func() -> void:
		time_i = (time_i + 1) % TIMES.size()
		apply_time()))
	row2.add_child(_button("天氣（Y）", func() -> void:
		rain = not rain
		apply_time()))
	ui.help.text = "方向鍵或 WASD 走路、Shift 跑、空白鍵 交談／確認、Q／R 轉鏡頭（每次 90 度）、滾輪或 Z／X 拉遠近、T 時辰、Y 下雨、Tab 換場景；戰鬥用滑鼠點"


func _button(text: String, f: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.focus_mode = Control.FOCUS_NONE
	b.add_theme_font_size_override("font_size", 14)
	b.pressed.connect(f)
	return b


## 換場景；at 是從哪一格進來（從門口進屋、出門回村）
func go(id: String, at := {}) -> void:
	scene_id = id
	if scene:
		scene.queue_free()
	ui.show_hint("", Vector2.ZERO)
	if id == "village" or id in Village.OUTDOOR:
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
	else:
		var b := HexBattle.new()
		b.setup(ui, rig, id)
		scene = b
		rig.size = 9.5
		rig.size_max = 14.0
	add_child(scene)
	for k in buttons:
		buttons[k].modulate = Color("f0c860") if k == scene_id or (k == "village" and scene is Room) else Color.WHITE
	apply_time()


func apply_time() -> void:
	var t: Dictionary = TIMES[time_i]
	var wet := 0.7 if rain else 1.0
	sun.rotation_degrees = Vector3(t.pitch, -35, 0)
	sun.light_color = t.sun
	sun.light_energy = t.e * wet
	env.background_color = t.bg.lerp(Color("8a94a0"), 0.4) if rain else t.bg
	env.ambient_light_color = t.amb
	env.ambient_light_energy = t.ae
	env.fog_light_color = env.background_color
	env.fog_enabled = rain
	rain_fx.emitting = rain
	if scene is GridScene:
		# 屋裡的燈白天也點著（亮度低一些）
		var lamp: float = maxf(t.lamp, 0.8) if scene is Room else t.lamp
		for l in (scene as GridScene).lamps:
			l.light_energy = lamp
		for m in (scene as GridScene).lamp_mats:
			m.emission_energy_multiplier = 0.2 + lamp * 1.2


func _unhandled_input(e: InputEvent) -> void:
	if not (e is InputEventKey) or not e.pressed or e.echo or ui.busy():
		return
	match e.keycode:
		KEY_TAB:
			var i := 0
			for j in SCENES.size():
				if SCENES[j][0] == scene_id:
					i = j
			go(SCENES[(i + 1) % SCENES.size()][0])
		KEY_T:
			time_i = (time_i + 1) % TIMES.size()
			apply_time()
		KEY_Y:
			rain = not rain
			apply_time()
		KEY_Q:
			rig.rotate_step(-1)
		KEY_R:
			rig.rotate_step(1)


func _process(_dt: float) -> void:
	var t: Dictionary = TIMES[time_i]
	ui.info.text = "%s\n%s・%s" % [scene.info_text() if scene and scene.has_method("info_text") else "", t.name, "雨" if rain else "晴"]
