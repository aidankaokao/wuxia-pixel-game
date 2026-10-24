shader_type canvas_item;
// 據點裡換場景的墨：t 從 0 到 1 時墨從畫面四周往中間暈進來蓋滿，從 1 回到 0 時從中間往外化開。
// 雜訊讓邊緣不規則，邊上一圈淡墨像墨在宣紙上滲開
uniform sampler2D noise : repeat_enable;
uniform float t = 0.0;
const vec3 INK = vec3(0.06, 0.05, 0.08);

void fragment() {
	vec2 asp = vec2(1.6, 1.0);
	float n = texture(noise, UV * asp * 0.8).r;
	float d = length((UV - 0.5) * asp) / 0.95;
	// 中間的 k 小、四周的 k 大
	float k = n * 0.55 + d * 0.6;
	// t = 0 時門檻高過所有 k（沒有墨），t = 1 時低過所有 k（滿是墨）
	float p = mix(1.3, -0.15, t);
	float a = smoothstep(p - 0.04, p + 0.04, k);
	// 墨邊外再一圈淡淡的暈
	float halo = smoothstep(p - 0.16, p, k) * 0.35;
	COLOR = vec4(INK, max(a, halo) * step(0.001, t));
}
