// 卡通描邊（後製）：一片蓋滿畫面的四邊形，讀深度與法線，在物件的輪廓、轉折處畫深色線。
// 要 Forward+ 才讀得到法線（hint_normal_roughness_texture）。
shader_type spatial;
render_mode unshaded, depth_draw_never, depth_test_disabled, cull_disabled, fog_disabled, shadows_disabled;

uniform sampler2D screen_tex : hint_screen_texture, filter_nearest;
uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform sampler2D normal_tex : hint_normal_roughness_texture, filter_nearest;
uniform vec3 line_color : source_color = vec3(0.11, 0.09, 0.13);
uniform float thickness = 1.0;
uniform float strength = 0.9;
// 正交鏡頭時，一個畫素是多少世界單位（鏡頭每格畫面更新）：深度差換算成「幾個畫素」來判斷是不是邊，
// 不管拉多遠都一樣（用相對深度差的話，拉很遠時會整片誤判成邊、變暗）
uniform float px_world = 0.0;
// 正交鏡頭的近、遠平面（深度緩衝在正交時是線性的：1 在近平面、0 在遠平面）
uniform float cam_near = 0.1;
uniform float cam_far = 1600.0;

void vertex() {
	POSITION = vec4(VERTEX.xy * 2.0, 1.0, 1.0);
}

float view_depth(vec2 uv, mat4 inv_proj) {
	float d = texture(depth_tex, uv).r;
	if (px_world > 0.0) return mix(cam_far, cam_near, d);
	vec4 v = inv_proj * vec4(uv * 2.0 - 1.0, d, 1.0);
	return -v.z / v.w;
}

vec3 normal_at(vec2 uv) {
	return texture(normal_tex, uv).xyz * 2.0 - 1.0;
}

void fragment() {
	vec2 px = thickness / VIEWPORT_SIZE;
	vec3 base = texture(screen_tex, SCREEN_UV).rgb;
	float d = view_depth(SCREEN_UV, INV_PROJECTION_MATRIX);
	vec3 n = normal_at(SCREEN_UV);
	float e = 0.0;
	vec2 offs[4] = vec2[](vec2(px.x, 0.0), vec2(-px.x, 0.0), vec2(0.0, px.y), vec2(0.0, -px.y));
	for (int i = 0; i < 4; i++) {
		vec2 uv = SCREEN_UV + offs[i];
		float d2 = view_depth(uv, INV_PROJECTION_MATRIX);
		e = max(e, smoothstep(0.35, 0.8, length(n - normal_at(uv))));
		float dd = px_world > 0.0 ? smoothstep(3.0, 6.0, abs(d - d2) / px_world) : smoothstep(0.012, 0.03, abs(d - d2) / max(d, 0.001));
		e = max(e, dd);
	}
	// 天空（太遠）不描
	if (d > 1500.0) e = 0.0;
	ALBEDO = mix(base, line_color, e * strength);
}
