// 被擋住時的輪廓（疊在人物的每個模型上，material_overlay）：讀深度，只在前面有東西擋著的地方畫，
// 邊緣濃、中間淡，看起來是一圈發亮的輪廓；沒被擋住的地方完全不畫。
// bias 要比人物自己的厚度大（手臂擋到身子不算被擋）。
shader_type spatial;
render_mode unshaded, depth_draw_never, depth_test_disabled, cull_disabled, fog_disabled, shadows_disabled;

uniform sampler2D depth_tex : hint_depth_texture, filter_nearest;
uniform vec3 color : source_color = vec3(1.0, 0.86, 0.5);
uniform float bias = 0.8;
// 正交鏡頭的深度是線性的（1 在近平面、0 在遠平面），跟 cam.gd 的 near、far 一樣
uniform float cam_near = 0.1;
uniform float cam_far = 1600.0;

void fragment() {
	float d = texture(depth_tex, SCREEN_UV).r;
	float scene = mix(cam_far, cam_near, d);
	float self = mix(cam_far, cam_near, FRAGCOORD.z);
	if (scene > self - bias) {
		discard;
	}
	float rim = 1.0 - abs(dot(normalize(NORMAL), normalize(VIEW)));
	ALBEDO = color;
	ALPHA = 0.35 + 0.6 * pow(rim, 1.5);
}
