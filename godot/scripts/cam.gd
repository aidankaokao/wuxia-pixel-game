class_name CamRig
extends Node3D
## 2.5D 鏡頭：正交投影、固定俯角（約 29°），只能拉遠近（滾輪、Z／X）與轉方向（Q／R 每次轉 90 度，永遠從斜 45 度看：東南、西南、西北、東北）。
## 鏡頭跟著 target 走；描邊的後製四邊形掛在鏡頭底下。

const PITCH := 0.5
var yaw := PI / 4.0
var yaw_goal := PI / 4.0
var size := 14.0
var size_min := 7.0
var size_max := 26.0
var target: Node3D
var cam: Camera3D
var outline: ShaderMaterial


func _ready() -> void:
	cam = Camera3D.new()
	cam.projection = Camera3D.PROJECTION_ORTHOGONAL
	cam.size = size
	cam.near = 0.1
	cam.far = 1600.0
	add_child(cam)
	var q := MeshInstance3D.new()
	var qm := QuadMesh.new()
	qm.size = Vector2(1, 1)
	q.mesh = qm
	q.extra_cull_margin = 16384.0
	outline = ShaderMaterial.new()
	var sm := outline
	sm.shader = load("res://shaders/outline.gdshader")
	# 描邊要比半透明的東西（水面、標記、字）先畫，不然會把它們蓋掉
	sm.render_priority = -128
	q.material_override = sm
	q.position = Vector3(0, 0, -1)
	cam.add_child(q)


## 依鏡頭方向，把方向鍵換成地面上的方向（上＝遠離鏡頭）
func ground_dir(v: Vector2) -> Vector3:
	var fwd := Vector3(-sin(yaw), 0, -cos(yaw))
	var right := Vector3(cos(yaw), 0, -sin(yaw))
	return (right * v.x + fwd * -v.y).normalized() if v.length() > 0 else Vector3.ZERO


func _unhandled_input(e: InputEvent) -> void:
	if e is InputEventMouseButton and e.pressed:
		if e.button_index == MOUSE_BUTTON_WHEEL_UP:
			size = max(size_min, size - 1.0)
		elif e.button_index == MOUSE_BUTTON_WHEEL_DOWN:
			size = min(size_max, size + 1.0)


func rotate_step(dir: int) -> void:
	yaw_goal += dir * PI / 2.0


func _process(dt: float) -> void:
	if Input.is_key_pressed(KEY_Z):
		size = max(size_min, size - dt * 10.0)
	if Input.is_key_pressed(KEY_X):
		size = min(size_max, size + dt * 10.0)
	yaw = lerp_angle(yaw, yaw_goal, min(1.0, dt * 8.0))
	cam.size = lerp(cam.size, size, min(1.0, dt * 8.0))
	if target:
		position = position.lerp(target.global_position, min(1.0, dt * 6.0))
	var dist := 200.0
	outline.set_shader_parameter("px_world", cam.size / maxf(1.0, get_viewport().get_visible_rect().size.y))
	outline.set_shader_parameter("cam_near", cam.near)
	outline.set_shader_parameter("cam_far", cam.far)
	cam.position = Vector3(sin(yaw) * cos(PITCH), sin(PITCH), cos(yaw) * cos(PITCH)) * dist
	cam.look_at(global_position, Vector3.UP)
