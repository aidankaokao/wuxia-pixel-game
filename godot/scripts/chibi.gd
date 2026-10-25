class_name Chibi
extends Node3D
## Q 版小人：大頭、交領長袍、腰帶、髮髻或斗笠；面向 +Z。
## 依網頁版的人物貼圖名（sprite）配色；走路時上下彈、手腳擺動，站著會呼吸、偶爾眨眼。

const LOOKS := {
	"hero": {"robe": "3a5f8a", "trim": "e8dcc0", "sash": "c9a46a", "hair": "2a2228", "style": "topknot", "sword": true},
	"disciple_girl": {"robe": "e8eef2", "trim": "6a8aa8", "sash": "6a8aa8", "hair": "2a2228", "style": "twinbuns", "girl": true},
	"elder": {"robe": "8a6a4a", "trim": "d8c8a8", "sash": "5a4030", "hair": "d8d4cc", "style": "bun", "beard": true},
	"aunt": {"robe": "a85a4a", "trim": "f0e0c8", "sash": "6a3a2a", "hair": "3a2a2a", "style": "bun", "girl": true},
	"farmer": {"robe": "7a8a5a", "trim": "d8c8a0", "sash": "5a4a30", "hair": "2a2228", "style": "hat"},
	"smith": {"robe": "5a4a44", "trim": "a89888", "sash": "3a2a24", "hair": "2a2228", "style": "band", "arms": true},
	"child": {"robe": "c87a4a", "trim": "f0e0c8", "sash": "8a4a2a", "hair": "2a2228", "style": "twinbuns", "small": true},
	"carpenter": {"robe": "9a7a52", "trim": "e0d0b0", "sash": "6a4a2a", "hair": "2a2228", "style": "band"},
	"peddler": {"robe": "6a7a8a", "trim": "e0d8c8", "sash": "c84a3a", "hair": "2a2228", "style": "hat"},
	"girl": {"robe": "d88aa0", "trim": "f8ecec", "sash": "a84a6a", "hair": "2a2228", "style": "long", "girl": true},
	"lady": {"robe": "8a6aa8", "trim": "f0e8f8", "sash": "c9a46a", "hair": "2a2228", "style": "bun", "girl": true},
	"bandit": {"robe": "6a3a2a", "trim": "a87a5a", "sash": "2a2228", "hair": "2a2228", "style": "band", "sword": true, "angry": true},
	"boss": {"robe": "3a2a2a", "trim": "a83a2a", "sash": "c9a46a", "hair": "2a2228", "style": "topknot", "sword": true, "angry": true, "beard": true},
	"storyteller": {"robe": "5a6a7a", "trim": "e8e0cc", "sash": "3a4a5a", "hair": "8a8680", "style": "bun", "beard": true, "fan": true},
	"apprentice": {"robe": "8a6a4a", "trim": "d8c8a8", "sash": "4a3a2a", "hair": "2a2228", "style": "band", "small": false},
	"monk": {"robe": "b8862e", "trim": "e8d8a8", "sash": "8a2e26", "hair": "f2c9a0", "style": "bald"},
	"servant": {"robe": "6a6a6a", "trim": "d8d0c0", "sash": "3a3a3a", "hair": "2a2228", "style": "band"},
	"swordsman": {"robe": "4f7f72", "trim": "e4ece4", "sash": "2a3a3a", "hair": "2a2228", "style": "topknot", "sword": true},
	"scholar": {"robe": "8aa0a8", "trim": "f0ece0", "sash": "4a5a68", "hair": "2a2228", "style": "topknot"},
	"fisher": {"robe": "5a7a7a", "trim": "d8d0b0", "sash": "3a4a4a", "hair": "8a8680", "style": "hat", "beard": true},
	"boatman": {"robe": "4a6a8a", "trim": "d8d8c8", "sash": "2a3a4a", "hair": "2a2228", "style": "band", "arms": true},
	"beggar": {"robe": "8a7a5a", "trim": "a89878", "sash": "5a4a3a", "hair": "4a4038", "style": "long"},
	"guard": {"robe": "3a4a6a", "trim": "c8302a", "sash": "c8302a", "hair": "2a2228", "style": "hat", "sword": true},
	"escort": {"robe": "7a3a2a", "trim": "e8c870", "sash": "2a2228", "hair": "2a2228", "style": "band", "sword": true, "arms": true},
	"sect_judge": {"robe": "2a2a3a", "trim": "c8302a", "sash": "c9a46a", "hair": "2a2228", "style": "topknot", "beard": true},
	"disciple": {"robe": "e8eef2", "trim": "6a8aa8", "sash": "6a8aa8", "hair": "2a2228", "style": "topknot", "sword": true},
	"sect_master": {"robe": "f0f0e8", "trim": "3a5a7a", "sash": "3a5a7a", "hair": "c8c4bc", "style": "topknot", "beard": true, "sword": true},
	"sect_elder": {"robe": "d8dce0", "trim": "4a5a6a", "sash": "4a5a6a", "hair": "a8a4a0", "style": "bun", "beard": true},
	"sect_healer": {"robe": "4a7a6a", "trim": "e8f0e8", "sash": "c9a46a", "hair": "2a2228", "style": "bun", "girl": true},
	"sect_senior": {"robe": "dce4ea", "trim": "3a6a8a", "sash": "3a6a8a", "hair": "2a2228", "style": "topknot", "sword": true},
	# 千絲坊的繡娘、坊主
	"embroiderer": {"robe": "c8a8c4", "trim": "f8f0f8", "sash": "8a3a6a", "hair": "2a2228", "style": "long", "girl": true},
	"embroid_master": {"robe": "5a3a5a", "trim": "e8d8e8", "sash": "c9a46a", "hair": "a8a4a0", "style": "bun", "girl": true},
	"dog": {"animal": "dog"},
	"boar": {"animal": "boar"},
}

var body: Node3D
var arm_l: Node3D
var arm_r: Node3D
var leg_l: Node3D
var leg_r: Node3D
var eyes: Array[Node3D] = []
var walking := false
## 騎在馬上時身子抬高多少（州圖上騎馬）
var ride := 0.0
## 做事的動作（ctx.work 設定）："swing" 掄、"stir" 攪、"sit" 坐著；空的是平常
var action := ""
var _t := 0.0
var _blink := 2.0


## 被房子、牆擋住時畫出輪廓（shaders/xray.gdshader）：主角一直開著，說話的對象說話時才開
const XRAY_HERO := Color("ffdc80")
const XRAY_NPC := Color("a8e0ff")
static var _xray := {}


func xray(on: bool, color := XRAY_HERO) -> void:
	var m: ShaderMaterial = null
	if on:
		var key := color.to_html()
		if not _xray.has(key):
			m = ShaderMaterial.new()
			m.shader = load("res://shaders/xray.gdshader")
			m.set_shader_parameter("color", color)
			m.render_priority = 5
			_xray[key] = m
		m = _xray[key]
	for g in find_children("*", "MeshInstance3D", true, false):
		g.material_overlay = m


static func make(sprite: String) -> Chibi:
	var c := Chibi.new()
	c._build(LOOKS.get(sprite, LOOKS["farmer"]))
	return c


func _c(hex: String) -> Color:
	return Color(hex)


func _build(lk: Dictionary) -> void:
	body = Node3D.new()
	add_child(body)
	if lk.has("animal"):
		_animal(lk.animal)
		return
	var s := 0.8 if lk.get("small", false) else 1.0
	scale = Vector3.ONE * s
	var skin := Color("f2c9a0")
	var robe := _c(lk.robe)
	var trim := _c(lk.trim)
	# 腿（長袍底下露出一點褲腳與鞋）
	leg_l = Node3D.new()
	leg_r = Node3D.new()
	for leg in [leg_l, leg_r]:
		leg.add_child(Mk.box(Vector3(0.11, 0.22, 0.12), Color("3a3238"), Vector3(0, -0.11, 0)))
		leg.add_child(Mk.box(Vector3(0.12, 0.05, 0.16), Color("2a2228"), Vector3(0, -0.21, 0.02)))
		body.add_child(leg)
	leg_l.position = Vector3(-0.08, 0.24, 0)
	leg_r.position = Vector3(0.08, 0.24, 0)
	# 長袍：下擺寬、上身窄
	body.add_child(Mk.cyl(0.17, 0.25, 0.42, robe, Vector3(0, 0.37, 0), 8))
	body.add_child(Mk.cyl(0.255, 0.255, 0.03, trim, Vector3(0, 0.17, 0), 8))
	# 交領：前襟兩條斜邊
	for side in [-1, 1]:
		var lapel := Mk.box(Vector3(0.035, 0.22, 0.02), trim, Vector3(side * 0.045, 0.5, 0.168))
		lapel.rotation.z = side * 0.55
		body.add_child(lapel)
	# 腰帶與垂下的帶尾
	body.add_child(Mk.cyl(0.185, 0.19, 0.06, _c(lk.sash), Vector3(0, 0.42, 0), 8))
	body.add_child(Mk.box(Vector3(0.05, 0.14, 0.02), _c(lk.sash), Vector3(0.07, 0.33, 0.19)))
	# 手臂（寬袖）
	arm_l = Node3D.new()
	arm_r = Node3D.new()
	for arm in [arm_l, arm_r]:
		arm.add_child(Mk.cyl(0.055, 0.075, 0.26, robe, Vector3(0, -0.12, 0), 6))
		arm.add_child(Mk.ball(0.045, skin, Vector3(0, -0.27, 0), 6))
		body.add_child(arm)
	arm_l.position = Vector3(-0.2, 0.56, 0)
	arm_r.position = Vector3(0.2, 0.56, 0)
	arm_l.rotation.z = -0.18
	arm_r.rotation.z = 0.18
	# 頭
	var head := Node3D.new()
	head.position = Vector3(0, 0.82, 0)
	body.add_child(head)
	head.add_child(Mk.ball(0.22, skin, Vector3.ZERO, 12))
	# 眼睛、眉毛、嘴
	for side in [-1, 1]:
		var eye := Mk.box(Vector3(0.045, 0.07 if not lk.get("girl", false) else 0.08, 0.02), Color("1e1a24"), Vector3(side * 0.085, 0.0, 0.205))
		head.add_child(eye)
		eyes.append(eye)
		head.add_child(Mk.box(Vector3(0.016, 0.022, 0.01), Color.WHITE, Vector3(side * 0.085 + 0.01, 0.018, 0.216)))
		var brow := Mk.box(Vector3(0.06, 0.014, 0.01), _c(lk.hair), Vector3(side * 0.085, 0.07, 0.205))
		brow.rotation.z = side * (-0.35 if lk.get("angry", false) else 0.12)
		head.add_child(brow)
		if lk.get("girl", false):
			head.add_child(Mk.box(Vector3(0.05, 0.02, 0.01), Color("f0a0a8"), Vector3(side * 0.12, -0.06, 0.19)))
	head.add_child(Mk.box(Vector3(0.05, 0.012, 0.01), Color("a8584a"), Vector3(0, -0.09, 0.205)))
	_hair(head, lk)
	if lk.get("beard", false):
		head.add_child(Mk.cone(0.07, 0.16, _c(lk.hair), Vector3(0, -0.24, 0.12), 6))
		head.get_child(head.get_child_count() - 1).rotation.x = PI
	if lk.get("fan", false):
		# 說書人的摺扇
		var fan := Mk.cone(0.16, 0.02, Color("f4ecd8"), Vector3(0, -0.3, 0.08), 6)
		fan.rotation.x = PI / 2.0
		fan.scale = Vector3(1, 1, 0.5)
		arm_r.add_child(fan)
	if lk.get("sword", false):
		var sw := Node3D.new()
		sw.position = Vector3(-0.2, 0.42, -0.08)
		sw.rotation.z = 0.5
		sw.add_child(Mk.box(Vector3(0.04, 0.5, 0.025), Color("c8ccd4"), Vector3(0, 0.12, 0)))
		sw.add_child(Mk.box(Vector3(0.12, 0.025, 0.04), Color("c9a46a"), Vector3(0, -0.13, 0)))
		sw.add_child(Mk.box(Vector3(0.035, 0.12, 0.035), Color("5a3a22"), Vector3(0, -0.2, 0)))
		sw.add_child(Mk.ball(0.03, Color("c84a3a"), Vector3(0, -0.29, 0), 5))
		body.add_child(sw)


func _hair(head: Node3D, lk: Dictionary) -> void:
	var hc := _c(lk.hair)
	if lk.style == "bald":
		# 光頭：頭頂點著幾個戒疤
		for i in 6:
			head.add_child(Mk.ball(0.012, Color("c89a7a"), Vector3((i % 3 - 1) * 0.05, 0.2, (i / 3) * 0.05 - 0.02), 4))
		return
	var cap := Mk.ball(0.235, hc, Vector3(0, 0.04, -0.035), 12)
	cap.scale = Vector3(1, 0.9, 1)
	head.add_child(cap)
	# 瀏海：短短三撮，不蓋住眼睛
	for i in 3:
		var b := Mk.cone(0.05, 0.1, hc, Vector3((i - 1) * 0.08, 0.15, 0.17), 5)
		b.rotation.x = PI + 0.5
		head.add_child(b)
	match lk.style:
		"topknot":
			head.add_child(Mk.ball(0.08, hc, Vector3(0, 0.27, -0.02), 8))
			head.add_child(Mk.box(Vector3(0.03, 0.03, 0.2), Color("c9a46a"), Vector3(0, 0.27, -0.02)))
		"bun":
			head.add_child(Mk.ball(0.1, hc, Vector3(0, 0.12, -0.22), 8))
		"twinbuns":
			for side in [-1, 1]:
				head.add_child(Mk.ball(0.075, hc, Vector3(side * 0.17, 0.2, -0.04), 8))
		"long":
			var back := Mk.box(Vector3(0.36, 0.42, 0.08), hc, Vector3(0, -0.12, -0.17))
			head.add_child(back)
		"band":
			head.add_child(Mk.cyl(0.236, 0.236, 0.05, Color("c84a3a"), Vector3(0, 0.1, -0.01), 12))
		"hat":
			head.add_child(Mk.cone(0.42, 0.2, Color("d8b870"), Vector3(0, 0.27, 0), 10))
			head.add_child(Mk.ball(0.05, Color("a88a4a"), Vector3(0, 0.38, 0), 5))


func _animal(kind: String) -> void:
	var fur := Color("8a6a4a") if kind == "dog" else Color("4a3a32")
	var torso := Mk.box(Vector3(0.32, 0.3, 0.62), fur, Vector3(0, 0.38, 0))
	body.add_child(torso)
	var head := Mk.box(Vector3(0.26, 0.24, 0.26), fur, Vector3(0, 0.5, 0.4))
	body.add_child(head)
	body.add_child(Mk.box(Vector3(0.14, 0.12, 0.14), fur.darkened(0.2), Vector3(0, 0.45, 0.58)))
	for side in [-1, 1]:
		body.add_child(Mk.box(Vector3(0.04, 0.05, 0.02), Color("1e1a24"), Vector3(side * 0.07, 0.55, 0.535)))
		if kind == "dog":
			body.add_child(Mk.cone(0.06, 0.12, fur.darkened(0.15), Vector3(side * 0.09, 0.67, 0.36), 4))
		else:
			body.add_child(Mk.cone(0.02, 0.1, Color("f0e8d8"), Vector3(side * 0.08, 0.44, 0.66), 4))
	leg_l = Node3D.new()
	leg_r = Node3D.new()
	for leg in [leg_l, leg_r]:
		for z in [-0.2, 0.2]:
			leg.add_child(Mk.box(Vector3(0.08, 0.24, 0.08), fur.darkened(0.25), Vector3(0, -0.12, z)))
		body.add_child(leg)
	leg_l.position = Vector3(-0.1, 0.24, 0)
	leg_r.position = Vector3(0.1, 0.24, 0)


## 面向某個方向（地面上的向量）
func face(dir: Vector3) -> void:
	if dir.length() > 0.01:
		rotation.y = atan2(dir.x, dir.z)


func _process(dt: float) -> void:
	_t += dt
	if action != "" and arm_l:
		match action:
			"swing":
				var sw := sin(_t * 9.0)
				body.position.y = ride + absf(sw) * 0.03
				arm_l.rotation.x = -1.1 + sw * 0.9
				arm_r.rotation.x = -1.1 + sw * 0.9
			"stir":
				body.position.y = ride + sin(_t * 4.0) * 0.01
				arm_l.rotation.x = -0.9 + sin(_t * 7.0) * 0.35
				arm_r.rotation.x = -0.9 - sin(_t * 7.0) * 0.35
			_:
				body.position.y = ride - 0.06 + sin(_t * 1.6) * 0.012
				arm_l.rotation.x = lerp(arm_l.rotation.x, -0.7, 0.1)
				arm_r.rotation.x = lerp(arm_r.rotation.x, -0.7, 0.1)
	elif walking:
		var s := sin(_t * 12.0)
		body.position.y = ride + abs(s) * 0.05
		if leg_l:
			leg_l.rotation.x = s * 0.6
			leg_r.rotation.x = -s * 0.6
		if arm_l:
			arm_l.rotation.x = -s * 0.5
			arm_r.rotation.x = s * 0.5
	else:
		body.position.y = ride + sin(_t * 2.2) * 0.008
		if leg_l:
			leg_l.rotation.x = lerp(leg_l.rotation.x, 0.0, 0.2)
			leg_r.rotation.x = lerp(leg_r.rotation.x, 0.0, 0.2)
		if arm_l:
			arm_l.rotation.x = lerp(arm_l.rotation.x, 0.0, 0.2)
			arm_r.rotation.x = lerp(arm_r.rotation.x, 0.0, 0.2)
	# 眨眼
	_blink -= dt
	var closed := _blink < 0.12
	for e in eyes:
		e.scale.y = 0.15 if closed else 1.0
	if _blink < 0:
		_blink = 2.0 + randf() * 3.0
